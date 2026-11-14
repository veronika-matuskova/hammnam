// hamMňam: import a recipe from a web page (POST { url }).
//
// Reads the page, takes the recipe from its schema.org JSON-LD and text, and
// returns it in the shape of the app's recipe form, written the way the app's
// recipes are written: Slovak, nutrition per 100 g of the finished dish, SJ,
// GI and GL estimated, notes that explain the values and end with "Zdroj: <url>".
// Nothing is saved here; the app fills the form and the user saves it.
//
// Only family members can call it (same allow-list as writes, checked through
// public.is_family_member() with the caller's access token).
//
// Secrets (Edge Functions -> Secrets):
//   ANTHROPIC_API_KEY  required for the full import (translation + nutrition).
//                      Without it the function still returns the recipe as the
//                      page publishes it (mode "basic"), untranslated, without values.
//   IMPORT_MODEL       optional, Claude model id (default below).

const DEFAULT_MODEL = 'claude-sonnet-5-5';
const MAX_PAGE_BYTES = 3_000_000;
const MAX_PAGE_TEXT = 40_000;
const FETCH_TIMEOUT_MS = 15_000;
const MAX_REDIRECTS = 5;
const NOTES_MAX = 2000;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

class ImportError extends Error {
  constructor(public code: string, public status: number, message?: string) {
    super(message || code);
  }
}

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json; charset=utf-8' }
  });
}

// --- access -----------------------------------------------------------------

async function requireFamilyMember(req: Request) {
  const auth = req.headers.get('Authorization') || '';
  const token = auth.replace(/^Bearer\s+/i, '').trim();
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  if (!token || !supabaseUrl || !anonKey || token === anonKey) throw new ImportError('unauthorized', 401);
  const response = await fetch(`${supabaseUrl}/rest/v1/rpc/is_family_member`, {
    method: 'POST',
    headers: { apikey: anonKey, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: '{}'
  });
  if (response.status === 401) throw new ImportError('unauthorized', 401);
  if (!response.ok || (await response.json()) !== true) throw new ImportError('forbidden', 403);
}

// --- fetching the page --------------------------------------------------------

function isPrivateHost(hostname: string) {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local') || host.endsWith('.internal')) return true;
  if (!host.includes('.') && !host.includes(':')) return true;
  const v4 = host.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
  if (v4) {
    const [a, b] = [Number(v4[1]), Number(v4[2])];
    return a === 0 || a === 10 || a === 127 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31)
      || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || a >= 224;
  }
  if (host.includes(':')) {
    return host === '::1' || host === '::' || host.startsWith('fc') || host.startsWith('fd')
      || host.startsWith('fe80') || host.startsWith('::ffff:');
  }
  return false;
}

function checkUrl(raw: string) {
  let url: URL;
  try {
    url = new URL(String(raw || '').trim());
  } catch {
    throw new ImportError('invalid_url', 400);
  }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || isPrivateHost(url.hostname)) {
    throw new ImportError('invalid_url', 400);
  }
  if (url.port && !['80', '443'].includes(url.port)) throw new ImportError('invalid_url', 400);
  return url;
}

async function fetchPage(start: URL) {
  let url = start;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
    let response: Response;
    try {
      response = await fetch(url, {
        redirect: 'manual',
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; hamMnam-recipe-import/1.0; +https://hammnam.app)',
          Accept: 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.5',
          'Accept-Language': 'sk,cs;q=0.9,en;q=0.8'
        }
      });
    } catch {
      throw new ImportError('page_unreachable', 502);
    }
    if (response.status >= 300 && response.status < 400 && response.headers.get('location')) {
      url = checkUrl(new URL(response.headers.get('location')!, url).toString());
      continue;
    }
    if (!response.ok) throw new ImportError('page_unreachable', 502, `HTTP ${response.status}`);
    const reader = response.body?.getReader();
    if (!reader) throw new ImportError('page_unreachable', 502);
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > MAX_PAGE_BYTES) {
        await reader.cancel();
        break;
      }
      chunks.push(value);
    }
    const bytes = new Uint8Array(Math.min(size, MAX_PAGE_BYTES));
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk.subarray(0, bytes.length - offset), offset);
      offset += chunk.length;
      if (offset >= bytes.length) break;
    }
    return { html: new TextDecoder('utf-8').decode(bytes), finalUrl: url.toString() };
  }
  throw new ImportError('page_unreachable', 502, 'too many redirects');
}

