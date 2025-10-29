import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useDebouncedCallback } from "use-debounce";

export function useCommentLike(commentId: string, userId: string | undefined) {
  const [hasLiked, setHasLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const { toast } = useToast();

  const checkLikeStatus = useCallback(async () => {
    if (!userId || !commentId) return;

    try {
      const { data } = await supabase
        .from("likes")
        .select("id")
        .eq("comment_id", commentId)
        .eq("user_id", userId)
        .maybeSingle();

      setHasLiked(!!data);
    } catch (error) {
      console.error("Error checking like status:", error);
    }
  }, [commentId, userId]);

  const fetchLikesCount = useCallback(async () => {
    if (!commentId) return;

    try {
      const { data } = await supabase
        .from("comments")
        .select("likes_count")
        .eq("id", commentId)
        .single();

      setLikesCount(data?.likes_count || 0);
    } catch (error) {
      console.error("Error fetching likes count:", error);
    }
  }, [commentId]);

  useEffect(() => {
    checkLikeStatus();
    fetchLikesCount();
  }, [checkLikeStatus, fetchLikesCount]);

  // Real-time subscription
  useEffect(() => {
    if (!commentId) return;

    const channel = supabase
      .channel(`comment-likes-${commentId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "comments",
          filter: `id=eq.${commentId}`,
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

  const debouncedToggle = useDebouncedCallback(async (shouldLike: boolean) => {
    if (!userId) return;

    try {
      if (shouldLike) {
        const { error } = await supabase
          .from("likes")
          .insert({ comment_id: commentId, user_id: userId });
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("likes")
          .delete()
          .eq("comment_id", commentId)
          .eq("user_id", userId);
        if (error) throw error;
      }
    } catch (error: any) {
      // Revert optimistic update
      setHasLiked(!shouldLike);
      setLikesCount((prev) => (shouldLike ? prev - 1 : prev + 1));

      toast({
        title: "Error",
        description: error.message || "Failed to update like",
        variant: "destructive",
      });
    }
  }, 300);

  const toggleLike = () => {
    if (!userId) {
      toast({
        title: "Authentication required",
        description: "Please sign in to like comments",
        variant: "destructive",
      });
      return;
    }

    // Optimistic update
    const newLikedState = !hasLiked;
    setHasLiked(newLikedState);
    setLikesCount((prev) => (newLikedState ? prev + 1 : Math.max(0, prev - 1)));

    debouncedToggle(newLikedState);
  };

  return { hasLiked, likesCount, toggleLike };
}
