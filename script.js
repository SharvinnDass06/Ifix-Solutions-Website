const API_URL = "https://ifix-solutions-backend-1.onrender.com/api/products";

let allProducts = [];

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
          <span style="font-size: 0.85rem; color: var(--text-muted);">Stock: ${product.stock_quantity}</span>
        </div>
      </div>
    `;
    container.appendChild(card);
  });
}

function setupEventListeners() {
  const searchInput = document.querySelector('.search-input');
  const categorySelect = document.querySelector('select');

  function filterAndRender() {
    const searchTerm = searchInput ? searchInput.value.toLowerCase() : "";
    const selectedCategory = categorySelect ? categorySelect.value : "ALL";

    const filtered = allProducts.filter(product => {
      const matchesSearch = product.name.toLowerCase().includes(searchTerm) || 
                            product.category.toLowerCase().includes(searchTerm);
      
      const matchesCategory = selectedCategory === "ALL" || selectedCategory === "All Categories" || 
                              product.category.toLowerCase() === selectedCategory.toLowerCase();

      return matchesSearch && matchesCategory;
    });

    renderProducts(filtered);
  }

  if (searchInput) searchInput.addEventListener("input", filterAndRender);
  if (categorySelect) categorySelect.addEventListener("change", filterAndRender);
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