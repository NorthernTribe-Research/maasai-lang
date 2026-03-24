# Gamification Components

This directory contains frontend gamification components for the LinguaMaster AI Platform. These components implement the gamification features specified in Requirements 10-14 and Design sections of the spec.

## Components Overview

### 1. XPDisplay
**Requirements: 10.4, 10.5**

Displays user's total experience points with animated counter and recent XP gains.

**Features:**
- Animated XP counter with smooth transitions
- Level progress bar showing progress to next level
- Recent XP gains list (last 3 activities)
- Gradient background with visual appeal
- Real-time updates via TanStack Query

**Props:**
```typescript
interface XPDisplayProps {
  userId?: string;
  showRecentGains?: boolean; // Default: true
}
```

**Usage:**
```tsx
import { XPDisplay } from '@/components/gamification';

<XPDisplay showRecentGains={true} />
```

**API Endpoint:** `GET /api/gamification/xp`

---

### 2. AchievementCard
**Requirements: 11.3, 11.4**

Displays individual achievement with unlock status and progress.

**Features:**
- Visual distinction between locked/unlocked states
- Progress bar for partially completed achievements
- Icon display with gradient backgrounds
- Unlock date display for earned achievements
- Condition hints for locked achievements

**Props:**
```typescript
interface AchievementCardProps {
  achievement: Achievement;
  unlocked: boolean;
  progress?: number; // 0-100 percentage
  unlockedAt?: Date;
  className?: string;
}
```

**Usage:**
```tsx
import { AchievementCard } from '@/components/gamification';

<AchievementCard
  achievement={achievement}
  unlocked={false}
  progress={65}
/>
```

---

### 3. StreakTracker
**Requirements: 13.4**

Displays current learning streak with calendar visualization.

**Features:**
- Current streak count with animated flame icon
- Last 7 days calendar visualization
- Longest streak display
- Milestone indicators (Week Warrior, Monthly Master, etc.)
- Motivational messages based on streak status
- Last activity date tracking

**Props:**
```typescript
interface StreakTrackerProps {
  userId?: string;
  showCalendar?: boolean; // Default: true
}
```

**Usage:**
```tsx
import { StreakTracker } from '@/components/gamification';

<StreakTracker showCalendar={true} />
```

**API Endpoint:** `GET /api/gamification/streak`

**Milestones:**
- 7 days: Week Warrior
- 30 days: Monthly Master
- 100 days: Century Club
- 365 days: Year Warrior

---

### 4. DailyChallengeCard
**Requirements: 12.4**

Displays daily challenge with progress tracking and completion status.

**Features:**
- Challenge prompt display
- Answer input with validation
- Progress bar for partial completion
- Completion status with visual feedback
- XP reward display
- Time remaining countdown
- Difficulty indicator

**Props:**
```typescript
interface DailyChallengeCardProps {
  userId?: string;
  compact?: boolean; // Default: false
}
```

**Usage:**
```tsx
import { DailyChallengeCard } from '@/components/gamification';

<DailyChallengeCard compact={false} />
```

**API Endpoints:**
- `GET /api/gamification/daily-challenge`
- `POST /api/gamification/daily-challenge/complete`

---

### 5. Leaderboard
**Requirements: 14.3, 14.4, 14.5, 14.6, 23.6**

Displays top learners with filtering and pagination.

**Features:**
- Top 100 learners display
- Current user rank highlighting
- Language filtering (Spanish, Mandarin, English, Hindi, Arabic)
- Time period filtering (Daily, Weekly, All-time)
- Pagination for large datasets
- Rank icons for top 3 (Crown, Silver Medal, Bronze Medal)
- Gradient avatars with user initials
- XP display for each learner

**Props:**
```typescript
interface LeaderboardProps {
  currentUserId?: string;
  compact?: boolean; // Default: false
  limit?: number; // Default: 100
}
```

**Usage:**
```tsx
import { Leaderboard } from '@/components/gamification';

<Leaderboard
  currentUserId={user?.id}
  compact={false}
  limit={100}
/>
```

**API Endpoint:** `GET /api/gamification/leaderboard?language=spanish&period=weekly&limit=100`

**Filtering Options:**
- **Languages:** all, spanish, mandarin, english, hindi, arabic
- **Time Periods:** daily, weekly, all-time
- **Pagination:** 10 items per page (5 in compact mode)

---

## Data Fetching

All components use **TanStack Query** for data fetching with the following benefits:
- Automatic caching and background refetching
- Loading and error states
- Optimistic updates
- Query invalidation on mutations

## Styling

Components use:
- **Tailwind CSS** for utility-first styling
- **shadcn/ui** components for consistent UI
- **Lucide React** icons for visual elements
- Gradient backgrounds for visual appeal
- Dark mode support

## State Management

- **TanStack Query** for server state
- Local component state for UI interactions
- Query invalidation for real-time updates

## Animations

- XP counter: Smooth number animation over 1 second
- Streak flame: Pulse animation
- Progress bars: Smooth transitions
- Hover effects: Scale and shadow transitions

## Accessibility

- Semantic HTML structure
- ARIA labels where appropriate
- Keyboard navigation support
- Screen reader friendly
- Color contrast compliance

## Performance Optimizations

- Lazy loading with React.lazy (if needed)
- Memoization of expensive calculations
- Pagination for large datasets
- Efficient re-renders with React Query

## Integration Example

```tsx
import {
  XPDisplay,
  AchievementCard,
  StreakTracker,
  DailyChallengeCard,
  Leaderboard
} from '@/components/gamification';

function GamificationDashboard() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <XPDisplay showRecentGains={true} />
      <StreakTracker showCalendar={true} />
      <DailyChallengeCard />
      <Leaderboard currentUserId={user?.id} limit={100} />
    </div>
  );
}
```

## Testing

Components are designed to be testable with:
- Mock API responses
- Component testing with React Testing Library
- Integration testing with MSW (Mock Service Worker)

## Future Enhancements

- Real-time leaderboard updates with WebSockets
- Achievement unlock animations
- Social sharing features
- Streak freeze/recovery mechanics
- Custom challenge creation
- Team/group leaderboards

## Related Files

- **API Routes:** `server/routes/gamification.ts`
- **Service:** `server/services/GamificationService.ts`
- **Schema:** `shared/schema.ts`
- **Design Doc:** `.kiro/specs/linguamaster-ai-platform/design.md`
- **Requirements:** `.kiro/specs/linguamaster-ai-platform/requirements.md`
