'use strict';
const $ = id => document.getElementById(id);
const defaults = { speed: 25, angle: 45, height: 0, gravity: 9.81 };
const colors = ['#58869a', '#8f77a1', '#558975', '#b49a52', '#758bb5', '#b57f86'];
let parameters = { ...defaults };
let time = 0, running = false, lastFrame = 0, frameId = 0, showApex = true, mission = false;
let experiments = [], noteText = '', toastTimer, noteTimer;
const canvas = $('trajectory');
const ctx = canvas.getContext('2d');
const format = (n, digits = 2) => n.toLocaleString('id-ID', { minimumFractionDigits: digits, maximumFractionDigits: digits });

function toast(message) {
  $('toast').textContent = message;
  $('toast').classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $('toast').classList.remove('visible'), 3200);
}
function store(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); return true; }
  catch { toast('Penyimpanan browser tidak tersedia. Unduh salinan hasilmu.'); return false; }
}
function loadStored() {
  try {
    const data = JSON.parse(localStorage.getItem('parabola-experiments') || '[]');
    if (Array.isArray(data)) experiments = data.filter(p => p && Number.isFinite(p.speed) && p.speed >= 5 && p.speed <= 50 && Number.isFinite(p.angle) && p.angle >= 0 && p.angle <= 90 && Number.isFinite(p.height) && p.height >= 0 && p.height <= 30 && [9.81, 1.62, 3.71].includes(p.gravity)).slice(-50).map(p => ({ speed: p.speed, angle: p.angle, height: p.height, gravity: p.gravity }));
    const notes = JSON.parse(localStorage.getItem('parabola-notes') || '""');
    if (typeof notes === 'string') noteText = notes.slice(0, 15000);
  } catch { toast('Data lokal tidak dapat dibaca. Kamu tetap bisa bereksperimen.'); }
}
function rangeFill(input) {
  const value = (Number(input.value) - Number(input.min)) / (Number(input.max) - Number(input.min)) * 100;
  input.style.setProperty('--fill', `${value}%`);
}
function updateControls() {
  for (const key of ['speed', 'angle', 'height']) {
    $(key).value = parameters[key];
    $(`${key}-value`).textContent = format(parameters[key], 0);
    rangeFill($(key));
  }
  $('gravity').value = parameters.gravity;
  const result = Physics.calculate(parameters);
  $('result-range').innerHTML = `${format(result.range)} <small>m</small>`;
  $('result-height').innerHTML = `${format(result.maxHeight)} <small>m</small>`;
  $('result-time').innerHTML = `${format(result.flightTime)} <small>s</small>`;
  $('timeline-end').textContent = `${format(result.flightTime)} s`;
  $('timeline').disabled = result.flightTime === 0;
  updateLive();
  draw();
}
function updateLive() {
  const p = Physics.position(parameters, time);
  const result = Physics.calculate(parameters);
  $('live-x').innerHTML = `${format(p.x)} <small>m</small>`;
  $('live-y').innerHTML = `${format(p.y)} <small>m</small>`;
  $('live-v').innerHTML = `${format(Math.hypot(p.vx, p.vy))} <small>m/s</small>`;
  $('time').textContent = format(time);
  $('timeline').value = result.flightTime ? time / result.flightTime * 1000 : 0;
  rangeFill($('timeline'));
  $('launch').querySelector('span').textContent = running ? 'Jeda' : time > 0 && time < result.flightTime ? 'Lanjutkan' : time >= result.flightTime && time > 0 ? 'Luncurkan lagi' : 'Luncurkan';
  $('launch').querySelector('use').setAttribute('href', running ? '#i-pause' : '#i-play');
  $('sim-status').textContent = running ? 'Proyektil bergerak' : time > 0 && time >= result.flightTime ? 'Mendarat' : time > 0 ? 'Simulasi dijeda' : 'Siap diluncurkan';
}
function pause() {
  running = false;
  cancelAnimationFrame(frameId);
  updateLive();
}
function resetFlight() { pause(); time = 0; updateLive(); draw(); }
function launch() {
  if (running) { pause(); return; }
  const result = Physics.calculate(parameters);
  if (time >= result.flightTime) time = 0;
  if (!result.flightTime) { updateLive(); draw(); toast('Pada sudut 0° dari tanah, proyektil langsung menyentuh tanah. Coba sudut lebih besar.'); return; }
  running = true;
  lastFrame = performance.now();
  updateLive();
  frameId = requestAnimationFrame(animate);
}
function animate(now) {
  if (!running) return;
  time = Math.min(Physics.calculate(parameters).flightTime, time + Math.min((now - lastFrame) / 1000, 0.1) * Number($('play-speed').value));
  lastFrame = now;
  updateLive(); draw();
  if (time >= Physics.calculate(parameters).flightTime) {
    pause();
    if (mission) {
      const error = Math.abs(Physics.calculate(parameters).range - 60);
      const message = error <= 2 ? `Tepat sasaran! Jangkauan ${format(Physics.calculate(parameters).range)} m. Misi berhasil.` : `Mendarat ${format(error)} m dari target. Ubah sudut atau kecepatan, lalu coba lagi.`;
      $('challenge-result').textContent = message;
      toast(message);
    }
  } else frameId = requestAnimationFrame(animate);
}

