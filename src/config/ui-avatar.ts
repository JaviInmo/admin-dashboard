// Centralized avatar visuals and logic constants
export const AVATAR_CONFIG = {
  // Tailwind classes for the avatar size and ring
  sizeClass: 'h-8 w-8',
  ringClass: 'ring-2 ring-ring ring-offset-2 ring-offset-background',

  // Initials behavior
  initialsMaxLen: 2 as 2 | 3,
  fallbackInitial: 'U',

  // Gradient settings
  hueShift: 40, // degrees, used for fallback deterministic gradient shift
  roleGradients: {
    admin:   ['hsl(0 85% 52%)',   'hsl(340 85% 58%)'],  // red → pink
    manager: ['hsl(220 85% 52%)', 'hsl(200 85% 58%)'],  // blue → cyan
    staff:   ['hsl(30 85% 52%)',  'hsl(10 85% 58%)'],   // orange → red
    user:    ['hsl(150 70% 42%)', 'hsl(170 70% 50%)'],  // green → teal
    guard:   ['hsl(260 70% 52%)', 'hsl(290 70% 58%)'],  // indigo → purple
  } as Record<string, [string, string]>,
} as const
