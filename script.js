/* ===== Sleep Tracker ===== */
const KEY = 'sleepTrackerV1';

const AFFIRMATIONS = [
  "I show up for myself every single day.",
  "Small, consistent steps build the life I want.",
  "Discipline is the way I care for my future self.",
  "I am grateful for the rest my body receives tonight.",
  "Progress, not perfection, is my goal.",
  "I choose habits that make me stronger.",
  "Rest is productive. I honour my need for sleep.",
  "I am becoming the person I promised myself I'd be.",
  "Every morning is a fresh start and I welcome it.",
  "I keep my promises to myself.",
  "Gratitude turns what I have into enough.",
  "I trust the process of slow, steady growth.",
  "My consistency is my superpower.",
  "I release the day and let my mind be calm.",
  "I am proud of how far I have come.",
  "Discipline today creates freedom tomorrow.",
  "I give my body and mind the rest they deserve.",
  "I am thankful for this day and its lessons.",
  "I grow a little every day, and that is enough.",
  "I choose consistency over motivation.",
  "My routines support my best self.",
  "I deserve deep, restorative sleep.",
  "I let go of what I cannot control.",
  "Each good night's sleep is an investment in my goals.",
  "I am patient with myself while I grow.",
  "I wake up with energy, focus and purpose.",
  "Gratitude fills my heart before I close my eyes.",
  "I do the hard things because they shape me.",
  "I am worthy of rest, joy and success.",
  "Healthy habits are the quiet foundation of my success.",
  "I turn challenges into chances to grow.",
  "I commit to my sleep schedule with kindness and strength.",
  "Today I will do my best and that is enough.",
  "I am calm, grounded and ready to rest.",
  "I celebrate small wins on the way to big ones.",
  "I am disciplined, focused and resilient.",
  "My body heals and renews itself while I sleep.",
  "I appreciate the people and moments that bless my life.",
  "I choose progress over comfort.",
  "I build my dreams one consistent day at a time.",
  "I forgive yesterday and embrace today.",
  "A well-rested mind creates better days.",
  "I am committed to growing in every season of life.",
  "I earn my rest by living with intention.",
  "I am grateful for my health and my ability to heal.",
  "Strong habits make a strong life.",
  "I am growing, learning and getting better every day.",
  "I protect my sleep as I protect my peace.",
  "I keep going, even when progress feels slow.",
  "Tonight I rest. Tomorrow I rise.",
  "I am the author of my daily routine.",
  "Gratitude is the best way to end a day.",
  "I stay consistent because my goals matter.",
  "My mind is quiet and my heart is light.",
  "I welcome the growth that discomfort brings.",
  "I choose to be kind to my body by resting well.",
  "I treat my time and energy as precious gifts.",
  "Every sunrise gives me a new chance to grow.",
  "I trust that all my efforts are adding up."
];

/* ---------- State ---------- */
let state = load();
function load() {
  const def = { sessions: [], active: null, settings: { goal: 8 } };
  try {
    const s = JSON.parse(localStorage.getItem(KEY));
    if (s && Array.isArray(s.sessions)) return { ...def, ...s, settings: { ...def.settings, ...(s.settings || {}) } };
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
function lastDays(n) {
  const out = [];
  for (let i = n - 1; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate() - i); out.push(dkey(d)); }
  return out;
}
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
  const vals = lastDays(n).map(k => dayTotal(T[k])).filter(v => v > 0);
  return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
}
let toastTimer;
function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 2200);
}

/* ---------- Tracking ---------- */
function startTrack(type) {
  if (state.active) return;
  state.active = { type, start: Date.now() };
  save(); render();
  toast(type === 'night' ? 'Sleep tracking started. Good night!' : 'Nap started');
}
function wakeUp() {
  const a = state.active; if (!a) return;
  const end = Date.now();
  state.active = null;
  if (end - a.start < 60000) { toast('Under 1 minute, so it was not saved'); }
  else {
    state.sessions.push({ id: uid(), type: a.type, start: a.start, end });
    toast(`Saved: ${fmtDur(end - a.start)} of ${a.type === 'night' ? 'sleep' : 'nap'}`);
  }
  save(); render();
}
function tick() {
  const a = state.active;
  $('#timer').textContent = a ? fmtHMS(Date.now() - a.start) : '00:00:00';
}
setInterval(tick, 1000);

