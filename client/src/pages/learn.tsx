import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { DuolingoHeader } from "@/components/duolingo/DuolingoHeader";
import { BottomNav } from "@/components/duolingo/BottomNav";
import { LearningPath, type Unit } from "@/components/duolingo/LearningPath";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Flame, Target, Heart, Globe2, Gem } from "lucide-react";
import { useLocation } from "wouter";
import { LoadingState } from "@/components/ui/loading-state";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface UserStats {
  xp: number;
  level: number;
  hearts: number;
  maxHearts: number;
  gems: number;
  streak: number;
  longestStreak: number;
}

function extractApiErrorMessage(error: unknown): string {
  if (!(error instanceof Error)) {
    return "Request failed";
  }

  const raw = error.message || "Request failed";
  const jsonStart = raw.indexOf("{");
  if (jsonStart >= 0) {
    try {
      const parsed = JSON.parse(raw.slice(jsonStart));
      if (typeof parsed?.message === "string" && parsed.message.length > 0) {
        return parsed.message;
      }
    } catch {
      // Ignore parse errors.
    }
  }

  return raw.replace(/^\d+:\s*/, "");
}

export default function Learn() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  // Fetch user's learning path
  const { data: units, isLoading: unitsLoading } = useQuery<Unit[]>({
    queryKey: ["/api/learning-path", user?.id],
    queryFn: async () => {
      const res = await fetch("/api/learning-path");
      if (!res.ok) throw new Error("Failed to fetch learning path");
      return res.json();
    },
    enabled: !!user,
  });

  // Fetch user stats
  const { data: stats, isLoading: statsLoading } = useQuery<UserStats>({
    queryKey: ["/api/user-stats/stats", user?.id],
    queryFn: async () => {
      const res = await fetch("/api/user-stats/stats");
      if (!res.ok) throw new Error("Failed to fetch user stats");
      return res.json();
    },
    enabled: !!user,
  });

  const handleLessonClick = (lessonId: string) => {
    setLocation(`/lessons/${lessonId}`);
  };

  const legendaryAttemptMutation = useMutation({
    mutationFn: async (unitId: string) => {
      const response = await apiRequest("POST", "/api/learning-path/legendary/attempt", { unitId });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Legendary unlocked",
        description: "This unit is now marked as legendary.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/learning-path", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/user-stats/stats", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/user-stats/stats"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Legendary attempt blocked",
        description: extractApiErrorMessage(error),
        variant: "destructive",
      });
    },
  });

  const handleLegendaryAttempt = (unitId: string) => {
    legendaryAttemptMutation.mutate(unitId);
  };

  const currentLessonId =
    units
      ?.flatMap((unit) => unit.lessons)
      .find((lesson) => lesson.state === "in-progress" || lesson.state === "available")
      ?.id || units?.[0]?.lessons?.[0]?.id;

  if (unitsLoading || statsLoading) {
    return (
      <LoadingState
        fullScreen
        title="Loading your path..."
        description="Bringing in your next lessons."
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/10 to-white dark:from-gray-900 dark:to-gray-800 pb-20">
      <DuolingoHeader />

      <main className="pt-8">
        {/* Welcome Section */}
        <div className="max-w-2xl mx-auto px-4 mb-8">
          <h2 className="text-3xl font-bold text-foreground mb-2">
            Welcome back, {user?.firstName || "Learner"}!
          </h2>
          <p className="text-muted-foreground">
            Keep your streak alive and learn something new today.
          </p>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="max-w-2xl mx-auto px-4 mb-8">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="p-5 bg-card border-2 rounded-2xl shadow-sm hover:border-orange-200 transition-colors">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Day Streak</p>
                    <p className="text-3xl font-black text-foreground">
                      {stats.streak}
                    </p>
                  </div>
                  <div className="bg-orange-100 dark:bg-orange-900/30 p-3 rounded-full">
                    <Flame className="w-8 h-8 text-orange-500 fill-current" />
                  </div>
                </div>
              </Card>

              <Card className="p-5 bg-card border-2 rounded-2xl shadow-sm hover:border-primary/30 transition-colors">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Current Level</p>
                    <p className="text-3xl font-black text-foreground">
                      {stats.level}
                    </p>
                  </div>
                  <div className="bg-primary/10 p-3 rounded-full">
                    <Target className="w-8 h-8 text-primary fill-current" />
                  </div>
                </div>
              </Card>

              <Card className="p-5 bg-card border-2 rounded-2xl shadow-sm hover:border-red-200 transition-colors">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Hearts</p>
                    <p className="text-3xl font-black text-foreground">
                      {stats.hearts}/{stats.maxHearts}
                    </p>
                  </div>
                  <div className="bg-red-100 dark:bg-red-900/30 p-3 rounded-full flex gap-1">
                    <Heart className="w-8 h-8 fill-red-500 text-red-500" />
                  </div>
                </div>
              </Card>

              <Card className="p-5 bg-card border-2 rounded-2xl shadow-sm hover:border-cyan-200 transition-colors">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Gems</p>
                    <p className="text-3xl font-black text-foreground">
                      {stats.gems}
                    </p>
                  </div>
                  <div className="bg-cyan-100 dark:bg-cyan-900/30 p-3 rounded-full">
                    <Gem className="w-8 h-8 text-cyan-500" />
                  </div>
                </div>
              </Card>
            </div>
          </div>
        )}

        {/* Learning Path */}
        {units && units.length > 0 ? (
          <LearningPath
            units={units}
            currentLessonId={currentLessonId}
            onLessonClick={handleLessonClick}
            onLegendaryAttempt={handleLegendaryAttempt}
            legendaryPendingUnitId={
              legendaryAttemptMutation.isPending
                ? (legendaryAttemptMutation.variables as string) || null
                : null
            }
          />
        ) : (
          <div className="text-center py-16 px-4 max-w-md mx-auto">
            <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <Globe2 className="w-12 h-12 text-primary" />
            </div>
            <h3 className="text-2xl font-black mb-3">Your Journey Begins</h3>
            <p className="text-muted-foreground text-lg mb-8">
              You haven't enrolled in any courses yet. Add a language course to start your learning path string.
            </p>
            <Button 
              size="lg" 
              className="w-full font-bold text-lg h-14 rounded-xl border-b-4 border-primary-dark active:border-b-0 active:translate-y-1 transition-all"
              onClick={() => setLocation("/lessons")}
            >
              Start a Course
            </Button>
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
