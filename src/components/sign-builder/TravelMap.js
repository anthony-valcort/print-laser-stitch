"use strict";
"use client";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = TravelMap;
/**
 * Stylised map of the east-central Florida coast: the free install zone
 * (Martin + St. Lucie County) glows, the shop is pinned, and the chosen
 * install city gets a line + mileage. Tap a dot to pick it.
 */
const sign_decal_pricing_1 = require("@/lib/sign-decal-pricing");
const LAT0 = 27.1;
const COS = Math.cos((LAT0 * Math.PI) / 180);
const K = 100; // svg units per degree of latitude
function proj(lat, lng) {
    return { x: (lng + 81.6) * COS * K, y: (28.75 - lat) * K };
}
const COAST = [
    [25.55, -80.33],
    [25.76, -80.13],
    [26.12, -80.1],
    [26.37, -80.07],
    [26.7, -80.03],
    [26.94, -80.07],
    [27.1, -80.13],
    [27.2, -80.16],
    [27.45, -80.28],
    [27.64, -80.36],
    [27.85, -80.44],
    [28.08, -80.57],
    [28.4, -80.6],
    [28.75, -80.72],
];
const FREE_ZONE = [
    [26.97, -80.68],
    [27.56, -80.68],
    [27.56, -80.32],
    [27.45, -80.28],
    [27.2, -80.16],
    [27.1, -80.13],
    [26.97, -80.08],
];
function pathOf(pts) {
    return pts
        .map(([la, ln], i) => {
        const p = proj(la, ln);
        return `${i ? "L" : "M"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
    })
        .join(" ");
}
const W = proj(25.5, -79.9).x;
const H = proj(25.5, -79.9).y;
function TravelMap({ selected, onSelect, }) {
    const shop = proj(sign_decal_pricing_1.SHOP.lat, sign_decal_pricing_1.SHOP.lng);
    const coast = pathOf(COAST);
    const ocean = `${coast} L${W} ${proj(28.75, -80.72).y} L${W} ${H} L${proj(25.55, -80.33).x} ${H} Z`;
    const lake = proj(26.95, -80.83);
    const sel = selected?.lat != null && selected.lng != null ? proj(selected.lat, selected.lng) : null;
    return (h("svg", { viewBox: `0 0 ${W} ${H}`, className: "block h-full w-full", role: "img", "aria-label": "Map of the install travel zone" },
        h("rect", { width: W, height: H, fill: "#141418" }),
        h("path", { d: ocean, fill: "#0d2230" }),
        h("path", { d: coast, fill: "none", stroke: "rgba(24,211,232,0.45)", strokeWidth: 1.2 }),
        h("ellipse", { cx: lake.x, cy: lake.y, rx: 0.27 * COS * K, ry: 0.3 * K, fill: "#0d2230", stroke: "rgba(24,211,232,0.25)" }),
        h("text", { x: lake.x, y: lake.y, fontSize: 7, fill: "rgba(24,211,232,0.5)", textAnchor: "middle", dominantBaseline: "central" }, "Lake O"),
        [50, 100, 150].map((mi) => (h("g", { key: mi },
            h("circle", { cx: shop.x, cy: shop.y, r: (mi / 69) * K, fill: "none", stroke: "rgba(255,255,255,0.07)", strokeDasharray: "3 4" }),
            h("text", { x: shop.x, y: shop.y - (mi / 69) * K - 2, fontSize: 6.5, fill: "rgba(255,255,255,0.3)", textAnchor: "middle" },
                mi,
                " mi")))),
        h("path", { d: `${pathOf(FREE_ZONE)} Z`, fill: "rgba(217,240,0,0.16)", stroke: "#d9f000", strokeWidth: 1.2, strokeDasharray: "4 2" }),
        h("text", { x: proj(27.5, -80.66).x + 3, y: proj(27.5, -80.66).y, fontSize: 7.5, fontWeight: 800, fill: "#d9f000" }, "FREE TRAVEL ZONE"),
        h("text", { x: proj(27.5, -80.66).x + 3, y: proj(27.5, -80.66).y + 9, fontSize: 6, fill: "rgba(217,240,0,0.75)" }, "Martin + St. Lucie County"),
        sel && selected && !selected.free && (h("g", null,
            h("line", { x1: shop.x, y1: shop.y, x2: sel.x, y2: sel.y, stroke: "#18d3e8", strokeWidth: 1.4, strokeDasharray: "3 2" }),
            h("text", { x: (shop.x + sel.x) / 2 + 4, y: (shop.y + sel.y) / 2, fontSize: 8, fontWeight: 800, fill: "#18d3e8" },
                "~",
                selected.miles,
                " mi"))),
        sign_decal_pricing_1.TRAVEL_AREAS.filter((a) => a.lat != null).map((a) => {
            const p = proj(a.lat, a.lng);
            const active = selected?.key === a.key;
            return (h("g", { key: a.key, onClick: () => onSelect(a.key), style: { cursor: "pointer" } },
                h("circle", { cx: p.x, cy: p.y, r: 9, fill: "transparent" }),
                active && h("circle", { cx: p.x, cy: p.y, r: 7, fill: "none", stroke: a.free ? "#d9f000" : "#18d3e8", strokeWidth: 1.5, className: "animate-ping origin-center [transform-box:fill-box]" }),
                h("circle", { cx: p.x, cy: p.y, r: active ? 4 : 2.6, fill: active ? (a.free ? "#d9f000" : "#18d3e8") : a.free ? "rgba(217,240,0,0.85)" : "rgba(255,255,255,0.6)" }),
                (active || (!a.free && a.miles >= 38)) && (h("text", { x: p.x < 60 ? p.x + 6 : p.x - 6, y: p.y + 2.5, fontSize: active ? 8 : 6.5, textAnchor: p.x < 60 ? "start" : "end", fontWeight: active ? 800 : 500, fill: active ? "#fff" : "rgba(255,255,255,0.5)" }, a.label.split(" / ")[0]))));
        }),
        h("g", { transform: `translate(${shop.x} ${shop.y})` },
            h("circle", { r: 5.5, fill: "#d94cb3", stroke: "#fff", strokeWidth: 1.5 }),
            h("text", { x: 8, y: 3, fontSize: 7.5, fontWeight: 800, fill: "#fff" }, "Our shop"))));
}
