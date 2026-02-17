#!/bin/bash
# Setup script for SuperMemory local development
# Fixes issue #726: Clear setup process

set -e

echo "🔧 SuperMemory Setup"
echo "==================="

# Check for Bun
if ! command -v bun &> /dev/null; then
    echo "❌ Bun not found. Installing..."
    curl -fsSL https://bun.sh/install | bash
    export PATH="$HOME/.bun/bin:$PATH"
    echo "✅ Bun installed"
else
    echo "✅ Bun found: $(bun --version)"
fi

# Check Bun version
REQUIRED_BUN="1.2.17"
CURRENT_BUN=$(bun --version 2>/dev/null || echo "0.0.0")

if [ "$CURRENT_BUN" != "$REQUIRED_BUN" ]; then
    echo "⚠️  Bun version $CURRENT_BUN, recommended: $REQUIRED_BUN"
    echo "   Continuing anyway..."
fi

# Install dependencies
echo "📦 Installing dependencies..."
bun install

# Setup environment
if [ ! -f .env.local ]; then
    if [ -f .env.example ]; then
        echo "📝 Creating .env.local from example..."
        cp .env.example .env.local
        echo "⚠️  Please edit .env.local with your API keys"
    else
        echo "⚠️  No .env.example found. You'll need to create .env.local manually"
    fi
else
    echo "✅ .env.local already exists"
fi

echo ""
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "  1. Edit .env.local with your API keys"
echo "  2. Run 'bun run dev' to start development server"
echo "  3. Open http://localhost:3000"
echo ""
echo "Need help? See CONTRIBUTING.md"
