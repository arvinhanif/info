// ===========================
// index.js (Frontend Logic)
// ===========================
document.addEventListener("DOMContentLoaded", () => {
  // -------------------------------
  // Account Button Logic
  // -------------------------------
  const accountBtn = document.getElementById("accountBtn");
  if (accountBtn) {
    accountBtn.addEventListener("click", (e) => {
      e.preventDefault();
      const loggedIn = localStorage.getItem("userLoggedIn") === "true";
      const currentUser = localStorage.getItem("app.currentUserId");
      if (loggedIn && currentUser) {
        window.location.href = "dashboard.html";
      } else {
        window.location.href = "login.html";
      }
    });
  }

  // -------------------------------
  // Cart helpers
  // -------------------------------
  function loadCart() {
    try { return JSON.parse(localStorage.getItem("cart") || "[]"); }
    catch { return []; }
  }
  function saveCart(cart) {
    localStorage.setItem("cart", JSON.stringify(cart));
    updateCartCount(cart);
  }
  function updateCartCount(cart = loadCart()) {
    const countEl = document.getElementById("cartCount");
    if (!countEl) return;
    const total = cart.reduce((sum, item) => sum + (item.qty || 1), 0);
    countEl.textContent = total;
  }

  // -------------------------------
  // Product Helpers
  // -------------------------------
  function loadProducts() {
    try { return JSON.parse(localStorage.getItem("products") || "[]"); }
    catch { return []; }
  }

  function renderProducts(containerId, products, limit = 4) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (!products.length) {
      container.innerHTML = "<p>No products yet. Please check back later.</p>";
      return;
    }

    container.innerHTML = products
      .slice(0, limit)
      .map((p) => `
        <div class="col-lg-3 col-md-4 col-sm-6 mb-4">
          <div class="product-card">
            <div class="thumb">
              <img src="${p.image}" alt="${p.name}">
            </div>
            <div class="info">
              <h4 class="title">${p.name}</h4>
              <div class="meta">
                <span class="price">$${Number(p.price).toFixed(2)}</span>
                ${p.brand ? `<span class="brand">${p.brand}</span>` : ""}
              </div>
            </div>
            <div class="actions">
              <a href="product.html?id=${encodeURIComponent(p.id)}" class="btn-ghost btn-view" data-id="${p.id}">
                <i class="fa-regular fa-eye"></i> View
              </a>
              <button class="btn-primary btn-add" data-id="${p.id}">
                <i class="fa-solid fa-cart-plus"></i> Add to Cart
              </button>
            </div>
          </div>
        </div>
      `)
      .join("");

    // Event delegation for actions (attach once per container)
    container.addEventListener("click", (e) => {
      const addBtn = e.target.closest(".btn-add");
      const viewBtn = e.target.closest(".btn-view");

      if (addBtn) {
        e.preventDefault();
        const id = addBtn.getAttribute("data-id");
        const product = products.find((x) => String(x.id) === String(id));
        if (!product) return;

        const cart = loadCart();
        const idx = cart.findIndex((c) => String(c.id) === String(id));
        if (idx > -1) {
          cart[idx].qty = (cart[idx].qty || 1) + 1;
        } else {
          cart.push({ id: product.id, name: product.name, price: product.price, image: product.image, qty: 1 });
        }
        saveCart(cart);
      }

      if (viewBtn) {
        // default anchor behavior already goes to product.html?id=...
        // keep it accessible; no preventDefault unless you want SPA routing
      }
    }, { once: true }); // prevent rebinding on re-render
  }

  // -------------------------------
  // Search behavior (optional UX)
  // -------------------------------
  const searchForm = document.querySelector(".search-form");
  if (searchForm) {
    searchForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const q = document.getElementById("searchInput")?.value?.trim() || "";
      if (q) window.location.href = `products.html?q=${encodeURIComponent(q)}`;
    });
  }

  // -------------------------------
  // Init Home Page
  // -------------------------------
  const products = loadProducts();

  if (document.getElementById("homeProducts")) {
    renderProducts("homeProducts", products, 4);
  }
  if (document.getElementById("allProducts")) {
    renderProducts("allProducts", products, products.length);
  }

  // Initial cart count
  updateCartCount();
});
