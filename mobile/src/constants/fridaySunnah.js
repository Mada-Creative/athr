// "سنن يوم الجمعة" — a short reference list, not a daily-completion
// checklist (no log/toggle backing this, unlike athkar/prayers). Reachable
// any day of the week from Home, not locked to Friday — see
// FridaySunnahScreen.js and the Home tile that opens it.
//
// Every hadith here was checked against actual takhrij sources before
// being included, same standard as constants/athrCards.js: written in
// full (no "..." mid-hadith), with its real narrator and grading, nothing
// included on a "probably fine" guess.

const FRIDAY_SUNNAH = [
  {
    title: 'الاغتسال والتطيّب',
    icon: 'water-outline',
    text: 'مَنِ اغْتَسَلَ يَوْمَ الْجُمُعَةِ، وَتَطَهَّرَ بِمَا اسْتَطَاعَ مِنْ طُهْرٍ، ثُمَّ ادَّهَنَ أَوْ مَسَّ مِنْ طِيبٍ، ثُمَّ رَاحَ فَلَمْ يُفَرِّقْ بَيْنَ اثْنَيْنِ، فَصَلَّى مَا كُتِبَ لَهُ، ثُمَّ إِذَا خَرَجَ الْإِمَامُ أَنْصَتَ، غُفِرَ لَهُ مَا بَيْنَهُ وَبَيْنَ الْجُمُعَةِ الْأُخْرَى',
    source: 'رواه البخاري، عن سلمان الفارسي رضي الله عنه',
  },
  {
    title: 'التبكير إلى المسجد',
    icon: 'walk-outline',
    text: 'مَنْ رَاحَ فِي السَّاعَةِ الْأُولَى فَكَأَنَّمَا قَرَّبَ بَدَنَةً، وَمَنْ رَاحَ فِي السَّاعَةِ الثَّانِيَةِ فَكَأَنَّمَا قَرَّبَ بَقَرَةً، وَمَنْ رَاحَ فِي السَّاعَةِ الثَّالِثَةِ فَكَأَنَّمَا قَرَّبَ كَبْشًا أَقْرَنَ، وَمَنْ رَاحَ فِي السَّاعَةِ الرَّابِعَةِ فَكَأَنَّمَا قَرَّبَ دَجَاجَةً، وَمَنْ رَاحَ فِي السَّاعَةِ الْخَامِسَةِ فَكَأَنَّمَا قَرَّبَ بَيْضَةً، فَإِذَا خَرَجَ الْإِمَامُ حَضَرَتِ الْمَلَائِكَةُ يَسْتَمِعُونَ الذِّكْرَ',
    source: 'متفق عليه، عن أبي هريرة رضي الله عنه',
  },
  {
    title: 'قراءة سورة الكهف',
    icon: 'book-outline',
    text: 'مَنْ قَرَأَ سُورَةَ الْكَهْفِ يَوْمَ الْجُمُعَةِ أَضَاءَ لَهُ مِنَ النُّورِ مَا بَيْنَ الْجُمُعَتَيْنِ',
    source: 'حسّنه الألباني في صحيح الترغيب، عن أبي سعيد الخدري رضي الله عنه',
    // The only item here with something to actually *do* right from this
    // screen — surahId 18 in the app's own bundled mushaf (constants/
    // quranText.json), so tapping opens the real text, not a promise.
    action: { label: 'اقرأ السورة الآن', route: 'QuranReader', params: { surahId: 18 } },
  },
  {
    title: 'الإكثار من الصلاة على النبي ﷺ',
    icon: 'heart-outline',
    text: 'أَكْثِرُوا الصَّلَاةَ عَلَيَّ يَوْمَ الْجُمُعَةِ وَلَيْلَةَ الْجُمُعَةِ، فَمَنْ صَلَّى عَلَيَّ صَلَاةً صَلَّى اللَّهُ عَلَيْهِ عَشْرًا',
    source: 'حسّنه الألباني في السلسلة الصحيحة، عن أنس بن مالك رضي الله عنه',
  },
  {
    title: 'تحرّي ساعة الإجابة',
    icon: 'hand-left-outline',
    text: 'يَوْمُ الْجُمُعَةِ ثِنْتَا عَشْرَةَ سَاعَةً، لَا يُوجَدُ فِيهَا عَبْدٌ مُسْلِمٌ يَسْأَلُ اللَّهَ عَزَّ وَجَلَّ شَيْئًا إِلَّا آتَاهُ إِيَّاهُ، فَالْتَمِسُوهَا آخِرَ سَاعَةٍ بَعْدَ الْعَصْرِ',
    source: 'رواه أبو داود والنسائي، وصححه الألباني، عن جابر بن عبدالله رضي الله عنه',
  },
  {
    title: 'الإنصات للخطبة',
    icon: 'ear-outline',
    text: 'إِذَا قُلْتَ لِصَاحِبِكَ يَوْمَ الْجُمُعَةِ: أَنْصِتْ، وَالْإِمَامُ يَخْطُبُ، فَقَدْ لَغَوْتَ',
    source: 'متفق عليه، عن أبي هريرة رضي الله عنه',
  },
];

export default FRIDAY_SUNNAH;
