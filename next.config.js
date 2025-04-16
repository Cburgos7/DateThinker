/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    caseSensitiveRoutes: false,
    serverActions: true,
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
              "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://pagead2.googlesyndication.com https://partner.googleadservices.com https://tpc.googlesyndication.com https://www.googletagservices.com https://www.google-analytics.com https://www.googleadservices.com https://adservice.google.com https://cdn.jsdelivr.net; img-src 'self' data: https: blob:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; connect-src 'self' https://images.unsplash.com https://www.google-analytics.com https://*.supabase.co; frame-src 'self' https://googleads.g.doubleclick.net https://tpc.googlesyndication.com;",
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
    domains: ["images.unsplash.com"],
  },
  webpack: (config, { isServer }) => {
    // Add a resolve alias for date-fns to ensure consistent casing
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

    // Ensure CSS modules are properly configured
    if (!isServer) {
      config.module.rules.push({
        test: /\.css$/,
        use: [
          'style-loader',
          'css-loader',
          {
            loader: 'postcss-loader',
            options: {
              postcssOptions: {
                plugins: [
                  require('tailwindcss'),
                  require('autoprefixer'),
                ],
              },
            },
          },
        ],
      });
    }
    
    // Ignore WebSocket optional dependency warnings
    config.ignoreWarnings = [
      { module: /node_modules\/ws\/lib\/(buffer-util|validation)\.js/ }
    ];
    
    return config;
  },
}

module.exports = nextConfig

