"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { CommentComposer } from "@/components/comment-composer";
import { CommentItem } from "@/components/comment-item";
import {
  fetchComments,
  postComment,
  deleteComment,
  voteComment,
  unvoteComment,
  type Comment,
} from "@/lib/comments-api";

export function DiscussionThread({ slug }: { slug: string }) {
  const { user, loading: authLoading } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [now] = useState(() => Date.now());

  useEffect(() => {
    if (authLoading) return;
    let cancelled = false;
    fetchComments(slug).then((result) => {
      if (cancelled) return;
      setComments(result);
      setLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, [slug, authLoading]);

  async function handlePostTopLevel(body: string) {
    const created = await postComment(slug, body);
    if (created) setComments((prev) => [created, ...prev]);
  }

  async function handleReply(parentId: number, body: string) {
    const created = await postComment(slug, body, parentId);
    if (!created) return;
    setComments((prev) =>
      prev.map((c) => (c.id === parentId ? { ...c, replies: [...c.replies, created] } : c)),
    );
  }

  function patchComment(id: number, patch: Partial<Comment>) {
    setComments((prev) =>
      prev.map((c) =>
        c.id === id
          ? { ...c, ...patch }
          : { ...c, replies: c.replies.map((r) => (r.id === id ? { ...r, ...patch } : r)) },
      ),
    );
  }

  function findComment(id: number): Comment | undefined {
    for (const c of comments) {
      if (c.id === id) return c;
      const reply = c.replies.find((r) => r.id === id);
      if (reply) return reply;
    }
    return undefined;
  }

  async function handleVote(id: number, value: 1 | -1) {
    const c = findComment(id);
    if (!c) return;
    const wasOtherVote = c.my_vote !== null && c.my_vote !== value;
    patchComment(id, {
      my_vote: value,
      upvotes: c.upvotes + (value === 1 ? 1 : 0) - (c.my_vote === 1 ? 1 : 0),
      downvotes: c.downvotes + (value === -1 ? 1 : 0) - (c.my_vote === -1 ? 1 : 0),
    });
    if (wasOtherVote || c.my_vote === null) await voteComment(id, value);
  }

  async function handleUnvote(id: number) {
    const c = findComment(id);
    if (!c) return;
    patchComment(id, {
      my_vote: null,
      upvotes: c.upvotes - (c.my_vote === 1 ? 1 : 0),
      downvotes: c.downvotes - (c.my_vote === -1 ? 1 : 0),
    });
    await unvoteComment(id);
  }

  async function handleDelete(id: number) {
    const ok = await deleteComment(id);
    if (ok) patchComment(id, { deleted: true, body: "[deleted]" });
  }

  if (!loaded) return null;

  return (
    <div className="flex flex-col gap-5 px-5 py-4">
      {user ? (
        <CommentComposer
          placeholder="Share your approach, ask a question…"
          submitLabel="Comment"
          onSubmit={handlePostTopLevel}
        />
      ) : (
        <p className="text-sm text-muted-foreground">Sign in to join the discussion.</p>
      )}
      {comments.length === 0 ? (
        <p className="text-sm text-muted-foreground">No comments yet — be the first.</p>
      ) : (
        <div className="flex flex-col gap-5">
          {comments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              depth={0}
              now={now}
              onVote={handleVote}
              onUnvote={handleUnvote}
              onDelete={handleDelete}
              onReply={handleReply}
            />
          ))}
        </div>
      )}
    </div>
  );
}
