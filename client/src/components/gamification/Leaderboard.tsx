import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Trophy, Medal, Crown, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface LeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  displayName?: string;
  totalXP: number;
  language?: string;
  avatarUrl?: string;
}

interface LeaderboardData {
  leaderboard: LeaderboardEntry[];
  userRank: number | null;
}

interface LeaderboardProps {
  currentUserId?: string;
  compact?: boolean;
  limit?: number;
}

export default function Leaderboard({ currentUserId, compact = false, limit = 100 }: LeaderboardProps) {
  const [languageFilter, setLanguageFilter] = useState<string>("all");
  const [timePeriod, setTimePeriod] = useState<"daily" | "weekly" | "all-time">("all-time");
  const [page, setPage] = useState(1);
  const itemsPerPage = compact ? 5 : 10;

  const { data, isLoading } = useQuery<LeaderboardData>({
    queryKey: ["/api/gamification/leaderboard", { language: languageFilter !== "all" ? languageFilter : undefined, period: timePeriod, limit }],
  });

  const getInitial = (name: string) => {
    return name.charAt(0).toUpperCase();
  };

  const getAvatarColor = (rank: number) => {
    const colors = [
      "bg-gradient-to-br from-yellow-400 to-yellow-600", // 1st - Gold
      "bg-gradient-to-br from-gray-300 to-gray-500", // 2nd - Silver
      "bg-gradient-to-br from-orange-400 to-orange-600", // 3rd - Bronze
      "bg-gradient-to-br from-blue-400 to-blue-600",
      "bg-gradient-to-br from-purple-400 to-purple-600",
      "bg-gradient-to-br from-green-400 to-green-600",
      "bg-gradient-to-br from-pink-400 to-pink-600",
      "bg-gradient-to-br from-indigo-400 to-indigo-600",
    ];
    return colors[Math.min(rank - 1, colors.length - 1)];
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="h-5 w-5 text-yellow-500" />;
      case 2:
        return <Medal className="h-5 w-5 text-gray-400" />;
      case 3:
        return <Medal className="h-5 w-5 text-orange-500" />;
      default:
        return null;
    }
  };

  // Pagination
  const paginatedData = data?.leaderboard.slice(
    (page - 1) * itemsPerPage,
    page * itemsPerPage
  );
  const totalPages = Math.ceil((data?.leaderboard.length || 0) / itemsPerPage);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-8 w-48" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(compact ? 5 : 10)].map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="w-8 h-8 rounded-full" />
                <Skeleton className="h-4 w-32 flex-1" />
                <Skeleton className="h-4 w-16" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="h-6 w-6 text-yellow-600" />
            <CardTitle>Leaderboard</CardTitle>
          </div>
          {!compact && (
            <Badge variant="outline" className="text-xs">
              Top {data?.leaderboard.length || 0} Learners
            </Badge>
          )}
        </div>

        {/* Filters */}
        {!compact && (
          <div className="flex gap-2 mt-4">
            <Select value={timePeriod} onValueChange={(value: any) => setTimePeriod(value)}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Time Period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="all-time">All Time</SelectItem>
              </SelectContent>
            </Select>

            <Select value={languageFilter} onValueChange={setLanguageFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Language" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Languages</SelectItem>
                <SelectItem value="spanish">Spanish</SelectItem>
                <SelectItem value="mandarin">Mandarin</SelectItem>
                <SelectItem value="english">English</SelectItem>
                <SelectItem value="hindi">Hindi</SelectItem>
                <SelectItem value="arabic">Arabic</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </CardHeader>

      <CardContent>
        {/* Current User Rank (if not in top list) */}
        {data?.userRank && data.userRank > (limit || 100) && (
          <div className="mb-4 p-3 bg-primary/10 rounded-lg border border-primary/20">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Your Rank:</span>
              <span className="font-bold text-primary">#{data.userRank}</span>
            </div>
          </div>
        )}

        {/* Leaderboard List */}
        <div className="space-y-2">
          {paginatedData?.map((entry) => {
            const isCurrentUser = entry.userId === currentUserId;
            const displayName = entry.displayName || entry.username;

            return (
              <div
                key={entry.userId}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg transition-all duration-200",
                  isCurrentUser
                    ? "bg-primary/10 border border-primary/30 shadow-sm"
                    : "hover:bg-muted/50"
                )}
              >
                {/* Rank */}
                <div className="w-8 flex items-center justify-center">
                  {getRankIcon(entry.rank) || (
                    <span className="font-bold text-muted-foreground">
                      {entry.rank}
                    </span>
                  )}
                </div>

                {/* Avatar */}
                <Avatar className={cn("w-10 h-10", getAvatarColor(entry.rank))}>
                  <AvatarFallback className="text-white font-bold">
                    {getInitial(displayName)}
                  </AvatarFallback>
                </Avatar>

                {/* User Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">
                    {displayName}
                    {isCurrentUser && (
                      <Badge variant="secondary" className="ml-2 text-xs">
                        You
                      </Badge>
                    )}
                  </p>
                  {entry.language && (
                    <p className="text-xs text-muted-foreground capitalize">
                      {entry.language}
                    </p>
                  )}
                </div>

                {/* XP */}
                <div className="text-right">
                  <p className="font-bold text-lg">
                    {entry.totalXP.toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground">XP</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Pagination */}
        {!compact && totalPages > 1 && (
          <div className="flex items-center justify-between mt-4 pt-4 border-t">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(page - 1)}
              disabled={page === 1}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>
            
            <span className="text-sm text-muted-foreground">
              Page {page} of {totalPages}
            </span>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(page + 1)}
              disabled={page === totalPages}
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        )}

        {/* Empty State */}
        {(!data?.leaderboard || data.leaderboard.length === 0) && (
          <div className="text-center py-8">
            <Trophy className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
            <p className="text-muted-foreground">
              No learners found. Be the first to start learning!
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
