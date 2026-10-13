'use strict';
/* =========================================================
   PENDAKI NUSANTARA — Idle 2D Side-Scrolling Hiking Game
   Semua grafis digambar prosedural di Canvas (tanpa aset).
   ========================================================= */

// ---------------- Utilities ----------------
const $ = s => document.querySelector(s);
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const C = h => { h = h.replace('#', ''); return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]; };
const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const shade = (c, k) => [Math.min(255, c[0] * k), Math.min(255, c[1] * k), Math.min(255, c[2] * k)];
const rgb = (c, a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;

function hash(i) {
  let h = Math.imul((i | 0) ^ 0x27d4eb2d, 0x165667b1);
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
const hash2 = (a, b) => hash(Math.imul(a | 0, 73856093) ^ Math.imul(b | 0, 19349663));
function noise(x, seed) { const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); return lerp(hash2(i, seed), hash2(i + 1, seed), u); }
function fbm(x, seed) { return noise(x, seed) * 0.55 + noise(x * 2.03, seed + 17) * 0.3 + noise(x * 4.1, seed + 31) * 0.15; }

function fmt(n) {
  n = Math.floor(n);
  if (n < 100000) return n.toLocaleString('id-ID');
  const u = [[1e15, ' Kd'], [1e12, ' T'], [1e9, ' M'], [1e6, ' jt'], [1e3, ' rb']];
  for (const [v, s] of u) if (n >= v) { const x = n / v; return x.toFixed(x < 10 ? 2 : x < 100 ? 1 : 0).replace('.', ',') + s; }
  return String(n);
}
const fmtNum = n => Math.round(n).toLocaleString('id-ID');

// ---------------- Audio Synthesizer (Web Audio API) ----------------
let audioCtx = null;
let soundEnabled = true;

function initAudio() {
  if (!audioCtx) {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (AudioContext) audioCtx = new AudioContext();
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
}

function playTone(freq, type = 'sine', duration = 0.3, vol = 0.1, delay = 0) {
  if (!soundEnabled || !audioCtx) return;
  try {
    const t = audioCtx.currentTime + delay;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(vol, t + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(t);
    osc.stop(t + duration + 0.05);
  } catch (e) {}
}

const SFX = {
  step() {
    if (Math.random() < 0.25) playTone(90 + Math.random() * 30, 'triangle', 0.08, 0.015);
  },
  boost() {
    initAudio();
    playTone(392, 'sine', 0.15, 0.08, 0);
    playTone(523.25, 'sine', 0.22, 0.09, 0.08);
  },
  camp() {
    initAudio();
    playTone(261.6, 'sine', 0.4, 0.06, 0);
    playTone(329.6, 'sine', 0.4, 0.06, 0.15);
  },
  checkpoint() {
    initAudio();
    const notes = [261.63, 329.63, 392.00, 523.25];
    notes.forEach((f, idx) => playTone(f, 'sine', 0.35, 0.1, idx * 0.1));
  },
  summit() {
    initAudio();
    const notes = [392, 392, 440, 523.25, 587.33, 659.25, 783.99];
    notes.forEach((f, idx) => playTone(f, 'triangle', 0.5, 0.14, idx * 0.16));
  },
  buy() {
    initAudio();
    playTone(587.33, 'sine', 0.12, 0.08, 0);
    playTone(880, 'sine', 0.2, 0.09, 0.09);
  }
};

const SLENDRO_NOTES = [261.63, 293.66, 329.63, 392.00, 440.00, 523.25];
let ambientTimer = 6;
function updateAmbient(dt) {
  if (!soundEnabled) return;
  ambientTimer -= dt;
  if (ambientTimer <= 0) {
    ambientTimer = 8 + Math.random() * 12;
    if (audioCtx && audioCtx.state === 'running') {
      const note = SLENDRO_NOTES[Math.floor(Math.random() * SLENDRO_NOTES.length)];
      playTone(note, 'sine', 1.8, 0.04);
      if (Math.random() < 0.5) {
        const harmony = SLENDRO_NOTES[Math.floor(Math.random() * SLENDRO_NOTES.length)];
        playTone(harmony, 'triangle', 1.5, 0.025, 0.3);
      }
    }
  }
}

// ---------------- Game Data ----------------
const MOUNTAINS = [
  { id: 'papandayan', name: 'Gunung Papandayan', loc: 'Garut, Jawa Barat', peak: 2665, mult: 1, diff: 1, slope: 0.12, color: '#6d7b96', smoke: 0.45, cap: null,
    cps: [['Camp David', 2000], ['Kawah Papandayan', 2200], ['Pondok Saladah', 2288], ['Hutan Mati', 2400], ['Tegal Alun', 2550], ['Puncak Papandayan', 2665]],
    desc: 'Kawah aktif, Hutan Mati, dan padang edelweis Tegal Alun. Cocok untuk pendaki pemula.' },
  { id: 'gede', name: 'Gunung Gede', loc: 'Cianjur, Jawa Barat', peak: 2958, mult: 2, diff: 1.1, slope: 0.13, color: '#5f7290', smoke: 0.25, cap: null,
    cps: [['Cibodas', 1300], ['Telaga Biru', 1575], ['Air Panas', 2150], ['Kandang Badak', 2395], ['Tanjakan Setan', 2600], ['Puncak Gede', 2958]],
    desc: 'Hutan hujan tropis lebat, Telaga Biru, dan aliran air panas di jalur.' },
  { id: 'merbabu', name: 'Gunung Merbabu', loc: 'Boyolali, Jawa Tengah', peak: 3142, mult: 3.5, diff: 1.2, slope: 0.14, color: '#6a7a8a', smoke: 0, cap: null,
    cps: [['Basecamp Selo', 1800], ['Pos 1 Dok Malang', 2100], ['Pos 2 Pandean', 2400], ['Sabana 1', 2600], ['Sabana 2', 2800], ['Puncak Kenteng Songo', 3142]],
    desc: 'Sabana bergelombang dengan pemandangan Merapi yang megah.' },
  { id: 'semeru', name: 'Gunung Semeru', loc: 'Lumajang, Jawa Timur', peak: 3676, mult: 6, diff: 1.35, slope: 0.15, color: '#5d6478', smoke: 1, cap: 'sand',
    cps: [['Ranu Pane', 2100], ['Ranu Kumbolo', 2400], ['Oro-oro Ombo', 2500], ['Kalimati', 2700], ['Arcopodo', 2900], ['Puncak Mahameru', 3676]],
    desc: 'Atap Pulau Jawa. Ranu Kumbolo yang syahdu dan lautan pasir Mahameru.' },
  { id: 'rinjani', name: 'Gunung Rinjani', loc: 'Lombok, NTB', peak: 3726, mult: 10, diff: 1.5, slope: 0.16, color: '#5a6a86', smoke: 0.15, cap: null,
    cps: [['Sembalun', 1156], ['Pos 1', 1300], ['Pos 2', 1500], ['Pos 3', 1800], ['Plawangan Sembalun', 2639], ['Puncak Rinjani', 3726]],
    desc: 'Danau Segara Anak dan Bukit Penyesalan yang legendaris.' },
  { id: 'kerinci', name: 'Gunung Kerinci', loc: 'Jambi, Sumatra', peak: 3805, mult: 16, diff: 1.7, slope: 0.17, color: '#566680', smoke: 0.6, cap: null,
    cps: [['Kersik Tuo', 1600], ['Pintu Rimba', 1800], ['Shelter 1', 2500], ['Shelter 3', 3300], ['Tugu Yudha', 3600], ['Puncak Indrapura', 3805]],
    desc: 'Gunung api tertinggi di Indonesia, dikelilingi rimba Sumatra.' },
  { id: 'cartenz', name: 'Puncak Carstensz', loc: 'Papua Tengah', peak: 4884, mult: 30, diff: 3, slope: 0.2, color: '#6b7280', smoke: 0, cap: 'snow',
    cps: [['Lembah Danau-Danau', 4000], ['Teras Batu', 4200], ['Summit Ridge', 4500], ['Tyrolean Traverse', 4700], ['Puncak Carstensz', 4884]],
    desc: 'Atap Indonesia & salah satu Seven Summits. Tebing kapur dan salju abadi.' },
];

const UPGRADES = [
  { id: 'sepatu', name: 'Sepatu Gunung', icon: '🥾', base: 30, growth: 1.45, desc: l => `Kecepatan +12%/lv · saat ini +${12 * l}%` },
  { id: 'carrier', name: 'Carrier Besar', icon: '🎒', base: 25, growth: 1.4, desc: () => `Stamina maks +25/lv · saat ini ${maxStam()}` },
  { id: 'logistik', name: 'Logistik & Kopi', icon: '☕', base: 45, growth: 1.45, desc: () => `Pemulihan +30%/lv · ${regenRate().toFixed(1)}/dtk` },
  { id: 'tongkat', name: 'Trekking Pole', icon: '🦯', base: 80, growth: 1.55, max: 20, desc: l => `Hemat stamina 8%/lv · saat ini -${Math.round((1 - Math.pow(0.92, l)) * 100)}%` },
  { id: 'jaket', name: 'Jaket Gunung', icon: '🧥', base: 120, growth: 1.6, desc: l => `Kurangi lelah di ketinggian 20%/lv · -${Math.round((1 - Math.pow(0.8, l)) * 100)}%` },
  { id: 'headlamp', name: 'Headlamp', icon: '🔦', base: 200, growth: 2.4, max: 3, desc: l => `Jalan malam lebih cepat & terang · ${Math.round((0.6 + 0.13 * l) * 100)}% kecepatan` },
  { id: 'porter', name: 'Porter Lokal', icon: '🧑🏽', base: 100, growth: 1.5, desc: () => `+Rp ${fmt(1.5 * incomeMult())}/dtk per porter (pasif & offline)` },
  { id: 'pemandu', name: 'Pemandu Lokal', icon: '🧭', base: 300, growth: 1.7, desc: l => `Pendapatan +25%/lv · saat ini x${(1 + 0.25 * l).toFixed(2)}` },
];
const UPG = Object.fromEntries(UPGRADES.map(u => [u.id, u]));

const BIOMES = [
  { max: 1500, ground: '#4e8a2c', soil: '#6b4a2b', tree: '#2e6a2a', hill: '#3f7a34' },  // hutan tropis
  { max: 2600, ground: '#4a7a34', soil: '#5e4430', tree: '#24553a', hill: '#356645' },  // hutan montana / cemara
  { max: 3300, ground: '#a3a24c', soil: '#7a6440', tree: '#5d6e30', hill: '#8b8e4a' },  // sabana & edelweis
  { max: 4400, ground: '#857a6e', soil: '#5c534b', tree: '#6b6058', hill: '#7a716a' },  // batuan / pasir vulkanik
  { max: 1e9, ground: '#e6edf5', soil: '#9aa3ad', tree: '#aab4c0', hill: '#cdd6e0' },   // salju
].map(b => ({ max: b.max, ground: C(b.ground), soil: C(b.soil), tree: C(b.tree), hill: C(b.hill) }));

const EVENTS = [
  { t: 'Bertemu pendaki lain: "Salam lestari!" 🙌' },
  { t: 'Ada edelweis! Cukup dilihat, jangan dipetik 🌼', minAlt: 2400 },
  { t: 'Monyet ekor panjang mencuri logistik! 🐒', stam: -10, maxAlt: 2300 },
  { t: 'Seduh kopi tubruk hangat ☕ Stamina pulih!', stam: 25 },
  { t: 'Kabut tebal turun... jalan pelan-pelan 🌫️' },
  { t: 'Memungut sampah di jalur. Karma baik! ♻️', money: 4 },
  { t: 'Elang jawa melintas di langit 🦅', maxAlt: 3300 },
  { t: 'Makan nasi bungkus & gorengan di pos 🍙', stam: 15, maxAlt: 2600 },
  { t: 'Tanjakan curam! Napas ngos-ngosan 😮‍💨', stam: -15 },
  { t: 'Kaki kram, pijat sebentar 🦵', stam: -18 },
  { t: 'Pemandangan indah, foto dulu! 📸', money: 5 },
  { t: 'Porter menyalip sambil memikul 30 kg. Respect! 💪' },
  { t: 'Terdengar suara owa jawa di kejauhan 🐵', maxAlt: 2000 },
  { t: 'Wah, lautan awan di bawah kaki! ☁️', minAlt: 2800, money: 8 },
  { t: 'Angin kencang & dingin menusuk 🥶', minAlt: 3000, stam: -15 },
  { t: 'Ketemu mata air jernih, isi botol 💧', stam: 20, maxAlt: 3000 },
  { t: 'Rombongan mapala saling menyemangati! 🎒', money: 3 },
  { t: 'Babi hutan lewat di kejauhan... tetap tenang 🐗', maxAlt: 2400 },
  { t: 'Bunga cantigi merah merekah 🌺', minAlt: 2400, maxAlt: 3400 },
  { t: 'Pasir licin, 3 langkah naik 1 turun 😵', minAlt: 3300, stam: -12 },
  { t: 'Makan cokelat & roti, tenaga naik! 🍫', stam: 18 },
  { t: 'Bintang jatuh! Buat permohonan ✨', night: true, money: 10 },
];

const PORTER_STYLE = [
  { shirt: '#16a085', pack: '#8e5a2b', hat: '#d35400', roll: '#c0392b', big: true, scale: 0.95 },
  { shirt: '#34495e', pack: '#6d4c2f', hat: '#27ae60', roll: '#f1c40f', big: true, scale: 0.93 },
  { shirt: '#8e44ad', pack: '#7b5a3a', hat: '#c0392b', roll: '#2980b9', big: true, scale: 0.96 },
];

const SAVE_KEY = 'pendakiNusantara_v1';
const DAY_LEN = 240;      // detik per siklus siang-malam
const BASE_SPEED = 70;    // px per detik
const BASE_G = 0.035;     // meter ketinggian per px

// ---------------- State ----------------
function newState() {
  return { money: 0, mtn: 0, camX: 0, stamina: 100, pos: 0, up: {}, summits: {}, unlocked: 1,
    totalAlt: 0, totalEarned: 0, totalSummits: 0, playTime: 0, time: 0.3, log: [], lastSave: Date.now(), seenIntro: false };
}
function load() {
  try { const d = JSON.parse(localStorage.getItem(SAVE_KEY)); return d ? Object.assign(newState(), d) : null; }
  catch (e) { return null; }
}
function save() { S.lastSave = Date.now(); try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (e) { /* ignore */ } }

let S = load() || newState();
const R = { mode: 'walk', boost: 0, phase: 0, summitT: 0, summitModal: false, summitBonus: 0, justUnlocked: null,
  modalOpen: false, modalAuto: null, particles: [], texts: [], bubble: null, fade: 0, fadeDir: 0, fadeCb: null,
  eventT: 15, hudT: 0, uiT: 0, saveT: 0, taps: 0,
  weather: 'clear', weatherTimer: 20, rainDrops: [] };

function updateWeather(dt) {
  R.weatherTimer -= dt;
  if (R.weatherTimer <= 0) {
    R.weatherTimer = 25 + Math.random() * 35;
    const rnd = Math.random();
    const alt = curAlt();
    if (alt > 3500) {
      R.weather = rnd < 0.4 ? 'mist' : (rnd < 0.7 ? 'clear' : 'rain');
    } else {
      R.weather = rnd < 0.45 ? 'clear' : (rnd < 0.75 ? 'rain' : 'mist');
    }
  }

  // update rain drops
  if (R.weather === 'rain') {
    while (R.rainDrops.length < 90) {
      R.rainDrops.push({
        x: Math.random() * (W + 200) - 100,
        y: Math.random() * H - 50,
        len: 12 + Math.random() * 14,
        speed: 380 + Math.random() * 200
      });
    }
    for (const d of R.rainDrops) {
      d.y += d.speed * dt;
      d.x -= d.speed * 0.25 * dt;
      if (d.y > H) {
        d.y = -20;
        d.x = Math.random() * (W + 200) - 100;
      }
    }
  } else if (R.rainDrops.length > 0) {
    R.rainDrops.length = 0;
  }
}

function drawWeather() {
  if (R.weather === 'rain') {
    ctx.strokeStyle = 'rgba(190, 220, 255, 0.45)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    for (const d of R.rainDrops) {
      ctx.moveTo(d.x, d.y);
      ctx.lineTo(d.x - 3, d.y + d.len);
    }
    ctx.stroke();

    // subtle misty rain overlay
    ctx.fillStyle = 'rgba(30, 45, 60, 0.12)';
    ctx.fillRect(0, 0, W, H);
  } else if (R.weather === 'mist') {
    // Gunung kabut syahdu nusantara
    const mistAlpha = 0.22 + 0.08 * Math.sin(T * 0.5);
    const gr = ctx.createLinearGradient(0, H * 0.4, 0, H);
    gr.addColorStop(0, `rgba(235, 245, 240, 0)`);
    gr.addColorStop(0.6, `rgba(220, 235, 230, ${mistAlpha})`);
    gr.addColorStop(1, `rgba(200, 220, 215, ${mistAlpha * 0.8})`);
    ctx.fillStyle = gr;
    ctx.fillRect(0, 0, W, H);
  }
}


const lvl = id => S.up[id] || 0;
const M = () => MOUNTAINS[S.mtn];
const startAlt = m => m.cps[0][1];
const gOf = m => BASE_G / m.diff;
const camMax = m => (m.peak - startAlt(m)) / gOf(m);
const altAt = cx => startAlt(M()) + cx * gOf(M());
const curAlt = () => Math.min(M().peak, altAt(S.camX));
const progress = () => { const m = M(); return clamp((curAlt() - startAlt(m)) / (m.peak - startAlt(m)), 0, 1); };
const maxStam = () => 100 + 25 * lvl('carrier');
const regenRate = () => 10 * (1 + 0.3 * lvl('logistik'));
const incomeMult = () => M().mult * (1 + 0.25 * lvl('pemandu'));
const porterIncome = () => lvl('porter') * 1.5 * incomeMult();
function daylight() { const sh = -Math.cos(S.time * Math.PI * 2); return clamp((sh + 0.2) / 0.5, 0, 1); }
const nightSpeed = () => lerp(0.6 + 0.13 * lvl('headlamp'), 1, daylight());
const speed = () => BASE_SPEED * (1 + 0.12 * lvl('sepatu')) * nightSpeed() * (R.boost > 0 ? 1.8 : 1);
function drainRate() {
  const altPen = 1 + Math.max(0, (curAlt() - 1800) / 1000) * 0.6 * Math.pow(0.8, lvl('jaket'));
  return 2.5 * altPen * Math.pow(0.92, lvl('tongkat')) * (R.boost > 0 ? 1.25 : 1);
}
const climbRate = () => speed() * gOf(M());

function biomeIdx(a) { for (let i = 0; i < BIOMES.length; i++) if (a < BIOMES[i].max) return i; return BIOMES.length - 1; }
function biomeColor(a, key) {
  const i = biomeIdx(a), b = BIOMES[i];
  const lo = i > 0 ? BIOMES[i - 1].max : -1e9;
  if (i < BIOMES.length - 1 && a > b.max - 120) return mix(b[key], BIOMES[i + 1][key], (a - (b.max - 120)) / 240);
  if (i > 0 && a < lo + 120) return mix(BIOMES[i - 1][key], b[key], 0.5 + (a - lo) / 240);
  return b[key];
}

// ---------------- Canvas setup ----------------
const canvas = $('#game');
const ctx = canvas.getContext('2d');
let W = 0, H = 0, U = 1, hs = 0, Hbase = 0, T = 0, CAM = 0;
const F = { skyTop: [0, 0, 0], skyBot: [0, 0, 0], dark: 0, day: 1 };
const NIGHT = [12, 16, 38];
const STARS = Array.from({ length: 170 }, () => ({ x: Math.random(), y: Math.random() * 0.65, s: Math.random() * 1.4 + 0.3, p: Math.random() * 6 }));

function resize() {
  const r = canvas.parentElement.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  W = r.width; H = r.height;
  canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  U = clamp(H / 560, 0.6, 1.5);
  hs = W * (W < 600 ? 0.3 : 0.34);
  Hbase = H * 0.8;
}
new ResizeObserver(resize).observe(canvas.parentElement);

// ---------------- Terrain ----------------
function elev(wx) {
  const m = M(), sl = m.slope, sw = camMax(m) + hs + 70;
  let e = sl * clamp(wx, hs - 80, sw);
  if (wx > sw + 60) e -= (wx - sw - 60) * sl * 1.8;
  return e;
}
const bump = wx => (fbm(wx / 230, 11) - 0.5) * 26 * U;
const groundY = sx => Hbase - (elev(CAM + sx) - elev(CAM + hs)) + bump(CAM + sx);
const layerAlt = (f, lx) => clamp(altAt((lx - hs) / f), startAlt(M()) - 100, M().peak);

// ---------------- Drawing helpers ----------------
function seg(x1, y1, x2, y2) { ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); }
function circ(x, y, r, fill) { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fillStyle = fill; ctx.fill(); }
function rrect(x, y, w, h, r, fill) { ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(x, y, w, h, r); else ctx.rect(x, y, w, h); ctx.fillStyle = fill; ctx.fill(); }
const tone = (c, depth) => mix(mix(c, F.skyBot, depth), NIGHT, F.dark * 0.5);

// ---- Sky ----
const SKY = [
  [0.00, '#070b22', '#1a2048'], [0.19, '#0d1640', '#2b2f63'], [0.25, '#3b4a8f', '#f6a96b'],
  [0.31, '#5b9fe0', '#ffd9a8'], [0.40, '#3d8fe0', '#bfe3ff'], [0.62, '#3d8fe0', '#bfe3ff'],
  [0.70, '#5a6fbf', '#ffb37a'], [0.75, '#3a2d6b', '#ff7a59'], [0.81, '#141a45', '#3a2f5e'], [1.00, '#070b22', '#1a2048'],
].map(k => [k[0], C(k[1]), C(k[2])]);

function computeSky() {
  const t = S.time;
  let i = 0; while (i < SKY.length - 2 && t > SKY[i + 1][0]) i++;
  const a = SKY[i], b = SKY[i + 1], k = clamp((t - a[0]) / (b[0] - a[0]), 0, 1);
  F.skyTop = mix(a[1], b[1], k); F.skyBot = mix(a[2], b[2], k);
  F.day = daylight(); F.dark = 1 - F.day;
  const hi = clamp((curAlt() - 2500) / 3000, 0, 0.35) * F.day;
  F.skyTop = mix(F.skyTop, [22, 52, 150], hi);
}

function drawSky() {
  const g = ctx.createLinearGradient(0, 0, 0, H * 0.8);
  g.addColorStop(0, rgb(F.skyTop)); g.addColorStop(1, rgb(F.skyBot));
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  // stars
  if (F.day < 0.9) {
    ctx.fillStyle = '#fff';
    for (const s of STARS) {
      const a = (1 - F.day) * (0.55 + 0.45 * Math.sin(T * 2 + s.p));
      ctx.globalAlpha = a; ctx.fillRect(s.x * W, s.y * H, s.s, s.s);
    }
    ctx.globalAlpha = 1;
  }
  // sun & moon
  const body = (ang, isSun) => {
    const x = W * 0.5 - Math.cos(ang) * W * 0.42, y = H * 0.66 - Math.sin(ang) * H * 0.55;
    if (Math.sin(ang) < -0.15) return;
    if (isSun) {
      const gr = ctx.createRadialGradient(x, y, 4, x, y, 90 * U);
      gr.addColorStop(0, 'rgba(255,240,200,0.9)'); gr.addColorStop(0.25, 'rgba(255,210,120,0.35)'); gr.addColorStop(1, 'rgba(255,200,120,0)');
      ctx.fillStyle = gr; ctx.fillRect(x - 90 * U, y - 90 * U, 180 * U, 180 * U);
      circ(x, y, 20 * U, '#fff4cf');
    } else {
      const gr = ctx.createRadialGradient(x, y, 4, x, y, 60 * U);
      gr.addColorStop(0, 'rgba(220,230,255,0.35)'); gr.addColorStop(1, 'rgba(220,230,255,0)');
      ctx.fillStyle = gr; ctx.fillRect(x - 60 * U, y - 60 * U, 120 * U, 120 * U);
      circ(x, y, 14 * U, '#eef2ff');
      circ(x + 6 * U, y - 3 * U, 12 * U, rgb(F.skyTop, 0.85));
    }
  };
  const ang = (S.time - 0.25) * Math.PI * 2;
  body(ang, true); body(ang + Math.PI, false);
}

function drawCloud(x, y, s, col, a) {
  ctx.fillStyle = rgb(col, a);
  ctx.beginPath();
  ctx.ellipse(x, y, 34 * s, 13 * s, 0, 0, Math.PI * 2);
  ctx.ellipse(x - 24 * s, y + 3 * s, 20 * s, 10 * s, 0, 0, Math.PI * 2);
  ctx.ellipse(x + 26 * s, y + 3 * s, 22 * s, 10 * s, 0, 0, Math.PI * 2);
  ctx.ellipse(x - 6 * s, y - 10 * s, 19 * s, 14 * s, 0, 0, Math.PI * 2);
  ctx.ellipse(x + 12 * s, y - 7 * s, 16 * s, 12 * s, 0, 0, Math.PI * 2);
  ctx.fill();
}
function drawClouds(f, y0, spacing, scale, alpha, seed) {
  const off = CAM * f + T * (5 + f * 40);
  const col = mix(mix([255, 255, 255], F.skyBot, 0.25), [40, 45, 80], F.dark * 0.75);
  const k0 = Math.floor(off / spacing) - 1, k1 = Math.ceil((off + W) / spacing) + 1;
  for (let k = k0; k <= k1; k++) {
    if (hash2(k, seed + 3) < 0.35) continue;
    const x = k * spacing + hash2(k, seed) * spacing * 0.5 - off;
    const y = y0 + hash2(k, seed + 7) * 50 * U;
    drawCloud(x, y, scale * U * (0.6 + hash2(k, seed + 5) * 0.8), col, alpha);
  }
}

function drawBigPeak() {
  const m = M(), p = progress();
  const bx = W * (0.8 - 0.3 * p), base = H * 0.64, h = H * (0.3 + 0.14 * p), w = h * 2.3;
  const col = tone(C(m.color), 0.42);
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(bx - w, base);
  ctx.quadraticCurveTo(bx - w * 0.42, base - h * 0.32, bx - w * 0.075, base - h);
  ctx.lineTo(bx + w * 0.07, base - h * 0.985);
  ctx.quadraticCurveTo(bx + w * 0.42, base - h * 0.3, bx + w, base);
  ctx.closePath();
  const gr = ctx.createLinearGradient(bx - w * 0.3, 0, bx + w * 0.3, 0);
  gr.addColorStop(0, rgb(shade(col, 1.12))); gr.addColorStop(1, rgb(shade(col, 0.88)));
  ctx.fillStyle = gr; ctx.fill();
  ctx.clip();
  // gullies
  ctx.strokeStyle = rgb(shade(col, 0.78), 0.55); ctx.lineWidth = 2 * U;
  for (let i = -4; i <= 4; i++) {
    ctx.beginPath(); ctx.moveTo(bx + i * w * 0.012, base - h * 0.97);
    ctx.quadraticCurveTo(bx + i * w * 0.06, base - h * 0.5, bx + i * w * 0.16, base); ctx.stroke();
  }
  // cap (sand/snow)
  if (m.cap) {
    const capCol = m.cap === 'snow' ? tone([240, 246, 252], 0.15) : tone([150, 135, 120], 0.3);
    ctx.fillStyle = rgb(capCol);
    ctx.beginPath(); ctx.moveTo(bx - w * 0.5, base - h * 0.62);
    for (let i = 0; i <= 20; i++) { const u = i / 20; ctx.lineTo(bx - w * 0.5 + u * w, base - h * (0.62 + 0.06 * Math.sin(u * 23))); }
    ctx.lineTo(bx + w, base - h * 1.2); ctx.lineTo(bx - w, base - h * 1.2); ctx.closePath(); ctx.fill();
  }
  ctx.restore();
  // smoke / volcanic puffs
  if (m.smoke > 0) {
    const n = 7;
    for (let i = 0; i < n; i++) {
      const ph = (T * 0.07 * (0.6 + m.smoke) + i / n) % 1;
      const r = (6 + ph * 34) * U * (0.5 + m.smoke * 0.6);
      const c = tone([200, 200, 205], 0.25);
      ctx.fillStyle = rgb(c, (1 - ph) * 0.55 * m.smoke + 0.05);
      ctx.beginPath(); ctx.arc(bx + ph * w * 0.28 + Math.sin(ph * 6 + i) * 6, base - h - ph * h * 0.7, r, 0, Math.PI * 2); ctx.fill();
    }
  }
}

function drawRange(f, baseY, amp, scale, col, seed, peaky) {
  const off = CAM * f;
  const gr = ctx.createLinearGradient(0, baseY - amp, 0, baseY + H * 0.12);
  gr.addColorStop(0, rgb(col)); gr.addColorStop(1, rgb(mix(col, F.skyBot, 0.35)));
  ctx.fillStyle = gr; ctx.beginPath(); ctx.moveTo(0, H);
  for (let sx = 0; sx <= W + 6; sx += 6) {
    let n = fbm((sx + off) / scale, seed);
    if (peaky) n = (1 - Math.abs(n * 2 - 1)) * 0.6 + fbm((sx + off) / (scale * 0.4), seed + 3) * 0.4;
    ctx.lineTo(sx, baseY - n * amp);
  }
  ctx.lineTo(W, H); ctx.closePath(); ctx.fill();
}

function drawCloudSea() {
  const al = clamp((curAlt() - 2300) / 800, 0, 0.88);
  if (al <= 0.01) return;
  const off = CAM * 0.2 + T * 10, y0 = H * 0.63;
  const c = mix(mix([255, 255, 255], F.skyBot, 0.15), [50, 55, 90], F.dark * 0.7);
  ctx.fillStyle = rgb(c, al);
  ctx.beginPath(); ctx.moveTo(0, H);
  for (let sx = 0; sx <= W + 8; sx += 8) ctx.lineTo(sx, y0 - fbm((sx + off) / 110, 77) * H * 0.07);
  ctx.lineTo(W, H); ctx.closePath(); ctx.fill();
}

function drawBirds() {
  if (F.day < 0.4) return;
  const cyc = 45, t = (T % cyc) / cyc;
  if (t > 0.6) return;
  const bx = -80 + (t / 0.6) * (W + 160), by = H * 0.24 + Math.sin(T * 0.6) * 14 * U;
  ctx.strokeStyle = rgb(tone([40, 40, 50], 0.2)); ctx.lineWidth = 1.6 * U;
  for (let i = 0; i < 5; i++) {
    const x = bx - i * 20 * U, y = by + (i % 2 ? 9 : -4) * U * (i * 0.5), fl = Math.sin(T * 9 + i) * 4 * U;
    ctx.beginPath(); ctx.moveTo(x - 7 * U, y - fl); ctx.quadraticCurveTo(x - 3 * U, y - 2 * U, x, y);
    ctx.quadraticCurveTo(x + 3 * U, y - 2 * U, x + 7 * U, y - fl); ctx.stroke();
  }
}

// ---- Vegetation ----
function treePine(x, y, h, c) {
  ctx.fillStyle = rgb(shade(c, 0.55)); ctx.fillRect(x - h * 0.035, y - h * 0.24, h * 0.07, h * 0.24);
  for (let i = 0; i < 3; i++) {
    const by = y - h * 0.15 - i * h * 0.24, w = h * (0.3 - i * 0.065);
    ctx.fillStyle = rgb(c);
    ctx.beginPath(); ctx.moveTo(x - w, by); ctx.lineTo(x + w, by); ctx.lineTo(x, by - h * 0.42); ctx.closePath(); ctx.fill();
    ctx.fillStyle = rgb(shade(c, 1.3), 0.35);
    ctx.beginPath(); ctx.moveTo(x, by - h * 0.42); ctx.lineTo(x + w, by); ctx.lineTo(x, by); ctx.closePath(); ctx.fill();
  }
}
function treeRound(x, y, h, c) {
  ctx.fillStyle = rgb(shade(c, 0.5)); ctx.fillRect(x - h * 0.035, y - h * 0.5, h * 0.07, h * 0.5);
  const cc = rgb(c);
  circ(x - h * 0.18, y - h * 0.56, h * 0.2, cc); circ(x + h * 0.18, y - h * 0.58, h * 0.21, cc); circ(x, y - h * 0.74, h * 0.25, cc);
  circ(x + h * 0.07, y - h * 0.8, h * 0.13, rgb(shade(c, 1.3), 0.35));
}
function treePalm(x, y, h, c) {
  const tx = x + h * 0.14, ty = y - h;
  ctx.strokeStyle = rgb(mix(c, [100, 80, 55], 0.6)); ctx.lineWidth = h * 0.05; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x - h * 0.08, y - h * 0.5, tx, ty); ctx.stroke();
  ctx.strokeStyle = rgb(c); ctx.lineWidth = h * 0.04;
  for (let i = 0; i < 7; i++) {
    const a = -Math.PI + (i / 6) * Math.PI, dx = Math.cos(a);
    ctx.beginPath(); ctx.moveTo(tx, ty);
    ctx.quadraticCurveTo(tx + dx * h * 0.25, ty - h * 0.14 + Math.abs(dx) * h * 0.02, tx + dx * h * 0.38, ty + h * 0.1 + (1 - Math.abs(dx)) * -h * 0.1);
    ctx.stroke();
  }
}
function treeShrub(x, y, h, c) {
  const cc = rgb(c);
  circ(x - h * 0.2, y - h * 0.18, h * 0.2, cc); circ(x + h * 0.18, y - h * 0.2, h * 0.22, cc); circ(x, y - h * 0.34, h * 0.24, cc);
  circ(x + h * 0.05, y - h * 0.46, h * 0.1, rgb(mix(c, [190, 60, 40], 0.55), 0.85));
  circ(x - h * 0.15, y - h * 0.32, h * 0.07, rgb(mix(c, [190, 60, 40], 0.55), 0.7));
}
function treeDead(x, y, h, c) {
  ctx.strokeStyle = rgb(mix(c, [225, 222, 215], 0.45)); ctx.lineCap = 'round';
  ctx.lineWidth = h * 0.05; seg(x, y, x + h * 0.03, y - h);
  ctx.lineWidth = h * 0.025;
  seg(x + h * 0.01, y - h * 0.5, x - h * 0.22, y - h * 0.72); seg(x + h * 0.02, y - h * 0.68, x + h * 0.2, y - h * 0.86);
  seg(x - h * 0.12, y - h * 0.62, x - h * 0.16, y - h * 0.8);
}
function rock(x, y, s, c) {
  ctx.fillStyle = rgb(c); ctx.beginPath();
  ctx.moveTo(x - s, y); ctx.lineTo(x - s * 0.8, y - s * 0.55); ctx.lineTo(x - s * 0.2, y - s * 0.85);
  ctx.lineTo(x + s * 0.5, y - s * 0.7); ctx.lineTo(x + s, y - s * 0.15); ctx.lineTo(x + s, y); ctx.closePath(); ctx.fill();
  ctx.fillStyle = rgb(shade(c, 1.25), 0.5); ctx.beginPath();
  ctx.moveTo(x - s * 0.2, y - s * 0.85); ctx.lineTo(x + s * 0.5, y - s * 0.7); ctx.lineTo(x + s * 0.1, y - s * 0.4); ctx.closePath(); ctx.fill();
}
function edelweiss(x, y, s) {
  ctx.strokeStyle = rgb(tone([90, 120, 70], 0)); ctx.lineWidth = 1.5 * s; seg(x, y, x, y - 12 * s);
  const fc = rgb(tone([245, 245, 235], 0));
  for (let i = 0; i < 7; i++) {
    const a = i / 7 * Math.PI * 2;
    ctx.fillStyle = fc; ctx.beginPath(); ctx.ellipse(x + Math.cos(a) * 3.5 * s, y - 13 * s + Math.sin(a) * 3.5 * s, 3 * s, 1.5 * s, a, 0, Math.PI * 2); ctx.fill();
  }
  circ(x, y - 13 * s, 1.8 * s, rgb(tone([230, 200, 80], 0)));
}
function grassTuft(x, y, h, c) {
  ctx.strokeStyle = rgb(c); ctx.lineWidth = Math.max(1.5, h * 0.06); ctx.lineCap = 'round';
  for (let i = -3; i <= 3; i++) {
    ctx.beginPath(); ctx.moveTo(x + i * h * 0.06, y);
    ctx.quadraticCurveTo(x + i * h * 0.1, y - h * 0.6, x + i * h * 0.22, y - h * (0.85 - Math.abs(i) * 0.08)); ctx.stroke();
  }
}
function drawTree(type, x, y, h, c) {
  switch (type) {
    case 'pine': return treePine(x, y, h, c);
    case 'round': return treeRound(x, y, h, c);
    case 'palm': return treePalm(x, y, h, c);
    case 'shrub': return treeShrub(x, y, h * 0.55, c);
    case 'dead': return treeDead(x, y, h * 0.8, c);
    case 'rock': return rock(x, y, h * 0.22, c);
  }
}
function pickTree(a, r) {
  switch (biomeIdx(a)) {
    case 0: return r < 0.5 ? 'round' : r < 0.78 ? 'palm' : r < 0.9 ? 'pine' : null;
    case 1: return r < 0.66 ? 'pine' : r < 0.86 ? 'round' : null;
    case 2: return r < 0.2 ? 'shrub' : r < 0.3 ? 'pine' : r < 0.36 ? 'dead' : null;
    case 3: return r < 0.1 ? 'dead' : r < 0.24 ? 'rock' : null;
    default: return r < 0.18 ? 'rock' : null;
  }
}

