import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import Layout from "@/components/layout/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTheme } from "@/components/theme-provider";
import { LoadingState } from "@/components/ui/loading-state";
import {
  User, 
  Palette, 
  Globe, 
  Bell, 
  Shield, 
  Trash2, 
  Save,
  Loader2,
  Moon,
  Sun,
  Monitor,
  Heart,
  Crown
} from "lucide-react";

type Theme = "light" | "dark" | "system";

interface UserSettings {
  emailNotifications: boolean;
  pushNotifications: boolean;
  weeklyReport: boolean;
  achievementAlerts: boolean;
  streakReminders: boolean;
  practiceReminders: boolean;
  dataSharing: boolean;
  profileVisibility: "public" | "friends" | "private";
  showProgress: boolean;
  showStreak: boolean;
}

interface UserStatsSnapshot {
  xp: number;
  streak: number;
  level: number;
  hearts: number;
  isPremium: boolean;
  unlimitedHearts: boolean;
  premiumExpiresAt: string | null;
  freeLessonsPerDay: number;
  lessonsCompletedToday: number;
  remainingFreeLessons: number;
}

type StripeConfirmResponse = {
  checkoutType?: "hearts_package" | "unlimited_hearts_subscription";
  message?: string;
  heartsAdded?: number;
  plan?: "monthly" | "yearly";
};

async function readJsonOrThrow(response: Response): Promise<any> {
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(payload?.error || payload?.message || "Request failed");
  }
  return payload;
}

