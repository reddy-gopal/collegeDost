import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { PostCard } from "@/components/posts/PostCard";
import { usePosts } from "@/hooks/usePosts";
import { Loader2, X, Tag, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Topic {
  id: string;
  name: string;
  description?: string;
}

const ExploreUpdated = () => {
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
      "bg-gradient-to-br from-blue-500 to-blue-600",
      "bg-gradient-to-br from-red-500 to-red-600",
      "bg-gradient-to-br from-green-500 to-green-600",
      "bg-gradient-to-br from-yellow-500 to-yellow-600",
      "bg-gradient-to-br from-purple-500 to-purple-600",
      "bg-gradient-to-br from-pink-500 to-pink-600",
      "bg-gradient-to-br from-indigo-500 to-indigo-600",
      "bg-gradient-to-br from-teal-500 to-teal-600",
      "bg-gradient-to-br from-orange-500 to-orange-600"
    ];
    return colors[index % colors.length];
  };

  // Show filtered posts view (for logged-in users)
  if (topicId || tagParam) {
    const selectedTopic = topics.find(t => t.id === topicId);
    
    return (
      <MainLayout>
        <div className="max-w-4xl mx-auto p-6">
          <div className="mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold flex items-center gap-2">
                  {topicId ? (
                    <>
                      <TrendingUp className="h-8 w-8 text-primary" />
                      {selectedTopic?.name || "Category"}
                    </>
                  ) : (
                    <>
                      <Tag className="h-8 w-8 text-primary" />
                      #{tagParam}
                    </>
                  )}
                </h1>
                {topicId && selectedTopic?.description && (
                  <p className="text-muted-foreground mt-2">{selectedTopic.description}</p>
                )}
              </div>
              <Button
                variant="outline"
                onClick={() => navigate("/explore")}
              >
                <X className="h-4 w-4 mr-2" />
                Clear Filter
              </Button>
            </div>
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
                  category={post.category}
                  examType={(post as any).exam_type || ''}
                  comments={post.comments_count || 0}
                  views={(post as any).views_count || 0}
                  tags={(post as any).tags || []}
                  avatarUrl={post.profiles?.avatar_url}
                />
              ))}
            </div>
          ) : (
            <Card className="p-12 text-center">
              <div className="space-y-4">
                <p className="text-muted-foreground text-lg">No posts found for this filter.</p>
                <Button
                  variant="default"
                  onClick={() => navigate("/explore")}
                >
                  View All Categories
                </Button>
              </div>
            </Card>
          )}
        </div>
      </MainLayout>
    );
  }

  // Show all categories (enhanced for logged-in users)
  return (
    <MainLayout>
      <div className="max-w-6xl mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Explore Categories</h1>
          <p className="text-muted-foreground mt-2">Discover posts organized by topic</p>
        </div>
        
        {loading ? (
          <div className="flex items-center justify-center min-h-[50vh]">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : topics.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {topics.map((topic, index) => (
              <Card
                key={topic.id}
                className="p-6 hover:shadow-xl transition-all cursor-pointer border-2 hover:border-primary group overflow-hidden relative"
                onClick={() => handleTopicClick(topic.id)}
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 group-hover:bg-primary/10 transition-colors" />
                
                <div className="relative">
                  <div className="flex items-center gap-4 mb-4">
                    <div className={`w-16 h-16 rounded-xl ${getCategoryColor(index)} flex items-center justify-center text-white font-bold text-2xl shadow-lg group-hover:scale-110 transition-transform`}>
                      {topic.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-xl truncate group-hover:text-primary transition-colors">
                        {topic.name}
                      </h3>
                      <Badge variant="secondary" className="mt-1">
                        <Tag className="h-3 w-3 mr-1" />
                        {postCounts[topic.id] || 0} {postCounts[topic.id] === 1 ? 'post' : 'posts'}
                      </Badge>
                    </div>
                  </div>
                  
                  {topic.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {topic.description}
                    </p>
                  )}
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="p-12 text-center">
            <p className="text-muted-foreground">No categories available yet.</p>
          </Card>
        )}
      </div>
    </MainLayout>
  );
};

export default ExploreUpdated;
