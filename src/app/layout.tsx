import "./globals.css";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="cs" suppressHydrationWarning>
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
