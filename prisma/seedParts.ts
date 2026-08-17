// Simple seed for the Part catalog (Adri, Module 3). Run once with:
//   npx tsx --env-file=.env prisma/seedParts.ts
// Safe to re-run - it just skips a part if one with that name already exists.

import { prisma } from "../lib/db";

const PARTS = [
  { name: "Multimeter / tester", price: 450, stockQty: 20 },
  { name: "Electrical wire (per meter)", price: 25, stockQty: 500 },
  { name: "Wire connector", price: 10, stockQty: 300 },
  { name: "Insulation tape", price: 40, stockQty: 100 },
  { name: "PVC pipe joint", price: 60, stockQty: 150 },
  { name: "Screwdriver set", price: 350, stockQty: 15 },
  { name: "Socket / switch", price: 120, stockQty: 80 },
  { name: "Circuit breaker", price: 300, stockQty: 40 },
];

async function main() {
  let added = 0;
  for (const part of PARTS) {
    const exists = await prisma.part.findFirst({ where: { name: part.name } });
    if (exists) continue;
    await prisma.part.create({ data: part });
    added++;
  }
  console.log(`Added ${added} part(s).`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
