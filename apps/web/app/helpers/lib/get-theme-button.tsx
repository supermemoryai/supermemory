// Theming that works perfectly with app router (no flicker, jumps etc!)

import dynamic from "next/dynamic";

// Don't SSR the toggle since the value on the server will be different than the client
export const getThemeToggler = () =>
  dynamic(() => import("@repo/ui/shadcn/theme-toggle"), {
    ssr: false,
    // Make sure to code a placeholder so the UI doesn't jump when the component loads
    loading: () => <div className="w-6 h-6" />,
  });
