import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { createRealtimeChannel } from "@/lib/realtime";

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

  // Fetch likes count directly from likes table for accuracy
  // Helper function to manually update posts.likes_count (fallback if trigger is slow)
  // Note: This might fail due to RLS if user doesn't own the post, but that's OK - triggers will handle it
  const updatePostLikesCountManually = useCallback(async (delta: number) => {
    try {
      // Calculate new count from actual likes table count
      const { count } = await (supabase as any)
        .from('likes')
        .select('*', { count: 'exact', head: true })
        .eq('post_id', postId)
        .is('comment_id', null);

      const actualCount = count || 0;
      
      // Try to sync posts table (might fail due to RLS, but triggers should handle it)
      const { error } = await (supabase as any)
        .from('posts')
        .update({ likes_count: actualCount })
        .eq('id', postId);

      if (error) {
        // This is expected if user doesn't own the post - triggers will handle it
        console.log(`ℹ️ Manual likes_count update skipped (RLS or trigger will handle): ${error.message}`);
      } else {
        console.log(`📝 Manually synced likes_count to ${actualCount}`);
      }
    } catch (error: any) {
      // Ignore errors - triggers should handle the update
      console.log('ℹ️ Manual update attempt (triggers will handle):', error.message);
    }
  }, [postId]);

  const fetchLikesCount = useCallback(async () => {
    try {
      // Get count directly from likes table - this is more accurate
      const { count, error: countError } = await (supabase as any)
        .from('likes')
        .select('*', { count: 'exact', head: true })
        .eq('post_id', postId)
        .is('comment_id', null);

      if (!countError && count !== null) {
        const actualCount = count || 0;
        setLikesCount(actualCount);
        console.log(`📊 Post ${postId} likes count (from likes table): ${actualCount}`);
        
        // Also sync it to posts table if different
        const { data: postData } = await (supabase as any)
          .from('posts')
          .select('likes_count')
          .eq('id', postId)
          .maybeSingle();
        
        if (postData && postData.likes_count !== actualCount) {
          console.log(`🔄 Syncing likes_count: posts table has ${postData.likes_count}, should be ${actualCount}`);
          await (supabase as any)
            .from('posts')
            .update({ likes_count: actualCount })
            .eq('id', postId);
        }
        return;
      }

      // Fallback: Get from posts table
      const { data, error } = await (supabase as any)
        .from('posts')
        .select('likes_count')
        .eq('id', postId)
        .maybeSingle();

      if (error) throw error;
      setLikesCount(data?.likes_count || 0);
      console.log(`📊 Post ${postId} likes count (from posts table): ${data?.likes_count || 0}`);
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

  // Set up real-time subscriptions using the new realtime helper
  useEffect(() => {
    if (!postId) return;
    if (typeof window === "undefined") return; // SSR guard

    const rt = createRealtimeChannel(`realtime:likes:${postId}`);
    const filter = `post_id=eq.${postId}`;

    // Listen to likes table changes
    rt.onPostgresChange(
      { table: "likes", event: "*", filter },
      () => {
        console.log('🔄 Like change detected, refreshing count...');
        fetchLikesCount();
      }
    );

    // Listen to posts table updates for likes_count changes
    rt.onPostgresChange(
      { table: "posts", event: "UPDATE", filter: `id=eq.${postId}` },
      (payload) => {
        if (payload.new && (payload.new as any).likes_count !== undefined) {
          console.log('📈 Posts table likes_count updated:', (payload.new as any).likes_count);
          setLikesCount((payload.new as any).likes_count);
        }
      }
    );

    rt.subscribe().catch((err: any) => {
      console.error("Failed to subscribe to likes realtime:", err);
    });

    return () => {
      rt.unsubscribe();
    };
  }, [postId, fetchLikesCount]);

  const toggleLike = async () => {
    if (!userId) {
      toast({
        title: "Authentication required",
        description: "Please sign in to like posts",
        variant: "destructive",
      });
      return;
    }

    // Get the current authenticated user ID to ensure we're using the correct ID
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser || authUser.id !== userId) {
      toast({
        title: "Authentication error",
        description: "User authentication mismatch. Please sign in again.",
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
        // Unlike: Delete the like
        const { data, error } = await (supabase as any)
          .from('likes')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', userId)
          .select();

        if (error) {
          console.error('❌ Error deleting like:', error);
          console.error('Error details:', {
            message: error.message,
            code: error.code,
            details: error.details,
            hint: error.hint,
            postId,
            userId
          });
          throw error;
        }
        console.log('✅ Like deleted successfully:', data);
        
        // Refresh count immediately from likes table
        await fetchLikesCount();
        
        // Try to sync posts table (non-blocking - triggers should handle it)
        updatePostLikesCountManually(0).catch(() => {
          // Ignore errors - triggers will handle it
        });
      } else {
        // Like: Insert the like
        // First check if like already exists (handle race conditions)
        const { data: existingLike } = await (supabase as any)
          .from('likes')
          .select('id')
          .eq('post_id', postId)
          .eq('user_id', userId)
          .maybeSingle();

        if (existingLike) {
          // Like already exists, just refresh state
          console.log('ℹ️ Like already exists, refreshing state');
          await checkIfLiked();
          await fetchLikesCount();
          return;
        }

        const { data, error } = await (supabase as any)
          .from('likes')
          .insert({ 
            post_id: postId, 
            user_id: userId,
            comment_id: null // Explicitly set to null for post likes
          })
          .select();

        if (error) {
          console.error('❌ Error inserting like:', error);
          console.error('Error details:', {
            message: error.message,
            code: error.code,
            details: error.details,
            hint: error.hint,
            postId,
            userId
          });
          
          // Handle specific error codes
          if (error.code === '23505') {
            // Unique constraint violation - like already exists
            console.log('ℹ️ Like already exists (unique constraint), refreshing state');
            await checkIfLiked();
            await fetchLikesCount();
            return;
          }
          
          throw error;
        }
        console.log('✅ Like inserted successfully:', data);
        
        // Refresh count immediately from likes table
        await fetchLikesCount();
        
        // Try to sync posts table (non-blocking - triggers should handle it)
        updatePostLikesCountManually(0).catch(() => {
          // Ignore errors - triggers will handle it
        });
      }
      
      // Refresh the like status after successful operation
      await checkIfLiked();
      
      // Double-check count after a brief delay to ensure trigger fired
      setTimeout(() => {
        fetchLikesCount();
      }, 500);
    } catch (error: any) {
      // Revert optimistic update on error
      setHasLiked(previousLiked);
      setLikesCount(previousCount);
      
      console.error('❌ Like toggle failed:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update like. Please try again.",
        variant: "destructive",
      });
    }
  };

  return { hasLiked, likesCount, toggleLike };
}
