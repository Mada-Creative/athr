import { createNavigationContainerRef } from '@react-navigation/native';

// A module-level ref (not context) so anything can navigate without being
// inside the navigation tree — specifically the notification tap handler
// in useAthrCardNotifications, which fires from a global listener that has
// no component of its own to read a navigation prop from.
const navigationRef = createNavigationContainerRef();

export default navigationRef;