export default function Settings() {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { theme, setTheme } = useTheme();
  const [isConfirmingStripe, setIsConfirmingStripe] = useState(false);

  // Profile form state
  const [firstName, setFirstName] = useState(user?.firstName || "");
  const [lastName, setLastName] = useState(user?.lastName || "");
  const [email, setEmail] = useState(user?.email || "");

  // Fetch user settings
  const { data: settings, isLoading: settingsLoading } = useQuery<UserSettings>({
    queryKey: ["/api/user/settings"],
  });

  const { data: userStats } = useQuery<UserStatsSnapshot>({
    queryKey: ["/api/user-stats/stats"],
    enabled: !!user,
  });

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (data: { firstName: string; lastName: string; email: string }) => {
      const response = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to update profile");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Update settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: async (data: Partial<UserSettings>) => {
      const response = await fetch("/api/user/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to update settings");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/settings"] });
      toast({
        title: "Settings updated",
        description: "Your settings have been saved successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update settings. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleThemeChange = (newTheme: Theme) => {
    setTheme(newTheme);
    toast({
      title: "Theme updated",
      description: `Theme changed to ${newTheme} mode.`,
    });
  };

  const handleProfileSave = () => {
    updateProfileMutation.mutate({ firstName, lastName, email });
  };

  const handleSettingToggle = (key: keyof UserSettings, value: boolean | string) => {
    updateSettingsMutation.mutate({ [key]: value });
  };

  const handleDeleteAccount = () => {
    if (confirm("Are you sure you want to delete your account? This action cannot be undone.")) {
      // TODO: Implement account deletion
      toast({
        title: "Account deletion",
        description: "This feature will be available soon.",
      });
    }
  };

  const clearStripeQueryParams = () => {
    if (typeof window === "undefined") {
      return;
    }

    const url = new URL(window.location.href);
    url.searchParams.delete("stripe");
    url.searchParams.delete("checkout");
    url.searchParams.delete("session_id");
    const nextSearch = url.searchParams.toString();
    const nextUrl = `${url.pathname}${nextSearch ? `?${nextSearch}` : ""}${url.hash}`;
    window.history.replaceState({}, "", nextUrl);
  };

  const confirmStripeCheckoutMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      const response = await fetch("/api/user-stats/stripe/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ sessionId }),
      });

      return readJsonOrThrow(response) as Promise<StripeConfirmResponse>;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["/api/user-stats/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });

      if (result.checkoutType === "hearts_package") {
        toast({
          title: "Hearts purchased",
          description: result.message || "Your hearts were added successfully.",
        });
        return;
      }

      toast({
        title: "Unlimited hearts activated",
        description: result.message || "Subscription is now active.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Payment confirmation failed",
        description: error.message || "Could not confirm your Stripe payment.",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const stripeState = params.get("stripe");
    const sessionId = params.get("session_id");

    if (!stripeState) {
      return;
    }

    if (stripeState === "cancel") {
      clearStripeQueryParams();
      toast({
        title: "Checkout canceled",
        description: "No charge was made. You can try again anytime.",
      });
      return;
    }

    if (stripeState === "success" && sessionId) {
      clearStripeQueryParams();
      setIsConfirmingStripe(true);
      confirmStripeCheckoutMutation.mutate(sessionId, {
        onSettled: () => {
          setIsConfirmingStripe(false);
        },
      });
      return;
    }

    clearStripeQueryParams();
  }, []);

  const purchaseHeartsMutation = useMutation({
    mutationFn: async (packageId: "small" | "medium" | "large") => {
      const response = await fetch("/api/user-stats/hearts/purchase-money", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ packageId, returnPath: "/settings" }),
      });
      return readJsonOrThrow(response);
    },
    onSuccess: (result) => {
      if (result?.checkoutRequired && result?.checkoutUrl) {
        window.location.assign(result.checkoutUrl);
        return;
      }

      queryClient.invalidateQueries({ queryKey: ["/api/user-stats/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      toast({
        title: "Hearts purchased",
        description: result?.message || "Your hearts were added successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Purchase failed",
        description: error.message || "Could not complete hearts purchase.",
        variant: "destructive",
      });
    },
  });

  const purchaseUnlimitedMutation = useMutation({
    mutationFn: async (plan: "monthly" | "yearly") => {
      const response = await fetch("/api/user-stats/subscription/unlimited-hearts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ plan, returnPath: "/settings" }),
      });
      return readJsonOrThrow(response);
    },
    onSuccess: (result) => {
      if (result?.checkoutRequired && result?.checkoutUrl) {
        window.location.assign(result.checkoutUrl);
        return;
      }

      queryClient.invalidateQueries({ queryKey: ["/api/user-stats/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      toast({
        title: "Unlimited hearts activated",
        description: result?.message || "Subscription is now active.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Subscription failed",
        description: error.message || "Could not activate unlimited hearts.",
        variant: "destructive",
      });
    },
  });

  if (settingsLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  if (isConfirmingStripe || confirmStripeCheckoutMutation.isPending) {
    return (
      <Layout>
        <LoadingState
          fullScreen
          title="Finalizing payment..."
          description="Confirming your checkout and unlocking your purchase."
        />
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-5xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-neutral-900 dark:text-white">Settings</h1>
          <p className="text-neutral-600 dark:text-neutral-400 mt-1">
            Manage your account preferences and settings
          </p>
        </div>

        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="grid w-full grid-cols-3 lg:grid-cols-6">
            <TabsTrigger value="profile" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">Profile</span>
            </TabsTrigger>
            <TabsTrigger value="appearance" className="flex items-center gap-2">
              <Palette className="h-4 w-4" />
              <span className="hidden sm:inline">Appearance</span>
            </TabsTrigger>
            <TabsTrigger value="languages" className="flex items-center gap-2">
              <Globe className="h-4 w-4" />
              <span className="hidden sm:inline">Languages</span>
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              <span className="hidden sm:inline">Notifications</span>
            </TabsTrigger>
            <TabsTrigger value="privacy" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              <span className="hidden sm:inline">Privacy</span>
            </TabsTrigger>
            <TabsTrigger value="account" className="flex items-center gap-2">
              <Trash2 className="h-4 w-4" />
              <span className="hidden sm:inline">Account</span>
            </TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Profile Information</CardTitle>
                <CardDescription>
                  Update your personal information and profile details
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-4">
                  <div className="h-20 w-20 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white text-3xl font-bold">
                    {user?.username?.charAt(0).toUpperCase() || 'U'}
                  </div>
                  <div>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">Profile Picture</p>
                    <Button variant="outline" size="sm" className="mt-2">
                      Change Photo
                    </Button>
                  </div>
                </div>

                <Separator />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name</Label>
                    <Input
                      id="firstName"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="Enter your first name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input
                      id="lastName"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="Enter your last name"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    value={user?.username || ""}
                    disabled
                    className="bg-neutral-100 dark:bg-neutral-800"
                  />
                  <p className="text-xs text-neutral-500">Username cannot be changed</p>
                </div>

                <Button 
                  onClick={handleProfileSave}
                  disabled={updateProfileMutation.isPending}
                  className="w-full md:w-auto"
                >
                  {updateProfileMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Save Changes
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Appearance Tab */}
          <TabsContent value="appearance" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Theme</CardTitle>
                <CardDescription>
                  Choose how LinguaMaster looks to you
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <button
                    onClick={() => handleThemeChange("light")}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      theme === "light"
                        ? "border-primary bg-primary/5"
                        : "border-neutral-200 dark:border-neutral-700 hover:border-primary/50"
                    }`}
                  >
                    <Sun className="h-8 w-8 mx-auto mb-2 text-yellow-500" />
                    <p className="font-semibold">Light</p>
                    <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-1">
                      Bright and clear
                    </p>
                  </button>

                  <button
                    onClick={() => handleThemeChange("dark")}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      theme === "dark"
                        ? "border-primary bg-primary/5"
                        : "border-neutral-200 dark:border-neutral-700 hover:border-primary/50"
                    }`}
                  >
                    <Moon className="h-8 w-8 mx-auto mb-2 text-blue-500" />
                    <p className="font-semibold">Dark</p>
                    <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-1">
                      Easy on the eyes
                    </p>
                  </button>

                  <button
                    onClick={() => handleThemeChange("system")}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      theme === "system"
                        ? "border-primary bg-primary/5"
                        : "border-neutral-200 dark:border-neutral-700 hover:border-primary/50"
                    }`}
                  >
                    <Monitor className="h-8 w-8 mx-auto mb-2 text-neutral-600 dark:text-neutral-400" />
                    <p className="font-semibold">System</p>
                    <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-1">
                      Match your device
                    </p>
                  </button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Color Consistency</CardTitle>
                <CardDescription>
                  Customize the color scheme across the application
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">High Contrast Mode</p>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">
                      Increase contrast for better visibility
                    </p>
                  </div>
                  <Switch
                    checked={settings?.showProgress ?? true}
                    onCheckedChange={(checked) => handleSettingToggle("showProgress", checked)}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Colorful Accents</p>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">
                      Use vibrant colors throughout the app
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Languages Tab */}
          <TabsContent value="languages" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Learning Languages</CardTitle>
                <CardDescription>
                  Manage the languages you're currently learning
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                  Visit the <a href="/lessons" className="text-primary hover:underline">Lessons page</a> to manage your learning languages.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Interface Language</CardTitle>
                <CardDescription>
                  Choose the language for the app interface
                </CardDescription>
              </CardHeader>
              <CardContent>
                <select className="w-full p-2 border border-neutral-200 dark:border-neutral-700 rounded-lg bg-background">
                  <option value="en">English</option>
                  <option value="es">Español</option>
                  <option value="zh">中文</option>
                  <option value="hi">हिन्दी</option>
                  <option value="ar">العربية</option>
                </select>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Email Notifications</CardTitle>
                <CardDescription>
                  Manage your email notification preferences
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Email Notifications</p>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">
                      Receive notifications via email
                    </p>
                  </div>
                  <Switch
                    checked={settings?.emailNotifications ?? true}
                    onCheckedChange={(checked) => handleSettingToggle("emailNotifications", checked)}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Weekly Progress Report</p>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">
                      Get a summary of your weekly progress
                    </p>
                  </div>
                  <Switch
                    checked={settings?.weeklyReport ?? true}
                    onCheckedChange={(checked) => handleSettingToggle("weeklyReport", checked)}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Achievement Alerts</p>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">
                      Get notified when you unlock achievements
                    </p>
                  </div>
                  <Switch
                    checked={settings?.achievementAlerts ?? true}
                    onCheckedChange={(checked) => handleSettingToggle("achievementAlerts", checked)}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Push Notifications</CardTitle>
                <CardDescription>
                  Manage your push notification preferences
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Push Notifications</p>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">
                      Receive push notifications on this device
                    </p>
                  </div>
                  <Switch
                    checked={settings?.pushNotifications ?? false}
                    onCheckedChange={(checked) => handleSettingToggle("pushNotifications", checked)}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Streak Reminders</p>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">
                      Daily reminders to maintain your streak
                    </p>
                  </div>
                  <Switch
                    checked={settings?.streakReminders ?? true}
                    onCheckedChange={(checked) => handleSettingToggle("streakReminders", checked)}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Practice Reminders</p>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">
                      Reminders to practice your lessons
                    </p>
                  </div>
                  <Switch
                    checked={settings?.practiceReminders ?? true}
                    onCheckedChange={(checked) => handleSettingToggle("practiceReminders", checked)}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Privacy Tab */}
          <TabsContent value="privacy" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Privacy Settings</CardTitle>
                <CardDescription>
                  Control your privacy and data sharing preferences
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Profile Visibility</p>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">
                      Who can see your profile
                    </p>
                  </div>
                  <select 
                    className="p-2 border border-neutral-200 dark:border-neutral-700 rounded-lg bg-background"
                    value={settings?.profileVisibility || "public"}
                    onChange={(e) => handleSettingToggle("profileVisibility", e.target.value)}
                  >
                    <option value="public">Public</option>
                    <option value="friends">Friends Only</option>
                    <option value="private">Private</option>
                  </select>
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Show Progress</p>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">
                      Display your learning progress publicly
                    </p>
                  </div>
                  <Switch
                    checked={settings?.showProgress ?? true}
                    onCheckedChange={(checked) => handleSettingToggle("showProgress", checked)}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Show Streak</p>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">
                      Display your streak on your profile
                    </p>
                  </div>
                  <Switch
                    checked={settings?.showStreak ?? true}
                    onCheckedChange={(checked) => handleSettingToggle("showStreak", checked)}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Data Sharing</p>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">
                      Share anonymized data to improve the platform
                    </p>
                  </div>
                  <Switch
                    checked={settings?.dataSharing ?? false}
                    onCheckedChange={(checked) => handleSettingToggle("dataSharing", checked)}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Account Tab */}
          <TabsContent value="account" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Account Management</CardTitle>
                <CardDescription>
                  Manage your account and data
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-2">Account Statistics</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-3 bg-neutral-100 dark:bg-neutral-800 rounded-lg">
                      <p className="text-2xl font-bold text-primary">{userStats?.xp || user?.xp || 0}</p>
                      <p className="text-xs text-neutral-600 dark:text-neutral-400">Total XP</p>
                    </div>
                    <div className="p-3 bg-neutral-100 dark:bg-neutral-800 rounded-lg">
                      <p className="text-2xl font-bold text-secondary">{userStats?.streak || user?.streak || 0}</p>
                      <p className="text-xs text-neutral-600 dark:text-neutral-400">Day Streak</p>
                    </div>
                    <div className="p-3 bg-neutral-100 dark:bg-neutral-800 rounded-lg">
                      <p className="text-2xl font-bold text-green-600">{userStats?.level || user?.level || 1}</p>
                      <p className="text-xs text-neutral-600 dark:text-neutral-400">Level</p>
                    </div>
                    <div className="p-3 bg-neutral-100 dark:bg-neutral-800 rounded-lg">
                      <p className="text-2xl font-bold text-red-500">{userStats?.hearts || user?.hearts || 5}</p>
                      <p className="text-xs text-neutral-600 dark:text-neutral-400">Hearts</p>
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="space-y-3">
                  <h3 className="font-semibold">Hearts & Progression</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="p-4 rounded-xl border bg-neutral-50 dark:bg-neutral-900/40">
                      <div className="flex items-center gap-2 mb-2">
                        <Heart className="h-5 w-5 text-red-500 fill-red-500" />
                        <p className="font-semibold">Buy Hearts</p>
                      </div>
                      <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-3">
                        Use hearts for continuous lessons after your daily free limit.
                      </p>
                      <Button
                        onClick={() => purchaseHeartsMutation.mutate("small")}
                        disabled={purchaseHeartsMutation.isPending || isConfirmingStripe}
                        className="w-full"
                      >
                        {purchaseHeartsMutation.isPending ? "Processing..." : "Buy 5 Hearts ($0.99)"}
                      </Button>
                    </div>

                    <div className="p-4 rounded-xl border bg-neutral-50 dark:bg-neutral-900/40">
                      <div className="flex items-center gap-2 mb-2">
                        <Crown className="h-5 w-5 text-emerald-600" />
                        <p className="font-semibold">Unlimited Hearts</p>
                      </div>
                      <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-3">
                        {userStats?.unlimitedHearts
                          ? `Active${userStats.premiumExpiresAt ? ` until ${new Date(userStats.premiumExpiresAt).toLocaleDateString()}` : ""}`
                          : "Remove heart limits and keep learning without interruptions."}
                      </p>
                      <Button
                        onClick={() => purchaseUnlimitedMutation.mutate("monthly")}
                        disabled={
                          purchaseUnlimitedMutation.isPending ||
                          isConfirmingStripe ||
                          !!userStats?.unlimitedHearts
                        }
                        className="w-full bg-emerald-600 hover:bg-emerald-700"
                      >
                        {purchaseUnlimitedMutation.isPending
                          ? "Processing..."
                          : userStats?.unlimitedHearts
                          ? "Unlimited Hearts Active"
                          : "Activate ($9.99/mo)"}
                      </Button>
                    </div>
                  </div>
                  <p className="text-xs text-neutral-500">
                    Daily free lessons: {userStats?.freeLessonsPerDay ?? 0} • completed today: {userStats?.lessonsCompletedToday ?? 0} • remaining free: {userStats?.remainingFreeLessons ?? 0}
                  </p>
                </div>

                <Separator />

                <div>
                  <h3 className="font-semibold mb-2 text-destructive">Danger Zone</h3>
                  <div className="p-4 border-2 border-destructive/20 rounded-lg bg-destructive/5">
                    <p className="text-sm mb-3">
                      Once you delete your account, there is no going back. Please be certain.
                    </p>
                    <Button 
                      variant="destructive" 
                      onClick={handleDeleteAccount}
                      className="w-full md:w-auto"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete Account
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
