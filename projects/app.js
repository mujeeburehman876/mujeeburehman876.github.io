// ============================================
// FIREBASE CONFIGURATION
// ============================================
// REPLACE THESE WITH YOUR ACTUAL FIREBASE CONFIG

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { 
    getAuth, 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    sendEmailVerification
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { 
    getFirestore, 
    collection, 
    doc, 
    setDoc, 
    getDoc, 
    getDocs, 
    updateDoc, 
    deleteDoc,
    query,
    where,
    orderBy,
    addDoc,
    serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// Your Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyCxZHeN6T_duSGRis2api7vp84pmNcWW0c",
    authDomain: "gorsaryshop.firebaseapp.com",
    projectId: "gorsaryshop",
    storageBucket: "gorsaryshop.firebasestorage.app",
    messagingSenderId: "561619543692",
    appId: "1:561619543692:web:ed5ec19f92f654d9b2bda9",
    measurementId: "G-3QX3K67V93"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// ============================================
// STATE VARIABLES
// ============================================
let currentUser = null;
let currentRole = null;
let currentUsername = null;
let selectedRole = null;
let cart = [];


// ============================================
// UTILITY FUNCTIONS
// ============================================

function showLoading(show = true) {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) {
        overlay.classList.toggle('active', show);
    }
}

function showError(message) {
    const errorEl = document.getElementById('auth-error');
    if (errorEl) {
        errorEl.textContent = message;
        errorEl.style.display = 'block';
        setTimeout(() => {
            errorEl.style.display = 'none';
        }, 5000);
    }
}

function showSuccess(message) {
    const successEl = document.getElementById('auth-success');
    if (successEl) {
        successEl.textContent = message;
        successEl.style.display = 'block';
        setTimeout(() => {
            successEl.style.display = 'none';
        }, 3000);
    }
}

function switchView(viewId) {
    console.log("🔄 Switching to view:", viewId);
    document.querySelectorAll('.view').forEach(v => {
        v.classList.remove('active');
    });
    const targetView = document.getElementById(viewId);
    if (targetView) {
        targetView.classList.add('active');
        console.log("✅ View switched to:", viewId);
    } else {
        console.error("❌ View not found:", viewId);
    }
}

// ============================================
// ROLE SELECTION
// ============================================

window.selectRole = function(role) {
    console.log("👤 Role selected:", role);
    selectedRole = role;
    switchView('auth-view');
    const indicator = document.getElementById('auth-role-indicator');
    if (indicator) {
        indicator.textContent = `Logging in as ${role.charAt(0).toUpperCase() + role.slice(1)}`;
    }
}

window.backToWelcome = function() {
    switchView('welcome-view');
    selectedRole = null;
    toggleAuth('login');
}

// ============================================
// AUTH FORM TOGGLE
// ============================================

window.toggleAuth = function(mode) {
    const authError = document.getElementById('auth-error');
    const authSuccess = document.getElementById('auth-success');
    if (authError) authError.style.display = 'none';
    if (authSuccess) authSuccess.style.display = 'none';
    
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const otpForm = document.getElementById('otp-form');
    const title = document.getElementById('auth-title');
    
    // Hide all forms
    if (loginForm) loginForm.style.display = 'none';
    if (registerForm) registerForm.style.display = 'none';
    if (otpForm) otpForm.style.display = 'none';
    
    if (mode === 'register') {
        if (title) title.textContent = 'Register';
        if (registerForm) registerForm.style.display = 'block';
    } else {
        if (title) title.textContent = 'Login';
        if (loginForm) loginForm.style.display = 'block';
    }
}

// ============================================
// REGISTRATION
// ============================================

const registerForm = document.getElementById('register-form');
if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        showLoading(true);
        
        const email = document.getElementById('reg-email').value.trim();
        const username = document.getElementById('reg-username').value.trim();
        const password = document.getElementById('reg-pass').value;
        const confirmPass = document.getElementById('reg-confirm-pass').value;
        
        console.log("📝 Registration attempt:", { email, username, role: selectedRole });
        
        // Validation
        if (password !== confirmPass) {
            showLoading(false);
            showError("Passwords do not match!");
            return;
        }
        
        if (password.length < 6) {
            showLoading(false);
            showError("Password must be at least 6 characters!");
            return;
        }
        
        if (username.length < 3) {
            showLoading(false);
            showError("Username must be at least 3 characters!");
            return;
        }
        
        try {
            // Check if trying to register as admin
            if (selectedRole === 'admin') {
                const adminsRef = collection(db, 'users');
                const adminQuery = query(adminsRef, where('role', '==', 'admin'));
                const adminSnapshot = await getDocs(adminQuery);
                
                if (!adminSnapshot.empty) {
                    showLoading(false);
                    showError("Admin already exists! Please try logging in instead.");
                    return;
                }
            }
            
            // Check if username exists
            const usersRef = collection(db, 'users');
            const usernameQuery = query(usersRef, where('username', '==', username));
            const usernameSnapshot = await getDocs(usernameQuery);
            
            if (!usernameSnapshot.empty) {
                showLoading(false);
                showError("Username already taken! Please choose another.");
                return;
            }
            
            // Create Firebase Auth account
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;
            
            console.log("✅ User created in Auth:", user.uid);
            
            // Send email verification
            try {
                await sendEmailVerification(user);
                console.log("📧 Verification email sent to:", email);
            } catch (emailError) {
                console.warn("⚠️ Email verification send failed:", emailError.message);
                // Continue anyway - user can still use the account
            }
            
            // Create user document in Firestore
            await setDoc(doc(db, 'users', user.uid), {
                email: email,
                username: username,
                role: selectedRole,
                createdAt: serverTimestamp(),
                emailVerified: false
            });
            
            console.log("✅ User document created in Firestore");
            
            showLoading(false);
            showSuccess("Registration successful! Check your email for verification link, then login.");
            
            // Reset form
            registerForm.reset();
            
            // Switch to login after 2 seconds
            setTimeout(() => {
                toggleAuth('login');
            }, 2000);
            
        } catch (error) {
            showLoading(false);
            console.error("❌ Registration error:", error);
            
            if (error.code === 'auth/email-already-in-use') {
                showError("Email already registered! Please login instead.");
            } else if (error.code === 'auth/invalid-email') {
                showError("Invalid email format!");
            } else if (error.code === 'auth/weak-password') {
                showError("Password is too weak!");
            } else {
                showError("Registration failed: " + error.message);
            }
        }
    });
}

