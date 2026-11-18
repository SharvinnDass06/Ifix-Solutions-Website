const API_BASE = "https://ifix-solutions-backend-1.onrender.com/api";
const WHATSAPP_NUMBER = "60123456789";
const ITEMS_PER_PAGE = 8;

// The Google link, rating and number of reviews are set in the admin panel (Reviews tab > Google link and rating)
const REVIEWS_PER_PAGE = 6;

// Your social media pages. Paste each full link between the quotes (for example 'https://www.instagram.com/yourname').
// An item only shows in the footer once it has a link.
const SOCIAL_LINKS = { tiktok: '', instagram: '', facebook: '' };
const SOCIAL_HOSTS = { tiktok: ['tiktok.com'], instagram: ['instagram.com', 'instagr.am'], facebook: ['facebook.com', 'fb.com', 'fb.me'] };
const safeSocialUrl = (kind, v) => {
  try { const u = new URL(v); const h = u.hostname.toLowerCase(); return u.protocol === 'https:' && SOCIAL_HOSTS[kind].some(d => h === d || h.endsWith('.' + d)) ? u.href : ''; }
  catch (e) { return ''; }
};

let allProducts = [], filtered = [], currentPage = 1;
let allReviews = [], reviewsShown = 0;
let cart = [];
try { cart = JSON.parse(localStorage.getItem('ifix_cart')) || []; } catch (e) { cart = []; }

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const money = n => 'RM ' + (parseFloat(n) || 0).toFixed(2);
const SKELETONS = '<div class="skeleton"></div>'.repeat(4);

document.addEventListener('DOMContentLoaded', () => {
  loadProducts();
  loadReviews();
  setupFilters();
  setupCart();
  setupRepairForm();
  setupPageUI();
  setupFooter();
  updateCart();
});

/* ---------- Toast ---------- */
let toastTimer;
function say(msg) {
  const t = $('#toast'); if (!t) return;
  t.textContent = msg; t.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 2400);
}

/* ---------- Products ---------- */
async function loadProducts() {
  const grid = $('#productGrid'); if (!grid) return;
  // Free hosting can take a while to wake up, so tell people why it is slow
  const slow = setTimeout(() => grid.insertAdjacentHTML('beforeend',
    '<p class="grid-message">Connecting to the store server. The first load can take up to a minute.</p>'), 5000);
  try {
    const res = await fetch(`${API_BASE}/products`);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const json = await res.json();
    const list = json.data || json;
    allProducts = Array.isArray(list) ? list : [];
    applyFilters();
  } catch (err) {
    console.error('Error loading products:', err);
    grid.innerHTML = '<div class="grid-message">We could not load the products.<br><button class="btn btn-primary" id="retryBtn">Try again</button></div>';
    $('#retryBtn').onclick = () => { grid.innerHTML = SKELETONS; loadProducts(); };
  } finally { clearTimeout(slow); }
}

function applyFilters(resetPage = true) {
  if (resetPage) currentPage = 1;
  const q = ($('#catalogSearch')?.value || '').toLowerCase().trim();
  const cat = ($('#categoryFilter')?.value || 'all').toLowerCase();
  const cond = ($('#conditionFilter')?.value || 'all').toLowerCase();
  const condOn = cond !== 'all';

  filtered = allProducts.filter(p => {
    const name = (p.name || '').toLowerCase(), pc = (p.category || '').toLowerCase();
    const pcond = String(p.condition || p.condition_type || '').toLowerCase();
    return (name.includes(q) || pc.includes(q))
      && (cat === 'all' || pc === cat)
      && (!condOn || pcond.includes(cond.split(/[ /-]/)[0]));
  });
  renderProducts();
}

// Small "Brand New" / "Refurbished" tag on each product card
const condTag = p => {
  const c = String(p.condition_type || p.condition || '').trim();
  return c ? ` <span class="cond ${/refurb|second|used/i.test(c) ? 'cond-refurb' : 'cond-new'}">${esc(c)}</span>` : '';
};