/* ---------- Home ---------- */
function renderHome() {
  const a = state.active, T = totals(), now = new Date();
  $('#todayLabel').textContent = now.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });
  $('#btnSleep').hidden = $('#btnNap').hidden = !!a;
  $('#btnWake').hidden = !a;
  document.body.classList.toggle('sleeping', !!a);
  $('#trackStatus').textContent = a
    ? (a.type === 'night' ? `😴 Sleeping since ${fmtTime(a.start)}` : `💤 Napping since ${fmtTime(a.start)}`)
    : 'Ready when you are';
  tick();

  // affirmation: one per calendar day
  const n = Math.floor(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) / 86400000);
  $('#affirmText').textContent = AFFIRMATIONS[n % AFFIRMATIONS.length];

  const today = T[dkey(now)] || { night: 0, nap: 0 };
  const total = today.night + today.nap;
  const pct = Math.min(1, total / goalMs());
  $('#goalBig').textContent = fmtDur(total);
  $('#goalSub').textContent = `of ${state.settings.goal}h goal today`;
  $('#goalPct').textContent = `${Math.round(total / goalMs() * 100)}%`;
  $('#ringFg').style.strokeDashoffset = 326.7 * (1 - pct);

  const lastNight = state.sessions.filter(s => s.type === 'night').sort((x, y) => y.end - x.end)[0];
  const a7 = avgOver(7, T), a30 = avgOver(30, T);
  $('#sToday').textContent = total ? fmtDur(total) : 'No data';
  $('#sLast').textContent = lastNight ? fmtDur(lastNight.end - lastNight.start) : 'No data';
  $('#sNap').textContent = today.nap ? fmtDur(today.nap) : 'None';
  $('#s7').textContent = a7 ? fmtDur(a7) : 'No data';
  $('#s30').textContent = a30 ? fmtDur(a30) : 'No data';

  const wk = lastDays(7).map(k => dayTotal(T[k])).filter(v => v > 0);
  const sum = wk.reduce((x, y) => x + y, 0);
  const rows = [
    ['Total sleep (7 days)', wk.length ? fmtDur(sum) : '–'],
    ['Best day', wk.length ? fmtDur(Math.max(...wk)) : '–'],
    ['Shortest day', wk.length ? fmtDur(Math.min(...wk)) : '–'],
    ['Days goal met', `${wk.filter(v => v >= goalMs()).length} of ${wk.length || 0} logged`]
  ];
  $('#weekStats').innerHTML = rows.map(r => `<div><span>${r[0]}</span><b>${r[1]}</b></div>`).join('');
}

/* ---------- History ---------- */
function renderHistory() {
  const list = $('#historyList');
  if (!state.sessions.length) { list.innerHTML = '<div class="empty">No sleep recorded yet.<br>Tap “I’m Going to Sleep” on Home or add a session.</div>'; return; }
  const groups = {};
  [...state.sessions].sort((a, b) => b.end - a.end).forEach(s => { (groups[dkey(s.end)] = groups[dkey(s.end)] || []).push(s); });
  list.innerHTML = Object.keys(groups).map(k => {
    const tot = groups[k].reduce((x, s) => x + s.end - s.start, 0);
    return `<div class="day-head">${fmtDay(k)}<span>${fmtDur(tot)} total</span></div>` +
      groups[k].map(s => `
      <div class="item">
        <div class="ico">${s.type === 'night' ? '🌙' : '☀️'}</div>
        <div class="info"><div class="dur">${fmtDur(s.end - s.start)} <span class="muted">${s.type === 'night' ? 'Night' : 'Nap'}</span></div>
        <div class="range">${fmtTime(s.start)} → ${fmtTime(s.end)}${dkey(s.start) !== dkey(s.end) ? ' (next day)' : ''}</div></div>
        <button class="icon-btn" data-edit="${s.id}" aria-label="Edit">✏️</button>
        <button class="icon-btn" data-del="${s.id}" aria-label="Delete">🗑️</button>
      </div>`).join('');
  }).join('');
}
$('#historyList').addEventListener('click', e => {
  const ed = e.target.closest('[data-edit]'), del = e.target.closest('[data-del]');
  if (ed) openModal(ed.dataset.edit);
  if (del && confirm('Delete this sleep record?')) {
    state.sessions = state.sessions.filter(s => s.id !== del.dataset.del);
    save(); render(); toast('Record deleted');
  }
});

