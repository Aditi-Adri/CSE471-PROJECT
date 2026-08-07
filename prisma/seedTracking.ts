/**
 * Seed script for the live GPS tracking + SOS feature.
 *
 * Creates the 4 demo technicians referenced by /worker/dashboard and
 * placed within the 3km SOS radius of the demo coordinates used by
 * SOSButton (Dhaka: 23.7808, 90.4194), so the SOS/tracking demo flow
 * actually finds and alerts them.
 *
 * Kept separate from `prisma/seed.ts` (which generates the ~95-worker
 * search/marketplace dataset for Module 1 Feature 2) since these are two
 * independent features seeding two independent sets of models
 * (WorkerLocation/Booking/SosRequest vs. Worker/User/ServiceCategory).
 *
 * Run with: npm run db:seed:tracking
 */
import "dotenv/config";
import { prisma } from "../lib/db";

const DEMO_WORKERS = [
  {
    workerId: "worker-faisal",
    name: "Faisal Ahmed",
    role: "Plumber",
    rating: 4.7,
    avatarInitials: "FA",
    lat: 23.79,
    lng: 90.415,
  },
  {
    workerId: "worker-nadia",
    name: "Nadia Sultana",
    role: "AC Technician",
    rating: 4.9,
    avatarInitials: "NS",
    lat: 23.77,
    lng: 90.425,
  },
  {
    workerId: "worker-imran",
    name: "Imran Hossain",
    role: "Electrician",
    rating: 4.6,
    avatarInitials: "IH",
    lat: 23.785,
    lng: 90.405,
  },
  {
    workerId: "worker-rahim",
    name: "Rahim Khan",
    role: "Electrician",
    rating: 4.8,
    avatarInitials: "RK",
    lat: 23.7808 - 0.015,
    lng: 90.4194 - 0.015,
  },
];

async function main() {
  for (const worker of DEMO_WORKERS) {
    await prisma.workerLocation.upsert({
      where: { workerId: worker.workerId },
      update: worker,
      create: {
        ...worker,
        isOnline: true,
        isVerified: true,
        isAvailable: true,
      },
    });
  }
  console.log(`Seeded ${DEMO_WORKERS.length} demo tracking workers.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });