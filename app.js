/* ============================================================
   NEXUS WEATHER — Advanced App Logic
   APIs Used (all free, no key):
   - Open-Meteo Forecast: https://api.open-meteo.com/v1/forecast
   - Open-Meteo Air Quality: https://air-quality-api.open-meteo.com/v1/air-quality
   - Open-Meteo Geocoding: https://geocoding-api.open-meteo.com/v1/search
   - Nominatim reverse geocode: https://nominatim.openstreetmap.org/reverse
   ============================================================ */

'use strict';

/* ── STATE ─────────────────────────────────────────────────── */
const S = {
  useCelsius: true,
  currentData: null,
  lastLoc: null,
  searchTimer: null,
  clockTimer: null,
  tz: 'auto',
  cityOffset: null, // UTC offset in seconds
};

/* ── WMO CODES ─────────────────────────────────────────────── */
const WMO = {
  0:  { label:'Clear Sky',          icon:'☀️',  theme:'clear',  orbColor:'#ffd700' },
  1:  { label:'Mainly Clear',       icon:'🌤',  theme:'clear',  orbColor:'#ffd700' },
  2:  { label:'Partly Cloudy',      icon:'⛅',  theme:'cloudy', orbColor:'#b0c4de' },
  3:  { label:'Overcast',           icon:'☁️',  theme:'cloudy', orbColor:'#8fa8c8' },
  45: { label:'Foggy',              icon:'🌫',  theme:'fog',    orbColor:'#9aabb8' },
  48: { label:'Icy Fog',            icon:'🌫',  theme:'fog',    orbColor:'#9aabb8' },
  51: { label:'Light Drizzle',      icon:'🌦',  theme:'rain',   orbColor:'#7bc4e2' },
  53: { label:'Moderate Drizzle',   icon:'🌦',  theme:'rain',   orbColor:'#7bc4e2' },
  55: { label:'Heavy Drizzle',      icon:'🌧',  theme:'rain',   orbColor:'#5aa8cc' },
  61: { label:'Slight Rain',        icon:'🌧',  theme:'rain',   orbColor:'#7bc4e2' },
  63: { label:'Moderate Rain',      icon:'🌧',  theme:'rain',   orbColor:'#5aa8cc' },
  65: { label:'Heavy Rain',         icon:'🌧',  theme:'rain',   orbColor:'#3d8fbf' },
  66: { label:'Freezing Rain',      icon:'🌨',  theme:'snow',   orbColor:'#b0d8f0' },
  67: { label:'Freezing Rain',      icon:'🌨',  theme:'snow',   orbColor:'#b0d8f0' },
  71: { label:'Light Snow',         icon:'🌨',  theme:'snow',   orbColor:'#ddeeff' },
  73: { label:'Moderate Snow',      icon:'❄️',  theme:'snow',   orbColor:'#ddeeff' },
  75: { label:'Heavy Snow',         icon:'❄️',  theme:'snow',   orbColor:'#ddeeff' },
  77: { label:'Snow Grains',        icon:'🌨',  theme:'snow',   orbColor:'#ddeeff' },
  80: { label:'Slight Showers',     icon:'🌦',  theme:'rain',   orbColor:'#7bc4e2' },
  81: { label:'Moderate Showers',   icon:'🌧',  theme:'rain',   orbColor:'#5aa8cc' },
  82: { label:'Violent Showers',    icon:'🌧',  theme:'rain',   orbColor:'#3d8fbf' },
  85: { label:'Snow Showers',       icon:'🌨',  theme:'snow',   orbColor:'#ddeeff' },
  86: { label:'Heavy Snow Showers', icon:'❄️',  theme:'snow',   orbColor:'#ddeeff' },
  95: { label:'Thunderstorm',       icon:'⛈️',  theme:'storm',  orbColor:'#9b59b6' },
  96: { label:'Thunderstorm',       icon:'⛈️',  theme:'storm',  orbColor:'#9b59b6' },
  99: { label:'Thunderstorm',       icon:'⛈️',  theme:'storm',  orbColor:'#9b59b6' },
};

function wmo(code) { return WMO[code] ?? { label:'Unknown', icon:'🌡', theme:'clear', orbColor:'#00f5ff' }; }

/* Wind direction degrees → label */
const WIND_DIRS = ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW'];
function windDirLabel(deg) { return WIND_DIRS[Math.round(deg / 22.5) % 16]; }

