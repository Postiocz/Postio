"use client";

import * as React from "react";

type Theme = "system" | "light" | "dark" | string;

interface ThemeProviderProps {
  children: React.ReactNode;
  attribute?: string;
  defaultTheme?: Theme;
  enableSystem?: boolean;
  disableTransitionOnChange?: boolean;
}

export function ThemeProvider({
  children,
  attribute = "class",
  defaultTheme = "system",
  enableSystem = true,
  disableTransitionOnChange = false,
}: ThemeProviderProps) {
  const [theme, setTheme] = React.useState<Theme>(() => {
    if (typeof document === "undefined") return defaultTheme;
    return (document.cookie.match(/theme=([^;]+)/)?.[1] as Theme) || defaultTheme;
  });

  // Apply theme on mount and change
  React.useEffect(() => {
    const root = document.documentElement;
    const resolveTheme = (t: Theme): "light" | "dark" => {
      if (t === "system") {
        return window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light";
      }
      return (t as "light" | "dark") || "light";
    };

    const resolved = resolveTheme(theme);

    if (attribute === "class") {
      root.classList.remove("light", "dark");
      root.classList.add(resolved);
    } else {
      root.setAttribute(attribute, resolved);
    }

    // Disable transition on initial mount to prevent flash
    if (disableTransitionOnChange) {
      root.style.transition = "none";
      requestAnimationFrame(() => {
        root.style.transition = "";
      });
    }
  }, [theme, attribute, disableTransitionOnChange]);

  // Listen for system preference changes
  React.useEffect(() => {
    if (theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => {
      const root = document.documentElement;
      const resolved = mq.matches ? "dark" : "light";
      if (attribute === "class") {
        root.classList.remove("light", "dark");
        root.classList.add(resolved);
      } else {
        root.setAttribute(attribute, resolved);
      }
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [theme, attribute]);

  const value = React.useMemo(
    () => ({
      theme,
      setTheme: (t: Theme) => {
        document.cookie = `theme=${t};max-age=${60 * 60 * 365 * 365};path=/`;
        setTheme(t);
      },
    }),
    [theme]
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

const ThemeContext = React.createContext<{
  theme: Theme;
  setTheme: (t: Theme) => void;
}>({ theme: "system", setTheme: () => {} });

export { ThemeContext };
