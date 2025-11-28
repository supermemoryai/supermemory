# Contributing to supermemory

Thank you for your interest in contributing to supermemory! We welcome contributions from developers of all skill levels. This guide will help you get started with contributing to our AI-powered memory layer API.

## 🚀 Quick Start

### Prerequisites

Before you begin, ensure you have the following installed:

- **Bun** (>= 1.2.17) - Our preferred package manager
- **Git** for version control

### Setting Up the Development Environment

1. **Fork and Clone the Repository**

   ```bash
   git clone https://github.com/supermemoryai/supermemory.git
   cd supermemory
   ```

2. **Install Dependencies**

   ```bash
   bun install
   ```

3. **Set Up Environment Variables**

   ```bash
   # Copy the example environment file
   cp .env.example .env.local

   # Edit the file with your configuration
   # You'll need to add your API keys and database URLs
   ```

4. **Change proxy for local development**

   Add this in your `proxy.ts`(apps/web) before retrieving the cookie (`getSessionCookie(request)`):

   ```ts
   if (url.hostname === "localhost") {
     return NextResponse.next();
   }

5. **Start the Development Server**

   ```bash
   bun run dev
   ```

   This will start all applications in the monorepo. The web app will be available at `http://localhost:3000`.

## 📁 Project Structure

supermemory is organized as a monorepo using Turbo:

```
supermemory/
├── apps/
│   ├── web/                 # Next.js web application
│   ├── browser-extension/  # Browser extension (WXT-based)
│   ├── docs/               # Documentation site
│   └── raycast-extension/  # Raycast extension
├── packages/
│   ├── ui/                  # Shared UI components
│   ├── lib/                 # Shared utilities and logic
│   ├── hooks/               # Shared React hooks
│   ├── validation/          # Zod schemas and validation
│   ├── ai-sdk/              # AI SDK for memory operations
│   ├── tools/               # Development tools and utilities
│   ├── openai-sdk-python/   # Python SDK for OpenAI integration
│   ├── openai-sdk-ts/       # TypeScript SDK for OpenAI integration
│   ├── eslint-config/       # ESLint configurations
│   └── typescript-config/   # TypeScript configurations
├── turbo.json              # Turbo configuration
├── biome.json              # Biome configuration
└── package.json            # Root package configuration
```

## 🛠️ Development Workflow

### Available Scripts

- `bun run dev` - Start development servers for all apps
- `bun run build` - Build all applications
- `bun run format-lint` - Format and lint code using Biome
- `bun run check-types` - Type check all packages

### Code Quality

We use several tools to maintain code quality:

- **Biome** for linting and formatting
- **TypeScript** for type safety
- **Turbo** for build optimization

Before submitting a PR, ensure your code passes all checks:

```bash
bun run format-lint
bun run check-types
bun run build
```

### Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **Styling**: Tailwind CSS, Radix UI components
- **State Management**: Zustand, TanStack Query
- **Build Tool**: Turbo (monorepo)
- **Package Manager**: Bun
- **Deployment**: Cloudflare (OpenNext.js)

## 🎯 How to Contribute

### Types of Contributions

We welcome various types of contributions:

- 🐛 **Bug fixes**
- ✨ **New features**
- 🎨 **UI/UX enhancements**
- ⚡ **Performance optimizations**

### Finding Issues to Work On

1. Check our [Issues](https://github.com/supermemoryai/supermemory/issues) page
2. Look for issues labeled `good first issue` for beginners
3. Issues labeled `help wanted` are great for contributors
4. Feel free to propose new features by opening an issue first

### Making Changes

1. **Create a Branch**

   ```bash
   git checkout -b feature/your-feature-name
   # or
   git checkout -b fix/your-bug-fix
   ```

2. **Make Your Changes**
   - Follow our coding standards (see below)
   - Write clear, concise commit messages
   - Add tests if applicable
   - Update documentation if needed

3. **Test Your Changes**
   ```bash
   bun run dev          # Test locally
   bun run build        # Ensure it builds
   bun run format-lint  # Check formatting
   bun run check-types  # Check types
   ```

## 📝 Coding Standards

### General Guidelines

- Use **TypeScript** for all new code
- Follow the existing code style and patterns
- Write self-documenting code with clear variable names
- Add JSDoc comments for complex functions
- Keep functions small and focused

### Component Guidelines

- Use functional components with hooks
- Prefer composition over inheritance
- Extract reusable logic into custom hooks
- Use proper TypeScript types for props

### File Naming

- Use `kebab-case` for file names
- Use `PascalCase` for component files
- Use `camelCase` for utility functions

### Import Organization

```typescript
// 1. React and Next.js imports
import React from 'react';
import { NextPage } from 'next';

// 2. Third-party libraries
import { clsx } from 'clsx';
import { motion } from 'motion';

// 3. Internal packages
import { Button } from '@repo/ui';
import { useAuth } from '@repo/lib';

// 4. Relative imports
import { Header } from './header';
import { Footer } from './footer';
```

## 🔄 Pull Request Process

### Before Submitting

1. Ensure your branch is up to date with `main`
2. Run all quality checks
3. Test your changes thoroughly
4. Update documentation if needed

### PR Guidelines

1. **Title**: Use a clear, descriptive title
   - ✅ `feat: add semantic search to memory graph`
   - ✅ `fix: resolve authentication redirect loop`
   - ❌ `update stuff`

2. **Description**: Include:
   - What changes you made and why
   - Screenshots for UI changes
   - Any breaking changes
   - Related issue numbers

3. **Size**: Keep PRs focused and reasonably sized
   - Prefer multiple small PRs over one large PR
   - Each PR should address a single concern

### Review Process

1. All PRs require at least one review
2. Address feedback promptly and professionally
3. Be open to suggestions and improvements
4. Maintain a collaborative attitude

## 🐛 Reporting Issues

### Bug Reports

When reporting bugs, please include:

- **Environment**: OS, Node.js version, browser
- **Steps to reproduce** the issue
- **Expected behavior**
- **Actual behavior**
- **Screenshots** if applicable
- **Error messages** or console logs

### Feature Requests

For feature requests, please provide:

- **Problem statement**: What problem does this solve?
- **Proposed solution**: How should it work?
- **Alternatives considered**: Other approaches you've thought of
- **Additional context**: Any relevant information

## 🏗️ Architecture Guidelines

### State Management

- Use **Zustand** for global state
- Use **TanStack Query** for server state
- Keep state as local as possible
- Use proper TypeScript types for state

### API Integration

- Use the existing API client patterns
- Handle loading and error states properly
- Implement proper error boundaries
- Use optimistic updates where appropriate

### Performance

- Use React.memo() for expensive components
- Implement proper loading states
- Optimize images and assets
- Use code splitting where beneficial

## 🤝 Community Guidelines

### Code of Conduct

- Be respectful and inclusive
- Welcome newcomers and help them learn
- Focus on constructive feedback
- Maintain professionalism in all interactions

### Getting Help

- **Discord**: [Join our Discord server](https://supermemory.link/discord)
- **GitHub Discussions**: For questions and ideas
- **Issues**: For bug reports and feature requests
- **Email**: [support@supermemory.com](mailto:support@supermemory.com)

## 📄 License

By contributing to supermemory, you agree that your contributions will be licensed under the same license as the project.

## 🙏 Recognition

All contributors will be recognized in our README and release notes. We appreciate every contribution, no matter how small!

---

Thank you for contributing to supermemory! Together, we're building the future of AI-powered knowledge management. 🚀
