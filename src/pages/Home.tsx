import { useState, useEffect, useMemo } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { CreatePost } from "@/components/posts/CreatePost";
import { PostCard } from "@/components/posts/PostCard";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { usePosts } from "@/hooks/usePosts";
import { ProfileUpdateNotification } from "@/components/notifications/ProfileUpdateNotification";
import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

const Home = () => {
  const [sortBy, setSortBy] = useState("best");
  const { posts, loading } = usePosts();
  const { user } = useAuth();
  const [interestedExams, setInterestedExams] = useState<string[]>([]);
  const [showAllPosts, setShowAllPosts] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [tagFilterMode, setTagFilterMode] = useState<'any' | 'all'>('any');
  // Listen for multi-tag selection from sidebar
  useEffect(() => {
    const handleTagsSelected = (event: any) => {
      const tags = event.detail?.tags || [];
      const mode = event.detail?.mode || 'any';
      setSelectedTags(tags);
      setTagFilterMode(mode);
      if (tags.length > 0) {
        setShowAllPosts(true); // show all posts but filtered by tags
      }
    };
    window.addEventListener('tagsSelected', handleTagsSelected);
    return () => window.removeEventListener('tagsSelected', handleTagsSelected);
  }, []);

  // Fetch user's interested exams
  useEffect(() => {
    const fetchInterestedExams = async () => {
      if (!user) return;
      
      try {
        const { data } = await supabase
          .from('profiles')
          .select('interested_exams')
          .eq('id', user.id)
          .single();

        if (data?.interested_exams && data.interested_exams.length > 0) {
          setInterestedExams(data.interested_exams);
        }
      } catch (error) {
        console.error('Error fetching interested exams:', error);
      }
    };

    fetchInterestedExams();

    // Real-time subscription for profile updates
    if (user) {
      const channel = supabase
        .channel(`profile-exams-${user.id}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'profiles',
            filter: `id=eq.${user.id}`
          },
          (payload) => {
            const updated = payload.new as any;
            if (updated.interested_exams) {
              setInterestedExams(updated.interested_exams);
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user]);

  // Filter logic: if tags selected, apply tag filter; else personalize by interested exams
  const filteredPosts = useMemo(() => {
    if (selectedTags.length > 0) {
      return posts.filter((post: any) => {
        const postTags: string[] = (post.tags || []).map((t: string) => t.toLowerCase());
        if (tagFilterMode === 'all') {
          return selectedTags.every(t => postTags.includes(t.toLowerCase()));
        }
        return selectedTags.some(t => postTags.includes(t.toLowerCase()));
      });
    }

    if (!user || interestedExams.length === 0 || showAllPosts) {
      return posts;
    }

    return posts.filter(post => {
      const postExamType = (post as any).exam_type;
      if (!postExamType) return false;
      return interestedExams.some(exam => exam.toLowerCase() === postExamType.toLowerCase());
    });
  }, [posts, selectedTags, tagFilterMode, user, interestedExams, showAllPosts]);

  const sortPosts = (postsToSort: any[]) => {
    switch (sortBy) {
      case "new":
        return [...postsToSort].sort((a, b) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
      case "top":
        return [...postsToSort].sort((a, b) => b.likes_count - a.likes_count);
      case "trending":
        return [...postsToSort].sort((a, b) => {
          const scoreB = (b.likes_count || 0) + ((b.comments_count || 0) * 2);
          const scoreA = (a.likes_count || 0) + ((a.comments_count || 0) * 2);
          return scoreB - scoreA;
        });
      case "best":
      default:
        return [...postsToSort].sort((a, b) => {
          const scoreB = (b.likes_count || 0) + ((b.comments_count || 0) * 2);
          const scoreA = (a.likes_count || 0) + ((a.comments_count || 0) * 2);
          return scoreB - scoreA;
        });
    }
  };

  const sortedPosts = sortPosts(filteredPosts);

  // Preload images for first 3 posts
  useEffect(() => {
    if (sortedPosts.length > 0) {
      sortedPosts.slice(0, 3).forEach(post => {
        if (post.image_url) {
          const img = new Image();
          img.src = post.image_url;
        }
      });
    }
  }, [sortedPosts]);

  const getTimeAgo = (dateString: string) => {
    const now = new Date();
    const created = new Date(dateString);
    const seconds = Math.floor((now.getTime() - created.getTime()) / 1000);
    
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

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
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-semibold">
              {selectedTags.length > 0 ? "Filtered by tags" : user && interestedExams.length > 0 && !showAllPosts
                ? "Posts for You"
                : "All Posts"}
            </h2>
          </div>
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

        {/* Show filter info when user has interested exams */}
        {user && interestedExams.length > 0 && (
          <div className="mb-4 p-3 bg-primary/10 border border-primary/20 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium mb-2">
                  {showAllPosts 
                    ? `Showing all posts (${posts.length} total)` 
                    : `Showing posts filtered by your interested exams (${filteredPosts.length} posts)`}
                </p>
                {!showAllPosts && (
                  <div className="flex flex-wrap gap-2">
                    {interestedExams.slice(0, 5).map((exam) => (
                      <Badge key={exam} variant="secondary" className="text-xs">
                        {exam}
                      </Badge>
                    ))}
                    {interestedExams.length > 5 && (
                      <Badge variant="secondary" className="text-xs">
                        +{interestedExams.length - 5} more
                      </Badge>
                    )}
                  </div>
                )}
              </div>
              <Button
                variant={showAllPosts ? "default" : "outline"}
                size="sm"
                onClick={() => setShowAllPosts(!showAllPosts)}
                className="ml-4"
              >
                {showAllPosts ? "Show Filtered" : "Show All"}
              </Button>
            </div>
          </div>
        )}

        <div className="space-y-4">
          {sortedPosts.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">
                {user && interestedExams.length > 0 && !showAllPosts
                  ? "No posts found for your interested exams. Try viewing all posts or update your interested exams in settings."
                  : "No posts yet. Be the first to create one!"}
              </p>
              {user && interestedExams.length > 0 && !showAllPosts && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAllPosts(true)}
                >
                  View All Posts
                </Button>
              )}
            </div>
          ) : (
            <>
              {user && interestedExams.length > 0 && !showAllPosts && (
                <div className="text-sm text-muted-foreground">
                  Showing {sortedPosts.length} post{sortedPosts.length !== 1 ? 's' : ''} matching your interested exams
                </div>
              )}
              {sortedPosts.map((post) => (
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
                  avatarUrl={post.profiles?.avatar_url}
                />
              ))}
            </>
          )}
        </div>
      </div>
    </MainLayout>
  );
};

export default Home;
