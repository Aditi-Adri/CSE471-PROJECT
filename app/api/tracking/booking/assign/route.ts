import { NextResponse } from "next/server";
import { prisma } from "@/lib/db"; // or your prisma import path

export async function POST(request: Request) {
  try {
    const { bookingId, workerId } = await request.json();

    if (!workerId) {
      return NextResponse.json(
        { error: "Worker ID is required" },
        { status: 400 }
      );
    }

    // Fallback to a valid string ID if bookingId is undefined
    const targetBookingId = bookingId || "booking-demo-id";

    const booking = await prisma.booking.upsert({
      where: {
        id: targetBookingId, // 👈 Never pass undefined here
      },
      update: {
        workerId: workerId,
        status: "IN_TRANSIT",
      },
      create: {
        id: targetBookingId,
        customerId: "customer-demo-id",
        workerId: workerId,
        status: "IN_TRANSIT",
        destinationLat: 23.7808,
        destinationLng: 90.4194,
      },
    });

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