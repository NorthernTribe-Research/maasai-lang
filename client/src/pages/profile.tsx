import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { DuolingoLayout } from "@/components/duolingo/DuolingoLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Trophy, Star, Calendar, Edit, Save, X, Flame, Heart, Settings } from "lucide-react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Link } from "wouter";

const profileFormSchema = z.object({
  firstName: z.string().min(2, {
    message: "First name must be at least 2 characters.",
  }).optional(),
  email: z.string().email({
    message: "Please enter a valid email address.",
  }).optional(),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

export default function Profile() {
  const { user, logout, isLoggingOut } = useAuth();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);

  // Query user languages
  const { data: userLanguages = [], isLoading: isLoadingLanguages } = useQuery<any[]>({
    queryKey: ["/api/user/languages"],
    enabled: !!user,
  });

  // Query user achievements
  const { data: userAchievements = [], isLoading: isLoadingAchievements } = useQuery<any[]>({
    queryKey: ["/api/user/achievements"],
    enabled: !!user,
  });

  // Form setup for profile editing
  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      firstName: user?.firstName || "",
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

  const handleLogout = () => {
    logout();
  };

  const onSubmit = (data: ProfileFormValues) => {
    updateProfileMutation.mutate(data);
  };

  const handleCancel = () => {
    form.reset({
      firstName: user?.firstName || "",
      email: user?.email || "",
    });
    setIsEditing(false);
  };

  const getInitial = (name: string | null | undefined): string => {
    return (name || "U").charAt(0).toUpperCase();
  };

  if (!user) {
    return (
      <DuolingoLayout>
        <div className="flex justify-center items-center h-full pt-32">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      </DuolingoLayout>
    );
  }

  return (
    <DuolingoLayout>
      <div className="animate-in fade-in duration-500 pb-12">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-extrabold text-foreground">Profile</h1>
          <Link href="/settings">
            <Button variant="ghost" size="icon" className="text-neutral-500 hover:text-primary rounded-full">
              <Settings className="w-6 h-6" />
            </Button>
          </Link>
        </div>

        {/* Premium Profile Header */}
        <div className="flex flex-col md:flex-row gap-8 mb-8">
          <div className="flex-1 flex flex-col md:flex-row items-center md:items-start gap-6 bg-card border-2 rounded-2xl p-6 shadow-sm">
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-primary to-purple-500 rounded-full blur opacity-25 group-hover:opacity-50 transition duration-500"></div>
              <div className="relative bg-background rounded-full p-2 border-2 border-primary/20">
                <Avatar className="h-24 w-24 bg-primary text-primary-foreground text-4xl font-bold">
                  <AvatarFallback>{getInitial(user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.username || 'U')}</AvatarFallback>
                </Avatar>
              </div>
            </div>
            
            <div className="flex-1 text-center md:text-left w-full space-y-4">
              {isEditing ? (
                <Form {...form}>
                  <form className="space-y-4">
                    <FormField control={form.control} name="firstName" render={({ field }) => (
                      <FormItem>
                        <FormLabel>First Name</FormLabel>
                        <FormControl><Input {...field} className="border-2" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}/>
                    <FormField control={form.control} name="email" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl><Input type="email" {...field} className="border-2" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}/>
                    <div className="flex space-x-2 pt-2 justify-center md:justify-start">
                      <Button variant="outline" size="sm" onClick={handleCancel}><X className="w-4 h-4 mr-1"/> Cancel</Button>
                      <Button size="sm" onClick={form.handleSubmit(onSubmit)} disabled={updateProfileMutation.isPending}>
                        {updateProfileMutation.isPending ? <Loader2 className="w-4 h-4 mr-1 animate-spin"/> : <Save className="w-4 h-4 mr-1"/>} Save
                      </Button>
                    </div>
                  </form>
                </Form>
              ) : (
                <div className="flex flex-col justify-between h-full">
                  <div>
                    <h2 className="text-2xl font-extrabold text-foreground">{user.firstName || user.username}</h2>
                    <p className="text-muted-foreground font-medium mb-1">@{user.username}</p>
                    <p className="text-sm text-neutral-500">Joined {new Date(user.createdAt).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</p>
                  </div>
                  <Button variant="outline" className="mt-4 border-2 font-bold w-full md:w-auto self-start" onClick={() => setIsEditing(true)}>
                    <Edit className="w-4 h-4 mr-2"/> Edit Profile
                  </Button>
                </div>
              )}
            </div>
          </div>

          <div className="w-full md:w-72 flex flex-col gap-4">
            <h3 className="text-xl font-bold px-2">Statistics</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-card border-2 rounded-2xl p-4 flex flex-col items-center justify-center">
                <div className="flex items-center gap-2 text-yellow-500 mb-1">
                  <Flame className="w-6 h-6 fill-current"/>
                </div>
                <span className="text-2xl font-extrabold text-foreground">{user.streak || 0}</span>
                <span className="text-xs text-muted-foreground font-bold uppercase tracking-wider">Day Streak</span>
              </div>
              <div className="bg-card border-2 rounded-2xl p-4 flex flex-col items-center justify-center">
                <div className="flex items-center gap-2 text-blue-500 mb-1">
                  <Trophy className="w-6 h-6 fill-current"/>
                </div>
                <span className="text-2xl font-extrabold text-foreground">{user.xp || 0}</span>
                <span className="text-xs text-muted-foreground font-bold uppercase tracking-wider">Total XP</span>
              </div>
              <div className="bg-card border-2 rounded-2xl p-4 flex flex-col items-center justify-center col-span-2">
                <div className="flex items-center gap-2 text-primary mb-1">
                  <Star className="w-6 h-6 fill-current"/>
                </div>
                <span className="text-2xl font-extrabold text-foreground">{userAchievements?.length || 0}</span>
                <span className="text-xs text-muted-foreground font-bold uppercase tracking-wider">Achievements</span>
              </div>
            </div>
          </div>
        </div>

        {/* Content Tabs */}
        <div className="bg-card border-2 rounded-2xl overflow-hidden p-6 pb-8">
          <Tabs defaultValue="languages">
            <TabsList className="grid grid-cols-2 md:inline-flex w-full md:w-auto h-auto gap-2 bg-transparent">
              <TabsTrigger value="languages" className="px-6 py-3 text-base font-bold data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:border-2 data-[state=active]:border-primary border-2 border-transparent rounded-xl">Languages</TabsTrigger>
              <TabsTrigger value="achievements" className="px-6 py-3 text-base font-bold data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:border-2 data-[state=active]:border-primary border-2 border-transparent rounded-xl">Achievements</TabsTrigger>
            </TabsList>
            
            <TabsContent value="languages" className="pt-6 outline-none">
              {isLoadingLanguages ? (
                <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary"/></div>
              ) : userLanguages && userLanguages.length > 0 ? (
                <div className="space-y-4">
                  {userLanguages.map(userLanguage => (
                    <div key={userLanguage.id} className="border-2 rounded-2xl p-5 hover:border-primary/50 transition-colors">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center">
                          <div className="text-4xl mr-4">{userLanguage.language.flag}</div>
                          <div>
                            <h4 className="font-extrabold text-lg text-foreground">{userLanguage.language.name}</h4>
                            <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">
                              Level {userLanguage.level}
                            </p>
                          </div>
                        </div>
                        <div className="bg-primary/10 text-primary px-3 py-1 rounded-full font-bold">
                          {userLanguage.progress}%
                        </div>
                      </div>
                      
                      <div className="w-full h-3 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                        <div className="h-full bg-primary rounded-full transition-all duration-1000" style={{ width: `${userLanguage.progress}%` }}></div>
                      </div>
                    </div>
                  ))}
                  
                  <Link href="/learn">
                    <Button variant="outline" className="w-full h-14 border-2 border-dashed font-bold text-lg text-primary hover:bg-primary/5 mt-4">
                      + Add New Course
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="text-center py-16 px-4">
                  <div className="w-24 h-24 bg-neutral-100 dark:bg-neutral-800 rounded-full flex items-center justify-center mx-auto mb-6">
                    <span className="text-5xl">🌍</span>
                  </div>
                  <h3 className="text-xl font-bold mb-2">No active courses</h3>
                  <p className="text-muted-foreground mb-6 max-w-sm mx-auto">Start your learning journey by adding a language course today.</p>
                  <Link href="/learn">
                    <Button size="lg" className="font-bold px-8">Start Learning</Button>
                  </Link>
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="achievements" className="pt-6 outline-none">
              {isLoadingAchievements ? (
                <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary"/></div>
              ) : userAchievements && userAchievements.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {userAchievements.map(achievement => (
                    <div key={achievement.id} className="border-2 rounded-2xl p-4 flex flex-row items-center gap-4 hover:border-primary/30 transition-colors">
                      <div className="w-16 h-16 bg-primary/10 rounded-full flex shrink-0 items-center justify-center">
                        <i className={`bx ${achievement.achievement.icon} text-3xl text-primary`}></i>
                      </div>
                      <div>
                        <h4 className="font-bold text-lg leading-tight mb-1">{achievement.achievement.name}</h4>
                        <p className="text-sm text-muted-foreground leading-snug">{achievement.achievement.description}</p>
                        <p className="text-xs font-bold text-primary mt-2">Earned {new Date(achievement.earnedAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-16 px-4">
                  <div className="w-24 h-24 bg-neutral-100 dark:bg-neutral-800 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Trophy className="w-10 h-10 text-neutral-300 dark:text-neutral-600" />
                  </div>
                  <h3 className="text-xl font-bold mb-2">No achievements yet</h3>
                  <p className="text-muted-foreground mb-6 max-w-sm mx-auto">Complete lessons and practice daily to earn special badges.</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>

        <div className="mt-8 flex justify-center pb-8 border-t-2 pt-8 border-dashed">
          <Button variant="ghost" className="text-destructive hover:text-destructive hover:bg-destructive/10 font-bold" onClick={handleLogout} disabled={isLoggingOut}>
            {isLoggingOut ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : "Log Out of LinguaMaster"}
          </Button>
        </div>
      </div>
    </DuolingoLayout>
  );
}