/* ── DOM ───────────────────────────────────────────────────── */
const $ = id => document.getElementById(id);
const el = {
  sceneGradient:   $('sceneGradient'),
  sceneCanvas:     $('sceneCanvas'),
  nexusLoading:    $('nexusLoading'),
  nexusError:      $('nexusError'),
  errorMsg:        $('errorMsg'),
  dashboard:       $('dashboard'),
  liveClock:       $('liveClock'),
  cityName:        $('cityName'),
  countryDate:     $('countryDate'),
  condIcon:        $('condIcon'),
  condLabel:       $('condLabel'),
  advisoryText:    $('advisoryText'),
  tempValue:       $('tempValue'),
  tempUnit:        $('tempUnit'),
  tempHigh:        $('tempHigh'),
  tempLow:         $('tempLow'),
  orbIcon:         $('orbIcon'),
  orbInner:        $('orbInner'),
  feelsLike:       $('feelsLike'),
  feelsDesc:       $('feelsDesc'),
  humidityGauge:   $('humidityGauge'),
  humidityVal:     $('humidityVal'),
  compassNeedle:   $('compassNeedle'),
  windSpeed:       $('windSpeed'),
  windDirEl:       $('windDirLabel'), // FIX #1: renamed from windDirLabel to avoid shadowing the windDirLabel() function
  uvGauge:         $('uvGauge'),
  uvVal:           $('uvVal'),
  uvLabel:         $('uvLabel'),
  visibility:      $('visibility'),
  visBar:          $('visBar'),
  pressure:        $('pressure'),
  pressureTrend:   $('pressureTrend'),
  sunDot:          $('sunDot'),
  sunriseLabel:    $('sunriseLabel'),
  sunsetLabel:     $('sunsetLabel'),
  tempChart:       $('tempChart'),
  hourlyTrack:     $('hourlyTrack'),
  forecastList:    $('forecastList'),
  aqiRing:         $('aqiRing'),
  aqiValue:        $('aqiValue'),
  aqiLabel:        $('aqiLabel'),
  pm25:            $('pm25'),
  pm10:            $('pm10'),
  ozone:           $('ozone'),
  no2:             $('no2'),
  sunrise:         $('sunrise'),
  sunset:          $('sunset'),
  moonIcon:        $('moonIcon'),
  moonPhase:       $('moonPhase'),
  precipitation:   $('precipitation'),
  searchInput:     $('searchInput'),
  searchClear:     $('searchClear'),
  suggestionsPanel:$('suggestionsPanel'),
  locationBtn:     $('locationBtn'),
  unitToggle:      $('unitToggle'),
  unitC:           $('unitC'),
  unitF:           $('unitF'),
  retryBtn:        $('retryBtn'),
};

/* ── UNIT HELPERS ──────────────────────────────────────────── */
const fTemp  = c => S.useCelsius ? Math.round(c) : Math.round(c * 9/5 + 32);
const unitLbl= () => S.useCelsius ? '°C' : '°F';
const fWind  = kmh => S.useCelsius ? `${Math.round(kmh)} km/h` : `${Math.round(kmh * 0.621)} mph`;

/* ── MOON PHASE ────────────────────────────────────────────── */
function getMoonPhase() {
  const known = new Date(Date.UTC(2000, 0, 6, 18, 14, 0)); // known new moon
  const now = new Date();
  const cycle = 29.53058867;
  const elapsed = (now - known) / 86400000;
  const phase = ((elapsed % cycle) + cycle) % cycle;
  const icons  = ['🌑','🌒','🌓','🌔','🌕','🌖','🌗','🌘'];
  const labels = ['New Moon','Waxing Crescent','First Quarter','Waxing Gibbous','Full Moon','Waning Gibbous','Last Quarter','Waning Crescent'];
  const idx = Math.round(phase / cycle * 8) % 8;
  return { icon: icons[idx], label: labels[idx] };
}

/* ── SMART ADVISORY ────────────────────────────────────────── */
// NOTE: `temp`, `uv`, `wind` are always raw API values (Celsius / km/h).
// We use raw `temp` for threshold comparisons and fTemp(temp) only for display.
function getAdvisory(code, temp, uv, wind) {
  const t = fTemp(temp); // display value in current unit
  if (code >= 95) return '⛈️ Severe thunderstorm warning. Stay indoors and avoid open areas.';
  if (code >= 71) return '❄️ Snowfall expected. Drive carefully and dress in warm layers.';
  if (code >= 61) return `🌧 Rain is falling. Carry an umbrella and watch for wet roads.`;
  if (code >= 51) return '🌦 Light drizzle in the air. A light jacket would be handy.';
  if (uv >= 8)    return `☀️ Extreme UV (${Math.round(uv)}). Apply SPF 50+ sunscreen. Avoid noon sun.`;
  if (uv >= 6)    return `🌞 High UV today. Apply sunscreen and wear a hat outdoors.`;
  if (wind > 50)  return `💨 Strong winds at ${fWind(wind)}. Secure loose outdoor items.`;
  // Compare against raw Celsius value (temp) for threshold logic:
  if (temp <= 0)   return `🧊 Freezing temperatures (${t}${unitLbl()}). Dress in thermal layers.`;
  if (temp <= 10)  return `🧥 Cold day at ${t}${unitLbl()}. A warm coat is recommended.`;
  if (temp >= 38)  return `🥵 Extreme heat (${t}${unitLbl()}). Stay hydrated and avoid direct sun.`;
  if (temp >= 32)  return `☀️ Hot day (${t}${unitLbl()}). Drink plenty of water and seek shade.`;
  if (code <= 2)   return `✅ Clear conditions. A great day to be outside!`;
  return `🌤 Partly cloudy skies. Comfortable conditions overall.`;
}

/* ── AQI LEVEL ─────────────────────────────────────────────── */
function aqiLevel(v) {
  if (v <= 50)  return { label:'Good',        color:'#00f5a0' };
  if (v <= 100) return { label:'Moderate',    color:'#f9d423' };
  if (v <= 150) return { label:'Unhealthy*',  color:'#ff8c00' };
  if (v <= 200) return { label:'Unhealthy',   color:'#ff4444' };
  return             { label:'Hazardous',     color:'#9b0000' };
}

/* Calculate US AQI from PM2.5 */
function calcAQI(pm25) {
  const breakpoints = [
    [0, 12, 0, 50], [12.1, 35.4, 51, 100], [35.5, 55.4, 101, 150],
    [55.5, 150.4, 151, 200], [150.5, 250.4, 201, 300],
    [250.5, 350.4, 301, 400], [350.5, 500.4, 401, 500]
  ];
  for (const [cLo, cHi, iLo, iHi] of breakpoints) {
    if (pm25 >= cLo && pm25 <= cHi) {
      return Math.round(((iHi - iLo) / (cHi - cLo)) * (pm25 - cLo) + iLo);
    }
  }
  return pm25 > 500 ? 500 : 0;
}

