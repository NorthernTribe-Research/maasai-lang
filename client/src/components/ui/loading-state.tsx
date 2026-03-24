import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface LoadingStateProps {
  title?: string;
  description?: string;
  fullScreen?: boolean;
  className?: string;
  compact?: boolean;
  showProgress?: boolean;
}

export function LoadingState({
  title = "Loading...",
  description = "Preparing your learning experience.",
  fullScreen = false,
  className,
  compact = false,
  showProgress = true,
}: LoadingStateProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        fullScreen
          ? "min-h-screen flex items-center justify-center bg-gradient-to-b from-primary/10 via-background to-background px-4"
          : "flex items-center justify-center py-10 px-4",
        className,
      )}
    >
      <div
        className={cn(
          "w-full rounded-3xl border border-primary/20 bg-white/85 dark:bg-slate-900/80 backdrop-blur-sm shadow-lg text-center",
          compact ? "max-w-sm px-5 py-6" : "max-w-md px-6 py-8",
        )}
      >
        <div className="relative mx-auto mb-4 flex h-16 w-16 items-center justify-center">
          <div className="absolute h-16 w-16 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
          <div className="absolute h-12 w-12 rounded-full border border-primary/20" />
          <div className="relative h-10 w-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-black text-lg">
            L
          </div>
          <Sparkles className="absolute -right-1 -top-1 h-4 w-4 text-yellow-500 animate-pulse" />
        </div>

        <h2 className={cn("font-bold text-foreground", compact ? "text-lg" : "text-2xl")}>
          {title}
        </h2>
        <p className={cn("text-muted-foreground mt-2", compact ? "text-sm" : "text-base")}>
          {description}
        </p>

        <div className="mt-4 flex justify-center gap-2" aria-hidden="true">
          <span className="h-2.5 w-2.5 rounded-full bg-primary animate-bounce" />
          <span
            className="h-2.5 w-2.5 rounded-full bg-primary animate-bounce"
            style={{ animationDelay: "120ms" }}
          />
          <span
            className="h-2.5 w-2.5 rounded-full bg-primary animate-bounce"
            style={{ animationDelay: "240ms" }}
          />
        </div>

        {showProgress && (
          <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-primary/10" aria-hidden="true">
            <div className="h-full w-2/5 rounded-full bg-gradient-to-r from-primary/60 via-primary to-primary/60 animate-loading-progress" />
          </div>
        )}
      </div>
    </div>
  );
}
