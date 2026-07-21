// Food knowledge: supermarket-aisle classification + pantry defaults.
// Keyword matching on lowercase Dutch ingredient names (the storage language).

const AISLES = [
  ["produce", ["ui", "uien", "knoflook", "tomaat", "tomaten", "paprika", "wortel", "courgette", "broccoli", "bloemkool", "spinazie", "sla", "romaine", "little gem", "komkommer", "citroen", "limoen", "appel", "peer", "peren", "banaan", "champignon", "prei", "bosui", "aardappel", "krieltjes", "avocado", "gember", "peterselie", "koriander", "basilicum", "bieslook", "tijm", "munt", "rucola", "paksoi", "taugé", "sperziebonen", "boerenkool", "puntpaprika", "rode peper", "chilipeper", "cherrytomaten", "puimtomaat", "radicchio", "slamix", "bleekselderij", "broccolini", "bimi", "mini-komkommer", "spruiten", "pompoen", "aubergine", "mango", "druiven", "aardbeien", "fruit", "groente"]],
  ["meatfish", ["kip", "kipfilet", "kippendij", "gehakt", "rundergehakt", "worst", "chorizo", "spek", "bacon", "ontbijtspek", "varkenshaas", "buikspek", "zalm", "vis", "tonijn", "garnalen", "kabeljauw", "biefstuk", "steak", "rookworst", "hamburger", "kipburger", "shoarma", "kebab", "vleeswaren", "ham", "salami"]],
  ["dairy", ["melk", "yoghurt", "kaas", "roomboter", "boter", "eieren", "ei ", "room", "crème fraîche", "kwark", "mozzarella", "parmezaan", "parmigiano", "cheddar", "feta", "witte kaas", "geraspte", "slagroom", "karnemelk", "miso"]],
  ["bakery", ["brood", "pita", "ciabatta", "briochebroodje", "tortilla", "wraps", "croissant", "beschuit", "crackers", "havermout", "muesli", "cornflakes", "ontbijtkoek", "pannenkoek"]],
  ["frozen", ["diepvries", "ijs", "bevroren", "doperwten"]],
  ["pantry", ["pasta", "spaghetti", "linguine", "tagliatelle", "penne", "macaroni", "rijst", "noedels", "bulgur", "couscous", "quinoa", "bonen", "kikkererwten", "kidneybonen", "linzen", "mais", "passata", "tomatenblokjes", "tomatenpuree", "bouillon", "olie", "olijfolie", "zonnebloemolie", "sesamolie", "azijn", "sojasaus", "ketjap", "teriyakisaus", "sambal", "harissa", "mosterd", "mayonaise", "ketchup", "curry", "kruiden", "specerijen", "kurkuma", "paneermeel", "panko", "bloem", "suiker", "zout", "peper", "honing", "pindakaas", "jam", "chocolade", "koekjes", "chips", "noten", "olijven", "kokosmelk", "furikake", "kimchi", "guacamole", "stroop", "gemberpuree", "worcestershiresaus", "chilipasta", "gochujang", "tahin", "vissaus", "oestersaus"]],
];

export function aisleFor(name) {
  const n = ` ${String(name).toLowerCase()} `;
  for (const [aisle, kws] of AISLES) {
    if (kws.some((k) => n.includes(k))) return aisle;
  }
  return "other";
}

export const AISLE_ORDER = ["produce", "bakery", "dairy", "meatfish", "pantry", "frozen", "other", "extra"];

// Things a family normally has at home — start in the pantry section
// instead of the buy list. Users can flip any item; flips sync via
// the pantry-overrides blob.
const PANTRY_DEFAULT = ["olijfolie", "zonnebloemolie", "sesamolie", "azijn", "wittewijnazijn", "rodewijnazijn", "balsamicoazijn", "sojasaus", "ketjap", "zout", "peper", "peper en zout", "suiker", "bloem", "boter", "roomboter", "mosterd", "mayonaise", "ketchup", "sambal", "honing", "bouillon", "bouillonblokje", "kruiden", "specerijen", "kurkuma", "oregano", "tijm", "paprikapoeder", "komijn", "kaneel", "melk", "water", "rijst", "pasta", "spaghetti", "knoflook", "gemberpuree", "worcestershiresaus", "olie"];

export function pantryByDefault(name) {
  const n = String(name).toLowerCase();
  return PANTRY_DEFAULT.some((k) => n === k || n.includes(k));
}

