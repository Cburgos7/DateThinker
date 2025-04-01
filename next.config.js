/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {},
  outputFileTracing: false,
  output: 'standalone',
  webpack: (config) => {
    config.module.rules.push({
      test: /\.css$/,
      use: ['style-loader', 'css-loader', 'postcss-loader'],
    });
    return config;
  },
};

module.exports = nextConfig; 