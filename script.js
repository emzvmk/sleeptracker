/* ===== Sleep Tracker ===== */
const KEY = 'sleepTrackerV1';
const TOLERANCE = 30; // minutes: "on time" window for bedtime / wake-up

const MORNING = [
  "Today is a fresh start, and I am ready for it.",
  "I do the important thing first.",
  "I am disciplined, focused and in control of my day.",
  "I show up with energy and purpose.",
  "Small actions today build the future I want.",
  "I am capable of handling whatever comes my way.",
  "I choose progress over perfection.",
  "My habits make me stronger every day.",
  "I start my day with confidence and clear intention.",
  "I keep the promises I make to myself.",
  "Discipline is my form of self-respect.",
  "I have the focus to finish what I start.",
  "I rise with gratitude and walk with purpose.",
  "Every task I complete moves me forward.",
  "I trust myself to make good decisions today.",
  "I turn effort into momentum.",
  "I am becoming better than I was yesterday.",
  "I bring calm energy to everything I do.",
  "Consistency beats motivation, and I am consistent.",
  "I welcome challenges as chances to grow.",
  "I am confident, prepared and ready today.",
  "I protect my time and spend it on what matters.",
  "This morning I choose action over hesitation.",
  "I deserve the success I am working toward."
];
const NIGHT = [
  "I did enough today, and I am proud of my effort.",
  "I release the day and let my mind be still.",
  "I am grateful for the good things, big and small.",
  "Tomorrow can wait. Tonight I rest.",
  "I forgive myself for what I could not finish.",
  "What I learned today helps me grow tomorrow.",
  "My body is safe and my mind is calm.",
  "I let go of what I cannot control.",
  "I am thankful for the people who make my life brighter.",
  "Rest is how I grow stronger.",
  "I breathe slowly and let peace settle in.",
  "I look back on today with kindness.",
  "I am at peace with who I am becoming.",
  "Every day I grow, even when it is quiet.",
  "I welcome deep and restorative sleep.",
  "I am grateful for this day and its lessons.",
  "My worries are lighter than they feel.",
  "I did my best, and my best is enough.",
  "I close this day with a thankful heart.",
  "Growth happens while I rest.",
  "I choose calm over worry tonight.",
  "I am proud of one thing I did today.",
  "I trust that tomorrow will bring new chances.",
  "I surrender the day and drift into peaceful rest."
];

/* ---------- State ---------- */
const DEF_SETTINGS = { goal: 7, bed: '00:00', wake: '07:00' };
let state = load();
function load() {
  const def = { sessions: [], active: null, journal: [], myAff: [], draft: '', settings: { ...DEF_SETTINGS } };
  try {
    const s = JSON.parse(localStorage.getItem(KEY));
    if (s && Array.isArray(s.sessions)) {
      const old = !s.settings || !s.settings.bed; // data from the first version: apply new defaults
      return { ...def, ...s, settings: old ? { ...DEF_SETTINGS } : { ...DEF_SETTINGS, ...s.settings } };
    }
  } catch (e) {}
  return def;
}
function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { toast('Could not save data'); } }

/* ---------- Helpers ---------- */
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const pad = n => String(n).padStart(2, '0');
const HOUR = 3600000;
const goalMs = () => state.settings.goal * HOUR;
const dkey = t => { const d = new Date(t); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
const keyToDate = k => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); };
const fmtDur = ms => { const m = Math.round(ms / 60000); return `${Math.floor(m / 60)}h ${pad(m % 60)}m`; };
const fmtHMS = ms => { const s = Math.floor(ms / 1000); return `${pad(Math.floor(s / 3600))}:${pad(Math.floor(s / 60) % 60)}:${pad(s % 60)}`; };
const fmtTime = t => new Date(t).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
const fmtDay = k => keyToDate(k).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
const toInput = t => { const d = new Date(t); return `${dkey(t)}T${pad(d.getHours())}:${pad(d.getMinutes())}`; };
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;
function lastDays(n) {
  const out = [];
  for (let i = n - 1; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate() - i); out.push(dkey(d)); }
  return out;
}
let toastTimer;
function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 2200);
}

