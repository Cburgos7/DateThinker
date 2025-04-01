const nextConfig = {
  experimental: {
    optimizeCss: true,
    esmExternals: 'loose'
  },
  // Disable file tracing completely since it's causing the stack overflow
  outputFileTracing: false
};

module.exports = nextConfig;
