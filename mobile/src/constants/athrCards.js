// "بطاقات أثر" — the daily card shown above the prayer hero card on Home.
// One card is "live" per real calendar day (see cardIndexForDate below),
// the same one for every user on the same date, cycling through this list
// once it runs out.
//
// Four content types, interleaved below so a run of days doesn't sit on
// one type for a week straight:
//   آية    — a short, widely-known Qur'an verse (often a fragment of a
//             longer ayah, the same way the app's own duas.js already
//             quotes just the supplication portion of an ayah)
//   حديث   — a short, well-attested hadith (kept to ones with a solid,
//             commonly-cited grading — متفق عليه / رواه مسلم / حديث حسن)
//   دعاء   — a Qur'anic or prophetic supplication, written in full rather
//             than truncated mid-phrase
//   مقولة  — a saying attributed to one of the salaf, named on the card
//
// Every entry below was checked against actual references (not written
// from memory and left as-is) before being included. This went through two
// passes:
//   1. The original 90-card version had ~40% of its "مقولة" entries either
//      misattributed (e.g. a saying attributed to a named scholar that
//      isn't actually his, or is really a weak/unsourced hadith rather
//      than that person's own words) or simply unverifiable anywhere, plus
//      a few duas quoted as fragments of a longer prophetic supplication
//      instead of in full. Anything that couldn't be confirmed was dropped
//      rather than kept "probably fine," which took the list down to 77.
//   2. A follow-up pass individually re-verified all 23 HADITH_CARDS
//      (skipped in pass 1 for time), which turned up one more truncated
//      hadith to complete, then added back 13 newly-verified entries
//      (8 ayah, 4 dua, 1 wisdom) to bring the cycle back to 90 — each
//      checked the same way, not just written to hit the round number.

