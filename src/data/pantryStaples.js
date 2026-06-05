// Substrings matched against lowercased ingredient names.
// Any ingredient whose name contains one of these is a pantry staple by default.
export const PANTRY_KEYWORDS = [
  // Oils & fats
  "olijfolie", "plantaardige olie", "sesamolie", "zonnebloemolie",
  // Vinegar & condiments
  "azijn", "mosterd", "worcestershire",
  // Sweeteners
  "honing", "suiker",
  // Sauces & pastes
  "sojasaus", "tamari", "teriyaki", "chilisaus", "zoete chili",
  "tomatenketchup", "ketchup", "mayonaise",
  // Dry starches & grains
  "rijst", "sushirijst", "risottorijst", "jasmijnrijst",
  "pasta", "spaghetti", "penne", "lasagne",
  "bulgur", "couscous",
  // Baking
  "bloem", "bakpoeder", "zout", "peper",
  // Tinned & preserved
  "blik", "blikje", "conserven",
  "mais", "tomatenblokjes", "tomatenpuree", "kokosmelk", "ananasschijfjes",
  "kikkererwten", "bonen",
  // Dried herbs & spices
  "kruidenmix", "oregano", "paprikapoeder", "komijn", "kurkuma",
  "kaneel", "chilivlokken", "chiliviokken", "saffraan",
  "gedroogde", "specerij",
  // Seeds & nuts (shelf stable)
  "sesam", "pijnboompit",
  // Stocks & powders
  "bouillonpoeder", "bouillon",
  // UHT / long-life
  "uht melk",
  // Pasta & noodles
  "vermicelli", "noedels",
];

export function isPantryByDefault(name) {
  const lower = name.toLowerCase();
  return PANTRY_KEYWORDS.some((kw) => lower.includes(kw));
}
