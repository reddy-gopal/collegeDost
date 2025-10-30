import { Home, TrendingUp, Compass, Grid, GraduationCap } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { AddExamsModal } from "@/components/profile/AddExamsModal";
import { EXAM_TYPES, getExamsForUser } from "@/utils/examMappings";

const navItems = [
  { icon: Home, label: "Home Page", path: "/" },
  { icon: TrendingUp, label: "Trending", path: "/trending" },
  { icon: Compass, label: "Explore", path: "/explore" },
  { icon: Grid, label: "All", path: "/all" },
];

export const Sidebar = () => {
  const location = useLocation();
  const { user } = useAuth();
  const [interestedExams, setInterestedExams] = useState<string[]>([]);
  const [entranceExams, setEntranceExams] = useState<string[]>([]);
  const [userState, setUserState] = useState<string>("");
  const [showAddExamsModal, setShowAddExamsModal] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchUserProfile = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await (supabase as any)
        .from('profiles')
        .select('interested_exams, entrance_exam, state')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      
      setInterestedExams(data?.interested_exams || []);
      setEntranceExams(data?.entrance_exam || []);
      setUserState(data?.state || "");
    } catch (error) {
      console.error('Error fetching user profile:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserProfile();
  }, [user]);

  // Set up real-time subscription for profile updates
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`profile-updates-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${user.id}`
        },
        (payload) => {
          const updatedData = payload.new as any;
          if (updatedData.interested_exams) {
            setInterestedExams(updatedData.interested_exams);
          }
          if (updatedData.entrance_exam) {
            setEntranceExams(updatedData.entrance_exam);
          }
          if (updatedData.state) {
            setUserState(updatedData.state);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const handleExamsUpdated = () => {
    fetchUserProfile();
  };

  // Get available exams for the user's state
  const availableExams = userState ? getExamsForUser(userState, EXAM_TYPES) : [];
  
  // Combine both exam lists for display
  const allSelectedExams = [...interestedExams, ...entranceExams];

  return (
    <aside className="hidden lg:block w-72 border-r bg-card h-[calc(100vh-4rem)] sticky top-16 overflow-y-auto">
      <div className="p-4 space-y-6">
        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                  isActive
                    ? "bg-primary/10 text-primary border-l-4 border-primary"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground hover:translate-x-1"
                )}
              >
                <Icon className="h-5 w-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="space-y-3">
          <h3 className="font-semibold text-sm">Interested Exams</h3>
          
          {loading ? (
            <div className="text-sm text-muted-foreground">Loading...</div>
          ) : allSelectedExams.length > 0 ? (
            <div className="space-y-2">
              {allSelectedExams.map((exam) => (
                <div
                  key={exam}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm hover:bg-secondary/50 transition-colors"
                >
                  <GraduationCap className="h-4 w-4 text-muted-foreground" />
                  {exam}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">No exams selected yet</div>
          )}

          {availableExams.length > 0 && (
            <Button 
              variant="link" 
              className="px-0 text-sm text-primary"
              onClick={() => setShowAddExamsModal(true)}
            >
              + Add More Entrance Exams
            </Button>
          )}
        </div>

        <div className="bg-secondary/50 rounded-lg p-4 space-y-3">
          <h3 className="font-semibold text-sm">Need 1-1 Dedicated Counseling Expert</h3>
          <p className="text-xs text-muted-foreground">Book Your Call Now</p>
          <Button className="w-full bg-primary hover:bg-primary/90 shadow-md hover:shadow-lg transition-all">
            Book Now
          </Button>
        </div>
      </div>
      
      <AddExamsModal
        open={showAddExamsModal}
        onOpenChange={setShowAddExamsModal}
        onExamsUpdated={handleExamsUpdated}
        currentExams={allSelectedExams}
        userState={userState}
      />
    </aside>
  );
};
