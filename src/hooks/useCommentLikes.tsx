import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export function useCommentLikes(commentId: string, userId: string | undefined) {
  const [hasLiked, setHasLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const { toast } = useToast();

  const checkIfLiked = useCallback(async () => {
    if (!userId) return;
    
    try {
      const { data, error } = await supabase
        .from('likes')
        .select('id')
        .eq('comment_id', commentId)
        .eq('user_id', userId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;
      setHasLiked(!!data);
    } catch (error: any) {
      console.error('Error checking like status:', error);
    }
  }, [commentId, userId]);

  const fetchLikesCount = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('comments')
        .select('likes_count')
        .eq('id', commentId)
        .maybeSingle();

      if (error) throw error;
      setLikesCount(data?.likes_count || 0);
    } catch (error: any) {
      console.error('Error fetching likes count:', error);
    }
  }, [commentId]);

  useEffect(() => {
    if (userId) {
      checkIfLiked();
    }
    fetchLikesCount();
  }, [commentId, userId, checkIfLiked, fetchLikesCount]);

  // Set up real-time subscription for likes_count changes
  useEffect(() => {
    const channel = supabase
      .channel(`comment-likes-${commentId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'comments',
          filter: `id=eq.${commentId}`
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
  }, [commentId]);

  const toggleLike = async () => {
    if (!userId) {
      toast({
        title: "Authentication required",
        description: "Please sign in to like comments",
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
        const { error } = await supabase
          .from('likes')
          .delete()
          .eq('comment_id', commentId)
          .eq('user_id', userId);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('likes')
          .insert({ comment_id: commentId, user_id: userId });

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