// ============================================
// LOGIN
// ============================================

const loginForm = document.getElementById('login-form');
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        showLoading(true);
        
        const usernameOrEmail = document.getElementById('login-username').value.trim();
        const password = document.getElementById('login-pass').value;
        
        console.log("🔐 Login attempt:", { usernameOrEmail, role: selectedRole });
        
        try {
            let email = usernameOrEmail;
            let userDataFromQuery = null;
            
            // If username provided, look up email
            if (!usernameOrEmail.includes('@')) {
                console.log("🔍 Looking up username:", usernameOrEmail);
                const usersRef = collection(db, 'users');
                const usernameQuery = query(usersRef, where('username', '==', usernameOrEmail));
                const snapshot = await getDocs(usernameQuery);
                
                if (snapshot.empty) {
                    showLoading(false);
                    showError("Username or password is wrong or invalid credentials");
                    return;
                }
                
                userDataFromQuery = snapshot.docs[0].data();
                email = userDataFromQuery.email;
                console.log("✅ Found email for username:", email);
                
                // Check role match
                if (userDataFromQuery.role !== selectedRole) {
                    showLoading(false);
                    showError(`This account is registered as ${userDataFromQuery.role}. Please select the correct login type.`);
                    return;
                }
            }
            
            // Sign in
            console.log("🔐 Signing in with email:", email);
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;
            
            console.log("✅ Sign in successful! UID:", user.uid);
            
            // Get user data if we don't have it yet
            if (!userDataFromQuery) {
                const userDoc = await getDoc(doc(db, 'users', user.uid));
                if (!userDoc.exists()) {
                    await signOut(auth);
                    showLoading(false);
                    showError("User data not found!");
                    return;
                }
                userDataFromQuery = userDoc.data();
            }
            
            // Verify role matches
            if (userDataFromQuery.role !== selectedRole) {
                await signOut(auth);
                showLoading(false);
                showError(`This account is registered as ${userDataFromQuery.role}. Please select the correct login type.`);
                return;
            }
            
            // Update last login
            await updateDoc(doc(db, 'users', user.uid), {
                lastLogin: serverTimestamp()
            });
            
            console.log("🎉 Login successful! Waiting for auth state...");
            showLoading(false);
            showSuccess("Login successful!");
            
            // onAuthStateChanged will handle the rest
            
        } catch (error) {
            showLoading(false);
            console.error("❌ Login error:", error);
            
            if (error.code === 'auth/wrong-password' || 
                error.code === 'auth/user-not-found' || 
                error.code === 'auth/invalid-credential' ||
                error.code === 'auth/invalid-login-credentials') {
                showError("Username or password is wrong or invalid credentials");
            } else if (error.code === 'auth/too-many-requests') {
                showError("Too many failed attempts. Please try again later.");
            } else {
                showError("Login failed: " + error.message);
            }
        }
    });
}

