import type { Exercise } from "@/components/duolingo";

const LEGACY_PACKAGES_KEY = "linguamaster.offline.legacy-packages.v1";
const AI_PACKAGES_KEY = "linguamaster.offline.ai-packages.v1";
const COMPLETION_QUEUE_KEY = "linguamaster.offline.completion-queue.v1";

interface LessonSummary {
  id: number;
  title: string;
  description?: string | null;
  icon?: string | null;
  xpReward?: number | null;
  duration?: number | null;
  level?: number | null;
}

export interface OfflineLegacyLessonPackage {
  lessonId: number;
  downloadedAt: string;
  lesson: LessonSummary;
  exercises: Exercise[];
}

export interface OfflineAiLessonPackage<TLesson = unknown> {
  lessonId: string;
  profileId: string;
  downloadedAt: string;
  lesson: TLesson;
}

interface LegacyCompletionQueueItem {
  id: string;
  kind: "legacy";
  lessonId: number;
  progress: number;
  queuedAt: string;
  attempts: number;
  lastError?: string;
}

interface AiCompletionQueueItem {
  id: string;
  kind: "ai";
  lessonId: string;
  profileId: string;
  accuracy: number;
  completionTime: number;
  errorsCount: number;
  errorPatterns: string[];
  queuedAt: string;
  attempts: number;
  lastError?: string;
}

type OfflineCompletionQueueItem = LegacyCompletionQueueItem | AiCompletionQueueItem;

export interface FlushQueuedLessonCompletionsResult {
  attempted: number;
  synced: number;
  failures: number;
  remaining: number;
}

function hasBrowserStorage(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function readJson<T>(key: string, fallback: T): T {
  if (!hasBrowserStorage()) {
    return fallback;
  }

  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) {
      return fallback;
    }

    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown): void {
  if (!hasBrowserStorage()) {
    return;
  }

  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore storage write errors in restricted environments.
  }
}

function getLegacyPackages(): OfflineLegacyLessonPackage[] {
  const raw = readJson<unknown>(LEGACY_PACKAGES_KEY, []);
  if (!Array.isArray(raw)) {
    return [];
  }

  return raw.filter((pkg): pkg is OfflineLegacyLessonPackage => {
    return Boolean(
      pkg &&
      typeof pkg === "object" &&
      typeof (pkg as OfflineLegacyLessonPackage).lessonId === "number" &&
      Array.isArray((pkg as OfflineLegacyLessonPackage).exercises),
    );
  });
}

function setLegacyPackages(packages: OfflineLegacyLessonPackage[]): void {
  writeJson(LEGACY_PACKAGES_KEY, packages);
}

function getAiPackages<TLesson = unknown>(): OfflineAiLessonPackage<TLesson>[] {
  const raw = readJson<unknown>(AI_PACKAGES_KEY, []);
  if (!Array.isArray(raw)) {
    return [];
  }

  return raw.filter((pkg): pkg is OfflineAiLessonPackage<TLesson> => {
    return Boolean(
      pkg &&
      typeof pkg === "object" &&
      typeof (pkg as OfflineAiLessonPackage<TLesson>).lessonId === "string" &&
      typeof (pkg as OfflineAiLessonPackage<TLesson>).profileId === "string",
    );
  });
}

function setAiPackages<TLesson = unknown>(packages: OfflineAiLessonPackage<TLesson>[]): void {
  writeJson(AI_PACKAGES_KEY, packages);
}

function getCompletionQueue(): OfflineCompletionQueueItem[] {
  const raw = readJson<unknown>(COMPLETION_QUEUE_KEY, []);
  if (!Array.isArray(raw)) {
    return [];
  }

  return raw.filter((item): item is OfflineCompletionQueueItem => {
    if (!item || typeof item !== "object") {
      return false;
    }

    const kind = (item as OfflineCompletionQueueItem).kind;
    if (kind === "legacy") {
      return typeof (item as LegacyCompletionQueueItem).lessonId === "number";
    }

    if (kind === "ai") {
      return (
        typeof (item as AiCompletionQueueItem).lessonId === "string" &&
        typeof (item as AiCompletionQueueItem).profileId === "string"
      );
    }

    return false;
  });
}

function setCompletionQueue(queue: OfflineCompletionQueueItem[]): void {
  writeJson(COMPLETION_QUEUE_KEY, queue);
}

export function getOfflineLegacyLessonPackage(lessonId: number): OfflineLegacyLessonPackage | null {
  return getLegacyPackages().find((pkg) => pkg.lessonId === lessonId) ?? null;
}

export function saveOfflineLegacyLessonPackage(pkg: OfflineLegacyLessonPackage): void {
  const packages = getLegacyPackages();
  const filtered = packages.filter((existing) => existing.lessonId !== pkg.lessonId);
  filtered.push(pkg);
  setLegacyPackages(filtered);
}

export function getOfflineAiLessonPackage<TLesson = unknown>(
  lessonId: string,
  profileId: string,
): OfflineAiLessonPackage<TLesson> | null {
  return (
    getAiPackages<TLesson>().find(
      (pkg) => pkg.lessonId === lessonId && pkg.profileId === profileId,
    ) ?? null
  );
}

