// ===== Utilities: Load & Save =====
const loadProducts = () => {
    try {
      return JSON.parse(localStorage.getItem("products") || "[]");
    } catch {
      return [];
    }
  };
  const saveProducts = (products) =>
    localStorage.setItem("products", JSON.stringify(products));
  
  // ===== Render Products =====
  function renderProducts() {
    const products = loadProducts();
    const list = document.getElementById("productList");
  
    if (!list) return;
  
    if (!products.length) {
      list.innerHTML = "<p>No products yet.</p>";
      return;
    }
  
    list.innerHTML = products
      .map(
        (p, i) => `
      <div class="product-card">
        <img src="${p.image}" alt="${p.name}">
        <h4>${p.name}</h4>
        <p>Price: $${p.price}</p>
        <p>Stock: ${p.stock}</p>
        <div class="card-actions">
          <button class="mini-btn edit" onclick="openEditForm(${i})">
            <i class="fa-solid fa-pen"></i> Edit
          </button>
          <button class="mini-btn delete" onclick="deleteProduct(${i})">
            <i class="fa-solid fa-trash"></i> Delete
          </button>
        </div>
      </div>
    `
      )
      .join("");
  }
  
  // ===== Add Product =====
  const productForm = document.getElementById("productForm");
  if (productForm) {
    productForm.addEventListener("submit", (e) => {
      e.preventDefault();
  
      const name = document.getElementById("pName").value.trim();
      const price = document.getElementById("pPrice").value.trim();
      const stock = document.getElementById("pStock").value.trim();
      const fileInput = document.getElementById("pImage");
  
      if (!name || !price || !stock || !fileInput || !fileInput.files.length) {
        notify("⚠️ Please fill all fields and upload an image.");
        return;
      }
  
      const file = fileInput.files[0];
      const reader = new FileReader();
      reader.onload = function (evt) {
        const imageData = evt.target.result;
  
        const newProduct = {
          id: "p_" + Math.random().toString(36).slice(2, 9),
          name,
          price,
          stock,
          image: imageData,
          createdAt: new Date().toISOString(),
        };
  
        const products = loadProducts();
        products.push(newProduct);
        saveProducts(products);
  
        renderProducts();
        productForm.reset();
        notify("✅ Product added successfully.");
      };
      reader.onerror = () => notify("❌ Image upload failed. Try again.");
      reader.readAsDataURL(file);
    });
  }
  
  // ===== Delete Product =====
  function deleteProduct(index) {
    const products = loadProducts();
    if (!products[index]) return;
    if (confirm("Are you sure you want to delete this product?")) {
      products.splice(index, 1);
      saveProducts(products);
      renderProducts();
      notify("🗑️ Product deleted.");
    }
  }
  
  // ===== Edit Product (Popup Modal) =====
  function openEditForm(index) {
    const products = loadProducts();
    const product = products[index];
    if (!product) return;
  
    document.getElementById("editIndex").value = index;
    document.getElementById("editName").value = product.name;
    document.getElementById("editPrice").value = product.price;
    document.getElementById("editStock").value = product.stock;
  
    showEditDialog(true);
  }
  
  function showEditDialog(show) {
    const dialog = document.getElementById("editDialog");
    const overlay = document.getElementById("overlay");
    if (!dialog || !overlay) return;
    dialog.style.display = show ? "block" : "none";
    overlay.style.display = show ? "block" : "none";
  }
  
  function closeEditForm() {
    showEditDialog(false);
  }
  
  const editForm = document.getElementById("editForm");
  if (editForm) {
    editForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const index = parseInt(document.getElementById("editIndex").value, 10);
      const products = loadProducts();
      if (Number.isNaN(index) || !products[index]) return;
  
      const name = document.getElementById("editName").value.trim();
      const price = document.getElementById("editPrice").value.trim();
      const stock = document.getElementById("editStock").value.trim();
  
      if (!name || !price || !stock) {
        notify("⚠️ All fields are required.");
        return;
      }
  
      products[index] = { ...products[index], name, price, stock };
      saveProducts(products);
      renderProducts();
      closeEditForm();
      notify("✏️ Product updated.");
    });
  }
  
  // ===== Simple Toast Notification =====
  function notify(text) {
    const toast = document.getElementById("toast");
    if (!toast) return;
    toast.textContent = text;
    toast.style.display = "block";
    toast.style.opacity = "1";
  
    setTimeout(() => {
      toast.style.opacity = "0";
      setTimeout(() => (toast.style.display = "none"), 400);
    }, 1800);
  }
  
  // ===== Logout =====
  function logout() {
    localStorage.setItem("userLoggedIn", "false");
    window.location.href = "login.html";
  }
  
  // ===== Initial render =====
  document.addEventListener("DOMContentLoaded", renderProducts);
  