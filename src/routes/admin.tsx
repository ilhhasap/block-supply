import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ChartCard, RankBars, Spark } from "@/components/admin/charts";
import { ago, compact, delta, downloadCsv, fullTime, num, toPoints, type Delta } from "@/components/admin/format";
import { adminDashboard } from "@/lib/stats";
import type { Dashboard, Range } from "@/lib/stats.server";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { FREE_COPIES } from "@/lib/copy-limit";

export const Route = createFileRoute("/admin")({
  component: AdminPage,
  head: () => ({
    meta: [{ title: "Dashboard — Block Supply" }, { name: "robots", content: "noindex, nofollow" }],
  }),
});

type State = { status: "loading" } | { status: "denied" } | { status: "ready"; data: Dashboard };

const RANGE_LABELS: [Range, string][] = [
  [7, "7 days"],
  [30, "30 days"],
  [90, "90 days"],
  [0, "All time"],
];
const TABS = ["Overview", "Blocks", "Members", "Activity"] as const;
type Tab = (typeof TABS)[number];

function AdminPage() {
  const { user, isPending } = useCurrentUserState();
  const [state, setState] = useState<State>({ status: "loading" });
  const [range, setRange] = useState<Range>(30);
  const [tab, setTab] = useState<Tab>("Overview");
  const [busy, setBusy] = useState(false);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    if (isPending) return;
    if (!user) {
      setState({ status: "denied" });
      return;
    }
    let cancelled = false;
    setBusy(true);
    adminDashboard({ data: { range } })
      .then((data) => !cancelled && setState({ status: "ready", data }))
      .catch(() => !cancelled && setState({ status: "denied" }))
      .finally(() => !cancelled && setBusy(false));
    return () => {
      cancelled = true;
    };
  }, [isPending, user, range, reload]);

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

  const data = state.data;
  return (
    <main className="adm" aria-busy={busy}>
      <header className="adm-head">
        <div>
          <h1>Dashboard</h1>
          <p className="adm-sub">Updated {ago(data.generatedAt)} · days are UTC</p>
        </div>
        <div className="adm-head-actions">
          <button type="button" className="adm-link" onClick={() => setReload((n) => n + 1)}>
            Refresh
          </button>
          <Link to="/{-$page}" params={{ page: undefined }} className="adm-back">
            Back to the blocks
          </Link>
        </div>
      </header>

      <div className="adm-bar-row">
        <div className="adm-seg" role="group" aria-label="Date range">
          {RANGE_LABELS.map(([value, label]) => (
            <button key={value} type="button" data-on={range === value ? "true" : "false"} onClick={() => setRange(value)}>
              {label}
            </button>
          ))}
        </div>
        <nav className="adm-tabs" aria-label="Sections">
          {TABS.map((name) => (
            <button key={name} type="button" data-on={tab === name ? "true" : "false"} onClick={() => setTab(name)}>
              {name}
            </button>
          ))}
        </nav>
      </div>

      <div className="adm-body" data-busy={busy ? "true" : "false"}>
        {tab === "Overview" ? <Overview data={data} onOpen={setTab} /> : null}
        {tab === "Blocks" ? <Blocks data={data} /> : null}
        {tab === "Members" ? <Members data={data} /> : null}
        {tab === "Activity" ? <Activity data={data} /> : null}
      </div>
    </main>
  );
}

function DeltaText({ value, goodWhenUp = true }: { value: Delta; goodWhenUp?: boolean }) {
  if (value.dir === "none") return null;
  const arrow = value.dir === "up" ? "▲" : value.dir === "down" ? "▼" : "–";
  const good = value.dir === "flat" ? undefined : (value.dir === "up") === goodWhenUp;
  return (
    <span className="adm-delta" data-good={good === undefined ? undefined : good ? "true" : "false"}>
      {arrow} {value.text}
    </span>
  );
}

function Tile({
  label,
  value,
  hint,
  change,
  goodWhenUp,
  spark,
}: {
  label: string;
  value: number;
  hint: string;
  change: Delta;
  goodWhenUp?: boolean;
  spark: number[];
}) {
  return (
    <div className="adm-tile">
      <span>{label}</span>
      <strong>{compact(value)}</strong>
      <div className="adm-tile-foot">
        <small>
          <DeltaText value={change} goodWhenUp={goodWhenUp} /> {hint}
        </small>
        <Spark values={spark} />
      </div>
    </div>
  );
}