// --- reading the page -----------------------------------------------------------

function decodeEntities(text: string) {
  const named: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', deg: '°', frac12: '½', frac14: '¼', frac34: '¾', ndash: '–', mdash: '—', hellip: '…' };
  return text
    .replace(/&#(\d+);/g, (_m, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_m, code) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&([a-z0-9]+);/gi, (match, name) => named[name.toLowerCase()] ?? match);
}

function stripTags(html: string) {
  return decodeEntities(String(html || '').replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim();
}

function pageText(html: string) {
  const body = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<(nav|footer|header|aside|form|svg)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<(br|\/p|\/li|\/h\d|\/tr|\/div)[^>]*>/gi, '\n');
  return decodeEntities(body.replace(/<[^>]*>/g, ' '))
    .replace(/[ \t\f\v]+/g, ' ')
    .replace(/\s*\n\s*/g, '\n')
    .replace(/\n{2,}/g, '\n')
    .trim()
    .slice(0, MAX_PAGE_TEXT);
}

function metaContent(html: string, names: string[]) {
  for (const name of names) {
    const pattern = new RegExp(`<meta[^>]+(?:property|name)=["']${name}["'][^>]*>`, 'i');
    const tag = html.match(pattern)?.[0];
    const content = tag?.match(/content=["']([^"']+)["']/i)?.[1];
    if (content) return decodeEntities(content.trim());
  }
  return '';
}

function isRecipeNode(node: any) {
  const type = node && node['@type'];
  return Array.isArray(type) ? type.includes('Recipe') : type === 'Recipe';
}

function findRecipe(node: any, depth = 0): any {
  if (!node || typeof node !== 'object' || depth > 6) return null;
  if (Array.isArray(node)) {
    for (const item of node) {
      const found = findRecipe(item, depth + 1);
      if (found) return found;
    }
    return null;
  }
  if (isRecipeNode(node)) return node;
  for (const key of ['@graph', 'mainEntity', 'mainEntityOfPage', 'itemListElement', 'item']) {
    const found = findRecipe(node[key], depth + 1);
    if (found) return found;
  }
  return null;
}

function jsonLdRecipe(html: string) {
  for (const match of html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const recipe = findRecipe(JSON.parse(match[1].trim()));
      if (recipe) return recipe;
    } catch {
      // Some sites publish invalid JSON-LD; the page text is still used.
    }
  }
  return null;
}

function imageUrl(value: any): string {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return imageUrl(value[value.length > 1 ? value.length - 1 : 0]) || imageUrl(value[0]);
  return typeof value.url === 'string' ? value.url : '';
}

function instructionList(value: any): string[] {
  if (!value) return [];
  if (typeof value === 'string') {
    return value.split(/\n+|(?<=\.)\s+(?=\d+\.\s)/).map(stripTags).filter(Boolean);
  }
  if (Array.isArray(value)) return value.flatMap(instructionList);
  if (value.itemListElement) return instructionList(value.itemListElement);
  if (typeof value.text === 'string') return [stripTags(value.text)].filter(Boolean);
  if (typeof value.name === 'string') return [stripTags(value.name)].filter(Boolean);
  return [];
}

