import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export function usePostView(postId: string | undefined) {
  const { user } = useAuth();

  useEffect(() => {
    if (!postId) return;

    const trackView = async () => {
      try {
        // Get or create session ID for anonymous users
        const sessionId = user?.id || getOrCreateSessionId();

        // De-duplicate views within the last hour per user/session
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
        let query = (supabase as any)
          .from('post_views')
          .select('id')
          .eq('post_id', postId)
          .gte('viewed_at', oneHourAgo)
          .limit(1);

        if (user?.id) {
          // For logged-in users, match user_id and ensure session_id is null
          query = (query as any).eq('user_id', user.id).is('session_id', null);
        } else {
          // For anonymous, match session_id and ensure user_id is null
          query = (query as any).is('user_id', null).eq('session_id', sessionId);
        }

        const { data: existingView } = await (query as any).maybeSingle();

        if (existingView) {
          // View already tracked
          return;
        }

        // Insert new view
        const { error } = await (supabase as any)
          .from('post_views')
          .insert({
            post_id: postId,
            user_id: user?.id || null,
            session_id: !user ? sessionId : null,
            viewed_at: new Date().toISOString()
          });

        if (error) {
          console.error('Error tracking view:', error);
        }
      } catch (error) {
        console.error('Error in trackView:', error);
      }
    };

    // Track view after a delay to ensure it's a meaningful view
    const timer = setTimeout(trackView, 2000);

    return () => clearTimeout(timer);
  }, [postId, user?.id]);
}

// Helper function to get or create anonymous session ID
function getOrCreateSessionId(): string {
  const key = 'anonymous_session_id';
  let sessionId = localStorage.getItem(key);
  
  if (!sessionId) {
    sessionId = `anon_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem(key, sessionId);
  }
  
  return sessionId;
}
