import { setupDevPlatform } from '@cloudflare/next-on-pages/next-dev';

// Here we use the @cloudflare/next-on-pages next-dev module to allow us to use bindings during local development
// (when running the application with `next dev`), for more information see:
// https://github.com/cloudflare/next-on-pages/blob/5712c57ea7/internal-packages/next-dev/README.md
if (process.env.NODE_ENV === 'development') {
  await setupDevPlatform({
    bindings: {
      DATABASE: {
        type: "DB",
        id: "fc562605-157a-4f60-b439-2a24ffed5b4c"
      }
    }
  });
}

/** @type {import('next').NextConfig} */
const nextConfig = {};

export default nextConfig;
