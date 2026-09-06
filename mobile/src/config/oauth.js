// Fill these in from the Google Cloud Console (APIs & Services →
// Credentials → Create Credentials → OAuth client ID) before Google
// sign-in will work. See mobile/README.md → "Social sign-in setup" for the
// exact steps and which client type each field wants.
//
// Apple needs no client ID here — expo-apple-authentication talks to
// Apple's native SDK directly using the app's bundle identifier
// (app.athr.mobile, already set in app.json). The backend verifies the
// resulting token against APPLE_CLIENT_ID in its own .env instead.
const GOOGLE_OAUTH = {
  // "Web application" client — required even for native sign-in, since
  // expo-auth-session's proxy flow (used in Expo Go) authenticates as a web client.
  webClientId: 'YOUR_WEB_CLIENT_ID.apps.googleusercontent.com',
  // "iOS" client — used for standalone/EAS iOS builds.
  iosClientId: 'YOUR_IOS_CLIENT_ID.apps.googleusercontent.com',
  // "Android" client — used for standalone/EAS Android builds.
  androidClientId: 'YOUR_ANDROID_CLIENT_ID.apps.googleusercontent.com',
};

export { GOOGLE_OAUTH };
