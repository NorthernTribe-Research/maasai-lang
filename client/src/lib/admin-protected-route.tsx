import { useAuth } from "@/hooks/use-auth";
import { ComponentType, ReactNode } from "react";
import { Redirect, useLocation } from "wouter";
import { Loader2 } from "lucide-react";

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
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
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