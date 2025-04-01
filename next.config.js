const nextConfig = {
  experimental: {
    optimizeCss: true,
    esmExternals: 'loose'
  },
  // Avoid complex exclusion patterns that might cause recursion
  outputFileTracing: true,
  output: "standalone"
};

module.exports = nextConfig;
