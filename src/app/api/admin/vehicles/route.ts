import { type NextRequest, NextResponse } from "next/server";
import { isAdminAuthorized, getAllVehicles, createVehicle } from "@/lib/vehicle-shopify";
import type { VehicleSticker } from "@/lib/vehicle-sticker-data";

export async function GET() {
  const vehicles = await getAllVehicles();
  return NextResponse.json(vehicles);
}

export async function POST(req: NextRequest) {
  if (!(await isAdminAuthorized(req.headers.get("authorization")))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json()) as Omit<VehicleSticker, "id">;
  try {
    const vehicle = await createVehicle(body);
    return NextResponse.json(vehicle, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