/* ── TIME HELPERS ──────────────────────────────────────────── */

/* Helper: parse "HH:MM" from Open-Meteo ISO string into minutes since midnight.
   The ISO format "YYYY-MM-DDTHH:MM" is already the city's LOCAL wall-clock time.
   No timezone conversion is ever needed — just read the digits directly. */
function isoToHM(iso) {
  const timePart = (iso || '').split('T')[1] || '';
  const [h, m] = timePart.split(':').map(Number);
  return { h: h || 0, m: m || 0 };
}

/* fmtTime: display an Open-Meteo ISO string as 12-hour AM/PM.
   The ISO value IS already the city's local time — format components directly. */
function fmtTime(iso) {
  if (!iso) return '--:--';
  try {
    const { h, m } = isoToHM(iso);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12  = h % 12 || 12;
    return `${String(h12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${ampm}`;
  } catch {
    return '--:--';
  }
}

/* fmtHour: display just the hour portion of an Open-Meteo ISO string.
   Components are read directly — no timezone math needed. */
function fmtHour(iso) {
  try {
    const { h } = isoToHM(iso);
    if (h === 0)  return '12AM';
    if (h < 12)  return `${h}AM`;
    if (h === 12) return '12PM';
    return `${h - 12}PM`;
  } catch {
    return '--';
  }
}

/* FIX #8: Parse at T12:00:00 (noon) to avoid midnight day-boundary issues
   when the browser timezone is behind UTC. */
function fmtDay(dateStr, i) {
  if (i === 0) return 'Today';
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'long' });
}

function localDateStr(tz) {
  try {
    return new Intl.DateTimeFormat('en-US', {
      weekday:'long', month:'long', day:'numeric', timeZone: tz
    }).format(new Date());
  } catch { return new Date().toDateString(); }
}

/* Live clock using city timezone */
function startClock(tz) {
  clearInterval(S.clockTimer);
  S.tz = tz;
  function tick() {
    try {
      const t = new Intl.DateTimeFormat('en-US', {
        hour:'2-digit', minute:'2-digit', second:'2-digit',
        hour12:true, timeZone: tz
      }).format(new Date());
      el.liveClock.textContent = t;
    } catch {
      el.liveClock.textContent = new Date().toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'});
    }
  }
  tick();
  S.clockTimer = setInterval(tick, 1000);
}

/* ── CANVAS BACKGROUND ─────────────────────────────────────── */
let canvasCtx, canvasParticles = [], canvasAnimId;

function initCanvas() {
  const canvas = el.sceneCanvas;
  canvasCtx = canvas.getContext('2d');
  resizeCanvas();
  // FIX #5: Debounce the resize handler to prevent particle storm
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(resizeCanvas, 200);
  });
  animateCanvas();

  // FIX #12: Pause animation when tab is hidden to save CPU/battery
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      cancelAnimationFrame(canvasAnimId);
    } else {
      animateCanvas();
    }
  });
}

function resizeCanvas() {
  el.sceneCanvas.width  = window.innerWidth;
  el.sceneCanvas.height = window.innerHeight;
  // Regenerate stars
  canvasParticles = [];
  const n = Math.floor((window.innerWidth * window.innerHeight) / 8000);
  for (let i = 0; i < n + 60; i++) {
    canvasParticles.push({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      r: Math.random() * 1.5 + 0.3,
      a: Math.random(),
      speed: Math.random() * 0.3 + 0.05,
      drift: (Math.random() - 0.5) * 0.2,
      type: Math.random() > 0.85 ? 'glow' : 'star',
    });
  }
  // Redraw chart if data is available after resize
  if (S.currentData) redrawChartFromState();
}

let canvasTheme = 'clear';
function animateCanvas() {
  const ctx = canvasCtx;
  const w = el.sceneCanvas.width, h = el.sceneCanvas.height;
  ctx.clearRect(0, 0, w, h);

  // Draw stars
  canvasParticles.forEach(p => {
    const flicker = Math.sin(Date.now() * p.speed * 0.003 + p.x) * 0.3 + 0.7;
    ctx.globalAlpha = p.a * flicker;
    if (p.type === 'glow') {
      const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 3);
      grad.addColorStop(0, 'rgba(0,245,255,0.8)');
      grad.addColorStop(1, 'transparent');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r * 3, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
    // Slow drift
    p.y -= p.speed * 0.15;
    p.x += p.drift * 0.05;
    if (p.y < -5) p.y = h + 5;
    if (p.x < 0) p.x = w; if (p.x > w) p.x = 0;
  });

  // Theme-specific effects
  if (canvasTheme === 'rain')  drawRainCanvas(ctx, w, h);
  if (canvasTheme === 'snow')  drawSnowCanvas(ctx, w, h);
  if (canvasTheme === 'storm') drawStormCanvas(ctx, w, h);

  ctx.globalAlpha = 1;
  canvasAnimId = requestAnimationFrame(animateCanvas);
}

const rainDrops = Array.from({length:80},()=>({x:Math.random()*2000,y:Math.random()*1000,speed:14+Math.random()*8,len:18+Math.random()*14}));
function drawRainCanvas(ctx, w, h) {
  ctx.strokeStyle = 'rgba(180,220,255,0.4)';
  ctx.lineWidth = 1;
  rainDrops.forEach(d => {
    ctx.globalAlpha = 0.35;
    ctx.beginPath();
    ctx.moveTo(d.x, d.y);
    ctx.lineTo(d.x - d.len * 0.1, d.y + d.len);
    ctx.stroke();
    d.y += d.speed;
    d.x -= d.speed * 0.1;
    if (d.y > h) { d.y = -d.len; d.x = Math.random() * w; }
  });
}