function drawHillLayer(f, baseY, amp, scale, depth, treeScale, seed, spacing) {
  const off = CAM * f;
  const yAt = sx => baseY - fbm((sx + off) / scale, seed) * amp;
  // trees (behind the hill line so trunks get buried)
  const k0 = Math.floor((off - 150) / spacing) - 1, k1 = Math.ceil((off + W + 150) / spacing) + 1;
  for (let k = k0; k <= k1; k++) {
    const lx = k * spacing + hash2(k, seed * 13) * spacing * 0.9, sx = lx - off;
    if (sx < -120 || sx > W + 120) continue;
    const ta = layerAlt(f, lx);
    const type = pickTree(ta + (hash2(k, seed + 99) - 0.5) * 160, hash2(k, seed * 7 + 1));
    if (!type) continue;
    const h = treeScale * U * 120 * (0.75 + hash2(k, seed + 5) * 0.5);
    const c = biomeIdx(ta) >= 3 && type === 'rock' ? biomeColor(ta, 'hill') : biomeColor(ta, 'tree');
    drawTree(type, sx, yAt(sx) + 5 * U, h, tone(shade(c, 0.88 + hash2(k, seed + 8) * 0.24), depth));
  }
  const gr = ctx.createLinearGradient(0, 0, W, 0);
  for (let i = 0; i <= 2; i++) gr.addColorStop(i / 2, rgb(tone(shade(biomeColor(layerAlt(f, i / 2 * W + off), 'hill'), 0.85), depth)));
  ctx.fillStyle = gr; ctx.beginPath(); ctx.moveTo(0, H);
  for (let sx = 0; sx <= W + 6; sx += 6) ctx.lineTo(sx, yAt(sx));
  ctx.lineTo(W, H); ctx.closePath(); ctx.fill();
}

