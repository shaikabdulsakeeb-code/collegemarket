import { initializeApp } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-app.js";
import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  onAuthStateChanged, 
  signOut,
  GoogleAuthProvider,
  signInWithPopup
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js";
import { getDatabase, ref, push, onValue, remove, update } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-database.js";
import { firebaseConfig, IMGBB_KEY } from "./config.js";

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);
const googleProvider = new GoogleAuthProvider();

// DOM elements
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

// Google Sign-In trigger
const googleBtn = document.getElementById("googleBtn");
if (googleBtn) {
  googleBtn.onclick = () => {
    signInWithPopup(auth, googleProvider)
      .then((result) => {
        alert(`Welcome, ${result.user.displayName || "Seller"}! Logged in successfully ✅`);
      })
      .catch((err) => {
        console.error("Google Sign-In Error: ", err);
        alert("Google Sign-In failed: " + err.message);
      });
  };
}

// Buyer Filters global state
let buyerProducts = [];
let searchKeyword = "";
let selectedCategory = "All";
let sortBy = "latest";

// Show/Hide password toggle
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

// Page Routing Actions
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

document.getElementById("backHomeAuth").onclick = () => {
  authContainer.classList.add("hidden");
  landing.style.display = "flex";
};

document.getElementById("backHomeBuyer").onclick = () => {
  buyerPage.classList.add("hidden");
  if (auth.currentUser) {
    sellerPage.classList.remove("hidden");
  } else {
    landing.style.display = "flex";
  }
};

const buyerGoDashboardBtn = document.getElementById("buyerGoDashboardBtn");
if (buyerGoDashboardBtn) {
  buyerGoDashboardBtn.onclick = () => {
    buyerPage.classList.add("hidden");
    sellerPage.classList.remove("hidden");
  };
}

const dashboardExploreBtn = document.getElementById("dashboardExploreBtn");
if (dashboardExploreBtn) {
  dashboardExploreBtn.onclick = () => {
    sellerPage.classList.add("hidden");
    buyerPage.classList.remove("hidden");
    loadProductsForBuyer();
  };
}

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

// Form Authentication Handlers
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

// Listen for Auth changes
onAuthStateChanged(auth, (user) => {
  const buyerGoDash = document.getElementById("buyerGoDashboardBtn");
  if (user) {
    authContainer.classList.add("hidden");
    landing.style.display = "none";
    sellerPage.classList.remove("hidden");
    
    // Set user profile info
    const emailHeader = document.getElementById("sellerProfileEmail");
    if (emailHeader) {
      emailHeader.textContent = user.email || user.displayName || "Verified Seller";
    }
    
    if (buyerGoDash) buyerGoDash.classList.remove("hidden");
    hideProductForm();
    loadSellerProducts(user.uid);
  } else {
    if (buyerGoDash) buyerGoDash.classList.add("hidden");
  }
});

