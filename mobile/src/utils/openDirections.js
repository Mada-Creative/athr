import { Linking, Platform } from 'react-native';

// Opens the OS's own native maps app already pointed at these coordinates
// (Apple Maps on iOS, a Google Maps navigation intent on Android) — no
// in-app chooser between Waze/Google Maps/Apple Maps, since the user only
// ever wants "take me there" and the OS already knows which navigation app
// they actually use. Falls back to Google Maps' web URL (works on both
// platforms, in-app or in a browser) if the native scheme can't be opened.
export default async function openDirections(latitude, longitude, label) {
  const encodedLabel = encodeURIComponent(label || '');
  const nativeUrl = Platform.select({
    ios: `maps://?daddr=${latitude},${longitude}&q=${encodedLabel}`,
    android: `google.navigation:q=${latitude},${longitude}`,
  });
  const webFallback = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;

  try {
    const supported = nativeUrl ? await Linking.canOpenURL(nativeUrl) : false;
    await Linking.openURL(supported ? nativeUrl : webFallback);
  } catch (err) {
    await Linking.openURL(webFallback).catch(() => {});
  }
}
