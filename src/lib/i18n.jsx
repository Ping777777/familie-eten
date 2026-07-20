/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState } from "react";

const LS_LANG = "familie-eten:lang";

const S = {
  nl: {
    tabWeek: "Week", tabRecipes: "Recepten", tabShopping: "Boodschappen",
    thisWeek: "Deze week", tonight: "Vanavond", cookedBy: "gekozen door",
    nothingTonight: "Nog niets gepland voor vanavond",
    pickTonight: "Kies iets lekkers",
    freeDay: "Vrij", chooseMeal: "Kies een maaltijd", replaceFor: "voor",
    search: "Zoek", searchRecipes: "Zoek recept of tag...", all: "Alle",
    used: "al gepland", remove: "Verwijder", swap: "Wissel", cancel: "Annuleer", done: "Klaar",
    save: "Bewaar", edit: "Wijzig", add: "Voeg toe", close: "Sluit",
    varietyNote: (l, n) => `${n}× ${l} deze week — misschien iets afwisselen?`,
    recipes: "Recepten", favorites: "Favorieten", archive: "Archief",
    restore: "Zet terug", newRecipe: "Nieuw recept",
    ingredients: "Ingrediënten", steps: "Bereiding", persons: "pers.",
    plan: "Plan", dayTaken: "bezet",
    exportRecipes: "Exporteer recepten", importRecipes: "Importeer recepten",
    notLoadedYet: "Nog niet geladen — probeer het zo weer",
    imported: (n) => `${n} recepten geïmporteerd`,
    importSkipped: (d, i) => `${d} dubbel, ${i} ongeldig`,
    name: "Naam", emoji: "Emoji", tags: "Tags (komma's)", servings: "Personen",
    ingredientsHint: "één per regel: 400 g spaghetti",
    stepsHint: "één stap per regel",
    deleteRecipe: "Verwijder recept", confirmDelete: "Definitief verwijderen?",
    shopping: "Boodschappen", checkedOff: "afgevinkt",
    addItem: "Artikel toevoegen...", pantry: "In de kast", staples: "Vast op de lijst",
    toPantry: "Kast", toList: "Lijst", clearChecked: "Wis vinkjes",
    aisle_produce: "Groente & Fruit", aisle_meatfish: "Vlees & Vis",
    aisle_dairy: "Zuivel & Eieren", aisle_bakery: "Brood & Ontbijt",
    aisle_pantry: "Houdbaar", aisle_frozen: "Diepvries", aisle_other: "Overig",
    aisle_extra: "Zelf toegevoegd",
    catOntbijt: "Ontbijt", catLunch: "Lunch", catTussendoor: "Tussendoor", catOverig: "Overig",
    prevWeek: "Vorige week", nextWeek: "Volgende week", weekN: (n) => `Week ${n}`,
    swipeHint: "vegen",
    nothingToBuy: "Niets te kopen", planSomething: "Plan eerst wat maaltijden voor deze week.",
    sendPicnic: "Naar Picnic", sentPicnic: (n) => `${n} artikelen naar je Picnic-mandje`,
    noAssociation: (n) => `${n} zonder Picnic-koppeling overgeslagen`,
    settings: "Instellingen", language: "Taal", loggedInAs: "Ingelogd als",
    logout: "Log uit", picnic: "Picnic",
    picnicLogin: "Log in bij Picnic", picnicLogout: "Log uit bij Picnic",
    picnicUser: "Gebruikersnaam", picnicPass: "Wachtwoord", picnicCode: "SMS-code",
    picnicLinked: "Gekoppeld product", picnicResults: "Resultaten",
    picnicSearchPh: "Zoek in Picnic...", picnicCart: "Picnic-mandje",
    picnicCartEmpty: "Je mandje is leeg.", total: "Totaal",
    picnicNone: "geen koppeling", picnicNeeded: "Nodig", picnicChoose: "Kies", picnicChange: "Wijzig",
    picnicOutOfStock: "Niet op voorraad",
    selectAll: "Selecteer alles", deselectAll: "Deselecteer alles", loading: "Laden...",
    login: "Log in", welcome: "Welkom terug",
    loginHint: "Log in met je gezinsaccount",
    username: "Naam", password: "Wachtwoord", wrongLogin: "Onjuiste naam of wachtwoord",
    special_leftovers: "Restjes", special_takeout: "Afhalen", special_out: "Uit eten",
    days: { Maandag: "Maandag", Dinsdag: "Dinsdag", Woensdag: "Woensdag", Donderdag: "Donderdag", Vrijdag: "Vrijdag", Zaterdag: "Zaterdag", Zondag: "Zondag" },
    months: ["januari","februari","maart","april","mei","juni","juli","augustus","september","oktober","november","december"],
  },
  en: {
    tabWeek: "Week", tabRecipes: "Recipes", tabShopping: "Groceries",
    thisWeek: "This week", tonight: "Tonight", cookedBy: "picked by",
    nothingTonight: "Nothing planned for tonight yet",
    pickTonight: "Pick something tasty",
    freeDay: "Free", chooseMeal: "Choose a meal", replaceFor: "for",
    search: "Search", searchRecipes: "Search recipe or tag...", all: "All",
    used: "already planned", remove: "Remove", swap: "Swap", cancel: "Cancel", done: "Done",
    save: "Save", edit: "Edit", add: "Add", close: "Close",
    varietyNote: (l, n) => `${l} ${n}× this week — maybe mix it up?`,
    recipes: "Recipes", favorites: "Favorites", archive: "Archive",
    restore: "Restore", newRecipe: "New recipe",
    ingredients: "Ingredients", steps: "Method", persons: "servings",
    plan: "Plan", dayTaken: "taken",
    exportRecipes: "Export recipes", importRecipes: "Import recipes",
    notLoadedYet: "Hasn't loaded yet — try again in a moment",
    imported: (n) => `${n} recipes imported`,
    importSkipped: (d, i) => `${d} duplicates, ${i} invalid`,
    name: "Name", emoji: "Emoji", tags: "Tags (commas)", servings: "Servings",
    ingredientsHint: "one per line: 400 g spaghetti",
    stepsHint: "one step per line",
    deleteRecipe: "Delete recipe", confirmDelete: "Delete permanently?",
    shopping: "Groceries", checkedOff: "checked off",
    addItem: "Add an item...", pantry: "In the pantry", staples: "Always on the list",
    toPantry: "Pantry", toList: "List", clearChecked: "Clear checks",
    aisle_produce: "Fruit & Veg", aisle_meatfish: "Meat & Fish",
    aisle_dairy: "Dairy & Eggs", aisle_bakery: "Bread & Breakfast",
    aisle_pantry: "Cupboard", aisle_frozen: "Frozen", aisle_other: "Other",
    aisle_extra: "Added by you",
    catOntbijt: "Breakfast", catLunch: "Lunch", catTussendoor: "Snacks", catOverig: "Other",
    prevWeek: "Previous week", nextWeek: "Next week", weekN: (n) => `Week ${n}`,
    swipeHint: "swipe",
    nothingToBuy: "Nothing to buy", planSomething: "Plan some meals for this week first.",
    sendPicnic: "Send to Picnic", sentPicnic: (n) => `${n} items sent to your Picnic basket`,
    noAssociation: (n) => `${n} without Picnic link skipped`,
    settings: "Settings", language: "Language", loggedInAs: "Signed in as",
    logout: "Sign out", picnic: "Picnic",
    picnicLogin: "Sign in to Picnic", picnicLogout: "Sign out of Picnic",
    picnicUser: "Username", picnicPass: "Password", picnicCode: "SMS code",
    picnicLinked: "Linked product", picnicResults: "Results",
    picnicSearchPh: "Search Picnic...", picnicCart: "Picnic basket",
    picnicCartEmpty: "Your basket is empty.", total: "Total",
    picnicNone: "no link", picnicNeeded: "Needed", picnicChoose: "Choose", picnicChange: "Change",
    picnicOutOfStock: "Out of stock",
    selectAll: "Select all", deselectAll: "Deselect all", loading: "Loading...",
    login: "Sign in", welcome: "Welcome back",
    loginHint: "Sign in with your family account",
    username: "Name", password: "Password", wrongLogin: "Wrong name or password",
    special_leftovers: "Leftovers", special_takeout: "Takeaway", special_out: "Eating out",
    days: { Maandag: "Monday", Dinsdag: "Tuesday", Woensdag: "Wednesday", Donderdag: "Thursday", Vrijdag: "Friday", Zaterdag: "Saturday", Zondag: "Sunday" },
    months: ["January","February","March","April","May","June","July","August","September","October","November","December"],
  },
  ru: {
    tabWeek: "Неделя", tabRecipes: "Рецепты", tabShopping: "Покупки",
    thisWeek: "Эта неделя", tonight: "Сегодня", cookedBy: "выбор:",
    nothingTonight: "На сегодня ещё ничего не запланировано",
    pickTonight: "Выбрать что-нибудь вкусное",
    freeDay: "Свободно", chooseMeal: "Выберите блюдо", replaceFor: "на",
    search: "Поиск", searchRecipes: "Поиск рецепта или тега...", all: "Все",
    used: "уже в плане", remove: "Удалить", swap: "Заменить", cancel: "Отмена", done: "Готово",
    save: "Сохранить", edit: "Изменить", add: "Добавить", close: "Закрыть",
    varietyNote: (l, n) => `${l} ${n}× на этой неделе — может, разнообразить?`,
    recipes: "Рецепты", favorites: "Избранное", archive: "Архив",
    restore: "Вернуть", newRecipe: "Новый рецепт",
    ingredients: "Ингредиенты", steps: "Приготовление", persons: "порц.",
    plan: "План", dayTaken: "занято",
    exportRecipes: "Экспорт рецептов", importRecipes: "Импорт рецептов",
    notLoadedYet: "Ещё не загружено — попробуйте через момент",
    imported: (n) => `Импортировано: ${n}`,
    importSkipped: (d, i) => `${d} дублей, ${i} неверных`,
    name: "Название", emoji: "Эмодзи", tags: "Теги (через запятую)", servings: "Порции",
    ingredientsHint: "по одному в строке: 400 g spaghetti",
    stepsHint: "один шаг в строке",
    deleteRecipe: "Удалить рецепт", confirmDelete: "Удалить навсегда?",
    shopping: "Покупки", checkedOff: "куплено",
    addItem: "Добавить товар...", pantry: "В кладовой", staples: "Всегда в списке",
    toPantry: "Кладовая", toList: "Список", clearChecked: "Снять отметки",
    aisle_produce: "Овощи и фрукты", aisle_meatfish: "Мясо и рыба",
    aisle_dairy: "Молочное и яйца", aisle_bakery: "Хлеб и завтрак",
    aisle_pantry: "Бакалея", aisle_frozen: "Заморозка", aisle_other: "Прочее",
    aisle_extra: "Добавлено вручную",
    catOntbijt: "Завтрак", catLunch: "Обед", catTussendoor: "Перекус", catOverig: "Прочее",
    prevWeek: "Предыдущая неделя", nextWeek: "Следующая неделя", weekN: (n) => `Неделя ${n}`,
    swipeHint: "смахните",
    nothingToBuy: "Покупать нечего", planSomething: "Сначала запланируйте блюда на неделю.",
    sendPicnic: "В Picnic", sentPicnic: (n) => `${n} товаров в корзину Picnic`,
    noAssociation: (n) => `${n} без привязки Picnic пропущено`,
    settings: "Настройки", language: "Язык", loggedInAs: "Вы вошли как",
    logout: "Выйти", picnic: "Picnic",
    picnicLogin: "Войти в Picnic", picnicLogout: "Выйти из Picnic",
    picnicUser: "Имя пользователя", picnicPass: "Пароль", picnicCode: "Код из SMS",
    picnicLinked: "Привязанный товар", picnicResults: "Результаты",
    picnicSearchPh: "Поиск в Picnic...", picnicCart: "Корзина Picnic",
    picnicCartEmpty: "Корзина пуста.", total: "Итого",
    picnicNone: "нет привязки", picnicNeeded: "Нужно", picnicChoose: "Выбрать", picnicChange: "Изменить",
    picnicOutOfStock: "Нет в наличии",
    selectAll: "Выбрать все", deselectAll: "Снять все", loading: "Загрузка...",
    login: "Войти", welcome: "С возвращением",
    loginHint: "Войдите с семейным аккаунтом",
    username: "Имя", password: "Пароль", wrongLogin: "Неверное имя или пароль",
    special_leftovers: "Остатки", special_takeout: "Навынос", special_out: "В ресторан",
    days: { Maandag: "Понедельник", Dinsdag: "Вторник", Woensdag: "Среда", Donderdag: "Четверг", Vrijdag: "Пятница", Zaterdag: "Суббота", Zondag: "Воскресенье" },
    months: ["января","февраля","марта","апреля","мая","июня","июля","августа","сентября","октября","ноября","декабря"],
  },
};

