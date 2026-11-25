const API_BASE = "https://ifix-solutions-backend-1.onrender.com/api";
const WHATSAPP_NUMBER = "601110093835";
const ITEMS_PER_PAGE = 8;

// The Google link, rating and number of reviews are set in the admin panel (Reviews tab > Google link and rating)
const REVIEWS_PER_PAGE = 6;

// Your social media pages. Paste each full link between the quotes (for example 'https://www.instagram.com/yourname').
// An item only shows in the footer once it has a link.
const SOCIAL_LINKS = { tiktok: 'https://www.tiktok.com/@ifixsolutionsn9', instagram: 'https://www.instagram.com/ifixsolutions_/', facebook: 'https://www.facebook.com/ifixsolutionsrasahjaya/' };
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

// The price a customer pays: the sale price while a sale is on (the server works it out), otherwise the normal price
const unitPrice = p => (p.sale_price !== null && p.sale_price !== undefined && p.sale_price !== '' && Number(p.sale_price) < Number(p.price)) ? Number(p.sale_price) : Number(p.price);
const onSale = p => unitPrice(p) < Number(p.price);
const saleEnds = p => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(p.sale_ends || ''); if (!m) return '';
  return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });
};
const priceHtml = (p, cls = 'product-price') => onSale(p)
  ? `<div class="price-block"><div class="price-row"><span class="${cls}">${money(unitPrice(p))}</span><s class="was-price">${money(p.price)}</s></div>${saleEnds(p) ? `<div class="sale-note">Sale ends ${saleEnds(p)}</div>` : ''}</div>`
  : `<span class="${cls}">${money(p.price)}</span>`;
const saleBadge = p => onSale(p) ? `<span class="sale-badge">-${esc(p.discount_percent)}%</span>` : '';
const SKELETONS = '<div class="skeleton"></div>'.repeat(4);

