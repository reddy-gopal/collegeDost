import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { TextEditor } from "@/components/posts/TextEditor";
import { TagSelector } from "@/components/posts/TagSelector";
import { ImageUpload } from "@/components/posts/ImageUpload";
import { ProgressBar } from "@/components/posts/ProgressBar";
import { X } from "lucide-react";

const AVAILABLE_TAGS = [
  "Engineering", "Medical", "Commerce", "Science", "Law", 
  "MBA", "CA", "NEET", "JEE", "UPSC", "SSC", "Banking",
  "GATE", "CAT", "CLAT", "NDA", "Railway", "Teaching"
];

export default function CreatePostPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  
  const [category, setCategory] = useState<"Entrance Exam" | "Board Exam">("Entrance Exam");
  const [postType, setPostType] = useState<"Text" | "Image" | "Video" | "Link" | "Poll">("Text");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showProgress, setShowProgress] = useState(false);

  // Load draft from localStorage
  useEffect(() => {
    const draft = localStorage.getItem("post_draft");
    if (draft) {
      try {
        const parsed = JSON.parse(draft);
        setTitle(parsed.title || "");
        setContent(parsed.content || "");
        setCategory(parsed.category || "Entrance Exam");
        setSelectedTags(parsed.tags || []);
        setPostType(parsed.postType || "Text");
        setLinkUrl(parsed.linkUrl || "");
      } catch (error) {
        console.error("Error loading draft:", error);
      }
    }
  }, []);

  // Save draft to localStorage
  const saveDraft = () => {
    const draft = {
      title,
      content,
      category,
      tags: selectedTags,
      postType,
      linkUrl,
    };
    localStorage.setItem("post_draft", JSON.stringify(draft));
    toast({
      title: "Draft saved",
      description: "Your post has been saved as a draft",
    });
  };

  // Handle image upload
  const handleImageChange = (file: File | null) => {
    setImageFile(file);
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setImagePreview("");
    }
  };

  // Upload image to Supabase storage
  const uploadImage = async (): Promise<string | null> => {
    if (!imageFile || !user) return null;

    try {
      const fileExt = imageFile.name.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('post-images')
        .upload(filePath, imageFile);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('post-images')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (error) {
      console.error("Error uploading image:", error);
      return null;
    }
  };

  // Handle post submission
  const handleSubmit = async () => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please log in to create a post",
        variant: "destructive",
      });
      return;
    }

    if (!title.trim()) {
      toast({
        title: "Title required",
        description: "Please enter a title for your post",
        variant: "destructive",
      });
      return;
    }

    if (title.length > 300) {
      toast({
        title: "Title too long",
        description: "Title must be less than 300 characters",
        variant: "destructive",
      });
      return;
    }

    if (postType === "Link" && !linkUrl.trim()) {
      toast({
        title: "URL required",
        description: "Please enter a URL for your link post",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    setShowProgress(true);

    try {
      let imageUrl = null;
      
      // Upload image if present
      if (imageFile && (postType === "Image" || postType === "Video")) {
        imageUrl = await uploadImage();
        if (!imageUrl) {
          throw new Error("Failed to upload image");
        }
      }

      // Prepare post data - ensure user_id is set correctly
      const postData = {
        user_id: user.id,
        title: title.trim(),
        content: content.trim() || null,
        image_url: imageUrl,
        link_url: postType === "Link" ? linkUrl.trim() : null,
        tags: selectedTags,
        category,
        post_type: postType,
        likes_count: 0,
        comments_count: 0,
      };

      // Insert post into database - don't try to select profiles in the same query
      const { data, error } = await supabase
        .from('posts')
        .insert([postData])
        .select()
        .single();

      if (error) {
        console.error("Supabase error:", error);
        throw error;
      }

      // Clear draft
      localStorage.removeItem("post_draft");

      toast({
        title: "Post created successfully!",
        description: "Your post has been published",
      });

      // Redirect to home
      setTimeout(() => {
        navigate(`/`);
      }, 1000);
    } catch (error: any) {
      console.error("Error creating post:", error);
      toast({
        title: "Failed to create post",
        description: error.message || "An error occurred while creating your post",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
      setShowProgress(false);
    }
  };

  return (
    <MainLayout>
      {showProgress && <ProgressBar />}
      
      <div className="max-w-4xl mx-auto p-4 md:p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Create Post</h1>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <Card className="p-6 space-y-6">
          {/* Category Selection */}
          <div>
            <label className="text-sm font-medium mb-2 block">Select Type</label>
            <Select value={category} onValueChange={(val) => setCategory(val as any)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Entrance Exam">Entrance Exam</SelectItem>
                <SelectItem value="Board Exam">Board Exam</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Post Type Tabs */}
          <Tabs value={postType} onValueChange={(val) => setPostType(val as any)}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="Text">Text</TabsTrigger>
              <TabsTrigger value="Image">Images & Video</TabsTrigger>
              <TabsTrigger value="Link">Link</TabsTrigger>
              <TabsTrigger value="Poll">Poll</TabsTrigger>
            </TabsList>

            {/* Text Post */}
            <TabsContent value="Text" className="space-y-4">
              <div>
                <Input
                  placeholder="Title (required, max 300 characters)"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={300}
                  className="text-lg"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {title.length}/300 characters
                </p>
              </div>

              <TextEditor value={content} onChange={setContent} />

              <TagSelector
                availableTags={AVAILABLE_TAGS}
                selectedTags={selectedTags}
                onTagsChange={setSelectedTags}
              />
            </TabsContent>

            {/* Image/Video Post */}
            <TabsContent value="Image" className="space-y-4">
              <div>
                <Input
                  placeholder="Title (required, max 300 characters)"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={300}
                  className="text-lg"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {title.length}/300 characters
                </p>
              </div>

              <ImageUpload
                preview={imagePreview}
                onImageChange={handleImageChange}
              />

              <Textarea
                placeholder="Add a description (optional)"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={4}
              />

              <TagSelector
                availableTags={AVAILABLE_TAGS}
                selectedTags={selectedTags}
                onTagsChange={setSelectedTags}
              />
            </TabsContent>

            {/* Link Post */}
            <TabsContent value="Link" className="space-y-4">
              <div>
                <Input
                  placeholder="Title (required, max 300 characters)"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={300}
                  className="text-lg"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {title.length}/300 characters
                </p>
              </div>

              <Input
                placeholder="URL (required)"
                type="url"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
              />

              <Textarea
                placeholder="Add a description (optional)"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={4}
              />

              <TagSelector
                availableTags={AVAILABLE_TAGS}
                selectedTags={selectedTags}
                onTagsChange={setSelectedTags}
              />
            </TabsContent>

            {/* Poll Post */}
            <TabsContent value="Poll" className="space-y-4">
              <div className="text-center py-8">
                <p className="text-muted-foreground">Poll feature coming soon!</p>
              </div>
            </TabsContent>
          </Tabs>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t">
            <Button
              variant="outline"
              onClick={saveDraft}
              disabled={isSubmitting}
            >
              Save Draft
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || !title.trim()}
            >
              {isSubmitting ? "Posting..." : "Post"}
            </Button>
          </div>
        </Card>
      </div>
    </MainLayout>
  );
}