function productCard(p) {
  const stock = Number(p.stock_quantity);
  const known = !isNaN(stock) && p.stock_quantity !== null && p.stock_quantity !== '';
  const out = known && stock <= 0;
  const stockText = !known ? '' : out ? 'Currently unavailable' : stock <= 3 ? `Only ${stock} left` : `${stock} in stock`;
  const img = p.image_url
    ? `<img src="${esc(p.image_url)}" alt="${esc(p.name)}" class="product-img" loading="lazy">`
    : '<div class="product-img ph"><i class="fa-solid fa-laptop"></i></div>';
  return `<div class="product-card">${img}
    <div class="product-info">
      <h3 class="product-title">${esc(p.name)}</h3>
      <p class="product-specs">${esc(p.category)}${condTag(p)}</p>
      <div class="product-bottom">
        <span class="product-price">${money(p.price)}</span>
        <button class="btn-add-cart" data-id="${esc(p.id)}" ${out ? 'disabled' : ''}>${out ? 'Out of stock' : 'Add to cart'}</button>
      </div>
      ${stockText ? `<div class="stock ${known && stock <= 3 ? 'low' : ''}">${stockText}</div>` : ''}
    </div></div>`;
}

function renderProducts() {
  const grid = $('#productGrid'); if (!grid) return;
  if (!filtered.length) {
    const condChosen = ($('#conditionFilter')?.value || 'all') !== 'all';
    const noCondYet = condChosen && !allProducts.some(p => p.condition_type || p.condition);
    grid.innerHTML = `<p class="grid-message">${noCondYet ? 'Condition details are still being added to our products. Please check back soon, or choose All Conditions.' : allProducts.length ? 'No products match your search. Try another keyword or clear the filters.' : 'No products available yet. Check back soon.'}</p>`;
    renderPagination(0); return;
  }
  const pages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  if (currentPage > pages) currentPage = 1;
  const start = (currentPage - 1) * ITEMS_PER_PAGE;
  grid.innerHTML = filtered.slice(start, start + ITEMS_PER_PAGE).map(productCard).join('');
  renderPagination(pages);
}

function renderPagination(pages) {
  let el = $('#paginationContainer');
  if (!el) { el = document.createElement('div'); el.id = 'paginationContainer'; el.className = 'pagination'; $('#productGrid').after(el); }
  if (pages <= 1) { el.innerHTML = ''; return; }
  const btn = (label, page, cls = '', off = false) =>
    `<button data-page="${page}" class="${cls}" ${off ? 'disabled' : ''} ${cls === 'current' ? 'aria-current="page"' : ''}>${label}</button>`;
  let html = btn('Previous', currentPage - 1, '', currentPage === 1);
  for (let i = 1; i <= pages; i++) html += btn(i, i, i === currentPage ? 'current' : '');
  el.innerHTML = html + btn('Next', currentPage + 1, '', currentPage === pages);
}

function setupFilters() {
  const header = $('#headerSearch'), catalog = $('#catalogSearch');
  const goToCatalog = () => $('#products').scrollIntoView({ behavior: 'smooth' });

  header.addEventListener('input', () => { catalog.value = header.value; applyFilters(); });
  catalog.addEventListener('input', () => { header.value = catalog.value; applyFilters(); });
  header.addEventListener('keydown', e => { if (e.key === 'Enter') goToCatalog(); });
  $('.search-btn').addEventListener('click', goToCatalog);
  ['#categoryFilter', '#conditionFilter'].forEach(s => $(s).addEventListener('change', () => applyFilters()));

  // Category cards on the home page pre-select the filter
  $$('[data-category]').forEach(c => c.addEventListener('click', () => {
    $('#categoryFilter').value = c.dataset.category; applyFilters();
  }));

  document.addEventListener('click', e => {
    const pg = e.target.closest('#paginationContainer button');
    if (pg && !pg.disabled) { currentPage = Number(pg.dataset.page); renderProducts(); goToCatalog(); }
    const add = e.target.closest('.btn-add-cart');
    if (add) addToCart(add.dataset.id);
  });
}

/* ---------- Cart ---------- */
function saveCart() { try { localStorage.setItem('ifix_cart', JSON.stringify(cart)); } catch (e) { /* storage unavailable */ } }

function addToCart(id) {
  const p = allProducts.find(x => String(x.id) === String(id)); if (!p) return;
  const item = cart.find(i => String(i.id) === String(id));
  const max = Number(p.stock_quantity);
  if (item && !isNaN(max) && item.qty >= max) return say(`Only ${max} in stock`);
  item ? item.qty++ : cart.push({ ...p, qty: 1 });
  saveCart(); updateCart(); say(`${p.name} added to cart`);
}