/* ---------- Sleep totals ---------- */
/* A session belongs to the day you WOKE UP, so sessions crossing midnight count once. */
function totals() {
  const m = {};
  state.sessions.forEach(s => {
    const k = dkey(s.end);
    if (!m[k]) m[k] = { night: 0, nap: 0 };
    m[k][s.type] += s.end - s.start;
  });
  return m;
}
const dayTotal = t => (t ? t.night + t.nap : 0);
function avgOver(n, T) {
  const v = lastDays(n).map(k => dayTotal(T[k])).filter(x => x > 0);
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
}

/* ---------- Schedule: actual vs target ---------- */
const parseHM = s => { const [h, m] = s.split(':').map(Number); return h * 60 + m; };
const bedNorm = m => (m < 720 ? m + 1440 : m); // so 11 PM (1380) < 12:30 AM (1470)
const targets = () => ({ bed: bedNorm(parseHM(state.settings.bed)), wake: parseHM(state.settings.wake) });
function clock(m) {
  m = ((Math.round(m) % 1440) + 1440) % 1440;
  const h = Math.floor(m / 60);
  return `${h % 12 || 12}:${pad(m % 60)} ${h < 12 ? 'AM' : 'PM'}`;
}
function devText(min) { // negative = earlier than target
  const r = Math.round(min);
  if (r === 0) return '<span>on time</span>';
  const a = Math.abs(r), t = a >= 60 ? `${Math.floor(a / 60)}h ${a % 60}m` : `${a} min`;
  return r < 0 ? `<span class="early">${t} early</span>` : `<span class="late">${t} late</span>`;
}
/* Main night sleep per wake-up day (the longest night session) with deviation from targets */
function timings() {
  const best = {};
  state.sessions.filter(s => s.type === 'night').forEach(s => {
    const k = dkey(s.end);
    if (!best[k] || s.end - s.start > best[k].end - best[k].start) best[k] = s;
  });
  const t = targets(), out = {};
  Object.keys(best).forEach(k => {
    const a = new Date(best[k].start), b = new Date(best[k].end);
    const bed = bedNorm(a.getHours() * 60 + a.getMinutes()), wake = b.getHours() * 60 + b.getMinutes();
    out[k] = { bed, wake, bedDev: bed - t.bed, wakeDev: wake - t.wake, start: best[k].start, end: best[k].end };
  });
  return out;
}
/* Score 0-100: 100 = exactly on target, 0 = 2 hours average miss */
function consistency(TM, keys) {
  const list = keys.map(k => TM[k]).filter(Boolean);
  if (!list.length) return null;
  const miss = list.reduce((a, x) => a + (Math.abs(x.bedDev) + Math.abs(x.wakeDev)) / 2, 0) / list.length;
  return {
    score: Math.max(0, Math.round(100 - miss / 1.2)), n: list.length,
    avgBed: list.reduce((a, x) => a + x.bedDev, 0) / list.length,
    avgWake: list.reduce((a, x) => a + x.wakeDev, 0) / list.length
  };
}
/* Consecutive days (ending today, or yesterday if today isn't done yet) satisfying ok(day) */
function streak(ok) {
  const ks = lastDays(120).reverse();
  let i = ok(ks[0]) ? 0 : 1, n = 0;
  for (; i < ks.length && ok(ks[i]); i++) n++;
  return n;
}

/* ---------- Tracking ---------- */
function startTrack(type) {
  if (state.active) return;
  state.active = { type, start: Date.now() };
  save(); render();
  toast(type === 'night' ? 'Sleep tracking started' : 'Nap started');
}
function wakeUp() {
  const a = state.active; if (!a) return;
  const end = Date.now();
  state.active = null;
  if (end - a.start < 60000) toast('Under 1 minute, so it was not saved');
  else {
    state.sessions.push({ id: uid(), type: a.type, start: a.start, end });
    toast(`Saved ${fmtDur(end - a.start)} of ${a.type === 'night' ? 'sleep' : 'nap'}`);
  }
  save(); render();
}
function tick() { $('#timer').textContent = state.active ? fmtHMS(Date.now() - state.active.start) : '00:00:00'; }
setInterval(tick, 1000);

