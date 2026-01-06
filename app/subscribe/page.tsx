"use client"

import { ArrowRight, Check, Shield, Smartphone, Headphones, Zap, RefreshCw } from "lucide-react"
import Link from "next/link"

const KIWIFY_CHECKOUT_URL = "https://pay.kiwify.com.br/5vMhx4B"

const features = [
  { icon: Shield, text: "Licença vitalícia - pague uma vez, use para sempre" },
  { icon: Headphones, text: "Suporte vitalício incluído por email e WhatsApp" },
  { icon: Smartphone, text: "App mobile incluso para sua equipe de campo" },
  { icon: Zap, text: "Atualizações gratuitas para sempre" },
  { icon: RefreshCw, text: "7 dias de garantia - reembolso total se não gostar" },
]

export default function SubscribePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex flex-col items-center justify-center p-4">
      <div className="max-w-lg w-full">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-10 h-10 bg-[#1C1C1C] rounded-xl flex items-center justify-center">
            <span className="text-white font-bold text-lg">O</span>
          </div>
          <span className="text-2xl font-bold text-slate-900">Operium</span>
        </div>

        {/* Card principal */}
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-slate-900 mb-2">
              Adquira sua licença
            </h1>
            <p className="text-slate-600">
              Seu período de avaliação expirou. Adquira a licença vitalícia para continuar usando o Operium.
            </p>
          </div>

          {/* Features */}
          <div className="space-y-3 mb-8">
            {features.map((feature, index) => (
              <div key={index} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0">
                  <feature.icon className="w-4 h-4 text-emerald-600" />
                </div>
                <span className="text-sm text-slate-700">{feature.text}</span>
              </div>
            ))}
          </div>

          {/* CTA Button */}
          <a
            href={KIWIFY_CHECKOUT_URL}
            className="w-full bg-[#1C1C1C] hover:bg-[#37352f] text-white px-6 py-4 rounded-xl font-bold text-lg transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2 group"
          >
            Adquirir licença vitalícia
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </a>

          <p className="text-center text-xs text-slate-500 mt-4">
            Suporte vitalício • 7 dias de garantia • Pagamento seguro via Kiwify
          </p>
        </div>

        {/* Links */}
        <div className="flex items-center justify-center gap-4 mt-6 text-sm">
          <Link href="/" className="text-slate-500 hover:text-slate-700 transition-colors">
            Voltar ao início
          </Link>
          <span className="text-slate-300">•</span>
          <Link href="/login" className="text-slate-500 hover:text-slate-700 transition-colors">
            Já tenho licença
          </Link>
        </div>
      </div>
    </div>
  )
}
