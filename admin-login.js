document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("adminLoginForm");
  
    function showToast(message, color = "rgba(76,156,255,0.95)") {
      const toast = document.getElementById("toast");
      toast.textContent = message;
      toast.style.background = color;
      toast.classList.add("show");
      setTimeout(() => toast.classList.remove("show"), 3000);
    }
  
    // ✅ Admin Login Validation
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const id = document.getElementById("adminId").value.trim();
      const pass = document.getElementById("adminPass").value.trim();
  
      if (id === "arvin_hanif" && pass === "arvin_hanif") {
        showToast("Admin login successful ✅", "rgba(40,167,69,0.95)");
        setTimeout(() => { window.location.href = "admin.html"; }, 1000);
      } else {
        showToast("Invalid admin credentials ❌", "rgba(220,53,69,0.95)");
      }
    });
  
    // ✅ Password Show/Hide Toggle
    document.querySelectorAll(".toggle-password").forEach(icon => {
      icon.addEventListener("click", () => {
        const targetId = icon.getAttribute("data-target");
        const input = document.getElementById(targetId);
        const type = input.type === "password" ? "text" : "password";
        input.type = type;
  
        icon.classList.toggle("active");
  
        if (type === "text") {
          icon.classList.replace("fa-eye", "fa-eye-slash");
        } else {
          icon.classList.replace("fa-eye-slash", "fa-eye");
        }
      });
    });
  });
  