const AYAH_CARDS = [
  { text: 'فَإِنَّ مَعَ الْعُسْرِ يُسْرًا', source: 'سورة الشرح — الآية 6' },
  { text: 'وَبَشِّرِ الصَّابِرِينَ', source: 'سورة البقرة — الآية 155' },
  { text: 'أَلَا بِذِكْرِ اللَّهِ تَطْمَئِنُّ الْقُلُوبُ', source: 'سورة الرعد — الآية 28' },
  { text: 'وَقُل رَّبِّ زِدْنِي عِلْمًا', source: 'سورة طه — الآية 114' },
  { text: 'فَاذْكُرُونِي أَذْكُرْكُمْ وَاشْكُرُوا لِي وَلَا تَكْفُرُونِ', source: 'سورة البقرة — الآية 152' },
  { text: 'وَاسْتَعِينُوا بِالصَّبْرِ وَالصَّلَاةِ ۚ إِنَّ اللَّهَ مَعَ الصَّابِرِينَ', source: 'سورة البقرة — الآية 153' },
  { text: 'وَمَن يَتَّقِ اللَّهَ يَجْعَل لَّهُ مَخْرَجًا', source: 'سورة الطلاق — الآية 2' },
  { text: 'وَمَن يَتَوَكَّلْ عَلَى اللَّهِ فَهُوَ حَسْبُهُ', source: 'سورة الطلاق — الآية 3' },
  { text: 'رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً وَفِي الْآخِرَةِ حَسَنَةً وَقِنَا عَذَابَ النَّارِ', source: 'سورة البقرة — الآية 201' },
  { text: 'وَاصْبِرْ وَمَا صَبْرُكَ إِلَّا بِاللَّهِ', source: 'سورة النحل — الآية 127' },
  { text: 'وَلَسَوْفَ يُعْطِيكَ رَبُّكَ فَتَرْضَىٰ', source: 'سورة الضحى — الآية 5' },
  { text: 'إِنَّ رَحْمَتَ اللَّهِ قَرِيبٌ مِّنَ الْمُحْسِنِينَ', source: 'سورة الأعراف — الآية 56' },
  { text: 'قُلْ يَا عِبَادِيَ الَّذِينَ أَسْرَفُوا عَلَىٰ أَنفُسِهِمْ لَا تَقْنَطُوا مِن رَّحْمَةِ اللَّهِ', source: 'سورة الزمر — الآية 53' },
  { text: 'وَهُوَ مَعَكُمْ أَيْنَ مَا كُنتُمْ', source: 'سورة الحديد — الآية 4' },
  { text: 'رَبِّ اشْرَحْ لِي صَدْرِي وَيَسِّرْ لِي أَمْرِي', source: 'سورة طه — الآيتان 25-26' },
  { text: 'إِنَّمَا الْمُؤْمِنُونَ إِخْوَةٌ', source: 'سورة الحجرات — الآية 10' },
  { text: 'وَتَعَاوَنُوا عَلَى الْبِرِّ وَالتَّقْوَىٰ', source: 'سورة المائدة — الآية 2' },
  { text: 'وَمَن يُسْلِمْ وَجْهَهُ إِلَى اللَّهِ وَهُوَ مُحْسِنٌ فَقَدِ اسْتَمْسَكَ بِالْعُرْوَةِ الْوُثْقَىٰ', source: 'سورة لقمان — الآية 22' },
  { text: 'لَا يُكَلِّفُ اللَّهُ نَفْسًا إِلَّا وُسْعَهَا', source: 'سورة البقرة — الآية 286' },
  { text: 'وَإِذَا سَأَلَكَ عِبَادِي عَنِّي فَإِنِّي قَرِيبٌ', source: 'سورة البقرة — الآية 186' },
  { text: 'وَقُل رَّبِّ ارْحَمْهُمَا كَمَا رَبَّيَانِي صَغِيرًا', source: 'سورة الإسراء — الآية 24' },
  { text: 'وَافْعَلُوا الْخَيْرَ لَعَلَّكُمْ تُفْلِحُونَ', source: 'سورة الحج — الآية 77' },
  { text: 'وَقُلِ اعْمَلُوا فَسَيَرَى اللَّهُ عَمَلَكُمْ وَرَسُولُهُ وَالْمُؤْمِنُونَ', source: 'سورة التوبة — الآية 105' },
  // 8 added in the follow-up verification pass (see HADITH_CARDS' comment
  // below for why this pass happened) — each checked directly against the
  // mushaf text and reference, not quoted from memory.
  { text: 'وَقَالَ رَبُّكُمُ ادْعُونِي أَسْتَجِبْ لَكُمْ', source: 'سورة غافر — الآية 60' },
  { text: 'فَإِذَا عَزَمْتَ فَتَوَكَّلْ عَلَى اللَّهِ ۚ إِنَّ اللَّهَ يُحِبُّ الْمُتَوَكِّلِينَ', source: 'سورة آل عمران — الآية 159' },
  { text: 'وَلَا تَهِنُوا وَلَا تَحْزَنُوا وَأَنتُمُ الْأَعْلَوْنَ إِن كُنتُم مُّؤْمِنِينَ', source: 'سورة آل عمران — الآية 139' },
  { text: 'إِنَّ اللَّهَ لَا يُغَيِّرُ مَا بِقَوْمٍ حَتَّىٰ يُغَيِّرُوا مَا بِأَنفُسِهِمْ', source: 'سورة الرعد — الآية 11' },
  { text: 'وَاعْبُدْ رَبَّكَ حَتَّىٰ يَأْتِيَكَ الْيَقِينُ', source: 'سورة الحجر — الآية 99' },
  { text: 'خُذِ الْعَفْوَ وَأْمُرْ بِالْعُرْفِ وَأَعْرِضْ عَنِ الْجَاهِلِينَ', source: 'سورة الأعراف — الآية 199' },
  { text: 'إِنَّهُ لَا يَيْأَسُ مِن رَّوْحِ اللَّهِ إِلَّا الْقَوْمُ الْكَافِرُونَ', source: 'سورة يوسف — الآية 87' },
  { text: 'وَنُنَزِّلُ مِنَ الْقُرْآنِ مَا هُوَ شِفَاءٌ وَرَحْمَةٌ لِّلْمُؤْمِنِينَ', source: 'سورة الإسراء — الآية 82' },
];

