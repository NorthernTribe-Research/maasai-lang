# Analytics Components

This directory contains components for displaying progress tracking and analytics data.

## Components

### ProgressDashboard
**Requirements: 15.2, 15.3, 20.4**

Comprehensive progress visualization component that displays:
- Total XP, current streak, proficiency level, and average accuracy
- Time range selection (7 days, 30 days, 90 days, all time)
- Activity summary with completed lessons, exercises, voice sessions, and pronunciation practice
- Accuracy trend line chart over time
- Activity distribution pie chart
- Personalized recommendations for improvement

**Usage:**
```tsx
import { ProgressDashboard } from "@/components/analytics";

<ProgressDashboard profileId={profileId} />
```

**Props:**
- `profileId` (string): The learning profile ID to fetch progress data for

**Features:**
- Responsive design for mobile and desktop
- Interactive charts using shadcn/ui chart components
- Real-time data fetching with TanStack Query
- Loading skeletons for better UX
- Tabbed interface for different views (overview, accuracy, activities)

### WeaknessAnalysis
**Requirements: 15.4**

Component for analyzing and displaying identified weakness areas:
- Lists all identified weakness areas
- Shows improvement trends (improving, stable, declining) for each weakness
- Displays recent accuracy percentage with progress bars
- Provides targeted practice suggestions
- Includes accuracy comparison bar chart
- Offers actionable recommendations

**Usage:**
```tsx
import { WeaknessAnalysis } from "@/components/analytics";

<WeaknessAnalysis profileId={profileId} />
```

**Props:**
- `profileId` (string): The learning profile ID to fetch weakness data for

**Features:**
- Visual trend indicators (up/down/stable arrows)
- Color-coded accuracy levels (green/yellow/red)
- Direct navigation to practice exercises
- Context-aware suggestions based on trend direction
- Empty state for learners with no weaknesses

### PronunciationTrends
**Requirements: 15.5**

Component for visualizing pronunciation improvement over time:
- Line chart showing pronunciation accuracy trend
- Phoneme-specific breakdown bar chart
- Latest score, average score, and improvement statistics
- Identification of improvement areas (scores < 70%)
- Highlighting of strong areas (scores >= 80%)
- Practice recommendations based on performance

**Usage:**
```tsx
import { PronunciationTrends } from "@/components/analytics";

<PronunciationTrends profileId={profileId} />
```

**Props:**
- `profileId` (string): The learning profile ID to fetch pronunciation data for

**Features:**
- Multiple chart visualizations (line and bar charts)
- Phoneme-level performance tracking
- Color-coded score indicators
- Categorized improvement and strong areas
- Personalized practice tips
- Empty state for new learners

## Data Flow

All components use TanStack Query for data fetching:

1. **ProgressDashboard** fetches from:
   - `/api/progress/:profileId` - Overall progress data
   - `/api/progress/:profileId/analytics` - Time-filtered analytics

2. **WeaknessAnalysis** fetches from:
   - `/api/progress/:profileId/weaknesses` - Weakness areas and trends

3. **PronunciationTrends** fetches from:
   - `/api/progress/:profileId/pronunciation` - Pronunciation history and phoneme data

## Styling

All components use:
- shadcn/ui components for consistent UI
- Tailwind CSS for styling
- Recharts via shadcn/ui chart components for data visualization
- Lucide React icons for visual elements

## Responsive Design

All components are fully responsive:
- Mobile: Single column layout, simplified charts
- Tablet: 2-column grid for stats
- Desktop: Full multi-column layouts with expanded charts

## Error Handling

Components include:
- Loading skeletons during data fetch
- Empty states when no data is available
- Graceful error handling with user-friendly messages

## Integration

These components are designed to be used in:
- User dashboard pages
- Progress tracking sections
- Learning profile views
- Analytics reports

Example integration:
```tsx
import { ProgressDashboard, WeaknessAnalysis, PronunciationTrends } from "@/components/analytics";

function ProgressPage({ profileId }: { profileId: string }) {
  return (
    <div className="space-y-8">
      <ProgressDashboard profileId={profileId} />
      <WeaknessAnalysis profileId={profileId} />
      <PronunciationTrends profileId={profileId} />
    </div>
  );
}
```