// ============================================
// LOGOUT
// ============================================

window.handleLogout = async function() {
    try {
        await signOut(auth);
        cart = [];
        currentUser = null;
        currentRole = null;
        currentUsername = null;
        selectedRole = null;
        console.log("👋 Logged out successfully");
        window.location.reload();
    } catch (error) {
        console.error("❌ Logout error:", error);
        alert("Logout failed: " + error.message);
    }
}

// ============================================
// SESSION MANAGEMENT - FIXED
// ============================================

onAuthStateChanged(auth, async (user) => {
    console.log("🔍 Auth state changed. User:", user ? user.uid : "none");
    
    if (user) {
        try {
            console.log("✅ User is authenticated:", user.uid);
            
            const userDocRef = doc(db, 'users', user.uid);
            const userDoc = await getDoc(userDocRef);
            
            console.log("📄 User doc exists:", userDoc.exists());
            
            if (userDoc.exists()) {
                const userData = userDoc.data();
                console.log("📊 User data:", userData);
                
                currentUser = user;
                currentRole = userData.role;
                currentUsername = userData.username;
                
                console.log("🎯 Role:", currentRole);
                
                // Hide all views
                document.querySelectorAll('.view').forEach(v => {
                    v.classList.remove('active');
                });
                
                // Show correct dashboard
                if (currentRole === 'admin') {
                    console.log("🔧 Loading admin dashboard...");
                    const adminView = document.getElementById('admin-view');
                    if (adminView) {
                        adminView.classList.add('active');
                        console.log("✅ Admin view activated");
                    }
                    
                    const adminUsername = document.getElementById('admin-username');
                    if (adminUsername) {
                        adminUsername.textContent = `@${currentUsername}`;
                    }
                    
                    loadAdminProducts();
                    loadSalesHistory();
                } else {
                    console.log("🛒 Loading client dashboard...");
                    const clientView = document.getElementById('client-view');
                    if (clientView) {
                        clientView.classList.add('active');
                        console.log("✅ Client view activated");
                    }
                    
                    const clientUsername = document.getElementById('client-username');
                    const clientEmail = document.getElementById('client-email');
                    if (clientUsername) clientUsername.textContent = `@${currentUsername}`;
                    if (clientEmail) clientEmail.textContent = user.email;
                    
                    loadClientProducts();
                    loadOrderHistory();
                }
                
                console.log("🎉 Dashboard loaded!");
            } else {
                console.error("❌ User document not found!");
                alert("User data not found. Please contact administrator.");
                await signOut(auth);
                switchView('welcome-view');
            }
        } catch (error) {
            console.error("❌ Session error:", error);
            console.error("Error details:", error.message);
            switchView('welcome-view');
        }
    } else {
        console.log("⚠️ No user - showing welcome");
        switchView('welcome-view');
    }
});

