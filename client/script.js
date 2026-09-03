/* =========================================================
   TripShare India — frontend application logic
   Talks to the Express/MongoDB backend over REST APIs.
   JWT token is kept in localStorage (allowed per project spec);
   all real data (users, events, bookings, favourites, expenses)
   lives in MongoDB on the server.
   ========================================================= */

const API_BASE = 'https://tripshare-india.onrender.com/api';
const UPLOADS_BASE = 'https://tripshare-india.onrender.com';

const state = {
  token: localStorage.getItem('ts_token') || null,
  user: null,
  events: [],
  favourites: [],
  categoryFilter: '',
  confirmCallback: null
};

/* ---------------------------------------------------------
   Small helpers
   --------------------------------------------------------- */
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

const formatDate = (d) =>
  new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

const formatMoney = (n) => `₹${Number(n).toLocaleString('en-IN')}`;

const imageUrl = (path) => {
  if (!path) return 'https://images.unsplash.com/photo-1503220317375-aaad61436b1b?auto=format&fit=crop&w=800&q=80';
  if (path.startsWith('http')) return path;
  return `${UPLOADS_BASE}${path}`;
};

const initials = (name = '') =>
  name.trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() || '').join('') || 'U';

function showToast(message, type = 'info') {
  const icons = { success: 'fa-circle-check', error: 'fa-circle-xmark', info: 'fa-circle-info' };
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<i class="fa-solid ${icons[type]}"></i><span>${message}</span>`;
  $('#toastContainer').appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(30px)';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

function openModal(id) { $(`#${id}`).classList.remove('hidden'); document.body.style.overflow = 'hidden'; }
function closeModal(id) { $(`#${id}`).classList.add('hidden'); document.body.style.overflow = ''; }

function askConfirm(title, message, onConfirm) {
  $('#confirmTitle').textContent = title;
  $('#confirmMessage').textContent = message;
  state.confirmCallback = onConfirm;
  openModal('confirmModal');
}

/* ---------------------------------------------------------
   API wrapper
   --------------------------------------------------------- */
async function api(path, { method = 'GET', body, isForm = false } = {}) {
  const headers = {};
  if (state.token) headers.Authorization = `Bearer ${state.token}`;
  if (!isForm && body) headers['Content-Type'] = 'application/json';

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: isForm ? body : body ? JSON.stringify(body) : undefined
  });

  let data;
  try { data = await res.json(); } catch { data = {}; }

  if (!res.ok) {
    throw new Error(data.message || 'Something went wrong. Please try again.');
  }
  return data;
}

/* ---------------------------------------------------------
   Navigation (SPA-style view switching)
   --------------------------------------------------------- */
function navigateTo(view) {
  if (['bookings', 'favourites', 'expenses', 'profile', 'travelbuddy'].includes(view) && !state.user) {
    openModal('authModal');
    showToast('Please log in to continue.', 'info');
    return;
  }
  if (view === 'admin' && (!state.user || state.user.role !== 'admin')) {
    showToast('Admin access only.', 'error');
    return;
  }
  if (view === 'profile') { openProfileModal(); return; }

  $$('.view').forEach((v) => v.classList.remove('active'));
  const target = $(`#view-${view}`);
  if (target) target.classList.add('active');

  $$('.nav-link').forEach((btn) => btn.classList.toggle('active', btn.dataset.nav === view));
  $('#navLinks').classList.remove('open');
  window.scrollTo({ top: 0, behavior: 'smooth' });

  if (view === 'explore') loadEvents();
  if (view === 'bookings') loadMyBookings();
  if (view === 'favourites') loadFavourites();
  if (view === 'expenses') loadExpenseHistory();
  if (view === 'admin') loadAdminData();
  if (view === 'travelbuddy') loadMyTrips();
}

$$('[data-nav]').forEach((el) => el.addEventListener('click', () => navigateTo(el.dataset.nav)));

/* ---------------------------------------------------------
   Auth: session restore, login, signup, logout, forgot pw
   --------------------------------------------------------- */
async function restoreSession() {
  if (!state.token) return updateAuthUI();
  try {
    const data = await api('/auth/me');
    state.user = data.user;
  } catch {
    state.token = null;
    localStorage.removeItem('ts_token');
  }
  updateAuthUI();
}

function updateAuthUI() {
  const loggedIn = !!state.user;
  $$('.auth-only').forEach((el) => el.style.display = loggedIn ? '' : 'none');
  $$('.guest-only').forEach((el) => el.style.display = loggedIn ? 'none' : '');
  $$('.admin-only').forEach((el) => el.style.display = loggedIn && state.user.role === 'admin' ? '' : 'none');

  if (loggedIn) {
    $('#navUserName').textContent = state.user.fullName.split(' ')[0];
    $('#navAvatar').textContent = initials(state.user.fullName);
  }
}

$('#btnLoginNav').addEventListener('click', () => openModal('authModal'));
$('#btnHeroSignup').addEventListener('click', () => { openModal('authModal'); switchAuthTab('signup'); });
$('#footerLogin').addEventListener('click', () => openModal('authModal'));
$('#footerSignup').addEventListener('click', () => { openModal('authModal'); switchAuthTab('signup'); });

$('#profileChip').addEventListener('click', (e) => {
  e.stopPropagation();
  $('#profileChip').classList.toggle('open');
});
document.addEventListener('click', () => $('#profileChip')?.classList.remove('open'));

