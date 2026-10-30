const API_BASE_URL = 'http://localhost:5000/api';

// Expanded Mock Inventory for iFix Solutions
const MOCK_PRODUCTS = [
  {
    id: 1,
    title: "Lenovo ThinkPad X1 Carbon Gen 8",
    category: "Laptop",
    condition: "Grade A Used",
    specs: "Intel Core i7-10510U, 16GB RAM, 512GB NVMe SSD, 14\" FHD",
    price: 1850.00,
    stock: 3,
    image_url: "https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=500"
  },
  {
    id: 2,
    title: "HP EliteBook 840 G6 Business Laptop",
    category: "Laptop",
    condition: "Grade A Used",
    specs: "Intel Core i5-8350U, 16GB RAM, 256GB SSD, Windows 11 Pro",
    price: 1250.00,
    stock: 5,
    image_url: "https://images.unsplash.com/photo-1541807084-5c52b6b3adef?w=500"
  },
  {
    id: 3,
    title: "Apple MacBook Pro 13\" (2019)",
    category: "Laptop",
    condition: "Refurbished",
    specs: "Intel Core i5, 8GB RAM, 256GB SSD, Touch Bar, Space Gray",
    price: 2100.00,
    stock: 2,
    image_url: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=500"
  },
  {
    id: 4,
    title: "Dell OptiPlex 7070 Office Desktop PC",
    category: "Desktop",
    condition: "Grade A Used",
    specs: "Intel i5-9500, 16GB DDR4 RAM, 512GB NVMe SSD",
    price: 980.00,
    stock: 4,
    image_url: "https://images.unsplash.com/photo-1587831990711-23ca6441447b?w=500"
  },
  {
    id: 5,
    title: "Custom Gaming Rig (Entry Level)",
    category: "Desktop",
    condition: "Refurbished",
    specs: "AMD Ryzen 5 3600, GTX 1660 Super 6GB, 16GB RAM, 512GB SSD",
    price: 1950.00,
    stock: 2,
    image_url: "https://images.unsplash.com/photo-1587202372775-e229f172b9d7?w=500"
  },
  {
    id: 6,
    title: "Kingston Fury Beast 16GB DDR4 3200MHz",
    category: "RAM",
    condition: "Brand New",
    specs: "Desktop RAM, High Performance Heatsink (CL16)",
    price: 165.00,
    stock: 15,
    image_url: "https://images.unsplash.com/photo-1562976540-1502c2145186?w=500"
  },
  {
    id: 7,
    title: "Corsair Vengeance LPX 32GB (2x16GB) DDR4",
    category: "RAM",
    condition: "Brand New",
    specs: "3200MHz C16 Desktop Memory Kit, Black",
    price: 310.00,
    stock: 8,
    image_url: "https://images.unsplash.com/photo-1541029071515-84b54fbb8f83?w=500"
  },
  {
    id: 8,
    title: "Crucial 8GB DDR4 3200MHz SODIMM",
    category: "RAM",
    condition: "Brand New",
    specs: "Laptop Memory Upgrade Module",
    price: 85.00,
    stock: 20,
    image_url: "https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?w=500"
  },
  {
    id: 9,
    title: "Samsung 970 EVO Plus 1TB NVMe M.2 SSD",
    category: "Storage",
    condition: "Refurbished",
    specs: "Read Speed up to 3,500 MB/s, 100% Health Status Verified",
    price: 295.00,
    stock: 6,
    image_url: "https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?w=500"
  },
  {
    id: 10,
    title: "Kingston A400 480GB 2.5\" SATA SSD",
    category: "Storage",
    condition: "Brand New",
    specs: "Solid State Drive for Laptop & PC Speed Boost",
    price: 145.00,
    stock: 12,
    image_url: "https://images.unsplash.com/photo-1531492746302-35112521c7d3?w=500"
  },
  {
    id: 11,
    title: "Logitech G102 Lightsync Gaming Mouse",
    category: "Equipment",
    condition: "Brand New",
    specs: "RGB Color, 8000 DPI Sensor, Programmable Buttons",
    price: 79.00,
    stock: 10,
    image_url: "https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?w=500"
  },
  {
    id: 12,
    title: "Redragon K552 Mechanical Gaming Keyboard",
    category: "Equipment",
    condition: "Brand New",
    specs: "Compact 87 Keys Tenkeyless, RGB Backlit, Red Switches",
    price: 140.00,
    stock: 7,
    image_url: "https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=500"
  }
];

