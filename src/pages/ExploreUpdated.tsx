import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { usePosts } from "@/hooks/usePosts";
import { PostCard } from "@/components/posts/PostCard";
import { Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const categories = [
  { name: "General", color: "bg-blue-500" },
  { name: "Tech", color: "bg-green-500" },
  { name: "Sports", color: "bg-yellow-500" },
  { name: "CollegeLife", color: "bg-purple-500" },
  { name: "Exam", color: "bg-pink-500" },
  { name: "Career", color: "bg-orange-500" },
];

const ExploreUpdated = () => {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const { posts, loading } = usePosts();

  const filteredPosts = selectedCategory
    ? posts.filter(post => post.category === selectedCategory)
    : posts;

  const getCategoryCount = (categoryName: string) => {
    return posts.filter(post => post.category === categoryName).length;
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[50vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto p-6">
        <h1 className="text-2xl font-bold mb-6">
          {selectedCategory ? `${selectedCategory} Posts` : 'Explore Topics'}
        </h1>

        {!selectedCategory ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {categories.map((category) => (
              <Card
                key={category.name}
                className="p-6 hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => setSelectedCategory(category.name)}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-16 h-16 rounded-lg ${category.color}`} />
                  <div>
                    <h3 className="font-semibold text-lg">{category.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {getCategoryCount(category.name)} posts
                    </p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            <Badge
              variant="outline"
              className="cursor-pointer mb-4"
              onClick={() => setSelectedCategory(null)}
            >
              ← Back to all categories
            </Badge>

            {filteredPosts.length === 0 ? (
              <Card className="p-6">
                <p className="text-center text-muted-foreground">
                  No posts in this category yet
                </p>
              </Card>
            ) : (
              filteredPosts.map((post) => (
                <PostCard
                  key={post.id}
                  id={post.id}
                  authorId={post.user_id}
                  author={post.profiles?.username || 'Anonymous'}
                  timeAgo={formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                  title={post.content.substring(0, 100)}
                  content={post.content}
                  category={post.category}
                  image={!!post.image_url}
                  likes={post.likes_count || 0}
                  dislikes={0}
                  comments={post.comments_count}
                  views={0}
                />
              ))
            )}
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default ExploreUpdated;
