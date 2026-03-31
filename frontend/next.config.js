/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allow API proxying from SSR to the internal backend URL
  async rewrites() {
    const backendBase = process.env.API_URL_INTERNAL || 'http://localhost:8000'
    return [
      {
        source: '/api/v1/:path*',
        destination: `${backendBase}/api/v1/:path*`,
      },
      {
        source: '/media/:path*',
        destination: `${backendBase}/media/:path*`,
      },
    ]
  },
}

module.exports = nextConfig
