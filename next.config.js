/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    caseSensitiveRoutes: false,
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains; preload",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(self), interest-cohort=()",
          },
          {
            key: "Content-Security-Policy",
            value:
              "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://pagead2.googlesyndication.com https://partner.googleadservices.com https://tpc.googlesyndication.com https://www.googletagservices.com https://www.google-analytics.com https://www.googleadservices.com https://adservice.google.com https://cdn.jsdelivr.net; img-src 'self' data: https: blob: https://placehold.co; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; connect-src 'self' https://images.unsplash.com https://www.google-analytics.com https://*.supabase.co https://placehold.co; frame-src 'self' https://googleads.g.doubleclick.net https://tpc.googlesyndication.com;",
          },
        ],
      },
      {
        source: "/api/:path*",
        headers: [
          { key: "Access-Control-Allow-Credentials", value: "true" },
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Access-Control-Allow-Methods", value: "GET,DELETE,PATCH,POST,PUT,OPTIONS" },
          {
            key: "Access-Control-Allow-Headers",
            value:
              "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization",
          },
        ],
      },
    ]
  },
  images: {
    domains: ["images.unsplash.com", "placehold.co"],
  },
  // Fix for case sensitivity issues with date-fns
  webpack: (config) => {
    // Add a resolve alias for date-fns to ensure consistent casing
    config.resolve.alias = {
      ...config.resolve.alias,
      'date-fns': require.resolve('date-fns'),
      'date-fns/locale': require.resolve('date-fns/locale'),
    };
    
    // Remove the invalid caseSensitive property
    // Instead, make sure all import paths use consistent casing
    // Add wildcard aliases for any problematic paths
    if (config.resolve.alias) {
      // Add any key folders that might have case sensitivity issues
      const appDir = require('path').resolve(__dirname, './app');
      const componentsDir = require('path').resolve(__dirname, './components');
      
      config.resolve.alias['APP'] = appDir;
      config.resolve.alias['app'] = appDir;
      config.resolve.alias['COMPONENTS'] = componentsDir;
      config.resolve.alias['components'] = componentsDir;
    }
    
    return config;
  },
}

module.exports = nextConfig

