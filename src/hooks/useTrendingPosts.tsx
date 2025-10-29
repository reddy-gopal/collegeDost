import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface TrendingPost {
  id: string;
  user_id: string;
  title?: string;
  content: string;
  image_url?: string;
  likes_count: number;
  comments_count: number;
  created_at: string;
  profiles?: {
    username: string;
    avatar_url?: string;
  };
}

export function useTrendingPosts() {
  const [posts, setPosts] = useState<TrendingPost[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchTrendingPosts = async () => {
    try {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      // Fetch posts from last 7 days
      const { data: postsData, error: postsError } = await supabase
        .from('posts')
        .select('*')
        .gte('created_at', sevenDaysAgo.toISOString())
        .order('likes_count', { ascending: false })
        .order('comments_count', { ascending: false })
        .limit(10);

      if (postsError) throw postsError;

      if (postsData && postsData.length > 0) {
        // Fetch profiles separately
        const userIds = [...new Set(postsData.map(p => p.user_id))];
        
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, username, avatar_url')
          .in('id', userIds);

        // Merge posts with profiles
        const postsWithProfiles = postsData.map(post => ({
          ...post,
          profiles: profilesData?.find(p => p.id === post.user_id) || null
        }));

        setPosts(postsWithProfiles);
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

    // Real-time subscription for post updates
    const channel = supabase
      .channel('trending-posts-channel')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'posts'
        },
        () => {
          fetchTrendingPosts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return { posts, loading, refetch: fetchTrendingPosts };
}
