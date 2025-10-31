import { useEffect, useState, useRef, useCallback } from "react";
import { supabase } from '../integrations/supabase/client';
import { useToast } from '../hooks/use-toast';
import { createRealtimeChannel } from "@/lib/realtime";

export function usePosts(tagFilter?: { tags: string[]; mode: 'any' | 'all' }) {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const channelRef = useRef<ReturnType<typeof createRealtimeChannel> | null>(null);

  const fetchPosts = useCallback(async () => {
    try {
      setLoading(true);

      let postsData;

      if (tagFilter && tagFilter.tags && tagFilter.tags.length > 0) {
        const normalizedTags = tagFilter.tags
          .map(tag => tag.trim().toLowerCase())
          .filter(tag => tag.length > 0);


        if (normalizedTags.length === 0) {
          const { data, error: postsError } = await supabase
            .from('posts')
            .select('*')
            .order('created_at', { ascending: false });

          if (postsError) throw postsError;
          postsData = data;
        } else {
          
          const { data: filteredPostIds, error: rpcError } = await (supabase as any)
            .rpc('get_posts_by_tags', {
              tag_names: normalizedTags,
              match_mode: tagFilter.mode || 'any'
            });

          if (rpcError) {
            console.error('❌ RPC error:', rpcError);
            toast({
              title: "Filter Error",
              description: rpcError.message || "Failed to filter posts by tags",
              variant: "destructive",
            });
            // Fallback to fetching all posts on error
            const { data, error: postsError } = await supabase
              .from('posts')
              .select('*')
              .order('created_at', { ascending: false });
            if (postsError) throw postsError;
            postsData = data;
          } else {
            if (!filteredPostIds || filteredPostIds.length === 0) {
              setPosts([]);
              setLoading(false);
              return;
            }

            const postIds = filteredPostIds.map((row: any) => row.post_id);

            if (postIds.length === 0) {
              setPosts([]);
              setLoading(false);
              return;
            }

            const { data, error: postsError } = await supabase
              .from('posts')
              .select('*')
              .in('id', postIds)
              .order('created_at', { ascending: false });

            if (postsError) throw postsError;
            postsData = data;
          }
        }
      } else {
        // Fetch all posts
        const { data, error: postsError } = await supabase
          .from('posts')
          .select('*')
          .order('created_at', { ascending: false });

        if (postsError) throw postsError;
        postsData = data;
      }

      if (postsData && postsData.length > 0) {
        // Fetch profiles
        const userIds = [...new Set(postsData.map((p: any) => p.user_id))] as string[];
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, username, avatar_url')
          .in('id', userIds);

        // Fetch tags for all posts
        const postIds = postsData.map(p => p.id);
        const { data: postTagsData } = await (supabase as any)
          .from('post_tags')
          .select('post_id, tag_id, tags(name)')
          .in('post_id', postIds);

        // Build tags map
        const tagsMap: Record<string, string[]> = {};
        if (postTagsData) {
          postTagsData.forEach((pt: any) => {
            if (!tagsMap[pt.post_id]) tagsMap[pt.post_id] = [];
            if (pt.tags?.name) tagsMap[pt.post_id].push(pt.tags.name);
          });
        }

        // Fetch view counts for all posts using efficient aggregation
        const viewsMap: Record<string, number> = {};
        if (postIds.length > 0) {
          try {
            // Fetch all views for these posts in a single query
            const { data: viewsData, error: viewsError } = await (supabase as any)
              .from('post_views')
              .select('post_id')
              .in('post_id', postIds);

            if (!viewsError && viewsData && Array.isArray(viewsData)) {
              // Count views per post efficiently
              viewsData.forEach((view: any) => {
                if (view && view.post_id) {
                  viewsMap[view.post_id] = (viewsMap[view.post_id] || 0) + 1;
                }
              });
            } else if (viewsError) {
              console.error('Error fetching view counts:', viewsError);
            }
          } catch (error) {
            console.error('Error fetching view counts:', error);
            // Continue without view counts if there's an error
          }
        }
        
        // Initialize view counts for posts that have no views
        postIds.forEach((postId: string) => {
          if (!viewsMap[postId]) {
            viewsMap[postId] = 0;
          }
        });

        // Merge data
        const postsWithData = postsData.map(post => ({
          ...post,
          profiles: profilesData?.find(p => p.id === post.user_id) || null,
          tags: tagsMap[post.id] || [],
          views_count: viewsMap[post.id] || 0
        }));

        setPosts(postsWithData);
      } else {
        setPosts([]);
      }
    } catch (error: any) {
      console.error("Error fetching posts:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to fetch posts",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [
    tagFilter ? tagFilter.tags?.join(',') : null,
    tagFilter?.mode,
    toast
  ]);

  // Initial fetch
  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  // Function to update view count for a specific post
  const updatePostViewCount = useCallback(async (postId: string) => {
    try {
      // Optimistically increment the view count immediately for better UX
      setPosts((prevPosts) =>
        prevPosts.map((post: any) => {
          if (post.id === postId) {
            return { ...post, views_count: (post.views_count || 0) + 1 };
          }
          return post;
        })
      );

      // Then fetch the actual count to ensure accuracy
      const { data: viewsData, error: viewsError } = await (supabase as any)
        .from('post_views')
        .select('post_id')
        .eq('post_id', postId);

      if (!viewsError && viewsData && Array.isArray(viewsData)) {
        const actualCount = viewsData.length;

        // Update with the actual count (in case of race conditions or optimistic update mismatch)
        setPosts((prevPosts) =>
          prevPosts.map((post: any) =>
            post.id === postId ? { ...post, views_count: actualCount } : post
          )
        );
      }
    } catch (error) {
      console.error('Error updating view count:', error);
    }
  }, []);

  // Set up real-time subscriptions using the new realtime helper
  useEffect(() => {
    if (loading) return;
    if (typeof window === "undefined") return; // SSR guard

    // Use the new realtime helper
    const rt = createRealtimeChannel("realtime:posts_bundle");

    rt.onPostgresChange({ table: "posts", event: "*" }, () => {
      fetchPosts();
    });
    
    rt.onPostgresChange({ table: "post_tags", event: "*" }, () => {
      fetchPosts();
    });
    
    rt.onPostgresChange({ table: "post_views", event: "INSERT" }, (payload: any) => {
      const postId = payload.new?.post_id;
      if (postId) {
        updatePostViewCount(postId);
      }
    });

    rt.subscribe().catch((err: any) => {
      console.error("Failed to subscribe to posts realtime:", err);
    });

    channelRef.current = rt;

    return () => {
      if (channelRef.current && typeof channelRef.current.unsubscribe === "function") {
        channelRef.current.unsubscribe();
      }
    };
  }, [loading, fetchPosts, updatePostViewCount]);

  return { posts, loading, refetch: fetchPosts };
}
