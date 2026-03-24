import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import Layout from "@/components/layout/layout";
import AchievementCard from "@/components/common/achievement-card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const FILTER_OPTIONS = {
  ALL: "all",
  EARNED: "earned",
  LOCKED: "locked",
};

type AchievementData = {
  id: number;
  name: string;
  description: string;
  icon: string;
  condition: string;
};

type UserAchievementData = {
  id: number;
  userId: string;
  achievementId: number;
  earnedAt: string | Date;
  achievement: AchievementData;
};

type FilteredAchievementItem = {
  achievement: AchievementData;
  earned: boolean;
  earnedAt?: string | Date;
};

export default function Achievements() {
  const { user } = useAuth();
  
  // Fetch user achievements
  const { data: userAchievements = [], isLoading: isLoadingUserAchievements } = useQuery<UserAchievementData[]>({
    queryKey: ["/api/user/achievements"],
    enabled: !!user,
  });
  
  // Fetch all achievements
  const { data: allAchievements = [], isLoading: isLoadingAllAchievements } = useQuery<AchievementData[]>({
    queryKey: ["/api/achievements"],
  });
  
  // Calculate completion percentage
  const getCompletionPercentage = () => {
    if (allAchievements.length === 0) return 0;
    return Math.round((userAchievements.length / allAchievements.length) * 100);
  };
  
  // Filter achievements by tab
  const getFilteredAchievements = (filter: string): FilteredAchievementItem[] => {
    // Create a map of earned achievements
    const earnedMap = new Map<number, UserAchievementData>();
    userAchievements.forEach((ua) => {
      earnedMap.set(ua.achievementId, ua);
    });
    
    // Filter based on the selected tab
    switch (filter) {
      case FILTER_OPTIONS.EARNED:
        return allAchievements
          .filter((achievement) => earnedMap.has(achievement.id))
          .map((achievement) => ({
            achievement,
            earned: true,
            earnedAt: earnedMap.get(achievement.id)?.earnedAt
          }));
      case FILTER_OPTIONS.LOCKED:
        return allAchievements
          .filter((achievement) => !earnedMap.has(achievement.id))
          .map((achievement) => ({
            achievement,
            earned: false,
            earnedAt: undefined
          }));
      default: // ALL
        return allAchievements.map((achievement) => ({
          achievement,
          earned: earnedMap.has(achievement.id),
          earnedAt: earnedMap.get(achievement.id)?.earnedAt
        }));
    }
  };
  
  const isLoading = isLoadingUserAchievements || isLoadingAllAchievements;
  
  return (
    <Layout>
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-1">Achievements</h2>
        <p className="text-neutral-600 dark:text-neutral-400">
          Track your progress and unlock special badges
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Achievement Progress</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-16 w-full" />
            ) : (
              <div className="space-y-4">
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium">
                    {userAchievements?.length || 0} of {allAchievements?.length || 0} achievements earned
                  </span>
                  <span className="text-sm font-medium">
                    {getCompletionPercentage()}% complete
                  </span>
                </div>
                <Progress value={getCompletionPercentage()} className="h-2" />
                
                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                  {getCompletionPercentage() < 25 
                    ? "You're just getting started! Keep learning to earn more achievements."
                    : getCompletionPercentage() < 50
                      ? "Good progress! Continue your learning journey to unlock more achievements."
                      : getCompletionPercentage() < 75
                        ? "You're doing great! Keep up the good work to collect more achievements."
                        : "Impressive! You've unlocked most of the achievements. Can you get them all?"
                  }
                </p>
              </div>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Recent Achievement</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-32 w-full" />
            ) : userAchievements.length > 0 ? (
              <div className="flex flex-col items-center">
                <div className="w-16 h-16 bg-primary-light dark:bg-primary/20 rounded-full flex items-center justify-center mb-3">
                  <i className={`bx ${userAchievements[0].achievement.icon} text-3xl text-primary`}></i>
                </div>
                <h4 className="font-semibold text-center">{userAchievements[0].achievement.name}</h4>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 text-center mt-1">
                  {userAchievements[0].achievement.description}
                </p>
                <p className="text-xs text-primary mt-2 font-medium">
                  Earned on {new Date(userAchievements[0].earnedAt).toLocaleDateString()}
                </p>
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-neutral-600 dark:text-neutral-400">
                  You haven't earned any achievements yet. Start learning to unlock them!
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      <div className="mb-6">
        <Tabs defaultValue={FILTER_OPTIONS.ALL} className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value={FILTER_OPTIONS.ALL}>All Achievements</TabsTrigger>
            <TabsTrigger value={FILTER_OPTIONS.EARNED}>Earned</TabsTrigger>
            <TabsTrigger value={FILTER_OPTIONS.LOCKED}>Locked</TabsTrigger>
          </TabsList>
          
          {[FILTER_OPTIONS.ALL, FILTER_OPTIONS.EARNED, FILTER_OPTIONS.LOCKED].map((filter) => (
            <TabsContent key={filter} value={filter}>
              {isLoading ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {[...Array(8)].map((_, i) => (
                    <Skeleton key={i} className="h-32 w-full rounded-xl" />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {getFilteredAchievements(filter).map((item) => (
                    <AchievementCard
                      key={item.achievement.id}
                      achievement={item.achievement}
                      earned={item.earned}
                      earnedAt={item.earnedAt ? new Date(item.earnedAt) : undefined}
                    />
                  ))}
                </div>
              )}
              
              {!isLoading && getFilteredAchievements(filter).length === 0 && (
                <div className="text-center py-8 bg-background dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-800">
                  <p className="text-neutral-600 dark:text-neutral-400">
                    {filter === FILTER_OPTIONS.EARNED 
                      ? "You haven't earned any achievements yet. Start learning to unlock them!"
                      : filter === FILTER_OPTIONS.LOCKED
                        ? "Congratulations! You've unlocked all available achievements."
                        : "No achievements found."
                    }
                  </p>
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Achievement Categories</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-neutral-50 dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800">
              <div className="flex items-center mb-3">
                <div className="w-10 h-10 bg-primary-light dark:bg-primary/20 rounded-full flex items-center justify-center mr-3">
                  <i className="bx bx-calendar-check text-xl text-primary"></i>
                </div>
                <h4 className="font-semibold">Consistency</h4>
              </div>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                Achievements earned by maintaining streaks and consistent learning habits.
              </p>
            </div>
            
            <div className="p-4 bg-neutral-50 dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800">
              <div className="flex items-center mb-3">
                <div className="w-10 h-10 bg-secondary-light dark:bg-secondary/20 rounded-full flex items-center justify-center mr-3">
                  <i className="bx bx-book text-xl text-secondary"></i>
                </div>
                <h4 className="font-semibold">Learning</h4>
              </div>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                Achievements earned by completing lessons and mastering language skills.
              </p>
            </div>
            
            <div className="p-4 bg-neutral-50 dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800">
              <div className="flex items-center mb-3">
                <div className="w-10 h-10 bg-accent-light dark:bg-accent/20 rounded-full flex items-center justify-center mr-3">
                  <i className="bx bx-trophy text-xl text-accent"></i>
                </div>
                <h4 className="font-semibold">Milestones</h4>
              </div>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                Special achievements earned by reaching significant milestones in your journey.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </Layout>
  );
}