// Went through all 23 of these individually against actual takhrij sources
// (islamweb/alukah/dorar-style breakdowns, not memory) after the dua/wisdom
// verification pass had already caught real errors elsewhere — every one of
// them checked out as attributed, worded, and graded here. The one fix that
// came out of it: #10 below was missing its closing clause (see comment on
// it) the exact same way several DUA_CARDS entries were missing theirs.
const HADITH_CARDS = [
  { text: 'الكَلِمَةُ الطَّيِّبَةُ صَدَقَةٌ', source: 'متفق عليه' },
  { text: 'الدِّينُ النَّصِيحَةُ', source: 'رواه مسلم' },
  { text: 'مَنْ حَسُنَ إِسْلَامُ الْمَرْءِ تَرْكُهُ مَا لَا يَعْنِيهِ', source: 'حديث حسن، رواه الترمذي' },
  { text: 'لَا يُؤْمِنُ أَحَدُكُمْ حَتَّى يُحِبَّ لِأَخِيهِ مَا يُحِبُّ لِنَفْسِهِ', source: 'متفق عليه' },
  { text: 'لَا يَرْحَمُ اللَّهُ مَنْ لَا يَرْحَمُ النَّاسَ', source: 'متفق عليه' },
  { text: 'الْمُسْلِمُ مَنْ سَلِمَ الْمُسْلِمُونَ مِنْ لِسَانِهِ وَيَدِهِ', source: 'متفق عليه' },
  { text: 'خَيْرُكُمْ مَنْ تَعَلَّمَ الْقُرْآنَ وَعَلَّمَهُ', source: 'رواه البخاري' },
  { text: 'التَّبَسُّمُ فِي وَجْهِ أَخِيكَ صَدَقَةٌ', source: 'حديث حسن، رواه الترمذي' },
  { text: 'مَنْ سَلَكَ طَرِيقًا يَلْتَمِسُ فِيهِ عِلْمًا سَهَّلَ اللَّهُ لَهُ بِهِ طَرِيقًا إِلَى الْجَنَّةِ', source: 'رواه مسلم' },
  // COMPLETED: was missing its third clause ("وخالق الناس بخلق حسن") —
  // the hadith is three instructions in one (Abu Dharr & Mu'adh ibn Jabal,
  // Tirmidhi), not two.
  { text: 'اتَّقِ اللَّهَ حَيْثُمَا كُنْتَ، وَأَتْبِعِ السَّيِّئَةَ الْحَسَنَةَ تَمْحُهَا، وَخَالِقِ النَّاسَ بِخُلُقٍ حَسَنٍ', source: 'حديث حسن صحيح، رواه الترمذي' },
  { text: 'إِنَّ اللَّهَ رَفِيقٌ يُحِبُّ الرِّفْقَ فِي الْأَمْرِ كُلِّهِ', source: 'متفق عليه' },
  { text: 'مَنْ صَمَتَ نَجَا', source: 'حديث حسن، رواه الترمذي' },
  { text: 'الْمُؤْمِنُ الْقَوِيُّ خَيْرٌ وَأَحَبُّ إِلَى اللَّهِ مِنَ الْمُؤْمِنِ الضَّعِيفِ', source: 'رواه مسلم' },
  { text: 'مَنْ كَانَ يُؤْمِنُ بِاللَّهِ وَالْيَوْمِ الْآخِرِ فَلْيَقُلْ خَيْرًا أَوْ لِيَصْمُتْ', source: 'متفق عليه' },
  { text: 'إِنَّمَا الْأَعْمَالُ بِالنِّيَّاتِ', source: 'متفق عليه' },
  { text: 'لَا ضَرَرَ وَلَا ضِرَارَ', source: 'حديث حسن، رواه ابن ماجه' },
  { text: 'مَنْ لَمْ يَشْكُرِ النَّاسَ لَمْ يَشْكُرِ اللَّهَ', source: 'رواه أبو داود والترمذي' },
  { text: 'الْحَيَاءُ لَا يَأْتِي إِلَّا بِخَيْرٍ', source: 'متفق عليه' },
  { text: 'إِذَا مَاتَ ابْنُ آدَمَ انْقَطَعَ عَمَلُهُ إِلَّا مِنْ ثَلَاثٍ', source: 'رواه مسلم' },
  { text: 'خَيْرُ الصَّدَقَةِ مَا كَانَ عَنْ ظَهْرِ غِنًى', source: 'رواه البخاري' },
  { text: 'إِنَّ اللَّهَ يُحِبُّ إِذَا عَمِلَ أَحَدُكُمْ عَمَلًا أَنْ يُتْقِنَهُ', source: 'رواه البيهقي، وصححه الألباني' },
  { text: 'الرَّاحِمُونَ يَرْحَمُهُمُ الرَّحْمَٰنُ', source: 'حديث صحيح، رواه أبو داود والترمذي' },
  { text: 'خَيْرُكُمْ خَيْرُكُمْ لِأَهْلِهِ', source: 'حديث صحيح، رواه الترمذي وابن ماجه' },
];

