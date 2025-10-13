# Arquitetura do Projeto - Supermemory Fork

## Visão Geral

Este projeto é um fork do [Supermemory](https://github.com/supermemoryai/supermemory), uma engine de memória extremamente rápida e escalável para a era da IA. O projeto mantém a arquitetura original enquanto permite desenvolvimento independente.

## Arquitetura de Alto Nível

### Monorepo Structure
O projeto utiliza uma estrutura de monorepo com múltiplas aplicações e pacotes:

```
supermemory/
├── apps/                    # Aplicações
│   ├── web/                # Aplicação web principal
│   ├── browser-extension/  # Extensão do navegador
│   ├── raycast-extension/  # Extensão Raycast
│   └── docs/               # Documentação
├── packages/               # Pacotes compartilhados
│   ├── ai-sdk/            # SDK para AI
│   ├── hooks/             # Hooks reutilizáveis
│   ├── lib/               # Bibliotecas compartilhadas
│   ├── tools/             # Ferramentas e utilitários
│   ├── ui/                # Componentes de interface
│   ├── validation/        # Schemas de validação
│   └── openai-sdk-python/ # SDK Python para OpenAI
```

### Tecnologias Principais

#### Frontend
- **Next.js 14+** - Framework React para aplicação web
- **React 18+** - Biblioteca de interface
- **TypeScript** - Tipagem estática
- **Tailwind CSS** - Framework CSS
- **WXT** - Framework para extensões de navegador

#### Backend
- **Cloudflare Workers** - Runtime serverless
- **PostgreSQL** - Banco de dados principal
- **Drizzle ORM** - ORM para TypeScript
- **Hono** - Framework web leve

#### AI & ML
- **AI SDK** - SDK para integração com modelos de IA
- **OpenAI API** - Integração com GPT
- **Anthropic Claude** - Integração com Claude
- **Google Gemini** - Integração com Gemini

### Padrões de Design

#### 1. Monorepo com Workspaces
- Gerenciamento centralizado de dependências
- Compartilhamento de código entre aplicações
- Build otimizado com Turbo

#### 2. Arquitetura de Componentes
- Componentes reutilizáveis em `packages/ui/`
- Hooks customizados em `packages/hooks/`
- Validação centralizada em `packages/validation/`

#### 3. Integração com IA
- SDK unificado para diferentes provedores de IA
- Ferramentas padronizadas para MCP (Model Context Protocol)
- Suporte a múltiplos modelos de linguagem

### Fluxo de Dados

#### 1. Captura de Memórias
```
Browser Extension → API → Database → Vector Store
```

#### 2. Consulta de Memórias
```
User Query → AI Model → Vector Search → Context Retrieval → Response
```

#### 3. Sincronização
```
External Services → Webhooks → Processing → Storage
```

### Segurança

#### 1. Autenticação
- **Better Auth** - Sistema de autenticação moderno
- **JWT Tokens** - Autenticação stateless
- **OAuth Integration** - Login social

#### 2. Autorização
- **Role-Based Access Control (RBAC)**
- **API Key Management**
- **Rate Limiting**

#### 3. Proteção de Dados
- **Criptografia em trânsito** (HTTPS/TLS)
- **Criptografia em repouso** (banco de dados)
- **Sanitização de entrada** (prevenção XSS)

### Deployment

#### 1. Aplicação Web
- **Vercel** - Hosting principal
- **Cloudflare Pages** - CDN e edge computing
- **Docker** - Containerização (opcional)

#### 2. Extensões
- **Chrome Web Store** - Extensão do Chrome
- **Firefox Add-ons** - Extensão do Firefox
- **Raycast Store** - Extensão Raycast

#### 3. Infraestrutura
- **Cloudflare Workers** - Backend serverless
- **PostgreSQL** - Banco de dados (Supabase/Neon)
- **Vector Database** - Armazenamento de embeddings

### Monitoramento e Observabilidade

#### 1. Logging
- **Pino** - Logger estruturado
- **Sentry** - Monitoramento de erros
- **PostHog** - Analytics

#### 2. Métricas
- **Performance monitoring**
- **Usage analytics**
- **Error tracking**

### Configuração do Fork

#### 1. Sincronização
- **Upstream tracking** - Manter sincronização com repositório original
- **Merge strategy** - Integração de atualizações upstream
- **Conflict resolution** - Resolução de conflitos

#### 2. Desenvolvimento
- **Feature branches** - Desenvolvimento em branches separadas
- **Pull requests** - Code review obrigatório
- **CI/CD** - Automação de testes e deploy

#### 3. Documentação
- **Living documentation** - Documentação sempre atualizada
- **API documentation** - Documentação automática
- **Contributing guide** - Guia para contribuidores
