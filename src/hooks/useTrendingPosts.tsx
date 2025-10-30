import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface TrendingPost {
  id: string;
  user_id: string;
  title?: string;
  content: string;
  image_url?: string;
  category?: string; // ADD THIS
  likes_count: number;
  comments_count: number;
  trend_score: number;
  created_at: string;
  profiles?: {
    username: string;
    avatar_url?: string;
  };
  tags?: string[];
  views_count?: number;
}

export function useTrendingPosts(limit: number = 10) {
  const [posts, setPosts] = useState<TrendingPost[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const channelRef = useRef<any>(null);

  const fetchTrendingPosts = async () => {
    try {
      setLoading(true);

      // Fetch candidate posts (last 7 days + top by counts) to compute scores
      const { data: postsData, error: postsError } = await supabase
        .from('posts')
        .select('*')
        .gte('created_at', new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString())
        .order('created_at', { ascending: false })
        .limit(500);

      if (postsError) throw postsError;

      if (postsData && postsData.length > 0) {
        // Fetch profiles
        const userIds = [...new Set(postsData.map(p => p.user_id))];
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

        // Fetch view counts efficiently via RPC; fallback to direct query if RPC missing
        let viewsMap: Record<string, number> = {};
        try {
          const { data: rpcViews } = await (supabase as any).rpc('get_post_views_counts', { post_ids: postIds });
          if (rpcViews) {
            rpcViews.forEach((row: any) => {
              viewsMap[row.post_id] = Number(row.views) || 0;
            });
          }
        } catch {
          const { data: viewsData } = await (supabase as any)
            .from('post_views')
            .select('post_id')
            .in('post_id', postIds);
          viewsMap = {};
          if (viewsData) {
            viewsData.forEach((view: any) => {
              viewsMap[view.post_id] = (viewsMap[view.post_id] || 0) + 1;
            });
          }
        }

        // Compute trending score with time decay if trend_score not present
        const now = Date.now();
        const decay = (createdAt: string) => {
          const hours = Math.max(1, (now - new Date(createdAt).getTime()) / 3600000);
          return Math.pow(hours + 2, 1.5);
        };

        // Merge and score with views
        const scored = (postsData as any[]).map((post: any) => {
          const postWithTrend = post as any as { trend_score?: number | null; [k: string]: any };
          const baseLikes = postWithTrend.likes_count || 0;
          const baseComments = postWithTrend.comments_count || 0;
          const views = viewsMap[postWithTrend.id] || 0;
          const raw = (baseLikes * 1) + (baseComments * 2) + (views * 0.2);
          const computedScore = raw / decay(postWithTrend.created_at);
          const score = (typeof postWithTrend.trend_score === 'number' && !Number.isNaN(postWithTrend.trend_score))
            ? postWithTrend.trend_score!
            : computedScore;
          const merged: TrendingPost = {
            id: postWithTrend.id,
            user_id: postWithTrend.user_id,
            title: postWithTrend.title,
            content: postWithTrend.content,
            image_url: postWithTrend.image_url,
            category: postWithTrend.category, // NOW INCLUDED
            likes_count: postWithTrend.likes_count || 0,
            comments_count: postWithTrend.comments_count || 0,
            trend_score: score,
            created_at: postWithTrend.created_at,
            profiles: profilesData?.find(p => p.id === postWithTrend.user_id) || undefined,
            tags: tagsMap[postWithTrend.id] || [],
            views_count: views,
          };
          return merged;
        });

        // Sort by score desc and limit
        scored.sort((a, b) => (b.trend_score || 0) - (a.trend_score || 0));
        setPosts(scored.slice(0, limit));
      } else {
        setPosts([]);
      }
    } catch (error: any) {
      console.error("Error fetching trending posts:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to fetch trending posts",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrendingPosts();

    // Real-time subscription for posts table changes
    const channel = supabase
      .channel('trending-posts-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'posts'
        },
        (payload) => {
          console.log('Post change detected:', payload);
          // Refetch when any post changes (likes, comments, etc.)
          fetchTrendingPosts();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'post_views'
        },
        () => {
          // Refetch when views are added
          fetchTrendingPosts();
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [limit]);

  return { posts, loading, refetch: fetchTrendingPosts };
}
