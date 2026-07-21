import { type NextRequest, NextResponse } from "next/server";
import { isAdminAuthorized } from "@/lib/vehicle-shopify";
import {
  getAllGalleryItems,
  createGalleryItem,
  type GalleryItem,
} from "@/lib/gallery-shopify";

export async function GET() {
  const items = await getAllGalleryItems();
  return NextResponse.json(items);
}

export async function POST(req: NextRequest) {
  if (!(await isAdminAuthorized(req.headers.get("authorization")))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json()) as Omit<GalleryItem, "id" | "createdAt">;
  try {
    const item = await createGalleryItem(body);
    return NextResponse.json(item, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