/* ---------- Affirmations ---------- */
const period = () => { const h = new Date().getHours(); return h >= 4 && h < 17 ? 'morning' : 'night'; };
function affPool() {
  const p = period();
  return [...(p === 'morning' ? MORNING : NIGHT).map(t => ({ t, src: p })), ...state.myAff.map(a => ({ t: a.text, src: 'mine' }))];
}
let curAff = null;
function pickAff(random) {
  const pool = affPool(), now = new Date(), p = period();
  if (random) {
    let c; do { c = pool[Math.floor(Math.random() * pool.length)]; } while (pool.length > 1 && curAff && c.t === curAff.t);
    return c;
  }
  const day = Math.floor(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) / 86400000);
  return pool[(day * 2 + (p === 'morning' ? 0 : 1)) % pool.length];
}
function renderAff() {
  const pool = affPool();
  if (!curAff || !pool.some(x => x.t === curAff.t)) curAff = pickAff(false);
  $('#affText').textContent = curAff.t;
  $('#affTag').textContent = curAff.src === 'mine' ? 'My affirmation' : curAff.src === 'morning' ? 'Morning affirmation' : 'Night affirmation';
}
$('#btnAnother').onclick = () => { curAff = pickAff(true); renderAff(); };

function renderAffList() {
  $('#affList').innerHTML = state.myAff.length
    ? state.myAff.map(a => `<div class="item"><div class="info">${esc(a.text)}</div><div class="acts"><button class="small-btn" data-aedit="${a.id}">Edit</button><button class="small-btn del" data-adel="${a.id}">Delete</button></div></div>`).join('')
    : '<p class="muted" style="margin-top:10px">No custom affirmations yet. They appear in your home rotation once added.</p>';
}
$('#btnAffAdd').onclick = () => {
  const t = $('#affInput').value.trim();
  if (!t) return toast('Write an affirmation first');
  state.myAff.push({ id: uid(), text: t });
  $('#affInput').value = ''; save(); render(); toast('Affirmation saved');
};
$('#affList').addEventListener('click', e => {
  const ed = e.target.closest('[data-aedit]'), del = e.target.closest('[data-adel]');
  if (ed) {
    const a = state.myAff.find(x => x.id === ed.dataset.aedit);
    openText('Edit affirmation', a.text, v => { a.text = v; curAff = null; save(); render(); toast('Affirmation updated'); });
  }
  if (del && confirm('Delete this affirmation?')) {
    state.myAff = state.myAff.filter(x => x.id !== del.dataset.adel); curAff = null; save(); render(); toast('Affirmation deleted');
  }
});

/* ---------- Text modal (journal edit, affirmation edit) ---------- */
let textCb = null;
function openText(title, val, cb) { $('#tTitle').textContent = title; $('#tArea').value = val; textCb = cb; $('#tModal').hidden = false; $('#tArea').focus(); }
const closeText = () => { $('#tModal').hidden = true; textCb = null; };
$('#tCancel').onclick = closeText;
$('#tModal').addEventListener('click', e => { if (e.target.id === 'tModal') closeText(); });
$('#tSave').onclick = () => {
  const v = $('#tArea').value.trim();
  if (!v) return toast('Text cannot be empty');
  const cb = textCb; closeText(); cb(v);
};

