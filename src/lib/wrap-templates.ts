// Vehicle templates for the Wrap Designer.
//
// To add a vehicle:
//   1. Convert its 1:20 template to /public/wrap/<id>/sheet.svg
//      (one SVG holding every view: sides, front, rear, top).
//   2. Add one entry below.
//
// All templates are drawn at 1:20 scale in points (72 pt = 1 inch on paper),
// so 1 sheet unit = 20/72 real inches. No per-vehicle calibration is needed.

export type WrapView = {
  key: string;
  label: string;
  /** Bounding box of the view on the sheet, in sheet units. */
  x: number;
  y: number;
  w: number;
  h: number;
};

export type WrapTemplate = {
  id: string;
  make: string;
  model: string;
  year: number;
  bodyStyle: string;
  category: string;
  label: string;
  /** URL of the combined template sheet. */
  sheetUrl: string;
  /** Printed measurements on the template (shown in the status bar). */
  lengthIn: number;
  wheelbaseIn: number;
  lengthMm: number;
  wheelbaseMm: number;
  views: WrapView[];
};

/** Real inches per sheet unit for a 1:20 template drawn in points. */
export const INCHES_PER_UNIT = 20 / 72;

export const WRAP_TEMPLATES: WrapTemplate[] = [
  {
    id: "ford-f250-2024",
    make: "Ford",
    model: "F-250 Super Duty",
    year: 2024,
    bodyStyle: "Crew Cab Dually, Long Wheelbase",
    category: "Pickups",
    label: "2024 Ford F-250 Super Duty Crew Cab Dually LWB",
    sheetUrl: "/wrap/ford-f250-2024/sheet.svg",
    lengthIn: 266.8,
    wheelbaseIn: 176,
    lengthMm: 6761.4,
    wheelbaseMm: 4470.4,
    views: [
      { key: "top", label: "Top", x: -541, y: -588, w: 356, h: 953 },
      { key: "side-a", label: "Passenger side", x: -119, y: -502, w: 948, h: 242 },
      { key: "side-b", label: "Driver side", x: -130, y: -24, w: 948, h: 242 },
      { key: "front", label: "Front", x: 866, y: -501, w: 332, h: 247 },
      { key: "rear", label: "Rear", x: 866, y: -26, w: 332, h: 216 },
    ],
  },
];
