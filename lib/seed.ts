import type { AppState, InventoryItem, MenuItem } from "./types";

const inventory: InventoryItem[] = [
  ["paneer", "Malai paneer", "g", 1700, 5000, 0.42],
  ["chicken", "Tandoori chicken", "g", 2600, 7000, 0.36],
  ["rice", "Aged basmati rice", "g", 5600, 9000, 0.08],
  ["cream", "Fresh cream", "ml", 1100, 3000, 0.13],
  ["tomato", "San Marzano tomato", "g", 1900, 6000, 0.09],
  ["spinach", "Baby spinach", "g", 420, 2500, 0.12],
  ["mushroom", "Wild mushroom", "g", 280, 2200, 0.25],
  ["naan", "Naan dough", "g", 3200, 5000, 0.05],
  ["prawn", "Tiger prawn", "g", 380, 2500, 0.72],
  ["lamb", "Slow-cooked lamb", "g", 950, 3500, 0.68],
  ["cauliflower", "Cauliflower", "g", 1300, 3000, 0.08],
  ["lentil", "Black lentil", "g", 1900, 4000, 0.07],
  ["yogurt", "Greek yogurt", "ml", 900, 2600, 0.12],
  ["mango", "Alphonso mango", "g", 220, 1800, 0.28],
  ["pistachio", "Pistachio", "g", 210, 900, 0.85],
  ["lime", "Kaffir lime", "unit", 23, 50, 0.3],
  ["mint", "Garden mint", "g", 290, 600, 0.1],
  ["chocolate", "Dark chocolate", "g", 680, 1200, 0.46],
].map(([id, name, unit, quantity, par, costPerUnit]) => ({
  id: String(id),
  name: String(name),
  unit: String(unit),
  quantity: Number(quantity),
  par: Number(par),
  costPerUnit: Number(costPerUnit),
}));

