export const FREE_SHIPPING_THRESHOLD = 50;
export const FREE_SHIPPING_FLAT_RATE = 4.99;

/* Shop price filter presets: [label, min, max] */
export const PRICE_PRESETS: [string, string, string][] = [
  ["Under $25",   "",    "25"],
  ["$25 – $75",   "25",  "75"],
  ["$75 – $150",  "75",  "150"],
  ["$150+",       "150", ""],
];

/* Country list shared across checkout and account address forms */
export const COUNTRIES = [
  "United States", "United Kingdom", "Canada", "Australia", "Germany",
  "France", "Netherlands", "Sweden", "Norway", "Denmark", "Switzerland",
  "Spain", "Italy", "Portugal", "Poland", "Ireland", "New Zealand",
  "Japan", "South Korea", "Singapore", "India", "China", "Brazil",
  "Mexico", "Argentina", "South Africa", "Nigeria", "Kenya",
  "United Arab Emirates", "Saudi Arabia", "Turkey",
];
