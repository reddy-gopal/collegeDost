import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export function useLikes(postId: string, userId: string | undefined) {
  const [hasLiked, setHasLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const { toast } = useToast();

  const checkIfLiked = useCallback(async () => {
    if (!userId) return;
    
    try {
      const { data, error } = await (supabase as any)
        .from('likes')
        .select('id')
        .eq('post_id', postId)
        .eq('user_id', userId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;
      setHasLiked(!!data);
    } catch (error: any) {
      console.error('Error checking like status:', error);
    }
  }, [postId, userId]);

  const fetchLikesCount = useCallback(async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('posts')
        .select('likes_count')
        .eq('id', postId)
        .maybeSingle();

      if (error) throw error;
      setLikesCount(data?.likes_count || 0);
    } catch (error: any) {
      console.error('Error fetching likes count:', error);
    }
  }, [postId]);

  useEffect(() => {
    if (userId) {
      checkIfLiked();
    }
    fetchLikesCount();
  }, [postId, userId, checkIfLiked, fetchLikesCount]);

  // Set up real-time subscription for likes_count changes
  useEffect(() => {
    const channel = supabase
      .channel(`post-likes-${postId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'posts',
          filter: `id=eq.${postId}`
        },
        (payload) => {
          if (payload.new && (payload.new as any).likes_count !== undefined) {
            setLikesCount((payload.new as any).likes_count);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [postId]);

  const toggleLike = async () => {
    if (!userId) {
      toast({
        title: "Authentication required",
        description: "Please sign in to like posts",
        variant: "destructive",
      });
      return;
    }

    // Optimistic update
    const previousLiked = hasLiked;
    const previousCount = likesCount;

    if (hasLiked) {
      setHasLiked(false);
      setLikesCount(prev => Math.max(0, prev - 1));
    } else {
      setHasLiked(true);
      setLikesCount(prev => prev + 1);
    }

    try {
      if (previousLiked) {
        const { error } = await (supabase as any)
          .from('likes')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', userId);

        if (error) throw error;
      } else {
        const { error } = await (supabase as any)
          .from('likes')
          .insert({ post_id: postId, user_id: userId });

        if (error) throw error;
      }
      // Database triggers will update the likes_count automatically
    } catch (error: any) {
      // Revert optimistic update on error
      setHasLiked(previousLiked);
      setLikesCount(previousCount);
      
      toast({
        title: "Error",
        description: error.message || "Failed to update like",
        variant: "destructive",
      });
    }
  };

  return { hasLiked, likesCount, toggleLike };
}