function changeQty(id, delta) {
  const item = cart.find(i => String(i.id) === String(id)); if (!item) return;
  const max = Number(item.stock_quantity);
  if (delta > 0 && !isNaN(max) && item.qty >= max) return say(`Only ${max} in stock`);
  item.qty += delta;
  if (item.qty <= 0) cart = cart.filter(i => i !== item);
  saveCart(); updateCart();
}

function updateCart() {
  const count = cart.reduce((s, i) => s + i.qty, 0);
  const badge = $('#cartCount');
  if (badge && badge.textContent !== String(count)) {
    badge.textContent = count;
    badge.classList.remove('bump'); void badge.offsetWidth; badge.classList.add('bump');
  }
  const list = $('#cartItemsList'), totalEl = $('#cartTotalPrice');
  if (!list || !totalEl) return;
  let total = 0;
  list.innerHTML = cart.length ? cart.map(i => {
    const price = parseFloat(i.price) || 0; total += price * i.qty;
    return `<div class="cart-item">
      <div><strong>${esc(i.name)}</strong><br><small>${money(price)} each &middot; <b>${money(price * i.qty)}</b></small></div>
      <div class="qty">
        <button data-act="dec" data-id="${esc(i.id)}" aria-label="${i.qty === 1 ? 'Remove' : 'Decrease quantity'}">&minus;</button>
        <span>${i.qty}</span>
        <button data-act="inc" data-id="${esc(i.id)}" aria-label="Increase quantity">+</button>
      </div></div>`;
  }).join('') : '<p class="empty-cart">Your cart is empty. Add something from the catalog.</p>';
  totalEl.textContent = total.toFixed(2);
}

