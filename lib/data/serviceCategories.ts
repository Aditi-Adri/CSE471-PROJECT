/**
 * Single source of truth for the platform's service categories.
 *
 * Used by:
 *  - prisma/seed.ts        (inserts these rows into ServiceCategory)
 *  - lib/ai/keywordEngine.test.ts (verifies the spec's example phrases
 *    — "water tap is leaking in kitchen", "AC is making noise" — map to
 *    the right category)
 *
 * `keywords` is what the free fallback classifier in
 * lib/ai/keywordEngine.ts scores incoming search text against.
 */
export const SERVICE_CATEGORIES = [
  {
    name: "Plumbing",
    slug: "plumbing",
    icon: "🔧",
    description: "Leaks, pipes, drains, taps, toilets and water lines.",
    keywords: [
      "leak", "leaking", "tap", "water tap", "pipe", "pipeline", "drain",
      "drainage", "faucet", "toilet", "commode", "flush", "basin",
      "wash basin", "bathroom", "geyser", "valve", "shower", "water line",
      "water motor", "pani", "pani porche", "clog", "clogged", "overflow",
      "line fitting", "plumber", "sink", "kitchen sink",
    ],
  },
  {
    name: "Electrical",
    slug: "electrical",
    icon: "⚡",
    description: "Wiring, switches, sockets, fuses and general electrical faults.",
    keywords: [
      "electric", "electrical", "current", "wiring", "wire", "switch",
      "socket", "plug", "short circuit", "mcb", "fuse", "circuit breaker",
      "bidyut", "light not working", "fan not working", "voltage", "spark",
      "electrician", "meter", "earthing", "bulb",
    ],
  },
  {
    name: "AC & Refrigeration Repair",
    slug: "ac-refrigeration-repair",
    icon: "❄️",
    description: "AC servicing, gas refill, and fridge/freezer repair.",
    keywords: [
      "ac", "a/c", "air conditioner", "air conditioning", "split ac",
      "window ac", "cooling", "not cooling", "gas refill", "compressor",
      "noise", "making noise", "fridge", "refrigerator", "freezer",
      "deep freezer", "ac service", "ac repair", "ac gas",
    ],
  },
  {
    name: "Carpentry & Furniture",
    slug: "carpentry-furniture",
    icon: "🪚",
    description: "Custom furniture, repairs, and wood fittings.",
    keywords: [
      "carpenter", "carpentry", "furniture", "wood", "wooden",
      "door", "window frame", "cabinet", "almirah", "wardrobe", "bed",
      "table", "chair", "shelf", "hinge", "lock fitting",
      "furniture repair",
    ],
  },
  {
    name: "Painting",
    slug: "painting",
    icon: "🎨",
    description: "Interior and exterior wall painting.",
    keywords: [
      "paint", "painting", "painter", "wall paint", "distemper",
      "whitewash", "color", "colour", "putty", "wall crack",
      "ceiling paint", "exterior paint",
    ],
  },
  {
    name: "Appliance Repair",
    slug: "appliance-repair",
    icon: "🔌",
    description: "Washing machines, microwaves, TVs and small appliances.",
    keywords: [
      "washing machine", "microwave", "oven", "tv repair", "television",
      "mixer grinder", "blender", "appliance", "not working", "iron",
      "rice cooker", "induction cooker",
    ],
  },
  {
    name: "Home Cleaning",
    slug: "home-cleaning",
    icon: "🧹",
    description: "Deep cleaning for homes, kitchens and bathrooms.",
    keywords: [
      "cleaning", "clean", "house cleaning", "deep clean", "sofa cleaning",
      "carpet cleaning", "bathroom cleaning", "kitchen cleaning", "maid",
      "cleaner", "dusting", "mopping",
    ],
  },
  {
    name: "Pest Control",
    slug: "pest-control",
    icon: "🐜",
    description: "Cockroach, termite, rodent and mosquito control.",
    keywords: [
      "pest", "cockroach", "tikri", "insect", "mosquito", "rat", "rodent",
      "termite", "uporka", "spray", "fumigation", "ant", "bed bug",
      "moshari",
    ],
  },
  {
    name: "CCTV & Security Installation",
    slug: "cctv-security",
    icon: "📹",
    description: "CCTV, smart locks, alarms and intercom setup.",
    keywords: [
      "cctv", "camera", "security camera", "ip camera", "dvr", "nvr",
      "door lock", "smart lock", "alarm", "intercom", "surveillance",
    ],
  },
  {
    name: "Gardening & Landscaping",
    slug: "gardening-landscaping",
    icon: "🌿",
    description: "Lawn care, rooftop gardens and tree trimming.",
    keywords: [
      "garden", "gardening", "lawn", "plant", "tree cutting",
      "landscaping", "rooftop garden", "gach", "mali",
    ],
  },
  {
    name: "Masonry & Tiling",
    slug: "masonry-tiling",
    icon: "🧱",
    description: "Tiling, plastering, brickwork and floor repair.",
    keywords: [
      "tiles", "tiling", "mistri", "brick", "cement", "plaster",
      "floor tiles", "bathroom tiles", "wall crack", "concrete",
      "rajmistri",
    ],
  },
  {
    name: "Interior Decoration",
    slug: "interior-decoration",
    icon: "🛋️",
    description: "False ceilings, wallpaper, curtains and renovation.",
    keywords: [
      "interior", "decoration", "false ceiling", "curtain", "wallpaper",
      "renovation", "designer", "home decor",
    ],
  },
  {
    name: "Generator & IPS Repair",
    slug: "generator-ips-repair",
    icon: "🔋",
    description: "Backup power: generators, IPS and inverter batteries.",
    keywords: [
      "generator", "ips", "battery backup", "load shedding",
      "current gese na", "inverter", "ups",
    ],
  },
  {
    name: "Water Filter & RO Repair",
    slug: "water-filter-ro-repair",
    icon: "🚰",
    description: "RO/water purifier installation and filter changes.",
    keywords: [
      "water filter", "ro", "ro filter", "filter change", "water purifier",
      "filter cartridge",
    ],
  },
  {
    name: "Locksmith",
    slug: "locksmith",
    icon: "🔑",
    description: "Lock repair, key duplication and door hardware.",
    keywords: [
      "lock", "key", "locksmith", "door lock repair", "key duplicate",
      "chabi", "tala",
    ],
  },
  {
    name: "Gas Line & Stove Repair",
    slug: "gas-line-stove-repair",
    icon: "🔥",
    description: "Gas line safety checks, stove and burner repair.",
    keywords: [
      "gas", "gas line", "stove", "gas stove", "burner", "gas leak",
      "chulha", "cylinder", "lpg",
    ],
  },
] as const;
