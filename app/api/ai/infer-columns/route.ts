import { NextResponse } from 'next/server';
import { openai } from '@/lib/openai';

// Target columns for ferramentas table
const PRODUCT_COLUMNS = [
    { dbColumn: 'nome', label: 'Nome do Produto', required: true, examples: ['Nome', 'Descrição', 'Produto', 'Item', 'Ferramenta', 'Material', 'Description', 'Name'] },
    { dbColumn: 'categoria', label: 'Categoria', required: false, examples: ['Categoria', 'Tipo', 'Grupo', 'Category', 'Type', 'Setor'] },
    { dbColumn: 'codigo', label: 'Código', required: false, examples: ['Código', 'SKU', 'Ref', 'Referência', 'Code', 'ID', 'Part Number'] },
    { dbColumn: 'quantidade_total', label: 'Quantidade Total', required: true, examples: ['Quantidade', 'Qtd', 'Qty', 'Total', 'Estoque', 'Stock', 'Quantidade Total'] },
    { dbColumn: 'quantidade_disponivel', label: 'Quantidade Disponível', required: false, examples: ['Disponível', 'Qtd Disponível', 'Available', 'Em Estoque'] },
    { dbColumn: 'tipo_item', label: 'Tipo de Item', required: false, examples: ['Tipo', 'Tipo Item', 'Type', 'Classificação'] },
    { dbColumn: 'estado', label: 'Estado/Condição', required: false, examples: ['Estado', 'Condição', 'Status', 'Situação', 'Condition'] },
    { dbColumn: 'tamanho', label: 'Tamanho', required: false, examples: ['Tamanho', 'Size', 'Medida', 'Dimensão', 'Tam'] },
    { dbColumn: 'cor', label: 'Cor', required: false, examples: ['Cor', 'Color', 'Colour'] },
    { dbColumn: 'ponto_ressuprimento', label: 'Ponto de Ressuprimento', required: false, examples: ['Ressuprimento', 'Ponto Mínimo', 'Mín', 'Reorder Point', 'Min Stock'] },
];

// Target columns for colaboradores table
const COLLABORATOR_COLUMNS = [
    { dbColumn: 'nome', label: 'Nome Completo', required: true, examples: ['Nome', 'Nome Completo', 'Funcionário', 'Colaborador', 'Name', 'Full Name', 'Employee'] },
    { dbColumn: 'cargo', label: 'Cargo/Função', required: false, examples: ['Cargo', 'Função', 'Position', 'Role', 'Job Title', 'Ocupação'] },
    { dbColumn: 'email', label: 'Email', required: false, examples: ['Email', 'E-mail', 'Correio', 'Mail'] },
    { dbColumn: 'telefone', label: 'Telefone', required: false, examples: ['Telefone', 'Tel', 'Phone', 'Celular', 'Mobile', 'Contato'] },
    { dbColumn: 'cpf', label: 'CPF', required: false, examples: ['CPF', 'Documento', 'Doc', 'ID', 'RG'] },
    { dbColumn: 'endereco', label: 'Endereço', required: false, examples: ['Endereço', 'Address', 'Rua', 'Logradouro', 'Local'] },
    { dbColumn: 'data_admissao', label: 'Data de Admissão', required: false, examples: ['Admissão', 'Data Admissão', 'Hire Date', 'Start Date', 'Entrada', 'Início'] },
    { dbColumn: 'observacoes', label: 'Observações', required: false, examples: ['Observações', 'Obs', 'Notas', 'Notes', 'Comments', 'Comentários'] },
];

export async function POST(req: Request) {
    try {
        const { headers, sampleRows, entityType = 'products' } = await req.json();

        if (!headers || !Array.isArray(headers)) {
            return NextResponse.json(
                { error: 'Headers são obrigatórios' },
                { status: 400 }
            );
        }

        if (!process.env.OPENAI_API_KEY) {
            return NextResponse.json(
                { error: 'Chave da API OpenAI não configurada.' },
                { status: 500 }
            );
        }

        // Select target columns based on entity type
        const TARGET_COLUMNS = entityType === 'collaborators' ? COLLABORATOR_COLUMNS : PRODUCT_COLUMNS;
        const entityLabel = entityType === 'collaborators' ? 'colaboradores' : 'produtos';
        const requiredFieldsHint = entityType === 'collaborators' ? 'nome' : 'nome, quantidade_total';

        // Build prompt for AI
        const targetColumnsDescription = TARGET_COLUMNS.map(col =>
            `- "${col.dbColumn}" (${col.label})${col.required ? ' [OBRIGATÓRIO]' : ''}: Exemplos de nomes comuns: ${col.examples.join(', ')}`
        ).join('\n');

        const sampleDataPreview = sampleRows && sampleRows.length > 0
            ? `\n\nPrimeiras linhas de dados:\n${sampleRows.slice(0, 3).map((row: any[], i: number) =>
                `Linha ${i + 1}: ${headers.map((h: string, j: number) => `${h}="${row[j] ?? ''}"`).join(', ')}`
            ).join('\n')}`
            : '';

        const prompt = `Você é um especialista em mapeamento de colunas de planilhas.

O usuário está importando uma planilha de ${entityLabel} com as seguintes colunas:
${headers.map((h: string, i: number) => `${i + 1}. "${h}"`).join('\n')}
${sampleDataPreview}

Mapeie cada coluna da planilha para o campo correspondente do banco de dados.
Campos alvo disponíveis:
${targetColumnsDescription}

REGRAS:
1. Cada coluna da planilha só pode mapear para UM campo do banco
2. Se uma coluna não corresponder a nenhum campo, use "ignore" como dbColumn
3. Priorize os campos obrigatórios (${requiredFieldsHint})
4. Use o conteúdo das amostras para ajudar na inferência
5. Retorne um array de objetos com: { excelColumn, dbColumn, confidence }
6. confidence deve ser: "high" (90%+), "medium" (60-90%), "low" (<60%)

Responda APENAS com JSON válido no formato:
{
  "mappings": [
    { "excelColumn": "nome da coluna original", "dbColumn": "campo_do_banco", "confidence": "high|medium|low" }
  ],
  "warnings": ["lista de avisos se campos obrigatórios não foram encontrados"]
}`;

        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                { role: "system", content: `Você é um assistente de importação de dados para sistemas de almoxarifado. Está importando ${entityLabel}.` },
                { role: "user", content: prompt }
            ],
            response_format: { type: "json_object" },
            temperature: 0.2,
        });

        const content = response.choices[0].message.content;
        if (!content) throw new Error("Sem resposta da IA");

        const data = JSON.parse(content);

        // Validate and enrich response
        const enrichedMappings = data.mappings.map((m: any) => ({
            ...m,
            label: TARGET_COLUMNS.find(t => t.dbColumn === m.dbColumn)?.label || m.dbColumn,
            required: TARGET_COLUMNS.find(t => t.dbColumn === m.dbColumn)?.required || false
        }));

        return NextResponse.json({
            mappings: enrichedMappings,
            warnings: data.warnings || [],
            targetColumns: TARGET_COLUMNS.map(c => ({ dbColumn: c.dbColumn, label: c.label, required: c.required }))
        });

    } catch (error: any) {
        console.error('Erro ao inferir colunas:', error);
        return NextResponse.json(
            { error: 'Falha ao analisar planilha com IA.' },
            { status: 500 }
        );
    }
}

