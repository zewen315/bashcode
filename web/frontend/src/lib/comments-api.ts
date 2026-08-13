export type CommentAuthor = {
  display_name: string | null;
  avatar_url: string | null;
  // null when the author's account has since been deleted — the
  // comment survives (see docs/decisions/0013), just its author link
  // doesn't. A null public_id can never match a signed-in user's own,
  // so ownership checks (delete button, etc.) correctly never treat a
  // deleted user's old comment as belonging to anyone.
  public_id: string | null;
};

export type Comment = {
  id: number;
  body: string;
  deleted: boolean;
  created_at: number;
  author: CommentAuthor;
  upvotes: number;
  downvotes: number;
  my_vote: 1 | -1 | null;
  replies: Comment[];
};

export type DiscussionFeedItem = {
  id: number;
  slug: string;
  problem_title: string | null;
  excerpt: string;
  created_at: number;
  author: CommentAuthor;
  upvotes: number;
  downvotes: number;
  reply_count: number;
};

export type DiscussionFeedPage = {
  items: DiscussionFeedItem[];
  next_cursor: number | null;
};

export async function fetchComments(slug: string): Promise<Comment[]> {
  const res = await fetch(`/api/problems/${slug}/comments`, { cache: "no-store" });
  if (!res.ok) return [];
  return res.json();
}

export async function postComment(
  slug: string,
  body: string,
  parentId?: number,
): Promise<Comment | null> {
  const res = await fetch(`/api/problems/${slug}/comments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ body, parent_id: parentId ?? null }),
  });
  if (!res.ok) return null;
  return res.json();
}

export async function deleteComment(id: number): Promise<boolean> {
  const res = await fetch(`/api/comments/${id}`, { method: "DELETE" });
  return res.ok;
}

export async function voteComment(id: number, value: 1 | -1): Promise<boolean> {
  const res = await fetch(`/api/comments/${id}/vote`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ value }),
  });
  return res.ok;
}

export async function unvoteComment(id: number): Promise<boolean> {
  const res = await fetch(`/api/comments/${id}/vote`, { method: "DELETE" });
  return res.ok;
}

export async function fetchDiscussionsFeed(before?: number): Promise<DiscussionFeedPage | null> {
  const qs = before ? `?before=${before}` : "";
  const res = await fetch(`/api/discussions${qs}`, { cache: "no-store" });
  if (!res.ok) return null;
  return res.json();
}