export const DAYS = ["Maandag", "Dinsdag", "Woensdag", "Donderdag", "Vrijdag", "Zaterdag", "Zondag"];
export const FAMILY = ["Neil", "Larisa", "Inga", "Kevin"];
export const MEMBER_COLORS = { Neil: "#2a9d8f", Larisa: "#fc7600", Inga: "#5cb85c", Kevin: "#e0b13e" };

export const SPECIAL_MEALS = [
  { id: -1, key: "special_leftovers", emoji: "🍱" },
  { id: -2, key: "special_takeout", emoji: "🥡" },
  { id: -3, key: "special_out", emoji: "🍽️" },
];

// Category filters — shared by the picker chips and variety notes.
export const CATEGORIES = [
  { key: "vlees", emoji: "🥩", kws: ["vlees", "rund", "steak", "bacon", "spek", "gehakt", "chorizo", "worst", "varken"], threshold: 3 },
  { key: "vis", emoji: "🐟", kws: ["vis", "zalm", "tonijn", "garnalen"], threshold: 3 },
  { key: "kip", emoji: "🍗", kws: ["kip", "chicken"], threshold: 3 },
  { key: "vegetarisch", emoji: "🌱", kws: ["vegetarisch", "vegan", "groente"] },
];

export function matchesCategory(recipe, key) {
  if (!key) return true;
  const cat = CATEGORIES.find((c) => c.key === key);
  if (!cat) return true;
  const text = [recipe.name, ...(recipe.tags ?? [])].join(" ").toLowerCase();
  return cat.kws.some((k) => text.includes(k));
}

// Parse a free-text ingredient line: "400 g spaghetti" -> {amount, unit, name}
const UNITS = "g|kg|ml|l|el|tl|stuks|teen|tenen|zakjes?|pak(?:ken|jes?)?|blik(?:ken)?|plakjes?|bosjes?|kroppen|stengels?|blokjes|potjes?|snuf";
export function parseIngredient(line) {
  const s = line.trim();
  if (!s) return null;
  const m = s.match(new RegExp(`^([\\d½.,]+)\\s*(${UNITS})?\\s+(.+)$`, "i"));
  if (m) return { amount: m[1], unit: m[2] ?? "", name: m[3].trim() };
  return { amount: "", unit: "", name: s };
}
export function formatIngredientLine(ing) {
  return [ing.amount, ing.unit, ing.name].filter(Boolean).join(" ");
}

// Repair "mojibake" emoji — a UTF-8 emoji byte sequence that some importer
// mis-read as Windows-1252, so 🍚 got stored as "ðŸš". Only touches strings
// that are entirely low-byte (<=0xFF) AND decode back to a real emoji, so
// genuine emoji and plain text pass through unchanged.
const CP1252_DECODE = { 0x80: 0x20AC, 0x82: 0x201A, 0x83: 0x0192, 0x84: 0x201E, 0x85: 0x2026, 0x86: 0x2020, 0x87: 0x2021, 0x88: 0x02C6, 0x89: 0x2030, 0x8A: 0x0160, 0x8B: 0x2039, 0x8C: 0x0152, 0x8E: 0x017D, 0x91: 0x2018, 0x92: 0x2019, 0x93: 0x201C, 0x94: 0x201D, 0x95: 0x2022, 0x96: 0x2013, 0x97: 0x2014, 0x98: 0x02DC, 0x99: 0x2122, 0x9A: 0x0161, 0x9B: 0x203A, 0x9C: 0x0153, 0x9E: 0x017E, 0x9F: 0x0178 };
const CP1252_ENCODE = Object.fromEntries(Object.entries(CP1252_DECODE).map(([b, cp]) => [cp, Number(b)]));
export function fixEmoji(s) {
  if (typeof s !== "string" || !s) return s;
  const bytes = [];
  let hasHigh = false;
  for (const ch of s) {
    const cp = ch.codePointAt(0);
    const byte = cp <= 0xFF ? cp : CP1252_ENCODE[cp];
    if (byte == null) return s;          // not a Windows-1252 char -> real emoji / normal text
    if (byte >= 0x80) hasHigh = true;
    bytes.push(byte);
  }
  if (!hasHigh) return s;                 // pure ASCII -> nothing to reinterpret
  try {
    const out = new TextDecoder("utf-8", { fatal: true }).decode(new Uint8Array(bytes));
    return [...out].some((c) => c.codePointAt(0) > 0xFF) ? out : s;
  } catch { return s; }
}