function switchAuthTab(tab) {
  $$('.auth-tab').forEach((t) => t.classList.toggle('active', t.dataset.authTab === tab));
  $('#loginForm').classList.toggle('hidden', tab !== 'login');
  $('#signupForm').classList.toggle('hidden', tab !== 'signup');
  $('#forgotForm').classList.add('hidden');
}
$$('[data-auth-tab]').forEach((btn) => btn.addEventListener('click', () => switchAuthTab(btn.dataset.authTab)));

$$('.toggle-pass').forEach((btn) => {
  btn.addEventListener('click', () => {
    const input = $(`#${btn.dataset.target}`);
    const isPass = input.type === 'password';
    input.type = isPass ? 'text' : 'password';
    btn.innerHTML = `<i class="fa-solid ${isPass ? 'fa-eye-slash' : 'fa-eye'}"></i>`;
  });
});

$('#loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    const data = await api('/auth/login', {
      method: 'POST',
      body: { email: $('#loginEmail').value.trim(), password: $('#loginPassword').value }
    });
    state.token = data.token;
    state.user = data.user;
    localStorage.setItem('ts_token', data.token);
    updateAuthUI();
    closeModal('authModal');
    showToast(`Welcome back, ${data.user.fullName.split(' ')[0]}!`, 'success');
    navigateTo('home');
  } catch (err) { showToast(err.message, 'error'); }
});

$('#signupForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const password = $('#suPassword').value;
  const confirm = $('#suConfirm').value;
  if (password !== confirm) return showToast('Passwords do not match.', 'error');

  try {
    const data = await api('/auth/signup', {
      method: 'POST',
      body: {
        fullName: $('#suName').value.trim(),
        email: $('#suEmail').value.trim(),
        phone: $('#suPhone').value.trim(),
        city: $('#suCity').value.trim(),
        password,
        confirmPassword: confirm
      }
    });
    state.token = data.token;
    state.user = data.user;
    localStorage.setItem('ts_token', data.token);
    updateAuthUI();
    closeModal('authModal');
    showToast('Account created! Welcome to TripShare India.', 'success');
    navigateTo('home');
  } catch (err) { showToast(err.message, 'error'); }
});

$('#btnForgotPassword').addEventListener('click', () => {
  $$('.auth-tab').forEach((t) => t.classList.remove('active'));
  $('#loginForm').classList.add('hidden');
  $('#signupForm').classList.add('hidden');
  $('#forgotForm').classList.remove('hidden');
  $('#fpTokenBox').classList.add('hidden');
});

let generatedResetToken = null;
$('#btnGenerateToken').addEventListener('click', async () => {
  try {
    const data = await api('/auth/forgot-password', { method: 'POST', body: { email: $('#fpEmail').value.trim() } });
    generatedResetToken = data.resetToken;
    $('#fpTokenBox').classList.remove('hidden');
    $('#fpTokenBox').innerHTML = `<p style="font-size:13px;color:var(--gold-soft);">Demo reset token (would normally be emailed): <br><b>${data.resetToken}</b></p>`;
    showToast('Reset token generated.', 'success');
  } catch (err) { showToast(err.message, 'error'); }
});

$('#btnResetPassword').addEventListener('click', async () => {
  if (!generatedResetToken) return showToast('Generate a reset token first.', 'error');
  try {
    await api('/auth/reset-password', {
      method: 'POST',
      body: { email: $('#fpEmail').value.trim(), resetToken: generatedResetToken, newPassword: $('#fpNewPassword').value }
    });
    showToast('Password reset. Please log in.', 'success');
    switchAuthTab('login');
  } catch (err) { showToast(err.message, 'error'); }
});

$('#btnLogout').addEventListener('click', () => {
  askConfirm('Log out?', 'You will need to log in again to access your bookings and favourites.', () => {
    state.token = null;
    state.user = null;
    localStorage.removeItem('ts_token');
    updateAuthUI();
    navigateTo('home');
    showToast('Logged out successfully.', 'info');
  });
});

/* ---------------------------------------------------------
   Modal close handlers (X buttons + overlay click)
   --------------------------------------------------------- */
$$('[data-close]').forEach((btn) => btn.addEventListener('click', () => closeModal(btn.dataset.close)));
$$('.modal-overlay').forEach((ov) => {
  ov.addEventListener('click', (e) => { if (e.target === ov) ov.classList.add('hidden'); document.body.style.overflow = ''; });
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') $$('.modal-overlay').forEach((ov) => ov.classList.add('hidden'));
});

$('#confirmCancelBtn').addEventListener('click', () => closeModal('confirmModal'));
$('#confirmOkBtn').addEventListener('click', () => {
  closeModal('confirmModal');
  if (state.confirmCallback) state.confirmCallback();
  state.confirmCallback = null;
});

/* ---------------------------------------------------------
   Events: load, render cards, search/filter/sort
   --------------------------------------------------------- */
async function loadEvents(params = {}) {
  try {
    const q = new URLSearchParams(params).toString();
    const data = await api(`/events${q ? `?${q}` : ''}`);
    state.events = data.events;
    return data.events;
  } catch (err) {
    showToast(err.message, 'error');
    return [];
  }
}

