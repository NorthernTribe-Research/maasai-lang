import { useAuth } from "@/hooks/use-auth";
import {
  XPDisplay,
  AchievementCard,
  StreakTracker,
  DailyChallengeCard,
  Leaderboard,
} from "@/components/gamification";
import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, Target, Flame, Calendar, Users } from "lucide-react";

export default function GamificationDemo() {
  const { user } = useAuth();

  const { data: achievements } = useQuery<{
    achievements: any[];
    unlocked: any[];
  }>({
    queryKey: ["/api/gamification/user/achievements"],
  });

  return (
    <div className="container mx-auto py-8 px-4">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Gamification Dashboard</h1>
        <p className="text-muted-foreground">
          Track your progress, complete challenges, and compete with other learners!
        </p>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">
            <Trophy className="h-4 w-4 mr-2" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="achievements">
            <Target className="h-4 w-4 mr-2" />
            Achievements
          </TabsTrigger>
          <TabsTrigger value="streak">
            <Flame className="h-4 w-4 mr-2" />
            Streak
          </TabsTrigger>
          <TabsTrigger value="challenges">
            <Calendar className="h-4 w-4 mr-2" />
            Challenges
          </TabsTrigger>
          <TabsTrigger value="leaderboard">
            <Users className="h-4 w-4 mr-2" />
            Leaderboard
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <XPDisplay showRecentGains={true} />
            <StreakTracker showCalendar={true} />
            <DailyChallengeCard compact={false} />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Quick Stats</CardTitle>
              <CardDescription>Your learning journey at a glance</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-primary/10 rounded-lg">
                  <div className="text-3xl font-bold text-primary mb-1">
                    {user?.xp || 0}
                  </div>
                  <div className="text-sm text-muted-foreground">Total XP</div>
                </div>
                <div className="text-center p-4 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                  <div className="text-3xl font-bold text-orange-600 mb-1">
                    {user?.streak || 0}
                  </div>
                  <div className="text-sm text-muted-foreground">Day Streak</div>
                </div>
                <div className="text-center p-4 bg-green-100 dark:bg-green-900/30 rounded-lg">
                  <div className="text-3xl font-bold text-green-600 mb-1">
                    {achievements?.unlocked?.length || 0}
                  </div>
                  <div className="text-sm text-muted-foreground">Achievements</div>
                </div>
                <div className="text-center p-4 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <div className="text-3xl font-bold text-blue-600 mb-1">
                    {Math.floor((user?.xp || 0) / 100) + 1}
                  </div>
                  <div className="text-sm text-muted-foreground">Level</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Leaderboard currentUserId={user?.id} compact={false} limit={100} />
        </TabsContent>

        {/* Achievements Tab */}
        <TabsContent value="achievements" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Your Achievements</CardTitle>
              <CardDescription>
                Unlock achievements by completing learning milestones
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {achievements?.achievements?.map((achievement: any) => {
                  const userAchievement = achievements.unlocked?.find(
                    (ua: any) => ua.achievementId === achievement.id
                  );
                  return (
                    <AchievementCard
                      key={achievement.id}
                      achievement={achievement}
                      unlocked={!!userAchievement}
                      unlockedAt={userAchievement?.earnedAt}
                      progress={userAchievement ? 100 : 0}
                    />
                  );
                })}
              </div>
              {(!achievements?.achievements || achievements.achievements.length === 0) && (
                <div className="text-center py-12">
                  <Trophy className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">
                    No achievements available yet. Start learning to unlock achievements!
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Streak Tab */}
        <TabsContent value="streak" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <StreakTracker showCalendar={true} />
            
            <Card>
              <CardHeader>
                <CardTitle>Streak Milestones</CardTitle>
                <CardDescription>Keep learning to reach these goals</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { days: 7, label: "Week Warrior", icon: "🔥", color: "text-green-600" },
                    { days: 30, label: "Monthly Master", icon: "🏆", color: "text-orange-600" },
                    { days: 100, label: "Century Club", icon: "💯", color: "text-yellow-600" },
                    { days: 365, label: "Year Warrior", icon: "👑", color: "text-purple-600" },
                  ].map((milestone) => {
                    const achieved = (user?.streak || 0) >= milestone.days;
                    return (
                      <div
                        key={milestone.days}
                        className={`flex items-center justify-between p-4 rounded-lg border ${
                          achieved
                            ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
                            : "bg-muted/50"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{milestone.icon}</span>
                          <div>
                            <p className={`font-semibold ${milestone.color}`}>
                              {milestone.label}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {milestone.days} days
                            </p>
                          </div>
                        </div>
                        {achieved && (
                          <div className="text-green-600 font-semibold">✓ Achieved</div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Challenges Tab */}
        <TabsContent value="challenges" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <DailyChallengeCard compact={false} />
            
            <Card>
              <CardHeader>
                <CardTitle>Challenge Tips</CardTitle>
                <CardDescription>Maximize your learning with daily challenges</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                      <span className="text-blue-600 font-bold">1</span>
                    </div>
                    <div>
                      <p className="font-semibold">Complete Daily</p>
                      <p className="text-sm text-muted-foreground">
                        Challenges reset every 24 hours. Don't miss out on bonus XP!
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0">
                      <span className="text-green-600 font-bold">2</span>
                    </div>
                    <div>
                      <p className="font-semibold">Maintain Your Streak</p>
                      <p className="text-sm text-muted-foreground">
                        Completing challenges helps maintain your learning streak.
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center flex-shrink-0">
                      <span className="text-purple-600 font-bold">3</span>
                    </div>
                    <div>
                      <p className="font-semibold">Earn Bonus XP</p>
                      <p className="text-sm text-muted-foreground">
                        Daily challenges award extra XP beyond regular lessons.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Leaderboard Tab */}
        <TabsContent value="leaderboard" className="space-y-6">
          <Leaderboard currentUserId={user?.id} compact={false} limit={100} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
