export const LEGAL_VERSIONS = {
    TERMS: 'v1.0',
    PRIVACY: 'v1.0',
    DATA_POLICY: 'v1.0'
} as const

// Document IDs matching DB 'agreement_type'
export const AGREEMENT_TYPES = {
    TERMS: 'terms_of_use',
    PRIVACY: 'privacy_policy',
    DATA_POLICY: 'data_policy'
} as const

export const LEGAL_CONTENT = {
    TERMS: `
## 1. Termos de Uso
**Última atualização:** 17 de Dezembro de 2025

Bem-vindo ao **Operium**. Ao acessar ou utilizar nossa plataforma, você concorda com estes Termos de Uso. Este é um contrato vinculativo entre você (o "Usuário" ou "Cliente") e a Operium ("Nós" ou "Plataforma").

### 1. O Serviço
O Operium é um software como serviço (SaaS) destinado à gestão e controle de almoxarifados, ferramentas e ativos industriais. Nossa função é fornecer a infraestrutura digital para rastreamento, registro de eventos e organização de inventário.
**Importante:** O Operium é uma ferramenta de apoio à gestão. Nós não tomamos decisões operacionais por você, não substituímos a supervisão humana e não nos responsabilizamos por perdas físicas de ativos.

### 2. Uso Aceitável
Você concorda em utilizar a plataforma apenas para fins legais e operacionais legítimos. É estritamente proibido:
- Utilizar o sistema para fins ilícitos ou para armazenar conteúdos ilegais.
- Tentar violar a segurança técnica, realizar engenharia reversa ou explorar vulnerabilidades do sistema.
- Inserir dados falsos intencionalmente para manipular métricas ou relatórios.
- Compartilhar suas credenciais de acesso com terceiros.

### 3. Responsabilidades do Usuário
- **Cadastro:** Você é responsável pela veracidade dos dados inseridos e pela atualização do cadastro da sua empresa e colaboradores.
- **Segurança:** Você é responsável por manter a confidencialidade de suas senhas e tokens de acesso (API Keys).
- **Conteúdo:** Você detém a propriedade intelectual dos dados operacionais inseridos (ex: lista de ativos, nomes de funcionários), concedendo à Operium licença para processá-los conforme descrito na Política de Privacidade.

### 4. Limitação de Responsabilidade
A Operium é fornecida "como está" (as-is). Embora empreguemos as melhores práticas de engenharia e segurança:
- **Não garantimos** que a plataforma estará livre de erros ou interrupções 100% do tempo.
- **Não nos responsabilizamos** por lucros cessantes, perdas de produção, danos a equipamentos ou decisões tomadas com base em relatórios do sistema. O gestor é o tomador de decisão final.
- Nossa responsabilidade financeira máxima está limitada ao valor pago pelo Cliente nos últimos 12 meses de assinatura.

### 5. Propriedade Intelectual
O software Operium, seu código-fonte, design, algoritmos, a tecnologia "Blackbox" e a marca são de propriedade exclusiva da Operium. O uso da plataforma não transfere nenhum direito de propriedade intelectual ao Cliente.

### 6. Cancelamento e Rescisão
- **Pelo Cliente:** Você pode cancelar sua assinatura a qualquer momento através do painel administrativo. O acesso será mantido até o fim do ciclo de faturamento vigente.
- **Pela Operium:** Podemos suspender ou encerrar contas que violem estes Termos, mediante aviso prévio, exceto em casos de segurança crítica ou ilegalidade flagrante.

### 7. Foro
Estes termos são regidos pelas leis da República Federativa do Brasil. Fica eleito o foro da comarca da sede da Operium para dirimir quaisquer questões decorrentes deste contrato.
`,

    PRIVACY: `
## 2. Política de Privacidade
**Última atualização:** 17 de Dezembro de 2025

A Operium leva a privacidade e a segurança de dados a sério. Esta política descreve como tratamos informações em nossa plataforma, em conformidade com a Lei Geral de Proteção de Dados (LGPD).

### 1. Tipos de Dados Coletados
Nós coletamos e processamos três categorias distintas de dados:
#### A. Dados de Cadastro (Cliente/Admin)
Dados necessários para faturamento e gestão da conta:
- Razão Social, CNPJ.
- Nome, e-mail e telefone do administrador da conta.
- Dados de pagamento (processados por gateway seguro externo).

#### B. Dados Pessoais de Operadores (Colaboradores)
Dados inseridos pelo Cliente para identificar quem retirou ou devolveu equipamentos:
- Nome completo.
- Identificação interna (ex: matrícula, e-mail corporativo).
- Cargo/Função.
**Nota:** O Cliente é o Controlador destes dados e a Operium atua como Operadora. Cabe ao Cliente informar seus colaboradores sobre o uso da ferramenta.

#### C. Dados Operacionais e de Ativos (Não-Pessoais)
Dados sobre os equipamentos e sua vida útil:
- Tipos de ferramentas, marcas, modelos, números de série.
- Histórico de manutenção, quebras e descartes.
- Tempos de uso e ciclos de operação.

### 2. Uso dos Dados
Utilizamos os dados para:
- **Prestação do Serviço:** Permitir o controle de retiradas, devoluções e inventário.
- **Segurança e Auditoria:** Registrar logs de acesso e ações no sistema.
- **Comunicação:** Enviar alertas de manutenção, relatórios e avisos importantes sobre a conta.
- **Melhoria do Produto:** Analisar como os recursos são utilizados para desenvolver novas funcionalidades (sempre de forma agregada).

### 3. Tratamento de Dados para Analytics (Blackbox)
Utilizamos dados operacionais (Categoria C) para gerar inteligência de mercado e benchmarks industriais.
- **Anonimização:** Qualquer análise estatística cruzada entre clientes remove completamente identificadores pessoais e nomes de empresas.
- **Objetivo:** Identificar, por exemplo, qual marca de furadeira tem maior durabilidade média no mercado, sem identificar quem as utilizou.

### 4. Compartilhamento de Dados
- **Não vendemos dados pessoais.**
- Compartilhamos dados estritamente necessários com parceiros de infraestrutura (servidores cloud, processamento de pagamentos), que seguem rígidos padrões de segurança.
- Poderemos compartilhar relatórios estatísticos agregados e anonimizados com parceiros da indústria, sem jamais expor dados individuais.

### 5. Segurança
Adotamos medidas técnicas robustas, incluindo criptografia em trânsito e em repouso, controle de acesso estrito e monitoramento contínuo para proteger os dados.

### 6. Seus Direitos (LGPD)
Como titular de dados, você tem direito a solicitar acesso, correção, anonimização ou exclusão de seus dados pessoais. Solicitações devem ser enviadas para nosso Encarregado de Dados (DPO) através do canal de suporte.
`,

    DATA_POLICY: `
## 3. Política de Dados & Analytics ("Blackbox")
**Transparência sobre nossa Inteligência de Dados**

O Operium possui um motor de inteligência interno conhecido como **"Blackbox"**. Criamos este documento para explicar, de forma simples e transparente, o que ele faz e, principalmente, o que ele **NÃO** faz.

### 1. O que é o Blackbox?
É o nosso sistema de processamento de eventos. Cada vez que uma ferramenta é retirada, devolvida, quebrada ou consertada, o Blackbox registra esse fato como um "evento". Com o tempo, esses eventos formam um histórico que nos ajuda a entender a vida útil dos equipamentos e a eficiência dos processos.

### 2. O que nós analisamos?
Focamos exclusivamente em **Ativos** e **Processos**.
- **Ativos:** Qual a durabilidade de uma marca X vs. marca Y? Quanto tempo leva em média para uma serra precisar de manutenção?
- **Processos:** Qual o tempo médio de devolução? Há gargalos no almoxarifado?

### 3. O que nós NÃO analisamos (Princípio de Não-Vigilância)
**Não monitoramos performance individual de pessoas.**
O Operium não cria rankings de "melhores ou piores" funcionários, nem utiliza inteligência artificial para vigiar o comportamento individual dos seus colaboradores.
Nosso objetivo é garantir que a ferramenta que o colaborador recebe esteja segura e funcionando, não julgar quem a está usando.

### 4. O Indicador DATA_CONFIDENCE
Nem todo dado é útil. Dados incompletos ou muito recentes podem levar a conclusões erradas. Por isso, criamos o **Data Confidence** (Confiança dos Dados), um selo interno que classifica a maturidade das informações em três níveis:
- **LOW (Baixa):** Poucos dados ou uso recente. O sistema evita fechar diagnósticos sobre durabilidade ou eficiência aqui.
- **MEDIUM (Média):** Dados consistentes, permitindo visualizar tendências.
- **HIGH (Alta):** Dados robustos e históricos, permitindo análises estatísticas precisas.

### 5. Uso Futuro e Agregado
Acreditamos que dados compartilhados (e protegidos) criam uma indústria mais forte. Futuramente, poderemos usar a inteligência coletiva (anonimizada) para:
- Ajudar fabricantes a construir ferramentas mais seguras.
- Ajudar empresas a comprar equipamentos com melhor custo-benefício.
- Prever riscos de acidentes antes que aconteçam.

Tudo isso respeitando a privacidade absoluta da sua empresa e dos seus colaboradores.
`
} as const
