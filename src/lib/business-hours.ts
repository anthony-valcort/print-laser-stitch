/**
 * Business hours — the ONE place they are written down.
 *
 * Anthony's rule: whatever is on the Google Business Profile is what the
 * website says, so customers never see two answers. When the Google hours
 * change, change them here and the footer, contact page, about page and the
 * structured data Google reads all follow.
 *
 * Last synced with the Google Business Profile: 2026-11-04
 *   Mon–Fri 7:30 AM–5:30 PM · Sat 8 AM–1:30 PM · Sun closed
 */

export type HoursBlock = {
  /** Full English day names, as schema.org expects them. */
  days: string[];
  /** 24-hour "HH:MM". */
  opens: string;
  closes: string;
};

export const BUSINESS_HOURS: HoursBlock[] = [
  {
    days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
    opens: "07:30",
    closes: "17:30",
  },
  {
    days: ["Saturday"],
    opens: "08:00",
    closes: "13:30",
  },
];

export const WEEK = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const;

const SHORT: Record<string, string> = {
  Monday: "Mon",
  Tuesday: "Tue",
  Wednesday: "Wed",
  Thursday: "Thu",
  Friday: "Fri",
  Saturday: "Sat",
  Sunday: "Sun",
};

/** "07:30" → "7:30am", "13:30" → "1:30pm", "08:00" → "8am". */
function clock(t: string): string {
  const [h, m] = t.split(":").map(Number);
  const suffix = h >= 12 ? "pm" : "am";
  const h12 = h % 12 || 12;
  return m ? `${h12}:${String(m).padStart(2, "0")}${suffix}` : `${h12}${suffix}`;
}

/** "7:30am–5:30pm" (pass " – " for a roomier separator). */
export function formatRange(block: HoursBlock, sep = "–"): string {
  return `${clock(block.opens)}${sep}${clock(block.closes)}`;
}

function blockFor(day: string): HoursBlock | undefined {
  return BUSINESS_HOURS.find((b) => b.days.includes(day));
}

/** Seven rows, Monday first, e.g. { day: "Sat", time: "8am–1:30pm" }. */
export function weeklyHoursByDay(): { day: string; time: string }[] {
  return WEEK.map((day) => {
    const block = blockFor(day);
    return { day: SHORT[day], time: block ? formatRange(block) : "Closed" };
  });
}

/** Grouped rows, e.g. "Mon – Fri", "Sat", "Sun – Closed". */
export function groupedHours(): { day: string; time: string }[] {
  const rows = BUSINESS_HOURS.map((b) => ({
    day:
      b.days.length > 1
        ? `${SHORT[b.days[0]]} – ${SHORT[b.days[b.days.length - 1]]}`
        : SHORT[b.days[0]],
    time: formatRange(b, " – "),
  }));
  const closed = WEEK.filter((d) => !blockFor(d)).map((d) => SHORT[d]);
  if (closed.length) rows.push({ day: closed.join(", "), time: "Closed" });
  return rows;
}

/** schema.org OpeningHoursSpecification list for the LocalBusiness JSON-LD. */
export function openingHoursSpecification() {
  return BUSINESS_HOURS.map((b) => ({
    "@type": "OpeningHoursSpecification",
    dayOfWeek: b.days,
    opens: b.opens,
    closes: b.closes,
  }));
}
