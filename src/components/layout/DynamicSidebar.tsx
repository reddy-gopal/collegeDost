import { Home, TrendingUp, Compass, Grid, GraduationCap, Search, Plus, BookOpen, CheckSquare, Square, X, Menu } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { createRealtimeChannel } from "@/lib/realtime";
import { getExamsForUser, EXAM_TYPES } from "@/utils/examMappings";
import { AddExamsModal } from "@/components/profile/AddExamsModal";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

const navItems = [
  { icon: Home, label: "Home Page", path: "/" },
  { icon: TrendingUp, label: "Trending", path: "/trending" },
  { icon: Compass, label: "Explore", path: "/explore" },
  { icon: Grid, label: "All", path: "/all" },
];


interface Profile {
  username: string;
  state: string | null;
  entrance_exam: string[] | null;
  interested_exams: string[] | null;
}

export const DynamicSidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [interestedExams, setInterestedExams] = useState<string[]>([]);
  const [isAddExamsOpen, setIsAddExamsOpen] = useState(false);
  const [availableExams, setAvailableExams] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [tagSearchQuery, setTagSearchQuery] = useState("");
  const [tags, setTags] = useState<Array<{ name: string; count: number }>>([]);
  const [showAllTags, setShowAllTags] = useState(false);
  const [loadingTags, setLoadingTags] = useState(true);
  const [selectedTags, setSelectedTags] = useState<string[]>([]); // Changed from single to array
  const [tagFilterMode, setTagFilterMode] = useState<'any' | 'all'>('any'); // Filter mode
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Memoize fetchProfile to prevent recreating it
  const fetchProfile = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from('profiles')
        .select('username, state, entrance_exam, interested_exams')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      
      setProfile(data);
      setInterestedExams(data.interested_exams || []);

      // Calculate available exams based on state
      if (data.state) {
        const allPossibleExams = getExamsForUser(data.state, EXAM_TYPES);
        setAvailableExams(allPossibleExams);
      }
    } catch (error: any) {
      console.error("Error fetching profile:", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Memoize fetchTags to prevent recreating it
  const fetchTags = useCallback(async () => {
    setLoadingTags(true);
    try {
      const { data: rpcData, error: rpcError } = await (supabase as any)
        .rpc('get_tag_popularity');

      if (!rpcError && rpcData) {
        setTags(rpcData);
      } else {
        const { data: tagsData } = await (supabase as any)
          .from('tags')
          .select('name, id')
          .order('created_at', { ascending: false });

        if (tagsData) {
          const tagsWithCount = await Promise.all(
            tagsData.map(async (tag: any) => {
              const { count } = await (supabase as any)
                .from('post_tags')
                .select('*', { count: 'exact', head: true })
                .eq('tag_id', tag.id);
              return { name: tag.name, count: count || 0 };
            })
          );
          setTags(tagsWithCount.sort((a, b) => b.count - a.count));
        }
      }
    } catch (error) {
      console.error('Error fetching tags:', error);
    } finally {
      setLoadingTags(false);
    }
  }, []);

  useEffect(() => {
    if (user) {
      fetchProfile();
    } else {
      setLoading(false);
    }
    fetchTags(); // Only fetch tags, not topics
  }, [user, fetchProfile, fetchTags]);


  // Set up real-time subscription for profile updates using realtime helper
  useEffect(() => {
    if (!user?.id) return;
    if (typeof window === "undefined") return; // SSR guard

    const rt = createRealtimeChannel(`realtime:profile:${user.id}`);

    rt.onPostgresChange(
      { table: "profiles", event: "UPDATE", filter: `id=eq.${user.id}` },
      (payload) => {
        const updatedData = payload.new as any;
        
        // Only update if data actually changed to prevent unnecessary re-renders
        setProfile(prev => {
          if (!prev) return updatedData;
          // Deep compare to avoid unnecessary updates
          const hasChanges = 
            prev.username !== updatedData.username ||
            prev.state !== updatedData.state ||
            JSON.stringify(prev.interested_exams) !== JSON.stringify(updatedData.interested_exams) ||
            JSON.stringify(prev.entrance_exam) !== JSON.stringify(updatedData.entrance_exam);
          
          if (!hasChanges) return prev;
          return { ...prev, ...updatedData };
        });

        if (updatedData.interested_exams) {
          setInterestedExams(prev => {
            // Only update if different
            if (JSON.stringify(prev) === JSON.stringify(updatedData.interested_exams)) {
              return prev;
            }
            return updatedData.interested_exams;
          });
        }
        
        if (updatedData.state) {
          setAvailableExams(prev => {
            const allPossibleExams = getExamsForUser(updatedData.state, EXAM_TYPES);
            // Only update if different
            if (JSON.stringify(prev) === JSON.stringify(allPossibleExams)) {
              return prev;
            }
            return allPossibleExams;
          });
        }
      }
    );

    rt.subscribe().catch((err: any) => {
      console.error("Failed to subscribe to profile realtime:", err);
    });

    return () => {
      rt.unsubscribe();
    };
  }, [user?.id]);

  // Listen for manual refresh events from AddExamsModal
  useEffect(() => {
    const handleExamsRefresh = () => {
      fetchProfile();
    };

    window.addEventListener('examsUpdated', handleExamsRefresh);
    return () => {
      window.removeEventListener('examsUpdated', handleExamsRefresh);
    };
  }, [fetchProfile]);

  const handleExamsUpdated = useCallback(() => {
    fetchProfile();
    // Dispatch event for other components
    window.dispatchEvent(new Event('examsUpdated'));
  }, [fetchProfile]);

  // Separate board and competitive exams
  const { boardExams, competitiveExams } = useMemo(() => {
    const board = interestedExams.filter(exam => 
      exam.includes("12th") || exam.includes("HSC") || exam.includes("Intermediate") || 
      exam.includes("PUC") || exam.includes("Board") || exam.includes("HSE") || 
      exam.includes("HS")
    );
    const competitive = interestedExams.filter(exam => !board.includes(exam));
    return { boardExams: board, competitiveExams: competitive };
  }, [interestedExams]);

  // Available exams that are not already interested
  const unselectedExams = useMemo(() => {
    return availableExams.filter(exam => !interestedExams.includes(exam));
  }, [availableExams, interestedExams]);

  // Filter tags based on search
  const filteredTags = useMemo(() => {
    if (!tagSearchQuery.trim()) return tags;
    return tags.filter(tag => 
      tag.name.toLowerCase().includes(tagSearchQuery.toLowerCase())
    );
  }, [tags, tagSearchQuery]);

  // Show top 6 by default, or all if showAllTags is true
  const displayedTags = showAllTags ? filteredTags : filteredTags.slice(0, 6);

  // Handle tag click - support multi-select - memoized
  const handleTagClick = useCallback((tagName: string, event?: React.MouseEvent) => {
    // Don't process clicks if search input is focused
    if (searchInputRef.current === document.activeElement) {
      return;
    }
    
    // Don't process clicks if user is selecting text (searching)
    if (event && window.getSelection()?.toString().length > 0) {
      return;
    }
    
    const isMultiSelect = event?.ctrlKey || event?.metaKey || event?.shiftKey;
    
    setSelectedTags(prev => {
      let newSelected: string[];
      
      if (isMultiSelect) {
        // Multi-select: toggle tag
        if (prev.includes(tagName)) {
          newSelected = prev.filter(t => t !== tagName);
        } else {
          newSelected = [...prev, tagName];
        }
      } else {
        // Single select: replace all UNLESS it's the only selected tag
        if (prev.length === 1 && prev[0] === tagName) {
          newSelected = []; // Deselect if clicking same tag alone
        } else if (prev.includes(tagName)) {
          // If clicking an already selected tag (in multi-selection), just remove it
          newSelected = prev.filter(t => t !== tagName);
        } else {
          // Otherwise, add to selection (don't clear others by default)
          newSelected = [...prev, tagName];
        }
      }
      
      // Dispatch event with all selected tags
      window.dispatchEvent(new CustomEvent('tagsSelected', { 
        detail: { tags: newSelected, mode: tagFilterMode } 
      }));
      
      return newSelected;
    });
  }, [tagFilterMode]);

  // Remove individual tag from selection - memoized
  const removeTag = useCallback((tagName: string) => {
    setSelectedTags(prev => {
      const newSelected = prev.filter(t => t !== tagName);
      window.dispatchEvent(new CustomEvent('tagsSelected', { 
        detail: { tags: newSelected, mode: tagFilterMode } 
      }));
      return newSelected;
    });
  }, [tagFilterMode]);

  // Clear all selected tags - memoized
  const clearSelectedTags = useCallback(() => {
    setSelectedTags([]);
    window.dispatchEvent(new CustomEvent('tagsSelected', { 
      detail: { tags: [], mode: tagFilterMode } 
    }));
  }, [tagFilterMode]);

  // Mobile bottom navigation component - memoized to prevent re-renders
  const MobileBottomNav = useMemo(() => () => (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-t border-border shadow-lg">
      <div className="grid grid-cols-4 h-16">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex flex-col items-center justify-center gap-1 px-2 py-2 transition-colors",
                isActive
                  ? "text-primary bg-primary/10"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="h-5 w-5" />
              <span className="text-xs font-medium">{item.label.split(' ')[0]}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  ), [location.pathname]);

  // Shared sidebar content - memoized to prevent re-renders
  const SidebarContent = useMemo(() => ({ isMobile = false }: { isMobile?: boolean }) => (
    <div className={cn("space-y-6", isMobile && "p-4")}>
      {profile && profile.username && (
        <div className="bg-gradient-to-r from-primary/10 to-accent/10 rounded-lg p-4 border">
          <p className="text-sm font-medium">Hi, {profile.username}! 👋</p>
          <p className="text-xs text-muted-foreground mt-1">
            Here are updates for your selected exams
          </p>
        </div>
      )}

      {!isMobile && (
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
      )}

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm">Interested Exams</h3>
          {interestedExams.length > 0 && (
            <span className="text-xs text-muted-foreground bg-secondary px-2 py-1 rounded-full">
              {interestedExams.length}
            </span>
          )}
        </div>
        
        {interestedExams.length === 0 ? (
          <div className="text-sm text-muted-foreground py-4 text-center">
            No exams selected yet. Add exams to see updates here.
          </div>
        ) : (
          <>
            {boardExams.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Board Exams
                </p>
                {boardExams.map((exam) => (
                  <div
                    key={exam}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm bg-secondary/30 border pointer-events-none"
                  >
                    <GraduationCap className="h-4 w-4 text-muted-foreground" />
                    <span className="flex-1 truncate">{exam}</span>
                  </div>
                ))}
              </div>
            )}

            {competitiveExams.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Competitive Exams
                </p>
                {competitiveExams.map((exam) => (
                  <div
                    key={exam}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm bg-secondary/30 border pointer-events-none"
                  >
                    <BookOpen className="h-4 w-4 text-muted-foreground" />
                    <span className="flex-1 truncate">{exam}</span>
                  </div>
                ))}
              </div>
            )}

            {profile?.state && unselectedExams.length > 0 && (
              <Button 
                variant="link" 
                className="px-0 text-sm text-primary w-full justify-start hover:underline"
                onClick={() => setIsAddExamsOpen(true)}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add More Entrance Exams ({unselectedExams.length})
              </Button>
            )}

            {profile?.state && unselectedExams.length === 0 && (
              <div className="text-xs text-muted-foreground py-2 px-3 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
                ✓ All available exams for {profile.state} are selected
              </div>
            )}

            {!profile?.state && (
              <div className="text-xs text-muted-foreground py-2">
                Update your state in profile to see available exams
              </div>
            )}
          </>
        )}
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm">Trending Tags</h3>
          <div className="flex items-center gap-1">
            {selectedTags.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearSelectedTags}
                className="h-auto p-0 text-xs text-destructive hover:underline"
              >
                Clear ({selectedTags.length})
              </Button>
            )}
            {tags.length > 6 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAllTags(!showAllTags)}
                className="h-auto p-0 text-xs text-primary hover:underline ml-2"
              >
                {showAllTags ? 'Show Less' : 'View All'}
              </Button>
            )}
          </div>
        </div>

        {/* Filter Mode Toggle */}
        {selectedTags.length > 1 && (
          <div className="flex items-center gap-2 p-2 bg-secondary/50 rounded-lg border">
            <span className="text-xs text-muted-foreground">Match:</span>
            <Button
              variant={tagFilterMode === 'any' ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                setTagFilterMode('any');
                if (selectedTags.length > 0) {
                  window.dispatchEvent(new CustomEvent('tagsSelected', { 
                    detail: { tags: selectedTags, mode: 'any' } 
                  }));
                }
              }}
              className="h-6 text-xs"
            >
              Any
            </Button>
            <Button
              variant={tagFilterMode === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                setTagFilterMode('all');
                if (selectedTags.length > 0) {
                  window.dispatchEvent(new CustomEvent('tagsSelected', { 
                    detail: { tags: selectedTags, mode: 'all' } 
                  }));
                }
              }}
              className="h-6 text-xs"
            >
              All
            </Button>
          </div>
        )}
        
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none z-10" />
          <Input 
            ref={searchInputRef}
            placeholder="Search tags..." 
            className="pl-9 h-9 text-sm" 
            value={tagSearchQuery}
            onChange={(e) => setTagSearchQuery(e.target.value)}
            onFocus={(e) => {
              e.target.select();
              e.stopPropagation();
            }}
            onClick={(e) => {
              // Prevent clicks from propagating to parent elements
              e.stopPropagation();
            }}
            onMouseDown={(e) => {
              // Prevent losing focus when clicking inside input
              e.stopPropagation();
            }}
            onKeyDown={(e) => {
              // Prevent event bubbling on key presses
              e.stopPropagation();
            }}
            autoComplete="off"
            autoFocus={false}
          />
        </div>

        <div className="text-xs text-muted-foreground bg-primary/5 p-2 rounded border">
          💡 <strong>Click</strong> to add/remove tags. <strong>Ctrl+Click</strong> to toggle.
        </div>

        {loadingTags ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        ) : displayedTags.length > 0 ? (
          <div 
            className="space-y-1 max-h-[300px] overflow-y-auto"
            onMouseDown={(e) => {
              // Prevent stealing focus from search input when it's focused
              if (searchInputRef.current === document.activeElement) {
                // Allow normal scrolling but prevent focus change
                const target = e.target as HTMLElement;
                if (target.tagName === 'BUTTON' || target.closest('button')) {
                  e.preventDefault();
                  // Keep focus on input
                  setTimeout(() => {
                    searchInputRef.current?.focus();
                  }, 0);
                }
              }
            }}
          >
            {displayedTags.map((tag) => {
              const isSelected = selectedTags.includes(tag.name);
              return (
                <button
                  key={tag.name}
                  type="button"
                  onClick={(e) => {
                    // Don't process click if search input is focused
                    if (searchInputRef.current === document.activeElement) {
                      return;
                    }
                    // Only process click if not selecting text
                    if (window.getSelection()?.toString().length === 0) {
                      handleTagClick(tag.name, e);
                    }
                  }}
                  onMouseDown={(e) => {
                    // Don't process if search input is focused
                    if (searchInputRef.current === document.activeElement) {
                      return;
                    }
                    // Prevent default to avoid losing input focus when dragging text
                    if (window.getSelection()?.toString().length > 0) {
                      e.preventDefault();
                    }
                  }}
                  className={cn(
                    "w-full text-left px-3 py-2 rounded-lg text-sm transition-all flex items-center justify-between group select-none",
                    isSelected 
                      ? "bg-primary/20 border-2 border-primary shadow-sm" 
                      : "hover:bg-secondary/50 border-2 border-transparent"
                  )}
                >
                  <span className="flex items-center gap-2 flex-1">
                    {isSelected ? (
                      <CheckSquare className="h-4 w-4 text-primary flex-shrink-0" />
                    ) : (
                      <Square className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
                    )}
                    <span className={cn(
                      "transition-colors truncate",
                      isSelected ? "text-primary font-semibold" : "group-hover:text-primary"
                    )}>
                      #{tag.name}
                    </span>
                  </span>
                  <Badge 
                    variant={isSelected ? "default" : "secondary"} 
                    className="text-xs flex-shrink-0"
                  >
                    {tag.count}
                  </Badge>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-4 text-sm text-muted-foreground">
            {tagSearchQuery ? `No tags found matching "${tagSearchQuery}"` : 'No tags available yet'}
          </div>
        )}

        {/* Selected Tags Summary */}
        {selectedTags.length > 0 && (
          <div className="p-3 bg-primary/10 rounded-lg border border-primary/20">
            <div className="text-xs font-medium mb-2">
              Filtering by {selectedTags.length} tag{selectedTags.length !== 1 ? 's' : ''}:
            </div>
            <div className="flex flex-wrap gap-1">
              {selectedTags.map(tag => (
                <Badge key={tag} variant="default" className="text-xs">
                  #{tag}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeTag(tag);
                    }}
                    className="ml-1 hover:text-destructive transition-colors"
                    aria-label={`Remove ${tag}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>

      {!isMobile && (
        <div className="bg-gradient-to-br from-secondary/50 to-primary/5 rounded-lg p-4 space-y-3 border">
          <h3 className="font-semibold text-sm">Need 1-1 Dedicated Counseling Expert</h3>
          <p className="text-xs text-muted-foreground">
            Get personalized guidance from our expert counselors
          </p>
          <Button 
            className="w-full bg-primary hover:bg-primary/90 shadow-md hover:shadow-lg transition-all"
            onClick={() => {
              // Handle booking functionality
              window.open('tel:+1234567890', '_self');
            }}
          >
            Book Now
          </Button>
        </div>
      )}
    </div>
  ), [
    profile, 
    location.pathname, 
    interestedExams, 
    boardExams, 
    competitiveExams, 
    unselectedExams, 
    selectedTags, 
    tagFilterMode, 
    tags.length, 
    showAllTags, 
    loadingTags, 
    filteredTags, 
    displayedTags, 
    tagSearchQuery,
    handleTagClick,
    clearSelectedTags,
    removeTag,
    setIsAddExamsOpen
  ]);

  const [isMobileSheetOpen, setIsMobileSheetOpen] = useState(false);

  if (loading) {
    return (
      <>
        {/* Desktop Loading */}
        <aside className="hidden lg:block w-72 border-r bg-card h-[calc(100vh-4rem)] sticky top-16 overflow-y-auto">
          <div className="p-4 space-y-6">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        </aside>
        
        {/* Mobile Bottom Nav */}
        {MobileBottomNav()}
      </>
    );
  }

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-72 border-r bg-card h-[calc(100vh-4rem)] sticky top-16 overflow-y-auto">
        {SidebarContent({ isMobile: false })}
      </aside>

      {/* Mobile Bottom Navigation */}
      {MobileBottomNav()}

      {/* Mobile Sheet/Drawer for Full Sidebar */}
      <Sheet open={isMobileSheetOpen} onOpenChange={setIsMobileSheetOpen}>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden fixed bottom-20 right-4 z-40 h-12 w-12 rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 hover:shadow-xl transition-all"
            aria-label="Open menu"
          >
            <Menu className="h-6 w-6" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-[85vw] sm:w-[400px] overflow-y-auto p-0">
          <SheetHeader className="p-4 border-b">
            <SheetTitle>Menu</SheetTitle>
            <SheetDescription>
              Navigate to sections and filter posts
            </SheetDescription>
          </SheetHeader>
          <div className="p-4">
            {SidebarContent({ isMobile: true })}
            
            {/* Mobile-specific CTA */}
            <div className="bg-gradient-to-br from-secondary/50 to-primary/5 rounded-lg p-4 space-y-3 border mt-4">
              <h3 className="font-semibold text-sm">Need 1-1 Dedicated Counseling Expert</h3>
              <p className="text-xs text-muted-foreground">
                Get personalized guidance from our expert counselors
              </p>
              <Button 
                className="w-full bg-primary hover:bg-primary/90 shadow-md hover:shadow-lg transition-all"
                onClick={() => {
                  window.open('tel:+1234567890', '_self');
                }}
              >
                Book Now
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
      
      <AddExamsModal
        open={isAddExamsOpen}
        onOpenChange={setIsAddExamsOpen}
        onExamsUpdated={handleExamsUpdated}
        currentExams={interestedExams}
        userState={profile?.state || ""}
      />
    </>
  );
};
