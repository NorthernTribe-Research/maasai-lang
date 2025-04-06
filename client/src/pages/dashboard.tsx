import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import Layout from "@/components/layout/layout";
import StreakDisplay from "@/components/common/streak-display";
import LanguagePathCard from "@/components/common/language-path-card";
import DailyChallenge from "@/components/common/daily-challenge";
import LeaderboardPreview from "@/components/common/leaderboard-preview";
import LessonCard from "@/components/common/lesson-card";
import AchievementCard from "@/components/common/achievement-card";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export default function Dashboard() {
  const { user } = useAuth();
  
  // Fetch user's languages
  const { data: userLanguages, isLoading: isLoadingLanguages } = useQuery({
    queryKey: ["/api/user/languages"],
    enabled: !!user,
  });

  // Fetch user's achievements
  const { data: userAchievements, isLoading: isLoadingAchievements } = useQuery({
    queryKey: ["/api/user/achievements"],
    enabled: !!user,
  });

  // For each language, fetch lessons and user lesson progress
  const userLessonsQueries = userLanguages?.map(userLanguage => {
    return useQuery({
      queryKey: ["/api/user/languages", userLanguage.languageId, "lessons"],
      enabled: !!userLanguage,
    });
  });

  // Calculate lesson stats for each language
  const languageLessonStats = userLanguages?.map((userLanguage, index) => {
    const userLessonsData = userLessonsQueries?.[index].data || [];
    const completedLessons = userLessonsData.filter(ul => ul.isCompleted).length;
    return {
      languageId: userLanguage.languageId,
      completed: completedLessons,
      total: userLessonsData.length,
    };
  });

  // Get recommended lessons
  const getRecommendedLessons = () => {
    if (!userLanguages || !userLessonsQueries) return [];
    
    const recommendedLessons = [];
    
    // Look through each language's lessons
    for (let i = 0; i < userLanguages.length; i++) {
      const userLessonsData = userLessonsQueries[i].data || [];
      
      // Find incomplete lessons
      const incompleteLessons = userLessonsData
        .filter(ul => !ul.isCompleted)
        .sort((a, b) => a.lesson.level - b.lesson.level || a.lesson.order - b.lesson.order);
      
      // Add the first incomplete lesson for each language
      if (incompleteLessons.length > 0) {
        recommendedLessons.push({
          userLesson: incompleteLessons[0],
          language: userLanguages[i].language,
        });
      }
    }
    
    return recommendedLessons.slice(0, 3);
  };

  return (
    <Layout>
      {/* Dashboard Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-1">
          Welcome back, {user?.displayName || user?.username}!
        </h2>
        <p className="text-neutral-600 dark:text-neutral-400">
          Continue your language learning journey
        </p>
      </div>

      {/* Streak Section */}
      <StreakDisplay />

      {/* Language Paths */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-lg">Your Learning Paths</h3>
          <Link href="/lessons">
            <a className="text-secondary text-sm font-medium">View All</a>
          </Link>
        </div>

        {isLoadingLanguages ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Skeleton className="h-64 w-full rounded-xl" />
            <Skeleton className="h-64 w-full rounded-xl" />
          </div>
        ) : userLanguages && userLanguages.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {userLanguages.map((userLanguage, index) => (
              <LanguagePathCard 
                key={userLanguage.id}
                userLanguage={userLanguage}
                lessons={languageLessonStats?.[index] || { completed: 0, total: 0 }}
              />
            ))}
          </div>
        ) : (
          <div className="bg-background dark:bg-neutral-800 rounded-xl shadow-sm border border-neutral-200 dark:border-neutral-800 p-8 text-center">
            <h4 className="font-semibold text-lg mb-2">
              Start Your Language Journey
            </h4>
            <p className="text-neutral-600 dark:text-neutral-400 mb-4">
              You haven't started learning any languages yet. Choose a language to begin your path to fluency.
            </p>
            <Link href="/lessons">
              <Button className="bg-primary hover:bg-primary-hover">
                Choose a Language
              </Button>
            </Link>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Daily Challenge */}
        <div className="lg:col-span-2">
          <DailyChallenge />
        </div>

        {/* Leaderboard Preview */}
        <div className="lg:col-span-1">
          <LeaderboardPreview />
        </div>
      </div>

      {/* Recommended Lessons */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-lg">Recommended for You</h3>
          <Link href="/lessons">
            <a className="text-secondary text-sm font-medium">View All</a>
          </Link>
        </div>

        {userLanguages?.length === 0 ? (
          <div className="bg-background dark:bg-neutral-800 rounded-xl shadow-sm border border-neutral-200 dark:border-neutral-800 p-6 text-center">
            <p className="text-neutral-600 dark:text-neutral-400">
              Start learning a language to get personalized recommendations
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {getRecommendedLessons().map((item) => (
              <LessonCard
                key={item.userLesson.lesson.id}
                lesson={item.userLesson.lesson}
                language={item.language}
                completed={item.userLesson.isCompleted}
                progress={item.userLesson.progress}
              />
            ))}
          </div>
        )}
      </div>

      {/* Achievement Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-lg">Recent Achievements</h3>
          <Link href="/achievements">
            <a className="text-secondary text-sm font-medium">View All</a>
          </Link>
        </div>

        {isLoadingAchievements ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-32 w-full rounded-xl" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {userAchievements ? (
              userAchievements.slice(0, 4).map((userAchievement) => (
                <AchievementCard
                  key={userAchievement.id}
                  achievement={userAchievement.achievement}
                  earned={true}
                  earnedAt={userAchievement.earnedAt}
                />
              ))
            ) : (
              // Default achievements to show if none earned yet
              [
                {
                  id: 1,
                  name: "First Steps",
                  description: "Completed 5 lessons",
                  icon: "bx-rocket",
                  condition: ""
                },
                {
                  id: 2,
                  name: "Week Warrior",
                  description: "Maintained a 7-day streak",
                  icon: "bx-calendar-check",
                  condition: ""
                },
                {
                  id: 3,
                  name: "Quick Learner",
                  description: "Earned 100 XP in one day",
                  icon: "bx-bulb",
                  condition: ""
                },
                {
                  id: 4,
                  name: "Perfect Score",
                  description: "Complete a lesson without errors",
                  icon: "bx-medal",
                  condition: ""
                }
              ].map((achievement) => (
                <AchievementCard
                  key={achievement.id}
                  achievement={achievement}
                  earned={false}
                />
              ))
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
