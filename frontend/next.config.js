/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allow API proxying from SSR to the internal backend URL
  async rewrites() {
    return [
      {
        source: '/api/v1/:path*',
        destination: `${process.env.API_URL_INTERNAL || 'http://localhost:8000/api/v1'}/:path*`,
      },
    ]
  },
}

module.exports = nextConfig
