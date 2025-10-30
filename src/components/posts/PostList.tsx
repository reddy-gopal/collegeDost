import { useMemo } from "react";
import { Loader2 } from "lucide-react";
import { usePosts } from "@/hooks/usePosts";
import { PostCard } from "@/components/posts/PostCard";

export function PostList() {
  const { posts, loading } = usePosts();

  const emptyMessage = useMemo(() => (
    'No posts yet. Be the first to create one!'
  ), []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {posts.map((post: any) => (
        <PostCard 
          key={post.id}
          id={post.id}
          authorId={post.user_id}
          author={post.profiles?.username || 'Anonymous'}
          timeAgo={new Date(post.created_at).toLocaleString()}
          title={post.title || post.content?.substring(0, 100) || 'Untitled'}
          content={post.content || ''}
          image={post.image_url || ''}
          category={post.category || 'General'}
          comments={post.comments_count || 0}
          views={0}
          avatarUrl={post.profiles?.avatar_url}
        />
      ))}
    </div>
  );
}