// ---- Ground layer (parallax factor 1) ----
function drawGroundTrees() {
  const sp = 240, seed = 6, k0 = Math.floor((CAM - 200) / sp) - 1, k1 = Math.ceil((CAM + W + 200) / sp) + 1;
  for (let k = k0; k <= k1; k++) {
    const lx = k * sp + hash2(k, seed) * sp * 0.8, sx = lx - CAM;
    if (sx < -150 || sx > W + 150) continue;
    const ta = layerAlt(1, lx);
    const type = pickTree(ta + (hash2(k, 61) - 0.5) * 120, hash2(k, 62));
    if (!type) continue;
    const h = U * 140 * (0.8 + hash2(k, 63) * 0.4);
    drawTree(type, sx, groundY(sx) + 4 * U, h, tone(shade(biomeColor(ta, type === 'rock' ? 'soil' : 'tree'), 0.95), 0.04));
  }
}

function drawGround() {
  const pts = [];
  for (let sx = -10; sx <= W + 18; sx += 8) pts.push([sx, groundY(sx)]);
  const gG = ctx.createLinearGradient(0, 0, W, 0), sG = ctx.createLinearGradient(0, 0, W, 0);
  for (let i = 0; i <= 4; i++) {
    const a = layerAlt(1, CAM + (i / 4) * W);
    gG.addColorStop(i / 4, rgb(tone(biomeColor(a, 'ground'), 0)));
    sG.addColorStop(i / 4, rgb(tone(biomeColor(a, 'soil'), 0)));
  }
  // soil body
  ctx.beginPath(); ctx.moveTo(-10, H);
  pts.forEach(p => ctx.lineTo(p[0], p[1]));
  ctx.lineTo(W + 18, H); ctx.closePath();
  ctx.fillStyle = sG; ctx.fill();
  const vg = ctx.createLinearGradient(0, Hbase, 0, H);
  vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.35)');
  ctx.fillStyle = vg; ctx.fill();
  // grass band
  ctx.beginPath();
  pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
  for (let i = pts.length - 1; i >= 0; i--) ctx.lineTo(pts[i][0], pts[i][1] + 15 * U);
  ctx.closePath(); ctx.fillStyle = gG; ctx.fill();
  // trail
  const tc = tone(mix(biomeColor(curAlt(), 'soil'), [205, 175, 135], 0.45), 0);
  ctx.strokeStyle = rgb(tc); ctx.lineWidth = 6 * U; ctx.lineCap = 'round'; ctx.beginPath();
  pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1] + 9 * U) : ctx.moveTo(p[0], p[1] + 9 * U)));
  ctx.stroke();
  // pebbles in soil
  const sp = 46, k0 = Math.floor(CAM / sp) - 1, k1 = Math.ceil((CAM + W) / sp) + 1;
  for (let k = k0; k <= k1; k++) {
    if (hash2(k, 71) < 0.45) continue;
    const sx = k * sp + hash2(k, 72) * sp - CAM;
    const y = groundY(sx) + (24 + hash2(k, 73) * (H - Hbase) * 0.7) * U;
    ctx.fillStyle = rgb(tone(shade(biomeColor(layerAlt(1, sx + CAM), 'soil'), 0.75), 0), 0.8);
    ctx.beginPath(); ctx.ellipse(sx, y, (2 + hash2(k, 74) * 4) * U, (1.5 + hash2(k, 75) * 2) * U, 0, 0, Math.PI * 2); ctx.fill();
  }
}

