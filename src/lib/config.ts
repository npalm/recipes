/**
 * Application Configuration
 *
 * Centralized configuration for the recipe app.
 */

/**
 * Supported unit systems
 */
export type UnitSystem = 'metric' | 'imperial';

/**
 * Supported temperature units
 */
export type TemperatureUnit = 'celsius' | 'fahrenheit';

export const config = {
  /** App name */
  appName: 'My Recipes',

  /** App description */
  appDescription: 'A personal recipe collection',

  /** Default servings for new recipes */
  defaultServings: 4,

  /** Maximum servings for scaling */
  maxServings: 50,

  /** Minimum servings for scaling */
  minServings: 1,

  /** Image rotation interval in milliseconds */
  imageRotationInterval: 5000,

  /** Search debounce delay in milliseconds */
  searchDebounceMs: 300,

  /** Maximum search results */
  maxSearchResults: 20,

  /**
   * Unit system preference
   * - 'metric': Use g, kg, ml, l, °C (EU/international standard)
   * - 'imperial': Use oz, lb, cups, °F (US standard)
   */
  unitSystem: 'metric' as UnitSystem,

  /**
   * Temperature unit preference
   * - 'celsius': Use °C (EU/international standard)
   * - 'fahrenheit': Use °F (US standard)
   */
  temperatureUnit: 'celsius' as TemperatureUnit,

  /** Time thresholds for filtering (in minutes) */
  timeFilters: [
    { label: 'Quick (< 30 min)', value: 30 },
    { label: 'Medium (< 60 min)', value: 60 },
    { label: 'Long (< 2 hours)', value: 120 },
    { label: 'Any time', value: Infinity },
  ],

  /** Content paths */
  paths: {
    recipes: 'content/recipes',
    demo: 'content/demo',
    images: 'images',
  },
} as const;

/**
 * Check if we're in demo mode based on URL path
 */
export function isDemoMode(pathname: string): boolean {
  return pathname.startsWith('/demo');
}

/**
 * Get the base path for routes (empty for regular, '/demo' for demo mode)
 */
export function getBasePath(isDemo: boolean): string {
  return isDemo ? '/demo' : '';
}

/**
 * Get the content directory path
 */
export function getContentPath(isDemo: boolean): string {
  return isDemo ? config.paths.demo : config.paths.recipes;
}

export type Config = typeof config;
