"use client";

import { useTheme } from "next-app-theme/use-theme";
import { Sun, Moon } from "lucide-react";

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const icon = theme === "dark" ? <Sun /> : <Moon />;

  return <button onClick={toggleTheme}>{icon}</button>;
}
