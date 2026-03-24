import { Switch, Route } from "wouter";
import React, { Suspense, lazy, useEffect } from "react";
import { ProtectedRoute } from "./lib/protected-route";
import { AdminProtectedRoute } from "./lib/admin-protected-route";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
import LandingPage from "@/pages/landing";
import { LoadingState } from "@/components/ui/loading-state";
import { queryClient } from "@/lib/queryClient";
import { toast } from "@/hooks/use-toast";
import { flushQueuedLessonCompletions } from "@/lib/offline-lessons";

// Lazy load page components
const Learn = lazy(() => import("@/pages/learn"));
const Dashboard = lazy(() => import("@/pages/dashboard"));
const Lessons = lazy(() => import("@/pages/lessons"));
const LessonDetail = lazy(() => import("@/pages/lesson-detail"));
const Practice = lazy(() => import("@/pages/practice"));
const Leaderboard = lazy(() => import("@/pages/leaderboard"));
const Achievements = lazy(() => import("@/pages/achievements"));
const Profile = lazy(() => import("@/pages/profile"));
const AILearning = lazy(() => import("@/pages/ai-learning"));
const AITeacher = lazy(() => import("@/pages/ai-teacher"));
const Settings = lazy(() => import("@/pages/settings"));
const Progress = lazy(() => import("@/pages/progress"));

// Admin pages
const AdminDashboard = lazy(() => import("@/pages/admin"));
const AdminLessons = lazy(() => import("@/pages/admin/lessons"));

// Loading component for suspense fallback
const PageLoader = () => (
  <LoadingState
    fullScreen
    title="Loading page..."
    description="Setting up your lesson environment."
  />
);

function Router() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Switch>
        <Route path="/landing">
          <LandingPage />
        </Route>
        <Route path="/auth">
          <AuthPage />
        </Route>
        
        {/* User routes */}
        <ProtectedRoute path="/" component={Learn} />
        <ProtectedRoute path="/dashboard" component={Dashboard} />
        <ProtectedRoute path="/lessons" component={Lessons} />
        <ProtectedRoute path="/lessons/:id" component={LessonDetail} />
        <ProtectedRoute path="/practice" component={Practice} />
        <ProtectedRoute path="/leaderboard" component={Leaderboard} />
        <ProtectedRoute path="/achievements" component={Achievements} />
        <ProtectedRoute path="/profile" component={Profile} />
        <ProtectedRoute path="/ai-learning" component={AILearning} />
        <ProtectedRoute path="/ai-teacher" component={AITeacher} />
        <ProtectedRoute path="/settings" component={Settings} />
        <ProtectedRoute path="/progress" component={Progress} />
        
        {/* Admin routes */}
        <AdminProtectedRoute path="/admin" component={AdminDashboard} />
        <AdminProtectedRoute path="/admin/lessons" component={AdminLessons} />
        
        <Route>
          <NotFound />
        </Route>
      </Switch>
    </Suspense>
  );
}

export default function App() {
  useEffect(() => {
    let unmounted = false;

    const syncQueuedCompletions = async () => {
      if (typeof window === "undefined" || !window.navigator.onLine) {
        return;
      }

      const result = await flushQueuedLessonCompletions();
      if (unmounted || result.synced <= 0) {
        return;
      }

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["/api/learning-path"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/user-stats/stats"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/user/languages"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/profiles"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/lessons/next"] }),
      ]);

      toast({
        title: "Offline progress synced",
        description: `Synced ${result.synced} lesson ${result.synced === 1 ? "completion" : "completions"}.`,
      });
    };

    void syncQueuedCompletions();

    const handleOnline = () => {
      void syncQueuedCompletions();
    };

    window.addEventListener("online", handleOnline);

    return () => {
      unmounted = true;
      window.removeEventListener("online", handleOnline);
    };
  }, []);

  return (
    <Router />
  );
}
