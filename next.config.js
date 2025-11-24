/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: true,
  },
  // Otimizações de performance
  compress: true,
  poweredByHeader: false,
  reactStrictMode: true,
  // Otimização de imagens (se usar no futuro)
  images: {
    formats: ['image/avif', 'image/webp'],
  },
}

module.exports = nextConfig
