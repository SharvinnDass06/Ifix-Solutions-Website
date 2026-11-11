const API_URL = "https://ifix-solutions-backend-1.onrender.com/api/products";

let allProducts = [];
let currentPage = 1;
const itemsPerPage = 8; // Change this number if you want more or fewer products per page

// Load saved cart from browser storage if it exists, otherwise start empty
let cart = JSON.parse(localStorage.getItem('ifix_cart')) || [];

document.addEventListener('DOMContentLoaded', () => {
  loadStoreProducts();
  setupEventListeners();
  setupRepairForm();
  updateCartUI(); // Render the saved cart right when the page loads
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
    const existingPagination = document.getElementById("paginationContainer");
    if (existingPagination) existingPagination.innerHTML = "";
    return;
  }

  // --- Pagination Logic ---
  const totalPages = Math.ceil(productsToRender.length / itemsPerPage);
  if (currentPage > totalPages) currentPage = 1;

  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedItems = productsToRender.slice(startIndex, endIndex);

  // Render current page items
  paginatedItems.forEach(product => {
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

  // Render pagination buttons below grid
  renderPaginationControls(totalPages, productsToRender);
}

function renderPaginationControls(totalPages, productsToRender) {
  let paginationContainer = document.getElementById("paginationContainer");
  
  if (!paginationContainer) {
    const productGrid = document.getElementById("productGrid");
    paginationContainer = document.createElement("div");
    paginationContainer.id = "paginationContainer";
    paginationContainer.style.cssText = "grid-column: 1/-1; display: flex; justify-content: center; gap: 8px; margin: 2rem 0; align-items: center;";
    productGrid.parentNode.insertBefore(paginationContainer, productGrid.nextSibling);
  }

  paginationContainer.innerHTML = "";

  if (totalPages <= 1) return;

  // Previous Button
  const prevBtn = document.createElement("button");
  prevBtn.textContent = "Previous";
  prevBtn.style.cssText = "padding: 6px 12px; cursor: pointer; border-radius: 4px; border: 1px solid #ccc; background: #fff;";
  prevBtn.disabled = currentPage === 1;
  if (currentPage === 1) prevBtn.style.opacity = "0.5";
  prevBtn.onclick = () => {
    if (currentPage > 1) {
      currentPage--;
      renderProducts(productsToRender);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };
  paginationContainer.appendChild(prevBtn);

  // Page Number Buttons
  for (let i = 1; i <= totalPages; i++) {
    const pageBtn = document.createElement("button");
    pageBtn.textContent = i;
    pageBtn.style.cssText = `padding: 6px 12px; cursor: pointer; border-radius: 4px; border: 1px solid #ccc; font-weight: bold; background: ${i === currentPage ? 'var(--primary, #b91c1c)' : '#fff'}; color: ${i === currentPage ? '#fff' : '#000'};`;
    pageBtn.onclick = () => {
      currentPage = i;
      renderProducts(productsToRender);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };
    paginationContainer.appendChild(pageBtn);
  }

  // Next Button
  const nextBtn = document.createElement("button");
  nextBtn.textContent = "Next";
  nextBtn.style.cssText = "padding: 6px 12px; cursor: pointer; border-radius: 4px; border: 1px solid #ccc; background: #fff;";
  nextBtn.disabled = currentPage === totalPages;
  if (currentPage === totalPages) nextBtn.style.opacity = "0.5";
  nextBtn.onclick = () => {
    if (currentPage < totalPages) {
      currentPage++;
      renderProducts(productsToRender);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };
  paginationContainer.appendChild(nextBtn);
}

function setupEventListeners() {
  const searchInput = document.querySelector('.search-input');
  const categorySelect = document.querySelector('header select') || document.querySelector('.controls-bar select') || document.querySelector('select');

  function filterAndRender(e) {
    if (e) e.preventDefault();

    // Lock and save current scroll position so page doesn't jump
    const currentScrollY = window.scrollY;

    currentPage = 1; // Reset to page 1 on filter/search change
    const searchTerm = searchInput ? searchInput.value.toLowerCase().trim() : "";
    const selectedCategory = categorySelect ? categorySelect.value.trim() : "all";

    const filtered = allProducts.filter(product => {
      const productName = product.name ? product.name.toLowerCase() : "";
      const productCategory = product.category ? product.category.toLowerCase() : "";

      const matchesSearch = productName.includes(searchTerm) || 
                            productCategory.includes(searchTerm);
      
      const matchesCategory = selectedCategory.toLowerCase() === "all" || 
                              selectedCategory.toLowerCase() === "all categories" || 
                              productCategory === selectedCategory.toLowerCase();

      return matchesSearch && matchesCategory;
    });

    renderProducts(filtered);

    // Instantly restore scroll position
    window.scrollTo({ top: currentScrollY, behavior: 'auto' });
  }

  if (searchInput) {
    searchInput.addEventListener("input", filterAndRender);
    
    // Prevent form submission jump if search input is wrapped in a form tag
    const parentForm = searchInput.closest('form');
    if (parentForm) {
      parentForm.addEventListener('submit', (e) => {
        e.preventDefault();
      });
    }
  }

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

  saveCart();
  updateCartUI();
  alert(`Added ${product.name} to cart!`);
};

window.removeFromCart = function(productId) {
  const existing = cart.find(item => item.id === productId);
  if (existing) {
    if (existing.qty > 1) {
      existing.qty -= 1;
    } else {
      cart = cart.filter(item => item.id !== productId);
    }
  }
  saveCart();
  updateCartUI();
};

function saveCart() {
  localStorage.setItem('ifix_cart', JSON.stringify(cart));
}

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
          <div style="display: flex; justify-content: space-between; align-items: center; width: 100%; margin-bottom: 0.8rem; border-bottom: 1px solid #eee; padding-bottom: 0.5rem;">
            <div>
              <strong>${item.name}</strong><br>
              <small style="color: var(--text-muted);">RM ${itemPrice.toFixed(2)} × ${item.qty} = <strong>RM ${(itemPrice * item.qty).toFixed(2)}</strong></small>
            </div>
            <button onclick="removeFromCart(${item.id})" style="background: #ef4444; color: white; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 0.8rem;">Remove</button>
          </div>
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