function eventCardHTML(ev) {
  const isFav = state.user && state.favourites.some((f) => String(f._id || f) === String(ev._id));
  const seatsRatio = ev.totalSeats ? ev.availableSeats / ev.totalSeats : 1;
  const isFillingFast = seatsRatio <= 0.2 && ev.availableSeats > 0;
  const tags = Array.isArray(ev.tags) ? ev.tags.slice(0, 3) : [];

  return `
  <div class="event-card" data-id="${ev._id}">
    <div class="event-thumb">
      <img src="${imageUrl(ev.image)}" alt="${ev.title} in ${ev.city}" loading="lazy">
      <span class="event-badge">${ev.category}</span>
      <button class="share-btn" data-share="${ev._id}" aria-label="Share event"><i class="fa-solid fa-share-nodes"></i></button>
      <button class="fav-btn ${isFav ? 'active' : ''}" data-fav="${ev._id}" aria-label="Toggle favourite">
        <i class="fa-${isFav ? 'solid' : 'regular'} fa-heart"></i>
      </button>
      ${isFillingFast ? `<span class="badge-fast"><i class="fa-solid fa-fire"></i> Filling fast</span>` : ''}
    </div>
    <div class="event-body">
      <h3>${ev.title}</h3>
      <div class="event-meta">
        <span><i class="fa-solid fa-location-dot"></i> ${ev.city}</span>
        <span><i class="fa-solid fa-calendar"></i> ${formatDate(ev.date)}</span>
        <span><i class="fa-solid fa-clock"></i> ${ev.time}</span>
      </div>
      ${ev.organiser ? `<div class="event-organiser"><i class="fa-solid fa-building-user"></i> ${ev.organiser}</div>` : ''}
      ${tags.length ? `<div class="event-tags">${tags.map((t) => `<span class="event-tag">#${t}</span>`).join('')}</div>` : ''}
      <div class="event-price-row">
        <span class="event-price">${ev.price === 0 ? 'Free' : formatMoney(ev.price)}</span>
        <span class="event-rating"><i class="fa-solid fa-star"></i> ${ev.rating}</span>
      </div>
      <span class="seats-left">${ev.availableSeats} seat(s) left</span>
      <div class="event-actions">
        <button class="btn btn-outline" data-view-event="${ev._id}"><i class="fa-solid fa-circle-info"></i> Details</button>
        <button class="btn btn-primary" data-book-event="${ev._id}" ${ev.availableSeats < 1 ? 'disabled' : ''}><i class="fa-solid fa-ticket"></i> Book now</button>
      </div>
    </div>
  </div>`;
}

function attachEventCardHandlers(container) {
  container.querySelectorAll('[data-fav]').forEach((btn) =>
    btn.addEventListener('click', (e) => { e.stopPropagation(); toggleFavourite(btn.dataset.fav); })
  );
  container.querySelectorAll('[data-view-event]').forEach((btn) =>
    btn.addEventListener('click', () => openEventDetails(btn.dataset.viewEvent))
  );
  container.querySelectorAll('[data-book-event]').forEach((btn) =>
    btn.addEventListener('click', () => openBookingModal(btn.dataset.bookEvent))
  );
  container.querySelectorAll('[data-share]').forEach((btn) =>
    btn.addEventListener('click', (e) => { e.stopPropagation(); shareEvent(btn.dataset.share); })
  );
}

function shareEvent(eventId) {
  const ev = state.events.find((e) => e._id === eventId);
  const shareText = ev ? `Check out "${ev.title}" in ${ev.city} on TripShare India!` : 'Check out this event on TripShare India!';
  const shareUrl = `${window.location.origin}${window.location.pathname}#event-${eventId}`;
  if (navigator.share) {
    navigator.share({ title: 'TripShare India', text: shareText, url: shareUrl }).catch(() => {});
  } else {
    navigator.clipboard.writeText(shareUrl).then(() => showToast('Event link copied to clipboard!', 'success'))
      .catch(() => showToast('Could not copy link.', 'error'));
  }
}

async function renderHomeEvents() {
  const events = await loadEvents({ sort: 'rating' });
  const top = events.slice(0, 6);
  $('#homeEventGrid').innerHTML = top.map(eventCardHTML).join('') || '<p>No events available right now.</p>';
  attachEventCardHandlers($('#homeEventGrid'));
  $('#statEvents').textContent = `${events.length}+`;
}

async function renderExploreEvents() {
  const params = {};
  const search = $('#searchInput').value.trim();
  const city = $('#cityFilter').value;
  const date = $('#dateFilter').value;
  const sort = $('#sortSelect').value;
  if (search) params.search = search;
  if (city) params.city = city;
  if (date) params.date = date;
  if (sort) params.sort = sort;
  if (state.categoryFilter) params.category = state.categoryFilter;

  let events = await loadEvents(params);

  // Client-side extra filters (price range, free-only, filling-fast)
  const priceMin = Number($('#priceMin').value) || null;
  const priceMax = Number($('#priceMax').value) || null;
  const freeOnly = $('#freeOnlyToggle').checked;
  const fillingFastOnly = $('#fillingFastToggle').checked;

  if (priceMin !== null) events = events.filter((e) => e.price >= priceMin);
  if (priceMax !== null) events = events.filter((e) => e.price <= priceMax);
  if (freeOnly) events = events.filter((e) => e.price === 0);
  if (fillingFastOnly) events = events.filter((e) => e.totalSeats && (e.availableSeats / e.totalSeats) <= 0.2 && e.availableSeats > 0);

  const grid = $('#exploreEventGrid');
  grid.innerHTML = events.map(eventCardHTML).join('');
  attachEventCardHandlers(grid);
  $('#exploreEmptyState').classList.toggle('hidden', events.length > 0);
  $('#resultsCount').textContent = `Showing ${events.length} event${events.length === 1 ? '' : 's'}`;
}

