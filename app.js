import { initializeApp } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js";
import { getDatabase, ref, push, onValue, remove, update } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-database.js";
import { firebaseConfig, IMGBB_KEY } from "./config.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

const landing = document.getElementById("landingPage");
const authContainer = document.getElementById("authContainer");
const sellerPage = document.getElementById("sellerPage");
const buyerPage = document.getElementById("buyerPage");

const signupForm = document.getElementById("signupForm");
const loginForm = document.getElementById("loginForm");

const addToggle = document.getElementById("addToggle");
const productFormContainer = document.getElementById("productFormContainer");
const productForm = document.getElementById("productForm");
const saveProductBtn = document.getElementById("saveProductBtn");
const cancelProductBtn = document.getElementById("cancelProductBtn");
const imageFileInput = document.getElementById("imageFile");
const previewImg = document.getElementById("previewImg");
const imgProgress = document.getElementById("imgProgress");
const imgBar = document.getElementById("imgBar");
const myProductsList = document.getElementById("myProductsList");
const noProductsMsg = document.getElementById("noProductsMsg");

const showPasswordToggles = document.querySelectorAll('.show-password-toggle');

showPasswordToggles.forEach(toggle => {
  toggle.addEventListener('change', () => {
    const passFields = document.querySelectorAll('input[type="password"]');
    passFields.forEach(f => {
      f.type = toggle.checked ? 'text' : 'password';
    });
    showPasswordToggles.forEach(other => {
      if (other !== toggle) other.checked = toggle.checked;
    });
  });
});

document.getElementById("goSeller").onclick = () => {
  landing.style.display = "none";
  authContainer.classList.remove("hidden");
  signupForm.classList.remove("hidden");
  loginForm.classList.add("hidden");
};

document.getElementById("goBuyer").onclick = () => {
  landing.style.display = "none";
  buyerPage.classList.remove("hidden");
  loadProductsForBuyer();
};

const backButtons = [
  document.getElementById("backHomeAuth"),
  document.getElementById("backHomeBuyer")
];
backButtons.forEach((button) => {
  button.onclick = () => {
    authContainer.classList.add("hidden");
    sellerPage.classList.add("hidden");
    buyerPage.classList.add("hidden");
    landing.style.display = "flex";
  };
});

document.getElementById("showLogin").onclick = (e) => {
  e.preventDefault();
  signupForm.classList.add("hidden");
  loginForm.classList.remove("hidden");
};

document.getElementById("showSignup").onclick = (e) => {
  e.preventDefault();
  loginForm.classList.add("hidden");
  signupForm.classList.remove("hidden");
};

document.getElementById("signupBtn").onclick = () => {
  const email = document.getElementById("signupEmail").value;
  const password = document.getElementById("signupPassword").value;
  if (!email || !password) return alert("Enter email & password");
  createUserWithEmailAndPassword(auth, email, password)
    .then(() => alert("Signup successful ✅"))
    .catch((err) => alert("Error: " + err.message));
};

document.getElementById("loginBtn").onclick = () => {
  const email = document.getElementById("loginEmail").value;
  const password = document.getElementById("loginPassword").value;
  if (!email || !password) return alert("Enter email & password");
  signInWithEmailAndPassword(auth, email, password)
    .catch((err) => alert("Error: " + err.message));
};

document.getElementById("logoutBtn").onclick = () => {
  signOut(auth).then(() => {
    alert("Logged out successfully");
    sellerPage.classList.add("hidden");
    landing.style.display = "flex";
  });
};

onAuthStateChanged(auth, (user) => {
  if (user) {
    authContainer.classList.add("hidden");
    landing.style.display = "none";
    sellerPage.classList.remove("hidden");
    hideProductForm();
    loadSellerProducts(user.uid);
  }
});

addToggle.addEventListener("click", () => {
  if (productFormContainer.classList.contains("hidden")) {
    showProductForm();
  } else {
    hideProductForm();
  }
});

imageFileInput.addEventListener("change", (e) => {
  const f = e.target.files[0];
  if (f) {
    previewImg.src = URL.createObjectURL(f);
    previewImg.classList.remove("hidden");
  } else {
    previewImg.src = "";
    previewImg.classList.add("hidden");
  }
});

