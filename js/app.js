const translations = {
  cs: {
    tagline: 'Vaše recepty, přehledně',
    switchLanguage: 'Přepnout jazyk na slovenštinu',
    newRecipe: '+ Nový recept',
    eyebrow: 'Vaše kuchařka',
    heading: 'Recepty na jednom místě',
    intro: 'Ukládejte oblíbená jídla a mějte nutriční hodnoty vždy po ruce.',
    recipeCount: 'receptů',
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
    noMatches: 'Nic jsme nenašli',
    changeFilters: 'Zkuste změnit hledání nebo filtry.',
    emptyTitle: 'Zatím tu nejsou žádné recepty',
    emptyDescription: 'Přidejte svůj první recept a začněte si tvořit kuchařku.',
    dialogEyebrow: 'Nový přírůstek do kuchařky',
    addRecipeTitle: 'Přidat recept',
    close: 'Zavřít',
    recipeNameCs: 'Název (CZ)',
    recipeNameSk: 'Názov (SK)',
    categoryCs: 'Kategorie (CZ)',
    categorySk: 'Kategória (SK)',
    sj: 'Sacharidové jednotky (SJ)',
    carbs: 'Sacharidy (g)',
    gi: 'Glykemický index (GI)',
    photoUrl: 'Odkaz na fotografii (volitelné)',
    cancel: 'Zrušit',
    saving: 'Ukládám…',
    saveRecipe: 'Uložit recept',
    footer: 'Recepty s přehledem.',
    databaseUnavailable: 'Databáze není nakonfigurována. Zkontrolujte config.js.',
    connectionError: 'Zkontrolujte připojení k internetu a nastavení Supabase.',
    saveError: 'Recept se nepodařilo uložit.',
    favoriteError: 'Oblíbený recept se nepodařilo aktualizovat.'
  },
  sk: {
    tagline: 'Vaše recepty, prehľadne',
    switchLanguage: 'Prepnúť jazyk na češtinu',
    newRecipe: '+ Nový recept',
    eyebrow: 'Vaša kuchárka',
    heading: 'Recepty na jednom mieste',
    intro: 'Ukladajte obľúbené jedlá a majte nutričné hodnoty vždy poruke.',
    recipeCount: 'receptov',
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
    noMatches: 'Nič sme nenašli',
    changeFilters: 'Skúste zmeniť hľadanie alebo filtre.',
    emptyTitle: 'Zatiaľ tu nie sú žiadne recepty',
    emptyDescription: 'Pridajte svoj prvý recept a začnite si tvoriť kuchárku.',
    dialogEyebrow: 'Nový prírastok do kuchárky',
    addRecipeTitle: 'Pridať recept',
    close: 'Zavrieť',
    recipeNameCs: 'Název (CZ)',
    recipeNameSk: 'Názov (SK)',
    categoryCs: 'Kategorie (CZ)',
    categorySk: 'Kategória (SK)',
    sj: 'Sacharidové jednotky (SJ)',
    carbs: 'Sacharidy (g)',
    gi: 'Glykemický index (GI)',
    photoUrl: 'Odkaz na fotografiu (voliteľné)',
    cancel: 'Zrušiť',
    saving: 'Ukladám…',
    saveRecipe: 'Uložiť recept',
    footer: 'Recepty prehľadne.',
    databaseUnavailable: 'Databáza nie je nakonfigurovaná. Skontrolujte config.js.',
    connectionError: 'Skontrolujte pripojenie na internet a nastavenie Supabase.',
    saveError: 'Recept sa nepodarilo uložiť.',
    favoriteError: 'Obľúbený recept sa nepodarilo aktualizovať.'
  }
};

function getSavedLanguage() {
  try {
    return localStorage.getItem('hamMnam-language') === 'sk' ? 'sk' : 'cs';
  } catch (error) {
    console.warn('Could not read the saved language preference:', error);
    return 'cs';
  }
}

function emptyRecipe() {
  return {
    title_cs: '',
    title_sk: '',
    category_cs: '',
    category_sk: '',
    photo: '',
    sj: null,
    carbs: null,
    gi: ''
  };
}

function recipeApp() {
  return {
    language: getSavedLanguage(),
    recipes: [],
    loading: true,
    saving: false,
    showForm: false,
    errorMessage: '',
    formError: '',
    search: '',
    selectedCategory: '',
    favoritesOnly: false,
    newRecipe: emptyRecipe(),

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

    t(key) {
      return translations[this.language][key] || key;
    },

    toggleLanguage() {
      this.language = this.language === 'cs' ? 'sk' : 'cs';
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

    displayValue(value) {
      return value === null || value === undefined || value === '' ? '—' : value;
    },

    giClass(value) {
      const gi = String(value || '').toLocaleLowerCase();
      if (gi.includes('nízk') || gi.includes('nizk') || gi.includes('low')) return 'bg-emerald-50 text-emerald-800';
      if (gi.includes('vysok') || gi.includes('high')) return 'bg-red-50 text-red-800';
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
      await this.fetchRecipes();
    },

    async fetchRecipes() {
      this.loading = true;
      this.errorMessage = '';
      try {
        const data = await this.request('?select=*&order=created_at.desc');
        if (!Array.isArray(data)) throw new Error('Supabase returned an unexpected recipes response.');
        this.recipes = data;
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
      this.showForm = true;
    },

    closeForm() {
      if (!this.saving) this.showForm = false;
    },

    async addRecipe() {
      this.saving = true;
      this.formError = '';
      const payload = {
        ...this.newRecipe,
        sj: this.newRecipe.sj === '' || this.newRecipe.sj === null ? null : Number(this.newRecipe.sj),
        carbs: this.newRecipe.carbs === '' || this.newRecipe.carbs === null ? null : Number(this.newRecipe.carbs)
      };
      try {
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
        this.showForm = false;
      } catch (error) {
        console.error('Could not save recipe:', error);
        this.formError = `${this.t('saveError')} (${error.message})`;
      } finally {
        this.saving = false;
      }
    },

    async toggleFavorite(recipe) {
      const updatedFavorite = !recipe.favorite;
      try {
        await this.request(`?id=eq.${encodeURIComponent(recipe.id)}`, {
          method: 'PATCH',
          headers: { Prefer: 'return=minimal' },
          body: JSON.stringify({ favorite: updatedFavorite })
        });
        recipe.favorite = updatedFavorite;
      } catch (error) {
        console.error('Could not update favorite:', error);
        this.errorMessage = `${this.t('favoriteError')} (${error.message})`;
      }
    }
  };
}

document.addEventListener('alpine:init', () => {
  Alpine.data('recipeApp', recipeApp);
});
