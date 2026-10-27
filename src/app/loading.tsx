import { Logo } from "@/components/logo";
export default function Loading() {
  return (
    <main
      id="main"
      aria-busy="true"
      aria-label="Loading GrantPath"
      className="state-scene flex min-h-screen flex-col items-center justify-center px-6 py-16 text-center"
    >
      <Logo />
      <div
        className="loading-track my-8 h-0.5 w-36 overflow-hidden rounded-full bg-border"
        aria-hidden="true"
      />
      <div role="status">
        <p className="font-serif text-xl">A little direction is on its way.</p>
        <p className="mt-3 text-xs text-muted-foreground">Opening your workspace…</p>
      </div>
    </main>
  );
}
