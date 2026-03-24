import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DuolingoHeader } from "@/components/duolingo/DuolingoHeader";
import { BottomNav } from "@/components/duolingo/BottomNav";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dumbbell, Target, Clock, Zap, Loader2, Trophy, ArrowLeft } from "lucide-react";
import ExercisePractice from "@/components/learning/ExercisePractice";
import { useToast } from "@/hooks/use-toast";
import { LoadingState } from "@/components/ui/loading-state";

interface Exercise {
  id: string;
  type: 'translation' | 'fill-in-blank' | 'multiple-choice' | 'matching';
  question: string;
  options?: string[];
  correctAnswer: string;
  explanation: string;
  difficulty: number;
}

type PracticeType = 'weak-skills' | 'timed-challenge' | 'quick-review' | 'mixed-practice';

export default function PracticeDuolingo() {
  const [selectedType, setSelectedType] = useState<PracticeType | null>(null);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [finalResults, setFinalResults] = useState<{ totalXP: number; accuracy: number } | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch user's current profile
  const { data: profiles, isLoading: isLoadingProfiles } = useQuery<any[]>({
    queryKey: ['/api/profiles'],
    enabled: !selectedType,
    staleTime: 60000, // Cache for 1 minute
  });

  const currentProfile = profiles?.[0]; // Use first profile for now
  
  // Auto-select first profile when loaded
  useEffect(() => {
    if (profiles && profiles.length > 0 && !currentProfile) {
      // Profile is now available
    }
  }, [profiles, currentProfile]);

  const practiceTypes = [
    {
      id: 'weak-skills' as PracticeType,
      icon: <Target className="h-8 w-8" />,
      title: "Weak Skills",
      description: "Practice your weakest topics",
      color: "bg-red-500",
      count: 8,
    },
    {
      id: 'timed-challenge' as PracticeType,
      icon: <Clock className="h-8 w-8" />,
      title: "Timed Challenge",
      description: "Race against the clock",
      color: "bg-blue-500",
      count: 10,
    },
    {
      id: 'quick-review' as PracticeType,
      icon: <Zap className="h-8 w-8" />,
      title: "Quick Review",
      description: "5-minute practice session",
      color: "bg-yellow-500",
      count: 5,
    },
    {
      id: 'mixed-practice' as PracticeType,
      icon: <Dumbbell className="h-8 w-8" />,
      title: "Mixed Practice",
      description: "Random exercises from all units",
      color: "bg-purple-600",
      count: 10,
    },
  ];

  // Generate exercises mutation
  const generateExercisesMutation = useMutation({
    mutationFn: async (type: PracticeType) => {
      if (!currentProfile) {
        throw new Error('No profile found');
      }

      const practiceConfig = practiceTypes.find(p => p.id === type);
      const count = practiceConfig?.count || 5;

      // Determine weakness areas based on practice type
      let weaknessAreas: string[] = [];
      if (type === 'weak-skills' && currentProfile.weaknesses) {
        weaknessAreas = currentProfile.weaknesses as string[];
      }

      const response = await fetch('/api/exercises/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          profileId: currentProfile.id,
          targetLanguage: currentProfile.targetLanguage,
          weaknessAreas,
          count
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to generate exercises');
      }

      const data = await response.json();
      return data.exercises;
    },
    onSuccess: (data: Exercise[]) => {
      setExercises(data);
      toast({
        title: 'Exercises ready!',
        description: `${data.length} exercises generated for you`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to generate exercises',
        description: error.message,
        variant: 'destructive'
      });
      setSelectedType(null);
    }
  });

  const handleStartPractice = (type: PracticeType) => {
    setSelectedType(type);
    setShowResults(false);
    setFinalResults(null);
    generateExercisesMutation.mutate(type);
  };

  const handlePracticeComplete = (totalXP: number, accuracy: number) => {
    setFinalResults({ totalXP, accuracy });
    setShowResults(true);
    
    // Invalidate queries to refresh user stats
    queryClient.invalidateQueries({ queryKey: ['/api/profiles'] });
    queryClient.invalidateQueries({ queryKey: ['/api/user-stats'] });
    
    // Show celebration toast for high accuracy
    if (accuracy >= 90) {
      toast({
        title: '🎉 Outstanding!',
        description: `${accuracy}% accuracy! You're on fire!`,
      });
    } else if (accuracy >= 70) {
      toast({
        title: '✨ Great work!',
        description: `${accuracy}% accuracy! Keep it up!`,
      });
    }
  };

  const handleBackToMenu = () => {
    setSelectedType(null);
    setExercises([]);
    setShowResults(false);
    setFinalResults(null);
  };

  // Show loading state while generating exercises
  if (selectedType && generateExercisesMutation.isPending) {
    return (
      <LoadingState
        fullScreen
        title="Generating exercises..."
        description="Tailoring practice to your level and weaknesses."
      />
    );
  }

  // Show results screen
  if (showResults && finalResults) {
    const selectedPractice = practiceTypes.find(p => p.id === selectedType);
    const performanceLevel = finalResults.accuracy >= 90 ? 'excellent' : 
                            finalResults.accuracy >= 70 ? 'great' : 
                            finalResults.accuracy >= 50 ? 'good' : 'needs-improvement';
    
    const performanceMessages = {
      'excellent': '🎉 Outstanding performance!',
      'great': '✨ Great work!',
      'good': '👍 Good effort!',
      'needs-improvement': '💪 Keep practicing!'
    };
    
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-800 pb-20">
        <DuolingoHeader />
        <main className="max-w-2xl mx-auto px-4 py-8">
          <Card className="border-2 border-green-500 shadow-lg animate-in fade-in slide-in-from-bottom-4 duration-500">
            <CardContent className="py-12 text-center space-y-6">
              <div className="flex justify-center animate-in zoom-in duration-700">
                <div className="bg-gradient-to-br from-green-400 to-green-600 h-24 w-24 rounded-full flex items-center justify-center shadow-lg">
                  <Trophy className="h-12 w-12 text-white" />
                </div>
              </div>
              
              <div className="animate-in fade-in slide-in-from-bottom-2 duration-500 delay-150">
                <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white mb-2">
                  Practice Complete!
                </h2>
                <p className="text-gray-600 dark:text-gray-400">
                  {selectedPractice?.title}
                </p>
                <p className="text-lg font-semibold text-primary mt-2">
                  {performanceMessages[performanceLevel]}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 max-w-md mx-auto animate-in fade-in slide-in-from-bottom-2 duration-500 delay-300">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 rounded-xl p-4 shadow-md">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Accuracy</p>
                  <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                    {Math.round(finalResults.accuracy)}%
                  </p>
                </div>
                <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-950 dark:to-yellow-900 rounded-xl p-4 shadow-md">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">XP Earned</p>
                  <p className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">
                    +{finalResults.totalXP}
                  </p>
                </div>
              </div>

              <div className="space-y-3 pt-4 animate-in fade-in duration-500 delay-500">
                <Button
                  className="w-full max-w-md bg-primary hover:bg-primary/90 rounded-xl font-bold shadow-md hover:shadow-lg transition-all"
                  onClick={() => handleStartPractice(selectedType!)}
                >
                  Practice Again
                </Button>
                <Button
                  variant="outline"
                  className="w-full max-w-md rounded-xl font-bold"
                  onClick={handleBackToMenu}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Practice Hub
                </Button>
              </div>
            </CardContent>
          </Card>
        </main>
        <BottomNav />
      </div>
    );
  }

  // Show exercise practice
  if (selectedType && exercises.length > 0) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-800 pb-20">
        <DuolingoHeader />
        <main className="max-w-2xl mx-auto px-4 py-8">
          <Button
            variant="ghost"
            className="mb-4"
            onClick={handleBackToMenu}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Practice Hub
          </Button>
          
          {currentProfile && (
            <ExercisePractice
              exercises={exercises}
              profileId={currentProfile.id}
              onComplete={handlePracticeComplete}
            />
          )}
        </main>
        <BottomNav />
      </div>
    );
  }

  // Show practice type selection menu
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-800 pb-20">
      <DuolingoHeader />

      <main className="max-w-2xl mx-auto px-4 py-8">
        <div className="text-center mb-8 animate-in fade-in slide-in-from-top duration-500">
          <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white mb-2">
            Practice Hub
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Strengthen your skills with focused practice
          </p>
        </div>

        <div className="grid gap-4">
          {practiceTypes.map((type, index) => (
            <Card
              key={type.id}
              className="border-2 hover:border-primary dark:hover:border-primary transition-all cursor-pointer hover:shadow-xl hover:scale-[1.02] animate-in fade-in slide-in-from-bottom duration-500"
              style={{ animationDelay: `${index * 100}ms` }}
              onClick={() => !isLoadingProfiles && currentProfile && handleStartPractice(type.id)}
            >
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div
                    className={`${type.color} h-16 w-16 rounded-2xl flex items-center justify-center text-white flex-shrink-0 shadow-lg transition-transform hover:scale-110`}
                  >
                    {type.icon}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
                      {type.title}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {type.description}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                      {type.count} exercises
                    </p>
                  </div>
                  <Button
                    className="bg-primary hover:bg-primary/90 rounded-xl font-bold shadow-md hover:shadow-lg transition-all"
                    disabled={!currentProfile || isLoadingProfiles}
                  >
                    {isLoadingProfiles ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      'Start'
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {!currentProfile && !isLoadingProfiles && (
          <Card className="mt-6 border-2 border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20 animate-in fade-in duration-500">
            <CardContent className="py-4 text-center">
              <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200 mb-2">
                Create a learning profile to start practicing
              </p>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => window.location.href = '/'}
                className="border-yellow-600 text-yellow-700 hover:bg-yellow-100 dark:border-yellow-400 dark:text-yellow-300"
              >
                Get Started
              </Button>
            </CardContent>
          </Card>
        )}
        
        {isLoadingProfiles && (
          <Card className="mt-6">
            <CardContent className="py-4 text-center">
              <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
              <p className="text-sm text-muted-foreground mt-2">Loading your profile...</p>
            </CardContent>
          </Card>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
