export type Category =
  | "Button"
  | "Input"
  | "Card"
  | "Voice"
  | "Overlay"
  | "Nav"
  | "Data"
  | "Status";

export type Block = {
  id: string;
  name: string;
  cat: Category;
  h: number;
  badge?: "New";
};

export const CATEGORIES: Category[] = [
  "Button",
  "Input",
  "Card",
  "Voice",
  "Overlay",
  "Nav",
  "Data",
  "Status",
];

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
];
