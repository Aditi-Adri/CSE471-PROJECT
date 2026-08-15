// Add 30 more realistic spare parts to the database
// Run with: npx tsx --require dotenv/config prisma/seedMoreItems.ts

import { prisma } from "../lib/db";

async function main() {
  console.log("Adding 30 more spare parts to database...\n");

  try {
    // FEATURE: 30 additional realistic spare parts (different from the first 10)
    const spareParts = [
      // Plumbing items
      {
        name: "PVC Pipe (2 inch)",
        pictureUrl: null,
        useCase: "Larger diameter water pipeline for high flow",
        price: 280,
        stockQty: 35,
        workType: "Plumbing",
      },
      {
        name: "Pipe Elbow Joint (1.5 inch)",
        pictureUrl: null,
        useCase: "90-degree corner connection for pipes",
        price: 85,
        stockQty: 45,
        workType: "Plumbing",
      },
      {
        name: "PVC T-Joint",
        pictureUrl: null,
        useCase: "Three-way pipe connection",
        price: 95,
        stockQty: 40,
        workType: "Plumbing",
      },
      {
        name: "Pipe Coupling (1 inch)",
        pictureUrl: null,
        useCase: "Connects two pipes of same diameter",
        price: 65,
        stockQty: 55,
        workType: "Plumbing",
      },
      {
        name: "Ball Valve (1 inch)",
        pictureUrl: null,
        useCase: "Water flow control valve",
        price: 320,
        stockQty: 20,
        workType: "Plumbing",
      },
      {
        name: "Check Valve",
        pictureUrl: null,
        useCase: "Prevents water backflow",
        price: 450,
        stockQty: 15,
        workType: "Plumbing",
      },
      {
        name: "Washers (Rubber, pack of 50)",
        pictureUrl: null,
        useCase: "Prevents leaks in tap connections",
        price: 120,
        stockQty: 30,
        workType: "Plumbing",
      },
      {
        name: "PTFE Tape (Teflon)",
        pictureUrl: null,
        useCase: "Seals pipe thread connections",
        price: 85,
        stockQty: 50,
        workType: "Plumbing",
      },
      {
        name: "Pipe Bending Spring",
        pictureUrl: null,
        useCase: "Prevents pipe collapse during bending",
        price: 110,
        stockQty: 25,
        workType: "Plumbing",
      },
      {
        name: "Drainage Pipe (2 inch)",
        pictureUrl: null,
        useCase: "Wastewater drainage system",
        price: 250,
        stockQty: 20,
        workType: "Plumbing",
      },
      // Electrical items
      {
        name: "Electrical Wire (2.5 sq mm, 100m)",
        pictureUrl: null,
        useCase: "Heavy duty wiring for high power appliances",
        price: 1200,
        stockQty: 10,
        workType: "Electrical",
      },
      {
        name: "Wire Connector (Box of 50)",
        pictureUrl: null,
        useCase: "Joins multiple wires safely",
        price: 180,
        stockQty: 35,
        workType: "Electrical",
      },
      {
        name: "MCB (Miniature Circuit Breaker) 16A",
        pictureUrl: null,
        useCase: "Single phase circuit protection",
        price: 320,
        stockQty: 18,
        workType: "Electrical",
      },
      {
        name: "ELCB (Earth Leakage Circuit Breaker)",
        pictureUrl: null,
        useCase: "Protects against electrical shocks",
        price: 890,
        stockQty: 8,
        workType: "Electrical",
      },
      {
        name: "Electrical Conduit Pipe (1 inch, 10m)",
        pictureUrl: null,
        useCase: "Protective tube for electrical wires",
        price: 420,
        stockQty: 15,
        workType: "Electrical",
      },
      {
        name: "Light Bulb (CFL 15W)",
        pictureUrl: null,
        useCase: "Energy-efficient home lighting",
        price: 220,
        stockQty: 40,
        workType: "Electrical",
      },
      {
        name: "Ceiling Fan Speed Controller",
        pictureUrl: null,
        useCase: "Variable speed control for fans",
        price: 380,
        stockQty: 12,
        workType: "Electrical",
      },
      {
        name: "Power Cord (3 meter)",
        pictureUrl: null,
        useCase: "Extension cord for appliances",
        price: 150,
        stockQty: 50,
        workType: "Electrical",
      },
      {
        name: "Plug & Socket (6A)",
        pictureUrl: null,
        useCase: "Portable power connection",
        price: 85,
        stockQty: 45,
        workType: "Electrical",
      },
      {
        name: "Electrical Distribution Box",
        pictureUrl: null,
        useCase: "Main electricity control panel",
        price: 2500,
        stockQty: 5,
        workType: "Electrical",
      },
      // Tools & Accessories
      {
        name: "Adjustable Wrench (10 inch)",
        pictureUrl: null,
        useCase: "Multi-purpose nut and bolt tool",
        price: 380,
        stockQty: 14,
        workType: "General",
      },
      {
        name: "Screwdriver Set (6 pieces)",
        pictureUrl: null,
        useCase: "Various screw head sizes",
        price: 220,
        stockQty: 22,
        workType: "General",
      },
      {
        name: "Pliers Set (3 types)",
        pictureUrl: null,
        useCase: "Gripping and cutting tool",
        price: 280,
        stockQty: 18,
        workType: "General",
      },
      {
        name: "Hammer (500g)",
        pictureUrl: null,
        useCase: "Nail driving and light demolition",
        price: 150,
        stockQty: 30,
        workType: "General",
      },
      {
        name: "Spirit Level (2 feet)",
        pictureUrl: null,
        useCase: "Check if surfaces are level or plumb",
        price: 280,
        stockQty: 12,
        workType: "General",
      },
      {
        name: "Tape Measure (5 meter)",
        pictureUrl: null,
        useCase: "Measuring distances",
        price: 120,
        stockQty: 35,
        workType: "General",
      },
      {
        name: "Bolts & Nuts Assortment",
        pictureUrl: null,
        useCase: "Various M6-M12 bolts and nuts",
        price: 350,
        stockQty: 10,
        workType: "General",
      },
      {
        name: "Electrical Insulation Tape",
        pictureUrl: null,
        useCase: "Insulates exposed wires",
        price: 45,
        stockQty: 60,
        workType: "Electrical",
      },
      {
        name: "Sandpaper (Mixed Grit Pack)",
        pictureUrl: null,
        useCase: "Surface smoothing and finishing",
        price: 180,
        stockQty: 25,
        workType: "General",
      },
      {
        name: "Safety Gloves (Pair)",
        pictureUrl: null,
        useCase: "Hand protection during work",
        price: 120,
        stockQty: 50,
        workType: "General",
      },
    ];

    let count = 0;
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
      count++;
      console.log(`✓ ${count}. Created: ${created.name} (৳${created.price}, Stock: ${created.stockQty})`);
    }

    console.log(`\n✅ Successfully added ${spareParts.length} more spare parts!`);
    console.log(`📦 Total spare parts in shop: ${count + 10}`);
  } catch (error) {
    console.error("❌ Error seeding items:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