// First real photo in the article (for pages without JSON-LD image or og:image).
function firstContentImage(html: string) {
  const main = html.match(/<(article|main)[\s\S]*?<\/\1>/i)?.[0] || html;
  for (const tag of main.matchAll(/<img\b[^>]*>/gi)) {
    const attrs = tag[0];
    const src = attrs.match(/\b(?:data-lazy-src|data-src|src)=["']([^"']+)["']/i)?.[1] || '';
    if (!src || src.startsWith('data:') || /\.svg(\?|$)|logo|icon|avatar|sprite|pixel|gravatar/i.test(src)) continue;
    const width = Number(attrs.match(/\bwidth=["']?(\d+)/i)?.[1] || 0);
    if (width && width < 200) continue;
    return decodeEntities(src);
  }
  return '';
}

function absoluteUrl(value: string, base: string) {
  try {
    const url = new URL(value, base);
    return ['http:', 'https:'].includes(url.protocol) ? url.toString() : '';
  } catch {
    return '';
  }
}

// --- recipes in the app's format --------------------------------------------------

const RECIPE_FIELDS = {
  title_sk: { type: 'string', description: 'Názov receptu po slovensky.' },
  title_cs: { type: 'string', description: 'Ten istý názov po česky.' },
  category_sk: { type: 'string', description: 'Kategória po slovensky; ak sa hodí, použi niektorú z existujúcich kategórií.' },
  category_cs: { type: 'string', description: 'Tá istá kategória po česky.' },
  servings: { type: 'integer', description: 'Počet porcií.' },
  total_weight: { type: 'number', description: 'Odhad hmotnosti celého hotového jedla v gramoch.' },
  calories: { type: 'number', description: 'kcal na 100 g hotového jedla.' },
  carbs: { type: 'number', description: 'Sacharidy (g) na 100 g hotového jedla.' },
  proteins: { type: 'number', description: 'Bielkoviny (g) na 100 g.' },
  fats: { type: 'number', description: 'Tuky (g) na 100 g.' },
  fiber: { type: 'number', description: 'Vláknina (g) na 100 g.' },
  salt: { type: 'number', description: 'Soľ (g) na 100 g.' },
  gi: { type: 'number', description: 'Glykemický index celého jedla, 0–100 (vážený priemer podľa sacharidov surovín).' },
  glycemic_load: { type: 'number', description: 'Glykemická záťaž NA JEDNU PORCIU = GI × sacharidy v porcii / 100.' },
  ingredients: {
    type: 'array',
    items: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        amount: { type: 'string', description: 'Len číslo s bodkou ako desatinným oddeľovačom (napr. "0.5"), alebo prázdne.' },
        unit: { type: 'string', description: 'g, ml, ks, ČL, PL, strúčik, hrnček, štipka, "podľa chuti"…' }
      },
      required: ['name', 'amount', 'unit']
    }
  },
  steps: { type: 'array', items: { type: 'string' } },
  nutrition_from_source: { type: 'boolean', description: 'true, ak stránka uvádza výživové hodnoty (kalorickú tabuľku); false, ak si ich vypočítala zo surovín.' },
  notes: { type: 'string', description: 'Poznámky po slovensky, najviac 1800 znakov.' }
};

const SYSTEM_PROMPT = `Si redaktorka rodinnej kuchárky hamMňam (pre ľudí, ktorí počítajú sacharidové jednotky, napr. pri cukrovke). Z webovej stránky prepíšeš JEDEN recept presne v štýle, v akom sú napísané recepty v aplikácii.

Pravidlá:
- Všetko píš po slovensky (názov a kategóriu aj po česky do polí *_cs). Tykaj, kroky v rozkazovacom spôsobe 2. osoby jednotného čísla ("Rúru predhrej na 180 °C…").
- Suroviny: názov malými písmenami po slovensky (s upresnením v zátvorke, ak treba), množstvo ako číslo (desatinná bodka, "0.25", nie "¼"), jednotka g, ml, ks, ČL, PL, strúčik… Prepočítaj cups/oz/lb na g alebo ml. Ak sa množstvo nedá určiť, amount nechaj prázdne a unit "podľa chuti".
- Kroky: krátke, konkrétne, s množstvami a teplotami v °C, každý krok jeden prvok poľa.
- Výživové hodnoty sú na 100 g HOTOVÉHO jedla a musíš ich vyplniť VŽDY (calories, carbs, proteins, fats, fiber, salt, total_weight, servings), aj keď ich stránka neuvádza.
  - Ak ich zdroj uvádza (napr. na porciu alebo na celý recept), prepočítaj ich cez odhadovanú hmotnosť hotového jedla.
  - Ak ich zdroj NEUVÁDZA (veľa receptov nemá kalorickú tabuľku), vypočítaj ich zo surovín: pre každú surovinu odhadni hmotnosť v gramoch (1 vajce ≈ 60 g, 1 ČL ≈ 5 g, 1 PL ≈ 15 g, 1 strúčik ≈ 5 g…), použi hodnoty USDA, sčítaj celý recept a vydeľ hmotnosťou hotového jedla (odhadni úbytok vody pri pečení/varení). Do poznámok napíš, že hodnoty zdroj neuvádza a sú vypočítané zo surovín.
  - Ak počet porcií nie je uvedený, odhadni ho. Zaokrúhli na 1 desatinné miesto, kcal na celé číslo.
- GI vypočítaj ako vážený priemer GI surovín podľa ich sacharidov. GL je na jednu porciu.
- Poznámky (notes) v tomto poradí, oddelené prázdnym riadkom: 1) tipy zo zdroja alebo praktický tip; 2) ako sú vypočítané výživové hodnoty na 100 g (z čoho, pri akej hmotnosti hotového jedla, celý recept a jedna porcia); 3) "GI a GL (vlastný výpočet, zdroj ich neuvádza): GI ≈ … (nízky/stredný/vysoký) – …. GL = … na 100 g, … na porciu, … na celý recept – …" (ak zdroj GI uvádza, napíš to); 4) posledný riadok "Zdroj: <url>".
- Nič si nevymýšľaj okrem odhadov hodnôt, ktoré v poznámkach označíš ako odhad. Ak stránka neobsahuje recept, zavolaj nástroj s prázdnym title_sk.`;

async function latestExamples() {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  if (!supabaseUrl || !anonKey) return { examples: [], categories: [] };
  try {
    const select = 'title_sk,title_cs,category_sk,category_cs,servings,total_weight,calories,carbs,proteins,fats,fiber,salt,sj,gi,glycemic_load,ingredients,steps,notes';
    const [examplesResponse, categoriesResponse] = await Promise.all([
      fetch(`${supabaseUrl}/rest/v1/recipes?select=${select}&title_sk=not.is.null&notes=not.is.null&order=created_at.desc&limit=2`, { headers: { apikey: anonKey } }),
      fetch(`${supabaseUrl}/rest/v1/recipes?select=category_sk`, { headers: { apikey: anonKey } })
    ]);
    const examples = examplesResponse.ok ? await examplesResponse.json() : [];
    const categoryRows = categoriesResponse.ok ? await categoriesResponse.json() : [];
    const categories = [...new Set((categoryRows as any[]).map((row) => row.category_sk).filter(Boolean))];
    return { examples, categories };
  } catch {
    return { examples: [], categories: [] };
  }
}

async function claudeRecipe(apiKey: string, sourceUrl: string, recipeJson: unknown, text: string) {
  const { examples, categories } = await latestExamples();
  const userPrompt = [
    `Zdroj (URL): ${sourceUrl}`,
    categories.length ? `Existujúce kategórie v aplikácii: ${categories.join(' | ')}` : '',
    examples.length ? `Takto vyzerajú recepty v aplikácii (dodrž rovnaký štýl, štruktúru poznámok a jednotky):\n${JSON.stringify(examples, null, 1)}` : '',
    recipeJson ? `Recept zo stránky (schema.org JSON-LD):\n${JSON.stringify(recipeJson).slice(0, 20_000)}` : '',
    `Text stránky:\n${text}`
  ].filter(Boolean).join('\n\n');

  let response: Response;
  try {
    response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      signal: AbortSignal.timeout(120_000),
      headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({
        model: Deno.env.get('IMPORT_MODEL') || DEFAULT_MODEL,
        max_tokens: 10000,
        system: SYSTEM_PROMPT,
        tools: [{
          name: 'save_recipe',
          description: 'Uloží recept vo formáte aplikácie hamMňam.',
          input_schema: { type: 'object', properties: RECIPE_FIELDS, required: Object.keys(RECIPE_FIELDS) }
        }],
        // Newer models reject a forced tool_choice; "auto" plus the instruction below is enough.
        tool_choice: { type: 'auto' },
        messages: [{ role: 'user', content: `${userPrompt}\n\nOdpovedz iba zavolaním nástroja save_recipe.` }]
      })
    });
  } catch {
    throw new ImportError('ai_failed', 502, 'Claude API unreachable');
  }
  if (!response.ok) {
    console.error('Claude API error', response.status, (await response.text()).slice(0, 500));
    throw new ImportError('ai_failed', 502, `Claude API HTTP ${response.status}`);
  }
  const data = await response.json();
  const blocks = Array.isArray(data.content) ? data.content : [];
  const tool = blocks.find((block: any) => block.type === 'tool_use' && block.input);
  if (tool) return tool.input;
  // Fallback: the recipe written as JSON in a text block.
  const answer = blocks.filter((block: any) => block.type === 'text').map((block: any) => block.text).join('\n');
  const start = answer.indexOf('{');
  const end = answer.lastIndexOf('}');
  if (start >= 0 && end > start) {
    try {
      return JSON.parse(answer.slice(start, end + 1));
    } catch {
      // fall through
    }
  }
  console.error('Claude answer without a recipe:', JSON.stringify(blocks).slice(0, 500));
  throw new ImportError('ai_failed', 502, 'no tool_use in the answer');
}

