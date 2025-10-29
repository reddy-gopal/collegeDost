import { useEffect, useState } from "react";
import { ArrowLeft, ThumbsUp, Share2, Eye, Loader2 } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import { useLikes } from "@/hooks/useLikes";
import { supabase } from "@/integrations/supabase/client";
import { CommentSection } from "@/components/posts/CommentSection";
import { formatDistanceToNow } from "date-fns";

const PostDetailUpdated = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const [post, setPost] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { hasLiked, likesCount, toggleLike } = useLikes(id!, user?.id);

  useEffect(() => {
    const fetchPost = async () => {
      if (!id) return;

      try {
        const { data, error } = await supabase
          .from('posts')
          .select(`
            *,
            profiles:user_id (
              username,
              avatar_url
            )
          `)
          .eq('id', id)
          .single();

        if (error) throw error;
        setPost(data);
      } catch (error) {
        console.error('Error fetching post:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPost();
  }, [id]);

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[50vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  if (!post) {
    return (
      <MainLayout>
        <div className="max-w-4xl mx-auto p-6">
          <Card className="p-6">
            <p className="text-center">Post not found</p>
          </Card>
        </div>
      </MainLayout>
    );
  }

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
            <Avatar className="h-10 w-10">
              <AvatarImage src={post.profiles?.avatar_url} />
              <AvatarFallback>
                {post.profiles?.username?.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center gap-2">
                <Link
                  to={`/profile/${post.user_id}`}
                  className="font-semibold hover:underline"
                >
                  {post.profiles?.username || 'Anonymous'}
                </Link>
                <span className="text-sm text-muted-foreground">
                  • {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                </span>
              </div>
            </div>
          </div>

          <p className="text-base mb-4">{post.content}</p>

          {post.image_url && (
            <div className="relative w-full flex justify-center bg-muted/30 rounded-lg p-4 mb-4">
              <img
                src={post.image_url}
                alt="Post content"
                className="max-w-full h-auto object-contain rounded-lg shadow-md"
                style={{ maxHeight: '700px' }}
                loading="lazy"
                onError={(e) => {
                  e.currentTarget.src = '/placeholder.svg';
                }}
              />
            </div>
          )}

          <div className="flex items-center gap-4 pt-4 border-t">
            <Button
              variant="ghost"
              size="sm"
              className="gap-2 hover:bg-transparent"
              onClick={() => {
                if (!user) {
                  return;
                }
                toggleLike();
              }}
            >
              <ThumbsUp
                className={`h-5 w-5 ${hasLiked ? 'fill-red-500 text-red-500' : 'text-muted-foreground'}`}
              />
              <span className="font-medium">{likesCount}</span>
            </Button>
            <Button variant="ghost" size="sm" className="gap-2 hover:bg-transparent text-muted-foreground">
              <Share2 className="h-5 w-5" />
              Share
            </Button>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="text-xl font-bold mb-4">Comments</h2>
          <CommentSection postId={id!} />
        </Card>
      </div>
    </MainLayout>
  );
};

export default PostDetailUpdated;