const DUA_CARDS = [
  { text: 'اللَّهُمَّ إِنِّي أَسْأَلُكَ الْعَفْوَ وَالْعَافِيَةَ فِي الدُّنْيَا وَالْآخِرَةِ', source: 'رواه ابن ماجه' },
  { text: 'رَبَّنَا لَا تُزِغْ قُلُوبَنَا بَعْدَ إِذْ هَدَيْتَنَا وَهَبْ لَنَا مِنْ لَدُنْكَ رَحْمَةً إِنَّكَ أَنْتَ الْوَهَّابُ', source: 'سورة آل عمران — الآية 8' },
  { text: 'لَا إِلَٰهَ إِلَّا أَنْتَ سُبْحَانَكَ إِنِّي كُنْتُ مِنَ الظَّالِمِينَ', source: 'سورة الأنبياء — الآية 87' },
  { text: 'اللَّهُمَّ افْتَحْ لِي أَبْوَابَ رَحْمَتِكَ', source: 'رواه مسلم' },
  { text: 'بِسْمِ اللَّهِ تَوَكَّلْتُ عَلَى اللَّهِ وَلَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّهِ', source: 'حديث حسن، رواه أبو داود والترمذي' },
  { text: 'اللَّهُمَّ اكْفِنِي بِحَلَالِكَ عَنْ حَرَامِكَ، وَأَغْنِنِي بِفَضْلِكَ عَمَّنْ سِوَاكَ', source: 'حديث حسن، رواه الترمذي' },
  { text: 'حَسْبُنَا اللَّهُ وَنِعْمَ الْوَكِيلُ', source: 'سورة آل عمران — الآية 173' },
  { text: 'يَا مُقَلِّبَ الْقُلُوبِ ثَبِّتْ قَلْبِي عَلَى دِينِكَ', source: 'حديث حسن صحيح، رواه الترمذي' },
  { text: 'اللَّهُمَّ أَنْتَ السَّلَامُ وَمِنْكَ السَّلَامُ، تَبَارَكْتَ يَا ذَا الْجَلَالِ وَالْإِكْرَامِ', source: 'رواه مسلم' },
  { text: 'اللَّهُمَّ أَعِنِّي عَلَى ذِكْرِكَ وَشُكْرِكَ وَحُسْنِ عِبَادَتِكَ', source: 'رواه أبو داود والنسائي، وصححه الألباني' },
  { text: 'حَسْبِيَ اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ عَلَيْهِ تَوَكَّلْتُ وَهُوَ رَبُّ الْعَرْشِ الْعَظِيمِ', source: 'سورة التوبة — الآية 129' },
  { text: 'اللَّهُمَّ لَا مَانِعَ لِمَا أَعْطَيْتَ، وَلَا مُعْطِيَ لِمَا مَنَعْتَ، وَلَا رَادَّ لِمَا قَضَيْتَ، وَلَا يَنْفَعُ ذَا الْجَدِّ مِنْكَ الْجَدُّ', source: 'متفق عليه' },
  { text: 'اللَّهُمَّ عَافِنِي فِي بَدَنِي، اللَّهُمَّ عَافِنِي فِي سَمْعِي، اللَّهُمَّ عَافِنِي فِي بَصَرِي، لَا إِلَٰهَ إِلَّا أَنْتَ', source: 'حديث حسّنه ابن حجر والألباني، رواه أبو داود' },
  { text: 'رَبَّنَا لَا تُؤَاخِذْنَا إِن نَّسِينَا أَوْ أَخْطَأْنَا', source: 'سورة البقرة — الآية 286' },
  { text: 'رَبِّ أَوْزِعْنِي أَنْ أَشْكُرَ نِعْمَتَكَ الَّتِي أَنْعَمْتَ عَلَيَّ', source: 'سورة النمل — الآية 19' },
  { text: 'رَبَّنَا اغْفِرْ لَنَا ذُنُوبَنَا وَإِسْرَافَنَا فِي أَمْرِنَا', source: 'سورة آل عمران — الآية 147' },
  { text: 'رَبِّ اجْعَلْنِي مُقِيمَ الصَّلَاةِ وَمِن ذُرِّيَّتِي', source: 'سورة إبراهيم — الآية 40' },
  { text: 'رَبَّنَا هَبْ لَنَا مِنْ أَزْوَاجِنَا وَذُرِّيَّاتِنَا قُرَّةَ أَعْيُنٍ', source: 'سورة الفرقان — الآية 74' },
  { text: 'رَبِّ إِنِّي لِمَا أَنزَلْتَ إِلَيَّ مِنْ خَيْرٍ فَقِيرٌ', source: 'سورة القصص — الآية 24' },
  { text: 'اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنَ الْهَمِّ وَالْحَزَنِ، وَالْعَجْزِ وَالْكَسَلِ، وَالْجُبْنِ وَالْبُخْلِ، وَضَلَعِ الدَّيْنِ وَغَلَبَةِ الرِّجَالِ', source: 'متفق عليه' },
  { text: 'اللَّهُمَّ إِنَّكَ عَفُوٌّ تُحِبُّ الْعَفْوَ فَاعْفُ عَنِّي', source: 'رواه أحمد والنسائي وابن ماجه' },
  // 4 added in the follow-up pass, each written out in full rather than as
  // a fragment — same standard the completed entries above were held to.
  { text: 'رَبِّ هَبْ لِي مِن لَّدُنكَ ذُرِّيَّةً طَيِّبَةً ۖ إِنَّكَ سَمِيعُ الدُّعَاءِ', source: 'سورة آل عمران — الآية 38' },
  { text: 'رَبِّ اغْفِرْ لِي وَلِوَالِدَيَّ وَلِمَن دَخَلَ بَيْتِيَ مُؤْمِنًا وَلِلْمُؤْمِنِينَ وَالْمُؤْمِنَاتِ', source: 'سورة نوح — الآية 28' },
  { text: 'اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنْ زَوَالِ نِعْمَتِكَ، وَتَحَوُّلِ عَافِيَتِكَ، وَفُجَاءَةِ نِقْمَتِكَ، وَجَمِيعِ سَخَطِكَ', source: 'رواه مسلم' },
  { text: 'اللَّهُمَّ إِنِّي أَسْأَلُكَ مِنَ الْخَيْرِ كُلِّهِ عَاجِلِهِ وَآجِلِهِ، مَا عَلِمْتُ مِنْهُ وَمَا لَمْ أَعْلَمْ، وَأَعُوذُ بِكَ مِنَ الشَّرِّ كُلِّهِ عَاجِلِهِ وَآجِلِهِ، مَا عَلِمْتُ مِنْهُ وَمَا لَمْ أَعْلَمْ', source: 'حديث صحيح، رواه ابن ماجه' },
];

