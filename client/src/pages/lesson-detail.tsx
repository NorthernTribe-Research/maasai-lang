import { useEffect, useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { LessonInterface, type Exercise } from "@/components/duolingo";
import LessonViewer from "@/components/learning/LessonViewer";
import { DuolingoHeader } from "@/components/duolingo/DuolingoHeader";
import { BottomNav } from "@/components/duolingo/BottomNav";
import { useToast } from "@/hooks/use-toast";
import { playLevelUpSound } from "@/lib/sounds";
import { LoadingState } from "@/components/ui/loading-state";
import {
  flushQueuedLessonCompletions,
  getOfflineLegacyLessonPackage,
  isLikelyNetworkError,
  queueLegacyLessonCompletion,
  saveOfflineLegacyLessonPackage,
  type OfflineLegacyLessonPackage,
} from "@/lib/offline-lessons";

const EXERCISE_GENERATION_TIMEOUT_MS = 8500;

interface LessonAccessInfo {
  canStart: boolean;
  reason: string;
  accessMode: "free" | "hearts" | "unlimited" | "blocked";
  heartsRequired: number;
  hearts?: number;
  freeLessonsPerDay?: number;
  lessonsCompletedToday?: number;
  remainingFreeLessons?: number;
  nextFreeLessonAt?: string | null;
  message?: string;
}

interface LegacyLessonSummary {
  id: number;
  title: string;
  description?: string | null;
  icon?: string | null;
  xpReward?: number | null;
  duration?: number | null;
  level?: number | null;
}

interface ExerciseLoadResult {
  exercises: Exercise[];
  source: "online" | "offline";
}

interface StripeConfirmResponse {
  checkoutType?: "hearts_package" | "unlimited_hearts_subscription";
  message?: string;
  heartsAdded?: number;
}

function extractApiErrorMessage(error: unknown): string {
  if (!(error instanceof Error)) {
    return "Request failed";
  }

  const raw = error.message || "Request failed";
  const jsonStart = raw.indexOf("{");
  if (jsonStart >= 0) {
    try {
      const parsed = JSON.parse(raw.slice(jsonStart));
      if (typeof parsed?.message === "string" && parsed.message.length > 0) {
        return parsed.message;
      }
    } catch {
      // Ignore parse errors and fall back to raw message.
    }
  }

  return raw.replace(/^\d+:\s*/, "");
}

async function readJsonOrThrow(response: Response): Promise<any> {
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(payload?.error || payload?.message || "Request failed");
  }
  return payload;
}

async function fetchLegacyLessonExercises(lessonId: number): Promise<Exercise[]> {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), EXERCISE_GENERATION_TIMEOUT_MS);

  try {
    const res = await fetch(`/api/user/lessons/${lessonId}/exercises`, {
      signal: controller.signal,
      credentials: "include",
    });

    if (!res.ok) {
      const errorPayload = await res.json().catch(() => null);
      throw new Error(errorPayload?.message || "Failed to fetch exercises");
    }

    const payload = await res.json();
    if (!Array.isArray(payload)) {
      throw new Error("Unexpected exercise format from server");
    }
    return payload as Exercise[];
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error("Lesson generation took too long. Please retry.");
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}


