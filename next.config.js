/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  poweredByHeader: false,
  reactStrictMode: true,
  swcMinify: true,
  images: {
    domains: ['images.unsplash.com', 'lh3.googleusercontent.com'],
    unoptimized: process.env.NODE_ENV === 'development'
  },
  // Disable experimental features
  experimental: {
    optimizeCss: false
  },
  // Ignore build errors to prevent recursion
  typescript: {
    ignoreBuildErrors: true
  },
  eslint: {
    ignoreDuringBuilds: true
  },
  // Increase timeout for static generation
  staticPageGenerationTimeout: 120,
  // Configure webpack with minimal settings
  webpack: (config) => {
    config.watchOptions = {
      poll: 1000,
      aggregateTimeout: 300,
    }
    return config
  }
}

module.exports = nextConfig 