export function saveOfflineAiLessonPackage<TLesson = unknown>(
  pkg: OfflineAiLessonPackage<TLesson>,
): void {
  const packages = getAiPackages<TLesson>();
  const filtered = packages.filter(
    (existing) => !(existing.lessonId === pkg.lessonId && existing.profileId === pkg.profileId),
  );
  filtered.push(pkg);
  setAiPackages(filtered);
}

export function queueLegacyLessonCompletion(params: { lessonId: number; progress?: number }): void {
  const queue = getCompletionQueue();
  const progress = params.progress ?? 100;
  const existing = queue.find(
    (item): item is LegacyCompletionQueueItem => item.kind === "legacy" && item.lessonId === params.lessonId,
  );

  if (existing) {
    existing.progress = progress;
    existing.queuedAt = new Date().toISOString();
    existing.attempts = 0;
    delete existing.lastError;
    setCompletionQueue(queue);
    return;
  }

  queue.push({
    id: `legacy_${params.lessonId}`,
    kind: "legacy",
    lessonId: params.lessonId,
    progress,
    queuedAt: new Date().toISOString(),
    attempts: 0,
  });
  setCompletionQueue(queue);
}

export function queueAiLessonCompletion(params: {
  lessonId: string;
  profileId: string;
  accuracy: number;
  completionTime: number;
  errorsCount: number;
  errorPatterns: string[];
}): void {
  const queue = getCompletionQueue();
  const existing = queue.find(
    (item): item is AiCompletionQueueItem =>
      item.kind === "ai" &&
      item.lessonId === params.lessonId &&
      item.profileId === params.profileId,
  );

  if (existing) {
    existing.accuracy = params.accuracy;
    existing.completionTime = params.completionTime;
    existing.errorsCount = params.errorsCount;
    existing.errorPatterns = params.errorPatterns;
    existing.queuedAt = new Date().toISOString();
    existing.attempts = 0;
    delete existing.lastError;
    setCompletionQueue(queue);
    return;
  }

  queue.push({
    id: `ai_${params.profileId}_${params.lessonId}`,
    kind: "ai",
    lessonId: params.lessonId,
    profileId: params.profileId,
    accuracy: params.accuracy,
    completionTime: params.completionTime,
    errorsCount: params.errorsCount,
    errorPatterns: params.errorPatterns,
    queuedAt: new Date().toISOString(),
    attempts: 0,
  });
  setCompletionQueue(queue);
}

export function getQueuedLessonCompletionCount(): number {
  return getCompletionQueue().length;
}

async function extractResponseMessage(response: Response): Promise<string> {
  try {
    const payload = await response.json();
    if (typeof payload?.message === "string" && payload.message.length > 0) {
      return payload.message;
    }
  } catch {
    // Ignore body parse errors.
  }

  return response.statusText || "Request failed";
}

export function isLikelyNetworkError(error: unknown): boolean {
  if (error instanceof DOMException && error.name === "AbortError") {
    return true;
  }

  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message.toLowerCase();
  return (
    message.includes("failed to fetch") ||
    message.includes("networkerror") ||
    message.includes("load failed") ||
    message.includes("timed out") ||
    message.includes("abort")
  );
}

export async function flushQueuedLessonCompletions(): Promise<FlushQueuedLessonCompletionsResult> {
  if (!hasBrowserStorage()) {
    return { attempted: 0, synced: 0, failures: 0, remaining: 0 };
  }

  if (!window.navigator.onLine) {
    const pending = getCompletionQueue().length;
    return { attempted: 0, synced: 0, failures: 0, remaining: pending };
  }

  const queue = getCompletionQueue();
  if (queue.length === 0) {
    return { attempted: 0, synced: 0, failures: 0, remaining: 0 };
  }

  const remaining: OfflineCompletionQueueItem[] = [];
  let synced = 0;
  let failures = 0;

  for (const item of queue) {
    try {
      let response: Response;

      if (item.kind === "legacy") {
        response = await fetch(`/api/user/lessons/${item.lessonId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ progress: item.progress }),
        });
      } else {
        response = await fetch(`/api/lessons/${item.lessonId}/complete`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            profileId: item.profileId,
            accuracy: item.accuracy,
            completionTime: item.completionTime,
            errorsCount: item.errorsCount,
            errorPatterns: item.errorPatterns,
          }),
        });
      }

      if (response.ok) {
        synced += 1;
        continue;
      }

      failures += 1;
      const message = await extractResponseMessage(response);
      remaining.push({
        ...item,
        attempts: (item.attempts ?? 0) + 1,
        lastError: message,
      });
    } catch (error) {
      failures += 1;
      const message = error instanceof Error ? error.message : "Network request failed";
      remaining.push({
        ...item,
        attempts: (item.attempts ?? 0) + 1,
        lastError: message,
      });
    }
  }

  setCompletionQueue(remaining);

  return {
    attempted: queue.length,
    synced,
    failures,
    remaining: remaining.length,
  };
}
