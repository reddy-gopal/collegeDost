import { ThumbsUp, ThumbsDown, MessageSquare, Share2, Eye, MoreVertical, Trash2, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useLikes } from "@/hooks/useLikes";
import { useState } from "react";
import { AuthModalDialog } from "@/components/auth/AuthModalDialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface PostCardProps {
  id: string;
  authorId: string;
  author: string;
  location?: string;
  timeAgo: string;
  title: string;
  content?: string;
  category?: string;
  examType?: string;
  image?: string | boolean;
  likes?: number;
  dislikes?: number;
  comments?: number;
  views?: number;
  tags?: string[];
}

export const PostCard = ({
  id,
  authorId,
  author,
  location,
  timeAgo,
  title,
  content,
  image,
  category,
  examType,
  comments = 0,
  views = 0,
  tags = [],
  avatarUrl,
}: PostCardProps & { avatarUrl?: string }) => {
  const { user } = useAuth();
  const { hasLiked, likesCount, toggleLike } = useLikes(id, user?.id);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const { toast } = useToast();

  const isOwner = user?.id === authorId;

  const handleLike = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    toggleLike();
  };

  const handleDelete = async () => {
    try {
      const { error } = await (supabase as any)
        .from('posts')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Post deleted successfully",
      });
      
      setShowDeleteDialog(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete post",
        variant: "destructive",
      });
    }
  };

  return (
    <>
      <AuthModalDialog open={showAuthModal} onOpenChange={setShowAuthModal} />
      <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      <div className="p-4">
        <div className="flex items-start gap-3 mb-3">
          <Link to={`/profile/${authorId}`}>
            <Avatar className="h-10 w-10 cursor-pointer hover:ring-2 ring-primary transition-all">
              <AvatarImage src={avatarUrl} alt={author} />
              <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                {author.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </Link>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm">{author}</span>
              <span className="text-xs text-muted-foreground">• {timeAgo}</span>
            </div>
            {location && (
              <p className="text-xs text-muted-foreground">{location}</p>
            )}
          </div>
          {isOwner && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setShowDeleteDialog(true)} className="text-destructive">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Post
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        <Link to={`/post/${id}`} className="block space-y-3">
          <h2 className="font-bold text-base md:text-lg hover:text-primary transition-colors leading-tight">
            {title}
          </h2>
          {examType && (
            <span className="inline-block px-3 py-1 bg-primary/10 text-primary border border-primary/20 rounded-full text-xs font-medium">
              {examType}
            </span>
          )}
          {tags && tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {tags.slice(0, 5).map((tag, idx) => (
                <span
                  key={idx}
                  className="px-2 py-0.5 text-xs bg-secondary rounded-full hover:bg-secondary/80 cursor-pointer transition-colors"
                  onClick={(e) => {
                    e.preventDefault();
                    window.dispatchEvent(new CustomEvent('tagsSelected', { 
                      detail: { tags: [tag], mode: 'any' } 
                    }));
                  }}
                >
                  #{tag}
                </span>
              ))}
              {tags.length > 5 && (
                <span className="px-2 py-0.5 text-xs text-muted-foreground">
                  +{tags.length - 5} more
                </span>
              )}
            </div>
          )}
          {content && (
            <p className="text-sm text-muted-foreground line-clamp-2">{content}</p>
          )}
          {typeof image === "string" && image && (
            <div className="relative w-full h-64 bg-muted">
              <img
                src={image}
                alt="Post image"
                className="w-full h-full object-cover"
                loading="eager"
                fetchPriority="high"
                decoding="async"
              />
            </div>
          )}
        </Link>

          <div className="flex flex-wrap items-center justify-between gap-2 md:gap-4 mt-4 pt-4 border-t">
            <div className="flex items-center gap-2 md:gap-4">
              <Button 
                variant="ghost" 
                size="sm" 
                className="gap-1.5 hover:bg-primary/10 transition-all"
                onClick={handleLike}
              >
                <ThumbsUp className={`h-4 w-4 ${hasLiked ? 'fill-red-500 text-red-500' : 'text-muted-foreground'}`} />
                <span className="text-sm font-medium min-w-[1.5rem] text-left">{likesCount}</span>
              </Button>
              <Button variant="ghost" size="sm" className="gap-1.5 hover:bg-secondary transition-all" asChild>
                <Link to={`/post/${id}`}>
                  <MessageSquare className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium min-w-[1.5rem] text-left">{comments}</span>
                </Link>
              </Button>
              <Button variant="ghost" size="sm" className="hover:bg-secondary transition-all">
                <Share2 className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Eye className="h-4 w-4" />
              <span className="font-medium">{views || 0}</span>
            </div>
          </div>
        </div>
      </Card>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Post</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this post? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
