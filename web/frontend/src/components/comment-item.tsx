"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { ThumbsUp, ThumbsDown, ChevronDown, ChevronRight, Trash2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogClose,
} from "@/components/ui/alert-dialog";
import { CommentComposer } from "@/components/comment-composer";
import { useAuth } from "@/lib/auth-context";
import { initials } from "@/lib/auth";
import { relativeTime } from "@/lib/relative-time";
import { cn } from "@/lib/utils";
import { type Comment } from "@/lib/comments-api";

function VoteButton({
  active,
  count,
  onClick,
  label,
  icon: Icon,
  activeColor,
}: {
  active: boolean;
  count: number;
  onClick: () => void;
  label: string;
  icon: typeof ThumbsUp;
  activeColor: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={cn(
        "inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs text-muted-foreground/60 hover:text-foreground",
        active && activeColor,
      )}
    >
      <Icon className={cn("size-3.5", active && "fill-current")} />
      {count > 0 && count}
    </button>
  );
}

export function CommentItem({
  comment,
  depth,
  now,
  onVote,
  onUnvote,
  onDelete,
  onReply,
}: {
  comment: Comment;
  depth: 0 | 1;
  now: number;
  onVote: (id: number, value: 1 | -1) => void;
  onUnvote: (id: number) => void;
  onDelete: (id: number) => void;
  onReply: (parentId: number, body: string) => Promise<void>;
}) {
  const { user } = useAuth();
  const [replying, setReplying] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const isOwner = user?.public_id === comment.author.public_id;
  const hasReplies = depth === 0 && comment.replies.length > 0;

  function handleVoteClick(value: 1 | -1) {
    if (!user) return;
    if (comment.my_vote === value) onUnvote(comment.id);
    else onVote(comment.id, value);
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-start gap-2.5">
        <Avatar size="sm">
          <AvatarImage src={comment.author.avatar_url ?? undefined} />
          <AvatarFallback className="bg-primary text-primary-foreground">
            {initials(comment.author.display_name)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">{comment.author.display_name ?? "user"}</span>
            <span className="text-xs text-muted-foreground">
              {relativeTime(comment.created_at, now)}
            </span>
            {hasReplies && (
              <button
                type="button"
                onClick={() => setCollapsed((c) => !c)}
                className="ml-auto inline-flex items-center gap-0.5 text-xs text-muted-foreground hover:text-foreground"
              >
                {collapsed ? <ChevronRight className="size-3.5" /> : <ChevronDown className="size-3.5" />}
                {comment.replies.length} {comment.replies.length === 1 ? "reply" : "replies"}
              </button>
            )}
          </div>
          {comment.deleted ? (
            <p className="text-sm italic text-muted-foreground">[deleted]</p>
          ) : (
            <article className="text-sm leading-6 [&_pre]:overflow-x-auto [&_pre]:rounded [&_pre]:bg-muted [&_pre]:p-2 [&_code]:font-mono [&_code]:text-xs [&_p]:my-1">
              <ReactMarkdown>{comment.body}</ReactMarkdown>
            </article>
          )}
          {!comment.deleted && (
            <div className="mt-1 flex items-center gap-1">
              <VoteButton
                active={comment.my_vote === 1}
                count={comment.upvotes}
                onClick={() => handleVoteClick(1)}
                label="Like"
                icon={ThumbsUp}
                activeColor="text-emerald-600 dark:text-emerald-400"
              />
              <VoteButton
                active={comment.my_vote === -1}
                count={comment.downvotes}
                onClick={() => handleVoteClick(-1)}
                label="Dislike"
                icon={ThumbsDown}
                activeColor="text-rose-600 dark:text-rose-400"
              />
              {depth === 0 && user && (
                <button
                  type="button"
                  onClick={() => setReplying((r) => !r)}
                  className="rounded px-1.5 py-0.5 text-xs text-muted-foreground/60 hover:text-foreground"
                >
                  Reply
                </button>
              )}
              {isOwner && (
                <AlertDialog>
                  <AlertDialogTrigger
                    render={
                      <button
                        type="button"
                        aria-label="Delete comment"
                        className="rounded px-1.5 py-0.5 text-muted-foreground/60 hover:text-rose-600 dark:hover:text-rose-400"
                      />
                    }
                  >
                    <Trash2 className="size-3.5" />
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogTitle>Delete this comment?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This can&apos;t be undone. The comment will be replaced with
                      &quot;[deleted]&quot;{hasReplies ? ", but its replies will stay." : "."}
                    </AlertDialogDescription>
                    <AlertDialogFooter>
                      <AlertDialogClose render={<Button variant="outline" />}>Cancel</AlertDialogClose>
                      <AlertDialogClose
                        render={<Button variant="destructive" onClick={() => onDelete(comment.id)} />}
                      >
                        Delete
                      </AlertDialogClose>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          )}
          {replying && (
            <div className="mt-2">
              <CommentComposer
                placeholder="Write a reply…"
                submitLabel="Reply"
                autoFocus
                onCancel={() => setReplying(false)}
                onSubmit={async (body) => {
                  await onReply(comment.id, body);
                  setReplying(false);
                }}
              />
            </div>
          )}
        </div>
      </div>
      {hasReplies && !collapsed && (
        <div className="ml-8 flex flex-col gap-3 border-l pl-3">
          {comment.replies.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              depth={1}
              now={now}
              onVote={onVote}
              onUnvote={onUnvote}
              onDelete={onDelete}
              onReply={onReply}
            />
          ))}
        </div>
      )}
    </div>
  );
}
