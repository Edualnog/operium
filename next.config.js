const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://www.gstatic.com https://vercel.live; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https://cmgmobhnrjawfdafhqko.supabase.co; font-src 'self' data:; connect-src 'self' https://cmgmobhnrjawfdafhqko.supabase.co https://*.supabase.co https://www.google-analytics.com https://stats.g.doubleclick.net https://vitals.vercel-insights.com; frame-src 'self' https://vercel.live; frame-ancestors 'self' https://vercel.live; base-uri 'self'; form-action 'self'; object-src 'none';",
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
  {
    key: 'X-Frame-Options',
    value: 'DENY',
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=()'
  }
]

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
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
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

  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ]
  },
}

module.exports = nextConfig
