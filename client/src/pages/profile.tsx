import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import Layout from "@/components/layout/layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Trophy, Star, Calendar, Edit, Save, X } from "lucide-react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

const profileFormSchema = z.object({
  displayName: z.string().min(2, {
    message: "Display name must be at least 2 characters.",
  }).optional(),
  email: z.string().email({
    message: "Please enter a valid email address.",
  }).optional(),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

export default function Profile() {
  const { user, logoutMutation } = useAuth();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);

  // Query user languages
  const { data: userLanguages, isLoading: isLoadingLanguages } = useQuery({
    queryKey: ["/api/user/languages"],
    enabled: !!user,
  });

  // Query user achievements
  const { data: userAchievements, isLoading: isLoadingAchievements } = useQuery({
    queryKey: ["/api/user/achievements"],
    enabled: !!user,
  });

  // Form setup for profile editing
  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      displayName: user?.displayName || "",
      email: user?.email || "",
    },
  });

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (data: ProfileFormValues) => {
      const res = await apiRequest("PATCH", "/api/user/profile", data);
      return res.json();
    },
    onSuccess: (updatedUser) => {
      queryClient.setQueryData(["/api/user"], updatedUser);
      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully.",
      });
      setIsEditing(false);
    },
    onError: (error) => {
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Handle logout
  const handleLogout = () => {
    logoutMutation.mutate();
  };

  // Handle form submission
  const onSubmit = (data: ProfileFormValues) => {
    updateProfileMutation.mutate(data);
  };

  // Handle cancel editing
  const handleCancel = () => {
    form.reset({
      displayName: user?.displayName || "",
      email: user?.email || "",
    });
    setIsEditing(false);
  };

  // Get initial for avatar
  const getInitial = (name: string): string => {
    return (name || "U").charAt(0).toUpperCase();
  };

  if (!user) {
    return (
      <Layout>
        <div className="flex justify-center items-center min-h-[60vh]">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-1">Your Profile</h2>
        <p className="text-neutral-600 dark:text-neutral-400">
          Manage your account and view your progress
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Profile Card */}
        <Card className="md:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle>Profile Information</CardTitle>
            {!isEditing ? (
              <Button 
                variant="outline" 
                size="sm" 
                className="flex items-center" 
                onClick={() => setIsEditing(true)}
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit Profile
              </Button>
            ) : (
              <div className="flex space-x-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex items-center text-destructive" 
                  onClick={handleCancel}
                >
                  <X className="h-4 w-4 mr-1" />
                  Cancel
                </Button>
                <Button 
                  size="sm" 
                  className="flex items-center bg-primary hover:bg-primary-hover" 
                  onClick={form.handleSubmit(onSubmit)}
                  disabled={updateProfileMutation.isPending}
                >
                  {updateProfileMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-1" />
                  )}
                  Save
                </Button>
              </div>
            )}
          </CardHeader>
          <CardContent className="pt-4">
            <div className="flex flex-col md:flex-row gap-6">
              <div className="flex flex-col items-center">
                <Avatar className="h-24 w-24 bg-primary text-primary-foreground">
                  <AvatarFallback className="text-xl">
                    {getInitial(user.displayName || user.username)}
                  </AvatarFallback>
                </Avatar>
                <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
                  Member since {new Date(user.createdAt).toLocaleDateString()}
                </p>
              </div>
              
              <div className="flex-1">
                {isEditing ? (
                  <Form {...form}>
                    <form className="space-y-4">
                      <FormField
                        control={form.control}
                        name="displayName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Display Name</FormLabel>
                            <FormControl>
                              <Input placeholder="Your display name" {...field} />
                            </FormControl>
                            <FormDescription>
                              This is how you'll appear to other users
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                              <Input placeholder="your.email@example.com" type="email" {...field} />
                            </FormControl>
                            <FormDescription>
                              Used for notifications and account recovery
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </form>
                  </Form>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <Label className="text-muted-foreground text-sm">Username</Label>
                      <p className="text-lg font-medium">{user.username}</p>
                    </div>
                    
                    <div>
                      <Label className="text-muted-foreground text-sm">Display Name</Label>
                      <p className="text-lg font-medium">{user.displayName || "Not set"}</p>
                    </div>
                    
                    <div>
                      <Label className="text-muted-foreground text-sm">Email</Label>
                      <p className="text-lg font-medium">{user.email || "Not set"}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Stats Card */}
        <Card>
          <CardHeader>
            <CardTitle>Stats</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Trophy className="h-5 w-5 text-primary mr-2" />
                  <span className="text-sm">XP Points</span>
                </div>
                <Badge variant="outline" className="text-lg font-bold">{user.xp}</Badge>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Calendar className="h-5 w-5 text-primary mr-2" />
                  <span className="text-sm">Current Streak</span>
                </div>
                <Badge variant="outline" className="text-lg font-bold">{user.streak} days</Badge>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Star className="h-5 w-5 text-primary mr-2" />
                  <span className="text-sm">Achievements</span>
                </div>
                <Badge variant="outline" className="text-lg font-bold">
                  {isLoadingAchievements ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    userAchievements?.length || 0
                  )}
                </Badge>
              </div>
              
              <Button 
                variant="outline" 
                className="w-full mt-4 text-destructive hover:text-destructive"
                onClick={handleLogout}
                disabled={logoutMutation.isPending}
              >
                {logoutMutation.isPending && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                Log Out
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Languages and Progress */}
      <div className="mt-6">
        <Tabs defaultValue="languages">
          <TabsList className="mb-6">
            <TabsTrigger value="languages">Languages</TabsTrigger>
            <TabsTrigger value="achievements">Achievements</TabsTrigger>
            <TabsTrigger value="activity">Recent Activity</TabsTrigger>
          </TabsList>
          
          <TabsContent value="languages">
            <Card>
              <CardHeader>
                <CardTitle>Your Languages</CardTitle>
                <CardDescription>Track your progress across different languages</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingLanguages ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : userLanguages && userLanguages.length > 0 ? (
                  <div className="space-y-6">
                    {userLanguages.map(userLanguage => (
                      <div key={userLanguage.id} className="border border-neutral-200 dark:border-neutral-800 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center">
                            <img 
                              src={userLanguage.language.flag} 
                              alt={`${userLanguage.language.name} flag`} 
                              className="w-10 h-10 rounded-full mr-3"
                            />
                            <div>
                              <h4 className="font-semibold text-lg">{userLanguage.language.name}</h4>
                              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                                Level {userLanguage.level}: {userLanguage.level === 1 ? "Beginner" : 
                                  userLanguage.level === 2 ? "Elementary" : 
                                  userLanguage.level === 3 ? "Intermediate" : 
                                  userLanguage.level === 4 ? "Advanced" : "Proficient"}
                              </p>
                            </div>
                          </div>
                          <Badge>
                            {userLanguage.progress}% complete
                          </Badge>
                        </div>
                        
                        <div className="w-full h-2 bg-neutral-200 dark:bg-neutral-700 rounded-full">
                          <div 
                            className="h-2 bg-primary rounded-full"
                            style={{ width: `${userLanguage.progress}%` }}
                          ></div>
                        </div>
                      </div>
                    ))}
                    
                    <Button 
                      className="w-full bg-secondary hover:bg-secondary-hover"
                      onClick={() => window.location.href = "/lessons"}
                    >
                      Add New Language
                    </Button>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-neutral-600 dark:text-neutral-400 mb-4">
                      You haven't started learning any languages yet
                    </p>
                    <Button 
                      className="bg-primary hover:bg-primary-hover"
                      onClick={() => window.location.href = "/lessons"}
                    >
                      Start Learning
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="achievements">
            <Card>
              <CardHeader>
                <CardTitle>Your Achievements</CardTitle>
                <CardDescription>Badges and milestones you've reached</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingAchievements ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : userAchievements && userAchievements.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {userAchievements.map(achievement => (
                      <div 
                        key={achievement.id}
                        className="bg-neutral-50 dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800 p-4 flex items-start"
                      >
                        <div className="w-12 h-12 bg-primary-light dark:bg-primary/20 rounded-full flex items-center justify-center mr-3">
                          <i className={`bx ${achievement.achievement.icon} text-xl text-primary`}></i>
                        </div>
                        <div>
                          <h4 className="font-semibold">{achievement.achievement.name}</h4>
                          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                            {achievement.achievement.description}
                          </p>
                          <p className="text-xs text-primary mt-1 font-medium">
                            Earned on {new Date(achievement.earnedAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-neutral-600 dark:text-neutral-400 mb-4">
                      You haven't earned any achievements yet
                    </p>
                    <Button 
                      className="bg-primary hover:bg-primary-hover"
                      onClick={() => window.location.href = "/lessons"}
                    >
                      Start Learning
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="activity">
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>Your latest learning activity</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {user.streak > 0 && (
                    <div className="border-l-4 border-primary pl-4 py-2">
                      <p className="font-medium">Streak Updated</p>
                      <p className="text-sm text-neutral-500 dark:text-neutral-400">
                        You've maintained a streak of {user.streak} days!
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(user.streakUpdatedAt).toLocaleString()}
                      </p>
                    </div>
                  )}
                  
                  {userAchievements && userAchievements[0] && (
                    <div className="border-l-4 border-secondary pl-4 py-2">
                      <p className="font-medium">Achievement Unlocked</p>
                      <p className="text-sm text-neutral-500 dark:text-neutral-400">
                        You earned the "{userAchievements[0].achievement.name}" achievement
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(userAchievements[0].earnedAt).toLocaleString()}
                      </p>
                    </div>
                  )}
                  
                  <div className="border-l-4 border-accent pl-4 py-2">
                    <p className="font-medium">Account Created</p>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">
                      Welcome to LinguaMaster! Your learning journey begins.
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(user.createdAt).toLocaleString()}
                    </p>
                  </div>
                  
                  {(userLanguages && userLanguages.length === 0 && (!userAchievements || userAchievements.length === 0)) && (
                    <div className="text-center py-4">
                      <p className="text-neutral-600 dark:text-neutral-400">
                        No recent activity to show. Start learning to see your activity here!
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
