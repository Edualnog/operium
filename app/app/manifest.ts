import type { MetadataRoute } from 'next'

/**
 * Manifest específico para o App de Campo (TWA-ready)
 * Acessível em /app/manifest.webmanifest
 */
export default function manifest(): MetadataRoute.Manifest {
    return {
        name: 'Operium Campo',
        short_name: 'Operium',
        description: 'App de campo para colaboradores externos - Relatórios, despesas e equipamentos',
        start_url: '/app',
        scope: '/app',
        display: 'standalone',
        background_color: '#F2F2F7',
        theme_color: '#18181B',
        orientation: 'portrait-primary',
        categories: ['business', 'productivity'],
        lang: 'pt-BR',
        dir: 'ltr',
        icons: [
            {
                src: '/icons/icon-72.png',
                sizes: '72x72',
                type: 'image/png',
                purpose: 'any',
            },
            {
                src: '/icons/icon-96.png',
                sizes: '96x96',
                type: 'image/png',
                purpose: 'any',
            },
            {
                src: '/icons/icon-128.png',
                sizes: '128x128',
                type: 'image/png',
                purpose: 'any',
            },
            {
                src: '/icons/icon-144.png',
                sizes: '144x144',
                type: 'image/png',
                purpose: 'any',
            },
            {
                src: '/icons/icon-152.png',
                sizes: '152x152',
                type: 'image/png',
                purpose: 'any',
            },
            {
                src: '/icons/icon-192.png',
                sizes: '192x192',
                type: 'image/png',
                purpose: 'any',
            },
            {
                src: '/icons/icon-384.png',
                sizes: '384x384',
                type: 'image/png',
                purpose: 'any',
            },
            {
                src: '/icons/icon-512.png',
                sizes: '512x512',
                type: 'image/png',
                purpose: 'any',
            },
            {
                src: '/icons/icon-maskable-192.png',
                sizes: '192x192',
                type: 'image/png',
                purpose: 'maskable',
            },
            {
                src: '/icons/icon-maskable-512.png',
                sizes: '512x512',
                type: 'image/png',
                purpose: 'maskable',
            },
        ],
        screenshots: [
            {
                src: '/screenshots/app-home.png',
                sizes: '1080x1920',
                type: 'image/png',
                // @ts-ignore - form_factor is valid but not in Next.js types
                form_factor: 'narrow',
                label: 'Tela inicial do app de campo',
            },
        ],
        // @ts-ignore - shortcuts is valid but not fully typed
        shortcuts: [
            {
                name: 'Novo Relatório',
                short_name: 'Relatório',
                description: 'Criar relatório diário',
                url: '/app?action=report',
                icons: [{ src: '/icons/shortcut-report.png', sizes: '96x96' }],
            },
            {
                name: 'Nova Despesa',
                short_name: 'Despesa',
                description: 'Registrar despesa de veículo',
                url: '/app?action=expense',
                icons: [{ src: '/icons/shortcut-expense.png', sizes: '96x96' }],
            },
        ],
        // @ts-ignore - prefer_related_applications for TWA
        prefer_related_applications: false,
    }
}
