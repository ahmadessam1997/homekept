// HomeKept design tokens — "hearth" palette: deep pine, warm plaster, ember accent.
export const C = {
  pine: '#22331F',      // primary dark green — headers, buttons
  pineSoft: '#3A4F35',
  plaster: '#F7F3EC',   // app background
  card: '#FFFFFF',
  ink: '#1E2419',       // primary text
  inkSoft: '#6B7263',   // secondary text
  line: '#E4DED2',
  ember: '#D97B29',     // accent: overdue, highlights
  emberSoft: '#FBEBDB',
  sage: '#8FA98A',
  ok: '#4C7A45',
  okSoft: '#E6EFE2',
};

export const S = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 };

export const type = {
  h1: { fontSize: 26, fontWeight: '700', color: C.ink, letterSpacing: -0.5 },
  h2: { fontSize: 18, fontWeight: '600', color: C.ink },
  body: { fontSize: 14, color: C.ink, lineHeight: 20 },
  sub: { fontSize: 13, color: C.inkSoft, lineHeight: 18 },
  label: { fontSize: 11, fontWeight: '600', color: C.inkSoft, textTransform: 'uppercase', letterSpacing: 1 },
};
