/**
 * Style system exports
 * Provides theme, sprinkles, animations, and effects for the memory-graph package
 */

// Import global styles (side effect)
import "./global.css";

// Theme
export { themeContract, defaultTheme } from "./theme.css";

// Sprinkles utilities
export { sprinkles } from "./sprinkles.css";
export type { Sprinkles } from "./sprinkles.css";

// Animations
export * as animations from "./animations.css";

// Glass-morphism effects
export { glass, glassPanel, focusRing, transition, hoverGlow } from "./effects.css";
