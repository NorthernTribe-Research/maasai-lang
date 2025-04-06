import { Switch, Route } from "wouter";
import { Suspense, lazy } from "react";
import { Loader2 } from "lucide-react";
import { ProtectedRoute } from "./lib/protected-route";
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
        <ProtectedRoute path="/" component={Dashboard} />
        <ProtectedRoute path="/lessons" component={Lessons} />
        <ProtectedRoute path="/lessons/:id" component={LessonDetail} />
        <ProtectedRoute path="/practice" component={Practice} />
        <ProtectedRoute path="/leaderboard" component={Leaderboard} />
        <ProtectedRoute path="/achievements" component={Achievements} />
        <ProtectedRoute path="/profile" component={Profile} />
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

function App() {
  return <Router />;
}

export default App;
