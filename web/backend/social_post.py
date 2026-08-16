#!/usr/bin/env python3
"""Posts one problem to the @bashcode Twitter/X account. Manually
triggered only, given a specific problem each run — nothing here picks
one automatically or runs on a schedule. See db/migrations/0013 and
docs/decisions/0019-social-posting.md.

Usage (inside the backend container, where PROBLEMS_DIR/DATABASE_URL
are already set correctly):
    python social_post.py <id-or-slug-or-title> [--dry-run]
"""
import argparse
import os
import pathlib
import sys
import tempfile

import psycopg
import tweepy
import yaml
from PIL import Image, ImageDraw, ImageFont

import db

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[2] / "judge"))
from run_submission import DESCRIPTION_FILENAME, EXPECTED_EXIT_FILENAME  # noqa: E402

# Same fallback pattern as main.py's PROBLEMS_DIR — lets this run
# directly on the host in local dev, where bashcode-problems is a
# sibling repo three levels up from this file.
REPO_ROOT = pathlib.Path(__file__).resolve().parents[3]
DEFAULT_PROBLEMS_DIR = REPO_ROOT / "bashcode-problems"
PROBLEMS_DIR = pathlib.Path(os.environ.get("BASHCODE_PROBLEMS_DIR", DEFAULT_PROBLEMS_DIR))

CARD_W, CARD_H = 1200, 675
BG = "#0b0f0d"
GREEN = "#4ade80"
WHITE = "#f5f5f5"
MUTED = "#9ca3af"
BOX_BG = "#161b18"
DIFFICULTY_COLOR = {"easy": "#4ade80", "medium": "#fbbf24", "hard": "#f87171"}

FONT_DIR = pathlib.Path("/usr/share/fonts/truetype/dejavu")
FONT_BOLD = FONT_DIR / "DejaVuSans-Bold.ttf"
FONT_REGULAR = FONT_DIR / "DejaVuSans.ttf"
FONT_MONO = FONT_DIR / "DejaVuSansMono.ttf"


def load_all_problems() -> list[dict]:
    problems = []
    for config_path in PROBLEMS_DIR.glob("*/config.yaml"):
        problems.append(yaml.safe_load(config_path.read_text()))
    problems.sort(key=lambda c: c["id"])
    return problems


def find_problem(identifier: str, problems: list[dict]) -> dict:
    if identifier.isdigit():
        matches = [p for p in problems if p["id"] == int(identifier)]
        if matches:
            return matches[0]
    slug_matches = [p for p in problems if p["slug"] == identifier]
    if slug_matches:
        return slug_matches[0]
    title_matches = [p for p in problems if p["title"].lower() == identifier.lower()]
    if len(title_matches) == 1:
        return title_matches[0]
    if len(title_matches) > 1:
        raise SystemExit(
            f"Ambiguous title {identifier!r} — matches: "
            + ", ".join(p["slug"] for p in title_matches)
        )
    raise SystemExit(f"No problem found matching {identifier!r} (tried id, slug, exact title)")


def first_sample(problem_dir: pathlib.Path) -> tuple[list[tuple[str, str]], str] | None:
    """([(filename, content), ...], expected) for the first sample test
    case's ALL input files — mirrors get_problem()'s samples logic in
    main.py. Some problems need more than one input file to make sense
    (e.g. config-diff's old/new config pair) — showing only the first
    would silently drop the file that makes the example legible.
    description.md overrides the whole input display with one
    human-written blurb when present (e.g. filesystem tests where the
    real input is a setup script, not something to show verbatim);
    filename "" signals that case to the renderer.
    """
    samples_dir = problem_dir / "tests" / "samples"
    if not samples_dir.is_dir():
        return None
    sample_dirs = sorted(
        (p for p in samples_dir.iterdir() if p.is_dir() and p.name.isdigit()),
        key=lambda p: int(p.name),
    )
    if not sample_dirs:
        return None
    sample_dir = sample_dirs[0]
    expected = (sample_dir / "expected.out").read_text().strip()
    description_path = sample_dir / DESCRIPTION_FILENAME
    if description_path.is_file():
        return [("", description_path.read_text().strip())], expected
    input_files = sorted(
        p for p in sample_dir.iterdir()
        if p.is_file() and p.name not in ("expected.out", DESCRIPTION_FILENAME, EXPECTED_EXIT_FILENAME)
    )
    return [(f.name, f.read_text().strip()) for f in input_files], expected


