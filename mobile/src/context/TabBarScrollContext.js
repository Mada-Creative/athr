import { createContext, useContext } from 'react';

// Lets any tab screen hand its own scroll position up to FloatingTabBar
// without prop-drilling through the navigator — each screen calls
// registerScroll(route.key) to get an onScroll handler for its own
// ScrollView/FlatList, keyed by that screen's own route so switching tabs
// never mixes up one tab's scroll position with another's. The default
// (outside a provider) is a harmless no-op, for any screen that happens to
// render Screen outside the tab navigator.
const TabBarScrollContext = createContext(() => () => {});

export function useTabBarScroll() {
  return useContext(TabBarScrollContext);
}

export default TabBarScrollContext;
