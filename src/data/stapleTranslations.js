// Case-insensitive lookup for common Dutch grocery/household staple names.
// Keys are Dutch (lowercase). Falls back to original name if not found.

const STAPLE_MAP = {
  en: {
    // Dairy & eggs
    "melk": "milk", "halfvolle melk": "semi-skimmed milk", "volle melk": "full-fat milk",
    "magere melk": "skimmed milk", "boter": "butter", "roomboter": "butter",
    "margarine": "margarine", "kaas": "cheese", "eieren": "eggs", "ei": "egg",
    "yoghurt": "yoghurt", "kwark": "quark", "slagroom": "cream", "crème fraîche": "crème fraîche",
    "roomkaas": "cream cheese", "smeerkaas": "spreadable cheese", "cottage cheese": "cottage cheese",
    "mozzarella": "mozzarella", "cheddar": "cheddar", "parmezaan": "parmesan",
    "feta": "feta", "brie": "brie", "gouda": "gouda",

    // Bread & bakery
    "brood": "bread", "witbrood": "white bread", "volkoren brood": "wholegrain bread",
    "bruinbrood": "brown bread", "stokbrood": "baguette", "ciabatta": "ciabatta",
    "crackers": "crackers", "beschuit": "rusks", "knäckebröd": "crispbread",
    "ontbijtkoek": "spiced gingerbread", "croissants": "croissants",

    // Breakfast
    "hagelslag": "chocolate sprinkles", "jam": "jam", "honing": "honey",
    "pindakaas": "peanut butter", "notenpasta": "nut butter",
    "cornflakes": "cornflakes", "muesli": "muesli", "granola": "granola",
    "havermout": "oatmeal", "suiker": "sugar",

    // Drinks
    "sinaasappelsap": "orange juice", "appelsap": "apple juice",
    "vers geperst sap": "freshly squeezed juice", "multivitaminesap": "multivitamin juice",
    "koffie": "coffee", "thee": "tea", "water": "water",
    "spa": "sparkling water", "spa rood": "sparkling water", "spa blauw": "still water",
    "melkdrink": "milk drink", "chocolademelk": "chocolate milk", "karnemelk": "buttermilk",
    "bier": "beer", "wijn": "wine", "rode wijn": "red wine", "witte wijn": "white wine",
    "frisdrank": "soft drink", "cola": "cola", "limonade": "lemonade",

    // Meat & fish
    "kip": "chicken", "kipfilet": "chicken fillet", "kipgehakt": "chicken mince",
    "gehakt": "minced meat", "rundergehakt": "beef mince", "varkensgehakt": "pork mince",
    "biefstuk": "steak", "entrecote": "sirloin", "gehaktballen": "meatballs",
    "spek": "bacon", "ham": "ham", "salami": "salami", "worst": "sausage",
    "braadworst": "frying sausage", "rookworst": "smoked sausage",
    "vleeswaren": "cold cuts", "kipstukjes": "chicken pieces",
    "zalm": "salmon", "tonijn": "tuna", "garnalen": "prawns", "vissticks": "fish fingers",
    "haring": "herring", "makreel": "mackerel", "sardines": "sardines",

    // Vegetables
    "aardappels": "potatoes", "aardappelen": "potatoes", "krieltjes": "new potatoes",
    "uien": "onions", "ui": "onion", "rode ui": "red onion", "sjalotjes": "shallots",
    "knoflook": "garlic", "tomaten": "tomatoes", "tomaat": "tomato",
    "cherry tomaten": "cherry tomatoes", "komkommer": "cucumber", "komkommers": "cucumbers",
    "paprika": "bell pepper", "paprika's": "bell peppers", "rode paprika": "red pepper",
    "groene paprika": "green pepper", "gele paprika": "yellow pepper",
    "wortels": "carrots", "wortel": "carrot", "broccoli": "broccoli",
    "bloemkool": "cauliflower", "spruitjes": "Brussels sprouts",
    "sla": "lettuce", "ijsbergsla": "iceberg lettuce", "rucola": "rocket",
    "spinazie": "spinach", "courgette": "courgette", "aubergine": "aubergine",
    "champignons": "mushrooms", "prei": "leek", "selderij": "celery",
    "avocado": "avocado", "avocado's": "avocados", "maïs": "corn",
    "mais": "corn", "erwten": "peas", "sperziebonen": "green beans",
    "asperges": "asparagus", "venkel": "fennel", "rode kool": "red cabbage",
    "witte kool": "white cabbage", "savooiekool": "savoy cabbage",
    "groente": "vegetables", "verse groente": "fresh vegetables",

    // Fruit
    "appels": "apples", "appel": "apple", "peren": "pears", "peer": "pear",
    "bananen": "bananas", "banaan": "banana", "sinaasappels": "oranges",
    "sinaasappel": "orange", "mandarijnen": "mandarins", "citroenen": "lemons",
    "citroen": "lemon", "limoenen": "limes", "limoen": "lime",
    "druiven": "grapes", "aardbeien": "strawberries", "frambozen": "raspberries",
    "bosbessen": "blueberries", "kiwi": "kiwi", "mango": "mango",
    "ananas": "pineapple", "meloen": "melon", "watermeloen": "watermelon",
    "fruit": "fruit",

    // Pantry
    "rijst": "rice", "pasta": "pasta", "spaghetti": "spaghetti",
    "penne": "penne", "fusilli": "fusilli", "rigatoni": "rigatoni",
    "noedels": "noodles", "couscous": "couscous", "bulgur": "bulgur",
    "linzen": "lentils", "kikkererwten": "chickpeas", "bonen": "beans",
    "bruine bonen": "brown beans", "witte bonen": "white beans",
    "bloem": "flour", "paneermeel": "breadcrumbs", "panko": "panko",
    "zout": "salt", "peper": "pepper", "zwarte peper": "black pepper",
    "paprikapoeder": "paprika powder", "komijn": "cumin", "oregano": "oregano",
    "basilicum": "basil", "tijm": "thyme", "rozemarijn": "rosemary",
    "koriander": "coriander", "kaneel": "cinnamon", "nootmuskaat": "nutmeg",
    "currypoeder": "curry powder", "kurkuma": "turmeric",
    "olijfolie": "olive oil", "zonnebloemolie": "sunflower oil",
    "sesamolie": "sesame oil", "kokosolie": "coconut oil",
    "azijn": "vinegar", "wijnazijn": "wine vinegar", "balsamicoazijn": "balsamic vinegar",
    "sojasaus": "soy sauce", "tamari": "tamari", "worcestershiresaus": "worcestershire sauce",
    "mayonaise": "mayonnaise", "ketchup": "ketchup", "mosterd": "mustard",
    "tomatenpuree": "tomato purée", "gedroogde tomaten": "sun-dried tomatoes",
    "blik tomaten": "canned tomatoes", "blikje mais": "canned corn",
    "blikjes mais": "canned corn", "kokosmelk": "coconut milk",
    "bouillon": "stock", "kippenbouillon": "chicken stock",
    "runderbouillon": "beef stock", "groentebouillon": "vegetable stock",

    // Sauces & condiments
    "teriyakisaus": "teriyaki sauce", "sriracha": "sriracha",
    "chilisaus": "chili sauce", "zoete chilisaus": "sweet chili sauce",
    "hoïsinsaus": "hoisin sauce", "oestersaus": "oyster sauce",
    "pesto": "pesto", "tomatensaus": "tomato sauce", "arrabiatasaus": "arrabbiata sauce",
    "bbq saus": "BBQ sauce", "sambal": "sambal",

    // Snacks & sweets
    "koekjes": "biscuits", "chocolade": "chocolate",
    "chips": "crisps", "noten": "nuts", "amandelen": "almonds",
    "cashewnoten": "cashews", "walnoten": "walnuts",
    "pistachenoten": "pistachios", "pinda's": "peanuts",
    "rozijnen": "raisins", "gedroogd fruit": "dried fruit",
    "repen": "chocolate bars", "snoep": "sweets", "drop": "liquorice",
    "ijsjes": "ice lollies", "roomijs": "ice cream",

    // Household & hygiene
    "shampoo": "shampoo", "conditioner": "conditioner",
    "tandpasta": "toothpaste", "zeep": "soap", "handzeep": "hand soap",
    "douchegel": "shower gel", "deodorant": "deodorant",
    "scheerschuim": "shaving foam", "scheermesjes": "razor blades",
    "wasmiddel": "laundry detergent", "wasverzachter": "fabric softener",
    "afwasmiddel": "washing-up liquid", "allesreiniger": "all-purpose cleaner",
    "wc-reiniger": "toilet cleaner", "schuurmiddel": "scouring powder",
    "toiletpapier": "toilet paper", "keukenrol": "kitchen roll",
    "tissues": "tissues", "vuilniszakken": "bin bags",
    "aluminiumfolie": "aluminium foil", "huishoudfolie": "cling film",
    "bakpapier": "baking paper", "zipzakjes": "zip-lock bags",
    "luiers": "nappies", "babydoekjes": "baby wipes",

    // Frozen
    "diepvriesgroente": "frozen vegetables", "diepvrieserwten": "frozen peas",
    "diepvriespizza": "frozen pizza", "diepvriesfriet": "frozen chips",
    "diepvrieskip": "frozen chicken",

    // Other
    "eierkoeken": "sponge biscuits", "stroopwafels": "syrup waffles",
    "speculaas": "speculaas", "pepernoten": "pepernoten",
  },

  ru: {
    // Dairy & eggs
    "melk": "молоко", "halfvolle melk": "полужирное молоко", "volle melk": "цельное молоко",
    "magere melk": "обезжиренное молоко", "boter": "сливочное масло", "roomboter": "сливочное масло",
    "margarine": "маргарин", "kaas": "сыр", "eieren": "яйца", "ei": "яйцо",
    "yoghurt": "йогурт", "kwark": "творог", "slagroom": "сливки", "crème fraîche": "крем-фреш",
    "roomkaas": "сливочный сыр", "smeerkaas": "плавленый сыр", "cottage cheese": "творог",
    "mozzarella": "моцарелла", "cheddar": "чеддер", "parmezaan": "пармезан",
    "feta": "фета", "brie": "бри", "gouda": "гауда",

    // Bread & bakery
    "brood": "хлеб", "witbrood": "белый хлеб", "volkoren brood": "цельнозерновой хлеб",
    "bruinbrood": "ржаной хлеб", "stokbrood": "багет", "ciabatta": "чиабатта",
    "crackers": "крекеры", "beschuit": "сухарики", "knäckebröd": "хрустящие хлебцы",
    "ontbijtkoek": "пряный кекс", "croissants": "круассаны",

    // Breakfast
    "hagelslag": "шоколадная посыпка", "jam": "джем", "honing": "мёд",
    "pindakaas": "арахисовая паста", "notenpasta": "ореховая паста",
    "cornflakes": "кукурузные хлопья", "muesli": "мюсли", "granola": "гранола",
    "havermout": "овсянка", "suiker": "сахар",

    // Drinks
    "sinaasappelsap": "апельсиновый сок", "appelsap": "яблочный сок",
    "vers geperst sap": "свежевыжатый сок", "multivitaminesap": "мультивитаминный сок",
    "koffie": "кофе", "thee": "чай", "water": "вода",
    "spa": "газированная вода", "spa rood": "газированная вода", "spa blauw": "негазированная вода",
    "melkdrink": "молочный напиток", "chocolademelk": "шоколадное молоко", "karnemelk": "пахта",
    "bier": "пиво", "wijn": "вино", "rode wijn": "красное вино", "witte wijn": "белое вино",
    "frisdrank": "газировка", "cola": "кола", "limonade": "лимонад",

    // Meat & fish
    "kip": "курица", "kipfilet": "куриное филе", "kipgehakt": "куриный фарш",
    "gehakt": "фарш", "rundergehakt": "говяжий фарш", "varkensgehakt": "свиной фарш",
    "biefstuk": "стейк", "entrecote": "антрекот", "gehaktballen": "фрикадельки",
    "spek": "бекон", "ham": "ветчина", "salami": "салями", "worst": "колбаса",
    "braadworst": "жареная колбаска", "rookworst": "копчёная колбаса",
    "vleeswaren": "мясная нарезка", "kipstukjes": "кусочки курицы",
    "zalm": "лосось", "tonijn": "тунец", "garnalen": "креветки", "vissticks": "рыбные палочки",
    "haring": "сельдь", "makreel": "скумбрия", "sardines": "сардины",

    // Vegetables
    "aardappels": "картофель", "aardappelen": "картофель", "krieltjes": "молодой картофель",
    "uien": "лук", "ui": "луковица", "rode ui": "красный лук", "sjalotjes": "лук-шалот",
    "knoflook": "чеснок", "tomaten": "томаты", "tomaat": "томат",
    "cherry tomaten": "черри-томаты", "komkommer": "огурец", "komkommers": "огурцы",
    "paprika": "болгарский перец", "paprika's": "болгарский перец", "rode paprika": "красный перец",
    "groene paprika": "зелёный перец", "gele paprika": "жёлтый перец",
    "wortels": "морковь", "wortel": "морковь", "broccoli": "брокколи",
    "bloemkool": "цветная капуста", "spruitjes": "брюссельская капуста",
    "sla": "салат", "ijsbergsla": "айсберг", "rucola": "руккола",
    "spinazie": "шпинат", "courgette": "кабачок", "aubergine": "баклажан",
    "champignons": "шампиньоны", "prei": "лук-порей", "selderij": "сельдерей",
    "avocado": "авокадо", "avocado's": "авокадо", "maïs": "кукуруза",
    "mais": "кукуруза", "erwten": "горошек", "sperziebonen": "стручковая фасоль",
    "asperges": "спаржа", "venkel": "фенхель", "rode kool": "красная капуста",
    "witte kool": "белая капуста", "savooiekool": "савойская капуста",
    "groente": "овощи", "verse groente": "свежие овощи",

    // Fruit
    "appels": "яблоки", "appel": "яблоко", "peren": "груши", "peer": "груша",
    "bananen": "бананы", "banaan": "банан", "sinaasappels": "апельсины",
    "sinaasappel": "апельсин", "mandarijnen": "мандарины", "citroenen": "лимоны",
    "citroen": "лимон", "limoenen": "лаймы", "limoen": "лайм",
    "druiven": "виноград", "aardbeien": "клубника", "frambozen": "малина",
    "bosbessen": "черника", "kiwi": "киви", "mango": "манго",
    "ananas": "ананас", "meloen": "дыня", "watermeloen": "арбуз",
    "fruit": "фрукты",

    // Pantry
    "rijst": "рис", "pasta": "паста", "spaghetti": "спагетти",
    "penne": "пенне", "fusilli": "фузилли", "rigatoni": "ригатони",
    "noedels": "лапша", "couscous": "кускус", "bulgur": "булгур",
    "linzen": "чечевица", "kikkererwten": "нут", "bonen": "фасоль",
    "bruine bonen": "коричневая фасоль", "witte bonen": "белая фасоль",
    "bloem": "мука", "paneermeel": "панировочные сухари", "panko": "панко",
    "zout": "соль", "peper": "перец", "zwarte peper": "чёрный перец",
    "paprikapoeder": "паприка", "komijn": "тмин", "oregano": "орегано",
    "basilicum": "базилик", "tijm": "тимьян", "rozemarijn": "розмарин",
    "koriander": "кориандр", "kaneel": "корица", "nootmuskaat": "мускатный орех",
    "currypoeder": "карри", "kurkuma": "куркума",
    "olijfolie": "оливковое масло", "zonnebloemolie": "подсолнечное масло",
    "sesamolie": "кунжутное масло", "kokosolie": "кокосовое масло",
    "azijn": "уксус", "wijnazijn": "винный уксус", "balsamicoazijn": "бальзамический уксус",
    "sojasaus": "соевый соус", "tamari": "тамари", "worcestershiresaus": "вустерский соус",
    "mayonaise": "майонез", "ketchup": "кетчуп", "mosterd": "горчица",
    "tomatenpuree": "томатное пюре", "gedroogde tomaten": "вяленые томаты",
    "blik tomaten": "консервированные томаты", "blikje mais": "консервированная кукуруза",
    "blikjes mais": "консервированная кукуруза", "kokosmelk": "кокосовое молоко",
    "bouillon": "бульон", "kippenbouillon": "куриный бульон",
    "runderbouillon": "говяжий бульон", "groentebouillon": "овощной бульон",

    // Sauces & condiments
    "teriyakisaus": "соус терияки", "sriracha": "шрирача",
    "chilisaus": "соус чили", "zoete chilisaus": "сладкий соус чили",
    "hoïsinsaus": "хойсин", "oestersaus": "устричный соус",
    "pesto": "песто", "tomatensaus": "томатный соус", "arrabiatasaus": "аррабиата",
    "bbq saus": "соус барбекю", "sambal": "самбал",

    // Snacks & sweets
    "koekjes": "печенье", "chocolade": "шоколад",
    "chips": "чипсы", "noten": "орехи", "amandelen": "миндаль",
    "cashewnoten": "кешью", "walnoten": "грецкие орехи",
    "pistachenoten": "фисташки", "pinda's": "арахис",
    "rozijnen": "изюм", "gedroogd fruit": "сухофрукты",
    "repen": "шоколадные батончики", "snoep": "конфеты", "drop": "лакрица",
    "ijsjes": "мороженое", "roomijs": "мороженое",

    // Household & hygiene
    "shampoo": "шампунь", "conditioner": "кондиционер",
    "tandpasta": "зубная паста", "zeep": "мыло", "handzeep": "жидкое мыло",
    "douchegel": "гель для душа", "deodorant": "дезодорант",
    "scheerschuim": "пена для бритья", "scheermesjes": "лезвия для бритья",
    "wasmiddel": "стиральный порошок", "wasverzachter": "кондиционер для белья",
    "afwasmiddel": "средство для мытья посуды", "allesreiniger": "универсальное чистящее средство",
    "wc-reiniger": "чистящее средство для унитаза", "schuurmiddel": "чистящий порошок",
    "toiletpapier": "туалетная бумага", "keukenrol": "бумажные полотенца",
    "tissues": "салфетки", "vuilniszakken": "мусорные пакеты",
    "aluminiumfolie": "алюминиевая фольга", "huishoudfolie": "пищевая плёнка",
    "bakpapier": "пергамент для выпечки", "zipzakjes": "zip-пакеты",
    "luiers": "подгузники", "babydoekjes": "влажные салфетки",

    // Frozen
    "diepvriesgroente": "замороженные овощи", "diepvrieserwten": "замороженный горошек",
    "diepvriespizza": "замороженная пицца", "diepvriesfriet": "замороженный картофель фри",
    "diepvrieskip": "замороженная курица",

    // Other
    "eierkoeken": "бисквитные пирожные", "stroopwafels": "стропвафели",
    "speculaas": "спекулас", "pepernoten": "пеперноты",
  },
};

export function translateStapleName(name, lang) {
  if (!name || lang === "nl") return name;
  const map = STAPLE_MAP[lang];
  if (!map) return name;
  const key = name.trim().toLowerCase();
  return map[key] ?? name;
}
