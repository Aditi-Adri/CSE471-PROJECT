import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const {
      bookingId,
      workerId,
      customerId,
      customerPhone,
      destinationLat,
      destinationLng,
    } = await request.json();

    if (!workerId) {
      return NextResponse.json(
        { error: "Worker ID is required" },
        { status: 400 }
      );
    }

    // Fallback to valid defaults if values are not provided
    const targetBookingId = bookingId || undefined; // let Prisma auto-generate via cuid()
    const targetCustomerId = customerId || "customer-demo-id";
    const targetDestLat = destinationLat ?? 23.7808;
    const targetDestLng = destinationLng ?? 90.4194;

    let booking;

    if (targetBookingId) {
      // Upsert when a specific bookingId is provided (demo/existing flow)
      booking = await prisma.booking.upsert({
        where: { id: targetBookingId },
        update: {
          workerId: workerId,
          status: "IN_TRANSIT",
        },
        create: {
          id: targetBookingId,
          customerId: targetCustomerId,
          customerPhone: customerPhone || null,
          workerId: workerId,
          status: "IN_TRANSIT",
          destinationLat: targetDestLat,
          destinationLng: targetDestLng,
        },
      });
    } else {
      // Create a new booking (real booking flow — auto-generated ID)
      booking = await prisma.booking.create({
        data: {
          customerId: targetCustomerId,
          customerPhone: customerPhone || null,
          workerId: workerId,
          status: "IN_TRANSIT",
          destinationLat: targetDestLat,
          destinationLng: targetDestLng,
        },
      });
    }

    return NextResponse.json({
      success: true,
      bookingId: booking.id,
    });
  } catch (error) {
    console.error("Assign booking error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}