const snowFlakes = Array.from({length:50},()=>({x:Math.random()*2000,y:Math.random()*1000,r:1+Math.random()*2.5,speed:1+Math.random()*1.5,swing:Math.random()*2}));
function drawSnowCanvas(ctx, w, h) {
  snowFlakes.forEach(f => {
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = '#ddeeff';
    ctx.beginPath();
    ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
    ctx.fill();
    f.y += f.speed;
    f.x += Math.sin(Date.now() * 0.001 + f.swing) * 0.4;
    if (f.y > h) { f.y = -5; f.x = Math.random() * w; }
  });
}

let lastFlash = 0;
function drawStormCanvas(ctx, w, h) {
  drawRainCanvas(ctx, w, h);
  const now = Date.now();
  if (now - lastFlash > 4000 + Math.random() * 5000) {
    lastFlash = now;
    ctx.globalAlpha = 0.12;
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, w, h);
  }
}

function setCanvasTheme(theme) {
  canvasTheme = theme;
  // Update scene gradient
  const gradients = {
    clear:  'radial-gradient(ellipse at 20% 50%, #0a1f5c, transparent 55%), radial-gradient(ellipse at 80% 20%, #2d0a5c, transparent 50%), #010812',
    cloudy: 'radial-gradient(ellipse at 30% 40%, #1a2a3a, transparent 60%), radial-gradient(ellipse at 70% 60%, #2a3a4a, transparent 60%), #0a0f1a',
    rain:   'radial-gradient(ellipse at 20% 60%, #0d1f35, transparent 55%), radial-gradient(ellipse at 80% 30%, #0a1f2a, transparent 50%), #050d15',
    storm:  'radial-gradient(ellipse at 50% 30%, #1a0d35 0%, transparent 55%), radial-gradient(ellipse at 30% 70%, #0a0d1a, transparent 60%), #040508',
    snow:   'radial-gradient(ellipse at 50% 30%, #1a3050, transparent 60%), radial-gradient(ellipse at 80% 70%, #253545, transparent 60%), #0f1820',
    fog:    'radial-gradient(ellipse at 50% 50%, #2a3040, transparent 70%), #141820',
    night:  'radial-gradient(ellipse at 50% 20%, #05052a, transparent 55%), radial-gradient(ellipse at 20% 80%, #0d0520, transparent 60%), #010308',
  };
  el.sceneGradient.style.background = gradients[theme] || gradients.clear;
}

/* ── NUMBER COUNTER ANIMATION ──────────────────────────────── */
/* FIX #4: Guard startVal against NaN (parseFloat("--") → NaN).
   Using isNaN check ensures animation always starts from 0 on first load. */
function animateCount(element, endVal, duration = 600, suffix = '') {
  const parsed = parseFloat(element.textContent);
  const startVal = isNaN(parsed) ? 0 : parsed;
  const startTime = performance.now();
  function update(t) {
    const elapsed = t - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const ease = 1 - Math.pow(1 - progress, 3);
    const val = startVal + (endVal - startVal) * ease;
    element.textContent = Number.isInteger(endVal) ? Math.round(val) + suffix : val.toFixed(1) + suffix;
    if (progress < 1) requestAnimationFrame(update);
  }
  requestAnimationFrame(update);
}

/* ── CIRCULAR GAUGE ────────────────────────────────────────── */
function setGauge(gaugeEl, pct) {
  const circumference = 188.4; // 2π × 30
  const offset = circumference - pct * circumference;
  gaugeEl.style.strokeDashoffset = offset;
  gaugeEl.style.transition = 'stroke-dashoffset 1.2s cubic-bezier(0.4,0,0.2,1)';
}

function setAqiRing(gaugeEl, pct) {
  const circumference = 263.9; // 2π × 42
  const offset = circumference - pct * circumference;
  gaugeEl.style.strokeDashoffset = offset;
  gaugeEl.style.transition = 'stroke-dashoffset 1.2s cubic-bezier(0.4,0,0.2,1)';
}

/* FIX #6: Update AQI gradient stop colors instead of overriding the stroke attribute.
   This preserves the gradient appearance while still reflecting the AQI color level. */
function setAqiColor(color) {
  const svg = el.aqiRing.closest('svg');
  if (!svg) return;
  const stops = svg.querySelectorAll('#aqiGrad stop');
  if (stops.length >= 2) {
    stops[0].setAttribute('stop-color', color);
    stops[stops.length - 1].setAttribute('stop-color', color);
  }
}

/* ── SUN ARC ───────────────────────────────────────────────── */
/* parseLocalWallTime: used internally for the hourly "now" comparison.
   Treats ISO components as local browser time so relative math is consistent. */
function parseLocalWallTime(iso) {
  const [datePart, timePart] = iso.split('T');
  const [year, month, day]   = datePart.split('-').map(Number);
  const [hour, minute]       = (timePart || '00:00').split(':').map(Number);
  return new Date(year, month - 1, day, hour, minute, 0);
}

