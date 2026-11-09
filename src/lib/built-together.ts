import { shopifyAdminFetch } from "@/lib/shopify";

/**
 * "Built Together" — community milestone timeline.
 * Content lives in Shopify metaobjects: bt_year, bt_customer, bt_milestone.
 * Nothing here is hard-coded to a year; years come from the data.
 */

export type BTImage = { url: string; alt: string; width: number; height: number };

export type BTBusiness = {
  id: string;
  handle: string;
  name: string;
  logo: BTImage | null;
  specialty: string;
  story: string;
  industry: string;
  location: string;
  website: string;
  instagram: string;
  otherLinks: { label: string; url: string }[];
  /** Only approved + active businesses are shown by name to the public. */
  visible: boolean;
};

export type BTStat = { value: string; label: string };

export type BTMilestone = {
  id: string;
  handle: string;
  title: string;
  shortTitle: string;
  date: string; // YYYY-MM-DD
  year: number;
  month: number; // 1-12
  category: string;
  type: "customer" | "company";
  summary: string;
  story: string;
  customer: BTBusiness | null;
  partners: BTBusiness[];
  cover: BTImage | null;
  gallery: BTImage[];
  videoUrl: string;
  instagramUrl: string;
  stats: BTStat[];
  thanks: string;
  serviceUrl: string;
  published: boolean;
  featured: boolean;
  priority: number;
  seoTitle: string;
  seoDescription: string;
};

export type BTYear = {
  year: number;
  title: string;
  description: string;
  intro: string;
  hero: BTImage | null;
  count: number;
};

export const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

type RawField = {
  key: string;
  value: string | null;
  reference?: RawRef | null;
  references?: { nodes: RawRef[] } | null;
};
type RawRef = {
  id?: string;
  handle?: string;
  image?: { url: string; altText: string | null; width: number | null; height: number | null } | null;
  fields?: RawField[];
};
type RawObj = { id: string; handle: string; fields: RawField[] };

const IMG = `image { url altText width height }`;
const FIELDS = `
  fields {
    key value
    reference {
      ... on MediaImage { ${IMG} }
      ... on Metaobject {
        id handle
        fields { key value reference { ... on MediaImage { ${IMG} } } }
      }
    }
    references(first: 40) {
      nodes {
        ... on MediaImage { ${IMG} }
        ... on Metaobject {
          id handle
          fields { key value reference { ... on MediaImage { ${IMG} } } }
        }
      }
    }
  }
`;

async function fetchAll(type: string): Promise<RawObj[]> {
  const data = await shopifyAdminFetch<{
    metaobjects: { nodes: RawObj[] };
  }>(
    `query($type:String!){ metaobjects(type:$type, first:100){ nodes { id handle ${FIELDS} } } }`,
    { type },
    { revalidate: 300, tags: ["built-together"] },
  );
  return data.metaobjects.nodes;
}

const f = (fields: RawField[] | undefined, key: string) =>
  fields?.find((x) => x.key === key);
const text = (fields: RawField[] | undefined, key: string) =>
  (f(fields, key)?.value ?? "").trim();
const bool = (fields: RawField[] | undefined, key: string) =>
  f(fields, key)?.value === "true";

function toImage(r: RawRef | null | undefined): BTImage | null {
  const i = r?.image;
  if (!i?.url) return null;
  return {
    url: i.url,
    alt: i.altText ?? "",
    width: i.width ?? 1200,
    height: i.height ?? 800,
  };
}

