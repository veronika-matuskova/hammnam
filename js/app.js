const translations = {
  cs: {
    tagline: 'Vaše recepty, přehledně',
    switchLanguage: 'Přepnout jazyk na slovenštinu',
    newRecipe: '+ Nový recept',
    backToRecipes: 'Zpět na recepty',
    eyebrow: 'Vaše kuchařka',
    heading: 'Recepty na jednom místě',
    intro: 'Ukládejte oblíbená jídla a mějte nutriční hodnoty vždy po ruce.',
    recipeCount: 'receptů',
    recipeCountOne: 'recept',
    recipeCountFew: 'recepty',
    search: 'Hledat recept nebo kategorii…',
    category: 'Kategorie',
    allCategories: 'Všechny kategorie',
    favorites: 'Oblíbené',
    loading: 'Načítám recepty…',
    errorTitle: 'Recepty se nepodařilo načíst.',
    retry: 'Zkusit znovu',
    carbsShort: 'Sach.',
    addFavorite: 'Přidat mezi oblíbené',
    removeFavorite: 'Odebrat z oblíbených',
    openRecipe: 'Otevřít recept',
    noIngredients: 'U tohoto receptu zatím nejsou uvedené suroviny.',
    noSteps: 'U tohoto receptu zatím není uvedený postup.',
    noMatches: 'Nic jsme nenašli',
    changeFilters: 'Zkuste změnit hledání nebo filtry.',
    emptyTitle: 'Zatím tu nejsou žádné recepty',
    emptyDescription: 'Přidejte svůj první recept a začněte si tvořit kuchařku.',
    formEyebrow: 'Nový přírůstek do kuchařky',
    editFormEyebrow: 'Úprava receptu v kuchařce',
    addRecipeTitle: 'Přidat recept',
    editRecipeTitle: 'Upravit recept',
    editRecipe: 'Upravit recept',
    updateRecipe: 'Uložit změny',
    close: 'Zavřít',
    recipeNameCs: 'Název (CZ)',
    recipeNameSk: 'Názov (SK)',
    categoryCs: 'Kategorie (CZ)',
    categorySk: 'Kategória (SK)',
    sj: 'Sacharidové jednotky (SJ)',
    carbs: 'Sacharidy (g)',
    fiber: 'Vláknina (g)',
    calories: 'Kalorie (kcal)',
    proteins: 'Bílkoviny (g)',
    fats: 'Tuky (g)',
    salt: 'Sůl (g)',
    glycemicLoad: 'Glykemická zátěž (GL)',
    servings: 'Porce',
    nutritionTable: 'Nutriční tabulka',
    nutritionPer100g: 'Nutriční hodnoty na 100 g',
    nutritionPer100gNote: 'Všechny hodnoty v této části zadávejte na 100 g hotového pokrmu.',
    per100g: 'na 100 g',
    per100gSuffix: '/100 g',
    totalWeight: 'Celková hmotnost hotového pokrmu',
    totalRecipeValues: 'Celý recept',
    totalRecipeNote: 'Počet porcí a hmotnost celého hotového pokrmu.',
    totalWeightNote: 'podle toho, kolik vody se odpaří',
    gi: 'Glykemický index (GI)',
    photoUrl: 'Odkaz na fotografii (volitelné)',
    ingredients: 'Suroviny',
    ingredientName: 'Název suroviny',
    amount: 'Množství',
    unit: 'Jednotka',
    addIngredient: 'Přidat surovinu',
    removeIngredient: 'Odebrat surovinu',
    steps: 'Postup přípravy',
    step: 'Krok',
    addStep: 'Přidat krok',
    removeStep: 'Odebrat krok',
    notes: 'Poznámky a tipy',
    notesPlaceholder: 'Volitelné poznámky k receptu…',
    cancel: 'Zrušit',
    saving: 'Ukládám…',
    saveRecipe: 'Uložit recept',
    footer: 'Recepty s přehledem.',
    databaseUnavailable: 'Databáze není nakonfigurována. Zkontrolujte config.js.',
    connectionError: 'Zkontrolujte připojení k internetu a nastavení Supabase.',
    saveError: 'Recept se nepodařilo uložit.',
    favoriteError: 'Oblíbený recept se nepodařilo aktualizovat.',
    invalidNumber: 'Zadejte nezáporné číslo (např. 1,5 nebo 1.5) do polí:',
    portionHeading: 'Na jednu porci',
    portionNote: 'Vypočteno z hodnot na 100 g a hmotnosti porce.',
    portionWeight: 'Hmotnost porce',
    customPortion: 'Vlastní porce (g)',
    customPortionHint: 'Prázdné = celková hmotnost / počet porcí.',
    portionUnavailable: 'Pro výpočet porce zadejte počet porcí a celkovou hmotnost hotového pokrmu, nebo vlastní porci v gramech.',
    sjPerPortion: 'SJ na porci',
    perPortionSuffix: '/porce',
    sjFactor: '1 SJ =',
    sjFactorOption: 'g sacharidů',
    conflictTitle: 'Nutriční hodnoty si neodpovídají',
    conflictSj: 'Zadané SJ na 100 g ({entered}) neodpovídají sacharidům: při 1 SJ = {factor} g vychází {computed} SJ.',
    conflictSjOtherFactor: 'Zadaná hodnota odpovídá přepočtu 1 SJ = {factor} g.'
  },
  sk: {
    tagline: 'Vaše recepty, prehľadne',
    switchLanguage: 'Prepnúť jazyk na češtinu',
    newRecipe: '+ Nový recept',
    backToRecipes: 'Späť na recepty',
    eyebrow: 'Vaša kuchárka',
    heading: 'Recepty na jednom mieste',
    intro: 'Ukladajte obľúbené jedlá a majte nutričné hodnoty vždy poruke.',
    recipeCount: 'receptov',
    recipeCountOne: 'recept',
    recipeCountFew: 'recepty',
    search: 'Hľadať recept alebo kategóriu…',
    category: 'Kategória',
    allCategories: 'Všetky kategórie',
    favorites: 'Obľúbené',
    loading: 'Načítavam recepty…',
    errorTitle: 'Recepty sa nepodarilo načítať.',
    retry: 'Skúsiť znova',
    carbsShort: 'Sach.',
    addFavorite: 'Pridať medzi obľúbené',
    removeFavorite: 'Odobrať z obľúbených',
    openRecipe: 'Otvoriť recept',
    noIngredients: 'Pri tomto recepte zatiaľ nie sú uvedené suroviny.',
    noSteps: 'Pri tomto recepte zatiaľ nie je uvedený postup.',
    noMatches: 'Nič sme nenašli',
    changeFilters: 'Skúste zmeniť hľadanie alebo filtre.',
    emptyTitle: 'Zatiaľ tu nie sú žiadne recepty',
    emptyDescription: 'Pridajte svoj prvý recept a začnite si tvoriť kuchárku.',
    formEyebrow: 'Nový prírastok do kuchárky',
    editFormEyebrow: 'Úprava receptu v kuchárke',
    addRecipeTitle: 'Pridať recept',
    editRecipeTitle: 'Upraviť recept',
    editRecipe: 'Upraviť recept',
    updateRecipe: 'Uložiť zmeny',
    close: 'Zavrieť',
    recipeNameCs: 'Názov (CZ)',
    recipeNameSk: 'Názov (SK)',
    categoryCs: 'Kategória (CZ)',
    categorySk: 'Kategória (SK)',
    sj: 'Sacharidové jednotky (SJ)',
    carbs: 'Sacharidy (g)',
    fiber: 'Vláknina (g)',
    calories: 'Kalórie (kcal)',
    proteins: 'Bielkoviny (g)',
    fats: 'Tuky (g)',
    salt: 'Soľ (g)',
    glycemicLoad: 'Glykemická záťaž (GL)',
    servings: 'Porcie',
    nutritionTable: 'Nutričná tabuľka',
    nutritionPer100g: 'Nutričné hodnoty na 100 g',
    nutritionPer100gNote: 'Všetky hodnoty v tejto časti zadávajte na 100 g hotového jedla.',
    per100g: 'na 100 g',
    per100gSuffix: '/100 g',
    totalWeight: 'Celková hmotnosť hotového jedla',
    totalRecipeValues: 'Celý recept',
    totalRecipeNote: 'Počet porcií a hmotnosť celého hotového jedla.',
    totalWeightNote: 'podľa toho, koľko vody sa odparí',
    gi: 'Glykemický index (GI)',
    photoUrl: 'Odkaz na fotografiu (voliteľné)',
    ingredients: 'Suroviny',
    ingredientName: 'Názov suroviny',
    amount: 'Množstvo',
    unit: 'Jednotka',
    addIngredient: 'Pridať surovinu',
    removeIngredient: 'Odobrať surovinu',
    steps: 'Postup prípravy',
    step: 'Krok',
    addStep: 'Pridať krok',
    removeStep: 'Odobrať krok',
    notes: 'Poznámky a tipy',
    notesPlaceholder: 'Voliteľné poznámky k receptu…',
    cancel: 'Zrušiť',
    saving: 'Ukladám…',
    saveRecipe: 'Uložiť recept',
    footer: 'Recepty prehľadne.',
    databaseUnavailable: 'Databáza nie je nakonfigurovaná. Skontrolujte config.js.',
    connectionError: 'Skontrolujte pripojenie k internetu a nastavenie Supabase.',
    saveError: 'Recept sa nepodarilo uložiť.',
    favoriteError: 'Obľúbený recept sa nepodarilo aktualizovať.',
    invalidNumber: 'Zadajte nezáporné číslo (napr. 1,5 alebo 1.5) do polí:',
    portionHeading: 'Na jednu porciu',
    portionNote: 'Vypočítané z hodnôt na 100 g a hmotnosti porcie.',
    portionWeight: 'Hmotnosť porcie',
    customPortion: 'Vlastná porcia (g)',
    customPortionHint: 'Prázdne = celková hmotnosť / počet porcií.',
    portionUnavailable: 'Na výpočet porcie zadajte počet porcií a celkovú hmotnosť hotového jedla, alebo vlastnú porciu v gramoch.',
    sjPerPortion: 'SJ na porciu',
    perPortionSuffix: '/porcia',
    sjFactor: '1 SJ =',
    sjFactorOption: 'g sacharidov',
    conflictTitle: 'Nutričné hodnoty si nezodpovedajú',
    conflictSj: 'Zadané SJ na 100 g ({entered}) nezodpovedajú sacharidom: pri 1 SJ = {factor} g vychádza {computed} SJ.',
    conflictSjOtherFactor: 'Zadaná hodnota zodpovedá prepočtu 1 SJ = {factor} g.'
  }
};

