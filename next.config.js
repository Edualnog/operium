/** @type {import('next').NextConfig} */
const nextConfig = {
  // Otimizações de performance
  compress: true,
  poweredByHeader: false,
  reactStrictMode: true,
  // Otimização de imagens (se usar no futuro)
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'cmgmobhnrjawfdafhqko.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
    formats: ['image/avif', 'image/webp'],
  },
  // Otimizações de bundle
  swcMinify: true,
  // Otimização de compilação
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },
}

module.exports = nextConfig
