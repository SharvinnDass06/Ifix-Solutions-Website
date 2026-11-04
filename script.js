const API_URL = "https://ifix-solutions-backend-1.onrender.com/api/products";

let allProducts = [];
let cart = [];

document.addEventListener('DOMContentLoaded', () => {
  loadStoreProducts();
  setupEventListeners();
  setupRepairForm();
});

async function loadStoreProducts() {
  const container = document.getElementById("productGrid");
  if (!container) return;

  try {
    const response = await fetch(API_URL);
    const jsonResult = await response.json();
    allProducts = jsonResult.data || jsonResult || [];
    renderProducts(allProducts);
  } catch (error) {
    console.error("Error loading products:", error);
    container.innerHTML = `<p style="grid-column: 1/-1; text-align: center; color: var(--text-muted);">Unable to load products from server.</p>`;
  }
}

function renderProducts(productsToRender) {
  const container = document.getElementById("productGrid");
  if (!container) return;

  container.innerHTML = "";

  if (productsToRender.length === 0) {
    container.innerHTML = `<p style="grid-column: 1/-1; text-align: center; color: var(--text-muted);">No products found in database.</p>`;
    return;
  }

  productsToRender.forEach(product => {
    const card = document.createElement("div");
    card.className = "product-card";

    let imageHTML = "";
    if (product.image_url) {
      imageHTML = `<img src="${product.image_url}" alt="${product.name}" class="product-img">`;
    }

    card.innerHTML = `
      ${imageHTML}
      <div class="product-info">
        <h3 class="product-title">${product.name}</h3>
        <p class="product-specs">Category: ${product.category}</p>
        <div class="product-bottom">
          <span class="product-price">RM ${parseFloat(product.price).toFixed(2)}</span>
          <button class="btn-add-cart" onclick="addToCart(${product.id})">Add to Cart</button>
        </div>
        <div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 0.4rem;">Stock: ${product.stock_quantity}</div>
      </div>
    `;
    container.appendChild(card);
  });
}

function setupEventListeners() {
  const searchInput = document.querySelector('.search-input');
  const categorySelect = document.querySelector('select');

  function filterAndRender() {
    const searchTerm = searchInput ? searchInput.value.toLowerCase().trim() : "";
    const selectedCategory = categorySelect ? categorySelect.value.trim() : "ALL";

    const filtered = allProducts.filter(product => {
      const matchesSearch = product.name.toLowerCase().includes(searchTerm) || 
                            product.category.toLowerCase().includes(searchTerm);
      
      // Case-insensitive category match
      const matchesCategory = selectedCategory === "ALL" || 
                              selectedCategory === "All Categories" || 
                              product.category.toLowerCase() === selectedCategory.toLowerCase();

      return matchesSearch && matchesCategory;
    });

    renderProducts(filtered);
  }

  if (searchInput) searchInput.addEventListener("input", filterAndRender);
  if (categorySelect) categorySelect.addEventListener("change", filterAndRender);

  // Cart modal events
  const cartModal = document.getElementById('cartModal');
  const openCartBtn = document.getElementById('openCartBtn');
  const closeCartBtn = document.getElementById('closeCartBtn');

  if (openCartBtn && cartModal) {
    openCartBtn.addEventListener('click', () => cartModal.style.display = 'flex');
  }
  if (closeCartBtn && cartModal) {
    closeCartBtn.addEventListener('click', () => cartModal.style.display = 'none');
  }
  window.addEventListener('click', (e) => {
    if (e.target === cartModal) cartModal.style.display = 'none';
  });
}

window.addToCart = function(productId) {
  const product = allProducts.find(p => p.id === productId);
  if (!product) return;

  const existing = cart.find(item => item.id === productId);
  if (existing) {
    existing.qty += 1;
  } else {
    cart.push({ ...product, qty: 1 });
  }

  updateCartUI();
  alert(`Added ${product.name} to cart!`);
};

function updateCartUI() {
  const cartCount = document.getElementById('cartCount');
  const cartItemsContainer = document.getElementById('cartItemsContainer');
  const cartTotal = document.getElementById('cartTotal');

  if (cartCount) {
    cartCount.textContent = cart.reduce((sum, i) => sum + i.qty, 0);
  }

  if (cartItemsContainer && cartTotal) {
    cartItemsContainer.innerHTML = '';
    let total = 0;

    if (cart.length === 0) {
      cartItemsContainer.innerHTML = '<p style="text-align: center; color: var(--text-muted); padding: 1rem;">Your shopping cart is empty.</p>';
    } else {
      cart.forEach(item => {
        const itemPrice = parseFloat(item.price);
        total += itemPrice * item.qty;
        const div = document.createElement('div');
        div.className = 'cart-item';
        div.innerHTML = `
          <div>
            <strong>${item.name}</strong><br>
            <small style="color: var(--text-muted);">RM ${itemPrice.toFixed(2)} × ${item.qty}</small>
          </div>
          <div><strong>RM ${(itemPrice * item.qty).toFixed(2)}</strong></div>
        `;
        cartItemsContainer.appendChild(div);
      });
    }
    cartTotal.textContent = total.toFixed(2);
  }
}

function setupRepairForm() {
  const serviceBookingForm = document.getElementById('serviceBookingForm');
  if (serviceBookingForm) {
      serviceBookingForm.addEventListener('submit', async (e) => {
          e.preventDefault();
          
          const formData = {
              full_name: serviceBookingForm.querySelector('input[placeholder="John Doe"]').value,
              phone: serviceBookingForm.querySelector('input[type="tel"]').value,
              device_model: serviceBookingForm.querySelector('input[placeholder*="Asus"]').value,
              requested_service: serviceBookingForm.querySelector('select').value,
              issue_description: serviceBookingForm.querySelector('textarea').value
          };

          try {
              const response = await fetch('https://ifix-solutions-backend-1.onrender.com/api/repairs', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(formData)
              });
              
              const result = await response.json();
              if (result.success) {
                  alert('Repair booking submitted successfully!');
                  serviceBookingForm.reset();
              } else {
                  alert('Failed to submit booking: ' + (result.error || 'Unknown error'));
              }
          } catch (err) {
              console.error(err);
              alert('Server connection error.');
          }
      });
  }
}