function niceStep(maximum, divisions) {
  const raw = maximum / divisions;
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  return [1, 2, 5, 10].find(n => n * magnitude >= raw) * magnitude;
}
function draw() {
  const bounds = canvas.getBoundingClientRect();
  if (!bounds.width || !bounds.height || !ctx) return;
  const width = bounds.width, height = bounds.height, ratio = Math.min(window.devicePixelRatio || 1, 2);
  if (canvas.width !== Math.round(width * ratio) || canvas.height !== Math.round(height * ratio)) {
    canvas.width = Math.round(width * ratio); canvas.height = Math.round(height * ratio);
  }
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  ctx.clearRect(0, 0, width, height);
  const result = Physics.calculate(parameters);
  const comparisons = $('compare').checked ? experiments.slice(-6) : [];
  const plotted = [result, ...comparisons.map(Physics.calculate)];
  const desiredX = Math.max(80, ...plotted.map(p => p.range * 1.18), mission ? 75 : 0);
  const desiredY = Math.max(25, ...plotted.map(p => p.maxHeight * 1.32));
  const stepX = niceStep(desiredX, width < 430 ? 4 : 8), stepY = niceStep(desiredY, 5);
  const maxX = Math.ceil(desiredX / stepX) * stepX, maxY = Math.ceil(desiredY / stepY) * stepY;
  const left = width < 430 ? 43 : 55, top = 58, right = 27, bottom = 52;
  const plotWidth = width - left - right, plotHeight = height - top - bottom;
  const X = x => left + x / maxX * plotWidth, Y = y => height - bottom - y / maxY * plotHeight;
  ctx.font = '10px Jakarta, Segoe UI, sans-serif';
  ctx.lineWidth = 1; ctx.textAlign = 'center'; ctx.fillStyle = '#8b979b';
  for (let x = 0; x <= maxX; x += stepX) {
    ctx.beginPath(); ctx.strokeStyle = '#e9eeeb'; ctx.moveTo(X(x), top); ctx.lineTo(X(x), Y(0)); ctx.stroke();
    ctx.fillText(format(x, 0), X(x), Y(0) + 20);
  }
  ctx.textAlign = 'right';
  for (let y = 0; y <= maxY; y += stepY) {
    ctx.beginPath(); ctx.strokeStyle = '#e9eeeb'; ctx.moveTo(left, Y(y)); ctx.lineTo(width - right, Y(y)); ctx.stroke();
    ctx.fillText(format(y, 0), left - 12, Y(y) + 3);
  }
  ctx.strokeStyle = '#bdcac6'; ctx.beginPath(); ctx.moveTo(left, top - 6); ctx.lineTo(left, Y(0)); ctx.lineTo(width - right + 6, Y(0)); ctx.stroke();
  ctx.fillStyle = '#6c7e84'; ctx.textAlign = 'center'; ctx.font = '10px Jakarta, Segoe UI, sans-serif';
  ctx.fillText('Jarak horizontal, x (m)', left + plotWidth / 2, height - 9);
  ctx.save(); ctx.translate(13, top + plotHeight / 2); ctx.rotate(-Math.PI / 2); ctx.fillText('Ketinggian, y (m)', 0, 0); ctx.restore();
  const path = (params, until, color, dashed, lineWidth) => {
    const end = Physics.calculate(params).flightTime;
    ctx.beginPath(); ctx.strokeStyle = color; ctx.lineWidth = lineWidth; ctx.setLineDash(dashed ? [4, 6] : []);
    for (let i = 0; i <= 150; i++) {
      const p = Physics.position(params, end * until * i / 150);
      if (i === 0) ctx.moveTo(X(p.x), Y(p.y)); else ctx.lineTo(X(p.x), Y(p.y));
    }
    ctx.stroke(); ctx.setLineDash([]);
  };
  comparisons.forEach((p, i) => path(p, 1, colors[(experiments.length - comparisons.length + i) % colors.length] + '88', false, 1.8));
  if ($('prediction').checked) {
    path(parameters, 1, '#e9a586', true, 2);
    if (showApex) {
      const apexX = result.vx * result.apexTime;
      ctx.strokeStyle = '#efcbb9'; ctx.lineWidth = 1; ctx.setLineDash([3, 5]);
      ctx.beginPath(); ctx.moveTo(X(apexX), Y(result.maxHeight)); ctx.lineTo(X(apexX), Y(0)); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = '#ef743e'; ctx.beginPath(); ctx.arc(X(apexX), Y(result.maxHeight), 3, 0, Math.PI * 2); ctx.fill();
      const label = `H maks = ${format(result.maxHeight)} m`;
      ctx.font = '10px Jakarta, Segoe UI, sans-serif'; ctx.textAlign = 'center';
      const labelX = Math.max(left + 62, Math.min(width - right - 62, X(apexX)));
      ctx.fillStyle = '#fff9f3'; ctx.fillRect(labelX - 61, Y(result.maxHeight) - 30, 122, 23);
      ctx.fillStyle = '#b5653e'; ctx.fillText(label, labelX, Y(result.maxHeight) - 15);
    }
  }
  if (time > 0 && result.flightTime) path(parameters, time / result.flightTime, '#ef743e', false, 2.8);
  // Launcher diagram: its orientation follows the actual launch angle.
  const sourceX = X(0), sourceY = Y(parameters.height);
  ctx.save(); ctx.translate(sourceX, sourceY); ctx.rotate(-parameters.angle * Math.PI / 180);
  ctx.fillStyle = '#304d59'; ctx.fillRect(-8, -5, 23, 10); ctx.fillStyle = '#91a7ad'; ctx.fillRect(9, -5, 6, 10); ctx.restore();
  if (parameters.height > 0) { ctx.strokeStyle = '#a4b7b5'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(sourceX, sourceY + 8); ctx.lineTo(sourceX, Y(0)); ctx.stroke(); }
  const p = Physics.position(parameters, time), ballX = X(p.x), ballY = Y(p.y);
  ctx.fillStyle = '#f7d5c3'; ctx.beginPath(); ctx.arc(ballX, ballY, 12, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#ef743e'; ctx.beginPath(); ctx.arc(ballX, ballY, 6, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#fff4e7'; ctx.beginPath(); ctx.arc(ballX - 1.5, ballY - 2, 1.5, 0, Math.PI * 2); ctx.fill();
  if ($('vectors').checked) {
    const scale = Math.min(2.2, 90 / parameters.speed);
    arrow(ballX, ballY, ballX + p.vx * scale, ballY, '#477d95', 'vₓ');
    arrow(ballX, ballY, ballX, ballY - p.vy * scale, '#568469', 'vᵧ');
  }
  if (mission) {
    const targetX = X(60);
    ctx.fillStyle = '#4b8c6c20'; ctx.fillRect(X(58), Y(0) - 12, X(62) - X(58), 12);
    ctx.strokeStyle = '#4b8c6c'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(targetX, Y(0)); ctx.lineTo(targetX, Y(0) - 30); ctx.stroke();
    ctx.fillStyle = '#4b8c6c'; ctx.beginPath(); ctx.moveTo(targetX, Y(0) - 30); ctx.lineTo(targetX + 15, Y(0) - 23); ctx.lineTo(targetX, Y(0) - 17); ctx.fill();
  }
}
function arrow(x1, y1, x2, y2, color, label) {
  if (Math.hypot(x2 - x1, y2 - y1) < 2) return;
  const angle = Math.atan2(y2 - y1, x2 - x1);
  ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = 1.7;
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x2, y2); ctx.lineTo(x2 - 7 * Math.cos(angle - .4), y2 - 7 * Math.sin(angle - .4)); ctx.lineTo(x2 - 7 * Math.cos(angle + .4), y2 - 7 * Math.sin(angle + .4)); ctx.fill();
  ctx.font = 'italic 13px Georgia'; ctx.textAlign = 'left'; ctx.fillText(label, x2 + 5, y2 - 5);
}

