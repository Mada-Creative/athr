import quranSurahs from '../constants/quranText.json';

// Verse 1 of Al-Fatihah already *is* the Bismillah in the data, and
// At-Tawbah is the one surah the mushaf never opens with it — everywhere
// else it's the traditional un-numbered heading rendered above verse 1.
// Single source of truth now that both the surah banner (below) and the
// reader screen need it.
export const NO_BISMILLAH_HEADER = new Set([1, 9]);

export const TOTAL_PAGES = 604;

// Every verse in quranText.json already carries the real mushaf page number
// it falls on (the standard 604-page Madani pagination) — this just groups
// them by that number once, into the same shape the reader renders
// directly: a sequence of blocks, each either a surah starting on this page
// (its own ornamental header) or a run of consecutive same-surah verses
// (rendered together as one flowing paragraph, the way they actually sit on
// a mushaf page — not one card per verse). A page can open mid-surah with
// no header at all (previous page's surah continuing), end a surah and
// start the next one partway down, or both happen more than once on a
// single page (rare, only for very short surahs).
//
// Built once at module load — this is static data pulled apart once, not
// something that benefits from recomputing per screen mount.
function buildPages() {
  const pages = Array.from({ length: TOTAL_PAGES }, (_, i) => ({ page: i + 1, juz: null, blocks: [] }));

  quranSurahs.forEach((surah) => {
    surah.verses.forEach((verse, idx) => {
      const pageEntry = pages[verse.page - 1];
      if (!pageEntry) return;
      pageEntry.juz = verse.juz;

      if (idx === 0) {
        pageEntry.blocks.push({ type: 'surah-start', surah });
      }

      const lastBlock = pageEntry.blocks[pageEntry.blocks.length - 1];
      if (lastBlock?.type === 'verses' && lastBlock.surah.id === surah.id) {
        lastBlock.verses.push(verse);
      } else {
        pageEntry.blocks.push({ type: 'verses', surah, verses: [verse] });
      }
    });
  });

  return pages;
}

export const QURAN_PAGES = buildPages();

// Where a given surah's reading should open to — its own first page. Used
// to keep every existing `{ surahId }` navigation param (the surah list,
// Friday sunnah's "اقرأ السورة الآن" deep link) working against a reader
// that now thinks in pages, not surahs.
export function pageForSurah(surahId) {
  const surah = quranSurahs.find((s) => s.id === surahId);
  return surah?.verses?.[0]?.page ?? 1;
}

const ARABIC_INDIC_DIGITS = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
export function toArabicIndicDigits(n) {
  return String(n)
    .split('')
    .map((ch) => ARABIC_INDIC_DIGITS[Number(ch)] ?? ch)
    .join('');
}
