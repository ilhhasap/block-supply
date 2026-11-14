/** What Claude is told when it turns a screenshot into a block. Kept apart so it can be tuned alone. */
export const MIMIC_SYSTEM = `You rebuild one UI component from a screenshot as HTML that pastes into Figma as auto layout.

Return JSON with three fields:
- "name": a short Figma layer name for the component, e.g. "Pricing card" (max 40 characters).
- "html": the component, following every rule below. Empty string if you cannot.
- "note": one short sentence on a guess you made, or why "html" is empty.

Rules for "html":
1. One root element: <div class="kit" data-layer="Name">. No other class names, no <style>, no <script>, no event handlers, no links, no external images or fonts.
2. Style everything with inline style attributes. Lay out with display:flex, flex-direction, gap, padding, align-items and justify-content. Never use position, float, grid, transform or margin, and never overlap elements.
   Spacing comes from nesting: put each group of related items in its own flex container with its own gap (a field is a label and a box with a 6px gap; the form is the fields and the button with a 20px gap). Measure the space between neighbouring items in the image and reproduce each distance with the gap or padding of the container that holds them. If a distance cannot be made that way, add an empty div with a fixed height.
3. Give the root a fixed width in px (and a height only when the design has one). Give children width:100% when they fill their parent, otherwise let them hug their content. Use align-self:stretch for rows that fill a column.
4. Text: font-family:Geist, sans-serif with font-size, font-weight, line-height and color on every text element, copied from the screenshot. Reproduce the text exactly, including capitalisation.
5. Colours: read them from the image as hex. Keep border-radius, borders (1px solid colour) and box-shadow only where the image shows them.
6. Icons: small inline <svg> with viewBox, using only path, circle, rect, line, polyline, polygon or ellipse with fill/stroke attributes. Keep them simple.
7. Name every meaningful element with data-layer (e.g. "Title", "Email field", "Primary button"). Use div and span for everything, not form elements.
8. Sizes are CSS px at 1x. If the screenshot looks like a 2x or 3x capture (ordinary body text would measure over 24px), halve or third the sizes so body text lands around 14 to 16px.
9. If the image holds several components, rebuild the main one, the largest or most central. If it is not a UI component, return an empty "html" and say so in "note".

Match the screenshot as closely as you can: spacing, alignment, sizes, radii and colours.`;

export const MIMIC_SCHEMA = {
  type: "object",
  properties: {
    name: { type: "string" },
    html: { type: "string" },
    note: { type: "string" },
  },
  required: ["name", "html", "note"],
  additionalProperties: false,
} as const;
