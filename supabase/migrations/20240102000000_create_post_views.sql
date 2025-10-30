-- Create post_views table if not exists
CREATE TABLE IF NOT EXISTS post_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id TEXT,
  viewed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT post_views_unique UNIQUE (post_id, user_id, session_id)
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_post_views_post_id ON post_views(post_id);
CREATE INDEX IF NOT EXISTS idx_post_views_user_id ON post_views(user_id);
CREATE INDEX IF NOT EXISTS idx_post_views_session_id ON post_views(session_id);
CREATE INDEX IF NOT EXISTS idx_post_views_viewed_at ON post_views(viewed_at DESC);

-- Enable RLS
ALTER TABLE post_views ENABLE ROW LEVEL SECURITY;

-- Policies for post_views
CREATE POLICY "Anyone can insert views" ON post_views
  FOR INSERT TO authenticated, anon
  WITH CHECK (true);

CREATE POLICY "Anyone can read views" ON post_views
  FOR SELECT TO authenticated, anon
  USING (true);

-- Grant permissions
GRANT SELECT, INSERT ON post_views TO authenticated, anon;

-- Function to get view count for a post
CREATE OR REPLACE FUNCTION get_post_views_count(p_post_id UUID)
RETURNS BIGINT AS $$
BEGIN
  RETURN (SELECT COUNT(*) FROM post_views WHERE post_id = p_post_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_post_views_count TO authenticated, anon;

COMMENT ON TABLE post_views IS 'Tracks unique views per post. Uses user_id for authenticated users and session_id for anonymous users.';
