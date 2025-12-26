import type { Metadata } from "next"
import { Inter } from "next/font/google"
import Script from "next/script"
import "./globals.css"
import { ThemeProvider } from "@/components/providers/ThemeProvider"
import { SpeedInsights } from "@vercel/speed-insights/next"
import { Analytics } from "@vercel/analytics/next"
import OfflineBanner from "@/components/offline/OfflineBanner"
import { ServiceWorkerRegistration } from "@/components/offline/ServiceWorkerRegistration"
import { CommandMenu } from "@/components/ui/command-menu"
import I18nProvider from "@/components/I18nProvider"
import { ToastProvider } from "@/components/ui/toast-context"
import { QueryProvider } from "@/lib/providers/query-provider"

// Otimização de fonte: display swap para melhor performance (evita FOIT - Flash of Invisible Text)
const inter = Inter({
  subsets: ["latin"],
  display: 'swap',
  fallback: ['system-ui', 'arial'],
  adjustFontFallback: true,
})

export const metadata: Metadata = {
  title: "Operium - Gestão Inteligente de Ativos e Equipes de Campo",
  description: "A plataforma #1 para controle de ferramentas, EPIs e veículos. Elimine planilhas e perdas agora mesmo. Software 100% Gratuito para sua empresa.",
  keywords: ["gestão de ativos", "controle de ferramentas", "equipes de campo", "almoxarifado digital", "prevenção de perdas", "sistema grátis", "software gratuito", "construção civil"],
  authors: [{ name: "Operium" }],
  creator: "Operium",
  metadataBase: new URL("https://operium.com.br"),
  alternates: {
    canonical: "https://operium.com.br",
  },
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    shortcut: "/favicon.ico",
    apple: "/icons/icon-192.png",
    other: [
      {
        rel: "apple-touch-icon-precomposed",
        url: "/icons/icon-192.png",
      },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Operium",
  },
  formatDetection: {
    telephone: false,
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
  openGraph: {
    type: "website",
    locale: "pt_BR",
    url: "https://operium.com.br",
    title: "Operium - Gestão Inteligente de Ativos e Equipes de Campo",
    description: "Software 100% Gratuito. Controle ferramentas, EPIs, frota e equipes externas sem custos. Elimine planilhas hoje!",
    siteName: "Operium",
    images: [
      {
        url: "/images/og-image-operium.png",
        width: 1200,
        height: 630,
        alt: "Operium - Gestão de Ativos 100% Gratuita",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Operium - Gestão Inteligente de Ativos e Equipes",
    description: "Sistema 100% Gratuito para controle de almoxarifado e equipes de campo.",
    images: ["/images/og-image-operium.png"],
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <meta name="theme-color" content="#4B6BFB" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
      </head>
      <body className={`${inter.className} bg-[#F7F7F5] dark:bg-zinc-900`}>
        {/* Google Analytics - lazyOnload para não bloquear renderização */}
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-T7QX1XRLMJ"
          strategy="lazyOnload"
        />
        <Script id="google-analytics" strategy="lazyOnload">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-T7QX1XRLMJ');
          `}
        </Script>

        {/* Cloudflare Web Analytics - lazyOnload para não bloquear renderização */}
        <Script
          src="https://static.cloudflareinsights.com/beacon.min.js"
          data-cf-beacon='{"token": "8643a05aafb74f4594fa79fac639ded8"}'
          strategy="lazyOnload"
        />

        <QueryProvider>
          <I18nProvider>
            <ThemeProvider
              attribute="class"
              defaultTheme="light"
              enableSystem={false}
              disableTransitionOnChange
            >
              <ToastProvider>
                <OfflineBanner />
                <CommandMenu />
                {children}
              </ToastProvider>
            </ThemeProvider>
          </I18nProvider>
        </QueryProvider>
        <ServiceWorkerRegistration />
        <SpeedInsights />
        <Analytics />
      </body>
    </html>
  )
}
