// FEATURE: Spare Parts Store — GET /api/shop/items
// Returns all items with current stock quantities
// Frontend uses this to show product grid with "Out of Stock" status

import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    // FEATURE: Fetch all items from database with live stock_qty
    const items = await prisma.item.findMany({
      select: {
        id: true,
        name: true,
        pictureUrl: true,
        useCase: true,
        price: true,
        stockQty: true,
        workType: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(items);
  } catch (error) {
    console.error("Error fetching items:", error);
    return NextResponse.json({ error: "Failed to fetch items" }, { status: 500 });
  }
}