function drawSign(x, y, lines) {
  const s = U;
  ctx.font = `600 ${10 * s}px Fredoka, sans-serif`;
  const w = Math.max(...lines.map(l => ctx.measureText(l).width)) + 14 * s, h = lines.length * 12 * s + 8 * s, top = y - 30 * s - h;
  ctx.fillStyle = rgb(tone([107, 68, 35], 0));
  ctx.fillRect(x - w / 2 + 5 * s, top, 4 * s, y - top); ctx.fillRect(x + w / 2 - 9 * s, top, 4 * s, y - top);
  rrect(x - w / 2, top, w, h, 3 * s, rgb(tone([141, 90, 43], 0)));
  ctx.strokeStyle = rgb(tone([90, 54, 24], 0)); ctx.lineWidth = 1.5 * s; ctx.strokeRect(x - w / 2 + 2 * s, top + 2 * s, w - 4 * s, h - 4 * s);
  ctx.fillStyle = rgb(tone([255, 243, 214], 0)); ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  lines.forEach((l, i) => ctx.fillText(l, x, top + 5 * s + i * 12 * s));
}
function drawShelter(x, y) {
  const s = U, wood = rgb(tone([110, 72, 40], 0));
  ctx.fillStyle = wood;
  ctx.fillRect(x - 32 * s, y - 42 * s, 4 * s, 42 * s); ctx.fillRect(x + 28 * s, y - 42 * s, 4 * s, 42 * s);
  ctx.fillRect(x - 26 * s, y - 14 * s, 52 * s, 4 * s);
  ctx.fillStyle = rgb(tone([88, 108, 126], 0));
  ctx.beginPath(); ctx.moveTo(x - 42 * s, y - 40 * s); ctx.lineTo(x + 42 * s, y - 40 * s); ctx.lineTo(x + 30 * s, y - 60 * s); ctx.lineTo(x - 30 * s, y - 60 * s); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = rgb(tone([60, 75, 90], 0)); ctx.lineWidth = 1 * s;
  for (let i = -3; i <= 3; i++) seg(x + i * 10 * s, y - 40 * s, x + i * 7.5 * s, y - 60 * s);
}
function drawGate(x, y, name) {
  const s = U, wood = rgb(tone([107, 68, 35], 0));
  ctx.fillStyle = wood;
  ctx.fillRect(x - 52 * s, y - 92 * s, 6 * s, 92 * s); ctx.fillRect(x + 46 * s, y - 92 * s, 6 * s, 92 * s);
  rrect(x - 60 * s, y - 100 * s, 120 * s, 30 * s, 4 * s, rgb(tone([141, 90, 43], 0)));
  ctx.fillStyle = rgb(tone([255, 243, 214], 0)); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = `700 ${11 * s}px Fredoka, sans-serif`; ctx.fillText('BASECAMP', x, y - 91 * s);
  ctx.font = `500 ${9 * s}px Fredoka, sans-serif`; ctx.fillText(name.toUpperCase(), x, y - 79 * s);
  drawFlag(x - 49 * s, y - 120 * s, 16 * s, 10 * s, T); ctx.fillStyle = '#ddd'; ctx.fillRect(x - 50 * s, y - 121 * s, 1.5 * s, 22 * s);
  drawFlag(x + 49 * s, y - 120 * s, 16 * s, 10 * s, T + 1); ctx.fillRect(x + 48 * s, y - 121 * s, 1.5 * s, 22 * s);
}
function drawTugu(x, y, m) {
  const s = U;
  ctx.fillStyle = rgb(tone([149, 165, 166], 0)); ctx.fillRect(x - 18 * s, y - 8 * s, 36 * s, 10 * s);
  ctx.fillStyle = rgb(tone([200, 206, 210], 0));
  ctx.beginPath(); ctx.moveTo(x - 10 * s, y - 8 * s); ctx.lineTo(x - 7 * s, y - 62 * s); ctx.lineTo(x + 7 * s, y - 62 * s); ctx.lineTo(x + 10 * s, y - 8 * s); ctx.closePath(); ctx.fill();
  ctx.fillStyle = rgb(tone([236, 240, 241], 0)); ctx.fillRect(x - 9 * s, y - 68 * s, 18 * s, 6 * s);
  ctx.fillStyle = rgb(tone([110, 120, 125], 0)); ctx.fillRect(x - 5 * s, y - 46 * s, 10 * s, 14 * s);
  ctx.fillStyle = '#ddd'; ctx.fillRect(x - 0.8 * s, y - 122 * s, 1.6 * s, 56 * s);
  drawFlag(x, y - 122 * s, 30 * s, 19 * s, T);
  drawSign(x + 62 * s, y + 4 * s, ['PUNCAK', m.cps[m.cps.length - 1][0].replace(/^Puncak /, '').toUpperCase(), fmtNum(m.peak) + ' MDPL']);
}
function drawFlag(x, y, w, h, t) {
  const N = 10, pt = (i, v) => { const u = i / N; return [x + u * w, y + v * h + Math.sin(t * 7 - u * 4) * h * 0.18 * u]; };
  const band = (v0, v1, col) => {
    ctx.fillStyle = col; ctx.beginPath();
    for (let i = 0; i <= N; i++) { const p = pt(i, v0); i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]); }
    for (let i = N; i >= 0; i--) { const p = pt(i, v1); ctx.lineTo(p[0], p[1]); }
    ctx.closePath(); ctx.fill();
  };
  band(0, 0.5, rgb(tone([232, 38, 43], 0))); band(0.5, 1, rgb(tone([248, 248, 248], 0)));
}

