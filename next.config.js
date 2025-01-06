/** @type {import('next').NextConfig} */
const nextConfig = {
  serverRuntimeConfig: {
    PROJECT_ROOT: __dirname,
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb'
    }
  },
  api: {
    bodyParser: {
      sizeLimit: '10mb'
    },
    responseLimit: '10mb'
  },
  images: {
    domains: ['res.cloudinary.com'],
    unoptimized: true
  },
  webpack: (config, { isServer }) => {
    // Fixes npm packages that depend on `fs` module
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
      }
    }
    return config
  }
}

module.exports = nextConfig
