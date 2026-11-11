import { createFileRoute, redirect } from "@tanstack/react-router";

/** Logging in is a modal now. This path stays so old links and emails still work: it opens the modal. */
export const Route = createFileRoute("/login")({
  beforeLoad: () => {
    throw redirect({ to: "/{-$page}", params: { page: undefined }, search: { auth: "login" } });
  },
});
