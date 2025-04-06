import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Mic } from "lucide-react";

export default function DailyChallenge() {
  const [answer, setAnswer] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { data: dailyChallenge, isLoading } = useQuery({
    queryKey: ["/api/user/daily-challenge"],
    refetchInterval: false,
  });
  
  const completeMutation = useMutation({
    mutationFn: async (data: { challengeId: number; isCorrect: boolean }) => {
      const res = await apiRequest("POST", "/api/user/daily-challenge/complete", data);
      return res.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        toast({
          title: "Challenge completed!",
          description: `You earned ${data.xpEarned} XP!`,
        });
        queryClient.invalidateQueries({ queryKey: ["/api/user"] });
        queryClient.invalidateQueries({ queryKey: ["/api/user/daily-challenge"] });
      }
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  const handleSkip = () => {
    if (dailyChallenge && !dailyChallenge.isCompleted) {
      completeMutation.mutate({
        challengeId: dailyChallenge.challenge.id,
        isCorrect: false,
      });
    }
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!dailyChallenge || dailyChallenge.isCompleted) return;
    
    // Very basic check, should use the OpenAI check in production
    const isCorrect = answer.toLowerCase().trim() === dailyChallenge.challenge.answer.toLowerCase().trim();
    
    completeMutation.mutate({
      challengeId: dailyChallenge.challenge.id,
      isCorrect,
    });
  };
  
  if (isLoading) {
    return (
      <div className="bg-background dark:bg-neutral-800 rounded-xl shadow-sm border border-neutral-200 dark:border-neutral-800 p-4 mb-6 flex justify-center py-10">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }
  
  if (!dailyChallenge) {
    return (
      <div className="bg-background dark:bg-neutral-800 rounded-xl shadow-sm border border-neutral-200 dark:border-neutral-800 p-4 mb-6">
        <div className="text-center py-6">
          <h3 className="font-bold text-lg mb-2">Daily Challenge</h3>
          <p className="text-neutral-600 dark:text-neutral-400 mb-4">
            Start learning a language to get daily challenges!
          </p>
          <Button>Start Learning</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-background dark:bg-neutral-800 rounded-xl shadow-sm border border-neutral-200 dark:border-neutral-800 p-4 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-lg">Daily Challenge</h3>
        <span className="px-3 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400 rounded-full text-xs font-medium">
          <i className="bx bx-time mr-1"></i> {dailyChallenge.isCompleted ? "Completed" : "8 hours left"}
        </span>
      </div>

      <div className="p-4 bg-neutral-50 dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-700 mb-4">
        <p className="text-center mb-4 font-medium text-neutral-700 dark:text-neutral-300">
          {dailyChallenge.challenge.type === "translation" ? "Translate this sentence" : "Answer this question"}:
        </p>

        <div className="bg-secondary-light dark:bg-secondary-hover/20 p-4 rounded-lg text-center mb-5">
          <p className="text-secondary dark:text-secondary text-lg font-bold">
            "{dailyChallenge.challenge.prompt}"
          </p>
        </div>

        {!dailyChallenge.isCompleted ? (
          <form onSubmit={handleSubmit}>
            <div className="relative mb-4">
              <Input
                type="text"
                placeholder="Type your answer here..."
                className="w-full p-3 pr-10"
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                disabled={completeMutation.isPending}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-3 top-3 text-neutral-400 hover:text-secondary"
              >
                <Mic className="h-5 w-5" />
              </Button>
            </div>

            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={completeMutation.isPending || !answer.trim()}
                className="bg-secondary hover:bg-secondary-hover"
              >
                {completeMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : null}
                Check Answer
              </Button>
            </div>
          </form>
        ) : (
          <div className="text-center py-2">
            <p className="text-green-600 dark:text-green-400 font-medium mb-2">
              Challenge completed! 
            </p>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              Come back tomorrow for a new challenge.
            </p>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between">
        <span className="text-sm text-neutral-500 dark:text-neutral-400">
          Complete for <b>20 XP</b> and maintain your streak!
        </span>
        {!dailyChallenge.isCompleted && (
          <Button
            variant="ghost"
            className="text-secondary text-sm font-medium"
            onClick={handleSkip}
            disabled={completeMutation.isPending}
          >
            Skip Today
          </Button>
        )}
      </div>
    </div>
  );
}
