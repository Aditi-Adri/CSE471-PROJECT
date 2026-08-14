// READ-ONLY health check — counts rows in the main tables so you can confirm
// the database is intact. It writes nothing.
//
// PowerShell:
//   $env:DATABASE_URL="<your neon url>"; npx tsx prisma/checkDb.ts

import { prisma } from "../lib/db";

async function main() {
  const url = process.env.DATABASE_URL;
  console.log("DATABASE_URL set:", url ? `yes (host: ${new URL(url).host})` : "NO — that's the problem");

  const [users, workers, bookings, categories, items, orders] = await Promise.all([
    prisma.user.count(),
    prisma.worker.count(),
    prisma.booking.count(),
    prisma.serviceCategory.count(),
    prisma.item.count(),
    prisma.order.count(),
  ]);

  console.log("\nRow counts");
  console.log("  users            :", users);
  console.log("  workers          :", workers);
  console.log("  bookings         :", bookings);
  console.log("  serviceCategories:", categories);
  console.log("  items            :", items);
  console.log("  orders           :", orders);

  const withPics = await prisma.item.count({ where: { NOT: { pictureUrl: null } } });
  console.log("  items with picture:", withPics);
}

main()
  .catch((err) => {
    console.error("\nCould not read the database:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
