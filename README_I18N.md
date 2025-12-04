# Internacionalização (i18n)

Este projeto utiliza `react-i18next` e `i18next` para suporte a múltiplos idiomas (Inglês e Português Brasileiro).

## Estrutura

- **Configuração**: `lib/i18n.ts`
- **Arquivos de Tradução**:
  - `public/locales/en/common.json` (Inglês - Padrão)
  - `public/locales/pt/common.json` (Português)
- **Componentes**:
  - `components/I18nProvider.tsx`: Provider que envolve a aplicação em `app/layout.tsx`.
  - `components/LanguageSwitcher.tsx`: Componente para troca de idioma.

## Como adicionar novas traduções

1.  Identifique o texto hardcoded no componente.
2.  Crie uma chave semântica no arquivo `public/locales/en/common.json`.
    Exemplo:
    ```json
    "dashboard": {
      "new_feature": {
        "title": "New Feature Title"
      }
    }
    ```
3.  Adicione a tradução correspondente em `public/locales/pt/common.json`.
4.  No componente, utilize o hook `useTranslation`:

    ```tsx
    import { useTranslation } from 'react-i18next';

    export function MyComponent() {
      const { t } = useTranslation('common');

      return <h1>{t('dashboard.new_feature.title')}</h1>;
    }
    ```

## Como adicionar um novo idioma

1.  Crie uma nova pasta em `public/locales` (ex: `es`).
2.  Adicione o arquivo `common.json` traduzido.
3.  Atualize `lib/i18n.ts` para incluir o novo idioma em `supportedLngs`.
4.  Atualize `components/LanguageSwitcher.tsx` para adicionar a opção no menu.

## Padrões

- **Chaves**: Use snake_case e aninhamento para organizar (ex: `auth.login_button`).
- **Inglês**: O inglês é o idioma padrão e de fallback.
- **Interpolação**: Use `{{value}}` para valores dinâmicos.
  - JSON: `"welcome": "Welcome, {{name}}"`
  - Componente: `t('welcome', { name: user.name })`
