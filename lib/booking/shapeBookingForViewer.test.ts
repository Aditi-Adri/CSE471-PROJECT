import { describe, expect, it } from "vitest";
import { shapeBookingForViewer } from "./shapeBookingForViewer";
import type { Booking } from "@/app/generated/prisma/client";

function makeBooking(overrides: Partial<Booking> = {}): Booking {
  return {
    id: "booking-1",
    customerId: "customer-1",
    customerPhone: "+8801700000000",
    workerId: "worker-1",
    status: "CONFIRMED",
    destinationLat: 23.78,
    destinationLng: 90.41,
    etaMinutes: null,
    tenMinuteAlertSent: false,
    serviceAddress: "House 1, Road 2, Dhanmondi",
    proposedRateBdt: 1200,
    counterRateBdt: null,
    agreedRateBdt: 1200,
    arrivalCode: "4821",
    arrivalVerifiedAt: null,
    respondedAt: null,
    completedAt: null,
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
    isCorporateBill: false,
    corporatePropertyId: null,
    requestedByRole: null,
    ...overrides,
  };
}

describe("shapeBookingForViewer", () => {
  it("always shows the customer their own address and phone", () => {
    const shaped = shapeBookingForViewer(makeBooking({ arrivalVerifiedAt: null }), "customer");
    expect(shaped.serviceAddress).toBe("House 1, Road 2, Dhanmondi");
    expect(shaped.customerPhone).toBe("+8801700000000");
  });

  it("hides the worker's view of address/phone before arrival is verified", () => {
    const shaped = shapeBookingForViewer(makeBooking({ arrivalVerifiedAt: null }), "worker");
    expect(shaped.serviceAddress).toBeNull();
    expect(shaped.customerPhone).toBeNull();
  });

  it("reveals address/phone to the worker once arrival is verified", () => {
    const shaped = shapeBookingForViewer(makeBooking({ arrivalVerifiedAt: new Date("2026-01-02") }), "worker");
    expect(shaped.serviceAddress).toBe("House 1, Road 2, Dhanmondi");
    expect(shaped.customerPhone).toBe("+8801700000000");
  });

  it("never leaks other customers' bookings' worth of data through fields it doesn't shape", () => {
    const shaped = shapeBookingForViewer(makeBooking(), "worker");
    // The shaped object is the API's actual response body — it should
    // only ever expose the fields the UI needs, not a full row dump.
    expect(Object.keys(shaped).sort()).toEqual(
      [
        "agreedRateBdt",
        "arrivalCode",
        "arrivalVerifiedAt",
        "counterRateBdt",
        "createdAt",
        "customerId",
        "customerPhone",
        "destinationLat",
        "destinationLng",
        "etaMinutes",
        "id",
        "proposedRateBdt",
        "serviceAddress",
        "status",
        "updatedAt",
        "workerId",
      ].sort()
    );
  });
});
