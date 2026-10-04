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
  webClientId: '342643187157-j6rtirsqn0mgq5o23t8upt5hspepql47.apps.googleusercontent.com',
  // "iOS" client — used for standalone/EAS iOS builds.
  iosClientId: '342643187157-tub4jcr53n16qt6hsoraf12tv4nqquga.apps.googleusercontent.com',
  // "Android" client — not created yet; fill in once you add one (see
  // mobile/README.md → "Social sign-in setup"), needed before Google
  // sign-in works on an Android build.
  androidClientId: 'YOUR_ANDROID_CLIENT_ID.apps.googleusercontent.com',
};

export { GOOGLE_OAUTH };
