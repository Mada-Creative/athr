// Font family names are wired up in App.js via useFonts(). If the Cairo font
// hasn't finished loading yet, RN falls back to the system font automatically
// when the string doesn't resolve, so the UI never blocks on font load.
const typography = {
  fontRegular: 'Cairo_400Regular',
  fontMedium: 'Cairo_500Medium',
  fontSemiBold: 'Cairo_600SemiBold',
  fontBold: 'Cairo_700Bold',
  // For the literal Quran reader — the official mushaf text uses
  // Uthmani-script marks Cairo has no glyphs for.
  fontQuran: 'AmiriQuran_400Regular',
  // Same loaded font family, used more broadly: any dhikr/dua/hadith text
  // (the athkar counter, duas, the 99 Names, tasbih phrases) gets this
  // calligraphic Naskh face instead of Cairo, so remembrance text reads
  // distinctly from the app's own UI chrome — headings, labels, buttons
  // stay Cairo/Tajawal.
  fontDhikr: 'AmiriQuran_400Regular',

  h1: 28,
  h2: 22,
  h3: 18,
  body: 15,
  small: 13,
  tiny: 11,
};

export default typography;
