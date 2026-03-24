import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { AlertCircle, TrendingUp, TrendingDown, Minus, Target } from "lucide-react";
import { useLocation } from "wouter";

/**
 * WeaknessAnalysis Component
 * Requirements: 15.4
 * 
 * Lists identified weakness areas, shows improvement trends for each weakness,
 * and suggests targeted practice.
 */

interface WeaknessAnalysisProps {
  profileId: string;
}

interface WeaknessData {
  weaknesses: string[];
  improvementTrends: Array<{
    area: string;
    recentAccuracy: number;
    trend: "improving" | "stable" | "declining";
  }>;
}

const chartConfig = {
  accuracy: {
    label: "Accuracy",
    color: "hsl(var(--chart-1))",
  },
};

export default function WeaknessAnalysis({ profileId }: WeaknessAnalysisProps) {
  const [, setLocation] = useLocation();

  const { data: weaknessData, isLoading } = useQuery<WeaknessData>({
    queryKey: ["/api/progress", profileId, "weaknesses"],
  });

  if (isLoading) {
    return <WeaknessAnalysisSkeleton />;
  }

  if (!weaknessData || weaknessData.weaknesses.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Weakness Analysis</CardTitle>
          <CardDescription>Areas that need improvement</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              Great job! No significant weaknesses detected yet.
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Keep practicing to maintain your progress.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Prepare chart data
  const chartData = weaknessData.improvementTrends.map((trend) => ({
    area: trend.area.length > 15 ? trend.area.substring(0, 15) + "..." : trend.area,
    accuracy: trend.recentAccuracy,
  }));

  const getTrendIcon = (trend: "improving" | "stable" | "declining") => {
    switch (trend) {
      case "improving":
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case "declining":
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      case "stable":
        return <Minus className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getTrendColor = (trend: "improving" | "stable" | "declining") => {
    switch (trend) {
      case "improving":
        return "text-green-500";
      case "declining":
        return "text-red-500";
      case "stable":
        return "text-yellow-500";
    }
  };

  const getAccuracyColor = (accuracy: number) => {
    if (accuracy >= 70) return "text-green-600";
    if (accuracy >= 50) return "text-yellow-600";
    return "text-red-600";
  };

  const handlePractice = (area: string) => {
    // Navigate to exercise practice with the weakness area as context
    setLocation(`/exercises?focus=${encodeURIComponent(area)}`);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            Weakness Analysis
          </CardTitle>
          <CardDescription>
            Areas identified for improvement based on your performance
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Weakness List */}
            <div className="space-y-4">
              {weaknessData.improvementTrends.map((trend, index) => (
                <div
                  key={index}
                  className="border rounded-lg p-4 space-y-3 hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold">{trend.area}</h4>
                        <Badge variant="outline" className="flex items-center gap-1">
                          {getTrendIcon(trend.trend)}
                          <span className={getTrendColor(trend.trend)}>
                            {trend.trend.charAt(0).toUpperCase() + trend.trend.slice(1)}
                          </span>
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm text-muted-foreground">Recent Accuracy</span>
                            <span className={`text-sm font-medium ${getAccuracyColor(trend.recentAccuracy)}`}>
                              {trend.recentAccuracy}%
                            </span>
                          </div>
                          <Progress value={trend.recentAccuracy} className="h-2" />
                        </div>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handlePractice(trend.area)}
                      className="ml-4"
                    >
                      Practice
                    </Button>
                  </div>

                  {/* Suggestions based on trend */}
                  <div className="text-sm text-muted-foreground">
                    {trend.trend === "declining" && (
                      <p className="flex items-start gap-2">
                        <span className="text-red-500">⚠</span>
                        <span>
                          This area needs immediate attention. Consider reviewing the basics and
                          practicing with easier exercises first.
                        </span>
                      </p>
                    )}
                    {trend.trend === "stable" && trend.recentAccuracy < 70 && (
                      <p className="flex items-start gap-2">
                        <span className="text-yellow-500">💡</span>
                        <span>
                          You're maintaining consistency, but there's room for improvement. Try
                          different exercise types to strengthen this skill.
                        </span>
                      </p>
                    )}
                    {trend.trend === "improving" && (
                      <p className="flex items-start gap-2">
                        <span className="text-green-500">✓</span>
                        <span>
                          Great progress! Keep practicing to solidify your understanding.
                        </span>
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Accuracy Chart */}
            {chartData.length > 0 && (
              <div className="pt-4 border-t">
                <h4 className="font-semibold mb-4">Accuracy Comparison</h4>
                <ChartContainer config={chartConfig} className="h-[250px]">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="area"
                      angle={-45}
                      textAnchor="end"
                      height={80}
                      tick={{ fontSize: 12 }}
                    />
                    <YAxis domain={[0, 100]} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="accuracy" fill="var(--color-accuracy)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ChartContainer>
              </div>
            )}

            {/* General Recommendations */}
            <div className="pt-4 border-t">
              <h4 className="font-semibold mb-3">Recommended Actions</h4>
              <ul className="space-y-2">
                <li className="text-sm flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>
                    Focus on your weakest area first: <strong>{weaknessData.improvementTrends[0]?.area}</strong>
                  </span>
                </li>
                <li className="text-sm flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>
                    Practice for at least 15 minutes daily on targeted exercises
                  </span>
                </li>
                <li className="text-sm flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>
                    Use voice lessons to reinforce concepts in a conversational context
                  </span>
                </li>
                <li className="text-sm flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>
                    Review completed lessons related to your weakness areas
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function WeaknessAnalysisSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-[200px]" />
        <Skeleton className="h-4 w-[300px]" />
      </CardHeader>
      <CardContent className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="border rounded-lg p-4 space-y-3">
            <div className="flex items-start justify-between">
              <div className="space-y-2 flex-1">
                <Skeleton className="h-5 w-[150px]" />
                <Skeleton className="h-2 w-full" />
                <Skeleton className="h-4 w-[100px]" />
              </div>
              <Skeleton className="h-9 w-[80px]" />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
