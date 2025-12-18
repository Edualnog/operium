# Operium Observer Doctrine & Valuation Narrative

## 1. OBSERVER DOCTRINE
A Operium é uma plataforma de observação operacional industrial.

*   **Imutabilidade:** Eventos são imutáveis. O histórico é a verdade.
*   **Privacidade Interna (Assimetria):** A memória (scores, perfis comportamentais) é estritamente interna. Nunca deve ser exposta diretamente ao usuário final.
*   **Feedback Sintomático:** O feedback ao usuário deve se limitar a sintomas operacionais visíveis e mensagens derivadas. Nunca mostrar scores de confiança, maturidade ou rankings de forma crua.
*   **Assimetria Informacional:** A assimetria é intencional e estratégica. A plataforma sabe mais do que mostra para preservar a governança e a autoridade dos dados.

## 2. VALUATION NARRATIVE
O equity da Operium reside no **histórico longitudinal irreversível**, no **grafo comportamental industrial** e na capacidade de **observação cross-industry**.

*   **O Software é o Canal:** O software operacional (ERP/WMS) é apenas o meio de coleta. O valor real é o dado estruturado e a inteligência derivada.
*   **Moat Estrutural:** Qualquer decisão técnica deve preservar e ampliar essa capacidade de observação e inteligência histórica.

## 3. DIRETRIZES OBRIGATÓRIAS (Rules of Engagement)

1.  **Nunca expor memória ou scores internos ao usuário final.**
    *   *Exceção:* Views administrativas protegidas por feature flags (`OBSERVER_INTERNAL_VIEW`) para fins de debug/análise interna.
2.  **Nunca remover ou simplificar coleta de dados por "não uso imediato".**
    *   Todo dado é um ponto no grafo histórico. O valor pode ser latente.
3.  **Nunca criar IA, ranking ou benchmark público sem preservar anonimização e assimetria.**
    *   Benchmarks devem ser agregados e anônimos.
4.  **Priorizar histórico, observação e governança sobre features visuais.**
    *   A integridade do log de eventos (`analytics.events_log`) é mais crítica do que a UI do dashboard.
5.  **Critério de Avaliação de Mudanças:**
    *   Toda mudança proposta deve ser avaliada com a pergunta: *"Isso respeita a Observer Doctrine e aumenta o valuation estrutural da Operium?"*
