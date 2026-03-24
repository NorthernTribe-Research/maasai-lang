# Duolingo-Style Design Implementation Guide

## Overview
This guide provides detailed instructions for transforming LinguaMaster into a Duolingo-like learning experience with the same playful, engaging, and effective design patterns.

---

## 1. Color Palette

### Primary Colors (Duolingo-inspired)
```css
--duolingo-green: #58CC02      /* Primary brand color */
--duolingo-green-dark: #46A302  /* Hover/active states */
--duolingo-green-light: #89E219 /* Highlights */

--duolingo-blue: #1CB0F6       /* Secondary actions */
--duolingo-yellow: #FFC800     /* Warnings/attention */
--duolingo-red: #FF4B4B         /* Errors/hearts */
--duolingo-purple: #CE82FF      /* Premium features */
```

### Neutral Colors
```css
--background: #FFFFFF
--surface: #F7F7F7
--border: #E5E5E5
--text-primary: #3C3C3C
--text-secondary: #777777
```

### Dark Mode
```css
--background-dark: #131F24
--surface-dark: #1F2937
--border-dark: #374151
```

---

## 2. Typography

### Font Family
- Primary: "DIN Round" or "Nunito" (rounded, friendly sans-serif)
- Fallback: system-ui, -apple-system, "Segoe UI", sans-serif

### Font Sizes
```css
--text-xs: 0.75rem    /* 12px - hints, labels */
--text-sm: 0.875rem   /* 14px - body text */
--text-base: 1rem     /* 16px - default */
--text-lg: 1.125rem   /* 18px - headings */
--text-xl: 1.25rem    /* 20px - titles */
--text-2xl: 1.5rem    /* 24px - large titles */
--text-3xl: 2rem      /* 32px - hero text */
```

### Font Weights
- Regular: 400
- Medium: 600
- Bold: 700
- Extra Bold: 800

---

## 3. Border Radius

Everything should be rounded for a friendly, approachable feel:
```css
--radius-sm: 8px      /* Small elements */
--radius-md: 12px     /* Cards, buttons */
--radius-lg: 16px     /* Large cards */
--radius-xl: 24px     /* Modals */
--radius-full: 9999px /* Circular elements */
```

---

## 4. Learning Path Design

### Path Structure
- Vertical scrolling layout
- Winding/zigzag pattern (alternating left-center-right)
- Unit sections with headers
- Lesson nodes as circles

### Lesson Node States
1. **Locked** (gray, with lock icon)
2. **Available** (colorful, pulsing animation)
3. **In Progress** (half-filled circle)
4. **Completed** (gold/green with checkmark)
5. **Legendary** (purple/gold with crown)

### Node Types
- 🎯 Regular Lesson (green circle)
- 📖 Story (blue circle with book icon)
- 🏆 Unit Review (yellow circle with trophy)
- 👑 Legendary Challenge (purple circle with crown)
- 💪 Practice (orange circle with dumbbell)

### Visual Elements
```tsx
// Example lesson node component structure
<div className="lesson-node">
  <div className="node-connector" /> {/* Line connecting nodes */}
  <div className="node-circle">
    <Icon /> {/* Lesson type icon */}
  </div>
  <div className="node-label">Lesson Title</div>
</div>
```

---

## 5. Lesson Interface

### Layout
```
┌─────────────────────────────┐
│ [Progress Bar: ████░░░░░░] │ ← Top progress indicator
├─────────────────────────────┤
│                             │
│   [Large Illustration]      │ ← Colorful, playful image
│                             │
│   Question Text             │ ← Clear, large text
│                             │
│   [Answer Options]          │ ← Large, tappable buttons
│   [Answer Options]          │
│   [Answer Options]          │
│                             │
├─────────────────────────────┤
│         [CHECK BUTTON]      │ ← Bottom action button
└─────────────────────────────┘
```

### Exercise Types
1. **Multiple Choice**: Select correct translation
2. **Fill in the Blank**: Type missing word
3. **Match Pairs**: Connect words/phrases
4. **Listening**: Transcribe audio
5. **Speaking**: Pronounce phrase
6. **Sentence Building**: Arrange word tiles
7. **Translation**: Translate full sentence

### Feedback States
- **Correct**: Green background, checkmark, encouraging message
- **Incorrect**: Red background, X mark, show correct answer
- **Almost**: Yellow background, hint to try again

---

## 6. Gamification Elements

### Streak Display
```tsx
<div className="streak-display">
  <span className="flame-icon">🔥</span>
  <span className="streak-count">{streakDays}</span>
  <span className="streak-label">day streak</span>
</div>
```

### XP Progress
```tsx
<div className="xp-bar">
  <div className="level-badge">Level {level}</div>
  <div className="progress-bar">
    <div className="progress-fill" style={{width: `${progress}%`}} />
  </div>
  <div className="xp-text">{currentXP} / {nextLevelXP} XP</div>
</div>
```

