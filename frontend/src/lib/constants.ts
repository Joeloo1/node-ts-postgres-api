export const FREE_SHIPPING_THRESHOLD = 50;
export const FREE_SHIPPING_FLAT_RATE = 4.99;

/* Shop price filter presets: [label, min, max] */
export const PRICE_PRESETS: [string, string, string][] = [
  ["Under $25",   "",    "25"],
  ["$25 – $75",   "25",  "75"],
  ["$75 – $150",  "75",  "150"],
  ["$150+",       "150", ""],
];
