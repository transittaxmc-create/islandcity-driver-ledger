const $ = (id) => document.getElementById(id);
const storageKey = 'islandcity-driver-ledger-v1';
let state = JSON.parse(localStorage.getItem(storageKey)) || { trips: [], shiftStartedAt: null };
const today = () => new Date().toISOString().slice(0, 10);
$('date').value = today();
const money = (value) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value || 0);
const num = (id) => Math.max(0, Number($(id).value) || 0);
function save() { localStorage.setItem(storageKey, JSON.stringify(state)); }
function todayTrips() { return state.trips.filter((trip) => trip.date === today()); }
function render() {
  const trips = todayTrips();
  const gross = trips.reduce((sum, trip) => sum + trip.gross, 0);
  const net = trips.reduce((sum, trip) => sum + trip.net, 0);
  const miles = trips.reduce((sum, trip) => sum + trip.miles, 0);
  $('grossTotal').textContent = money(gross);
  $('netTotal').textContent = money(net);
  $('milesTotal').textContent = miles.toFixed(1);
  $('tripTotal').textContent = trips.length;
  $('tripList').innerHTML = trips.length ? trips.slice().reverse().map((trip) => `<article class="trip"><div><strong>${trip.platform}</strong><small>${trip.miles.toFixed(1)} mi · Toll: ${money(trip.toll)}${trip.location ? ' · Location saved' : ''}</small></div><div><strong>${money(trip.net)}</strong><small>Gross ${money(trip.gross)}</small></div></article>`).join('') : '<p class="empty">No trips recorded today.</p>';
  const active = Boolean(state.shiftStartedAt);
  $('shiftStatus').textContent = active ? 'On duty' : 'Off duty';
  $('shiftTime').textContent = active ? `Started ${new Date(state.shiftStartedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}` : 'No active shift';
  $('startShift').disabled = active;
  $('endShift').disabled = !active;
}
$('tripForm').addEventListener('submit', (event) => {
  event.preventDefault();
  const fare = num('fare'), tips = num('tips'), cash = num('cash'), extra = num('extra'), toll = num('toll'), reimbursed = num('reimbursed');
  const gross = fare + tips + cash + extra + reimbursed;
  state.trips.push({ id: crypto.randomUUID(), date: $('date').value, platform: $('platform').value, fare, tips, cash, extra, miles: num('miles'), toll, reimbursed, gross, net: gross - toll, location: $('location').value });
  save(); event.target.reset(); $('date').value = today(); $('location').value = ''; render();
});
$('startShift').addEventListener('click', () => { state.shiftStartedAt = Date.now(); save(); render(); });
$('endShift').addEventListener('click', () => { state.shiftStartedAt = null; save(); render(); });
$('clearToday').addEventListener('click', () => { if (confirm('Clear all trips recorded for today?')) { state.trips = state.trips.filter((trip) => trip.date !== today()); save(); render(); } });
$('locationButton').addEventListener('click', () => {
  if (!navigator.geolocation) return alert('Geolocation is not available on this device.');
  $('locationButton').textContent = 'Locating…';
  navigator.geolocation.getCurrentPosition((position) => { $('location').value = `${position.coords.latitude.toFixed(5)}, ${position.coords.longitude.toFixed(5)}`; $('locationButton').textContent = 'Location saved'; }, () => { $('locationButton').textContent = 'Use location'; alert('Location could not be saved. Check browser permissions.'); }, { enableHighAccuracy: true, timeout: 10000 });
});
render();