(() => {
  const $ = (id) => document.getElementById(id);
  const KEY = 'islandcity-driver-ledger-v2';

  const PLATFORMS = [
    { name: 'Uber', initial: 'U', color: '#111111' },
    { name: 'Lyft', initial: 'L', color: '#FF00BF' },
    { name: 'Empower', initial: 'E', color: '#3b82f6' },
    { name: 'Gallant', initial: 'G', color: '#f97316' },
    { name: 'Aventus Ride', initial: 'A', color: '#8b5cf6' },
    { name: 'Classic Ryde', initial: 'CR', color: '#14b8a6' },
    { name: 'Aki Technology', initial: 'AKI', color: '#0ea5e9' },
    { name: 'EcoRide', initial: 'E', color: '#22c55e' },
    { name: 'Island City Transit', initial: 'IC', color: '#d9b64f' },
    { name: 'Transit Tax', initial: 'TT', color: '#6b7280' },
    { name: 'Throo', initial: 'TH', color: '#ef4444' },
    { name: 'Brakha Group', initial: 'BG', color: '#a855f7' },
    { name: 'Street Hail', initial: 'SH', color: '#6b7280' },
    { name: 'Other', initial: 'O', color: '#9ca3af' },
  ];

  const TOLL_PLAZAS = [
    { name: 'Queens Midtown Tunnel', lat: 40.7434, lng: -73.9637, rate: 7.46, type: 'MTA' },
    { name: 'Hugh L. Carey Tunnel', lat: 40.6895, lng: -74.0149, rate: 7.46, type: 'MTA' },
    { name: 'RFK Bridge', lat: 40.7800, lng: -73.9500, rate: 7.46, type: 'MTA' },
    { name: 'Verrazzano-Narrows Bridge', lat: 40.6066, lng: -74.0449, rate: 7.46, type: 'MTA' },
    { name: 'Whitestone Bridge', lat: 40.7960, lng: -73.8305, rate: 7.46, type: 'MTA' },
    { name: 'Throgs Neck Bridge', lat: 40.8010, lng: -73.7970, rate: 7.46, type: 'MTA' },
    { name: 'Henry Hudson Bridge', lat: 40.8760, lng: -73.9300, rate: 3.42, type: 'MTA' },
    { name: 'Lincoln Tunnel', lat: 40.7589, lng: -74.0060, rate: 16.79, offPeak: 14.79, type: 'Port Authority' },
    { name: 'Holland Tunnel', lat: 40.7260, lng: -74.0270, rate: 16.79, offPeak: 14.79, type: 'Port Authority' },
    { name: 'George Washington Bridge', lat: 40.8517, lng: -73.9527, rate: 16.79, offPeak: 14.79, type: 'Port Authority' },
    { name: 'Goethals Bridge', lat: 40.6400, lng: -74.1900, rate: 16.79, offPeak: 14.79, type: 'Port Authority' },
    { name: 'Bayonne Bridge', lat: 40.6400, lng: -74.1100, rate: 16.79, offPeak: 14.79, type: 'Port Authority' },
    { name: 'Outerbridge Crossing', lat: 40.5200, lng: -74.2500, rate: 16.79, offPeak: 14.79, type: 'Port Authority' },
  ];

  const AIRPORTS = [
    { name: 'JFK Airport', lat: 40.6413, lng: -73.7781 },
    { name: 'LGA Airport', lat: 40.7769, lng: -73.8740 },
    { name: 'EWR Airport', lat: 40.6895, lng: -74.1745 },
    { name: 'ISP Airport', lat: 40.7952, lng: -73.1002 },
  ];

  const DAILY_GOAL = 500;

  let state = load();
  let watchId = null;
  let lastPlaza = null;
  let gps = { lat: null, lng: null, acc: null, status: 'inactive' };

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) return JSON.parse(raw);
    } catch {}
    return { trips: [], shiftActive: false, clockInISO: null, breakStartISO: null, totalBreakMs: 0, isOnBreak: false, platform: 'Uber' };
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch {}
  }
  function toast(msg, ms = 2400) {
    const el = $('toast');
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(el._t);
    el._t = setTimeout(() => el.classList.remove('show'), ms);
  }
  function money(v) { return '$' + (Number(v) || 0).toFixed(2); }
  function todayStr() { return new Date().toISOString().slice(0, 10); }
  function num(id) { return Math.max(0, parseFloat($(id).value) || 0); }

  function haversineKm(lat1, lng1, lat2, lng2) {
    const toRad = (d) => (d * Math.PI) / 180;
    const R = 6371;
    const dLat = toRad(lat2 - lat1), dLng = toRad(lng2 - lng1);
    const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng/2)**2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  }

  function buildPlatformGrid() {
    const grid = $('platformGrid');
    grid.innerHTML = PLATFORMS.map(p => `
      <button type="button" class="platform-chip${p.name === state.platform ? ' selected' : ''}" data-name="${p.name}">
        <span class="chip-dot" style="background:${p.color}">${p.initial}</span>
        ${p.name}
      </button>`).join('');
    grid.querySelectorAll('.platform-chip').forEach(btn => {
      btn.addEventListener('click', () => {
        state.platform = btn.dataset.name;
        $('platform').value = state.platform;
        grid.querySelectorAll('.platform-chip').forEach(b => b.classList.toggle('selected', b === btn));
      });
    });
  }

  function buildTollReference() {
    const el = $('tollReference');
    const seen = new Set();
    const rows = TOLL_PLAZAS.filter(p => { if (seen.has(p.name)) return false; seen.add(p.name); return true; });
    el.innerHTML = rows.map(p => `
      <div class="toll-chip">
        <b>${p.name}</b>
        <span>${p.offPeak ? `$${p.rate.toFixed(2)} peak / $${p.offPeak.toFixed(2)} off-peak` : `$${p.rate.toFixed(2)}`}</span>
      </div>`).join('');
  }

  function todayTrips() {
    return state.trips.filter(t => t.date === todayStr());
  }

  function liveTotal() {
    const fare = num('fare'), tips = num('tips'), cash = num('cash'), extra = num('extra'),
          toll = num('toll'), fee = num('fee'), reimb = num('reimbursed');
    return fare + tips + cash + extra + toll + reimb - fee;
  }

  function updateLiveTotal() {
    $('liveTotal').textContent = money(liveTotal());
  }

  function activeMs() {
    if (!state.shiftActive || !state.clockInISO) return 0;
    const now = Date.now();
    let breakMs = state.totalBreakMs;
    if (state.isOnBreak && state.breakStartISO) breakMs += now - new Date(state.breakStartISO).getTime();
    return now - new Date(state.clockInISO).getTime() - breakMs;
  }

  function render() {
    const trips = todayTrips();
    const grossReal = trips.reduce((a, t) => a + t.fare + t.tips + t.cash + t.extra + t.toll + t.reimbursed, 0);
    const tollsToday = trips.reduce((a, t) => a + t.toll, 0);
    const feesToday = trips.reduce((a, t) => a + t.fee, 0);
    const netToday = grossReal - feesToday;

    $('grossToday').textContent = money(grossReal);
    $('tripCountLabel').textContent = `${trips.length} viaje${trips.length === 1 ? '' : 's'}`;
    $('netToday').textContent = money(netToday);
    $('tollsToday').textContent = money(tollsToday);

    const hours = activeMs() / 3600000;
    const perHour = hours > 0.002 ? grossReal / hours : 0;
    $('perHour').textContent = perHour > 0 ? money(perHour) : '$0.00';

    const goalPct = Math.min((grossReal / DAILY_GOAL) * 100, 100);
    $('goalPct').textContent = `${goalPct.toFixed(0)}%`;
    $('goalBar').style.width = `${goalPct}%`;

    const badge = $('shiftBadge');
    if (state.shiftActive) {
      badge.textContent = state.isOnBreak ? 'ON BREAK' : 'ON DUTY';
      badge.className = 'badge ' + (state.isOnBreak ? 'break' : 'on');
    } else {
      badge.textContent = 'OFF DUTY';
      badge.className = 'badge off';
    }
    $('btnStart').disabled = state.shiftActive;
    $('btnBreak').disabled = !state.shiftActive;
    $('btnEnd').disabled = !state.shiftActive;
    $('btnStart').classList.toggle('active-state', state.shiftActive && !state.isOnBreak);
    $('btnBreak').classList.toggle('active-state', state.isOnBreak);
    $('btnEnd').classList.toggle('active-state', false);

    $('clockLine').textContent = new Date().toLocaleString('es-US', {
      weekday: 'long', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit', second: '2-digit'
    });

    renderTripList(trips);
  }

  function renderTripList(trips) {
    const list = $('tripList');
    if (!trips.length) { list.innerHTML = '<p class="empty">Sin viajes registrados hoy.</p>'; return; }
    list.innerHTML = trips.slice().reverse().map(t => {
      const meta = PLATFORMS.find(p => p.name === t.platform) || PLATFORMS[PLATFORMS.length - 1];
      const total = t.fare + t.tips + t.cash + t.extra + t.toll + t.reimbursed - t.fee;
      return `<div class="trip-item" data-id="${t.id}">
        <div class="t-left">
          <span class="chip-dot" style="background:${meta.color}">${meta.initial}</span>
          <div>
            <strong>${t.platform}</strong>
            <small>${t.pickup || 'Sin origen'} → ${t.dropoff || 'Sin destino'} · ${t.miles.toFixed(1)} mi</small>
          </div>
        </div>
        <div class="t-right">
          <strong>${money(total)}</strong>
          <button data-del="${t.id}" title="Eliminar">✕</button>
        </div>
      </div>`;
    }).join('');
    list.querySelectorAll('[data-del]').forEach(btn => {
      btn.addEventListener('click', () => {
        if (!confirm('¿Eliminar este viaje?')) return;
        state.trips = state.trips.filter(t => t.id !== btn.dataset.del);
        save(); render();
      });
    });
  }

  function checkTollGeofence() {
    if (!gps.lat || !gps.lng) return;
    const GEOFENCE_KM = 0.35;
    for (const plaza of TOLL_PLAZAS) {
      const d = haversineKm(gps.lat, gps.lng, plaza.lat, plaza.lng);
      if (d <= GEOFENCE_KM) {
        if (lastPlaza === plaza.name) return;
        lastPlaza = plaza.name;
        let rate = plaza.rate;
        if (plaza.offPeak !== undefined) {
          const now = new Date(); const h = now.getHours(); const dow = now.getDay();
          const isWeekday = dow >= 1 && dow <= 5;
          const isPeak = isWeekday && ((h >= 6 && h < 10) || (h >= 16 && h < 20));
          rate = isPeak ? plaza.rate : plaza.offPeak;
        }
        const flag = $('tollDetected');
        flag.textContent = `⚡ Peaje detectado · ${plaza.name} · $${rate.toFixed(2)}`;
        flag.classList.remove('hidden');
        if (!$('toll').value || parseFloat($('toll').value) === 0) {
          $('toll').value = rate.toFixed(2);
          updateLiveTotal();
        }
        toast(`⚡ ${plaza.name} · $${rate.toFixed(2)}`);
        return;
      }
    }
    lastPlaza = null;
  }

  function checkAirportProximity() {
    if (!gps.lat || !gps.lng) { $('gpsAirport').textContent = ''; return; }
    let nearest = null;
    for (const ap of AIRPORTS) {
      const d = haversineKm(gps.lat, gps.lng, ap.lat, ap.lng);
      if (!nearest || d < nearest.dist) nearest = { name: ap.name, dist: d };
    }
    $('gpsAirport').textContent = nearest && nearest.dist <= 15 ? `✈ ${nearest.name} (${nearest.dist.toFixed(1)} km)` : '';
  }

  function startGPS() {
    if (!navigator.geolocation) { toast('GPS no disponible en este dispositivo'); return; }
    gps.status = 'searching';
    $('gpsBadge').textContent = 'Buscando GPS…';
    $('gpsBadge').className = 'pill searching';
    if (watchId !== null) { try { navigator.geolocation.clearWatch(watchId); } catch {} }
    watchId = navigator.geolocation.watchPosition(
      (pos) => {
        gps = { lat: pos.coords.latitude, lng: pos.coords.longitude, acc: pos.coords.accuracy, status: 'active' };
        $('gpsBadge').textContent = `GPS activo ±${Math.round(gps.acc)}m`;
        $('gpsBadge').className = 'pill active';
        $('gpsAddress').textContent = `${gps.lat.toFixed(5)}, ${gps.lng.toFixed(5)}`;
        checkTollGeofence();
        checkAirportProximity();
      },
      () => {
        gps.status = 'error';
        $('gpsBadge').textContent = 'Error GPS';
        $('gpsBadge').className = 'pill inactive';
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
    );
  }
  function stopGPS() {
    if (watchId !== null) { try { navigator.geolocation.clearWatch(watchId); } catch {} watchId = null; }
    gps.status = 'inactive';
    $('gpsBadge').textContent = 'GPS inactivo';
    $('gpsBadge').className = 'pill inactive';
  }
  function captureLocationField(target) {
    if (!navigator.geolocation) { toast('GPS no disponible'); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const label = `${pos.coords.latitude.toFixed(5)}, ${pos.coords.longitude.toFixed(5)}`;
        if (target === 'pickup') $('pickup').value = label;
        else $('dropoff').value = label;
        toast('Ubicación capturada ✓');
      },
      () => toast('No se pudo obtener ubicación'),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  function handleStart() {
    const now = new Date();
    state.shiftActive = true;
    state.clockInISO = now.toISOString();
    state.isOnBreak = false;
    state.breakStartISO = null;
    state.totalBreakMs = 0;
    save(); render(); startGPS();
    toast(`Turno iniciado ${now.toLocaleTimeString()} · GPS activo`);
  }
  function handleBreak() {
    if (!state.shiftActive) return;
    const now = new Date();
    if (!state.isOnBreak) {
      state.isOnBreak = true;
      state.breakStartISO = now.toISOString();
      toast('Break iniciado');
    } else {
      state.totalBreakMs += now.getTime() - new Date(state.breakStartISO).getTime();
      state.isOnBreak = false;
      state.breakStartISO = null;
      toast('De vuelta en ruta');
    }
    save(); render();
  }
  function handleEnd() {
    if (!state.shiftActive) return;
    const hours = activeMs() / 3600000;
    state.shiftActive = false;
    state.isOnBreak = false;
    state.breakStartISO = null;
    state.totalBreakMs = 0;
    state.clockInISO = null;
    save(); render(); stopGPS();
    toast(`Turno finalizado · ${hours.toFixed(2)}h`);
  }

  function handleSubmit(e) {
    e.preventDefault();
    const fare = num('fare');
    if (fare <= 0 && !$('pickup').value && !$('dropoff').value) {
      toast('Ingresa al menos la tarifa'); return;
    }
    const now = new Date();
    const trip = {
      id: (crypto.randomUUID ? crypto.randomUUID() : String(Date.now())),
      platform: state.platform,
      fare, tips: num('tips'), cash: num('cash'), extra: num('extra'),
      miles: num('miles'), fee: num('fee'), toll: num('toll'), reimbursed: num('reimbursed'),
      pickup: $('pickup').value.trim(), dropoff: $('dropoff').value.trim(),
      date: todayStr(), timestamp: now.toISOString(),
      gps: gps.lat && gps.lng ? { lat: gps.lat, lng: gps.lng } : null,
    };
    state.trips.push(trip);
    save();
    e.target.reset();
    $('platform').value = state.platform;
    $('tollDetected').classList.add('hidden');
    updateLiveTotal();
    render();
    toast(`Viaje guardado ✓ ${money(trip.fare + trip.tips + trip.cash + trip.extra + trip.toll + trip.reimbursed - trip.fee)}`);
  }

  function handleClearToday() {
    if (!confirm('¿Borrar todos los viajes de hoy? Esta acción no se puede deshacer.')) return;
    const today = todayStr();
    state.trips = state.trips.filter(t => t.date !== today);
    save(); render();
    toast('Viajes de hoy eliminados');
  }

  function handleExport() {
    const backup = { exportedAt: new Date().toISOString(), app: 'IslandCity Driver Ledger v2', ...state };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `islandcity-backup-${todayStr()}.json`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast('Backup descargado ✓');
  }

  function init() {
    buildPlatformGrid();
    buildTollReference();
    $('platform').value = state.platform;

    ['fare','tips','cash','extra','toll','fee','reimbursed'].forEach(id => {
      $(id).addEventListener('input', updateLiveTotal);
    });
    $('tripForm').addEventListener('submit', handleSubmit);
    $('btnStart').addEventListener('click', handleStart);
    $('btnBreak').addEventListener('click', handleBreak);
    $('btnEnd').addEventListener('click', handleEnd);
    $('btnClearToday').addEventListener('click', handleClearToday);
    $('btnExport').addEventListener('click', handleExport);
    $('btnLocation').addEventListener('click', () => captureLocationField('pickup'));

    if (state.shiftActive) startGPS();
    setInterval(render, 1000);
    render();
    updateLiveTotal();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
