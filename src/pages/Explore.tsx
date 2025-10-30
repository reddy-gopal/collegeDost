import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { PostCard } from "@/components/posts/PostCard";
import { usePosts } from "@/hooks/usePosts";
import { Loader2, X, Tag } from "lucide-react";

interface Topic {
  id: string;
  name: string;
  description?: string;
}

const Explore = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const topicId = searchParams.get("topic");
  const tagParam = searchParams.get("tag");
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);
  const [postCounts, setPostCounts] = useState<Record<string, number>>({});
  const { posts, loading: postsLoading } = usePosts();

  useEffect(() => {
    fetchTopics();
  }, []);

  useEffect(() => {
    if (posts.length > 0 && topics.length > 0) {
      const counts: Record<string, number> = {};
      topics.forEach(topic => {
        counts[topic.id] = posts.filter(post => (post as any).topic_id === topic.id).length;
      });
      setPostCounts(counts);
    }
  }, [posts, topics]);

  const fetchTopics = async () => {
    try {
      setLoading(true);
      const { data, error } = await (supabase as any)
        .from('topics')
        .select('id, name, description')
        .order('name', { ascending: true });

      if (error) throw error;
      setTopics((data || []) as Topic[]);
    } catch (error: any) {
      console.error("Error fetching topics:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleTopicClick = (topicId: string) => {
    navigate(`/explore?topic=${topicId}`);
  };

  const filteredPosts = posts.filter(post => {
    if (topicId && (post as any).topic_id !== topicId) return false;
    if (tagParam) {
      const postTags = (post as any).tags || [];
      if (!postTags.includes(tagParam.toLowerCase())) return false;
    }
    return true;
  });

  const getTimeAgo = (dateString: string) => {
    const now = new Date();
    const created = new Date(dateString);
    const seconds = Math.floor((now.getTime() - created.getTime()) / 1000);
    
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  const getCategoryColor = (index: number) => {
    const colors = [
      "bg-blue-500", "bg-red-500", "bg-green-500", 
      "bg-yellow-500", "bg-purple-500", "bg-pink-500",
      "bg-indigo-500", "bg-teal-500", "bg-orange-500"
    ];
    return colors[index % colors.length];
  };

  // Show filtered posts view
  if (topicId || tagParam) {
    const selectedTopic = topics.find(t => t.id === topicId);
    
    return (
      <MainLayout>
        <div className="max-w-4xl mx-auto p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold">
                {topicId ? selectedTopic?.name || "Category" : `#${tagParam}`}
              </h1>
              {topicId && selectedTopic?.description && (
                <p className="text-sm text-muted-foreground mt-1">{selectedTopic.description}</p>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/explore")}
            >
              <X className="h-4 w-4 mr-2" />
              Clear Filter
            </Button>
          </div>

          {postsLoading ? (
            <div className="flex items-center justify-center min-h-[50vh]">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredPosts.length > 0 ? (
            <div className="space-y-4">
              {filteredPosts.map((post) => (
                <PostCard
                  key={post.id}
                  id={post.id}
                  authorId={post.user_id}
                  author={post.profiles?.username || 'Anonymous'}
                  timeAgo={getTimeAgo(post.created_at)}
                  title={(post as any).title || post.content?.substring(0, 100) || 'Untitled'}
                  content={post.content || ''}
                  image={post.image_url || ''}
                  category={post.category || 'General'}
                  comments={post.comments_count || 0}
                  views={0}
                  avatarUrl={post.profiles?.avatar_url}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No posts found for this filter.</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate("/explore")}
                className="mt-4"
              >
                View All Categories
              </Button>
            </div>
          )}
        </div>
      </MainLayout>
    );
  }

  // Show all categories
  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Explore Categories</h1>
          <p className="text-muted-foreground mt-1">Browse posts by topic</p>
        </div>
        
        {loading ? (
          <div className="flex items-center justify-center min-h-[50vh]">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : topics.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {topics.map((topic, index) => (
              <Card
                key={topic.id}
                className="p-6 hover:shadow-lg transition-all cursor-pointer border-2 hover:border-primary/50 group"
                onClick={() => handleTopicClick(topic.id)}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-16 h-16 rounded-lg ${getCategoryColor(index)} flex items-center justify-center text-white font-bold text-xl group-hover:scale-110 transition-transform`}>
                    {topic.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-lg truncate">{topic.name}</h3>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Tag className="h-3 w-3" />
                      <span>{postCounts[topic.id] || 0} {postCounts[topic.id] === 1 ? 'post' : 'posts'}</span>
                    </div>
                    {topic.description && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {topic.description}
                      </p>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No categories available yet.</p>
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default Explore;