// Create listings drawer
addToggle.addEventListener("click", () => {
  showProductForm();
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
  const modalFormTitle = document.getElementById("modalFormTitle");
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
    document.getElementById("productCategory").value = populate.category || "Electronics";
    document.getElementById("productCondition").value = populate.condition || "Good";
    existingImageUrl = populate.image || "";
    if (existingImageUrl) {
      previewImg.src = existingImageUrl;
      previewImg.classList.remove("hidden");
    }
    saveProductBtn.textContent = "Update Listing";
    if (modalFormTitle) modalFormTitle.textContent = "✏️ Edit Campus Listing";
  } else {
    editMode = false;
    editKey = null;
    existingImageUrl = "";
    productForm.reset();
    previewImg.classList.add("hidden");
    saveProductBtn.textContent = "Create Listing";
    if (modalFormTitle) modalFormTitle.textContent = "➕ Create Campus Listing";
  }
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

// ImgBB Upload Handler
async function uploadToImgBB(file) {
  if (!file) return existingImageUrl || "";
  imgProgress.classList.remove("hidden");
  imgBar.style.width = "10%";
  const formData = new FormData();
  formData.append("image", file);
  try {
    const res = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_KEY}`, {
      method: "POST",
      body: formData
    });
    imgBar.style.width = "70%";
    const data = await res.json();
    if (!data || !data.data || !data.data.url) {
      throw new Error("Invalid API response format");
    }
    imgBar.style.width = "100%";
    setTimeout(() => {
      imgProgress.classList.add("hidden");
      imgBar.style.width = "0%";
    }, 300);
    return data.data.url;
  } catch (err) {
    imgProgress.classList.add("hidden");
    imgBar.style.width = "0%";
    throw new Error("ImgBB upload failed: " + err.message);
  }
}

// Add or Edit Product Submit
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
  
  const categoryVal = document.getElementById("productCategory").value;
  const conditionVal = document.getElementById("productCondition").value;

  if (!sellerNameVal || !nameVal || !priceVal || !descVal || !emailVal) {
    return alert("Please fill all required fields.");
  }
  
  const file = imageFileInput.files[0];
  try {
    saveProductBtn.disabled = true;
    saveProductBtn.textContent = "Processing upload...";
    const imageUrl = await uploadToImgBB(file);
    
    const productObj = {
      seller: sellerNameVal,
      sellerId: user.uid,
      sellerEmail: user.email || user.providerData[0]?.email || "",
      name: nameVal,
      price: priceVal,
      desc: descVal,
      email: emailVal,
      phone: phoneVal,
      insta: instaVal,
      category: categoryVal,
      condition: conditionVal,
      image: imageUrl || "",
      time: Date.now()
    };
    
    if (editMode && editKey) {
      await update(ref(db, "products/" + editKey), productObj);
      alert("✅ Product updated successfully!");
    } else {
      await push(ref(db, "products"), productObj);
      alert("✅ Product added to campus list!");
    }
    hideProductForm();
  } catch (err) {
    console.error(err);
    alert("Error uploading/saving product: " + (err.message || err));
  } finally {
    saveProductBtn.disabled = false;
    saveProductBtn.textContent = editMode ? "Update Listing" : "Create Listing";
  }
});

// Load Seller Listings
function loadSellerProducts(uid) {
  const productsRef = ref(db, "products");
  onValue(productsRef, (snapshot) => {
    myProductsList.innerHTML = "";
    
    const statsTotal = document.getElementById("sellerTotalListings");
    
    const data = snapshot.val();
    if (!data) {
      if (statsTotal) statsTotal.textContent = "0";
      noProductsMsg.classList.remove("hidden");
      return;
    }
    
    const items = Object.entries(data)
      .filter(([key, val]) => val && val.sellerId === uid)
      .map(([key, val]) => ({ key, ...val }))
      .sort((a, b) => b.time - a.time);
      
    if (statsTotal) statsTotal.textContent = items.length;
    
    if (items.length === 0) {
      noProductsMsg.classList.remove("hidden");
      return;
    } else {
      noProductsMsg.classList.add("hidden");
    }
    
    items.forEach((p) => {
      const card = document.createElement("div");
      card.className = "glass-panel rounded-2xl overflow-hidden hover:border-slate-700/80 hover:shadow-lg transition-all duration-300 flex flex-col justify-between";
      
      const imgHtml = p.image 
        ? `<div class="w-full h-40 bg-slate-950 overflow-hidden border-b border-slate-900">
             <img src="${p.image}" class="w-full h-full object-cover">
           </div>`
        : `<div class="w-full h-40 bg-slate-900 border-b border-slate-900 flex items-center justify-center text-slate-600 text-2xl font-bold">📦</div>`;
      
      const categoryBadge = p.category 
        ? `<span class="px-2 py-0.5 rounded-full text-[9px] font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 uppercase tracking-wide">${p.category}</span>`
        : `<span class="px-2 py-0.5 rounded-full text-[9px] font-bold bg-slate-500/10 text-slate-400 border border-slate-800 uppercase tracking-wide">General</span>`;
        
      const conditionBadge = p.condition 
        ? `<span class="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase tracking-wide">${p.condition}</span>`
        : "";
      
      card.innerHTML = `
        <div>
          ${imgHtml}
          <div class="p-5">
            <div class="flex gap-1.5 mb-2.5 flex-wrap">
              ${categoryBadge}
              ${conditionBadge}
            </div>
            <h3 class="text-base font-extrabold text-slate-200 mb-1 leading-snug line-clamp-1">${escapeHtml(p.name)}</h3>
            <p class="text-xs text-cyan-400 font-extrabold mb-3">₹${escapeHtml(p.price)}</p>
            <p class="text-[11px] text-slate-400 line-clamp-2 h-7 mb-1">${escapeHtml(p.desc)}</p>
          </div>
        </div>
        <div class="px-5 pb-5 pt-3 border-t border-slate-800/60 flex gap-2">
          <button class="edit-btn flex-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 py-2 rounded-xl text-xs font-bold transition-all duration-300">
            Edit
          </button>
          <button class="del-btn flex-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 py-2 rounded-xl text-xs font-bold transition-all duration-300">
            Delete
          </button>
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
          category: p.category,
          condition: p.condition,
          image: p.image
        });
      });
      
      card.querySelector(".del-btn").addEventListener("click", async () => {
        const ok = confirm("Delete this product listing? This action cannot be undone.");
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

// Load Buyer Marketplace Feed
function loadProductsForBuyer() {
  const productsRef = ref(db, "products");
  onValue(productsRef, (snapshot) => {
    if (!snapshot.exists()) {
      buyerProducts = [];
      renderFilteredProducts();
      return;
    }
    const data = snapshot.val();
    buyerProducts = Object.entries(data).map(([key, val]) => ({
      key,
      ...val
    }));
    renderFilteredProducts();
  });
}

// Filter and Render products inside Buyer view
function renderFilteredProducts() {
  const list = document.getElementById("productList");
  list.innerHTML = "";
  
  if (buyerProducts.length === 0) {
    list.innerHTML = `
      <div class="col-span-full glass-panel p-12 text-center rounded-2xl">
        <p class="text-slate-400 text-sm">No listings available on the marketplace yet 😔</p>
      </div>`;
    return;
  }
  
  // Filter products by selected category and search input
  let filtered = buyerProducts.filter((p) => {
    const catMatch = selectedCategory === "All" || (p.category && p.category === selectedCategory);
    
    const textStr = ((p.name || "") + " " + (p.desc || "") + " " + (p.seller || "") + " " + (p.category || "")).toLowerCase();
    const keyMatch = !searchKeyword || textStr.includes(searchKeyword.toLowerCase());
    
    return catMatch && keyMatch;
  });
  
  // Sort listings
  if (sortBy === "latest") {
    filtered.sort((a, b) => b.time - a.time);
  } else if (sortBy === "price-asc") {
    filtered.sort((a, b) => Number(a.price || 0) - Number(b.price || 0));
  } else if (sortBy === "price-desc") {
    filtered.sort((a, b) => Number(b.price || 0) - Number(a.price || 0));
  }
  
  if (filtered.length === 0) {
    list.innerHTML = `
      <div class="col-span-full glass-panel p-12 text-center rounded-2xl">
        <p class="text-slate-400 text-sm">No items found matching details 🔍</p>
      </div>`;
    return;
  }
  
  filtered.forEach((p) => {
    const card = document.createElement("div");
    card.className = "glass-panel rounded-2xl overflow-hidden hover:scale-[1.01] hover:border-indigo-500/40 hover:shadow-indigo-500/5 hover:shadow-xl transition-all duration-300 flex flex-col justify-between cursor-pointer";
    
    const imgHtml = p.image 
      ? `<div class="w-full h-48 bg-slate-950 overflow-hidden relative border-b border-slate-900">
           <img src="${p.image}" class="w-full h-full object-cover">
         </div>`
      : `<div class="w-full h-48 bg-slate-900 border-b border-slate-900 flex items-center justify-center text-slate-650 text-3xl font-bold">
           📦
         </div>`;
         
    const categoryBadge = p.category 
      ? `<span class="px-2.5 py-0.5 rounded-full text-[9px] font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 uppercase tracking-wide">${p.category}</span>`
      : `<span class="px-2.5 py-0.5 rounded-full text-[9px] font-bold bg-slate-500/10 text-slate-400 border border-slate-800 uppercase tracking-wide">General</span>`;
      
    const conditionBadge = p.condition 
      ? `<span class="px-2.5 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase tracking-wide">${p.condition}</span>`
      : "";
      
    card.innerHTML = `
      <div>
        ${imgHtml}
        <div class="p-5">
          <div class="flex gap-1.5 mb-3 flex-wrap">
            ${categoryBadge}
            ${conditionBadge}
          </div>
          <h3 class="text-base font-extrabold text-slate-100 mb-1 leading-snug line-clamp-1">${escapeHtml(p.name)}</h3>
          <p class="text-xs text-slate-400 line-clamp-2 mb-3 h-8">${escapeHtml(p.desc)}</p>
          <div class="flex justify-between items-center pt-3 border-t border-slate-850">
            <span class="text-xs text-slate-400">Seller: <strong class="text-slate-200">${escapeHtml(p.seller)}</strong></span>
            <span class="text-base font-black text-cyan-400">₹${escapeHtml(p.price)}</span>
          </div>
        </div>
      </div>
      <div class="px-5 pb-5">
        <button class="w-full bg-slate-900/80 hover:bg-indigo-600 hover:text-white border border-slate-800 hover:border-indigo-600 text-indigo-400 font-bold text-xs py-3.5 px-4 rounded-xl transition-all duration-300">
          View Details & Contact
        </button>
      </div>
    `;
    
    card.addEventListener("click", (e) => {
      openProductDetail(p);
    });
    
    list.appendChild(card);
  });
}

// Buyer search input listener
const searchInput = document.getElementById("searchProductInput");
if (searchInput) {
  searchInput.addEventListener("input", (e) => {
    searchKeyword = e.target.value;
    renderFilteredProducts();
  });
}

// Buyer sorting option change
const sortSelect = document.getElementById("sortSelect");
if (sortSelect) {
  sortSelect.addEventListener("change", (e) => {
    sortBy = e.target.value;
    renderFilteredProducts();
  });
}

// Buyer Category filter buttons binding
const catPills = document.querySelectorAll(".cat-pill");
catPills.forEach((pill) => {
  pill.addEventListener("click", (e) => {
    catPills.forEach((p) => {
      p.classList.remove("bg-indigo-500", "text-white");
      p.classList.add("bg-slate-900", "text-slate-300");
    });
    pill.classList.remove("bg-slate-900", "text-slate-300");
    pill.classList.add("bg-indigo-500", "text-white");
    
    selectedCategory = pill.getAttribute("data-cat");
    renderFilteredProducts();
  });
});

// Product detail popup display
const detailModal = document.getElementById("productDetailModal");
const closeDetailBtn = document.getElementById("closeDetailModalBtn");

function openProductDetail(p) {
  const detailImg = document.getElementById("detailImg");
  detailImg.src = p.image || "";
  if (!p.image) {
    detailImg.parentElement.classList.add("hidden");
  } else {
    detailImg.parentElement.classList.remove("hidden");
  }
  
  document.getElementById("detailName").textContent = p.name;
  document.getElementById("detailPrice").textContent = "₹" + p.price;
  document.getElementById("detailDesc").textContent = p.desc;
  document.getElementById("detailCategory").textContent = p.category || "General";
  document.getElementById("detailCondition").textContent = p.condition || "Used";
  document.getElementById("detailSeller").textContent = p.seller;
  
  const avatar = document.getElementById("detailAvatar");
  if (avatar) {
    avatar.textContent = (p.seller || "U").trim().charAt(0).toUpperCase();
  }
  
  // Set contact anchors links
  const emailBtn = document.getElementById("detailEmailBtn");
  emailBtn.href = `mailto:${p.email || p.sellerEmail}?subject=Interest%20in%20item%20"${encodeURIComponent(p.name)}"%20on%20CollegeMarket`;
  
  const whatsappBtn = document.getElementById("detailWhatsappBtn");
  if (p.phone) {
    let rawPhone = p.phone.trim().replace(/\D/g, "");
    if (rawPhone.length === 10) {
      rawPhone = "91" + rawPhone; // Assume Indian phone format as default
    }
    whatsappBtn.href = `https://wa.me/${rawPhone}?text=Hi%20${encodeURIComponent(p.seller)},%20I%20am%20interested%20in%20your%20listing%20"${encodeURIComponent(p.name)}"%20(Price:%20INR%20${p.price})%2520on%20CollegeMarket.`;
    whatsappBtn.classList.remove("hidden");
  } else {
    whatsappBtn.classList.add("hidden");
  }
  
  const callBtn = document.getElementById("detailCallBtn");
  if (p.phone) {
    callBtn.href = `tel:${p.phone}`;
    callBtn.classList.remove("hidden");
  } else {
    callBtn.classList.add("hidden");
  }
  
  const instaBtn = document.getElementById("detailInstaBtn");
  if (p.insta) {
    const instaUser = p.insta.trim().replace(/^@/, "");
    instaBtn.href = `https://instagram.com/${instaUser}`;
    instaBtn.classList.remove("hidden");
  } else {
    instaBtn.classList.add("hidden");
  }
  
  detailModal.classList.remove("hidden");
}

if (closeDetailBtn) {
  closeDetailBtn.onclick = () => {
    detailModal.classList.add("hidden");
  };
}

// Close modals when clicking outside contents overlay
window.addEventListener("click", (e) => {
  if (e.target === detailModal) {
    detailModal.classList.add("hidden");
  }
  if (e.target === productFormContainer) {
    hideProductForm();
  }
});

// HTML escaping helper function
function escapeHtml(text) {
  if (!text && text !== 0) return "";
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
