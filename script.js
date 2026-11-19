
let menuItems = [];
let selectedCategory = "All";
let adminPassword = sessionStorage.getItem("adminPassword") || "";

const menuGrid = document.getElementById("menuGrid");
const adminPanel = document.getElementById("adminPanel");
const menuForm = document.getElementById("menuForm");

async function api(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
      ...(adminPassword
        ? { "x-admin-password": adminPassword }
        : {})
    }
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Something went wrong.");
  }

  return data;
}

async function loadMenu() {
  try {
    menuItems = await api("/api/menu");
    renderMenu();
    renderAdminItems();
  } catch (error) {
    menuGrid.textContent = "Unable to load menu. Please try again.";
  }
}

function renderMenu() {
  const filtered = selectedCategory === "All"
    ? menuItems
    : menuItems.filter(item => item.category === selectedCategory);

  menuGrid.innerHTML = "";

  if (!filtered.length) {
    menuGrid.textContent = "No menu items found.";
    return;
  }

  filtered.forEach(item => {
    const card = document.createElement("article");
    card.className = "menu-card";

    const img = document.createElement("img");
    img.src = item.image || "https://placehold.co/500x350?text=Food";
    img.alt = item.name;
    img.loading = "lazy";
    img.onerror = () => {
      img.src = "https://placehold.co/500x350?text=Food";
    };

    const info = document.createElement("div");
    info.className = "menu-info";

    const name = document.createElement("h3");
    name.textContent = item.name;

    const description = document.createElement("p");
    description.textContent = item.description || item.category;

    const price = document.createElement("span");
    price.className = "price";
    price.textContent = "₱" + Number(item.price).toFixed(2);

    info.append(name, description, price);
    card.append(img, info);
    menuGrid.appendChild(card);
  });
}

// Category filtering
document.querySelectorAll(".category").forEach(button => {
  button.addEventListener("click", () => {
    selectedCategory = button.dataset.category;

    document.querySelectorAll(".category").forEach(btn => {
      btn.classList.remove("active");
    });

    button.classList.add("active");
    renderMenu();
  });
});

// Admin login
async function openAdmin() {
  const password = prompt("Enter administrator password:");

  if (!password) return;

  adminPassword = password;

  try {
    await api("/api/admin/login", { method: "POST" });

    sessionStorage.setItem("adminPassword", password);
    adminPanel.hidden = false;
    adminPanel.scrollIntoView({ behavior: "smooth" });

    renderAdminItems();
  } catch (error) {
    adminPassword = "";
    sessionStorage.removeItem("adminPassword");
    alert("Incorrect administrator password.");
  }
}

function logout() {
  adminPassword = "";
  sessionStorage.removeItem("adminPassword");
  adminPanel.hidden = true;
  resetForm();
}

function renderAdminItems() {
  const container = document.getElementById("adminItems");
  container.innerHTML = "";

  menuItems.forEach(item => {
    const row = document.createElement("div");
    row.className = "admin-item";

    const title = document.createElement("strong");
    title.textContent = `${item.name} - ₱${Number(item.price).toFixed(2)}`;

    const actions = document.createElement("div");

    const edit = document.createElement("button");
    edit.className = "edit-btn";
    edit.textContent = "Edit";
    edit.addEventListener("click", () => editItem(item.id));

    const remove = document.createElement("button");
    remove.className = "delete-btn";
    remove.textContent = "Delete";
    remove.addEventListener("click", () => deleteItem(item.id));

    actions.append(edit, remove);
    row.append(title, actions);
    container.appendChild(row);
  });
}

// Save new or edited item
menuForm.addEventListener("submit", async event => {
  event.preventDefault();

  const id = document.getElementById("itemId").value;

  const item = {
    name: document.getElementById("itemName").value,
    description: document.getElementById("itemDescription").value,
    category: document.getElementById("itemCategory").value,
    price: Number(document.getElementById("itemPrice").value),
    image: document.getElementById("itemImage").value
  };

  try {
    await api(id ? `/api/menu/${id}` : "/api/menu", {
      method: id ? "PUT" : "POST",
      body: JSON.stringify(item)
    });

    alert("Menu saved successfully!");
    resetForm();
    await loadMenu();
  } catch (error) {
    alert(error.message);
  }
});

function editItem(id) {
  const item = menuItems.find(item => String(item.id) === String(id));
  if (!item) return;

  document.getElementById("itemId").value = item.id;
  document.getElementById("itemName").value = item.name;
  document.getElementById("itemDescription").value = item.description || "";
  document.getElementById("itemCategory").value = item.category;
  document.getElementById("itemPrice").value = item.price;
  document.getElementById("itemImage").value = item.image || "";

  document.getElementById("formTitle").textContent = "Edit Menu Item";
  menuForm.scrollIntoView({ behavior: "smooth" });
}

async function deleteItem(id) {
  if (!confirm("Are you sure you want to delete this item?")) return;

  try {
    await api(`/api/menu/${id}`, { method: "DELETE" });
    alert("Menu item deleted.");
    await loadMenu();
  } catch (error) {
    alert(error.message);
  }
}

function resetForm() {
  menuForm.reset();
  document.getElementById("itemId").value = "";
  document.getElementById("formTitle").textContent = "Add New Menu Item";
}

loadMenu();
