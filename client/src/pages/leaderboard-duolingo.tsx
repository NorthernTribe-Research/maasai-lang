import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { DuolingoHeader } from "@/components/duolingo/DuolingoHeader";
import { BottomNav } from "@/components/duolingo/BottomNav";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Crown, Medal, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";

interface LeaderboardEntry {
  userId: string;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
  profileImageUrl: string | null;
  totalXP: number;
  rank: number;
}

export default function LeaderboardDuolingo() {
  const { user } = useAuth();

  const { data: leaderboard } = useQuery<LeaderboardEntry[]>({
    queryKey: ["/api/user-stats/leaderboard/weekly"],
    queryFn: async () => {
      const res = await fetch("/api/user-stats/leaderboard/weekly");
      if (!res.ok) throw new Error("Failed to fetch leaderboard");
      return res.json();
    },
  });

  const getDisplayName = (entry: LeaderboardEntry) => {
    if (entry.firstName && entry.lastName) {
      return `${entry.firstName} ${entry.lastName}`;
    }
    return entry.username || `User ${entry.userId.slice(0, 8)}`;
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Crown className="h-6 w-6 text-yellow-500" />;
    if (rank === 2) return <Medal className="h-6 w-6 text-gray-400" />;
    if (rank === 3) return <Medal className="h-6 w-6 text-orange-600" />;
    return null;
  };

  const getRankColor = (rank: number) => {
    if (rank === 1) return "bg-gradient-to-r from-yellow-400 to-yellow-500";
    if (rank === 2) return "bg-gradient-to-r from-gray-300 to-gray-400";
    if (rank === 3) return "bg-gradient-to-r from-orange-400 to-orange-500";
    return "bg-gray-100 dark:bg-gray-800";
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 to-white dark:from-gray-900 dark:to-gray-800 pb-20">
      <DuolingoHeader />

      <main className="max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center h-20 w-20 rounded-full bg-purple-600 mb-4">
            <Trophy className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white mb-2">
            Leaderboard
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Compete with learners worldwide
          </p>
        </div>

        {/* Leaderboard List */}
        <div className="space-y-2">
          {leaderboard?.map((entry) => (
            <Card
              key={entry.userId}
              className={cn(
                "border-2 transition-all",
                entry.userId === user?.id
                  ? "border-primary bg-primary/5"
                  : "border-gray-200 dark:border-gray-800"
              )}
            >
              <div className="p-4 flex items-center gap-4">
                {/* Rank */}
                <div
                  className={cn(
                    "h-12 w-12 rounded-full flex items-center justify-center font-bold text-white flex-shrink-0",
                    getRankColor(entry.rank)
                  )}
                >
                  {getRankIcon(entry.rank) || (
                    <span className="text-gray-700 dark:text-gray-300">
                      {entry.rank}
                    </span>
                  )}
                </div>

                {/* Avatar */}
                <Avatar className="h-12 w-12 bg-primary text-primary-foreground">
                  <AvatarFallback className="bg-primary text-primary-foreground font-bold">
                    {getDisplayName(entry).charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>

                {/* Username */}
                <div className="flex-1">
                  <p className="font-bold text-gray-900 dark:text-white">
                    {getDisplayName(entry)}
                    {entry.userId === user?.id && (
                      <span className="ml-2 text-sm text-primary">(You)</span>
                    )}
                  </p>
                </div>

                {/* XP */}
                <div className="text-right">
                  <p className="text-2xl font-bold text-yellow-500">
                    {entry.totalXP}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">XP</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
