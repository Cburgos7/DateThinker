const nextConfig = {
  experimental: {
    optimizeCss: true,
    esmExternals: 'loose'
  },
  // Change these settings to avoid the recursion issue
  output: "export",
  // Disable file tracing completely since it's causing the stack overflow
  outputFileTracing: false
};

module.exports = nextConfig;
