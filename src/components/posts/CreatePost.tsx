import { Image, Video, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useState } from "react";
import { CreatePostDialog } from "./CreatePostDialog";

export const CreatePost = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  return (
    <>
      <Card className="p-4 mb-6 hover:shadow-md transition-shadow cursor-pointer" onClick={() => setIsDialogOpen(true)}>
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center flex-shrink-0 border-2 border-primary/10">
            <span className="text-sm font-bold text-primary">YG</span>
          </div>
          <div 
            className="flex-1 px-4 py-2 bg-secondary rounded-full text-sm text-muted-foreground hover:bg-secondary/80 transition-colors"
          >
            What's on your mind, Yogesw?
          </div>
        </div>

        <div className="flex items-center justify-around mt-3 pt-3 border-t">
          <Button variant="ghost" className="flex-1 gap-2 hover:bg-foreground hover:text-background transition-colors" onClick={(e) => { e.stopPropagation(); setIsDialogOpen(true); }}>
            <Image className="h-5 w-5" />
            <span className="text-sm font-medium">Photo</span>
          </Button>
          <Button variant="ghost" className="flex-1 gap-2 hover:bg-foreground hover:text-background transition-colors" onClick={(e) => { e.stopPropagation(); setIsDialogOpen(true); }}>
            <Video className="h-5 w-5" />
            <span className="text-sm font-medium">Video</span>
          </Button>
          <Button variant="ghost" className="flex-1 gap-2 hover:bg-foreground hover:text-background transition-colors" onClick={(e) => { e.stopPropagation(); setIsDialogOpen(true); }}>
            <FileText className="h-5 w-5" />
            <span className="text-sm font-medium">Article</span>
          </Button>
        </div>
      </Card>

      <CreatePostDialog open={isDialogOpen} onOpenChange={setIsDialogOpen} />
    </>
  );
};