// The app is Slovak-only for now. Czech texts are kept in `translations` so the
// language switch can be brought back later by adding 'cs' to ENABLED_LANGUAGES.
const DEFAULT_LANGUAGE = 'sk';
const ENABLED_LANGUAGES = ['sk'];

function getSavedLanguage() {
  try {
    const saved = localStorage.getItem('hamMnam-language');
    return ENABLED_LANGUAGES.includes(saved) ? saved : DEFAULT_LANGUAGE;
  } catch (error) {
    console.warn('Could not read the saved language preference:', error);
    return DEFAULT_LANGUAGE;
  }
}

// Shared parser for numeric form fields. Accepts both "1.5" and "1,5", trims
// whitespace and treats an empty value as null. Anything else (text, hex,
// exponents, negative numbers) is reported as invalid instead of being saved.
function parseDecimal(raw) {
  if (raw === null || raw === undefined) return { valid: true, value: null };
  if (typeof raw === 'number') {
    return Number.isFinite(raw) && raw >= 0 ? { valid: true, value: raw } : { valid: false, value: null };
  }
  const text = String(raw).trim();
  if (text === '') return { valid: true, value: null };
  if (!/^(?:\d+(?:[.,]\d*)?|[.,]\d+)$/.test(text)) return { valid: false, value: null };
  return { valid: true, value: Number(text.replace(',', '.')) };
}