/* ---------- Journal ---------- */
$('#jText').value = state.draft || '';
$('#jText').addEventListener('input', e => { state.draft = e.target.value; save(); }); // draft survives a refresh
$('#btnJSave').onclick = () => {
  const t = $('#jText').value.trim();
  if (!t) return toast('Write something first');
  state.journal.push({ id: uid(), ts: Date.now(), text: t });
  state.draft = ''; $('#jText').value = ''; save(); render(); toast('Entry saved');
};
function renderJournal() {
  const box = $('#journalList');
  if (!state.journal.length) { box.innerHTML = '<div class="empty">No journal entries yet.<br>Write one on the Home screen.</div>'; return; }
  const groups = {};
  [...state.journal].sort((a, b) => b.ts - a.ts).forEach(j => { (groups[dkey(j.ts)] = groups[dkey(j.ts)] || []).push(j); });
  box.innerHTML = Object.keys(groups).map(k =>
    `<div class="day-head">${fmtDay(k)}<span>${plural(groups[k].length, 'entry').replace('entrys', 'entries')}</span></div>` +
    groups[k].map(j => `<div class="item"><div class="info"><div class="range">${fmtTime(j.ts)}</div><div class="text">${esc(j.text)}</div></div>
      <div class="acts"><button class="small-btn" data-jedit="${j.id}">Edit</button><button class="small-btn del" data-jdel="${j.id}">Delete</button></div></div>`).join('')
  ).join('');
}
$('#journalList').addEventListener('click', e => {
  const ed = e.target.closest('[data-jedit]'), del = e.target.closest('[data-jdel]');
  if (ed) {
    const j = state.journal.find(x => x.id === ed.dataset.jedit);
    openText('Edit entry', j.text, v => { j.text = v; save(); render(); toast('Entry updated'); });
  }
  if (del && confirm('Delete this journal entry?')) {
    state.journal = state.journal.filter(x => x.id !== del.dataset.jdel); save(); render(); toast('Entry deleted');
  }
});

/* ---------- Home ---------- */
function renderHome() {
  const a = state.active, T = totals(), TM = timings(), now = new Date();
  $('#todayLabel').textContent = now.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });
  $('#btnSleep').hidden = $('#btnNap').hidden = !!a;
  $('#btnWake').hidden = !a;
  document.body.classList.toggle('sleeping', !!a);
  $('#trackStatus').textContent = a ? `${a.type === 'night' ? 'Sleeping' : 'Napping'} since ${fmtTime(a.start)}` : 'Ready when you are';
  tick();
  renderAff();

  // today's statistics
  const today = T[dkey(now)] || { night: 0, nap: 0 }, total = today.night + today.nap;
  const lastNight = state.sessions.filter(s => s.type === 'night').sort((x, y) => y.end - x.end)[0];
  const a7 = avgOver(7, T), a30 = avgOver(30, T), none = 'No data';
  $('#goalBar').style.width = Math.min(100, total / goalMs() * 100) + '%';
  $('#goalLine').textContent = `${fmtDur(total)} of ${state.settings.goal}h goal (${Math.round(total / goalMs() * 100)}%)`;
  $('#todayRows').innerHTML = [
    ['Total today', total ? fmtDur(total) : none],
    ['Last night', lastNight ? fmtDur(lastNight.end - lastNight.start) : none],
    ['Naps today', today.nap ? fmtDur(today.nap) : 'None'],
    ['7-day average', a7 ? fmtDur(a7) : none],
    ['30-day average', a30 ? fmtDur(a30) : none]
  ].map(r => `<div><span>${r[0]}</span><b>${r[1]}</b></div>`).join('');

  // consistency
  const k7 = lastDays(7), c = consistency(TM, k7), t = targets();
  const latestKey = Object.keys(TM).sort().pop(), L = latestKey && TM[latestKey];
  $('#conScore').textContent = c ? c.score : '–';
  $('#conSub').textContent = c ? `/ 100 this week (${plural(c.n, 'night')})` : `Target ${clock(t.bed)} to ${clock(t.wake)}`;
  const goalStreak = streak(k => dayTotal(T[k]) >= goalMs());
  const timeStreak = streak(k => TM[k] && Math.abs(TM[k].bedDev) <= TOLERANCE && Math.abs(TM[k].wakeDev) <= TOLERANCE);
  $('#conRows').innerHTML = [
    ['Target', `${clock(t.bed)} to ${clock(t.wake)}`],
    ['Last bedtime', L ? `${clock(L.bed)} · ${devText(L.bedDev)}` : none],
    ['Last wake-up', L ? `${clock(L.wake)} · ${devText(L.wakeDev)}` : none],
    ['Average this week', c ? `bed ${devText(c.avgBed)}, wake ${devText(c.avgWake)}` : none],
    ['Goal streak', plural(goalStreak, 'day')],
    [`On-time streak (±${TOLERANCE} min)`, plural(timeStreak, 'day')]
  ].map(r => `<div><span>${r[0]}</span><b>${r[1]}</b></div>`).join('');

  if (view === 'home') durationChart('chHome', T);
}

