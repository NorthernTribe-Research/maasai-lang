import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Calendar, Trophy, Clock, CheckCircle2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Challenge {
  id: number;
  prompt: string;
  answer: string;
  type: string;
  difficulty: number;
  xpReward: number;
}

interface DailyChallengeData {
  challenge: Challenge;
  isCompleted: boolean;
  completedAt?: Date;
  progress: number; // 0-100
  expiresAt: Date;
}

interface DailyChallengeCardProps {
  userId?: string;
  compact?: boolean;
}

export default function DailyChallengeCard({ compact = false }: DailyChallengeCardProps) {
  const [answer, setAnswer] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: challengeData, isLoading } = useQuery<DailyChallengeData>({
    queryKey: ["/api/gamification/daily-challenge"],
  });

  const completeMutation = useMutation({
    mutationFn: async (challengeId: number) => {
      const res = await apiRequest("POST", "/api/gamification/daily-challenge/complete", {
        challengeId,
      });
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Challenge Completed! 🎉",
        description: `You earned ${data.xpAwarded} XP!`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/gamification/daily-challenge"] });
      queryClient.invalidateQueries({ queryKey: ["/api/gamification/xp"] });
      queryClient.invalidateQueries({ queryKey: ["/api/gamification/streak"] });
      setAnswer("");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to complete challenge",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!challengeData || challengeData.isCompleted) return;
    
    // Basic validation - in production, this should be validated by the backend
    const isCorrect = answer.toLowerCase().trim() === challengeData.challenge.answer.toLowerCase().trim();
    
    if (!isCorrect) {
      toast({
        title: "Incorrect Answer",
        description: "Try again! You can do it!",
        variant: "destructive",
      });
      return;
    }
    
    completeMutation.mutate(challengeData.challenge.id);
  };

  // Calculate time remaining
  const getTimeRemaining = () => {
    if (!challengeData) return "Loading...";
    
    const now = new Date();
    const expires = new Date(challengeData.expiresAt);
    const diff = expires.getTime() - now.getTime();
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}h ${minutes}m left`;
    }
    return `${minutes}m left`;
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <Skeleton className="h-6 w-40 mb-4" />
          <Skeleton className="h-24 w-full mb-4" />
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!challengeData) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center py-6">
            <Calendar className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
            <h3 className="font-bold text-lg mb-2">Daily Challenge</h3>
            <p className="text-muted-foreground mb-4">
              Start learning a language to get daily challenges!
            </p>
            <Button>Start Learning</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const { challenge, isCompleted, progress } = challengeData;

  return (
    <Card className={cn(
      "transition-all duration-300",
      isCompleted 
        ? "bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border-green-200 dark:border-green-900"
        : "bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border-blue-200 dark:border-blue-900"
    )}>
      <CardContent className={cn("p-6", compact && "p-4")}>
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Calendar className={cn(
              "h-5 w-5",
              isCompleted ? "text-green-600" : "text-blue-600"
            )} />
            <h3 className="font-bold text-lg">Daily Challenge</h3>
          </div>
          
          {isCompleted ? (
            <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Completed
            </Badge>
          ) : (
            <Badge variant="outline" className="border-orange-300 text-orange-700 dark:border-orange-700 dark:text-orange-400">
              <Clock className="h-3 w-3 mr-1" />
              {getTimeRemaining()}
            </Badge>
          )}
        </div>

        {/* Challenge Content */}
        <div className={cn(
          "p-4 rounded-lg border mb-4",
          isCompleted 
            ? "bg-green-100/50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
            : "bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-700"
        )}>
          <p className="text-sm text-muted-foreground mb-2 font-medium">
            {challenge.type === "translation" ? "Translate this sentence:" : "Answer this question:"}
          </p>
          
          <div className="bg-gradient-to-r from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 p-4 rounded-lg mb-4">
            <p className="text-lg font-bold text-center text-blue-900 dark:text-blue-100">
              "{challenge.prompt}"
            </p>
          </div>

          {/* Progress Bar (if partially completed) */}
          {!isCompleted && progress > 0 && (
            <div className="mb-4">
              <div className="flex justify-between text-xs text-muted-foreground mb-1">
                <span>Progress</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )}

          {/* Answer Input or Completion Message */}
          {!isCompleted ? (
            <form onSubmit={handleSubmit} className="space-y-3">
              <Input
                type="text"
                placeholder="Type your answer here..."
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                disabled={completeMutation.isPending}
                className="w-full"
              />
              
              <Button
                type="submit"
                disabled={completeMutation.isPending || !answer.trim()}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                {completeMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Checking...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Submit Answer
                  </>
                )}
              </Button>
            </form>
          ) : (
            <div className="text-center py-3">
              <CheckCircle2 className="h-12 w-12 mx-auto mb-2 text-green-600" />
              <p className="font-semibold text-green-700 dark:text-green-400 mb-1">
                Challenge Completed!
              </p>
              <p className="text-sm text-muted-foreground">
                Come back tomorrow for a new challenge.
              </p>
            </div>
          )}
        </div>

        {/* XP Reward */}
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <Trophy className="h-4 w-4 text-yellow-600" />
            <span className="text-muted-foreground">
              Reward: <span className="font-bold text-foreground">{challenge.xpReward} XP</span>
            </span>
          </div>
          {!isCompleted && (
            <span className="text-xs text-muted-foreground">
              Difficulty: {challenge.difficulty}/10
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