function drawTrailObjects() {
  const m = M(), g = gOf(m), st = startAlt(m);
  // rocks & grass along trail
  const sp = 110, k0 = Math.floor(CAM / sp) - 1, k1 = Math.ceil((CAM + W) / sp) + 1;
  for (let k = k0; k <= k1; k++) {
    const r = hash2(k, 81), sx = k * sp + hash2(k, 82) * sp - CAM, a = layerAlt(1, sx + CAM), b = biomeIdx(a);
    const y = groundY(sx) + 13 * U;
    if (r < 0.3) rock(sx, y, (5 + hash2(k, 83) * 8) * U, tone(shade(biomeColor(a, b >= 3 ? 'hill' : 'soil'), 1.25), 0));
    else if (r < 0.7 && b <= 2) grassTuft(sx, y, (10 + hash2(k, 84) * 8) * U, tone(shade(biomeColor(a, 'ground'), 0.8), 0));
    else if (r < 0.85 && b === 2) edelweiss(sx, y, U);
  }
  // basecamp gate
  const gx = hs + 70 - CAM;
  if (gx > -100 && gx < W + 100) drawGate(gx, groundY(gx) + 10 * U, m.cps[0][0]);
  // checkpoints
  for (let i = 1; i < m.cps.length - 1; i++) {
    const sx = (m.cps[i][1] - st) / g + hs + 30 - CAM;
    if (sx < -150 || sx > W + 200) continue;
    drawShelter(sx + 75 * U, groundY(sx + 75 * U) + 6 * U);
    drawSign(sx, groundY(sx) + 8 * U, [m.cps[i][0], fmtNum(m.cps[i][1]) + ' mdpl']);
  }
  // summit monument
  const tx = camMax(m) + hs + 42 - CAM;
  if (tx > -120 && tx < W + 160) drawTugu(tx, groundY(tx) + 8 * U, m);
}

// ---- Characters ----
function drawHiker(x, y, ph, mode, o = {}) {
  const s = (o.scale || 1) * U;
  const skin = o.skin || '#c68a5c', pants = o.pants || '#2f3e4e', shirt = o.shirt || '#c0392b', pack = o.pack || '#e67e22', hat = o.hat || '#1f2d3a', roll = o.roll || '#2980b9';
  const dk = c => rgb(shade(C(c), 0.68));
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const head = (hx, hy) => {
    circ(hx, hy, 6, skin);
    ctx.fillStyle = hat; ctx.beginPath(); ctx.arc(hx, hy - 1, 6.4, Math.PI, 0); ctx.fill(); ctx.fillRect(hx - 6.6, hy - 2, 13.2, 2.5);
    circ(hx, hy - 8, 2, hat);
    circ(hx + 3.2, hy + 0.6, 0.9, '#1a1a1a');
  };
  if (mode === 'rest') {
    ctx.lineWidth = 5;
    ctx.strokeStyle = dk(pants); seg(-3, -8, 7, -13); seg(7, -13, 11, -1);
    ctx.strokeStyle = pants; seg(-3, -8, 9, -9); seg(9, -9, 14, -1);
    rrect(-25, -24, 12, 24, 4, pack); rrect(-26, -29, 14, 6, 3, roll);
    ctx.strokeStyle = shirt; ctx.lineWidth = 8; seg(-3, -11, -1, -27);
    ctx.lineWidth = 4; seg(0, -24, 7, -17); seg(7, -17, 11, -20);
    ctx.fillStyle = '#ecf0f1'; ctx.fillRect(10, -24, 4, 5);
    ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(12, -26); ctx.quadraticCurveTo(10 + Math.sin(T * 3) * 2, -31, 13, -36); ctx.stroke();
    head(0, -34);
  } else {
    const standing = mode !== 'walk';
    const lean = standing ? 0.02 : 0.14;
    ctx.translate(0, standing ? 0 : -Math.abs(Math.sin(ph)) * 1.6);
    const hipY = -22;
    const leg = (p, col) => {
      const a = standing ? p * 0.12 : Math.sin(p) * 0.6;
      const bend = standing ? 0 : Math.max(0, Math.cos(p)) * 0.8;
      const kx = Math.sin(a) * 11, ky = hipY + Math.cos(a) * 11, a2 = a - bend;
      const fx = kx + Math.sin(a2) * 11, fy = ky + Math.cos(a2) * 11;
      ctx.strokeStyle = col; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(0, hipY); ctx.lineTo(kx, ky); ctx.lineTo(fx, fy); ctx.stroke();
      ctx.strokeStyle = '#3b2a1e'; seg(fx - 1, fy, fx + 4, fy);
    };
    leg(standing ? -1 : ph + Math.PI, dk(pants));
    ctx.save(); ctx.translate(0, hipY); ctx.rotate(lean);
    // back arm
    const ba = standing ? -0.1 : -Math.sin(ph) * 0.5;
    ctx.strokeStyle = dk(shirt); ctx.lineWidth = 4; seg(0, -16, Math.sin(ba) * 12, -16 + Math.cos(ba) * 12);
    // backpack
    const big = o.big, px0 = big ? -18 : -14, pw = big ? 16 : 12, py0 = big ? -36 : -27, phh = big ? 38 : 28;
    rrect(px0, py0, pw, phh, 4, pack);
    ctx.fillStyle = rgb(shade(C(pack), 0.78)); ctx.fillRect(px0 + 2, py0 + phh * 0.55, pw - 4, 3);
    rrect(px0 - 1, py0 - 5, pw + 2, 6, 3, roll);
    // torso
    ctx.strokeStyle = shirt; ctx.lineWidth = 8; seg(0, 0, 0, -17);
    ctx.strokeStyle = rgb(shade(C(pack), 0.65)); ctx.lineWidth = 2; seg(-1, -17, 2, -5);
    head(1, -25);
    // front arm
    if (mode === 'summit') {
      ctx.strokeStyle = shirt; ctx.lineWidth = 4; seg(0, -16, 6, -29);
      ctx.fillStyle = '#ddd'; ctx.fillRect(5.5, -64, 1.6, 42);
      drawFlag(7, -64, 24, 15, T);
    } else if (standing) {
      ctx.strokeStyle = shirt; ctx.lineWidth = 4; seg(0, -16, 3, -4);
    } else {
      const fa = Math.sin(ph) * 0.5 + 0.3, hx = Math.sin(fa) * 12, hy = -16 + Math.cos(fa) * 12;
      ctx.strokeStyle = shirt; ctx.lineWidth = 4; seg(0, -16, hx, hy);
      ctx.strokeStyle = '#9aa4ad'; ctx.lineWidth = 1.6; seg(hx, hy - 3, hx + 7 + Math.sin(ph) * 5, hy + 27);
    }
    ctx.restore();
    leg(standing ? 1 : ph, pants);
  }
  ctx.restore();
}

function drawTent(x, y) {
  const s = U;
  ctx.fillStyle = rgb(tone([240, 147, 43], 0));
  ctx.beginPath(); ctx.moveTo(x - 32 * s, y); ctx.quadraticCurveTo(x - 24 * s, y - 42 * s, x, y - 44 * s); ctx.quadraticCurveTo(x + 24 * s, y - 42 * s, x + 32 * s, y); ctx.closePath(); ctx.fill();
  ctx.fillStyle = rgb(tone([200, 105, 25], 0));
  ctx.beginPath(); ctx.moveTo(x, y - 44 * s); ctx.quadraticCurveTo(x + 24 * s, y - 42 * s, x + 32 * s, y); ctx.lineTo(x, y); ctx.closePath(); ctx.fill();
  ctx.fillStyle = rgb(tone([90, 45, 15], 0));
  ctx.beginPath(); ctx.moveTo(x + 2 * s, y - 32 * s); ctx.lineTo(x - 9 * s, y); ctx.lineTo(x + 13 * s, y); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = rgba(220, 220, 220, 0.6); ctx.lineWidth = 0.8 * s;
  seg(x - 32 * s, y, x - 44 * s, y + 2 * s); seg(x + 32 * s, y, x + 44 * s, y + 2 * s);
}
function rgba(r, g, b, a) { return `rgba(${r},${g},${b},${a})`; }