def wrap_text(draw: ImageDraw.ImageDraw, text: str, font: ImageFont.FreeTypeFont, max_width: int) -> list[str]:
    words = text.split()
    lines: list[str] = []
    current = ""
    for word in words:
        trial = f"{current} {word}".strip()
        if draw.textlength(trial, font=font) <= max_width:
            current = trial
        else:
            if current:
                lines.append(current)
            current = word
    if current:
        lines.append(current)
    return lines


def render_card(problem: dict, hook: str, sample: tuple[list[tuple[str, str]], str] | None, out_path: pathlib.Path) -> None:
    # Height is content-driven, not fixed: a two-input-file example
    # (e.g. config-diff's old/new pair) needs meaningfully more room
    # than a one-liner, and a fixed box clipped/overlapped past its
    # own edge once there was more than a couple of lines of example
    # to show. Draw onto a generously tall scratch canvas, track where
    # content actually ends, then crop to that — CARD_H is only the
    # floor a short card still gets, not a ceiling every card is
    # squeezed into.
    MAX_CARD_H = 1400
    img = Image.new("RGB", (CARD_W, MAX_CARD_H), BG)
    draw = ImageDraw.Draw(img)
    margin = 64

    font_logo = ImageFont.truetype(str(FONT_BOLD), 28)
    font_title = ImageFont.truetype(str(FONT_BOLD), 52)
    font_hook = ImageFont.truetype(str(FONT_REGULAR), 28)
    font_label = ImageFont.truetype(str(FONT_BOLD), 20)
    font_mono = ImageFont.truetype(str(FONT_MONO), 22)
    font_cta = ImageFont.truetype(str(FONT_BOLD), 26)
    font_badge = ImageFont.truetype(str(FONT_BOLD), 20)

    y = margin
    draw.text((margin, y), "$B_", font=font_logo, fill=GREEN)
    draw.text((margin + 64, y + 2), "BashCode", font=font_logo, fill=WHITE)
    y += 64

    def draw_badge(x: int, y: int, text: str, color: str) -> int:
        pad_x, pad_y = 14, 8
        w = draw.textlength(text, font=font_badge)
        h = font_badge.size
        draw.rounded_rectangle([x, y, x + w + pad_x * 2, y + h + pad_y * 2], radius=14, outline=color, width=2)
        draw.text((x + pad_x, y + pad_y - 2), text, font=font_badge, fill=color)
        return int(x + w + pad_x * 2 + 12)

    x = margin
    x = draw_badge(x, y, problem.get("difficulty", "").capitalize(), DIFFICULTY_COLOR.get(problem.get("difficulty"), GREEN))
    for tag in (problem.get("tools") or [])[:3]:
        x = draw_badge(x, y, tag, MUTED)
    for tag in (problem.get("topics") or [])[:2]:
        x = draw_badge(x, y, tag, MUTED)
    y += 60

    for line in wrap_text(draw, problem["title"], font_title, CARD_W - margin * 2)[:2]:
        draw.text((margin, y), line, font=font_title, fill=WHITE)
        y += 62
    y += 10

    for line in wrap_text(draw, hook, font_hook, CARD_W - margin * 2)[:2]:
        draw.text((margin, y), line, font=font_hook, fill=MUTED)
        y += 38
    y += 20

    if sample:
        files, expected = sample
        # Laid out as a flat list first — (text, indent, color, font,
        # line_height) — so the box can be sized to exactly the content
        # it's about to contain, instead of guessing a fixed height up
        # front and either clipping (too short) or leaving dead space
        # (too tall). Same list is then walked again to actually draw.
        rows: list[tuple[str, int, str, ImageFont.FreeTypeFont, int]] = []
        rows.append(("INPUT", 0, GREEN, font_label, 32))
        if not files:
            rows.append(("(no input)", 0, MUTED, font_mono, 28))
        for name, content in files[:2]:
            # A blank name means description.md's prose override — no
            # filename to label, just the text itself.
            if name:
                rows.append((name, 0, MUTED, font_mono, 24))
            for line in content.splitlines()[:3]:
                rows.append((line[:65], 16 if name else 0, WHITE, font_mono, 26))
        rows.append(("", 0, WHITE, font_mono, 14))  # spacer
        rows.append(("OUTPUT", 0, GREEN, font_label, 32))
        for line in expected.splitlines()[:4]:
            rows.append((line[:65], 0, GREEN, font_mono, 26))

        box_top = y
        content_height = sum(h for _, _, _, _, h in rows)
        box_bottom = box_top + 20 + content_height + 20
        draw.rounded_rectangle([margin, box_top, CARD_W - margin, box_bottom], radius=12, fill=BOX_BG)
        inner_x, inner_y = margin + 28, box_top + 20
        for text, indent, color, font, line_h in rows:
            if text:
                draw.text((inner_x + indent, inner_y), text, font=font, fill=color)
            inner_y += line_h
        y = box_bottom + 40
    else:
        y += 20

    cta = f"Try it at bashcode.net/problems/{problem['slug']}"
    draw.text((margin, y), cta, font=font_cta, fill=GREEN)
    y += 46

    final_height = max(CARD_H, y + margin - 20)
    img.crop((0, 0, CARD_W, final_height)).save(out_path)


