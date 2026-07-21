import { type NextRequest, NextResponse } from "next/server";
import { isAdminAuthorized } from "@/lib/vehicle-shopify";
import {
  updateGalleryItem,
  deleteGalleryItem,
  type GalleryItem,
} from "@/lib/gallery-shopify";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await isAdminAuthorized(req.headers.get("authorization")))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = (await req.json()) as Omit<GalleryItem, "id" | "createdAt">;
  try {
    const item = await updateGalleryItem(id, body);
    return NextResponse.json(item);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await isAdminAuthorized(req.headers.get("authorization")))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  try {
    await deleteGalleryItem(id);
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