function drawCampfire(x, y) {
  const s = U;
  for (let i = 0; i < 6; i++) circ(x - 12 * s + i * 4.8 * s, y + 1 * s, 2.6 * s, rgb(tone([120, 120, 120], 0)));
  ctx.strokeStyle = '#5b3a1f'; ctx.lineWidth = 4 * s; ctx.lineCap = 'round';
  seg(x - 10 * s, y, x + 10 * s, y - 5 * s); seg(x + 10 * s, y, x - 10 * s, y - 5 * s);
  const fl = (w, h, col, p) => {
    const k = 1 + Math.sin(T * 13 + p) * 0.12 + Math.sin(T * 7.3 + p) * 0.06;
    ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(x - w * s, y - 3 * s);
    ctx.quadraticCurveTo(x - w * s, y - h * 0.55 * k * s, x + Math.sin(T * 5 + p) * 2 * s, y - h * k * s);
    ctx.quadraticCurveTo(x + w * s, y - h * 0.55 * k * s, x + w * s, y - 3 * s); ctx.closePath(); ctx.fill();
  };
  fl(9, 26, '#e84a1c', 0); fl(6.5, 19, '#ff9a1f', 1.7); fl(4, 11, '#ffe14d', 3.1);
}

function drawActors() {
  const hy = groundY(hs) + 9 * U;
  const n = Math.min(3, lvl('porter'));
  if (R.mode === 'rest') {
    const tx = hs - 60 * U; drawTent(tx, groundY(tx) + 10 * U);
    for (let i = 1; i <= n; i++) { const px = hs - (90 + i * 26) * U; drawHiker(px, groundY(px) + 9 * U, 0, 'rest', PORTER_STYLE[i - 1]); }
    drawHiker(hs, hy, 0, 'rest');
    const fx = hs + 30 * U; drawCampfire(fx, groundY(fx) + 10 * U);
  } else {
    const md = R.mode === 'summit' ? 'stand' : 'walk';
    for (let i = n; i >= 1; i--) { const px = hs - i * 42 * U; drawHiker(px, groundY(px) + 9 * U, R.phase - i * 1.3, md, PORTER_STYLE[i - 1]); }
    drawHiker(hs, hy, R.phase, R.mode === 'summit' ? 'summit' : 'walk');
  }
  if (R.bubble) drawBubble(R.bubble.text, hs, hy - 62 * U, clamp(R.bubble.t, 0, 1));
}

function wrapText(text, maxW) {
  const words = text.split(' '), lines = []; let cur = '';
  for (const w of words) { const t = cur ? cur + ' ' + w : w; if (ctx.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; } else cur = t; }
  if (cur) lines.push(cur); return lines;
}
function drawBubble(text, x, y, a) {
  ctx.save(); ctx.globalAlpha = a;
  const fs = clamp(12 * U, 11, 15);
  ctx.font = `500 ${fs}px Fredoka, sans-serif`;
  const lines = wrapText(text, Math.min(260 * U, W * 0.62));
  const w = Math.max(...lines.map(l => ctx.measureText(l).width)) + 18, h = lines.length * fs * 1.25 + 12;
  const bx = clamp(x - w * 0.35, 8, W - w - 8), by = y - h;
  rrect(bx, by, w, h, 10, 'rgba(255,255,255,0.94)');
  ctx.beginPath(); ctx.moveTo(x - 6, by + h - 1); ctx.lineTo(x + 6, by + h - 1); ctx.lineTo(x, by + h + 8); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#1d2b25'; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  lines.forEach((l, i) => ctx.fillText(l, bx + 9, by + 6 + i * fs * 1.25));
  ctx.restore();
}

function drawForeground() {
  const f = 1.35, off = CAM * f, sp = 58;
  const k0 = Math.floor((off - 60) / sp) - 1, k1 = Math.ceil((off + W + 60) / sp) + 1;
  for (let k = k0; k <= k1; k++) {
    const r = hash2(k, 91); if (r < 0.35) continue;
    const sx = k * sp + hash2(k, 92) * sp - off, a = layerAlt(f, k * sp), b = biomeIdx(a);
    const h = (26 + hash2(k, 93) * 30) * U, y = H + 6 * U;
    const c = tone(shade(biomeColor(a, b >= 3 ? 'hill' : 'tree'), 0.5), 0);
    if (b <= 1) { if (r < 0.75) grassTuft(sx, y, h, c); else treeShrub(sx, y, h * 1.4, c); }
    else if (b === 2) { grassTuft(sx, y, h, tone(shade(BIOMES[2].ground, 0.6), 0)); if (r > 0.8) edelweiss(sx + 8 * U, y - 4 * U, U * 1.4); }
    else rock(sx, y, h * 0.6, c);
  }
}

function drawNight() {
  const d = F.dark; if (d < 0.02) return;
  ctx.fillStyle = `rgba(8,10,35,${d * 0.36})`; ctx.fillRect(0, 0, W, H);
  ctx.globalCompositeOperation = 'lighter';
  const hy = groundY(hs) + 9 * U;
  if (R.mode === 'rest') {
    const fx = hs + 30 * U, fy = groundY(fx);
    const gr = ctx.createRadialGradient(fx, fy, 5, fx, fy, 140 * U);
    gr.addColorStop(0, `rgba(255,150,60,${0.4 * d})`); gr.addColorStop(1, 'rgba(255,150,60,0)');
    ctx.fillStyle = gr; ctx.fillRect(fx - 140 * U, fy - 140 * U, 280 * U, 280 * U);
  } else {
    const hx = hs + 5 * U, hY = hy - 47 * U, str = (0.1 + 0.07 * lvl('headlamp')) * d;
    const gr = ctx.createRadialGradient(hx, hY, 4, hx + 60 * U, hY + 20 * U, 170 * U);
    gr.addColorStop(0, `rgba(255,236,170,${str})`); gr.addColorStop(1, 'rgba(255,236,170,0)');
    ctx.fillStyle = gr; ctx.beginPath(); ctx.moveTo(hx, hY); ctx.lineTo(hx + 210 * U, hY - 30 * U); ctx.lineTo(hx + 210 * U, hY + 120 * U); ctx.closePath(); ctx.fill();
    circ(hx, hY, 2.5 * U, `rgba(255,250,210,${0.9 * d})`);
  }
  for (const p of R.particles) if (p.type === 'glow') {
    const a = Math.max(0, p.life / p.max) * (0.5 + 0.5 * Math.sin(T * 6 + p.seed)) * d;
    const gr = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 8 * U);
    gr.addColorStop(0, `rgba(220,255,120,${a})`); gr.addColorStop(1, 'rgba(220,255,120,0)');
    ctx.fillStyle = gr; ctx.fillRect(p.x - 8 * U, p.y - 8 * U, 16 * U, 16 * U);
  }
  ctx.globalCompositeOperation = 'source-over';
}

// ---- Particles & floating texts ----
function spawn(p) { if (R.particles.length < 260) R.particles.push(Object.assign({ life: 1, max: 1, vx: 0, vy: 0, g: 0, size: 3, color: '#fff', type: 'dot', rot: 0, vr: 0, seed: Math.random() * 9 }, p)); }
function floatText(x, y, text, color) { R.texts.push({ x, y, text, color, life: 1.4 }); if (R.texts.length > 30) R.texts.shift(); }
function updateParticles(dt) {
  for (const p of R.particles) { p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += p.g * dt; p.rot += p.vr * dt; }
  R.particles = R.particles.filter(p => p.life > 0);
  for (const t of R.texts) { t.life -= dt; t.y -= 32 * dt; }
  R.texts = R.texts.filter(t => t.life > 0);
}
function drawParticles() {
  for (const p of R.particles) {
    if (p.type === 'glow') continue;
    const a = clamp(p.life / p.max, 0, 1);
    ctx.globalAlpha = a; ctx.fillStyle = p.color;
    if (p.type === 'confetti') { ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.fillRect(-p.size, -p.size * 0.5, p.size * 2, p.size); ctx.restore(); }
    else { ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill(); }
  }
  ctx.globalAlpha = 1;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  for (const t of R.texts) {
    ctx.globalAlpha = clamp(t.life, 0, 1);
    ctx.font = `700 ${clamp(15 * U, 13, 20)}px Fredoka, sans-serif`;
    ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.strokeText(t.text, t.x, t.y);
    ctx.fillStyle = t.color; ctx.fillText(t.text, t.x, t.y);
  }
  ctx.globalAlpha = 1;
}

// ---------------- Render ----------------
function render() {
  CAM = S.camX;
  computeSky();
  drawSky();
  drawClouds(0.02, H * 0.08, 430 * U, 1.3, 0.85, 5);
  drawBigPeak();
  drawRange(0.05, H * 0.55, H * 0.17, 520, tone(C('#8494b4'), 0.5), 1, false);
  drawClouds(0.08, H * 0.3, 380 * U, 1.0, 0.65, 9);
  drawRange(0.12, H * 0.62, H * 0.17, 330, tone(C('#5f7494'), 0.36), 2, true);
  drawCloudSea();
  drawBirds();
  drawHillLayer(0.3, H * 0.68, H * 0.1, 260, 0.3, 0.42, 3, 46 * U);
  drawHillLayer(0.58, H * 0.76, H * 0.075, 190, 0.14, 0.72, 4, 90 * U);
  drawGroundTrees();
  drawGround();
  drawTrailObjects();
  drawActors();
  drawWeather();
  drawForeground();
  drawNight();
  drawParticles();
  if (R.fade > 0) { ctx.fillStyle = `rgba(0,0,0,${R.fade})`; ctx.fillRect(0, 0, W, H); }
}

// ---------------- Game Logic ----------------
function earn(n) { S.money += n; S.totalEarned += n; }

