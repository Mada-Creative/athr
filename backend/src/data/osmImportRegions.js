// Country-sized bounding boxes for the initial OSM mosque import — one
// Overpass request per region instead of a single request for the whole
// Arab/Muslim world at once, which would risk the query timing out or
// getting rejected for size on Overpass's free, shared server. Splitting
// also means one region failing (a timeout, a hiccup) doesn't lose the
// rest of the import — see importOsmMosques.js.
//
// Deliberately scoped to the app's actual audience (Arabic-speaking, plus
// its immediate neighbors) rather than the entire planet — easy to extend
// with more countries later as the app's reach grows.
module.exports = [
  { name: 'سوريا', bbox: { south: 32.0, west: 35.5, north: 37.5, east: 42.5 } },
  { name: 'لبنان', bbox: { south: 33.0, west: 34.9, north: 34.7, east: 36.7 } },
  { name: 'الأردن', bbox: { south: 29.0, west: 34.9, north: 33.5, east: 39.5 } },
  { name: 'فلسطين', bbox: { south: 29.4, west: 34.0, north: 33.4, east: 35.7 } },
  { name: 'العراق', bbox: { south: 29.0, west: 38.7, north: 37.4, east: 48.8 } },
  { name: 'السعودية', bbox: { south: 16.0, west: 34.5, north: 32.3, east: 55.7 } },
  { name: 'مصر', bbox: { south: 22.0, west: 24.6, north: 31.8, east: 36.9 } },
  { name: 'الكويت', bbox: { south: 28.5, west: 46.5, north: 30.1, east: 48.6 } },
  { name: 'الإمارات', bbox: { south: 22.5, west: 51.0, north: 26.1, east: 56.5 } },
  { name: 'قطر', bbox: { south: 24.4, west: 50.7, north: 26.2, east: 51.7 } },
  { name: 'البحرين', bbox: { south: 25.5, west: 50.3, north: 26.4, east: 50.8 } },
  { name: 'عُمان', bbox: { south: 16.6, west: 51.8, north: 26.5, east: 59.9 } },
  { name: 'اليمن', bbox: { south: 12.0, west: 41.8, north: 19.0, east: 54.5 } },
  { name: 'تركيا', bbox: { south: 35.8, west: 25.6, north: 42.1, east: 44.9 } },
  { name: 'إيران', bbox: { south: 25.0, west: 44.0, north: 39.8, east: 63.3 } },
  { name: 'المغرب', bbox: { south: 27.6, west: -13.2, north: 35.9, east: -1.0 } },
  { name: 'الجزائر', bbox: { south: 18.9, west: -8.7, north: 37.1, east: 12.0 } },
  { name: 'تونس', bbox: { south: 30.2, west: 7.5, north: 37.5, east: 11.6 } },
  { name: 'ليبيا', bbox: { south: 19.5, west: 9.3, north: 33.2, east: 25.2 } },
  { name: 'السودان', bbox: { south: 8.6, west: 21.8, north: 22.2, east: 38.6 } },
];
