const API_URL = "https://ifix-solutions-backend-1.onrender.com/api/products";

let cart = [];

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
    let products = jsonResult.data || jsonResult || [];

    container.innerHTML = "";

    if (products.length === 0) {
      container.innerHTML = `<p style="grid-column: 1/-1; text-align: center; color: var(--text-muted);">No products found in the database.</p>`;
      return;
    }

    products.forEach(product => {
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
  } catch (error) {
    console.error("Error loading products:", error);
  }
}

function setupEventListeners() {
  // Event listeners placeholder
}