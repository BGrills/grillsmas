/* Grillsmas HQ: the app. */
(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];

  // Tiny DOM builder; everything user-typed goes in as text, never HTML.
  function h(tag, attrs, ...kids) {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v == null || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
      else el.setAttribute(k, v === true ? '' : v);
    }
    for (const kid of kids.flat()) {
      if (kid == null || kid === false) continue;
      el.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
    }
    return el;
  }

  let data = null;
  let me = null;
  try { me = localStorage.getItem('grillsmas_me'); } catch {}

  // ── API ────────────────────────────────────────────────────
  async function api(path, method = 'GET', body) {
    const res = await fetch(`/api/${path}`, {
      method,
      headers: body ? { 'content-type': 'application/json' } : {},
      body: body ? JSON.stringify({ actor: me, ...body }) : undefined,
    });
    if (res.status === 401) { location.href = '/login'; throw new Error('Logged out'); }
    const out = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(out.error || 'The elves dropped something. Try again?');
    return out;
  }

  async function load() {
    data = await api(`state?as=${encodeURIComponent(me || '')}`);
    if (me && !data.people.includes(me)) me = null;
    render();
  }

  async function act(fn, success, fxEvent) {
    try {
      await fn();
      if (success) toast(success);
      FX.ding();
      if (fxEvent) FX.burst(fxEvent.x, fxEvent.y, fxEvent.emojis);
      await load();
      return true;
    } catch (e) {
      toast(e.message, true);
      return false;
    }
  }

  // ── Toast ──────────────────────────────────────────────────
  let toastTimer;
  function toast(msg, error = false) {
    const t = $('#toast');
    t.textContent = msg;
    t.classList.toggle('error', error);
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), error ? 4500 : 2600);
  }

  // ── Dates ──────────────────────────────────────────────────
  const addDays = (d, n) => {
    const t = new Date(`${d}T00:00:00Z`);
    t.setUTCDate(t.getUTCDate() + n);
    return t.toISOString().slice(0, 10);
  };
  const fmt = (d, opts = { weekday: 'short', month: 'short', day: 'numeric' }) =>
    new Date(`${d}T12:00:00Z`).toLocaleDateString('en-CA', { ...opts, timeZone: 'UTC' });
  const todayLocal = () => {
    const n = new Date();
    return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`;
  };
  const SPECIAL = {
    '12-24': '🎄 Christmas Eve',
    '12-25': '🎅 CHRISTMAS!',
    '12-26': '🥧 Boxing Day',
    '12-31': '🥂 New Year’s Eve',
    '01-01': '🎆 New Year’s Day',
  };

  // ── Who are you? ───────────────────────────────────────────
  const ORNAMENT_COLOURS = ['#c8102e', '#0b6b2c', '#1b4fbf', '#b8860b', '#8e24aa', '#d84315', '#00838f'];
  function openWho() {
    const box = $('#ornaments');
    box.replaceChildren(...data.people.map((p, i) =>
      h('button', {
        class: `ornament${p === me ? ' current' : ''}`,
        style: `--c:${ORNAMENT_COLOURS[i % ORNAMENT_COLOURS.length]}`,
        onclick: (e) => {
          me = p;
          try { localStorage.setItem('grillsmas_me', p); } catch {}
          $('#who-dialog').close();
          FX.burst(e.clientX, e.clientY);
          FX.jingle();
          toast(`Welcome, ${p}! ${data.avatars[p] || '🎄'}`);
          load();
        },
      }, h('span', { class: 'av' }, data.avatars[p] || '🎄'), p)));
    $('#who-dialog').showModal();
  }
  const needMe = () => {
    if (me) return true;
    toast('Pick your name first! 🎅', true);
    openWho();
    return false;
  };

  // ── Render ─────────────────────────────────────────────────
  function render() {
    const av = me ? (data.avatars[me] || '🎄') : '❓';
    $('#who-btn').textContent = me ? `${av} ${me} (switch)` : '❓ Pick your name';
    $$('.place').forEach((el) => (el.textContent = data.season.place));
    renderCountdown();
    renderTicker();
    renderCalendar();
    renderGifts();
    renderKitchens();
    if (!me && !$('#who-dialog').open) openWho();
  }

  function renderCountdown() {
    const xmas = data.season.christmas;
    const today = todayLocal();
    const days = Math.round((Date.parse(`${xmas}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86400000);
    $('#countdown').textContent =
      days > 1 ? `🎄 ${days} sleeps until Christmas! 🎄`
        : days === 1 ? '🎄 ONE MORE SLEEP!!! 🎄'
          : days === 0 ? '🎅 MERRY CHRISTMAS!!! 🎅'
            : '☃️ See you next Grillsmas! ☃️';
  }

  function renderTicker() {
    const claimed = data.gifts.filter((g) => g.claimed_by).length;
    const yes = data.requests.filter((r) => r.status === 'yes').length;
    const bits = [
      '🔔 Welcome to Grillsmas HQ',
      `🎁 ${data.gifts.length} wishes made, ${claimed} already spoken for`,
      `🍪 ${yes} food requests approved by the chefs`,
      '🦌 Reminder: the reindeer are not available for airport pickups',
      '🧁 Chantelle’s Bake Shop is now taking requests',
      '🍽️ Chef Brendan is accepting dinner suggestions (and compliments)',
      '🙈 No peeking at your own list',
      '⛷️ Ski days count as busy',
      '🎅 Type “hohoho” for a surprise',
    ];
    $('#ticker').textContent = bits.join('   ✦   ');
  }

  // ── Calendar ───────────────────────────────────────────────
  function renderCalendar() {
    const { people, stays, blocks, season, avatars } = data;
    let start = season.start;
    let end = season.end;
    for (const s of stays) { if (s.arrive < start) start = s.arrive; if (s.depart > end) end = s.depart; }
    for (const b of blocks) { if (b.day < start) start = b.day; if (b.day > end) end = b.day; }
    const days = [];
    for (let d = start; d <= end && days.length < 120; d = addDays(d, 1)) days.push(d);

    const head = h('tr', null,
      h('th', { class: 'date' }, 'Date'),
      h('th', null, h('span', { class: 'av' }, '🏔️'), 'Here'),
      people.map((p) => h('th', { class: p === me ? 'me' : null }, h('span', { class: 'av' }, avatars[p] || '🎄'), p)));

    const slotOrder = { all: 0, day: 1, evening: 2 };
    const slotIcon = { day: '☀️', evening: '🌙', all: '⛔' };
    const slotName = { day: 'Daytime', evening: 'Evening', all: 'All day' };

    const rows = days.map((d) => {
      const md = d.slice(5);
      const dow = new Date(`${d}T12:00:00Z`).getUTCDay();
      const here = people.filter((p) => stays.some((s) => s.person === p && s.arrive <= d && d <= s.depart));
      const allHere = here.length === people.length;
      const cls = [
        dow === 0 || dow === 6 ? 'weekend' : '',
        SPECIAL[md] ? 'special' : '',
        md === '12-25' ? 'xmas' : '',
        allHere ? 'all-here' : '',
      ].join(' ');

      return h('tr', { class: cls },
        h('td', { class: 'date' }, fmt(d), SPECIAL[md] ? h('span', { class: 'tag' }, SPECIAL[md]) : null),
        h('td', { class: 'count' }, `${here.length}/${people.length}`, allHere ? ' 🎉' : ''),
        people.map((p) => {
          const isHere = here.includes(p);
          const travel = stays.filter((s) => s.person === p && (s.arrive === d || s.depart === d));
          const mine = blocks.filter((b) => b.person === p && b.day === d)
            .sort((a, b) => slotOrder[a.slot] - slotOrder[b.slot]);
          return h('td', { class: `person${isHere ? ' here' : ''}` },
            travel.map((s) => h('span', { class: 'travel' },
              s.arrive === d && s.depart === d ? '✈️ In & out' : s.arrive === d ? '✈️ Arrives' : '👋 Leaves',
              s.note && s.arrive === d ? h('small', null, s.note) : null)),
            mine.map((b) => h('button', {
              class: `chip ${b.slot}${p === me ? ' mine' : ''}`,
              title: `${p}: ${slotName[b.slot]}${b.label ? ` — ${b.label}` : ''}${p === me ? ' (tap to remove)' : ''}`,
              onclick: p === me ? () => {
                if (confirm(`Remove "${b.label || slotName[b.slot]}" on ${fmt(d)}?`)) {
                  act(() => api(`blocks/${b.id}`, 'DELETE', {}), 'Unblocked! 🔓');
                }
              } : null,
            }, `${slotIcon[b.slot]} ${b.label || slotName[b.slot]}`)));
        }));
    });

    $('#cal').replaceChildren(h('thead', null, head), h('tbody', null, rows));

    // "My stuff" quick list
    const myStays = stays.filter((s) => s.person === me);
    const myBlocks = blocks.filter((b) => b.person === me);
    const box = $('#my-cal');
    if (!me || (!myStays.length && !myBlocks.length)) { box.replaceChildren(); return; }
    box.replaceChildren(
      h('h4', null, `${avatars[me] || ''} My stuff`),
      h('ul', null,
        myStays.map((s) => h('li', null,
          `🏔️ ${fmt(s.arrive, { month: 'short', day: 'numeric' })} → ${fmt(s.depart, { month: 'short', day: 'numeric' })}${s.note ? ` · ${s.note}` : ''}`,
          h('button', {
            class: 'x', title: 'Remove trip',
            onclick: () => confirm('Remove this trip?') && act(() => api(`stays/${s.id}`, 'DELETE', {}), 'Trip removed ✈️'),
          }, '✖'))),
        myBlocks.map((b) => h('li', null,
          `${slotIcon[b.slot]} ${fmt(b.day)}${b.label ? ` · ${b.label}` : ''}`,
          h('button', {
            class: 'x', title: 'Remove block',
            onclick: () => act(() => api(`blocks/${b.id}`, 'DELETE', {}), 'Unblocked! 🔓'),
          }, '✖')))));
  }

  // ── Wish lists ─────────────────────────────────────────────
  function renderGifts() {
    const { people, gifts, avatars } = data;
    const order = me ? [me, ...people.filter((p) => p !== me)] : people;
    $('#stockings').replaceChildren(...order.map((p) => {
      const list = gifts.filter((g) => g.owner === p);
      const isMine = p === me;
      return h('div', { class: `stocking${isMine ? ' mine' : ''}` },
        h('header', null,
          h('span', { class: 'av' }, avatars[p] || '🎄'),
          h('h3', null, isMine ? `${p} (you!)` : p),
          h('span', { class: 'count' }, `${list.length} ${list.length === 1 ? 'wish' : 'wishes'}`)),
        list.length
          ? h('ul', null, list.map((g) => giftItem(g, isMine)))
          : h('p', { class: 'empty' }, isMine ? 'Your stocking is empty! Add something above. ☝️' : `Nothing yet. Nudge ${p}! 🛎️`));
    }));
  }

  function giftItem(g, isMine) {
    const claimedByMe = g.claimed_by && g.claimed_by === me;
    let actions;
    if (isMine) {
      actions = [
        h('span', { class: 'sealed-tag' }, '🙈 Claims hidden. No peeking!'),
        h('button', {
          class: 'btn tiny plain',
          onclick: () => confirm(`Remove "${g.item}" from your list?`) && act(() => api(`gifts/${g.id}`, 'DELETE', {}), 'Removed from your list'),
        }, '🗑️ Remove'),
      ];
    } else if (g.claimed_by) {
      actions = [
        h('span', { class: 'claimed-tag' }, claimedByMe ? '✅ You’re getting this!' : `✅ Claimed by ${g.claimed_by}`),
        claimedByMe ? h('button', {
          class: 'btn tiny plain',
          onclick: () => act(() => api(`gifts/${g.id}/unclaim`, 'POST', {}), 'Un-claimed. Back on the market!'),
        }, '↩️ Un-claim') : null,
      ];
    } else {
      actions = [h('button', {
        class: 'btn small gold',
        onclick: (e) => {
          if (!needMe()) return;
          act(() => api(`gifts/${g.id}/claim`, 'POST', {}), `Dibs! 🎁 ${g.owner} will never know.`,
            { x: e.clientX, y: e.clientY, emojis: ['🎁', '🎀', '✨', '🎄'] }).then((ok) => ok && FX.jingle());
        },
      }, '🎁 I’ll get this!')];
    }
    return h('li', { class: g.claimed_by && !isMine ? 'claimed' : null },
      h('div', { class: 'item' }, g.item),
      g.notes ? h('div', { class: 'notes' }, g.notes) : null,
      h('div', { class: 'actions' },
        g.link ? h('a', { class: 'link', href: g.link, target: '_blank', rel: 'noopener noreferrer' }, '🔗 Link') : null,
        actions));
  }

  // ── Kitchens ───────────────────────────────────────────────
  const STATUS = { requested: '🤞 Pending', yes: '✅ Yes!', maybe: '🤔 Maybe', no: '🙅 Nope' };

  function renderKitchens() {
    const { kitchens, requests, people, avatars } = data;
    const box = $('#kitchens');
    // Keep whatever someone is mid-typing when the page refreshes.
    const drafts = {};
    $$('form', box).forEach((f) => (drafts[f.dataset.kind] = f.description.value));

    box.replaceChildren(...Object.entries(kitchens).map(([kind, k]) => {
      const list = requests.filter((r) => r.kind === kind);
      const isChef = me === k.chef;
      const form = h('form', {
        'data-kind': kind,
        onsubmit: (e) => {
          e.preventDefault();
          if (!needMe()) return;
          const f = e.target;
          const desc = f.description.value;
          const r = f.querySelector('button').getBoundingClientRect();
          act(() => api('requests', 'POST', { kind, description: desc, requester: f.requester.value }),
            `Sent to ${k.chef}! ${k.emoji}`, { x: r.left + 40, y: r.top, emojis: [k.emoji, '⭐', '😋'] })
            .then((ok) => { if (ok) { const nf = $(`form[data-kind="${kind}"]`); if (nf) nf.description.value = ''; } });
        },
      },
      h('label', null, k.ask, h('input', { name: 'description', maxlength: 200, required: true, placeholder: kind === 'baking' ? 'e.g. Ginger molasses cookies' : 'e.g. Tourtière on Christmas Eve' })),
      h('label', null, 'Requested by',
        h('select', { name: 'requester' }, people.map((p) => h('option', { value: p, selected: p === me }, p)))),
      h('button', { class: `btn ${kind === 'baking' ? 'red' : 'green'}` }, `${k.emoji} Request it`));
      if (drafts[kind]) form.description.value = drafts[kind];

      return h('div', { class: `kitchen ${kind}` },
        h('header', null, h('h3', null, `${k.emoji} ${k.title}`)),
        h('p', { class: 'chef' }, `Head chef: ${avatars[k.chef] || ''} ${k.chef}${isChef ? ' (that’s you! Pick yes, maybe or nope below.)' : ''}`),
        form,
        list.length ? h('ul', null, list.map((r) => h('li', null,
          h('div', { class: 'desc' }, r.description),
          h('div', { class: 'meta' },
            h('span', null, `Requested by ${avatars[r.requester] || ''} ${r.requester}`),
            h('span', { class: `status ${r.status}` }, STATUS[r.status] || r.status),
            isChef ? h('span', { class: 'chef-btns' },
              ['yes', 'maybe', 'no'].map((s) => h('button', {
                class: 'btn tiny plain', title: STATUS[s],
                onclick: (e) => act(() => api(`requests/${r.id}/status`, 'POST', { status: r.status === s ? 'requested' : s }),
                  null, s === 'yes' ? { x: e.clientX, y: e.clientY, emojis: [k.emoji, '✅', '⭐'] } : null),
              }, STATUS[s].split(' ')[0]))) : null,
            me === r.requester || isChef ? h('button', {
              class: 'x', title: 'Delete request',
              onclick: () => confirm('Delete this request?') && act(() => api(`requests/${r.id}`, 'DELETE', {}), 'Request removed'),
            }, '✖') : null))))
          : h('p', { class: 'empty' }, 'No requests yet. Be the first! 🙋'));
    }));
  }

  // ── Static forms ───────────────────────────────────────────
  $('#stay-form').addEventListener('submit', (e) => {
    e.preventDefault();
    if (!needMe()) return;
    const f = e.target;
    const r = f.querySelector('button').getBoundingClientRect();
    act(() => api('stays', 'POST', { arrive: f.arrive.value, depart: f.depart.value, note: f.note.value }),
      `See you in ${data.season.place}! 🏔️`, { x: r.left + 60, y: r.top, emojis: ['✈️', '🏔️', '⛷️', '❄️'] })
      .then((ok) => ok && f.reset());
  });
  $('#stay-form').arrive.addEventListener('change', (e) => {
    const dep = $('#stay-form').depart;
    dep.min = e.target.value;
    if (!dep.value || dep.value < e.target.value) dep.value = e.target.value;
  });

  $('#block-form').addEventListener('submit', (e) => {
    e.preventDefault();
    if (!needMe()) return;
    const f = e.target;
    act(() => api('blocks', 'POST', { from: f.from.value, to: f.to.value || f.from.value, slot: f.slot.value, label: f.label.value }),
      'Blocked off! 🔒').then((ok) => ok && f.reset());
  });
  $('#block-form').from.addEventListener('change', (e) => { $('#block-form').to.min = e.target.value; });

  $('#gift-form').addEventListener('submit', (e) => {
    e.preventDefault();
    if (!needMe()) return;
    const f = e.target;
    const r = f.querySelector('button').getBoundingClientRect();
    act(() => api('gifts', 'POST', { item: f.item.value, link: f.link.value, notes: f.notes.value }),
      'Added to your list! Santa has been notified. 🎅', { x: r.left + 40, y: r.top, emojis: ['🎁', '🎀', '⭐'] })
      .then((ok) => ok && f.reset());
  });

  // ── Tabs ───────────────────────────────────────────────────
  function showTab(name) {
    $$('.tab').forEach((t) => t.classList.toggle('active', t.dataset.tab === name));
    $$('.panel').forEach((p) => p.classList.toggle('active', p.id === `tab-${name}`));
    try { localStorage.setItem('grillsmas_tab', name); } catch {}
  }
  $$('.tab').forEach((t) => t.addEventListener('click', () => { showTab(t.dataset.tab); FX.ding(); }));
  try { const saved = localStorage.getItem('grillsmas_tab'); if (saved) showTab(saved); } catch {}

  // ── Header buttons ─────────────────────────────────────────
  $('#who-btn').addEventListener('click', () => data && openWho());
  const soundBtn = $('#sound-btn');
  const paintSound = () => (soundBtn.textContent = FX.soundOn ? '🔔 Jingle mode: ON' : '🔕 Jingle mode: off');
  soundBtn.addEventListener('click', () => {
    FX.setSound(!FX.soundOn);
    paintSound();
    if (FX.soundOn) { FX.jingle(); toast('🔔 Jingle mode activated. Sorry in advance.'); }
  });
  paintSound();
  $('#logout-btn').addEventListener('click', async () => {
    await fetch('/api/logout', { method: 'POST' }).catch(() => {});
    location.href = '/login';
  });

  // ── Go! Refresh every 30s and whenever the tab regains focus. ─
  load().catch((e) => toast(e.message, true));
  const busy = () => document.hidden || $('#who-dialog').open || document.activeElement?.closest?.('#kitchens');
  setInterval(() => { if (!busy()) load().catch(() => {}); }, 30000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) load().catch(() => {}); });
})();