/* ---------- Add / edit modal ---------- */
let editId = null;
function openModal(id, dayKey) {
  editId = id || null;
  const s = id && state.sessions.find(x => x.id === id);
  $('#modalTitle').textContent = s ? 'Edit session' : 'Add session';
  $('#fErr').textContent = '';
  if (s) { $('#fType').value = s.type; $('#fStart').value = toInput(s.start); $('#fEnd').value = toInput(s.end); }
  else {
    const base = dayKey ? keyToDate(dayKey) : new Date();
    const end = new Date(base); end.setHours(7, 0, 0, 0);
    const start = new Date(end); start.setHours(-1, 0, 0, 0); // 11 pm the evening before
    $('#fType').value = 'night'; $('#fStart').value = toInput(start); $('#fEnd').value = toInput(end);
  }
  $('#modal').hidden = false;
}
const closeModal = () => { $('#modal').hidden = true; };
$('#btnAdd').onclick = () => openModal();
$('#btnCancel').onclick = closeModal;
$('#modal').addEventListener('click', e => { if (e.target.id === 'modal') closeModal(); });
$('#btnSave').onclick = () => {
  const start = new Date($('#fStart').value).getTime(), end = new Date($('#fEnd').value).getTime();
  if (isNaN(start) || isNaN(end)) return ($('#fErr').textContent = 'Enter both a start and wake-up time.');
  if (end <= start) return ($('#fErr').textContent = 'Wake-up time must be after the sleep time.');
  if (end - start > 24 * HOUR) return ($('#fErr').textContent = 'A session can be at most 24 hours.');
  if (end > Date.now() + 60000) return ($('#fErr').textContent = 'Wake-up time cannot be in the future.');
  const type = $('#fType').value;
  if (editId) Object.assign(state.sessions.find(s => s.id === editId), { type, start, end });
  else state.sessions.push({ id: uid(), type, start, end });
  save(); closeModal(); render(); toast('Session saved');
};

