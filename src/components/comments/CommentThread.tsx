import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ThumbsUp, MessageSquare, ChevronDown, ChevronUp } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useCommentLike } from "@/hooks/useCommentLike";
import { useCommentsList } from "@/hooks/useCommentsList";
import { formatDistanceToNow } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";

interface Comment {
  id: string;
  content: string;
  user_id: string;
  created_at: string;
  likes_count: number;
  profiles?: {
    username: string;
    avatar_url?: string;
  };
  replies?: Comment[];
  reply_count?: number;
}

interface CommentThreadProps {
  comment: Comment;
  postId: string;
  depth: number;
}

export function CommentThread({ comment, postId, depth }: CommentThreadProps) {
  const { user } = useAuth();
  const { addComment } = useCommentsList(postId);
  const { hasLiked, likesCount, toggleLike } = useCommentLike(comment.id, user?.id);
  
  const [showReplyBox, setShowReplyBox] = useState(false);
  const [replyContent, setReplyContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showReplies, setShowReplies] = useState(true);

  const handleReply = async () => {
    if (!replyContent.trim() || !user) return;

    setIsSubmitting(true);
    try {
      await addComment(replyContent, user.id, comment.id);
      setReplyContent("");
      setShowReplyBox(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const hasReplies = comment.replies && comment.replies.length > 0;
  const indentWidth = Math.min(depth * 24, 120); // Max 120px indent

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative"
      style={{ marginLeft: `${indentWidth}px` }}
    >
      {/* Connector Line */}
      {depth > 0 && (
        <div
          className="absolute top-0 bottom-0 -left-3 w-0.5 bg-border"
          style={{ left: `-${Math.min(depth * 12, 60)}px` }}
        />
      )}

      <div className="space-y-3">
        {/* Comment Header */}
        <div className="flex items-start gap-3">
          <Avatar className="h-8 w-8 flex-shrink-0">
            <AvatarImage src={comment.profiles?.avatar_url} />
            <AvatarFallback>
              {comment.profiles?.username?.charAt(0).toUpperCase() || "U"}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Link
                to={`/profile/${comment.user_id}`}
                className="font-semibold text-sm hover:underline"
              >
                {comment.profiles?.username || "Anonymous"}
              </Link>
              <span className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
              </span>
            </div>

            {/* Comment Content */}
            <p className="text-sm mb-2 whitespace-pre-wrap break-words">
              {comment.content}
            </p>

            {/* Comment Actions */}
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 gap-1 px-2 hover:bg-transparent"
                onClick={toggleLike}
                disabled={!user}
              >
                <ThumbsUp
                  className={`h-3.5 w-3.5 ${
                    hasLiked ? "fill-red-500 text-red-500" : "text-muted-foreground"
                  }`}
                />
                <span className="text-xs">{likesCount}</span>
              </Button>

              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 hover:bg-transparent text-muted-foreground"
                onClick={() => setShowReplyBox(!showReplyBox)}
                disabled={!user}
              >
                <MessageSquare className="h-3.5 w-3.5 mr-1" />
                <span className="text-xs">Reply</span>
              </Button>

              {hasReplies && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 hover:bg-transparent text-muted-foreground"
                  onClick={() => setShowReplies(!showReplies)}
                >
                  {showReplies ? (
                    <ChevronUp className="h-3.5 w-3.5 mr-1" />
                  ) : (
                    <ChevronDown className="h-3.5 w-3.5 mr-1" />
                  )}
                  <span className="text-xs">
                    {comment.replies!.length} {comment.replies!.length === 1 ? "reply" : "replies"}
                  </span>
                </Button>
              )}
            </div>

            {/* Reply Input */}
            <AnimatePresence>
              {showReplyBox && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-3 space-y-2"
                >
                  <Textarea
                    placeholder="Write a reply..."
                    value={replyContent}
                    onChange={(e) => setReplyContent(e.target.value)}
                    disabled={isSubmitting}
                    rows={2}
                    className="text-sm"
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={handleReply}
                      disabled={!replyContent.trim() || isSubmitting}
                    >
                      {isSubmitting ? "Replying..." : "Reply"}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setShowReplyBox(false);
                        setReplyContent("");
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Nested Replies */}
        <AnimatePresence>
          {showReplies && hasReplies && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-4 mt-4"
            >
              {comment.replies!.map((reply) => (
                <CommentThread
                  key={reply.id}
                  comment={reply}
                  postId={postId}
                  depth={depth + 1}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
