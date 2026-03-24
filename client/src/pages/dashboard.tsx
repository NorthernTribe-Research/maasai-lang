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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Brain, Sparkles, Target, TrendingUp, Calendar, Award } from "lucide-react";
import type { Achievement, Language, Lesson, UserAchievement, UserLanguage, UserLesson } from "@shared/schema";

type LanguageData = Language;

type UserLanguageData = UserLanguage & { language: LanguageData };

type LessonData = Lesson;

type UserLessonData = UserLesson & {
  lesson: LessonData;
  lastAccessed?: string | Date | null;
  completedAt?: string | Date | null;
};

type AchievementData = Achievement;

type UserAchievementData = UserAchievement & {
  earnedAt: string | Date;
  achievement: AchievementData;
};

export default function Dashboard() {
  const { user } = useAuth();
  
  // Fetch user's languages
  const { data: userLanguages = [], isLoading: isLoadingLanguages } = useQuery<UserLanguageData[]>({
    queryKey: ["/api/user/languages"],
    enabled: !!user,
  });

  // Fetch user's achievements
  const { data: userAchievements = [], isLoading: isLoadingAchievements } = useQuery<UserAchievementData[]>({
    queryKey: ["/api/user/achievements"],
    enabled: !!user,
  });

  // For each language, fetch lessons and user lesson progress
  const userLessonsQueries = userLanguages.map((userLanguage) => {
    return useQuery<UserLessonData[]>({
      queryKey: ["/api/user/languages", userLanguage.languageId, "lessons"],
      enabled: !!userLanguage,
    });
  });

  // Calculate lesson stats for each language
  const languageLessonStats = userLanguages.map((userLanguage, index) => {
    const userLessonsData = userLessonsQueries[index].data || [];
    const completedLessons = userLessonsData.filter((ul) => ul.isCompleted).length;
    return {
      languageId: userLanguage.languageId,
      completed: completedLessons,
      total: userLessonsData.length,
    };
  });

  // Get recommended lessons
  const getRecommendedLessons = () => {
    if (userLanguages.length === 0 || userLessonsQueries.length === 0) return [];
    
    const recommendedLessons: Array<{
      userLesson: UserLessonData;
      language: LanguageData;
    }> = [];
    
    // Look through each language's lessons
    for (let i = 0; i < userLanguages.length; i++) {
      const userLessonsData = userLessonsQueries[i].data || [];
      
      // Find incomplete lessons
      const incompleteLessons = userLessonsData
        .filter((ul) => !ul.isCompleted)
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
          Welcome back, {user?.firstName || user?.username || "Learner"}!
        </h2>
        <p className="text-neutral-600 dark:text-neutral-400">
          Continue your language learning journey
        </p>
      </div>

      {/* Quick Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total XP</p>
                <p className="text-2xl font-bold">{user?.xp || 0}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Streak</p>
                <p className="text-2xl font-bold">{user?.streak || 0}</p>
              </div>
              <Calendar className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Level</p>
                <p className="text-2xl font-bold">{user?.level || 1}</p>
              </div>
              <Target className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Achievements</p>
                <p className="text-2xl font-bold">{userAchievements?.length || 0}</p>
              </div>
              <Award className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Streak Section */}
      <StreakDisplay />

      {/* Language Paths */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-lg">Your Learning Paths</h3>
          <div className="flex gap-2">
            <Link href="/progress">
              <Button variant="outline" size="sm">
                <TrendingUp className="h-4 w-4 mr-2" />
                View Progress
              </Button>
            </Link>
            <Link href="/lessons">
              <a className="text-secondary text-sm font-medium flex items-center">View All</a>
            </Link>
          </div>
        </div>

        {isLoadingLanguages ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Skeleton className="h-64 w-full rounded-xl" />
            <Skeleton className="h-64 w-full rounded-xl" />
          </div>
        ) : userLanguages.length > 0 ? (
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

      {/* AI-Enhanced Learning Section */}
      <div className="mb-6">
        <Card className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 border-purple-200 dark:border-purple-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-purple-600" />
              AI-Enhanced Learning
              <Sparkles className="h-4 w-4 text-yellow-500" />
            </CardTitle>
            <CardDescription>
              Unlock personalized lessons, adaptive exercises, and pronunciation coaching powered by advanced AI
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="text-center p-4 bg-white/50 dark:bg-neutral-800/50 rounded-lg">
                <Target className="h-8 w-8 mx-auto mb-2 text-blue-600" />
                <h4 className="font-semibold">Adaptive Learning</h4>
                <p className="text-sm text-muted-foreground">Personalized based on your progress</p>
              </div>
              <div className="text-center p-4 bg-white/50 dark:bg-neutral-800/50 rounded-lg">
                <Brain className="h-8 w-8 mx-auto mb-2 text-green-600" />
                <h4 className="font-semibold">AI Teacher</h4>
                <p className="text-sm text-muted-foreground">24/7 intelligent tutoring</p>
              </div>
              <div className="text-center p-4 bg-white/50 dark:bg-neutral-800/50 rounded-lg">
                <Sparkles className="h-8 w-8 mx-auto mb-2 text-purple-600" />
                <h4 className="font-semibold">Smart Content</h4>
                <p className="text-sm text-muted-foreground">Generated for your needs</p>
              </div>
            </div>
            <Button asChild className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700">
              <Link href="/ai-learning">
                Start AI-Enhanced Learning
              </Link>
            </Button>
          </CardContent>
        </Card>
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

        {userLanguages.length === 0 ? (
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
            {userAchievements.length > 0 ? (
              userAchievements.slice(0, 4).map((userAchievement) => (
                <AchievementCard
                  key={userAchievement.id}
                  achievement={userAchievement.achievement}
                  earned={true}
                  earnedAt={
                    typeof userAchievement.earnedAt === "string"
                      ? new Date(userAchievement.earnedAt)
                      : userAchievement.earnedAt
                  }
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