function renderExperiments() {
  $('experiment-count').textContent = experiments.length;
  $('export-csv').disabled = experiments.length === 0;
  $('experiment-rows').innerHTML = experiments.length ? experiments.map((p, i) => `<tr><td><span class="row-dot" style="background:${colors[i % colors.length]}"></span>${i + 1}</td><td>${format(p.speed, 0)}</td><td>${format(p.angle, 0)}</td><td>${format(p.height, 0)}</td><td>${format(p.gravity)}</td><td><strong>${format(Physics.calculate(p).range)}</strong></td><td><button class="table-delete" data-delete="${i}" aria-label="Hapus percobaan ${i + 1}">×</button></td></tr>`).join('') : '<tr><td colspan="7" class="empty-state">Eksperimen pertama dimulai dari rasa ingin tahu.<br><span>Simpan hasilmu untuk membandingkan lintasan.</span></td></tr>';
}
function download(name, content, type) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement('a'); a.href = url; a.download = name; document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function navigate() {
  const name = ['simulasi', 'panduan', 'tantangan', 'catatan'].includes(location.hash.slice(1)) ? location.hash.slice(1) : 'simulasi';
  pause();
  for (const page of document.querySelectorAll('.page')) page.hidden = page.id !== `page-${name}`;
  for (const link of document.querySelectorAll('.nav-link')) {
    link.classList.toggle('active', link.dataset.page === name);
    if (link.dataset.page === name) link.setAttribute('aria-current', 'page'); else link.removeAttribute('aria-current');
  }
  requestAnimationFrame(draw);
  window.scrollTo({ top: 0, behavior: 'instant' });
}
const quizzes = [
  { question: 'Pada ketinggian awal 0 m, sudut mana yang memberi jangkauan terbesar?', choices: ['30°', '45°', '60°'], answer: 1, explanation: 'R = v₀² sin(2θ)/g. Nilai sin(2θ) maksimum saat 2θ = 90°, sehingga θ = 45°. Ini berlaku untuk titik luncur dan titik jatuh yang sama tinggi.' },
  { question: 'Apa yang terjadi dengan percepatan di titik tertinggi?', choices: ['Menjadi nol', 'Tetap ke bawah sebesar g', 'Berubah ke atas'], answer: 1, explanation: 'Di puncak hanya kecepatan vertikal yang nol. Gravitasi tetap bekerja ke bawah. Kecepatan horizontal tetap ada jika sudutnya kurang dari 90°.' },
  { question: 'Jika kecepatan awal dilipatgandakan, jangkauan menjadi …', choices: ['2 kali', '4 kali', 'Tetap'], answer: 1, explanation: 'Dengan sudut dan gravitasi tetap serta h₀ = 0, R sebanding dengan v₀². Kecepatan 2 kali memberi jangkauan 4 kali.' }
];
function renderQuizzes() {
  $('quiz-list').innerHTML = quizzes.map((q, i) => `<article class="quiz"><h2>${i + 1}. ${q.question}</h2><div class="quiz-options" role="group" aria-label="Pilihan jawaban soal ${i + 1}">${q.choices.map((c, j) => `<button data-quiz="${i}" data-choice="${j}">${c}</button>`).join('')}</div><p id="quiz-feedback-${i}" class="quiz-feedback" role="status"></p></article>`).join('');
}
function setMission(enabled) {
  mission = enabled;
  $('height').disabled = enabled; $('gravity').disabled = enabled;
  $('end-challenge').hidden = !enabled;
  $('start-challenge').textContent = enabled ? 'Kembali ke misi' : 'Mulai misi';
  $('target-label').hidden = !enabled;
  $('target-label').textContent = 'Misi: target 60 m · toleransi ±2 m';
  if (enabled) { parameters.height = 0; parameters.gravity = 9.81; }
  resetFlight(); updateControls();
}