### Achievement Badge
```tsx
<div className="achievement-badge">
  <div className="badge-icon">{icon}</div>
  <div className="badge-name">{name}</div>
  <div className="badge-description">{description}</div>
  <div className="badge-progress">{progress}%</div>
</div>
```

---

## 7. Animation Patterns

### Micro-interactions
- Button press: Scale down (0.95) on tap
- Correct answer: Bounce + green flash
- Incorrect answer: Shake + red flash
- XP gain: Number count-up animation
- Streak update: Flame pulse animation
- Level up: Confetti + modal celebration

### Transitions
- Page transitions: Slide left/right
- Modal appearance: Scale + fade in
- Lesson node unlock: Pop + sparkle effect
- Progress bar: Smooth width transition

### Libraries
- Framer Motion for React animations
- Lottie for complex character animations
- CSS transitions for simple effects

---

## 8. Component Specifications

### Bottom Navigation Bar
```tsx
<nav className="bottom-nav">
  <NavItem icon="🏠" label="Learn" active />
  <NavItem icon="💪" label="Practice" />
  <NavItem icon="🏆" label="Leaderboard" />
  <NavItem icon="👤" label="Profile" />
</nav>
```

### Lesson Completion Modal
```tsx
<Modal>
  <Confetti />
  <h2>Lesson Complete!</h2>
  <XPGained amount={15} />
  <StreakUpdate days={7} />
  <Achievements unlocked={[...]} />
  <Button>Continue</Button>
</Modal>
```

### Daily Goal Widget
```tsx
<div className="daily-goal">
  <CircularProgress value={progress} />
  <div className="goal-text">
    <span>{completed} / {total}</span>
    <span>Daily Goal</span>
  </div>
</div>
```

---

## 9. Layout Structure

### Home Screen (Learning Path)
```
┌─────────────────────────────┐
│ [Header: Streak, XP, Menu]  │
├─────────────────────────────┤
│                             │
│   Unit 1: Basics            │
│      ○ Lesson 1 ✓           │
│        ○ Lesson 2 ✓         │
│      ○ Lesson 3 →           │ ← Current lesson (pulsing)
│        ○ Lesson 4 🔒        │
│      ○ Story 1 🔒           │
│                             │
│   Unit 2: Phrases           │
│      ○ Lesson 5 🔒          │
│        ○ Lesson 6 🔒        │
│                             │
│   [Scroll for more...]      │
│                             │
├─────────────────────────────┤
│ [Bottom Nav: Learn|Practice]│
└─────────────────────────────┘
```

---

## 10. Interaction Patterns

### Lesson Flow
1. Tap lesson node → Preview modal appears
2. Tap "Start" → Lesson begins
3. Complete exercises → Progress bar fills
4. Finish lesson → Celebration modal
5. Return to path → Node turns gold

### Practice Sessions
- Tap heart icon → Quick practice
- Tap completed node → Review specific content
- Tap practice hub → Choose practice type

### Social Interactions
- Tap friend → View their profile and progress
- Tap leaderboard → See rankings and compete
- Complete quest → Share achievement

---

## 11. Responsive Design

### Mobile (Primary)
- Full-screen learning path
- Bottom navigation
- Swipe gestures
- Touch-optimized buttons (min 44px)

### Tablet
- Wider lesson cards
- Side-by-side content
- Enhanced illustrations

### Desktop
- Centered content (max 600px width)
- Keyboard shortcuts
- Hover states
- Sidebar navigation option

---

## 12. Accessibility

### Requirements
- WCAG 2.1 AA compliance
- Screen reader support
- Keyboard navigation
- High contrast mode
- Reduced motion option
- Font size adjustment

### Implementation
- Semantic HTML
- ARIA labels
- Focus indicators
- Alt text for images
- Captions for audio

---

## 13. Performance Targets

- Initial load: < 2s
- Lesson transition: < 300ms
- Animation frame rate: 60fps
- Path scroll: Smooth 60fps
- API response: < 500ms

---

## 14. Content Strategy

### Lesson Structure
- 5-10 exercises per lesson
- Mix of exercise types
- Gradual difficulty increase
- Spaced repetition of vocabulary
- Cultural context integration

### Unit Organization
- 5-10 lessons per unit
- Clear learning objectives
- Unit review at end
- Story integration
- Legendary challenge

---

## Implementation Priority

### Week 1: Foundation
- Phase 1 (Visual Design)
- Phase 2 (Learning Path)

### Week 2: Core Experience
- Phase 3 (Lesson Experience)
- Phase 4 (Gamification)

### Week 3: Enhancement
- Phase 5 (Home Screen)
- Phase 6 (Characters)

### Week 4: Polish
- Phase 9 (Mobile Optimization)
- Phase 10 (Polish & Launch)

### Future Iterations
- Phase 7 (Stories)
- Phase 8 (Social Features)
