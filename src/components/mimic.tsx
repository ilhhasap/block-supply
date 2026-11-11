/**
 * Mimic turns a screenshot of a component into an editable block. It is built behind a flag: in
 * production the page only says it is coming soon; set `VITE_MIMIC_ENABLED=true` to work on it locally.
 */
export const MIMIC_ENABLED = import.meta.env.VITE_MIMIC_ENABLED === "true";

export function MimicPage() {
  return (
    <section className="mimic">
      <p className="mimic-soon" aria-hidden="true">
        Soon
      </p>
      <h1 className="mimic-title">Mimic</h1>
      <p className="mimic-sub">
        Upload a screenshot of a component and get it back as an editable block, ready to paste into Figma.
      </p>
      <span className="hero-pill mimic-pill">Coming soon</span>
      {MIMIC_ENABLED ? <p className="mimic-dev">Flag on: the upload tool will live here.</p> : null}
    </section>
  );
}