document.addEventListener('DOMContentLoaded', () => {
  loadProducts();
  loadPosters();
  loadReviews();
  setupFilters();
  setupCart();
  setupOrderForm();
  setupProductModal();
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
    if (allProducts.length) syncCartWithProducts();
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
  const sort = $('#sortSelect')?.value || 'default';
  if (sort === 'price-asc') filtered.sort((a, b) => unitPrice(a) - unitPrice(b));
  else if (sort === 'price-desc') filtered.sort((a, b) => unitPrice(b) - unitPrice(a));
  else if (sort === 'name') filtered.sort((a, b) => String(a.name).localeCompare(String(b.name)));
  renderProducts();
}

// Small "Brand New" / "Refurbished" tag on each product card
const condTag = p => {
  const c = String(p.condition_type || p.condition || '').trim();
  return c ? ` <span class="cond ${/refurb|second|used/i.test(c) ? 'cond-refurb' : 'cond-new'}">${esc(c)}</span>` : '';
};

// Specs saved in the admin panel (processor, RAM, storage and so on)
const SPEC_LABELS = [['processor', 'Processor'], ['ram', 'Memory (RAM)'], ['storage', 'Storage'], ['screen', 'Screen'], ['graphics', 'Graphics'], ['os', 'Operating system'], ['included', 'Included'], ['other', 'More details']];
const getSpecs = p => { let s = p.specs; if (typeof s === 'string') { try { s = JSON.parse(s); } catch (e) { s = null; } } return s && typeof s === 'object' && !Array.isArray(s) ? s : {}; };
const hasSpecs = p => SPEC_LABELS.some(([k]) => String(getSpecs(p)[k] ?? '').trim());

function stockInfo(p) {
  const stock = Number(p.stock_quantity);
  const known = !isNaN(stock) && p.stock_quantity !== null && p.stock_quantity !== '';
  const out = known && stock <= 0, lowClass = known && stock <= 3;
  return { out, lowClass, text: !known ? '' : out ? 'Currently unavailable' : stock <= 3 ? `Only ${stock} left` : `${stock} in stock` };
}

function productCard(p) {
  const st = stockInfo(p), has = hasSpecs(p);
  const open = has ? ` data-open="${esc(p.id)}"` : '';
  const img = p.image_url
    ? `<img src="${esc(p.image_url)}" alt="${esc(p.name)}" class="product-img"${open} loading="lazy">`
    : `<div class="product-img ph"${open}><i class="fa-solid fa-laptop"></i></div>`;
  return `<div class="product-card">${saleBadge(p)}${img}
    <div class="product-info">
      <h3 class="product-title"${open}>${esc(p.name)}</h3>
      <p class="product-specs">${esc(p.category)}${condTag(p)}</p>
      <div class="product-bottom">
        ${priceHtml(p)}
        <div class="product-actions${has ? ' two' : ''}">
          ${has ? `<button class="btn-specs" data-open="${esc(p.id)}">View specs</button>` : ''}
          <button class="btn-add-cart" data-id="${esc(p.id)}" ${st.out ? 'disabled' : ''}>${st.out ? 'Out of stock' : 'Add to cart'}</button>
        </div>
      </div>
      ${st.text ? `<div class="stock ${st.lowClass ? 'low' : ''}">${st.text}</div>` : ''}
    </div></div>`;
}

// The product popup: photo, price, every spec and Add to cart
function openProduct(id) {
  const p = allProducts.find(x => String(x.id) === String(id)), box = $('#productDetail'); if (!p || !box) return;
  const s = getSpecs(p), st = stockInfo(p);
  const rows = SPEC_LABELS.filter(([k]) => String(s[k] ?? '').trim()).map(([k, label]) => `<tr><th scope="row">${label}</th><td>${esc(s[k])}</td></tr>`).join('');
  box.innerHTML = `<div class="pd">
    <div class="pd-img">${saleBadge(p)}${p.image_url ? `<img src="${esc(p.image_url)}" alt="${esc(p.name)}">` : '<i class="fa-solid fa-laptop" aria-hidden="true"></i>'}</div>
    <div class="pd-body">
      <h2 id="pdTitle">${esc(p.name)}</h2>
      <p class="product-specs">${esc(p.category)}${condTag(p)}</p>
      ${priceHtml(p, 'pd-price')}
      ${rows ? `<table class="spec-table"><tbody>${rows}</tbody></table>` : ''}
      ${st.text ? `<div class="stock ${st.lowClass ? 'low' : ''}">${st.text}</div>` : ''}
      <button class="btn-add-cart pd-add" data-id="${esc(p.id)}" ${st.out ? 'disabled' : ''}>${st.out ? 'Out of stock' : 'Add to cart'}</button>
    </div></div>`;
  $('#productModal').style.display = 'flex'; document.body.style.overflow = 'hidden';
}
function setupProductModal() {
  const modal = $('#productModal'); if (!modal) return;
  const close = () => { modal.style.display = 'none'; const cart = $('#cartModal'); if (!cart || cart.style.display === 'none') document.body.style.overflow = ''; };
  $('#closeProductBtn').addEventListener('click', close);
  modal.addEventListener('click', e => { if (e.target === modal) close(); });
  addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
}

function renderProducts() {
  const grid = $('#productGrid'); if (!grid) return;
  const rc = $('#resultCount'); if (rc) rc.textContent = '';
  if (!filtered.length) {
    const condChosen = ($('#conditionFilter')?.value || 'all') !== 'all';
    const noCondYet = condChosen && !allProducts.some(p => p.condition_type || p.condition);
    grid.innerHTML = `<p class="grid-message">${noCondYet ? 'Condition details are still being added to our products. Please check back soon, or choose All Conditions.' : allProducts.length ? 'No products match your search. Try another keyword or clear the filters.' : 'No products available yet. Check back soon.'}</p>`;
    renderPagination(0); return;
  }
  const pages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  if (currentPage > pages) currentPage = 1;
  const start = (currentPage - 1) * ITEMS_PER_PAGE;
  const shown = filtered.slice(start, start + ITEMS_PER_PAGE);
  grid.innerHTML = shown.map(productCard).join('');
  if (rc) rc.textContent = filtered.length <= ITEMS_PER_PAGE ? `${filtered.length} product${filtered.length === 1 ? '' : 's'}` : `Showing ${start + 1}\u2013${start + shown.length} of ${filtered.length} product${filtered.length === 1 ? '' : 's'}`;
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
  ['#categoryFilter', '#conditionFilter', '#sortSelect'].forEach(s => $(s).addEventListener('change', () => applyFilters()));

  // Category cards on the home page pre-select the filter
  $$('[data-category]').forEach(c => c.addEventListener('click', () => {
    $('#categoryFilter').value = c.dataset.category; applyFilters();
  }));

  document.addEventListener('click', e => {
    const pg = e.target.closest('#paginationContainer button');
    if (pg && !pg.disabled) { currentPage = Number(pg.dataset.page); renderProducts(); goToCatalog(); }
    const add = e.target.closest('.btn-add-cart');
    if (add) return addToCart(add.dataset.id);
    const open = e.target.closest('[data-open]');
    if (open) openProduct(open.dataset.open);
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

// The cart is kept on the customer's device, so refresh its prices, names and stock from the latest product list.
// That way a sale that has started or ended is always reflected, and removed products leave the cart.
function syncCartWithProducts() {
  let gone = 0;
  cart = cart.filter(i => {
    const p = allProducts.find(x => String(x.id) === String(i.id));
    if (!p) { gone++; return false; }
    Object.assign(i, { name: p.name, price: p.price, sale_price: p.sale_price, discount_percent: p.discount_percent, sale_ends: p.sale_ends, stock_quantity: p.stock_quantity });
    const st = Number(p.stock_quantity);
    if (p.stock_quantity !== null && p.stock_quantity !== '' && !isNaN(st) && i.qty > st) i.qty = Math.max(st, 0);
    if (i.qty <= 0) { gone++; return false; }
    return true;
  });
  saveCart(); updateCart();
  if (gone) say('Some items in your cart are no longer available');
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
    const price = unitPrice(i) || 0; total += price * i.qty;
    return `<div class="cart-item">
      <div><strong>${esc(i.name)}</strong><br><small>${money(price)} each${onSale(i) ? ` <s>${money(i.price)}</s>` : ''} &middot; <b>${money(price * i.qty)}</b></small></div>
      <div class="qty">
        <button data-act="dec" data-id="${esc(i.id)}" aria-label="${i.qty === 1 ? 'Remove' : 'Decrease quantity'}">&minus;</button>
        <span>${i.qty}</span>
        <button data-act="inc" data-id="${esc(i.id)}" aria-label="Increase quantity">+</button>
      </div></div>`;
  }).join('') : '<p class="empty-cart">Your cart is empty. Add something from the catalog.</p>';
  totalEl.textContent = total.toFixed(2);
  const orderForm = $('#orderForm'); if (orderForm) orderForm.hidden = cart.length === 0;
}

function setupCart() {
  const modal = $('#cartModal');
  const setOpen = open => {
    if (open) { $('#cartView').hidden = false; $('#orderDone').hidden = true; }
    modal.style.display = open ? 'flex' : 'none'; document.body.style.overflow = open ? 'hidden' : '';
  };
  $('#openCartBtn').addEventListener('click', () => setOpen(true));
  $('#closeCartBtn').addEventListener('click', () => setOpen(false));
  modal.addEventListener('click', e => { if (e.target === modal) setOpen(false); });
  addEventListener('keydown', e => { if (e.key === 'Escape') setOpen(false); });

  $('#cartItemsList').addEventListener('click', e => {
    const b = e.target.closest('button[data-act]'); if (!b) return;
    changeQty(b.dataset.id, b.dataset.act === 'inc' ? 1 : -1);
  });
}

/* ---------- Posters: wide promotion banners (managed in the admin panel > Posters) ---------- */
async function loadPosters() {
  const section = $('#promo'), box = $('#promoSlider'); if (!section || !box) return;
  let list = [];
  try { const res = await fetch(`${API_BASE}/posters`); if (res.ok) { const json = await res.json(); list = Array.isArray(json.data) ? json.data : []; } }
  catch (err) { return; }
  if (!list.length) return;
  box.innerHTML = list.map((p, i) => {
    const link = String(p.link_url || ''), anchor = /^#[A-Za-z][\w-]*$/.test(link), web = /^https:\/\/\S+$/.test(link);
    const img = `<img src="${API_BASE}/posters/${esc(p.id)}/image?v=${esc(p.v)}" alt="${esc(p.title || 'Promotion')}"${i ? ' loading="lazy"' : ''} decoding="async">`;
    return `<div class="promo-slide${i ? '' : ' active'}" role="group" aria-roledescription="slide" aria-label="${i + 1} of ${list.length}">${anchor || web ? `<a href="${esc(link)}"${web ? ' target="_blank" rel="noopener"' : ''}>${img}</a>` : img}</div>`;
  }).join('') + (list.length > 1
    ? `<button class="promo-nav prev" aria-label="Previous poster">&#10094;</button><button class="promo-nav next" aria-label="Next poster">&#10095;</button><div class="promo-dots">${list.map((_, i) => `<button class="${i ? '' : 'active'}" data-dot="${i}" aria-label="Poster ${i + 1}"></button>`).join('')}</div>`
    : '');
  section.hidden = false;
  if (list.length < 2) return;
  const slides = $$('.promo-slide', box), dots = $$('[data-dot]', box); let cur = 0, timer = null;
  const show = n => { cur = (n + slides.length) % slides.length; slides.forEach((s, i) => s.classList.toggle('active', i === cur)); dots.forEach((d, i) => d.classList.toggle('active', i === cur)); };
  const stop = () => clearInterval(timer);
  const play = () => { stop(); if (!matchMedia('(prefers-reduced-motion: reduce)').matches) timer = setInterval(() => show(cur + 1), 6000); };
  box.addEventListener('click', e => { const n = e.target.closest('.promo-nav'), d = e.target.closest('[data-dot]'); if (n) show(cur + (n.classList.contains('next') ? 1 : -1)); else if (d) show(Number(d.dataset.dot)); });
  box.addEventListener('mouseenter', stop); box.addEventListener('mouseleave', play); box.addEventListener('focusin', stop); box.addEventListener('focusout', play);
  play();
}

/* ---------- Placing an order (saved for the staff, then continues on WhatsApp) ---------- */
function setupOrderForm() {
  const form = $('#orderForm'); if (!form) return;
  const msg = $('#orderMsg'), btn = $('#orderBtn');
  // Remember the customer's name and phone on their own device, so they do not type them again
  const fillSaved = () => { try { const s = JSON.parse(localStorage.getItem('ifix_customer')); if (s) { $('#orderName').value = s.name || ''; $('#orderPhone').value = s.phone || ''; } } catch (e) { /* ignore */ } };
  fillSaved();

  form.addEventListener('submit', async e => {
    e.preventDefault();
    if (!cart.length) return say('Your cart is empty');
    const name = $('#orderName').value.trim(), phone = $('#orderPhone').value.trim(), note = $('#orderNote').value.trim();
    msg.className = ''; msg.textContent = '';
    if (!name || !phone) { msg.className = 'err'; msg.textContent = 'Please enter your name and phone number.'; return; }
    const label = btn.textContent; btn.disabled = true; btn.textContent = 'Placing your order...';
    try {
      // Only product ids and quantities are sent. The server works out the names, prices and total itself.
      const res = await fetch(`${API_BASE}/orders`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, phone, note, items: cart.map(i => ({ id: i.id, qty: i.qty })) })
      });
      const result = await res.json().catch(() => ({}));
      if (!result.success) { msg.className = 'err'; msg.textContent = result.error || 'We could not place your order. Please try again, or message us on WhatsApp.'; return; }
      const o = result.data;
      try { localStorage.setItem('ifix_customer', JSON.stringify({ name, phone })); } catch (err) { /* ignore */ }
      const lines = o.items.map(i => `- ${i.name} x${i.qty} (${money(i.price * i.qty)})`);
      const text = `Hi I FIX SOLUTIONS, I just placed order #${o.id} on your website.\nName: ${name}\n${lines.join('\n')}\nTotal: ${money(o.total)}${note ? `\nNote: ${note}` : ''}`;
      $('#orderNumber').textContent = '#' + o.id;
      $('#orderWaBtn').href = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;
      cart = []; saveCart(); updateCart(); form.reset(); fillSaved();
      $('#cartView').hidden = true; $('#orderDone').hidden = false;
    } catch (err) {
      console.error(err); msg.className = 'err'; msg.textContent = 'Could not reach the server. It may be waking up, please try again in a moment.';
    } finally { btn.disabled = false; btn.textContent = label; }
  });
  $('#orderCloseBtn').addEventListener('click', () => { $('#cartModal').style.display = 'none'; document.body.style.overflow = ''; });
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