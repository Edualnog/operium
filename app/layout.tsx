import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/providers/ThemeProvider"
import { SpeedInsights } from "@vercel/speed-insights/next"
import OfflineBanner from "@/components/offline/OfflineBanner"
import { ServiceWorkerRegistration } from "@/components/offline/ServiceWorkerRegistration"

// Otimização de fonte: display swap para melhor performance (evita FOIT - Flash of Invisible Text)
const inter = Inter({ 
  subsets: ["latin"],
  display: 'swap',
  fallback: ['system-ui', 'arial'],
  adjustFontFallback: true,
})

export const metadata: Metadata = {
  title: "Almox Fácil - Gestão de Almoxarifado Simples e Poderosa",
  description: "Controle seu estoque, ferramentas, colaboradores e movimentações em uma plataforma completa. 7 dias grátis para testar!",
  keywords: ["almoxarifado", "gestão de estoque", "controle de ferramentas", "ERP", "indústria"],
  authors: [{ name: "Almox Fácil" }],
  creator: "Almox Fácil",
  metadataBase: new URL("https://almoxfacil.alnog.com.br"),
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Almox Fácil",
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
    url: "https://almoxfacil.alnog.com.br",
    title: "Almox Fácil - Gestão de Almoxarifado Simples e Poderosa",
    description: "Controle seu estoque, ferramentas, colaboradores e movimentações em uma plataforma completa. 7 dias grátis para testar!",
    siteName: "Almox Fácil",
    images: [
      {
        url: "/images/mockup-devices.png",
        width: 1200,
        height: 630,
        alt: "Almox Fácil - Gestão de Almoxarifado em Desktop, Tablet e Mobile",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Almox Fácil - Gestão de Almoxarifado Simples e Poderosa",
    description: "Controle seu estoque, ferramentas, colaboradores e movimentações em uma plataforma completa.",
    images: ["/images/mockup-devices.png"],
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    shortcut: "/icons/icon-192.png",
    apple: "/icons/icon-192.png",
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR" suppressHydrationWarning className="light">
      <head>
        <meta name="theme-color" content="#4B6BFB" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
      </head>
      <body className={`${inter.className} bg-white`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={false}
          disableTransitionOnChange
        >
          <OfflineBanner />
          {children}
        </ThemeProvider>
        <ServiceWorkerRegistration />
        <SpeedInsights />
      </body>
    </html>
  )
}
