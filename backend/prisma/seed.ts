import { PrismaClient } from "@prisma/client";
import * as dotenv from "dotenv";

dotenv.config();

const prisma = new PrismaClient();

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

function img(id: string) {
  return `https://images.unsplash.com/photo-${id}?w=1200&h=900&fit=crop&auto=format&q=80`;
}

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
  stock?: number;
};

const PRODUCTS: ProductSeed[] = [
  // ── ELECTRONICS ────────────────────────────────────────────────────────────
  {
    name: "Sony WH-1000XM5 Wireless Headphones",
    description:
      "Industry-leading noise cancellation with 30-hour battery life, Dual Noise Sensor technology, and crystal-clear hands-free calling.",
    brand: "Sony",
    category: "Electronics",
    price: 349.99,
    discount: 15,
    unit: "each",
    image: img("1505740420928-5e560c06d30e"),
    images: [
      img("1505740420928-5e560c06d30e"),
      img("1484704849700-f032d85b5d83"),
      img("1546435578-e62e24c8ccbf"),
    ],
    rating: 4.8,
    stock: 5,
  },
  {
    name: "Apple AirPods Pro (2nd Generation)",
    description:
      "Active Noise Cancellation, Transparency mode, Adaptive Audio, and up to 30 hours of total battery life with the MagSafe Charging Case.",
    brand: "Apple",
    category: "Electronics",
    price: 249.99,
    unit: "each",
    image: img("1600294037681-c80b4cb5b434"),
    images: [
      img("1600294037681-c80b4cb5b434"),
      img("1590658268037-6bf12165cd8e"),
    ],
    rating: 4.7,
    stock: 42,
  },
  {
    name: "Keychron K8 Pro Wireless Mechanical Keyboard",
    description:
      "Hot-swappable TKL layout with Bluetooth 5.1, RGB backlight, and USB-C. Compatible with Mac and Windows.",
    brand: "Keychron",
    category: "Electronics",
    price: 109.99,
    unit: "each",
    image: img("1587829741301-dc798b83add3"),
    images: [
      img("1587829741301-dc798b83add3"),
      img("1595044426077-d36d9236d54a"),
    ],
    rating: 4.6,
    stock: 67,
  },
  {
    name: "Logitech MX Master 3S Wireless Mouse",
    description:
      "8000 DPI precision, near-silent clicks, ultra-fast MagSpeed electromagnetic scroll wheel, and multi-device Bluetooth pairing.",
    brand: "Logitech",
    category: "Electronics",
    price: 99.99,
    unit: "each",
    image: img("1527864550417-7519ae9c05c5"),
    images: [
      img("1527864550417-7519ae9c05c5"),
      img("1563770660941-10b7a86236e9"),
    ],
    rating: 4.7,
    stock: 88,
  },
  {
    name: "Apple Watch Series 9 GPS 45mm",
    description:
      "Advanced health sensors: blood oxygen, ECG, crash detection, and always-on Retina display. Up to 18 hours battery life.",
    brand: "Apple",
    category: "Electronics",
    price: 429.99,
    discount: 10,
    unit: "each",
    image: img("1523275335684-37898b6baf30"),
    images: [
      img("1523275335684-37898b6baf30"),
      img("1434494206212-716b93f7a9b9"),
    ],
    rating: 4.8,
    stock: 3,
  },
  {
    name: "JBL Charge 5 Portable Bluetooth Speaker",
    description:
      "IP67 waterproof and dustproof with 20 hours of playtime, JBL Pro Sound, and a built-in power bank to charge your devices.",
    brand: "JBL",
    category: "Electronics",
    price: 179.99,
    unit: "each",
    image: img("1608043152269-423dbba4e7e1"),
    images: [
      img("1608043152269-423dbba4e7e1"),
      img("1583384383840-e5e2e9b08b50"),
    ],
    rating: 4.6,
    stock: 54,
  },
  {
    name: "Apple iPad (10th Generation) 64GB Wi-Fi",
    description:
      "10.9-inch Liquid Retina display, A14 Bionic chip, USB-C connectivity, and landscape front camera built for video calls.",
    brand: "Apple",
    category: "Electronics",
    price: 449.99,
    unit: "each",
    image: img("1544244015-0df4cec9d97d"),
    images: [
      img("1544244015-0df4cec9d97d"),
      img("1609921213416-c8f1c3ebad80"),
    ],
    rating: 4.6,
    stock: 29,
  },
  {
    name: "Samsung T7 Portable SSD 1TB",
    description:
      "Blazing-fast 1,050 MB/s read speeds with USB 3.2 Gen 2. AES 256-bit hardware encryption and shock-resistant metal body.",
    brand: "Samsung",
    category: "Electronics",
    price: 109.99,
    discount: 8,
    unit: "each",
    image: img("1558618666-fcd25c85cd64"),
    images: [
      img("1558618666-fcd25c85cd64"),
    ],
    rating: 4.7,
    stock: 73,
  },
  {
    name: "Anker 65W Nano II USB-C Charger",
    description:
      "Compact GaN II charger with foldable plug. Charges MacBook Pro, iPhone, iPad, and Android phones at full speed.",
    brand: "Anker",
    category: "Electronics",
    price: 49.99,
    unit: "each",
    image: img("1583863788434-1b8b1a27b16b"),
    images: [
      img("1583863788434-1b8b1a27b16b"),
    ],
    rating: 4.5,
    stock: 120,
  },
  {
    name: "LG 27UP850N 27\" 4K USB-C Monitor",
    description:
      "IPS panel with 99% sRGB coverage, HDR400, and 96W USB-C power delivery. VESA-compatible for ergonomic desk setups.",
    brand: "LG",
    category: "Electronics",
    price: 449.99,
    discount: 12,
    unit: "each",
    image: img("1547826039-a468e6ebdd7f"),
    images: [
      img("1547826039-a468e6ebdd7f"),
      img("1593642632559-0c6d3fc62b89"),
    ],
    rating: 4.6,
    stock: 7,
  },

  // ── HOME & KITCHEN ─────────────────────────────────────────────────────────
  {
    name: "Nespresso Vertuo Pop Coffee Machine",
    description:
      "Centrifusion™ brewing for 5 cup sizes at the touch of a button. Compact design with fast 30-second heat-up time.",
    brand: "Nespresso",
    category: "Home & Kitchen",
    price: 119.99,
    discount: 12,
    unit: "each",
    image: img("1495474472359-6e7d7b10ff44"),
    images: [
      img("1495474472359-6e7d7b10ff44"),
      img("1512568400610-350c7aae26af"),
    ],
    rating: 4.6,
    stock: 35,
  },
  {
    name: "Instant Pot Duo 7-in-1 Electric Pressure Cooker 6Qt",
    description:
      "Pressure cooker, slow cooker, rice cooker, steamer, sauté, yogurt maker and warmer in one. Cooks up to 70% faster.",
    brand: "Instant Pot",
    category: "Home & Kitchen",
    price: 89.99,
    unit: "each",
    image: img("1556909172-54557c7e4fb7"),
    images: [
      img("1556909172-54557c7e4fb7"),
    ],
    rating: 4.7,
    stock: 61,
  },
  {
    name: "KitchenAid Artisan Series 5-Qt Stand Mixer",
    description:
      "67-point planetary mixing action and 10-speed motor. Includes flat beater, dough hook and wire whip. Tilt-head design.",
    brand: "KitchenAid",
    category: "Home & Kitchen",
    price: 449.99,
    discount: 20,
    unit: "each",
    image: img("1594736797933-d0501ba2fe65"),
    images: [
      img("1594736797933-d0501ba2fe65"),
    ],
    rating: 4.9,
    stock: 4,
  },
  {
    name: "Ninja Air Fryer Pro XL 5.5Qt",
    description:
      "6-in-1 air fry, roast, reheat, dehydrate, bake, and broil. Up to 75% less fat vs. deep frying. Dishwasher-safe basket.",
    brand: "Ninja",
    category: "Home & Kitchen",
    price: 129.99,
    discount: 15,
    unit: "each",
    image: img("1556909114-f6e7ad7d3136"),
    images: [
      img("1556909114-f6e7ad7d3136"),
    ],
    rating: 4.6,
    stock: 48,
  },
  {
    name: "Lodge 12-Inch Cast Iron Skillet",
    description:
      "Pre-seasoned with 100% natural vegetable oil. Works on induction, gas, electric stovetop, oven, and campfire.",
    brand: "Lodge",
    category: "Home & Kitchen",
    price: 44.99,
    unit: "each",
    image: img("1585937421612-70a008356fbe"),
    images: [
      img("1585937421612-70a008356fbe"),
      img("1556910103-1c02745b0e09"),
    ],
    rating: 4.8,
    stock: 95,
  },
  {
    name: "Hydro Flask 32oz Wide Mouth Water Bottle",
    description:
      "Double-wall vacuum insulation keeps drinks cold 24 hours and hot 12 hours. BPA-free 18/8 stainless steel with Flex Cap.",
    brand: "Hydro Flask",
    category: "Home & Kitchen",
    price: 49.99,
    unit: "each",
    image: img("1602143407151-7111542de6e8"),
    images: [
      img("1602143407151-7111542de6e8"),
    ],
    rating: 4.7,
    stock: 110,
  },
  {
    name: "Pyrex Simply Store Glass Container Set 18pc",
    description:
      "BPA-free borosilicate glass containers with snap-lock lids. Oven, microwave, fridge, freezer, and dishwasher safe.",
    brand: "Pyrex",
    category: "Home & Kitchen",
    price: 59.99,
    unit: "set",
    image: img("1610348725531-843dff563e2c"),
    images: [
      img("1610348725531-843dff563e2c"),
    ],
    rating: 4.6,
    stock: 78,
  },
  {
    name: "Vitamix E310 Explorian Blender",
    description:
      "10 variable speeds and pulse feature. 48oz low-profile container and hardened stainless-steel blades. Aircraft-grade alloy drive.",
    brand: "Vitamix",
    category: "Home & Kitchen",
    price: 349.99,
    unit: "each",
    image: img("1614707050748-f8eb78dbd78b"),
    images: [
      img("1614707050748-f8eb78dbd78b"),
      img("1584797810879-0c53e7e6ff31"),
    ],
    rating: 4.8,
    stock: 22,
  },
  {
    name: "Bamboo Cutting Board Set (3-Piece)",
    description:
      "Eco-friendly bamboo boards in three sizes. Juice groove around the perimeter, non-slip feet, and easy-grip handle.",
    brand: "Royal Craft Wood",
    category: "Home & Kitchen",
    price: 34.99,
    unit: "set",
    image: img("1547496502-affa22d38842"),
    images: [
      img("1547496502-affa22d38842"),
    ],
    rating: 4.6,
    stock: 85,
  },

  // ── FASHION ────────────────────────────────────────────────────────────────
  {
    name: "Levi's 501 Original Fit Jeans",
    description:
      "The original blue jean since 1873. Straight leg with regular fit through seat and thigh. 100% cotton denim, button fly.",
    brand: "Levi's",
    category: "Fashion",
    price: 89.99,
    unit: "each",
    image: img("1542219550-37153d387c27"),
    images: [
      img("1542219550-37153d387c27"),
    ],
    rating: 4.5,
    stock: 56,
  },
  {
    name: "Patagonia Better Sweater Full-Zip Jacket",
    description:
      "100% polyester fleece with sweater-knit face and silky-soft backing. Fair Trade Certified sewing. Full zip with two front pockets.",
    brand: "Patagonia",
    category: "Fashion",
    price: 139.99,
    unit: "each",
    image: img("1539533018447-63fcce2678e3"),
    images: [
      img("1539533018447-63fcce2678e3"),
    ],
    rating: 4.7,
    stock: 38,
  },
  {
    name: "New Balance 990v6 Running Sneakers",
    description:
      "American-made icon with ENCAP midsole technology, premium pigskin and mesh upper, and ACTEVA LITE foam for all-day comfort.",
    brand: "New Balance",
    category: "Fashion",
    price: 184.99,
    unit: "pair",
    image: img("1542291026-7eec264c27ff"),
    images: [
      img("1542291026-7eec264c27ff"),
      img("1491553154263-9e2f945e8f86"),
    ],
    rating: 4.6,
    stock: 45,
  },
  {
    name: "Ray-Ban Aviator Classic Sunglasses",
    description:
      "Iconic teardrop lens design with 100% UV protection. Crystal B-15 lens with iconic gold metal frame. The original since 1937.",
    brand: "Ray-Ban",
    category: "Fashion",
    price: 161.99,
    unit: "each",
    image: img("1511499767150-a48a237f0083"),
    images: [
      img("1511499767150-a48a237f0083"),
      img("1574258495973-a1ba53c68d68"),
    ],
    rating: 4.6,
    stock: 63,
  },
  {
    name: "Carhartt WIP Chase Crewneck Sweatshirt",
    description:
      "Regular fit in 100% cotton heavyweight fleece. Ribbed collar, cuffs and hem. Signature C logo patch at the chest.",
    brand: "Carhartt WIP",
    category: "Fashion",
    price: 75.00,
    unit: "each",
    image: img("1521572163474-6864f9cf17ab"),
    images: [
      img("1521572163474-6864f9cf17ab"),
    ],
    rating: 4.5,
    stock: 72,
  },
  {
    name: "Herschel Little America Backpack 25L",
    description:
      "Classic hiking-inspired design with padded 15\" laptop sleeve, top carry handle, and signature striped fabric liner.",
    brand: "Herschel",
    category: "Fashion",
    price: 74.99,
    unit: "each",
    image: img("1553062407-98eeb64c6a62"),
    images: [
      img("1553062407-98eeb64c6a62"),
    ],
    rating: 4.5,
    stock: 49,
  },
  {
    name: "Timberland Premium 6-Inch Waterproof Boot",
    description:
      "Waterproof full-grain leather upper with rustproof hardware, padded collar for ankle support, and anti-fatigue footbed.",
    brand: "Timberland",
    category: "Fashion",
    price: 199.99,
    unit: "pair",
    image: img("1542291026-7eec264c27ff"),
    images: [
      img("1542291026-7eec264c27ff"),
    ],
    rating: 4.5,
    stock: 33,
  },
  {
    name: "Arc'teryx Atom LT Hoody",
    description:
      "Lightweight Coreloft insulation with stretch fleece side panels and underarms. Packable into its own pocket.",
    brand: "Arc'teryx",
    category: "Fashion",
    price: 259.99,
    unit: "each",
    image: img("1587402800671-ba09f979b25a"),
    images: [
      img("1587402800671-ba09f979b25a"),
    ],
    rating: 4.7,
    stock: 6,
  },

  // ── SPORTS & OUTDOORS ──────────────────────────────────────────────────────
  {
    name: "Manduka PRO Yoga Mat 6mm",
    description:
      "Professional-grade non-slip yoga mat with lifetime guarantee. Closed-cell surface prevents moisture absorption. 71 × 24 inches.",
    brand: "Manduka",
    category: "Sports & Outdoors",
    price: 120.00,
    unit: "each",
    image: img("1544367567-0f2fcb009e0b"),
    images: [
      img("1544367567-0f2fcb009e0b"),
      img("1506126613408-eca07ce68773"),
    ],
    rating: 4.8,
    stock: 57,
  },
  {
    name: "Theragun Mini (3rd Gen) Percussion Massager",
    description:
      "Compact percussive therapy with 3 speed settings, QuietForce Technology, and 20-minute battery life. Fits in a gym bag.",
    brand: "Theragun",
    category: "Sports & Outdoors",
    price: 179.00,
    discount: 10,
    unit: "each",
    image: img("1571019613454-1cb2f99b2d8b"),
    images: [
      img("1571019613454-1cb2f99b2d8b"),
    ],
    rating: 4.6,
    stock: 31,
  },
  {
    name: "Osprey Farpoint 40 Travel Backpack",
    description:
      "StraightJacket compression straps, lockable zippers, and stowaway hip belt. Meets most carry-on size restrictions.",
    brand: "Osprey",
    category: "Sports & Outdoors",
    price: 160.00,
    unit: "each",
    image: img("1622260614153-03223fb72052"),
    images: [
      img("1622260614153-03223fb72052"),
    ],
    rating: 4.7,
    stock: 44,
  },
  {
    name: "Coleman Portable Camping Quad Chair",
    description:
      "Supports up to 250 lbs. Carry bag included. Padded armrests, phone and accessory pocket, and 4-way comfort armrests.",
    brand: "Coleman",
    category: "Sports & Outdoors",
    price: 49.99,
    unit: "each",
    image: img("1504614579893-bb8a71b49f3e"),
    images: [
      img("1504614579893-bb8a71b49f3e"),
      img("1478131143081-80f7f84ca84d"),
    ],
    rating: 4.4,
    stock: 82,
  },
  {
    name: "Black Diamond Trail Sport Trekking Poles",
    description:
      "Lightweight aluminum poles with FlickLock Pro adjustability from 62–130 cm. Foam grip with moisture-wicking strap.",
    brand: "Black Diamond",
    category: "Sports & Outdoors",
    price: 79.95,
    unit: "pair",
    image: img("1551632811-561732d1e306"),
    images: [
      img("1551632811-561732d1e306"),
    ],
    rating: 4.5,
    stock: 66,
  },
  {
    name: "Wilson Pro Staff RF97 Tennis Racket",
    description:
      "Roger Federer signature frame. 97 sq in head, 340g strung weight, 16×19 string pattern for unmatched precision and control.",
    brand: "Wilson",
    category: "Sports & Outdoors",
    price: 199.99,
    unit: "each",
    image: img("1554068865-24ceec13d6c2"),
    images: [
      img("1554068865-24ceec13d6c2"),
    ],
    rating: 4.5,
    stock: 28,
  },
  {
    name: "Nike Resistance Band Set (5 Bands)",
    description:
      "Five resistance levels from 10 to 50 lbs for full-body strength training. 100% natural latex with anti-snap technology.",
    brand: "Nike",
    category: "Sports & Outdoors",
    price: 39.99,
    unit: "set",
    image: img("1598289431512-b97b0917affc"),
    images: [
      img("1598289431512-b97b0917affc"),
    ],
    rating: 4.4,
    stock: 94,
  },
  {
    name: "Garmin Forerunner 265 GPS Running Watch",
    description:
      "AMOLED display, training readiness score, race predictor, and up to 15 days battery life. Includes Garmin Coach adaptive plans.",
    brand: "Garmin",
    category: "Sports & Outdoors",
    price: 449.99,
    discount: 5,
    unit: "each",
    image: img("1557935728-226206198626-2b9b0d4c1a3e"),
    images: [
      img("1557935728-226206198626-2b9b0d4c1a3e"),
      img("1523275335684-37898b6baf30"),
    ],
    rating: 4.7,
    stock: 8,
  },

  // ── BEAUTY ─────────────────────────────────────────────────────────────────
  {
    name: "CeraVe Moisturizing Cream 19oz",
    description:
      "Developed with dermatologists. Three essential ceramides and hyaluronic acid restore and maintain the skin's natural barrier. Fragrance-free.",
    brand: "CeraVe",
    category: "Beauty",
    price: 18.99,
    unit: "each",
    image: img("1556228720-195a672e8a03"),
    images: [
      img("1556228720-195a672e8a03"),
      img("1571781926291-c477ebfd024b"),
    ],
    rating: 4.8,
    stock: 140,
  },
  {
    name: "The Ordinary Niacinamide 10% + Zinc 1%",
    description:
      "High-strength vitamin B3 formula targets blemishes, pore appearance, and uneven skin tone. Lightweight water-based serum.",
    brand: "The Ordinary",
    category: "Beauty",
    price: 6.90,
    unit: "each",
    image: img("1571781926291-c477ebfd024b"),
    images: [
      img("1571781926291-c477ebfd024b"),
      img("1556228453-efd6c1ff04f6"),
    ],
    rating: 4.7,
    stock: 200,
  },
  {
    name: "La Roche-Posay Anthelios Melt-in Milk SPF 60",
    description:
      "Broad spectrum SPF 60 with Cell-Ox Shield XL technology. Water resistant for 80 minutes. Suitable for face and body.",
    brand: "La Roche-Posay",
    category: "Beauty",
    price: 29.99,
    unit: "each",
    image: img("1556228453-efd6c1ff04f6"),
    images: [
      img("1556228453-efd6c1ff04f6"),
    ],
    rating: 4.6,
    stock: 175,
  },
  {
    name: "Olaplex No.3 Hair Perfector Treatment",
    description:
      "Not a conditioner — a concentrated bond-building treatment that reduces breakage and visibly strengthens hair. Use weekly.",
    brand: "Olaplex",
    category: "Beauty",
    price: 28.00,
    unit: "each",
    image: img("1535585209827-a15fcdbc4c2d"),
    images: [
      img("1535585209827-a15fcdbc4c2d"),
    ],
    rating: 4.7,
    stock: 93,
  },
  {
    name: "Philips Sonicare ProtectiveClean 4100 Toothbrush",
    description:
      "Removes 7× more plaque than a manual brush. BrushSync pressure sensor prevents over-brushing. 2-week battery life.",
    brand: "Philips",
    category: "Beauty",
    price: 59.99,
    discount: 15,
    unit: "each",
    image: img("1559190394-df5a28aab5c5"),
    images: [
      img("1559190394-df5a28aab5c5"),
    ],
    rating: 4.5,
    stock: 52,
  },
  {
    name: "Charlotte Tilbury Magic Cream 50ml",
    description:
      "Multi-award-winning moisturizer with hyaluronic acid, rosehip oil, and peptides. Instantly plumps and illuminates skin.",
    brand: "Charlotte Tilbury",
    category: "Beauty",
    price: 105.00,
    unit: "each",
    image: img("1556228578-8c89e6adf883"),
    images: [
      img("1556228578-8c89e6adf883"),
    ],
    rating: 4.7,
    stock: 7,
  },
  {
    name: "Drunk Elephant T.L.C. Sukari Babyfacial",
    description:
      "25% AHA and 2% BHA blend for professional-grade exfoliation at home. Resurfaces texture and fades dark spots.",
    brand: "Drunk Elephant",
    category: "Beauty",
    price: 90.00,
    unit: "each",
    image: img("1596462502278-27bfdc403348"),
    images: [
      img("1596462502278-27bfdc403348"),
    ],
    rating: 4.6,
    stock: 41,
  },

  // ── BOOKS & MEDIA ──────────────────────────────────────────────────────────
  {
    name: "Atomic Habits by James Clear",
    description:
      "A proven framework for improving every day through tiny habit changes. Practical strategies used by world-class performers.",
    brand: "Avery Publishing",
    category: "Books & Media",
    price: 18.99,
    unit: "each",
    image: img("1512820790803-83ca734da794"),
    images: [
      img("1512820790803-83ca734da794"),
      img("1495640388908-05fa85288e61"),
    ],
    rating: 4.9,
    stock: 120,
  },
  {
    name: "Salt, Fat, Acid, Heat by Samin Nosrat",
    description:
      "A visually stunning guide to the four elements of good cooking, illustrated by Wendy MacNaughton. A modern culinary classic.",
    brand: "Simon & Schuster",
    category: "Books & Media",
    price: 35.00,
    unit: "each",
    image: img("1507048331197-7d4ac70811cf"),
    images: [
      img("1507048331197-7d4ac70811cf"),
    ],
    rating: 4.8,
    stock: 85,
  },
  {
    name: "Dune by Frank Herbert",
    description:
      "The greatest science-fiction novel ever written. Follow Paul Atreides across the desert planet Arrakis in this sweeping epic.",
    brand: "Ace Books",
    category: "Books & Media",
    price: 19.99,
    unit: "each",
    image: img("1495640388908-05fa85288e61"),
    images: [
      img("1495640388908-05fa85288e61"),
    ],
    rating: 4.8,
    stock: 67,
  },
  {
    name: "Miles Davis – Kind of Blue Vinyl LP (180g)",
    description:
      "The best-selling jazz album of all time, pressed on 180g audiophile-grade vinyl. Includes original liner notes. Columbia Records reissue.",
    brand: "Columbia Records",
    category: "Books & Media",
    price: 32.99,
    unit: "each",
    image: img("1603048297172-c92544798d5a"),
    images: [
      img("1603048297172-c92544798d5a"),
    ],
    rating: 4.9,
    stock: 9,
  },
  {
    name: "The Creative Act: A Way of Being by Rick Rubin",
    description:
      "A comprehensive guide to creativity from the legendary record producer. Explores the creative process across all forms of art.",
    brand: "Penguin Press",
    category: "Books & Media",
    price: 32.00,
    unit: "each",
    image: img("1524995997946-a1c2e315a42f"),
    images: [
      img("1524995997946-a1c2e315a42f"),
    ],
    rating: 4.7,
    stock: 98,
  },
  {
    name: "The Design of Everyday Things by Don Norman",
    description:
      "A classic on human-centered design. Essential reading for designers, engineers, and anyone who interacts with the designed world.",
    brand: "Basic Books",
    category: "Books & Media",
    price: 22.99,
    unit: "each",
    image: img("1456513080510-7bf3a84b82f8"),
    images: [
      img("1456513080510-7bf3a84b82f8"),
    ],
    rating: 4.7,
    stock: 74,
  },

  // ── TOYS & GAMES ───────────────────────────────────────────────────────────
  {
    name: "LEGO Icons Eiffel Tower 10307",
    description:
      "9,836 pieces. A 1.5-metre-tall replica of the Paris landmark with detailed façade sections, 4 lifts, and an observation deck.",
    brand: "LEGO",
    category: "Toys & Games",
    price: 629.99,
    unit: "each",
    image: img("1587654780291-39c9404d746b"),
    images: [
      img("1587654780291-39c9404d746b"),
    ],
    rating: 4.9,
    stock: 2,
  },
  {
    name: "Catan Board Game (5th Edition)",
    description:
      "Award-winning strategy game for 3–4 players. Trade, build, and settle the island of Catan. Gateway to modern board gaming.",
    brand: "Catan Studio",
    category: "Toys & Games",
    price: 55.99,
    unit: "each",
    image: img("1611996575749-79a3a250f948"),
    images: [
      img("1611996575749-79a3a250f948"),
    ],
    rating: 4.7,
    stock: 59,
  },
  {
    name: "Ravensburger Krypt Silver 654-Piece Puzzle",
    description:
      "A premium challenge-level jigsaw with a single metallic color. Unique premium-quality pieces with Softclick technology.",
    brand: "Ravensburger",
    category: "Toys & Games",
    price: 24.99,
    unit: "each",
    image: img("1558864566-73e81d84e59c"),
    images: [
      img("1558864566-73e81d84e59c"),
    ],
    rating: 4.5,
    stock: 103,
  },
  {
    name: "Jellycat Bashful Elephant Stuffed Animal",
    description:
      "Super-soft plush with silky-smooth fur and oversized floppy ears. 12 inches tall. Suitable from birth. Machine washable.",
    brand: "Jellycat",
    category: "Toys & Games",
    price: 26.99,
    unit: "each",
    image: img("1559715745-e1b33a271c8f"),
    images: [
      img("1559715745-e1b33a271c8f"),
    ],
    rating: 4.9,
    stock: 76,
  },
  {
    name: "Exploding Kittens Card Game",
    description:
      "A highly strategic, kitty-powered version of Russian Roulette for 2–5 players. The most-backed Kickstarter game of all time.",
    brand: "Exploding Kittens",
    category: "Toys & Games",
    price: 19.99,
    unit: "each",
    image: img("1566576912321-d58ddd7a6088"),
    images: [
      img("1566576912321-d58ddd7a6088"),
    ],
    rating: 4.7,
    stock: 88,
  },
  {
    name: "Hot Wheels Ultimate Garage Playset",
    description:
      "5-feet of fun with 2 levels, an elevator, and a spiral ramp. Holds 140+ cars. Includes one 1:64 scale vehicle.",
    brand: "Hot Wheels",
    category: "Toys & Games",
    price: 89.99,
    discount: 10,
    unit: "each",
    image: img("1566576912321-d58ddd7a6088"),
    images: [
      img("1566576912321-d58ddd7a6088"),
    ],
    rating: 4.5,
    stock: 37,
  },

  // ── GARDEN & TOOLS ─────────────────────────────────────────────────────────
  {
    name: "DEWALT 20V MAX Cordless Drill Combo Kit",
    description:
      "2-speed drill/driver and impact driver. 300 UWO of power. Includes 2 batteries, charger, and heavy-duty contractor bag.",
    brand: "DEWALT",
    category: "Garden & Tools",
    price: 199.99,
    discount: 15,
    unit: "kit",
    image: img("1504148455328-c376907d081c"),
    images: [
      img("1504148455328-c376907d081c"),
    ],
    rating: 4.8,
    stock: 47,
  },
  {
    name: "Fiskars Bypass Pruning Shears (9-Inch)",
    description:
      "Precision-ground hardened steel blade with low-friction coating for smooth cuts. Softgrip handle for comfort. Cuts up to 3/4 inch.",
    brand: "Fiskars",
    category: "Garden & Tools",
    price: 24.99,
    unit: "each",
    image: img("1416879595882-3373a0480b5b"),
    images: [
      img("1416879595882-3373a0480b5b"),
    ],
    rating: 4.6,
    stock: 115,
  },
  {
    name: "Stanley FatMax 25-Foot Tape Measure",
    description:
      "Mylar-coated blade for 3× longer life. Blade Armor coating protects against wear, and True Zero hook for accurate measurements.",
    brand: "Stanley",
    category: "Garden & Tools",
    price: 19.99,
    unit: "each",
    image: img("1504148455328-c376907d081c"),
    images: [
      img("1504148455328-c376907d081c"),
    ],
    rating: 4.6,
    stock: 200,
  },
  {
    name: "Philips Hue Lily XL Outdoor Spot Light",
    description:
      "16 million colors and shades of white. IP65 weatherproof rating. Zigbee-based for smart home integration. 640 lumens.",
    brand: "Philips Hue",
    category: "Garden & Tools",
    price: 129.99,
    unit: "each",
    image: img("1614594975525-e45190c55d0b"),
    images: [
      img("1614594975525-e45190c55d0b"),
    ],
    rating: 4.5,
    stock: 39,
  },
  {
    name: "Gardena Classic Hose Set 30m",
    description:
      "High-quality 13mm diameter garden hose with Hose Connector, Spray Nozzle, and Tap Connector. Kink-resistant PVC.",
    brand: "Gardena",
    category: "Garden & Tools",
    price: 49.99,
    unit: "set",
    image: img("1416879595882-3373a0480b5b"),
    images: [
      img("1416879595882-3373a0480b5b"),
    ],
    rating: 4.4,
    stock: 68,
  },

  // ── OFFICE ─────────────────────────────────────────────────────────────────
  {
    name: "Herman Miller Aeron Chair (Size B)",
    description:
      "8Z Pellicle suspension, PostureFit SL lumbar support, and fully adjustable arms. Backed by a 12-year warranty.",
    brand: "Herman Miller",
    category: "Office",
    price: 1445.00,
    discount: 5,
    unit: "each",
    image: img("1593642632559-0c6d3fc62b89"),
    images: [
      img("1593642632559-0c6d3fc62b89"),
    ],
    rating: 4.9,
    stock: 6,
  },
  {
    name: "VIVO Single Gas Spring Monitor Arm",
    description:
      "Supports 13–32 inch displays up to 17.6 lbs. Full motion with 360° rotation, ±90° tilt, and quick-release VESA plate.",
    brand: "VIVO",
    category: "Office",
    price: 89.99,
    unit: "each",
    image: img("1593642632559-0c6d3fc62b89"),
    images: [
      img("1593642632559-0c6d3fc62b89"),
    ],
    rating: 4.5,
    stock: 53,
  },
  {
    name: "Leuchtturm1917 Medium A5 Dotted Notebook",
    description:
      "240 numbered pages, 2 bookmarks, elastic enclosure band, and back pocket. Ink-proof paper. Thread-bound hardcover.",
    brand: "Leuchtturm1917",
    category: "Office",
    price: 22.99,
    unit: "each",
    image: img("1517842645767-c639042777db"),
    images: [
      img("1517842645767-c639042777db"),
    ],
    rating: 4.7,
    stock: 91,
  },
  {
    name: "Pilot G2 Premium Gel Pens (12-Pack, 0.7mm)",
    description:
      "Smooth skip-free writing with vibrant gel ink. Comfortable rubber grip and retractable tip. America's #1 selling gel pen.",
    brand: "Pilot",
    category: "Office",
    price: 15.99,
    unit: "pack",
    image: img("1517842645767-c639042777db"),
    images: [
      img("1517842645767-c639042777db"),
    ],
    rating: 4.7,
    stock: 250,
  },
  {
    name: "Logitech MX Keys Mini Wireless Keyboard",
    description:
      "Compact layout with Smart Illumination, Flow cross-computer control, and USB-C charging. Compatible with Mac, Windows, Linux.",
    brand: "Logitech",
    category: "Office",
    price: 99.99,
    unit: "each",
    image: img("1587829741301-dc798b83add3"),
    images: [
      img("1587829741301-dc798b83add3"),
    ],
    rating: 4.6,
    stock: 79,
  },
  {
    name: "Rocketbook Smart Reusable Notebook",
    description:
      "Write with Pilot FriXion pens, scan with the app, then wipe clean with a damp cloth. Unlimited pages, zero waste.",
    brand: "Rocketbook",
    category: "Office",
    price: 36.99,
    unit: "each",
    image: img("1456513080510-7bf3a84b82f8"),
    images: [
      img("1456513080510-7bf3a84b82f8"),
    ],
    rating: 4.5,
    stock: 144,
  },

  // ── GROCERIES & PANTRY ─────────────────────────────────────────────────────
  {
    name: "Stumptown Hair Bender Whole Bean Coffee 12oz",
    description:
      "Bright, complex blend with milk chocolate, citrus, and berry notes. Sourced from Latin America, Africa, and Indonesia.",
    brand: "Stumptown",
    category: "Groceries & Pantry",
    price: 16.99,
    unit: "bag",
    image: img("1447933601403-0c6688de566e"),
    images: [
      img("1447933601403-0c6688de566e"),
      img("1495474472359-6e7d7b10ff44"),
    ],
    rating: 4.7,
    stock: 185,
  },
  {
    name: "California Olive Ranch Extra Virgin Olive Oil 16.9oz",
    description:
      "100% California-grown olives cold-pressed within hours of harvest. Bright, fresh flavor with artichoke and stone fruit notes.",
    brand: "California Olive Ranch",
    category: "Groceries & Pantry",
    price: 13.99,
    unit: "bottle",
    image: img("1474979266404-7eaacbcd87c5"),
    images: [
      img("1474979266404-7eaacbcd87c5"),
    ],
    rating: 4.7,
    stock: 162,
  },
  {
    name: "Bob's Red Mill Organic Rolled Oats 32oz",
    description:
      "100% whole grain oats lightly rolled to retain the bran and germ. Certified organic, non-GMO, and gluten-free facility.",
    brand: "Bob's Red Mill",
    category: "Groceries & Pantry",
    price: 7.99,
    unit: "bag",
    image: img("1574323347407-f5e1ad6d020b"),
    images: [
      img("1574323347407-f5e1ad6d020b"),
    ],
    rating: 4.7,
    stock: 210,
  },
  {
    name: "Lindt Excellence 90% Dark Chocolate Bar 100g",
    description:
      "Intensely dark with a smooth, velvety finish. Made with sustainably sourced cacao. Low sugar, high cocoa content.",
    brand: "Lindt",
    category: "Groceries & Pantry",
    price: 4.99,
    unit: "bar",
    image: img("1481391319555-bae786bce8e8"),
    images: [
      img("1481391319555-bae786bce8e8"),
    ],
    rating: 4.6,
    stock: 320,
  },
  {
    name: "Harney & Sons Royal English Breakfast Tea 50ct",
    description:
      "Bold, full-bodied black tea blend from Assam and Kenya. Individually wrapped sachets for peak freshness. Excellent with milk.",
    brand: "Harney & Sons",
    category: "Groceries & Pantry",
    price: 14.99,
    unit: "box",
    image: img("1556679343-c7306c1976bc"),
    images: [
      img("1556679343-c7306c1976bc"),
    ],
    rating: 4.7,
    stock: 195,
  },
  {
    name: "Nature Nate's Raw & Unfiltered Honey 32oz",
    description:
      "100% pure raw honey from US beekeepers. Never heated or filtered. Rich, complex wildflower flavor with no added sugars.",
    brand: "Nature Nate's",
    category: "Groceries & Pantry",
    price: 14.99,
    unit: "jar",
    image: img("1587049352846-4a222e784d38"),
    images: [
      img("1587049352846-4a222e784d38"),
    ],
    rating: 4.8,
    stock: 148,
  },
  {
    name: "Siete Grain-Free Tortilla Chips Sea Salt 5oz",
    description:
      "Made with cassava flour and avocado oil. Gluten-free, grain-free, and dairy-free. Light, crispy chip with clean ingredients.",
    brand: "Siete",
    category: "Groceries & Pantry",
    price: 5.49,
    unit: "bag",
    image: img("1574323347407-f5e1ad6d020b"),
    images: [
      img("1574323347407-f5e1ad6d020b"),
    ],
    rating: 4.5,
    stock: 275,
  },
];

