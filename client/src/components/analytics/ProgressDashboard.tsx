import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Legend, ResponsiveContainer } from "recharts";
import { BookOpen, Dumbbell, Mic, Volume2, Trophy, TrendingUp } from "lucide-react";

/**
 * ProgressDashboard Component
 * Requirements: 15.2, 15.3, 20.4
 * 
 * Displays comprehensive progress statistics with charts for progress over time,
 * activity breakdown, and time range selection.
 */

interface ProgressDashboardProps {
  profileId: string;
}

interface ProgressData {
  profile: any;
  totalXP: number;
  currentStreak: number;
  proficiencyLevel: string;
  completedLessons: number;
  completedExercises: number;
  voiceSessions: number;
  averageAccuracy: number;
  totalLearningTime: number;
}

interface AnalyticsData {
  activityBreakdown: {
    lessons: number;
    exercises: number;
    voiceSessions: number;
    pronunciationPractice: number;
  };
  xpGained: number;
  accuracyTrend: Array<{
    date: Date;
    accuracy: number;
  }>;
  recommendations: string[];
  achievements: {
    earned: any[];
    locked: any[];
  };
}

type TimeRange = "7" | "30" | "90" | "all";

const chartConfig = {
  lessons: {
    label: "Lessons",
    color: "hsl(var(--chart-1))",
  },
  exercises: {
    label: "Exercises",
    color: "hsl(var(--chart-2))",
  },
  voiceSessions: {
    label: "Voice Sessions",
    color: "hsl(var(--chart-3))",
  },
  pronunciationPractice: {
    label: "Pronunciation",
    color: "hsl(var(--chart-4))",
  },
  accuracy: {
    label: "Accuracy",
    color: "hsl(var(--chart-5))",
  },
};

const ACTIVITY_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
];

export default function ProgressDashboard({ profileId }: ProgressDashboardProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>("30");

  // Fetch progress data
  const { data: progressData, isLoading: isLoadingProgress } = useQuery<ProgressData>({
    queryKey: ["/api/progress", profileId],
  });

  // Fetch analytics with time range
  const { data: analyticsData, isLoading: isLoadingAnalytics } = useQuery<AnalyticsData>({
    queryKey: ["/api/progress", profileId, "analytics", { timeRange }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (timeRange !== "all") {
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - parseInt(timeRange));
        params.append("startDate", startDate.toISOString());
        params.append("endDate", endDate.toISOString());
      }
      const response = await fetch(`/api/progress/${profileId}/analytics?${params}`);
      if (!response.ok) throw new Error("Failed to fetch analytics");
      return response.json();
    },
  });

  if (isLoadingProgress || isLoadingAnalytics) {
    return <ProgressDashboardSkeleton />;
  }

  if (!progressData || !analyticsData) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-muted-foreground text-center">No progress data available</p>
        </CardContent>
      </Card>
    );
  }

  // Prepare activity breakdown data for pie chart
  const activityData = [
    { name: "Lessons", value: analyticsData.activityBreakdown.lessons, icon: BookOpen },
    { name: "Exercises", value: analyticsData.activityBreakdown.exercises, icon: Dumbbell },
    { name: "Voice Sessions", value: analyticsData.activityBreakdown.voiceSessions, icon: Mic },
    { name: "Pronunciation", value: analyticsData.activityBreakdown.pronunciationPractice, icon: Volume2 },
  ].filter(item => item.value > 0);

  // Format accuracy trend data
  const accuracyTrendData = analyticsData.accuracyTrend.map(item => ({
    date: new Date(item.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    accuracy: item.accuracy,
  }));

  return (
    <div className="space-y-6">
      {/* Header with time range selector */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Progress Dashboard</h2>
          <p className="text-muted-foreground">Track your learning journey</p>
        </div>
        <Select value={timeRange} onValueChange={(value) => setTimeRange(value as TimeRange)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select time range" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
            <SelectItem value="all">All time</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total XP</CardTitle>
            <Trophy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{progressData.totalXP.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              +{analyticsData.xpGained} in selected period
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current Streak</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{progressData.currentStreak} days</div>
            <p className="text-xs text-muted-foreground">Keep it going!</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Proficiency</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{progressData.proficiencyLevel}</div>
            <p className="text-xs text-muted-foreground">Current level</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Accuracy</CardTitle>
            <Trophy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{progressData.averageAccuracy}%</div>
            <p className="text-xs text-muted-foreground">Exercise performance</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="accuracy">Accuracy Trend</TabsTrigger>
          <TabsTrigger value="activities">Activity Breakdown</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Activity Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Activity Summary</CardTitle>
                <CardDescription>Completed activities in selected period</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Lessons</span>
                  </div>
                  <span className="font-bold">{analyticsData.activityBreakdown.lessons}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Dumbbell className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Exercises</span>
                  </div>
                  <span className="font-bold">{analyticsData.activityBreakdown.exercises}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Mic className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Voice Sessions</span>
                  </div>
                  <span className="font-bold">{analyticsData.activityBreakdown.voiceSessions}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Volume2 className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Pronunciation</span>
                  </div>
                  <span className="font-bold">{analyticsData.activityBreakdown.pronunciationPractice}</span>
                </div>
              </CardContent>
            </Card>

            {/* Recommendations */}
            <Card>
              <CardHeader>
                <CardTitle>Recommendations</CardTitle>
                <CardDescription>Personalized suggestions for improvement</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {analyticsData.recommendations.map((rec, index) => (
                    <li key={index} className="text-sm flex items-start gap-2">
                      <span className="text-primary mt-1">•</span>
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="accuracy">
          <Card>
            <CardHeader>
              <CardTitle>Accuracy Over Time</CardTitle>
              <CardDescription>Your exercise accuracy trend</CardDescription>
            </CardHeader>
            <CardContent>
              {accuracyTrendData.length > 0 ? (
                <ChartContainer config={chartConfig} className="h-[300px]">
                  <LineChart data={accuracyTrendData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis domain={[0, 100]} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Line
                      type="monotone"
                      dataKey="accuracy"
                      stroke="var(--color-accuracy)"
                      strokeWidth={2}
                      dot={{ r: 4 }}
                    />
                  </LineChart>
                </ChartContainer>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  No accuracy data available for this period
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activities">
          <Card>
            <CardHeader>
              <CardTitle>Activity Distribution</CardTitle>
              <CardDescription>Breakdown of your learning activities</CardDescription>
            </CardHeader>
            <CardContent>
              {activityData.length > 0 ? (
                <ChartContainer config={chartConfig} className="h-[300px]">
                  <PieChart>
                    <Pie
                      data={activityData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {activityData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={ACTIVITY_COLORS[index % ACTIVITY_COLORS.length]} />
                      ))}
                    </Pie>
                    <ChartTooltip content={<ChartTooltipContent />} />
                  </PieChart>
                </ChartContainer>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  No activity data available for this period
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ProgressDashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-[200px]" />
          <Skeleton className="h-4 w-[150px]" />
        </div>
        <Skeleton className="h-10 w-[180px]" />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-[100px]" />
              <Skeleton className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-[80px]" />
              <Skeleton className="h-3 w-[120px] mt-2" />
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-[150px]" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    </div>
  );
}
