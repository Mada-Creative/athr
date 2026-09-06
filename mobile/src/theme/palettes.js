// "أثر" design language — a warm, hand-inked manuscript feel, in both a
// parchment-and-ink light mode and a proper dark mode built from the same
// identity rather than an inverted afterthought.
//
// `ink` is a *role*, not a fixed color: it's "primary text/icon", so it
// flips from dark-brown-on-cream to cream-on-near-black. `accentDark` is
// the opposite — a genuinely fixed dark ink-brown surface (hero cards,
// solid buttons, the active tab) that stays dark in both themes, the way
// a filled button stays dark regardless of the page around it.
const shared = {
  accentDark: '#3A2A1E',
  amber: '#C4863B',
  sage: '#5F8467',
  clay: '#B5573D',
  gold: '#D7A94A',
  white: '#FFFFFF',
};

const light = {
  ...shared,
  background: '#FAF5EC',
  backgroundAlt: '#F2E9D8',
  surface: '#FFFFFF',
  surfaceMuted: '#FBF3E4',

  ink: '#3A2A1E',
  inkSoft: '#6B5B4C',
  inkFaint: '#A89885',

  amberSoft: '#EFD9B3',
  amberDeep: '#9C6423',
  sageSoft: '#DDEAE0',
  claySoft: '#F4DCD3',

  border: '#E9DCC3',
  shadow: '#00000022',
  overlay: 'rgba(58, 42, 30, 0.55)',
};

const dark = {
  ...shared,
  background: '#17110C',
  backgroundAlt: '#1E1710',
  surface: '#241B13',
  surfaceMuted: '#2B2015',

  ink: '#F2E6D3',
  inkSoft: '#BBA98E',
  inkFaint: '#7C6C57',

  amberSoft: '#3D2E17',
  // Brighter than light mode's amberDeep on purpose — the original
  // #9C6423 is dark enough that it loses contrast against a dark surface.
  amberDeep: '#E0A868',
  sageSoft: '#1E2E24',
  claySoft: '#3A241E',

  border: '#3A2C1F',
  shadow: '#00000055',
  overlay: 'rgba(0, 0, 0, 0.6)',
};

export { light, dark };
