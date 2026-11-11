import { useState, type ReactNode } from "react";
import { BLOCKS } from "@/data/blocks";

/** The mailbox for the "say hello" note. Replace with a real address before launch. */
const CONTACT_EMAIL = "hello@example.com";

/** Little UI specimens that drift across the top of the footer. Pure markup, no images. */
const TILES: { key: string; tilt: number; node: ReactNode }[] = [
  { key: "button", tilt: -4, node: <span className="ft-btn">Continue</span> },
  {
    key: "toggle",
    tilt: 3,
    node: (
      <span className="ft-toggle-demo">
        <i />
      </span>
    ),
  },
  {
    key: "avatars",
    tilt: -2,
    node: (
      <span className="ft-avatars">
        <i />
        <i />
        <i />
        <b>+4</b>
      </span>
    ),
  },
  {
    key: "progress",
    tilt: 4,
    node: (
      <span className="ft-progress">
        <small>Uploading</small>
        <span>
          <i />
        </span>
      </span>
    ),
  },
  {
    key: "badges",
    tilt: -3,
    node: (
      <span className="ft-badges">
        <b>New</b>
        <b data-tone="dark">Beta</b>
      </span>
    ),
  },
  {
    key: "slider",
    tilt: 2,
    node: (
      <span className="ft-slider">
        <i />
        <b />
      </span>
    ),
  },
  {
    key: "bars",
    tilt: -4,
    node: (
      <span className="ft-bars">
        <i style={{ height: "38%" }} />
        <i style={{ height: "62%" }} />
        <i style={{ height: "48%" }} />
        <i style={{ height: "86%" }} />
        <i style={{ height: "70%" }} />
      </span>
    ),
  },
  {
    key: "input",
    tilt: 3,
    node: (
      <span className="ft-input">
        Search
        <i />
      </span>
    ),
  },
];

function Reel() {
  // Two identical halves so the track can loop seamlessly.
  return (
    <div className="ft-reel" aria-hidden="true">
      <div className="ft-track">
        {[0, 1].map((copy) =>
          TILES.map((tile) => (
            <div className="ft-tile" key={`${copy}-${tile.key}`} style={{ transform: `rotate(${tile.tilt}deg)` }}>
              {tile.node}
            </div>
          )),
        )}
      </div>
    </div>
  );
}

/** A supply crate: hover, focus or tap and the lid tips up and a note slides out. */
function Crate() {
  const [open, setOpen] = useState(false);
  return (
    <div
      className="ft-crate"
      data-open={open ? "true" : "false"}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpen(false);
      }}
    >
      <div className="ft-back" aria-hidden="true" />
      <div className="ft-note" id="ft-note">
        <small>Say hello</small>
        <a href={`mailto:${CONTACT_EMAIL}`} tabIndex={open ? 0 : -1}>
          {CONTACT_EMAIL}
        </a>
        <span>Requests, bugs and block ideas are all welcome.</span>
      </div>
      <div className="ft-front" aria-hidden="true">
        <span className="ft-strap" />
        <span className="ft-stamp">
          Block Supply
          <small>{BLOCKS.length} UI blocks · this side up</small>
        </span>
      </div>
      <div className="ft-lid" aria-hidden="true" />
      <button
        type="button"
        className="ft-hit"
        aria-expanded={open}
        aria-controls="ft-note"
        aria-label="Open the crate to see how to get in touch"
        onClick={() => setOpen((on) => !on)}
      />
    </div>
  );
}

export function Footer() {
  return (
    <footer className="ft">
      <Reel />
      <p className="ft-kicker">Got a block in mind?</p>
      <Crate />
      <div className="ft-meta">
        <div>
          <strong>Block Supply</strong>
          <span>Free UI blocks you paste into Figma as auto layout.</span>
        </div>
        <nav aria-label="Social">
          <a href="https://www.linkedin.com" target="_blank" rel="noreferrer">
            LinkedIn
          </a>
          <a href="https://www.instagram.com" target="_blank" rel="noreferrer">
            Instagram
          </a>
          <a href="https://www.behance.net" target="_blank" rel="noreferrer">
            Behance
          </a>
        </nav>
      </div>
      <p className="ft-legal">©{new Date().getFullYear()} Block Supply · Set in Geist</p>
    </footer>
  );
}