let searchDebounce;
$('#searchInput').addEventListener('input', () => { clearTimeout(searchDebounce); searchDebounce = setTimeout(renderExploreEvents, 350); });
$('#cityFilter').addEventListener('change', renderExploreEvents);
$('#dateFilter').addEventListener('change', renderExploreEvents);
$('#sortSelect').addEventListener('change', renderExploreEvents);
$('#priceMin').addEventListener('input', () => { clearTimeout(searchDebounce); searchDebounce = setTimeout(renderExploreEvents, 350); });
$('#priceMax').addEventListener('input', () => { clearTimeout(searchDebounce); searchDebounce = setTimeout(renderExploreEvents, 350); });
$('#freeOnlyToggle').addEventListener('change', renderExploreEvents);
$('#fillingFastToggle').addEventListener('change', renderExploreEvents);

$('#btnGridView').addEventListener('click', () => {
  $('#exploreEventGrid').classList.remove('list-mode');
  $('#btnGridView').classList.add('active');
  $('#btnListView').classList.remove('active');
});
$('#btnListView').addEventListener('click', () => {
  $('#exploreEventGrid').classList.add('list-mode');
  $('#btnListView').classList.add('active');
  $('#btnGridView').classList.remove('active');
});

$('#btnClearFilters').addEventListener('click', () => {
  $('#searchInput').value = ''; $('#cityFilter').value = ''; $('#dateFilter').value = ''; $('#sortSelect').value = 'date';
  $('#priceMin').value = ''; $('#priceMax').value = ''; $('#freeOnlyToggle').checked = false; $('#fillingFastToggle').checked = false;
  state.categoryFilter = '';
  $$('.chip').forEach((c) => c.classList.toggle('active', c.dataset.cat === ''));
  renderExploreEvents();
});
$$('#categoryBar .chip').forEach((chip) => chip.addEventListener('click', () => {
  state.categoryFilter = chip.dataset.cat;
  $$('.chip').forEach((c) => c.classList.toggle('active', c === chip));
  renderExploreEvents();
}));

/* ---------------------------------------------------------
   Event details modal
   --------------------------------------------------------- */
async function openEventDetails(id) {
  try {
    const { event } = await api(`/events/${id}`);
    const isFav = state.user && state.favourites.some((f) => String(f._id || f) === String(event._id));
    $('#eventModalBody').innerHTML = `
      <button class="modal-close" data-close="eventModal"><i class="fa-solid fa-xmark"></i></button>
      <img src="${imageUrl(event.image)}" alt="${event.title}">
      <span class="event-badge">${event.category}</span>
      <h2>${event.title}</h2>
      <p>${event.description}</p>
      <div class="event-modal-meta">
        <span><i class="fa-solid fa-location-dot"></i> ${event.venue}, ${event.city}</span>
        <span><i class="fa-solid fa-calendar"></i> ${formatDate(event.date)}</span>
        <span><i class="fa-solid fa-clock"></i> ${event.time}</span>
        <span><i class="fa-solid fa-star"></i> ${event.rating} rating</span>
        <span><i class="fa-solid fa-chair"></i> ${event.availableSeats} seats left</span>
        <span><i class="fa-solid fa-building-user"></i> ${event.organiser}</span>
      </div>
      <div class="event-price-row"><span class="event-price">${event.price === 0 ? 'Free entry' : formatMoney(event.price)}</span></div>
      <div class="event-modal-actions">
        <button class="btn btn-outline" id="modalFavBtn"><i class="fa-${isFav ? 'solid' : 'regular'} fa-heart"></i> ${isFav ? 'Saved' : 'Save'}</button>
        <button class="btn btn-ghost" id="modalMatchBtn"><i class="fa-solid fa-people-arrows"></i> Travel companions</button>
        <button class="btn btn-primary" id="modalBookBtn" ${event.availableSeats < 1 ? 'disabled' : ''}><i class="fa-solid fa-ticket"></i> Book now</button>
      </div>`;
    $('[data-close="eventModal"]').addEventListener('click', () => closeModal('eventModal'));
    $('#modalFavBtn').addEventListener('click', () => toggleFavourite(event._id, true));
    $('#modalMatchBtn').addEventListener('click', () => { closeModal('eventModal'); openMatchModal(event._id); });
    $('#modalBookBtn').addEventListener('click', () => { closeModal('eventModal'); openBookingModal(event._id); });
    openModal('eventModal');
  } catch (err) { showToast(err.message, 'error'); }
}

/* ---------------------------------------------------------
   Favourites
   --------------------------------------------------------- */
async function loadFavouritesData() {
  if (!state.user) { state.favourites = []; return; }
  try {
    const data = await api('/users/favourites');
    state.favourites = data.favourites;
  } catch { state.favourites = []; }
}

async function toggleFavourite(eventId, refreshModal = false) {
  if (!state.user) { openModal('authModal'); showToast('Log in to save favourites.', 'info'); return; }
  try {
    const data = await api(`/users/favourites/${eventId}`, { method: 'POST' });
    await loadFavouritesData();
    showToast(data.message, 'success');
    if ($('#view-explore').classList.contains('active')) renderExploreEvents();
    if ($('#view-home').classList.contains('active')) renderHomeEvents();
    if ($('#view-favourites').classList.contains('active')) loadFavourites();
    if (refreshModal) openEventDetails(eventId);
  } catch (err) { showToast(err.message, 'error'); }
}