HASHTAGS = "#Bash #Linux #100DaysOfCode"


def build_tweet_text(problem: dict, hook: str) -> str:
    # A framing line up front, not just the title — "Prod Services"
    # alone tells a first-time viewer nothing about what BashCode even
    # is. Fixed wording, not "daily": posting is manual/irregular, and
    # a cadence claim that doesn't hold up looks worse than none.
    url = f"https://bashcode.net/problems/{problem['slug']}"
    tools = ", ".join(problem.get("tools") or []) or "bash"
    text = (
        f"🐚 Bash/Linux practice problem:\n\n"
        f"{problem['title']}\n\n"
        f"{hook}\n\n"
        f"Try it in {tools} → {url}\n"
        f"More problems: bashcode.net\n\n"
        f"{HASHTAGS}"
    )
    if len(text) > 280:
        raise SystemExit(f"Tweet text is {len(text)} chars, over the 280 limit — shorten social_hook.")
    return text


def already_posted_at(slug: str) -> str | None:
    with psycopg.connect(db.DATABASE_URL) as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT posted_at FROM social_posts WHERE slug = %s ORDER BY posted_at DESC LIMIT 1",
                (slug,),
            )
            row = cur.fetchone()
            return str(row[0]) if row else None


def record_posted(slug: str) -> None:
    with psycopg.connect(db.DATABASE_URL) as conn:
        with conn.cursor() as cur:
            cur.execute("INSERT INTO social_posts (slug) VALUES (%s)", (slug,))
        conn.commit()


def post_tweet(text: str, image_path: pathlib.Path) -> None:
    api_key = os.environ["TWITTER_API_KEY"]
    api_secret = os.environ["TWITTER_API_SECRET"]
    access_token = os.environ["TWITTER_ACCESS_TOKEN"]
    access_secret = os.environ["TWITTER_ACCESS_SECRET"]

    # Media upload is still v1.1-only in tweepy — the v2 Client below
    # handles the actual tweet, just referencing the media_id v1.1 gave us.
    auth = tweepy.OAuth1UserHandler(api_key, api_secret, access_token, access_secret)
    media = tweepy.API(auth).media_upload(str(image_path))

    client = tweepy.Client(
        consumer_key=api_key,
        consumer_secret=api_secret,
        access_token=access_token,
        access_token_secret=access_secret,
    )
    client.create_tweet(text=text, media_ids=[media.media_id])


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("problem", help="Problem id, slug, or exact title")
    parser.add_argument(
        "--dry-run", action="store_true",
        help="Generate the card and print the tweet text, but don't post or record anything",
    )
    args = parser.parse_args()

    problem = find_problem(args.problem, load_all_problems())
    hook = problem.get("social_hook")
    if not hook:
        raise SystemExit(
            f"{problem['slug']} has no social_hook in config.yaml — add one before posting this problem."
        )

    sample = first_sample(PROBLEMS_DIR / problem["slug"])
    text = build_tweet_text(problem, hook)
    out_path = pathlib.Path(tempfile.mkdtemp()) / f"{problem['slug']}.png"
    render_card(problem, hook, sample, out_path)

    print(f"--- Card image: {out_path} ---")
    print(f"--- Tweet text ({len(text)} chars) ---\n{text}\n---")

    prior = already_posted_at(problem["slug"])
    if prior:
        print(f"Note: {problem['slug']} was already posted on {prior} — posting again anyway.")

    if args.dry_run:
        print("Dry run — not posting, not recording.")
        return

    post_tweet(text, out_path)
    record_posted(problem["slug"])
    print(f"Posted {problem['slug']} to Twitter.")


if __name__ == "__main__":
    main()