// --- Per-portion nutrition (issue #14) -------------------------------------
// Pure helpers: no Alpine state, no DOM. Values may be numbers, numeric strings
// ("1,5"), null or garbage; anything that is not a finite number >= 0 counts as
// missing, so a calculation returns null instead of NaN, Infinity or 0.

// 1 SJ (sacharidová jednotka) = 10 g of carbohydrates by default; 12 g is the
// older convention some patients still use. Users pick one; it is stored locally.
const SJ_FACTORS = [10, 12];
const DEFAULT_SJ_FACTOR = 10;
const SJ_FACTOR_STORAGE_KEY = 'hamMnam-sjFactor';
// Nutrients that have a per-100 g column. SJ is derived from carbs and handled separately.
const PORTION_NUTRIENTS = ['calories', 'carbs', 'proteins', 'fats', 'fiber', 'salt'];
// Entered SJ may differ from carbs / factor by rounding; only flag real mismatches.
const SJ_TOLERANCE = { absolute: 0.15, relative: 0.1 };
const TOTAL_TOLERANCE = { absolute: 0.5, relative: 0.05 };

function nonNegativeNumber(value) {
  if (typeof value === 'number') return Number.isFinite(value) && value >= 0 ? value : null;
  if (typeof value !== 'string') return null;
  const parsed = parseDecimal(value);
  return parsed.valid ? parsed.value : null;
}

function positiveNumber(value) {
  const number = nonNegativeNumber(value);
  return number !== null && number > 0 ? number : null;
}

function normalizeSjFactor(value) {
  const factor = Number(value);
  return SJ_FACTORS.includes(factor) ? factor : DEFAULT_SJ_FACTOR;
}

function getSavedSjFactor() {
  try {
    return normalizeSjFactor(localStorage.getItem(SJ_FACTOR_STORAGE_KEY));
  } catch (error) {
    console.warn('Could not read the saved SJ factor:', error);
    return DEFAULT_SJ_FACTOR;
  }
}

function saveSjFactor(value) {
  const factor = normalizeSjFactor(value);
  try {
    localStorage.setItem(SJ_FACTOR_STORAGE_KEY, String(factor));
  } catch (error) {
    console.warn('Could not save the SJ factor:', error);
  }
  return factor;
}