function updateSunArc(sunriseISO, sunsetISO, tz) {
  // The ISO strings are already city-local wall times — parse minutes directly.
  const srMin = isoToHM(sunriseISO).h * 60 + isoToHM(sunriseISO).m;
  const ssMin = isoToHM(sunsetISO).h  * 60 + isoToHM(sunsetISO).m;

  // Get the CURRENT minute-of-day in the city's timezone via Intl
  let nowMin = 0;
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      hour: 'numeric', minute: 'numeric', hour12: false, timeZone: tz
    }).formatToParts(new Date());
    const h = parseInt(parts.find(p => p.type === 'hour').value, 10);
    const m = parseInt(parts.find(p => p.type === 'minute').value, 10);
    nowMin = (isNaN(h) ? 0 : h) * 60 + (isNaN(m) ? 0 : m);
  } catch {
    const now = new Date();
    nowMin = now.getHours() * 60 + now.getMinutes();
  }

  const total   = ssMin - srMin;     // total daylight minutes
  const elapsed = nowMin - srMin;    // minutes since sunrise
  const t       = Math.max(0, Math.min(1, total > 0 ? elapsed / total : 0));

  // Quadratic bezier: P0=(15,95), P1=(150,5), P2=(285,95)
  const x = (1-t)*(1-t)*15 + 2*(1-t)*t*150 + t*t*285;
  const y = (1-t)*(1-t)*95 + 2*(1-t)*t*5   + t*t*95;

  el.sunDot.setAttribute('cx', x);
  el.sunDot.setAttribute('cy', y);
  // fmtTime now reads ISO components directly — no tz arg needed
  el.sunriseLabel.textContent = fmtTime(sunriseISO).replace(' ', '');
  el.sunsetLabel.textContent  = fmtTime(sunsetISO).replace(' ', '');
}

/* ── TEMPERATURE CHART (Canvas) ────────────────────────────── */
/* FIX #2: Guard against 0-width container (happens when dashboard is still hidden).
   Retries up to 5 times via rAF before giving up. */
