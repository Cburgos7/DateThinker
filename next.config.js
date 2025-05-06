/** @type {import('next').NextConfig} */
const nextConfig = {
  // Clean core configuration
  output: 'standalone',
  
  // Skip typechecking and linting during build for faster builds
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  // Ensure CSS modules work properly
  optimizeCss: true,
  reactStrictMode: true,
  swcMinify: true,
  
  // Minimal experimental options - only what's needed
  experimental: {
    serverActions: true,
    serverComponentsExternalPackages: ['@supabase/supabase-js']
  },
  
  // Security headers - keeping only essential ones
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" }
        ],
      },
      {
        source: "/api/:path*",
        headers: [
          { key: "Access-Control-Allow-Credentials", value: "true" },
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Access-Control-Allow-Methods", value: "GET,DELETE,PATCH,POST,PUT,OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization" }
        ],
      },
    ]
  },
  
  // Image domains
  images: {
    domains: ["images.unsplash.com"],
  },
  
  // Webpack config - keeping only what's essential
  webpack: (config) => {
    // Fix date-fns imports
    config.resolve.alias = {
      ...config.resolve.alias,
      'date-fns': require.resolve('date-fns'),
      'date-fns/locale': require.resolve('date-fns/locale'),
    };
    
    // Add path aliases
    const path = require('path');
    config.resolve.alias['APP'] = path.resolve(__dirname, './app');
    config.resolve.alias['app'] = path.resolve(__dirname, './app');
    config.resolve.alias['COMPONENTS'] = path.resolve(__dirname, './components');
    config.resolve.alias['components'] = path.resolve(__dirname, './components');

    // Ignore WebSocket warnings
    config.ignoreWarnings = [
      { module: /node_modules\/ws\/lib\/(buffer-util|validation)\.js/ }
    ];
    
    return config;
  },
}

module.exports = nextConfig

