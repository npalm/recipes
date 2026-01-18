/**
 * Recipe Services - Public API
 *
 * NOTE: recipeService uses file system operations and can only be used server-side.
 * Use filters for client-side filtering of already-loaded data.
 */

// Server-side only service
export * from './recipeService';

// Client-safe filtering functions
export * from './filters';