function drawTempChart(times, temps, precipProbs, attempt = 0) {
  const canvas = el.tempChart;
  const rect   = canvas.parentElement.getBoundingClientRect();

  // If the container has no size yet, retry on next frames (max 5 attempts)
  if (rect.width === 0 || rect.height === 0) {
    if (attempt < 5) {
      requestAnimationFrame(() => drawTempChart(times, temps, precipProbs, attempt + 1));
    }
    return;
  }

  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  canvas.width  = rect.width  * dpr;
  canvas.height = rect.height * dpr;
  canvas.style.width  = rect.width  + 'px';
  canvas.style.height = rect.height + 'px';
  ctx.scale(dpr, dpr);

  const W = rect.width, H = rect.height;
  const padL = 36, padR = 16, padT = 20, padB = 32;
  const cW = W - padL - padR, cH = H - padT - padB;

  ctx.clearRect(0, 0, W, H);

  const minT = Math.min(...temps) - 2;
  const maxT = Math.max(...temps) + 2;
  const yT = t => padT + cH - ((t - minT) / (maxT - minT)) * cH;
  const xT = i => padL + (i / (temps.length - 1)) * cW;

  // Grid lines
  for (let i = 0; i <= 4; i++) {
    const y = padT + (i / 4) * cH;
    ctx.strokeStyle = 'rgba(0,245,255,0.06)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 8]);
    ctx.beginPath();
    ctx.moveTo(padL, y); ctx.lineTo(padL + cW, y);
    ctx.stroke();
    const val = maxT - (i / 4) * (maxT - minT);
    ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(180,210,255,0.35)';
    ctx.font = '10px Orbitron, monospace';
    ctx.fillText(Math.round(val) + '°', 0, y + 4);
  }

  // Precipitation bars (background)
  if (precipProbs.length > 0) {
    const barW = cW / precipProbs.length * 0.65;
    precipProbs.forEach((p, i) => {
      const barH = (p / 100) * cH * 0.4;
      const bx = xT(i) - barW / 2;
      const by = padT + cH - barH;
      const grad = ctx.createLinearGradient(0, by, 0, padT + cH);
      grad.addColorStop(0, 'rgba(123,196,226,0.25)');
      grad.addColorStop(1, 'rgba(123,196,226,0.05)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.roundRect ? ctx.roundRect(bx, by, barW, barH, 2) : ctx.fillRect(bx, by, barW, barH);
      ctx.fill();
    });
  }

  // Temperature area fill
  const areaGrad = ctx.createLinearGradient(0, padT, 0, padT + cH);
  areaGrad.addColorStop(0, 'rgba(0,245,255,0.2)');
  areaGrad.addColorStop(1, 'rgba(0,245,255,0.0)');
  ctx.beginPath();
  ctx.moveTo(xT(0), padT + cH);
  temps.forEach((t, i) => ctx.lineTo(xT(i), yT(t)));
  ctx.lineTo(xT(temps.length - 1), padT + cH);
  ctx.closePath();
  ctx.fillStyle = areaGrad;
  ctx.fill();

  // Temperature line
  const lineGrad = ctx.createLinearGradient(padL, 0, padL + cW, 0);
  lineGrad.addColorStop(0, '#00f5ff');
  lineGrad.addColorStop(0.5, '#7b00ff');
  lineGrad.addColorStop(1, '#00f5ff');
  ctx.strokeStyle = lineGrad;
  ctx.lineWidth = 2.5;
  ctx.lineJoin = 'round';
  ctx.setLineDash([]);
  ctx.shadowColor = 'rgba(0,245,255,0.5)';
  ctx.shadowBlur = 8;
  ctx.beginPath();
  temps.forEach((t, i) => {
    i === 0 ? ctx.moveTo(xT(0), yT(t)) : ctx.lineTo(xT(i), yT(t));
  });
  ctx.stroke();
  ctx.shadowBlur = 0;

  // Dots + labels for select hours
  const step = Math.max(1, Math.floor(temps.length / 8));
  temps.forEach((t, i) => {
    if (i % step !== 0) return;
    const x = xT(i), y = yT(t);
    ctx.fillStyle = '#00f5ff';
    ctx.shadowColor = 'rgba(0,245,255,0.8)';
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.arc(x, y, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // FIX #7: Use city timezone for chart hour labels
    ctx.fillStyle = 'rgba(130,180,220,0.6)';
    ctx.font = '9px Space Grotesk, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(fmtHour(times[i]), x, padT + cH + 18);
  });
}

/* ── STATES ─────────────────────────────────────────────────── */
function showLoading() {
  el.nexusLoading.style.display = 'flex';
  el.nexusError.style.display   = 'none';
  el.dashboard.style.display    = 'none';
}

function showError(msg) {
  el.nexusLoading.style.display = 'none';
  el.nexusError.style.display   = 'flex';
  el.dashboard.style.display    = 'none';
  el.errorMsg.textContent = msg;
}

function showDashboard() {
  el.nexusLoading.style.display = 'none';
  el.nexusError.style.display   = 'none';
  el.dashboard.style.display    = 'flex';
  el.dashboard.style.animation  = 'none';
  el.dashboard.offsetHeight; // force reflow to restart CSS animation
  el.dashboard.style.animation  = '';
}

/* ── HELPER: Rebuild chart data from saved state ───────────── */
function redrawChartFromState() {
  if (!S.currentData) return;
  const { weather } = S.currentData;
  const hourly = weather.hourly;
  const tz = weather.timezone;
  const nowMs = Date.now();
  const times = [], temps = [], rain = [];
  let cnt = 0;
  for (let i = 0; i < hourly.time.length && cnt < 24; i++) {
    if (parseLocalWallTime(hourly.time[i]) < new Date(nowMs - 30 * 60000)) continue;
    times.push(hourly.time[i]);
    temps.push(S.useCelsius ? hourly.temperature_2m[i] : hourly.temperature_2m[i] * 9/5 + 32);
    rain.push(hourly.precipitation_probability?.[i] ?? 0);
    cnt++;
  }
  drawTempChart(times, temps, rain);
}

/* ── RENDER ─────────────────────────────────────────────────── */
function render(weather, aqData, locName, locCountry) {
  S.currentData = { weather, aqData, locName, locCountry };
  const cur    = weather.current;
  const daily  = weather.daily;
  const hourly = weather.hourly;
  const tz     = weather.timezone;

  const W = wmo(cur.weather_code);
  const isNight = cur.is_day === 0;

  // Theme
  const theme = isNight && (W.theme === 'clear' || W.theme === 'cloudy') ? 'night' : W.theme;
  setCanvasTheme(theme);

  // Orb styling
  el.orbInner.style.boxShadow   = `0 0 40px ${W.orbColor}40, inset 0 0 20px ${W.orbColor}10`;
  el.orbInner.style.borderColor = W.orbColor + '50';
  el.orbIcon.textContent = isNight && W.theme === 'clear'  ? '🌙'
                         : isNight && W.theme === 'cloudy' ? '🌙'
                         : W.icon;

  // Clock
  startClock(tz);

  // Location
  el.cityName.textContent    = locName;
  el.countryDate.textContent = `${locCountry} · ${localDateStr(tz)}`;

  // Condition
  el.condIcon.textContent  = isNight && W.theme === 'clear' ? '🌙' : W.icon;
  el.condLabel.textContent = W.label;

  // Advisory
  el.advisoryText.textContent = getAdvisory(cur.weather_code, cur.temperature_2m, cur.uv_index ?? 0, cur.wind_speed_10m);

  // Temperature
  animateCount(el.tempValue, fTemp(cur.temperature_2m), 800);
  el.tempUnit.textContent = unitLbl();
  el.tempHigh.textContent = fTemp(daily.temperature_2m_max[0]);
  el.tempLow.textContent  = fTemp(daily.temperature_2m_min[0]);

  // Feels like
  const fl = fTemp(cur.apparent_temperature);
  el.feelsLike.textContent = `${fl}${unitLbl()}`;
  const diff = cur.apparent_temperature - cur.temperature_2m;
  el.feelsDesc.textContent = diff > 2 ? 'Warmer than actual' : diff < -2 ? 'Colder than actual' : 'Close to actual';

  // Humidity gauge
  const hum = cur.relative_humidity_2m;
  setGauge(el.humidityGauge, hum / 100);
  el.humidityVal.textContent = hum + '%';

  // Wind compass
  const windDeg = cur.wind_direction_10m ?? 0;
  el.compassNeedle.setAttribute('transform', `rotate(${windDeg} 40 40)`);
  el.windSpeed.textContent  = fWind(cur.wind_speed_10m);
  el.windDirEl.textContent  = windDirLabel(windDeg); // FIX #1: use el.windDirEl (renamed)

  // UV gauge
  const uv = Math.min(Math.round(cur.uv_index ?? 0), 11);
  setGauge(el.uvGauge, uv / 11);
  el.uvVal.textContent = uv;
  const uvLevels = ['Low','Low','Low','Moderate','Moderate','Moderate','High','High','Very High','Very High','Very High','Extreme'];
  el.uvLabel.textContent = uvLevels[uv] || 'High';

  // Visibility
  const vis = cur.visibility ?? 0;
  const visKm = (vis / 1000).toFixed(1);
  el.visibility.textContent = vis >= 1000 ? `${visKm} km` : `${vis} m`;
  el.visBar.style.width = `${Math.min(vis / 10000 * 100, 100)}%`;

  // FIX #9: Pressure — append " hPa" unit to the value display
  el.pressure.textContent      = Math.round(cur.surface_pressure ?? 1013) + ' hPa';
  el.pressureTrend.textContent = (cur.surface_pressure ?? 1013) > 1015 ? 'High · Fair weather' : 'Low · Unsettled';

  // Sunrise / Sunset arc and panel times
  if (daily.sunrise?.[0] && daily.sunset?.[0]) {
    updateSunArc(daily.sunrise[0], daily.sunset[0], tz);
    el.sunrise.textContent = fmtTime(daily.sunrise[0]);
    el.sunset.textContent  = fmtTime(daily.sunset[0]);
  }

  // Precipitation
  el.precipitation.textContent = `${(daily.precipitation_sum?.[0] ?? 0).toFixed(1)} mm`;

  // Moon phase
  const moon = getMoonPhase();
  el.moonIcon.textContent  = moon.icon;
  el.moonPhase.textContent = moon.label;

  // AQI — FIX #6: update gradient stops instead of overriding stroke attr
  if (aqData) {
    const pm25v = aqData.current?.pm2_5 ?? 0;
    const pm10v = aqData.current?.pm10  ?? 0;
    const oz    = aqData.current?.ozone ?? 0;
    const no2v  = aqData.current?.nitrogen_dioxide ?? 0;
    const aqi   = calcAQI(pm25v);
    const lvl   = aqiLevel(aqi);
    setAqiRing(el.aqiRing, Math.min(aqi / 300, 1));
    setAqiColor(lvl.color); // FIX #6: update gradient color, not solid stroke
    animateCount(el.aqiValue, aqi, 800);
    el.aqiLabel.textContent = lvl.label;
    el.pm25.textContent  = pm25v.toFixed(1) + ' μg/m³';
    el.pm10.textContent  = pm10v.toFixed(1) + ' μg/m³';
    el.ozone.textContent = oz.toFixed(1)    + ' μg/m³';
    el.no2.textContent   = no2v.toFixed(1)  + ' μg/m³';
  }

  // Hourly forecast (next 24h) — FIX #7: pass tz to fmtHour
  el.hourlyTrack.innerHTML = '';
  const nowMs = Date.now();
  let count = 0;
  for (let i = 0; i < hourly.time.length && count < 26; i++) {
    const t = parseLocalWallTime(hourly.time[i]);
    if (t < new Date(nowMs - 30 * 60000)) continue;
    const hw = wmo(hourly.weather_code[i]);
    const rainPct = hourly.precipitation_probability?.[i] ?? 0;
    const card = document.createElement('div');
    card.className = 'hour-card' + (count === 0 ? ' now' : '');
    card.innerHTML = `
      <div class="h-time">${count === 0 ? 'NOW' : fmtHour(hourly.time[i])}</div>
      <div class="h-icon">${hw.icon}</div>
      <div class="h-temp">${fTemp(hourly.temperature_2m[i])}${unitLbl()}</div>
      ${rainPct > 10 ? `<div class="h-rain">💧${rainPct}%</div>` : ''}
    `;
    el.hourlyTrack.appendChild(card);
    count++;
  }

  // 7-Day forecast — FIX #8: fmtDay now uses noon to avoid timezone day-boundary issues
  el.forecastList.innerHTML = '';
  for (let i = 0; i < daily.time.length; i++) {
    const dw = wmo(daily.weather_code[i]);
    const rp = daily.precipitation_probability_max?.[i] ?? 0;
    const row = document.createElement('div');
    row.className = 'fc-row';
    row.innerHTML = `
      <div class="fc-day">${fmtDay(daily.time[i], i)}</div>
      <div class="fc-icon">${dw.icon}</div>
      <div class="fc-rain">${rp > 5 ? `💧 ${rp}%` : ''}</div>
      <div class="fc-temps">
        <span class="fc-hi">${fTemp(daily.temperature_2m_max[i])}°</span>
        <span class="fc-lo">${fTemp(daily.temperature_2m_min[i])}°</span>
      </div>
    `;
    el.forecastList.appendChild(row);
  }

  // Temperature chart — next 24 hours (FIX #2 + #7: guard + tz)
  const chartTimes = [], chartTemps = [], chartRain = [];
  let cnt2 = 0;
  for (let i = 0; i < hourly.time.length && cnt2 < 24; i++) {
    const t = parseLocalWallTime(hourly.time[i]);
    if (t < new Date(nowMs - 30 * 60000)) continue;
    chartTimes.push(hourly.time[i]);
    chartTemps.push(S.useCelsius ? hourly.temperature_2m[i] : hourly.temperature_2m[i] * 9/5 + 32);
    chartRain.push(hourly.precipitation_probability?.[i] ?? 0);
    cnt2++;
  }

  showDashboard();
  requestAnimationFrame(() => drawTempChart(chartTimes, chartTemps, chartRain));
}

/* ── API ───────────────────────────────────────────────────── */
async function fetchWeather(lat, lon) {
  const params = new URLSearchParams({
    latitude: lat, longitude: lon, timezone: 'auto',
    current: [
      'temperature_2m','relative_humidity_2m','apparent_temperature',
      'weather_code','wind_speed_10m','wind_direction_10m','visibility',
      'precipitation','surface_pressure','uv_index','is_day',
    ].join(','),
    hourly: ['temperature_2m','weather_code','precipitation_probability'].join(','),
    daily: [
      'weather_code','temperature_2m_max','temperature_2m_min',
      'precipitation_sum','precipitation_probability_max','sunrise','sunset',
    ].join(','),
    forecast_days: 7,
  });
  const r = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
  if (!r.ok) throw new Error('Weather API error ' + r.status);
  return r.json();
}

async function fetchAQ(lat, lon) {
  const params = new URLSearchParams({
    latitude: lat, longitude: lon, timezone: 'auto',
    current: ['pm2_5','pm10','ozone','nitrogen_dioxide'].join(','),
  });
  const r = await fetch(`https://air-quality-api.open-meteo.com/v1/air-quality?${params}`);
  if (!r.ok) return null;
  return r.json();
}

async function geocodeSearch(q) {
  const r = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=6&language=en`);
  if (!r.ok) return [];
  return (await r.json()).results ?? [];
}

async function reverseGeocode(lat, lon) {
  try {
    const r = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`);
    if (!r.ok) return { name: 'My Location', country: '' };
    const d = await r.json();
    const name = d.address?.city || d.address?.town || d.address?.village || d.address?.county || 'My Location';
    const country = d.address?.country || '';
    return { name, country };
  } catch { return { name: 'My Location', country: '' }; }
}