function carbsToSj(carbs, factor = DEFAULT_SJ_FACTOR) {
  const grams = nonNegativeNumber(carbs);
  return grams === null ? null : grams / normalizeSjFactor(factor);
}

// input: {
//   per100: { calories, carbs, proteins, fats, fiber, salt, sj },  // hand-entered per 100 g
//   totals: { calories, carbs, ... },                               // whole recipe (optional)
//   totalWeight, servings,                                          // whole recipe
//   portionWeight                                                   // optional custom portion in g
// }
// Per-100 g values win; totals fill gaps (totals / total weight). Per portion =
// per-100 g x portion weight, or totals / servings when no weight is known.
// Returns { servings, totalWeight, portionWeight, per100, perPortion }; every
// missing value is null.
function computeNutrition(input = {}, factor = DEFAULT_SJ_FACTOR) {
  const per100Input = input.per100 || {};
  const totalsInput = input.totals || {};
  const servings = positiveNumber(input.servings);
  const totalWeight = positiveNumber(input.totalWeight);
  const customPortion = positiveNumber(input.portionWeight);
  const portionWeight = customPortion !== null
    ? customPortion
    : totalWeight !== null && servings !== null ? totalWeight / servings : null;
  const per100 = {};
  const perPortion = {};
  for (const field of PORTION_NUTRIENTS) {
    const entered = nonNegativeNumber(per100Input[field]);
    const total = nonNegativeNumber(totalsInput[field]);
    per100[field] = entered !== null
      ? entered
      : total !== null && totalWeight !== null ? (total * 100) / totalWeight : null;
    if (per100[field] !== null && portionWeight !== null) {
      perPortion[field] = (per100[field] * portionWeight) / 100;
    } else if (total !== null && servings !== null && customPortion === null) {
      perPortion[field] = total / servings;
    } else {
      perPortion[field] = null;
    }
  }
  // SJ follows the carbs and the chosen factor. Only without carbs fall back to the entered SJ.
  const enteredSj = nonNegativeNumber(per100Input.sj);
  per100.sj = per100.carbs !== null ? carbsToSj(per100.carbs, factor) : enteredSj;
  perPortion.sj = perPortion.carbs !== null
    ? carbsToSj(perPortion.carbs, factor)
    : enteredSj !== null && portionWeight !== null ? (enteredSj * portionWeight) / 100 : null;
  return { servings, totalWeight, portionWeight, per100, perPortion };
}

function valuesConflict(entered, computed, tolerance = TOTAL_TOLERANCE) {
  if (entered === null || computed === null) return false;
  const allowed = Math.max(tolerance.absolute, tolerance.relative * Math.max(Math.abs(entered), Math.abs(computed)));
  return Math.abs(entered - computed) > allowed + 1e-9;
}

// Compares hand-entered per-100 g values with the values computed from other
// inputs: SJ vs carbs / factor, and (when totals are given) each per-100 g value
// vs total x 100 / total weight. Returns [{ field, entered, computed, matchingFactor? }].
function detectNutritionConflicts(input = {}, factor = DEFAULT_SJ_FACTOR) {
  const per100 = input.per100 || {};
  const totals = input.totals || {};
  const totalWeight = positiveNumber(input.totalWeight);
  const conflicts = [];
  const enteredSj = nonNegativeNumber(per100.sj);
  const computedSj = carbsToSj(per100.carbs, factor);
  if (valuesConflict(enteredSj, computedSj, SJ_TOLERANCE)) {
    const conflict = { field: 'sj', entered: enteredSj, computed: computedSj };
    const otherFactor = SJ_FACTORS.find((candidate) => candidate !== normalizeSjFactor(factor)
      && !valuesConflict(enteredSj, carbsToSj(per100.carbs, candidate), SJ_TOLERANCE));
    if (otherFactor) conflict.matchingFactor = otherFactor;
    conflicts.push(conflict);
  }
  if (totalWeight !== null) {
    for (const field of PORTION_NUTRIENTS) {
      const entered = nonNegativeNumber(per100[field]);
      const total = nonNegativeNumber(totals[field]);
      const computed = total === null ? null : (total * 100) / totalWeight;
      if (valuesConflict(entered, computed)) conflicts.push({ field, entered, computed });
    }
  }
  return conflicts;
}

// Recipe row (or form model) -> calculation input. Only the per-100 g values,
// servings and total weight are edited in the app (see #6), so the legacy
// total_* columns are not used here.
function recipeNutritionInput(recipe, portionWeight = null) {
  const source = recipe || {};
  const per100 = {};
  for (const field of [...PORTION_NUTRIENTS, 'sj']) per100[field] = source[field];
  return { per100, servings: source.servings, totalWeight: source.total_weight, portionWeight };
}

const RECIPE_COUNT_KEYS = { one: 'recipeCountOne', few: 'recipeCountFew' };

