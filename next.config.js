/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  images: {
    domains: ['images.unsplash.com', 'lh3.googleusercontent.com'],
    unoptimized: true
  },
  typescript: {
    ignoreBuildErrors: true
  },
  eslint: {
    ignoreDuringBuilds: true
  },
  webpack: (config) => {
    // Optimize the webpack configuration
    config.optimization = {
      ...config.optimization,
      minimize: true,
      moduleIds: 'deterministic'
    }
    // Prevent pattern matching issues
    config.watchOptions = {
      ignored: ['**/.git/**', '**/node_modules/**', '**/.next/**']
    }
    return config
  }
}

module.exports = nextConfig 