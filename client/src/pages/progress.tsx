import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import Layout from "@/components/layout/layout";
import ProgressDashboard from "@/components/analytics/ProgressDashboard";
import WeaknessAnalysis from "@/components/analytics/WeaknessAnalysis";
import PronunciationTrends from "@/components/analytics/PronunciationTrends";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, TrendingUp, Target, Mic, Calendar } from "lucide-react";
import type { UserLanguage, Language } from "@shared/schema";

export default function Progress() {
  const { user } = useAuth();
  const [selectedLanguageId, setSelectedLanguageId] = useState<string>("all");
  const [timeRange, setTimeRange] = useState<"7d" | "30d" | "90d" | "all">("30d");

  // Fetch user's languages
  const { data: userLanguages, isLoading: isLoadingLanguages } = useQuery<(UserLanguage & { language: Language })[]>({
    queryKey: ["/api/user/languages"],
    enabled: !!user,
  });

  // Fetch progress data for selected language
  const { data: progressData, isLoading: isLoadingProgress } = useQuery({
    queryKey: ["/api/progress", selectedLanguageId, timeRange],
    queryFn: async () => {
      const params = new URLSearchParams({
        timeRange,
        ...(selectedLanguageId !== "all" && { languageId: selectedLanguageId }),
      });
      const res = await fetch(`/api/progress?${params}`);
      if (!res.ok) throw new Error("Failed to fetch progress data");
      return res.json();
    },
    enabled: !!user && !!userLanguages,
  });

  const isLoading = isLoadingLanguages || isLoadingProgress;

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-neutral-900 dark:text-white">
              Learning Progress
            </h1>
            <p className="text-neutral-600 dark:text-neutral-400 mt-1">
              Track your language learning journey and identify areas for improvement
            </p>
          </div>

          <div className="flex gap-3">
            {/* Language Filter */}
            <Select value={selectedLanguageId} onValueChange={setSelectedLanguageId}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select language" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Languages</SelectItem>
                {userLanguages?.map((ul) => (
                  <SelectItem key={ul.id} value={ul.languageId.toString()}>
                    {ul.language.flag} {ul.language.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Time Range Filter */}
            <Select value={timeRange} onValueChange={(v) => setTimeRange(v as typeof timeRange)}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 90 days</SelectItem>
                <SelectItem value="all">All time</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                  <p className="text-sm text-muted-foreground">Current Streak</p>
                  <p className="text-2xl font-bold">{user?.streak || 0} days</p>
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
                  <p className="text-sm text-muted-foreground">Languages</p>
                  <p className="text-2xl font-bold">{userLanguages?.length || 0}</p>
                </div>
                <Mic className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="weaknesses">Weaknesses</TabsTrigger>
            <TabsTrigger value="pronunciation">Pronunciation</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {selectedLanguageId !== "all" ? (
              <ProgressDashboard profileId={selectedLanguageId} />
            ) : (
              <Card>
                <CardContent className="pt-6">
                  <p className="text-center text-muted-foreground">
                    Select a specific language to view detailed progress
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Weaknesses Tab */}
          <TabsContent value="weaknesses" className="space-y-6">
            {selectedLanguageId !== "all" ? (
              <WeaknessAnalysis profileId={selectedLanguageId} />
            ) : (
              <Card>
                <CardContent className="pt-6">
                  <p className="text-center text-muted-foreground">
                    Select a specific language to view weakness analysis
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Pronunciation Tab */}
          <TabsContent value="pronunciation" className="space-y-6">
            {selectedLanguageId !== "all" ? (
              <PronunciationTrends profileId={selectedLanguageId} />
            ) : (
              <Card>
                <CardContent className="pt-6">
                  <p className="text-center text-muted-foreground">
                    Select a specific language to view pronunciation trends
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Activity Tab */}
          <TabsContent value="activity" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Learning Activity</CardTitle>
                <CardDescription>
                  Your daily learning activity over time
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Activity Calendar/Heatmap would go here */}
                  <p className="text-sm text-muted-foreground text-center py-8">
                    Activity visualization coming soon
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Learning Insights */}
        <Card>
          <CardHeader>
            <CardTitle>Learning Insights</CardTitle>
            <CardDescription>
              Personalized recommendations based on your progress
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                  Keep Your Streak
                </h4>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  You're on a {user?.streak || 0} day streak! Complete a lesson today to keep it going.
                </p>
              </div>

              <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
                <h4 className="font-semibold text-green-900 dark:text-green-100 mb-2">
                  Practice Makes Perfect
                </h4>
                <p className="text-sm text-green-700 dark:text-green-300">
                  Try the practice section to reinforce what you've learned.
                </p>
              </div>

              <div className="p-4 bg-purple-50 dark:bg-purple-950/20 rounded-lg border border-purple-200 dark:border-purple-800">
                <h4 className="font-semibold text-purple-900 dark:text-purple-100 mb-2">
                  AI-Enhanced Learning
                </h4>
                <p className="text-sm text-purple-700 dark:text-purple-300">
                  Get personalized lessons with our AI teacher for faster progress.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
