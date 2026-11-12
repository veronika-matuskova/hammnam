// Issue #6: every stored nutrition value has exactly one input, and every place
// that shows a value says which basis it uses (per 100 g or whole recipe).
const assert = require('node:assert/strict');
const fs = require('node:fs');
const test = require('node:test');
const vm = require('node:vm');

const html = fs.readFileSync('index.html', 'utf8');
const source = fs.readFileSync('js/app.js', 'utf8');

function translations() {
  const start = source.indexOf('{', source.indexOf('const translations'));
  let depth = 0;
  for (let i = start; i < source.length; i += 1) {
    if (source[i] === '{') depth += 1;
    if (source[i] === '}') depth -= 1;
    if (depth === 0) return vm.runInNewContext(`(${source.slice(start, i + 1)})`);
  }
  throw new Error('translations object not found');
}

function between(text, startMarker, endMarker) {
  const start = text.indexOf(startMarker);
  assert.ok(start >= 0, `marker not found: ${startMarker}`);
  const end = text.indexOf(endMarker, start);
  assert.ok(end > start, `marker not found: ${endMarker}`);
  return text.slice(start, end);
}

function bindingCount(text, field) {
  return (text.match(new RegExp(`x-model(?:\\.[a-z]+)*="newRecipe\\.${field}"`, 'g')) || []).length;
}

const formPage = between(html, '<main x-show="showForm"', '<footer');
const per100gSection = between(formPage, 'aria-labelledby="nutrition-per-100g-heading"', '</section>');
const totalSection = between(formPage, 'aria-labelledby="nutrition-total-heading"', '</section>');
const recipeCards = between(html, '<template x-for="recipe in filteredRecipes"', '</template>');
const detailNutrition = between(html, 'id="detail-nutrition-heading"', 'id="detail-ingredients-heading"');

const per100gFields = ['calories', 'carbs', 'sj', 'proteins', 'fats', 'fiber', 'salt', 'gi', 'glycemic_load'];
const totalFields = ['servings', 'total_weight', 'total_calories', 'total_proteins', 'total_fats', 'total_carbs'];

test('each nutrition field has exactly one x-model binding in index.html', () => {
  for (const field of [...per100gFields, ...totalFields]) {
    assert.equal(bindingCount(html, field), 1, `newRecipe.${field} should be bound exactly once`);
  }
});

test('per-100 g values are entered only in the per-100 g section', () => {
  for (const field of per100gFields) {
    assert.equal(bindingCount(per100gSection, field), 1, `${field} missing from the per-100 g section`);
  }
  assert.match(per100gSection, /x-text="t\('nutritionPer100g'\)"/);
});

test('whole-recipe totals and servings stay in their own section', () => {
  for (const field of totalFields) {
    assert.equal(bindingCount(totalSection, field), 1, `${field} missing from the whole-recipe section`);
  }
  for (const field of per100gFields) {
    assert.equal(bindingCount(totalSection, field), 0, `${field} must not appear in the whole-recipe section`);
  }
  assert.match(totalSection, /x-text="t\('totalRecipeValues'\)"/);
});

test('no per-portion block remains', () => {
  assert.doesNotMatch(html, /perPortion/);
  assert.doesNotMatch(html, /id="nutrition-heading"/);
  const { sk, cs } = translations();
  assert.equal('perPortion' in sk, false);
  assert.equal('perPortion' in cs, false);
  assert.doesNotMatch(Object.values(sk).join('\n'), /porciu/i);
});

test('the form is well-formed: every <label> is closed', () => {
  assert.equal((formPage.match(/<label\b/g) || []).length, (formPage.match(/<\/label>/g) || []).length);
  assert.equal((formPage.match(/<section\b/g) || []).length, (formPage.match(/<\/section>/g) || []).length);
});

test('the recipe detail labels the nutrition table per 100 g and the totals as whole recipe', () => {
  assert.match(detailNutrition, /t\('per100g'\)/);
  const totals = between(html, 'selectedRecipe.total_weight != null', 'id="detail-nutrition-heading"');
  assert.match(totals, /x-text="t\('totalRecipeValues'\)"/);
});

test('recipe cards show a compact per-100 g suffix on SJ, carbs and calories', () => {
  assert.equal((recipeCards.match(/t\('per100gSuffix'\)/g) || []).length, 3);
});

test('basis translation keys exist in sk and cs, and unused keys are gone', () => {
  const { sk, cs } = translations();
  for (const key of ['nutritionPer100g', 'nutritionPer100gNote', 'per100g', 'per100gSuffix', 'totalRecipeValues', 'totalRecipeNote']) {
    assert.ok(sk[key], `sk.${key} missing`);
    assert.ok(cs[key], `cs.${key} missing`);
  }
  assert.equal(sk.per100g, 'na 100 g');
  assert.equal(sk.per100gSuffix, '/100 g');
  assert.match(sk.totalRecipeValues, /celý recept/i);
  for (const key of ['extraValues', 'nutritionValues', 'nutritionTable100g', 'totalValues']) {
    assert.equal(key in sk, false, `sk.${key} should be removed`);
    assert.equal(key in cs, false, `cs.${key} should be removed`);
  }
});
