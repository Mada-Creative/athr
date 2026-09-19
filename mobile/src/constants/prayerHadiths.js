// Hadiths used to give the prayer-time notifications a reason beyond "it's
// time" — rotated so the same wording doesn't sit on the same prayer or the
// same day forever. Every entry here is a well-known, authentically graded
// hadith (Bukhari/Muslim, or a hasan/sahih-graded narration from the Sunan)
// — same verification bar as constants/athrCards.js, just a separate list
// since these are specifically about the virtue of prayer/congregation
// rather than general daily remembrance content.

// Applies to any prayer — the adhan notification falls back to these when
// that prayer doesn't have its own specific hadith due today (see
// PRAYER_SPECIFIC_HADITHS below).
const GENERAL_PRAYER_HADITHS = [
  { text: 'الصَّلَاةُ نُورٌ', source: 'من حديث أبي مالك الأشعري، رواه مسلم' },
  { text: 'بَيْنَ الرَّجُلِ وَبَيْنَ الشِّرْكِ وَالْكُفْرِ تَرْكُ الصَّلَاةِ', source: 'رواه مسلم عن جابر رضي الله عنه' },
  {
    text: 'الْعَهْدُ الَّذِي بَيْنَنَا وَبَيْنَهُمُ الصَّلَاةُ، فَمَنْ تَرَكَهَا فَقَدْ كَفَرَ',
    source: 'رواه أحمد والترمذي والنسائي وابن ماجه، وصححه الألباني',
  },
  {
    text: 'أَوَّلُ مَا يُحَاسَبُ بِهِ الْعَبْدُ يَوْمَ الْقِيَامَةِ صَلَاتُهُ، فَإِنْ صَلَحَتْ صَلَحَ سَائِرُ عَمَلِهِ',
    source: 'رواه الترمذي والنسائي، وحسّنه الألباني',
  },
];

// Shown roughly every 3rd occurrence of that specific prayer instead of a
// general hadith — a rawatib/fajr hadith is far more worth reading right at
// that prayer's own notification than shuffled in anywhere.
const PRAYER_SPECIFIC_HADITHS = {
  fajr: [
    { text: 'مَنْ صَلَّى الصُّبْحَ فَهُوَ فِي ذِمَّةِ اللَّهِ', source: 'رواه مسلم عن جندب بن عبد الله رضي الله عنه' },
    { text: 'رَكْعَتَا الْفَجْرِ خَيْرٌ مِنَ الدُّنْيَا وَمَا فِيهَا', source: 'رواه مسلم عن عائشة رضي الله عنها' },
    { text: 'مَنْ صَلَّى الْبَرْدَيْنِ دَخَلَ الْجَنَّةَ', source: 'متفق عليه، عن أبي موسى الأشعري رضي الله عنه' },
  ],
  dhuhr: [
    {
      text: 'مَنْ حَافَظَ عَلَى أَرْبَعِ رَكَعَاتٍ قَبْلَ الظُّهْرِ وَأَرْبَعٍ بَعْدَهَا حَرَّمَهُ اللَّهُ عَلَى النَّارِ',
      source: 'رواه أبو داود والترمذي، وصححه الألباني',
    },
  ],
  asr: [
    { text: 'مَنْ تَرَكَ صَلَاةَ الْعَصْرِ فَقَدْ حَبِطَ عَمَلُهُ', source: 'رواه البخاري عن ابن عمر رضي الله عنهما' },
    { text: 'مَنْ صَلَّى الْبَرْدَيْنِ دَخَلَ الْجَنَّةَ', source: 'متفق عليه، عن أبي موسى الأشعري رضي الله عنه' },
  ],
  maghrib: [
    {
      text: 'مَنْ صَلَّى فِي يَوْمٍ وَلَيْلَةٍ ثِنْتَيْ عَشْرَةَ رَكْعَةً تَطَوُّعًا بُنِيَ لَهُ بَيْتٌ فِي الْجَنَّةِ',
      source: 'رواه مسلم عن أم حبيبة رضي الله عنها',
    },
  ],
  isha: [
    {
      text: 'مَنْ صَلَّى الْعِشَاءَ فِي جَمَاعَةٍ فَكَأَنَّمَا قَامَ نِصْفَ اللَّيْلِ',
      source: 'جزء من حديث عثمان بن عفان رضي الله عنه، رواه مسلم',
    },
  ],
};

// For the *reminder* notification specifically (fires before the prayer,
// while there's still time to get up and go) — always pulls from here, not
// the adhan lists above, since the point of a reminder is specifically to
// push toward praying in congregation at the mosque.
const JAMAAH_HADITHS = [
  {
    text: 'صَلَاةُ الْجَمَاعَةِ أَفْضَلُ مِنْ صَلَاةِ الْفَذِّ بِسَبْعٍ وَعِشْرِينَ دَرَجَةً',
    source: 'متفق عليه، عن ابن عمر رضي الله عنهما',
  },
  {
    text: 'مَنْ غَدَا إِلَى الْمَسْجِدِ أَوْ رَاحَ أَعَدَّ اللَّهُ لَهُ فِي الْجَنَّةِ نُزُلًا كُلَّمَا غَدَا أَوْ رَاحَ',
    source: 'متفق عليه، عن أبي هريرة رضي الله عنه',
  },
  {
    text: 'مَنْ تَطَهَّرَ فِي بَيْتِهِ ثُمَّ مَشَى إِلَى بَيْتٍ مِنْ بُيُوتِ اللَّهِ، كَانَتْ خَطْوَتَاهُ إِحْدَاهُمَا تَحُطُّ خَطِيئَةً وَالْأُخْرَى تَرْفَعُ دَرَجَةً',
    source: 'رواه مسلم عن أبي هريرة رضي الله عنه',
  },
  {
    text: 'مَنْ كَانَ يَمْشِي فِي الظُّلَمِ إِلَى الْمَسَاجِدِ فَبَشِّرْهُمْ بِالنُّورِ التَّامِّ يَوْمَ الْقِيَامَةِ',
    source: 'رواه أبو داود والترمذي، وحسّنه الألباني',
  },
];

const PRAYER_ORDER = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];

function dayNumber(date) {
  return Math.floor(date.getTime() / 86400000);
}

// One hadith per adhan notification: mostly a general one (offset by the
// prayer's position in the day so fajr/dhuhr/asr/maghrib/isha don't all
// show the same one on the same day), but on roughly one occurrence out of
// three, swap in that prayer's own specific hadith instead — different
// specific entry each time it comes up, if that prayer has more than one.
function pickAdhanHadith(prayerKey, date) {
  const day = dayNumber(date);
  const specific = PRAYER_SPECIFIC_HADITHS[prayerKey];
  if (specific?.length && day % 3 === 0) {
    return specific[Math.floor(day / 3) % specific.length];
  }
  const offset = PRAYER_ORDER.indexOf(prayerKey);
  return GENERAL_PRAYER_HADITHS[(day + offset) % GENERAL_PRAYER_HADITHS.length];
}

// The pre-prayer reminder always pushes toward congregation — offset
// differently from pickAdhanHadith so the two notifications for the same
// prayer don't happen to line up on the same hadith.
function pickJamaahHadith(prayerKey, date) {
  const day = dayNumber(date);
  const offset = PRAYER_ORDER.indexOf(prayerKey) + 1;
  return JAMAAH_HADITHS[(day + offset) % JAMAAH_HADITHS.length];
}

export { pickAdhanHadith, pickJamaahHadith };
