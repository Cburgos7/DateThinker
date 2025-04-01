/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  // Configure dynamic routes
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: '/api/:path*',
      },
    ];
  }
};

module.exports = nextConfig; 