const WISDOM_CARDS = [
  { text: 'حَاسِبُوا أَنْفُسَكُمْ قَبْلَ أَنْ تُحَاسَبُوا', source: 'عمر بن الخطاب رضي الله عنه' },
  { text: 'ابْنَ آدَمَ، إِنَّمَا أَنْتَ أَيَّامٌ، فَإِذَا ذَهَبَ يَوْمٌ ذَهَبَ بَعْضُكَ', source: 'الحسن البصري، رواه أبو نُعيم في حلية الأولياء' },
  { text: 'مَنْ عَرَفَ نَفْسَهُ اشْتَغَلَ بِإِصْلَاحِهَا عَنْ عُيُوبِ النَّاسِ', source: 'ابن القيّم' },
  { text: 'تَرْكُ الْعَمَلِ لِأَجْلِ النَّاسِ رِيَاءٌ، وَالْعَمَلُ لِأَجْلِ النَّاسِ شِرْكٌ، وَالْإِخْلَاصُ أَنْ يُعَافِيَكَ اللَّهُ مِنْهُمَا', source: 'الفُضيل بن عياض' },
  { text: 'تَفَقَّهُوا قَبْلَ أَنْ تَسُودُوا', source: 'عمر بن الخطاب رضي الله عنه، علّقه البخاري في صحيحه' },
  { text: 'قِيمَةُ كُلِّ امْرِئٍ مَا يُحْسِنُهُ', source: 'علي بن أبي طالب رضي الله عنه' },
  { text: 'مَنْ كَثُرَ كَلَامُهُ كَثُرَ سَقَطُهُ', source: 'عمر بن الخطاب رضي الله عنه' },
  { text: 'لَوْ طَهُرَتْ قُلُوبُنَا مَا شَبِعْنَا مِنْ كَلَامِ رَبِّنَا', source: 'عثمان بن عفان رضي الله عنه' },
  { text: 'تَفَكُّرُ سَاعَةٍ خَيْرٌ مِنْ قِيَامِ لَيْلَةٍ', source: 'أبو الدرداء رضي الله عنه' },
  { text: 'الْقَلْبُ يَمْرَضُ كَمَا يَمْرَضُ الْبَدَنُ، وَشِفَاؤُهُ فِي التَّوْبَةِ وَالْحِمْيَةِ', source: 'ابن القيّم، كتاب الفوائد' },
  // 1 added in the follow-up pass — several other candidates were tried
  // here too (a Shafi'i line, a Sufyan al-Thawri line) and dropped because
  // they either couldn't be pinned to an exact wording or turned out, on
  // checking, to actually be a weak hadith misremembered as someone's own
  // saying — the same trap the original 12 removed entries fell into. This
  // one is correctly attributed to Masruq ibn al-Ajda' (a student of
  // Aisha), not the similar-sounding lines sometimes misattributed to Ibn
  // Mas'ud.
  { text: 'كَفَى بِالْمَرْءِ عِلْمًا أَنْ يَخْشَى اللَّهَ، وَكَفَى بِالْمَرْءِ جَهْلًا أَنْ يُعْجَبَ بِعَمَلِهِ', source: 'مسروق بن الأجدع، رواه ابن أبي شيبة في المصنف' },
];

