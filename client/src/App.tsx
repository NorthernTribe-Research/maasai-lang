import { Switch, Route } from "wouter";
import React, { Suspense, lazy } from "react";
import { Loader2 } from "lucide-react";
import { ProtectedRoute } from "./lib/protected-route";
import { AdminProtectedRoute } from "./lib/admin-protected-route";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";

// Lazy load page components
const Dashboard = lazy(() => import("@/pages/dashboard"));
const Lessons = lazy(() => import("@/pages/lessons"));
const LessonDetail = lazy(() => import("@/pages/lesson-detail"));
const Practice = lazy(() => import("@/pages/practice"));
const Leaderboard = lazy(() => import("@/pages/leaderboard"));
const Achievements = lazy(() => import("@/pages/achievements"));
const Profile = lazy(() => import("@/pages/profile"));
const AILearning = lazy(() => import("@/pages/ai-learning"));
const AITeacher = lazy(() => import("@/pages/ai-teacher"));

// Admin pages
const AdminDashboard = lazy(() => import("@/pages/admin"));
const AdminLessons = lazy(() => import("@/pages/admin/lessons"));

// Loading component for suspense fallback
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen">
    <Loader2 className="h-10 w-10 animate-spin text-primary" />
  </div>
);

function Router() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Switch>
        <Route path="/auth" component={AuthPage} />
        
        {/* User routes */}
        <ProtectedRoute path="/" component={Dashboard} />
        <ProtectedRoute path="/lessons" component={Lessons} />
        <ProtectedRoute path="/lessons/:id" component={LessonDetail} />
        <ProtectedRoute path="/practice" component={Practice} />
        <ProtectedRoute path="/leaderboard" component={Leaderboard} />
        <ProtectedRoute path="/achievements" component={Achievements} />
        <ProtectedRoute path="/profile" component={Profile} />
        <ProtectedRoute path="/ai-learning" component={AILearning} />
        <ProtectedRoute path="/ai-teacher" component={AITeacher} />
        
        {/* Admin routes */}
        <AdminProtectedRoute path="/admin" component={AdminDashboard} />
        <AdminProtectedRoute path="/admin/lessons" component={AdminLessons} />
        
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

export default function App() {
  return (
    <Router />
  );
}