function toBusiness(r: RawRef | null | undefined): BTBusiness | null {
  if (!r?.fields) return null;
  const fl = r.fields;
  const links = text(fl, "other_links")
    .split("\n")
    .map((l) => l.split("|").map((s) => s.trim()))
    .filter((p) => p.length === 2 && /^https?:\/\//.test(p[1]))
    .map(([label, url]) => ({ label, url }));
  return {
    id: r.id ?? "",
    handle: r.handle ?? "",
    name: text(fl, "name"),
    logo: toImage(f(fl, "logo")?.reference),
    specialty: text(fl, "specialty"),
    story: text(fl, "story"),
    industry: text(fl, "industry"),
    location: text(fl, "location"),
    website: text(fl, "website"),
    instagram: text(fl, "instagram"),
    otherLinks: links,
    visible: bool(fl, "approved") && bool(fl, "active"),
  };
}

function parseStats(raw: string): BTStat[] {
  return raw
    .split("\n")
    .map((l) => l.split("|").map((s) => s.trim()))
    .filter((p) => p.length >= 2 && p[0] && p[1])
    .map(([value, label]) => ({ value, label }));
}

function toMilestone(o: RawObj): BTMilestone | null {
  const fl = o.fields;
  const date = text(fl, "date");
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(date);
  if (!m) return null;
  let partners: BTBusiness[] = [];
  try {
    partners = (f(fl, "partners")?.references?.nodes ?? [])
      .map(toBusiness)
      .filter((b): b is BTBusiness => !!b);
  } catch {}
  const gallery = (f(fl, "gallery")?.references?.nodes ?? [])
    .map(toImage)
    .filter((i): i is BTImage => !!i);
  return {
    id: o.id,
    handle: o.handle,
    title: text(fl, "title"),
    shortTitle: text(fl, "short_title") || text(fl, "title"),
    date,
    year: Number(m[1]),
    month: Number(m[2]),
    category: text(fl, "category"),
    type: text(fl, "milestone_type") === "company" ? "company" : "customer",
    summary: text(fl, "summary"),
    story: text(fl, "story"),
    customer: toBusiness(f(fl, "customer")?.reference),
    partners,
    cover: toImage(f(fl, "cover")?.reference),
    gallery,
    videoUrl: text(fl, "video_url"),
    instagramUrl: text(fl, "instagram_url"),
    stats: parseStats(text(fl, "stats")),
    thanks: text(fl, "thanks"),
    serviceUrl: text(fl, "service_url"),
    published: bool(fl, "published"),
    featured: bool(fl, "featured"),
    priority: Number(text(fl, "priority")) || 0,
    seoTitle: text(fl, "seo_title"),
    seoDescription: text(fl, "seo_description"),
  };
}

export type BTData = {
  years: BTYear[];
  milestones: BTMilestone[];
  failed: boolean;
};

/** All years + milestones. `preview` includes drafts (placeholder content). */
export async function getBuiltTogether(preview = false): Promise<BTData> {
  try {
    const [yearObjs, msObjs] = await Promise.all([
      fetchAll("bt_year"),
      fetchAll("bt_milestone"),
    ]);
    const milestones = msObjs
      .map(toMilestone)
      .filter((m): m is BTMilestone => !!m && (preview || m.published))
      .sort(
        (a, b) =>
          a.date.localeCompare(b.date) || a.priority - b.priority,
      );

    const byYear = new Map<number, BTYear>();
    for (const o of yearObjs) {
      if (!bool(o.fields, "active")) continue;
      const year = Number(text(o.fields, "year"));
      if (!year) continue;
      byYear.set(year, {
        year,
        title: text(o.fields, "title"),
        description: text(o.fields, "description"),
        intro: text(o.fields, "intro"),
        hero: toImage(f(o.fields, "hero")?.reference),
        count: 0,
      });
    }
    // Any year that has a milestone shows up automatically.
    for (const m of milestones) {
      if (!byYear.has(m.year)) {
        byYear.set(m.year, {
          year: m.year,
          title: "",
          description: "",
          intro: "",
          hero: null,
          count: 0,
        });
      }
    }
    for (const m of milestones) byYear.get(m.year)!.count++;
    const years = [...byYear.values()].sort((a, b) => a.year - b.year);
    return { years, milestones, failed: false };
  } catch {
    return { years: [], milestones: [], failed: true };
  }
}

export const storyPath = (m: Pick<BTMilestone, "year" | "handle">) =>
  `/built-together/${m.year}/${m.handle}`;

/** What the public may see about a business. Unapproved = anonymous. */
export function publicBusiness(b: BTBusiness | null, preview: boolean) {
  if (!b) return null;
  return b.visible || preview ? b : null;
}

/** "Instagram" URL → embeddable permalink, or null. */
export function instagramEmbedUrl(url: string): string | null {
  const m = /^https:\/\/(?:www\.)?instagram\.com\/(reel|p|tv)\/([A-Za-z0-9_-]+)/.exec(url);
  return m ? `https://www.instagram.com/${m[1]}/${m[2]}/embed` : null;
}

/** YouTube / Vimeo → privacy-friendly embed URL, or null. */
export function videoEmbedUrl(url: string): string | null {
  const yt =
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/.exec(url);
  if (yt) return `https://www.youtube-nocookie.com/embed/${yt[1]}`;
  const vm = /vimeo\.com\/(\d+)/.exec(url);
  if (vm) return `https://player.vimeo.com/video/${vm[1]}`;
  return null;
}
