import { TrendingUp, Loader2, ThumbsUp, MessageSquare } from "lucide-react";
import { Link } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { useTrendingPosts } from "@/hooks/useTrendingPosts";
import { formatDistanceToNow } from "date-fns";

export const TrendingSidebar = () => {
  const { posts, loading } = useTrendingPosts();

  console.log('TrendingSidebar - Posts:', posts);
  console.log('TrendingSidebar - Loading:', loading);

  return (
    <aside className="hidden xl:block w-80 border-l bg-card h-[calc(100vh-4rem)] sticky top-16 overflow-y-auto">
      <div className="p-4 space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="h-5 w-5 text-primary" />
          <h2 className="font-bold text-lg">Trending Posts</h2>
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm text-muted-foreground">No trending posts yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {posts.map((post, index) => (
              <Link key={post.id} to={`/post/${post.id}`}>
                <Card className="p-3 hover:bg-secondary/50 transition-colors cursor-pointer">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary text-sm">
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={post.profiles?.avatar_url} />
                          <AvatarFallback className="text-xs">
                            {post.profiles?.username?.charAt(0).toUpperCase() || "U"}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-xs font-medium truncate">
                          {post.profiles?.username || "Anonymous"}
                        </span>
                      </div>
                      
                      <p className="text-sm line-clamp-2 mb-2">
                        {post.title || post.content || 'No content'}
                      </p>

                      {post.image_url && (
                        <div className="relative w-full h-32 rounded-lg overflow-hidden mb-2">
                          <img
                            src={post.image_url}
                            alt="Post preview"
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        </div>
                      )}

                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <ThumbsUp className="h-3 w-3" />
                          <span>{post.likes_count || 0}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <MessageSquare className="h-3 w-3" />
                          <span>{post.comments_count || 0}</span>
                        </div>
                        <span className="text-xs">
                          {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                        </span>
                      </div>
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}

        {!loading && posts.length > 0 && (
          <div className="pt-4 border-t">
            <Link to="/trending">
              <button className="w-full text-sm text-primary hover:underline">
                View all trending posts →
              </button>
            </Link>
          </div>
        )}
      </div>
    </aside>
  );
};
