# ErrorDisplay Component Usage Guide

## Overview
The `ErrorDisplay` component provides a consistent, user-friendly way to display errors throughout the LinguaMaster AI Platform. It supports three variants and includes built-in retry and navigation actions.

## Import

```typescript
import { ErrorDisplay } from '@/components/ui/error-display';
```

## Variants

### 1. Card Variant (Default)
Full-featured error display with card styling. Best for dedicated error pages or major failures.

```tsx
<ErrorDisplay
  title="Failed to load lesson"
  message="We couldn't load this lesson. Please check your connection and try again."
  error={error}
  onRetry={() => refetch()}
  variant="card"
/>
```

### 2. Alert Variant
Inline alert-style display. Best for non-critical errors within a page.

```tsx
<ErrorDisplay
  title="Sync failed"
  message="Your progress couldn't be synced. We'll try again automatically."
  variant="alert"
/>
```

### 3. Inline Variant
Compact error display. Best for tight spaces or form validation errors.

```tsx
<ErrorDisplay
  title="Invalid input"
  message="Please check your answer and try again."
  variant="inline"
  onRetry={() => handleRetry()}
/>
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `title` | `string` | `"Something went wrong"` | Error title/heading |
| `message` | `string` | **Required** | Main error message |
| `error` | `Error` | `undefined` | Error object for details |
| `onRetry` | `() => void` | `undefined` | Retry action handler |
| `onGoHome` | `() => void` | `undefined` | Navigate home handler |
| `variant` | `"card" \| "alert" \| "inline"` | `"card"` | Display variant |
| `showDetails` | `boolean` | `false` | Show error details |

## Common Patterns

### Pattern 1: Query Error Handling

```tsx
const { data, isLoading, error, refetch } = useQuery({
  queryKey: ['lessons', lessonId],
  queryFn: fetchLesson
});

if (error) {
  return (
    <ErrorDisplay
      title="Failed to load lesson"
      message="We couldn't load this lesson. Please try again."
      error={error as Error}
      onRetry={() => refetch()}
      variant="card"
    />
  );
}
```

### Pattern 2: Mutation Error Handling

```tsx
const mutation = useMutation({
  mutationFn: submitExercise,
  onError: (error) => {
    setError(error);
  }
});

{mutation.error && (
  <ErrorDisplay
    title="Submission failed"
    message="Your answer couldn't be submitted. Please try again."
    error={mutation.error as Error}
    onRetry={() => mutation.mutate(data)}
    variant="alert"
  />
)}
```

### Pattern 3: Form Validation Errors

```tsx
{validationError && (
  <ErrorDisplay
    title="Validation error"
    message={validationError.message}
    variant="inline"
  />
)}
```

### Pattern 4: Network Errors with Navigation

```tsx
if (networkError) {
  return (
    <ErrorDisplay
      title="Connection lost"
      message="We couldn't connect to the server. Please check your internet connection."
      error={networkError}
      onRetry={() => window.location.reload()}
      onGoHome={() => navigate('/')}
      variant="card"
    />
  );
}
```

### Pattern 5: Debug Mode with Error Details

```tsx
<ErrorDisplay
  title="API Error"
  message="The server returned an unexpected response."
  error={error}
  showDetails={process.env.NODE_ENV === 'development'}
  onRetry={() => refetch()}
  variant="card"
/>
```

## Best Practices

### 1. Choose the Right Variant
- **Card**: Use for critical errors that block the entire page/component
- **Alert**: Use for important but non-blocking errors
- **Inline**: Use for minor errors or validation feedback

### 2. Provide Clear Messages
```tsx
// ❌ Bad: Technical jargon
<ErrorDisplay message="HTTP 500: Internal Server Error" />

// ✅ Good: User-friendly language
<ErrorDisplay message="Something went wrong on our end. We're working to fix it." />
```

### 3. Always Provide Recovery Options
```tsx
// ❌ Bad: No way to recover
<ErrorDisplay message="Failed to load data" />

// ✅ Good: Retry option provided
<ErrorDisplay 
  message="Failed to load data"
  onRetry={() => refetch()}
/>
```

### 4. Use Error Details Sparingly
```tsx
// Only show technical details in development
<ErrorDisplay
  message="Failed to process request"
  error={error}
  showDetails={process.env.NODE_ENV === 'development'}
/>
```

### 5. Combine with Toast Notifications
```tsx
// Show toast for immediate feedback
toast({
  title: "Error",
  description: "Failed to save changes",
  variant: "destructive"
});

// Show ErrorDisplay for persistent error state
setError(error);
```

## Accessibility

The ErrorDisplay component is built with accessibility in mind:
- Uses semantic HTML elements
- Includes proper ARIA attributes
- Keyboard navigable action buttons
- Screen reader friendly error messages

## Styling

The component uses Tailwind CSS and shadcn/ui components for consistent styling:
- Destructive color scheme for error states
- Responsive design
- Dark mode support
- Consistent spacing and typography

## Examples in Codebase

See these files for real-world usage examples:
- `client/src/components/learning/LessonViewer.tsx` - Card variant with retry
- More examples coming soon as components are updated

## Migration Guide

If you're updating existing error handling:

### Before
```tsx
if (error) {
  return (
    <Card className="border-red-500">
      <CardContent>
        <p className="text-red-500">Error: {error.message}</p>
        <Button onClick={refetch}>Retry</Button>
      </CardContent>
    </Card>
  );
}
```

### After
```tsx
if (error) {
  return (
    <ErrorDisplay
      message="Failed to load data"
      error={error}
      onRetry={refetch}
      variant="card"
    />
  );
}
```

## Future Enhancements

Potential improvements for future iterations:
- Automatic error reporting integration
- Customizable action buttons
- Error categorization (network, validation, server, etc.)
- Retry with exponential backoff
- Error analytics tracking
