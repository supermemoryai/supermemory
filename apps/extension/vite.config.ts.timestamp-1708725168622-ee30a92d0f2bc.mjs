// vite.config.ts
import { defineConfig } from "file:///Users/dhravyashah/Documents/code/anycontext/node_modules/vite/dist/node/index.js";
import react from "file:///Users/dhravyashah/Documents/code/anycontext/node_modules/@vitejs/plugin-react/dist/index.mjs";
import { crx } from "file:///Users/dhravyashah/Documents/code/anycontext/node_modules/@crxjs/vite-plugin/dist/index.mjs";

// manifest.json
var manifest_default = {
  manifest_version: 3,
  name: "Extension",
  version: "1.0.0",
  action: {
    default_popup: "index.html"
  },
  content_scripts: [
    {
      js: [
        "src/content.tsx"
      ],
      matches: [
        "http://localhost:3000/*",
        "https://anycontext.dhr.wtf/*"
      ]
    }
  ],
  permissions: [
    "activeTab",
    "storage",
    "http://localhost:3000/*",
    "https://anycontext.dhr.wtf/*"
  ],
  background: {
    service_worker: "src/background.ts"
  }
};

// vite.config.ts
var vite_config_default = defineConfig({
  plugins: [
    react(),
    crx({ manifest: manifest_default })
  ]
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiLCAibWFuaWZlc3QuanNvbiJdLAogICJzb3VyY2VzQ29udGVudCI6IFsiY29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2Rpcm5hbWUgPSBcIi9Vc2Vycy9kaHJhdnlhc2hhaC9Eb2N1bWVudHMvY29kZS9hbnljb250ZXh0L2FwcHMvZXh0ZW5zaW9uXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCIvVXNlcnMvZGhyYXZ5YXNoYWgvRG9jdW1lbnRzL2NvZGUvYW55Y29udGV4dC9hcHBzL2V4dGVuc2lvbi92aXRlLmNvbmZpZy50c1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vVXNlcnMvZGhyYXZ5YXNoYWgvRG9jdW1lbnRzL2NvZGUvYW55Y29udGV4dC9hcHBzL2V4dGVuc2lvbi92aXRlLmNvbmZpZy50c1wiO2ltcG9ydCB7IGRlZmluZUNvbmZpZyB9IGZyb20gJ3ZpdGUnXG5pbXBvcnQgcmVhY3QgZnJvbSAnQHZpdGVqcy9wbHVnaW4tcmVhY3QnXG5pbXBvcnQgeyBjcnggfSBmcm9tICdAY3J4anMvdml0ZS1wbHVnaW4nXG5pbXBvcnQgbWFuaWZlc3QgZnJvbSAnLi9tYW5pZmVzdC5qc29uJ1xuXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVDb25maWcoe1xuICBwbHVnaW5zOiBbXG4gICAgcmVhY3QoKSxcbiAgICBjcngoeyBtYW5pZmVzdCB9KSxcbiAgXSxcbn0pIiwgIntcbiAgICBcIm1hbmlmZXN0X3ZlcnNpb25cIjogMyxcbiAgICBcIm5hbWVcIjogXCJFeHRlbnNpb25cIixcbiAgICBcInZlcnNpb25cIjogXCIxLjAuMFwiLFxuICAgIFwiYWN0aW9uXCI6IHtcbiAgICAgICAgXCJkZWZhdWx0X3BvcHVwXCI6IFwiaW5kZXguaHRtbFwiXG4gICAgfSxcbiAgICBcImNvbnRlbnRfc2NyaXB0c1wiICAgOiBbXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwianNcIjogW1xuICAgICAgICAgICAgICAgIFwic3JjL2NvbnRlbnQudHN4XCJcbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBcIm1hdGNoZXNcIjogW1xuICAgICAgICAgICAgICAgIFwiaHR0cDovL2xvY2FsaG9zdDozMDAwLypcIixcbiAgICAgICAgICAgICAgICBcImh0dHBzOi8vYW55Y29udGV4dC5kaHIud3RmLypcIlxuICAgICAgICAgICAgXVxuICAgICAgICB9XG4gICAgXSxcbiAgICBcInBlcm1pc3Npb25zXCI6IFtcbiAgICAgICAgXCJhY3RpdmVUYWJcIixcbiAgICAgICAgXCJzdG9yYWdlXCIsXG4gICAgICAgIFwiaHR0cDovL2xvY2FsaG9zdDozMDAwLypcIixcbiAgICAgICAgXCJodHRwczovL2FueWNvbnRleHQuZGhyLnd0Zi8qXCJcbiAgICBdLFxuICAgIFwiYmFja2dyb3VuZFwiOiB7XG4gICAgICAgIFwic2VydmljZV93b3JrZXJcIjogXCJzcmMvYmFja2dyb3VuZC50c1wiXG4gICAgICB9XG59Il0sCiAgIm1hcHBpbmdzIjogIjtBQUFtVyxTQUFTLG9CQUFvQjtBQUNoWSxPQUFPLFdBQVc7QUFDbEIsU0FBUyxXQUFXOzs7QUNGcEI7QUFBQSxFQUNJLGtCQUFvQjtBQUFBLEVBQ3BCLE1BQVE7QUFBQSxFQUNSLFNBQVc7QUFBQSxFQUNYLFFBQVU7QUFBQSxJQUNOLGVBQWlCO0FBQUEsRUFDckI7QUFBQSxFQUNBLGlCQUFzQjtBQUFBLElBQ2xCO0FBQUEsTUFDSSxJQUFNO0FBQUEsUUFDRjtBQUFBLE1BQ0o7QUFBQSxNQUNBLFNBQVc7QUFBQSxRQUNQO0FBQUEsUUFDQTtBQUFBLE1BQ0o7QUFBQSxJQUNKO0FBQUEsRUFDSjtBQUFBLEVBQ0EsYUFBZTtBQUFBLElBQ1g7QUFBQSxJQUNBO0FBQUEsSUFDQTtBQUFBLElBQ0E7QUFBQSxFQUNKO0FBQUEsRUFDQSxZQUFjO0FBQUEsSUFDVixnQkFBa0I7QUFBQSxFQUNwQjtBQUNOOzs7QUR0QkEsSUFBTyxzQkFBUSxhQUFhO0FBQUEsRUFDMUIsU0FBUztBQUFBLElBQ1AsTUFBTTtBQUFBLElBQ04sSUFBSSxFQUFFLDJCQUFTLENBQUM7QUFBQSxFQUNsQjtBQUNGLENBQUM7IiwKICAibmFtZXMiOiBbXQp9Cg==
