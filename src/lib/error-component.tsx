import { useEffect } from "react";
import type { ErrorComponentProps } from "@tanstack/react-router";
import { TriangleAlert } from "lucide-react";

const FALLBACK_MESSAGE = "An unexpected error occurred. Try reloading the page.";

function errorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "string" && error) return error;
  return FALLBACK_MESSAGE;
}

/**
 * A tab opened before a deploy still points at the old hashed chunks, which no longer exist, so the
 * dynamic import fails. A reload fetches the fresh build.
 */
function isStaleChunkError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? "");
  return /dynamically imported module|importing a module script failed|loading chunk|error loading dynamically/i.test(
    message,
  );
}

const RELOAD_GUARD = "supply-chunk-reload";

export function AppErrorComponent({ error }: ErrorComponentProps) {
  const stale = isStaleChunkError(error);

  useEffect(() => {
    if (!stale) return;
    try {
      // Reload once automatically; if it fails again, leave the message and button in place.
      const last = Number(window.sessionStorage.getItem(RELOAD_GUARD) ?? 0);
      if (Date.now() - last < 30_000) return;
      window.sessionStorage.setItem(RELOAD_GUARD, String(Date.now()));
    } catch {
      return;
    }
    window.location.reload();
  }, [stale]);

  return (
    <main
      className={
        "flex min-h-screen flex-col items-center justify-center gap-3 px-6 text-center " +
        "bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50"
      }
    >
      <span className="text-red-500" aria-hidden="true">
        <TriangleAlert className="size-10" strokeWidth={2} />
      </span>
      <h1 className="text-lg font-semibold">{stale ? "A new version is available" : "Something went wrong"}</h1>
      <p className="max-w-md text-sm break-words text-zinc-500 dark:text-zinc-400">
        {stale ? "Reloading to get the latest version." : errorMessage(error)}
      </p>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="mt-2 cursor-pointer rounded-full bg-zinc-900 px-5 py-2 text-sm font-medium text-white hover:bg-zinc-700"
      >
        Reload
      </button>
    </main>
  );
}
