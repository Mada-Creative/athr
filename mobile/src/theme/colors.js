// Static re-export of the light palette, for the rare module-scope constant
// (e.g. constants/athkarMeta.js) that only ever uses theme-invariant colors
// (amber/sage/clay/gold) and can't call a hook. Any component that needs
// colors to actually follow the theme must use `useTheme()` from
// context/ThemeContext instead — importing this directly won't react to
// dark mode.
import { light } from './palettes';

export default light;