function setupCart() {
  const modal = $('#cartModal');
  const setOpen = open => { modal.style.display = open ? 'flex' : 'none'; document.body.style.overflow = open ? 'hidden' : ''; };
  $('#openCartBtn').addEventListener('click', () => setOpen(true));
  $('#closeCartBtn').addEventListener('click', () => setOpen(false));
  modal.addEventListener('click', e => { if (e.target === modal) setOpen(false); });
  addEventListener('keydown', e => { if (e.key === 'Escape') setOpen(false); });

  $('#cartItemsList').addEventListener('click', e => {
    const b = e.target.closest('button[data-act]'); if (!b) return;
    changeQty(b.dataset.id, b.dataset.act === 'inc' ? 1 : -1);
  });

  $('.checkout-btn').addEventListener('click', () => {
    if (!cart.length) return say('Your cart is empty');
    const total = cart.reduce((s, i) => s + (parseFloat(i.price) || 0) * i.qty, 0);
    const lines = cart.map(i => `- ${i.name} x${i.qty} (${money((parseFloat(i.price) || 0) * i.qty)})`);
    const text = `Hi I FIX SOLUTIONS, I would like to order:\n${lines.join('\n')}\nTotal: ${money(total)}`;
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`, '_blank', 'noopener');
  });
}

/* ---------- Repair booking ---------- */
function setupRepairForm() {
  const form = $('#repairBookingForm'); if (!form) return;
  const msg = $('#repairMsg'), btn = $('button[type="submit"]', form);

  form.addEventListener('submit', async e => {
    e.preventDefault();
    const data = {
      full_name: $('#repairName').value.trim(),
      phone: $('#repairPhone').value.trim(),
      device_model: $('#repairDevice').value.trim(),
      requested_service: $('#repairServiceType').value,
      issue_description: $('#repairIssue').value.trim()
    };
    const label = btn.textContent;
    btn.disabled = true; btn.classList.add('loading'); btn.textContent = 'Submitting...';
    msg.className = ''; msg.textContent = '';
    try {
      const res = await fetch(`${API_BASE}/repairs`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data)
      });
      const result = await res.json().catch(() => ({}));
      if (result.success) {
        msg.className = 'ok'; msg.textContent = 'Booking received. We will contact you on WhatsApp soon.';
        form.reset(); say('Repair booking submitted');
      } else {
        msg.className = 'err'; msg.textContent = result.error || 'Something went wrong. Please check your details and try again.';
      }
    } catch (err) {
      console.error(err);
      msg.className = 'err'; msg.textContent = 'Could not reach the server. Check your connection and try again.';
    } finally {
      btn.disabled = false; btn.classList.remove('loading'); btn.textContent = label;
    }
  });

  // Hero chips and problem cards pre-select the requested service
  const sel = $('#repairServiceType');
  const sync = () => $$('.problem').forEach(b => b.classList.toggle('selected', b.dataset.service === sel.value));
  $$('.chip, .problem').forEach(el => el.addEventListener('click', () => {
    sel.value = el.dataset.service; sync();
    sel.classList.remove('flash'); void sel.offsetWidth; sel.classList.add('flash');
    if (el.classList.contains('chip')) $('#services').scrollIntoView({ behavior: 'smooth' });
    else if (innerWidth <= 960) $('.repair-card').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }));
  sel.addEventListener('change', sync);
  form.addEventListener('reset', () => setTimeout(sync));
}

/* ---------- Page UI: header, menu, scrollspy, slider ---------- */
function setupPageUI() {
  // Footer reuses the header logo, so there is only one copy of the image in the page
  const hl = $('.logo img');
  if (hl) $$('img[data-logo]').forEach(i => { i.src = hl.src; });

  const header = $('header');
  const onScroll = () => header.classList.toggle('scrolled', scrollY > (header.classList.contains('scrolled') ? 4 : 16));
  addEventListener('scroll', onScroll, { passive: true }); onScroll();

  const toggle = $('#menuToggle'), nav = $('#mainNav');
  const setMenu = open => {
    nav.classList.toggle('open', open);
    toggle.setAttribute('aria-expanded', open);
    toggle.firstElementChild.className = open ? 'fa-solid fa-xmark' : 'fa-solid fa-bars';
  };
  toggle.addEventListener('click', () => setMenu(!nav.classList.contains('open')));
  $$('#mainNav a').forEach(a => a.addEventListener('click', () => setMenu(false)));

  const links = $$('#mainNav ul a');
  const spy = new IntersectionObserver(entries => entries.forEach(e => {
    if (e.isIntersecting) links.forEach(l => l.classList.toggle('active', l.getAttribute('href') === '#' + e.target.id));
  }), { rootMargin: '-40% 0px -55% 0px' });
  links.forEach(l => { const t = $(l.getAttribute('href')); if (t) spy.observe(t); });

}

/* ---------- Customer reviews (added by staff in the admin panel) ---------- */
const AVATAR_COLORS = ['#8e44ad', '#2980b9', '#27ae60', '#d35400', '#16a085', '#c0392b', '#2c3e50', '#e67e22'];
const avatarColor = n => AVATAR_COLORS[[...String(n)].reduce((s, c) => s + c.charCodeAt(0), 0) % AVATAR_COLORS.length];

// "2 months ago" - same style as Google, and it stays correct as time passes
function timeAgo(dateStr) {
  const d = new Date(dateStr); if (isNaN(d)) return '';
  const days = Math.floor((Date.now() - d) / 86400000);
  if (days < 1) return 'Today';
  if (days < 7) return days === 1 ? 'a day ago' : `${days} days ago`;
  if (days < 30) { const w = Math.floor(days / 7); return w === 1 ? 'a week ago' : `${w} weeks ago`; }
  if (days < 365) { const m = Math.floor(days / 30); return m === 1 ? 'a month ago' : `${m} months ago`; }
  const y = Math.floor(days / 365); return y === 1 ? 'a year ago' : `${y} years ago`;
}

const isPhoto = v => typeof v === 'string' && /^data:image\/(jpeg|png|webp);base64,/.test(v);
const GOOGLE_HOSTS = ['google.com', 'google.com.my', 'g.page', 'g.co', 'goo.gl', 'share.google'];
// Only real Google links are ever used for the button
const safeGoogleUrl = v => {
  try { const u = new URL(v); const h = u.hostname.toLowerCase(); return u.protocol === 'https:' && GOOGLE_HOSTS.some(d => h === d || h.endsWith('.' + d)) ? u.href : ''; }
  catch (e) { return ''; }
};
async function loadGoogleSettings() {
  try { const res = await fetch(`${API_BASE}/settings`); if (!res.ok) return {}; const json = await res.json(); return json.data || {}; }
  catch (err) { return {}; }
}

function reviewCard(r) {
  const name = String(r.reviewer_name).trim();
  const n = Math.max(1, Math.min(5, Math.round(Number(r.rating)) || 5));
  const date = timeAgo(r.review_date);
  return `<article class="review-card fade-in"><i class="fa-brands fa-google g" aria-hidden="true"></i>
    <div class="avatar-letter" style="background:${avatarColor(name)}">${esc(name.charAt(0).toUpperCase())}${isPhoto(r.photo_url) ? `<img src="${esc(r.photo_url)}" alt="" onerror="this.remove()">` : ''}</div>
    <h4>${esc(name)}</h4>
    <div class="stars" aria-label="${n} out of 5 stars">${'★'.repeat(n)}${'☆'.repeat(5 - n)}</div>
    ${date ? `<span class="review-date">${date}</span>` : ''}
    <p class="review-text">${esc(r.review_text)}</p>
    <button class="read-more" hidden>Read more</button></article>`;
}

function showMoreReviews() {
  const grid = $('#reviewsGrid');
  const next = allReviews.slice(reviewsShown, reviewsShown + REVIEWS_PER_PAGE);
  grid.insertAdjacentHTML('beforeend', next.map(reviewCard).join(''));
  reviewsShown += next.length;
  // Only offer "Read more" on reviews that are actually cut off
  $$('.review-card', grid).forEach(c => {
    const t = $('.review-text', c);
    if (t.scrollHeight > t.clientHeight + 1) $('.read-more', c).hidden = false;
  });
  $('#loadMoreReviews').hidden = reviewsShown >= allReviews.length;
}

async function loadReviews() {
  const grid = $('#reviewsGrid'); if (!grid) return;
  try {
    const res = await fetch(`${API_BASE}/reviews`);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const json = await res.json(); const list = json.data || json;
    allReviews = (Array.isArray(list) ? list : [])
      .filter(r => r.is_visible !== false && r.reviewer_name && r.review_text)
      .sort((a, b) => new Date(b.review_date || 0) - new Date(a.review_date || 0));
  } catch (err) { allReviews = []; }

  // Google link, rating and review count come from the admin panel (Reviews tab > Google link and rating)
  const g = await loadGoogleSettings();
  const rating = Number(g.google_rating), count = Number(g.google_review_count), reviewUrl = safeGoogleUrl(g.google_review_url);
  if (rating > 0 && count > 0) {
    const pct = Math.max(0, Math.min(100, rating / 5 * 100)) + '%';  // 4.4 stars fills 88% of the stars
    $('#heroRating').textContent = `${rating} on Google`;
    $('#heroStars').style.setProperty('--pct', pct);
    $('#heroBadge').hidden = false;
  }
  const gbtn = $('#googleReviewBtn');
  if (reviewUrl) { gbtn.href = reviewUrl; gbtn.hidden = false; }

  if (!allReviews.length) {
    grid.innerHTML = `<div class="reviews-empty"><i class="fa-brands fa-google"></i><p>Our customer reviews will appear here soon.${reviewUrl ? ' Used our service? We would love to hear from you.' : ''}</p></div>`;
    return;
  }
  showMoreReviews();
  $('#loadMoreReviews').addEventListener('click', showMoreReviews);
  grid.addEventListener('click', e => {
    const b = e.target.closest('.read-more'); if (!b) return;
    const open = b.closest('.review-card').classList.toggle('open');
    b.textContent = open ? 'Show less' : 'Read more';
  });
}

/* ---------- Footer: WhatsApp number in one place, and social links ---------- */
function setupFooter() {
  // Every WhatsApp link on the page uses WHATSAPP_NUMBER (set at the top of this file)
  $$('a[href*="wa.me/"]').forEach(a => { a.href = a.href.replace(/wa\.me\/\d*/, 'wa.me/' + WHATSAPP_NUMBER); });
  let any = false;
  $$('[data-social]').forEach(li => {
    const url = safeSocialUrl(li.dataset.social, SOCIAL_LINKS[li.dataset.social]);
    if (url) { $('a', li).href = url; li.hidden = false; any = true; }
  });
  const col = $('#followCol'); if (col) col.hidden = !any;
}