import "./globals.css";
import { cookies } from "next/headers";

async function getThemeCookie(): Promise<string | undefined> {
  const c = await cookies();
  return c.get("theme")?.value;
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const themeCookie = await getThemeCookie();
  const serverThemeClass = themeCookie === "dark" ? "dark" : "";
  const themeInitScript = `(function(){try{var m=document.cookie.match(/(?:^|;\\s*)theme=([^;]+)/);var t=m?decodeURIComponent(m[1]):"system";var r=t==="dark"?"dark":t==="light"?"light":(window.matchMedia&&window.matchMedia("(prefers-color-scheme: dark)").matches)?"dark":"light";var e=document.documentElement;e.classList.remove("light","dark");e.classList.add(r);e.style.colorScheme=r}catch(e){}})();`;

  return (
    <html lang="cs" className={serverThemeClass} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="min-h-screen" suppressHydrationWarning>{children}</body>
    </html>
  );
}
