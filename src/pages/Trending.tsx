import { MainLayout } from "@/components/layout/MainLayout";
import { PostCard } from "@/components/posts/PostCard";
import { useTrendingPosts } from "@/hooks/useTrendingPosts";
import { Loader2, TrendingUp } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Card } from "@/components/ui/card";

const Trending = () => {
  const { posts, loading } = useTrendingPosts(25); // Show top 25 posts

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[50vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="max-w-3xl mx-auto p-6">
        <div className="mb-6 flex items-center gap-3">
          <TrendingUp className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Trending Posts</h1>
            <p className="text-sm text-muted-foreground">
              Hot topics and discussions right now
            </p>
          </div>
        </div>

        {posts.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground">No trending posts available</p>
          </Card>
        ) : (
          <div className="space-y-4">
            {posts.map((post) => (
              <PostCard 
                key={post.id}
                id={post.id}
                authorId={post.user_id}
                author={post.profiles?.username || 'Anonymous'}
                timeAgo={formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                title={post.title || post.content?.substring(0, 100) || 'Untitled'}
                content={post.content || ''}
                image={post.image_url}
                category={post.category || 'General'}
                comments={post.comments_count || 0}
                views={post.views_count || 0}
                avatarUrl={post.profiles?.avatar_url}
              />
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default Trending;