async function loadFavourites() {
  await loadFavouritesData();
  const grid = $('#favouritesGrid');
  grid.innerHTML = state.favourites.map(eventCardHTML).join('');
  attachEventCardHandlers(grid);
  $('#favouritesEmptyState').classList.toggle('hidden', state.favourites.length > 0);
}

/* ---------------------------------------------------------
   Booking modal + confirm booking
   --------------------------------------------------------- */
let currentBookingEvent = null;

async function openBookingModal(eventId) {
  if (!state.user) { openModal('authModal'); showToast('Log in to book tickets.', 'info'); return; }
  try {
    const { event } = await api(`/events/${eventId}`);
    currentBookingEvent = event;
    $('#bookingEventSummary').innerHTML = `
      <img src="${imageUrl(event.image)}" alt="${event.title}">
      <div><h4 style="margin:0 0 4px;">${event.title}</h4><p style="margin:0;font-size:13px;">${event.city} • ${formatDate(event.date)}</p></div>`;
    $('#bookingQty').value = 1;
    $('#bookingQty').max = event.availableSeats;
    updateBookingTotal();
    openModal('bookingModal');
  } catch (err) { showToast(err.message, 'error'); }
}

function updateBookingTotal() {
  const qty = Number($('#bookingQty').value) || 1;
  const total = currentBookingEvent ? currentBookingEvent.price * qty : 0;
  $('#bookingTotal').textContent = formatMoney(total);
}
$('#bookingQty').addEventListener('input', updateBookingTotal);

$('#btnConfirmBooking').addEventListener('click', async () => {
  const qty = Number($('#bookingQty').value);
  if (!qty || qty < 1) return showToast('Enter a valid ticket quantity.', 'error');
  try {
    const data = await api('/bookings', { method: 'POST', body: { eventId: currentBookingEvent._id, quantity: qty } });
    closeModal('bookingModal');
    showToast('Booking confirmed! Check My Bookings.', 'success');
    renderHomeEvents();
    if ($('#view-explore').classList.contains('active')) renderExploreEvents();
  } catch (err) { showToast(err.message, 'error'); }
});

/* ---------------------------------------------------------
   My Bookings
   --------------------------------------------------------- */
async function loadMyBookings() {
  try {
    const { bookings } = await api('/bookings/my');
    const list = $('#bookingList');
    list.innerHTML = bookings.map((b) => `
      <div class="booking-card">
        <img src="${imageUrl(b.event?.image)}" alt="${b.event?.title || 'Event'}">
        <div class="booking-info">
          <h4>${b.event?.title || 'Event removed'}</h4>
          <div class="meta-row">
            <span><i class="fa-solid fa-location-dot"></i> ${b.event?.city || '-'}</span>
            <span><i class="fa-solid fa-calendar"></i> ${b.event ? formatDate(b.event.date) : '-'}</span>
            <span><i class="fa-solid fa-ticket"></i> Qty: ${b.quantity}</span>
            <span><i class="fa-solid fa-indian-rupee-sign"></i> ${formatMoney(b.totalAmount)}</span>
            <span class="status-pill ${b.status}">${b.status}</span>
          </div>
        </div>
        <div class="booking-card-actions">
          <button class="btn btn-ghost" data-ticket="${b._id}"><i class="fa-solid fa-download"></i> Download ticket</button>
          ${b.status === 'confirmed' ? `<button class="btn btn-outline" data-cancel="${b._id}"><i class="fa-solid fa-ban"></i> Cancel</button>` : ''}
        </div>
      </div>`).join('');

    list.querySelectorAll('[data-cancel]').forEach((btn) =>
      btn.addEventListener('click', () => askConfirm('Cancel this booking?', 'Your seats will be released and this cannot be undone.', () => cancelBooking(btn.dataset.cancel)))
    );
    list.querySelectorAll('[data-ticket]').forEach((btn) =>
      btn.addEventListener('click', () => downloadTicket(bookings.find((b) => b._id === btn.dataset.ticket)))
    );

    $('#bookingsEmptyState').classList.toggle('hidden', bookings.length > 0);
  } catch (err) { showToast(err.message, 'error'); }
}

async function cancelBooking(id) {
  try {
    await api(`/bookings/${id}/cancel`, { method: 'PUT' });
    showToast('Booking cancelled.', 'success');
    loadMyBookings();
  } catch (err) { showToast(err.message, 'error'); }
}

function downloadTicket(booking) {
  if (!booking || !booking.event) return showToast('Ticket data unavailable.', 'error');
  const ev = booking.event;
  const content =
`===========================================
        TRIPSHARE INDIA - E-TICKET
===========================================
Event:        ${ev.title}
City/Venue:   ${ev.city} - ${ev.venue}
Date/Time:    ${formatDate(ev.date)} at ${ev.time}
Ticket Qty:   ${booking.quantity}
Total Paid:   ${formatMoney(booking.totalAmount)}
Booking ID:   ${booking._id}
Status:       ${booking.status.toUpperCase()}
===========================================
Show this ticket at the venue entrance.
Have a great time! - Team TripShare India
===========================================`;
  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `TripShare_Ticket_${booking._id}.txt`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('Ticket downloaded.', 'success');
}

