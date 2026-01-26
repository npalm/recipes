/**
 * Server-side utility functions
 * These utilities can only be used in Server Components
 */

import { headers } from 'next/headers';
import { config } from './config';

/**
 * Get the base URL for the application
 * Uses the current request URL in server components, falls back to production URL for static generation
 * @returns The base URL (e.g., "https://keuken.guldenstraat.nl")
 */
export async function getBaseUrl(): Promise<string> {
  try {
    const headersList = await headers();
    const host = headersList.get('host');
    const protocol = headersList.get('x-forwarded-proto') || 'http';
    
    if (host) {
      return `${protocol}://${host}`;
    }
  } catch (error) {
    // Headers not available during static generation or in client components
  }
  
  // Fallback to production URL
  return config.productionUrl;
}
