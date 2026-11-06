// Vehicle templates for the Wrap Designer. To add a vehicle: drop its view
// SVGs in public/wrap/<id>/ and add one entry below.
export type WrapView = { key: string; label: string };

export type WrapTemplate = {
  id: string;
  label: string;
  category: string;
  /** Folder under /public/wrap holding one SVG per view. */
  dir: string;
  views: WrapView[];
  /** Real overall length in inches, used to show true sizes. */
  lengthIn: number;
  /** The view whose width equals lengthIn. */
  scaleView: string;
};

export const WRAP_TEMPLATES: WrapTemplate[] = [
  {
    id: "ford-f250-2024",
    label: "Ford F-250 Super Duty Crew Cab Dually, Long Wheelbase (2024)",
    category: "Pickup",
    dir: "/wrap/ford-f250-2024",
    lengthIn: 266.8,
    scaleView: "side-a",
    views: [
      { key: "side-a", label: "Side A" },
      { key: "side-b", label: "Side B" },
      { key: "front", label: "Front" },
      { key: "rear", label: "Rear" },
      { key: "top", label: "Top" },
    ],
  },
];
