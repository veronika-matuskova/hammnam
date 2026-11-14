// Educational page (ucenie.html): small "try it yourself" calculators for
// calories, SJ and glycemic load. Pure helpers first, then the Alpine component.
// Inputs are text so "1,5" works like elsewhere in the app; anything that is not
// a finite number >= 0 counts as missing and the result is null, never NaN.

const LEARN_SJ_FACTORS = [10, 12];
const LEARN_SJ_FACTOR_STORAGE_KEY = 'hamMnam-sjFactor'; // shared with js/app.js

// Energy per gram, as used on EU food labels (Regulation 1169/2011, Annex XIV).
const KCAL_PER_GRAM = { proteins: 4, carbs: 4, fats: 9, fiber: 2 };
const KJ_PER_KCAL = 4.184;

function learnNumber(raw) {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === 'number') return Number.isFinite(raw) && raw >= 0 ? raw : null;
  const text = String(raw).trim();
  if (!/^(?:\d+(?:[.,]\d*)?|[.,]\d+)$/.test(text)) return null;
  return Number(text.replace(',', '.'));
}

// kcal from grams of proteins, carbs and fats (fiber optional). Missing values
// count as 0 as long as at least one value is given.
function kcalFromMacros({ proteins, carbs, fats, fiber } = {}) {
  const values = { proteins: learnNumber(proteins), carbs: learnNumber(carbs), fats: learnNumber(fats), fiber: learnNumber(fiber) };
  if (Object.values(values).every((value) => value === null)) return null;
  return Object.entries(values).reduce((sum, [key, value]) => sum + (value || 0) * KCAL_PER_GRAM[key], 0);
}

function kcalToKj(kcal) {
  const value = learnNumber(kcal);
  return value === null ? null : value * KJ_PER_KCAL;
}

// Value for an eaten amount from a value per 100 g.
function amountForGrams(per100, grams) {
  const value = learnNumber(per100);
  const weight = learnNumber(grams);
  if (value === null || weight === null) return null;
  return (value * weight) / 100;
}

function sjFromCarbs(carbs, factor = 10) {
  const grams = learnNumber(carbs);
  const perSj = LEARN_SJ_FACTORS.includes(Number(factor)) ? Number(factor) : 10;
  return grams === null ? null : grams / perSj;
}

// GL = GI × grams of carbohydrates in the portion / 100.
function glycemicLoad(gi, carbs) {
  const index = learnNumber(gi);
  const grams = learnNumber(carbs);
  if (index === null || grams === null || index > 100) return null;
  return (index * grams) / 100;
}

function learnGiCategory(gi) {
  const value = learnNumber(gi);
  if (value === null || value > 100) return null;
  if (value <= 55) return 'low';
  if (value >= 70) return 'high';
  return 'medium';
}

function glCategory(gl) {
  const value = learnNumber(gl);
  if (value === null) return null;
  // Rounded first, so 10.4 counts as 10 (low) the way it is shown.
  const rounded = Math.round(value);
  if (rounded <= 10) return 'low';
  if (rounded >= 20) return 'high';
  return 'medium';
}

function formatLearnNumber(value, digits = 1) {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—';
  return new Intl.NumberFormat('sk-SK', { maximumFractionDigits: digits }).format(value);
}

function savedLearnSjFactor() {
  try {
    const saved = Number(window.localStorage.getItem(LEARN_SJ_FACTOR_STORAGE_KEY));
    return LEARN_SJ_FACTORS.includes(saved) ? saved : 10;
  } catch (error) {
    return 10;
  }
}

const LEVEL_CLASSES = {
  low: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
  medium: 'bg-amber-50 text-amber-800 ring-amber-200',
  high: 'bg-red-50 text-red-800 ring-red-200'
};
const GI_LEVEL_LABELS = { low: 'nízky GI', medium: 'stredný GI', high: 'vysoký GI' };
const GL_LEVEL_LABELS = { low: 'nízka GL', medium: 'stredná GL', high: 'vysoká GL' };

function learnPage() {
  return {
    sjFactors: LEARN_SJ_FACTORS,
    kcal: { proteins: '3', carbs: '20', fats: '5', fiber: '' },
    sj: { carbsPer100: '12', grams: '150', factor: savedLearnSjFactor() },
    portion: { per100: '137', grams: '250' },
    gl: { gi: '72', carbs: '11' },

    format: formatLearnNumber,

    get kcalResult() {
      return kcalFromMacros(this.kcal);
    },
    get kjResult() {
      return kcalToKj(this.kcalResult);
    },
    get portionResult() {
      return amountForGrams(this.portion.per100, this.portion.grams);
    },
    get sjCarbs() {
      return amountForGrams(this.sj.carbsPer100, this.sj.grams);
    },
    get sjResult() {
      return sjFromCarbs(this.sjCarbs, this.sj.factor);
    },
    get glResult() {
      return glycemicLoad(this.gl.gi, this.gl.carbs);
    },
    get giLevel() {
      return learnGiCategory(this.gl.gi);
    },
    get glLevel() {
      return glCategory(this.glResult);
    },
    levelClass(level) {
      return LEVEL_CLASSES[level] || 'bg-slate-100 text-slate-600 ring-slate-200';
    },
    giLevelLabel(level) {
      return GI_LEVEL_LABELS[level] || '';
    },
    glLevelLabel(level) {
      return GL_LEVEL_LABELS[level] || '';
    }
  };
}

if (typeof document !== 'undefined') {
  document.addEventListener('alpine:init', () => {
    Alpine.data('learnPage', learnPage);
  });
}
