const API_URL = "https://ifix-solutions-backend-1.onrender.com/api/products";

async function loadStoreProducts() {
  // Finds the container where your product grid renders
  const container = document.getElementById("productGrid") || document.getElementById("product-list");
  if (!container) return;

  const response = await fetch(API_URL);
    const jsonResult = await response.json();

    // Extract the products array from jsonResult.data
    let products = jsonResult.data || [];

    // Clear hardcoded static HTML items
    container.innerHTML = "";

    // Loop through and display each product from your database
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

document.addEventListener("DOMContentLoaded", loadStoreProducts);