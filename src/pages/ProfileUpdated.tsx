import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Mail, Settings, Loader2 } from "lucide-react";
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
        <div className="max-w-4xl mx-auto p-6">
          <Card className="p-6">
            <p className="text-center">Profile not found</p>
          </Card>
        </div>
      </MainLayout>
    );
  }

  const userPosts = posts.filter(post => post.user_id === profileId);

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto p-6">
        <Card className="p-6 mb-6">
          <div className="flex items-start gap-6 mb-6">
            <Avatar className="h-24 w-24">
              <AvatarImage src={profile.avatar_url} />
              <AvatarFallback className="text-3xl">
                {profile.username?.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <h1 className="text-2xl font-bold">{profile.username}</h1>
                {isOwnProfile ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditModalOpen(true)}
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    Edit Profile
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <FollowButton userId={profileId!} />
                    <Button variant="outline" size="sm" onClick={() => navigate('/messages')}>
                      <Mail className="h-4 w-4 mr-2" />
                      Message
                    </Button>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-6 text-sm mb-3">
                <span><strong>{userPosts.length}</strong> posts</span>
                <button 
                  className="hover:underline"
                  onClick={() => setShowFollowersModal(true)}
                >
                  <strong>{profile.followers_count}</strong> followers
                </button>
                <button 
                  className="hover:underline"
                  onClick={() => setShowFollowingModal(true)}
                >
                  <strong>{profile.following_count}</strong> following
                </button>
              </div>
              {profile.bio && (
                <p className="text-sm text-muted-foreground mb-2">{profile.bio}</p>
              )}
              {profile.state && (
                <p className="text-sm text-muted-foreground">📍 {profile.state}</p>
              )}
              {profile.entrance_exam && profile.entrance_exam.length > 0 && (
                <p className="text-sm text-muted-foreground">🎓 {profile.entrance_exam.join(", ")}</p>
              )}
            </div>
          </div>

          {isOwnProfile && (
            <ProfileCompletionProgress profile={profile} />
          )}

          <Tabs defaultValue="posts" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="posts">Posts</TabsTrigger>
              <TabsTrigger value="liked">Liked</TabsTrigger>
              <TabsTrigger value="saved">Saved</TabsTrigger>
            </TabsList>

            <TabsContent value="posts" className="space-y-4 mt-6">
              {isOwnProfile && (
                <Button 
                  className="w-full"
                  onClick={() => setIsCreatePostOpen(true)}
                >
                  Create Post
                </Button>
              )}

              {userPosts.length === 0 ? (
                <Card className="p-6">
                  <p className="text-center text-muted-foreground">No posts yet</p>
                </Card>
              ) : (
                userPosts.map((post) => (
                  <PostCard
                    key={post.id}
                    id={post.id}
                    authorId={post.user_id}
                    author={post.profiles?.username || 'Anonymous'}
                    timeAgo={formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                    title={post.title}
                    content={post.content}
                    category={post.category}
                    image={post.image_url}
                    likes={post.likes_count}
                    dislikes={0}
                    comments={post.comments_count}
                    views={0}
                  />
                ))
              )}
            </TabsContent>

            <TabsContent value="liked">
              <Card className="p-6">
                <p className="text-center text-muted-foreground">Liked posts coming soon</p>
              </Card>
            </TabsContent>

            <TabsContent value="saved">
              <Card className="p-6">
                <p className="text-center text-muted-foreground">Saved posts coming soon</p>
              </Card>
            </TabsContent>
          </Tabs>
        </Card>
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
