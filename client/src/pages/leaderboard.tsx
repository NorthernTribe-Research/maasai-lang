import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import Layout from "@/components/layout/layout";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

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
  const { data: leaderboard, isLoading } = useQuery({
    queryKey: ["/api/leaderboard"],
  });
  
  // Get filtered leaderboard
  const getFilteredLeaderboard = () => {
    if (!leaderboard) return [];
    
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
    if (position === 0) return "bg-yellow-500";
    if (position === 1) return "bg-gray-400";
    if (position === 2) return "bg-amber-700";
    return ["bg-green-500", "bg-blue-500", "bg-purple-500", "bg-pink-500", "bg-red-500"][
      position % 5
    ];
  };
  
  // Get initial letter for avatar
  const getInitial = (name: string): string => {
    return name.charAt(0).toUpperCase();
  };
  
  // Color for position badge
  const getPositionColor = (position: number): string => {
    if (position === 0) return "bg-yellow-500";
    if (position === 1) return "bg-gray-400";
    if (position === 2) return "bg-amber-700";
    return "bg-neutral-200 dark:bg-neutral-700";
  };
  
  return (
    <Layout>
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-1">Leaderboard</h2>
        <p className="text-neutral-600 dark:text-neutral-400">
          See how you rank against other language learners
        </p>
      </div>
      
      <div className="flex flex-col sm:flex-row justify-between mb-6 gap-4">
        <Tabs 
          value={timeFilter} 
          onValueChange={setTimeFilter}
          className="w-full sm:w-auto"
        >
          <TabsList>
            <TabsTrigger value={FILTER_OPTIONS.ALL}>All Time</TabsTrigger>
            <TabsTrigger value={FILTER_OPTIONS.WEEKLY}>This Week</TabsTrigger>
            <TabsTrigger value={FILTER_OPTIONS.MONTHLY}>This Month</TabsTrigger>
          </TabsList>
        </Tabs>
        
        <div className="w-full sm:w-64">
          <Select value={languageFilter} onValueChange={setLanguageFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by language" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={LANGUAGE_FILTER.ALL}>All Languages</SelectItem>
              <SelectItem value={LANGUAGE_FILTER.SPANISH}>Spanish</SelectItem>
              <SelectItem value={LANGUAGE_FILTER.MANDARIN}>Mandarin</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3">
          <Card>
            <CardHeader>
              <CardTitle>Top Learners</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-4">
                  {[...Array(10)].map((_, i) => (
                    <div key={i} className="flex items-center space-x-4">
                      <Skeleton className="h-6 w-6 rounded-full" />
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <Skeleton className="h-4 flex-1" />
                      <Skeleton className="h-4 w-16" />
                    </div>
                  ))}
                </div>
              ) : filteredLeaderboard.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-neutral-600 dark:text-neutral-400">
                    No data available for the selected filters
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredLeaderboard.slice(0, 20).map((entry, index) => (
                    <div 
                      key={entry.id}
                      className={`flex items-center p-3 rounded-lg ${
                        entry.id === user?.id 
                          ? "bg-neutral-100 dark:bg-neutral-800" 
                          : index % 2 === 0 
                            ? "bg-neutral-50 dark:bg-neutral-900" 
                            : ""
                      }`}
                    >
                      <div className="flex items-center justify-center w-8">
                        <Badge 
                          className={`w-6 h-6 rounded-full flex items-center justify-center ${getPositionColor(index)}`}
                          variant="outline"
                        >
                          {index + 1}
                        </Badge>
                      </div>
                      
                      <Avatar className={`mx-3 ${getAvatarColor(index)}`}>
                        <AvatarFallback>
                          {getInitial(entry.displayName || entry.username)}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1">
                        <p className="font-medium">
                          {entry.displayName || entry.username}
                          {entry.id === user?.id && (
                            <span className="text-xs text-primary ml-2 font-normal">
                              You
                            </span>
                          )}
                        </p>
                      </div>
                      
                      <div className="flex items-center mr-4">
                        {entry.languageId && (
                          <img
                            src={entry.languageName === "Spanish" 
                              ? "https://images.unsplash.com/photo-1522930514098-5b8a10f0cb66?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=MnwxfDB8MXxyYW5kb218MHx8c3BhaW58fHx8fHwxNzA1MzEyMzk1&ixlib=rb-4.0.3&q=80&w=30" 
                              : "https://images.unsplash.com/photo-1547981609-4b6bfe67ca0b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=MnwxfDB8MXxyYW5kb218MHx8Y2hpbmF8fHx8fHwxNzA1MzEyMzk1&ixlib=rb-4.0.3&q=80&w=30"
                            }
                            alt={`${entry.languageName} flag`}
                            className="w-5 h-5 rounded-full mr-2"
                          />
                        )}
                        
                        <span className="font-semibold">
                          {entry.xp.toLocaleString()} XP
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        
        <div className="lg:col-span-1">
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Your Stats</CardTitle>
            </CardHeader>
            <CardContent>
              {!user ? (
                <div className="text-center py-4">
                  <p className="text-neutral-600 dark:text-neutral-400">
                    Sign in to see your stats
                  </p>
                </div>
              ) : isLoading ? (
                <div className="space-y-4">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-neutral-600 dark:text-neutral-400">
                      Rank
                    </span>
                    <span className="font-semibold">
                      {currentUserPosition !== -1 
                        ? `#${currentUserPosition + 1}` 
                        : "Not ranked"}
                    </span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-neutral-600 dark:text-neutral-400">
                      Total XP
                    </span>
                    <span className="font-semibold">
                      {user.xp.toLocaleString()} XP
                    </span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-neutral-600 dark:text-neutral-400">
                      Current streak
                    </span>
                    <span className="font-semibold">
                      {user.streak} days
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Leaderboard Rules</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-neutral-600 dark:text-neutral-400">
                <li className="flex items-start">
                  <div className="mr-2 text-primary">•</div>
                  <p>Rankings are based on total XP earned.</p>
                </li>
                <li className="flex items-start">
                  <div className="mr-2 text-primary">•</div>
                  <p>Weekly leaderboards reset every Sunday at midnight.</p>
                </li>
                <li className="flex items-start">
                  <div className="mr-2 text-primary">•</div>
                  <p>Earn XP by completing lessons and daily challenges.</p>
                </li>
                <li className="flex items-start">
                  <div className="mr-2 text-primary">•</div>
                  <p>Top performers each month receive special badges.</p>
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
