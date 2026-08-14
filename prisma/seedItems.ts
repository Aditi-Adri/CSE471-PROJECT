// Quick script to seed spare parts directly without migrations
// Run with: npx tsx prisma/seedItems.ts

import { prisma } from "../lib/db";

async function main() {
  console.log("Seeding spare parts into database...\n");

  try {
    // FEATURE: Dummy spare parts for shop
    const spareParts = [
      {
        name: "Water Pump",
        pictureUrl: null,
        useCase: "For plumbing systems and water supply",
        price: 2500,
        stockQty: 15,
        workType: "Plumbing",
      },
      {
        name: "PVC Pipe (1 inch)",
        pictureUrl: null,
        useCase: "Water pipeline construction and repair",
        price: 120,
        stockQty: 50,
        workType: "Plumbing",
      },
      {
        name: "Copper Wire (10 meters)",
        pictureUrl: null,
        useCase: "Electrical wiring and connections",
        price: 450,
        stockQty: 25,
        workType: "Electrical",
      },
      {
        name: "Circuit Breaker",
        pictureUrl: null,
        useCase: "Electrical safety and protection",
        price: 800,
        stockQty: 12,
        workType: "Electrical",
      },
      {
        name: "Faucet Valve",
        pictureUrl: null,
        useCase: "Water tap replacement and repair",
        price: 350,
        stockQty: 30,
        workType: "Plumbing",
      },
      {
        name: "Light Bulb (LED 12W)",
        pictureUrl: null,
        useCase: "Home and commercial lighting",
        price: 180,
        stockQty: 60,
        workType: "Electrical",
      },
      {
        name: "Pipe Wrench",
        pictureUrl: null,
        useCase: "Plumbing tools for pipe fitting",
        price: 520,
        stockQty: 8,
        workType: "Plumbing",
      },
      {
        name: "Electrical Socket",
        pictureUrl: null,
        useCase: "Power outlet replacement",
        price: 220,
        stockQty: 40,
        workType: "Electrical",
      },
      {
        name: "Water Filter",
        pictureUrl: null,
        useCase: "Drinking water purification",
        price: 1800,
        stockQty: 10,
        workType: "Plumbing",
      },
      {
        name: "Electrical Switch",
        pictureUrl: null,
        useCase: "Light and appliance control",
        price: 150,
        stockQty: 75,
        workType: "Electrical",
      },
    ];

    // Delete existing items first
    await prisma.item.deleteMany();
    console.log("Cleared existing items\n");

    // Insert new items
    for (const part of spareParts) {
      const created = await prisma.item.create({
        data: {
          name: part.name,
          pictureUrl: part.pictureUrl,
          useCase: part.useCase,
          price: part.price,
          stockQty: part.stockQty,
          workType: part.workType,
        },
      });
      console.log(`✓ Created: ${created.name} (Stock: ${created.stockQty})`);
    }

    console.log(`\n✅ Seeded ${spareParts.length} spare parts successfully!`);
  } catch (error) {
    console.error("❌ Error seeding items:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
