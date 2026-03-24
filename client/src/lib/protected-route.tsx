import { useAuth } from "@/hooks/use-auth";
import { LoadingState } from "@/components/ui/loading-state";
import { Redirect, Route } from "wouter";

export function ProtectedRoute({
  path,
  component: Component,
}: {
  path: string;
  component: React.ComponentType<any>;
}) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <Route path={path}>
        <LoadingState
          fullScreen
          compact
          title="Signing you in..."
          description="Syncing your progress."
        />
      </Route>
    );
  }

  if (!user) {
    return (
      <Route path={path}>
        <Redirect to="/landing" />
      </Route>
    );
  }

  return <Route path={path} component={Component} />;
}