async function loadLocation({ lat, lon, name, country }) {
  showLoading();
  S.lastLoc = { lat, lon, name, country };
  try {
    const [weather, aqData] = await Promise.all([
      fetchWeather(lat, lon),
      fetchAQ(lat, lon).catch(() => null),
    ]);
    render(weather, aqData, name, country);
  } catch (err) {
    console.error(err);
    showError('Failed to retrieve weather data. Check your connection.');
  }
}

/* ── SEARCH ─────────────────────────────────────────────────── */
function closeSugg() {
  el.suggestionsPanel.classList.remove('open');
  el.suggestionsPanel.innerHTML = '';
}

function openSugg(results) {
  if (!results.length) { closeSugg(); return; }
  el.suggestionsPanel.innerHTML = '';
  results.forEach(r => {
    const region = [r.admin1, r.country].filter(Boolean).join(', ');
    const item = document.createElement('div');
    item.className = 'sug-item';
    item.innerHTML = `<span class="sug-icon">📍</span><span class="sug-name">${r.name}</span><span class="sug-region">${region}</span>`;
    item.addEventListener('click', () => {
      el.searchInput.value = r.name;
      el.searchClear.classList.add('visible');
      closeSugg();
      loadLocation({ lat: r.latitude, lon: r.longitude, name: r.name, country: region });
    });
    el.suggestionsPanel.appendChild(item);
  });
  el.suggestionsPanel.classList.add('open');
}

