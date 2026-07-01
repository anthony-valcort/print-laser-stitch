import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { getAllVehicles } from "@/lib/vehicle-shopify";
import VehicleStickersClient from "./VehicleStickersClient";

export const metadata: Metadata = {
  title: "Vehicle Sticker Kits · Print Laser Stitch",
  description:
    "Find custom decal kits for your exact vehicle — hood sets, bedsides, full sets and more.",
};

export default async function VehicleStickersPage() {
  const vehicles = await getAllVehicles();

  return (
    <>
      <Header />
      <main className="flex-1">
        <VehicleStickersClient vehicles={vehicles} />
      </main>
      <Footer />
    </>
  );
}
