import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Mail, Settings, Loader2, Share2, Plus, Eye, Image as ImageIcon, MoreVertical, Edit } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { usePosts } from "@/hooks/usePosts";
import { useFollows } from "@/hooks/useFollows";
import { supabase } from "@/integrations/supabase/client";
import { PostCard } from "@/components/posts/PostCard";
import { FollowButton } from "@/components/profile/FollowButton";
import { FollowersModal } from "@/components/profile/FollowersModal";
import { ProfileCompletionProgress } from "@/components/profile/ProfileCompletionProgress";
import { EditProfileModal } from "@/components/profile/EditProfileModal";
import { CreatePostDialog } from "@/components/posts/CreatePostDialog";
import { formatDistanceToNow } from "date-fns";

interface Profile {
  id: string;
  username: string;
  avatar_url?: string;
  bio?: string;
  state?: string;
  entrance_exam?: string[];
  interested_exams?: string[];
  likes?: number;
  followers_count: number;
  following_count: number;
}

const ProfileUpdated = () => {
  const { userId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [showFollowersModal, setShowFollowersModal] = useState(false);
  const [showFollowingModal, setShowFollowingModal] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isCreatePostOpen, setIsCreatePostOpen] = useState(false);

  const profileId = userId || user?.id;
  const isOwnProfile = !userId || userId === user?.id;
  const { posts } = usePosts();
  const { followers, following } = useFollows(profileId);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!profileId) return;

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', profileId)
          .single();

        if (error) throw error;
        setProfile(data);
      } catch (error) {
        console.error('Error fetching profile:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [profileId]);

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[50vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  if (!profile) {
    return (
      <MainLayout>
        <div className="max-w-4xl mx-auto p-4 md:p-6 w-full overflow-hidden">
          <Card className="p-4 md:p-6">
            <p className="text-center">Profile not found</p>
          </Card>
        </div>
      </MainLayout>
    );
  }

  const userPosts = posts.filter(post => post.user_id === profileId);

  return (
    <MainLayout>
      <div className="w-full overflow-hidden">
        {/* Profile Banner */}
        <div className="relative w-full h-48 md:h-64 bg-gradient-to-r from-primary/20 via-primary/30 to-primary/20 overflow-hidden">
          {isOwnProfile && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-4 right-4 bg-background/80 hover:bg-background/90 backdrop-blur-sm"
              onClick={() => {
                // Handle banner edit
              }}
              aria-label="Edit banner"
            >
              <ImageIcon className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Profile Content Container */}
        <div className="max-w-6xl mx-auto px-4 md:px-6 pb-6">
          {/* Profile Header Section */}
          <div className="relative -mt-16 md:-mt-24 mb-6">
            <div className="flex flex-col md:flex-row items-start md:items-end gap-4 md:gap-6 pb-6 border-b">
              {/* Avatar */}
              <div className="relative">
                <Avatar className="h-24 w-24 md:h-32 md:w-32 border-4 border-background shadow-lg">
                  <AvatarImage src={profile.avatar_url} />
                  <AvatarFallback className="text-3xl md:text-4xl bg-primary/10 text-primary font-semibold">
                    {profile.username?.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                {isOwnProfile && (
                  <Button
                    variant="secondary"
                    size="icon"
                    className="absolute bottom-0 right-0 h-8 w-8 rounded-full border-2 border-background shadow-md"
                    onClick={() => {
                      // Handle avatar edit
                    }}
                    aria-label="Edit avatar"
                  >
                    <ImageIcon className="h-4 w-4" />
                  </Button>
                )}
              </div>

              {/* User Info */}
              <div className="flex-1 min-w-0 w-full">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-3">
                  <div className="min-w-0 flex-1">
                    <h1 className="text-2xl md:text-3xl font-bold mb-1 truncate">
                      {profile.username}
                    </h1>
                    <p className="text-sm md:text-base text-muted-foreground mb-2">
                      @{profile.username}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="hidden sm:inline-flex"
                    >
                      <Share2 className="h-4 w-4 mr-2" />
                      Share
                    </Button>
                    {isOwnProfile ? (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setIsEditModalOpen(true)}
                          className="hidden sm:inline-flex"
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => setIsEditModalOpen(true)}
                          className="sm:hidden"
                          aria-label="Edit Profile"
                        >
                          <Settings className="h-4 w-4" />
                        </Button>
                      </>
                    ) : (
                      <div className="flex gap-2">
                        <FollowButton userId={profileId!} />
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => navigate('/messages')}
                        >
                          <Mail className="h-4 w-4 mr-2" />
                          <span className="hidden sm:inline">Message</span>
                        </Button>
                      </div>
                    )}
                    <Button
                      variant="outline"
                      size="icon"
                      className="hidden sm:inline-flex"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Stats */}
                <div className="flex items-center gap-4 sm:gap-6 text-sm mb-3 flex-wrap">
                  <span className="whitespace-nowrap">
                    <strong className="font-semibold">{userPosts.length}</strong> posts
                  </span>
                  <button 
                    className="hover:underline whitespace-nowrap"
                    onClick={() => setShowFollowersModal(true)}
                  >
                    <strong className="font-semibold">{profile.followers_count}</strong> followers
                  </button>
                  <button 
                    className="hover:underline whitespace-nowrap"
                    onClick={() => setShowFollowingModal(true)}
                  >
                    <strong className="font-semibold">{profile.following_count}</strong> following
                  </button>
                </div>

                {/* Bio and Details */}
                <div className="space-y-2 break-words">
                  {profile.bio && (
                    <p className="text-sm text-foreground break-words">{profile.bio}</p>
                  )}
                  <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                    {profile.state && (
                      <span className="whitespace-nowrap">📍 {profile.state}</span>
                    )}
                    {profile.entrance_exam && profile.entrance_exam.length > 0 && (
                      <span className="break-words">🎓 {profile.entrance_exam.join(", ")}</span>
                    )}
                  </div>
                </div>

                {/* Add Social Link Button (if own profile) */}
                {isOwnProfile && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-4"
                    onClick={() => {
                      // Handle add social link
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Social Link
                  </Button>
                )}
              </div>
            </div>

            {/* Profile Completion Progress */}
            {isOwnProfile && (
              <div className="mt-4">
                <ProfileCompletionProgress profile={profile} />
              </div>
            )}

            {/* Tabs */}
            <Tabs defaultValue="posts" className="w-full mt-6">
              <div className="border-b">
                <TabsList className="h-auto p-0 bg-transparent">
                  <TabsTrigger 
                    value="posts" 
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3"
                  >
                    Posts
                  </TabsTrigger>
                  <TabsTrigger 
                    value="liked"
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3"
                  >
                    Liked
                  </TabsTrigger>
                  <TabsTrigger 
                    value="saved"
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3"
                  >
                    Saved
                  </TabsTrigger>
                  <TabsTrigger 
                    value="comments"
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3"
                  >
                    Comments
                  </TabsTrigger>
                </TabsList>
              </div>

              {/* Content Filter Bar */}
              <div className="flex items-center justify-between py-3 px-4 bg-muted/30 border-b">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Eye className="h-4 w-4" />
                  <span>Showing all content</span>
                </div>
                <div className="flex items-center gap-2">
                  {isOwnProfile && (
                    <Button
                      size="sm"
                      onClick={() => setIsCreatePostOpen(true)}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Create Post
                    </Button>
                  )}
                </div>
              </div>

              <TabsContent value="posts" className="mt-0 pt-6">
                {userPosts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 px-4">
                    <div className="mb-4 text-muted-foreground">
                      <svg className="w-24 h-24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <circle cx="12" cy="12" r="10" />
                        <path d="M12 8v4M12 16h.01" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold mb-2">@{profile.username} hasn't posted yet</h3>
                    {isOwnProfile && (
                      <Button
                        onClick={() => setIsCreatePostOpen(true)}
                        className="mt-4"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Create Your First Post
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="w-full space-y-4">
                    {userPosts.map((post) => (
                      <PostCard
                        key={post.id}
                        id={post.id}
                        authorId={post.user_id}
                        author={post.profiles?.username || 'Anonymous'}
                        timeAgo={formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                        title={post.title}
                        content={post.content}
                        category={post.category}
                        examType={post.exam_type || ''}
                        image={post.image_url}
                        likes={post.likes_count}
                        dislikes={0}
                        comments={post.comments_count}
                        views={post.views_count || 0}
                        tags={post.tags || []}
                        avatarUrl={post.profiles?.avatar_url}
                      />
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="liked" className="mt-0 pt-6">
                <div className="flex flex-col items-center justify-center py-16 px-4">
                  <div className="mb-4 text-muted-foreground">
                    <svg className="w-24 h-24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold mb-2">No liked posts yet</h3>
                  <p className="text-sm text-muted-foreground">Posts you like will appear here</p>
                </div>
              </TabsContent>

              <TabsContent value="saved" className="mt-0 pt-6">
                <div className="flex flex-col items-center justify-center py-16 px-4">
                  <div className="mb-4 text-muted-foreground">
                    <svg className="w-24 h-24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold mb-2">No saved posts yet</h3>
                  <p className="text-sm text-muted-foreground">Posts you save will appear here</p>
                </div>
              </TabsContent>

              <TabsContent value="comments" className="mt-0 pt-6">
                <div className="flex flex-col items-center justify-center py-16 px-4">
                  <div className="mb-4 text-muted-foreground">
                    <svg className="w-24 h-24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold mb-2">No comments yet</h3>
                  <p className="text-sm text-muted-foreground">Comments will appear here</p>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>

      <FollowersModal
        isOpen={showFollowersModal}
        onClose={() => setShowFollowersModal(false)}
        followers={followers}
        title="Followers"
      />

      <FollowersModal
        isOpen={showFollowingModal}
        onClose={() => setShowFollowingModal(false)}
        followers={following}
        title="Following"
      />

      {isOwnProfile && (
        <>
          <EditProfileModal open={isEditModalOpen} onOpenChange={setIsEditModalOpen} />
          <CreatePostDialog open={isCreatePostOpen} onOpenChange={setIsCreatePostOpen} />
        </>
      )}
    </MainLayout>
  );
};

export default ProfileUpdated;