function update(dt, silent) {
  T += dt; S.playTime += dt;
  S.time = (S.time + dt / DAY_LEN) % 1;
  if (!silent) {
    updateWeather(dt);
    updateAmbient(dt);
  }
  if (R.boost > 0) R.boost = Math.max(0, R.boost - dt);
  if (R.bubble) { R.bubble.t -= dt; if (R.bubble.t <= 0) R.bubble = null; }
  const pi = porterIncome() * dt; if (pi > 0) earn(pi);
  const m = M();

  if (R.fadeDir === 0) {
    if (R.mode === 'walk') {
      const before = curAlt();
      S.camX = Math.min(camMax(m), S.camX + speed() * dt);
      const gained = curAlt() - before;
      if (gained > 0) { earn(gained * incomeMult()); S.totalAlt += gained; }
      const oldPhase = R.phase;
      R.phase += dt * speed() * 0.09;
      if (!silent && Math.floor(R.phase / Math.PI) !== Math.floor(oldPhase / Math.PI)) {
        SFX.step();
      }
      S.stamina -= drainRate() * dt;
      while (R.mode === 'walk' && S.pos < m.cps.length - 1 && curAlt() >= m.cps[S.pos + 1][1] - 0.01) { S.pos++; reachCheckpoint(S.pos, silent); }
      if (R.mode === 'walk' && S.stamina <= 0) {
        S.stamina = 0; R.mode = 'rest';
        if (!silent) { SFX.camp(); addLog('⛺ Kelelahan... mendirikan tenda & istirahat.'); }
      }
      if (!silent) {
        R.eventT -= dt; if (R.eventT <= 0) { R.eventT = 16 + Math.random() * 22; randomEvent(); }
        if (Math.random() < dt * 5) spawn({ x: hs - 2 * U, y: groundY(hs) + 9 * U, vx: -40 - Math.random() * 30, vy: -12 - Math.random() * 10, life: 0.6, max: 0.6, size: (1.5 + Math.random() * 2) * U, color: 'rgba(200,180,150,0.6)' });
        if (R.boost > 0 && Math.random() < dt * 20) spawn({ x: hs + (Math.random() - 0.5) * 30 * U, y: groundY(hs) - Math.random() * 50 * U, vx: -80, vy: -10, life: 0.5, max: 0.5, size: 2 * U, color: '#ffe066' });
      }
    } else if (R.mode === 'rest') {
      S.stamina += regenRate() * dt;
      if (!silent && Math.random() < dt * 8) { const fx = hs + 30 * U; spawn({ x: fx + (Math.random() - 0.5) * 8, y: groundY(fx) - 12 * U, vx: (Math.random() - 0.5) * 20, vy: -40 - Math.random() * 40, life: 1, max: 1, size: 1.4 * U, color: '#ffb347' }); }
      if (S.stamina >= maxStam()) { S.stamina = maxStam(); R.mode = 'walk'; if (!silent) addLog('🥾 Stamina pulih, lanjut mendaki!'); }
    } else if (R.mode === 'summit') {
      R.summitT += dt;
      if (!silent && R.summitT < 4) for (let i = 0; i < 3; i++) if (Math.random() < dt * 30) spawn({ type: 'confetti', x: Math.random() * W, y: -10, vx: (Math.random() - 0.5) * 60, vy: 60 + Math.random() * 80, g: 30, life: 4, max: 4, size: 4 * U, vr: (Math.random() - 0.5) * 10, color: ['#e8262b', '#ffffff', '#f4b942', '#3ddc84'][Math.floor(Math.random() * 4)] });
      if (R.summitT > 3 && !R.summitModal) { R.summitModal = true; showSummitModal(); }
    }
  }
  // fireflies at night in forests
  if (!silent && F.dark > 0.5 && biomeIdx(curAlt()) <= 1 && Math.random() < dt * 3)
    spawn({ type: 'glow', x: Math.random() * W, y: H * (0.62 + Math.random() * 0.2), vx: -20 + (Math.random() - 0.5) * 20, vy: (Math.random() - 0.5) * 10, life: 4, max: 4 });

  // modal auto-continue
  if (R.modalAuto) {
    R.modalAuto.t -= dt;
    const el = $('#autoCount'); if (el) el.textContent = Math.ceil(Math.max(0, R.modalAuto.t));
    if (R.modalAuto.t <= 0) { const fn = R.modalAuto.fn; hideModal(); fn(); }
  }
  // fade transitions
  if (R.fadeDir === 1) { R.fade += dt * 2.5; if (R.fade >= 1) { R.fade = 1; R.fadeDir = -1; R.fadeCb && R.fadeCb(); R.fadeCb = null; } }
  else if (R.fadeDir === -1) { R.fade -= dt * 2; if (R.fade <= 0) { R.fade = 0; R.fadeDir = 0; } }
  if (!silent) updateParticles(dt); else if (R.particles.length) R.particles.length = 0;
}

function reachCheckpoint(i, silent) {
  const m = M(), cp = m.cps[i];
  if (i === m.cps.length - 1) { summit(silent); return; }
  const bonus = 20 * i * incomeMult();
  earn(bonus);
  S.stamina = Math.min(maxStam(), S.stamina + maxStam() * 0.3);
  if (silent) return;
  SFX.checkpoint();
  toast(`📍 ${cp[0]} · ${fmtNum(cp[1])} mdpl`);
  addLog(`📍 Tiba di ${cp[0]} (${fmtNum(cp[1])} mdpl). Bonus Rp ${fmt(bonus)}`);
  floatText(hs, groundY(hs) - 80 * U, '+Rp ' + fmt(bonus), '#ffe066');
}

function summit(silent) {
  const m = M();
  R.mode = 'summit'; R.summitT = 0; R.summitModal = false;
  R.summitBonus = 250 * incomeMult();
  earn(R.summitBonus);
  S.summits[m.id] = (S.summits[m.id] || 0) + 1; S.totalSummits++;
  R.justUnlocked = null;
  if (S.mtn + 1 < MOUNTAINS.length && S.unlocked < S.mtn + 2) { S.unlocked = S.mtn + 2; R.justUnlocked = MOUNTAINS[S.mtn + 1]; }
  addLog(`🇮🇩 PUNCAK! ${m.cps[m.cps.length - 1][0]} ${fmtNum(m.peak)} mdpl. Bonus Rp ${fmt(R.summitBonus)}`);
  if (R.justUnlocked) addLog(`🔓 ${R.justUnlocked.name} terbuka!`);
  renderMountains();
  if (!silent) {
    SFX.summit();
    toast(`🇮🇩 PUNCAK ${fmtNum(m.peak)} MDPL!`);
    floatText(hs, groundY(hs) - 90 * U, '+Rp ' + fmt(R.summitBonus), '#ffe066');
  }
}

function changeMountain(i) {
  R.modalAuto = null;
  const go = () => {
    S.mtn = i; S.camX = 0; S.pos = 0; S.stamina = maxStam();
    R.mode = 'walk'; R.summitModal = false; R.bubble = null; R.eventT = 12;
    buildTicks(); renderMountains();
    addLog(`🚩 Memulai pendakian ${MOUNTAINS[i].name} dari ${MOUNTAINS[i].cps[0][0]}.`);
    toast(`🚩 ${MOUNTAINS[i].name}`);
  };
  if (document.hidden) go(); else { R.fadeDir = 1; R.fadeCb = go; }
}

function randomEvent() {
  const a = curAlt(), night = F.dark > 0.6;
  const pool = EVENTS.filter(e => (!e.minAlt || a >= e.minAlt) && (!e.maxAlt || a <= e.maxAlt) && (!e.night || night));
  const e = pool[Math.floor(Math.random() * pool.length)];
  if (!e) return;
  let extra = '';
  if (e.stam) { S.stamina = clamp(S.stamina + maxStam() * e.stam / 100, 0, maxStam()); floatText(hs + 30 * U, groundY(hs) - 70 * U, (e.stam > 0 ? '+' : '') + e.stam + '% stamina', e.stam > 0 ? '#9ef0a0' : '#ff8a7a'); }
  if (e.money) { const v = e.money * 10 * incomeMult(); earn(v); extra = ` (+Rp ${fmt(v)})`; floatText(hs + 30 * U, groundY(hs) - 90 * U, '+Rp ' + fmt(v), '#ffe066'); }
  R.bubble = { text: e.t, t: 4.5 };
  addLog(e.t + extra);
}

// ---------------- Input ----------------
function tap(x, y) {
  if (R.modalOpen) return;
  R.taps++; if (R.taps === 6) $('#tapHint').classList.add('gone');
  if (R.mode === 'walk') {
    R.boost = Math.min(6, R.boost + 0.6);
    SFX.boost();
    floatText(x, y, '⚡ Semangat!', '#fff3a0');
    for (let i = 0; i < 8; i++) spawn({ x, y, vx: (Math.random() - 0.5) * 160, vy: (Math.random() - 0.5) * 160, life: 0.5, max: 0.5, size: 2.2 * U, color: '#ffe066' });
  } else if (R.mode === 'rest') {
    S.stamina = Math.min(maxStam(), S.stamina + maxStam() * 0.04);
    playTone(330, 'sine', 0.1, 0.05);
    floatText(x, y, '+Stamina', '#9ef0a0');
  } else {
    SFX.boost();
    floatText(x, y, '🇮🇩 Merdeka!', '#ffffff');
  }
}
canvas.addEventListener('pointerdown', e => { const r = canvas.getBoundingClientRect(); tap(e.clientX - r.left, e.clientY - r.top); });
window.addEventListener('keydown', e => { if (e.code === 'Space' && !R.modalOpen) { e.preventDefault(); tap(hs + 40 * U, groundY(hs) - 80 * U); } });

// ---------------- UI ----------------
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.remove('show'); void t.offsetWidth; t.classList.add('show'); }

function addLog(text) {
  const d = new Date(), time = d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  S.log.unshift({ time, text }); if (S.log.length > 50) S.log.length = 50;
  const ul = $('#log'); if (!ul) return;
  const li = document.createElement('li'); li.innerHTML = `<time>${time}</time>`; li.appendChild(document.createTextNode(text));
  ul.prepend(li); while (ul.children.length > 50) ul.lastChild.remove();
}
function renderLog() {
  const ul = $('#log'); ul.innerHTML = '';
  S.log.forEach(l => { const li = document.createElement('li'); li.innerHTML = `<time>${l.time}</time>`; li.appendChild(document.createTextNode(l.text)); ul.appendChild(li); });
}

const cost = u => Math.ceil(u.base * Math.pow(u.growth, lvl(u.id)));
function buildGear() {
  const el = $('#tab-gear');
  el.innerHTML = UPGRADES.map(u => `<button class="upg" data-id="${u.id}"><div class="ico">${u.icon}</div><div class="info"><div class="name">${u.name}<span class="lv"></span></div><div class="desc"></div></div><div class="cost"></div></button>`).join('');
  el.querySelectorAll('.upg').forEach(b => b.addEventListener('click', () => buy(b.dataset.id)));
}
function refreshGear() {
  document.querySelectorAll('.upg').forEach(b => {
    const u = UPG[b.dataset.id], l = lvl(u.id), maxed = u.max && l >= u.max, c = cost(u);
    b.querySelector('.lv').textContent = l ? `Lv ${l}${u.max ? '/' + u.max : ''}` : '';
    b.querySelector('.desc').textContent = u.desc(l);
    b.querySelector('.cost').textContent = maxed ? 'MAKS' : 'Rp ' + fmt(c);
    b.classList.toggle('maxed', !!maxed);
    b.classList.toggle('afford', !maxed && S.money >= c);
    b.classList.toggle('poor', !maxed && S.money < c);
  });
}
function buy(id) {
  const u = UPG[id], l = lvl(id);
  if (u.max && l >= u.max) return;
  const c = cost(u); if (S.money < c) return;
  S.money -= c; S.up[id] = l + 1;
  SFX.buy();
  if (id === 'carrier') S.stamina += 25;
  if (id === 'porter') addLog(`🧑🏽 Porter ke-${S.up[id]} bergabung dengan tim!`);
  if (id === 'pemandu' && l === 0) addLog('🧭 Pemandu lokal bergabung, rezeki makin lancar!');
  refreshGear(); updateHUD();
}

