import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProgressDashboard, WeaknessAnalysis, PronunciationTrends } from "@/components/analytics";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Analytics Demo Page
 * Demonstrates the analytics components with real data
 */

interface LearningProfile {
  id: string;
  targetLanguage: string;
  proficiencyLevel: string;
}

export default function AnalyticsDemoPage() {
  const { user } = useAuth();
  const [selectedProfileId, setSelectedProfileId] = useState<string>("");

  // Fetch user's learning profiles
  const { data: profiles, isLoading: isLoadingProfiles } = useQuery<LearningProfile[]>({
    queryKey: ["/api/profiles"],
    enabled: !!user,
  });

  // Set default profile when profiles load
  if (profiles && profiles.length > 0 && !selectedProfileId) {
    setSelectedProfileId(profiles[0].id);
  }

  if (!user) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              Please log in to view your analytics
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoadingProfiles) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <Skeleton className="h-12 w-[300px]" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  if (!profiles || profiles.length === 0) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              No learning profiles found. Create a profile to start tracking your progress.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
          <p className="text-muted-foreground">
            Track your learning progress and identify areas for improvement
          </p>
        </div>
        {profiles.length > 1 && (
          <Select value={selectedProfileId} onValueChange={setSelectedProfileId}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select language" />
            </SelectTrigger>
            <SelectContent>
              {profiles.map((profile) => (
                <SelectItem key={profile.id} value={profile.id}>
                  {profile.targetLanguage}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Analytics Components */}
      <Tabs defaultValue="dashboard" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="weaknesses">Weaknesses</TabsTrigger>
          <TabsTrigger value="pronunciation">Pronunciation</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          <ProgressDashboard profileId={selectedProfileId} />
        </TabsContent>

        <TabsContent value="weaknesses">
          <WeaknessAnalysis profileId={selectedProfileId} />
        </TabsContent>

        <TabsContent value="pronunciation">
          <PronunciationTrends profileId={selectedProfileId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
