import { MainLayout } from "@/components/layout/MainLayout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const categories = [
  { name: "Engineering", count: "12.5k posts", color: "bg-blue-500" },
  { name: "Medical", count: "8.3k posts", color: "bg-red-500" },
  { name: "MBA", count: "5.2k posts", color: "bg-green-500" },
  { name: "Law", count: "3.1k posts", color: "bg-yellow-500" },
  { name: "CA", count: "4.7k posts", color: "bg-purple-500" },
  { name: "Design", count: "2.9k posts", color: "bg-pink-500" },
];

const Explore = () => {
  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto p-6">
        <h1 className="text-2xl font-bold mb-6">Explore Topics</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {categories.map((category) => (
            <Card
              key={category.name}
              className="p-6 hover:shadow-lg transition-shadow cursor-pointer"
            >
              <div className="flex items-center gap-4">
                <div className={`w-16 h-16 rounded-lg ${category.color}`} />
                <div>
                  <h3 className="font-semibold text-lg">{category.name}</h3>
                  <p className="text-sm text-muted-foreground">{category.count}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </MainLayout>
  );
};

export default Explore;
