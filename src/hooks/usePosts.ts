import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

// Add title to the Post interface
export interface Post {
  id: string;
  user_id: string;
  title?: string;
  content: string;
  image_url?: string;
  category?: string;
  tags?: string[];
  created_at: string;
  likes_count: number;
  comments_count: number;
  profiles?: {
    id: string;
    username: string;
    avatar_url?: string;
  } | null;
}

export const usePosts = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPosts = async () => {
    try {
      setLoading(true);

      // First, get all posts
      const { data: postsData, error: postsError } = await supabase
        .from('posts')
        .select('*')
        .order('created_at', { ascending: false });

      if (postsError) {
        console.error('Error fetching posts:', postsError);
        throw postsError;
      }

      console.log('Posts data:', postsData); // Debug log

      // Then, get profiles for each post
      if (postsData && postsData.length > 0) {
        const userIds = [...new Set(postsData.map(post => post.user_id))];

        console.log('User IDs to fetch:', userIds); // Debug log

        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, username, avatar_url')
          .in('id', userIds);

        if (profilesError) {
          console.error('Error fetching profiles:', profilesError);
        }

        console.log('Profiles data:', profilesData); // Debug log

        // Merge posts with profiles - ensure proper matching
        const postsWithProfiles = postsData.map(post => {
          const profile = profilesData?.find(p => p.id === post.user_id);
          console.log(`Post ${post.id} - user_id: ${post.user_id}, matched profile:`, profile); // Debug log
          return {
            ...post,
            profiles: profile || null
          };
        });

        console.log('Posts with profiles:', postsWithProfiles); // Debug log
        setPosts(postsWithProfiles as Post[]);
      } else {
        setPosts([]);
      }
    } catch (error) {
      console.error('Error in fetchPosts:', error);
      setPosts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();

    // Subscribe to real-time changes
    const channel = supabase
      .channel('posts-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'posts'
        },
        () => {
          fetchPosts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return { posts, loading, refetch: fetchPosts };
};