/* ---------------------------------------------------------
   Expense splitter
   --------------------------------------------------------- */
$('#expenseForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const body = {
    hotel: Number($('#expHotel').value) || 0,
    food: Number($('#expFood').value) || 0,
    transport: Number($('#expTransport').value) || 0,
    other: Number($('#expOther').value) || 0,
    people: Number($('#expPeople').value) || 1,
    note: $('#expNote').value.trim()
  };
  try {
    const { expense } = await api('/expenses', { method: 'POST', body });
    renderExpenseResult(expense);
    loadExpenseHistory();
    showToast('Expense split saved.', 'success');
  } catch (err) { showToast(err.message, 'error'); }
});

function renderExpenseResult(exp) {
  $('#expenseResult').innerHTML = `
    <div class="split-summary">
      <div class="row"><span>Hotel</span><span>${formatMoney(exp.hotel)}</span></div>
      <div class="row"><span>Food</span><span>${formatMoney(exp.food)}</span></div>
      <div class="row"><span>Transport</span><span>${formatMoney(exp.transport)}</span></div>
      <div class="row"><span>Other</span><span>${formatMoney(exp.other)}</span></div>
      <div class="row"><span>Number of people</span><span>${exp.people}</span></div>
      <div class="row total"><span>Total</span><span>${formatMoney(exp.total)}</span></div>
      <div class="row total"><span>Per person</span><span>${formatMoney(exp.perPerson)}</span></div>
    </div>`;
}

async function loadExpenseHistory() {
  try {
    const { expenses } = await api('/expenses/my');
    const wrap = $('#expenseHistory');
    wrap.innerHTML = expenses.map((exp) => `
      <div class="expense-history-card">
        <div>
          <strong>${exp.note || 'Trip split'}</strong>
          <div style="font-size:13px;color:var(--text-muted);">Total ${formatMoney(exp.total)} • Per person ${formatMoney(exp.perPerson)} • ${exp.people} people</div>
        </div>
        <button class="btn btn-outline" data-del-expense="${exp._id}"><i class="fa-solid fa-trash"></i> Delete</button>
      </div>`).join('');
    wrap.querySelectorAll('[data-del-expense]').forEach((btn) =>
      btn.addEventListener('click', () => askConfirm('Delete this split?', 'This will remove it from your expense history.', () => deleteExpense(btn.dataset.delExpense)))
    );
    $('#expenseEmptyState').classList.toggle('hidden', expenses.length > 0);
  } catch (err) { showToast(err.message, 'error'); }
}

async function deleteExpense(id) {
  try {
    await api(`/expenses/${id}`, { method: 'DELETE' });
    showToast('Expense split deleted.', 'success');
    loadExpenseHistory();
  } catch (err) { showToast(err.message, 'error'); }
}

/* ---------------------------------------------------------
   Travel match / connect
   --------------------------------------------------------- */
async function openMatchModal(eventId) {
  try {
    const { matches } = await api(`/users/match/${eventId}`);
    $('#matchList').innerHTML = matches.length
      ? matches.map((m) => `
        <div class="match-card">
          <span class="avatar-initials">${initials(m.fullName)}</span>
          <div class="info"><h4>${m.fullName}</h4><p>${m.city}${m.bio ? ' • ' + m.bio : ''}</p></div>
          <button class="btn btn-outline" data-connect="${m.userId}"><i class="fa-solid fa-paper-plane"></i> Connect</button>
        </div>`).join('')
      : '<p>No one else has booked this event yet. Be the first — check back soon!</p>';

    $('#matchList').querySelectorAll('[data-connect]').forEach((btn) =>
      btn.addEventListener('click', () => sendConnectRequest(btn.dataset.connect, eventId))
    );
    openModal('matchModal');
  } catch (err) { showToast(err.message, 'error'); }
}

async function sendConnectRequest(toUserId, eventId, tripId) {
  if (!state.user) { openModal('authModal'); return; }
  try {
    await api('/contact', { method: 'POST', body: { toUserId, eventId, tripId } });
    showToast('Connect request sent!', 'success');
  } catch (err) { showToast(err.message, 'error'); }
}

/* ---------------------------------------------------------
   Find Travel Buddy (route-based matching, independent of events)
   --------------------------------------------------------- */
$('#tripForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    await api('/trips', {
      method: 'POST',
      body: {
        fromCity: $('#tripFrom').value.trim(),
        toCity: $('#tripTo').value.trim(),
        travelDate: $('#tripDate').value,
        note: $('#tripNote').value.trim()
      }
    });
    showToast('Trip posted! Other travellers can now find you.', 'success');
    $('#tripForm').reset();
    loadMyTrips();
  } catch (err) { showToast(err.message, 'error'); }
});

