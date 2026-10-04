import { AppState } from 'react-native';

// A plain mutable flag mirroring AppState, read synchronously from inside
// Notifications.setNotificationHandler's callback in App.js. That handler
// is registered once at module load time (before any component mounts),
// so it can't read component state directly — this is the simplest way to
// let it know "is the user actually looking at the app right now" without
// wiring a context through code that isn't part of the component tree.
const foregroundState = { active: AppState.currentState === 'active' };

AppState.addEventListener('change', (next) => {
  foregroundState.active = next === 'active';
});

export default foregroundState;