const TAG_MAP = {
  en: { vlees: "meat", vis: "fish", kip: "chicken", vegetarisch: "vegetarian", pasta: "pasta", soep: "soup", salade: "salad", aziatisch: "asian", mexicaans: "mexican", italiaans: "italian", japans: "japanese", koreaans: "korean", curry: "curry", bowl: "bowl", wraps: "wraps", burger: "burger", zoet: "sweet", winter: "winter", gezond: "healthy" },
  ru: { vlees: "мясо", vis: "рыба", kip: "курица", vegetarisch: "вегетарианское", pasta: "паста", soep: "суп", salade: "салат", aziatisch: "азиатское", mexicaans: "мексиканское", italiaans: "итальянское", japans: "японское", koreaans: "корейское", curry: "карри", bowl: "боул", wraps: "роллы", burger: "бургер", zoet: "сладкое", winter: "зимнее", gezond: "полезное" },
};
const UNIT_MAP = {
  en: { el: "tbsp", tl: "tsp", stuks: "pcs", teen: "clove", tenen: "cloves", zakje: "sachet", zakjes: "sachets", pak: "pack", pakken: "packs", pakje: "packet", pakjes: "packets", blik: "can", blikken: "cans", plakjes: "slices", bosje: "bunch", bosjes: "bunches", kroppen: "heads", stengels: "stalks", blokjes: "cubes", potjes: "jars", snuf: "pinch" },
  ru: { el: "ст.л.", tl: "ч.л.", stuks: "шт.", teen: "зубчик", tenen: "зубчика", zakje: "пакетик", zakjes: "пакетика", pak: "упаковка", pakken: "упаковки", pakje: "пакет", pakjes: "пакета", blik: "банка", blikken: "банки", plakjes: "ломтика", bosje: "пучок", bosjes: "пучка", kroppen: "кочана", stengels: "стебля", blokjes: "кубика", potjes: "баночки", snuf: "щепотка" },
};

