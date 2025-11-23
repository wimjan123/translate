/** @type {import('next').NextConfig} */
const nextConfig = {
  // Disable standalone output since we're using a custom server
  // The custom server (Fastify + Socket.io) handles routing
  webpack: (config, { isServer }) => {
    // Fix for optional dependencies in Socket.io and Deepgram SDK
    config.externals = config.externals || [];
    if (isServer) {
      config.externals.push({
        'utf-8-validate': 'commonjs utf-8-validate',
        'bufferutil': 'commonjs bufferutil',
      });
    }
    return config;
  },
};

module.exports = nextConfig;