$('#btnSearchTrips').addEventListener('click', async () => {
  const fromCity = $('#searchTripFrom').value.trim();
  const toCity = $('#searchTripTo').value.trim();
  const date = $('#searchTripDate').value;
  if (!fromCity || !toCity) return showToast('Enter both from and to city.', 'error');

  try {
    const params = new URLSearchParams({ fromCity, toCity });
    if (date) params.set('date', date);
    const { trips } = await api(`/trips/matches?${params.toString()}`);

    const list = $('#tripMatchList');
    list.innerHTML = trips.map((t) => `
      <div class="match-card">
        <span class="avatar-initials">${initials(t.user.fullName)}</span>
        <div class="info">
          <h4>${t.user.fullName}</h4>
          <p>${t.fromCity} → ${t.toCity} • ${formatDate(t.travelDate)}${t.user.city ? ' • from ' + t.user.city : ''}</p>
          ${t.note ? `<p style="margin-top:2px;">"${t.note}"</p>` : ''}
          ${t.event ? `<p style="margin-top:2px;color:var(--gold-soft);"><i class="fa-solid fa-ticket"></i> Also going to: ${t.event.title}</p>` : ''}
        </div>
        <button class="btn btn-outline" data-connect-trip="${t.user._id}" data-trip-id="${t._id}"><i class="fa-solid fa-paper-plane"></i> Connect</button>
      </div>`).join('');

    list.querySelectorAll('[data-connect-trip]').forEach((btn) =>
      btn.addEventListener('click', () => sendConnectRequest(btn.dataset.connectTrip, null, btn.dataset.tripId))
    );

    $('#tripMatchEmptyState').classList.toggle('hidden', trips.length > 0);
  } catch (err) { showToast(err.message, 'error'); }
});

async function loadMyTrips() {
  try {
    const { trips } = await api('/trips/my');
    const wrap = $('#myTripsList');
    wrap.innerHTML = trips.map((t) => `
      <div class="expense-history-card">
        <div>
          <strong>${t.fromCity} → ${t.toCity}</strong>
          <div style="font-size:13px;color:var(--text-muted);">${formatDate(t.travelDate)}${t.note ? ' • ' + t.note : ''}${t.event ? ' • linked to ' + t.event.title : ''}</div>
        </div>
        <button class="btn btn-outline" data-del-trip="${t._id}"><i class="fa-solid fa-trash"></i> Delete</button>
      </div>`).join('');

    wrap.querySelectorAll('[data-del-trip]').forEach((btn) =>
      btn.addEventListener('click', () => askConfirm('Remove this trip post?', 'Other travellers will no longer be able to find or connect for this trip.', () => deleteTrip(btn.dataset.delTrip)))
    );

    $('#myTripsEmptyState').classList.toggle('hidden', trips.length > 0);
  } catch (err) { showToast(err.message, 'error'); }
}

async function deleteTrip(id) {
  try {
    await api(`/trips/${id}`, { method: 'DELETE' });
    showToast('Trip post removed.', 'success');
    loadMyTrips();
  } catch (err) { showToast(err.message, 'error'); }
}

/* ---------------------------------------------------------
   Profile
   --------------------------------------------------------- */
function openProfileModal() {
  if (!state.user) { openModal('authModal'); return; }
  $('#profileAvatarBig').textContent = initials(state.user.fullName);
  $('#profileNameHeading').textContent = state.user.fullName;
  $('#profileEmailText').textContent = state.user.email;
  $('#pfName').value = state.user.fullName;
  $('#pfPhone').value = state.user.phone;
  $('#pfCity').value = state.user.city;
  $('#pfBio').value = state.user.bio || '';
  openModal('profileModal');
}

$('#profileForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    const data = await api('/users/profile', {
      method: 'PUT',
      body: { fullName: $('#pfName').value.trim(), phone: $('#pfPhone').value.trim(), city: $('#pfCity').value.trim(), bio: $('#pfBio').value.trim() }
    });
    state.user = data.user;
    updateAuthUI();
    closeModal('profileModal');
    showToast('Profile updated.', 'success');
  } catch (err) { showToast(err.message, 'error'); }
});

/* ---------------------------------------------------------
   Admin dashboard
   --------------------------------------------------------- */
$$('.admin-tab').forEach((tab) => tab.addEventListener('click', () => {
  $$('.admin-tab').forEach((t) => t.classList.toggle('active', t === tab));
  $$('.admin-panel').forEach((p) => p.classList.add('hidden'));
  $(`#adminPanel-${tab.dataset.adminTab}`).classList.remove('hidden');
}));

async function loadAdminData() {
  await loadAdminEvents();
  await loadAdminBookings();
  await loadAdminUsers();
}

async function loadAdminEvents() {
  try {
    const { events } = await api('/events');
    const tbody = $('#adminEventsTable tbody');
    tbody.innerHTML = events.map((ev) => `
      <tr>
        <td><img src="${imageUrl(ev.image)}" alt="${ev.title}"></td>
        <td>${ev.title}</td>
        <td>${ev.city}</td>
        <td>${formatDate(ev.date)}</td>
        <td>${ev.price === 0 ? 'Free' : formatMoney(ev.price)}</td>
        <td>${ev.availableSeats}/${ev.totalSeats}</td>
        <td class="table-actions">
          <button data-edit-event="${ev._id}"><i class="fa-solid fa-pen"></i></button>
          <button class="danger" data-del-event="${ev._id}"><i class="fa-solid fa-trash"></i></button>
        </td>
      </tr>`).join('');

    tbody.querySelectorAll('[data-edit-event]').forEach((btn) =>
      btn.addEventListener('click', () => openEventForm(events.find((e) => e._id === btn.dataset.editEvent)))
    );
    tbody.querySelectorAll('[data-del-event]').forEach((btn) =>
      btn.addEventListener('click', () => askConfirm('Delete this event?', 'This cannot be undone and will remove it for all users.', () => deleteAdminEvent(btn.dataset.delEvent)))
    );
  } catch (err) { showToast(err.message, 'error'); }
}

