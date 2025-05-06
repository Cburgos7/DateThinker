// Define which routes should be dynamically rendered
// This is used for routes that require cookies, request data, or other server-side features
export const dynamicRoutes = [
  '/api/auth/check',
  '/api/auth/session',
  '/api/place-photo',
  '/api/places',
  '/api/debug-google-places',
  '/api/stripe-status',
];

// Configure options for dynamic and static pages
export const routeConfig = {
  // Used with force-dynamic to skip static generation
  dynamic: 'force-dynamic',
  // Used for pages that should be dynamic at runtime
  dynamicParams: true,
};

// Add a global config for Next.js
export const nextConfig = {
  // Tell Next.js to bail out of static generation for certain features
  staticGeneration: {
    // Don't error if dynamic usage is detected during static generation
    // This allows us to serve pages that use dynamic features at runtime
    // even if they also contain static content
    bailout: true
  }
};

// Define dynamic API handlers - these should never be statically generated
export const apiConfig = {
  // Make all API routes dynamic by default
  api: {
    bodyParser: true,
    externalResolver: true,
  },
};

// Configure any pages that need special dynamic rendering
export const dynamicPageConfig = {
  // Flag to indicate that static build should skip dynamic checks for auth
  skipDynamicServerUsageErrors: true,
}; 