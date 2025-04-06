import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";

export default function LeaderboardPreview() {
  const { user } = useAuth();
  
  const { data: leaderboard, isLoading } = useQuery({
    queryKey: ["/api/leaderboard"],
  });
  
  const getInitial = (name: string) => name.charAt(0).toUpperCase();
  
  const getAvatarColor = (index: number) => {
    const colors = [
      "bg-green-500",
      "bg-blue-500",
      "bg-purple-500",
      "bg-accent",
      "bg-yellow-500",
    ];
    return colors[index % colors.length];
  };
  
  // Find current user's position in leaderboard
  const currentUserPosition = leaderboard?.findIndex((item) => item.id === user?.id) || -1;
  
  // Calculate XP needed to reach next position
  const xpNeededForNextRank = () => {
    if (!user || currentUserPosition <= 0 || currentUserPosition >= (leaderboard?.length || 0) - 1) {
      return null;
    }
    
    const nextUserXP = leaderboard?.[currentUserPosition - 1]?.xp || 0;
    const currentUserXP = user.xp;
    
    const xpNeeded = nextUserXP - currentUserXP;
    return xpNeeded > 0 ? xpNeeded : null;
  };
  
  // Display top 5 users
  const topUsers = leaderboard?.slice(0, 5) || [];
  
  if (isLoading) {
    return (
      <div className="bg-background dark:bg-neutral-800 rounded-xl shadow-sm border border-neutral-200 dark:border-neutral-800 p-4 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-lg">Leaderboard</h3>
          <Link href="/leaderboard">
            <a className="text-secondary text-sm font-medium">View All</a>
          </Link>
        </div>
        
        <div className="space-y-3 mb-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center py-2 border-b border-neutral-100 dark:border-neutral-700">
              <Skeleton className="w-8 h-4" />
              <Skeleton className="w-8 h-8 rounded-full mx-2" />
              <Skeleton className="w-24 h-4 flex-1 mr-2" />
              <Skeleton className="w-16 h-4" />
            </div>
          ))}
        </div>
      </div>
    );
  }
  
  return (
    <div className="bg-background dark:bg-neutral-800 rounded-xl shadow-sm border border-neutral-200 dark:border-neutral-800 p-4 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-lg">Leaderboard</h3>
        <Link href="/leaderboard">
          <a className="text-secondary text-sm font-medium">View All</a>
        </Link>
      </div>
      
      <div className="space-y-3 mb-4">
        {topUsers.map((entry, index) => (
          <div 
            key={entry.id} 
            className={`flex items-center py-2 border-b border-neutral-100 dark:border-neutral-700 ${
              entry.id === user?.id ? "bg-neutral-50 dark:bg-neutral-700/30 rounded-lg px-2" : ""
            }`}
          >
            <div className="w-8 text-center font-bold text-neutral-500 dark:text-neutral-400">
              {index + 1}
            </div>
            <Avatar className={`w-8 h-8 ${getAvatarColor(index)} mr-2`}>
              <AvatarFallback className="text-white">
                {getInitial(entry.displayName || entry.username)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <p className="font-medium">
                {(entry.displayName || entry.username).substring(0, 10)}
                {(entry.displayName || entry.username).length > 10 ? "..." : ""}
              </p>
              {entry.id === user?.id && (
                <span className="text-xs text-neutral-500 dark:text-neutral-400">
                  You
                </span>
              )}
            </div>
            <div className="flex items-center">
              {entry.languageId && (
                <img
                  src={topUsers.find(u => u.id === entry.id)?.languageName === "Spanish" 
                    ? "https://images.unsplash.com/photo-1522930514098-5b8a10f0cb66?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=MnwxfDB8MXxyYW5kb218MHx8c3BhaW58fHx8fHwxNzA1MzEyMzk1&ixlib=rb-4.0.3&q=80&w=30" 
                    : "https://images.unsplash.com/photo-1547981609-4b6bfe67ca0b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=MnwxfDB8MXxyYW5kb218MHx8Y2hpbmF8fHx8fHwxNzA1MzEyMzk1&ixlib=rb-4.0.3&q=80&w=30"
                  }
                  alt={`${entry.languageName} flag`}
                  className="w-5 h-5 rounded-full mr-2"
                />
              )}
              <span className="font-semibold">{entry.xp} XP</span>
            </div>
          </div>
        ))}
      </div>
      
      {user && xpNeededForNextRank() !== null && (
        <div className="text-center">
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            You need <b>{xpNeededForNextRank()} XP</b> to reach {
              currentUserPosition > 0 ? ordinalSuffix(currentUserPosition) : "higher"
            } place!
          </p>
        </div>
      )}
    </div>
  );
}

function ordinalSuffix(num: number): string {
  const j = num % 10;
  const k = num % 100;
  
  if (j === 1 && k !== 11) {
    return num + "st";
  }
  if (j === 2 && k !== 12) {
    return num + "nd";
  }
  if (j === 3 && k !== 13) {
    return num + "rd";
  }
  return num + "th";
}
