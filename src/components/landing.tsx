import { useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { BLOCKS, groupOf } from "@/data/blocks";
import { FREE_COPIES } from "@/lib/copy-limit";
import { Footer } from "@/components/footer";
import { FigmaMark } from "@/components/figma-mark";

function Mark() {
  return (
    <svg width="28" height="31" viewBox="0 0 32 36" aria-hidden="true">
      <path
        fill="currentColor"
        d="M16 1.4 28.6 8.6c1.1.63 1.8 1.82 1.8 3.1v12.6c0 1.28-.7 2.47-1.8 3.1L16 34.6c-1.05.6-2.35.6-3.4 0L3.4 27.4c-1.1-.63-1.8-1.82-1.8-3.1V11.7c0-1.28.7-2.47 1.8-3.1L12.6 1.4c1.05-.6 2.35-.6 3.4 0Z"
      />
      <rect x="11.2" y="11" width="9.6" height="14" rx="2" fill="#fff" />
    </svg>
  );
}

const FEATURES: { eyebrow: string; title: string; text: string; tag?: string; art: ReactNode }[] = [
  {
    eyebrow: "For designers",
    title: "Real auto layout, not flat shapes.",
    text: "Every block lands in Figma as frames with padding, gap and alignment already set. Resize it, swap the text, drop it in your file and keep working.",
    art: (
      <div className="lp-art lp-art-layout" aria-hidden="true">
        <div className="lp-frame">
          <span className="lp-chip">Frame · auto layout</span>
          <div className="lp-row">
            <i />
            <b />
          </div>
          <div className="lp-row">
            <i />
            <b />
          </div>
          <span className="lp-pill">Continue</span>
        </div>
      </div>
    ),
  },
  {
    eyebrow: "For developers",
    title: "Clean SVG you can read.",
    text: "Blocks are plain SVG built from the same tokens, set in Geist. Open the editor, tweak the kit, and export the code when you want to build it.",
    art: (
      <div className="lp-art lp-art-code" aria-hidden="true">
        <pre>
          <span>{"<svg viewBox=\"0 0 360 56\">"}</span>
          {"\n  "}
          <span>{"<rect rx=\"14\" fill=\"#17181a\"/>"}</span>
          {"\n  "}
          <span>{"<text font-family=\"Geist\">"}</span>
          {"\n    Continue\n  "}
          <span>{"</text>"}</span>
          {"\n"}
          <span>{"</svg>"}</span>
        </pre>
      </div>
    ),
  },
  {
    eyebrow: "Mimic",
    title: "Screenshot in, editable block out.",
    text: "Drop in a picture of a component and get it back as a block you can paste into Figma. Coming soon.",
    tag: "Coming soon",
    art: (
      <div className="lp-art lp-art-mimic" aria-hidden="true">
        <div className="lp-shot">Screenshot</div>
        <svg width="28" height="14" viewBox="0 0 28 14">
          <path d="M1 7h24m-6-6 6 6-6 6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <div className="lp-shot lp-shot-on">Block</div>
      </div>
    ),
  },
];

const STEPS = [
  { n: "01", title: "Pick a block", text: "Search buttons, forms, nav bars, hero and pricing sections." },
  { n: "02", title: "Copy it", text: "One click. Tweak the kit in the editor first if you like." },
  { n: "03", title: "Paste into Figma", text: "It arrives as auto layout. No plugin, no export step." },
];

const FAQ = [
  { q: "Is it really free?", a: `Yes. The first ${FREE_COPIES} copies need no account. After that, log in with a free account to keep copying.` },
  { q: "Do I need a Figma plugin?", a: "No. Copy in the browser, then paste into Figma with Cmd or Ctrl V." },
  { q: "Will it be auto layout?", a: "Yes. Blocks paste as frames with auto layout, so spacing and resizing behave like components you built." },
  { q: "Can I use them in client work?", a: "Yes. Use the blocks in your own projects and files." },
];

export function Landing() {
  const [open, setOpen] = useState<number | null>(0);
  const components = BLOCKS.filter((block) => groupOf(block.cat) === "Components").length;
  const sections = BLOCKS.length - components;

  return (
    <div className="lp">
      <header className="lp-nav">
        <Link to="/" className="lp-logo" aria-label="Block Supply home">
          <Mark />
          <span>Block Supply</span>
        </Link>
        <nav aria-label="Main">
          <Link to="/{-$page}" params={{ page: "pricing" }} className="lp-link">
            Pricing
          </Link>
          <Link to="/{-$page}" params={{ page: "library" }} className="lp-btn lp-btn-dark">
            Browse blocks
          </Link>
        </nav>
      </header>

      <main>
        <section className="lp-hero">
          <p className="lp-pill-note">
            <FigmaMark />
            Free blocks for Figma
          </p>
          <h1>Copy a UI block. Paste it into Figma as auto layout.</h1>
          <p className="lp-sub">
            A free library of SVG blocks for designers and developers. No plugin, no export, no starting from a blank frame.
          </p>
          <div className="lp-cta">
            <Link to="/{-$page}" params={{ page: "library" }} className="lp-btn lp-btn-dark lp-btn-lg">
              Browse the library
            </Link>
            <Link to="/{-$page}" params={{ page: "sections" }} className="lp-btn lp-btn-ghost lp-btn-lg">
              See sections
            </Link>
          </div>
          <div className="lp-stage" aria-hidden="true">
            <div className="lp-card lp-card-a">
              <span className="lp-chip">Button</span>
              <span className="lp-demo-btn">Continue</span>
            </div>
            <div className="lp-card lp-card-b">
              <span className="lp-chip">Toggle</span>
              <span className="lp-demo-toggle">
                <i />
              </span>
            </div>
            <div className="lp-card lp-card-c">
              <span className="lp-chip">Input</span>
              <span className="lp-demo-input">hello@block.supply</span>
            </div>
          </div>
        </section>

        <section className="lp-features" aria-label="What you get">
          {FEATURES.map((feature, index) => (
            <article key={feature.title} className="lp-feature" data-flip={index % 2 === 1 ? "true" : "false"}>
              <div className="lp-feature-copy">
                <p className="lp-eyebrow">
                  {feature.eyebrow}
                  {feature.tag ? <span className="lp-tag">{feature.tag}</span> : null}
                </p>
                <h2>{feature.title}</h2>
                <p>{feature.text}</p>
              </div>
              {feature.art}
            </article>
          ))}
        </section>

        <section className="lp-stats" aria-label="In numbers">
          {[
            { v: String(components), l: "Components", s: "Buttons, inputs, nav and more" },
            { v: String(sections), l: "Sections", s: "Hero, features, pricing, FAQ" },
            { v: String(FREE_COPIES), l: "Free copies", s: "Before you log in" },
            { v: "0", l: "Plugins", s: "Copy and paste is all it takes" },
          ].map((stat) => (
            <div key={stat.l}>
              <strong>{stat.v}</strong>
              <span>{stat.l}</span>
              <small>{stat.s}</small>
            </div>
          ))}
        </section>

        <section className="lp-section">
          <p className="lp-eyebrow">How it works</p>
          <h2 className="lp-h2">Three steps. Under ten seconds.</h2>
          <ol className="lp-steps">
            {STEPS.map((step) => (
              <li key={step.n}>
                <span>{step.n}</span>
                <h3>{step.title}</h3>
                <p>{step.text}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="lp-section">
          <p className="lp-eyebrow">Pricing</p>
          <h2 className="lp-h2">Free. Really.</h2>
          <div className="lp-plans">
            <div className="lp-plan">
              <h3>No account</h3>
              <p className="lp-price">
                $0 <small>forever</small>
              </p>
              <ul>
                <li>{FREE_COPIES} copies to try it</li>
                <li>Every block, no limits on browsing</li>
                <li>Editor and kit controls</li>
              </ul>
            </div>
            <div className="lp-plan lp-plan-on">
              <span className="lp-tag">Keep copying</span>
              <h3>Free account</h3>
              <p className="lp-price">
                $0 <small>forever</small>
              </p>
              <ul>
                <li>Unlimited copies</li>
                <li>Save blocks for later</li>
                <li>Sign in with Google, GitHub or email</li>
              </ul>
              <Link to="/{-$page}" params={{ page: "library" }} search={{ auth: "signup" }} className="lp-btn lp-btn-dark">
                Create a free account
              </Link>
            </div>
          </div>
        </section>

        <section className="lp-section lp-faq">
          <p className="lp-eyebrow">FAQ</p>
          <h2 className="lp-h2">Good to know.</h2>
          <div>
            {FAQ.map((item, index) => (
              <div key={item.q} className="lp-qa" data-open={open === index ? "true" : "false"}>
                <button type="button" aria-expanded={open === index} onClick={() => setOpen(open === index ? null : index)}>
                  {item.q}
                  <span aria-hidden="true">{open === index ? "−" : "+"}</span>
                </button>
                {open === index ? <p>{item.a}</p> : null}
              </div>
            ))}
          </div>
        </section>

        <section className="lp-close">
          <h2>Start with a block.</h2>
          <p>Open the library, copy one, paste it into Figma.</p>
          <Link to="/{-$page}" params={{ page: "library" }} className="lp-btn lp-btn-dark lp-btn-lg">
            Browse the library
          </Link>
        </section>
      </main>

      <Footer />
    </div>
  );
}
