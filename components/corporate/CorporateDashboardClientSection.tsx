"use client";

import { useState } from "react";
import { MonthlyInvoiceCard } from "@/components/corporate/MonthlyInvoiceCard";
import { CorporateBookingsList } from "@/components/corporate/CorporateBookingsList";
import { CorporatePropertyList } from "@/components/corporate/CorporatePropertyList";

/**
 * MODULE 3 -> FEATURE 3 (Corporate Portal): Client container for the
 * corporate dashboard. Coordinates live booking updates and automatic
 * recalculation of the monthly invoice.
 */
export function CorporateDashboardClientSection() {
  const [billingRefreshKey, setBillingRefreshKey] = useState(0);
  const [bookingsRefreshKey, setBookingsRefreshKey] = useState(0);

  function handleJobCompleted() {
    setBillingRefreshKey((prev) => prev + 1);
  }

  function handleBookingCreated() {
    setBookingsRefreshKey((prev) => prev + 1);
  }

  return (
    <div className="mt-10 flex flex-col gap-10">
      <MonthlyInvoiceCard refreshKey={billingRefreshKey} />
      <CorporateBookingsList refreshKey={bookingsRefreshKey} onJobCompleted={handleJobCompleted} />
      <CorporatePropertyList onBookingCreated={handleBookingCreated} />
    </div>
  );
}
