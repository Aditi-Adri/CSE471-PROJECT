// FEATURE: Spare Parts Store — POST /api/shop/orders
// Creates a new order with transaction validation for stock deduction
// Validates stock availability, deducts items, saves order + order_items

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/authOptions";
import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

// FEATURE: Request type for order creation
interface OrderItemRequest {
  itemId: number;
  quantity: number;
}

interface CreateOrderRequest {
  jobId?: string;
  items: OrderItemRequest[];
}

export async function POST(req: NextRequest) {
  try {
    // Auth was missing here — `workerId` came straight from the
    // request body, so anyone (signed in or not) could place an order
    // as any other worker. Now taken from the session instead of
    // trusted client input, same as every other write route in this
    // app (see e.g. app/api/bookings/[id]/respond/route.ts).
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "You must be signed in." }, { status: 401 });
    }
    const workerId = session.user.id;

    const body: CreateOrderRequest = await req.json();
    const { jobId, items } = body;

    // FEATURE: Validate input
    if (!items || items.length === 0) {
      return NextResponse.json({ error: "Invalid request: items required" }, { status: 400 });
    }

    // FEATURE: Start transaction — validate stock for ALL items first
    // Step 1: Fetch current stock for all requested items
    const requestedItemIds = items.map((i) => i.itemId);
    const dbItems = await prisma.item.findMany({
      where: {
        id: {
          in: requestedItemIds,
        },
      },
    });

    // FEATURE: Validate that all items exist
    if (dbItems.length !== requestedItemIds.length) {
      return NextResponse.json({ error: "One or more items not found" }, { status: 404 });
    }

    // FEATURE: Step 2: Validate quantity for each item (check stock_qty)
    const itemMap = new Map(dbItems.map((item) => [item.id, item]));
    for (const orderItem of items) {
      const dbItem = itemMap.get(orderItem.itemId);
      if (!dbItem) {
        return NextResponse.json({ error: `Item ${orderItem.itemId} not found` }, { status: 404 });
      }
      if (dbItem.stockQty < orderItem.quantity) {
        return NextResponse.json(
          {
            error: `Insufficient stock for "${dbItem.name}". Only ${dbItem.stockQty} available.`,
            itemId: orderItem.itemId,
            available: dbItem.stockQty,
            requested: orderItem.quantity,
          },
          { status: 409 }
        );
      }
    }

    // FEATURE: Step 3-6: Use transaction to deduct stock + create order + create order_items
    // If any step fails, entire transaction rolls back (no partial stock deduction)
    const result = await prisma.$transaction(async (tx) => {
      // FEATURE: Step 3: Decrement stock for each item
      for (const orderItem of items) {
        await tx.item.update({
          where: { id: orderItem.itemId },
          data: {
            stockQty: {
              decrement: orderItem.quantity,
            },
          },
        });
      }

      // FEATURE: Calculate total amount
      let totalAmount = 0;
      const orderItemsData = items.map((orderItem) => {
        const dbItem = itemMap.get(orderItem.itemId)!;
        // `price` is a Prisma Decimal — multiply with Decimal.mul, not `*`
        const subtotal = dbItem.price.mul(orderItem.quantity);
        totalAmount = totalAmount + Number(subtotal);
        return {
          itemId: orderItem.itemId,
          itemName: dbItem.name,
          quantity: orderItem.quantity,
          unitPrice: dbItem.price,
          subtotal: subtotal,
        };
      });

      // FEATURE: Step 4: Create order row
      const order = await tx.order.create({
        data: {
          workerId,
          jobId: jobId || null,
          totalAmount: totalAmount,
        },
      });

      // FEATURE: Step 5: Create order_items rows
      const createdOrderItems = await tx.orderItem.createMany({
        data: orderItemsData.map((item) => ({
          orderId: order.id,
          itemId: item.itemId,
          itemName: item.itemName,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          subtotal: item.subtotal,
        })),
      });

      return { order, itemsCount: createdOrderItems.count };
    });

    // FEATURE: Step 6: Transaction committed successfully
    return NextResponse.json({
      success: true,
      message: "Order confirmed and added to bill",
      orderId: result.order.id,
      totalAmount: result.order.totalAmount,
      itemsCount: result.itemsCount,
    });
  } catch (error) {
    console.error("Error creating order:", error);
    return NextResponse.json({ error: "Failed to create order" }, { status: 500 });
  }
}
