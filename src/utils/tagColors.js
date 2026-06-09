const TAG_RULES = [
  { cls: "tag--vlees",       kws: ["vlees", "rund", "steak", "bacon", "spek", "gehakt", "chorizo"] },
  { cls: "tag--vis",         kws: ["vis", "zalm", "tonijn", "garnalen"] },
  { cls: "tag--kip",         kws: ["kip", "chicken"] },
  { cls: "tag--vegetarisch", kws: ["vegetarisch", "vegan", "groente"] },
];

export function tagClass(tag) {
  const t = tag.toLowerCase();
  for (const { cls, kws } of TAG_RULES) {
    if (kws.some((kw) => t.includes(kw))) return cls;
  }
  return "";
}

// Shared by the picker filter bar AND the variety warning logic.
// threshold: warn when a category appears on this many days in one week.
export const PICKER_FILTERS = [
  { key: "vlees",       label: "Vlees",       emoji: "🥩", kws: ["vlees", "rund", "steak", "bacon", "spek", "gehakt", "chorizo"], threshold: 3 },
  { key: "vis",         label: "Vis",         emoji: "🐟", kws: ["vis", "zalm", "tonijn", "garnalen"],                            threshold: 3 },
  { key: "kip",         label: "Kip",         emoji: "🍗", kws: ["kip", "chicken"],                                               threshold: 3 },
  { key: "vegetarisch", label: "Vegetarisch", emoji: "🌱", kws: ["vegetarisch", "vegan", "groente"] },
];

export function matchesFilter(recipe, filterKey) {
  if (!filterKey) return true;
  const filter = PICKER_FILTERS.find((f) => f.key === filterKey);
  if (!filter) return true;
  const text = [recipe.name, ...(recipe.tags ?? [])].join(" ").toLowerCase();
  return filter.kws.some((kw) => text.includes(kw));
}