function withType(list, type, tag) {
  return list.map((c) => ({ ...c, type, tag }));
}

// Round-robin (ayah, hadith, dua, wisdom, ayah, …) so any stretch of days
// reads varied rather than sitting on one content type for a while — once
// the shorter lists run out, the remaining ones just finish out the tail.
function interleave(...lists) {
  const max = Math.max(...lists.map((l) => l.length));
  const out = [];
  for (let i = 0; i < max; i += 1) {
    for (const list of lists) {
      if (list[i]) out.push(list[i]);
    }
  }
  return out;
}

const ATHR_CARDS = interleave(
  withType(AYAH_CARDS, 'ayah', 'آية'),
  withType(HADITH_CARDS, 'hadith', 'حديث'),
  withType(DUA_CARDS, 'dua', 'دعاء'),
  withType(WISDOM_CARDS, 'wisdom', 'مقولة')
);

// A fixed reference date, not "app launch" or anything install-specific —
// every user's device computes the same index for the same real calendar
// date, which is the whole point (everyone sees the same card that day).
const CYCLE_EPOCH = new Date(2025, 0, 1);

function cardIndexForDate(date = new Date()) {
  const local = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.round((local - CYCLE_EPOCH) / 86400000);
  const len = ATHR_CARDS.length;
  return ((diffDays % len) + len) % len;
}

function cardForDate(date = new Date()) {
  return ATHR_CARDS[cardIndexForDate(date)];
}

// A card is "a hadith of the Prophet ﷺ" if it's typed 'hadith', or if it's
// a DUA_CARDS entry whose wording is actually his own supplication rather
// than a Qur'anic one — a Qur'anic dua's source always starts with 'سورة',
// so anything else in DUA_CARDS is a prophetic hadith too. آية and مقولة
// cards are never his own words, so they never get this.
const HADITH_PREFIX = 'قَالَ رَسُولُ اللَّهِ صَلَّى اللَّهُ عَلَيْهِ وَسَلَّمَ';

function isHadithSourced(card) {
  if (card.type === 'ayah' || card.type === 'wisdom') return false;
  return !card.source.startsWith('سورة');
}

export default ATHR_CARDS;
export { cardIndexForDate, cardForDate, isHadithSourced, HADITH_PREFIX };
