/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    optimizeCss: true,
    esmExternals: 'loose'
  },
  outputFileTracing: false,
  output: "standalone"
};

module.exports = nextConfig; 