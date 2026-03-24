import { useAuth } from "@/hooks/use-auth";
import { ComponentType, ReactNode } from "react";
import { Redirect, useLocation } from "wouter";
import { LoadingState } from "@/components/ui/loading-state";

interface AdminProtectedRouteProps {
  component: ComponentType<any>;
  path?: string;
  children?: ReactNode;
}

/**
 * A route wrapper that redirects to the login page if the user is not authenticated
 * or to the dashboard if the user is not an admin
 */
export function AdminProtectedRoute({
  component: Component,
  ...rest
}: AdminProtectedRouteProps) {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  if (isLoading) {
    return (
      <LoadingState
        fullScreen
        compact
        title="Loading admin..."
        description="Checking your access."
      />
    );
  }

  if (!user) {
    return <Redirect to="/auth" />;
  }

  if (!user.isAdmin) {
    return <Redirect to="/" />;
  }

  return <Component {...rest} />;
}
