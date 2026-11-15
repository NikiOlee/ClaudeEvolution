/* The Ascent of the Mascot — everything on screen is drawn in code (Canvas 2D); all sound effects/music are synthesized with WebAudio.
   Narration = 13 Fish Audio drama-3 clips. Timing is driven by the audio clock + word timestamps. */
(() => {
'use strict';
const W = 1280, H = 720, GY = 566;          // canvas size, ground line
const R = 1.25;                              // narration playback speed (pitch preserved) to keep the film under 90 s
const CL = window.CLIPS;
const $ = id => document.getElementById(id);
const cv = $('c'), ctx = cv.getContext('2d');
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const lerp = (a, b, k) => a + (b - a) * k;
const sm = (a, b, x) => { x = clamp((x - a) / (b - a)); return x * x * (3 - 2 * x); };
const rnd = i => { const s = Math.sin(i * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
function tr(x, keys) {                       // smooth piecewise track
  if (x <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) if (x < keys[i][0]) {
    const a = keys[i - 1], b = keys[i], d = b[0] - a[0];
    return d <= 1e-6 ? b[1] : lerp(a[1], b[1], sm(0, 1, (x - a[0]) / d));
  }
  return keys[keys.length - 1][1];
}

/* ---------------- timing plan (audio clips -> film timeline) ---------------- */
const GAP = {1:.8, 2:.12, 3:.1, 4:.2, 5:.15, 6:.2, 7:1.3, 8:.15, 9:.08, 10:.1, 11:.2, 12:1.3, 13:1.5};
const T0 = 0.4, TAIL = 2.4;
function cm(c, m) {                           // media time -> compressed media time (long pauses are trimmed)
  let x = m - c.m0;
  for (const cu of c.cuts) {
    if (m >= cu.b) x -= (cu.b - cu.a); else if (m > cu.a) { x -= (m - cu.a); break; } else break;
  }
  return Math.min(x, cm.max(c));
}
cm.max = c => c.m1 - c.m0;
CL.forEach(c => {
  const w = c.words; c.m0 = Math.max(0, w[0].s - 0.1); c.m1 = w[w.length - 1].e + 0.22; c.cuts = [];
  const keep = 0.22, thr = c.id === 6 ? 9 : 0.36;          // clip 6 (asteroid) keeps its dramatic pauses
  for (let k = 0; k < w.length - 1; k++) { const g = w[k + 1].s - w[k].e; if (g > thr) c.cuts.push({ a: w[k].e + keep / 2, b: w[k + 1].s - keep / 2 }); }
  let tot = c.m1 - c.m0; c.cuts.forEach(cu => tot -= (cu.b - cu.a)); c.len = tot / R;
});
function replan(i0) { for (let i = i0; i < CL.length; i++) CL[i].start = i === 0 ? T0 + GAP[1] : CL[i - 1].start + CL[i - 1].len + GAP[CL[i].id]; }
replan(0);
const endT = () => CL[CL.length - 1].start + CL[CL.length - 1].len + TAIL;
const C = id => CL[id - 1];
const tm = (id, m) => { const c = C(id); return c.start + cm(c, m) / R; };
const Ws = (id, k) => tm(id, C(id).words[k].s);
const We = (id, k) => tm(id, C(id).words[k].e);

/* ---------------- the mascot rig: one parametric creature ---------------- */
const INK = '#2a1712', EYE = '#1b1210';
const OR = [217, 119, 87], ORD = [180, 84, 56], CR = [246, 222, 192], DEADC = [122, 108, 100], DEADD = [96, 84, 78], DEADCR = [170, 158, 148];
const mixc = (a, b, k) => `rgb(${Math.round(lerp(a[0], b[0], k))},${Math.round(lerp(a[1], b[1], k))},${Math.round(lerp(a[2], b[2], k))})`;
const D0 = { S: 1, w: 80, h: 70, r: .3, eyeW: 11, eyeH: 26, eyeGap: 20, eyeY: -.1, tailLen: 0, tailW: 12, tailY: .15, tailUp: 0, tailWave: 0, finTail: 0, dFin: 0,
  armLen: 0, armW: 14, armY: .05, armA: .4, legO: 0, legI: 0, legW: 14, legOX: .38, legIX: .14, earT: 0, earS: 0, snout: 0, spikes: 0, tuft: 0, tie: 0, bow: 0,
  whisk: 0, muzzle: 0, scales: 0, tilt: 0, belly: 0 };
const mk = o => Object.assign({}, D0, o);
const PR = {
  TAD: mk({ S: 1.7, w: 62, h: 56, r: .34, eyeW: 9, eyeH: 20, eyeGap: 15, tailLen: 95, tailW: 22, tailY: .05, tailWave: .9, armLen: 9, armW: 9, armA: .5 }),
  FISH: mk({ S: 1.35, w: 150, h: 104, r: .42, eyeW: 12, eyeH: 28, eyeGap: 28, eyeY: -.08, tailLen: 46, tailW: 40, tailY: .02, tailWave: .7, finTail: 72, dFin: 38, armLen: 34, armW: 24, armA: .95, scales: 1, belly: .8 }),
  LIZ: mk({ S: 1.3, w: 150, h: 62, r: .22, eyeW: 11, eyeH: 24, eyeGap: 34, eyeY: -.08, tailLen: 135, tailW: 30, tailY: .2, tailWave: .35, armLen: 28, armW: 14, armA: .8, legO: 24, legI: 24, legW: 14, legOX: .4, legIX: .15, snout: 22, spikes: 8, belly: .7 }),
  DINO: mk({ S: 1, w: 250, h: 170, r: .22, eyeW: 18, eyeH: 40, eyeGap: 54, eyeY: -.16, tailLen: 190, tailW: 72, tailY: .2, tailWave: .12, armLen: 38, armW: 18, armA: .9, legO: 90, legI: 90, legW: 38, legOX: .36, legIX: .14, snout: 52, spikes: 40, belly: .7 }),
  RAT: mk({ S: 1.7, w: 96, h: 66, r: .32, eyeW: 11, eyeH: 24, eyeGap: 22, eyeY: -.1, tailLen: 120, tailW: 9, tailY: .25, tailWave: .55, tailUp: .08, armLen: 20, armW: 10, armA: .9, legO: 16, legI: 16, legW: 11, legOX: .36, legIX: .14, earT: 20, snout: 28, whisk: 1 }),
  MONK: mk({ S: 1.4, w: 104, h: 112, r: .28, eyeW: 11, eyeH: 26, eyeGap: 24, eyeY: -.12, tailLen: 120, tailW: 12, tailY: .3, tailUp: 1, tailWave: .15, armLen: 92, armW: 15, armA: 1.15, legI: 50, legW: 17, legIX: .22, earS: 24, muzzle: 1, tilt: .12 }),
  HUM: mk({ S: 1.25, w: 92, h: 136, r: .14, eyeW: 11, eyeH: 28, eyeGap: 22, eyeY: -.2, armLen: 62, armW: 16, armA: 1.2, armY: -.05, legI: 62, legW: 20, legIX: .22, tuft: 1, tie: 1 }),
};
PR.MATEH = mk(Object.assign({}, PR.HUM, { tie: 0, tuft: 0, bow: 1 }));
PR.MATER = mk(Object.assign({}, PR.RAT, { bow: 1 }));
function lerpP(a, b, k) { const o = {}; for (const key in a) o[key] = lerp(a[key], b[key], k); return o; }
const offs = P => (P.h / 2 + Math.max(P.legO, P.legI)) * P.S;

function rr(c, x, y, w, h, r) { r = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2); c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
const blinkAmt = t => { const ph = (t + 0.7) % 3.1; return ph < .13 ? Math.sin(ph / .13 * Math.PI) : 0; };

function drawCreature(c, P, st) {
  const t = st.t || 0, w = P.w, h = P.h, S = P.S * (st.sc || 1), lw = 4.5 / S;
  const dead = st.dead || 0;
  const body = mixc(OR, DEADC, dead), dark = mixc(ORD, DEADD, dead), cream = mixc(CR, DEADCR, dead);
  c.save();
  if (st.alpha != null) c.globalAlpha *= st.alpha;
  c.translate(st.x, st.y); if (st.rot) c.rotate(st.rot);
  const sq = (st.speak || 0) * 0.06;
  c.scale((st.dir == null ? 1 : st.dir) * S * (1 + sq), S * (1 - sq));
  if (P.tilt) c.rotate(P.tilt);
  c.lineJoin = 'round'; c.lineCap = 'round'; c.lineWidth = lw; c.strokeStyle = INK;
  // tail
  if (P.tailLen > 2) {
    const N = 16, ax = -w / 2 + 8, ay = P.tailY * h, L = P.tailLen, pts = [];
    for (let i = 0; i <= N; i++) { const s = i / N; pts.push([ax - L * s, ay - P.tailUp * L * .9 * s * s + Math.sin(t * 5 - s * 5) * P.tailWave * L * .22 * s]); }
    const A = [], B = [];
    for (let i = 0; i <= N; i++) {
      const p0 = pts[Math.max(0, i - 1)], p1 = pts[Math.min(N, i + 1)]; let dx = p1[0] - p0[0], dy = p1[1] - p0[1]; const l = Math.hypot(dx, dy) || 1; dx /= l; dy /= l;
      const hw = P.tailW * (1 - .9 * i / N) / 2; A.push([pts[i][0] - dy * hw, pts[i][1] + dx * hw]); B.push([pts[i][0] + dy * hw, pts[i][1] - dx * hw]);
    }
    c.beginPath(); A.forEach((p, i) => i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])); for (let i = N; i >= 0; i--) c.lineTo(B[i][0], B[i][1]); c.closePath();
    c.fillStyle = body; c.fill(); c.stroke();
    if (P.finTail > 2) { const [tx, ty] = pts[N], F = P.finTail; c.beginPath(); c.moveTo(tx + 4, ty); c.lineTo(tx - F * .6, ty - F * .75); c.lineTo(tx - F * .25, ty); c.lineTo(tx - F * .6, ty + F * .75); c.closePath(); c.fillStyle = dark; c.fill(); c.stroke(); }
  }
  // legs
  const legs = [[-P.legOX, P.legO], [-P.legIX, P.legI], [P.legIX, P.legI], [P.legOX, P.legO]];
  legs.forEach((lg, i) => {
    const len = lg[1]; if (len < 1) return; const lift = (st.walk || 0) * Math.max(0, Math.sin(t * 11 + i * 1.7)) * 7;
    rr(c, lg[0] * w - P.legW / 2, h / 2 - 10, P.legW, len + 10 - lift, P.legW * .35); c.fillStyle = i === 1 || i === 2 ? body : dark; c.fill(); c.stroke();
  });
  // ears / spikes / fin behind body
  if (P.earT > 1) for (const sx of [-1, 1]) { c.beginPath(); c.arc(sx * w * .3, -h / 2 + 4, P.earT, 0, 7); c.fillStyle = body; c.fill(); c.stroke(); c.beginPath(); c.arc(sx * w * .3, -h / 2 + 4, P.earT * .52, 0, 7); c.fillStyle = '#f2a5a0'; c.fill(); }
  if (P.earS > 1) for (const sx of [-1, 1]) { c.beginPath(); c.arc(sx * (w / 2 - 2), -h * .12, P.earS, 0, 7); c.fillStyle = body; c.fill(); c.stroke(); c.beginPath(); c.arc(sx * (w / 2 - 2), -h * .12, P.earS * .5, 0, 7); c.fillStyle = cream; c.fill(); }
  if (P.spikes > 1) for (let i = 0; i < 7; i++) { const x = lerp(-w * .38, w * .3, i / 6), bw = P.spikes * 1.1, hh = P.spikes * (.65 + .35 * Math.sin(i / 6 * Math.PI)); c.beginPath(); c.moveTo(x - bw / 2, -h / 2 + 6); c.lineTo(x, -h / 2 - hh); c.lineTo(x + bw / 2, -h / 2 + 6); c.closePath(); c.fillStyle = dark; c.fill(); c.stroke(); }
  if (P.dFin > 2) { c.beginPath(); c.moveTo(-w * .22, -h / 2 + 6); c.quadraticCurveTo(-w * .1, -h / 2 - P.dFin * 1.1, w * .02, -h / 2 - P.dFin); c.quadraticCurveTo(w * .1, -h / 2 - P.dFin * .4, w * .22, -h / 2 + 6); c.closePath(); c.fillStyle = dark; c.fill(); c.stroke(); }
  // body
  const bp = () => rr(c, -w / 2, -h / 2, w, h, P.r * Math.min(w, h));
  bp(); c.fillStyle = body; c.fill();
  if (P.belly > .02 || P.scales > .02) {
    c.save(); bp(); c.clip();
    if (P.belly > .02) { c.globalAlpha = P.belly * .9; c.fillStyle = cream; c.fillRect(-w / 2 - 2, h * .16, w + 4, h); }
    if (P.scales > .02) { c.globalAlpha = P.scales * .5; c.strokeStyle = dark; c.lineWidth = 3 / S; for (let r_ = 0; r_ < 3; r_++) for (let k = 0; k < 4; k++) { c.beginPath(); c.arc(-w * .26 + k * w * .17 + (r_ % 2) * 11, -h * .16 + r_ * 17, 9, .15 * Math.PI, .85 * Math.PI); c.stroke(); } }
    c.restore();
  }
  c.strokeStyle = INK; c.lineWidth = lw; bp(); c.stroke();
  // arms
  if (P.armLen > 1) for (const sx of [-1, 1]) {
    const front = sx === 1, a0 = front ? (st.armR != null ? st.armR : P.armA + Math.sin(t * 3) * .05) : Math.PI - (st.armL != null ? st.armL : P.armA - Math.sin(t * 3) * .05);
    const L = P.armLen * (front && st.armExt ? st.armExt : 1), bx = sx * (w / 2 - 3), by = P.armY * h, x2 = bx + Math.cos(a0) * L, y2 = by + Math.sin(a0) * L;
    c.beginPath(); c.moveTo(bx, by); c.lineTo(x2, y2); c.lineWidth = P.armW + 2 * lw; c.strokeStyle = INK; c.stroke();
    c.lineWidth = P.armW; c.strokeStyle = body; c.stroke();
  }
  c.lineWidth = lw; c.strokeStyle = INK;
  // snout / whiskers
  if (P.snout > 1) {
    const x0 = w / 2 - 10; c.beginPath(); c.moveTo(x0, -h * .14); c.lineTo(w / 2 + P.snout, h * .05); c.lineTo(x0, h * .24); c.closePath(); c.fillStyle = body; c.fill(); c.stroke();
    if (P.whisk > .3) { c.beginPath(); c.arc(w / 2 + P.snout - 3, h * .05, 5, 0, 7); c.fillStyle = '#e9808a'; c.fill(); c.lineWidth = 2 / S; c.globalAlpha *= P.whisk; for (const d of [-10, 0, 10]) { c.beginPath(); c.moveTo(w / 2 + P.snout - 14, h * .08); c.lineTo(w / 2 + P.snout + 22, h * .08 + d * 1.2); c.stroke(); } c.globalAlpha /= Math.max(P.whisk, .01); c.lineWidth = lw; }
  }
  // face
  const ey = P.eyeY * h + (st.edy || 0), ex = (st.edx || 0), eh0 = P.eyeH * (1 + .35 * (st.panic || 0)), eh = Math.max(2, eh0 * (1 - .9 * blinkAmt(t)));
  if (P.muzzle > .02) { c.save(); c.globalAlpha *= P.muzzle; c.fillStyle = cream; c.beginPath(); c.ellipse(ex, ey + 2, P.eyeGap + P.eyeW + 12, eh0 * .85, 0, 0, 7); c.fill(); c.restore(); }
  for (const sx of [-1, 1]) {
    const x = sx * P.eyeGap + ex;
    if (dead > .5) { c.strokeStyle = EYE; c.lineWidth = 5 / S; c.beginPath(); c.moveTo(x - 8, ey - 8); c.lineTo(x + 8, ey + 8); c.moveTo(x + 8, ey - 8); c.lineTo(x - 8, ey + 8); c.stroke(); c.strokeStyle = INK; c.lineWidth = lw; }
    else { rr(c, x - P.eyeW / 2, ey - eh / 2, P.eyeW, eh, 3); c.fillStyle = EYE; c.fill(); }
  }
  if (st.shades > 0 && dead < .5) {
    c.save(); c.globalAlpha *= st.shades; c.translate(0, st.shadeDY || 0); if (st.shadeRot) c.rotate(st.shadeRot);
    c.fillStyle = '#0a0a0a'; for (const sx of [-1, 1]) { rr(c, sx * P.eyeGap + ex - P.eyeW / 2 - 9, ey - 9, P.eyeW + 18, 22, 6); c.fill(); }
    c.fillRect(-P.eyeGap + P.eyeW / 2 + 8, ey - 6, 2 * P.eyeGap - P.eyeW - 14, 4);
    c.strokeStyle = 'rgba(255,255,255,.7)'; c.lineWidth = 2.5 / S; for (const sx of [-1, 1]) { c.beginPath(); c.moveTo(sx * P.eyeGap - 8, ey - 4); c.lineTo(sx * P.eyeGap - 3, ey + 4); c.stroke(); } c.restore();
  }
  c.strokeStyle = INK; c.lineWidth = lw;
  // extras
  if (P.tuft > .05) { c.strokeStyle = '#4a2a1a'; c.lineWidth = 4.5; for (const [x, dx] of [[-9, -5], [0, 0], [9, 5]]) { c.beginPath(); c.moveTo(x, -h / 2 + 3); c.quadraticCurveTo(x + dx, -h / 2 - 10 * P.tuft, x + dx * 1.6, -h / 2 - 17 * P.tuft); c.stroke(); } c.strokeStyle = INK; c.lineWidth = lw; }
  if (P.tie > .05) { c.save(); c.translate(0, h * .04); c.scale(P.tie, P.tie); rr(c, -7, 0, 14, 12, 3); c.fillStyle = '#d64545'; c.fill(); c.stroke(); c.beginPath(); c.moveTo(-8, 12); c.lineTo(8, 12); c.lineTo(12, 44); c.lineTo(0, 54); c.lineTo(-12, 44); c.closePath(); c.fill(); c.stroke(); c.restore(); }
  if (P.bow > .05) { c.save(); c.translate(w * .02, -h / 2 - 6); c.scale(P.bow, P.bow); c.fillStyle = '#ff7eb6'; c.beginPath(); c.moveTo(0, 0); c.lineTo(-24, -15); c.lineTo(-24, 15); c.closePath(); c.fill(); c.stroke(); c.beginPath(); c.moveTo(0, 0); c.lineTo(24, -15); c.lineTo(24, 15); c.closePath(); c.fill(); c.stroke(); c.beginPath(); c.arc(0, 0, 6, 0, 7); c.fill(); c.stroke(); c.restore(); }
  c.restore();
}

/* ---------------- backgrounds ---------------- */
function grad(c, stops, y0 = 0, y1 = H) { const g = c.createLinearGradient(0, y0, 0, y1); stops.forEach(s => g.addColorStop(s[0], s[1])); return g; }
function cloud(c, x, y, s, col = '#fff') { c.fillStyle = col; c.beginPath(); c.arc(x, y, 30 * s, 0, 7); c.arc(x + 34 * s, y - 14 * s, 38 * s, 0, 7); c.arc(x + 74 * s, y, 32 * s, 0, 7); c.rect(x, y, 74 * s, 30 * s); c.fill(); }
function bgOcean(c, t) {
  c.fillStyle = grad(c, [[0, '#46bfee'], [.55, '#1f82c8'], [1, '#0b3a78']]); c.fillRect(0, 0, W, H);
  c.save(); c.globalAlpha *= .13; c.fillStyle = '#fff';
  for (let i = 0; i < 7; i++) { const x = 80 + i * 190 + Math.sin(t * .5 + i) * 50; c.beginPath(); c.moveTo(x, 0); c.lineTo(x + 70, 0); c.lineTo(x + 250 + Math.sin(t * .3 + i) * 40, H); c.lineTo(x + 120, H); c.closePath(); c.fill(); }
  c.restore();
  c.fillStyle = '#e6c88e'; c.beginPath(); c.moveTo(0, 690); for (let x = 0; x <= W; x += 40) c.lineTo(x, 672 + Math.sin(x * .012) * 14); c.lineTo(W, H); c.lineTo(0, H); c.fill();
  c.fillStyle = '#9aa8b5'; for (let i = 0; i < 6; i++) { c.beginPath(); c.ellipse(120 + i * 230 + rnd(i) * 60, 690 + rnd(i + 3) * 14, 30 + rnd(i + 1) * 26, 18 + rnd(i + 2) * 10, 0, 0, 7); c.fill(); }
  c.lineCap = 'round'; c.lineWidth = 12;
  for (let i = 0; i < 9; i++) { const bx = 60 + i * 150 + rnd(i) * 40, hg = 140 + rnd(i + 4) * 120; c.strokeStyle = i % 2 ? '#2f9e5a' : '#3fbf6a'; c.beginPath(); c.moveTo(bx, 700); for (let k = 1; k <= 6; k++) { const s = k / 6; c.lineTo(bx + Math.sin(t * 1.2 + i + s * 3) * 22 * s, 700 - hg * s); } c.stroke(); }
  c.strokeStyle = 'rgba(255,255,255,.6)'; c.lineWidth = 2;
  for (let i = 0; i < 24; i++) { const sp = 22 + rnd(i + 2) * 40, y = H + 20 - ((t * sp + rnd(i) * 900) % (H + 60)), x = rnd(i + 7) * W + Math.sin(t * 1.5 + i) * 12, r = 3 + rnd(i + 11) * 8; c.beginPath(); c.arc(x, y, r, 0, 7); c.stroke(); }
}
function bgBeach(c, t) {
  c.fillStyle = grad(c, [[0, '#7fd0f2'], [.55, '#d9f3ff']], 0, 470); c.fillRect(0, 0, W, 470);
  c.fillStyle = '#fff6b0'; c.beginPath(); c.arc(1010, 120, 62, 0, 7); c.fill(); c.fillStyle = 'rgba(255,246,176,.3)'; c.beginPath(); c.arc(1010, 120, 96, 0, 7); c.fill();
  cloud(c, (t * 8) % 1500 - 200, 110, 1.1); cloud(c, ((t * 5) + 700) % 1500 - 200, 190, .8); cloud(c, ((t * 6) + 400) % 1500 - 200, 70, .7);
  c.fillStyle = '#2aa3d8'; c.fillRect(0, 330, W, 150);
  c.strokeStyle = 'rgba(255,255,255,.7)'; c.lineWidth = 4; for (let r_ = 0; r_ < 3; r_++) { c.beginPath(); for (let x = 0; x <= W; x += 16) { const y = 360 + r_ * 38 + Math.sin(x * .03 + t * 2 + r_) * 5; x ? c.lineTo(x, y) : c.moveTo(x, y); } c.stroke(); }
  c.fillStyle = grad(c, [[0, '#f3dca3'], [1, '#d6b574']], 470, H); c.beginPath(); c.moveTo(0, 478); for (let x = 0; x <= W; x += 20) c.lineTo(x, 472 + Math.sin(x * .02 + t) * 5); c.lineTo(W, H); c.lineTo(0, H); c.fill();
  c.fillStyle = 'rgba(255,255,255,.8)'; c.beginPath(); for (let x = 0; x <= W; x += 20) c.lineTo(x, 466 + Math.sin(x * .02 + t) * 5); for (let x = W; x >= 0; x -= 20) c.lineTo(x, 478 + Math.sin(x * .02 + t) * 5); c.fill();
  for (let i = 0; i < 7; i++) { c.fillStyle = i % 2 ? '#f7a8b8' : '#fff'; c.beginPath(); c.ellipse(90 + i * 190 + rnd(i) * 50, 620 + rnd(i + 2) * 70, 10, 7, 0, 0, 7); c.fill(); }
}
function bgPre(c, t) {
  c.fillStyle = grad(c, [[0, '#f6bf86'], [.6, '#fde6c4']], 0, 480); c.fillRect(0, 0, W, 480);
  c.fillStyle = '#fff1c4'; c.beginPath(); c.arc(240, 150, 70, 0, 7); c.fill();
  c.fillStyle = '#d9a07a'; c.beginPath(); c.moveTo(0, 470); c.lineTo(160, 340); c.lineTo(300, 420); c.lineTo(460, 320); c.lineTo(640, 440); c.lineTo(640, 480); c.lineTo(0, 480); c.fill();
  c.fillStyle = '#7a5238'; c.beginPath(); c.moveTo(790, 480); c.lineTo(1010, 210); c.lineTo(1250, 480); c.closePath(); c.fill();
  c.fillStyle = '#ff7a2e'; c.beginPath(); c.moveTo(970, 250); c.lineTo(1010, 210); c.lineTo(1052, 250); c.lineTo(1030, 262); c.lineTo(1010, 244); c.lineTo(990, 262); c.closePath(); c.fill();
  c.fillStyle = 'rgba(110,90,80,.55)'; for (let i = 0; i < 6; i++) { const k = ((t * .25 + i / 6) % 1); c.beginPath(); c.arc(1010 + Math.sin(i * 2 + t) * 24 + k * 70, 220 - k * 190, 24 + k * 40, 0, 7); c.fill(); }
  c.fillStyle = grad(c, [[0, '#86ba5e'], [1, '#3a7538']], 470, H); c.fillRect(0, 470, W, H - 470);
  c.lineCap = 'round'; c.strokeStyle = '#2f6a2f'; c.lineWidth = 7;
  for (const [fx, fy, s] of [[90, 620, 1.3], [1190, 640, 1.4], [330, 690, .9], [980, 700, 1]]) for (let k = -4; k <= 4; k++) { c.beginPath(); c.moveTo(fx, fy); c.quadraticCurveTo(fx + k * 22 * s, fy - 80 * s + Math.sin(t + k) * 4, fx + k * 44 * s, fy - 40 * s + Math.abs(k) * 12 * s); c.stroke(); }
}
function bgWaste(c, t) {
  c.fillStyle = grad(c, [[0, '#1c0d12'], [.55, '#7a2a1c'], [.78, '#f0873a']], 0, 480); c.fillRect(0, 0, W, 480);
  c.fillStyle = 'rgba(30,20,20,.55)'; for (let i = 0; i < 9; i++) { const k = ((t * .15 + i / 9) % 1); c.beginPath(); c.arc(120 + i * 140 + Math.sin(i + t * .5) * 30, 470 - k * 430, 40 + k * 60, 0, 7); c.fill(); }
  c.fillStyle = '#3a2c2a'; c.fillRect(0, 470, W, H - 470); c.fillStyle = '#2b201e'; for (let i = 0; i < 12; i++) { c.beginPath(); c.ellipse(60 + i * 110 + rnd(i) * 40, 640 + rnd(i + 2) * 60, 40 + rnd(i + 3) * 30, 10, 0, 0, 7); c.fill(); }
  c.strokeStyle = '#ff8a3a'; c.lineWidth = 3; for (let i = 0; i < 6; i++) { let x = 80 + i * 210, y = 500 + rnd(i) * 40; c.beginPath(); c.moveTo(x, y); for (let k = 0; k < 5; k++) { x += 20 + rnd(i + k) * 30; y += 16 + rnd(i + k + 1) * 24; c.lineTo(x, y); } c.stroke(); }
  c.fillStyle = 'rgba(255,200,150,.5)'; for (let i = 0; i < 40; i++) { const x = (rnd(i) * W + t * 20 * (1 + rnd(i + 5))) % W, y = (rnd(i + 9) * H + t * 30) % H; c.fillRect(x, y, 3, 3); }
}
function bgDawn(c, t) {
  c.fillStyle = grad(c, [[0, '#9ad0f5'], [.7, '#ffd9b3']], 0, 480); c.fillRect(0, 0, W, 480);
  c.fillStyle = 'rgba(255,240,190,.45)'; c.beginPath(); c.arc(930, 400, 150, 0, 7); c.fill(); c.fillStyle = '#fff1b8'; c.beginPath(); c.arc(930, 400, 80, 0, 7); c.fill();
  c.fillStyle = '#9ccf7a'; c.beginPath(); c.moveTo(0, 480); c.quadraticCurveTo(300, 380, 640, 470); c.quadraticCurveTo(980, 400, W, 470); c.lineTo(W, 500); c.lineTo(0, 500); c.fill();
  c.fillStyle = grad(c, [[0, '#8a6b4a'], [1, '#5b432c']], 470, H); c.fillRect(0, 480, W, H - 480);
  c.strokeStyle = '#5fb24a'; c.lineWidth = 5; c.lineCap = 'round'; for (let i = 0; i < 30; i++) { const x = rnd(i) * W, y = 500 + rnd(i + 3) * 200, hh = 10 + rnd(i + 5) * 16; c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.sin(t * 2 + i) * 4, y - hh); c.stroke(); }
  for (let i = 0; i < 9; i++) { const x = 90 + i * 140 + rnd(i) * 40, y = 650 + rnd(i + 1) * 40; c.strokeStyle = '#4f9d3d'; c.lineWidth = 4; c.beginPath(); c.moveTo(x, y); c.lineTo(x, y - 28); c.stroke(); c.fillStyle = ['#ff7eb6', '#ffd23f', '#fff'][i % 3]; c.beginPath(); c.arc(x, y - 32, 9, 0, 7); c.fill(); }
}
function bgJungle(c, t) {
  c.fillStyle = grad(c, [[0, '#8fd99a'], [1, '#2d8a4e']]); c.fillRect(0, 0, W, H);
  c.save(); c.globalAlpha *= .14; c.fillStyle = '#fff'; for (let i = 0; i < 5; i++) { const x = 150 + i * 260; c.beginPath(); c.moveTo(x, 0); c.lineTo(x + 60, 0); c.lineTo(x - 120, 560); c.lineTo(x - 220, 560); c.fill(); } c.restore();
  for (const [x, wd] of [[110, 78], [430, 60], [860, 70], [1180, 82]]) { c.fillStyle = '#7a5230'; c.fillRect(x - wd / 2, 90, wd, 480); c.fillStyle = '#5e3d22'; c.fillRect(x - wd / 2, 90, 10, 480); c.fillStyle = '#2f9b4f'; for (let k = 0; k < 6; k++) { c.beginPath(); c.arc(x + (k - 2.5) * 46, 90 + Math.sin(k * 2) * 20, 62, 0, 7); c.fill(); } c.fillStyle = '#3fb561'; for (let k = 0; k < 4; k++) { c.beginPath(); c.arc(x + (k - 1.5) * 52, 62 + (k % 2) * 26, 52, 0, 7); c.fill(); } }
  c.strokeStyle = '#1f7a3e'; c.lineWidth = 7; c.lineCap = 'round'; for (const vx of [300, 640, 1000]) { c.beginPath(); c.moveTo(vx, 70); for (let k = 1; k <= 8; k++) c.lineTo(vx + Math.sin(t * 1.4 + vx + k * .5) * 16 * k / 8, 70 + k * 52); c.stroke(); }
  c.fillStyle = '#4fa63d'; c.fillRect(0, 540, W, H - 540); c.fillStyle = '#3d8f3a'; c.beginPath(); c.moveTo(0, 548); for (let x = 0; x <= W; x += 22) c.lineTo(x, 540 + (x / 22 % 2) * 14); c.lineTo(W, H); c.lineTo(0, H); c.fill();
}
function bgPark(c, t) {
  c.fillStyle = grad(c, [[0, '#7fcbff'], [1, '#e6f6ff']], 0, 500); c.fillRect(0, 0, W, 500);
  c.fillStyle = '#fff3a8'; c.beginPath(); c.arc(1100, 100, 54, 0, 7); c.fill();
  cloud(c, (t * 7) % 1500 - 200, 120, 1.1); cloud(c, ((t * 4) + 650) % 1500 - 200, 200, .8);
  for (let i = 0; i < 14; i++) { const x = i * 100 - 10, hh = 120 + rnd(i + 2) * 190, wd = 78 + rnd(i) * 14; c.fillStyle = i % 2 ? '#9db4c8' : '#8aa3bd'; c.fillRect(x, 500 - hh, wd, hh); c.fillStyle = '#e8f2fa'; for (let yy = 500 - hh + 14; yy < 484; yy += 26) for (let xx = x + 10; xx < x + wd - 14; xx += 22) c.fillRect(xx, yy, 10, 14); }
  c.fillStyle = '#8fd46b'; c.beginPath(); c.moveTo(0, 500); c.quadraticCurveTo(400, 450, 800, 495); c.quadraticCurveTo(1100, 465, W, 495); c.lineTo(W, 520); c.lineTo(0, 520); c.fill();
  c.fillStyle = grad(c, [[0, '#7ccf5a'], [1, '#43a038']], 490, H); c.fillRect(0, 500, W, H - 500);
  c.fillStyle = '#ecdcb8'; c.beginPath(); c.moveTo(560, 500); c.lineTo(720, 500); c.lineTo(1040, H); c.lineTo(120, H); c.closePath(); c.fill();
  c.fillStyle = '#7a5230'; c.fillRect(70, 300, 36, 250); c.fillStyle = '#35a24a'; for (const [dx, dy, r_] of [[-40, -10, 68], [20, -50, 78], [70, 0, 62], [10, 10, 70]]) { c.beginPath(); c.arc(88 + dx, 300 + dy, r_, 0, 7); c.fill(); }
  for (let i = 0; i < 12; i++) { const x = 30 + i * 108 + rnd(i) * 30, y = 690 + rnd(i + 3) * 20; c.fillStyle = ['#ff7eb6', '#ffd23f', '#fff', '#b58cff'][i % 4]; c.beginPath(); c.arc(x, y, 8, 0, 7); c.fill(); }
}
const BG = [bgOcean, bgBeach, bgPre, bgWaste, bgDawn, bgJungle, bgPark];

/* ---------------- cues: every on-screen change is pinned to a word in the narration ---------------- */
function cues() {
  const K = {};
  K.M1a = Ws(3, 3); K.M1b = Ws(3, 9);             // tadpole -> fish ("through ancient pressures ... Behold the fish")
  K.M2a = Ws(4, 0); K.M2b = Ws(4, 5);             // fish -> lizard, water -> land
  K.M3a = Ws(5, 0); K.M3b = Ws(5, 8);             // lizard -> dinosaur ("grows and grows ... Behold the dinosaur")
  K.TI = Ws(6, 23) + .25;                         // asteroid impact (third "Oh no")
  K.h0 = tm(7, .4); K.h1 = tm(7, 1.4); K.s0 = tm(7, 1.0); K.s1 = tm(7, 2.1); K.r0 = tm(7, 1.3); K.r1 = tm(7, 2.5); K.u0 = tm(7, 3.6); K.u1 = tm(7, 4.9);
  K.M4a = Ws(8, 0); K.M4b = Ws(8, 6) + .1;       // rat -> monkey
  K.M5a = Ws(10, 13); K.M5b = Ws(10, 16) + .2;   // monkey -> human ("Then, it stands. The human.")
  K.TP = C(12).start - .95;                       // mate turns back into a rat
  K.tR = Ws(11, 6); K.tC = Ws(11, 13) + .2;       // hand offered / high-five contact
  K.end = endT();
  return K;
}
const spk = (id, tau) => { const c = C(id); return c.words.some(w => tau >= tm(id, w.s) && tau <= tm(id, w.e) + .03) ? .5 + .5 * Math.sin(tau * 38) : 0; };

function mainP(tau, K) {
  let p = PR.TAD;
  const seq = [[K.M1a, K.M1b, PR.FISH], [K.M2a, K.M2b, PR.LIZ], [K.M3a, K.M3b, PR.DINO], [K.r0, K.r1, PR.RAT], [K.M4a, K.M4b, PR.MONK], [K.M5a, K.M5b, PR.HUM]];
  for (const [a, b, to] of seq) { if (tau >= b) p = to; else if (tau > a) { p = lerpP(p, to, sm(a, b, tau)); break; } else break; }
  return p;
}
const xo = a => 640 + Math.sin(a * .8) * 45;
function mainX(tau, K) {
  if (tau < K.M2a) return xo(tau);
  return tr(tau, [[K.M2a, xo(K.M2a)], [K.M2b, 520], [K.M3b, 600], [Ws(7, 12), 600], [Ws(7, 13) + .3, 640], [Ws(11, 0), 640], [Ws(11, 5), 520]]);
}
const mateX = (tau) => tr(tau, [[Ws(11, 1) - .3, 1420], [Ws(11, 4) - .1, 770]]);

/* ---------------- small drawing helpers ---------------- */
function shadow(c, x, y, rx, a) { if (a <= .01) return; c.save(); c.fillStyle = `rgba(0,0,0,${.22 * a})`; c.beginPath(); c.ellipse(x, y, rx, rx * .16, 0, 0, 7); c.fill(); c.restore(); }
function starBurst(c, x, y, r, col, rot = 0, n = 8) { c.beginPath(); for (let i = 0; i < n * 2; i++) { const a = rot + i * Math.PI / n, rr_ = i % 2 ? r * .45 : r; c.lineTo(x + Math.cos(a) * rr_, y + Math.sin(a) * rr_); } c.closePath(); c.fillStyle = col; c.fill(); }
function heart(c, x, y, s, col) { c.save(); c.translate(x, y); c.scale(s, s); c.beginPath(); c.moveTo(0, 8); c.bezierCurveTo(-18, -6, -8, -20, 0, -9); c.bezierCurveTo(8, -20, 18, -6, 0, 8); c.fillStyle = col; c.fill(); c.lineWidth = 2.5 / s; c.strokeStyle = INK; c.stroke(); c.restore(); }
function drop(c, x, y, s) { c.save(); c.translate(x, y); c.scale(s, s); c.beginPath(); c.moveTo(0, -12); c.quadraticCurveTo(10, 2, 0, 9); c.quadraticCurveTo(-10, 2, 0, -12); c.fillStyle = '#7fd3ff'; c.fill(); c.lineWidth = 2.5 / s; c.strokeStyle = INK; c.stroke(); c.restore(); }
function bubble(c, words, shown, x, y, alpha, sc, tx, ty) {
  c.save(); c.globalAlpha *= alpha; c.translate(x, y); c.scale(sc, sc);
  c.font = 'bold 34px "Comic Sans MS","Chalkboard SE","Trebuchet MS",sans-serif'; c.textBaseline = 'middle';
  const full = words.join(' '), tw = c.measureText(full).width, bw = tw + 46, bh = 72;
  c.lineWidth = 5; c.strokeStyle = INK; c.fillStyle = '#fff'; c.lineJoin = 'round';
  c.beginPath(); c.moveTo(-16, bh / 2 - 4); c.lineTo(tx - x, ty - y); c.lineTo(16, bh / 2 - 4); c.closePath(); c.fill(); c.stroke();
  rr(c, -bw / 2, -bh / 2, bw, bh, 30); c.fill(); c.stroke();
  c.fillStyle = '#fff'; c.fillRect(-14, bh / 2 - 8, 28, 8);
  let px = -tw / 2; words.forEach((wd, i) => { c.fillStyle = i < shown ? INK : 'rgba(42,23,18,0)'; c.fillText(wd, px, 0); px += c.measureText(wd + ' ').width; });
  c.restore();
}
function nameTag(c, txt, tau, t0, dur = 1.7) {
  const u = tau - t0; if (u < 0 || u > dur) return;
  const pop = sm(0, .18, u), out = 1 - sm(dur - .3, dur, u), s = .6 + .4 * pop + .08 * Math.sin(Math.min(1, u * 5) * Math.PI);
  c.save(); c.globalAlpha = pop * out; c.translate(W / 2, 112); c.scale(s, s); c.rotate(-.03);
  c.font = '900 74px Impact,"Arial Black",sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.lineJoin = 'round';
  c.lineWidth = 14; c.strokeStyle = INK; c.strokeText(txt, 0, 0); c.fillStyle = '#fff'; c.fillText(txt, 0, 0); c.restore();
}
function iconOf(c, key, cx, cy, tau, size) {
  const P0 = PR[key], ext = Math.max(P0.w + P0.tailLen + P0.snout, P0.h + Math.max(P0.legO, P0.legI) + P0.earT + P0.spikes * .6);
  const Pi = Object.assign({}, P0, { S: size / ext });
  drawCreature(c, Pi, { x: cx, y: cy + (Math.max(P0.legO, P0.legI) / 2) * Pi.S, t: tau, dir: 1 });
}
const STAGES = ['TAD', 'FISH', 'LIZ', 'DINO', 'RAT', 'MONK', 'HUM'];
function strip(c, tau, K, times, count, cx, cy, s, a) {
  const cell = 56 * s, n = STAGES.length, wd = n * cell + 14 * s;
  c.save(); c.globalAlpha *= a; c.fillStyle = 'rgba(20,10,6,.45)'; rr(c, cx - wd / 2, cy - cell / 2 - 6 * s, wd, cell + 12 * s, 16 * s); c.fill();
  STAGES.forEach((k, i) => {
    if (i >= count) return; const u = tau - times[i], pop = Math.min(1, Math.max(0, u / .3)); if (pop <= 0) return;
    const sc = 1 + .25 * Math.sin(pop * Math.PI); c.save(); c.translate(cx - wd / 2 + 7 * s + cell * (i + .5), cy); c.scale(sc, sc);
    iconOf(c, k, 0, 0, tau, 54 * s); c.restore();
    if (i < n - 1 && i < count - 1) { c.fillStyle = 'rgba(255,255,255,.7)'; c.font = `bold ${16 * s}px sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('›', cx - wd / 2 + 7 * s + cell * (i + 1), cy); }
  });
  c.restore();
}
function keyCap(c, txt, x, y, w, h, press) {
  c.save(); c.translate(x, y + press * 6); c.fillStyle = '#2a1712'; rr(c, -w / 2, -h / 2 + 8 - press * 6, w, h, 12); c.fill();
  c.fillStyle = '#f4efe6'; rr(c, -w / 2, -h / 2, w, h, 12); c.fill(); c.lineWidth = 4; c.strokeStyle = INK; c.stroke();
  c.fillStyle = INK; c.font = '900 34px "Arial Black",Arial,sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(txt, 0, 2); c.restore();
}

/* ---------------- render one frame at film-time tau ---------------- */
function render(tau) {
  const c = ctx, K = cues(); c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = 1; c.clearRect(0, 0, W, H);
  const dprx = cv.width / W; c.scale(dprx, dprx);
  const P = mainP(tau, K), x0 = mainX(tau, K), xp = mainX(tau - .06, K), vx = (x0 - xp) / .06;
  const rot = tr(tau, [[K.TI, 0], [K.TI + .55, Math.PI], [tm(7, 2.0), Math.PI], [tm(7, 2.9), 0]]);
  const oN = offs(P), oR = (P.h / 2 + P.spikes * .3) * P.S, o = lerp(oN, oR, Math.abs(rot) / Math.PI);
  const g = sm(K.M2a, K.M2b, tau);
  let y = lerp(380 + Math.sin(tau * 1.7) * 12, GY - o, g);
  const hu = (tau - K.TI) / .6; if (hu > 0 && hu < 1) y -= 170 * Math.sin(Math.PI * hu);
  const sink = tr(tau, [[K.s0, 0], [K.s1, 1], [K.u0, 1], [K.u1, 0]]); y += sink * (2 * oN + 160);
  const walk = clamp(Math.abs(vx) / 70) * g, bobW = walk * Math.abs(Math.sin(tau * 11)) * -4;
  // asteroid / panic
  const tS = Ws(6, 6), uA = clamp((tau - tS) / (K.TI - tS)), astOn = tau > tS && tau < K.TI + .02;
  const panic = tr(tau, [[Ws(6, 11), 0], [Ws(6, 13), 1], [K.TI, 1], [K.TI + .1, 0]]);
  const dead = tr(tau, [[K.TI, 0], [K.TI + .15, 1], [tm(7, 2.0), 1], [tm(7, 2.6), 0]]);
  const tShade = Ws(6, 13), shadeA = sm(Ws(5, 11), Ws(5, 11) + .25, tau) * (tau < tShade ? 1 : Math.max(0, 1 - (tau - tShade) / 1.0));
  const look = tr(tau, [[Ws(6, 3), 0], [Ws(6, 4), 1], [Ws(6, 11), 1], [K.TI, 0]]);
  const hungry = sm(Ws(7, 12), Ws(7, 12) + .3, tau) * (1 - sm(Ws(7, 16), Ws(7, 16) + .3, tau));
  // fish confusion window / lizard trip
  const fa = Ws(3, 11), fb = We(3, 20) + .1; let dir = 1;
  if (tau > fa && tau < fb) dir = lerp(Math.cos(2 * Math.PI * (tau - fa) / 1.8), 1, sm(fb - .5, fb, tau));
  const trip = tr(tau, [[Ws(4, 15), 0], [We(4, 17), 1], [We(4, 17) + .4, 0]]);
  const stomp = [Ws(5, 3), Ws(5, 5), Ws(5, 7), Ws(5, 8), Ws(5, 11), Ws(5, 13)].reduce((m, ts) => Math.max(m, tau > ts ? Math.exp(-(tau - ts) * 9) : 0), 0);
  const ST = {
    x: x0 + Math.sin(tau * 70) * panic * 3 + 0, y: y + bobW, t: tau, dir, rot: rot,
    walk, dead, panic, speak: Math.max(spk(2, tau), spk(9, tau)), edx: hungry * Math.sin(tau * 3.2) * 6, edy: -look * 9, sc: 1,
    shades: shadeA, shadeDY: tau > tShade ? Math.pow(tau - tShade, 2) * 380 : 0, shadeRot: tau > tShade ? (tau - tShade) * 4 : 0,
    armR: null, armExt: 1,
  };
  if (tau >= K.tR) {
    ST.armR = tr(tau, [[K.tR, 1.2], [K.tR + .6, -.45], [Ws(11, 11) - .05, -.45], [Ws(11, 12), -1.3], [K.tC, -.45], [K.TP + .2, -.45], [K.TP + .7, 1.2]]);
    ST.armExt = tr(tau, [[K.tR, 1], [K.tR + .6, 1.35], [K.TP + .2, 1.35], [K.TP + .7, 1]]);
  }
  if (tau > K.tC - .05 && tau < K.tC + .3) ST.sc = 1 + .05 * Math.sin((tau - K.tC + .05) / .35 * Math.PI);
  // world camera
  const zk = tr(tau, [[Ws(7, 14), 0], [Ws(7, 14) + .55, 1], [We(7, 16) - .05, 1], [We(7, 16) + .35, 0]]);
  const fx = ST.x, fy = ST.y - P.h * P.S * .12, Z = 1 + 1.4 * zk, cx = lerp(W / 2, fx, zk), cy = lerp(H / 2, fy, zk);
  const sh = tau < K.TI ? 0 : tr(tau, [[K.TI, 30], [K.TI + 1.0, 0]]);   // camera shake only for the asteroid impact
  c.save(); c.translate(W / 2 + Math.sin(tau * 83) * sh * .5, H / 2 + Math.cos(tau * 71) * sh * .5); c.scale(Z, Z); c.translate(-cx, -cy);
  // backgrounds
  const wts = [1 - sm(K.M2a, K.M2b, tau), sm(K.M2a, K.M2b, tau) * (1 - sm(K.M3a, K.M3b, tau)), sm(K.M3a, K.M3b, tau) * (1 - sm(K.TI, K.TI + .8, tau)),
    sm(K.TI, K.TI + .8, tau) * (1 - sm(K.h0, K.u0, tau)), sm(K.h0, K.u0, tau) * (1 - sm(K.M4a, K.M4b, tau)), sm(K.M4a, K.M4b, tau) * (1 - sm(K.M5a, K.M5b, tau)), sm(K.M5a, K.M5b, tau)];
  let first = true; wts.forEach((wv, i) => { if (wv > .003) { c.globalAlpha = first ? 1 : wv; BG[i](c, tau); first = false; } }); c.globalAlpha = 1;
  // time-lapse (rat -> monkey)
  const tl = clamp((tau - K.M4a) / (K.M4b + .2 - K.M4a));
  if (tl > 0 && tl < 1) {
    c.fillStyle = `rgba(12,22,70,${.34 * (.5 - .5 * Math.cos(2 * Math.PI * 2 * tl)) * Math.sin(Math.PI * tl)})`; c.fillRect(0, 0, W, H);
    const ph = (tl * 2) % 1; c.fillStyle = '#ffe27a'; c.beginPath(); c.arc(lerp(80, 1200, ph), 380 - Math.sin(ph * Math.PI) * 300, 38, 0, 7); c.fill();
    c.save(); c.translate(1160, 130); c.fillStyle = '#fff'; c.beginPath(); c.arc(0, 0, 54, 0, 7); c.fill(); c.lineWidth = 7; c.strokeStyle = INK; c.stroke(); c.lineCap = 'round'; c.beginPath(); c.moveTo(0, 0); c.lineTo(Math.cos(tl * 40) * 36, Math.sin(tl * 40) * 36); c.moveTo(0, 0); c.lineTo(Math.cos(tl * 3.3) * 24, Math.sin(tl * 3.3) * 24); c.stroke(); c.restore();
  }
  // hole (back)
  const hole = tr(tau, [[K.h0, 0], [K.h1, 1]]) * (1 - sm(K.M4a, K.M4b, tau)), hx = 600;
  if (hole > .01) { c.fillStyle = '#5a3a24'; c.beginPath(); c.ellipse(hx, GY + 6, 104 * hole, 28 * hole, 0, 0, 7); c.fill(); c.fillStyle = '#1d110b'; c.beginPath(); c.ellipse(hx, GY + 6, 90 * hole, 21 * hole, 0, 0, 7); c.fill(); }
  // mate
  const mOn = tau > Ws(11, 1) - .3, Pm = lerpP(PR.MATEH, PR.MATER, sm(K.TP, K.TP + .35, tau)), mx = mateX(tau), mxp = mateX(tau - .06), mvx = (mx - mxp) / .06;
  const mHop = tau > K.TP && tau < K.TP + .4 ? -26 * Math.sin((tau - K.TP) / .4 * Math.PI) : 0;
  // shadows
  if (g > .02) { shadow(c, ST.x, GY + 4, (P.w + P.tailLen * .3) * P.S * .6, g * (1 - sink)); }
  if (mOn) shadow(c, mx, GY + 4, Pm.w * Pm.S * .6, 1);
  // creatures
  if (mOn) {
    const my = GY - offs(Pm) + mHop;
    const mArmR = tau >= K.tR ? ST.armR : null, mExt = tau >= K.tR ? ST.armExt : 1;
    drawCreature(c, Pm, { x: mx, y: my, t: tau + 1.3, dir: -1, walk: clamp(Math.abs(mvx) / 70), speak: spk(13, tau), armR: mArmR, armExt: mExt, edx: 0, sc: 1 + (tau > K.tC - .05 && tau < K.tC + .3 ? .05 * Math.sin((tau - K.tC + .05) / .35 * Math.PI) : 0) });
  }
  c.save(); if (sink > .01) { c.beginPath(); c.rect(0, -400, W, GY + 400 + 12); c.clip(); }
  drawCreature(c, P, ST); c.restore();
  if (hole > .01) { c.strokeStyle = '#7a5330'; c.lineWidth = 11; c.lineCap = 'round'; c.beginPath(); c.ellipse(hx, GY + 6, 100 * hole, 25 * hole, 0, .06 * Math.PI, .94 * Math.PI); c.stroke(); c.strokeStyle = INK; c.lineWidth = 3; c.beginPath(); c.ellipse(hx, GY + 6, 106 * hole, 31 * hole, 0, .05 * Math.PI, .95 * Math.PI); c.stroke(); }
  // sprouts (life finds a way)
  const sp = tr(tau, [[tm(7, .3), 0], [tm(7, 1.5), 1]]);
  if (sp > .01 && tau < K.M4b) { c.strokeStyle = '#4fa63d'; c.lineWidth = 6; c.lineCap = 'round'; for (const sx of [380, 470, 760, 860]) { c.beginPath(); c.moveTo(sx, GY + 30); c.quadraticCurveTo(sx + 8, GY + 30 - 26 * sp, sx + 16 * sp, GY + 30 - 42 * sp); c.stroke(); c.fillStyle = '#6cc24a'; c.beginPath(); c.ellipse(sx + 16 * sp, GY + 30 - 44 * sp, 12 * sp, 6 * sp, -.6, 0, 7); c.fill(); } }
  // ---- narration-driven props ----
  // L1: "tadpole" spotlight + memo drifting by
  const ts = Ws(1, 11), te = We(1, 11) + 1.0;
  if (tau > ts && tau < te) { const a = sm(ts, ts + .2, tau) * (1 - sm(te - .3, te, tau)); c.save(); c.globalAlpha = a; c.strokeStyle = '#fff'; c.lineWidth = 6; c.setLineDash([14, 10]); c.lineDashOffset = -tau * 40; c.beginPath(); c.arc(ST.x - 20, ST.y, 92 + Math.sin(tau * 8) * 4, 0, 7); c.stroke(); c.restore(); }
  const m0 = Ws(1, 19), m1 = We(1, 25) + .6;
  if (tau > m0 && tau < m1) { const u = (tau - m0) / (m1 - m0); c.save(); c.translate(lerp(1360, -120, u), 250 + Math.sin(u * 7) * 30); c.rotate(Math.sin(u * 9) * .3); c.fillStyle = '#fffdf2'; rr(c, -50, -36, 100, 72, 6); c.fill(); c.lineWidth = 4; c.strokeStyle = INK; c.stroke(); c.fillStyle = INK; c.font = '900 22px Impact,sans-serif'; c.textAlign = 'center'; c.fillText('MEMO', 0, -8); c.fillRect(-34, 4, 68, 4); c.fillRect(-34, 16, 52, 4); c.restore(); }
  // L3: broken compass ("sense of direction, which it does not use")
  const ca = Ws(3, 12), cb = We(3, 20) + .3;
  if (tau > ca && tau < cb) { const a = sm(ca, ca + .25, tau) * (1 - sm(cb - .3, cb, tau)); c.save(); c.globalAlpha = a; c.translate(ST.x, ST.y - 130 + Math.sin(tau * 3) * 5); c.fillStyle = '#fff'; c.beginPath(); c.arc(0, 0, 36, 0, 7); c.fill(); c.lineWidth = 5; c.strokeStyle = INK; c.stroke(); c.rotate(tau * 14); c.fillStyle = '#e0443a'; c.beginPath(); c.moveTo(0, -28); c.lineTo(7, 0); c.lineTo(-7, 0); c.fill(); c.fillStyle = '#4a5560'; c.beginPath(); c.moveTo(0, 28); c.lineTo(7, 0); c.lineTo(-7, 0); c.fill(); c.restore(); }
  // L4: "no plan" sign + "four legs" tags
  const pa = Ws(4, 8), pb = We(4, 10) + .5;
  if (tau > pa && tau < pb) { const a = sm(pa, pa + .2, tau) * (1 - sm(pb - .3, pb, tau)); c.save(); c.globalAlpha = a; c.translate(ST.x + 20, ST.y - 140); c.rotate(-.04); c.fillStyle = '#fffdf2'; rr(c, -105, -34, 210, 68, 8); c.fill(); c.lineWidth = 5; c.strokeStyle = INK; c.stroke(); c.fillStyle = INK; c.font = '900 34px Impact,sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('PLAN: ???', 0, 2); c.restore(); }
  const la = Ws(4, 13), lb = We(4, 14) + 1.3;
  if (tau > la && tau < lb && P === PR.LIZ) { const lx = [-P.legOX, -P.legIX, P.legIX, P.legOX]; lx.forEach((f, i) => { const u = (tau - la - i * .13); if (u < 0) return; const s = Math.min(1, u * 5), a = 1 - sm(lb - .3, lb, tau); c.save(); c.globalAlpha = a; c.translate(ST.x + f * P.w * P.S, GY + 30); c.scale(s, s); c.fillStyle = '#ffd23f'; c.beginPath(); c.arc(0, 0, 16, 0, 7); c.fill(); c.lineWidth = 4; c.strokeStyle = INK; c.stroke(); c.fillStyle = INK; c.font = '900 24px Impact,sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(String(i + 1), 0, 1); c.restore(); }); }
  // L5: ground-thump dust
  if (stomp > .15 && tau > Ws(5, 3)) { c.save(); c.globalAlpha = stomp * .5; c.fillStyle = '#e8d6a8'; for (let i = 0; i < 6; i++) { const k = 1 - stomp; c.beginPath(); c.arc(ST.x + (i - 2.5) * 60 * (1 + k), GY + 6 - k * 20, 12 + k * 22, 0, 7); c.fill(); } c.restore(); }
  // L6: the star / asteroid
  if (astOn) {
    const sx = lerp(230, 600, Math.pow(uA, 1.7)), sy = lerp(70, GY - 120, Math.pow(uA, 1.7)), r = 5 + 125 * Math.pow(uA, 3.2);
    const ang = Math.atan2(sy - 70, sx - 230);
    c.save();
    if (r > 14) { const L = r * 5.5, tx = sx - Math.cos(ang) * L, ty = sy - Math.sin(ang) * L, gr = c.createLinearGradient(sx, sy, tx, ty); gr.addColorStop(0, 'rgba(255,240,170,.95)'); gr.addColorStop(.4, 'rgba(255,150,40,.75)'); gr.addColorStop(1, 'rgba(255,80,20,0)'); c.fillStyle = gr; c.beginPath(); const nx = -Math.sin(ang), ny = Math.cos(ang); c.moveTo(sx + nx * r * 1.1, sy + ny * r * 1.1); c.lineTo(tx, ty); c.lineTo(sx - nx * r * 1.1, sy - ny * r * 1.1); c.closePath(); c.fill(); }
    const gl = c.createRadialGradient(sx, sy, 0, sx, sy, r * 2.6); gl.addColorStop(0, 'rgba(255,248,200,.9)'); gl.addColorStop(1, 'rgba(255,200,80,0)'); c.fillStyle = gl; c.beginPath(); c.arc(sx, sy, r * 2.6, 0, 7); c.fill();
    if (r < 16) { starBurst(c, sx, sy, r * 2.2 + Math.sin(tau * 9) * 2, '#fff8c8', tau, 4); } else { c.fillStyle = '#7a5a46'; c.beginPath(); c.arc(sx, sy, r, 0, 7); c.fill(); c.lineWidth = Math.max(3, r * .07); c.strokeStyle = INK; c.stroke(); c.fillStyle = '#5b4030'; for (const [dx, dy, rr2] of [[-.3, -.2, .22], [.25, .15, .17], [-.05, .38, .12]]) { c.beginPath(); c.arc(sx + dx * r, sy + dy * r, rr2 * r, 0, 7); c.fill(); } }
    c.restore();
  }
  if (panic > .3) for (let i = 0; i < 3; i++) { const k = ((tau * 2.2 + i / 3) % 1); drop(c, ST.x + (i - 1) * 60 + (i - 1) * k * 40, ST.y - 130 * (P.S) + k * 40 - 40, 1.1 * (1 - k * .4)); }
  // impact: shockwave, debris
  const ti = tau - K.TI;
  if (ti > 0 && ti < 1.6) {
    const ix = 600, iy = GY - 40;
    c.save(); c.globalAlpha = clamp(1 - ti / .9); c.lineWidth = 22; c.strokeStyle = '#ffd9a0'; c.beginPath(); c.ellipse(ix, iy + 20, ti * 1500, ti * 380, 0, 0, 7); c.stroke(); c.restore();
    for (let i = 0; i < 26; i++) { const a = rnd(i) * Math.PI * 2, v = 280 + rnd(i + 5) * 520, px = ix + Math.cos(a) * v * ti, py = iy - Math.abs(Math.sin(a)) * v * ti * 1.1 + 900 * ti * ti * .5; if (py > GY + 40) continue; c.fillStyle = i % 3 ? '#6b4a38' : '#ff9a3a'; c.save(); c.translate(px, py); c.rotate(ti * 6 + i); c.fillRect(-6, -6, 12 + rnd(i) * 8, 12); c.restore(); }
    c.save(); c.globalAlpha = .6 * (1 - ti / 1.6); c.fillStyle = '#7a6a60'; for (let i = 0; i < 9; i++) { c.beginPath(); c.arc(ix + (i - 4) * 110, GY - ti * 120 - rnd(i) * 40, 60 + ti * 50, 0, 7); c.fill(); } c.restore();
  }
  // L8/L10 props
  const ma = Ws(10, 6), mb = We(10, 12) + .5;
  if (tau > ma && tau < mb) { const a = sm(ma, ma + .2, tau) * (1 - sm(mb - .3, mb, tau)); c.save(); c.globalAlpha = a; c.translate(ST.x + 110, ST.y - 150); c.fillStyle = '#fff'; c.beginPath(); c.arc(0, 0, 40, 0, 7); c.fill(); c.lineWidth = 5; c.strokeStyle = INK; c.stroke(); c.fillStyle = INK; c.beginPath(); c.moveTo(-18, -8); c.lineTo(-8, -8); c.lineTo(4, -18); c.lineTo(4, 18); c.lineTo(-8, 8); c.lineTo(-18, 8); c.closePath(); c.fill(); c.strokeStyle = '#e0443a'; c.lineWidth = 7; c.beginPath(); c.moveTo(-26, 26); c.lineTo(26, -26); c.stroke(); c.restore(); }
  const pA = Ws(10, 18), pB = We(10, 19) + 1.0;
  if (tau > pA && tau < pB) { const a = sm(pA, pA + .25, tau) * (1 - sm(pB - .3, pB, tau)); const top = ST.y - (P.h / 2 + 30) * P.S, bot = GY + 14; c.save(); c.globalAlpha = a; c.strokeStyle = '#2f9e5a'; c.lineWidth = 5; c.setLineDash([12, 9]); c.beginPath(); c.moveTo(ST.x, top - 40); c.lineTo(ST.x, bot); c.stroke(); c.setLineDash([]); c.translate(ST.x + 120, ST.y - 80); c.fillStyle = '#fff'; c.beginPath(); c.arc(0, 0, 44, 0, 7); c.fill(); c.lineWidth = 5; c.strokeStyle = INK; c.stroke(); c.strokeStyle = '#2f9e5a'; c.lineWidth = 11; c.beginPath(); c.moveTo(-20, 2); c.lineTo(-6, 18); c.lineTo(22, -16); c.stroke(); c.fillStyle = '#fff'; c.strokeStyle = INK; c.lineWidth = 6; c.font = '900 34px Impact,sans-serif'; c.textAlign = 'center'; c.strokeText('10/10', 0, 74); c.fillText('10/10', 0, 74); c.restore(); }
  // L11/L12: heart, high-five burst, poof, sweat
  const hA = Ws(11, 4); if (tau > hA && tau < hA + 1.4) { const u = (tau - hA) / 1.4; c.save(); c.globalAlpha = 1 - sm(.6, 1, u); heart(c, mx, GY - offs(PR.MATEH) - 125 - u * 40, 1.7, '#ff6b9a'); c.restore(); }
  const tc = tau - K.tC; if (tc > 0 && tc < .7) { c.save(); c.globalAlpha = 1 - tc / .7; starBurst(c, 645, ST.y - 20, 40 + tc * 190, '#ffe27a', tc * 3, 10); starBurst(c, 645, ST.y - 20, 22 + tc * 100, '#fff', -tc * 2, 10); c.fillStyle = '#e0443a'; c.font = '900 56px Impact,sans-serif'; c.textAlign = 'center'; c.lineWidth = 9; c.strokeStyle = INK; c.strokeText('CLAP!', 645, ST.y - 100 - tc * 40); c.fillText('CLAP!', 645, ST.y - 100 - tc * 40); c.restore(); }
  const tp = tau - K.TP; if (tp > 0 && tp < .9) { const my = GY - offs(PR.MATER); c.save(); c.globalAlpha = (1 - tp / .9) * .95; for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI * 2; c.fillStyle = i % 2 ? '#ffffff' : '#e8e2ea'; c.beginPath(); c.arc(mx + Math.cos(a) * tp * 120, my - 40 + Math.sin(a) * tp * 90, 26 + tp * 36, 0, 7); c.fill(); } c.restore(); }
  const sw = Ws(12, 3); if (tau > sw && tau < We(12, 17) + 1) { const u = Math.min(1, (tau - sw) / .5); drop(c, ST.x + 44, ST.y - (P.h / 2) * P.S - 6 + Math.sin(tau * 6) * 2 + 14 * (1 - u), 1.6 * u); }
  // speech bubbles for the mascot's own voice
  const bub = (id, px, py, tx, ty) => { const cc = C(id); const a0 = tm(id, cc.words[0].s) - .1, a1 = cc.start + cc.len + .55; if (tau < a0 || tau > a1) return; const sh2 = cc.words.filter(w => tau >= tm(id, w.s)).length; bubble(c, cc.words.map(w => w.w), sh2, px, py, sm(a0, a0 + .12, tau) * (1 - sm(a1 - .25, a1, tau)), .8 + .2 * sm(a0, a0 + .2, tau), tx, ty); };
  const topY = ST.y - (P.h / 2 + 20) * P.S;
  bub(2, clamp(ST.x, 260, 1020), Math.max(110, topY - 70), ST.x, topY + 14);
  bub(9, clamp(ST.x, 300, 980), Math.max(110, topY - 74), ST.x + 20, topY + 12);
  bub(13, clamp(mx, 240, 1030), Math.max(120, GY - offs(PR.MATER) - 150), mx, GY - offs(PR.MATER) - 50);
  c.restore();   // end camera
  // flash
  const fl = tr(tau, [[K.TI, 1], [K.TI + .13, 1], [K.TI + 1.15, 0]]); if (tau >= K.TI && fl > .002) { c.fillStyle = `rgba(255,250,235,${fl})`; c.fillRect(0, 0, W, H); }
  // HUD: stage tags, evolution strip, CTRL+Z, title, end card
  const times = [0.2, Ws(3, 10), Ws(4, 6), Ws(5, 8), Ws(7, 10), Ws(8, 6), Ws(10, 17)];
  [['TADPOLE', Ws(1, 11)], ['FISH', Ws(3, 10)], ['LIZARD', Ws(4, 6)], ['DINOSAUR', Ws(5, 8)], ['RAT', Ws(7, 10)], ['MONKEY', Ws(8, 6)], ['HUMAN', Ws(10, 17)], ['ITS MATE', Ws(11, 4)], ['RAT. AGAIN.', Ws(12, 5)]].forEach(t_ => nameTag(c, t_[0], tau, t_[1]));
  const big = sm(Ws(12, 8) - .3, Ws(12, 8), tau) * (1 - sm(We(12, 17) + .5, We(12, 17) + 1.0, tau)), un = tr(tau, [[Ws(12, 13), 7], [We(12, 17), 1]]);
  let cnt = STAGES.filter((_, i) => tau >= times[i]).length; if (tau > Ws(12, 13)) cnt = Math.min(cnt, Math.round(un));
  const reveal = sm(times[1] - .1, times[1], tau);
  if (reveal > 0.01) { const sc = lerp(1, 1.9, big); strip(c, tau, K, times, cnt, lerp(214, W / 2, big), lerp(52, 128, big), sc * .9, reveal); }
  if (tau > Ws(12, 12) - .2 && tau < We(12, 17) + .9) { const a = sm(Ws(12, 12) - .2, Ws(12, 12) + .1, tau) * (1 - sm(We(12, 17) + .5, We(12, 17) + .9, tau)); const pr = tau > Ws(12, 13) && tau < Ws(12, 13) + .25 ? 1 : 0; c.save(); c.globalAlpha = a; keyCap(c, 'Ctrl', 560, 262, 150, 70, pr); c.fillStyle = INK; c.font = '900 40px sans-serif'; c.textAlign = 'center'; c.fillText('+', 648, 262); keyCap(c, 'Z', 736, 262, 84, 70, pr); c.restore(); }
  const ta = sm(0, .4, tau) * (1 - sm(2.3, 3.0, tau));
  if (ta > .01) { c.save(); c.globalAlpha = ta; c.textAlign = 'center'; c.lineJoin = 'round'; c.font = '900 84px Impact,"Arial Black",sans-serif'; c.lineWidth = 16; c.strokeStyle = INK; c.fillStyle = '#fff'; c.strokeText('THE ASCENT OF THE MASCOT', W / 2, 190); c.fillText('THE ASCENT OF THE MASCOT', W / 2, 190); c.font = 'italic 700 34px Georgia,serif'; c.lineWidth = 8; c.strokeText('a very serious nature documentary', W / 2, 242); c.fillStyle = '#ffd9bf'; c.fillText('a very serious nature documentary', W / 2, 242); c.restore(); }
  const ea = sm(K.end - 2.2, K.end - 1.6, tau); if (ea > .01) { c.save(); c.globalAlpha = ea; c.fillStyle = 'rgba(0,0,0,.35)'; c.fillRect(0, 0, W, H); c.textAlign = 'center'; c.lineJoin = 'round'; c.font = '900 120px Impact,"Arial Black",sans-serif'; c.lineWidth = 20; c.strokeStyle = INK; c.fillStyle = '#fff'; c.strokeText('THE END', W / 2, 330); c.fillText('THE END', W / 2, 330); c.restore(); }
}

/* ---------------- sound effects + music, synthesized in code (WebAudio) ---------------- */
let ac = null, mg = null, nb = null;
function initAC() {
  if (ac) return; try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return; }
  mg = ac.createGain(); mg.gain.value = .5; mg.connect(ac.destination);
  const len = ac.sampleRate * 2; nb = ac.createBuffer(1, len, ac.sampleRate); const d = nb.getChannelData(0); for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
}
const mf = n => 440 * Math.pow(2, (n - 69) / 12);
function tone(f, dur, o = {}) {
  if (!ac) return; const t = ac.currentTime + (o.when || 0), os = ac.createOscillator(), g = ac.createGain();
  os.type = o.type || 'sine'; os.frequency.setValueAtTime(f, t); if (o.to) os.frequency.exponentialRampToValueAtTime(o.to, t + dur);
  const v = o.vol == null ? .2 : o.vol, a = Math.min(o.att || .01, dur * .9);
  g.gain.setValueAtTime(.0001, t); g.gain.linearRampToValueAtTime(v, t + a); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
  let n = os; if (o.lp) { const fl = ac.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = o.lp; os.connect(fl); n = fl; }
  n.connect(g); g.connect(mg); os.start(t); os.stop(t + dur + .05);
  if (o.vib) { const l = ac.createOscillator(), lg = ac.createGain(); l.frequency.value = o.vibf || 6; lg.gain.value = o.vib; l.connect(lg); lg.connect(os.frequency); l.start(t); l.stop(t + dur + .05); }
}
function nz(dur, o = {}) {
  if (!ac) return; const t = ac.currentTime + (o.when || 0), s = ac.createBufferSource(), fl = ac.createBiquadFilter(), g = ac.createGain();
  s.buffer = nb; s.loop = true; fl.type = o.type || 'lowpass'; fl.frequency.setValueAtTime(o.f0 || 1000, t); if (o.f1) fl.frequency.exponentialRampToValueAtTime(o.f1, t + dur);
  g.gain.setValueAtTime(.0001, t); g.gain.linearRampToValueAtTime(o.vol || .2, t + (o.att || .01)); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
  s.connect(fl); fl.connect(g); g.connect(mg); s.start(t); s.stop(t + dur + .05);
}
const SFX = {
  bubble() { tone(500 + Math.random() * 500, .12, { to: 1300, vol: .05 }); },
  pop() { tone(300, .1, { to: 900, vol: .15 }); },
  whoosh() { nz(.5, { type: 'bandpass', f0: 300, f1: 2500, vol: .14, att: .15 }); },
  sparkle() { [79, 83, 86, 91].forEach((n, i) => tone(mf(n), .35, { vol: .07, when: i * .07, type: 'triangle' })); },
  splash() { nz(.6, { type: 'lowpass', f0: 3000, f1: 400, vol: .25, att: .02 }); },
  step(v) { nz(.08, { type: 'lowpass', f0: 600, vol: v || .1 }); },
  stomp(v = 1) { tone(70, .4, { to: 35, vol: .5 * v }); nz(.3, { type: 'lowpass', f0: 200, vol: .3 * v }); },
  whistle(d) { tone(300, d, { to: 2800, vol: .07, type: 'sawtooth', lp: 3000, att: d * .8 }); },
  boom() { nz(1.6, { type: 'lowpass', f0: 1500, f1: 60, vol: .7, att: .01 }); tone(60, 1.5, { to: 25, vol: .8 }); tone(2900, 2, { vol: .02 }); },
  wind(d) { nz(d, { type: 'bandpass', f0: 500, f1: 300, vol: .1, att: d * .4 }); },
  growl() { tone(90, .7, { to: 60, vol: .25, type: 'sawtooth', lp: 300, vib: 12, vibf: 14 }); },
  tick() { tone(1400, .03, { vol: .12, type: 'square' }); },
  tock() { tone(900, .04, { vol: .12, type: 'square' }); },
  clap() { nz(.12, { type: 'highpass', f0: 1200, vol: .6, att: .002 }); nz(.07, { type: 'bandpass', f0: 2200, vol: .5, att: .001, when: .03 }); },
  squeak() { tone(1100, .12, { to: 2200, vol: .1 }); tone(1500, .1, { to: 2600, vol: .07, when: .12 }); },
  click() { tone(1800, .04, { vol: .14, type: 'square' }); },
  brass() { [48, 55, 60, 64].forEach(n => tone(mf(n), 1.4, { type: 'sawtooth', lp: 900, vol: .07, att: .5 })); },
  sad() { let w = 0;[[58, .55], [57, .55], [56, .55], [55, 1.2]].forEach(([n, d], i) => { tone(mf(n), d, { type: 'sawtooth', lp: 1100, vol: .17, when: w, vib: i === 3 ? 10 : 0, vibf: 7, att: .03 }); w += d * .92; }); },
  poof() { nz(.35, { type: 'bandpass', f0: 900, f1: 300, vol: .3, att: .01 }); },
  boing() { tone(200, .35, { to: 600, vol: .13, vib: 30, vibf: 20 }); },
  plink() { tone(mf(84), .3, { type: 'triangle', vol: .1 }); tone(mf(79), .4, { type: 'triangle', vol: .1, when: .14 }); },
  ding() { tone(mf(88), .7, { vol: .1, type: 'triangle' }); },
};
const pad = (ns, d, v) => ns.forEach(n => { tone(mf(n), d, { type: 'sawtooth', lp: 700, vol: v, att: d * .35 }); tone(mf(n) * 1.004, d, { type: 'sawtooth', lp: 700, vol: v, att: d * .35 }); });
const mbox = (n, v) => { tone(mf(n), .9, { type: 'triangle', vol: v, lp: 3200 }); tone(mf(n) * 2, .4, { type: 'sine', vol: v * .3 }); };
function events(K) {                          // one-shot sound cues, pinned to the same words as the visuals
  const E = [], e = (t, f) => E.push([t, f]);
  e(Ws(1, 11), SFX.pop); e(K.M1a, () => { SFX.whoosh(); SFX.boing(); }); e(K.M1b, SFX.sparkle);
  e(K.M2a, () => { SFX.splash(); SFX.whoosh(); }); e(K.M2b, SFX.sparkle); [2, 3, 4].forEach(k => e(Ws(4, k), () => SFX.step(.12)));
  [3, 5, 7].forEach((k, i) => e(Ws(5, k), () => SFX.stomp(.5 + i * .25))); e(Ws(5, 8), () => { SFX.stomp(1.2); SFX.sparkle(); });
  e(Ws(6, 6), SFX.ding); e(Ws(6, 7), () => SFX.whistle(Math.max(1, K.TI - Ws(6, 7))));
  e(K.TI, () => { SFX.boom(); }); e(K.TI + .6, () => SFX.wind(Math.max(2, K.s1 - K.TI)));
  e(K.s0, () => tone(160, .9, { to: 40, vol: .3, type: 'sawtooth', lp: 400 })); e(K.u0, () => tone(200, .4, { to: 500, vol: .2 })); e(Ws(7, 11), () => { SFX.pop(); SFX.squeak(); });
  e(Ws(7, 12), SFX.growl); e(Ws(7, 14), SFX.whoosh); [0, 1, 2, 3, 4, 5].forEach(k => e(K.M4a + k * .32, k % 2 ? SFX.tock : SFX.tick)); e(K.M4b, () => { SFX.boing(); SFX.sparkle(); });
  e(Ws(10, 6), SFX.click); e(K.M5a, SFX.brass); e(K.M5b, SFX.sparkle); e(Ws(10, 18), SFX.ding);
  e(Ws(11, 4), SFX.ding); e(Ws(11, 1), () => { [0, 1, 2, 3, 4, 5].forEach(i => setTimeout(() => SFX.step(.08), i * 220)); });
  e(K.tC, SFX.clap); e(K.TP, () => { SFX.poof(); setTimeout(SFX.squeak, 220); }); e(Ws(12, 13), SFX.click);
  e(We(12, 17) + .1, SFX.sad); e(C(13).start + C(13).len + .2, SFX.plink);
  return E;
}
function sections(K) {                        // looping music beds
  const S = [];
  S.push({ n: 'doc', a: .3, b: Ws(5, 6), step: 3.6, f: i => { pad([[57, 60, 64], [53, 57, 60], [48, 55, 64], [55, 59, 62]][i % 4], 4.4, .05); if (i % 2) SFX.stomp(.15); } });
  S.push({ n: 'hush', a: Ws(6, 0), b: Ws(6, 11), step: 4, f: () => pad([57, 64, 69], 4.5, .035) });
  S.push({ n: 'panic', a: Ws(6, 11), b: K.TI, step: .11, f: i => tone(mf(i % 2 ? 88 + (i >> 3) : 91 + (i >> 3)), .1, { type: 'sawtooth', lp: 2600, vol: .035 }) });
  S.push({ n: 'dawn', a: K.h1, b: C(7).start + C(7).len, step: .5, f: i => mbox([72, 76, 79, 84, 79, 76][i % 6], .06) });
  S.push({ n: 'bounce', a: K.M4a, b: Ws(10, 13), step: .25, f: i => { const m = [60, 67, 64, 67, 62, 69, 65, 69][i % 8]; tone(mf(m), .14, { type: 'triangle', vol: .055, lp: 2000 }); if (i % 2 === 0) tone(mf(m - 24), .18, { type: 'sine', vol: .07 }); } });
  S.push({ n: 'tender', a: Ws(11, 0), b: K.TP, step: .7, f: i => mbox([65, 69, 72, 77][i % 4], .05) });
  return S;
}
const lastIdx = {};
function audioFrame(tau, prev, K) {
  if (!ac || state !== 'playing' || tau < prev || tau - prev > .5) return;
  events(K).forEach(([t, f]) => { if (prev < t && tau >= t) f(); });
  sections(K).forEach(s => { if (tau >= s.a && tau < s.b) { const i = Math.floor((tau - s.a) / s.step); if (lastIdx[s.n] !== i) { lastIdx[s.n] = i; s.f(i); } } });
  if (tau < K.M2b && Math.random() < .05) SFX.bubble();
}

/* ---------------- narration playback (audio clock drives the film clock) ---------------- */
const auds = CL.map(c => {
  const a = new Audio(); a.preload = 'auto'; a.dataset.src = 'local';
  a.addEventListener('error', () => { if (a.dataset.src === 'local') { a.dataset.src = 'remote'; a.src = c.url; a.load(); } else c.failed = true; });
  a.addEventListener('playing', () => { a.playbackRate = R; });
  a.src = c.local; a.defaultPlaybackRate = R; a.playbackRate = R; if ('preservesPitch' in a) a.preservesPitch = true; if ('webkitPreservesPitch' in a) a.webkitPreservesPitch = true;
  return a;
});
let state = 'idle', tau = T0, prevTau = T0, active = -1, nextIdx = 0, lastTs = 0;
function startClip(i) {
  const c = CL[i], a = auds[i]; c.start = tau; replan(i + 1); active = i; nextIdx = i + 1; c.started = true; c.playing = false; c.wait = 0;
  if (c.failed) { c.sim = true; return; }
  a.muted = false; a.playbackRate = R;
  const go = () => { try { a.currentTime = c.m0; } catch (e) { } a.playbackRate = R; const p = a.play(); if (p && p.catch) p.catch(() => { c.sim = true; }); };
  if (a.readyState >= 1) go(); else a.addEventListener('loadedmetadata', go, { once: true });
}
function finish(i) { const c = CL[i]; try { auds[i].pause(); } catch (e) { } c.len = Math.max(.2, tau - c.start); active = -1; replan(i + 1); }
function step(dt) {
  prevTau = tau;
  if (active >= 0) {
    const c = CL[active], a = auds[active]; if (c.failed) c.sim = true;
    if (c.sim) { tau += dt; if (tau >= c.start + c.len) finish(active); }
    else {
      const ct = a.currentTime;
      for (const cu of c.cuts) if (ct >= cu.a && ct < cu.b - .02 && a.seekable.length && a.seekable.end(a.seekable.length - 1) >= cu.b) { a.currentTime = cu.b; break; }
      if (a.readyState >= 3 && !a.paused) { c.playing = true; const nt = c.start + cm(c, a.currentTime) / R; if (nt > tau) tau = nt; }
      else { c.wait += dt; if (c.wait > 6 && !c.playing) c.sim = true; }
      if (a.currentTime >= c.m1 || a.ended) finish(active);
    }
  } else tau += dt;
  if (active < 0 && nextIdx < CL.length && tau >= CL[nextIdx].start) startClip(nextIdx);
  if (active < 0 && nextIdx >= CL.length && tau >= endT()) { state = 'ended'; $('play').classList.remove('gone'); $('playlbl').textContent = 'REPLAY'; $('pp').textContent = '▶'; }
}
function unlock() { auds.forEach((a, i) => { a.muted = true; const p = a.play(); if (p && p.then) p.then(() => { if (!CL[i].started) { a.pause(); a.currentTime = 0; } a.muted = false; }).catch(() => { a.muted = false; }); }); }
function reset() {
  auds.forEach(a => { try { a.pause(); a.currentTime = 0; } catch (e) { } }); CL.forEach(c => { c.started = c.sim = c.playing = false; c.wait = 0; });
  for (const k in lastIdx) delete lastIdx[k]; tau = prevTau = T0; active = -1; nextIdx = 0;
  CL.forEach(c => { let t = c.words[c.words.length - 1].e + .22 - c.m0; c.cuts.forEach(cu => t -= (cu.b - cu.a)); c.len = t / R; }); replan(0); curSub = -2;
}
function startPlay() {
  initAC(); if (ac && ac.state === 'suspended') ac.resume();
  if (state === 'ended') reset(); else if (state === 'idle') unlock();
  state = 'playing'; $('play').classList.add('gone'); $('pp').textContent = '❚❚';
}
function togglePause() {
  if (state === 'playing') { state = 'paused'; if (active >= 0) auds[active].pause(); if (ac) ac.suspend(); $('pp').textContent = '▶'; }
  else if (state === 'paused') { state = 'playing'; if (active >= 0 && !CL[active].sim) { const p = auds[active].play(); if (p && p.catch) p.catch(() => { }); } if (ac) ac.resume(); $('pp').textContent = '❚❚'; }
  else startPlay();
}
$('play').addEventListener('click', startPlay); $('pp').addEventListener('click', togglePause);
$('cc').addEventListener('click', () => { $('sub').classList.toggle('hide'); $('cc').classList.toggle('off'); });
addEventListener('keydown', e => { if (e.code === 'Space') { e.preventDefault(); if (state === 'idle' || state === 'ended') startPlay(); else togglePause(); } });

/* ---------------- subtitles (word-synced) ---------------- */
let curSub = -2, subOn = -1; const subEl = $('sub');
function updateSubs(t) {
  let idx = -1; for (let i = 0; i < CL.length; i++) { const c = CL[i]; if (t >= c.start - .05 && t <= c.start + c.len + .35) { idx = i; break; } }
  if (idx !== curSub) {
    curSub = idx; subOn = -1; subEl.className = (subEl.classList.contains('hide') ? 'hide ' : '') + (idx >= 0 ? (CL[idx].who === 'C' ? 'mascot' : 'narr') : '');
    subEl.innerHTML = idx < 0 ? '' : (CL[idx].who === 'C' ? '<span class="who on">THE MASCOT</span>' : '') + CL[idx].words.map(w => `<span>${w.w}</span>`).join(' ');
  }
  if (idx >= 0) { const c = CL[idx]; let k = 0; c.words.forEach(w => { if (t >= tm(c.id, w.s) - .02) k++; }); if (k !== subOn) { subOn = k; const sp = subEl.querySelectorAll('span:not(.who)'); sp.forEach((s, i) => s.classList.toggle('on', i < k)); } }
}

/* ---------------- main loop ---------------- */
function fit() { const r = Math.min(2, window.devicePixelRatio || 1), w = Math.round(Math.min(innerWidth, innerHeight * 16 / 9) * r); if (cv.width !== w) { cv.width = w; cv.height = Math.round(w * 9 / 16); } }
addEventListener('resize', fit); fit();
function frame(ts) {
  requestAnimationFrame(frame); const dt = Math.min(.1, (ts - lastTs) / 1000 || 0); lastTs = ts;
  if (state === 'playing') { step(dt); audioFrame(tau, prevTau, cues()); }
  render(tau); updateSubs(tau); $('progf').style.width = (100 * clamp(tau / endT())) + '%';
}
window.__dbg = { render: t => { tau = t; render(t); updateSubs(t); }, end: endT, CL, cues, cm };
requestAnimationFrame(frame);
})();