function Overview({ data, onOpen }: { data: Dashboard; onOpen: (tab: Tab) => void }) {
  // All time shows the last 26 weeks; leave out the stretch before anything happened.
  const first = data.series.findIndex((row) => row.copies + row.signups + row.saves + row.failures > 0);
  const days = data.range === 0 && first > 0 ? data.series.slice(Math.min(first, data.series.length - 14)) : data.series;
  const weekly = days.length > 45;
  const series = (key: string) => days.map((row) => Number(row[key as keyof typeof row]));
  const { kpis, funnel } = data;
  const attempts = kpis.copies.now + kpis.failures.now;
  const failureRate = attempts ? Math.round((kpis.failures.now / attempts) * 1000) / 10 : 0;
  const compareWord = data.range === 0 ? "" : `vs previous ${data.range} days`;

  const categories = useMemo(() => {
    const map = new Map<string, number>();
    for (const block of data.blocks) map.set(block.cat, (map.get(block.cat) ?? 0) + block.copies);
    return [...map].map(([cat, value]) => ({ key: cat, name: cat, value })).sort((a, b) => b.value - a.value);
  }, [data.blocks]);
  const top = useMemo(
    () =>
      [...data.blocks]
        .filter((block) => block.copies > 0)
        .sort((a, b) => b.copies - a.copies || a.name.localeCompare(b.name))
        .slice(0, 8)
        .map((block) => ({ key: block.id, name: block.name, value: block.copies, note: block.cat })),
    [data.blocks],
  );
  const quiet = data.blocks.filter((block) => block.copies === 0).length;

  const steps = [
    { name: "Copied without an account", value: funnel.anonymousCopiers, note: "Devices" },
    { name: `Used all ${FREE_COPIES} free copies`, value: funnel.reachedLimit, note: "Devices" },
    { name: "New members", value: funnel.signedUp, note: "Accounts" },
    { name: "New members who copied", value: funnel.signedUpCopied, note: "Accounts" },
  ];

  return (
    <>
      <section className="adm-tiles" aria-label="Headlines">
        <Tile
          label="New members"
          value={kpis.members.now}
          hint={`${num(kpis.members.total)} in total ${compareWord}`.trim()}
          change={delta(kpis.members.now, kpis.members.prev)}
          spark={series("signups")}
        />
        <Tile
          label="Copies"
          value={kpis.copies.now}
          hint={compareWord || "All time"}
          change={delta(kpis.copies.now, kpis.copies.prev)}
          spark={series("copies")}
        />
        <Tile
          label="People who copied"
          value={kpis.copiers.now}
          hint={compareWord || "Members and devices"}
          change={delta(kpis.copiers.now, kpis.copiers.prev)}
          spark={series("copiers")}
        />
        <Tile
          label="Saved blocks"
          value={kpis.saves.now}
          hint={compareWord || "All time"}
          change={delta(kpis.saves.now, kpis.saves.prev)}
          spark={series("saves")}
        />
        <Tile
          label="Failed copies"
          value={kpis.failures.now}
          hint={`${failureRate}% of attempts`}
          change={delta(kpis.failures.now, kpis.failures.prev)}
          goodWhenUp={false}
          spark={series("failures")}
        />
      </section>

      <ChartCard
        title="Copies"
        hint={weekly ? "Per week" : "Per day"}
        points={toPoints(days, "copies", weekly)}
        unit="copies"
        tall
      />

      <div className="adm-cols">
        <ChartCard title="New members" hint={weekly ? "Per week" : "Per day"} points={toPoints(days, "signups", weekly)} unit="members" />
        <ChartCard title="Failed copies" hint={weekly ? "Per week" : "Per day"} points={toPoints(days, "failures", weekly)} unit="failures" />
      </div>

      <div className="adm-cols">
        <section className="adm-panel">
          <header className="adm-panel-head">
            <div>
              <h2>From first copy to account</h2>
              <p>Approximate: a device cannot be linked to the account it later creates.</p>
            </div>
          </header>
          <RankBars
            rows={steps.map((step) => ({ key: step.name, name: step.name, value: step.value, note: step.note }))}
            empty="No activity in this period."
          />
        </section>

        <section className="adm-panel">
          <header className="adm-panel-head">
            <div>
              <h2>Copies by category</h2>
              <p>Share of copies in the period</p>
            </div>
          </header>
          <RankBars rows={categories} empty="No copies in this period." />
        </section>
      </div>

      <section className="adm-panel">
        <header className="adm-panel-head">
          <div>
            <h2>Most copied blocks</h2>
            <p>{quiet} of {data.blocks.length} blocks had no copies in this period</p>
          </div>
          <button type="button" className="adm-link" onClick={() => onOpen("Blocks")}>
            All blocks
          </button>
        </header>
        <RankBars rows={top} empty="No copies in this period." />
      </section>
    </>
  );
}

type SortDir = "asc" | "desc";

function useSort<K extends string>(initial: K, dir: SortDir = "desc") {
  const [sort, setSort] = useState<{ key: K; dir: SortDir }>({ key: initial, dir });
  const toggle = (key: K) =>
    setSort((curr) => (curr.key === key ? { key, dir: curr.dir === "desc" ? "asc" : "desc" } : { key, dir: key === "name" || key === "cat" ? "asc" : "desc" }));
  return { sort, toggle };
}