const img = (id: string) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=900&q=82`;

const menu: MenuItem[] = [
  {
    id: "m1", name: "Ember Paneer Tikka", category: "Small plates",
    description: "Charred malai paneer, smoked pepper emulsion, pickled shallot.",
    price: 49500, basePrepMinutes: 14, complexity: 2, dietary: ["vegetarian"],
    allergens: ["dairy"], spice: "medium", calories: 410, image: img("photo-1601050690597-df0568f70950"),
    featured: true, recipe: [{ ingredientId: "paneer", quantity: 180 }, { ingredientId: "yogurt", quantity: 35 }],
  },
  {
    id: "m2", name: "Circuit Butter Chicken", category: "Signatures",
    description: "Coal-roasted chicken, bright tomato makhani, cultured butter.",
    price: 67500, basePrepMinutes: 19, complexity: 2, dietary: ["non-vegetarian"],
    allergens: ["dairy"], spice: "mild", calories: 690, image: img("photo-1603894584373-5ac82b2ae398"),
    featured: true, recipe: [{ ingredientId: "chicken", quantity: 220 }, { ingredientId: "tomato", quantity: 150 }, { ingredientId: "cream", quantity: 60 }],
  },
  {
    id: "m3", name: "Truffle Wild Mushroom Khichdi", category: "Signatures",
    description: "Aged basmati, wild mushroom, parmesan air, black truffle.",
    price: 62500, basePrepMinutes: 22, complexity: 3, dietary: ["vegetarian"],
    allergens: ["dairy"], spice: "mild", calories: 540, image: img("photo-1515003197210-e0cd71810b5f"),
    recipe: [{ ingredientId: "mushroom", quantity: 95 }, { ingredientId: "rice", quantity: 130 }, { ingredientId: "cream", quantity: 25 }],
  },
  {
    id: "m4", name: "Coastal Prawn Moilee", category: "Signatures",
    description: "Tiger prawns, coconut moilee, kaffir lime, heirloom tomato.",
    price: 79500, basePrepMinutes: 21, complexity: 3, dietary: ["non-vegetarian"],
    allergens: ["shellfish"], spice: "medium", calories: 510, image: img("photo-1567337710282-00832b415979"),
    featured: true, recipe: [{ ingredientId: "prawn", quantity: 180 }, { ingredientId: "lime", quantity: 1 }, { ingredientId: "tomato", quantity: 80 }],
  },
  {
    id: "m5", name: "Rogan Josh Pot Pie", category: "Signatures",
    description: "Slow-cooked Kashmiri lamb beneath a flaky saffron pastry.",
    price: 74500, basePrepMinutes: 26, complexity: 3, dietary: ["non-vegetarian"],
    allergens: ["gluten", "dairy"], spice: "hot", calories: 760, image: img("photo-1547592180-85f173990554"),
    recipe: [{ ingredientId: "lamb", quantity: 220 }, { ingredientId: "tomato", quantity: 80 }, { ingredientId: "yogurt", quantity: 30 }],
  },
  {
    id: "m6", name: "Kasundi Cauliflower", category: "Small plates",
    description: "Mustard-glazed cauliflower, peanut thecha, curry leaf.",
    price: 42500, basePrepMinutes: 16, complexity: 2, dietary: ["vegan", "vegetarian"],
    allergens: ["peanut", "mustard"], spice: "hot", calories: 320, image: img("photo-1565557623262-b51c2513a641"),
    recipe: [{ ingredientId: "cauliflower", quantity: 230 }, { ingredientId: "lime", quantity: 1 }],
  },
  {
    id: "m7", name: "Dal Makhani 18H", category: "Signatures",
    description: "Black lentils simmered overnight, brown butter, ginger lace.",
    price: 49500, basePrepMinutes: 12, complexity: 1, dietary: ["vegetarian"],
    allergens: ["dairy"], spice: "mild", calories: 480, image: img("photo-1626509653291-18d9a934245b"),
    recipe: [{ ingredientId: "lentil", quantity: 160 }, { ingredientId: "cream", quantity: 45 }, { ingredientId: "tomato", quantity: 60 }],
  },
  {
    id: "m8", name: "Spinach Roomali", category: "Breads",
    description: "Feather-light roomali roti with spinach and nigella.",
    price: 17500, basePrepMinutes: 8, complexity: 1, dietary: ["vegan", "vegetarian"],
    allergens: ["gluten"], spice: "mild", calories: 180, image: img("photo-1619895092538-128341789043"),
    recipe: [{ ingredientId: "spinach", quantity: 55 }, { ingredientId: "naan", quantity: 110 }],
  },
  {
    id: "m9", name: "Garlic Naan", category: "Breads",
    description: "Tandoor-baked naan, roasted garlic, cultured butter.",
    price: 19500, basePrepMinutes: 7, complexity: 1, dietary: ["vegetarian"],
    allergens: ["gluten", "dairy"], spice: "mild", calories: 260, image: img("photo-1626074353765-517a681e40be"),
    recipe: [{ ingredientId: "naan", quantity: 140 }, { ingredientId: "cream", quantity: 8 }],
  },
  {
    id: "m10", name: "Saffron Pea Pulao", category: "Rice",
    description: "Aged basmati, spring peas, saffron steam, crispy shallot.",
    price: 31500, basePrepMinutes: 11, complexity: 1, dietary: ["vegan", "vegetarian"],
    allergens: [], spice: "mild", calories: 390, image: img("photo-1596797038530-2c107229654b"),
    recipe: [{ ingredientId: "rice", quantity: 190 }, { ingredientId: "mint", quantity: 8 }],
  },
  {
    id: "m11", name: "Mango Chili Kulfi", category: "Desserts",
    description: "Alphonso mango kulfi, chili salt, pistachio praline.",
    price: 34500, basePrepMinutes: 6, complexity: 1, dietary: ["vegetarian"],
    allergens: ["dairy", "nuts"], spice: "medium", calories: 360, image: img("photo-1488900128323-21503983a07e"),
    recipe: [{ ingredientId: "mango", quantity: 110 }, { ingredientId: "pistachio", quantity: 18 }, { ingredientId: "cream", quantity: 70 }],
  },
  {
    id: "m12", name: "Dark Chocolate Chai", category: "Desserts",
    description: "Valrhona chocolate, masala chai cremeux, cocoa nib.",
    price: 39500, basePrepMinutes: 9, complexity: 2, dietary: ["vegetarian"],
    allergens: ["dairy"], spice: "mild", calories: 440, image: img("photo-1578985545062-69928b1d9587"),
    recipe: [{ ingredientId: "chocolate", quantity: 90 }, { ingredientId: "cream", quantity: 55 }],
  },
  {
    id: "m13", name: "Kokum Fizz", category: "Drinks",
    description: "Kokum cordial, lime, basil seed, sparkling water.",
    price: 24500, basePrepMinutes: 4, complexity: 1, dietary: ["vegan", "vegetarian"],
    allergens: [], spice: "mild", calories: 120, image: img("photo-1544145945-f90425340c7e"),
    recipe: [{ ingredientId: "lime", quantity: 1 }, { ingredientId: "mint", quantity: 8 }],
  },
  {
    id: "m14", name: "Tandoori Chicken Caesar", category: "Small plates",
    description: "Tandoori chicken, baby gem, naan crumb, pepper dressing.",
    price: 54500, basePrepMinutes: 15, complexity: 2, dietary: ["non-vegetarian"],
    allergens: ["gluten", "dairy"], spice: "medium", calories: 470, image: img("photo-1540189549336-e6e99c3679fe"),
    recipe: [{ ingredientId: "chicken", quantity: 160 }, { ingredientId: "naan", quantity: 35 }, { ingredientId: "yogurt", quantity: 25 }],
  },
  {
    id: "m15", name: "Malabar Lamb Slider", category: "Small plates",
    description: "Pepper lamb, milk bun, coconut slaw, smoked chili.",
    price: 57500, basePrepMinutes: 17, complexity: 2, dietary: ["non-vegetarian"],
    allergens: ["gluten", "dairy"], spice: "hot", calories: 520, image: img("photo-1568901346375-23c9450c58cd"),
    recipe: [{ ingredientId: "lamb", quantity: 140 }, { ingredientId: "yogurt", quantity: 20 }, { ingredientId: "lime", quantity: 1 }],
  },
  {
    id: "m16", name: "Palak Patta Chaat", category: "Small plates",
    description: "Crisp spinach, yogurt snow, tamarind, pomegranate.",
    price: 39500, basePrepMinutes: 10, complexity: 2, dietary: ["vegetarian"],
    allergens: ["dairy"], spice: "medium", calories: 280, image: img("photo-1601050690117-94f5f6fa8bd7"),
    recipe: [{ ingredientId: "spinach", quantity: 140 }, { ingredientId: "yogurt", quantity: 65 }],
  },
  {
    id: "m17", name: "Pistachio Lassi", category: "Drinks",
    description: "Whipped yogurt, pistachio, cardamom, saffron.",
    price: 27500, basePrepMinutes: 5, complexity: 1, dietary: ["vegetarian"],
    allergens: ["dairy", "nuts"], spice: "mild", calories: 260, image: img("photo-1572490122747-3968b75cc699"),
    recipe: [{ ingredientId: "yogurt", quantity: 220 }, { ingredientId: "pistachio", quantity: 22 }],
  },
  {
    id: "m18", name: "Zero-Proof Garden Gimlet", category: "Drinks",
    description: "Garden mint, lime leaf, cucumber, tonic.",
    price: 29500, basePrepMinutes: 5, complexity: 1, dietary: ["vegan", "vegetarian"],
    allergens: [], spice: "mild", calories: 90, image: img("photo-1551024709-8f23befc6f87"),
    recipe: [{ ingredientId: "mint", quantity: 18 }, { ingredientId: "lime", quantity: 2 }],
  },
];

const now = Date.now();
const ago = (minutes: number) => new Date(now - minutes * 60_000).toISOString();

export const seedState: AppState = {
  restaurant: {
    id: "rest-saffron-circuit",
    name: "Saffron Circuit",
    tagline: "Indian dining, intelligently orchestrated.",
    location: "Bengaluru · Indiranagar",
    serviceChargePercent: 5,
    taxPercent: 5,
  },
  inventory,
  menu,
  orders: [
    {
      id: "order-104", number: "SC-104", table: "T08", guest: "Ananya",
      status: "preparing", items: [{ menuItemId: "m2", name: "Circuit Butter Chicken", quantity: 1, unitPrice: 67500 }, { menuItemId: "m9", name: "Garlic Naan", quantity: 2, unitPrice: 19500 }],
      notes: "One naan without butter", allergens: ["dairy", "gluten"], createdAt: ago(24), updatedAt: ago(8), estimateMinutes: 26, total: 117075, paid: false,
    },
    {
      id: "order-105", number: "SC-105", table: "T03", guest: "Rohan",
      status: "confirmed", items: [{ menuItemId: "m4", name: "Coastal Prawn Moilee", quantity: 2, unitPrice: 79500 }],
      notes: "Shellfish allergy at adjacent seat — sanitize station", allergens: ["shellfish"], createdAt: ago(11), updatedAt: ago(11), estimateMinutes: 28, total: 175140, paid: false,
    },
    {
      id: "order-102", number: "SC-102", table: "T12", guest: "Mira",
      status: "ready", items: [{ menuItemId: "m7", name: "Dal Makhani 18H", quantity: 1, unitPrice: 49500 }, { menuItemId: "m10", name: "Saffron Pea Pulao", quantity: 1, unitPrice: 31500 }],
      notes: "", allergens: ["dairy"], createdAt: ago(39), updatedAt: ago(3), estimateMinutes: 20, total: 89100, paid: false,
    },
  ],
  tables: Array.from({ length: 16 }, (_, index) => {
    const id = index + 1;
    const statuses = ["available", "occupied", "reserved", "occupied", "available", "cleaning"] as const;
    const status = statuses[index % statuses.length];
    return {
      id: `table-${id}`,
      code: `T${String(id).padStart(2, "0")}`,
      seats: [2, 4, 4, 6, 2, 8][index % 6],
      status,
      occupiedMinutes: status === "occupied" ? 24 + index * 3 : undefined,
    };
  }),
  queue: [
    { id: "q1", name: "Mehta party", partySize: 4, status: "waiting", joinedAt: ago(19), estimateMinutes: 16 },
    { id: "q2", name: "Ishaan", partySize: 2, status: "waiting", joinedAt: ago(8), estimateMinutes: 24 },
  ],
  reservations: [
    { id: "r1", name: "Kavya Rao", phone: "•••• 4821", partySize: 4, date: new Date().toISOString().slice(0, 10), time: "20:00", status: "confirmed" },
    { id: "r2", name: "Dev Malhotra", phone: "•••• 1270", partySize: 6, date: new Date().toISOString().slice(0, 10), time: "20:30", status: "confirmed" },
  ],
  serviceRequests: [
    { id: "s1", table: "T06", type: "assistance", status: "open", createdAt: ago(4) },
    { id: "s2", table: "T14", type: "bill", status: "open", createdAt: ago(7) },
  ],
  movements: [],
  revenueHistory: [
    { day: "Mon", revenue: 1842000, orders: 43 },
    { day: "Tue", revenue: 2058000, orders: 48 },
    { day: "Wed", revenue: 1964000, orders: 45 },
    { day: "Thu", revenue: 2328000, orders: 52 },
    { day: "Fri", revenue: 3184000, orders: 68 },
    { day: "Sat", revenue: 4026000, orders: 84 },
    { day: "Sun", revenue: 3568000, orders: 76 },
  ],
  hourlyDemand: [
    { hour: "6 pm", actual: 8, forecast: 9 }, { hour: "7 pm", actual: 14, forecast: 15 },
    { hour: "8 pm", actual: 21, forecast: 23 }, { hour: "9 pm", actual: 18, forecast: 20 },
    { hour: "10 pm", actual: 11, forecast: 12 },
  ],
  feedback: [
    { rating: 5, comment: "The live wait estimate was remarkably accurate.", author: "Nikita" },
    { rating: 4, comment: "Beautiful food and very attentive service.", author: "Arjun" },
    { rating: 5, comment: "Dietary filters made ordering effortless.", author: "Leena" },
  ],
  updatedAt: new Date().toISOString(),
};