export default function LessonDetail() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [started, setStarted] = useState(false);
  const [isOnline, setIsOnline] = useState<boolean>(() => {
    if (typeof window === "undefined") {
      return true;
    }
    return window.navigator.onLine;
  });
  const [offlinePackage, setOfflinePackage] = useState<OfflineLegacyLessonPackage | null>(null);
  const [isConfirmingStripe, setIsConfirmingStripe] = useState(false);
  const isAILessonId = !!id && id.includes("-");

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

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

  // AI lesson flow uses enhanced lessons + profile-based completion endpoint.
  const {
    data: profiles,
    isLoading: isLoadingProfiles,
    error: profilesError,
  } = useQuery<any[]>({
    queryKey: ["/api/profiles"],
    queryFn: async () => {
      const res = await fetch("/api/profiles");
      if (!res.ok) throw new Error("Failed to fetch profiles");
      return res.json();
    },
    enabled: !!user && isAILessonId,
  });

  const activeProfileId = profiles?.[0]?.id as string | undefined;
  const lessonAccessProfileId = isAILessonId ? activeProfileId : undefined;

  const {
    data: lessonAccess,
    isLoading: isLoadingLessonAccess,
    refetch: refetchLessonAccess,
  } = useQuery<LessonAccessInfo>({
    queryKey: ["/api/learning-path/lesson-access", id, lessonAccessProfileId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (lessonAccessProfileId) {
        params.set("profileId", lessonAccessProfileId);
      }

      const query = params.toString();
      const res = await fetch(`/api/learning-path/lesson-access/${id}${query ? `?${query}` : ""}`, {
        credentials: "include",
      });
      const payload = await res.json().catch(() => null);

      if (!res.ok) {
        return {
          canStart: false,
          reason: payload?.reason || "blocked",
          accessMode: payload?.accessMode || "blocked",
          heartsRequired: payload?.heartsRequired || 0,
          hearts: payload?.hearts,
          freeLessonsPerDay: payload?.freeLessonsPerDay,
          lessonsCompletedToday: payload?.lessonsCompletedToday,
          remainingFreeLessons: payload?.remainingFreeLessons,
          nextFreeLessonAt: payload?.nextFreeLessonAt || null,
          message: payload?.message || "Lesson unavailable right now.",
        } satisfies LessonAccessInfo;
      }

      return payload as LessonAccessInfo;
    },
    enabled: !!user && !!id && (!isAILessonId || !!activeProfileId),
    retry: false,
  });

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
      refetchLessonAccess();
      toast({
        title: result.checkoutType === "hearts_package" ? "Hearts purchased" : "Unlimited hearts activated",
        description: result.message || "Payment confirmed successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Payment confirmation failed",
        description: extractApiErrorMessage(error),
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
        body: JSON.stringify({
          packageId,
          returnPath: id ? `/lessons/${id}` : "/lessons",
        }),
      });

      return readJsonOrThrow(response);
    },
    onSuccess: (result: any) => {
      if (result?.checkoutRequired && result?.checkoutUrl) {
        window.location.assign(result.checkoutUrl);
        return;
      }

      toast({
        title: "Hearts purchased",
        description: result?.message || "Hearts added to your account.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/user-stats/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      refetchLessonAccess();
    },
    onError: (error: Error) => {
      toast({
        title: "Purchase failed",
        description: extractApiErrorMessage(error),
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
        body: JSON.stringify({
          plan,
          returnPath: id ? `/lessons/${id}` : "/lessons",
        }),
      });

      return readJsonOrThrow(response);
    },
    onSuccess: (result: any) => {
      if (result?.checkoutRequired && result?.checkoutUrl) {
        window.location.assign(result.checkoutUrl);
        return;
      }

      toast({
        title: "Unlimited hearts activated",
        description: result?.message || "Subscription is active.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/user-stats/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      refetchLessonAccess();
    },
    onError: (error: Error) => {
      toast({
        title: "Subscription failed",
        description: extractApiErrorMessage(error),
        variant: "destructive",
      });
    },
  });

  const renderLessonBlockedScreen = (title: string) => (
    <div className="min-h-screen bg-gradient-to-b from-primary/10 to-white dark:from-gray-900 dark:to-gray-800 pb-20">
      <DuolingoHeader />
      <main className="max-w-lg mx-auto px-4 pt-12">
        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl p-8 text-center space-y-4">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{title}</h1>
          <p className="text-gray-600 dark:text-gray-400">
            {lessonAccess?.message || "Daily free lessons are finished for today."}
          </p>

          <div className="rounded-xl bg-primary/5 p-4 text-sm text-gray-700 dark:text-gray-300 space-y-1">
            <p>Free lessons today: {lessonAccess?.freeLessonsPerDay ?? "—"}</p>
            <p>Completed today: {lessonAccess?.lessonsCompletedToday ?? "—"}</p>
            <p>Hearts balance: {lessonAccess?.hearts ?? "—"}</p>
            {lessonAccess?.nextFreeLessonAt && (
              <p>Free unlock: {new Date(lessonAccess.nextFreeLessonAt).toLocaleString()}</p>
            )}
          </div>

          <button
            onClick={() => purchaseHeartsMutation.mutate("small")}
            disabled={purchaseHeartsMutation.isPending || isConfirmingStripe}
            className="w-full py-3 bg-red-500 hover:bg-red-600 disabled:opacity-60 text-white rounded-xl font-semibold"
          >
            {purchaseHeartsMutation.isPending ? "Processing..." : "Buy 5 Hearts ($0.99)"}
          </button>

          <button
            onClick={() => purchaseUnlimitedMutation.mutate("monthly")}
            disabled={purchaseUnlimitedMutation.isPending || isConfirmingStripe}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white rounded-xl font-semibold"
          >
            {purchaseUnlimitedMutation.isPending ? "Processing..." : "Activate Unlimited Hearts ($9.99/mo)"}
          </button>

          <button
            onClick={() => navigate("/")}
            className="text-gray-500 dark:text-gray-400 hover:underline text-sm"
          >
            ← Back to Learning Path
          </button>
        </div>
      </main>
      <BottomNav />
    </div>
  );

  if (isConfirmingStripe || confirmStripeCheckoutMutation.isPending) {
    return (
      <LoadingState
        fullScreen
        title="Finalizing payment..."
        description="Confirming your checkout so you can continue learning."
      />
    );
  }

  if (isAILessonId) {
    if (isLoadingProfiles) {
      return (
        <LoadingState
          fullScreen
          title="Preparing AI lesson..."
          description="Loading your active learning profile."
        />
      );
    }

    if (profilesError) {
      return (
        <div className="min-h-screen bg-gradient-to-b from-primary/10 to-white dark:from-gray-900 dark:to-gray-800 pb-20">
          <DuolingoHeader />
          <main className="max-w-2xl mx-auto px-4 pt-12">
            <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl p-8 text-center space-y-4">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Could not load profile</h1>
              <p className="text-gray-600 dark:text-gray-400">
                Please refresh and try opening this lesson again.
              </p>
              <button
                onClick={() => window.location.reload()}
                className="w-full py-3 bg-primary hover:bg-primary/90 text-white rounded-xl font-semibold"
              >
                Try Again
              </button>
              <button
                onClick={() => navigate("/")}
                className="text-gray-500 dark:text-gray-400 hover:underline text-sm"
              >
                ← Back to Learning Path
              </button>
            </div>
          </main>
          <BottomNav />
        </div>
      );
    }

    if (!activeProfileId) {
      return (
        <div className="min-h-screen bg-gradient-to-b from-primary/10 to-white dark:from-gray-900 dark:to-gray-800 pb-20">
          <DuolingoHeader />
          <main className="max-w-2xl mx-auto px-4 pt-12">
            <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl p-8 text-center space-y-4">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">No learning profile found</h1>
              <p className="text-gray-600 dark:text-gray-400">
                Create a profile first to access AI-powered lessons.
              </p>
              <button
                onClick={() => navigate("/")}
                className="text-gray-500 dark:text-gray-400 hover:underline text-sm"
              >
                ← Back to Learning Path
              </button>
            </div>
          </main>
          <BottomNav />
        </div>
      );
    }

    if (isLoadingLessonAccess) {
      return (
        <LoadingState
          fullScreen
          title="Checking lesson access..."
          description="Applying your daily progression rules."
        />
      );
    }

    if (lessonAccess && !lessonAccess.canStart) {
      return renderLessonBlockedScreen("Lesson Access Paused");
    }

    return (
      <div className="min-h-screen bg-gradient-to-b from-primary/10 to-white dark:from-gray-900 dark:to-gray-800 pb-20">
        <DuolingoHeader />
        <main className="max-w-4xl mx-auto px-4 pt-8">
          <LessonViewer
            lessonId={id!}
            profileId={activeProfileId}
            onComplete={(xpAwarded) => {
              if (xpAwarded > 0) {
                playLevelUpSound();
                toast({
                  title: "Lesson Complete! 🎉",
                  description: `Great work! You earned ${xpAwarded} XP.`,
                });
              } else {
                toast({
                  title: "Lesson saved offline",
                  description: "Your completion is queued and will sync when you're online.",
                });
              }
              queryClient.invalidateQueries({ queryKey: ["/api/learning-path"] });
              queryClient.invalidateQueries({ queryKey: ["/api/user-stats/stats"] });
              queryClient.invalidateQueries({ queryKey: ["/api/profiles"] });
              queryClient.invalidateQueries({ queryKey: ["/api/lessons/next"] });
              setTimeout(() => navigate("/"), 500);
            }}
          />
        </main>
        <BottomNav />
      </div>
    );
  }

  // Try to fetch lesson info from the user's enrolled language
  const { data: userLanguages, isLoading: isLoadingUserLanguages } = useQuery({
    queryKey: ["/api/user/languages"],
    queryFn: async () => {
      const res = await fetch("/api/user/languages");
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    enabled: !!user,
  });

  // Get the language ID from the first enrollment
  const primaryLanguageId = userLanguages?.[0]?.languageId || userLanguages?.[0]?.language?.id;

  // Fetch lessons for the language
  const {
    data: allLessons,
    isLoading: isLoadingLessons,
    error: lessonsError,
  } = useQuery({
    queryKey: ["/api/languages", primaryLanguageId, "lessons"],
    queryFn: async () => {
      const res = await fetch(`/api/languages/${primaryLanguageId}/lessons`);
      if (!res.ok) throw new Error("Failed to fetch lessons");
      return res.json();
    },
    enabled: !!primaryLanguageId,
  });

  const lesson = allLessons?.find((l: LegacyLessonSummary) => l.id === parseInt(id!, 10)) as
    | LegacyLessonSummary
    | undefined;

  useEffect(() => {
    if (!lesson?.id) {
      setOfflinePackage(null);
      return;
    }
    setOfflinePackage(getOfflineLegacyLessonPackage(lesson.id));
  }, [lesson?.id]);

  const downloadLessonMutation = useMutation<number, Error, void>({
    mutationFn: async () => {
      if (!lesson) {
        throw new Error("Lesson is not available for download.");
      }
      if (!isOnline) {
        throw new Error("Connect to the internet to download this lesson.");
      }

      const downloadedExercises = await fetchLegacyLessonExercises(lesson.id);
      saveOfflineLegacyLessonPackage({
        lessonId: lesson.id,
        downloadedAt: new Date().toISOString(),
        lesson: {
          id: lesson.id,
          title: lesson.title,
          description: lesson.description,
          icon: lesson.icon,
          xpReward: lesson.xpReward,
          duration: lesson.duration,
          level: lesson.level,
        },
        exercises: downloadedExercises,
      });

      return downloadedExercises.length;
    },
    onSuccess: (exerciseCount) => {
      if (lesson) {
        setOfflinePackage(getOfflineLegacyLessonPackage(lesson.id));
      }

      toast({
        title: "Lesson downloaded",
        description: `Saved ${exerciseCount} exercises for offline practice.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Download failed",
        description: extractApiErrorMessage(error),
        variant: "destructive",
      });
    },
  });

  // Fetch AI exercises for the lesson once started
  const {
    data: exercisePayload,
    isLoading: isLoadingExercises,
    error: exercisesError,
    refetch: refetchExercises,
    isFetching: isFetchingExercises,
  } = useQuery<ExerciseLoadResult>({
    queryKey: ["/api/user/lessons", lesson?.id, "exercises", started, isOnline],
    queryFn: async () => {
      if (!lesson) {
        throw new Error("Lesson is not available.");
      }

      const cachedPackage = getOfflineLegacyLessonPackage(lesson.id);
      if (!isOnline) {
        if (cachedPackage) {
          return { exercises: cachedPackage.exercises, source: "offline" };
        }
        throw new Error("You're offline. Download this lesson first to keep learning without internet.");
      }

      try {
        const generatedExercises = await fetchLegacyLessonExercises(lesson.id);
        saveOfflineLegacyLessonPackage({
          lessonId: lesson.id,
          downloadedAt: new Date().toISOString(),
          lesson: {
            id: lesson.id,
            title: lesson.title,
            description: lesson.description,
            icon: lesson.icon,
            xpReward: lesson.xpReward,
            duration: lesson.duration,
            level: lesson.level,
          },
          exercises: generatedExercises,
        });
        return { exercises: generatedExercises, source: "online" };
      } catch (error) {
        if (cachedPackage && isLikelyNetworkError(error)) {
          return { exercises: cachedPackage.exercises, source: "offline" };
        }
        throw error;
      }
    },
    enabled: !!lesson && started,
    retry: false,
    staleTime: 5 * 60 * 1000,
    gcTime: 20 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
  });

  const exercises = exercisePayload?.exercises;

  useEffect(() => {
    if (exercisePayload?.source === "online" && lesson?.id) {
      setOfflinePackage(getOfflineLegacyLessonPackage(lesson.id));
    }
  }, [exercisePayload?.source, lesson?.id]);

  // Complete lesson mutation
  const completeLessonMutation = useMutation({
    mutationFn: async (lessonId: number) => {
      const res = await apiRequest("PATCH", `/api/user/lessons/${lessonId}`, { progress: 100 });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/learning-path"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user-stats/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/languages"] });
    },
  });

  const handleComplete = async () => {
    if (!lesson) {
      return;
    }

    const queueCompletionAndExit = () => {
      queueLegacyLessonCompletion({ lessonId: lesson.id, progress: 100 });
      toast({
        title: "Lesson saved offline",
        description: "Completion queued. We'll sync it when you're back online.",
      });
      setTimeout(() => navigate("/"), 500);
    };

    if (!isOnline) {
      queueCompletionAndExit();
      return;
    }

    try {
      await completeLessonMutation.mutateAsync(lesson.id);
      const syncResult = await flushQueuedLessonCompletions();

      toast({
        title: "Lesson Complete! 🎉",
        description: "Great job! Keep up the learning streak!",
      });

      if (syncResult.synced > 0) {
        toast({
          title: "Offline progress synced",
          description: `Synced ${syncResult.synced} queued completion${syncResult.synced === 1 ? "" : "s"}.`,
        });
      }

      queryClient.invalidateQueries({ queryKey: ["/api/learning-path/lesson-access", id, lessonAccessProfileId] });
      setTimeout(() => navigate("/"), 500);
    } catch (error) {
      if (isLikelyNetworkError(error)) {
        queueCompletionAndExit();
        return;
      }

      toast({
        title: "Lesson cannot be completed yet",
        description: extractApiErrorMessage(error),
        variant: "destructive",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/user-stats/stats"] });
      refetchLessonAccess();
      setStarted(false);
    }
  };

  const handleExit = () => {
    navigate("/");
  };

  if (isLoadingUserLanguages || isLoadingLessons) {
    return (
      <LoadingState
        fullScreen
        title="Loading lesson..."
        description="Preparing your lesson details."
      />
    );
  }

  if (!isAILessonId && !started && isLoadingLessonAccess) {
    return (
      <LoadingState
        fullScreen
        title="Checking lesson access..."
        description="Applying your daily progression rules."
      />
    );
  }

  if (lessonsError) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-primary/10 to-white dark:from-gray-900 dark:to-gray-800 pb-20">
        <DuolingoHeader />
        <main className="max-w-lg mx-auto px-4 pt-12">
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl p-8 text-center space-y-4">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Could not load lesson</h1>
            <p className="text-gray-600 dark:text-gray-400">
              We could not fetch lesson details right now.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="w-full py-3 bg-primary hover:bg-primary/90 text-white rounded-xl font-semibold"
            >
              Try Again
            </button>
            <button
              onClick={() => navigate("/")}
              className="text-gray-500 dark:text-gray-400 hover:underline text-sm"
            >
              ← Back to Learning Path
            </button>
          </div>
        </main>
        <BottomNav />
      </div>
    );
  }

  if (!lesson) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-primary/10 to-white dark:from-gray-900 dark:to-gray-800 pb-20">
        <DuolingoHeader />
        <main className="max-w-lg mx-auto px-4 pt-12">
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl p-8 text-center space-y-4">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Lesson not found</h1>
            <p className="text-gray-600 dark:text-gray-400">
              This lesson may have been removed or your path has changed.
            </p>
            <button
              onClick={() => navigate("/")}
              className="w-full py-3 bg-primary hover:bg-primary/90 text-white rounded-xl font-semibold"
            >
              Back to Learning Path
            </button>
          </div>
        </main>
        <BottomNav />
      </div>
    );
  }

  // If not started, show lesson info
  if (!started) {
    if (lessonAccess && !lessonAccess.canStart) {
      return renderLessonBlockedScreen("Daily Lesson Limit Reached");
    }

    const requiresHeartsToContinue = lessonAccess?.accessMode === "hearts";
    const hasUnlimitedHearts = lessonAccess?.accessMode === "unlimited";
    const hasOfflineCopy = !!offlinePackage;
    const canStartLesson = isOnline || hasOfflineCopy;

    return (
      <div className="min-h-screen bg-gradient-to-b from-primary/10 to-white dark:from-gray-900 dark:to-gray-800 pb-20">
        <DuolingoHeader />
        <main className="max-w-lg mx-auto px-4 pt-12">
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl p-8 text-center space-y-6">
            <div className="w-20 h-20 mx-auto bg-primary/10 rounded-full flex items-center justify-center text-4xl">
              {lesson.icon || "📚"}
            </div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              {lesson.title}
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              {lesson.description || "Complete this lesson to earn XP!"}
            </p>
            <div className="flex justify-center gap-6 text-sm text-gray-500 dark:text-gray-400">
              <div className="flex items-center gap-1">
                <span>⚡</span>
                <span>{lesson.xpReward} XP</span>
              </div>
              <div className="flex items-center gap-1">
                <span>⏱</span>
                <span>{lesson.duration || 10} min</span>
              </div>
              <div className="flex items-center gap-1">
                <span>📊</span>
                <span>Level {lesson.level}</span>
              </div>
            </div>

            {requiresHeartsToContinue && (
              <div className="rounded-xl bg-red-50 dark:bg-red-950/30 p-3 text-sm text-red-700 dark:text-red-300">
                This lesson will cost {lessonAccess?.heartsRequired || 1} ❤️ when completed today.
              </div>
            )}

            {hasUnlimitedHearts && (
              <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/30 p-3 text-sm text-emerald-700 dark:text-emerald-300">
                Unlimited hearts active. Continue as much as you want today.
              </div>
            )}

            <div className="rounded-xl bg-cyan-50 dark:bg-cyan-950/30 p-3 text-sm text-cyan-800 dark:text-cyan-200">
              {hasOfflineCopy ? (
                <>
                  Offline copy ready.
                  {offlinePackage?.downloadedAt
                    ? ` Downloaded ${new Date(offlinePackage.downloadedAt).toLocaleString()}.`
                    : ""}
                </>
              ) : (
                "Download this lesson now to study later without internet."
              )}
            </div>

            <button
              onClick={() => downloadLessonMutation.mutate()}
              disabled={downloadLessonMutation.isPending || !isOnline}
              className="w-full py-3 border border-cyan-500 text-cyan-700 dark:text-cyan-300 hover:bg-cyan-50 dark:hover:bg-cyan-950/30 disabled:opacity-60 rounded-2xl font-semibold"
            >
              {downloadLessonMutation.isPending
                ? "Downloading offline lesson..."
                : hasOfflineCopy
                ? "Refresh Offline Download"
                : "Download for Offline"}
            </button>

            {!isOnline && !hasOfflineCopy && (
              <div className="rounded-xl bg-amber-50 dark:bg-amber-950/30 p-3 text-sm text-amber-800 dark:text-amber-200">
                You're offline and this lesson is not downloaded yet.
              </div>
            )}

            <button
              onClick={() => setStarted(true)}
              disabled={!canStartLesson}
              className="w-full py-4 bg-primary hover:bg-primary/90 disabled:opacity-60 text-white rounded-2xl font-bold text-lg shadow-lg transition-all hover:shadow-xl"
            >
              {requiresHeartsToContinue
                ? `Start Lesson (${lessonAccess?.heartsRequired || 1} ❤️ on completion)`
                : "Start Lesson"}
            </button>
            <button
              onClick={() => navigate("/")}
              className="text-gray-500 dark:text-gray-400 hover:underline text-sm"
            >
              ← Back to Learning Path
            </button>
          </div>
        </main>
        <BottomNav />
      </div>
    );
  }

  // If generating exercises, show loading
  if (started && !exercises && (isLoadingExercises || isFetchingExercises)) {
    return (
      <LoadingState
        fullScreen
        title={isOnline ? "Generating personalized lesson..." : "Opening downloaded lesson..."}
        description={
          isOnline
            ? "Our AI is designing exercises just for you. This usually takes a few seconds."
            : "Using your saved exercises so you can keep learning offline."
        }
      />
    );
  }

  if (started && exercisesError) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-primary/10 to-white dark:from-gray-900 dark:to-gray-800 pb-20">
        <DuolingoHeader />
        <main className="max-w-lg mx-auto px-4 pt-12">
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl p-8 text-center space-y-4">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {isOnline ? "Could not generate exercises" : "Offline lesson unavailable"}
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              {(exercisesError as Error).message || "Please retry to continue the lesson."}
            </p>
            <button
              onClick={() => refetchExercises()}
              className="w-full py-3 bg-primary hover:bg-primary/90 text-white rounded-xl font-semibold"
            >
              {isOnline ? "Retry Generation" : "Try Again"}
            </button>
            <button
              onClick={() => setStarted(false)}
              className="text-gray-500 dark:text-gray-400 hover:underline text-sm"
            >
              ← Back to lesson details
            </button>
          </div>
        </main>
        <BottomNav />
      </div>
    );
  }

  if (started && (!exercises || exercises.length === 0)) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-primary/10 to-white dark:from-gray-900 dark:to-gray-800 pb-20">
        <DuolingoHeader />
        <main className="max-w-lg mx-auto px-4 pt-12">
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl p-8 text-center space-y-4">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">No exercises generated yet</h1>
            <p className="text-gray-600 dark:text-gray-400">
              We did not receive exercises this time. Try generating again.
            </p>
            <button
              onClick={() => refetchExercises()}
              className="w-full py-3 bg-primary hover:bg-primary/90 text-white rounded-xl font-semibold"
            >
              Generate Again
            </button>
            <button
              onClick={() => setStarted(false)}
              className="text-gray-500 dark:text-gray-400 hover:underline text-sm"
            >
              ← Back to lesson details
            </button>
          </div>
        </main>
        <BottomNav />
      </div>
    );
  }

  return (
    <LessonInterface
      lessonId={String(lesson.id)}
      exercises={exercises ?? []}
      onComplete={handleComplete}
      onExit={handleExit}
    />
  );
}
