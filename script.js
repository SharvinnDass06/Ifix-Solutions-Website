const API_URL = "https://ifix-solutions-backend-1.onrender.com/api/products";

async function loadStoreProducts() {
  // Finds the container where your product grid renders
  const container = document.getElementById("productGrid") || document.getElementById("product-list");
  if (!container) return;

  try {
    const response = await fetch(API_URL);
    const products = await response.json();

    // Clear hardcoded static HTML items
    container.innerHTML = "";

    // Loop through and display each product from your database
    products.forEach(product => {
      const card = document.createElement("div");
      card.className = "product-card";
      card.innerHTML = `
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

document.addEventListener("DOMContentLoaded", loadStoreProducts);