let products = [];
let cart = [];

const productGrid = document.getElementById('productGrid');
const searchInput = document.getElementById('searchInput');
const categoryFilter = document.getElementById('categoryFilter');
const conditionFilter = document.getElementById('conditionFilter');
const cartCount = document.getElementById('cartCount');
const cartModal = document.getElementById('cartModal');
const openCartBtn = document.getElementById('openCartBtn');
const closeCartBtn = document.getElementById('closeCartBtn');
const cartItemsContainer = document.getElementById('cartItemsContainer');
const cartTotal = document.getElementById('cartTotal');

document.addEventListener('DOMContentLoaded', () => {
  fetchProducts();
  setupEventListeners();
});

async function fetchProducts() {
  try {
    const response = await fetch(`${API_BASE_URL}/products`);
    if (!response.ok) throw new Error('API server unavailable');
    products = await response.json();
  } catch (error) {
    products = MOCK_PRODUCTS;
  }
  renderProducts(products);
}

function renderProducts(items) {
  productGrid.innerHTML = '';
  
  if (items.length === 0) {
    productGrid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: var(--text-muted); padding: 2rem;">No hardware items found matching your filters.</p>';
    return;
  }

  items.forEach(product => {
    const badgeClass = product.condition.includes('Used') ? 'badge-used' : 
                       product.condition.includes('Refurbished') ? 'badge-refurbished' : 'badge-new';

    const card = document.createElement('div');
    card.className = 'product-card';
    card.innerHTML = `
      <img src="${product.image_url}" alt="${product.title}" class="product-img">
      <div class="product-info">
        <span class="badge ${badgeClass}">${product.condition}</span>
        <h3 class="product-title">${product.title}</h3>
        <p class="product-specs">${product.specs}</p>
        <div class="product-bottom">
          <span class="product-price">RM ${product.price.toFixed(2)}</span>
          <button class="btn-add-cart" onclick="addToCart(${product.id})">Add to Cart</button>
        </div>
      </div>
    `;
    productGrid.appendChild(card);
  });
}

function filterProducts() {
  const query = searchInput.value.toLowerCase();
  const cat = categoryFilter.value;
  const cond = conditionFilter.value;

  const filtered = products.filter(p => {
    const matchesSearch = p.title.toLowerCase().includes(query) || p.specs.toLowerCase().includes(query);
    const matchesCat = cat === 'ALL' || p.category === cat;
    const matchesCond = cond === 'ALL' || p.condition === cond;
    return matchesSearch && matchesCat && matchesCond;
  });

  renderProducts(filtered);
}

window.addToCart = function(productId) {
  const product = products.find(p => p.id === productId);
  if (!product) return;

  const existing = cart.find(item => item.id === productId);
  if (existing) {
    existing.qty += 1;
  } else {
    cart.push({ ...product, qty: 1 });
  }

  updateCartUI();
};

function updateCartUI() {
  cartCount.textContent = cart.reduce((sum, i) => sum + i.qty, 0);
  
  cartItemsContainer.innerHTML = '';
  let total = 0;

  if (cart.length === 0) {
    cartItemsContainer.innerHTML = '<p style="text-align: center; color: var(--text-muted); padding: 1rem;">Your shopping cart is empty.</p>';
  } else {
    cart.forEach(item => {
      total += item.price * item.qty;
      const div = document.createElement('div');
      div.className = 'cart-item';
      div.innerHTML = `
        <div>
          <strong>${item.title}</strong><br>
          <small style="color: var(--text-muted);">RM ${item.price.toFixed(2)} × ${item.qty}</small>
        </div>
        <div>
          <strong>RM ${(item.price * item.qty).toFixed(2)}</strong>
        </div>
      `;
      cartItemsContainer.appendChild(div);
    });
  }

  cartTotal.textContent = total.toFixed(2);
}

function setupEventListeners() {
  searchInput.addEventListener('input', filterProducts);
  categoryFilter.addEventListener('change', filterProducts);
  conditionFilter.addEventListener('change', filterProducts);

  openCartBtn.addEventListener('click', () => cartModal.style.display = 'flex');
  closeCartBtn.addEventListener('click', () => cartModal.style.display = 'none');
  window.addEventListener('click', (e) => {
    if (e.target === cartModal) cartModal.style.display = 'none';
  });
}