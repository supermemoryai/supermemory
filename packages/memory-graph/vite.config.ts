import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import { readFileSync } from 'fs'
import { vanillaExtractPlugin } from '@vanilla-extract/vite-plugin';

/**
 * Custom plugin to embed CSS content into the JS bundle for runtime injection.
 * This allows the package to work with any bundler (Vite, webpack, Next.js, etc.)
 */
function injectCssPlugin(): Plugin {
  let cssContent = '';

  return {
    name: 'inject-css-content',
    enforce: 'post',
    generateBundle(_, bundle) {
      // Find the generated CSS file
      for (const [fileName, chunk] of Object.entries(bundle)) {
        if (fileName.endsWith('.css') && chunk.type === 'asset') {
          cssContent = chunk.source as string;
          break;
        }
      }

      // Replace placeholder in JS files with actual CSS content
      for (const [fileName, chunk] of Object.entries(bundle)) {
        if ((fileName.endsWith('.js') || fileName.endsWith('.cjs')) && chunk.type === 'chunk') {
          // Escape the CSS for embedding in JS string
          const escapedCss = JSON.stringify(cssContent);
          chunk.code = chunk.code.replace(
            /__MEMORY_GRAPH_CSS__/g,
            escapedCss
          );
        }
      }
    }
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), vanillaExtractPlugin(), injectCssPlugin()],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.tsx'),
      name: 'MemoryGraph',
      formats: ['es', 'cjs'],
      fileName: (format) => {
        if (format === 'es') return 'memory-graph.js'
        if (format === 'cjs') return 'memory-graph.cjs'
        return 'memory-graph.js'
      }
    },
    rollupOptions: {
      // Externalize only peer dependencies (React)
      external: ['react', 'react-dom', 'react/jsx-runtime'],
      output: {
        // Provide global variables for UMD build (if needed later)
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM',
          'react/jsx-runtime': 'react/jsx-runtime'
        },
        // Preserve CSS as separate file (for manual import fallback)
        assetFileNames: (assetInfo) => {
          // Vanilla-extract generates index.css, rename to memory-graph.css
          if (assetInfo.name === 'index.css' || assetInfo.name === 'style.css') {
            return 'memory-graph.css'
          }
          return assetInfo.name || 'asset'
        },
        // Don't preserve modules - bundle everything except externals
        preserveModules: false,
      }
    },
    // Ensure CSS is extracted
    cssCodeSplit: false,
    // Generate sourcemaps for debugging
    sourcemap: true,
    // Optimize deps
    minify: 'esbuild',
    target: 'esnext'
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src')
    }
  }
})
