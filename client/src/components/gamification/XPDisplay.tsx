import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Trophy, TrendingUp } from "lucide-react";
import { useGamificationQuery } from "@/hooks/use-cached-query";
import { queryKeys } from "@/lib/cacheConfig";

interface XPGain {
  id: string;
  amount: number;
  source: string;
  timestamp: Date;
}

interface XPData {
  totalXP: number;
  recentGains: XPGain[];
  level: number;
  xpToNextLevel: number;
  currentLevelXP: number;
}

interface XPDisplayProps {
  userId?: string;
  showRecentGains?: boolean;
}

export default function XPDisplay({ showRecentGains = true }: XPDisplayProps) {
  const [animatedXP, setAnimatedXP] = useState(0);
  const [previousXP, setPreviousXP] = useState(0);

  // Use optimized caching for gamification data (2 min stale, 5 min cache)
  // Implements stale-while-revalidate: shows cached data immediately, refetches in background
  const { data: xpData, isLoading } = useGamificationQuery<XPData>(
    queryKeys.gamification.xp
  );

  // Animate XP counter when data changes
  useEffect(() => {
    if (xpData && xpData.totalXP !== previousXP) {
      const start = previousXP;
      const end = xpData.totalXP;
      const duration = 1000; // 1 second animation
      const startTime = Date.now();

      const animate = () => {
        const now = Date.now();
        const progress = Math.min((now - startTime) / duration, 1);
        const current = Math.floor(start + (end - start) * progress);
        
        setAnimatedXP(current);

        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          setPreviousXP(end);
        }
      };

      requestAnimationFrame(animate);
    }
  }, [xpData?.totalXP, previousXP]);

  // Calculate level progress percentage
  const levelProgress = xpData 
    ? ((xpData.currentLevelXP / xpData.xpToNextLevel) * 100)
    : 0;

  if (isLoading) {
    return (
      <Card className="bg-gradient-to-br from-primary/10 to-secondary/10">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-10 w-10 rounded-full" />
          </div>
          <Skeleton className="h-12 w-40 mb-2" />
          <Skeleton className="h-4 w-full mb-2" />
          <Skeleton className="h-2 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!xpData) {
    return null;
  }

  return (
    <Card className="bg-gradient-to-br from-primary/10 to-secondary/10 border-primary/20">
      <CardContent className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" />
            <h3 className="font-bold text-lg">Experience Points</h3>
          </div>
          <div className="bg-primary text-primary-foreground rounded-full px-3 py-1 text-sm font-semibold">
            Level {xpData.level}
          </div>
        </div>

        {/* Total XP with animation */}
        <div className="mb-4">
          <div className="text-4xl font-bold text-primary mb-1">
            {animatedXP.toLocaleString()} XP
          </div>
          <p className="text-sm text-muted-foreground">
            {xpData.xpToNextLevel - xpData.currentLevelXP} XP to Level {xpData.level + 1}
          </p>
        </div>

        {/* Level Progress Bar */}
        <div className="mb-4">
          <div className="flex justify-between text-xs text-muted-foreground mb-1">
            <span>Level {xpData.level}</span>
            <span>{Math.round(levelProgress)}%</span>
            <span>Level {xpData.level + 1}</span>
          </div>
          <Progress value={levelProgress} className="h-3" />
        </div>

        {/* Recent XP Gains */}
        {showRecentGains && xpData.recentGains.length > 0 && (
          <div className="border-t pt-4">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="h-4 w-4 text-green-600" />
              <h4 className="font-semibold text-sm">Recent Gains</h4>
            </div>
            <div className="space-y-2">
              {xpData.recentGains.slice(0, 3).map((gain) => (
                <div
                  key={gain.id}
                  className="flex items-center justify-between text-sm bg-background/50 rounded-lg p-2"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                    <span className="capitalize text-muted-foreground">
                      {gain.source.replace('_', ' ')}
                    </span>
                  </div>
                  <span className="font-semibold text-green-600">
                    +{gain.amount} XP
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
