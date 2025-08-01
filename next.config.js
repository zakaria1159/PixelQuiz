/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['localhost'],
    unoptimized: true
  },
  experimental: {
    typedRoutes: false  // Disabled to avoid router.push type issues
  }
}

module.exports = nextConfig