import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Flame, Calendar, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import { useGamificationQuery } from "@/hooks/use-cached-query";
import { queryKeys } from "@/lib/cacheConfig";

interface StreakData {
  currentStreak: number;
  longestStreak: number;
  lastActivity: Date;
  streakHistory?: { date: string; active: boolean }[];
}

interface StreakTrackerProps {
  userId?: string;
  showCalendar?: boolean;
}

export default function StreakTracker({ showCalendar = true }: StreakTrackerProps) {
  // Use optimized caching for gamification data (2 min stale, 5 min cache)
  // Implements stale-while-revalidate: shows cached data immediately, refetches in background
  const { data: streakData, isLoading } = useGamificationQuery<StreakData>(
    queryKeys.gamification.streak
  );

  // Generate last 7 days for calendar visualization
  const getLast7Days = () => {
    const days = [];
    const today = new Date();
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      days.push(date);
    }
    
    return days;
  };

  const isDateActive = (date: Date) => {
    if (!streakData) return false;
    
    const today = new Date();
    const daysDiff = Math.floor((today.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    // If within current streak, mark as active
    return daysDiff < streakData.currentStreak;
  };

  const getDayName = (date: Date) => {
    return date.toLocaleDateString('en-US', { weekday: 'short' });
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  // Determine milestone status
  const getMilestone = (streak: number) => {
    if (streak >= 365) return { label: "Year Warrior", color: "text-purple-600" };
    if (streak >= 100) return { label: "Century Club", color: "text-yellow-600" };
    if (streak >= 30) return { label: "Monthly Master", color: "text-orange-600" };
    if (streak >= 7) return { label: "Week Warrior", color: "text-green-600" };
    return null;
  };

  const milestone = streakData ? getMilestone(streakData.currentStreak) : null;

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <Skeleton className="h-6 w-32 mb-4" />
          <Skeleton className="h-16 w-full mb-4" />
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!streakData) {
    return null;
  }

  const last7Days = getLast7Days();

  return (
    <Card className="bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-950/20 dark:to-red-950/20 border-orange-200 dark:border-orange-900">
      <CardContent className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Flame className="h-5 w-5 text-orange-600" />
            <h3 className="font-bold text-lg">Learning Streak</h3>
          </div>
          {milestone && (
            <div className="flex items-center gap-1 text-xs font-semibold">
              <Trophy className={cn("h-4 w-4", milestone.color)} />
              <span className={milestone.color}>{milestone.label}</span>
            </div>
          )}
        </div>

        {/* Current Streak Display */}
        <div className="flex items-center justify-center mb-6">
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Flame className="h-12 w-12 text-orange-600 animate-pulse" />
              <div className="text-5xl font-bold text-orange-600">
                {streakData.currentStreak}
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              {streakData.currentStreak === 1 ? 'day' : 'days'} in a row
            </p>
          </div>
        </div>

        {/* Calendar Visualization */}
        {showCalendar && (
          <div className="border-t pt-4">
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <h4 className="font-semibold text-sm">Last 7 Days</h4>
            </div>
            
            <div className="grid grid-cols-7 gap-2">
              {last7Days.map((date, index) => {
                const active = isDateActive(date);
                const today = isToday(date);
                
                return (
                  <div key={index} className="flex flex-col items-center">
                    <div
                      className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-300",
                        today && active && "ring-2 ring-orange-600 ring-offset-2",
                        active
                          ? "bg-gradient-to-br from-orange-500 to-red-500 text-white shadow-lg"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      {active ? (
                        <Flame className="h-5 w-5" />
                      ) : (
                        <span>{date.getDate()}</span>
                      )}
                    </div>
                    <span
                      className={cn(
                        "text-xs mt-1",
                        today ? "font-semibold text-foreground" : "text-muted-foreground"
                      )}
                    >
                      {getDayName(date)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="border-t mt-4 pt-4 flex items-center justify-between text-sm">
          <div>
            <p className="text-muted-foreground">Longest Streak</p>
            <p className="font-bold text-lg">{streakData.longestStreak} days</p>
          </div>
          <div className="text-right">
            <p className="text-muted-foreground">Last Activity</p>
            <p className="font-semibold">
              {new Date(streakData.lastActivity).toLocaleDateString()}
            </p>
          </div>
        </div>

        {/* Motivation Message */}
        <div className="mt-4 p-3 bg-orange-100 dark:bg-orange-900/30 rounded-lg text-center">
          <p className="text-sm font-medium text-orange-800 dark:text-orange-400">
            {streakData.currentStreak === 0
              ? "Start your streak today! Complete any learning activity."
              : streakData.currentStreak < 7
              ? "Keep it up! You're building a great habit."
              : "Amazing dedication! Don't break the chain!"}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
