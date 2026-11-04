const API_URL = "https://ifix-solutions-backend-1.onrender.com/api/products";

let allProducts = [];

document.addEventListener('DOMContentLoaded', () => {
  loadStoreProducts();
  setupEventListeners();
});

async function loadStoreProducts() {
  const container = document.getElementById("productGrid") || document.getElementById("product-list");
  if (!container) return;

  try {
    const response = await fetch(API_URL);
    const jsonResult = await response.json();
    allProducts = jsonResult.data || jsonResult || [];

    renderProducts(allProducts);
  } catch (error) {
    console.error("Error loading products:", error);
  }
}

function renderProducts(productsToRender) {
  const container = document.getElementById("productGrid") || document.getElementById("product-list");
  if (!container) return;

  container.innerHTML = "";

  if (productsToRender.length === 0) {
    container.innerHTML = `<p style="grid-column: 1/-1; text-align: center; color: var(--text-muted);">No products found.</p>`;
    return;
  }

  productsToRender.forEach(product => {
    const card = document.createElement("div");
    card.className = "product-card";

    let imageHTML = "";
    if (product.image_url) {
      imageHTML = `<img src="${product.image_url}" alt="${product.name}" style="width: 100%; height: 160px; object-fit: cover;">`;
    }

    card.innerHTML = `
      ${imageHTML}
      <h3>${product.name}</h3>
      <p>Category: ${product.category}</p>
      <p><strong>RM ${parseFloat(product.price).toFixed(2)}</strong></p>
      <p>Stock: ${product.stock_quantity}</p>
    `;
    container.appendChild(card);
  });
}

function setupEventListeners() {
  // Adjust these IDs to match your actual HTML input/select elements if needed
  const searchInput = document.querySelector('input[type="text"], input[type="search"], .search-input');
  const categorySelect = document.querySelector('select');

  function filterAndRender() {
    const searchTerm = searchInput ? searchInput.value.toLowerCase() : "";
    const selectedCategory = categorySelect ? categorySelect.value : "All Categories";

    const filtered = allProducts.filter(product => {
      const matchesSearch = product.name.toLowerCase().includes(searchTerm) || 
                            product.category.toLowerCase().includes(searchTerm);
      
      const matchesCategory = selectedCategory === "All Categories" || 
                              product.category.toLowerCase() === selectedCategory.toLowerCase();

      return matchesSearch && matchesCategory;
    });

    renderProducts(filtered);
  }

  if (searchInput) {
    searchInput.addEventListener("input", filterAndRender);
  }

  if (categorySelect) {
    categorySelect.addEventListener("change", filterAndRender);
  }
// Handle Customer Repair Booking Form Submission
const repairForm = document.querySelector('form'); 
if (repairForm) {
    repairForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const formData = {
            full_name: repairForm.querySelector('input:nth-of-type(1)').value,
            phone: repairForm.querySelector('input:nth-of-type(2)').value,
            device_model: repairForm.querySelector('input:nth-of-type(3)').value,
            requested_service: repairForm.querySelector('select').value,
            issue_description: repairForm.querySelector('textarea').value
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
                repairForm.reset();
            } else {
                alert('Failed to submit booking.');
            }
        } catch (err) {
            console.error(err);
            alert('Server connection error.');
        }
    });
}