function compareBy<T>(rows: T[], key: keyof T, dir: SortDir) {
  const sign = dir === "asc" ? 1 : -1;
  return [...rows].sort((a, b) => {
    const left = a[key];
    const right = b[key];
    if (left === right) return 0;
    if (left === null || left === undefined) return 1;
    if (right === null || right === undefined) return -1;
    return (left < right ? -1 : 1) * sign;
  });
}

function Head<K extends string>({ id, label, sort, toggle, num: numeric }: { id: K; label: string; sort: { key: K; dir: SortDir }; toggle: (key: K) => void; num?: boolean }) {
  const on = sort.key === id;
  return (
    <th aria-sort={on ? (sort.dir === "asc" ? "ascending" : "descending") : "none"} data-num={numeric ? "true" : undefined}>
      <button type="button" onClick={() => toggle(id)}>
        {label}
        <i aria-hidden="true">{on ? (sort.dir === "asc" ? "↑" : "↓") : ""}</i>
      </button>
    </th>
  );
}

type BlockKey = "name" | "cat" | "copies" | "total" | "copiers" | "saves" | "failures" | "last";

function Blocks({ data }: { data: Dashboard }) {
  const { sort, toggle } = useSort<BlockKey>("copies");
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState<string | null>(null);
  const [never, setNever] = useState(false);
  const cats = useMemo(() => [...new Set(data.blocks.map((block) => block.cat))], [data.blocks]);
  const max = Math.max(1, ...data.blocks.map((block) => block.copies));

  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const list = data.blocks.filter(
      (block) =>
        (!cat || block.cat === cat) &&
        (!never || block.total === 0) &&
        (!needle || block.name.toLowerCase().includes(needle) || block.id.includes(needle)),
    );
    return compareBy(list, sort.key, sort.dir);
  }, [data.blocks, query, cat, never, sort]);

  return (
    <section className="adm-panel">
      <header className="adm-panel-head">
        <div>
          <h2>Blocks</h2>
          <p>
            {rows.length} of {data.blocks.length} · copies are for the selected period
          </p>
        </div>
      </header>
      <div className="adm-filters">
        <input className="adm-input" type="search" placeholder="Search blocks" value={query} onChange={(event) => setQuery(event.target.value)} aria-label="Search blocks" />
        <div className="adm-chips" role="group" aria-label="Category">
          <button type="button" data-on={cat === null ? "true" : "false"} onClick={() => setCat(null)}>
            All
          </button>
          {cats.map((name) => (
            <button key={name} type="button" data-on={cat === name ? "true" : "false"} onClick={() => setCat(cat === name ? null : name)}>
              {name}
            </button>
          ))}
        </div>
        <label className="adm-check">
          <input type="checkbox" checked={never} onChange={(event) => setNever(event.target.checked)} />
          Never copied
        </label>
      </div>
      <div className="adm-scroll" tabIndex={0}>
        <table className="adm-data">
          <thead>
            <tr>
              <Head id="name" label="Block" sort={sort} toggle={toggle} />
              <Head id="cat" label="Category" sort={sort} toggle={toggle} />
              <Head id="copies" label="Copies" sort={sort} toggle={toggle} num />
              <Head id="total" label="All time" sort={sort} toggle={toggle} num />
              <Head id="copiers" label="People" sort={sort} toggle={toggle} num />
              <Head id="saves" label="Saved" sort={sort} toggle={toggle} num />
              <Head id="failures" label="Failed" sort={sort} toggle={toggle} num />
              <Head id="last" label="Last copied" sort={sort} toggle={toggle} />
            </tr>
          </thead>
          <tbody>
            {rows.map((block) => (
              <tr key={block.id}>
                <td>
                  <Link to="/b/$id" params={{ id: block.id }} className="adm-name">
                    {block.name}
                  </Link>
                </td>
                <td>{block.cat}</td>
                <td data-num="true">
                  <span className="adm-inline">
                    <span className="adm-mini" aria-hidden="true">
                      <i style={{ width: `${(block.copies / max) * 100}%` }} />
                    </span>
                    {num(block.copies)}
                  </span>
                </td>
                <td data-num="true">{num(block.total)}</td>
                <td data-num="true">{num(block.copiers)}</td>
                <td data-num="true">{num(block.saves)}</td>
                <td data-num="true" data-warn={block.failures > 0 ? "true" : undefined}>
                  {num(block.failures)}
                </td>
                <td title={fullTime(block.last)}>{ago(block.last)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 ? <p className="adm-empty">No blocks match.</p> : null}
      </div>
    </section>
  );
}

type MemberKey = "name" | "provider" | "joined" | "last" | "copies" | "total" | "saves";

function Members({ data }: { data: Dashboard }) {
  const { sort, toggle } = useSort<MemberKey>("joined");
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(false);

  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const list = data.members.filter(
      (member) =>
        (!active || member.copies > 0) &&
        (!needle || member.name.toLowerCase().includes(needle) || member.email.toLowerCase().includes(needle)),
    );
    return compareBy(list, sort.key, sort.dir);
  }, [data.members, query, active, sort]);

  return (
    <section className="adm-panel">
      <header className="adm-panel-head">
        <div>
          <h2>Members</h2>
          <p>
            {rows.length} of {data.members.length}
            {data.members.length >= 500 ? "+" : ""} · newest 500 accounts
          </p>
        </div>
        <button
          type="button"
          className="adm-link"
          onClick={() =>
            downloadCsv(
              `block-supply-members-${new Date().toISOString().slice(0, 10)}.csv`,
              ["Name", "Email", "Via", "Verified", "Joined", "Last copy", "Copies in period", "Copies all time", "Saved"],
              rows.map((member) => [member.name, member.email, member.provider, member.verified ? "yes" : "no", member.joined, member.last ?? "", member.copies, member.total, member.saves]),
            )
          }
        >
          Export CSV
        </button>
      </header>
      <div className="adm-filters">
        <input className="adm-input" type="search" placeholder="Search name or email" value={query} onChange={(event) => setQuery(event.target.value)} aria-label="Search members" />
        <label className="adm-check">
          <input type="checkbox" checked={active} onChange={(event) => setActive(event.target.checked)} />
          Copied in this period
        </label>
      </div>
      <div className="adm-scroll" tabIndex={0}>
        <table className="adm-data">
          <thead>
            <tr>
              <Head id="name" label="Member" sort={sort} toggle={toggle} />
              <Head id="provider" label="Via" sort={sort} toggle={toggle} />
              <Head id="joined" label="Joined" sort={sort} toggle={toggle} />
              <Head id="last" label="Last copy" sort={sort} toggle={toggle} />
              <Head id="copies" label="Copies" sort={sort} toggle={toggle} num />
              <Head id="total" label="All time" sort={sort} toggle={toggle} num />
              <Head id="saves" label="Saved" sort={sort} toggle={toggle} num />
            </tr>
          </thead>
          <tbody>
            {rows.map((member) => (
              <tr key={member.id}>
                <td>
                  <span className="adm-who">
                    <b>{member.name}</b>
                    <small>
                      {member.email}
                      {member.verified ? "" : " · not verified"}
                    </small>
                  </span>
                </td>
                <td>{member.provider}</td>
                <td title={fullTime(member.joined)}>{ago(member.joined)}</td>
                <td title={fullTime(member.last)}>{ago(member.last)}</td>
                <td data-num="true">{num(member.copies)}</td>
                <td data-num="true">{num(member.total)}</td>
                <td data-num="true">{num(member.saves)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 ? <p className="adm-empty">Nobody matches.</p> : null}
      </div>
    </section>
  );
}

function Activity({ data }: { data: Dashboard }) {
  const reasons = data.reasons.map((reason) => ({ key: reason.message, name: reason.message, value: reason.count }));
  return (
    <>
      <section className="adm-panel">
        <header className="adm-panel-head">
          <div>
            <h2>Why copies fail</h2>
            <p>Messages from visitors' browsers in this period</p>
          </div>
        </header>
        <RankBars rows={reasons} empty="No failed copies in this period." />
      </section>

      <div className="adm-cols">
        <section className="adm-panel">
          <header className="adm-panel-head">
            <div>
              <h2>Latest copies</h2>
              <p>The last {data.recent.length}</p>
            </div>
          </header>
          {data.recent.length === 0 ? (
            <p className="adm-empty">No copies yet.</p>
          ) : (
            <ul className="adm-feed">
              {data.recent.map((event, index) => (
                <li key={`${event.at}-${index}`}>
                  <span>
                    <b>{event.blockName}</b>
                    <small>{event.member ?? "Anonymous visitor"}</small>
                  </span>
                  <time dateTime={event.at} title={fullTime(event.at)}>
                    {ago(event.at)}
                  </time>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="adm-panel">
          <header className="adm-panel-head">
            <div>
              <h2>Latest failures</h2>
              <p>The last {data.failures.length}</p>
            </div>
          </header>
          {data.failures.length === 0 ? (
            <p className="adm-empty">No failed copies recorded.</p>
          ) : (
            <ul className="adm-feed">
              {data.failures.map((event, index) => (
                <li key={`${event.at}-${index}`}>
                  <span>
                    <b>{event.blockName}</b>
                    <small>{event.message}</small>
                    <small>
                      {event.browser} · {event.member ?? "Anonymous visitor"}
                    </small>
                  </span>
                  <time dateTime={event.at} title={fullTime(event.at)}>
                    {ago(event.at)}
                  </time>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
