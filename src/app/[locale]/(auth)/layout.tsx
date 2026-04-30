export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background">
      <div className="absolute -left-1/4 -top-1/4 h-[1000px] w-[1000px] rounded-full bg-primary/5 blur-[120px] dark:bg-primary/10" />
      <div className="absolute -bottom-1/4 -right-1/4 h-[1000px] w-[1000px] rounded-full bg-primary/5 blur-[120px] dark:bg-primary/10" />
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
}
