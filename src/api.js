import { PEOPLE, AVATARS, SEASON, KITCHENS } from '../lib/config.js';
import { getDb } from '../lib/db.js';
import { sessionToken, sessionCookie, safeEqual } from '../lib/auth.js';

// ── helpers ───────────────────────────────────────────────────
class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
const json = (data, status = 200, headers = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store', ...headers },
  });
const bad = (msg) => { throw new HttpError(400, msg); };
const nope = (msg) => { throw new HttpError(403, msg); };

const person = (v, field = 'person') => {
  if (!PEOPLE.includes(v)) bad(`Who is "${v ?? '?'}"? Pick a name from the list for ${field}.`);
  return v;
};
const text = (v, max, field, required = false) => {
  v = (v ?? '').toString().trim();
  if (required && !v) bad(`${field} is required.`);
  if (v.length > max) bad(`${field} is too long (max ${max} characters).`);
  return v || null;
};
const date = (v, field) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v || '') || Number.isNaN(Date.parse(`${v}T00:00:00Z`))) bad(`${field} needs a date.`);
  return v;
};
const link = (v) => {
  v = text(v, 500, 'Link');
  if (!v) return null;
  if (!/^https?:\/\//i.test(v)) v = `https://${v}`;
  try {
    const u = new URL(v);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') bad('Links must start with http or https.');
    return u.toString();
  } catch { bad('That link looks broken.'); }
};
const addDays = (d, n) => {
  const t = new Date(`${d}T00:00:00Z`);
  t.setUTCDate(t.getUTCDate() + n);
  return t.toISOString().slice(0, 10);
};
const id = (v) => {
  const n = Number(v);
  if (!Number.isInteger(n) || n <= 0) bad('Bad id.');
  return n;
};

async function one(db, table, rowId) {
  const row = await db.prepare(`SELECT * FROM ${table} WHERE id = ?`).bind(rowId).first();
  if (!row) throw new HttpError(404, 'That one has already vanished up the chimney.');
  return row;
}

// ── routes ────────────────────────────────────────────────────
async function login(request, env) {
  const { password } = await request.json().catch(() => ({}));
  const expected = await sessionToken(env.FAMILY_PASSWORD);
  const given = await sessionToken(password);
  if (!safeEqual(given, expected)) {
    await new Promise((r) => setTimeout(r, 600)); // slow down guessers
    return json({ error: "The elves don't recognise that password." }, 401);
  }
  return json({ ok: true }, 200, { 'set-cookie': sessionCookie(expected, 60 * 60 * 24 * 120) });
}

async function state(db, url) {
  const as = url.searchParams.get('as');
  const [stays, blocks, gifts, requests] = await Promise.all([
    db.prepare('SELECT * FROM stays ORDER BY arrive, person').all(),
    db.prepare('SELECT * FROM blocks ORDER BY day, person').all(),
    db.prepare('SELECT * FROM gifts ORDER BY created_at, id').all(),
    db.prepare('SELECT * FROM requests ORDER BY created_at, id').all(),
  ]);
  return json({
    people: PEOPLE,
    avatars: AVATARS,
    season: SEASON,
    kitchens: KITCHENS,
    stays: stays.results,
    blocks: blocks.results,
    // No peeking: you never see who claimed things on your own list.
    gifts: gifts.results.map((g) =>
      g.owner === as ? { ...g, claimed_by: null, claimed_at: null, sealed: true } : g),
    requests: requests.results,
  });
}

async function route(request, env, parts) {
  const method = request.method;
  const [resource, rawId, action] = parts;

  if (resource === 'login' && method === 'POST') return login(request, env);
  if (resource === 'logout' && method === 'POST') {
    return json({ ok: true }, 200, { 'set-cookie': sessionCookie('', 0) });
  }

  const db = await getDb(env);
  const url = new URL(request.url);
  if (resource === 'state' && method === 'GET') return state(db, url);

  const body = method === 'GET' ? {} : await request.json().catch(() => ({}));
  const actor = person(body.actor, 'who you are');

  // Whistler trips
  if (resource === 'stays' && !rawId && method === 'POST') {
    const arrive = date(body.arrive, 'Arrival');
    const depart = date(body.depart, 'Departure');
    if (depart < arrive) bad('You can’t leave before you arrive (unless you’re Santa).');
    await db.prepare('INSERT INTO stays (person, arrive, depart, note) VALUES (?, ?, ?, ?)')
      .bind(actor, arrive, depart, text(body.note, 120, 'Note')).run();
    return json({ ok: true });
  }
  if (resource === 'stays' && rawId && method === 'DELETE') {
    const row = await one(db, 'stays', id(rawId));
    if (row.person !== actor) nope(`Only ${row.person} can remove their own trip.`);
    await db.prepare('DELETE FROM stays WHERE id = ?').bind(row.id).run();
    return json({ ok: true });
  }

  // Busy blocks (one row per day)
  if (resource === 'blocks' && !rawId && method === 'POST') {
    const from = date(body.from, 'Start date');
    const to = body.to ? date(body.to, 'End date') : from;
    if (to < from) bad('The end date is before the start date.');
    const slot = ['day', 'evening', 'all'].includes(body.slot) ? body.slot : bad('Pick daytime, evening or all day.');
    const label = text(body.label, 60, 'Name');
    const stmts = [];
    for (let d = from; d <= to; d = addDays(d, 1)) {
      stmts.push(db.prepare('INSERT INTO blocks (person, day, slot, label) VALUES (?, ?, ?, ?)').bind(actor, d, slot, label));
      if (stmts.length > 45) bad('That’s a very long block. Keep it under 45 days.');
    }
    await db.batch(stmts);
    return json({ ok: true, added: stmts.length });
  }
  if (resource === 'blocks' && rawId && method === 'DELETE') {
    const row = await one(db, 'blocks', id(rawId));
    if (row.person !== actor) nope(`Only ${row.person} can remove their own block.`);
    await db.prepare('DELETE FROM blocks WHERE id = ?').bind(row.id).run();
    return json({ ok: true });
  }

  // Wish lists
  if (resource === 'gifts' && !rawId && method === 'POST') {
    await db.prepare('INSERT INTO gifts (owner, item, link, notes) VALUES (?, ?, ?, ?)')
      .bind(actor, text(body.item, 140, 'Gift', true), link(body.link), text(body.notes, 300, 'Notes')).run();
    return json({ ok: true });
  }
  if (resource === 'gifts' && rawId && method === 'DELETE') {
    const row = await one(db, 'gifts', id(rawId));
    if (row.owner !== actor) nope(`Only ${row.owner} can remove things from their list.`);
    await db.prepare('DELETE FROM gifts WHERE id = ?').bind(row.id).run();
    return json({ ok: true });
  }
  if (resource === 'gifts' && rawId && action === 'claim' && method === 'POST') {
    const row = await one(db, 'gifts', id(rawId));
    if (row.owner === actor) nope('Nice try. You can’t claim your own gift.');
    if (row.claimed_by && row.claimed_by !== actor) throw new HttpError(409, `${row.claimed_by} already called dibs on that one.`);
    await db.prepare("UPDATE gifts SET claimed_by = ?, claimed_at = datetime('now') WHERE id = ?").bind(actor, row.id).run();
    return json({ ok: true });
  }
  if (resource === 'gifts' && rawId && action === 'unclaim' && method === 'POST') {
    const row = await one(db, 'gifts', id(rawId));
    if (row.claimed_by !== actor) nope('Only the person who claimed it can un-claim it.');
    await db.prepare('UPDATE gifts SET claimed_by = NULL, claimed_at = NULL WHERE id = ?').bind(row.id).run();
    return json({ ok: true });
  }

  // Baking & dinner requests
  if (resource === 'requests' && !rawId && method === 'POST') {
    const kind = KITCHENS[body.kind] ? body.kind : bad('Baking or dinner?');
    await db.prepare('INSERT INTO requests (kind, description, requester) VALUES (?, ?, ?)')
      .bind(kind, text(body.description, 200, 'Request', true), person(body.requester || actor, 'requester')).run();
    return json({ ok: true });
  }
  if (resource === 'requests' && rawId && action === 'status' && method === 'POST') {
    const row = await one(db, 'requests', id(rawId));
    const chef = KITCHENS[row.kind].chef;
    if (actor !== chef) nope(`Only ${chef} gets to decide that.`);
    const status = ['requested', 'yes', 'maybe', 'no'].includes(body.status) ? body.status : bad('Unknown status.');
    await db.prepare('UPDATE requests SET status = ? WHERE id = ?').bind(status, row.id).run();
    return json({ ok: true });
  }
  if (resource === 'requests' && rawId && method === 'DELETE') {
    const row = await one(db, 'requests', id(rawId));
    const chef = KITCHENS[row.kind].chef;
    if (actor !== row.requester && actor !== chef) nope(`Only ${row.requester} or ${chef} can remove that request.`);
    await db.prepare('DELETE FROM requests WHERE id = ?').bind(row.id).run();
    return json({ ok: true });
  }

  throw new HttpError(404, 'The elves couldn’t find that.');
}

// Handles everything under /api/…
export async function handleApi(request, env) {
  const parts = new URL(request.url).pathname.split('/').filter(Boolean).slice(1); // drop "api"
  try {
    return await route(request, env, parts);
  } catch (err) {
    if (err instanceof HttpError) return json({ error: err.message }, err.status);
    console.error(err);
    return json({ error: err.message || 'Something went wrong in the workshop.' }, 500);
  }
}
