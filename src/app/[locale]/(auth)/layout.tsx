export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-screen w-full overflow-hidden">
      {/* Subtle accent overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.03] via-transparent to-primary/[0.02] dark:from-primary/[0.04] dark:to-primary/[0.02]" />
      <div className="relative z-10 flex w-full">{children}</div>
    </div>
  );
}