el.searchInput.addEventListener('input', () => {
  const v = el.searchInput.value.trim();
  el.searchClear.classList.toggle('visible', v.length > 0);
  clearTimeout(S.searchTimer);
  if (v.length < 2) { closeSugg(); return; }
  S.searchTimer = setTimeout(async () => {
    try { openSugg(await geocodeSearch(v)); } catch { closeSugg(); }
  }, 350);
});

el.searchInput.addEventListener('keydown', e => {
  if (e.key === 'Escape') { closeSugg(); el.searchInput.blur(); }
  if (e.key === 'Enter')  el.suggestionsPanel.querySelector('.sug-item')?.click();
});

el.searchClear.addEventListener('click', () => {
  el.searchInput.value = '';
  el.searchClear.classList.remove('visible');
  closeSugg();
  el.searchInput.focus();
});

document.addEventListener('click', e => {
  if (!e.target.closest('.search-shell')) closeSugg();
});

/* ── UNIT TOGGLE ───────────────────────────────────────────── */
el.unitToggle.addEventListener('click', () => {
  S.useCelsius = !S.useCelsius;
  el.unitC.classList.toggle('active',  S.useCelsius);
  el.unitF.classList.toggle('active', !S.useCelsius);
  if (S.currentData) {
    const { weather, aqData, locName, locCountry } = S.currentData;
    render(weather, aqData, locName, locCountry);
  }
});

/* ── GEOLOCATION ───────────────────────────────────────────── */
async function useGeo() {
  if (!navigator.geolocation) { showError('Geolocation not supported by your browser.'); return; }
  showLoading();
  navigator.geolocation.getCurrentPosition(
    async pos => {
      const { latitude: lat, longitude: lon } = pos.coords;
      const { name, country } = await reverseGeocode(lat, lon);
      await loadLocation({ lat, lon, name, country });
    },
    () => showError('Location access denied. Please search for a city manually.'),
    { timeout: 8000 }
  );
}

el.locationBtn.addEventListener('click', useGeo);
el.retryBtn.addEventListener('click', () => S.lastLoc ? loadLocation(S.lastLoc) : useGeo());

/* ── RESIZE — chart only; canvas particle resize is debounced inside initCanvas ── */
// FIX #5: The canvas resize (particle rebuild) is debounced in initCanvas().
// The chart redraw on resize is handled by redrawChartFromState() called from resizeCanvas().
// No additional resize listener needed here.

/* ── BOOT ──────────────────────────────────────────────────── */
(async function boot() {
  initCanvas();
  showLoading();

  // Simulate brief scan
  await new Promise(r => setTimeout(r, 600));

  // Try geolocation, fall back to New Delhi
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      async pos => {
        const { latitude: lat, longitude: lon } = pos.coords;
        const { name, country } = await reverseGeocode(lat, lon);
        await loadLocation({ lat, lon, name, country });
      },
      async () => {
        await loadLocation({ lat: 28.6139, lon: 77.2090, name: 'New Delhi', country: 'India' });
      },
      { timeout: 5000 }
    );
  } else {
    await loadLocation({ lat: 28.6139, lon: 77.2090, name: 'New Delhi', country: 'India' });
  }
})();
