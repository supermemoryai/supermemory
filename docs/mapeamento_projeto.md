# Mapeamento do Projeto - Supermemory Fork

Este documento mapeia todos os componentes, funções, hooks e serviços do projeto Supermemory para evitar duplicação e manter a consistência.

## Estrutura do Projeto

### Apps
- **Web App** (`apps/web/`)
  - **Caminho:** `apps/web/`
  - **Responsabilidade:** Aplicação web principal do Supermemory
  - **Tecnologias:** Next.js, React, TypeScript

- **Browser Extension** (`apps/browser-extension/`)
  - **Caminho:** `apps/browser-extension/`
  - **Responsabilidade:** Extensão do navegador para captura de conteúdo
  - **Tecnologias:** WXT, TypeScript

- **Raycast Extension** (`apps/raycast-extension/`)
  - **Caminho:** `apps/raycast-extension/`
  - **Responsabilidade:** Extensão para Raycast
  - **Tecnologias:** TypeScript

- **Documentation** (`apps/docs/`)
  - **Caminho:** `apps/docs/`
  - **Responsabilidade:** Documentação do projeto
  - **Tecnologias:** MDX

### Packages
- **AI SDK** (`packages/ai-sdk/`)
  - **Caminho:** `packages/ai-sdk/`
  - **Responsabilidade:** SDK para integração com AI
  - **Tecnologias:** TypeScript

- **Hooks** (`packages/hooks/`)
  - **Caminho:** `packages/hooks/`
  - **Responsabilidade:** Hooks reutilizáveis
  - **Tecnologias:** TypeScript

- **Lib** (`packages/lib/`)
  - **Caminho:** `packages/lib/`
  - **Responsabilidade:** Bibliotecas compartilhadas
  - **Tecnologias:** TypeScript

- **Tools** (`packages/tools/`)
  - **Caminho:** `packages/tools/`
  - **Responsabilidade:** Ferramentas e utilitários
  - **Tecnologias:** TypeScript

- **UI** (`packages/ui/`)
  - **Caminho:** `packages/ui/`
  - **Responsabilidade:** Componentes de interface
  - **Tecnologias:** React, TypeScript

- **Validation** (`packages/validation/`)
  - **Caminho:** `packages/validation/`
  - **Responsabilidade:** Schemas de validação
  - **Tecnologias:** Zod, TypeScript

- **OpenAI SDK Python** (`packages/openai-sdk-python/`)
  - **Caminho:** `packages/openai-sdk-python/`
  - **Responsabilidade:** SDK Python para OpenAI
  - **Tecnologias:** Python

## Configuração do Fork

### Remotes
- **Origin:** `https://github.com/chmr1/supermemory.git` (fork pessoal)
- **Upstream:** `https://github.com/supermemoryai/supermemory.git` (repositório original)

### Branches
- **main:** Branch principal sincronizada com upstream
- **develop:** Branch de desenvolvimento para novas features

### Última Sincronização
- **Data:** 13/10/2025
- **Commits sincronizados:** 69 arquivos atualizados
- **Principais mudanças:** Novas funcionalidades de integração, melhorias na UI, novos SDKs
