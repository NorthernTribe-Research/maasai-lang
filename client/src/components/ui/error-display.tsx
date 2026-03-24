import { AlertCircle, RefreshCw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface ErrorDisplayProps {
  title?: string;
  message: string;
  error?: Error;
  onRetry?: () => void;
  onGoHome?: () => void;
  variant?: "card" | "alert" | "inline";
  showDetails?: boolean;
}

export function ErrorDisplay({
  title = "Something went wrong",
  message,
  error,
  onRetry,
  onGoHome,
  variant = "card",
  showDetails = false,
}: ErrorDisplayProps) {
  const errorDetails = error?.message || error?.toString();

  if (variant === "alert") {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>{title}</AlertTitle>
        <AlertDescription className="space-y-2">
          <p>{message}</p>
          {showDetails && errorDetails && (
            <p className="text-xs font-mono bg-destructive/10 p-2 rounded">
              {errorDetails}
            </p>
          )}
          {(onRetry || onGoHome) && (
            <div className="flex gap-2 mt-3">
              {onRetry && (
                <Button size="sm" variant="outline" onClick={onRetry}>
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Try Again
                </Button>
              )}
              {onGoHome && (
                <Button size="sm" variant="outline" onClick={onGoHome}>
                  <Home className="h-3 w-3 mr-1" />
                  Go Home
                </Button>
              )}
            </div>
          )}
        </AlertDescription>
      </Alert>
    );
  }

  if (variant === "inline") {
    return (
      <div className="flex items-start gap-3 p-4 border border-destructive/50 bg-destructive/10 rounded-lg">
        <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
        <div className="flex-1 space-y-2">
          <div>
            <p className="font-semibold text-sm">{title}</p>
            <p className="text-sm text-muted-foreground">{message}</p>
          </div>
          {showDetails && errorDetails && (
            <p className="text-xs font-mono bg-background/50 p-2 rounded border">
              {errorDetails}
            </p>
          )}
          {(onRetry || onGoHome) && (
            <div className="flex gap-2">
              {onRetry && (
                <Button size="sm" variant="outline" onClick={onRetry}>
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Try Again
                </Button>
              )}
              {onGoHome && (
                <Button size="sm" variant="outline" onClick={onGoHome}>
                  <Home className="h-3 w-3 mr-1" />
                  Go Home
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Default: card variant
  return (
    <Card className="border-destructive/50">
      <CardHeader>
        <div className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-destructive" />
          <CardTitle>{title}</CardTitle>
        </div>
        <CardDescription>{message}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {showDetails && errorDetails && (
          <div className="p-3 bg-muted rounded-lg">
            <p className="text-xs font-semibold mb-1">Error Details:</p>
            <p className="text-xs font-mono text-muted-foreground break-all">
              {errorDetails}
            </p>
          </div>
        )}
        {(onRetry || onGoHome) && (
          <div className="flex gap-2">
            {onRetry && (
              <Button variant="outline" onClick={onRetry}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
            )}
            {onGoHome && (
              <Button variant="outline" onClick={onGoHome}>
                <Home className="h-4 w-4 mr-2" />
                Go Home
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