async function loadAdminBookings() {
  try {
    const { bookings } = await api('/bookings');
    $('#adminBookingsTable tbody').innerHTML = bookings.map((b) => `
      <tr>
        <td>${b.user?.fullName || '-'}</td>
        <td>${b.event?.title || '-'}</td>
        <td>${b.quantity}</td>
        <td>${formatMoney(b.totalAmount)}</td>
        <td><span class="status-pill ${b.status}">${b.status}</span></td>
        <td>${formatDate(b.bookingDate)}</td>
      </tr>`).join('');
  } catch (err) { /* silent: non-admins won't reach here */ }
}

async function loadAdminUsers() {
  try {
    const { users } = await api('/users');
    $('#adminUsersTable tbody').innerHTML = users.map((u) => `
      <tr><td>${u.fullName}</td><td>${u.email}</td><td>${u.phone}</td><td>${u.city}</td><td>${u.role}</td></tr>`).join('');
  } catch (err) { /* silent */ }
}

async function deleteAdminEvent(id) {
  try {
    await api(`/events/${id}`, { method: 'DELETE' });
    showToast('Event deleted.', 'success');
    loadAdminEvents();
  } catch (err) { showToast(err.message, 'error'); }
}

$('#btnAddEvent').addEventListener('click', () => openEventForm(null));

function openEventForm(ev) {
  $('#eventFormTitle').textContent = ev ? 'Edit event' : 'Add new event';
  $('#efId').value = ev ? ev._id : '';
  $('#efTitle').value = ev ? ev.title : '';
  $('#efDescription').value = ev ? ev.description : '';
  $('#efCity').value = ev ? ev.city : '';
  $('#efVenue').value = ev ? ev.venue : '';
  $('#efDate').value = ev ? new Date(ev.date).toISOString().slice(0, 10) : '';
  $('#efTime').value = ev ? ev.time : '';
  $('#efCategory').value = ev ? ev.category : 'Concerts';
  $('#efPrice').value = ev ? ev.price : 0;
  $('#efTotalSeats').value = ev ? ev.totalSeats : 100;
  $('#efRating').value = ev ? ev.rating : 4.5;
  $('#efOrganiser').value = ev ? ev.organiser : '';
  $('#efTags').value = ev && ev.tags ? ev.tags.join(', ') : '';
  $('#efImageUrl').value = ev && ev.image && ev.image.startsWith('http') ? ev.image : '';
  $('#efImageFile').value = '';
  openModal('eventFormModal');
}

$('#eventForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = $('#efId').value;
  const fileInput = $('#efImageFile');
  const useFile = fileInput.files && fileInput.files[0];

  try {
    let payload, options;
    if (useFile) {
      const fd = new FormData();
      fd.append('title', $('#efTitle').value.trim());
      fd.append('description', $('#efDescription').value.trim());
      fd.append('city', $('#efCity').value.trim());
      fd.append('venue', $('#efVenue').value.trim());
      fd.append('date', $('#efDate').value);
      fd.append('time', $('#efTime').value);
      fd.append('category', $('#efCategory').value);
      fd.append('price', $('#efPrice').value);
      fd.append('totalSeats', $('#efTotalSeats').value);
      if (!id) fd.append('availableSeats', $('#efTotalSeats').value);
      fd.append('rating', $('#efRating').value);
      fd.append('organiser', $('#efOrganiser').value.trim());
      fd.append('tags', $('#efTags').value.trim());
      fd.append('image', fileInput.files[0]);
      payload = fd; options = { isForm: true };
    } else {
      const body = {
        title: $('#efTitle').value.trim(),
        description: $('#efDescription').value.trim(),
        city: $('#efCity').value.trim(),
        venue: $('#efVenue').value.trim(),
        date: $('#efDate').value,
        time: $('#efTime').value,
        category: $('#efCategory').value,
        price: Number($('#efPrice').value),
        totalSeats: Number($('#efTotalSeats').value),
        rating: Number($('#efRating').value),
        organiser: $('#efOrganiser').value.trim(),
        tags: $('#efTags').value.trim(),
        image: $('#efImageUrl').value.trim() || 'https://images.unsplash.com/photo-1503220317375-aaad61436b1b?auto=format&fit=crop&w=800&q=80'
      };
      if (!id) body.availableSeats = body.totalSeats;
      payload = body; options = {};
    }

    if (id) {
      await api(`/events/${id}`, { method: 'PUT', body: payload, ...options });
      showToast('Event updated.', 'success');
    } else {
      await api('/events', { method: 'POST', body: payload, ...options });
      showToast('Event created.', 'success');
    }
    closeModal('eventFormModal');
    loadAdminEvents();
  } catch (err) { showToast(err.message, 'error'); }
});

/* ---------------------------------------------------------
   Loading screen, hamburger, scroll-to-top
   --------------------------------------------------------- */
window.addEventListener('load', () => {
  setTimeout(() => $('#loadingScreen').classList.add('fade-out'), 500);
});

$('#hamburger').addEventListener('click', () => $('#navLinks').classList.toggle('open'));

window.addEventListener('scroll', () => {
  $('#scrollTopBtn').classList.toggle('show', window.scrollY > 400);
});
$('#scrollTopBtn').addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

/* ---------------------------------------------------------
   Init
   --------------------------------------------------------- */
async function init() {
  await restoreSession();
  await loadFavouritesData();
  await renderHomeEvents();
  navigateTo('home');
}
init();
