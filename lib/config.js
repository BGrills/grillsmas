// ─────────────────────────────────────────────────────────────
//  Grillsmas HQ — the only file you should need to edit.
//  Change the family list, emojis, dates or kitchen owners here,
//  commit, and Cloudflare redeploys automatically.
// ─────────────────────────────────────────────────────────────

export const PEOPLE = ['Brendan', 'Emily', 'Kasia', 'Ryan', 'John', 'Lorraine', 'Chantelle'];

export const AVATARS = {
  Brendan: '🧑‍🍳',
  Emily: '⛄',
  Kasia: '🦌',
  Ryan: '🐧',
  John: '🎄',
  Lorraine: '⭐',
  Chantelle: '🧁',
};

// The calendar always shows at least this range; it stretches
// automatically if someone adds a trip outside it.
export const SEASON = {
  start: '2026-12-18',
  end: '2027-01-03',
  christmas: '2026-12-25',
  place: 'Whistler',
};

export const KITCHENS = {
  baking: { chef: 'Chantelle', title: "Chantelle's Bake Shop", emoji: '🧁', ask: 'What should Chantelle bake?' },
  dinner: { chef: 'Brendan', title: "Chef Brendan's Dinner Menu", emoji: '🍽️', ask: 'What should Brendan cook?' },
};