/* ---------- Analytics ---------- */
const charts = {};
function mkChart(id, cfg) { if (charts[id]) charts[id].destroy(); charts[id] = new Chart($('#' + id), cfg); }
function consistency() {
  const cutoff = Date.now() - 14 * 86400000;
  const mins = state.sessions.filter(s => s.type === 'night' && s.start > cutoff).map(s => {
    const d = new Date(s.start); let m = d.getHours() * 60 + d.getMinutes();
    return m < 720 ? m + 1440 : m; // after-midnight bedtimes sort after evening ones
  });
  if (mins.length < 3) return null;
  const mean = mins.reduce((a, b) => a + b, 0) / mins.length;
  const sd = Math.sqrt(mins.reduce((a, b) => a + (b - mean) ** 2, 0) / mins.length);
  return { score: Math.max(0, Math.round(100 - sd / 1.2)), sd: Math.round(sd) };
}
function renderAnalytics() {
  if (typeof Chart === 'undefined') return;
  const T = totals(), goal = state.settings.goal;
  Chart.defaults.color = '#9aa3d0'; Chart.defaults.borderColor = 'rgba(160,150,255,.12)';
  const h = ms => +(ms / HOUR).toFixed(2);

  const k30 = lastDays(30), logged = k30.filter(k => dayTotal(T[k]) > 0);
  const avg = avgOver(30, T), c = consistency();
  const met = logged.filter(k => dayTotal(T[k]) >= goalMs()).length;
  $('#anaStats').innerHTML = [
    ['Average sleep', avg ? fmtDur(avg) : 'No data'],
    ['Consistency', c ? `${c.score}/100 <span class="muted">±${c.sd}m</span>` : 'Need 3 nights'],
    ['Goal progress', logged.length ? `${Math.round(met / logged.length * 100)}%` : 'No data'],
    ['Goal days met', `${met} of ${logged.length}`]
  ].map(r => `<div class="card stat"><span class="muted">${r[0]}</span><b>${r[1]}</b></div>`).join('');

  const k7 = lastDays(7);
  const goalLine = n => ({ type: 'line', label: 'Goal', data: Array(n).fill(goal), borderColor: '#ffb86b', borderDash: [6, 4], pointRadius: 0, borderWidth: 2 });
  mkChart('chWeek', {
    type: 'bar',
    data: {
      labels: k7.map(k => keyToDate(k).toLocaleDateString([], { weekday: 'short' })),
      datasets: [
        { label: 'Night', data: k7.map(k => h(T[k] ? T[k].night : 0)), backgroundColor: '#7c6cff', borderRadius: 8, stack: 's' },
        { label: 'Naps', data: k7.map(k => h(T[k] ? T[k].nap : 0)), backgroundColor: '#ffb86b', borderRadius: 8, stack: 's' },
        goalLine(7)
      ]
    },
    options: { maintainAspectRatio: false, scales: { x: { stacked: true }, y: { stacked: true, beginAtZero: true, title: { display: true, text: 'Hours' } } } }
  });
  mkChart('chMonth', {
    type: 'line',
    data: {
      labels: k30.map(k => keyToDate(k).getDate()),
      datasets: [
        { label: 'Total sleep (h)', data: k30.map(k => dayTotal(T[k]) ? h(dayTotal(T[k])) : null), borderColor: '#9b8cff', backgroundColor: 'rgba(155,140,255,.2)', fill: true, tension: .35, spanGaps: true, pointRadius: 3 },
        goalLine(30)
      ]
    },
    options: { maintainAspectRatio: false, scales: { y: { beginAtZero: true } } }
  });
  const nightH = k30.reduce((a, k) => a + (T[k] ? T[k].night : 0), 0), napH = k30.reduce((a, k) => a + (T[k] ? T[k].nap : 0), 0);
  mkChart('chCompare', {
    type: 'doughnut',
    data: { labels: ['Night sleep', 'Naps'], datasets: [{ data: [h(nightH), h(napH)], backgroundColor: ['#7c6cff', '#ffb86b'], borderWidth: 0 }] },
    options: { maintainAspectRatio: false, cutout: '65%' }
  });
  const napDays = k30.filter(k => T[k] && T[k].nap > 0);
  $('#napStats').innerHTML = [
    ['Days with naps', `${napDays.length} of 30`],
    ['Average nap (on nap days)', napDays.length ? fmtDur(napDays.reduce((a, k) => a + T[k].nap, 0) / napDays.length) : '–'],
    ['Naps share of total sleep', nightH + napH ? `${Math.round(napH / (nightH + napH) * 100)}%` : '–']
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
  const tot = dayTotal(T[calSel]);
  $('#calDetail').innerHTML = `<h2>${fmtDay(calSel)}</h2>` + (list.length
    ? `<div class="rows">${list.map(s => `<div><span>${s.type === 'night' ? '🌙 Night' : '☀️ Nap'} · ${fmtTime(s.start)} → ${fmtTime(s.end)}</span><b>${fmtDur(s.end - s.start)}</b></div>`).join('')}<div><span>Total</span><b>${fmtDur(tot)}</b></div></div>`
    : '<p class="muted">No sleep recorded this day.</p>') +
    `<button class="btn ghost" style="margin-top:12px;width:100%" id="calAdd">+ Add session for this day</button>`;
}
$('#calGrid').addEventListener('click', e => { const b = e.target.closest('[data-day]'); if (b) { calSel = b.dataset.day; renderCalendar(); } });
$('#calDetail').addEventListener('click', e => { if (e.target.id === 'calAdd') openModal(null, calSel); });
$('#calPrev').onclick = () => { calMonth.setMonth(calMonth.getMonth() - 1); renderCalendar(); };
$('#calNext').onclick = () => { calMonth.setMonth(calMonth.getMonth() + 1); renderCalendar(); };

/* ---------- Settings ---------- */
$('#goalInput').value = state.settings.goal;
$('#goalInput').onchange = e => {
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
      state = { sessions: d.sessions, active: d.active || null, settings: { goal: 8, ...(d.settings || {}) } };
      $('#goalInput').value = state.settings.goal; save(); render(); toast('Backup imported');
    } catch (err) { toast('That file is not a valid backup'); }
  };
  r.readAsText(f); e.target.value = '';
};
$('#btnReset').onclick = () => {
  if (confirm('Delete ALL sleep data? This cannot be undone.')) {
    state = { sessions: [], active: null, settings: { goal: 8 } };
    $('#goalInput').value = 8; save(); render(); toast('All data deleted');
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
  renderHome(); renderHistory();
  if (view === 'analytics') renderAnalytics();
  if (view === 'calendar') renderCalendar();
}
// Keep "today" correct if the app stays open past midnight or is resumed
document.addEventListener('visibilitychange', () => { if (!document.hidden) render(); });
render();