/* ---------- History ---------- */
let histTab = 'sleep';
function renderHistory() {
  $('#historyList').hidden = histTab !== 'sleep';
  $('#journalList').hidden = histTab !== 'journal';
  $('#btnAdd').hidden = histTab !== 'sleep';
  $$('.seg button').forEach(b => b.classList.toggle('active', b.dataset.tab === histTab));
  renderJournal();
  const list = $('#historyList');
  if (!state.sessions.length) { list.innerHTML = '<div class="empty">No sleep recorded yet.<br>Tap “I’m Going to Sleep” on Home, or add a session.</div>'; return; }
  const groups = {};
  [...state.sessions].sort((a, b) => b.end - a.end).forEach(s => { (groups[dkey(s.end)] = groups[dkey(s.end)] || []).push(s); });
  list.innerHTML = Object.keys(groups).map(k => {
    const tot = groups[k].reduce((x, s) => x + s.end - s.start, 0);
    return `<div class="day-head">${fmtDay(k)}<span>${fmtDur(tot)} total</span></div>` +
      groups[k].map(s => `<div class="item"><div class="info"><b>${fmtDur(s.end - s.start)}</b> <span class="muted">${s.type === 'night' ? 'Night' : 'Nap'}</span>
        <div class="range">${fmtTime(s.start)} to ${fmtTime(s.end)}${dkey(s.start) !== dkey(s.end) ? ' (next day)' : ''}</div></div>
        <div class="acts"><button class="small-btn" data-edit="${s.id}">Edit</button><button class="small-btn del" data-del="${s.id}">Delete</button></div></div>`).join('');
  }).join('');
}
$('.seg').addEventListener('click', e => { const b = e.target.closest('[data-tab]'); if (b) { histTab = b.dataset.tab; renderHistory(); } });
$('#historyList').addEventListener('click', e => {
  const ed = e.target.closest('[data-edit]'), del = e.target.closest('[data-del]');
  if (ed) openModal(ed.dataset.edit);
  if (del && confirm('Delete this sleep record?')) {
    state.sessions = state.sessions.filter(s => s.id !== del.dataset.del); save(); render(); toast('Record deleted');
  }
});

/* ---------- Add / edit session modal ---------- */
let editId = null;
function openModal(id, dayKey) {
  editId = id || null;
  const s = id && state.sessions.find(x => x.id === id);
  $('#modalTitle').textContent = s ? 'Edit session' : 'Add session';
  $('#fErr').textContent = '';
  if (s) { $('#fType').value = s.type; $('#fStart').value = toInput(s.start); $('#fEnd').value = toInput(s.end); }
  else {
    const end = dayKey ? keyToDate(dayKey) : new Date(); end.setHours(7, 0, 0, 0);
    const start = new Date(end); start.setHours(-1, 0, 0, 0);
    $('#fType').value = 'night'; $('#fStart').value = toInput(start); $('#fEnd').value = toInput(end);
  }
  $('#modal').hidden = false;
}
const closeModal = () => { $('#modal').hidden = true; };
$('#btnAdd').onclick = () => openModal();
$('#btnCancel').onclick = closeModal;
$('#modal').addEventListener('click', e => { if (e.target.id === 'modal') closeModal(); });
$('#btnSave').onclick = () => {
  const start = new Date($('#fStart').value).getTime(), end = new Date($('#fEnd').value).getTime(), err = $('#fErr');
  if (isNaN(start) || isNaN(end)) return (err.textContent = 'Enter both a start and wake-up time.');
  if (end <= start) return (err.textContent = 'Wake-up time must be after the sleep time.');
  if (end - start > 24 * HOUR) return (err.textContent = 'A session can be at most 24 hours.');
  if (end > Date.now() + 60000) return (err.textContent = 'Wake-up time cannot be in the future.');
  const type = $('#fType').value;
  if (editId) Object.assign(state.sessions.find(s => s.id === editId), { type, start, end });
  else state.sessions.push({ id: uid(), type, start, end });
  save(); closeModal(); render(); toast('Session saved');
};

