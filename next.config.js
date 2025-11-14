// next.config.js
/** @type {import('next').NextConfig} */
module.exports = {
  webpack: (config, { isServer }) => {
    if (isServer) {
      if (!config.externals) config.externals = [];
      // prevent webpack from bundling @napi-rs/canvas binaries
      config.externals.push('@napi-rs/canvas');
    }
    return config;
  },
  experimental: {
    esmExternals: 'loose',
  },
};
