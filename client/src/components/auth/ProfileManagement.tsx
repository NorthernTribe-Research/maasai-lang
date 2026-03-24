import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Edit, Save, X, Globe } from "lucide-react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

// Requirements: 1.5
const profileFormSchema = z.object({
  firstName: z.string().min(1, "First name is required").optional(),
  lastName: z.string().min(1, "Last name is required").optional(),
  email: z.string().email("Please enter a valid email address").optional(),
  profileImageUrl: z.string().url("Please enter a valid URL").optional().or(z.literal("")),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

/**
 * Profile Management Component
 * Requirements: 1.5, 2.5
 * 
 * Displays user profile information and allows updates
 * Shows all learning profiles for different languages
 */
export function ProfileManagement() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);

  // Query learning profiles (Requirements: 2.5)
  const { data: learningProfiles, isLoading: isLoadingProfiles } = useQuery({
    queryKey: ["/api/profiles"],
    enabled: !!user,
  });

  // Form setup for profile editing
  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      firstName: user?.firstName || "",
      lastName: user?.lastName || "",
      email: user?.email || "",
      profileImageUrl: user?.profileImageUrl || "",
    },
  });

  // Update profile mutation (Requirements: 1.5)
  const updateProfileMutation = useMutation({
    mutationFn: async (data: ProfileFormValues) => {
      const res = await apiRequest("PUT", "/api/auth/profile", data);
      return res.json();
    },
    onSuccess: (response) => {
      queryClient.setQueryData(["/api/user"], response.user);
      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully.",
      });
      setIsEditing(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Handle form submission
  const onSubmit = (data: ProfileFormValues) => {
    updateProfileMutation.mutate(data);
  };

  // Handle cancel editing
  const handleCancel = () => {
    form.reset({
      firstName: user?.firstName || "",
      lastName: user?.lastName || "",
      email: user?.email || "",
      profileImageUrl: user?.profileImageUrl || "",
    });
    setIsEditing(false);
  };

  // Get initial for avatar
  const getInitial = (name?: string): string => {
    if (!name) return "U";
    return name.charAt(0).toUpperCase();
  };

  if (!user) {
    return (
      <div className="flex justify-center items-center min-h-[200px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Profile Information Card */}
      <Card>
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
                  {getInitial(user.firstName || user.username || user.email || undefined)}
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
                      name="firstName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>First Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Your first name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="lastName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Last Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Your last name" {...field} />
                          </FormControl>
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
                    
                    <FormField
                      control={form.control}
                      name="profileImageUrl"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Profile Image URL (optional)</FormLabel>
                          <FormControl>
                            <Input placeholder="https://example.com/image.jpg" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </form>
                </Form>
              ) : (
                <div className="space-y-4">
                  <div>
                    <Label className="text-muted-foreground text-sm">Name</Label>
                    <p className="text-lg font-medium">
                      {user.firstName && user.lastName 
                        ? `${user.firstName} ${user.lastName}` 
                        : user.username || "Not set"}
                    </p>
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

      {/* Learning Profiles Card (Requirements: 2.5) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Globe className="h-5 w-5 mr-2" />
            Learning Profiles
          </CardTitle>
          <CardDescription>
            Your language learning progress across different languages
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingProfiles ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : learningProfiles && Array.isArray(learningProfiles) && learningProfiles.length > 0 ? (
            <div className="space-y-4">
              {learningProfiles.map((profile: any) => (
                <div 
                  key={profile.id} 
                  className="border border-neutral-200 dark:border-neutral-800 rounded-lg p-4"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h4 className="font-semibold text-lg">
                        {profile.targetLanguage}
                      </h4>
                      <p className="text-sm text-neutral-500 dark:text-neutral-400">
                        Native: {profile.nativeLanguage}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-sm">
                      {profile.proficiencyLevel}
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">XP</p>
                      <p className="font-semibold">{profile.currentXP}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Streak</p>
                      <p className="font-semibold">{profile.currentStreak} days</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Last Active</p>
                      <p className="font-semibold">
                        {profile.lastActivityDate 
                          ? new Date(profile.lastActivityDate).toLocaleDateString()
                          : "Never"}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
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
    </div>
  );
}
