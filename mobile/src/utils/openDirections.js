import { ActionSheetIOS, Linking, Platform } from 'react-native';

// On Android, firing a bare `google.navigation:` intent (no package
// specified) already makes Android itself show its native "Open with…"
// chooser whenever more than one app can handle it (Waze, Google Maps,
// etc.) — the OS solves "let the user pick" for free there. iOS has no such
// system chooser for `maps://`, it just opens Apple Maps directly, so iOS
// needs its own picker (ActionSheetIOS) built here instead.
const WEB_FALLBACK = (latitude, longitude) => `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;

async function canOpen(url) {
  try {
    return await Linking.canOpenURL(url);
  } catch (err) {
    return false;
  }
}

export default async function openDirections(latitude, longitude, label) {
  const encodedLabel = encodeURIComponent(label || '');

  if (Platform.OS === 'android') {
    const nativeUrl = `google.navigation:q=${latitude},${longitude}`;
    try {
      await Linking.openURL(nativeUrl);
    } catch (err) {
      await Linking.openURL(WEB_FALLBACK(latitude, longitude)).catch(() => {});
    }
    return;
  }

  // iOS: build the list of apps actually worth offering. `canOpenURL` only
  // reports true/false for schemes declared under LSApplicationQueriesSchemes
  // in app.json (comgooglemaps, waze) — undeclared schemes always read as
  // "not installed" regardless of reality.
  const options = [{ label: 'خرائط آبل', url: `maps://?daddr=${latitude},${longitude}&q=${encodedLabel}` }];
  if (await canOpen('comgooglemaps://')) {
    options.push({ label: 'خرائط جوجل', url: `comgooglemaps://?daddr=${latitude},${longitude}&directionsmode=driving` });
  }
  if (await canOpen('waze://')) {
    options.push({ label: 'Waze', url: `waze://?ll=${latitude},${longitude}&navigate=yes` });
  }

  ActionSheetIOS.showActionSheetWithOptions(
    { options: [...options.map((o) => o.label), 'إلغاء'], cancelButtonIndex: options.length },
    (index) => {
      if (index < options.length) {
        Linking.openURL(options[index].url).catch(() => Linking.openURL(WEB_FALLBACK(latitude, longitude)).catch(() => {}));
      }
    }
  );
}