// "200 g múky", "1 1/2 cups flour", "2 eggs" -> { amount, unit, name } (best effort).
const UNIT_WORDS = ['g', 'kg', 'ml', 'l', 'dl', 'ks', 'čl', 'pl', 'cup', 'cups', 'tbsp', 'tsp', 'oz', 'lb', 'lbs', 'strúčik', 'strúčiky', 'stroužek', 'lžíce', 'lžička', 'lyžica', 'lyžička', 'hrnček', 'hrnek', 'balenie', 'balení', 'štipka', 'špetka'];
function splitIngredient(text: string) {
  const value = stripTags(text);
  const match = value.match(/^(\d+\s+\d+\s*\/\s*\d+|\d+(?:[.,]\d+)?(?:\s*\/\s*\d+)?|\d*\s*[½¼¾⅓⅔])\s*([^\s\d]+)?\s+(.*)$/);
  if (!match) return { name: value, amount: '', unit: '' };
  const unit = match[2] && UNIT_WORDS.includes(match[2].toLowerCase().replace(/\.$/, '')) ? match[2] : '';
  return {
    name: unit ? match[3] : [match[2], match[3]].filter(Boolean).join(' '),
    amount: match[1].replace(',', '.').trim(),
    unit
  };
}

function basicRecipe(recipe: any, sourceUrl: string) {
  const yieldValue = Array.isArray(recipe.recipeYield) ? recipe.recipeYield[0] : recipe.recipeYield;
  const servings = Number(String(yieldValue ?? '').match(/\d+/)?.[0]) || null;
  const category = Array.isArray(recipe.recipeCategory) ? recipe.recipeCategory[0] : recipe.recipeCategory;
  return {
    title_sk: stripTags(recipe.name || ''),
    title_cs: '',
    category_sk: stripTags(category || ''),
    category_cs: '',
    servings,
    ingredients: (Array.isArray(recipe.recipeIngredient) ? recipe.recipeIngredient : []).map(splitIngredient),
    steps: instructionList(recipe.recipeInstructions),
    notes: `Recept je prevzatý bez úprav – nie je preložený a výživové hodnoty nie sú vypočítané.\n\nZdroj: ${sourceUrl}`
  };
}

