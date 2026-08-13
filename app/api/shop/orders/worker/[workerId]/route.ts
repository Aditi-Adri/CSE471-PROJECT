// FEATURE: Spare Parts Store — GET /api/shop/orders/worker/:workerId
// Returns all past orders for a specific worker with their order items
// Used in worker dashboard for "Recent Purchases" / "Order History" section

import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ workerId: string }> }
) {
  try {
    const { workerId } = await params;

    if (!workerId) {
      return NextResponse.json({ error: "Worker ID required" }, { status: 400 });
    }

    // FEATURE: Fetch all orders for this worker with nested order_items
    // Include item snapshots (itemName, unitPrice, quantity, subtotal)
    // to keep history correct even if items are renamed/repriced later
    const orders = await prisma.order.findMany({
      where: {
        workerId,
      },
      include: {
        items: {
          select: {
            id: true,
            itemName: true,
            quantity: true,
            unitPrice: true,
            subtotal: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({
      workerId,
      totalOrders: orders.length,
      orders: orders.map((order) => ({
        id: order.id,
        date: order.createdAt,
        totalAmount: order.totalAmount,
        itemsCount: order.items.length,
        items: order.items,
        jobId: order.jobId,
      })),
    });
  } catch (error) {
    console.error("Error fetching worker orders:", error);
    return NextResponse.json({ error: "Failed to fetch orders" }, { status: 500 });
  }
}
