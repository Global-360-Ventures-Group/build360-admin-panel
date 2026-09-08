/**
 * Shell for the unauthenticated routes. Deliberately free of the dashboard
 * chrome — no sidebar or header, since there is no session to drive them.
 */
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center bg-muted/40 p-4">
      {children}
    </main>
  );
}
