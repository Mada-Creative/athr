// Maps a device's detected ISO country code to the calculation convention
// actually used there, so prayer times are correct without asking anyone
// to understand what "Umm al-Qura" vs "Muslim World League" even means —
// this isn't a setting a person should have to get right themselves.
const ISO_COUNTRY_METHOD = {
  SA: 'UmmAlQura',
  EG: 'Egyptian', SD: 'Egyptian', LY: 'Egyptian', SY: 'Egyptian',
  PK: 'Karachi', IN: 'Karachi', BD: 'Karachi', AF: 'Karachi', LK: 'Karachi',
  US: 'NorthAmerica', CA: 'NorthAmerica',
};

const METHOD_LABELS = {
  UmmAlQura: 'أم القرى',
  MuslimWorldLeague: 'رابطة العالم الإسلامي',
  Egyptian: 'الهيئة المصرية',
  Karachi: 'كراتشي',
  NorthAmerica: 'أمريكا الشمالية',
};

function methodForCountry(isoCountryCode) {
  return ISO_COUNTRY_METHOD[isoCountryCode] || 'MuslimWorldLeague';
}

export { methodForCountry, METHOD_LABELS };
