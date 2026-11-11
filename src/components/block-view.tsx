import { LIVE } from "@/components/live";
import { VIEWS } from "@/components/kits";

/** Interactive version of a block when one exists, otherwise the static one. */
export function BlockView({ id }: { id: string }) {
  const View = LIVE[id] ?? VIEWS[id];
  return View ? <View /> : null;
}
