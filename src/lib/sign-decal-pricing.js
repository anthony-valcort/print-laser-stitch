"use strict";
/**
 * Sign & Decal Builder — ONE pricing table for every window decal, wall
 * graphic, vehicle lettering and sign panel job. Replaces the two older
 * calculators (signage-pricing.ts + decal-pricing.ts, which are kept only so
 * carts saved before the merge still check out).
 *
 * Used by the builder page AND re-run on the server at checkout, so the
 * browser never decides the price.
 *
 * ─── HOW A JOB IS PRICED ────────────────────────────────────────────────
 *   graphics  = Σ (width × height ÷ 144) × qty × material rate for the tier
 *   tax       = graphics × 7% (Martin County)
 *   removal   = old-graphic area × removal rate (min charge)  — install only
 *   travel    = one-way road miles × $/mile (min charge)       — install only
 *               $0 anywhere in Martin or St. Lucie County
 *   total     = graphics + tax + removal + travel
 *
 * Every $ figure Anthony may want to change lives in the CONSTANTS below.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.MAX_PIECES = exports.MAX_QTY = exports.MAX_SIDE_IN = exports.TRAVEL_AREAS = exports.SHOP = exports.TRAVEL_MAX_MILES = exports.TRAVEL_MIN = exports.TRAVEL_RATE_PER_MILE = exports.REMOVAL_MIN = exports.REMOVAL_TYPES = exports.TAX_RATE = exports.MATERIALS = exports.SHAPES = exports.SURFACES = exports.SERVICES = void 0;
exports.getMaterial = getMaterial;
exports.getSurface = getSurface;
exports.getService = getService;
exports.getTravelArea = getTravelArea;
exports.calcSignJob = calcSignJob;
exports.fmtFtIn = fmtFtIn;
exports.money = money;
exports.SERVICES = [
    {
        key: "print-only",
        label: "Print Only",
        short: "Print",
        blurb: "You send the artwork, we print it. Pick up or ship.",
        icon: "🖨️",
    },
    {
        key: "design-print",
        label: "Design & Print",
        short: "Design",
        blurb: "We create or clean up the artwork, send a proof, then print.",
        icon: "✏️",
    },
    {
        key: "full-install",
        label: "Full Install",
        short: "Install",
        blurb: "Design, print and professional installation on site.",
        icon: "🚀",
    },
];
exports.SURFACES = [
    {
        key: "window",
        label: "Storefront window",
        blurb: "Hours, logos, promos, privacy film",
        icon: "🪟",
        refW: 96,
        refH: 84,
        refLabel: "Typical storefront window · 8′ × 7′",
        defaultMaterial: "printed-vinyl",
        presets: [
            { label: "Store hours", w: 12, h: 18 },
            { label: "Logo", w: 24, h: 24, shape: "contour" },
            { label: "Promo banner", w: 48, h: 18 },
            { label: "Full window", w: 96, h: 84 },
        ],
    },
    {
        key: "door",
        label: "Glass door",
        blurb: "Hours, name, push / pull",
        icon: "🚪",
        refW: 36,
        refH: 84,
        refLabel: "Standard glass door · 3′ × 7′",
        defaultMaterial: "printed-vinyl",
        presets: [
            { label: "Push / Pull", w: 8, h: 3 },
            { label: "Store hours", w: 12, h: 16 },
            { label: "Logo", w: 18, h: 18, shape: "contour" },
            { label: "Full door glass", w: 30, h: 76 },
        ],
    },
    {
        key: "wall",
        label: "Wall",
        blurb: "Murals, lobby logos, office graphics",
        icon: "🧱",
        refW: 192,
        refH: 108,
        refLabel: "Typical wall · 16′ × 9′",
        defaultMaterial: "wall-vinyl",
        presets: [
            { label: "Lobby logo", w: 48, h: 36, shape: "contour" },
            { label: "Quote / slogan", w: 96, h: 24, shape: "contour" },
            { label: "Feature mural", w: 120, h: 96 },
            { label: "Full wall", w: 192, h: 108 },
        ],
    },
    {
        key: "vehicle",
        label: "Vehicle",
        blurb: "Door logos, lettering, rear window",
        icon: "🚐",
        refW: 228,
        refH: 98,
        refLabel: "Cargo van side · about 19′ long",
        defaultMaterial: "printed-vinyl",
        presets: [
            { label: "Door logo", w: 24, h: 18, shape: "contour" },
            { label: "Phone / web line", w: 60, h: 6, shape: "contour" },
            { label: "Side lettering", w: 96, h: 24, shape: "contour" },
            { label: "Rear window", w: 48, h: 20 },
        ],
    },
    {
        key: "sign",
        label: "Sign, panel or boat",
        blurb: "Boards, equipment, trailers, boats",
        icon: "🪧",
        refW: 96,
        refH: 48,
        refLabel: "4′ × 8′ sign board",
        defaultMaterial: "printed-vinyl",
        presets: [
            { label: "Yard sign face", w: 24, h: 18 },
            { label: "A-frame face", w: 24, h: 36 },
            { label: "Half board", w: 48, h: 48 },
            { label: "Full 4×8 board", w: 96, h: 48 },
        ],
    },
];
exports.SHAPES = [
    { key: "rect", label: "Rectangle" },
    { key: "rounded", label: "Rounded" },
    { key: "oval", label: "Circle / oval" },
    { key: "contour", label: "Cut lettering / logo" },
];
exports.MATERIALS = [
    {
        key: "printed-vinyl",
        label: "Printed Vinyl",
        blurb: "Full-color decals, logos & lettering",
        rates: { "print-only": 10, "design-print": 12, "full-install": 18 },
        surfaces: ["window", "door", "wall", "vehicle", "sign"],
        look: "print",
    },
    {
        key: "perforated-film",
        label: "Perforated Window Film",
        blurb: "See out, not in — one-way vision",
        rates: { "print-only": 10, "design-print": 12, "full-install": 18 },
        surfaces: ["window", "door", "vehicle"],
        look: "perf",
    },
    {
        key: "full-vinyl",
        label: "Full Vinyl (Blockout)",
        blurb: "Complete privacy, solid color",
        rates: { "print-only": 10, "design-print": 12, "full-install": 16 },
        surfaces: ["window", "door", "vehicle", "sign"],
        look: "solid",
    },
    {
        key: "wall-vinyl",
        label: "Wall Vinyl",
        blurb: "Made for painted interior walls",
        rates: { "print-only": 10, "design-print": 12, "full-install": 13 },
        surfaces: ["wall"],
        look: "print",
    },
    {
        key: "window-tint",
        label: "Window Tint",
        blurb: "UV & heat protection — installed only",
        rates: { "print-only": null, "design-print": null, "full-install": 12 },
        surfaces: ["window", "door"],
        look: "tint",
    },
    {
        key: "special-vinyl",
        label: "Specialty Vinyl",
        blurb: "Reflective, metallic, frosted — custom quote",
        rates: { "print-only": null, "design-print": null, "full-install": null },
        surfaces: ["window", "door", "wall", "vehicle", "sign"],
        quoteOnly: true,
        look: "special",
    },
];
/** Martin County, FL — same rate the old Signage Quote used. */
exports.TAX_RATE = 0.07;
exports.REMOVAL_TYPES = [
    { key: "none", label: "Nothing to remove", blurb: "Clean surface", icon: "✨", ratePerSqFt: 0 },
    { key: "decals", label: "Old decals / stickers", blurb: "Lettering, logos, stickers", icon: "🏷️", ratePerSqFt: 3 },
    { key: "film", label: "Window film / tint", blurb: "Perforated film, tint, frost", icon: "🪟", ratePerSqFt: 3 },
    { key: "wrap", label: "Wrap / large graphic", blurb: "Vehicle wraps, murals, full coverage", icon: "🚐", ratePerSqFt: 4 },
];
/** Smallest removal charge — covers setup, heat gun time, adhesive cleanup. */
exports.REMOVAL_MIN = 50;
// ─── Travel (Full Install only) ──────────────────────────────────────────
/** Charged per ONE-WAY road mile from the shop (covers the round trip). */
exports.TRAVEL_RATE_PER_MILE = 2;
/** Smallest travel charge once outside the free zone. */
exports.TRAVEL_MIN = 35;
/** Beyond this, travel is quoted by phone. */
exports.TRAVEL_MAX_MILES = 150;
exports.SHOP = { lat: 27.1711, lng: -80.2156, label: "Our shop · Stuart" };
exports.TRAVEL_AREAS = [
    // Martin County — free
    { key: "stuart", label: "Stuart", miles: 0, free: true, lat: 27.197, lng: -80.253 },
    { key: "palm-city", label: "Palm City", miles: 0, free: true, lat: 27.168, lng: -80.29 },
    { key: "jensen-beach", label: "Jensen Beach", miles: 0, free: true, lat: 27.254, lng: -80.23 },
    { key: "port-salerno", label: "Port Salerno", miles: 0, free: true, lat: 27.144, lng: -80.2 },
    { key: "hobe-sound", label: "Hobe Sound", miles: 0, free: true, lat: 27.059, lng: -80.136 },
    { key: "indiantown", label: "Indiantown", miles: 0, free: true, lat: 27.027, lng: -80.486 },
    // St. Lucie County — free
    { key: "port-st-lucie", label: "Port St. Lucie", miles: 0, free: true, lat: 27.273, lng: -80.354 },
    { key: "tradition", label: "Tradition", miles: 0, free: true, lat: 27.268, lng: -80.44 },
    { key: "fort-pierce", label: "Fort Pierce", miles: 0, free: true, lat: 27.447, lng: -80.326 },
    // Outside the free zone — approximate one-way road miles from the shop
    { key: "jupiter", label: "Jupiter / Tequesta", miles: 20, free: false, lat: 26.934, lng: -80.094 },
    { key: "palm-beach-gardens", label: "Palm Beach Gardens", miles: 28, free: false, lat: 26.823, lng: -80.138 },
    { key: "vero-beach", label: "Vero Beach", miles: 38, free: false, lat: 27.638, lng: -80.397 },
    { key: "west-palm-beach", label: "West Palm Beach", miles: 38, free: false, lat: 26.715, lng: -80.053 },
    { key: "okeechobee", label: "Okeechobee", miles: 45, free: false, lat: 27.244, lng: -80.83 },
    { key: "wellington", label: "Wellington", miles: 45, free: false, lat: 26.659, lng: -80.241 },
    { key: "lake-worth", label: "Lake Worth", miles: 45, free: false, lat: 26.617, lng: -80.072 },
    { key: "sebastian", label: "Sebastian", miles: 52, free: false, lat: 27.816, lng: -80.471 },
    { key: "boynton-beach", label: "Boynton Beach", miles: 52, free: false, lat: 26.525, lng: -80.066 },
    { key: "delray-beach", label: "Delray Beach", miles: 58, free: false, lat: 26.461, lng: -80.073 },
    { key: "boca-raton", label: "Boca Raton", miles: 66, free: false, lat: 26.368, lng: -80.128 },
    { key: "palm-bay", label: "Palm Bay / Melbourne", miles: 72, free: false, lat: 28.034, lng: -80.588 },
    { key: "fort-lauderdale", label: "Fort Lauderdale", miles: 90, free: false, lat: 26.122, lng: -80.137 },
    { key: "miami", label: "Miami", miles: 115, free: false, lat: 25.762, lng: -80.192 },
    { key: "orlando", label: "Orlando", miles: 125, free: false, lat: 28.538, lng: -81.379 },
    // Not listed — customer picks a distance band
    { key: "other-25", label: "Somewhere else · under 25 mi", miles: 25, free: false },
    { key: "other-50", label: "Somewhere else · 25–50 mi", miles: 50, free: false },
    { key: "other-100", label: "Somewhere else · 50–100 mi", miles: 100, free: false },
    { key: "other-150", label: "Somewhere else · 100–150 mi", miles: 150, free: false },
    { key: "other-far", label: "Somewhere else · 150+ mi", miles: 999, free: false },
];
// ─── Limits ──────────────────────────────────────────────────────────────
exports.MAX_SIDE_IN = 600; // 50 ft
exports.MAX_QTY = 500;
exports.MAX_PIECES = 30;
const round2 = (n) => Math.round(n * 100) / 100;
const clampNum = (n, min, max) => {
    const v = Number(n);
    if (!Number.isFinite(v))
        return min;
    return Math.min(max, Math.max(min, v));
};
function getMaterial(key) {
    return exports.MATERIALS.find((m) => m.key === key);
}
function getSurface(key) {
    return exports.SURFACES.find((s) => s.key === key);
}
function getService(key) {
    return exports.SERVICES.find((s) => s.key === key);
}
function getTravelArea(key) {
    return exports.TRAVEL_AREAS.find((a) => a.key === key);
}
function calcSignJob(input) {
    const service = getService(input.service)?.key ?? "full-install";
    const isInstall = service === "full-install";
    const blockers = [];
    const pieces = (input.pieces ?? []).slice(0, exports.MAX_PIECES).map((p, i) => {
        const w = clampNum(p.widthIn, 0, exports.MAX_SIDE_IN);
        const h = clampNum(p.heightIn, 0, exports.MAX_SIDE_IN);
        const qty = Math.floor(clampNum(p.qty, 1, exports.MAX_QTY));
        const areaEach = (w * h) / 144;
        const area = areaEach * qty;
        const mat = getMaterial(p.material);
        let rate = mat ? mat.rates[service] : null;
        let problem;
        if (!mat)
            problem = "Pick a material";
        else if (mat.quoteOnly)
            problem = `${mat.label} is priced per job — request a quote`;
        else if (rate == null)
            problem = `${mat.label} is only offered with Full Install`;
        else if (w <= 0 || h <= 0)
            problem = "Enter a width and height";
        if (problem) {
            rate = rate ?? null;
            blockers.push(`Piece ${i + 1}: ${problem}`);
        }
        return {
            areaEachSqFt: round2(areaEach),
            areaSqFt: round2(area),
            rate,
            price: problem || rate == null ? 0 : round2(area * rate),
            problem,
        };
    });
    if (pieces.length === 0)
        blockers.push("Add at least one piece");
    const totalArea = pieces.reduce((s, p) => s + p.areaSqFt, 0);
    const graphics = round2(pieces.reduce((s, p) => s + p.price, 0));
    const tax = round2(graphics * exports.TAX_RATE);
    // Removal
    let removalArea = 0;
    let removal = 0;
    const rType = exports.REMOVAL_TYPES.find((r) => r.key === input.removal?.type);
    if (isInstall && rType && rType.key !== "none") {
        removalArea = input.removal.sameAsNew
            ? totalArea
            : clampNum(input.removal.widthFt, 0, 100) *
                clampNum(input.removal.heightFt, 0, 100);
        if (removalArea <= 0)
            blockers.push("Tell us roughly how big the old graphic is");
        else
            removal = round2(Math.max(exports.REMOVAL_MIN, removalArea * rType.ratePerSqFt));
    }
    // Travel
    let travelMiles = 0;
    let travelFree = true;
    let travel = 0;
    if (isInstall) {
        const area = getTravelArea(input.travelArea);
        if (!area) {
            blockers.push("Choose where the install is");
            travelFree = false;
        }
        else if (area.free) {
            travelFree = true;
        }
        else {
            travelFree = false;
            travelMiles = area.miles;
            if (area.miles > exports.TRAVEL_MAX_MILES)
                blockers.push("Installs over 150 miles away are quoted by phone");
            else
                travel = round2(Math.max(exports.TRAVEL_MIN, area.miles * exports.TRAVEL_RATE_PER_MILE));
        }
    }
    return {
        pieces,
        totalAreaSqFt: round2(totalArea),
        graphics,
        tax,
        removalAreaSqFt: round2(removalArea),
        removal,
        travelMiles,
        travelFree,
        travel,
        total: round2(graphics + tax + removal + travel),
        isInstall,
        blockers,
    };
}
// ─── Formatting helpers (shared by page + order notes) ───────────────────
/** 30 → 2′ 6″ ; 8 → 8″ */
function fmtFtIn(inches) {
    const total = Math.round(inches * 4) / 4;
    const ft = Math.floor(total / 12);
    const inch = Math.round((total - ft * 12) * 100) / 100;
    if (ft === 0)
        return `${inch}″`;
    if (inch === 0)
        return `${ft}′`;
    return `${ft}′ ${inch}″`;
}
function money(n) {
    return `$${n.toFixed(2)}`;
}
