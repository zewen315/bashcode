# syntax=docker/dockerfile:1
#
# Build context must be the REPO ROOT (bashcode/), not web/backend/ —
# this needs web/backend/, judge/, and db/ to preserve the relative
# layout main.py/db.py expect (sys.path.insert(...judge dir...),
# db.py's MIGRATIONS_DIR resolving to /app/db/migrations).
#
# Runs as root deliberately: it shells out to `docker run` against the
# HOST's Docker daemon via the mounted socket (see docker-compose.yml)
# to spawn each submission's sandbox. That socket access is already
# root-equivalent on the host, so a non-root user here wouldn't reduce
# the real blast radius — same MVP tradeoff the README already flags
# for the judge sandbox itself.
FROM python:3.12-slim

# Just the docker CLI binary, not the daemon — talks to the host's
# daemon through the socket mounted at runtime.
COPY --from=docker:27-cli /usr/local/bin/docker /usr/local/bin/docker

# DejaVu Sans/Sans-Bold/Sans-Mono — the only thing social_post.py needs
# beyond the Python deps below, for drawing the Twitter card image
# (python:3.12-slim has no fonts at all otherwise).
RUN apt-get update && apt-get install -y --no-install-recommends fonts-dejavu-core \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY web/backend/requirements.txt web/backend/requirements.txt
RUN pip install --no-cache-dir -r web/backend/requirements.txt

COPY web/backend/ web/backend/
COPY judge/ judge/
COPY db/ db/

WORKDIR /app/web/backend
EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