function renderMountains() {
  const el = $('#tab-mountains');
  el.innerHTML = MOUNTAINS.map((m, i) => {
    const locked = i >= S.unlocked, cur = i === S.mtn;
    const right = cur ? '<span class="badge">Sedang didaki</span>' : locked ? '<span class="badge lock">Capai puncak sebelumnya</span>' : `<button data-i="${i}">Daki ➜</button>`;
    return `<div class="mcard ${locked ? 'locked' : ''} ${cur ? 'current' : ''}">
      <div class="mhead"><div><div class="mname">${locked ? '🔒 ' : ''}${m.name}</div><div class="mloc">📍 ${m.loc}</div></div>
      <div class="mpeak">${fmtNum(m.peak)}<small> mdpl</small></div></div>
      <div class="mdesc">${m.desc}</div>
      <div class="mfoot"><span>💰 x${m.mult}</span><span>🏁 ${S.summits[m.id] || 0}x puncak</span>${right}</div></div>`;
  }).join('');
  el.querySelectorAll('button[data-i]').forEach(b => b.addEventListener('click', () => {
    const i = +b.dataset.i;
    if (R.mode !== 'summit' && S.pos > 0 && !confirm('Progres pendakian saat ini akan hilang. Pindah gunung?')) return;
    hideModal(); changeMountain(i);
  }));
}

function buildTicks() {
  const m = M(), st = startAlt(m), el = $('#ticks');
  el.innerHTML = m.cps.slice(1, -1).map(cp => `<div class="tick" style="left:${((cp[1] - st) / (m.peak - st)) * 100}%"></div>`).join('');
}

function updateHUD() {
  const m = M(), a = curAlt();
  $('#money').textContent = 'Rp ' + fmt(S.money);
  const walking = R.mode === 'walk';
  const inc = porterIncome() + (walking ? climbRate() * incomeMult() : 0);
  $('#income').textContent = `+Rp ${fmt(inc)}/dtk`;
  $('#mtnName').textContent = m.name;
  $('#mtnLoc').textContent = '📍 ' + m.loc;
  $('#alt').textContent = fmtNum(a);
  $('#progFill').style.width = (progress() * 100).toFixed(2) + '%';
  const next = m.cps[Math.min(S.pos + 1, m.cps.length - 1)];
  $('#nextPos').textContent = R.mode === 'summit' ? '🇮🇩 Kamu di puncak!' : `Menuju: ${next[0]} (${fmtNum(next[1])} mdpl) · ${fmtNum(Math.max(0, next[1] - a))} m lagi`;
  const sp = S.stamina / maxStam();
  const sf = $('#stamFill'); sf.style.width = (sp * 100).toFixed(1) + '%'; sf.classList.toggle('low', sp < 0.25);
  const night = F.dark > 0.6 ? ' 🌙' : '';
  const wthIcon = R.weather === 'rain' ? ' 🌧️' : (R.weather === 'mist' ? ' 🌫️' : '');
  $('#stateText').textContent = (R.mode === 'rest' ? '⛺ Istirahat' : R.mode === 'summit' ? '🇮🇩 Di Puncak!' : R.boost > 0 ? '⚡ Semangat!' : '🥾 Berjalan') + night + wthIcon;
  $('#rateText').textContent = R.mode === 'rest'
    ? `${Math.floor(S.stamina)}/${maxStam()} · pulih ${regenRate().toFixed(1)}/dtk`
    : `${Math.floor(S.stamina)}/${maxStam()} · naik ${climbRate().toFixed(1)} m/dtk`;
}
function updateStats() {
  const h = Math.floor(S.playTime / 3600), mnt = Math.floor((S.playTime % 3600) / 60);
  $('#stats').innerHTML = [
    ['⛰️ Total ketinggian', fmtNum(S.totalAlt) + ' m'], ['💰 Total pendapatan', 'Rp ' + fmt(S.totalEarned)],
    ['🏁 Puncak dicapai', S.totalSummits + 'x'], ['⏱️ Waktu main', `${h}j ${mnt}m`],
    ['🧑🏽 Porter', lvl('porter')], ['🗻 Gunung terbuka', `${S.unlocked}/${MOUNTAINS.length}`],
  ].map(([k, v]) => `<div class="stat"><b>${v}</b><span>${k}</span></div>`).join('');
}

function showModal(html, btns) {
  $('#modalContent').innerHTML = html;
  const bb = $('#modalBtns'); bb.innerHTML = '';
  btns.forEach(b => {
    const e = document.createElement('button'); e.textContent = b.label; if (b.primary) e.className = 'primary';
    e.addEventListener('click', () => { hideModal(); b.fn && b.fn(); }); bb.appendChild(e);
  });
  $('#modal').classList.remove('hidden'); R.modalOpen = true;
}
function hideModal() { $('#modal').classList.add('hidden'); R.modalOpen = false; R.modalAuto = null; }

function showSummitModal() {
  const m = M(), next = MOUNTAINS[S.mtn + 1], hasNext = !!next && S.mtn + 1 < S.unlocked;
  const btns = [];
  if (hasNext) btns.push({ label: `Daki ${next.name} ➜`, primary: true, fn: () => changeMountain(S.mtn + 1) });
  btns.push({ label: '🔁 Daki Ulang', primary: !hasNext, fn: () => changeMountain(S.mtn) });
  showModal(`<div class="big">🇮🇩</div>
    <h2>${m.cps[m.cps.length - 1][0]}!</h2>
    <p>Kamu berdiri di ketinggian <b>${fmtNum(m.peak)} mdpl</b>. Merdeka!</p>
    <p class="bonus">Bonus puncak: +Rp ${fmt(R.summitBonus)}</p>
    ${R.justUnlocked ? `<p class="unlock">🔓 ${R.justUnlocked.name} sekarang terbuka!</p>` : ''}
    <p class="auto">Otomatis lanjut dalam <span id="autoCount">12</span> dtk</p>`, btns);
  R.modalAuto = { t: 12, fn: hasNext ? () => changeMountain(S.mtn + 1) : () => changeMountain(S.mtn) };
}

// tabs
document.querySelectorAll('.tabs button').forEach(b => b.addEventListener('click', () => {
  document.querySelectorAll('.tabs button').forEach(x => x.classList.toggle('active', x === b));
  document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.id === 'tab-' + b.dataset.tab));
  if (b.dataset.tab === 'log') updateStats();
}));
$('#resetBtn').addEventListener('click', () => {
  if (!confirm('Hapus semua progres dan mulai dari awal?')) return;
  localStorage.removeItem(SAVE_KEY); S = newState(); S.seenIntro = true;
  R.mode = 'walk'; hideModal(); buildTicks(); renderMountains(); renderLog(); refreshGear();
  addLog('🌱 Petualangan baru dimulai di ' + M().name + '.');
});

// ---------------- Offline progress ----------------
function offlineProgress() {
  const el = Math.min(8 * 3600, (Date.now() - S.lastSave) / 1000);
  if (el < 60) return;
  const walkFrac = regenRate() / (regenRate() + 2.5 * Math.pow(0.92, lvl('tongkat')));
  const rate = porterIncome() + BASE_SPEED * (1 + 0.12 * lvl('sepatu')) * gOf(M()) * incomeMult() * walkFrac * 0.35;
  const got = rate * el;
  earn(got);
  const h = Math.floor(el / 3600), mnt = Math.floor((el % 3600) / 60);
  addLog(`🌙 Selama pergi ${h}j ${mnt}m, tim mengumpulkan Rp ${fmt(got)}`);
  showModal(`<div class="big">🏕️</div><h2>Selamat datang kembali!</h2>
    <p>Kamu pergi selama <b>${h} jam ${mnt} menit</b>.</p>
    <p>Para porter & tim pendakian mengumpulkan:</p>
    <p class="bonus">+Rp ${fmt(got)}</p>`, [{ label: 'Lanjut Mendaki 🥾', primary: true }]);
}

function intro() {
  showModal(`<div class="big">⛰️</div><h2>Pendaki Nusantara</h2>
    <p>Jelajahi gunung-gunung Indonesia, dari Papandayan hingga Puncak Carstensz!</p>
    <ul>
      <li>🥾 Pendaki berjalan <b>otomatis</b> & menghasilkan Rupiah tiap meter naik.</li>
      <li>⚡ <b>Klik / tap</b> layar (atau Spasi) untuk Semangat — jalan lebih cepat.</li>
      <li>⛺ Saat stamina habis, pendaki berkemah dulu. Tap untuk mempercepat.</li>
      <li>🎒 Beli perlengkapan & rekrut porter untuk penghasilan pasif.</li>
      <li>🇮🇩 Capai puncak untuk membuka gunung berikutnya.</li>
    </ul>`, [{ label: 'Mulai Mendaki! 🚩', primary: true, fn: () => { S.seenIntro = true; save(); } }]);
}

// ---------------- Main loop ----------------
let last = performance.now();
function loop(now) {
  let dt = (now - last) / 1000; last = now;
  if (dt > 1) { let rem = Math.min(dt, 3600); while (rem > 0) { const st = Math.min(0.2, rem); update(st, true); rem -= st; } dt = 0; }
  update(Math.min(dt, 0.05), false);
  render();
  R.hudT -= dt; if (R.hudT <= 0) { R.hudT = 0.1; updateHUD(); }
  R.uiT -= dt; if (R.uiT <= 0) { R.uiT = 0.3; refreshGear(); if ($('#tab-log').classList.contains('active')) updateStats(); }
  R.saveT -= dt; if (R.saveT <= 0) { R.saveT = 5; save(); }
  requestAnimationFrame(loop);
}

window.addEventListener('beforeunload', save);
document.addEventListener('visibilitychange', () => { if (document.hidden) save(); });

// ---------------- Boot ----------------
(function boot() {
  resize();
  if (S.mtn >= MOUNTAINS.length) S.mtn = 0;
  if (S.pos >= M().cps.length - 1) { R.mode = 'summit'; R.summitT = 2.5; R.summitBonus = 250 * incomeMult(); }
  else if (S.stamina <= 0) R.mode = 'rest';
  buildGear(); buildTicks(); renderMountains(); renderLog(); refreshGear(); updateHUD();

  const sBtn = $('#soundBtn');
  if (sBtn) {
    sBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      initAudio();
      soundEnabled = !soundEnabled;
      sBtn.textContent = soundEnabled ? '🔊' : '🔇';
      sBtn.classList.toggle('muted', !soundEnabled);
      if (soundEnabled) {
        SFX.boost();
        toast('🔊 Suara Diaktifkan');
      } else {
        toast('🔇 Suara Dibisukan');
      }
    });
  }

  // unlock AudioContext on any first user gesture
  const resumeAudioOnGesture = () => {
    initAudio();
    window.removeEventListener('pointerdown', resumeAudioOnGesture);
    window.removeEventListener('keydown', resumeAudioOnGesture);
  };
  window.addEventListener('pointerdown', resumeAudioOnGesture);
  window.addEventListener('keydown', resumeAudioOnGesture);

  if (!S.seenIntro) { addLog('🌱 Petualangan dimulai di ' + M().name + '.'); intro(); }
  else offlineProgress();
  requestAnimationFrame(t => { last = t; loop(t); });
})();