/* ---------- Charts ---------- */
const charts = {};
function mkChart(id, cfg) { if (charts[id]) charts[id].destroy(); charts[id] = new Chart($('#' + id), cfg); }
function chartDefaults() { Chart.defaults.color = '#8f98c8'; Chart.defaults.borderColor = 'rgba(160,150,255,.1)'; }
const hrs = ms => +(ms / HOUR).toFixed(2);
const dayLabel = k => keyToDate(k).toLocaleDateString([], { weekday: 'short' });
const goalLine = n => ({ type: 'line', label: 'Goal', data: Array(n).fill(state.settings.goal), borderColor: '#ffc478', borderDash: [6, 4], pointRadius: 0, borderWidth: 2 });

function durationChart(id, T) {
  if (typeof Chart === 'undefined') return;
  chartDefaults();
  const k7 = lastDays(7);
  mkChart(id, {
    type: 'bar',
    data: {
      labels: k7.map(dayLabel),
      datasets: [
        { label: 'Night', data: k7.map(k => hrs(T[k] ? T[k].night : 0)), backgroundColor: '#8b7cf6', borderRadius: 6, stack: 's' },
        { label: 'Naps', data: k7.map(k => hrs(T[k] ? T[k].nap : 0)), backgroundColor: '#ffc478', borderRadius: 6, stack: 's' },
        goalLine(7)
      ]
    },
    options: { maintainAspectRatio: false, scales: { x: { stacked: true }, y: { stacked: true, beginAtZero: true, title: { display: true, text: 'Hours' } } } }
  });
}
function timingChart(id, TM, key, target) {
  const k7 = lastDays(7);
  mkChart(id, {
    type: 'line',
    data: {
      labels: k7.map(dayLabel),
      datasets: [
        { label: 'Actual', data: k7.map(k => (TM[k] ? TM[k][key] : null)), borderColor: '#8b7cf6', backgroundColor: '#8b7cf6', tension: .3, spanGaps: true, pointRadius: 4 },
        { label: 'Target', data: k7.map(() => target), borderColor: '#8f98c8', borderDash: [6, 4], pointRadius: 0, borderWidth: 2 }
      ]
    },
    options: {
      maintainAspectRatio: false,
      scales: { y: { suggestedMin: target - 90, suggestedMax: target + 90, ticks: { maxTicksLimit: 6, callback: v => clock(v) } } },
      plugins: { tooltip: { callbacks: { label: c => `${c.dataset.label}: ${clock(c.parsed.y)}` } } }
    }
  });
}
function renderAnalytics() {
  if (typeof Chart === 'undefined') return;
  chartDefaults();
  const T = totals(), TM = timings(), t = targets();
  const k30 = lastDays(30), logged = k30.filter(k => dayTotal(T[k]) > 0);
  const avg = avgOver(30, T), c = consistency(TM, lastDays(7));
  const met = logged.filter(k => dayTotal(T[k]) >= goalMs()).length;
  $('#anaStats').innerHTML = [
    ['Average sleep (30 days)', avg ? fmtDur(avg) : 'No data'],
    ['Consistency (7 days)', c ? `${c.score} / 100` : 'No data'],
    ['Goal progress', logged.length ? `${Math.round(met / logged.length * 100)}%` : 'No data'],
    ['Goal days met', `${met} of ${logged.length}`]
  ].map(r => `<div class="card stat"><span class="muted">${r[0]}</span><b>${r[1]}</b></div>`).join('');

  timingChart('chBed', TM, 'bed', t.bed);
  timingChart('chWake', TM, 'wake', t.wake);
  durationChart('chWeek', T);
  mkChart('chMonth', {
    type: 'line',
    data: {
      labels: k30.map(k => keyToDate(k).getDate()),
      datasets: [
        { label: 'Total sleep (h)', data: k30.map(k => (dayTotal(T[k]) ? hrs(dayTotal(T[k])) : null)), borderColor: '#8b7cf6', backgroundColor: 'rgba(139,124,246,.18)', fill: true, tension: .35, spanGaps: true, pointRadius: 3 },
        goalLine(30)
      ]
    },
    options: { maintainAspectRatio: false, scales: { y: { beginAtZero: true } } }
  });
  const night = k30.reduce((a, k) => a + (T[k] ? T[k].night : 0), 0), nap = k30.reduce((a, k) => a + (T[k] ? T[k].nap : 0), 0);
  mkChart('chCompare', {
    type: 'doughnut',
    data: { labels: ['Night sleep', 'Naps'], datasets: [{ data: [hrs(night), hrs(nap)], backgroundColor: ['#8b7cf6', '#ffc478'], borderWidth: 0 }] },
    options: { maintainAspectRatio: false, cutout: '65%' }
  });
  const napDays = k30.filter(k => T[k] && T[k].nap > 0);
  $('#napStats').innerHTML = [
    ['Days with naps', `${napDays.length} of 30`],
    ['Average nap (nap days)', napDays.length ? fmtDur(napDays.reduce((a, k) => a + T[k].nap, 0) / napDays.length) : '–'],
    ['Naps share of total sleep', night + nap ? `${Math.round(nap / (night + nap) * 100)}%` : '–']
  ].map(r => `<div><span>${r[0]}</span><b>${r[1]}</b></div>`).join('');
}

