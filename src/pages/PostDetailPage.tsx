import { useEffect, useState } from "react";
import { ArrowLeft, ThumbsUp, Share2, Loader2 } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import { useLikes } from "@/hooks/useLikes";
import { supabase } from "@/integrations/supabase/client";
import { CommentSection } from "@/components/posts/CommentSection";
import { formatDistanceToNow } from "date-fns";
import { motion } from "framer-motion";
import { usePostView } from "@/hooks/usePostView";

export default function PostDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [post, setPost] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { hasLiked, likesCount, toggleLike } = useLikes(id!, user?.id);

  // Track post view
  usePostView(id);

  useEffect(() => {
    const fetchPost = async () => {
      if (!id) return;

      try {
        setLoading(true);
        setError(null);

        // Fetch post
        const { data: postData, error: fetchError } = await supabase
          .from("posts")
          .select("*")
          .eq("id", id)
          .single();

        if (fetchError) throw fetchError;

        if (postData) {
          // Fetch profile
          const { data: profileData } = await supabase
            .from("profiles")
            .select("id, username, avatar_url")
            .eq("id", postData.user_id)
            .single();

          // Fetch tags through post_tags junction table
          const { data: postTagsData } = await (supabase as any)
            .from('post_tags')
            .select('tag_id, tags(name)')
            .eq('post_id', id);

          const tags = postTagsData?.map((pt: any) => pt.tags?.name).filter(Boolean) || [];

          setPost({
            ...postData,
            profiles: profileData,
            tags: tags // Override with tags from post_tags
          });
        }
      } catch (err: any) {
        console.error("Error fetching post:", err);
        setError(err.message || "Failed to fetch post");
      } finally {
        setLoading(false);
      }
    };

    fetchPost();

    // Real-time subscription for post updates
    if (id) {
      const channel = supabase
        .channel(`post-detail-${id}`)
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "posts",
            filter: `id=eq.${id}`,
          },
          (payload) => {
            setPost((prev: any) => (prev ? { ...prev, ...payload.new } : payload.new));
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [id]);

  if (loading) {
    return (
      <MainLayout>
        <div className="max-w-4xl mx-auto p-4 md:p-6">
          <Skeleton className="h-10 w-24 mb-4" />
          <Card className="p-6 space-y-4">
            <div className="flex items-start gap-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-64 w-full" />
          </Card>
        </div>
      </MainLayout>
    );
  }

  if (error || !post) {
    return (
      <MainLayout>
        <div className="max-w-4xl mx-auto p-6">
          <Card className="p-6">
            <p className="text-center text-destructive">
              {error || "Post not found"}
            </p>
            <div className="flex justify-center mt-4">
              <Button asChild variant="outline">
                <Link to="/">Go Home</Link>
              </Button>
            </div>
          </Card>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-4xl mx-auto p-4 md:p-6"
      >
        <Button variant="ghost" size="sm" className="mb-4" asChild>
          <Link to="/">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Link>
        </Button>

        <Card className="p-6 mb-6">
          {/* Post Header */}
          <div className="flex items-start gap-3 mb-4">
            <Avatar className="h-10 w-10">
              <AvatarImage src={post.profiles?.avatar_url} />
              <AvatarFallback>
                {post.profiles?.username?.charAt(0).toUpperCase() || "U"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <Link
                  to={`/profile/${post.user_id}`}
                  className="font-semibold hover:underline"
                >
                  {post.profiles?.username || "Anonymous"}
                </Link>
                <span className="text-sm text-muted-foreground">
                  • {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                </span>
              </div>
              {post.category && (
                <span className="text-xs text-muted-foreground">{post.category}</span>
              )}
            </div>
          </div>

          {/* Post Title */}
          {post.title && (
            <h1 className="text-2xl font-bold mb-4">{post.title}</h1>
          )}

          {/* Post Content */}
          {post.content && (
            <p className="text-base mb-4 whitespace-pre-wrap">{post.content}</p>
          )}

          {/* Post Tags - Display tags from post_tags table */}
          {post.tags && post.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {post.tags.map((tag: string, idx: number) => (
                <span
                  key={idx}
                  className="px-2 py-1 text-xs bg-secondary rounded-full hover:bg-secondary/80 cursor-pointer transition-colors"
                  onClick={() => {
                    // Navigate to tag filter page
                    window.location.href = `/?tag=${tag}`;
                  }}
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {/* Post Image */}
          {post.image_url && (
            <div className="relative w-full flex justify-center bg-muted/30 rounded-lg p-4 mb-4">
              <img
                src={post.image_url}
                alt="Post content"
                className="max-w-full h-auto object-contain rounded-lg shadow-md"
                style={{ maxHeight: "700px" }}
                loading="eager"
                fetchPriority="high"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
            </div>
          )}

          {/* Post Link */}
          {post.link_url && (
            <a
              href={post.link_url}
              target="_blank"
              rel="noopener noreferrer"
              className="block p-4 border rounded-lg hover:bg-secondary/50 transition-colors mb-4"
            >
              <span className="text-sm text-primary hover:underline">
                {post.link_url}
              </span>
            </a>
          )}

          {/* Post Actions */}
          <div className="flex items-center gap-4 pt-4 border-t">
            <Button
              variant="ghost"
              size="sm"
              className="gap-2 hover:bg-transparent"
              onClick={toggleLike}
              disabled={!user}
            >
              <ThumbsUp
                className={`h-5 w-5 transition-colors ${
                  hasLiked ? "fill-red-500 text-red-500" : "text-muted-foreground"
                }`}
              />
              <span className="font-medium">{likesCount}</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="gap-2 hover:bg-transparent text-muted-foreground"
            >
              <Share2 className="h-5 w-5" />
              Share
            </Button>
            <span className="ml-auto text-sm text-muted-foreground">
              {post.comments_count || 0} comments
            </span>
          </div>
        </Card>

        {/* Comments Section */}
        <Card className="p-6">
          <h2 className="text-xl font-bold mb-4">Comments</h2>
          <CommentSection postId={id!} />
        </Card>
      </motion.div>
    </MainLayout>
  );
}
