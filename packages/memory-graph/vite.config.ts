import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import { vanillaExtractPlugin } from '@vanilla-extract/vite-plugin';
import { libInjectCss } from 'vite-plugin-lib-inject-css';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), vanillaExtractPlugin(), libInjectCss()],
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
        // Preserve CSS as separate file
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
