import { highlighter } from "core";

export interface SeverityCounts {
  errors: number;
  info: number;
  warnings: number;
}

// Severity is encoded by BOTH colour and fill density so the bars read as a
// severity gradient (heaviest = worst) and degrade gracefully with no colour:
//   errors █ (full)  ·  warnings ▓ (dark)  ·  info ▒ (medium)  ·  empty ░ (light)
// These block glyphs are in CP437, so even legacy Windows consoles render them.
const ERROR_CELL = "█";
const WARNING_CELL = "▓";
const INFO_CELL = "▒";
const EMPTY_CELL = "░";

interface Segment {
  cells: number;
  char: string;
  frac: number;
  n: number;
  paint: (text: string) => string;
}

const makeSegments = (counts: SeverityCounts): Segment[] => [
  {
    n: counts.errors,
    paint: highlighter.error,
    char: ERROR_CELL,
    cells: 0,
    frac: 0,
  },
  {
    n: counts.warnings,
    paint: highlighter.warn,
    char: WARNING_CELL,
    cells: 0,
    frac: 0,
  },
  {
    n: counts.info,
    paint: highlighter.muted,
    char: INFO_CELL,
    cells: 0,
    frac: 0,
  },
];

// Paint exactly `cells` columns split across severities by proportion, using
// largest-remainder rounding. A present severity is guaranteed ≥1 cell as long
// as a busier segment can spare one, so a lone error never vanishes into noise.
const paintComposition = (counts: SeverityCounts, cells: number): string => {
  if (cells <= 0) {
    return "";
  }
  const total = counts.errors + counts.warnings + counts.info;
  if (total === 0) {
    return highlighter.muted(EMPTY_CELL.repeat(cells));
  }

  const segments = makeSegments(counts);
  let used = 0;
  for (const seg of segments) {
    const exact = (seg.n / total) * cells;
    seg.cells = Math.floor(exact);
    seg.frac = exact - seg.cells;
    used += seg.cells;
  }

  const byFraction = [...segments].sort((a, b) => b.frac - a.frac);
  for (let k = 0; used < cells && byFraction.length > 0; k++) {
    const seg = byFraction[k % byFraction.length];
    if (seg) {
      seg.cells += 1;
      used += 1;
    }
  }

  for (const seg of segments) {
    if (seg.n > 0 && seg.cells === 0) {
      const donor = segments.reduce((max, s) =>
        s.cells > max.cells ? s : max
      );
      if (donor.cells > 1) {
        donor.cells -= 1;
        seg.cells += 1;
      }
    }
  }

  return segments.map((seg) => seg.paint(seg.char.repeat(seg.cells))).join("");
};

// Full-width stacked bar of the severity composition. Zero findings render as a
// solid healthy (green) bar rather than an empty-looking track.
export const compositionBar = (
  counts: SeverityCounts,
  width: number
): string => {
  const total = counts.errors + counts.warnings + counts.info;
  if (total === 0) {
    return highlighter.ok(ERROR_CELL.repeat(width));
  }
  return paintComposition(counts, width);
};

// A composition bar whose *length* is proportional to this row's share of the
// busiest row (`maxTotal`), with the remainder shown as an empty track. Encodes
// magnitude (length) and severity mix (colour/density) at once.
export const magnitudeBar = (
  counts: SeverityCounts,
  width: number,
  maxTotal: number
): string => {
  const total = counts.errors + counts.warnings + counts.info;
  if (total === 0) {
    return highlighter.muted(EMPTY_CELL.repeat(width));
  }
  const ratio = maxTotal > 0 ? total / maxTotal : 1;
  const filled = Math.min(width, Math.max(1, Math.round(ratio * width)));
  return (
    paintComposition(counts, filled) +
    highlighter.muted(EMPTY_CELL.repeat(width - filled))
  );
};

// Legend markers reuse the bar's own fill glyphs so the legend maps 1:1 onto
// the segments above it.
export const SEVERITY_MARK = {
  error: ERROR_CELL,
  warning: WARNING_CELL,
  info: INFO_CELL,
} as const;
