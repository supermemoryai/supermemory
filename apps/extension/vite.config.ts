import { Plugin, defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { crx } from "@crxjs/vite-plugin";
import manifest from "./manifest.json";
import path from "path";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const viteManifestHackIssue846: Plugin & {
  renderCrxManifest: (manifest: unknown, bundle: any) => void;
} = {
  // Workaround from https://github.com/crxjs/chrome-extension-tools/issues/846#issuecomment-1861880919.
  name: "manifestHackIssue846",
  renderCrxManifest(_manifest, bundle) {
    bundle["manifest.json"] = bundle[".vite/manifest.json"];
    bundle["manifest.json"].fileName = "manifest.json";
    delete bundle[".vite/manifest.json"];
  },
};

export default defineConfig({
  plugins: [react(), crx({ manifest }), viteManifestHackIssue846],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
