import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { EXAM_TYPES, getExamsForUser } from "@/utils/examMappings";

interface AddExamsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onExamsUpdated: () => void;
  currentExams: string[];
  userState: string;
}

export function AddExamsModal({ open, onOpenChange, onExamsUpdated, currentExams, userState }: AddExamsModalProps) {
  const [selectedExams, setSelectedExams] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const availableExams = userState ? getExamsForUser(userState, EXAM_TYPES) : [];
  const availableExamsToAdd = availableExams.filter(exam => !currentExams.includes(exam));

  useEffect(() => {
    if (open) {
      setSelectedExams([]);
    }
  }, [open]);

  const handleExamToggle = (exam: string) => {
    setSelectedExams(prev => {
      if (prev.includes(exam)) {
        return prev.filter(examName => examName !== exam);
      }
      return [...prev, exam];
    });
  };

  const handleSave = async () => {
    if (!user || selectedExams.length === 0) return;

    setIsLoading(true);
    try {
      const { data: currentProfile, error: fetchError } = await supabase
        .from('profiles')
        .select('entrance_exam, interested_exams')
        .eq('id', user.id)
        .single();

      if (fetchError) throw fetchError;

      const currentEntranceExams = currentProfile?.entrance_exam || [];
      const currentInterestedExams = currentProfile?.interested_exams || [];
      
      const updatedEntranceExams = [...new Set([...currentEntranceExams, ...selectedExams])];
      const updatedInterestedExams = [...new Set([...currentInterestedExams, ...selectedExams])];

      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          entrance_exam: updatedEntranceExams,
          interested_exams: updatedInterestedExams,
        })
        .eq('id', user.id);

      if (updateError) throw updateError;

      toast({
        title: "Success",
        description: `${selectedExams.length} exam${selectedExams.length > 1 ? 's' : ''} added successfully!`,
      });

      onExamsUpdated();
      onOpenChange(false);
      setSelectedExams([]);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to add exams",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add More Entrance Exams</DialogTitle>
          <DialogDescription>
            {userState 
              ? `Select additional exams from ${userState} that you're interested in.`
              : "Please update your state in profile settings first."}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {!userState ? (
            <div className="text-center py-8">
              <p className="text-sm text-muted-foreground">
                Please update your state in profile settings first
              </p>
            </div>
          ) : availableExamsToAdd.length > 0 ? (
            <div className="space-y-3">
              <Label>Available Exams for {userState}</Label>
              <p className="text-xs text-muted-foreground">
                Select exams to add ({selectedExams.length} selected)
              </p>
              <div className="space-y-2 max-h-[350px] overflow-y-auto pr-2 border rounded-md p-3">
                {availableExamsToAdd.map((exam, index) => (
                  <div 
                    key={`${exam}-${index}`}
                    className="flex items-center space-x-3 p-2 rounded hover:bg-secondary/50 transition-colors cursor-pointer"
                    onClick={() => handleExamToggle(exam)}
                  >
                    <Checkbox
                      id={`exam-${index}`}
                      checked={selectedExams.includes(exam)}
                      onCheckedChange={() => handleExamToggle(exam)}
                      disabled={isLoading}
                    />
                    <Label
                      htmlFor={`exam-${index}`}
                      className="cursor-pointer text-sm font-normal flex-1"
                    >
                      {exam}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-sm text-muted-foreground">
                {availableExams.length === 0 
                  ? `No exams available for ${userState}. Please check your exam mappings.`
                  : "All available exams are already selected! 🎉"}
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => {
              setSelectedExams([]);
              onOpenChange(false);
            }} 
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={isLoading || selectedExams.length === 0 || availableExamsToAdd.length === 0}
          >
            {isLoading ? "Adding..." : `Add ${selectedExams.length > 0 ? `(${selectedExams.length})` : ''} Exam${selectedExams.length !== 1 ? 's' : ''}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
