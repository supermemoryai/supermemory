import MillionLint from "@million/lint";
import { setupDevPlatform } from "@cloudflare/next-on-pages/next-dev";

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@repo/ui"],
};
export default MillionLint.next({
  rsc: true,
})(nextConfig);

// we only need to use the utility during development so we can check NODE_ENV
// (note: this check is recommended but completely optional)
if (process.env.NODE_ENV === "development") {
  // `await`ing the call is not necessary but it helps making sure that the setup has succeeded.
  //  If you cannot use top level awaits you could use the following to avoid an unhandled rejection:
  //  `setupDevPlatform().catch(e => console.error(e));`
  await setupDevPlatform();
}
