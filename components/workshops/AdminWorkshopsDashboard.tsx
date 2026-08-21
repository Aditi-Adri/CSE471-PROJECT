"use client";

import { useState } from "react";
import { CreateWorkshopForm } from "./CreateWorkshopForm";
import { AdminWorkshopsList } from "./AdminWorkshopsList";

// Combines the create form and the list on the admin's workshops page.
// refreshKey just needs to change value (not mean anything itself) to
// tell AdminWorkshopsList to reload after a new workshop is created.
export function AdminWorkshopsDashboard() {
  const [refreshKey, setRefreshKey] = useState(0);

  function handleCreated() {
    setRefreshKey(refreshKey + 1);
  }

  return (
    <div className="flex flex-col gap-6">
      <CreateWorkshopForm onCreated={handleCreated} />
      <AdminWorkshopsList refreshKey={refreshKey} />
    </div>
  );
}
