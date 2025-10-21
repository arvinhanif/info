// File: products.js

// ===== Utilities =====
function loadProducts() {
  try {
    return JSON.parse(localStorage.getItem("products") || "[]");
  } catch {
    return [];
  }
}
function saveCart(cart) {
  localStorage.setItem("cart", JSON.stringify(cart));
}
function loadCart() {
  try {
    return JSON.parse(localStorage.getItem("cart") || "[]");
  } catch {
    return [];
  }
}
function updateCartCount() {
  const cart = loadCart();
  const count = cart.reduce((sum, item) => sum + (item.qty || 1), 0);
  const el = document.getElementById("cartCount");
  if (el) el.textContent = count;
}
function formatPriceBDT(value) {
  const n = Number(value || 0);
  return `৳${n.toLocaleString("en-BD", { maximumFractionDigits: 0 })}`;
}
function safeImage(src) {
  return src || "https://via.placeholder.com/600x400?text=No+Image";
}

// ===== Cart =====
function addToCart(productId) {
  const products = loadProducts();
  const product = products.find(p => String(p.id) === String(productId));
  if (!product) return;

  let cart = loadCart();
  const idx = cart.findIndex(i => String(i.id) === String(product.id));
  if (idx >= 0) {
    cart[idx].qty = (cart[idx].qty || 1) + 1;
  } else {
    cart.push({ id: product.id, name: product.name, price: product.price, image: product.image, qty: 1 });
  }

  saveCart(cart);
  updateCartCount();

  // Redirect to cart page
  window.location.href = "cart.html";
}

// ===== View Product =====
function viewProduct(productId) {
  const products = loadProducts();
  const product = products.find(p => String(p.id) === String(productId));
  if (!product) return;

  localStorage.setItem("selectedProduct", JSON.stringify(product));
  window.location.href = "product-details.html";
}

// ===== Render helpers =====
function productCardHTML(p) {
  const stockText = typeof p.stock === "number" ? `Stock: ${p.stock}` : "";
  return `
    <div class="product-card">
      <img src="${safeImage(p.image)}" alt="${p.name}">
      <h4>${p.name}</h4>
      <p class="price">${formatPriceBDT(p.price)}</p>
      ${stockText ? `<p class="stock">${stockText}</p>` : ""}
      <div class="actions">
        <button class="btn primary" onclick="addToCart('${p.id}')">
          <i class="fa-solid fa-cart-plus"></i> Add to Cart
        </button>
        <button class="btn outline" onclick="viewProduct('${p.id}')">
          <i class="fa-regular fa-eye"></i> View
        </button>
      </div>
    </div>
  `;
}

function renderSection(containerId, items) {
  const container = document.getElementById(containerId);
  if (!container) return;

  if (!items || !items.length) {
    container.innerHTML = "<p>No products available.</p>";
    return;
  }

  container.innerHTML = items.map(productCardHTML).join("");
}

// ===== Init =====
document.addEventListener("DOMContentLoaded", () => {
  // Back button behavior
  const backBtn = document.getElementById("backBtn");
  if (backBtn) {
    backBtn.addEventListener("click", (e) => {
      e.preventDefault();
      if (document.referrer && document.referrer !== window.location.href) {
        history.back();
      } else {
        window.location.href = "index.html";
      }
    });
  }

  // Load products
  const products = loadProducts();

  // Latest: first 8 items
  renderSection("productsContainer", products.slice(0, 8));

  // Best selling: fallback sort by price desc
  const best = [...products].sort((a, b) => Number(b.price || 0) - Number(a.price || 0)).slice(0, 8);
  renderSection("bestSelling", best);

  // Deals: flag-based else cheapest
  const flaggedDeals = products.filter(p => p.deal === true);
  const deals = flaggedDeals.length
    ? flaggedDeals.slice(0, 4)
    : [...products].sort((a, b) => Number(a.price || 0) - Number(b.price || 0)).slice(0, 4);
  renderSection("dealProducts", deals);

  // Cart count
  updateCartCount();
});