function round(value: unknown, digits: number) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) return null;
  const factor = 10 ** digits;
  return Math.round(number * factor) / factor;
}

function text(value: unknown, max = 500) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

// Cleans the model's answer into exactly the fields the app's form has.
function normalizeRecipe(input: any, photo: string, sourceUrl: string) {
  const carbs = round(input.carbs, 1);
  const gi = round(input.gi, 0);
  let notes = text(input.notes, 4000);
  if (!notes.includes(sourceUrl)) notes = `${notes}${notes ? '\n\n' : ''}Zdroj: ${sourceUrl}`;
  if (notes.length > NOTES_MAX) {
    const source = `\n\nZdroj: ${sourceUrl}`;
    notes = `${notes.replace(/\s*Zdroj:\s*\S+\s*$/, '').slice(0, NOTES_MAX - source.length - 1).trim()}…${source}`;
  }
  const servings = Math.round(Number(input.servings));
  return {
    title_sk: text(input.title_sk, 160),
    title_cs: text(input.title_cs, 160),
    category_sk: text(input.category_sk, 80),
    category_cs: text(input.category_cs, 80),
    photo,
    servings: Number.isFinite(servings) && servings > 0 ? servings : null,
    total_weight: round(input.total_weight, 0),
    calories: round(input.calories, 0),
    carbs,
    proteins: round(input.proteins, 1),
    fats: round(input.fats, 1),
    fiber: round(input.fiber, 1),
    salt: round(input.salt, 1),
    // SJ per 100 g always follow the carbohydrates (1 SJ = 10 g), so the app shows no conflict.
    sj: carbs === null ? null : Math.round(carbs) / 10,
    gi: gi === null ? null : Math.min(100, gi),
    glycemic_load: round(input.glycemic_load, 1),
    ingredients: (Array.isArray(input.ingredients) ? input.ingredients : [])
      .filter((item: any) => item && typeof item === 'object')
      .map((item: any) => ({ name: text(item.name, 200), amount: text(String(item.amount ?? ''), 40), unit: text(item.unit, 40) }))
      .filter((item: any) => item.name),
    steps: (Array.isArray(input.steps) ? input.steps : []).map((step: unknown) => text(step, 1000)).filter(Boolean),
    notes,
    nutrition_from_source: input.nutrition_from_source === true
  };
}

