import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { DuolingoLayout } from "@/components/duolingo/DuolingoLayout";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Trophy, Medal, Star } from "lucide-react";

const FILTER_OPTIONS = {
  ALL: "all",
  WEEKLY: "weekly",
  MONTHLY: "monthly",
};

const LANGUAGE_FILTER = {
  ALL: "all",
  SPANISH: "1",
  MANDARIN: "2",
  ENGLISH: "3",
  HINDI: "4",
  ARABIC: "5",
};

export default function Leaderboard() {
  const { user } = useAuth();
  const [timeFilter, setTimeFilter] = useState(FILTER_OPTIONS.ALL);
  const [languageFilter, setLanguageFilter] = useState(LANGUAGE_FILTER.ALL);
  
  // Fetch leaderboard data
  const { data: leaderboard = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/leaderboard"],
  });
  
  // Get filtered leaderboard
  const getFilteredLeaderboard = () => {
    let filtered = [...leaderboard];
    
    // Apply language filter if selected
    if (languageFilter !== LANGUAGE_FILTER.ALL) {
      filtered = filtered.filter(
        entry => entry.languageId?.toString() === languageFilter
      );
    }
    
    return filtered;
  };
  
  const filteredLeaderboard = getFilteredLeaderboard();
  
  // Find current user's position
  const currentUserPosition = filteredLeaderboard.findIndex(
    entry => entry.id === user?.id
  );
  
  // Generate avatar color based on position
  const getAvatarColor = (position: number) => {
    if (position === 0) return "bg-yellow-500 text-yellow-950";
    if (position === 1) return "bg-slate-300 text-slate-900";
    if (position === 2) return "bg-amber-600 text-amber-50";
    return ["bg-blue-500", "bg-purple-500", "bg-pink-500", "bg-emerald-500", "bg-indigo-500"][
      position % 5
    ];
  };
  
  const getInitial = (name: string): string => {
    return name.charAt(0).toUpperCase();
  };
  
  const renderPodium = () => {
    if (filteredLeaderboard.length < 3) return null;
    
    const top3 = [
      filteredLeaderboard[1], // 2nd place (left)
      filteredLeaderboard[0], // 1st place (center)
      filteredLeaderboard[2], // 3rd place (right)
    ];

    return (
      <div className="flex justify-center items-end gap-2 md:gap-6 mb-12 mt-8 h-48 px-2 animate-in fade-in duration-700">
        {/* 2nd Place */}
        <div className="flex flex-col items-center w-24 md:w-32">
          <Avatar className="w-14 h-14 md:w-16 md:h-16 mb-2 border-4 border-slate-300 bg-slate-200 text-slate-800 shadow-lg">
            <AvatarFallback className="font-bold text-lg">{getInitial(top3[0].displayName || top3[0].username)}</AvatarFallback>
          </Avatar>
          <span className="font-bold text-sm truncate max-w-full">{top3[0].displayName || top3[0].username}</span>
          <span className="text-muted-foreground text-xs mb-2 font-bold">{top3[0].xp} XP</span>
          <div className="w-full h-24 bg-gradient-to-t from-slate-200 to-slate-100 dark:from-slate-800 dark:to-slate-800/50 rounded-t-xl border-t-4 border-slate-300 flex justify-center pt-4">
            <span className="text-4xl font-black text-slate-300 dark:text-slate-600">2</span>
          </div>
        </div>

        {/* 1st Place */}
        <div className="flex flex-col items-center w-28 md:w-36 z-10 -mb-4">
          <div className="relative">
            <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-yellow-500">
              <Star className="w-8 h-8 fill-current animate-pulse" />
            </div>
            <Avatar className="w-16 h-16 md:w-20 md:h-20 mb-2 border-4 border-yellow-400 bg-yellow-100 text-yellow-900 shadow-xl shadow-yellow-500/20">
              <AvatarFallback className="font-bold text-xl">{getInitial(top3[1].displayName || top3[1].username)}</AvatarFallback>
            </Avatar>
          </div>
          <span className="font-black text-base truncate max-w-full text-yellow-600 dark:text-yellow-500">{top3[1].displayName || top3[1].username}</span>
          <span className="text-yellow-600/80 dark:text-yellow-500/80 text-sm mb-2 font-bold">{top3[1].xp} XP</span>
          <div className="w-full h-32 bg-gradient-to-t from-yellow-200 to-yellow-100 dark:from-yellow-900/40 dark:to-yellow-900/20 rounded-t-xl border-t-4 border-yellow-400 flex justify-center pt-4 shadow-[0_-10px_20px_rgba(250,204,21,0.15)]">
            <span className="text-5xl font-black text-yellow-300 dark:text-yellow-700/50">1</span>
          </div>
        </div>

        {/* 3rd Place */}
        <div className="flex flex-col items-center w-24 md:w-32">
          <Avatar className="w-14 h-14 md:w-16 md:h-16 mb-2 border-4 border-amber-600 bg-amber-100 text-amber-900 shadow-lg">
            <AvatarFallback className="font-bold text-lg">{getInitial(top3[2].displayName || top3[2].username)}</AvatarFallback>
          </Avatar>
          <span className="font-bold text-sm truncate max-w-full">{top3[2].displayName || top3[2].username}</span>
          <span className="text-muted-foreground text-xs mb-2 font-bold">{top3[2].xp} XP</span>
          <div className="w-full h-20 bg-gradient-to-t from-amber-200 to-amber-100 dark:from-amber-900/30 dark:to-amber-900/10 rounded-t-xl border-t-4 border-amber-600 flex justify-center pt-4">
            <span className="text-4xl font-black text-amber-300 dark:text-amber-800/50">3</span>
          </div>
        </div>
      </div>
    );
  };
  
  return (
    <DuolingoLayout>
      <div className="animate-in fade-in duration-500">
        <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-foreground flex items-center gap-2">
              <Trophy className="w-8 h-8 text-yellow-500 fill-current" />
              Leaderboard
            </h1>
            <p className="text-muted-foreground text-lg">Compete with learners worldwide</p>
          </div>
        </div>
        
        <div className="bg-card border-2 rounded-2xl p-4 mb-8 flex flex-col sm:flex-row justify-between gap-4">
          <Tabs value={timeFilter} onValueChange={setTimeFilter} className="w-full sm:w-auto">
            <TabsList className="grid grid-cols-3 w-full sm:w-auto p-1 bg-neutral-100 dark:bg-neutral-800 rounded-xl h-auto">
              <TabsTrigger value={FILTER_OPTIONS.ALL} className="rounded-lg py-2 font-bold data-[state=active]:bg-background data-[state=active]:shadow-sm">All Time</TabsTrigger>
              <TabsTrigger value={FILTER_OPTIONS.WEEKLY} className="rounded-lg py-2 font-bold data-[state=active]:bg-background data-[state=active]:shadow-sm">Weekly</TabsTrigger>
              <TabsTrigger value={FILTER_OPTIONS.MONTHLY} className="rounded-lg py-2 font-bold data-[state=active]:bg-background data-[state=active]:shadow-sm">Monthly</TabsTrigger>
            </TabsList>
          </Tabs>
          
          <div className="w-full sm:w-64">
            <Select value={languageFilter} onValueChange={setLanguageFilter}>
              <SelectTrigger className="border-2 rounded-xl h-11 font-bold">
                <SelectValue placeholder="Filter by language" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={LANGUAGE_FILTER.ALL} className="font-medium">🌍 All Languages</SelectItem>
                <SelectItem value={LANGUAGE_FILTER.SPANISH} className="font-medium">🇪🇸 Spanish</SelectItem>
                <SelectItem value={LANGUAGE_FILTER.MANDARIN} className="font-medium">🇨🇳 Mandarin</SelectItem>
                <SelectItem value={LANGUAGE_FILTER.ENGLISH} className="font-medium">🇺🇸 English</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        {!isLoading && filteredLeaderboard.length >= 3 && languageFilter === LANGUAGE_FILTER.ALL && timeFilter === FILTER_OPTIONS.ALL && renderPodium()}
        
        <Card className="border-2 rounded-2xl overflow-hidden shadow-sm">
          <CardHeader className="bg-neutral-50 dark:bg-neutral-900 border-b-2">
            <CardTitle className="flex justify-between items-center text-lg">
              <span>Top Learners</span>
              {currentUserPosition !== -1 && (
                <Badge variant="secondary" className="font-bold px-3 py-1 bg-primary/10 text-primary border-primary/20">
                  Your Rank: #{currentUserPosition + 1}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-4 space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center space-x-4">
                    <Skeleton className="h-6 w-6 rounded-full" />
                    <Skeleton className="h-12 w-12 rounded-full" />
                    <Skeleton className="h-4 flex-1" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                ))}
              </div>
            ) : filteredLeaderboard.length === 0 ? (
              <div className="text-center py-16 px-4">
                <Trophy className="w-16 h-16 mx-auto text-neutral-300 dark:text-neutral-600 mb-4" />
                <h3 className="text-xl font-bold mb-2">No rankings available</h3>
                <p className="text-neutral-500">Be the first to earn XP and claim the top spot!</p>
              </div>
            ) : (
              <div className="divide-y-2 dark:divide-neutral-800">
                {filteredLeaderboard.slice(0, 50).map((entry, index) => {
                  const isCurrentUser = entry.id === user?.id;
                  
                  return (
                    <div 
                      key={entry.id}
                      className={`flex items-center p-4 transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800/50 ${
                        isCurrentUser ? "bg-primary/5 dark:bg-primary/10 border-l-4 border-l-primary" : ""
                      }`}
                    >
                      <div className="flex items-center justify-center w-8 mr-4">
                        <span className={`font-bold text-lg ${
                          index === 0 ? "text-yellow-500" : 
                          index === 1 ? "text-slate-400" : 
                          index === 2 ? "text-amber-600" : "text-muted-foreground"
                        }`}>
                          {index + 1}
                        </span>
                      </div>
                      
                      <Avatar className={`w-12 h-12 md:w-14 md:h-14 mr-4 font-bold text-lg border-2 border-transparent ${getAvatarColor(index)}`}>
                        <AvatarFallback className="bg-transparent">{getInitial(entry.displayName || entry.username)}</AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1 min-w-0">
                        <p className={`font-bold text-base md:text-lg truncate ${isCurrentUser ? "text-primary" : "text-foreground"}`}>
                          {entry.displayName || entry.username}
                          {isCurrentUser && <span className="ml-2 text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full uppercase tracking-wider">You</span>}
                        </p>
                      </div>
                      
                      <div className="flex items-center text-right ml-4">
                        <span className="font-black text-yellow-500 mr-1">{entry.xp.toLocaleString()}</span>
                        <span className="font-bold text-muted-foreground text-sm">XP</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DuolingoLayout>
  );
}