function recipeCountKey(count, language) {
  const category = new Intl.PluralRules(language).select(count);
  return RECIPE_COUNT_KEYS[category] || 'recipeCount';
}

function emptyRecipe() {
  return {
    title_cs: '',
    title_sk: '',
    category_cs: '',
    category_sk: '',
    photo: '',
    servings: null,
    sj: null,
    carbs: null,
    fiber: null,
    calories: null,
    proteins: null,
    fats: null,
    salt: null,
    glycemic_load: null,
    total_weight: null,
    gi: '',
    ingredients: [],
    steps: [],
    notes: ''
  };
}

// Older rows can hold NULL in text columns; treat missing values as empty strings.
function textValue(value) {
  return value === null || value === undefined ? '' : String(value).trim();
}

const TEXT_FIELDS = ['title_cs', 'title_sk', 'category_cs', 'category_sk', 'photo', 'gi', 'notes'];

function recipeApp() {
  return {
    language: getSavedLanguage(),
    recipes: [],
    loading: true,
    saving: false,
    showForm: false,
    editingRecipeId: null,
    selectedRecipe: null,
    errorMessage: '',
    formError: '',
    favoriteErrorMessage: '',
    favoriteSavingIds: {},
    search: '',
    selectedCategory: '',
    favoritesOnly: false,
    recipesLoaded: false,
    newRecipe: emptyRecipe(),
    sjFactor: getSavedSjFactor(),
    sjFactors: SJ_FACTORS,
    portionSizeInput: '',

    get filteredRecipes() {
      const query = this.search.trim().toLocaleLowerCase(this.language);
      return this.recipes.filter((recipe) => {
        const title = this.displayTitle(recipe).toLocaleLowerCase(this.language);
        const category = this.displayCategory(recipe).toLocaleLowerCase(this.language);
        return (!query || title.includes(query) || category.includes(query))
          && (!this.selectedCategory || this.displayCategory(recipe) === this.selectedCategory)
          && (!this.favoritesOnly || Boolean(recipe.favorite));
      });
    },

    get categories() {
      return [...new Set(this.recipes.map((recipe) => this.displayCategory(recipe)).filter(Boolean))]
        .sort((a, b) => a.localeCompare(b, this.language));
    },

    get canSwitchLanguage() {
      return ENABLED_LANGUAGES.length > 1;
    },

    isLanguageEnabled(language) {
      return ENABLED_LANGUAGES.includes(language);
    },

    t(key) {
      const locale = translations[this.language] || translations[DEFAULT_LANGUAGE];
      return locale[key] || translations[DEFAULT_LANGUAGE][key] || translations.cs[key] || key;
    },

    recipeCountLabel(count) {
      return `${count} ${this.t(recipeCountKey(count, this.language))}`;
    },

    toggleLanguage() {
      if (!this.canSwitchLanguage) return;
      const index = ENABLED_LANGUAGES.indexOf(this.language);
      this.language = ENABLED_LANGUAGES[(index + 1) % ENABLED_LANGUAGES.length];
      this.selectedCategory = '';
      try {
        localStorage.setItem('hamMnam-language', this.language);
      } catch (error) {
        console.warn('Could not save the language preference:', error);
      }
    },

    displayTitle(recipe) {
      return (this.language === 'sk' && recipe.title_sk) || recipe.title_cs || recipe.title_sk || '';
    },

    displayCategory(recipe) {
      return (this.language === 'sk' && recipe.category_sk) || recipe.category_cs || recipe.category_sk || '';
    },

    // Like t(), but replaces {name} placeholders with params.name.
    tf(key, params = {}) {
      return this.t(key).replace(/\{(\w+)\}/g, (match, name) => (name in params ? String(params[name]) : match));
    },

    setSjFactor(value) {
      this.sjFactor = saveSjFactor(value);
    },

    formatNumber(value, maximumFractionDigits = 1) {
      if (value === null || value === undefined || !Number.isFinite(value)) return '—';
      return new Intl.NumberFormat(this.language, { maximumFractionDigits }).format(value);
    },

    formatAmount(value, unit, maximumFractionDigits = 1) {
      const formatted = this.formatNumber(value, maximumFractionDigits);
      return formatted === '—' || !unit ? formatted : `${formatted} ${unit}`;
    },

    // Custom portion from the detail page; anything invalid falls back to total weight / servings.
    customPortionWeight() {
      const parsed = parseDecimal(this.portionSizeInput);
      return parsed.valid && parsed.value > 0 ? parsed.value : null;
    },

    recipeNutrition(recipe, useCustomPortion = true) {
      const portion = useCustomPortion ? this.customPortionWeight() : null;
      return computeNutrition(recipeNutritionInput(recipe, portion), this.sjFactor);
    },

    recipePortionSj(recipe) {
      return this.recipeNutrition(recipe, false).perPortion.sj;
    },

    hasPortionValues(recipe) {
      const { perPortion } = this.recipeNutrition(recipe);
      return Object.values(perPortion).some((value) => value !== null);
    },

    nutritionConflicts(recipe) {
      return detectNutritionConflicts(recipeNutritionInput(recipe), this.sjFactor);
    },

    get formNutritionConflicts() {
      return this.nutritionConflicts(this.newRecipe);
    },

    conflictMessage(conflict) {
      if (conflict.field !== 'sj') return '';
      const message = this.tf('conflictSj', {
        entered: this.formatNumber(conflict.entered, 2),
        computed: this.formatNumber(conflict.computed, 2),
        factor: this.sjFactor
      });
      return conflict.matchingFactor
        ? `${message} ${this.tf('conflictSjOtherFactor', { factor: conflict.matchingFactor })}`
        : message;
    },

    displayValue(value) {
      return value === null || value === undefined || value === '' ? '—' : value;
    },

    displayMetric(value, unit = '') {
      const normalized = this.displayValue(value);
      return normalized === '—' ? '—' : unit ? `${normalized} ${unit}` : normalized;
    },

    recipeIngredients(recipe) {
      return Array.isArray(recipe.ingredients)
        ? recipe.ingredients.filter((ingredient) => ingredient && typeof ingredient === 'object')
        : [];
    },

    ingredientMeasure(ingredient) {
      const measure = [ingredient.amount, ingredient.unit]
        .filter((value) => value !== null && value !== undefined && String(value).trim())
        .join(' ');
      return measure || '—';
    },

    recipeSteps(recipe) {
      return Array.isArray(recipe.steps)
        ? recipe.steps.filter((step) => typeof step === 'string' && step.trim())
        : [];
    },

    giClass(value) {
      const gi = String(value || '').toLocaleLowerCase();
      if (gi.includes('nízk') || gi.includes('nizk') || gi.includes('low')) return 'bg-emerald-50 text-emerald-800';
      if (gi.includes('vysok') || gi.includes('high')) return 'bg-red-50 text-red-800';
      if (/^\d+(?:[.,]\d+)?$/.test(gi)) {
        const numericGi = Number(gi.replace(',', '.'));
        if (numericGi <= 55) return 'bg-emerald-50 text-emerald-800';
        if (numericGi >= 70) return 'bg-red-50 text-red-800';
        return 'bg-amber-50 text-amber-800';
      }
      return 'bg-violet-50 text-violet-800';
    },

    apiBaseUrl() {
      const config = window.SUPABASE_CONFIG;
      if (!config || typeof config.url !== 'string' || typeof config.anonKey !== 'string'
        || !config.url.trim() || !config.anonKey.trim()) {
        throw new Error(this.t('databaseUnavailable'));
      }
      const url = config.url.trim().replace(/\/+$/, '').replace(/\/rest\/v1$/, '');
      return { url: `${url}/rest/v1/recipes`, key: config.anonKey.trim() };
    },

    async request(path, options = {}) {
      const { url, key } = this.apiBaseUrl();
      const response = await fetch(`${url}${path}`, {
        ...options,
        headers: {
          apikey: key,
          Authorization: `Bearer ${key}`,
          ...(options.body ? { 'Content-Type': 'application/json' } : {}),
          ...options.headers
        }
      });
      if (!response.ok) {
        const details = (await response.text()).slice(0, 240);
        throw new Error(`Supabase HTTP ${response.status}${details ? `: ${details}` : ''}`);
      }
      if (response.status === 204) return null;
      return response.json();
    },

    async init() {
      if ('serviceWorker' in navigator && window.isSecureContext) {
        navigator.serviceWorker.register('./sw.js').catch((error) => {
          console.error('Service worker registration failed:', error);
        });
      }
      window.addEventListener('popstate', () => this.syncRoute());
      this.syncRoute();
      await this.fetchRecipes();
    },

    syncRoute() {
      const hash = window.location.hash;
      const editRoute = hash.match(/^#edit-recipe\/(.+)$/);
      const wasFormOpen = this.showForm;
      const route = hash.match(/^#recipe\/(.+)$/);
      this.selectedRecipe = route
        ? this.recipes.find((recipe) => encodeURIComponent(String(recipe.id)) === route[1]) || null
        : null;
      const recipeToEdit = editRoute
        ? this.recipes.find((recipe) => encodeURIComponent(String(recipe.id)) === editRoute[1]) || null
        : null;
      this.showForm = hash === '#new-recipe' || Boolean(recipeToEdit);
      if (this.recipesLoaded && ((route && !this.selectedRecipe) || (editRoute && !recipeToEdit))) {
        // Unknown recipe id: drop the stale hash so the URL matches the list that is shown.
        window.history.replaceState(window.history.state, '', `${window.location.pathname}${window.location.search}`);
      }
      if (recipeToEdit) {
        if (!wasFormOpen || String(this.editingRecipeId) !== String(recipeToEdit.id)) {
          this.loadRecipeForEditing(recipeToEdit);
        }
      } else {
        this.editingRecipeId = null;
      }
    },

    async fetchRecipes() {
      this.loading = true;
      this.errorMessage = '';
      try {
        const data = await this.request('?select=*&order=created_at.desc');
        if (!Array.isArray(data)) throw new Error('Supabase returned an unexpected recipes response.');
        this.recipes = data;
        this.recipesLoaded = true;
        this.syncRoute();
      } catch (error) {
        console.error('Could not load recipes:', error);
        this.errorMessage = error.message === this.t('databaseUnavailable')
          ? error.message
          : `${this.t('connectionError')} (${error.message})`;
      } finally {
        this.loading = false;
      }
    },

    openForm() {
      this.formError = '';
      this.selectedRecipe = null;
      this.editingRecipeId = null;
      this.newRecipe = emptyRecipe();
      if (window.location.hash !== '#new-recipe') {
        window.history.pushState(
          { ...(window.history.state || {}), hamMnamNewRecipe: true },
          '',
          `${window.location.pathname}${window.location.search}#new-recipe`
        );
      }
      this.syncRoute();
    },

    loadRecipeForEditing(recipe) {
      const form = emptyRecipe();
      for (const field of Object.keys(form)) {
        if (recipe[field] !== undefined) form[field] = recipe[field];
      }
      for (const field of TEXT_FIELDS) form[field] = textValue(form[field]);
      form.ingredients = Array.isArray(recipe.ingredients)
        ? recipe.ingredients
          .filter((ingredient) => ingredient && typeof ingredient === 'object')
          .map((ingredient) => ({
            name: textValue(ingredient.name),
            amount: textValue(ingredient.amount),
            unit: textValue(ingredient.unit)
          }))
        : [];
      form.steps = Array.isArray(recipe.steps)
        ? recipe.steps.filter((step) => step !== null && step !== undefined).map((step) => String(step))
        : [];
      if (!this.isLanguageEnabled('cs')) {
        // Older recipes may only have Czech names; prefill the Slovak fields so they can be saved.
        if (!form.title_sk) form.title_sk = form.title_cs || '';
        if (!form.category_sk) form.category_sk = form.category_cs || '';
      }
      this.newRecipe = form;
      this.editingRecipeId = recipe.id;
      this.formError = '';
    },

    editRecipe(recipe) {
      this.formError = '';
      this.selectedRecipe = null;
      this.editingRecipeId = null;
      window.history.pushState(
        { ...(window.history.state || {}), hamMnamEditRecipe: true },
        '',
        `${window.location.pathname}${window.location.search}#edit-recipe/${encodeURIComponent(String(recipe.id))}`
      );
      this.syncRoute();
    },

    openRecipe(recipe) {
      this.showForm = false;
      window.history.pushState(
        { ...(window.history.state || {}), hamMnamRecipeDetail: true },
        '',
        `#recipe/${encodeURIComponent(String(recipe.id))}`
      );
      this.selectedRecipe = recipe;
      this.portionSizeInput = '';
    },

    closeRecipe() {
      this.selectedRecipe = null;
      this.portionSizeInput = '';
      if (!window.location.hash.startsWith('#recipe/')) return;

      if (window.history.state && window.history.state.hamMnamRecipeDetail) {
        window.history.back();
      } else {
        window.history.replaceState(window.history.state, '', `${window.location.pathname}${window.location.search}`);
      }
    },

    closeForm() {
      if (this.saving) return;
      this.showForm = false;
      this.newRecipe = emptyRecipe();
      if (window.location.hash.startsWith('#edit-recipe/')) {
        const recipe = this.recipes.find((item) => String(item.id) === String(this.editingRecipeId)) || null;
        this.editingRecipeId = null;
        this.selectedRecipe = recipe;
        if (window.history.state && window.history.state.hamMnamEditRecipe) {
          window.history.back();
        } else if (recipe) {
          // Deep-linked edit: there is no in-app entry to go back to, so the detail's Back must go to the list.
          window.history.replaceState(
            { ...(window.history.state || {}), hamMnamEditRecipe: false, hamMnamRecipeDetail: false },
            '',
            `${window.location.pathname}${window.location.search}#recipe/${encodeURIComponent(String(recipe.id))}`
          );
        } else {
          window.history.replaceState(window.history.state, '', `${window.location.pathname}${window.location.search}`);
        }
        return;
      }
      if (window.location.hash !== '#new-recipe') return;

      if (window.history.state && window.history.state.hamMnamNewRecipe) {
        window.history.back();
      } else {
        window.history.replaceState(window.history.state, '', `${window.location.pathname}${window.location.search}`);
      }
    },

    async addRecipe() {
      this.saving = true;
      this.formError = '';
      const numericFields = ['servings', 'sj', 'carbs', 'fiber', 'calories', 'proteins', 'fats', 'salt', 'glycemic_load', 'total_weight'];
      const numericValues = {};
      const invalidFields = [];
      for (const field of numericFields) {
        const parsed = parseDecimal(this.newRecipe[field]);
        if (parsed.valid) numericValues[field] = parsed.value;
        else invalidFields.push(this.t(field.replace(/_(\w)/g, (_match, letter) => letter.toUpperCase())));
      }
      if (invalidFields.length) {
        this.formError = `${this.t('invalidNumber')} ${invalidFields.join(', ')}`;
        this.saving = false;
        return;
      }
      try {
        const payload = {
          ...Object.fromEntries(Object.keys(emptyRecipe()).map((field) => [field, this.newRecipe[field]])),
          ...Object.fromEntries(TEXT_FIELDS.map((field) => [field, textValue(this.newRecipe[field])])),
          ...numericValues,
          ingredients: (Array.isArray(this.newRecipe.ingredients) ? this.newRecipe.ingredients : [])
            .filter((ingredient) => ingredient && typeof ingredient === 'object')
            .map((ingredient) => ({
              name: textValue(ingredient.name),
              amount: textValue(ingredient.amount),
              unit: textValue(ingredient.unit)
            }))
            .filter((ingredient) => ingredient.name || ingredient.amount || ingredient.unit),
          steps: (Array.isArray(this.newRecipe.steps) ? this.newRecipe.steps : []).map(textValue).filter(Boolean)
        };
        if (this.editingRecipeId !== null) {
          const updated = await this.request(`?id=eq.${encodeURIComponent(this.editingRecipeId)}`, {
            method: 'PATCH',
            headers: { Prefer: 'return=representation' },
            body: JSON.stringify(payload)
          });
          if (!Array.isArray(updated) || !updated[0]) {
            throw new Error('Supabase did not return the updated recipe.');
          }
          const index = this.recipes.findIndex((recipe) => String(recipe.id) === String(this.editingRecipeId));
          if (index === -1) throw new Error('The updated recipe is no longer available.');
          const updatedRecipe = updated[0];
          this.recipes.splice(index, 1, updatedRecipe);
          this.selectedRecipe = updatedRecipe;
          this.newRecipe = emptyRecipe();
          this.editingRecipeId = null;
          this.showForm = false;
          if (window.history.state && window.history.state.hamMnamEditRecipe) {
            // Return to the detail entry the edit was opened from, so its Back still leads to the list.
            window.history.back();
          } else {
            window.history.replaceState(
              { ...(window.history.state || {}), hamMnamEditRecipe: false, hamMnamRecipeDetail: false },
              '',
              `${window.location.pathname}${window.location.search}#recipe/${encodeURIComponent(String(updatedRecipe.id))}`
            );
          }
        } else {
          const created = await this.request('', {
            method: 'POST',
            headers: { Prefer: 'return=representation' },
            body: JSON.stringify(payload)
          });
          if (!Array.isArray(created) || !created[0]) {
            throw new Error('Supabase did not return the saved recipe.');
          }
          this.recipes.unshift(created[0]);
          this.newRecipe = emptyRecipe();
          this.saving = false;
          this.closeForm();
        }
      } catch (error) {
        console.error('Could not save recipe:', error);
        this.formError = `${this.t('saveError')} (${error.message})`;
      } finally {
        this.saving = false;
      }
    },

    isFavoriteSaving(recipe) {
      return Boolean(this.favoriteSavingIds[recipe.id]);
    },

    async toggleFavorite(recipe) {
      if (this.isFavoriteSaving(recipe)) return;
      const previousFavorite = recipe.favorite;
      const updatedFavorite = !previousFavorite;
      this.favoriteSavingIds[recipe.id] = true;
      this.favoriteErrorMessage = '';
      recipe.favorite = updatedFavorite;
      try {
        const updated = await this.request(`?id=eq.${encodeURIComponent(recipe.id)}`, {
          method: 'PATCH',
          headers: { Prefer: 'return=representation' },
          body: JSON.stringify({ favorite: updatedFavorite })
        });
        // An update blocked by row-level security succeeds with zero rows changed.
        if (!Array.isArray(updated) || updated.length === 0) {
          throw new Error('Supabase did not update the recipe.');
        }
      } catch (error) {
        console.error('Could not update favorite:', error);
        recipe.favorite = previousFavorite;
        this.favoriteErrorMessage = `${this.t('favoriteError')} (${error.message})`;
      } finally {
        delete this.favoriteSavingIds[recipe.id];
      }
    }
  };
}

document.addEventListener('alpine:init', () => {
  Alpine.data('recipeApp', recipeApp);
});