const Ctx = createContext(null);

export function LangProvider({ children }) {
  const [lang, setLangState] = useState(() => localStorage.getItem(LS_LANG) || "nl");
  const setLang = (code) => { setLangState(code); localStorage.setItem(LS_LANG, code); };
  const t = S[lang] ?? S.nl;
  return <Ctx.Provider value={{ lang, setLang, t }}>{children}</Ctx.Provider>;
}
export const useLang = () => useContext(Ctx);

export function recipeName(recipe, lang) {
  if (!recipe || lang === "nl") return recipe?.name;
  return recipe.translations?.[lang]?.name ?? recipe.name;
}
export function ingredientName(recipe, idx, lang) {
  if (!recipe || lang === "nl") return recipe?.ingredients[idx]?.name;
  return recipe.translations?.[lang]?.ingredients?.[idx] ?? recipe.ingredients[idx]?.name;
}
export function instructions(recipe, lang) {
  if (!recipe || lang === "nl") return recipe?.instructions ?? [];
  return recipe.translations?.[lang]?.instructions ?? recipe.instructions ?? [];
}
export function trTag(tag, lang) {
  if (!tag || lang === "nl") return tag;
  return TAG_MAP[lang]?.[tag.toLowerCase()] ?? tag;
}
export function trUnit(unit, lang) {
  if (!unit || lang === "nl") return unit;
  return UNIT_MAP[lang]?.[unit.toLowerCase()] ?? unit;
}
const CAT_KEY = { Ontbijt: "catOntbijt", Lunch: "catLunch", Tussendoor: "catTussendoor", Overig: "catOverig" };
export function trCategory(category, t) {
  return t[CAT_KEY[category]] ?? category;
}

// Title for a week relative to today: "Deze week" / "Volgende week" /
// "Vorige week", or "Week N" beyond that (issue #138).
export function weekTitle(offset, t, isoWeek) {
  if (offset === 0) return t.thisWeek;
  if (offset === 1) return t.nextWeek;
  if (offset === -1) return t.prevWeek;
  return t.weekN(isoWeek);
}
