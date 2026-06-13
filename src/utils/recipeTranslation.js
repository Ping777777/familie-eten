import { recipeTranslations } from "../data/recipeTranslations";

export function getRecipeName(recipe, lang) {
  if (!recipe || lang === "nl") return recipe?.name;
  return recipeTranslations[lang]?.[recipe.id]?.name ?? recipe.name;
}

export function getIngredientName(recipe, ingredientIndex, lang) {
  if (!recipe || lang === "nl") return recipe?.ingredients[ingredientIndex]?.name;
  const names = recipeTranslations[lang]?.[recipe.id]?.ingredients;
  return names?.[ingredientIndex] ?? recipe.ingredients[ingredientIndex]?.name;
}

export function getInstructions(recipe, lang) {
  if (!recipe || lang === "nl") return recipe?.instructions ?? [];
  return recipeTranslations[lang]?.[recipe.id]?.instructions ?? recipe.instructions ?? [];
}

const TAG_MAP = {
  en: {
    vlees: "meat", vis: "fish", kip: "chicken", vegetarisch: "vegetarian",
    pasta: "pasta", rijst: "rice", soep: "soup", salade: "salad",
    oven: "oven", grill: "grill", snel: "quick", gezond: "healthy",
    budget: "budget", burger: "burger", stoofpot: "stew",
    aziatisch: "asian", mexicaans: "mexican", italiaans: "italian",
    grieks: "greek", japans: "japanese", koreaans: "korean", thais: "thai",
    indisch: "indian", amerikaans: "american", spaans: "spanish",
    seafood: "seafood", vegan: "vegan", glutenvrij: "gluten-free",
    zuivelvrij: "dairy-free", noten: "nuts", pittig: "spicy",
    zoet: "sweet", zuur: "sour", romig: "creamy", licht: "light",
    stevig: "hearty", zomers: "summery", winters: "wintery",
  },
  ru: {
    vlees: "мясо", vis: "рыба", kip: "курица", vegetarisch: "вегетарианское",
    pasta: "паста", rijst: "рис", soep: "суп", salade: "салат",
    oven: "духовка", grill: "гриль", snel: "быстро", gezond: "полезно",
    budget: "бюджетно", burger: "бургер", stoofpot: "тушёное",
    aziatisch: "азиатское", mexicaans: "мексиканское", italiaans: "итальянское",
    grieks: "греческое", japans: "японское", koreaans: "корейское", thais: "тайское",
    indisch: "индийское", amerikaans: "американское", spaans: "испанское",
    seafood: "морепродукты", vegan: "веганское", glutenvrij: "без глютена",
    zuivelvrij: "без молока", noten: "орехи", pittig: "острое",
    zoet: "сладкое", zuur: "кислое", romig: "сливочное", licht: "лёгкое",
    stevig: "сытное", zomers: "летнее", winters: "зимнее",
  },
};

export function translateTag(tag, lang) {
  if (!tag || lang === "nl") return tag;
  return TAG_MAP[lang]?.[tag.toLowerCase()] ?? tag;
}

const UNIT_MAP = {
  en: {
    el: "tbsp", tl: "tsp",
    mespunt: "pinch", snuf: "pinch", scheutje: "dash",
    stuks: "pcs", stukken: "pieces",
    blikje: "can", blik: "can",
    pakje: "packet", pakjes: "packets",
    potje: "jar", potjes: "jars",
    kuipje: "tub", kuipjes: "tubs",
    kroppen: "heads", teen: "clove", bol: "bulb",
    bos: "bunch", plak: "slice",
  },
  ru: {
    el: "ст.л.", tl: "ч.л.",
    mespunt: "на кончике ножа", snuf: "щепотка", scheutje: "немного",
    stuks: "шт.", stukken: "кусков",
    blikje: "банка", blik: "банка",
    pakje: "пакет", pakjes: "пакетов",
    potje: "баночка", potjes: "банок",
    kuipje: "стаканчик", kuipjes: "стаканчиков",
    kroppen: "кочана", teen: "зубчик", bol: "головка",
    bos: "пучок", plak: "ломтик",
  },
};

export function translateUnit(unit, lang) {
  if (!unit || lang === "nl") return unit;
  return UNIT_MAP[lang]?.[unit.toLowerCase()] ?? unit;
}
