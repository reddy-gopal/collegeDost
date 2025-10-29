import { Edit, ThumbsUp, MessageSquare, Share2, Eye, Plus, Pencil, UserPlus, UserMinus, Mail, MapPin, Loader2 } from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { EditProfileModal } from "@/components/profile/EditProfileModal";
import { CreatePostDialog } from "@/components/posts/CreatePostDialog";
import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { usePosts } from "@/hooks/usePosts";
import { useFollows } from "@/hooks/useFollows";
import { FollowButton } from "@/components/profile/FollowButton";
import { FollowersModal } from "@/components/profile/FollowersModal";
import { ProfileCompletionProgress } from "@/components/profile/ProfileCompletionProgress";

interface Profile {
  id: string;
  username: string;
  avatar_url?: string;
  bio?: string;
  state?: string;
  followers_count: number;
  following_count: number;
  onboarding_completed?: boolean;
}

const Profile = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isCreatePostOpen, setIsCreatePostOpen] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [showFollowersModal, setShowFollowersModal] = useState(false);
  const [followModalType, setFollowModalType] = useState<'followers' | 'following'>('followers');
  const [followList, setFollowList] = useState<any[]>([]);
  const { posts } = usePosts();
  
  const isOwnProfile = !userId || userId === user?.id;
  const profileId = userId || user?.id;
  const userPosts = posts.filter(post => post.user_id === profileId);

  useEffect(() => {
    if (profileId) {
      fetchProfile();
    }
  }, [profileId]);

  const fetchProfile = async () => {
    if (!profileId) return;
    
    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from('profiles')
        .select('*')
        .eq('id', profileId)
        .single();

      if (error) throw error;
      setProfile(data);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to fetch profile",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleMessage = () => {
    if (profileId) {
      navigate('/messages');
    }
  };

  const fetchFollowList = async (type: 'followers' | 'following') => {
    if (!profileId) return;
    
    try {
      const { data, error } = await (supabase as any)
        .from('follows')
        .select(`
          ${type === 'followers' ? 'follower_id' : 'following_id'},
          profiles!${type === 'followers' ? 'follows_follower_id_fkey' : 'follows_following_id_fkey'} (
            id,
            username,
            avatar_url,
            bio,
            followers_count,
            following_count
          )
        `)
        .eq(type === 'followers' ? 'following_id' : 'follower_id', profileId);

      if (error) throw error;
      
      const profiles = data?.map((item: any) => item.profiles).filter(Boolean) || [];
      setFollowList(profiles);
    } catch (error: any) {
      console.error('Error fetching follow list:', error);
      setFollowList([]);
    }
  };

  const handleOpenFollowModal = async (type: 'followers' | 'following') => {
    setFollowModalType(type);
    await fetchFollowList(type);
    setShowFollowersModal(true);
  };

  const getTimeAgo = (dateString: string) => {
    const now = new Date();
    const created = new Date(dateString);
    const seconds = Math.floor((now.getTime() - created.getTime()) / 1000);
    
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
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

  if (!profile) {
    return (
      <MainLayout>
        <div className="max-w-4xl mx-auto p-6">
          <Card className="p-6">
            <p className="text-center">User not found</p>
          </Card>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto p-6">
        {isOwnProfile && profile && <ProfileCompletionProgress profile={profile} />}
        
        <Card className="p-6 mb-6">
          <div className="flex items-start gap-6 mb-6">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="Profile" className="h-24 w-24 rounded-full object-cover" />
            ) : (
              <div className="h-24 w-24 rounded-full bg-secondary flex items-center justify-center">
                <span className="text-3xl font-medium">{profile?.username?.[0]?.toUpperCase() || 'U'}</span>
              </div>
            )}
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl font-bold">{profile?.username || 'User'}</h1>
                {isOwnProfile ? (
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setIsEditModalOpen(true)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <FollowButton userId={profileId!} />
                    <Button variant="outline" size="sm" onClick={handleMessage}>
                      <Mail className="h-4 w-4 mr-2" />
                      Message
                    </Button>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-6 text-sm mb-2">
                <span><strong>{userPosts.length}</strong> posts</span>
                <span 
                  className="cursor-pointer hover:underline"
                  onClick={() => handleOpenFollowModal('followers')}
                >
                  <strong>{profile?.followers_count || 0}</strong> followers
                </span>
                <span 
                  className="cursor-pointer hover:underline"
                  onClick={() => handleOpenFollowModal('following')}
                >
                  <strong>{profile?.following_count || 0}</strong> following
                </span>
              </div>
              <p className="text-sm font-medium mb-1">@{profile?.username}</p>
              {profile?.bio && <p className="text-sm text-muted-foreground mb-1">{profile.bio}</p>}
              {profile?.state && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  {profile.state}
                </div>
              )}
            </div>
          </div>

          <Tabs defaultValue="posts" className="w-full">
            <TabsList className="grid w-full grid-cols-4 mb-6">
              <TabsTrigger value="posts">Posts</TabsTrigger>
              <TabsTrigger value="comments">Comments</TabsTrigger>
              <TabsTrigger value="saved">Saved</TabsTrigger>
              <TabsTrigger value="liked">Liked</TabsTrigger>
            </TabsList>

            <TabsContent value="posts" className="space-y-4">
              {isOwnProfile && (
                <Button 
                  className="w-full bg-primary hover:bg-primary/90"
                  onClick={() => setIsCreatePostOpen(true)}
                >
                  + Create Post
                </Button>
              )}

              {userPosts.length > 0 ? (
                userPosts.map((post) => (
                  <Card key={post.id} className="p-4">
                    <div className="flex items-center gap-2 mb-3">
                      {profile?.avatar_url ? (
                        <img
                              src={profile?.avatar_url || '/default-avatar.png'}
                              alt={profile?.username || 'User avatar'}
                              className="w-16 h-16 rounded-full object-cover border border-gray-200 shadow-sm bg-white"
                              referrerPolicy="no-referrer"
                            />

                      ) : (
                        <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center">
                          <span className="text-sm font-medium">{profile?.username[0]?.toUpperCase()}</span>
                        </div>
                      )}
                      <div>
                        <p className="font-semibold text-sm">{profile?.username}</p>
                        <span className="text-xs text-muted-foreground">
                          {getTimeAgo(post.created_at)}
                        </span>
                      </div>
                    </div>
                    
                    <Link to={`/post/${post.id}`}>
                      {post.content && <p className="text-sm mb-3">{post.content}</p>}
                      
                      {post.image_url && (
                        <img src={post.image_url} alt="Post" className="w-full rounded-lg mb-3" />
                      )}
                    </Link>
                    
                    <div className="flex items-center gap-4 text-sm">
                      <Button variant="ghost" size="sm" className="gap-1">
                        <ThumbsUp className="h-4 w-4" />
                        {post.likes_count}
                      </Button>
                      <Button variant="ghost" size="sm" className="gap-1" asChild>
                        <Link to={`/post/${post.id}`}>
                          <MessageSquare className="h-4 w-4" />
                          {post.comments_count}
                        </Link>
                      </Button>
                      <Button variant="ghost" size="sm" className="gap-1">
                        <Share2 className="h-4 w-4" />
                        Share
                      </Button>
                    </div>
                  </Card>
                ))
              ) : (
                <Card className="p-6">
                  <p className="text-center text-muted-foreground">No posts yet</p>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="comments">
              <Card className="p-6">
                <p className="text-center text-muted-foreground">No comments yet</p>
              </Card>
            </TabsContent>

            <TabsContent value="saved">
              <Card className="p-6">
                <p className="text-center text-muted-foreground">No saved posts yet</p>
              </Card>
            </TabsContent>

            <TabsContent value="liked">
              <Card className="p-6">
                <p className="text-center text-muted-foreground">No liked posts yet</p>
              </Card>
            </TabsContent>
          </Tabs>
        </Card>
      </div>
      
      {isOwnProfile && (
        <>
          <EditProfileModal open={isEditModalOpen} onOpenChange={setIsEditModalOpen} />
          <CreatePostDialog open={isCreatePostOpen} onOpenChange={setIsCreatePostOpen} />
        </>
      )}
      
      <FollowersModal
        isOpen={showFollowersModal}
        onClose={() => setShowFollowersModal(false)}
        followers={followList}
        title={followModalType === 'followers' ? 'Followers' : 'Following'}
      />
    </MainLayout>
  );
};

export default Profile;
