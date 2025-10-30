import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { useAuth } from "@/hooks/useAuth"; // ADD THIS IMPORT
import { Loader2 } from "lucide-react";
import Home from "./pages/Home";
import PostDetailPage from "@/pages/PostDetailPage";
import Profile from "./pages/ProfileUpdated";
import Messages from "./pages/MessagesUpdated";
import Notifications from "./pages/NotificationsUpdated";
import Trending from "./pages/Trending";
import Explore from "./pages/ExploreUpdated";
import Auth from "./pages/Auth";
import Onboarding from "./pages/Onboarding";
import NotFound from "./pages/NotFound";
import CreatePostPage from "@/pages/CreatePostPage";
import CommentThreadPage from "./pages/CommentThreadPage";
import All from "@/pages/All";

const queryClient = new QueryClient();

function AppContent() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/auth" element={!user ? <Auth /> : <Navigate to="/" />} />
      <Route path="/onboarding" element={user ? <Onboarding /> : <Navigate to="/auth" />} />
      <Route path="/" element={<Home />} />
      <Route path="/post/:id" element={<PostDetailPage />} />
      <Route path="/post/:postId/comment/:commentId" element={<CommentThreadPage />} />
      <Route path="/profile" element={<Profile />} />
      <Route path="/profile/:userId" element={<Profile />} />
      <Route path="/messages" element={user ? <Messages /> : <Navigate to="/auth" />} />
      <Route path="/notifications" element={user ? <Notifications /> : <Navigate to="/auth" />} />
      <Route path="/trending" element={<Trending />} />
      <Route path="/all" element={<All />} />
      <Route path="/explore" element={<Explore />} />
      <Route path="/create-post" element={user ? <CreatePostPage /> : <Navigate to="/auth" />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AppContent />
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
