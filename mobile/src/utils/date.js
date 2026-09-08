const HIJRI_MONTHS = [
  'محرم',
  'صفر',
  'ربيع الأول',
  'ربيع الآخر',
  'جمادى الأولى',
  'جمادى الآخرة',
  'رجب',
  'شعبان',
  'رمضان',
  'شوال',
  'ذو القعدة',
  'ذو الحجة',
];

const GREGORIAN_MONTHS_AR = [
  'يناير',
  'فبراير',
  'مارس',
  'أبريل',
  'مايو',
  'يونيو',
  'يوليو',
  'أغسطس',
  'سبتمبر',
  'أكتوبر',
  'نوفمبر',
  'ديسمبر',
];

const WEEKDAYS_AR = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

function todayISO(date = new Date()) {
  const d = new Date(date);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
}

function addDays(isoDate, amount) {
  const d = new Date(`${isoDate}T00:00:00`);
  d.setDate(d.getDate() + amount);
  return todayISO(d);
}

function formatGregorian(date = new Date()) {
  return `${date.getDate()} ${GREGORIAN_MONTHS_AR[date.getMonth()]} ${date.getFullYear()}`;
}

function formatWeekday(date = new Date()) {
  return WEEKDAYS_AR[date.getDay()];
}

// Kuwaiti-algorithm style tabular Hijri conversion — a well known, dependency
// free approximation (accurate to within a day or two around month
// boundaries, which is expected for any tabular calendar not synced to
// local moon sighting).
function toHijri(date = new Date()) {
  const gregYear = date.getFullYear();
  // The reference Julian-day formula this is built on (Fliegel & Van
  // Flandern) takes the calendar month as 1-12 — JS's own getMonth() is
  // 0-indexed (January = 0), so this always needs the +1. Passing
  // getMonth() straight through here (as an earlier version of this
  // function did) silently ran every date one calendar month behind,
  // compounding into several months of drift by late in the year.
  const gregMonth = date.getMonth() + 1;
  const gregDay = date.getDate();

  // Every division in the reference formula is an integer (floored)
  // division, including this shared (month - 14) / 12 term — flooring it
  // only where it appeared later in the expression (as an earlier version
  // did) left it as a fraction in this first term instead of the intended
  // -1/0, throwing the whole calculation off by months.
  const monthShift = Math.floor((gregMonth - 14) / 12);
  const jd =
    Math.floor((1461 * (gregYear + 4800 + monthShift)) / 4) +
    Math.floor((367 * (gregMonth - 2 - 12 * monthShift)) / 12) -
    Math.floor((3 * Math.floor((gregYear + 4900 + monthShift) / 100)) / 4) +
    gregDay -
    32075;

  const l = jd - 1948440 + 10632;
  const n = Math.floor((l - 1) / 10631);
  const l2 = l - 10631 * n + 354;
  const j =
    Math.floor((10985 - l2) / 5316) * Math.floor((50 * l2) / 17719) +
    Math.floor(l2 / 5670) * Math.floor((43 * l2) / 15238);
  const l3 =
    l2 -
    Math.floor((30 - j) / 15) * Math.floor((17719 * j) / 50) -
    Math.floor(j / 16) * Math.floor((15238 * j) / 43) +
    29;
  const month = Math.floor((24 * l3) / 709);
  const day = l3 - Math.floor((709 * month) / 24);
  const year = 30 * n + j - 30;

  return { day, month: HIJRI_MONTHS[month - 1] || HIJRI_MONTHS[0], year };
}

function greetingFor(date = new Date()) {
  const hour = date.getHours();
  if (hour < 5) return 'طاب ليلك';
  if (hour < 12) return 'صباح الخير';
  if (hour < 17) return 'طاب يومك';
  if (hour < 20) return 'مساء الخير';
  return 'مساء النور';
}

export { todayISO, addDays, formatGregorian, formatWeekday, toHijri, greetingFor };
