import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from "recharts";
import { Volume2, TrendingUp, Award } from "lucide-react";

/**
 * PronunciationTrends Component
 * Requirements: 15.5
 * 
 * Displays line chart of pronunciation accuracy over time,
 * shows phoneme-specific breakdowns, and highlights improvement areas.
 */

interface PronunciationTrendsProps {
  profileId: string;
}

interface PronunciationData {
  overallTrend: Array<{
    date: Date;
    averageScore: number;
  }>;
  phonemeBreakdown: Array<{
    phoneme: string;
    averageScore: number;
    attempts: number;
  }>;
}

const chartConfig = {
  score: {
    label: "Pronunciation Score",
    color: "hsl(var(--chart-1))",
  },
  accuracy: {
    label: "Accuracy",
    color: "hsl(var(--chart-2))",
  },
};

export default function PronunciationTrends({ profileId }: PronunciationTrendsProps) {
  const { data: pronunciationData, isLoading } = useQuery<PronunciationData>({
    queryKey: ["/api/progress", profileId, "pronunciation"],
  });

  if (isLoading) {
    return <PronunciationTrendsSkeleton />;
  }

  if (!pronunciationData || pronunciationData.overallTrend.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Volume2 className="h-5 w-5" />
            Pronunciation Trends
          </CardTitle>
          <CardDescription>Track your pronunciation improvement over time</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Volume2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              No pronunciation data available yet.
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Start practicing pronunciation to see your progress here.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Format trend data for chart
  const trendData = pronunciationData.overallTrend.map((item) => ({
    date: new Date(item.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    score: item.averageScore,
  }));

  // Sort phoneme breakdown by score (lowest first to highlight areas needing work)
  const sortedPhonemes = [...pronunciationData.phonemeBreakdown].sort(
    (a, b) => a.averageScore - b.averageScore
  );

  // Identify improvement areas (scores below 70)
  const improvementAreas = sortedPhonemes.filter((p) => p.averageScore < 70);
  const strongAreas = sortedPhonemes.filter((p) => p.averageScore >= 80);

  // Calculate overall statistics
  const latestScore = pronunciationData.overallTrend[0]?.averageScore || 0;
  const oldestScore =
    pronunciationData.overallTrend[pronunciationData.overallTrend.length - 1]?.averageScore || 0;
  const improvement = latestScore - oldestScore;
  const averageScore =
    pronunciationData.overallTrend.reduce((sum, item) => sum + item.averageScore, 0) /
    pronunciationData.overallTrend.length;

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  const getScoreBadgeVariant = (score: number): "default" | "secondary" | "destructive" => {
    if (score >= 80) return "default";
    if (score >= 60) return "secondary";
    return "destructive";
  };

  return (
    <div className="space-y-6">
      {/* Overall Statistics */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Latest Score</CardTitle>
            <Volume2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getScoreColor(latestScore)}`}>
              {latestScore}%
            </div>
            <p className="text-xs text-muted-foreground">Most recent pronunciation</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Score</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getScoreColor(Math.round(averageScore))}`}>
              {Math.round(averageScore)}%
            </div>
            <p className="text-xs text-muted-foreground">Overall performance</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Improvement</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${
                improvement >= 0 ? "text-green-600" : "text-red-600"
              }`}
            >
              {improvement >= 0 ? "+" : ""}
              {Math.round(improvement)}%
            </div>
            <p className="text-xs text-muted-foreground">Since you started</p>
          </CardContent>
        </Card>
      </div>

      {/* Pronunciation Trend Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Pronunciation Accuracy Over Time</CardTitle>
          <CardDescription>Your pronunciation scores across practice sessions</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[300px]">
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis domain={[0, 100]} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Legend />
              <Line
                type="monotone"
                dataKey="score"
                stroke="var(--color-score)"
                strokeWidth={2}
                dot={{ r: 4 }}
                name="Pronunciation Score"
              />
            </LineChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Phoneme-Specific Breakdown */}
      {sortedPhonemes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Phoneme-Specific Performance</CardTitle>
            <CardDescription>
              Breakdown of your pronunciation accuracy by phoneme
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[300px]">
              <BarChart data={sortedPhonemes}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="phoneme" />
                <YAxis domain={[0, 100]} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Legend />
                <Bar
                  dataKey="averageScore"
                  fill="var(--color-accuracy)"
                  radius={[4, 4, 0, 0]}
                  name="Average Score"
                />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      )}

      {/* Improvement Areas */}
      {improvementAreas.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Areas for Improvement</CardTitle>
            <CardDescription>Phonemes that need more practice</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {improvementAreas.map((phoneme, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="font-mono text-lg font-bold bg-muted px-3 py-1 rounded">
                      {phoneme.phoneme}
                    </div>
                    <div>
                      <p className="text-sm font-medium">
                        {phoneme.attempts} attempt{phoneme.attempts !== 1 ? "s" : ""}
                      </p>
                      <p className="text-xs text-muted-foreground">Practice sessions</p>
                    </div>
                  </div>
                  <Badge variant={getScoreBadgeVariant(phoneme.averageScore)}>
                    {phoneme.averageScore}% accuracy
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Strong Areas */}
      {strongAreas.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Strong Areas</CardTitle>
            <CardDescription>Phonemes you've mastered</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {strongAreas.map((phoneme, index) => (
                <Badge key={index} variant="default" className="text-sm">
                  {phoneme.phoneme} ({phoneme.averageScore}%)
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Practice Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle>Practice Recommendations</CardTitle>
          <CardDescription>Tips to improve your pronunciation</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {improvementAreas.length > 0 && (
              <li className="text-sm flex items-start gap-2">
                <span className="text-primary mt-1">•</span>
                <span>
                  Focus on the <strong>{improvementAreas[0].phoneme}</strong> sound - it needs the
                  most improvement
                </span>
              </li>
            )}
            <li className="text-sm flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Practice pronunciation daily for at least 10 minutes</span>
            </li>
            <li className="text-sm flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Listen to native speakers and try to mimic their pronunciation</span>
            </li>
            <li className="text-sm flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Record yourself and compare with the target pronunciation</span>
            </li>
            {strongAreas.length > 0 && (
              <li className="text-sm flex items-start gap-2">
                <span className="text-primary mt-1">•</span>
                <span>
                  Great job on <strong>{strongAreas[0].phoneme}</strong>! Keep practicing to
                  maintain your accuracy
                </span>
              </li>
            )}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

function PronunciationTrendsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        {[...Array(3)].map((_, i) => (
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
          <Skeleton className="h-6 w-[250px]" />
          <Skeleton className="h-4 w-[300px]" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    </div>
  );
}
