import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { adminStats } from "@/lib/stats";
import type { Stats } from "@/lib/stats.server";
import { useCurrentUserState } from "@/lib/auth/use-current-user";

export const Route = createFileRoute("/admin")({
  component: AdminPage,
  head: () => ({
    meta: [{ title: "Stats — Block Supply" }, { name: "robots", content: "noindex, nofollow" }],
  }),
});

type State = { status: "loading" } | { status: "denied" } | { status: "ready"; stats: Stats };

function AdminPage() {
  const { user, isPending } = useCurrentUserState();
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    if (isPending) return;
    if (!user) {
      setState({ status: "denied" });
      return;
    }
    let cancelled = false;
    adminStats()
      .then((stats) => !cancelled && setState({ status: "ready", stats }))
      .catch(() => !cancelled && setState({ status: "denied" }));
    return () => {
      cancelled = true;
    };
  }, [isPending, user]);

  if (state.status === "loading") return <main className="adm" aria-busy="true" />;
  if (state.status === "denied") {
    return (
      <main className="adm adm-center">
        <h1>Page not found</h1>
        <p>That page does not exist.</p>
        <Link to="/{-$page}" params={{ page: undefined }} className="adm-back">
          Back to the blocks
        </Link>
      </main>
    );
  }

  const { totals, topBlocks, perDay, users } = state.stats;
  const maxTop = Math.max(1, ...topBlocks.map((block) => block.count));
  const maxDay = Math.max(1, ...perDay.map((day) => day.count));
  const cards: [string, number, string][] = [
    ["Members", totals.users, "Accounts created"],
    ["Copies", totals.copies, "All time"],
    ["Copies, 7 days", totals.copies7d, `${totals.copiesToday} today`],
    ["Anonymous copiers", totals.anonymousCopiers, "Devices that copied without an account"],
    ["Saved blocks", totals.savedBlocks, "Across all accounts"],
  ];

  return (
    <main className="adm">
      <header className="adm-head">
        <h1>Stats</h1>
        <Link to="/{-$page}" params={{ page: undefined }} className="adm-back">
          Back to the blocks
        </Link>
      </header>

      <section className="adm-cards" aria-label="Totals">
        {cards.map(([label, value, hint]) => (
          <div key={label} className="adm-card">
            <span>{label}</span>
            <strong>{value.toLocaleString()}</strong>
            <small>{hint}</small>
          </div>
        ))}
      </section>

      <p className="adm-note">
        Visitors and page views are in your Vercel project under Analytics. Copy counts start from the day this page
        went live.
      </p>

      <div className="adm-cols">
        <section className="adm-panel">
          <h2>Most copied blocks</h2>
          {topBlocks.length === 0 ? (
            <p className="adm-empty">No copies yet.</p>
          ) : (
            <ol className="adm-rank">
              {topBlocks.map((block, index) => (
                <li key={block.id}>
                  <span className="adm-rank-n">{index + 1}</span>
                  <span className="adm-rank-name">{block.name}</span>
                  <span className="adm-rank-bar" aria-hidden="true">
                    <i style={{ width: `${(block.count / maxTop) * 100}%` }} />
                  </span>
                  <span className="adm-rank-count">{block.count}</span>
                </li>
              ))}
            </ol>
          )}
        </section>

        <section className="adm-panel">
          <h2>Copies per day, last 14 days</h2>
          <div className="adm-days" role="img" aria-label="Copies per day">
            {perDay.map((day) => (
              <div key={day.day} className="adm-day" title={`${day.day}: ${day.count}`}>
                <i style={{ height: `${Math.max(3, (day.count / maxDay) * 100)}%` }} />
                <span>{day.day.slice(8)}</span>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="adm-panel">
        <h2>Members</h2>
        {users.length === 0 ? (
          <p className="adm-empty">Nobody has joined yet.</p>
        ) : (
          <div className="adm-table" role="table" aria-label="Members">
            <div className="adm-row adm-row-head" role="row">
              <span>Name</span>
              <span>Email</span>
              <span>Via</span>
              <span>Joined (UTC)</span>
              <span>Copies</span>
            </div>
            {users.map((member) => (
              <div key={member.id} className="adm-row" role="row">
                <span>{member.name}</span>
                <span>{member.email}</span>
                <span>{member.provider}</span>
                <span>{member.joined}</span>
                <span>{member.copies}</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
