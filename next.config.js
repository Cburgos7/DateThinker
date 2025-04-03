/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  experimental: {
    optimizeCss: true,
  },
  webpack: (config, { isServer }) => {
    // Optimize build performance
    config.cache = false;
    return config;
  },
}

module.exports = nextConfig 