let editMode = false;
let editKey = null;
let existingImageUrl = "";

function showProductForm(populate = null) {
  productFormContainer.classList.remove("hidden");
  if (populate) {
    editMode = true;
    editKey = populate.key;
    document.getElementById("sellerName").value = populate.seller || "";
    document.getElementById("productName").value = populate.name || "";
    document.getElementById("price").value = populate.price || "";
    document.getElementById("description").value = populate.desc || "";
    document.getElementById("email").value = populate.email || "";
    document.getElementById("phone").value = populate.phone || "";
    document.getElementById("insta").value = populate.insta || "";
    existingImageUrl = populate.image || "";
    if (existingImageUrl) {
      previewImg.src = existingImageUrl;
      previewImg.classList.remove("hidden");
    }
    saveProductBtn.textContent = "Update Product";
  } else {
    editMode = false;
    editKey = null;
    existingImageUrl = "";
    productForm.reset();
    previewImg.classList.add("hidden");
    saveProductBtn.textContent = "Save Product";
  }
  productFormContainer.scrollIntoView({ behavior: "smooth", block: "center" });
}

function hideProductForm() {
  productFormContainer.classList.add("hidden");
  productForm.reset();
  previewImg.classList.add("hidden");
  editMode = false;
  editKey = null;
  existingImageUrl = "";
  imgProgress.classList.add("hidden");
  imgBar.style.width = "0%";
}

cancelProductBtn.addEventListener("click", (e) => {
  e.preventDefault();
  hideProductForm();
});