/* ---------- Calendar ---------- */
let calMonth = new Date(); calMonth.setDate(1);
let calSel = dkey(new Date());
function renderCalendar() {
  const T = totals(), y = calMonth.getFullYear(), m = calMonth.getMonth();
  $('#calTitle').textContent = calMonth.toLocaleDateString([], { month: 'long', year: 'numeric' });
  let html = ['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(d => `<div class="dow">${d}</div>`).join('');
  html += '<div></div>'.repeat(new Date(y, m, 1).getDay());
  const days = new Date(y, m + 1, 0).getDate(), todayK = dkey(new Date());
  for (let d = 1; d <= days; d++) {
    const k = `${y}-${pad(m + 1)}-${pad(d)}`, t = dayTotal(T[k]);
    const lvl = !t ? '' : t >= goalMs() ? 'l3' : t >= goalMs() * .6 ? 'l2' : 'l1';
    html += `<button data-day="${k}" class="${lvl} ${k === todayK ? 'today' : ''} ${k === calSel ? 'sel' : ''}">${d}</button>`;
  }
  $('#calGrid').innerHTML = html;
  const list = state.sessions.filter(s => dkey(s.end) === calSel).sort((a, b) => a.start - b.start);
  $('#calDetail').innerHTML = `<h2>${fmtDay(calSel)}</h2>` + (list.length
    ? `<div class="rows">${list.map(s => `<div><span>${s.type === 'night' ? 'Night' : 'Nap'} · ${fmtTime(s.start)} to ${fmtTime(s.end)}</span><b>${fmtDur(s.end - s.start)}</b></div>`).join('')}<div><span>Total</span><b>${fmtDur(dayTotal(T[calSel]))}</b></div></div>`
    : '<p class="muted">No sleep recorded this day.</p>') +
    '<button class="btn ghost" style="margin-top:12px;width:100%" id="calAdd">Add session for this day</button>';
}
$('#calGrid').addEventListener('click', e => { const b = e.target.closest('[data-day]'); if (b) { calSel = b.dataset.day; renderCalendar(); } });
$('#calDetail').addEventListener('click', e => { if (e.target.id === 'calAdd') openModal(null, calSel); });
$('#calPrev').onclick = () => { calMonth.setMonth(calMonth.getMonth() - 1); renderCalendar(); };
$('#calNext').onclick = () => { calMonth.setMonth(calMonth.getMonth() + 1); renderCalendar(); };

/* ---------- Settings ---------- */
function fillSettings() { $('#setBed').value = state.settings.bed; $('#setWake').value = state.settings.wake; $('#setGoal').value = state.settings.goal; }
$('#setBed').onchange = e => { if (e.target.value) { state.settings.bed = e.target.value; save(); render(); toast('Bedtime target updated'); } else e.target.value = state.settings.bed; };
$('#setWake').onchange = e => { if (e.target.value) { state.settings.wake = e.target.value; save(); render(); toast('Wake-up target updated'); } else e.target.value = state.settings.wake; };
$('#setGoal').onchange = e => {
  const v = parseFloat(e.target.value);
  if (v >= 4 && v <= 12) { state.settings.goal = v; save(); render(); toast('Goal updated'); }
  else { e.target.value = state.settings.goal; toast('Choose a goal between 4 and 12 hours'); }
};
$('#btnExport').onclick = () => {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' }));
  a.download = `sleep-backup-${dkey(Date.now())}.json`; a.click(); toast('Backup downloaded');
};
$('#btnImport').onclick = () => $('#importFile').click();
$('#importFile').onchange = e => {
  const f = e.target.files[0]; if (!f) return;
  const r = new FileReader();
  r.onload = () => {
    try {
      const d = JSON.parse(r.result);
      if (!Array.isArray(d.sessions)) throw 0;
      if (!confirm('Replace your current data with this backup?')) return;
      state = { sessions: d.sessions, active: d.active || null, journal: d.journal || [], myAff: d.myAff || [], draft: d.draft || '', settings: { ...DEF_SETTINGS, ...(d.settings || {}) } };
      $('#jText').value = state.draft; curAff = null; save(); fillSettings(); render(); toast('Backup imported');
    } catch (err) { toast('That file is not a valid backup'); }
  };
  r.readAsText(f); e.target.value = '';
};
$('#btnReset').onclick = () => {
  if (confirm('Delete ALL data (sleep, journal and affirmations)? This cannot be undone.')) {
    state = { sessions: [], active: null, journal: [], myAff: [], draft: '', settings: { ...DEF_SETTINGS } };
    $('#jText').value = ''; curAff = null; save(); fillSettings(); render(); toast('All data deleted');
  }
};

/* ---------- Navigation & init ---------- */
let view = 'home';
function go(v) {
  view = v;
  $$('.view').forEach(s => s.classList.toggle('active', s.id === 'view-' + v));
  $$('#nav button').forEach(b => b.classList.toggle('active', b.dataset.view === v));
  window.scrollTo(0, 0);
  render();
}
$$('#nav button').forEach(b => b.onclick = () => go(b.dataset.view));
$('#btnSleep').onclick = () => startTrack('night');
$('#btnNap').onclick = () => startTrack('nap');
$('#btnWake').onclick = wakeUp;

function render() {
  renderHome(); renderHistory(); renderAffList();
  if (view === 'analytics') renderAnalytics();
  if (view === 'calendar') renderCalendar();
}
// Refresh when the app is resumed (new day, or morning/night switch)
document.addEventListener('visibilitychange', () => { if (!document.hidden) { curAff = null; render(); } });
fillSettings();
render();
// Switch morning/night affirmation automatically while the app stays open
setInterval(() => { if (curAff && curAff.src !== 'mine' && curAff.src !== period()) render(); }, 60000);
