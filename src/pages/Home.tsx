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
import { createRealtimeChannel } from "@/lib/realtime";

const Home = () => {
  const [sortBy, setSortBy] = useState("best");
  const { user } = useAuth();
  const [interestedExams, setInterestedExams] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [tagFilterMode, setTagFilterMode] = useState<'any' | 'all'>('any');

  // Use tag filter in usePosts hook - use useMemo to prevent unnecessary re-renders
  const tagFilter = useMemo(() => {
    if (selectedTags.length > 0) {
      return { tags: selectedTags, mode: tagFilterMode };
    }
    return undefined;
  }, [selectedTags, tagFilterMode]);
  
  const { posts, loading } = usePosts(tagFilter);

  // Listen for tag selection from sidebar
  useEffect(() => {
    const handleTagsSelected = (event: any) => {
      const tags = event.detail?.tags || [];
      const mode = event.detail?.mode || 'any';
      
      setSelectedTags(tags);
      setTagFilterMode(mode);
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

    // Real-time subscription for profile updates using realtime helper
    if (user) {
      if (typeof window === "undefined") return; // SSR guard

      const rt = createRealtimeChannel(`realtime:profile:${user.id}`);

      rt.onPostgresChange(
        { table: "profiles", event: "UPDATE", filter: `id=eq.${user.id}` },
        (payload) => {
          const updated = payload.new as any;
          if (updated.interested_exams) {
            setInterestedExams(updated.interested_exams);
          }
        }
      );

      rt.subscribe().catch((err: any) => {
        console.error("Failed to subscribe to profile realtime:", err);
      });

      return () => {
        rt.unsubscribe();
      };
    }
  }, [user]);

  // Filter posts by interested exams (only if no tag filter active)
  const filteredPosts = useMemo(() => {
    let filtered: any[] = [];
    let isFilterEmpty = false;
    
    // If tags are selected, posts are already filtered by usePosts hook
    if (selectedTags.length > 0) {
      filtered = posts;
      // Mark if tag filter resulted in empty results
      if (filtered.length === 0 && posts.length > 0) {
        isFilterEmpty = true;
      }
    } else {
      // Otherwise automatically filter by interested exams (no UI toggle)
      if (!user || interestedExams.length === 0) {
        filtered = posts;
      } else {
        filtered = posts.filter(post => {
          const postExamType = (post as any).exam_type;
          if (!postExamType) return false;
          return interestedExams.some(exam => exam.toLowerCase() === postExamType.toLowerCase());
        });
        // Mark if filter resulted in empty results
        if (filtered.length === 0 && posts.length > 0) {
          isFilterEmpty = true;
        }
      }
    }
    
    // If filtered posts length is zero, show all posts instead
    if (filtered.length === 0 && posts.length > 0) {
      return { posts: posts, isShowingAllDueToEmptyFilter: true };
    }
    
    return { posts: filtered, isShowingAllDueToEmptyFilter: isFilterEmpty };
  }, [posts, selectedTags, user, interestedExams]);

  const actualFilteredPosts = useMemo(() => filteredPosts.posts, [filteredPosts]);
  const isShowingAllDueToEmptyFilter = useMemo(() => filteredPosts.isShowingAllDueToEmptyFilter, [filteredPosts]);

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

  const sortedPosts = sortPosts(actualFilteredPosts);

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
              {selectedTags.length > 0 
                ? isShowingAllDueToEmptyFilter
                  ? "All Posts (no matches for selected tags)"
                  : `Posts tagged: ${selectedTags.join(', ')}`
                : user && interestedExams.length > 0
                ? isShowingAllDueToEmptyFilter
                  ? "All Posts (no matches for your exams)"
                  : "Posts For You"
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

        {/* Tag filter info */}
        {selectedTags.length > 0 && (
          <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium mb-2">
                  Showing posts matching {tagFilterMode === 'all' ? 'ALL' : 'ANY'} of these tags: ({actualFilteredPosts.length} posts)
                </p>
                <div className="flex flex-wrap gap-2">
                  {selectedTags.map((tag) => (
                    <Badge key={tag} variant="default" className="text-xs">
                      #{tag}
                    </Badge>
                  ))}
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedTags([]);
                  window.dispatchEvent(new CustomEvent('tagsSelected', { 
                    detail: { tags: [], mode: tagFilterMode } 
                  }));
                }}
                className="ml-4"
              >
                Clear Tags
              </Button>
            </div>
          </div>
        )}


        <div className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center min-h-[50vh]">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : sortedPosts.length === 0 ? (
            <div className="text-center py-12">
              <div className="mb-4">
                <p className="text-2xl mb-2">🔍</p>
                <p className="text-muted-foreground mb-4">
                  {selectedTags.length > 0
                    ? `No posts found with ${tagFilterMode === 'all' ? 'all' : 'any'} of the selected tags.`
                    : user && interestedExams.length > 0
                    ? "No posts found for your interested exams."
                    : "No posts yet. Be the first to create one!"}
                </p>
              </div>
              {selectedTags.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedTags([]);
                    window.dispatchEvent(new CustomEvent('tagsSelected', { 
                      detail: { tags: [], mode: tagFilterMode } 
                    }));
                  }}
                >
                  Clear Tag Filters
                </Button>
              )}
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
                  category={post.category}
                  examType={post.exam_type || ''}
                  comments={post.comments_count || 0}
                  views={post.views_count || 0}
                  tags={post.tags || []}
                  avatarUrl={post.profiles?.avatar_url}
                />
              ))
          )}
        </div>
      </div>
    </MainLayout>
  );
};

export default Home;