loadStored();
for (const key of ['speed', 'angle', 'height', 'gravity']) $(key).addEventListener('input', () => {
  parameters[key] = Number($(key).value);
  resetFlight(); updateControls();
});
for (const key of ['prediction', 'vectors', 'compare']) $(key).addEventListener('change', () => { draw(); if (key === 'compare' && !experiments.length && $(key).checked) toast('Simpan percobaan terlebih dahulu untuk membandingkan lintasan.'); });
$('launch').addEventListener('click', launch);
$('reset').addEventListener('click', resetFlight);
$('default-params').addEventListener('click', () => { parameters = { ...defaults }; resetFlight(); updateControls(); toast('Parameter kembali ke kondisi awal.'); });
$('timeline').addEventListener('input', () => { const selectedTime = Number($('timeline').value) / 1000 * Physics.calculate(parameters).flightTime; pause(); time = selectedTime; updateLive(); draw(); });
$('expand').addEventListener('click', () => { showApex = !showApex; $('expand').setAttribute('aria-pressed', String(showApex)); draw(); });
$('expand').setAttribute('aria-pressed', 'true');
$('save-experiment').addEventListener('click', () => {
  if (experiments.length >= 50) { toast('Maksimal 50 percobaan. Ekspor atau hapus salah satu untuk menambah.'); return; }
  experiments.push({ ...parameters });
  const persisted = store('parabola-experiments', experiments);
  renderExperiments(); draw();
  if (persisted) toast(`Percobaan ${experiments.length} tersimpan. Coba parameter lain untuk membandingkan.`);
});
$('experiment-rows').addEventListener('click', event => {
  const button = event.target.closest('[data-delete]');
  if (!button) return;
  experiments.splice(Number(button.dataset.delete), 1); store('parabola-experiments', experiments); renderExperiments(); draw();
});
$('export-csv').addEventListener('click', () => {
  const rows = [['No', 'Kecepatan awal (m/s)', 'Sudut (deg)', 'Ketinggian awal (m)', 'Gravitasi (m/s2)', 'Jangkauan (m)', 'Ketinggian maksimum (m)', 'Waktu terbang (s)']];
  experiments.forEach((p, i) => { const r = Physics.calculate(p); rows.push([i + 1, p.speed, p.angle, p.height, p.gravity, r.range.toFixed(4), r.maxHeight.toFixed(4), r.flightTime.toFixed(4)]); });
  download('percobaan-parabola.csv', '\uFEFF' + rows.map(row => row.join(',')).join('\r\n'), 'text/csv;charset=utf-8');
});
$('try-complementary').addEventListener('click', () => { setMission(false); parameters = { ...defaults, angle: 30 }; resetFlight(); updateControls(); toast('Mulai dari 30°. Simpan, lalu coba 60° dengan kondisi lainnya tetap.'); });
document.querySelectorAll('[data-navigate]').forEach(button => button.addEventListener('click', () => { location.hash = button.dataset.navigate; }));
window.addEventListener('hashchange', navigate);
$('start-challenge').addEventListener('click', () => { setMission(true); location.hash = 'simulasi'; toast('Misi dimulai. Ubah kecepatan dan sudut untuk mencapai target 60 m.'); });
$('end-challenge').addEventListener('click', () => { setMission(false); $('challenge-result').textContent = ''; toast('Misi diakhiri. Semua parameter dapat diubah kembali.'); });
$('quiz-list').addEventListener('click', event => {
  const button = event.target.closest('[data-quiz]'); if (!button) return;
  const i = Number(button.dataset.quiz), choice = Number(button.dataset.choice), q = quizzes[i];
  button.parentElement.querySelectorAll('button').forEach(b => b.classList.remove('correct', 'incorrect'));
  button.classList.add(choice === q.answer ? 'correct' : 'incorrect');
  $(`quiz-feedback-${i}`).textContent = choice === q.answer ? `Benar. ${q.explanation}` : 'Belum tepat. Coba pikirkan kembali atau buka Panduan & teori.';
});
$('notes').value = noteText;
function noteCount() { $('notes-count').textContent = `${format($('notes').value.length, 0)} / 15.000 karakter`; }
noteCount();
$('notes').addEventListener('input', () => {
  noteCount(); $('notes-status').textContent = 'Menyimpan…'; clearTimeout(noteTimer);
  noteTimer = setTimeout(() => { const ok = store('parabola-notes', $('notes').value); $('notes-status').textContent = ok ? 'Tersimpan di browser ini' : 'Belum tersimpan — unduh salinan'; }, 300);
});
$('export-notes').addEventListener('click', () => download('catatan-lab-parabola.txt', 'CATATAN VIRTUAL LAB GERAK PARABOLA\n\n' + $('notes').value, 'text/plain;charset=utf-8'));
document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });
window.addEventListener('pagehide', () => { if (noteTimer) { clearTimeout(noteTimer); store('parabola-notes', $('notes').value); } });
new ResizeObserver(draw).observe(canvas);
renderExperiments(); renderQuizzes(); updateControls(); navigate();
document.fonts.ready.then(draw);
