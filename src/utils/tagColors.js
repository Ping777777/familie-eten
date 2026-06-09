const TAG_RULES = [
  { cls: "tag--vlees",       kws: ["vlees", "rund", "steak", "bacon", "gehakt"] },
  { cls: "tag--vis",         kws: ["vis", "zalm", "tonijn"] },
  { cls: "tag--kip",         kws: ["kip", "chicken"] },
  { cls: "tag--vegetarisch", kws: ["vegetarisch", "vegan", "groente"] },
  { cls: "tag--burger",      kws: ["burger"] },
];

export function tagClass(tag) {
  const t = tag.toLowerCase();
  for (const { cls, kws } of TAG_RULES) {
    if (kws.some((kw) => t.includes(kw))) return cls;
  }
  return "";
}

// Same keyword sets used for the picker filter bar
export const PICKER_FILTERS = [
  { key: "vlees",       label: "Vlees",       emoji: "🥩", kws: ["vlees", "rund", "steak", "bacon", "gehakt"] },
  { key: "vis",         label: "Vis",         emoji: "🐟", kws: ["vis", "zalm", "tonijn"] },
  { key: "kip",         label: "Kip",         emoji: "🍗", kws: ["kip", "chicken"] },
  { key: "vegetarisch", label: "Vegetarisch", emoji: "🌱", kws: ["vegetarisch", "vegan", "groente"] },
  { key: "burger",      label: "Burger",      emoji: "🍔", kws: ["burger"] },
];

export function matchesFilter(recipe, filterKey) {
  if (!filterKey) return true;
  const filter = PICKER_FILTERS.find((f) => f.key === filterKey);
  if (!filter) return true;
  const text = [recipe.name, ...(recipe.tags ?? [])].join(" ").toLowerCase();
  return filter.kws.some((kw) => text.includes(kw));
}
