import { useEffect, useMemo, useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { usePosts } from "@/hooks/usePosts";
import { Loader2 } from "lucide-react";
import { PostCard } from "@/components/posts/PostCard";

export default function All() {
  const { posts, loading } = usePosts();
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [tagFilterMode, setTagFilterMode] = useState<'any' | 'all'>('any');

  // Listen to tagsSelected from DynamicSidebar
  useEffect(() => {
    const handler = (event: any) => {
      const tags = event.detail?.tags || [];
      const mode = event.detail?.mode || 'any';
      setSelectedTags(tags);
      setTagFilterMode(mode);
    };
    window.addEventListener('tagsSelected', handler);
    return () => window.removeEventListener('tagsSelected', handler);
  }, []);

  const filtered = useMemo(() => {
    if (selectedTags.length === 0) return posts;
    return posts.filter((post: any) => {
      const postTags: string[] = (post.tags || []).map((t: string) => t.toLowerCase());
      if (tagFilterMode === 'all') {
        return selectedTags.every(t => postTags.includes(t.toLowerCase()));
      }
      return selectedTags.some(t => postTags.includes(t.toLowerCase()));
    });
  }, [posts, selectedTags, tagFilterMode]);

  return (
    <MainLayout>
      <div className="max-w-3xl mx-auto p-4 md:p-6">
        <h1 className="text-xl font-semibold mb-4">All Posts</h1>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            {selectedTags.length > 0
              ? 'Coming soon — new posts for this section will be available soon!'
              : 'No posts yet. Be the first to create one!'}
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map((post: any) => (
              <PostCard
                key={post.id}
                id={post.id}
                authorId={post.user_id}
                author={post.profiles?.username || 'Anonymous'}
                timeAgo={new Date(post.created_at).toLocaleString()}
                title={post.title || post.content?.substring(0, 100) || 'Untitled'}
                content={post.content || ''}
                image={post.image_url || ''}
                category={post.category}
                examType={post.exam_type || ''}
                comments={post.comments_count || 0}
                views={post.views_count || 0}
                tags={post.tags || []}
                avatarUrl={post.profiles?.avatar_url}
              />
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
}