async function clearCatalog() {
  console.log("Removing existing catalog data (orders, reviews, cart lines, products, categories)…");
  await prisma.review.deleteMany();
  await prisma.cartItem.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.products.deleteMany();
  await prisma.category.deleteMany();
  console.log("Catalog cleared.");
}

async function main() {
  const reset = process.env.SEED_RESET === "true" || process.env.SEED_RESET === "1";
  const existingProducts = await prisma.products.count();

  if (!reset && existingProducts > 0) {
    console.log(
      `Found ${existingProducts} products already. Skipping seed.\n` +
        "To replace everything, run: SEED_RESET=true npx prisma db seed",
    );
    return;
  }

  if (reset && existingProducts > 0) {
    await clearCatalog();
  }

  console.log("Seeding categories…");
  const categoryMap = new Map<string, number>();

  for (const name of CATEGORY_NAMES) {
    const cat = await prisma.category.upsert({
      where: { name },
      update: {},
      create: { name },
    });
    categoryMap.set(name, cat.category_id);
  }

  console.log("Seeding products…");
  let created = 0;

  for (const p of PRODUCTS) {
    const category_id = categoryMap.get(p.category)!;

    const data: any = {
      name: p.name,
      description: p.description,
      price: p.price,
      unit: p.unit,
      image: p.image,
      images: p.images,
      discount: p.discount ?? null,
      availability: Math.random() > 0.05,
      brand: p.brand,
      rating: p.rating,
      stock: p.stock ?? 50,
      category_id,
    };

    await prisma.products.create({ data });
    created++;
  }

  console.log(`Done. Created ${created} products across ${CATEGORY_NAMES.length} categories.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
