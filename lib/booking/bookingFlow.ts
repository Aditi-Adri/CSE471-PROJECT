export function calculateTotal(basePrice: number, extraCharge: number) {
  return basePrice + extraCharge;
}

export function formatCurrency(amount: number) {
  return `৳${amount.toLocaleString("en-BD")}`;
}

export function generateOtp() {
  return Math.floor(1000 + Math.random() * 9000).toString();
}
