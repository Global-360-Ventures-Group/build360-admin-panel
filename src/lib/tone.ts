/**
 * Status colour, shared by every screen that has to show "where is this".
 *
 * Seven tones, no more: the four the dashboard already uses plus two chart
 * hues for the middle of a pipeline and one neutral for "over, nothing to do".
 * A tone is picked for what a value *means*, never to decorate — `globals.css`
 * is explicit that turning a status red because the brand is red destroys the
 * signal.
 *
 * `Badge` ships no success/warning variant, so pills paint these tokens over
 * `secondary`. Chart hues are validated at ≥3:1 on their surface, which is
 * enough for a mark and under the 4.5:1 floor for body text — so anything
 * coloured with `info`, `violet` or `teal` must carry a label or an icon as
 * well, never colour alone.
 */
export type Tone =
  | "neutral"
  | "info"
  | "violet"
  | "teal"
  | "success"
  | "warning"
  | "danger";

/** Tinted background + matching foreground + a hairline for definition. */
export const toneSurface: Record<Tone, string> = {
  neutral: "bg-muted text-muted-foreground ring-foreground/10",
  info: "bg-chart-2/10 text-chart-2 ring-chart-2/20",
  violet: "bg-chart-5/10 text-chart-5 ring-chart-5/20",
  teal: "bg-chart-3/10 text-chart-3 ring-chart-3/20",
  success: "bg-success/10 text-success ring-success/20",
  warning: "bg-warning/10 text-warning ring-warning/20",
  danger: "bg-destructive/10 text-destructive ring-destructive/20",
};

/** Foreground only, for a line of text that has to carry the tone itself. */
export const toneText: Record<Tone, string> = {
  neutral: "text-muted-foreground",
  info: "text-chart-2",
  violet: "text-chart-5",
  teal: "text-chart-3",
  success: "text-success",
  warning: "text-warning",
  danger: "text-destructive",
};

/** Solid fill, for dots, bars and timeline connectors. */
export const toneFill: Record<Tone, string> = {
  neutral: "bg-muted-foreground",
  info: "bg-chart-2",
  violet: "bg-chart-5",
  teal: "bg-chart-3",
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-destructive",
};
