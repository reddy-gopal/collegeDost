import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { INDIAN_STATES, EXAM_TYPES, getExamsForUser } from "@/utils/examMappings";

export default function Onboarding() {
  const [state, setState] = useState("");
  const [selectedExams, setSelectedExams] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();

  // Get all available exams for the selected state (competitive + board)
  const availableExams = state ? getExamsForUser(state, EXAM_TYPES) : [];

  const handleExamToggle = (exam: string) => {
    setSelectedExams(prev => {
      if (prev.includes(exam)) {
        return prev.filter(examName => examName !== exam);
      }
      return [...prev, exam];
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!state.trim()) {
      toast({
        title: "Error",
        description: "Please select your state",
        variant: "destructive",
      });
      return;
    }

    if (selectedExams.length === 0) {
      toast({
        title: "Error",
        description: "Please select at least one exam",
        variant: "destructive",
      });
      return;
    }

    if (!user) return;

    setIsLoading(true);
    try {
      const { error } = await (supabase as any)
        .from('profiles')
        .update({
          state,
          entrance_exam: selectedExams,
          interested_exams: selectedExams,
          onboarding_completed: true,
        })
        .eq('id', user.id);

      if (error) throw error;

      toast({
        title: "Welcome!",
        description: "Your profile has been set up successfully.",
      });
      
      navigate('/');
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to complete onboarding",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-background to-accent/10">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">Complete Your Profile</CardTitle>
          <CardDescription className="text-center">
            Tell us a bit more about yourself to get started
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="state">State</Label>
              <Select value={state} onValueChange={setState} disabled={isLoading}>
                <SelectTrigger id="state">
                  <SelectValue placeholder="Select your state" />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  {INDIAN_STATES.map((stateName) => (
                    <SelectItem key={stateName} value={stateName}>
                      {stateName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {state && (
              <div className="space-y-3">
                <Label>Available Exams</Label>
                <p className="text-xs text-muted-foreground">Select exams you're interested in</p>
                {availableExams.length > 0 ? (
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {availableExams.map((exam) => (
                      <div key={exam} className="flex items-center space-x-2">
                        <Checkbox
                          id={exam}
                          checked={selectedExams.includes(exam)}
                          onCheckedChange={() => handleExamToggle(exam)}
                          disabled={isLoading}
                        />
                        <Label
                          htmlFor={exam}
                          className="cursor-pointer text-sm font-normal"
                        >
                          {exam}
                        </Label>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No exams available for this state</p>
                )}
              </div>
            )}

            <Button
              type="submit"
              disabled={isLoading || !state || selectedExams.length === 0}
              className="w-full"
            >
              {isLoading ? "Completing..." : "Complete Setup"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
