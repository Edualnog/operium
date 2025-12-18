import React from 'react'
import Link from 'next/link'

export default function PrivacyPage() {
    return (
        <div className="container mx-auto px-4 py-8 max-w-4xl">
            <Link href="/" className="text-blue-600 hover:underline text-sm mb-6 inline-block">
                ← Voltar
            </Link>
            <h1 className="text-3xl font-bold mb-6">Política de Privacidade</h1>
            <div className="prose prose-slate max-w-none">
                <p>Última atualização: {new Date().toLocaleDateString('pt-BR')}</p>

                <h2>1. Coleta de Informações</h2>
                <p>Coletamos informações que você nos fornece diretamente, como nome, email e dados da empresa ao criar uma conta.</p>

                <h2>2. Uso das Informações</h2>
                <p>Usamos as informações coletadas para fornecer, manter e melhorar nossos serviços, processar transações e enviar comunicações relacionadas ao serviço.</p>

                <h2>3. Compartilhamento de Informações</h2>
                <p>Não vendemos suas informações pessoais. Compartilhamos dados apenas com prestadores de serviços terceirizados necessários para a operação do sistema (ex: processamento de pagamentos).</p>

                <h2>4. Segurança de Dados</h2>
                <p>Implementamos medidas de segurança para proteger suas informações contra acesso não autorizado, alteração ou destruição.</p>

                <h2>5. Seus Direitos</h2>
                <p>Você tem o direito de acessar, corrigir ou excluir suas informações pessoais a qualquer momento.</p>

                <h2>6. Contato</h2>
                <p>Para questões sobre esta política de privacidade, entre em contato: <a href="mailto:operiumtechnologies@gmail.com" className="text-blue-600 hover:underline">operiumtechnologies@gmail.com</a></p>
            </div>
        </div>
    )
}
