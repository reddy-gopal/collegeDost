import { useState, useEffect } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { CreatePost } from "@/components/posts/CreatePost";
import { PostCard } from "@/components/posts/PostCard";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePosts } from "@/hooks/usePosts";
import { ProfileUpdateNotification } from "@/components/notifications/ProfileUpdateNotification";
import { Loader2 } from "lucide-react";

const Home = () => {
  const [sortBy, setSortBy] = useState("best");
  const { posts, loading } = usePosts();

  // Preload images for first 3 posts
  useEffect(() => {
    if (posts.length > 0) {
      const sortedPosts = sortPosts(posts);
      sortedPosts.slice(0, 3).forEach(post => {
        if (post.image_url) {
          const img = new Image();
          img.src = post.image_url;
        }
      });
    }
  }, [posts, sortBy]);

  const getTimeAgo = (dateString: string) => {
    const now = new Date();
    const created = new Date(dateString);
    const seconds = Math.floor((now.getTime() - created.getTime()) / 1000);
    
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  const sortPosts = (postsToSort: any[]) => {
    switch (sortBy) {
      case "new":
        return [...postsToSort].sort((a, b) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
      case "top":
        return [...postsToSort].sort((a, b) => b.likes_count - a.likes_count);
      case "trending":
        return [...postsToSort].sort((a, b) => 
          (b.likes_count + b.comments_count * 2) - (a.likes_count + a.comments_count * 2)
        );
      case "best":
      default:
        return [...postsToSort].sort((a, b) => 
          (b.likes_count + b.comments_count * 2) - (a.likes_count + a.comments_count * 2)
        );
    }
  };

  const sortedPosts = sortPosts(posts);

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
      <ProfileUpdateNotification />
      <div className="max-w-3xl mx-auto p-4 md:p-6">
        <CreatePost />

        <div className="flex items-center justify-between mb-4 mt-6">
          <h2 className="text-xl font-semibold">Posts</h2>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Sort by:</span>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-popover z-50">
                <SelectItem value="best">Best</SelectItem>
                <SelectItem value="trending">Trending</SelectItem>
                <SelectItem value="new">New</SelectItem>
                <SelectItem value="top">Top</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-4">
          {sortedPosts.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No posts yet. Be the first to create one!</p>
            </div>
          ) : (
            sortedPosts.map((post) => (
              <PostCard 
                key={post.id}
                id={post.id}
                authorId={post.user_id}
                author={post.profiles?.username || 'Anonymous'}
                timeAgo={getTimeAgo(post.created_at)}
                title={post.title || post.content?.substring(0, 100) || 'Untitled'}
                content={post.content || ''}
                image={post.image_url || ''}
                category={post.category || 'General'}
                comments={post.comments_count || 0}
                views={0}
                avatarUrl={post.profiles?.avatar_url} // Pass avatar URL
              />
            ))
          )}
        </div>
      </div>
    </MainLayout>
  );
};

export default Home;
