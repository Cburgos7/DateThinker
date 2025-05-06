// This file helps Next.js understand which routes should be dynamic

// Mark the entire file as a client module
export const dynamic = 'force-dynamic';

// Configure validation options
export const dynamicParams = true;

// Tell Next.js not to validate static generation for API routes
export const generateStaticParams = async () => {
  return [];
}

// Dynamic routes that use cookies or request data
export const dynamicApiRoutes = [
  '/api/auth/check',
  '/api/auth/session',
  '/api/place-photo',
  '/api/places',
  '/api/debug-google-places',
  '/api/stripe-status',
];

// Helper function to check if a route should be dynamic
export function isDynamicRoute(path) {
  return dynamicApiRoutes.some(route => 
    path === route || path.startsWith(`${route}/`)
  );
}

export default {
  dynamic: 'force-dynamic',
  dynamicParams: true,
  generateStaticParams,
  isDynamicRoute,
}; 