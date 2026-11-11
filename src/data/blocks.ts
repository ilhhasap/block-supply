export type Category =
  | "Button"
  | "Input"
  | "Card"
  | "Voice"
  | "Overlay"
  | "Nav"
  | "Data"
  | "Status"
  | "Form"
  | "Hero"
  | "Features"
  | "CTA"
  | "FAQ"
  | "Footer";

export type Block = {
  id: string;
  name: string;
  cat: Category;
  h: number;
  badge?: "New";
};

/** Top-level groups shown in the navbar. */
export type Group = "Components" | "Sections";

export const GROUPS: Group[] = ["Components", "Sections"];

/** The categories (filter chips) that belong to each group. */
export const GROUP_CATEGORIES: Record<Group, Category[]> = {
  Components: ["Button", "Input", "Card", "Voice", "Overlay", "Nav", "Data", "Status", "Form"],
  Sections: ["Hero", "Features", "CTA", "FAQ", "Footer"],
};

export function groupOf(cat: Category): Group {
  return GROUP_CATEGORIES.Sections.includes(cat) ? "Sections" : "Components";
}

export const BLOCKS: Block[] = [
  { id: "primary-button", name: "Primary button", cat: "Button", h: 220, badge: "New" },
  { id: "button-set", name: "Button set", cat: "Button", h: 220 },
  { id: "icon-buttons", name: "Icon buttons", cat: "Button", h: 220 },
  { id: "split-button", name: "Split button", cat: "Button", h: 220 },
  { id: "text-field", name: "Text field", cat: "Input", h: 280 },
  { id: "search-field", name: "Search field", cat: "Input", h: 200 },
  { id: "password", name: "Password", cat: "Input", h: 280 },
  { id: "textarea", name: "Textarea", cat: "Input", h: 340 },
  { id: "select", name: "Select", cat: "Input", h: 380 },
  { id: "otp", name: "One-time code", cat: "Input", h: 220, badge: "New" },
  { id: "checklist", name: "Checklist", cat: "Input", h: 280 },
  { id: "radios", name: "Radio group", cat: "Input", h: 300 },
  { id: "toggle", name: "Toggle", cat: "Input", h: 200 },
  { id: "slider", name: "Slider", cat: "Input", h: 220 },
  { id: "segmented", name: "Segmented control", cat: "Input", h: 200 },
  { id: "profile", name: "Profile card", cat: "Card", h: 420, badge: "New" },
  { id: "stat", name: "Stat card", cat: "Card", h: 420 },
  { id: "free-plan", name: "Free plan", cat: "Card", h: 420 },
  { id: "badges", name: "Badges", cat: "Card", h: 200 },
  { id: "avatars", name: "Avatar group", cat: "Card", h: 220 },
  { id: "orb", name: "Orb", cat: "Voice", h: 360, badge: "New" },
  { id: "voice-button", name: "Voice button", cat: "Voice", h: 320 },
  { id: "waveform", name: "Live waveform", cat: "Voice", h: 240 },
  { id: "player", name: "Audio player", cat: "Voice", h: 280 },
  { id: "conversation", name: "Conversation", cat: "Voice", h: 400 },
  { id: "mic", name: "Mic selector", cat: "Voice", h: 200 },
  { id: "speech", name: "Speech input", cat: "Voice", h: 200 },
  { id: "shimmer", name: "Shimmer text", cat: "Voice", h: 200 },
  { id: "scrub", name: "Scrub bar", cat: "Voice", h: 180 },
  { id: "alert", name: "Alert", cat: "Overlay", h: 220 },
  { id: "toast", name: "Toast", cat: "Overlay", h: 180 },
  { id: "tooltip", name: "Tooltip", cat: "Overlay", h: 260 },
  { id: "dropdown", name: "Dropdown", cat: "Overlay", h: 400 },
  { id: "dialog", name: "Dialog", cat: "Overlay", h: 360 },
  { id: "command", name: "Command bar", cat: "Overlay", h: 400 },
  { id: "navbar", name: "Navbar", cat: "Nav", h: 200 },
  { id: "tabs", name: "Tabs", cat: "Nav", h: 260 },
  { id: "breadcrumb", name: "Breadcrumb", cat: "Nav", h: 160 },
  { id: "pagination", name: "Pagination", cat: "Nav", h: 180 },
  { id: "sidebar", name: "Sidebar", cat: "Nav", h: 420 },
  { id: "progress", name: "Progress", cat: "Status", h: 200 },
  { id: "table", name: "Table", cat: "Data", h: 380 },
  { id: "stepper", name: "Stepper", cat: "Data", h: 220 },
  { id: "accordion", name: "Accordion", cat: "Overlay", h: 380 },
  { id: "empty", name: "Empty state", cat: "Status", h: 320 },
  { id: "keyboard", name: "Keyboard", cat: "Data", h: 180 },
  { id: "upload", name: "Upload", cat: "Input", h: 320 },
  { id: "skeleton", name: "Skeleton", cat: "Status", h: 260 },
  { id: "notice", name: "Inline notice", cat: "Status", h: 200 },
  { id: "link-button", name: "Link button", cat: "Button", h: 200 },
  { id: "danger-button", name: "Danger buttons", cat: "Button", h: 200 },
  { id: "loading-button", name: "Loading button", cat: "Button", h: 200 },
  { id: "button-group", name: "Button group", cat: "Button", h: 200 },
  { id: "fab", name: "Floating actions", cat: "Button", h: 220 },
  { id: "bar-chart", name: "Bar chart", cat: "Data", h: 360 },
  { id: "donut", name: "Donut chart", cat: "Data", h: 320 },
  { id: "list-rows", name: "List rows", cat: "Data", h: 340 },
  { id: "calendar", name: "Calendar", cat: "Data", h: 460 },
  { id: "timeline", name: "Timeline", cat: "Data", h: 340 },
  { id: "activity", name: "Activity feed", cat: "Data", h: 340 },
  { id: "spinner", name: "Spinners", cat: "Status", h: 200 },
  { id: "status-pills", name: "Status pills", cat: "Status", h: 200 },
  { id: "rating", name: "Rating", cat: "Status", h: 220 },
  { id: "meter", name: "Storage meter", cat: "Status", h: 260 },
  { id: "bottom-tabs", name: "Bottom tabs", cat: "Nav", h: 220 },
  { id: "filter-chips", name: "Filter chips", cat: "Nav", h: 200 },
  { id: "pricing", name: "Pricing card", cat: "Card", h: 440 },
  { id: "testimonial", name: "Testimonial", cat: "Card", h: 340 },
  { id: "product", name: "Product card", cat: "Card", h: 440 },
  { id: "notification", name: "Notification", cat: "Card", h: 240 },
  { id: "login-form", name: "Login form", cat: "Form", h: 480, badge: "New" },
  { id: "signup-form", name: "Sign-up form", cat: "Form", h: 500 },
  { id: "contact-form", name: "Contact form", cat: "Form", h: 520 },
  { id: "newsletter", name: "Newsletter", cat: "Form", h: 300 },
  { id: "like-button", name: "Like button", cat: "Button", h: 200, badge: "New" },
  { id: "label-input", name: "Label input", cat: "Input", h: 200, badge: "New" },
  { id: "signature-pad", name: "Signature pad", cat: "Input", h: 300 },
  { id: "slide-confirm", name: "Slide to confirm", cat: "Input", h: 200, badge: "New" },
  { id: "card-stack", name: "Card stack", cat: "Card", h: 300, badge: "New" },
  { id: "reactions", name: "Reactions", cat: "Card", h: 200 },
  { id: "tilt-card", name: "Tilt card", cat: "Card", h: 280, badge: "New" },
  { id: "image-compare", name: "Image compare", cat: "Card", h: 300 },
  { id: "expanding-panels", name: "Expanding panels", cat: "Card", h: 300 },
  { id: "toast-stack", name: "Toast stack", cat: "Overlay", h: 300, badge: "New" },
  { id: "dynamic-island", name: "Dynamic island", cat: "Overlay", h: 200 },
  { id: "dock", name: "Dock", cat: "Nav", h: 240 },
  { id: "rolling-counter", name: "Rolling counter", cat: "Data", h: 300, badge: "New" },
  { id: "heat-map", name: "Heat map", cat: "Data", h: 300 },
  { id: "stacked-bars", name: "Stacked bars", cat: "Data", h: 320 },
  { id: "hero", name: "Hero", cat: "Hero", h: 380, badge: "New" },
  { id: "feature-grid", name: "Feature grid", cat: "Features", h: 260 },
  { id: "cta-banner", name: "CTA banner", cat: "CTA", h: 240 },
  { id: "faq", name: "FAQ", cat: "FAQ", h: 460 },
  { id: "footer", name: "Footer", cat: "Footer", h: 340 },
];
