/** @type {import('next').NextConfig} */
const nextConfig = {
  // Configuração básica e estável
  compress: true,
  poweredByHeader: false,
  // Ativar Strict Mode ajuda a identificar efeitos colaterais em dev
  reactStrictMode: true,
  swcMinify: true,
  // Otimização de imagens
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
  // Compilador
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },
}

module.exports = nextConfig