// ============================================
// ADMIN: PRODUCT MANAGEMENT
// ============================================

async function loadAdminProducts() {
    try {
        console.log("📦 Loading admin products...");
        const productsRef = collection(db, 'products');
        const productsQuery = query(productsRef, orderBy('name'));
        const snapshot = await getDocs(productsQuery);
        
        const tbody = document.querySelector('#admin-table tbody');
        if (!tbody) return;
        
        tbody.innerHTML = '';
        
        if (snapshot.empty) {
            tbody.innerHTML = '<tr><td colspan="4" class="loading">No products yet. Add your first product!</td></tr>';
            return;
        }
        
        snapshot.forEach(docSnap => {
            const product = { id: docSnap.id, ...docSnap.data() };
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${product.name}</strong></td>
                <td>$${product.price.toFixed(2)}</td>
                <td>${product.stock}</td>
                <td>
                    <button class="action-btn edit" onclick='editProduct(${JSON.stringify(product)})'>Edit</button>
                    <button class="action-btn delete" onclick="deleteProduct('${product.id}')">Delete</button>
                </td>
            `;
            tbody.appendChild(tr);
        });
        
        console.log("✅ Products loaded:", snapshot.size);
    } catch (error) {
        console.error("❌ Error loading products:", error);
    }
}

window.saveProduct = async function() {
    const id = document.getElementById('prod-id').value;
    const name = document.getElementById('prod-name').value.trim();
    const price = parseFloat(document.getElementById('prod-price').value);
    const stock = parseInt(document.getElementById('prod-stock').value);
    
    if (!name || isNaN(price) || isNaN(stock)) {
        alert("Please fill all fields correctly");
        return;
    }
    
    if (price < 0 || stock < 0) {
        alert("Price and stock cannot be negative");
        return;
    }
    
    showLoading(true);
    
    try {
        const productData = {
            name: name,
            price: price,
            stock: stock,
            updatedAt: serverTimestamp()
        };
        
        if (id) {
            await updateDoc(doc(db, 'products', id), productData);
            showSuccess("Product updated successfully!");
        } else {
            productData.createdAt = serverTimestamp();
            await addDoc(collection(db, 'products'), productData);
            showSuccess("Product added successfully!");
        }
        
        resetProdForm();
        loadAdminProducts();
    } catch (error) {
        console.error("❌ Error saving product:", error);
        alert("Failed to save product: " + error.message);
    } finally {
        showLoading(false);
    }
}

window.editProduct = function(product) {
    document.getElementById('prod-id').value = product.id;
    document.getElementById('prod-name').value = product.name;
    document.getElementById('prod-price').value = product.price;
    document.getElementById('prod-stock').value = product.stock;
    
    document.querySelector('.card').scrollIntoView({ behavior: 'smooth' });
}

window.deleteProduct = async function(id) {
    if (!confirm("Are you sure you want to delete this product?")) {
        return;
    }
    
    showLoading(true);
    
    try {
        await deleteDoc(doc(db, 'products', id));
        showSuccess("Product deleted successfully!");
        loadAdminProducts();
    } catch (error) {
        console.error("❌ Error deleting product:", error);
        alert("Failed to delete product");
    } finally {
        showLoading(false);
    }
}

window.resetProdForm = function() {
    document.getElementById('prod-id').value = '';
    document.getElementById('prod-name').value = '';
    document.getElementById('prod-price').value = '';
    document.getElementById('prod-stock').value = '';
}

// ============================================
// ADMIN: SALES HISTORY
// ============================================

async function loadSalesHistory() {
    try {
        console.log("💰 Loading sales history...");
        
        const salesRef = collection(db, 'sales');
        const salesQuery = query(salesRef, orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(salesQuery);
        
        console.log("📊 Sales found:", snapshot.size);
        
        const tbody = document.querySelector('#sales-table tbody');
        if (!tbody) {
            console.error("❌ Sales table not found");
            return;
        }
        
        tbody.innerHTML = '';
        
        if (snapshot.empty) {
            tbody.innerHTML = '<tr><td colspan="4" class="loading">No sales yet</td></tr>';
            return;
        }
        
        for (const docSnap of snapshot.docs) {
            const sale = docSnap.data();
            
            const userDoc = await getDoc(doc(db, 'users', sale.userId));
            const username = userDoc.exists() ? userDoc.data().username : 'Unknown';
            
            const date = sale.createdAt ? new Date(sale.createdAt.seconds * 1000).toLocaleString() : 'N/A';
            
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${date}</td>
                <td>@${username}</td>
                <td><strong>$${sale.totalAmount.toFixed(2)}</strong></td>
                <td><span class="status-badge status-completed">Completed</span></td>
            `;
            tbody.appendChild(tr);
        }
        
        console.log("✅ Sales history loaded successfully");
    } catch (error) {
        console.error("❌ Error loading sales:", error);
        console.error("Error details:", error.message);
    }
}

// ============================================
// CLIENT: PRODUCT BROWSING
// ============================================

async function loadClientProducts() {
    try {
        console.log("🛍️ Loading client products...");
        const productsRef = collection(db, 'products');
        const snapshot = await getDocs(productsRef);
        
        const grid = document.getElementById('products-list');
        if (!grid) return;
        
        grid.innerHTML = '';
        
        if (snapshot.empty) {
            grid.innerHTML = '<div class="loading-card">No products available</div>';
            return;
        }
        
        snapshot.forEach(docSnap => {
            const product = { id: docSnap.id, ...docSnap.data() };
            
            if (product.stock > 0) {
                const div = document.createElement('div');
                div.className = 'product-card';
                div.innerHTML = `
                    <h4>${product.name}</h4>
                    <span class="product-price">$${product.price.toFixed(2)}</span>
                    <small>Stock: ${product.stock}</small><br><br>
                    <button class="btn" onclick='addToCart(${JSON.stringify(product)})'>Add to Cart</button>
                `;
                grid.appendChild(div);
            }
        });
        
        console.log("✅ Client products loaded");
    } catch (error) {
        console.error("❌ Error loading products:", error);
    }
}

// ============================================
// CLIENT: CART MANAGEMENT
// ============================================

window.addToCart = function(product) {
    const existing = cart.find(item => item.id === product.id);
    
    if (existing) {
        if (existing.qty < product.stock) {
            existing.qty++;
            showSuccess(`Added another ${product.name} to cart`);
        } else {
            alert("Cannot add more - maximum stock reached");
            return;
        }
    } else {
        cart.push({ ...product, qty: 1 });
        showSuccess(`${product.name} added to cart`);
    }
    
    renderCart();
}

function renderCart() {
    const container = document.getElementById('cart-items');
    const totalEl = document.getElementById('cart-total');
    
    if (!container || !totalEl) return;
    
    container.innerHTML = '';
    let total = 0;
    
    if (cart.length === 0) {
        container.innerHTML = '<p class="empty-cart">🛒 Cart is empty</p>';
        totalEl.textContent = '$0.00';
        return;
    }
    
    cart.forEach((item, index) => {
        total += item.price * item.qty;
        const div = document.createElement('div');
        div.className = 'cart-item';
        div.innerHTML = `
            <div>
                <strong>${item.name}</strong><br>
                <small>$${item.price.toFixed(2)} × ${item.qty}</small>
            </div>
            <div style="display: flex; align-items: center;">
                <strong>$${(item.price * item.qty).toFixed(2)}</strong>
                <button onclick="removeFromCart(${index})" class="remove-btn">&times;</button>
            </div>
        `;
        container.appendChild(div);
    });
    
    totalEl.textContent = '$' + total.toFixed(2);
}

window.removeFromCart = function(index) {
    const item = cart[index];
    cart.splice(index, 1);
    showSuccess(`${item.name} removed from cart`);
    renderCart();
}

// ============================================
// CLIENT: CHECKOUT
// ============================================

window.checkout = async function() {
    if (cart.length === 0) {
        alert("Cart is empty! Add some products first.");
        return;
    }
    
    const totalEl = document.getElementById('cart-total');
    const totalText = totalEl ? totalEl.textContent : '$0.00';
    
    if (!confirm(`Proceed with checkout? Total: ${totalText}`)) {
        return;
    }
    
    showLoading(true);
    
    try {
        const total = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
        
        console.log("💳 Processing checkout...");
        console.log("Cart items:", cart);
        console.log("Total amount:", total);
        
        // Create sale record
        const saleDoc = await addDoc(collection(db, 'sales'), {
            userId: currentUser.uid,
            username: currentUsername,
            totalAmount: total,
            items: cart.map(item => ({
                productId: item.id,
                name: item.name,
                price: item.price,
                qty: item.qty
            })),
            createdAt: serverTimestamp()
        });
        
        console.log("✅ Sale record created:", saleDoc.id);
        
        // Update stock
        for (const item of cart) {
            const productRef = doc(db, 'products', item.id);
            const productDoc = await getDoc(productRef);
            
            if (productDoc.exists()) {
                const currentStock = productDoc.data().stock;
                await updateDoc(productRef, {
                    stock: currentStock - item.qty
                });
                console.log(`✅ Stock updated for ${item.name}: ${currentStock} → ${currentStock - item.qty}`);
            }
        }
        
        showLoading(false);
        alert("🎉 Order placed successfully! Thank you for your purchase.");
        
        cart = [];
        renderCart();
        loadClientProducts();
        
        // Reload order history after a short delay to ensure Firestore has updated
        setTimeout(() => {
            loadOrderHistory();
        }, 1000);
        
        console.log("✅ Checkout complete!");
        
    } catch (error) {
        showLoading(false);
        console.error("❌ Checkout error:", error);
        console.error("Error details:", error.message);
        alert("Checkout failed: " + error.message);
    }
}

// ============================================
// CLIENT: ORDER HISTORY - FIXED
// ============================================

async function loadOrderHistory() {
    try {
        console.log("📦 Loading order history for user:", currentUser.uid);
        
        const salesRef = collection(db, 'sales');
        const salesQuery = query(
            salesRef, 
            where('userId', '==', currentUser.uid), 
            orderBy('createdAt', 'desc')
        );
        const snapshot = await getDocs(salesQuery);
        
        console.log("📊 Orders found:", snapshot.size);
        
        const tbody = document.querySelector('#order-history-table tbody');
        if (!tbody) {
            console.error("❌ Order history table not found");
            return;
        }
        
        tbody.innerHTML = '';
        
        if (snapshot.empty) {
            tbody.innerHTML = '<tr><td colspan="3" class="loading">No orders yet. Start shopping!</td></tr>';
            console.log("ℹ️ No orders found for this user");
            return;
        }
        
        snapshot.forEach(docSnap => {
            const order = docSnap.data();
            const date = order.createdAt ? new Date(order.createdAt.seconds * 1000).toLocaleString() : 'N/A';
            
            console.log("📦 Order:", {
                id: docSnap.id,
                date: date,
                amount: order.totalAmount,
                items: order.items
            });
            
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${date}</td>
                <td><strong>$${order.totalAmount.toFixed(2)}</strong></td>
                <td><span class="status-badge status-completed">Completed</span></td>
            `;
            tbody.appendChild(tr);
        });
        
        console.log("✅ Order history loaded successfully");
    } catch (error) {
        console.error("❌ Error loading order history:", error);
        console.error("Error code:", error.code);
        console.error("Error details:", error.message);
        
        const tbody = document.querySelector('#order-history-table tbody');
        if (tbody) {
            if (error.code === 'failed-precondition') {
                tbody.innerHTML = '<tr><td colspan="3" class="loading">⚠️ Database index required. Check console for link.</td></tr>';
                console.error("🔗 Create index at:", error.message);
            } else {
                tbody.innerHTML = '<tr><td colspan="3" class="loading">Error loading orders. Check console for details.</td></tr>';
            }
        }
    }
}

// ============================================
// INITIALIZE
// ============================================

console.log("🚀 GSMS System initialized");
console.log("📡 Waiting for authentication state...");