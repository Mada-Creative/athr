import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'athr_favorite_dhikr';

// Keyed by category + the dhikr's own text (not by array index) — item
// order within a category can change (it already has once, see
// constants/athkarContent.js's shortest-to-longest sort), and an
// index-based favorite would silently point at a different dhikr after
// that kind of reorder. The category is kept alongside the text rather
// than relying on text alone since "بعد الفجر"/"بعد الظهر"/etc. all share
// the exact same dhikr text (one shared afterPrayer list — see
// constants/afterPrayerSlots.js) but are meant to be favorited separately.
function sameEntry(a, category, text) {
  return a.category === category && a.text === text;
}

async function readAll() {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    return [];
  }
}

async function writeAll(list) {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch (err) {
    // best-effort local storage — nothing to recover from here
  }
}

// Every favorited entry keeps its own snapshot of the dhikr (text, repeat,
// label, source) at the time it was saved, rather than being resolved by
// looking the category+index up in the current athkarContent each time —
// that keeps a saved favorite showing the same reading even if that item's
// position (or, in principle, its wording) changes later.
async function toggleFavorite(category, item) {
  const all = await readAll();
  const idx = all.findIndex((f) => sameEntry(f, category, item.text));
  const next =
    idx >= 0
      ? all.filter((_, i) => i !== idx)
      : [...all, { category, text: item.text, repeat: item.repeat, label: item.label, source: item.source }];
  await writeAll(next);
  return next;
}

async function isFavorite(category, text) {
  const all = await readAll();
  return all.some((f) => sameEntry(f, category, text));
}

async function getFavoriteTextsForCategory(category) {
  const all = await readAll();
  return new Set(all.filter((f) => f.category === category).map((f) => f.text));
}

export { readAll as getAllFavorites, toggleFavorite, isFavorite, getFavoriteTextsForCategory };
