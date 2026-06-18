import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import * as dotenv from "dotenv";

dotenv.config();

const prisma = new PrismaClient();

function img(id: string) {
  return `https://images.unsplash.com/photo-${id}?w=1200&h=900&fit=crop&auto=format&q=80`;
}

const CATEGORY_NAMES = [
  "Electronics",
  "Home & Kitchen",
  "Fashion",
  "Sports & Outdoors",
  "Beauty",
  "Books & Media",
  "Toys & Games",
  "Garden & Tools",
  "Office",
  "Groceries & Pantry",
] as const;

type CatName = (typeof CATEGORY_NAMES)[number];

type ProductSeed = {
  name: string;
  description: string;
  brand: string;
  category: CatName;
  price: number;
  discount?: number;
  unit: string;
  image: string;
  images: string[];
  rating: number;
  stock: number;
  variants?: Array<{ name: string; priceModifier: number; stock: number }>;
};

// ─────────────────────────────────────────────────────────────────────────────
// PRODUCTS  (8–10 per category, 5 images each)
// ─────────────────────────────────────────────────────────────────────────────
const PRODUCTS: ProductSeed[] = [

  // ── ELECTRONICS ──────────────────────────────────────────────────────────
  {
    name: "Sony WH-1000XM5 Wireless Noise-Cancelling Headphones",
    description: "Industry-leading noise cancellation powered by two processors and eight microphones. Crystal-clear hands-free calling, 30-hour battery life, and ultra-comfortable lightweight design with soft earpads. Multipoint connection lets you pair with two Bluetooth devices simultaneously.",
    brand: "Sony", category: "Electronics",
    price: 349.99, discount: 15, unit: "each", rating: 4.8, stock: 45,
    image: img("1505740420928-5e560c06d30e"),
    images: [
      img("1505740420928-5e560c06d30e"),
      img("1484704849700-f032d85b5d83"),
      img("1546435578-e62e24c8ccbf"),
      img("1583863788434-1b8b1a27b16b"),
      img("1558618666-fcd25c85cd64"),
    ],
    variants: [
      { name: "Midnight Black", priceModifier: 0, stock: 25 },
      { name: "Platinum Silver", priceModifier: 0, stock: 20 },
    ],
  },
  {
    name: "Apple AirPods Pro (2nd Generation)",
    description: "Active Noise Cancellation up to 2× more powerful than previous generation. Transparency mode, Adaptive Audio, and Personalized Spatial Audio with dynamic head tracking. Up to 30 hours total listening time with MagSafe Charging Case.",
    brand: "Apple", category: "Electronics",
    price: 249.99, unit: "each", rating: 4.7, stock: 82,
    image: img("1600294037681-c80b4cb5b434"),
    images: [
      img("1600294037681-c80b4cb5b434"),
      img("1590658268037-6bf12165cd8e"),
      img("1609921213416-c8f1c3ebad80"),
      img("1505740420928-5e560c06d30e"),
      img("1583863788434-1b8b1a27b16b"),
    ],
  },
  {
    name: "Apple Watch Series 9 GPS 45mm",
    description: "The most powerful Apple Watch yet with S9 SiP chip for double-tap gesture, on-device Siri with health data access, and a brighter always-on Retina display. Advanced health sensors including blood oxygen and ECG. Up to 18 hours battery life. Carbon neutral.",
    brand: "Apple", category: "Electronics",
    price: 429.99, discount: 10, unit: "each", rating: 4.8, stock: 28,
    image: img("1523275335684-37898b6baf30"),
    images: [
      img("1523275335684-37898b6baf30"),
      img("1434494206212-716b93f7a9b9"),
      img("1593642632559-0c6d3fc62b89"),
      img("1527864550417-7519ae9c05c5"),
      img("1583863788434-1b8b1a27b16b"),
    ],
    variants: [
      { name: "Midnight Aluminium", priceModifier: 0, stock: 15 },
      { name: "Starlight Aluminium", priceModifier: 0, stock: 8 },
      { name: "Silver Stainless Steel", priceModifier: 200, stock: 5 },
    ],
  },
  {
    name: "Keychron K8 Pro Wireless Mechanical Keyboard",
    description: "Hot-swappable TKL layout with Bluetooth 5.1 and USB-C wired mode. RGB backlight, Gateron G Pro switches, and aluminium frame. Compatible with Mac and Windows out of the box. QMK/VIA supported for complete key remapping.",
    brand: "Keychron", category: "Electronics",
    price: 109.99, unit: "each", rating: 4.6, stock: 67,
    image: img("1587829741301-dc798b83add3"),
    images: [
      img("1587829741301-dc798b83add3"),
      img("1595044426077-d36d9236d54a"),
      img("1527864550417-7519ae9c05c5"),
      img("1593642632559-0c6d3fc62b89"),
      img("1558618666-fcd25c85cd64"),
    ],
    variants: [
      { name: "Red Switch (Linear)", priceModifier: 0, stock: 25 },
      { name: "Brown Switch (Tactile)", priceModifier: 0, stock: 25 },
      { name: "Blue Switch (Clicky)", priceModifier: 0, stock: 17 },
    ],
  },
  {
    name: "Logitech MX Master 3S Wireless Mouse",
    description: "8000 DPI optical sensor, near-silent MagSpeed electromagnetic scroll wheel with 1000-line-per-second precision, and ergonomic contoured design for all-day comfort. Works on any surface including glass. USB-C fast charging — 1 minute of charge gives 3 hours of use.",
    brand: "Logitech", category: "Electronics",
    price: 99.99, unit: "each", rating: 4.7, stock: 94,
    image: img("1527864550417-7519ae9c05c5"),
    images: [
      img("1527864550417-7519ae9c05c5"),
      img("1563770660941-10b7a86236e9"),
      img("1587829741301-dc798b83add3"),
      img("1593642632559-0c6d3fc62b89"),
      img("1595044426077-d36d9236d54a"),
    ],
    variants: [
      { name: "Graphite", priceModifier: 0, stock: 50 },
      { name: "Pale Grey", priceModifier: 0, stock: 44 },
    ],
  },
  {
    name: "JBL Charge 5 Portable Bluetooth Speaker",
    description: "JBL Pro Sound with bold highs and powerful bass. IP67 waterproof and dustproof, 20 hours of playtime, and a built-in 7500mAh power bank to charge your devices. PartyBoost lets you link multiple JBL speakers for a bigger sound.",
    brand: "JBL", category: "Electronics",
    price: 179.99, unit: "each", rating: 4.6, stock: 61,
    image: img("1608043152269-423dbba4e7e1"),
    images: [
      img("1608043152269-423dbba4e7e1"),
      img("1583384383840-e5e2e9b08b50"),
      img("1484704849700-f032d85b5d83"),
      img("1546435578-e62e24c8ccbf"),
      img("1558618666-fcd25c85cd64"),
    ],
    variants: [
      { name: "Black", priceModifier: 0, stock: 20 },
      { name: "Blue", priceModifier: 0, stock: 20 },
      { name: "Red", priceModifier: 0, stock: 21 },
    ],
  },
  {
    name: "Apple iPad (10th Generation) 64GB Wi-Fi",
    description: "10.9-inch Liquid Retina display with True Tone. A14 Bionic chip for pro-level performance. USB-C connectivity, landscape front camera built for video calls, and the Magic Keyboard Folio. All-day battery life up to 10 hours.",
    brand: "Apple", category: "Electronics",
    price: 449.99, unit: "each", rating: 4.6, stock: 39,
    image: img("1544244015-0df4cec9d97d"),
    images: [
      img("1544244015-0df4cec9d97d"),
      img("1609921213416-c8f1c3ebad80"),
      img("1593642632559-0c6d3fc62b89"),
      img("1587829741301-dc798b83add3"),
      img("1527864550417-7519ae9c05c5"),
    ],
    variants: [
      { name: "64GB Silver", priceModifier: 0, stock: 15 },
      { name: "64GB Blue", priceModifier: 0, stock: 12 },
      { name: "256GB Silver", priceModifier: 150, stock: 12 },
    ],
  },
  {
    name: "Samsung T7 Portable SSD 2TB",
    description: "Blazing-fast 1,050 MB/s read and 1,000 MB/s write speeds via USB 3.2 Gen 2. AES 256-bit hardware encryption, shock-resistant solid metal body, and optional password protection. Includes USB-C and USB-A cables. Works with PC, Mac, Android, and gaming consoles.",
    brand: "Samsung", category: "Electronics",
    price: 139.99, discount: 12, unit: "each", rating: 4.7, stock: 73,
    image: img("1558618666-fcd25c85cd64"),
    images: [
      img("1558618666-fcd25c85cd64"),
      img("1583863788434-1b8b1a27b16b"),
      img("1527864550417-7519ae9c05c5"),
      img("1595044426077-d36d9236d54a"),
      img("1593642632559-0c6d3fc62b89"),
    ],
    variants: [
      { name: "1TB Indigo Blue", priceModifier: -30, stock: 30 },
      { name: "2TB Indigo Blue", priceModifier: 0, stock: 25 },
      { name: "2TB Beige", priceModifier: 0, stock: 18 },
    ],
  },
  {
    name: "LG 27UP850N 27\" 4K IPS USB-C Monitor",
    description: "IPS panel with 3840×2160 resolution, 99% sRGB, and HDR400 certification for stunning colour accuracy. 96W USB-C power delivery means one cable for video, data, and laptop charging. Height, tilt, and pivot adjustable stand.",
    brand: "LG", category: "Electronics",
    price: 449.99, discount: 12, unit: "each", rating: 4.6, stock: 14,
    image: img("1547826039-a468e6ebdd7f"),
    images: [
      img("1547826039-a468e6ebdd7f"),
      img("1593642632559-0c6d3fc62b89"),
      img("1587829741301-dc798b83add3"),
      img("1527864550417-7519ae9c05c5"),
      img("1595044426077-d36d9236d54a"),
    ],
  },
  {
    name: "Anker 140W USB-C Compact Charger",
    description: "GaN II technology packs 140W into a single compact adapter. Charges a MacBook Pro, iPad, and iPhone simultaneously via three ports (2× USB-C, 1× USB-A). PowerIQ 4.0 intelligently distributes power. Foldable flat plug for portability.",
    brand: "Anker", category: "Electronics",
    price: 55.99, unit: "each", rating: 4.5, stock: 135,
    image: img("1583863788434-1b8b1a27b16b"),
    images: [
      img("1583863788434-1b8b1a27b16b"),
      img("1558618666-fcd25c85cd64"),
      img("1600294037681-c80b4cb5b434"),
      img("1590658268037-6bf12165cd8e"),
      img("1527864550417-7519ae9c05c5"),
    ],
  },

  // ── HOME & KITCHEN ────────────────────────────────────────────────────────
  {
    name: "Nespresso Vertuo Pop Coffee & Espresso Machine",
    description: "Centrifusion™ technology reads each pod's barcode to perfectly brew five cup sizes — espresso to full mug — at the touch of a button. 30-second heat-up time, automatic capsule ejection, and a compact 27cm footprint. Includes 7 complimentary capsules.",
    brand: "Nespresso", category: "Home & Kitchen",
    price: 119.99, discount: 12, unit: "each", rating: 4.6, stock: 42,
    image: img("1495474472359-6e7d7b10ff44"),
    images: [
      img("1495474472359-6e7d7b10ff44"),
      img("1512568400610-350c7aae26af"),
      img("1447933601403-0c6688de566e"),
      img("1556909172-54557c7e4fb7"),
      img("1584797810879-0c53e7e6ff31"),
    ],
    variants: [
      { name: "Coconut White", priceModifier: 0, stock: 15 },
      { name: "Mango Yellow", priceModifier: 0, stock: 14 },
      { name: "Midnight Black", priceModifier: 0, stock: 13 },
    ],
  },
  {
    name: "KitchenAid Artisan Series 5-Qt Stand Mixer",
    description: "Iconic tilt-head design with 67-point planetary mixing action reaches every part of the bowl. 325-watt motor and 10-speed motor with soft-start feature. Includes flat beater, dough hook, and 6-wire whip. Hub for 15+ optional attachments from pasta to ice cream.",
    brand: "KitchenAid", category: "Home & Kitchen",
    price: 449.99, discount: 20, unit: "each", rating: 4.9, stock: 18,
    image: img("1594736797933-d0501ba2fe65"),
    images: [
      img("1594736797933-d0501ba2fe65"),
      img("1556909114-f6e7ad7d3136"),
      img("1614707050748-f8eb78dbd78b"),
      img("1585937421612-70a008356fbe"),
      img("1547496502-affa22d38842"),
    ],
    variants: [
      { name: "Empire Red", priceModifier: 0, stock: 6 },
      { name: "Onyx Black", priceModifier: 0, stock: 6 },
      { name: "Ice Blue", priceModifier: 0, stock: 3 },
      { name: "Pistachio", priceModifier: 0, stock: 3 },
    ],
  },
  {
    name: "Instant Pot Duo 7-in-1 Electric Pressure Cooker 6Qt",
    description: "Replaces 7 kitchen appliances: pressure cooker, slow cooker, rice cooker, steamer, sauté pan, yogurt maker, and food warmer. Cooks up to 70% faster than traditional methods. 13 one-touch programs. Stainless steel inner pot with steam rack and measuring cup included.",
    brand: "Instant Pot", category: "Home & Kitchen",
    price: 89.99, unit: "each", rating: 4.7, stock: 76,
    image: img("1556909172-54557c7e4fb7"),
    images: [
      img("1556909172-54557c7e4fb7"),
      img("1556909114-f6e7ad7d3136"),
      img("1594736797933-d0501ba2fe65"),
      img("1585937421612-70a008356fbe"),
      img("1610348725531-843dff563e2c"),
    ],
  },
  {
    name: "Ninja Air Fryer Pro XL 5.5Qt",
    description: "6-in-1 air fry, roast, reheat, dehydrate, bake, and broil with up to 75% less fat than traditional deep frying. XL 5.5-quart ceramic-coated basket fits a 4-lb chicken. 400°F max temp and 4-quart cook/crisp basket. Dishwasher-safe parts.",
    brand: "Ninja", category: "Home & Kitchen",
    price: 129.99, discount: 15, unit: "each", rating: 4.6, stock: 55,
    image: img("1556909114-f6e7ad7d3136"),
    images: [
      img("1556909114-f6e7ad7d3136"),
      img("1556909172-54557c7e4fb7"),
      img("1594736797933-d0501ba2fe65"),
      img("1585937421612-70a008356fbe"),
      img("1547496502-affa22d38842"),
    ],
  },
  {
    name: "Lodge 12-Inch Cast Iron Skillet",
    description: "Pre-seasoned with 100% natural vegetable oil — no synthetic coatings. Compatible with all cooking surfaces including induction, gas, electric, oven, and campfire. Unparalleled heat retention for searing steaks and baking cornbread. Builds a natural non-stick patina over time. Made in the USA since 1896.",
    brand: "Lodge", category: "Home & Kitchen",
    price: 44.99, unit: "each", rating: 4.8, stock: 112,
    image: img("1585937421612-70a008356fbe"),
    images: [
      img("1585937421612-70a008356fbe"),
      img("1556910103-1c02745b0e09"),
      img("1556909172-54557c7e4fb7"),
      img("1547496502-affa22d38842"),
      img("1610348725531-843dff563e2c"),
    ],
  },
  {
    name: "Vitamix E310 Explorian Blender",
    description: "Professional-grade 2.0 HP motor with hardened stainless-steel blades that can pulverise ice, whole fruits, and leafy greens in seconds. 48-oz low-profile container, 10 variable speeds, and pulse feature. Self-cleaning in under 60 seconds. Variable 7-year warranty.",
    brand: "Vitamix", category: "Home & Kitchen",
    price: 349.99, unit: "each", rating: 4.8, stock: 29,
    image: img("1614707050748-f8eb78dbd78b"),
    images: [
      img("1614707050748-f8eb78dbd78b"),
      img("1584797810879-0c53e7e6ff31"),
      img("1495474472359-6e7d7b10ff44"),
      img("1512568400610-350c7aae26af"),
      img("1547496502-affa22d38842"),
    ],
    variants: [
      { name: "Black", priceModifier: 0, stock: 15 },
      { name: "Red", priceModifier: 0, stock: 14 },
    ],
  },
  {
    name: "Hydro Flask 32oz Wide Mouth Water Bottle",
    description: "TempShield™ double-wall vacuum insulation keeps drinks cold up to 24 hours and hot up to 12 hours. 18/8 pro-grade stainless steel, BPA-free, and phthalate-free. Flex Cap with carry loop. Wide mouth fits ice cubes and is compatible with all Hydro Flask accessories.",
    brand: "Hydro Flask", category: "Home & Kitchen",
    price: 49.99, unit: "each", rating: 4.7, stock: 130,
    image: img("1602143407151-7111542de6e8"),
    images: [
      img("1602143407151-7111542de6e8"),
      img("1544367567-0f2fcb009e0b"),
      img("1622260614153-03223fb72052"),
      img("1478131143081-80f7f84ca84d"),
      img("1504614579893-bb8a71b49f3e"),
    ],
    variants: [
      { name: "Black", priceModifier: 0, stock: 30 },
      { name: "Pacific Blue", priceModifier: 0, stock: 30 },
      { name: "Olive", priceModifier: 0, stock: 30 },
      { name: "Stone", priceModifier: 0, stock: 40 },
    ],
  },
  {
    name: "Pyrex Simply Store Glass Container Set 18pc",
    description: "Borosilicate glass containers with BPA-free plastic lids that snap securely for leak-resistant storage. Oven-safe up to 425°F, microwave, fridge, freezer, and dishwasher safe. Three lid sizes included. Nesting design saves cupboard space. Set includes 9 containers and 9 matching lids.",
    brand: "Pyrex", category: "Home & Kitchen",
    price: 59.99, unit: "set", rating: 4.5, stock: 88,
    image: img("1610348725531-843dff563e2c"),
    images: [
      img("1610348725531-843dff563e2c"),
      img("1547496502-affa22d38842"),
      img("1585937421612-70a008356fbe"),
      img("1556910103-1c02745b0e09"),
      img("1584797810879-0c53e7e6ff31"),
    ],
  },
  {
    name: "Bamboo Cutting Board Set — 3 Piece",
    description: "Eco-friendly organic bamboo boards in small, medium, and large sizes. Deep juice grooves around the perimeter catch run-off. Non-slip feet keep boards stable while cutting. Easy-grip side handle. Naturally antimicrobial and harder than maple, so knives stay sharper longer.",
    brand: "Royal Craft Wood", category: "Home & Kitchen",
    price: 34.99, unit: "set", rating: 4.6, stock: 97,
    image: img("1547496502-affa22d38842"),
    images: [
      img("1547496502-affa22d38842"),
      img("1585937421612-70a008356fbe"),
      img("1556910103-1c02745b0e09"),
      img("1556909172-54557c7e4fb7"),
      img("1610348725531-843dff563e2c"),
    ],
  },

  // ── FASHION ───────────────────────────────────────────────────────────────
  {
    name: "Levi's 501 Original Fit Jeans",
    description: "The original blue jean since 1873. Straight-leg silhouette with regular fit through seat and thigh. 100% cotton 12-oz denim and iconic button fly. Stonewashed for a worn-in look straight out of the box. Available in dark indigo, light wash, and black.",
    brand: "Levi's", category: "Fashion",
    price: 89.99, unit: "each", rating: 4.5, stock: 78,
    image: img("1542219550-37153d387c27"),
    images: [
      img("1542219550-37153d387c27"),
      img("1521572163474-6864f9cf17ab"),
      img("1539533018447-63fcce2678e3"),
      img("1491553154263-9e2f945e8f86"),
      img("1542291026-7eec264c27ff"),
    ],
    variants: [
      { name: "Dark Indigo W30/L32", priceModifier: 0, stock: 20 },
      { name: "Light Wash W30/L32", priceModifier: 0, stock: 20 },
      { name: "Black W30/L32", priceModifier: 0, stock: 20 },
      { name: "Dark Indigo W32/L32", priceModifier: 0, stock: 18 },
    ],
  },
  {
    name: "Patagonia Better Sweater Full-Zip Fleece Jacket",
    description: "Classic fleece crafted from 100% recycled polyester with a sweater-knit face and silky-soft anti-pill backing. Fair Trade Certified™ sewing. Full-zip placket with stand-up collar, two zippered hand pockets, and interior chest pocket. Slim fit.",
    brand: "Patagonia", category: "Fashion",
    price: 139.99, unit: "each", rating: 4.7, stock: 46,
    image: img("1539533018447-63fcce2678e3"),
    images: [
      img("1539533018447-63fcce2678e3"),
      img("1587402800671-ba09f979b25a"),
      img("1521572163474-6864f9cf17ab"),
      img("1553062407-98eeb64c6a62"),
      img("1622260614153-03223fb72052"),
    ],
    variants: [
      { name: "Black / XS", priceModifier: 0, stock: 8 },
      { name: "Black / M", priceModifier: 0, stock: 10 },
      { name: "Black / L", priceModifier: 0, stock: 8 },
      { name: "New Navy / M", priceModifier: 0, stock: 10 },
      { name: "New Navy / L", priceModifier: 0, stock: 10 },
    ],
  },
  {
    name: "New Balance 990v6 Running Sneakers",
    description: "American-made since 1982. ENCAP® midsole combines a polyurethane rim with an EVA core for superior cushioning and stability. Premium pigskin and mesh upper for breathability. ACTEVA LITE foam reduces weight without sacrificing cushioning. Designed for serious long-distance runners.",
    brand: "New Balance", category: "Fashion",
    price: 184.99, unit: "pair", rating: 4.6, stock: 52,
    image: img("1542291026-7eec264c27ff"),
    images: [
      img("1542291026-7eec264c27ff"),
      img("1491553154263-9e2f945e8f86"),
      img("1521572163474-6864f9cf17ab"),
      img("1542219550-37153d387c27"),
      img("1539533018447-63fcce2678e3"),
    ],
    variants: [
      { name: "Grey / US 9", priceModifier: 0, stock: 10 },
      { name: "Grey / US 10", priceModifier: 0, stock: 12 },
      { name: "Grey / US 11", priceModifier: 0, stock: 10 },
      { name: "Navy / US 10", priceModifier: 0, stock: 10 },
      { name: "Navy / US 11", priceModifier: 0, stock: 10 },
    ],
  },
  {
    name: "Ray-Ban Aviator Classic Sunglasses",
    description: "The iconic teardrop frame born in 1937. Crystal B-15 lenses provide 100% UV protection while the subtle bronze tint enhances colour perception. Gold-tone metal frame with adjustable nose pads. Includes microfibre cleaning cloth and branded case.",
    brand: "Ray-Ban", category: "Fashion",
    price: 161.99, unit: "each", rating: 4.6, stock: 71,
    image: img("1511499767150-a48a237f0083"),
    images: [
      img("1511499767150-a48a237f0083"),
      img("1574258495973-a1c2e315a42f"),
      img("1539533018447-63fcce2678e3"),
      img("1521572163474-6864f9cf17ab"),
      img("1542219550-37153d387c27"),
    ],
    variants: [
      { name: "Gold / Crystal Brown", priceModifier: 0, stock: 25 },
      { name: "Gold / Crystal Green", priceModifier: 0, stock: 25 },
      { name: "Silver / Crystal Grey", priceModifier: 0, stock: 21 },
    ],
  },
  {
    name: "Carhartt WIP Chase Crewneck Sweatshirt",
    description: "Relaxed fit crafted from heavyweight 13-oz 100% cotton fleece with a brushed interior for warmth. Ribbed collar, cuffs, and hem for shape retention. Signature Carhartt WIP C logo heat-transfer badge at the left chest. Pre-washed for reduced shrinkage.",
    brand: "Carhartt WIP", category: "Fashion",
    price: 75.00, unit: "each", rating: 4.5, stock: 85,
    image: img("1521572163474-6864f9cf17ab"),
    images: [
      img("1521572163474-6864f9cf17ab"),
      img("1539533018447-63fcce2678e3"),
      img("1553062407-98eeb64c6a62"),
      img("1542219550-37153d387c27"),
      img("1587402800671-ba09f979b25a"),
    ],
    variants: [
      { name: "Black / S", priceModifier: 0, stock: 15 },
      { name: "Black / M", priceModifier: 0, stock: 20 },
      { name: "Black / L", priceModifier: 0, stock: 20 },
      { name: "Grey / M", priceModifier: 0, stock: 15 },
      { name: "Grey / L", priceModifier: 0, stock: 15 },
    ],
  },
  {
    name: "Herschel Little America Backpack 25L",
    description: "Hiking-inspired pack with padded 15\" laptop sleeve, top carry handle, and signature striped fabric liner. Dual water bottle pockets, ergonomic padded shoulder straps, and quick-access front organiser pocket. 25L capacity. Made with 100% recycled materials.",
    brand: "Herschel", category: "Fashion",
    price: 74.99, unit: "each", rating: 4.5, stock: 58,
    image: img("1553062407-98eeb64c6a62"),
    images: [
      img("1553062407-98eeb64c6a62"),
      img("1622260614153-03223fb72052"),
      img("1504614579893-bb8a71b49f3e"),
      img("1478131143081-80f7f84ca84d"),
      img("1587402800671-ba09f979b25a"),
    ],
    variants: [
      { name: "Black", priceModifier: 0, stock: 20 },
      { name: "Navy", priceModifier: 0, stock: 20 },
      { name: "Forest Green", priceModifier: 0, stock: 18 },
    ],
  },
  {
    name: "Timberland Premium 6-Inch Waterproof Boot",
    description: "Waterproof full-grain leather upper with rustproof hardware and padded collar for support. Seam-sealed waterproof construction keeps feet dry. Anti-fatigue footbed with inverted cone geometry absorbs impact and returns energy. Lug outsole with 3mm heel for stability. The iconic silhouette since 1973.",
    brand: "Timberland", category: "Fashion",
    price: 199.99, unit: "pair", rating: 4.5, stock: 40,
    image: img("1491553154263-9e2f945e8f86"),
    images: [
      img("1491553154263-9e2f945e8f86"),
      img("1542291026-7eec264c27ff"),
      img("1542219550-37153d387c27"),
      img("1521572163474-6864f9cf17ab"),
      img("1539533018447-63fcce2678e3"),
    ],
    variants: [
      { name: "Wheat / US 9", priceModifier: 0, stock: 8 },
      { name: "Wheat / US 10", priceModifier: 0, stock: 10 },
      { name: "Wheat / US 11", priceModifier: 0, stock: 8 },
      { name: "Black / US 10", priceModifier: 0, stock: 7 },
      { name: "Black / US 11", priceModifier: 0, stock: 7 },
    ],
  },
  {
    name: "Arc'teryx Atom LT Hoody",
    description: "Versatile insulated hoody built for active use in cold and variable conditions. Coreloft™ Compact insulation in the body provides warmth without bulk. Polartec® Power Stretch® Pro side panels allow full freedom of movement. Packable into its own chest pocket. Helmet-compatible StormHood.",
    brand: "Arc'teryx", category: "Fashion",
    price: 259.99, unit: "each", rating: 4.7, stock: 16,
    image: img("1587402800671-ba09f979b25a"),
    images: [
      img("1587402800671-ba09f979b25a"),
      img("1539533018447-63fcce2678e3"),
      img("1553062407-98eeb64c6a62"),
      img("1521572163474-6864f9cf17ab"),
      img("1622260614153-03223fb72052"),
    ],
    variants: [
      { name: "Black / S", priceModifier: 0, stock: 4 },
      { name: "Black / M", priceModifier: 0, stock: 4 },
      { name: "Void (Dark Navy) / M", priceModifier: 0, stock: 4 },
      { name: "Void (Dark Navy) / L", priceModifier: 0, stock: 4 },
    ],
  },

  // ── SPORTS & OUTDOORS ─────────────────────────────────────────────────────
  {
    name: "Manduka PRO Yoga Mat 6mm",
    description: "Professional-grade yoga mat with a lifetime guarantee. High-density closed-cell surface prevents sweat and bacteria from seeping in. Superior joint cushioning with unmatched durability. Natural tree rubber base for a locked-in grip. 71 × 24 in / 180 × 61 cm. Certified non-toxic and free of harmful chemicals.",
    brand: "Manduka", category: "Sports & Outdoors",
    price: 120.00, unit: "each", rating: 4.8, stock: 67,
    image: img("1544367567-0f2fcb009e0b"),
    images: [
      img("1544367567-0f2fcb009e0b"),
      img("1506126613408-eca07ce68773"),
      img("1571019613454-1cb2f99b2d8b"),
      img("1622260614153-03223fb72052"),
      img("1478131143081-80f7f84ca84d"),
    ],
    variants: [
      { name: "Black / 6mm", priceModifier: 0, stock: 25 },
      { name: "Deep Sea (Blue) / 6mm", priceModifier: 0, stock: 22 },
      { name: "Verve (Teal) / 6mm", priceModifier: 0, stock: 20 },
    ],
  },
  {
    name: "Theragun Relief Percussive Therapy Device",
    description: "Entry-level percussive therapy with 3 built-in speed settings (1750–2400 RPM), QuietForce Technology for whisper-quiet operation, and 150-minute battery life. Triangle ergonomic handle allows single-arm use. Includes standard attachment and dampener. Targets muscle soreness and improves mobility.",
    brand: "Theragun", category: "Sports & Outdoors",
    price: 179.00, discount: 10, unit: "each", rating: 4.6, stock: 38,
    image: img("1571019613454-1cb2f99b2d8b"),
    images: [
      img("1571019613454-1cb2f99b2d8b"),
      img("1544367567-0f2fcb009e0b"),
      img("1506126613408-eca07ce68773"),
      img("1598289431512-b97b0917affc"),
      img("1551632811-561732d1e306"),
    ],
  },
  {
    name: "Osprey Farpoint 40 Travel Backpack",
    description: "Purpose-built for travel: StraightJacket compression straps, lockable sliders, and a zippered stowaway hipbelt and shoulder harness system for seamless check-in. Internal frame and ventilated back panel. Meets IATA carry-on size restrictions on most airlines. 40L capacity.",
    brand: "Osprey", category: "Sports & Outdoors",
    price: 165.00, unit: "each", rating: 4.7, stock: 49,
    image: img("1622260614153-03223fb72052"),
    images: [
      img("1622260614153-03223fb72052"),
      img("1553062407-98eeb64c6a62"),
      img("1504614579893-bb8a71b49f3e"),
      img("1478131143081-80f7f84ca84d"),
      img("1551632811-561732d1e306"),
    ],
    variants: [
      { name: "Tunnel Vision Grey", priceModifier: 0, stock: 20 },
      { name: "Expedition Green", priceModifier: 0, stock: 15 },
      { name: "Black", priceModifier: 0, stock: 14 },
    ],
  },
  {
    name: "Coleman Portable Camping Quad Chair",
    description: "Durable 600D polyester construction supports up to 250 lbs. Padded armrests with built-in cupholder, phone pocket, and accessory storage mesh pocket. Carry bag with shoulder strap included. Sets up in 60 seconds with no tools required. Ideal for camping, sports events, and outdoor concerts.",
    brand: "Coleman", category: "Sports & Outdoors",
    price: 49.99, unit: "each", rating: 4.4, stock: 88,
    image: img("1504614579893-bb8a71b49f3e"),
    images: [
      img("1504614579893-bb8a71b49f3e"),
      img("1478131143081-80f7f84ca84d"),
      img("1622260614153-03223fb72052"),
      img("1551632811-561732d1e306"),
      img("1544367567-0f2fcb009e0b"),
    ],
    variants: [
      { name: "Khaki", priceModifier: 0, stock: 30 },
      { name: "Blue", priceModifier: 0, stock: 30 },
      { name: "Red", priceModifier: 0, stock: 28 },
    ],
  },
  {
    name: "Black Diamond Trail Sport Trekking Poles (Pair)",
    description: "Lightweight aluminium 7075 poles with FlickLock® Pro adjustability from 62–130 cm for uphill and downhill terrain. Moisture-wicking dual-density foam grip with extended grip wrap. Includes trekking and powder baskets. Folds to 40cm for easy packing.",
    brand: "Black Diamond", category: "Sports & Outdoors",
    price: 79.95, unit: "pair", rating: 4.5, stock: 72,
    image: img("1551632811-561732d1e306"),
    images: [
      img("1551632811-561732d1e306"),
      img("1478131143081-80f7f84ca84d"),
      img("1622260614153-03223fb72052"),
      img("1504614579893-bb8a71b49f3e"),
      img("1544367567-0f2fcb009e0b"),
    ],
  },
  {
    name: "Wilson Pro Staff 97 v14 Tennis Racket",
    description: "Tour-level 97 sq in head size with 16×19 string pattern for exceptional spin and control. Braided graphite and basalt construction for a solid, stable feel. Unstrung weight 315g, balance 31 cm. Used by tour professionals worldwide. Compatible with Wilson Luxilon Big Banger string.",
    brand: "Wilson", category: "Sports & Outdoors",
    price: 199.99, unit: "each", rating: 4.5, stock: 33,
    image: img("1554068865-24ceec13d6c2"),
    images: [
      img("1554068865-24ceec13d6c2"),
      img("1598289431512-b97b0917affc"),
      img("1544367567-0f2fcb009e0b"),
      img("1571019613454-1cb2f99b2d8b"),
      img("1506126613408-eca07ce68773"),
    ],
  },
  {
    name: "Nike Resistance Band Set (5 Bands)",
    description: "Five flat resistance bands ranging from extra-light (10 lb) to extra-heavy (50 lb) for scalable full-body strength training. 100% natural latex with an anti-snap inner core for safety. 48-inch length fits all body types. Compact mesh carry bag included. Perfect for home workouts, physical therapy, and travel.",
    brand: "Nike", category: "Sports & Outdoors",
    price: 39.99, unit: "set", rating: 4.4, stock: 105,
    image: img("1598289431512-b97b0917affc"),
    images: [
      img("1598289431512-b97b0917affc"),
      img("1544367567-0f2fcb009e0b"),
      img("1506126613408-eca07ce68773"),
      img("1571019613454-1cb2f99b2d8b"),
      img("1551632811-561732d1e306"),
    ],
  },
  {
    name: "Garmin Forerunner 265 GPS Running Watch",
    description: "Vibrant AMOLED display with training readiness score, morning report, and daily suggested workouts. Built-in GPS with multiband accuracy in complex environments. Tracks running dynamics, race predictor times, and VO2 max. Up to 15 days in smartwatch mode. Includes Garmin Coach adaptive training plans.",
    brand: "Garmin", category: "Sports & Outdoors",
    price: 449.99, discount: 5, unit: "each", rating: 4.7, stock: 22,
    image: img("1523275335684-37898b6baf30"),
    images: [
      img("1523275335684-37898b6baf30"),
      img("1434494206212-716b93f7a9b9"),
      img("1551632811-561732d1e306"),
      img("1544367567-0f2fcb009e0b"),
      img("1622260614153-03223fb72052"),
    ],
    variants: [
      { name: "Black / Black Band", priceModifier: 0, stock: 12 },
      { name: "Blue / Light Blue Band", priceModifier: 0, stock: 10 },
    ],
  },

  // ── BEAUTY ────────────────────────────────────────────────────────────────
  {
    name: "CeraVe Moisturising Cream 19oz",
    description: "Developed with dermatologists. Three essential ceramides (1, 3, 6-II) and hyaluronic acid work together to restore and maintain the skin's natural protective barrier. MVE® Delivery Technology releases moisturising ingredients throughout the day. Fragrance-free, non-comedogenic, and suitable for dry to very dry skin. Accepted by the National Eczema Association.",
    brand: "CeraVe", category: "Beauty",
    price: 18.99, unit: "each", rating: 4.8, stock: 185,
    image: img("1556228720-195a672e8a03"),
    images: [
      img("1556228720-195a672e8a03"),
      img("1571781926291-c477ebfd024b"),
      img("1556228453-efd6c1ff04f6"),
      img("1596462502278-27bfdc403348"),
      img("1556228578-8c89e6adf883"),
    ],
  },
  {
    name: "The Ordinary Niacinamide 10% + Zinc 1% Serum",
    description: "High-strength Vitamin B3 (Niacinamide) formula visibly reduces the appearance of skin blemishes, congestion, and pore size. Zinc salt of pyrrolidone carboxylic acid balances visible sebum activity. Lightweight water-based formula suitable for all skin types. Use in the PM routine or twice daily.",
    brand: "The Ordinary", category: "Beauty",
    price: 6.90, unit: "each", rating: 4.7, stock: 220,
    image: img("1571781926291-c477ebfd024b"),
    images: [
      img("1571781926291-c477ebfd024b"),
      img("1556228720-195a672e8a03"),
      img("1556228578-8c89e6adf883"),
      img("1556228453-efd6c1ff04f6"),
      img("1596462502278-27bfdc403348"),
    ],
  },
  {
    name: "La Roche-Posay Anthelios Melt-in Milk Sunscreen SPF 60",
    description: "Broad spectrum SPF 60 with Cell-Ox Shield XL technology neutralises UV-generated free radicals. Lightweight fluid formula absorbs quickly with no white cast. Water resistant for 80 minutes. Suitable for sensitive skin. For face and body. Tested by dermatologists on sensitive skin.",
    brand: "La Roche-Posay", category: "Beauty",
    price: 29.99, unit: "each", rating: 4.6, stock: 190,
    image: img("1556228453-efd6c1ff04f6"),
    images: [
      img("1556228453-efd6c1ff04f6"),
      img("1571781926291-c477ebfd024b"),
      img("1556228720-195a672e8a03"),
      img("1596462502278-27bfdc403348"),
      img("1556228578-8c89e6adf883"),
    ],
  },
  {
    name: "Olaplex No.3 Hair Perfector Treatment 100ml",
    description: "A pre-shampoo bond-building treatment that dramatically reduces breakage and visibly strengthens hair from within. Not a conditioner — it works at a molecular level to repair broken disulfide bonds. For all hair types, especially colour-treated, bleached, or chemically processed hair. Use weekly for best results.",
    brand: "Olaplex", category: "Beauty",
    price: 28.00, unit: "each", rating: 4.7, stock: 105,
    image: img("1535585209827-a15fcdbc4c2d"),
    images: [
      img("1535585209827-a15fcdbc4c2d"),
      img("1556228720-195a672e8a03"),
      img("1571781926291-c477ebfd024b"),
      img("1556228578-8c89e6adf883"),
      img("1596462502278-27bfdc403348"),
    ],
  },
  {
    name: "Philips Sonicare ProtectiveClean 4100 Electric Toothbrush",
    description: "Removes up to 7× more plaque along the gumline than a manual toothbrush. Pressure sensor lights up to protect gums from overbrushing. Smart timer with 30-second interval coach ensures 2 full minutes of brushing. Includes 1 brush head and a USB travel charger. 2-week battery life.",
    brand: "Philips", category: "Beauty",
    price: 59.99, discount: 15, unit: "each", rating: 4.5, stock: 63,
    image: img("1559190394-df5a28aab5c5"),
    images: [
      img("1559190394-df5a28aab5c5"),
      img("1556228720-195a672e8a03"),
      img("1571781926291-c477ebfd024b"),
      img("1556228453-efd6c1ff04f6"),
      img("1596462502278-27bfdc403348"),
    ],
    variants: [
      { name: "White", priceModifier: 0, stock: 32 },
      { name: "Black", priceModifier: 0, stock: 31 },
    ],
  },
  {
    name: "Charlotte Tilbury Magic Cream Rich Moisturiser 50ml",
    description: "Multi-award-winning moisturiser with a complex of hyaluronic acid, rosehip oil, vitamin E, wild rose ceramide, and peptides. Instantly plumps, smooths, illuminates, and hydrates skin for a lit-from-within glow. The number-one bestselling facial moisturiser at several major UK retailers.",
    brand: "Charlotte Tilbury", category: "Beauty",
    price: 105.00, unit: "each", rating: 4.7, stock: 22,
    image: img("1556228578-8c89e6adf883"),
    images: [
      img("1556228578-8c89e6adf883"),
      img("1556228720-195a672e8a03"),
      img("1571781926291-c477ebfd024b"),
      img("1596462502278-27bfdc403348"),
      img("1556228453-efd6c1ff04f6"),
    ],
  },
  {
    name: "Drunk Elephant T.L.C. Sukari Babyfacial 50ml",
    description: "Professional-grade resurfacing treatment with a 25% AHA and 2% BHA blend in a non-irritating formula. Resurfaces skin texture, fades dark spots, and brightens in a single 20-minute weekly treatment. Marula oil and chickpea flour calm and condition while actives work. Suitable for all skin types.",
    brand: "Drunk Elephant", category: "Beauty",
    price: 90.00, unit: "each", rating: 4.6, stock: 48,
    image: img("1596462502278-27bfdc403348"),
    images: [
      img("1596462502278-27bfdc403348"),
      img("1571781926291-c477ebfd024b"),
      img("1556228720-195a672e8a03"),
      img("1556228453-efd6c1ff04f6"),
      img("1556228578-8c89e6adf883"),
    ],
  },
  {
    name: "Dyson Airwrap Multi-Styler Complete Long",
    description: "Styles and dries hair simultaneously without extreme heat, using the Coanda effect to attract and wrap hair around the barrel. Complete set includes five attachments: Coanda smoothing dryer, two barrels for curls and waves, a soft smoothing brush, and a firm smoothing brush. For hair up to 65cm.",
    brand: "Dyson", category: "Beauty",
    price: 599.99, discount: 5, unit: "each", rating: 4.7, stock: 12,
    image: img("1535585209827-a15fcdbc4c2d"),
    images: [
      img("1535585209827-a15fcdbc4c2d"),
      img("1556228720-195a672e8a03"),
      img("1571781926291-c477ebfd024b"),
      img("1596462502278-27bfdc403348"),
      img("1559190394-df5a28aab5c5"),
    ],
    variants: [
      { name: "Prussian Blue / Rich Copper", priceModifier: 0, stock: 6 },
      { name: "Black / Nickel", priceModifier: 0, stock: 6 },
    ],
  },

  // ── BOOKS & MEDIA ─────────────────────────────────────────────────────────
  {
    name: "Atomic Habits by James Clear",
    description: "A groundbreaking framework for improving every day by 1%. James Clear weaves together insights from biology, psychology, and neuroscience to show how tiny changes in behaviour can lead to remarkable results. Used by Olympic gold medallists, teams in the NFL, NBA, and MLB, and hundreds of Fortune 500 companies. #1 New York Times bestseller.",
    brand: "Avery Publishing", category: "Books & Media",
    price: 18.99, unit: "each", rating: 4.9, stock: 145,
    image: img("1512820790803-83ca734da794"),
    images: [
      img("1512820790803-83ca734da794"),
      img("1495640388908-05fa85288e61"),
      img("1524995997946-a1c2e315a42f"),
      img("1456513080510-7bf3a84b82f8"),
      img("1507048331197-7d4ac70811cf"),
    ],
  },
  {
    name: "Salt, Fat, Acid, Heat by Samin Nosrat",
    description: "James Beard Award-winning cookbook that teaches the fundamental elements of good cooking — not recipes, but principles that translate to every cuisine. Illustrated by Wendy MacNaughton with 150 vibrant drawings. Covers why dishes succeed or fail, and how to course-correct instinctively. A modern culinary classic.",
    brand: "Simon & Schuster", category: "Books & Media",
    price: 35.00, unit: "each", rating: 4.8, stock: 92,
    image: img("1507048331197-7d4ac70811cf"),
    images: [
      img("1507048331197-7d4ac70811cf"),
      img("1495640388908-05fa85288e61"),
      img("1512820790803-83ca734da794"),
      img("1447933601403-0c6688de566e"),
      img("1474979266404-7eaacbcd87c5"),
    ],
  },
  {
    name: "Dune by Frank Herbert",
    description: "The greatest science-fiction novel of the 20th century. Set in the far future on the desert planet Arrakis, Frank Herbert's sweeping saga follows Paul Atreides as he navigates politics, religion, and destiny on a world that is the only source of the most valuable substance in the universe. Winner of the Hugo and Nebula Awards.",
    brand: "Ace Books", category: "Books & Media",
    price: 19.99, unit: "each", rating: 4.8, stock: 78,
    image: img("1495640388908-05fa85288e61"),
    images: [
      img("1495640388908-05fa85288e61"),
      img("1512820790803-83ca734da794"),
      img("1524995997946-a1c2e315a42f"),
      img("1603048297172-c92544798d5a"),
      img("1456513080510-7bf3a84b82f8"),
    ],
  },
  {
    name: "Miles Davis — Kind of Blue Vinyl LP (180g Audiophile)",
    description: "The best-selling jazz album of all time, newly remastered and pressed on 180g audiophile-grade vinyl for maximum fidelity. Featuring Bill Evans, John Coltrane, Cannonball Adderley, Paul Chambers, and Jimmy Cobb. Includes replica original liner notes. Columbia Records / Legacy Recordings reissue.",
    brand: "Columbia Records", category: "Books & Media",
    price: 32.99, unit: "each", rating: 4.9, stock: 14,
    image: img("1603048297172-c92544798d5a"),
    images: [
      img("1603048297172-c92544798d5a"),
      img("1512820790803-83ca734da794"),
      img("1524995997946-a1c2e315a42f"),
      img("1484704849700-f032d85b5d83"),
      img("1608043152269-423dbba4e7e1"),
    ],
  },
  {
    name: "The Creative Act: A Way of Being by Rick Rubin",
    description: "Legendary record producer Rick Rubin distils a lifetime of working with artists across every genre — from Johnny Cash to Metallica, Jay-Z to Adele — into a comprehensive guide to the creative process. Explores listening, noticing, and the nature of the world as a source of infinite possibility. A deeply personal and profoundly practical book.",
    brand: "Penguin Press", category: "Books & Media",
    price: 32.00, unit: "each", rating: 4.7, stock: 110,
    image: img("1524995997946-a1c2e315a42f"),
    images: [
      img("1524995997946-a1c2e315a42f"),
      img("1512820790803-83ca734da794"),
      img("1495640388908-05fa85288e61"),
      img("1456513080510-7bf3a84b82f8"),
      img("1507048331197-7d4ac70811cf"),
    ],
  },
  {
    name: "The Design of Everyday Things by Don Norman",
    description: "The definitive introduction to the interface between humans and the designed world. Don Norman's accessible insights into user-centred design have made this the essential reference for designers, engineers, and managers in every field. Updated to include apps, touchscreens, and modern digital interfaces. Essential reading for anyone who builds things for people.",
    brand: "Basic Books", category: "Books & Media",
    price: 22.99, unit: "each", rating: 4.7, stock: 84,
    image: img("1456513080510-7bf3a84b82f8"),
    images: [
      img("1456513080510-7bf3a84b82f8"),
      img("1512820790803-83ca734da794"),
      img("1495640388908-05fa85288e61"),
      img("1524995997946-a1c2e315a42f"),
      img("1517842645767-c639042777db"),
    ],
  },
  {
    name: "Steve Jobs by Walter Isaacson",
    description: "Based on more than forty interviews with Jobs conducted over two years, as well as interviews with more than a hundred family members, friends, adversaries, competitors, and colleagues. An extraordinary account of the creative entrepreneur whose passion for perfection and ferocious drive revolutionised six industries: personal computers, animated movies, music, phones, tablet computing, and digital publishing.",
    brand: "Simon & Schuster", category: "Books & Media",
    price: 24.99, unit: "each", rating: 4.6, stock: 96,
    image: img("1512820790803-83ca734da794"),
    images: [
      img("1512820790803-83ca734da794"),
      img("1495640388908-05fa85288e61"),
      img("1456513080510-7bf3a84b82f8"),
      img("1524995997946-a1c2e315a42f"),
      img("1507048331197-7d4ac70811cf"),
    ],
  },

  // ── TOYS & GAMES ──────────────────────────────────────────────────────────
  {
    name: "LEGO Icons Eiffel Tower 10307 — 9,836 Pieces",
    description: "The most detailed LEGO replica of the Paris landmark ever created. Standing 1.5 metres tall, this iconic structure features four detailed façade sections, two observation decks, four lifts, and a restaurant interior. Authentic riveted metallic look and feel. Designed for experienced builders aged 18+.",
    brand: "LEGO", category: "Toys & Games",
    price: 629.99, unit: "each", rating: 4.9, stock: 4,
    image: img("1587654780291-39c9404d746b"),
    images: [
      img("1587654780291-39c9404d746b"),
      img("1611996575749-79a3a250f948"),
      img("1558864566-73e81d84e59c"),
      img("1566576912321-d58ddd7a6088"),
      img("1559715745-e1b33a271c8f"),
    ],
  },
  {
    name: "Catan Board Game (5th Edition)",
    description: "The world's most popular board game and the gateway to modern board gaming. Settle the island of Catan by building roads, settlements, and cities while trading resources with other players. No two games are ever the same thanks to the modular hex board. For 3–4 players, ages 10+. Playtime 60–120 minutes. Expansions available separately.",
    brand: "Catan Studio", category: "Toys & Games",
    price: 55.99, unit: "each", rating: 4.7, stock: 68,
    image: img("1611996575749-79a3a250f948"),
    images: [
      img("1611996575749-79a3a250f948"),
      img("1587654780291-39c9404d746b"),
      img("1558864566-73e81d84e59c"),
      img("1566576912321-d58ddd7a6088"),
      img("1559715745-e1b33a271c8f"),
    ],
  },
  {
    name: "Ravensburger Krypt Silver 654-Piece Puzzle",
    description: "A deceptively challenging puzzle with a single uniform metallic silver colour — no picture to guide you, only the unique shape of each precision-cut piece. Softclick technology means every piece fits with an unmistakable satisfying click. Premium 1.5mm cardboard thickness prevents bending. A must for serious puzzlers.",
    brand: "Ravensburger", category: "Toys & Games",
    price: 24.99, unit: "each", rating: 4.5, stock: 115,
    image: img("1558864566-73e81d84e59c"),
    images: [
      img("1558864566-73e81d84e59c"),
      img("1611996575749-79a3a250f948"),
      img("1587654780291-39c9404d746b"),
      img("1559715745-e1b33a271c8f"),
      img("1566576912321-d58ddd7a6088"),
    ],
  },
  {
    name: "Jellycat Bashful Elephant Stuffed Animal — Large",
    description: "Irresistibly soft with signature silky fur and oversized floppy ears that beg to be snuggled. 31cm tall with embroidered eyes and knotted tail. Surface washable. Suitable from birth. Packaged in a distinctive Jellycat gift bag. Collect the full Bashful range including bunnies, dogs, and ocean creatures.",
    brand: "Jellycat", category: "Toys & Games",
    price: 29.99, unit: "each", rating: 4.9, stock: 88,
    image: img("1559715745-e1b33a271c8f"),
    images: [
      img("1559715745-e1b33a271c8f"),
      img("1558864566-73e81d84e59c"),
      img("1566576912321-d58ddd7a6088"),
      img("1587654780291-39c9404d746b"),
      img("1611996575749-79a3a250f948"),
    ],
    variants: [
      { name: "Medium (23cm) — Grey", priceModifier: -5, stock: 25 },
      { name: "Large (31cm) — Grey", priceModifier: 0, stock: 40 },
      { name: "Large (31cm) — Silver", priceModifier: 0, stock: 23 },
    ],
  },
  {
    name: "Exploding Kittens Card Game (Original Edition)",
    description: "A highly strategic, kitty-powered version of Russian Roulette. Draw cards until someone draws an Exploding Kitten — then they explode and are out. Use Defuse cards, and other action cards to skip turns, peek at the deck, or force other players to draw. 2–5 players, ages 7+. The most-backed Kickstarter project in history at the time of launch.",
    brand: "Exploding Kittens", category: "Toys & Games",
    price: 19.99, unit: "each", rating: 4.7, stock: 96,
    image: img("1566576912321-d58ddd7a6088"),
    images: [
      img("1566576912321-d58ddd7a6088"),
      img("1611996575749-79a3a250f948"),
      img("1558864566-73e81d84e59c"),
      img("1587654780291-39c9404d746b"),
      img("1559715745-e1b33a271c8f"),
    ],
  },
  {
    name: "Ticket to Ride Europe Board Game",
    description: "Cross Europe by train on an epic journey through 45 cities. Collect and play matching train cards to claim railway routes, build tunnels through mountains, and use ferry routes and locomotives for flexible strategy. For 2–5 players, ages 8+. Includes 1 large board map, 240 coloured trains, 158 cards, 15 stations, and 5 scoring markers. Playtime 30–90 minutes.",
    brand: "Days of Wonder", category: "Toys & Games",
    price: 49.99, unit: "each", rating: 4.8, stock: 74,
    image: img("1611996575749-79a3a250f948"),
    images: [
      img("1611996575749-79a3a250f948"),
      img("1558864566-73e81d84e59c"),
      img("1566576912321-d58ddd7a6088"),
      img("1587654780291-39c9404d746b"),
      img("1559715745-e1b33a271c8f"),
    ],
  },
  {
    name: "Hot Wheels Ultimate Garage Playset",
    description: "The ultimate play destination with 5 feet of vertical track action, an elevator that zips cars between floors, a multi-lane spiral ramp, and two vehicle launchers. Holds 140+ Hot Wheels cars. Includes one 1:64 scale die-cast vehicle. Easy to assemble and disassemble for storage. Compatible with all standard Hot Wheels track pieces.",
    brand: "Hot Wheels", category: "Toys & Games",
    price: 89.99, discount: 10, unit: "each", rating: 4.5, stock: 42,
    image: img("1566576912321-d58ddd7a6088"),
    images: [
      img("1566576912321-d58ddd7a6088"),
      img("1559715745-e1b33a271c8f"),
      img("1587654780291-39c9404d746b"),
      img("1611996575749-79a3a250f948"),
      img("1558864566-73e81d84e59c"),
    ],
  },

  // ── GARDEN & TOOLS ────────────────────────────────────────────────────────
  {
    name: "DEWALT 20V MAX Cordless Drill/Impact Driver Combo Kit",
    description: "Two-tool kit includes a compact drill/driver and an impact driver, both powered by 20V MAX batteries. Drill features 2-speed transmission (0–450/1,500 RPM) and 15-position clutch. Impact driver delivers 1,825 in-lbs of torque. Includes 2× 2Ah batteries, charger, and heavy-duty contractor bag.",
    brand: "DEWALT", category: "Garden & Tools",
    price: 199.99, discount: 15, unit: "kit", rating: 4.8, stock: 52,
    image: img("1504148455328-c376907d081c"),
    images: [
      img("1504148455328-c376907d081c"),
      img("1416879595882-3373a0480b5b"),
      img("1614594975525-e45190c55d0b"),
      img("1585937421612-70a008356fbe"),
      img("1551632811-561732d1e306"),
    ],
  },
  {
    name: "Fiskars Bypass Pruning Shears — 9 Inch",
    description: "Hardened precision-ground steel blade retains sharpness longer than standard shears. Low-friction blade coating reduces cutting effort by 30%. Ergonomic handle with soft non-slip grip for comfort during extended use. Cuts cleanly through stems up to ¾ inch. Self-cleaning sap groove. Rust-resistant and easy to sharpen.",
    brand: "Fiskars", category: "Garden & Tools",
    price: 24.99, unit: "each", rating: 4.6, stock: 128,
    image: img("1416879595882-3373a0480b5b"),
    images: [
      img("1416879595882-3373a0480b5b"),
      img("1504148455328-c376907d081c"),
      img("1614594975525-e45190c55d0b"),
      img("1585937421612-70a008356fbe"),
      img("1547496502-affa22d38842"),
    ],
  },
  {
    name: "Stanley FatMax 25-Foot Tape Measure",
    description: "Mylar-coated blade lasts 3× longer than standard tapes. Blade Armor coating on the first 3 inches resists the highest wear area. True Zero end hook enables accurate measurements from any edge. BladeArmor rubber over-mould protects against 6-foot drop impacts. Wide 1¼-inch blade for extended reach.",
    brand: "Stanley", category: "Garden & Tools",
    price: 19.99, unit: "each", rating: 4.6, stock: 215,
    image: img("1504148455328-c376907d081c"),
    images: [
      img("1504148455328-c376907d081c"),
      img("1416879595882-3373a0480b5b"),
      img("1614594975525-e45190c55d0b"),
      img("1551632811-561732d1e306"),
      img("1585937421612-70a008356fbe"),
    ],
  },
  {
    name: "Philips Hue Lily XL Outdoor Spot Light",
    description: "Create stunning garden ambience with 16 million colours and warm-to-cool white. 640-lumen output (equivalent to a 50W halogen). IP65-rated weatherproof for year-round outdoor use. Control individually or in scenes via the Hue app, voice assistants, or Hue switches. Zigbee-based for reliable smart home integration. Requires Hue Bridge.",
    brand: "Philips Hue", category: "Garden & Tools",
    price: 129.99, unit: "each", rating: 4.5, stock: 44,
    image: img("1614594975525-e45190c55d0b"),
    images: [
      img("1614594975525-e45190c55d0b"),
      img("1416879595882-3373a0480b5b"),
      img("1504148455328-c376907d081c"),
      img("1478131143081-80f7f84ca84d"),
      img("1504614579893-bb8a71b49f3e"),
    ],
  },
  {
    name: "Gardena Classic Garden Hose Set 30m",
    description: "High-quality 13mm diameter hose with double polyester yarn reinforcement for kink resistance and 20-bar burst pressure. Set includes Comfort Hose Connector, Comfort Spray Nozzle with 3 spray patterns, and Tap Connector. UV-resistant PVC compound maintains flexibility in temperatures from -20°C to +60°C.",
    brand: "Gardena", category: "Garden & Tools",
    price: 49.99, unit: "set", rating: 4.4, stock: 75,
    image: img("1416879595882-3373a0480b5b"),
    images: [
      img("1416879595882-3373a0480b5b"),
      img("1614594975525-e45190c55d0b"),
      img("1504148455328-c376907d081c"),
      img("1478131143081-80f7f84ca84d"),
      img("1585937421612-70a008356fbe"),
    ],
  },
  {
    name: "Weber Spirit II E-310 3-Burner Gas Grill",
    description: "Three stainless-steel burners with 30,000 BTU output and GS4 grilling system including iGrill-compatible thermometer port. 529 sq in total cooking area — primary 424 sq in, warming rack 105 sq in. Porcelain-enamelled cast iron grates retain heat for better searing. 10-year warranty on all parts.",
    brand: "Weber", category: "Garden & Tools",
    price: 549.99, discount: 8, unit: "each", rating: 4.7, stock: 11,
    image: img("1585937421612-70a008356fbe"),
    images: [
      img("1585937421612-70a008356fbe"),
      img("1416879595882-3373a0480b5b"),
      img("1478131143081-80f7f84ca84d"),
      img("1504614579893-bb8a71b49f3e"),
      img("1614594975525-e45190c55d0b"),
    ],
    variants: [
      { name: "Black", priceModifier: 0, stock: 6 },
      { name: "Ivory", priceModifier: 0, stock: 5 },
    ],
  },
  {
    name: "Bosch PS31-2A 12V Max 3/8\" Drill/Driver Kit",
    description: "Ultra-compact design at just 6.4 inches and 2.1 lbs for superior manoeuvrability in tight spaces. 20-position clutch with drill mode, two-speed transmission (0–350/1,300 RPM), and 265 in-lbs of torque. Includes 2× 2Ah batteries, charger, and fitted L-BOXX carry case.",
    brand: "Bosch", category: "Garden & Tools",
    price: 129.99, unit: "kit", rating: 4.6, stock: 38,
    image: img("1504148455328-c376907d081c"),
    images: [
      img("1504148455328-c376907d081c"),
      img("1416879595882-3373a0480b5b"),
      img("1614594975525-e45190c55d0b"),
      img("1551632811-561732d1e306"),
      img("1585937421612-70a008356fbe"),
    ],
  },

  // ── OFFICE ────────────────────────────────────────────────────────────────
  {
    name: "Herman Miller Aeron Chair — Size B",
    description: "The world's most studied chair and the benchmark of ergonomic seating. 8Z Pellicle suspension distributes weight evenly across the seat and back. PostureFit SL lumbar support stabilises the sacrum and lumbar. Fully adjustable arms, tilt limiter, and forward tilt. Available in three sizes. Backed by a 12-year warranty covering all parts.",
    brand: "Herman Miller", category: "Office",
    price: 1445.00, discount: 5, unit: "each", rating: 4.9, stock: 8,
    image: img("1593642632559-0c6d3fc62b89"),
    images: [
      img("1593642632559-0c6d3fc62b89"),
      img("1547826039-a468e6ebdd7f"),
      img("1517842645767-c639042777db"),
      img("1587829741301-dc798b83add3"),
      img("1527864550417-7519ae9c05c5"),
    ],
    variants: [
      { name: "Size A (Petite) — Graphite", priceModifier: -100, stock: 2 },
      { name: "Size B (Standard) — Graphite", priceModifier: 0, stock: 4 },
      { name: "Size C (Large) — Graphite", priceModifier: 100, stock: 2 },
    ],
  },
  {
    name: "VIVO Single Gas Spring Monitor Arm",
    description: "Gas-spring counterbalance supports 13–32\" displays weighing 4.4–17.6 lbs. Full motion: 360° rotation, ±90° tilt, 180° swivel, and height adjustment 4–18 inches from desk surface. Tool-free quick-release VESA 75/100 plate. C-clamp and grommet mount options. Cable management built into pole.",
    brand: "VIVO", category: "Office",
    price: 89.99, unit: "each", rating: 4.5, stock: 62,
    image: img("1547826039-a468e6ebdd7f"),
    images: [
      img("1547826039-a468e6ebdd7f"),
      img("1593642632559-0c6d3fc62b89"),
      img("1587829741301-dc798b83add3"),
      img("1527864550417-7519ae9c05c5"),
      img("1595044426077-d36d9236d54a"),
    ],
    variants: [
      { name: "Black", priceModifier: 0, stock: 32 },
      { name: "White", priceModifier: 0, stock: 30 },
    ],
  },
  {
    name: "Leuchtturm1917 Medium A5 Dotted Notebook",
    description: "The notebook of choice for bullet journalers and creative thinkers worldwide. 249 numbered pages, 8 perforated pages, 2 ribbon bookmarks, elastic enclosure band, and back pocket. 80g acid-free ink-proof paper. Thread-bound hardcover lies flat when open. Includes table of contents pages and sticker set for personalisation.",
    brand: "Leuchtturm1917", category: "Office",
    price: 22.99, unit: "each", rating: 4.7, stock: 104,
    image: img("1517842645767-c639042777db"),
    images: [
      img("1517842645767-c639042777db"),
      img("1456513080510-7bf3a84b82f8"),
      img("1512820790803-83ca734da794"),
      img("1495640388908-05fa85288e61"),
      img("1593642632559-0c6d3fc62b89"),
    ],
    variants: [
      { name: "Dotted — Black", priceModifier: 0, stock: 25 },
      { name: "Dotted — Navy", priceModifier: 0, stock: 25 },
      { name: "Dotted — Emerald", priceModifier: 0, stock: 25 },
      { name: "Ruled — Black", priceModifier: 0, stock: 29 },
    ],
  },
  {
    name: "Logitech MX Keys Mini Wireless Keyboard",
    description: "Compact tenkeyless layout with Smart Illumination that activates when hands approach and adapts to ambient lighting. Flow cross-computer control — type on three computers with one keyboard. USB-C rechargeable with up to 10 days battery. Works on Windows, macOS, Linux, iOS, and Android.",
    brand: "Logitech", category: "Office",
    price: 99.99, unit: "each", rating: 4.6, stock: 85,
    image: img("1587829741301-dc798b83add3"),
    images: [
      img("1587829741301-dc798b83add3"),
      img("1595044426077-d36d9236d54a"),
      img("1527864550417-7519ae9c05c5"),
      img("1593642632559-0c6d3fc62b89"),
      img("1547826039-a468e6ebdd7f"),
    ],
    variants: [
      { name: "Graphite", priceModifier: 0, stock: 30 },
      { name: "Pale Grey", priceModifier: 0, stock: 30 },
      { name: "Rose (for Mac)", priceModifier: 0, stock: 25 },
    ],
  },
  {
    name: "Rocketbook Smart Reusable Notebook",
    description: "Write with Pilot FriXion pens, scan and save to Google Drive, Dropbox, iCloud, Evernote, Slack, or email in seconds using the free app, then wipe clean with a damp cloth and reuse. Infinite pages, zero waste. Includes 1 Pilot FriXion pen and microfibre cloth. Available in Executive (6×8.8\") and Letter (8.5×11\") sizes.",
    brand: "Rocketbook", category: "Office",
    price: 36.99, unit: "each", rating: 4.5, stock: 158,
    image: img("1456513080510-7bf3a84b82f8"),
    images: [
      img("1456513080510-7bf3a84b82f8"),
      img("1517842645767-c639042777db"),
      img("1512820790803-83ca734da794"),
      img("1593642632559-0c6d3fc62b89"),
      img("1547826039-a468e6ebdd7f"),
    ],
    variants: [
      { name: "Executive (6×8.8\") — Black", priceModifier: 0, stock: 55 },
      { name: "Executive (6×8.8\") — Grey", priceModifier: 0, stock: 50 },
      { name: "Letter (8.5×11\") — Black", priceModifier: 5, stock: 53 },
    ],
  },
  {
    name: "Pilot G2 Premium Gel Pens — 12-Pack (0.7mm)",
    description: "America's #1 selling gel ink pen. Skip-free vibrant gel ink delivers smooth, comfortable writing across multiple pages. Refillable barrel with comfortable rubber grip and stylish clip. Retractable tip eliminates cap loss. Available in 0.38mm, 0.5mm, 0.7mm, and 1.0mm point sizes. Includes assorted black, blue, and red.",
    brand: "Pilot", category: "Office",
    price: 15.99, unit: "pack", rating: 4.7, stock: 280,
    image: img("1517842645767-c639042777db"),
    images: [
      img("1517842645767-c639042777db"),
      img("1456513080510-7bf3a84b82f8"),
      img("1512820790803-83ca734da794"),
      img("1593642632559-0c6d3fc62b89"),
      img("1547826039-a468e6ebdd7f"),
    ],
    variants: [
      { name: "Black (12-Pack, 0.7mm)", priceModifier: 0, stock: 100 },
      { name: "Assorted (12-Pack, 0.7mm)", priceModifier: 0, stock: 100 },
      { name: "Black (20-Pack, 0.7mm)", priceModifier: 10, stock: 80 },
    ],
  },
  {
    name: "Grovemade Maple Desk Shelf System",
    description: "Handcrafted in Portland, Oregon from solid American maple and black powder-coated steel. Elevates your monitor to ergonomic height while creating clean storage beneath for keyboard, notebook, and accessories. Integrated cable management cutouts. Fits monitors up to 34\". Two colour options: maple natural or walnut dark.",
    brand: "Grovemade", category: "Office",
    price: 225.00, unit: "each", rating: 4.8, stock: 7,
    image: img("1593642632559-0c6d3fc62b89"),
    images: [
      img("1593642632559-0c6d3fc62b89"),
      img("1547826039-a468e6ebdd7f"),
      img("1587829741301-dc798b83add3"),
      img("1517842645767-c639042777db"),
      img("1527864550417-7519ae9c05c5"),
    ],
    variants: [
      { name: "Maple Natural", priceModifier: 0, stock: 4 },
      { name: "Walnut Dark", priceModifier: 25, stock: 3 },
    ],
  },

  // ── GROCERIES & PANTRY ────────────────────────────────────────────────────
  {
    name: "Stumptown Hair Bender Whole Bean Coffee 12oz",
    description: "Stumptown's flagship blend. A bright, complex coffee with notes of milk chocolate, citrus zest, and stone fruit. Carefully sourced from partner farms in Latin America, Africa, and the Indonesian archipelago. Roasted in small batches in Portland, OR and shipped within days of roasting for peak freshness.",
    brand: "Stumptown", category: "Groceries & Pantry",
    price: 16.99, unit: "bag", rating: 4.7, stock: 195,
    image: img("1447933601403-0c6688de566e"),
    images: [
      img("1447933601403-0c6688de566e"),
      img("1512568400610-350c7aae26af"),
      img("1495474472359-6e7d7b10ff44"),
      img("1481391319555-bae786bce8e8"),
      img("1574323347407-f5e1ad6d020b"),
    ],
    variants: [
      { name: "12oz Whole Bean", priceModifier: 0, stock: 100 },
      { name: "12oz Ground (Drip)", priceModifier: 0, stock: 55 },
      { name: "5lb Whole Bean", priceModifier: 52, stock: 40 },
    ],
  },
  {
    name: "California Olive Ranch Extra Virgin Olive Oil 16.9 fl oz",
    description: "100% California-grown olives cold-pressed within hours of harvest, same-day as picking for maximum freshness and polyphenol content. Bright, fresh flavour with artichoke, stone fruit, and buttery finish. Certified USDA Organic and California Olive Oil Council approved. Harvested October–December annually.",
    brand: "California Olive Ranch", category: "Groceries & Pantry",
    price: 13.99, unit: "bottle", rating: 4.7, stock: 175,
    image: img("1474979266404-7eaacbcd87c5"),
    images: [
      img("1474979266404-7eaacbcd87c5"),
      img("1447933601403-0c6688de566e"),
      img("1481391319555-bae786bce8e8"),
      img("1574323347407-f5e1ad6d020b"),
      img("1587049352846-4a222e784d38"),
    ],
  },
  {
    name: "Bob's Red Mill Organic Rolled Oats 32oz",
    description: "Whole grain oats lightly rolled to preserve the bran and germ layers — where most of the nutrition lives. Certified USDA Organic and Non-GMO Project Verified. Tested in Bob's own laboratory to be gluten-free. Ideal for classic porridge, overnight oats, granola, and baking. A family brand since 1978.",
    brand: "Bob's Red Mill", category: "Groceries & Pantry",
    price: 7.99, unit: "bag", rating: 4.7, stock: 230,
    image: img("1574323347407-f5e1ad6d020b"),
    images: [
      img("1574323347407-f5e1ad6d020b"),
      img("1474979266404-7eaacbcd87c5"),
      img("1447933601403-0c6688de566e"),
      img("1481391319555-bae786bce8e8"),
      img("1587049352846-4a222e784d38"),
    ],
  },
  {
    name: "Lindt Excellence 90% Cocoa Dark Chocolate Bar 100g",
    description: "Intensely dark and boldly flavoured with a smooth, velvety finish that reveals subtle bittersweet and roasted notes. Made with sustainably sourced cacao beans selected from premier growing regions. Low sugar (3g per 40g serving). No artificial flavours or colours. Pairs beautifully with espresso, red wine, or aged spirits.",
    brand: "Lindt", category: "Groceries & Pantry",
    price: 4.99, unit: "bar", rating: 4.6, stock: 350,
    image: img("1481391319555-bae786bce8e8"),
    images: [
      img("1481391319555-bae786bce8e8"),
      img("1447933601403-0c6688de566e"),
      img("1587049352846-4a222e784d38"),
      img("1556679343-c7306c1976bc"),
      img("1574323347407-f5e1ad6d020b"),
    ],
  },
  {
    name: "Harney & Sons Royal English Breakfast Tea — 50 Sachets",
    description: "A bold, full-bodied black tea blend of premium Assam and Kenyan teas with a rich, malty character that holds up well to milk and sugar. Individually hand-wrapped foil sachets preserve freshness and aroma. Certified kosher. Harney & Sons has been blending fine teas since 1983.",
    brand: "Harney & Sons", category: "Groceries & Pantry",
    price: 14.99, unit: "box", rating: 4.7, stock: 210,
    image: img("1556679343-c7306c1976bc"),
    images: [
      img("1556679343-c7306c1976bc"),
      img("1447933601403-0c6688de566e"),
      img("1481391319555-bae786bce8e8"),
      img("1587049352846-4a222e784d38"),
      img("1512568400610-350c7aae26af"),
    ],
  },
  {
    name: "Nature Nate's Raw & Unfiltered Honey 32oz",
    description: "100% pure raw honey sourced from US beekeepers. Never heated above hive temperature, never filtered — so it retains all the natural pollen, enzymes, and antioxidants. Rich wildflower flavour with natural sweetness and no added sugars or artificial ingredients. May crystallise naturally, which is a sign of quality.",
    brand: "Nature Nate's", category: "Groceries & Pantry",
    price: 14.99, unit: "jar", rating: 4.8, stock: 162,
    image: img("1587049352846-4a222e784d38"),
    images: [
      img("1587049352846-4a222e784d38"),
      img("1447933601403-0c6688de566e"),
      img("1474979266404-7eaacbcd87c5"),
      img("1481391319555-bae786bce8e8"),
      img("1556679343-c7306c1976bc"),
    ],
  },
  {
    name: "Siete Grain-Free Tortilla Chips Sea Salt 5oz",
    description: "Made with just cassava flour, avocado oil, and sea salt. Gluten-free, grain-free, dairy-free, and paleo-friendly without sacrificing crunch or flavour. Light, airy texture with a satisfying crunch. Lower in carbs than corn chips. Perfect with guacamole, salsa, or hummus. Non-GMO Project Verified.",
    brand: "Siete", category: "Groceries & Pantry",
    price: 5.49, unit: "bag", rating: 4.5, stock: 290,
    image: img("1574323347407-f5e1ad6d020b"),
    images: [
      img("1574323347407-f5e1ad6d020b"),
      img("1447933601403-0c6688de566e"),
      img("1481391319555-bae786bce8e8"),
      img("1474979266404-7eaacbcd87c5"),
      img("1587049352846-4a222e784d38"),
    ],
  },
  {
    name: "Maldon Sea Salt Flakes 8.5oz",
    description: "Handcrafted in Maldon, Essex since 1882. Distinctive pyramid-shaped flakes with a light, clean taste and satisfying crunch that dissolves instantly on the tongue. The finishing salt of choice for professional chefs worldwide. Lower sodium by volume than table salt due to its flaked structure. Naturally harvested with no additives.",
    brand: "Maldon", category: "Groceries & Pantry",
    price: 8.99, unit: "box", rating: 4.8, stock: 310,
    image: img("1474979266404-7eaacbcd87c5"),
    images: [
      img("1474979266404-7eaacbcd87c5"),
      img("1481391319555-bae786bce8e8"),
      img("1447933601403-0c6688de566e"),
      img("1574323347407-f5e1ad6d020b"),
      img("1587049352846-4a222e784d38"),
    ],
  },

  // ── ELECTRONICS (continued) ───────────────────────────────────────────────
  {
    name: "Nintendo Switch OLED Model",
    description: "Enhanced 7-inch OLED screen with vivid colours and a wide adjustable stand. 64GB internal storage, a wired LAN port in the dock for stable online play, and enhanced audio from the front-facing speakers. Plays all Nintendo Switch games in TV, tabletop, and handheld modes. Includes Joy-Con controllers in white.",
    brand: "Nintendo", category: "Electronics",
    price: 349.99, unit: "each", rating: 4.8, stock: 35,
    image: img("1493711662062-fa541aff3208"),
    images: [
      img("1493711662062-fa541aff3208"),
      img("1609921213416-c8f1c3ebad80"),
      img("1558618666-fcd25c85cd64"),
      img("1527864550417-7519ae9c05c5"),
      img("1583863788434-1b8b1a27b16b"),
    ],
    variants: [
      { name: "White", priceModifier: 0, stock: 20 },
      { name: "Neon Red/Neon Blue", priceModifier: 0, stock: 15 },
    ],
  },
  {
    name: "GoPro HERO12 Black Action Camera",
    description: "5.3K60 and 4K120 video with legendary GoPro image stabilisation (HyperSmooth 6.0). 27MP photos. Longest battery life ever in a HERO camera — 70 minutes in 5.3K60. Waterproof to 33ft without a case. Comes with Enduro battery, mounting buckle, and USB-C cable. Compatible with all GoPro accessories.",
    brand: "GoPro", category: "Electronics",
    price: 399.99, discount: 12, unit: "each", rating: 4.6, stock: 41,
    image: img("1516035069371-29a1b244cc32"),
    images: [
      img("1516035069371-29a1b244cc32"),
      img("1502920917128-1aa671b29f5b"),
      img("1558618666-fcd25c85cd64"),
      img("1546435578-e62e24c8ccbf"),
      img("1609921213416-c8f1c3ebad80"),
    ],
  },
  {
    name: "Bose QuietComfort Ultra Wireless Earbuds",
    description: "Bose's most immersive earbuds yet. CustomTune technology personalises the sound profile to your ear anatomy in seconds. World-class noise cancellation with Aware Mode for safe awareness of surroundings. Up to 6 hours battery life (24 hours with case). IPX4 sweat and water resistant. Connects to two devices simultaneously.",
    brand: "Bose", category: "Electronics",
    price: 299.99, unit: "each", rating: 4.7, stock: 28,
    image: img("1590658268037-6bf12165cd8e"),
    images: [
      img("1590658268037-6bf12165cd8e"),
      img("1600294037681-c80b4cb5b434"),
      img("1505740420928-5e560c06d30e"),
      img("1558618666-fcd25c85cd64"),
      img("1583863788434-1b8b1a27b16b"),
    ],
    variants: [
      { name: "Black", priceModifier: 0, stock: 15 },
      { name: "White", priceModifier: 0, stock: 13 },
    ],
  },
  {
    name: "Amazon Echo Show 10 (3rd Gen)",
    description: "10.1-inch HD screen that moves with you. Premium directional sound with woofer and dual tweeters. Built-in Zigbee hub for smart home control. Video call anyone with the Alexa app. Show your compatible security cameras live. Auto frame keeps you centred on video calls. Privacy shutter and mic off button.",
    brand: "Amazon", category: "Electronics",
    price: 249.99, discount: 20, unit: "each", rating: 4.4, stock: 57,
    image: img("1547826039-a468e6ebdd7f"),
    images: [
      img("1547826039-a468e6ebdd7f"),
      img("1593642632559-0c6d3fc62b89"),
      img("1558618666-fcd25c85cd64"),
      img("1609921213416-c8f1c3ebad80"),
      img("1527864550417-7519ae9c05c5"),
    ],
    variants: [
      { name: "Charcoal", priceModifier: 0, stock: 30 },
      { name: "Glacier White", priceModifier: 0, stock: 27 },
    ],
  },
  {
    name: "Google Pixel 9 Pro 256GB",
    description: "Google's most advanced camera system in a smartphone. 50MP main + 48MP ultrawide + 48MP telephoto with 5× optical zoom. Google AI features: Magic Eraser, Photo Unblur, and real-time translation. 6.3-inch Super Actua display, 4700mAh battery with 27W wired charging, and IP68 water resistance. 7 years of OS updates guaranteed.",
    brand: "Google", category: "Electronics",
    price: 999.99, discount: 8, unit: "each", rating: 4.7, stock: 19,
    image: img("1609921213416-c8f1c3ebad80"),
    images: [
      img("1609921213416-c8f1c3ebad80"),
      img("1544244015-0df4cec9d97d"),
      img("1558618666-fcd25c85cd64"),
      img("1583863788434-1b8b1a27b16b"),
      img("1527864550417-7519ae9c05c5"),
    ],
    variants: [
      { name: "Obsidian / 256GB", priceModifier: 0, stock: 8 },
      { name: "Porcelain / 256GB", priceModifier: 0, stock: 6 },
      { name: "Hazel / 512GB", priceModifier: 100, stock: 5 },
    ],
  },
  {
    name: "Elgato Stream Deck MK.2 — 15 Key",
    description: "15 fully customisable LCD keys that trigger unlimited actions with one touch. Multi-action sequences, animations, and folder nesting for thousands of shortcuts. Works with OBS, Twitch, YouTube, Spotify, Zoom, Discord, and hundreds of apps. USB-C connected, detachable cable, and swappable faceplates. Mac and Windows compatible.",
    brand: "Elgato", category: "Electronics",
    price: 149.99, unit: "each", rating: 4.7, stock: 63,
    image: img("1595044426077-d36d9236d54a"),
    images: [
      img("1595044426077-d36d9236d54a"),
      img("1587829741301-dc798b83add3"),
      img("1527864550417-7519ae9c05c5"),
      img("1593642632559-0c6d3fc62b89"),
      img("1558618666-fcd25c85cd64"),
    ],
  },

  // ── HOME & KITCHEN (continued) ────────────────────────────────────────────
  {
    name: "Fellow Stagg EKG+ Electric Kettle 0.9L",
    description: "Variable temperature control from 135–212°F with 1-degree precision — ideal for pour-over and cold-brew ratios. Bluetooth connectivity with the Fellow app for brewing presets and real-time temperature tracking. Sleek minimalist counterweight handle and matte base. 60-minute hold time. 1200W for fast boiling.",
    brand: "Fellow", category: "Home & Kitchen",
    price: 199.99, unit: "each", rating: 4.7, stock: 34,
    image: img("1512568400610-350c7aae26af"),
    images: [
      img("1512568400610-350c7aae26af"),
      img("1495474472359-6e7d7b10ff44"),
      img("1447933601403-0c6688de566e"),
      img("1556909172-54557c7e4fb7"),
      img("1584797810879-0c53e7e6ff31"),
    ],
    variants: [
      { name: "Matte Black", priceModifier: 0, stock: 18 },
      { name: "Polished Steel", priceModifier: 0, stock: 16 },
    ],
  },
  {
    name: "Le Creuset Signature Enamelled Cast Iron Dutch Oven 5.5Qt",
    description: "The gold standard of braising vessels. Tight-fitting lid traps moisture and flavour while the enamelled interior resists staining and doesn't require seasoning. Compatible with all heat sources including induction. The composite knob is oven-safe to 500°F. Ergonomic handles that accommodate oven mitts. Heirloom quality with lifetime warranty.",
    brand: "Le Creuset", category: "Home & Kitchen",
    price: 399.99, discount: 10, unit: "each", rating: 4.9, stock: 22,
    image: img("1556909172-54557c7e4fb7"),
    images: [
      img("1556909172-54557c7e4fb7"),
      img("1585937421612-70a008356fbe"),
      img("1556909114-f6e7ad7d3136"),
      img("1547496502-affa22d38842"),
      img("1610348725531-843dff563e2c"),
    ],
    variants: [
      { name: "Flame (Orange)", priceModifier: 0, stock: 6 },
      { name: "Cerise (Red)", priceModifier: 0, stock: 6 },
      { name: "Marseille (Blue)", priceModifier: 0, stock: 5 },
      { name: "Sage (Green)", priceModifier: 0, stock: 5 },
    ],
  },
  {
    name: "Cuisinart Food Processor 14-Cup DFP-14BCWN",
    description: "Work bowl capacity handles full recipes: 2 lbs of dough, 4 lbs of cheese, 6 whole carrots in 10 seconds. Includes standard slicing disc, medium shredding disc, chopping/mixing blade, and dough blade. SealTight Advantage system prevents leaks. Extra-large feed tube takes whole fruits and vegetables. Dishwasher-safe parts.",
    brand: "Cuisinart", category: "Home & Kitchen",
    price: 199.99, discount: 20, unit: "each", rating: 4.6, stock: 39,
    image: img("1614707050748-f8eb78dbd78b"),
    images: [
      img("1614707050748-f8eb78dbd78b"),
      img("1556909114-f6e7ad7d3136"),
      img("1594736797933-d0501ba2fe65"),
      img("1584797810879-0c53e7e6ff31"),
      img("1556909172-54557c7e4fb7"),
    ],
    variants: [
      { name: "White", priceModifier: 0, stock: 20 },
      { name: "Gunmetal", priceModifier: 0, stock: 19 },
    ],
  },
  {
    name: "OXO Good Grips 5-Piece Mixing Bowl Set",
    description: "Non-slip bases keep bowls steady on the countertop. Pour spouts and measurement markings on the interior. Nesting design for compact storage. Lids available separately for refrigerator storage. Microwave and dishwasher safe. BPA-free polypropylene. Sizes: 1.5Qt, 3Qt, 5Qt, 7Qt, and 1.5Qt measuring.",
    brand: "OXO", category: "Home & Kitchen",
    price: 69.99, unit: "set", rating: 4.7, stock: 82,
    image: img("1556909114-f6e7ad7d3136"),
    images: [
      img("1556909114-f6e7ad7d3136"),
      img("1547496502-affa22d38842"),
      img("1556909172-54557c7e4fb7"),
      img("1610348725531-843dff563e2c"),
      img("1585937421612-70a008356fbe"),
    ],
  },
  {
    name: "Breville Barista Express Espresso Machine BES870XL",
    description: "Grind, dose, tamp, and extract with one machine. Integrated conical burr grinder with dose control grinding delivers the right amount of freshly ground coffee directly into the portafilter. Digital temperature control (PID) delivers water at precisely the right temperature. Powerful steam wand for silky microfoam. 15-bar Italian pump.",
    brand: "Breville", category: "Home & Kitchen",
    price: 699.99, discount: 10, unit: "each", rating: 4.7, stock: 15,
    image: img("1495474472359-6e7d7b10ff44"),
    images: [
      img("1495474472359-6e7d7b10ff44"),
      img("1512568400610-350c7aae26af"),
      img("1447933601403-0c6688de566e"),
      img("1584797810879-0c53e7e6ff31"),
      img("1556909172-54557c7e4fb7"),
    ],
    variants: [
      { name: "Brushed Stainless Steel", priceModifier: 0, stock: 10 },
      { name: "Black Sesame", priceModifier: 0, stock: 5 },
    ],
  },
  {
    name: "All-Clad D3 Stainless 12-Inch Fry Pan",
    description: "American-made tri-ply bonded cookware with warp-resistant stainless steel and a responsive aluminium core for even heat distribution. Flared sides and pour spouts for easy handling. Riveted stainless steel handles stay cool on the stovetop. Oven and broiler safe to 600°F. Compatible with all cooktops including induction. Dishwasher safe.",
    brand: "All-Clad", category: "Home & Kitchen",
    price: 129.99, unit: "each", rating: 4.7, stock: 44,
    image: img("1585937421612-70a008356fbe"),
    images: [
      img("1585937421612-70a008356fbe"),
      img("1556910103-1c02745b0e09"),
      img("1547496502-affa22d38842"),
      img("1556909172-54557c7e4fb7"),
      img("1610348725531-843dff563e2c"),
    ],
  },
  {
    name: "Nespresso Vertuo Next Coffee & Espresso Maker",
    description: "Centrifusion™ technology spins the capsule at up to 7,000 RPM to perfectly extract five cup sizes: espresso, double espresso, gran lungo, coffee, and alto. Bluetooth and Wi-Fi connectivity with the Nespresso app. Energy-saving auto-off after 2 minutes. Ejects used capsules automatically. Compatible with all Vertuo capsules.",
    brand: "Nespresso", category: "Home & Kitchen",
    price: 159.99, discount: 15, unit: "each", rating: 4.5, stock: 52,
    image: img("1584797810879-0c53e7e6ff31"),
    images: [
      img("1584797810879-0c53e7e6ff31"),
      img("1495474472359-6e7d7b10ff44"),
      img("1512568400610-350c7aae26af"),
      img("1447933601403-0c6688de566e"),
      img("1556909172-54557c7e4fb7"),
    ],
    variants: [
      { name: "Black", priceModifier: 0, stock: 18 },
      { name: "Chrome", priceModifier: 0, stock: 18 },
      { name: "Light Grey", priceModifier: 0, stock: 16 },
    ],
  },

  // ── FASHION (continued) ───────────────────────────────────────────────────
  {
    name: "Lululemon Align High-Rise Leggings 25\"",
    description: "Made with Nulu™ fabric — buttery soft, four-way stretch, and virtually weightless at 145gsm. Naked sensation waistband eliminates dig-in. Sweat-wicking and quick-drying for yoga, Pilates, and low-impact training. Hidden waistband pocket for a card or key. Available in 20 colours and lengths 21\"/25\"/28\".",
    brand: "Lululemon", category: "Fashion",
    price: 98.00, unit: "each", rating: 4.7, stock: 68,
    image: img("1544367567-0f2fcb009e0b"),
    images: [
      img("1544367567-0f2fcb009e0b"),
      img("1506126613408-eca07ce68773"),
      img("1539533018447-63fcce2678e3"),
      img("1571019613454-1cb2f99b2d8b"),
      img("1621072716542-b8678bdebd2f"),
    ],
    variants: [
      { name: "Black / XS", priceModifier: 0, stock: 15 },
      { name: "Black / S", priceModifier: 0, stock: 15 },
      { name: "Black / M", priceModifier: 0, stock: 15 },
      { name: "Peach Fuzz / S", priceModifier: 0, stock: 12 },
      { name: "Peach Fuzz / M", priceModifier: 0, stock: 11 },
    ],
  },
  {
    name: "Allbirds Tree Runner Go Sneakers",
    description: "Made from TENCEL™ lyocell — a breathable, moisture-wicking fibre from sustainably harvested wood. Ultra-light at 7.8oz per shoe. Zero-break-in comfort with a plush SweetFoam® midsole made from sugar cane. Machine washable. Carbon footprint label on every shoe. Available in 12 colours. Vegan-certified.",
    brand: "Allbirds", category: "Fashion",
    price: 125.00, unit: "pair", rating: 4.5, stock: 87,
    image: img("1542291026-7eec264c27ff"),
    images: [
      img("1542291026-7eec264c27ff"),
      img("1491553154263-9e2f945e8f86"),
      img("1539533018447-63fcce2678e3"),
      img("1542219550-37153d387c27"),
      img("1553062407-98eeb64c6a62"),
    ],
    variants: [
      { name: "Natural Black / US 8", priceModifier: 0, stock: 15 },
      { name: "Natural Black / US 9", priceModifier: 0, stock: 18 },
      { name: "Natural Black / US 10", priceModifier: 0, stock: 18 },
      { name: "Natural White / US 9", priceModifier: 0, stock: 18 },
      { name: "Natural White / US 10", priceModifier: 0, stock: 18 },
    ],
  },
  {
    name: "The North Face ThermoBall Eco Jacket",
    description: "PrimaLoft® Black Eco insulation made from 55% recycled content. Compresses to its own chest pocket for easy packing. Water-repellent DWR finish sheds light rain and snow. Secure-zip hand pockets and interior media pocket. Flatlock seams for comfort against the body. Available in six colours.",
    brand: "The North Face", category: "Fashion",
    price: 199.99, discount: 15, unit: "each", rating: 4.6, stock: 42,
    image: img("1539533018447-63fcce2678e3"),
    images: [
      img("1539533018447-63fcce2678e3"),
      img("1587402800671-ba09f979b25a"),
      img("1553062407-98eeb64c6a62"),
      img("1521572163474-6864f9cf17ab"),
      img("1622260614153-03223fb72052"),
    ],
    variants: [
      { name: "Black / XS", priceModifier: 0, stock: 8 },
      { name: "Black / S", priceModifier: 0, stock: 10 },
      { name: "Black / M", priceModifier: 0, stock: 10 },
      { name: "Black / L", priceModifier: 0, stock: 8 },
      { name: "TNF Red / M", priceModifier: 0, stock: 6 },
    ],
  },
  {
    name: "Uniqlo Ultra Light Down Packable Jacket",
    description: "870 fill-power 100% white duck down in an ultra-light 100% nylon shell. Packs into its own inner pocket and weighs just 230g (S). Windproof and water-resistant with a DWR finish. Minimalist silhouette, two side pockets. Available in 15 colours. Machine washable. Uniqlo's best-selling outerwear for a reason.",
    brand: "Uniqlo", category: "Fashion",
    price: 69.99, unit: "each", rating: 4.6, stock: 105,
    image: img("1587402800671-ba09f979b25a"),
    images: [
      img("1587402800671-ba09f979b25a"),
      img("1539533018447-63fcce2678e3"),
      img("1521572163474-6864f9cf17ab"),
      img("1553062407-98eeb64c6a62"),
      img("1542219550-37153d387c27"),
    ],
    variants: [
      { name: "Black / XS", priceModifier: 0, stock: 18 },
      { name: "Black / S", priceModifier: 0, stock: 20 },
      { name: "Black / M", priceModifier: 0, stock: 20 },
      { name: "Navy / M", priceModifier: 0, stock: 20 },
      { name: "Olive / M", priceModifier: 0, stock: 17 },
      { name: "Navy / L", priceModifier: 0, stock: 10 },
    ],
  },
  {
    name: "Tumi Alpha 3 International Carry-On",
    description: "Ballistic nylon construction — 8× more abrasion-resistant than standard nylon. 22\" × 14\" × 9\" meets most airline carry-on requirements. Dual spinner wheels for effortless rolling. TSA-approved combination lock. Removable USB power-bank pocket. Garment sleeve, suiter, and mesh pockets maximise packing space. 15-year warranty.",
    brand: "Tumi", category: "Fashion",
    price: 795.00, discount: 5, unit: "each", rating: 4.7, stock: 9,
    image: img("1553062407-98eeb64c6a62"),
    images: [
      img("1553062407-98eeb64c6a62"),
      img("1622260614153-03223fb72052"),
      img("1504614579893-bb8a71b49f3e"),
      img("1539533018447-63fcce2678e3"),
      img("1587402800671-ba09f979b25a"),
    ],
    variants: [
      { name: "Black", priceModifier: 0, stock: 5 },
      { name: "Anthracite", priceModifier: 0, stock: 4 },
    ],
  },
  {
    name: "Adidas Ultraboost 24 Running Shoes",
    description: "Primeknit+ upper with adaptive support zones hugs the foot for a distraction-free fit. Boost midsole technology returns energy with every stride. Continental™ rubber outsole for grip on wet and dry surfaces. Linear Energy Push system guides the foot through a smooth heel-to-toe transition. Available in 20+ colourways.",
    brand: "Adidas", category: "Fashion",
    price: 189.99, unit: "pair", rating: 4.6, stock: 56,
    image: img("1542291026-7eec264c27ff"),
    images: [
      img("1542291026-7eec264c27ff"),
      img("1491553154263-9e2f945e8f86"),
      img("1542219550-37153d387c27"),
      img("1521572163474-6864f9cf17ab"),
      img("1539533018447-63fcce2678e3"),
    ],
    variants: [
      { name: "Core Black / US 9", priceModifier: 0, stock: 10 },
      { name: "Core Black / US 10", priceModifier: 0, stock: 12 },
      { name: "Core Black / US 11", priceModifier: 0, stock: 10 },
      { name: "Cloud White / US 9", priceModifier: 0, stock: 12 },
      { name: "Cloud White / US 10", priceModifier: 0, stock: 12 },
    ],
  },
  {
    name: "Canada Goose Expedition Parka",
    description: "The parka that has protected researchers at the South Pole since 1995. 625-fill-power white duck down with a coyote fur ruff that channels airflow away from the face. Arctic Tech® shell: 85% polyester, 15% cotton, rated to -30°C/-22°F. Interior storm cuffs, eight pockets, and a recessed bib with magnetic closures.",
    brand: "Canada Goose", category: "Fashion",
    price: 1095.00, unit: "each", rating: 4.8, stock: 6,
    image: img("1539533018447-63fcce2678e3"),
    images: [
      img("1539533018447-63fcce2678e3"),
      img("1587402800671-ba09f979b25a"),
      img("1553062407-98eeb64c6a62"),
      img("1621072716542-b8678bdebd2f"),
      img("1542219550-37153d387c27"),
    ],
    variants: [
      { name: "Black / S", priceModifier: 0, stock: 2 },
      { name: "Black / M", priceModifier: 0, stock: 2 },
      { name: "Navy / M", priceModifier: 0, stock: 2 },
    ],
  },

  // ── SPORTS & OUTDOORS (continued) ─────────────────────────────────────────
  {
    name: "YETI Tundra 45 Hard Cooler",
    description: "Up to 3 inches of PermaFrost™ insulation keeps ice for days, not hours. Rotomoulded polyethylene is virtually indestructible. Certified Grizzly Bear Resistant. Integrated lid latches, heavy-duty rubber non-slip feet, and tie-down slots. Holds 28 cans of 12oz with a 2:1 ice-to-contents ratio. Proudly over-engineered.",
    brand: "YETI", category: "Sports & Outdoors",
    price: 325.00, unit: "each", rating: 4.8, stock: 17,
    image: img("1504614579893-bb8a71b49f3e"),
    images: [
      img("1504614579893-bb8a71b49f3e"),
      img("1478131143081-80f7f84ca84d"),
      img("1622260614153-03223fb72052"),
      img("1551632811-561732d1e306"),
      img("1544367567-0f2fcb009e0b"),
    ],
    variants: [
      { name: "White", priceModifier: 0, stock: 8 },
      { name: "Tan", priceModifier: 0, stock: 9 },
    ],
  },
  {
    name: "TRX PRO4 Suspension Trainer System",
    description: "Used by elite military units, NFL teams, and Olympic athletes. Fully adjustable suspension straps allow 300+ exercises using bodyweight resistance. Door anchor, suspension anchor, and exercise guide included. Commercial-grade carabiner and military-grade nylon webbing. Fits in a carry pouch the size of a water bottle.",
    brand: "TRX", category: "Sports & Outdoors",
    price: 199.99, discount: 10, unit: "each", rating: 4.6, stock: 44,
    image: img("1598289431512-b97b0917affc"),
    images: [
      img("1598289431512-b97b0917affc"),
      img("1544367567-0f2fcb009e0b"),
      img("1506126613408-eca07ce68773"),
      img("1571019613454-1cb2f99b2d8b"),
      img("1551632811-561732d1e306"),
    ],
  },
  {
    name: "Fitbit Charge 6 Fitness Tracker",
    description: "Built-in Google Maps, Google Wallet, and YouTube Music controls. ECG app and EDA sensor for stress management. 24/7 heart rate and SpO2 monitoring. Active Zone Minutes goal motivates effort in any workout. GPS for outdoor runs and rides. Up to 7 days battery life. Works with Android and iPhone.",
    brand: "Fitbit", category: "Sports & Outdoors",
    price: 159.99, unit: "each", rating: 4.4, stock: 66,
    image: img("1523275335684-37898b6baf30"),
    images: [
      img("1523275335684-37898b6baf30"),
      img("1434494206212-716b93f7a9b9"),
      img("1544367567-0f2fcb009e0b"),
      img("1551632811-561732d1e306"),
      img("1622260614153-03223fb72052"),
    ],
    variants: [
      { name: "Black / Obsidian Band", priceModifier: 0, stock: 35 },
      { name: "Porcelain / White Band", priceModifier: 0, stock: 31 },
    ],
  },
  {
    name: "Patagonia Black Hole 55L Duffel Bag",
    description: "Made from 100% recycled high-tenacity ripstop nylon with a tough TPU laminate. Haul loop and removable shoulder strap for multiple carry options. Lockable main zipper, side grab handles, and stowable shoulder strap. Fits most airline overhead compartments when packed down. BlueSign® approved materials.",
    brand: "Patagonia", category: "Sports & Outdoors",
    price: 169.00, unit: "each", rating: 4.7, stock: 38,
    image: img("1622260614153-03223fb72052"),
    images: [
      img("1622260614153-03223fb72052"),
      img("1553062407-98eeb64c6a62"),
      img("1504614579893-bb8a71b49f3e"),
      img("1478131143081-80f7f84ca84d"),
      img("1551632811-561732d1e306"),
    ],
    variants: [
      { name: "Black", priceModifier: 0, stock: 15 },
      { name: "Ink Black", priceModifier: 0, stock: 12 },
      { name: "Passage Blue", priceModifier: 0, stock: 11 },
    ],
  },
  {
    name: "Callaway Strata Ultimate 16-Piece Men's Golf Set",
    description: "Complete set for beginners through mid-handicappers. Includes 460cc titanium driver, 3-wood, 5-hybrid, 6-9 irons (stainless steel), pitching wedge, sand wedge, and putter. Cart bag with 14 individual club dividers, 6 pockets, and rain hood. Graphite shafts in woods and hybrid for maximum distance.",
    brand: "Callaway", category: "Sports & Outdoors",
    price: 499.99, discount: 12, unit: "set", rating: 4.5, stock: 13,
    image: img("1554068865-24ceec13d6c2"),
    images: [
      img("1554068865-24ceec13d6c2"),
      img("1598289431512-b97b0917affc"),
      img("1622260614153-03223fb72052"),
      img("1504614579893-bb8a71b49f3e"),
      img("1544367567-0f2fcb009e0b"),
    ],
  },
  {
    name: "Hydro Flask 40oz Wide Mouth Tumbler with Straw Lid",
    description: "Leak-proof straw lid allows one-handed drinking. TempShield™ double-wall vacuum insulation maintains temperatures. Keeps beverages cold up to 24 hours and hot up to 12 hours. 18/8 pro-grade stainless steel, BPA-free, and phthalate-free. Wide mouth opening fits standard ice cubes. Honeycomb slip-free base.",
    brand: "Hydro Flask", category: "Sports & Outdoors",
    price: 54.99, unit: "each", rating: 4.8, stock: 118,
    image: img("1602143407151-7111542de6e8"),
    images: [
      img("1602143407151-7111542de6e8"),
      img("1544367567-0f2fcb009e0b"),
      img("1622260614153-03223fb72052"),
      img("1478131143081-80f7f84ca84d"),
      img("1504614579893-bb8a71b49f3e"),
    ],
    variants: [
      { name: "Black", priceModifier: 0, stock: 40 },
      { name: "Indigo", priceModifier: 0, stock: 38 },
      { name: "Flamingo (Pink)", priceModifier: 0, stock: 40 },
    ],
  },
  {
    name: "Lululemon ABC Slim-Fit Trouser 34\"",
    description: "ABC (Anti-Ball Crushing) technology with Warpstreme™ fabric delivers a tailored look with athletic performance. Four-way stretch, moisture-wicking, and wrinkle-resistant for meetings, travel, and weekend wear. Hidden waistband elastic, secure back pockets, and articulated knees. Machine washable. The only trousers you'll ever need.",
    brand: "Lululemon", category: "Sports & Outdoors",
    price: 128.00, unit: "each", rating: 4.7, stock: 75,
    image: img("1542219550-37153d387c27"),
    images: [
      img("1542219550-37153d387c27"),
      img("1521572163474-6864f9cf17ab"),
      img("1539533018447-63fcce2678e3"),
      img("1544367567-0f2fcb009e0b"),
      img("1571019613454-1cb2f99b2d8b"),
    ],
    variants: [
      { name: "Black / 30\"", priceModifier: 0, stock: 15 },
      { name: "Black / 32\"", priceModifier: 0, stock: 20 },
      { name: "Black / 34\"", priceModifier: 0, stock: 20 },
      { name: "Heathered Graphite / 32\"", priceModifier: 0, stock: 20 },
    ],
  },

  // ── BEAUTY (continued) ────────────────────────────────────────────────────
  {
    name: "Tatcha The Water Cream Oil-Free Moisturiser 50ml",
    description: "Japanese skincare ritual in a water-burst moisturiser that delivers continuous hydration without heaviness. Hadasei-3™ complex of green tea, rice, and Okinawa algae locks in moisture while Japanese wild rose exfoliates and smooths. Oil-free, fragrance-free, and dermatologist-tested. Perfect under makeup.",
    brand: "Tatcha", category: "Beauty",
    price: 72.00, unit: "each", rating: 4.6, stock: 38,
    image: img("1571781926291-c477ebfd024b"),
    images: [
      img("1571781926291-c477ebfd024b"),
      img("1556228720-195a672e8a03"),
      img("1556228578-8c89e6adf883"),
      img("1596462502278-27bfdc403348"),
      img("1556228453-efd6c1ff04f6"),
    ],
  },
  {
    name: "Fenty Beauty Pro Filt'r Soft Matte Foundation 30ml",
    description: "The shade-inclusive foundation that changed the beauty industry, now with an improved formula. 50 shades covering very fair to very deep with neutral, warm, pink, olive, and neutral undertones. Matte finish reduces shine for up to 24 hours. Buildable medium-to-full coverage. Fragrance-free. Developed by Rihanna.",
    brand: "Fenty Beauty", category: "Beauty",
    price: 40.00, unit: "each", rating: 4.6, stock: 95,
    image: img("1596462502278-27bfdc403348"),
    images: [
      img("1596462502278-27bfdc403348"),
      img("1556228720-195a672e8a03"),
      img("1571781926291-c477ebfd024b"),
      img("1556228578-8c89e6adf883"),
      img("1556228453-efd6c1ff04f6"),
    ],
    variants: [
      { name: "120N (Fair, Neutral)", priceModifier: 0, stock: 15 },
      { name: "185N (Light-Medium, Neutral)", priceModifier: 0, stock: 20 },
      { name: "240W (Medium, Warm)", priceModifier: 0, stock: 25 },
      { name: "360N (Rich, Neutral)", priceModifier: 0, stock: 20 },
      { name: "490N (Deep, Neutral)", priceModifier: 0, stock: 15 },
    ],
  },
  {
    name: "Kiehl's Ultra Facial Cream 50ml",
    description: "24-hour hydration with Imperata Cylindrica Plant Extract that acts as a natural moisturising factor to retain moisture in dry climates. Lightweight, non-greasy texture absorbs in seconds. Suitable for all skin types, fragrance-free, and non-comedogenic. Kiehl's most beloved formula since 1983. Dermatologist-tested.",
    brand: "Kiehl's", category: "Beauty",
    price: 38.00, unit: "each", rating: 4.6, stock: 145,
    image: img("1556228720-195a672e8a03"),
    images: [
      img("1556228720-195a672e8a03"),
      img("1571781926291-c477ebfd024b"),
      img("1556228453-efd6c1ff04f6"),
      img("1596462502278-27bfdc403348"),
      img("1556228578-8c89e6adf883"),
    ],
  },
  {
    name: "Sunday Riley Good Genes All-In-One Lactic Acid Treatment 30ml",
    description: "Purified lactic acid exfoliates to instantly resurface, plump, and retexturize skin while pycnogenol and licorice root brighten hyperpigmentation. Results visible in one use: improved texture, reduced pores, and a lit-from-within glow. Apply at night after cleansing. Compatible with niacinamide and vitamin C serums.",
    brand: "Sunday Riley", category: "Beauty",
    price: 85.00, unit: "each", rating: 4.7, stock: 42,
    image: img("1596462502278-27bfdc403348"),
    images: [
      img("1596462502278-27bfdc403348"),
      img("1571781926291-c477ebfd024b"),
      img("1556228720-195a672e8a03"),
      img("1556228578-8c89e6adf883"),
      img("1556228453-efd6c1ff04f6"),
    ],
  },
  {
    name: "Foreo Luna 4 Face Cleansing Device — Normal Skin",
    description: "16 T-Sonic™ micro-vibration intensities through ultra-hygienic non-porous silicone remove 99.5% of dirt, oil, and makeup in just 60 seconds. App-controlled with 16 personalised cleansing routines. 650 uses per charge. Lasts up to 10 years with daily use. FSA/HSA eligible. Waterproof for use in the shower.",
    brand: "Foreo", category: "Beauty",
    price: 199.00, discount: 10, unit: "each", rating: 4.6, stock: 26,
    image: img("1559190394-df5a28aab5c5"),
    images: [
      img("1559190394-df5a28aab5c5"),
      img("1556228720-195a672e8a03"),
      img("1571781926291-c477ebfd024b"),
      img("1596462502278-27bfdc403348"),
      img("1556228453-efd6c1ff04f6"),
    ],
    variants: [
      { name: "Pearl Pink", priceModifier: 0, stock: 9 },
      { name: "Midnight (Black)", priceModifier: 0, stock: 9 },
      { name: "Fuchsia", priceModifier: 0, stock: 8 },
    ],
  },
  {
    name: "NARS Soft Matte Complete Concealer",
    description: "Creamy, full-coverage concealer with a natural matte finish that conceals dark circles, discolouration, and blemishes. Enriched with hyaluronic acid and caffeine to hydrate and reduce the appearance of puffiness. Buildable coverage, transfer-resistant, and long-lasting up to 24 hours. Available in 30 shades.",
    brand: "NARS", category: "Beauty",
    price: 32.00, unit: "each", rating: 4.6, stock: 88,
    image: img("1556228578-8c89e6adf883"),
    images: [
      img("1556228578-8c89e6adf883"),
      img("1596462502278-27bfdc403348"),
      img("1571781926291-c477ebfd024b"),
      img("1556228720-195a672e8a03"),
      img("1556228453-efd6c1ff04f6"),
    ],
    variants: [
      { name: "Chantilly (Fair)", priceModifier: 0, stock: 15 },
      { name: "Vanilla (Light)", priceModifier: 0, stock: 20 },
      { name: "Caramel (Medium-Dark)", priceModifier: 0, stock: 25 },
      { name: "Truffle (Deep)", priceModifier: 0, stock: 28 },
    ],
  },
  {
    name: "Malin+Goetz Peppermint Shampoo 473ml",
    description: "Amino acid-based formula with spearmint and peppermint extracts gently cleanses without stripping natural oils. Suitable for all hair types including colour-treated and chemically processed. Scalp-tingling mint sensation. Sulphate-free, paraben-free, and fragrance-compliant. Vegan and cruelty-free. Pair with the matching conditioner.",
    brand: "Malin+Goetz", category: "Beauty",
    price: 34.00, unit: "each", rating: 4.5, stock: 62,
    image: img("1535585209827-a15fcdbc4c2d"),
    images: [
      img("1535585209827-a15fcdbc4c2d"),
      img("1556228720-195a672e8a03"),
      img("1571781926291-c477ebfd024b"),
      img("1596462502278-27bfdc403348"),
      img("1559190394-df5a28aab5c5"),
    ],
  },

  // ── BOOKS & MEDIA (continued) ─────────────────────────────────────────────
  {
    name: "The Psychology of Money by Morgan Housel",
    description: "19 short stories exploring the strange ways people think about money. Morgan Housel argues that doing well with money has little to do with how smart you are and a lot to do with how you behave — and behaviour is hard to teach, even to very smart people. One of the most-recommended personal finance books of the decade.",
    brand: "Harriman House", category: "Books & Media",
    price: 19.99, unit: "each", rating: 4.8, stock: 163,
    image: img("1512820790803-83ca734da794"),
    images: [
      img("1512820790803-83ca734da794"),
      img("1495640388908-05fa85288e61"),
      img("1524995997946-a1c2e315a42f"),
      img("1456513080510-7bf3a84b82f8"),
      img("1507048331197-7d4ac70811cf"),
    ],
  },
  {
    name: "Project Hail Mary by Andy Weir",
    description: "A lone astronaut wakes up in space with no memory of how he got there or his mission. As he pieces together the clues, he discovers he may be the only hope for Earth's survival. Full of hard science, ingenious problem-solving, and one of the most heartwarming inter-species friendships in science fiction. By the author of The Martian.",
    brand: "Ballantine Books", category: "Books & Media",
    price: 18.99, unit: "each", rating: 4.9, stock: 138,
    image: img("1495640388908-05fa85288e61"),
    images: [
      img("1495640388908-05fa85288e61"),
      img("1512820790803-83ca734da794"),
      img("1524995997946-a1c2e315a42f"),
      img("1603048297172-c92544798d5a"),
      img("1507048331197-7d4ac70811cf"),
    ],
  },
  {
    name: "Never Split the Difference by Chris Voss",
    description: "Former FBI lead hostage negotiator Chris Voss shares the communication strategies he developed to get the best possible outcome in impossible situations — from freeing hostages to buying a car. Powerful techniques including Tactical Empathy, the Accusation Audit, and the Calibrated Question that anyone can use in everyday negotiations.",
    brand: "HarperBusiness", category: "Books & Media",
    price: 17.99, unit: "each", rating: 4.8, stock: 121,
    image: img("1524995997946-a1c2e315a42f"),
    images: [
      img("1524995997946-a1c2e315a42f"),
      img("1512820790803-83ca734da794"),
      img("1495640388908-05fa85288e61"),
      img("1456513080510-7bf3a84b82f8"),
      img("1507048331197-7d4ac70811cf"),
    ],
  },
  {
    name: "Thinking, Fast and Slow by Daniel Kahneman",
    description: "Nobel laureate Daniel Kahneman's accessible distillation of a lifetime of research into human cognition. Explains System 1 (fast, intuitive, emotional) and System 2 (slow, deliberate, logical) thinking and reveals the systematic biases, heuristics, and cognitive errors that affect our decisions at home, at work, and in the world.",
    brand: "Farrar, Straus and Giroux", category: "Books & Media",
    price: 19.99, unit: "each", rating: 4.7, stock: 89,
    image: img("1456513080510-7bf3a84b82f8"),
    images: [
      img("1456513080510-7bf3a84b82f8"),
      img("1512820790803-83ca734da794"),
      img("1495640388908-05fa85288e61"),
      img("1524995997946-a1c2e315a42f"),
      img("1507048331197-7d4ac70811cf"),
    ],
  },
  {
    name: "Sapiens: A Brief History of Humankind by Yuval Noah Harari",
    description: "How did Homo sapiens come to dominate the Earth? Harari spans the entire history of human existence — from the first stone tools to the atomic bomb — to examine the cognitive, agricultural, and scientific revolutions that shaped civilization. A global phenomenon translated into 65 languages and credited with changing worldviews.",
    brand: "Harper", category: "Books & Media",
    price: 20.99, unit: "each", rating: 4.7, stock: 106,
    image: img("1507048331197-7d4ac70811cf"),
    images: [
      img("1507048331197-7d4ac70811cf"),
      img("1512820790803-83ca734da794"),
      img("1495640388908-05fa85288e61"),
      img("1524995997946-a1c2e315a42f"),
      img("1456513080510-7bf3a84b82f8"),
    ],
  },
  {
    name: "Shoe Dog: A Memoir by the Creator of Nike by Phil Knight",
    description: "The story of how a 24-year-old with $50 of borrowed money built one of the world's most iconic brands. Phil Knight shares the risks, struggles, and triumphs behind Nike's creation — the eccentric employees, the lawsuits with rivals, the bankruptcy threats, and the relentless obsession with sport and design. A rare, genuinely humble business memoir.",
    brand: "Scribner", category: "Books & Media",
    price: 18.00, unit: "each", rating: 4.8, stock: 97,
    image: img("1512820790803-83ca734da794"),
    images: [
      img("1512820790803-83ca734da794"),
      img("1495640388908-05fa85288e61"),
      img("1456513080510-7bf3a84b82f8"),
      img("1524995997946-a1c2e315a42f"),
      img("1507048331197-7d4ac70811cf"),
    ],
  },
  {
    name: "The Lean Startup by Eric Ries",
    description: "How modern companies create and manage successful products. Ries introduces the Build-Measure-Learn feedback loop and the concept of validated learning — a rigorous method for testing business assumptions and pivoting quickly when they fail. Essential reading for entrepreneurs, product managers, and anyone building something new in an uncertain environment.",
    brand: "Crown Business", category: "Books & Media",
    price: 18.99, unit: "each", rating: 4.5, stock: 82,
    image: img("1456513080510-7bf3a84b82f8"),
    images: [
      img("1456513080510-7bf3a84b82f8"),
      img("1512820790803-83ca734da794"),
      img("1524995997946-a1c2e315a42f"),
      img("1507048331197-7d4ac70811cf"),
      img("1495640388908-05fa85288e61"),
    ],
  },
  {
    name: "Vinyl Record Cleaner Kit — 4-in-1 Complete Set",
    description: "Velvet cleaning brush, anti-static carbon fibre brush, cleaning solution (250ml, alcohol-free), and micro-fibre drying cloth. Compatible with all vinyl records (7\", 10\", 12\"). The cleaning solution removes fingerprints, dust, and static without damaging the groove. Essential maintenance kit for any serious vinyl collection.",
    brand: "Boundless Audio", category: "Books & Media",
    price: 29.99, unit: "kit", rating: 4.5, stock: 110,
    image: img("1603048297172-c92544798d5a"),
    images: [
      img("1603048297172-c92544798d5a"),
      img("1512820790803-83ca734da794"),
      img("1484704849700-f032d85b5d83"),
      img("1524995997946-a1c2e315a42f"),
      img("1608043152269-423dbba4e7e1"),
    ],
  },

  // ── TOYS & GAMES (continued) ──────────────────────────────────────────────
  {
    name: "LEGO Technic McLaren Senna GTR 42123 — 830 Pieces",
    description: "A 1:8 scale replica of the McLaren Senna GTR race car with an opening hood revealing the detailed V8 engine, steerable front wheels, opening doors, and aerodynamic rear wing. 830 pieces for an immersive build that captures the curves and aerodynamic details of the real car. Includes a collector's plaque. For ages 10+.",
    brand: "LEGO", category: "Toys & Games",
    price: 74.99, unit: "each", rating: 4.7, stock: 28,
    image: img("1587654780291-39c9404d746b"),
    images: [
      img("1587654780291-39c9404d746b"),
      img("1611996575749-79a3a250f948"),
      img("1558864566-73e81d84e59c"),
      img("1566576912321-d58ddd7a6088"),
      img("1559715745-e1b33a271c8f"),
    ],
  },
  {
    name: "Nintendo Switch Pro Controller",
    description: "The premium controller for Nintendo Switch TV mode. Traditional button layout with full motion controls, HD rumble, and built-in amiibo reader. 40-hour battery life via USB-C. Ergonomic contoured grip for extended play sessions. Compatible with all Nintendo Switch games. Includes USB charging cable.",
    brand: "Nintendo", category: "Toys & Games",
    price: 69.99, unit: "each", rating: 4.7, stock: 74,
    image: img("1493711662062-fa541aff3208"),
    images: [
      img("1493711662062-fa541aff3208"),
      img("1609921213416-c8f1c3ebad80"),
      img("1558864566-73e81d84e59c"),
      img("1566576912321-d58ddd7a6088"),
      img("1587654780291-39c9404d746b"),
    ],
    variants: [
      { name: "Black", priceModifier: 0, stock: 40 },
      { name: "Splatoon 3 Edition", priceModifier: 10, stock: 34 },
    ],
  },
  {
    name: "Monopoly Classic Board Game",
    description: "The world's most popular family board game, now with updated contemporary tokens and revised Community Chest cards for a fresh take on the classic. Buy, sell, and trade iconic properties from Boardwalk to Mediterranean Avenue. Includes 8 tokens, 28 Title Deed cards, 16 Community Chest and 16 Chance cards, 2 dice, and paper money. For 2–8 players, ages 8+.",
    brand: "Hasbro", category: "Toys & Games",
    price: 26.99, unit: "each", rating: 4.5, stock: 92,
    image: img("1611996575749-79a3a250f948"),
    images: [
      img("1611996575749-79a3a250f948"),
      img("1558864566-73e81d84e59c"),
      img("1566576912321-d58ddd7a6088"),
      img("1587654780291-39c9404d746b"),
      img("1559715745-e1b33a271c8f"),
    ],
  },
  {
    name: "Rubik's Cube 3×3 Speedcube Edition",
    description: "The world's best-selling puzzle toy with a re-engineered design for smooth, effortless turning. Designed for speed-solving with a core tension mechanism for consistent performance. Frosted plastic tiles instead of stickers for durability — no peeling, ever. 43 quintillion combinations. Includes solution guide and carrying stand.",
    brand: "Rubik's", category: "Toys & Games",
    price: 19.99, unit: "each", rating: 4.5, stock: 155,
    image: img("1558864566-73e81d84e59c"),
    images: [
      img("1558864566-73e81d84e59c"),
      img("1611996575749-79a3a250f948"),
      img("1566576912321-d58ddd7a6088"),
      img("1587654780291-39c9404d746b"),
      img("1559715745-e1b33a271c8f"),
    ],
  },
  {
    name: "Melissa & Doug Wooden Building Blocks Set — 100pc",
    description: "100 smooth, natural hardwood blocks in 9 classic shapes and 4 colours (natural, red, blue, yellow). Develops fine motor skills, spatial reasoning, and creative problem-solving. Sturdy wooden storage crate doubles as a building platform. ASTM-certified non-toxic paint. Suitable for ages 2+. A timeless toy that lasts generations.",
    brand: "Melissa & Doug", category: "Toys & Games",
    price: 34.99, unit: "set", rating: 4.7, stock: 63,
    image: img("1559715745-e1b33a271c8f"),
    images: [
      img("1559715745-e1b33a271c8f"),
      img("1566576912321-d58ddd7a6088"),
      img("1558864566-73e81d84e59c"),
      img("1587654780291-39c9404d746b"),
      img("1611996575749-79a3a250f948"),
    ],
  },
  {
    name: "Dungeons & Dragons Starter Set: Dragons of Stormwreck Isle",
    description: "The easiest way to start playing the world's greatest roleplaying game. Includes a rulebook for new players (48 pages), an adventure module set on a dragon-haunted island, 5 pre-made character sheets, and 6 polyhedral dice. Designed for 1 Dungeon Master and 2–5 players, ages 12+. No experience needed — the adventure guides you.",
    brand: "Wizards of the Coast", category: "Toys & Games",
    price: 19.99, unit: "each", rating: 4.7, stock: 81,
    image: img("1566576912321-d58ddd7a6088"),
    images: [
      img("1566576912321-d58ddd7a6088"),
      img("1611996575749-79a3a250f948"),
      img("1558864566-73e81d84e59c"),
      img("1587654780291-39c9404d746b"),
      img("1559715745-e1b33a271c8f"),
    ],
  },
  {
    name: "Codenames Party Card Game",
    description: "Two rival spymasters know the secret identities of 25 agents. Their teammates know only their codenames. The spymasters give one-word clues that connect multiple cards — their teams try to guess the right codenames while avoiding assassins. Fast-paced, works brilliantly with 4–10 players. Ages 14+. Playtime 15–30 minutes.",
    brand: "Czech Games Edition", category: "Toys & Games",
    price: 24.99, unit: "each", rating: 4.8, stock: 79,
    image: img("1611996575749-79a3a250f948"),
    images: [
      img("1611996575749-79a3a250f948"),
      img("1558864566-73e81d84e59c"),
      img("1566576912321-d58ddd7a6088"),
      img("1559715745-e1b33a271c8f"),
      img("1587654780291-39c9404d746b"),
    ],
  },

  // ── GARDEN & TOOLS (continued) ────────────────────────────────────────────
  {
    name: "EGO Power+ 21\" 56V Cordless Self-Propelled Lawn Mower",
    description: "56V ARC Lithium™ battery delivers the performance of gas without the noise, fumes, or maintenance. 21-inch steel deck with 6 cutting height positions (1.5–4\"). Self-propelled with variable speed up to 3 MPH. 7-position single-lever height adjustment. Includes 7.5Ah battery and 550W rapid charger — cuts up to ½ acre on a single charge.",
    brand: "EGO", category: "Garden & Tools",
    price: 549.99, discount: 10, unit: "each", rating: 4.7, stock: 12,
    image: img("1416879595882-3373a0480b5b"),
    images: [
      img("1416879595882-3373a0480b5b"),
      img("1504148455328-c376907d081c"),
      img("1614594975525-e45190c55d0b"),
      img("1585937421612-70a008356fbe"),
      img("1478131143081-80f7f84ca84d"),
    ],
  },
  {
    name: "Greenworks 40V Cordless String Trimmer/Edger Combo",
    description: "2-in-1 string trimmer and edger with 13-inch cutting diameter. 40V brushless motor delivers gas-comparable power. Auto-line feed advances line automatically — no bumping. Converts from trimmer to edger in seconds with a rotating head. Telescoping shaft adjusts to any user height. Battery and charger included.",
    brand: "Greenworks", category: "Garden & Tools",
    price: 149.99, unit: "each", rating: 4.5, stock: 32,
    image: img("1416879595882-3373a0480b5b"),
    images: [
      img("1416879595882-3373a0480b5b"),
      img("1614594975525-e45190c55d0b"),
      img("1504148455328-c376907d081c"),
      img("1478131143081-80f7f84ca84d"),
      img("1585937421612-70a008356fbe"),
    ],
  },
  {
    name: "Nest Learning Thermostat (4th Gen)",
    description: "The first thermostat to earn ENERGY STAR® certification. Learns your schedule and preferences in the first week and starts automatically adjusting to save energy when you leave. Home/Away Assist detects when you're away. Matter-compatible for the widest smart home ecosystem support. Stainless steel build with a crisp round display.",
    brand: "Google Nest", category: "Garden & Tools",
    price: 279.99, unit: "each", rating: 4.7, stock: 44,
    image: img("1614594975525-e45190c55d0b"),
    images: [
      img("1614594975525-e45190c55d0b"),
      img("1547826039-a468e6ebdd7f"),
      img("1593642632559-0c6d3fc62b89"),
      img("1416879595882-3373a0480b5b"),
      img("1504148455328-c376907d081c"),
    ],
    variants: [
      { name: "Polished Steel", priceModifier: 0, stock: 24 },
      { name: "Brass", priceModifier: 0, stock: 20 },
    ],
  },
  {
    name: "Ring Video Doorbell Pro 2",
    description: "1536p HD video with Head-to-Toe View captures more of what's at your door. 3D Motion Detection with Bird's Eye View maps the exact location of detected motion in your front yard. Two-way talk with noise cancellation. Dual-band Wi-Fi. Works with Alexa — announce visitors on Echo devices. Professional installation recommended.",
    brand: "Ring", category: "Garden & Tools",
    price: 249.99, discount: 15, unit: "each", rating: 4.5, stock: 38,
    image: img("1614594975525-e45190c55d0b"),
    images: [
      img("1614594975525-e45190c55d0b"),
      img("1593642632559-0c6d3fc62b89"),
      img("1547826039-a468e6ebdd7f"),
      img("1416879595882-3373a0480b5b"),
      img("1504148455328-c376907d081c"),
    ],
  },
  {
    name: "Radius Garden 22011 Pro Lite Ergonomic Handle",
    description: "Patented ergonomic handle design rotates from horizontal to vertical positions, reducing wrist fatigue by 40% according to independent testing. Fibreglass shaft absorbs vibration. Carbon-steel blade with hardened tip for tough soils. Compatible with Radius trowels, weeders, and cultivators sold separately. Perfect for raised beds.",
    brand: "Radius Garden", category: "Garden & Tools",
    price: 29.99, unit: "each", rating: 4.4, stock: 88,
    image: img("1416879595882-3373a0480b5b"),
    images: [
      img("1416879595882-3373a0480b5b"),
      img("1504148455328-c376907d081c"),
      img("1614594975525-e45190c55d0b"),
      img("1585937421612-70a008356fbe"),
      img("1478131143081-80f7f84ca84d"),
    ],
  },
  {
    name: "Miracle-Gro Performance Organics All Purpose Plant Nutrition",
    description: "OMRI-listed for organic gardening. Fast-acting organic formula feeds plants instantly through roots and leaves. No mixing — just use the EZ-Pour spout. Works on in-ground plants, container gardens, and raised beds. For vegetables, herbs, flowers, and houseplants. 2× more food production than unfed plants in head-to-head testing.",
    brand: "Miracle-Gro", category: "Garden & Tools",
    price: 24.99, unit: "each", rating: 4.5, stock: 120,
    image: img("1416879595882-3373a0480b5b"),
    images: [
      img("1416879595882-3373a0480b5b"),
      img("1478131143081-80f7f84ca84d"),
      img("1504148455328-c376907d081c"),
      img("1585937421612-70a008356fbe"),
      img("1614594975525-e45190c55d0b"),
    ],
  },
  {
    name: "Ryobi ONE+ 18V Cordless Circular Saw (PCW10B — Tool Only)",
    description: "7¼-inch blade with 4,500 RPM for fast, accurate cuts through dimensional lumber, plywood, and OSB. 51.5° bevelling capacity and laser guide for precision. Lightweight at just 4.9 lbs. Works with any ONE+ 18V battery (not included). Tool-free blade change for quick transitions between cuts.",
    brand: "Ryobi", category: "Garden & Tools",
    price: 79.99, unit: "each", rating: 4.5, stock: 53,
    image: img("1504148455328-c376907d081c"),
    images: [
      img("1504148455328-c376907d081c"),
      img("1416879595882-3373a0480b5b"),
      img("1614594975525-e45190c55d0b"),
      img("1551632811-561732d1e306"),
      img("1585937421612-70a008356fbe"),
    ],
  },
  {
    name: "Keter Easy Grow 31.7-Gal Elevated Garden Bed",
    description: "Double-walled resin construction won't rot, rust, or splinter — looks like natural wood. Elevated 33-inch working height eliminates bending. Built-in water reservoir with fill indicator reduces watering frequency. 31.7-gallon soil capacity supports tomatoes, peppers, herbs, and flowers. Tool-free assembly in 15 minutes.",
    brand: "Keter", category: "Garden & Tools",
    price: 149.99, unit: "each", rating: 4.4, stock: 27,
    image: img("1478131143081-80f7f84ca84d"),
    images: [
      img("1478131143081-80f7f84ca84d"),
      img("1416879595882-3373a0480b5b"),
      img("1614594975525-e45190c55d0b"),
      img("1504614579893-bb8a71b49f3e"),
      img("1585937421612-70a008356fbe"),
    ],
    variants: [
      { name: "Brown", priceModifier: 0, stock: 15 },
      { name: "Graphite", priceModifier: 0, stock: 12 },
    ],
  },

  // ── OFFICE (continued) ────────────────────────────────────────────────────
  {
    name: "Autonomous SmartDesk Pro Sit-Stand Desk",
    description: "Dual-motor electric sit-stand desk with a whisper-quiet motor lifting 310 lbs. Height range 27.5–47.2 inches with four programmable memory presets. 53\" × 29\" work surface in solid bamboo. Anti-collision detection stops the desk if it encounters an obstacle. 5-year warranty on the frame and motor. Available in multiple surface finishes.",
    brand: "Autonomous", category: "Office",
    price: 499.99, discount: 10, unit: "each", rating: 4.5, stock: 19,
    image: img("1593642632559-0c6d3fc62b89"),
    images: [
      img("1593642632559-0c6d3fc62b89"),
      img("1547826039-a468e6ebdd7f"),
      img("1587829741301-dc798b83add3"),
      img("1517842645767-c639042777db"),
      img("1527864550417-7519ae9c05c5"),
    ],
    variants: [
      { name: "Black Frame / Black Top", priceModifier: 0, stock: 7 },
      { name: "Black Frame / Bamboo Top", priceModifier: 50, stock: 7 },
      { name: "White Frame / White Top", priceModifier: 0, stock: 5 },
    ],
  },
  {
    name: "Elgato Key Light Air",
    description: "Professional streaming and video call lighting with 1400-lumen output and 2900–7000K colour temperature range. Ultra-compact at just 13.8 inches — perfect for smaller desks. App and direct control via panel buttons. Compatible with Home Screen Layouts on the Elgato Stream Deck. Wi-Fi connected, works with Mac and PC.",
    brand: "Elgato", category: "Office",
    price: 129.99, unit: "each", rating: 4.6, stock: 48,
    image: img("1595044426077-d36d9236d54a"),
    images: [
      img("1595044426077-d36d9236d54a"),
      img("1587829741301-dc798b83add3"),
      img("1527864550417-7519ae9c05c5"),
      img("1593642632559-0c6d3fc62b89"),
      img("1547826039-a468e6ebdd7f"),
    ],
  },
  {
    name: "Blue Yeti X Professional USB Microphone",
    description: "Condenser capsule array with four pickup pattern modes (cardioid, bidirectional, omnidirectional, stereo) via a single USB-C connection. Built-in LED metering for real-time audio monitoring. High-res 24-bit/48kHz recording. Integrated Blue VO!CE software with HD samples, effects, and smart knob controls. No drivers required.",
    brand: "Blue", category: "Office",
    price: 169.99, unit: "each", rating: 4.6, stock: 36,
    image: img("1563770660941-10b7a86236e9"),
    images: [
      img("1563770660941-10b7a86236e9"),
      img("1595044426077-d36d9236d54a"),
      img("1587829741301-dc798b83add3"),
      img("1527864550417-7519ae9c05c5"),
      img("1593642632559-0c6d3fc62b89"),
    ],
    variants: [
      { name: "Blackout", priceModifier: 0, stock: 20 },
      { name: "Midnight Blue", priceModifier: 0, stock: 16 },
    ],
  },
  {
    name: "Shure MV7 USB/XLR Dynamic Podcast Microphone",
    description: "Designed for podcasting, streaming, recording, and gaming. Switchable USB and XLR outputs for use with computers and audio interfaces. Built-in headphone monitoring with zero-latency. Tap-to-mute, adjustable gain, and microphone monitoring via ShurePlus MOTIV app. All-metal construction built to last decades. Used by top podcasters worldwide.",
    brand: "Shure", category: "Office",
    price: 249.99, unit: "each", rating: 4.7, stock: 27,
    image: img("1563770660941-10b7a86236e9"),
    images: [
      img("1563770660941-10b7a86236e9"),
      img("1595044426077-d36d9236d54a"),
      img("1587829741301-dc798b83add3"),
      img("1593642632559-0c6d3fc62b89"),
      img("1527864550417-7519ae9c05c5"),
    ],
    variants: [
      { name: "Black", priceModifier: 0, stock: 17 },
      { name: "Silver", priceModifier: 0, stock: 10 },
    ],
  },
  {
    name: "MOFT Laptop Stand — Invisible and Adjustable",
    description: "Ultra-thin 2.9mm when folded — virtually invisible attached to your laptop. Adhesive backing uses nano-suction technology for tool-free attachment and reattachment without residue. Two ergonomic tilt angles (15° and 25°) for better posture. Supports up to 22 lbs. Compatible with MacBooks and most 11–15-inch laptops.",
    brand: "MOFT", category: "Office",
    price: 34.99, unit: "each", rating: 4.4, stock: 182,
    image: img("1527864550417-7519ae9c05c5"),
    images: [
      img("1527864550417-7519ae9c05c5"),
      img("1593642632559-0c6d3fc62b89"),
      img("1587829741301-dc798b83add3"),
      img("1547826039-a468e6ebdd7f"),
      img("1595044426077-d36d9236d54a"),
    ],
    variants: [
      { name: "Black", priceModifier: 0, stock: 60 },
      { name: "Silver", priceModifier: 0, stock: 60 },
      { name: "Khaki", priceModifier: 0, stock: 62 },
    ],
  },
  {
    name: "Ergotron LX Tall Pole Monitor Arm",
    description: "Postive stop™ friction mechanism holds monitor in exact position you leave it — no creep. Full motion: 75° tilt, 360° rotation, ±45° pan, and 13-inch height adjustment. Integated cable management keeps desk tidy. VESA 75/100 compatible. Supports monitors 7–25 lbs. Desk clamp and grommet mount included. Available in white or matte black.",
    brand: "Ergotron", category: "Office",
    price: 169.99, unit: "each", rating: 4.7, stock: 41,
    image: img("1547826039-a468e6ebdd7f"),
    images: [
      img("1547826039-a468e6ebdd7f"),
      img("1593642632559-0c6d3fc62b89"),
      img("1587829741301-dc798b83add3"),
      img("1527864550417-7519ae9c05c5"),
      img("1595044426077-d36d9236d54a"),
    ],
    variants: [
      { name: "Matte Black", priceModifier: 0, stock: 22 },
      { name: "White", priceModifier: 0, stock: 19 },
    ],
  },
  {
    name: "Post-it Super Sticky Notes Variety Pack — 15 Pads",
    description: "2× the sticking power of original Post-it Notes. Repositionable adhesive holds on rough walls, glass, outdoor surfaces, and more without leaving residue. Assorted pack includes 3-in and 4-in squares in Tropical Breeze, Power Pink, and Bright Neon colour collections. 90 sheets per pad. 1,350 notes total.",
    brand: "Post-it", category: "Office",
    price: 22.99, unit: "pack", rating: 4.7, stock: 195,
    image: img("1517842645767-c639042777db"),
    images: [
      img("1517842645767-c639042777db"),
      img("1456513080510-7bf3a84b82f8"),
      img("1593642632559-0c6d3fc62b89"),
      img("1512820790803-83ca734da794"),
      img("1547826039-a468e6ebdd7f"),
    ],
  },
  {
    name: "Fellowes Powershred 99Ci Cross-Cut Paper Shredder",
    description: "100% Jam Proof™ motor with SureFeed™ technology automatically reduces paper to prevent jams — guaranteed. Cross-cuts 18 sheets per pass into 2,153 security-level P-4 particles. Shreds CDs, DVDs, staples, paper clips, and credit cards. 8-gallon pullout bin. Safe-Sense® technology pauses shredding when hands touch the paper opening. Auto-start/stop.",
    brand: "Fellowes", category: "Office",
    price: 199.99, discount: 15, unit: "each", rating: 4.5, stock: 22,
    image: img("1593642632559-0c6d3fc62b89"),
    images: [
      img("1593642632559-0c6d3fc62b89"),
      img("1547826039-a468e6ebdd7f"),
      img("1517842645767-c639042777db"),
      img("1587829741301-dc798b83add3"),
      img("1527864550417-7519ae9c05c5"),
    ],
  },

  // ── GROCERIES & PANTRY (continued) ────────────────────────────────────────
  {
    name: "Hu Kitchen Dark Chocolate Bars Variety 4-Pack",
    description: "Paleo and vegan chocolate bars made with just three ingredients: organic cacao, organic unrefined coconut sugar, and organic fair-trade cocoa butter. No refined sugar, emulsifiers, fillers, or vegetable oils. Soy-free and dairy-free. Pack includes Simple Dark (70%), Almond Butter + Puffed Quinoa, Cashew Butter + Vanilla, and Hazelnut Butter.",
    brand: "Hu Kitchen", category: "Groceries & Pantry",
    price: 24.99, unit: "pack", rating: 4.7, stock: 148,
    image: img("1481391319555-bae786bce8e8"),
    images: [
      img("1481391319555-bae786bce8e8"),
      img("1447933601403-0c6688de566e"),
      img("1574323347407-f5e1ad6d020b"),
      img("1587049352846-4a222e784d38"),
      img("1556679343-c7306c1976bc"),
    ],
  },
  {
    name: "Justin's Classic Almond Butter Squeeze Packs 10-Count",
    description: "100% dry-roasted non-GMO almonds with a touch of sustainably sourced palm oil and organic sugar to balance flavour. 1.15oz single-serve pouches are perfect for travel, school, the gym, or snacking on the go. No artificial ingredients. Gluten-free and vegan. Pair with apple slices, celery, or eat straight from the pack.",
    brand: "Justin's", category: "Groceries & Pantry",
    price: 19.99, unit: "pack", rating: 4.6, stock: 210,
    image: img("1587049352846-4a222e784d38"),
    images: [
      img("1587049352846-4a222e784d38"),
      img("1474979266404-7eaacbcd87c5"),
      img("1481391319555-bae786bce8e8"),
      img("1447933601403-0c6688de566e"),
      img("1574323347407-f5e1ad6d020b"),
    ],
  },
  {
    name: "Chomps Original Beef Jerky Sticks 24-Pack",
    description: "100% grass-fed and grass-finished beef with zero added sugar, zero nitrates, and zero antibiotics. Gluten-free, Whole30 approved, and paleo-friendly. 9g of protein per stick at just 90 calories. No soy, no dairy. Original, Jalapeno, and Pepperoni flavours available. The protein snack that actually reads clean.",
    brand: "Chomps", category: "Groceries & Pantry",
    price: 39.99, unit: "pack", rating: 4.7, stock: 158,
    image: img("1574323347407-f5e1ad6d020b"),
    images: [
      img("1574323347407-f5e1ad6d020b"),
      img("1481391319555-bae786bce8e8"),
      img("1447933601403-0c6688de566e"),
      img("1474979266404-7eaacbcd87c5"),
      img("1587049352846-4a222e784d38"),
    ],
    variants: [
      { name: "Original (24-pack)", priceModifier: 0, stock: 55 },
      { name: "Jalapeno (24-pack)", priceModifier: 0, stock: 55 },
      { name: "Pepperoni (24-pack)", priceModifier: 0, stock: 48 },
    ],
  },
  {
    name: "Bulletproof Original Ground Coffee 12oz",
    description: "Arabica beans sourced from single-origin farms above 3,000 feet elevation — conditions that limit mould growth. Lab-tested for 27 performance-robbing mycotoxins found in most conventional coffees. Medium roast with chocolate, hazelnut, and caramel notes. Ground for drip, French press, and pour-over. Pairs with grass-fed butter for Bulletproof Coffee.",
    brand: "Bulletproof", category: "Groceries & Pantry",
    price: 18.99, unit: "bag", rating: 4.5, stock: 172,
    image: img("1447933601403-0c6688de566e"),
    images: [
      img("1447933601403-0c6688de566e"),
      img("1512568400610-350c7aae26af"),
      img("1495474472359-6e7d7b10ff44"),
      img("1481391319555-bae786bce8e8"),
      img("1574323347407-f5e1ad6d020b"),
    ],
  },
  {
    name: "RXBAR Protein Bars 12-Pack (Chocolate Sea Salt)",
    description: "3 egg whites, 6 almonds, 4 cashews, 2 dates — no added sugar, no fillers, no BS. 12g of protein and 5g of fibre per 52g bar. Gluten-free and soy-free. Named ingredients on the front, not hiding in a vague 'protein blend'. The Chocolate Sea Salt flavour remains the #1 bestselling bar since launch.",
    brand: "RXBAR", category: "Groceries & Pantry",
    price: 27.99, unit: "pack", rating: 4.6, stock: 197,
    image: img("1481391319555-bae786bce8e8"),
    images: [
      img("1481391319555-bae786bce8e8"),
      img("1447933601403-0c6688de566e"),
      img("1574323347407-f5e1ad6d020b"),
      img("1587049352846-4a222e784d38"),
      img("1474979266404-7eaacbcd87c5"),
    ],
    variants: [
      { name: "Chocolate Sea Salt (12-pack)", priceModifier: 0, stock: 70 },
      { name: "Blueberry (12-pack)", priceModifier: 0, stock: 65 },
      { name: "Mixed Flavours (12-pack)", priceModifier: 0, stock: 62 },
    ],
  },
  {
    name: "Annie's Organic Honey Bunnies Graham Snacks Variety 12-Pack",
    description: "Baked with organic wheat flour and real honey. No artificial flavours, synthetic colours, or preservatives. Certified USDA Organic and made without GMOs. 1-oz single-serve bags are perfect for lunchboxes and on-the-go snacking. The variety pack includes Original, Chocolate, and Cinnamon flavours in equal quantities.",
    brand: "Annie's", category: "Groceries & Pantry",
    price: 12.99, unit: "pack", rating: 4.6, stock: 245,
    image: img("1574323347407-f5e1ad6d020b"),
    images: [
      img("1574323347407-f5e1ad6d020b"),
      img("1447933601403-0c6688de566e"),
      img("1481391319555-bae786bce8e8"),
      img("1556679343-c7306c1976bc"),
      img("1587049352846-4a222e784d38"),
    ],
  },
  {
    name: "Vital Farms Pasture-Raised Salted Butter 2-Pack (8oz each)",
    description: "From cows that roam on at least 108 sq ft of outdoor pasture year-round. The higher ratio of beta-carotene from fresh grass gives the butter its signature golden colour and richer flavour. Slow-churned for a denser, more spreadable texture. No artificial ingredients or GMOs. Certified Humane® by Humane Farm Animal Care.",
    brand: "Vital Farms", category: "Groceries & Pantry",
    price: 13.99, unit: "pack", rating: 4.8, stock: 185,
    image: img("1474979266404-7eaacbcd87c5"),
    images: [
      img("1474979266404-7eaacbcd87c5"),
      img("1481391319555-bae786bce8e8"),
      img("1447933601403-0c6688de566e"),
      img("1587049352846-4a222e784d38"),
      img("1574323347407-f5e1ad6d020b"),
    ],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// USERS
// ─────────────────────────────────────────────────────────────────────────────
const RAW_USERS = [
  {
    name: "Joel Admin",
    email: "admin@northline.com",
    password: "Admin@Northline1",
    roles: "ADMIN" as const,
    isVerified: true,
  },
  {
    name: "Sarah Chen",
    email: "sarah.chen@example.com",
    password: "Password@123",
    roles: "USER" as const,
    isVerified: true,
  },
  {
    name: "Marcus Johnson",
    email: "marcus.johnson@example.com",
    password: "Password@123",
    roles: "USER" as const,
    isVerified: true,
  },
  {
    name: "Emma Williams",
    email: "emma.williams@example.com",
    password: "Password@123",
    roles: "USER" as const,
    isVerified: true,
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// REVIEW TEMPLATES  (keyed by product name substring)
// ─────────────────────────────────────────────────────────────────────────────
type ReviewTemplate = { rating: number; content: string; verifiedPurchase: boolean };

const REVIEW_BANK: Record<string, ReviewTemplate[]> = {
  "Sony WH-1000XM5": [
    { rating: 5, content: "The noise cancellation is absolutely mind-blowing. I tested these on a transatlantic flight and couldn't hear the engines at all. Battery life is outstanding and they fold flat. Best headphones I've owned.", verifiedPurchase: true },
    { rating: 5, content: "Crystal-clear call quality — everyone on calls says I sound like I'm in a studio. The multipoint connection between my MacBook and iPhone is seamless. Worth every penny.", verifiedPurchase: true },
    { rating: 4, content: "Phenomenal sound and ANC. Docking one star because the touch controls on the ear cup take some getting used to. Otherwise a truly premium product.", verifiedPurchase: false },
  ],
  "Apple AirPods Pro": [
    { rating: 5, content: "The Adaptive Audio feature is genuinely magical — it automatically blends ANC and transparency depending on my environment. The fit is comfortable for all-day wear and the case charges incredibly fast.", verifiedPurchase: true },
    { rating: 4, content: "Excellent for Apple ecosystem users. ANC is top-tier and spatial audio is immersive. Battery life is the only weak point — about 5-6 hours per charge.", verifiedPurchase: true },
  ],
  "Apple Watch Series 9": [
    { rating: 5, content: "The double-tap gesture alone is worth the upgrade. Being able to answer calls and control music without touching the screen is a game-changer for when my hands are full.", verifiedPurchase: true },
    { rating: 5, content: "The display is so bright I can read it in direct sunlight. The health tracking caught an irregular heart rhythm I wasn't aware of — I can't put a price on that.", verifiedPurchase: true },
    { rating: 4, content: "Excellent smartwatch. I dock one star because the battery still only lasts about 18 hours with always-on display. Great for day-to-day but you'll need to charge every night.", verifiedPurchase: false },
  ],
  "KitchenAid Artisan": [
    { rating: 5, content: "I've had mine for 12 years and it still runs like new. I make bread, cakes, pasta, and ice cream with it. The attachments ecosystem is incredible. A heirloom appliance you'll pass down.", verifiedPurchase: true },
    { rating: 5, content: "Worth the investment. I went from buying mediocre bakery bread to producing sourdough loaves my neighbours beg me for. The 5-quart bowl handles double batches with ease.", verifiedPurchase: true },
    { rating: 4, content: "Fantastic mixer that I use weekly. Docking a star for the price of attachments — the pasta roller alone costs nearly as much as the machine.", verifiedPurchase: false },
  ],
  "Manduka PRO": [
    { rating: 5, content: "I've been practicing yoga for 15 years and this is the only mat I've ever kept for more than 3 years. The grip improves with each wash and the density is perfect for joint protection. Lifetime guarantee is real — Manduka replaced mine no questions asked.", verifiedPurchase: true },
    { rating: 5, content: "The closed-cell surface means no bacteria and no odour even after hot yoga. It's heavy at 7.5 lbs but I use it at a studio so portability isn't a concern. A professional mat for a serious practice.", verifiedPurchase: true },
  ],
  "CeraVe Moisturising": [
    { rating: 5, content: "I have severe eczema and this is the only moisturiser I've found that provides lasting relief without triggering a flare. Fragrance-free, gentle, and affordable. My dermatologist recommended it and I've used it daily for two years.", verifiedPurchase: true },
    { rating: 5, content: "Game-changer for my dry winter skin. I apply it after showering and my skin stays soft until the next morning. The large tub lasts about 3 months with daily use — excellent value.", verifiedPurchase: true },
    { rating: 4, content: "Great moisturiser, especially for the price point. It's thick, which I love in winter, but feels a bit heavy for summer. I use it at night and a lighter SPF formula during the day.", verifiedPurchase: true },
  ],
  "Atomic Habits": [
    { rating: 5, content: "I've read dozens of self-help books and this is the one that actually changed my behaviour. The 1% improvement framework is both scientifically grounded and immediately actionable. I've used it to build a daily exercise habit and a consistent sleep schedule.", verifiedPurchase: true },
    { rating: 5, content: "James Clear distils complex behavioural psychology into practical strategies anyone can implement today. The concept of identity-based habits was genuinely eye-opening. Recommended it to my entire team.", verifiedPurchase: true },
    { rating: 4, content: "Excellent book with concrete strategies. Some of the material overlaps with other popular productivity books but the writing is clear and the examples are fresh. A worthwhile read.", verifiedPurchase: false },
  ],
  "DEWALT": [
    { rating: 5, content: "I'm a professional contractor and I've been using DEWALT tools for 20 years. This combo kit is an excellent entry point — the drill is powerful enough for framing and the impact driver is indispensable for deck building. Batteries hold charge well.", verifiedPurchase: true },
    { rating: 5, content: "Built a 400 sq ft deck with this kit. The drill drove hundreds of screws without overheating and the impact driver is compact enough for tight spaces. Bought two extra batteries and run them both day-long without issues.", verifiedPurchase: true },
  ],
  "Herman Miller Aeron": [
    { rating: 5, content: "I work 10-hour days at a desk. Before the Aeron, I had chronic lower back pain. Three months in and it's gone. The PostureFit SL is the reason — it actively supports the correct sitting posture rather than just cushioning bad posture. An investment in your health.", verifiedPurchase: true },
    { rating: 5, content: "My employer bought a fleet of these for the office. Absenteeism due to back complaints dropped noticeably. The build quality is exceptional — the same chair I sit in today looks identical to new ones delivered last month despite 3 years of daily use.", verifiedPurchase: false },
    { rating: 4, content: "Outstanding ergonomics and build quality. Docking a star because the armrests are not as intuitive to adjust as I'd expect at this price. Once set correctly though, they're excellent.", verifiedPurchase: true },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// COUPONS
// ─────────────────────────────────────────────────────────────────────────────
const COUPONS = [
  {
    code: "WELCOME10",
    type: "PERCENTAGE" as const,
    value: 10,
    minOrderTotal: null,
    maxUses: null,
    expiresAt: null,
    active: true,
  },
  {
    code: "SAVE25",
    type: "FIXED" as const,
    value: 25,
    minOrderTotal: 100,
    maxUses: 500,
    expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
    active: true,
  },
  {
    code: "FLASH20",
    type: "PERCENTAGE" as const,
    value: 20,
    minOrderTotal: 50,
    maxUses: 200,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    active: true,
  },
  {
    code: "SUMMER15",
    type: "PERCENTAGE" as const,
    value: 15,
    minOrderTotal: 75,
    maxUses: 1000,
    expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
    active: true,
  },
  {
    code: "VIP30",
    type: "PERCENTAGE" as const,
    value: 30,
    minOrderTotal: 200,
    maxUses: 50,
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    active: true,
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// NEWSLETTER SUBSCRIPTIONS
// ─────────────────────────────────────────────────────────────────────────────
const NEWSLETTER_EMAILS = [
  "olivia.hart@example.com",
  "noah.baker@example.com",
  "ava.foster@example.com",
  "liam.parker@example.com",
  "sophia.reed@example.com",
  "james.turner@example.com",
  "isabella.price@example.com",
];

// ─────────────────────────────────────────────────────────────────────────────
// SEED HELPERS
// ─────────────────────────────────────────────────────────────────────────────
async function clearAll() {
  console.log("  Clearing existing data…");
  await prisma.reviewVote.deleteMany();
  await prisma.review.deleteMany();
  await prisma.productAnswer.deleteMany();
  await prisma.productQuestion.deleteMany();
  await prisma.backInStockSubscription.deleteMany();
  await prisma.wishlist.deleteMany();
  await prisma.priceHistory.deleteMany();
  await prisma.cartItem.deleteMany();
  await prisma.cart.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.returnRequest.deleteMany();
  await prisma.order.deleteMany();
  await prisma.productVariant.deleteMany();
  await prisma.products.deleteMany();
  await prisma.category.deleteMany();
  await prisma.coupon.deleteMany();
  await prisma.newsletterSubscription.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.address.deleteMany();
  await prisma.user.deleteMany();
  console.log("  Done.");
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────
async function main() {
  const reset = process.env.SEED_RESET === "true" || process.env.SEED_RESET === "1";
  const existingProducts = await prisma.products.count();

  if (!reset && existingProducts > 0) {
    console.log(
      `⚠  Found ${existingProducts} products. Skipping seed.\n` +
      "   To reseed everything: SEED_RESET=true npx prisma db seed",
    );
    return;
  }

  if (reset && existingProducts > 0) await clearAll();

  // ── 1. Categories ──────────────────────────────────────────────────────
  console.log("1/6  Seeding categories…");
  const categoryMap = new Map<string, number>();
  for (const name of CATEGORY_NAMES) {
    const cat = await prisma.category.upsert({
      where: { name },
      update: {},
      create: { name },
    });
    categoryMap.set(name, cat.category_id);
  }
  console.log(`     ✓ ${CATEGORY_NAMES.length} categories`);

  // ── 2. Products & Variants ─────────────────────────────────────────────
  console.log("2/6  Seeding products…");
  let productCount = 0;
  let variantCount = 0;
  const productMap = new Map<string, string>(); // name → product_id

  for (const p of PRODUCTS) {
    const category_id = categoryMap.get(p.category)!;
    const created = await prisma.products.create({
      data: {
        name: p.name,
        description: p.description,
        price: p.price,
        unit: p.unit,
        image: p.image,
        images: p.images,
        discount: p.discount ?? null,
        availability: true,
        brand: p.brand,
        rating: p.rating,
        stock: p.stock,
        category_id,
      },
    });
    productMap.set(p.name, created.product_id);
    productCount++;

    if (p.variants) {
      for (const v of p.variants) {
        await prisma.productVariant.create({
          data: {
            product_id: created.product_id,
            name: v.name,
            priceModifier: v.priceModifier,
            stock: v.stock,
            availability: v.stock > 0,
          },
        });
        variantCount++;
      }
    }
  }
  console.log(`     ✓ ${productCount} products, ${variantCount} variants`);

  // ── 3. Users ───────────────────────────────────────────────────────────
  console.log("3/6  Seeding users…");
  const userIds: string[] = [];
  for (const u of RAW_USERS) {
    const hashed = await bcrypt.hash(u.password, 12);
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: {
        name: u.name,
        email: u.email,
        password: hashed,
        roles: u.roles,
        isVerified: u.isVerified,
      },
    });
    userIds.push(user.id);
  }
  console.log(`     ✓ ${RAW_USERS.length} users`);

  // ── 4. Reviews ─────────────────────────────────────────────────────────
  console.log("4/6  Seeding reviews…");
  let reviewCount = 0;
  const regularUserIds = userIds.slice(1); // skip admin

  for (const [nameKey, templates] of Object.entries(REVIEW_BANK)) {
    const productEntry = [...productMap.entries()].find(([name]) =>
      name.toLowerCase().includes(nameKey.toLowerCase()),
    );
    if (!productEntry) continue;
    const [, product_id] = productEntry;

    for (let i = 0; i < templates.length; i++) {
      const tpl = templates[i];
      const userId = regularUserIds[i % regularUserIds.length];
      try {
        await prisma.review.create({
          data: {
            product_id,
            userId,
            rating: tpl.rating,
            content: tpl.content,
            verifiedPurchase: tpl.verifiedPurchase,
          },
        });
        reviewCount++;
      } catch {
        // skip duplicates (same user×product)
      }
    }
  }
  console.log(`     ✓ ${reviewCount} reviews`);

  // ── 5. Coupons ─────────────────────────────────────────────────────────
  console.log("5/6  Seeding coupons…");
  for (const c of COUPONS) {
    await prisma.coupon.upsert({
      where: { code: c.code },
      update: {},
      create: c,
    });
  }
  console.log(`     ✓ ${COUPONS.length} coupons`);

  // ── 6. Newsletter ──────────────────────────────────────────────────────
  console.log("6/6  Seeding newsletter subscriptions…");
  for (const email of NEWSLETTER_EMAILS) {
    await prisma.newsletterSubscription.upsert({
      where: { email },
      update: {},
      create: { email, active: true },
    });
  }
  console.log(`     ✓ ${NEWSLETTER_EMAILS.length} subscribers`);

  console.log(`
✅ Seed complete!
   ${CATEGORY_NAMES.length} categories
   ${productCount} products  (${variantCount} variants)  ← target 150+
   ${RAW_USERS.length} users
   ${reviewCount} reviews
   ${COUPONS.length} coupons
   ${NEWSLETTER_EMAILS.length} newsletter subscribers

Admin login:  admin@northline.com  /  Admin@Northline1
User login:   sarah.chen@example.com  /  Password@123
`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
