import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/dashboard/', '/api/', '/onboarding/', '/app/', '/offline/'],
    },
    sitemap: 'https://operium.com.br/sitemap.xml',
  }
}