// --- handler ----------------------------------------------------------------------

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS_HEADERS });
  if (req.method !== 'POST') return json(405, { error: 'method_not_allowed' });
  try {
    await requireFamilyMember(req);
    let body: any;
    try {
      body = await req.json();
    } catch {
      throw new ImportError('invalid_url', 400);
    }
    const url = checkUrl(body && body.url);
    const { html, finalUrl } = await fetchPage(url);
    const sourceUrl = url.toString();
    const recipeJson = jsonLdRecipe(html);
    const photo = absoluteUrl(
      imageUrl(recipeJson?.image) || metaContent(html, ['og:image', 'og:image:url', 'twitter:image']) || firstContentImage(html),
      finalUrl
    );
    const apiKey = Deno.env.get('ANTHROPIC_API_KEY');

    if (!apiKey) {
      if (!recipeJson) throw new ImportError('no_recipe', 422);
      return json(200, { mode: 'basic', recipe: { ...basicRecipe(recipeJson, sourceUrl), photo } });
    }
    const input = await claudeRecipe(apiKey, sourceUrl, recipeJson, pageText(html));
    const recipe = normalizeRecipe(input, photo, sourceUrl);
    if (!recipe.title_sk) throw new ImportError('no_recipe', 422);
    return json(200, { mode: 'ai', recipe });
  } catch (error) {
    if (error instanceof ImportError) {
      if (error.status >= 500) console.error('import-recipe:', error.code, error.message);
      return json(error.status, { error: error.code });
    }
    console.error('import-recipe failed:', error);
    return json(500, { error: 'unexpected' });
  }
});
