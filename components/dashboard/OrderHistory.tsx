// FEATURE: Spare Parts Store — Order History Component
// Displays recent purchases from the Spare Parts Store on worker dashboard
// Shows date, items purchased, and total per order

"use client";

import { useEffect, useState } from "react";

// FEATURE: Type definition for order display
interface OrderHistoryItem {
  id: number;
  date: string;
  totalAmount: string;
  // MODULE 4 (Shiva): present only when a coupon was applied at checkout.
  discountBdt: number;
  couponCode: string | null;
  items: Array<{ itemName: string; quantity: number }>;
}

interface OrderHistoryProps {
  workerId: string;
}

export function OrderHistory({ workerId }: OrderHistoryProps) {
  const [orders, setOrders] = useState<OrderHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // FEATURE: Fetch order history on component mount
  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/shop/orders/worker/${workerId}`);
        if (!res.ok) throw new Error("Failed to fetch orders");
        const data = await res.json();
        setOrders(data.orders);
        setError("");
      } catch (err) {
        console.error("Error fetching order history:", err);
        setError("Failed to load order history");
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [workerId]);

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-32 bg-gray-200 rounded"></div>
      </div>
    );
  }

  if (error || orders.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        {error || "No orders yet"}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {orders.slice(0, 5).map((order) => (
        <div
          key={order.id}
          className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition"
        >
          <div className="flex justify-between items-start mb-2">
            <span className="text-sm text-gray-600">
              {new Date(order.date).toLocaleDateString()}
            </span>
            <span className="font-semibold text-brand-600">৳{order.totalAmount}</span>
          </div>
          <div className="text-sm text-gray-700">
            <span className="font-medium">{order.items.length} item(s):</span>{" "}
            {order.items.map((item, idx) => (
              <span key={idx}>
                {item.itemName} (×{item.quantity})
                {idx < order.items.length - 1 ? ", " : ""}
              </span>
            ))}
          </div>
          {order.couponCode && (
            <p className="mt-1 text-xs font-medium text-green-700">
              Coupon {order.couponCode} applied — saved ৳{order.discountBdt}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
