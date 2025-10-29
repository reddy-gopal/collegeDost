import { ArrowLeft, ThumbsUp, ThumbsDown, MessageSquare, Share2, Eye, Search } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { useState, useEffect } from "react";
import { Textarea } from "@/components/ui/textarea";


const CommentThread = ({ 
  comment, 
  depth = 0, 
  postId,
  authorId,
  onReply,
}: { 
  comment: any; 
  depth?: number;
  postId: string;
  authorId: string;
  onReply: (commentId: string) => void;
}) => {
  const { user, toggleCommentLike, toggleCommentDislike } = useAuth();
  const [showReplyBox, setShowReplyBox] = useState(false);
  const hasLiked = user ? comment.likes.includes(user.id) : false;
  const hasDisliked = user ? comment.dislikes.includes(user.id) : false;

  const handleLike = () => {
    if (user) {
      toggleCommentLike(postId, authorId, comment.id);
    }
  };

  const handleDislike = () => {
    if (user) {
      toggleCommentDislike(postId, authorId, comment.id);
    }
  };

  const timeAgo = (dateString: string) => {
    const now = new Date();
    const created = new Date(dateString);
    const seconds = Math.floor((now.getTime() - created.getTime()) / 1000);
    
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  return (
    <div className={`${depth > 0 ? "ml-8 border-l-2 pl-4" : ""}`}>
      <div className="flex items-start gap-3 mb-4">
        <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
          <span className="text-xs font-medium">
            {comment.authorName.substring(0, 2).toUpperCase()}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-semibold text-sm">{comment.authorName}</span>
            <span className="text-xs text-muted-foreground">• {timeAgo(comment.createdAt)}</span>
          </div>
          <p className="text-sm mb-2">{comment.content}</p>
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-7 gap-1 px-2"
              onClick={handleLike}
            >
              <ThumbsUp className={`h-3 w-3 ${hasLiked ? 'fill-red-500 text-red-500' : ''}`} />
              {comment.likes.length}
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-7 gap-1 px-2"
              onClick={handleDislike}
            >
              <ThumbsDown className={`h-3 w-3 ${hasDisliked ? 'fill-foreground' : ''}`} />
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-7 px-2"
              onClick={() => setShowReplyBox(!showReplyBox)}
            >
              Reply
            </Button>
          </div>
          {showReplyBox && (
            <div className="mt-2">
              <Textarea
                placeholder="Write a reply..."
                className="mb-2"
                id={`reply-${comment.id}`}
              />
              <div className="flex gap-2">
                <Button 
                  size="sm"
                  onClick={() => {
                    onReply(comment.id);
                    setShowReplyBox(false);
                  }}
                >
                  Reply
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => setShowReplyBox(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
      {comment.replies?.map((reply: any) => (
        <CommentThread 
          key={reply.id} 
          comment={reply} 
          depth={depth + 1}
          postId={postId}
          authorId={authorId}
          onReply={onReply}
        />
      ))}
    </div>
  );
};

const PostDetail = () => {
  const { id } = useParams();
  const { user, getPostById, addComment, togglePostLike, togglePostDislike } = useAuth();
  const [post, setPost] = useState<any>(null);
  const [newComment, setNewComment] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("best");

  useEffect(() => {
    if (id) {
      // Find post from all users
      const allUsers = JSON.parse(localStorage.getItem('mockUsers') || '[]');
      for (const userData of allUsers) {
        const foundPost = userData.posts.find((p: any) => p.id === id);
        if (foundPost) {
          setPost({ ...foundPost, authorId: userData.id });
          break;
        }
      }
    }
  }, [id]);

  const handleAddComment = () => {
    if (newComment.trim() && post && user) {
      addComment(post.id, post.authorId, newComment);
      setNewComment("");
      // Refresh post data
      const updatedPost = getPostById(post.id, post.authorId);
      if (updatedPost) {
        setPost({ ...updatedPost, authorId: post.authorId });
      }
    }
  };

  const handleReply = (parentCommentId: string) => {
    const replyInput = document.getElementById(`reply-${parentCommentId}`) as HTMLTextAreaElement;
    if (replyInput && replyInput.value.trim() && post && user) {
      addComment(post.id, post.authorId, replyInput.value, parentCommentId);
      replyInput.value = "";
      // Refresh post data
      const updatedPost = getPostById(post.id, post.authorId);
      if (updatedPost) {
        setPost({ ...updatedPost, authorId: post.authorId });
      }
    }
  };

  const handleLike = () => {
    if (user && post) {
      togglePostLike(post.id, post.authorId);
      const updatedPost = getPostById(post.id, post.authorId);
      if (updatedPost) {
        setPost({ ...updatedPost, authorId: post.authorId });
      }
    }
  };

  const handleDislike = () => {
    if (user && post) {
      togglePostDislike(post.id, post.authorId);
      const updatedPost = getPostById(post.id, post.authorId);
      if (updatedPost) {
        setPost({ ...updatedPost, authorId: post.authorId });
      }
    }
  };

  const timeAgo = (dateString: string) => {
    const now = new Date();
    const created = new Date(dateString);
    const seconds = Math.floor((now.getTime() - created.getTime()) / 1000);
    
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  if (!post) {
    return (
      <MainLayout>
        <div className="max-w-4xl mx-auto p-6">
          <p>Post not found</p>
        </div>
      </MainLayout>
    );
  }

  const hasLiked = user ? post.likes.includes(user.id) : false;
  const hasDisliked = user ? post.dislikes.includes(user.id) : false;

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto p-6">
        <Button variant="ghost" size="sm" className="mb-4" asChild>
          <Link to="/">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Link>
        </Button>

        <Card className="p-6 mb-6">
          <div className="flex items-start gap-3 mb-4">
            <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center">
              <span className="text-sm font-medium">
                {post.authorName.substring(0, 2).toUpperCase()}
              </span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <Link to={`/profile/${post.authorId}`} className="font-semibold hover:underline">
                  {post.authorName}
                </Link>
                <span className="text-sm text-muted-foreground">• {timeAgo(post.createdAt)}</span>
              </div>
              {post.location && (
                <p className="text-sm text-muted-foreground">{post.location}</p>
              )}
            </div>
          </div>

          <p className="text-base mb-4">{post.content}</p>

          {post.images && post.images.length > 0 && (
            <div className="grid gap-2 mb-4">
              {post.images.map((img: string, idx: number) => (
                <img key={idx} src={img} alt="" className="w-full rounded-lg" />
              ))}
            </div>
          )}

          {post.videos && post.videos.length > 0 && (
            <div className="grid gap-2 mb-4">
              {post.videos.map((video: string, idx: number) => (
                <video key={idx} src={video} controls className="w-full rounded-lg" />
              ))}
            </div>
          )}

          {post.poll && (
            <div className="mb-4 p-4 border rounded-lg">
              <h3 className="font-semibold mb-3">{post.poll.question}</h3>
              <div className="space-y-2">
                {post.poll.options.map((option: any) => (
                  <div key={option.id} className="p-3 bg-secondary rounded cursor-pointer hover:bg-secondary/80">
                    <div className="flex justify-between">
                      <span>{option.text}</span>
                      <span className="text-muted-foreground">{option.votes} votes</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center gap-4 pt-4 border-t">
            <Button 
              variant="ghost" 
              size="sm" 
              className="gap-2"
              onClick={handleLike}
            >
              <ThumbsUp className={`h-4 w-4 ${hasLiked ? 'fill-red-500 text-red-500' : ''}`} />
              {post.likes.length}
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className="gap-2"
              onClick={handleDislike}
            >
              <ThumbsDown className={`h-4 w-4 ${hasDisliked ? 'fill-foreground' : ''}`} />
            </Button>
            <Button variant="ghost" size="sm" className="gap-2">
              <MessageSquare className="h-4 w-4" />
              {post.comments.length}
            </Button>
            <div className="flex items-center gap-2 ml-auto">
              <Eye className="h-4 w-4" />
              <span className="text-sm">{post.views}</span>
            </div>
            <Button variant="ghost" size="sm" className="gap-2">
              <Share2 className="h-4 w-4" />
              Share
            </Button>
          </div>
        </Card>

        <Card className="p-6">
          <div className="mb-6">
            <Textarea
              placeholder="Join the conversation..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              className="mb-2"
            />
            <Button onClick={handleAddComment} disabled={!user}>
              Comment
            </Button>
            <div className="flex items-center justify-between mt-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Sort by:</span>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-32 h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="best">Best</SelectItem>
                    <SelectItem value="top">Top</SelectItem>
                    <SelectItem value="new">New</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search Comments"
                  className="pl-9 h-8 w-64"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="space-y-6">
            {post.comments.map((comment: any) => (
              <CommentThread 
                key={comment.id} 
                comment={comment} 
                postId={post.id}
                authorId={post.authorId}
                onReply={handleReply}
              />
            ))}
          </div>
        </Card>
      </div>
    </MainLayout>
  );
};

export default PostDetail;
