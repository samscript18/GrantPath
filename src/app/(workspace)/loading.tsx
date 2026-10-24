import { Sprout } from "lucide-react";

export default function WorkspaceLoading() {
  return (
    <div aria-busy="true" aria-label="Loading page" className="workspace-loading">
      <div role="status" className="mb-10 flex items-center gap-3 text-sm text-muted-foreground">
        <span className="flex size-9 items-center justify-center rounded-full border border-border bg-paper">
          <Sprout size={17} strokeWidth={1.4} aria-hidden="true" />
        </span>
        <span>
          GrantPath <span className="mx-2 text-border">/</span> Loading your next step…
        </span>
      </div>
      <div aria-hidden="true" className="space-y-7">
        <div className="h-9 w-2/3 max-w-md rounded-md bg-muted" />
        <div className="h-4 w-1/2 max-w-sm rounded bg-muted" />
        <div className="mt-12 divide-y divide-border rounded-xl border border-border bg-paper px-6">
          {[0, 1, 2].map((row) => (
            <div key={row} className="space-y-4 py-8">
              <div className="h-4 w-1/4 rounded bg-muted" />
              <div className="h-5 w-3/4 rounded bg-muted" />
              <div className="h-3 w-1/2 rounded bg-muted" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