async function uploadToImgBB(file) {
  if (!file) return existingImageUrl || "";
  imgProgress.classList.remove("hidden");
  imgBar.style.width = "10%";
  const formData = new FormData();
  formData.append("image", file);
  const res = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_KEY}`, {
    method: "POST",
    body: formData
  });
  imgBar.style.width = "80%";
  const data = await res.json();
  if (!data || !data.data || !data.data.url) {
    imgProgress.classList.add("hidden");
    imgBar.style.width = "0%";
    throw new Error("ImgBB upload failed");
  }
  imgBar.style.width = "100%";
  setTimeout(() => {
    imgProgress.classList.add("hidden");
    imgBar.style.width = "0%";
  }, 400);
  return data.data.url;
}

productForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const user = auth.currentUser;
  if (!user) return alert("You must be logged in to post products.");
  const sellerNameVal = document.getElementById("sellerName").value.trim();
  const nameVal = document.getElementById("productName").value.trim();
  const priceVal = document.getElementById("price").value.trim();
  const descVal = document.getElementById("description").value.trim();
  const emailVal = document.getElementById("email").value.trim();
  const phoneVal = document.getElementById("phone").value.trim();
  const instaVal = document.getElementById("insta").value.trim();
  if (!sellerNameVal || !nameVal || !priceVal || !descVal || !emailVal) {
    return alert("Please fill all required fields.");
  }
  const file = imageFileInput.files[0];
  try {
    const imageUrl = await uploadToImgBB(file);
    const productObj = {
      seller: sellerNameVal,
      sellerId: user.uid,
      sellerEmail: user.email,
      name: nameVal,
      price: priceVal,
      desc: descVal,
      email: emailVal,
      phone: phoneVal,
      insta: instaVal,
      image: imageUrl || "",
      time: Date.now()
    };
    if (editMode && editKey) {
      await update(ref(db, "products/" + editKey), productObj);
      alert("✅ Product updated!");
    } else {
      await push(ref(db, "products"), productObj);
      alert("✅ Product added!");
    }
    hideProductForm();
  } catch (err) {
    console.error(err);
    alert("Error uploading/saving product: " + (err.message || err));
  }
});

function loadSellerProducts(uid) {
  const productsRef = ref(db, "products");
  onValue(productsRef, (snapshot) => {
    myProductsList.innerHTML = "";
    const data = snapshot.val();
    if (!data) {
      noProductsMsg.classList.remove("hidden");
      return;
    }
    const items = Object.entries(data)
      .filter(([key, val]) => val && val.sellerId === uid)
      .map(([key, val]) => ({ key, ...val }))
      .sort((a, b) => b.time - a.time);
    if (items.length === 0) {
      noProductsMsg.classList.remove("hidden");
      return;
    } else {
      noProductsMsg.classList.add("hidden");
    }
    items.forEach((p) => {
      const card = document.createElement("div");
      card.className = "border border-blue-500 rounded-lg p-4 bg-gray-900 shadow-md hover:shadow-blue-400 transition";
      const imgHtml = p.image ? `<img src="${p.image}" class="w-full h-48 object-cover rounded mb-3">` : "";
      const phoneHtml = p.phone ? `<p class="text-xs text-gray-400">Phone: ${p.phone}</p>` : "";
      const instaHtml = p.insta ? `<p class="text-xs text-gray-400">Instagram: @${p.insta}</p>` : "";
      card.innerHTML = `
        ${imgHtml}
        <h3 class="text-lg text-blue-300 font-bold">${escapeHtml(p.name)} - ₹${escapeHtml(p.price)}</h3>
        <p class="text-sm text-gray-300 mb-2">${escapeHtml(p.desc)}</p>
        <p class="text-xs text-gray-400">Seller: ${escapeHtml(p.seller)}</p>
        <p class="text-xs text-gray-400">Email: ${escapeHtml(p.email)}</p>
        ${phoneHtml}
        ${instaHtml}
        <div class="flex space-x-2 mt-3">
          <button class="small-btn edit-btn" data-key="${p.key}">Edit</button>
          <button class="small-btn del-btn" data-key="${p.key}">Delete</button>
        </div>
      `;
      myProductsList.appendChild(card);
      card.querySelector(".edit-btn").addEventListener("click", () => {
        showProductForm({
          key: p.key,
          seller: p.seller,
          name: p.name,
          price: p.price,
          desc: p.desc,
          email: p.email,
          phone: p.phone,
          insta: p.insta,
          image: p.image
        });
      });
      card.querySelector(".del-btn").addEventListener("click", async () => {
        const ok = confirm("Delete this product? This action cannot be undone.");
        if (!ok) return;
        try {
          await remove(ref(db, "products/" + p.key));
          alert("Product deleted ✅");
        } catch (err) {
          console.error(err);
          alert("Delete failed: " + (err.message || err));
        }
      });
    });
  });
}

function loadProductsForBuyer() {
  const list = document.getElementById("productList");
  const productsRef = ref(db, "products");
  onValue(productsRef, (snapshot) => {
    list.innerHTML = "";
    if (!snapshot.exists()) {
      list.innerHTML = "<p class='text-center text-gray-400'>No products available yet 😔</p>";
      return;
    }
    const data = snapshot.val();
    const items = Object.values(data).sort((a, b) => b.time - a.time);
    items.forEach((p) => {
      const card = document.createElement("div");
      card.className = "border border-blue-500 rounded-lg p-4 bg-gray-900 shadow-md hover:shadow-blue-400 transition";
      card.innerHTML = `
        ${p.image ? `<img src="${p.image}" class="w-full h-48 object-cover rounded mb-3">` : ""}
        <h3 class="text-lg text-blue-300 font-bold">${escapeHtml(p.name)} - ₹${escapeHtml(p.price)}</h3>
        <p class="text-sm text-gray-300 mb-2">${escapeHtml(p.desc)}</p>
        <p class="text-xs text-gray-400">Seller: ${escapeHtml(p.seller)}</p>
        <p class="text-xs text-gray-400">Email: ${escapeHtml(p.email)}</p>
        ${p.phone ? `<p class="text-xs text-gray-400">Phone: ${escapeHtml(p.phone)}</p>` : ""}
        ${p.insta ? `<p class="text-xs text-gray-400">Instagram: @${escapeHtml(p.insta)}</p>` : ""}
      `;
      list.appendChild(card);
    });
  });
}

function escapeHtml(text) {
  if (!text && text !== 0) return "";
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
