<div align="center" style="padding-bottom:10px;padding-top:10px">
  <img src="logo.svg" alt="supermemory Logo" width="400" />
</div>

<div align="center" style="padding-bottom:10px;padding-top:10px">
  <img src="apps/web/public/landing-page.jpeg" alt="supermemory" width="100%" />
</div>

## ✨ Features

### Core Functionality
- **Add Memories from Any Content**: Easily add memories from URLs, PDFs, and plain text—just paste, upload, or link.
- **Chat with Your Memories**: Converse with your stored content using natural language chat.
- **Supermemory MCP Integration**: Seamlessly connect with all major AI tools (Claude, Cursor, etc.) via Supermemory MCP.
- **Graph View for All Memories**: Visualize and explore your memories and their connections in an interactive graph mode.

## 🏗️ Architecture

This is a **Turborepo monorepo**

### Technology Stack
- **Frontend**: Next.js 15 with React 19
- **Backend**: Hono API framework on Cloudflare Workers
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Better Auth with organization support
- **Package Manager**: Bun
- **Monorepo**: Turbo for build optimization
- **Styling**: Tailwind CSS with Radix UI components
- **Monitoring**: Sentry for error tracking and performance monitoring

### Project Structure
```
├── apps/
│   └── web/              # Next.js web application
├── packages/             # Shared packages and utilities
├── CLAUDE.md            # Development guidelines for AI assistants
├── turbo.json           # Turborepo configuration
└── package.json         # Root package configuration
```

## 🚀 Getting Started

### Prerequisites
- **Bun** package manager

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/supermemoryai/supermemory-app.git
   cd supermemory
   ```

2. **Install dependencies**
   ```bash
   bun install
   ```

3. **Environment Setup**
   
   Create environment files for each app:
   ```bash
   # Copy environment templates
   cp apps/web/.env.example apps/web/.env.local
   ```

### Development

#### Start all applications in development mode:
```bash
bun run dev
```

This will start:
- Web app at `http://localhost:3000`
- API endpoints available through the web app


## 🧪 Development Workflow

### Code Quality
- **Linting & Formatting**: Uses Biome for consistent code style
- **Type Safety**: Strict TypeScript configuration across all packages

## 🤝 Contributing

### Development Guidelines
- Follow the code style enforced by Biome
- Write tests for new features
- Update documentation when adding new functionality
- Ensure all checks pass before submitting PRs


## 💬 Support & Community

- **Issues**: [GitHub Issues](https://github.com/supermemoryai/supermemory-app/issues)
- **Email**: [dhravya@supermemory.com](mailto:dhravya@supermemory.com)
- **Twitter**: [@supermemoryai](https://x.com/supermemoryai)

