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

        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, username, avatar_url')
          .in('id', userIds);

        if (profilesData) {
          console.log('Profiles data:', profilesData); // Debug log
        }

        // Fetch tags for all posts through post_tags junction table
        const postIds = postsData.map(p => p.id);
        const { data: postTagsData } = await (supabase as any)
          .from('post_tags')
          .select('post_id, tag_id, tags(name)')
          .in('post_id', postIds);

        // Build a map of post_id -> tag names
        const postTagsMap: Record<string, string[]> = {};
        if (postTagsData) {
          postTagsData.forEach((pt: any) => {
            if (!postTagsMap[pt.post_id]) {
              postTagsMap[pt.post_id] = [];
            }
            if (pt.tags?.name) {
              postTagsMap[pt.post_id].push(pt.tags.name);
            }
          });
        }

        // Merge posts with profiles and tags
        const postsWithProfilesAndTags = postsData.map(post => ({
          ...post,
          profiles: profilesData?.find(profile => profile.id === post.user_id) || null,
          tags: postTagsMap[post.id] || [] // Tags from post_tags table
        }));

        console.log('Posts with profiles and tags:', postsWithProfilesAndTags); // Debug log
        setPosts(postsWithProfilesAndTags as Post[]);
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

    // Subscribe to real-time changes on posts (covers trigger-based likes_count updates)
    const postsChannel = (supabase as any)
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

    // Also subscribe to likes table to catch UI likes changes immediately
    const likesChannel = (supabase as any)
      .channel('likes-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'likes'
        },
        () => {
          fetchPosts();
        }
      )
      .subscribe();

    return () => {
      (supabase as any).removeChannel(postsChannel);
      (supabase as any).removeChannel(likesChannel);
    };
  }, []);

  return { posts, loading, refetch: fetchPosts };
};
