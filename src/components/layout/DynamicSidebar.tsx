import { Home, TrendingUp, Compass, Grid, GraduationCap, Search, Plus } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { getExamsForUser, EXAM_TYPES } from "@/utils/examMappings";
import { useToast } from "@/hooks/use-toast";
import { AddExamsModal } from "@/components/profile/AddExamsModal";

const navItems = [
  { icon: Home, label: "Home Page", path: "/" },
  { icon: TrendingUp, label: "Trending", path: "/trending" },
  { icon: Compass, label: "Explore", path: "/explore" },
  { icon: Grid, label: "All", path: "/all" },
];

const tags = [
  "#Engineering - 12 Lakhs",
  "MBA - 5 Lakhs",
  "CA - 4 Lakhs",
  "Medical - 8 Lakhs",
  "Law - 3 Lakhs",
];

interface Profile {
  username: string;
  state: string | null;
  entrance_exam: string[] | null;
  interested_exams: string[] | null;
}

export const DynamicSidebar = () => {
  const location = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [interestedExams, setInterestedExams] = useState<string[]>([]);
  const [isAddExamsOpen, setIsAddExamsOpen] = useState(false);
  const [availableExams, setAvailableExams] = useState<string[]>([]);
  const [selectedNewExams, setSelectedNewExams] = useState<string[]>([]);

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
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
          console.log("DynamicSidebar - Realtime profile update:", payload);
          const updatedData = payload.new as any;
          if (updatedData.interested_exams) {
            setInterestedExams(updatedData.interested_exams);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;

    try {
      const { data, error } = await (supabase as any)
        .from('profiles')
        .select('username, state, entrance_exam, interested_exams')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      setProfile(data);
      setInterestedExams(data.interested_exams || []);

      // Calculate available exams based on state using EXAM_TYPES (same as Sidebar)
      if (data.state) {
        const allPossibleExams = getExamsForUser(data.state, EXAM_TYPES);
        setAvailableExams(allPossibleExams);
        console.log("DynamicSidebar - Available exams for", data.state, ":", allPossibleExams.length);
      }
    } catch (error: any) {
      console.error("Error fetching profile:", error);
    }
  };

  const handleExamsUpdated = () => {
    console.log("DynamicSidebar - Exams updated, refetching...");
    fetchProfile();
  };

  const toggleExamSelection = (exam: string) => {
    setSelectedNewExams(prev => {
      if (prev.includes(exam)) {
        return prev.filter(e => e !== exam);
      }
      return [...prev, exam];
    });
  };

  // Separate board and competitive exams
  const boardExams = interestedExams.filter(exam => 
    exam.includes("12th") || exam.includes("HSC") || exam.includes("Intermediate") || 
    exam.includes("PUC") || exam.includes("Board") || exam.includes("HSE") || 
    exam.includes("HS")
  );
  
  const competitiveExams = interestedExams.filter(exam => !boardExams.includes(exam));

  // Available exams that are not already interested
  const unselectedExams = availableExams.filter(exam => !interestedExams.includes(exam));

  console.log("DynamicSidebar state:", {
    isAddExamsOpen,
    unselectedExams: unselectedExams.length,
    interestedExams: interestedExams.length,
    availableExams: availableExams.length,
    userState: profile?.state
  });

  return (
    <aside className="hidden lg:block w-72 border-r bg-card h-[calc(100vh-4rem)] sticky top-16 overflow-y-auto">
      <div className="p-4 space-y-6">
        {profile && profile.username && (
          <div className="bg-gradient-to-r from-primary/10 to-accent/10 rounded-lg p-4 border">
            <p className="text-sm font-medium">Hi, {profile.username}! 👋</p>
            <p className="text-xs text-muted-foreground mt-1">
              Here are updates for your selected exams
            </p>
          </div>
        )}

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

        {interestedExams.length > 0 && (
          <div className="space-y-3">
            <h3 className="font-semibold text-sm">Interested Exams</h3>
            
            {boardExams.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Board Exams</p>
                {boardExams.map((exam) => (
                  <Link
                    key={exam}
                    to={`/exam/${exam.toLowerCase().replace(/\s+/g, '-')}`}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm hover:bg-secondary/50 transition-colors"
                  >
                    <GraduationCap className="h-4 w-4 text-muted-foreground" />
                    {exam}
                  </Link>
                ))}
              </div>
            )}

            {competitiveExams.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Competitive Exams</p>
                {competitiveExams.map((exam) => (
                  <Link
                    key={exam}
                    to={`/exam/${exam.toLowerCase().replace(/\s+/g, '-')}`}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm hover:bg-secondary/50 transition-colors"
                  >
                    <GraduationCap className="h-4 w-4 text-muted-foreground" />
                    {exam}
                  </Link>
                ))}
              </div>
            )}

            {profile?.state && unselectedExams.length > 0 && (
              <Button 
                variant="link" 
                className="px-0 text-sm text-primary w-full justify-start"
                onClick={() => {
                  console.log("=== Add More Exams Button Clicked (DynamicSidebar) ===");
                  console.log("Current isAddExamsOpen:", isAddExamsOpen);
                  console.log("Available to add:", unselectedExams.length);
                  setIsAddExamsOpen(true);
                }}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add More Entrance Exams ({unselectedExams.length})
              </Button>
            )}

            {profile?.state && unselectedExams.length === 0 && (
              <div className="text-sm text-muted-foreground">
                All available exams for {profile.state} are selected
              </div>
            )}
          </div>
        )}

        <div className="space-y-3">
          <h3 className="font-semibold text-sm">Tags</h3>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search" className="pl-9 h-9 text-sm" />
          </div>
          <div className="space-y-1">
            {tags.map((tag, index) => (
              <button
                key={index}
                className="w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-secondary/50 transition-colors"
              >
                {tag}
              </button>
            ))}
          </div>
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
        open={isAddExamsOpen}
        onOpenChange={(open) => {
          console.log("DynamicSidebar - Modal onOpenChange:", open);
          setIsAddExamsOpen(open);
        }}
        onExamsUpdated={handleExamsUpdated}
        currentExams={interestedExams}
        userState={profile?.state || ""}
      />
    </aside>
  );
};
