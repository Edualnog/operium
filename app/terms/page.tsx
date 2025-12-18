import React from 'react'
import Link from 'next/link'

export default function TermsPage() {
    return (
        <div className="container mx-auto px-4 py-8 max-w-4xl">
            <Link href="/" className="text-blue-600 hover:underline text-sm mb-6 inline-block">
                ← Voltar
            </Link>
            <h1 className="text-3xl font-bold mb-6">Termos de Uso</h1>
            <div className="prose prose-slate max-w-none">
                <p>Última atualização: {new Date().toLocaleDateString('pt-BR')}</p>

                <h2>1. Aceitação dos Termos</h2>
                <p>Ao acessar e usar o Operium, você concorda em cumprir e ficar vinculado aos seguintes termos e condições de uso.</p>

                <h2>2. Descrição do Serviço</h2>
                <p>O Operium é uma plataforma de gestão de almoxarifado que permite o controle de estoque, ferramentas e movimentações.</p>

                <h2>3. Conta do Usuário</h2>
                <p>Para usar o serviço, você deve criar uma conta. Você é responsável por manter a confidencialidade de sua conta e senha.</p>

                <h2>4. Planos e Pagamentos</h2>
                <p>O serviço é oferecido em planos de assinatura. Detalhes sobre preços e recursos estão disponíveis na página de preços.</p>

                <h2>5. Cancelamento</h2>
                <p>Você pode cancelar sua assinatura a qualquer momento através do painel de controle.</p>

                <h2>6. Contato</h2>
                <p>Para questões sobre estes termos, entre em contato: <a href="mailto:operiumtechnologies@gmail.com" className="text-blue-600 hover:underline">operiumtechnologies@gmail.com</a></p>
            </div>
        </div>
    )
}
