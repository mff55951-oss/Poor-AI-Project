// ==========================================
// Poor AI - Authentication & User Management
// ==========================================

import { auth, db, googleProvider, signInWithPopup, signOut, onAuthStateChanged, doc, setDoc, getDoc } from './firebase-config.js';

// ⚠️ আপনার অ্যাডমিন ইমেইল
const ADMIN_EMAIL = "mdeyasin855927@gmail.com";

// DOM Elements
const userProfileSection = document.getElementById('user-profile-section');
const userAvatar = document.getElementById('user-avatar');
const userName = document.getElementById('user-name');
const userStatus = document.getElementById('user-status');
const loginIcon = userProfileSection.querySelector('.material-symbols-outlined');

// ==========================================
// 1. Auth State Observer (লগইন চেক করা)
// ==========================================
onAuthStateChanged(auth, async (user) => {
    if (user) {
        // ইউজার লগইন অবস্থায় আছে
        updateUIForLoggedInUser(user);
        await saveAndCheckUserInDB(user);
    } else {
        // ইউজার লগআউট অবস্থায় আছে
        updateUIForLoggedOutUser();
    }
});

// ==========================================
// 2. Database Logic (ডাটাবেসে ইউজার সেভ করা)
// ==========================================
async function saveAndCheckUserInDB(user) {
    try {
        const userRef = doc(db, 'users', user.uid);
        const userSnap = await getDoc(userRef);
        
        let isPro = false;
        let role = 'user';

        // চেক করা হচ্ছে আপনি লগইন করেছেন কিনা
        if (user.email === ADMIN_EMAIL) {
            role = 'admin';
            isPro = true; // অ্যাডমিন সব ফিচার ফ্রিতে পাবে
            
            // অ্যাডমিন প্যানেলে যাওয়ার একটি বাটন যুক্ত করা
            addAdminButton();
        }

        if (!userSnap.exists()) {
            // নতুন ইউজার হলে ডাটাবেসে সেভ করা
            await setDoc(userRef, {
                name: user.displayName,
                email: user.email,
                photoURL: user.photoURL,
                isPro: isPro,
                role: role,
                createdAt: new Date().toISOString(),
                lastLogin: new Date().toISOString()
            });
        } else {
            // পুরনো ইউজার হলে প্রো-স্ট্যাটাস চেক করা এবং লাস্ট লগইন আপডেট করা
            isPro = userSnap.data().isPro || false;
            role = userSnap.data().role || role;
            await setDoc(userRef, { lastLogin: new Date().toISOString() }, { merge: true });
        }

        // ইউজারের স্ট্যাটাস UI তে আপডেট করা (Free/Pro/Admin)
        updateUserStatus(role, isPro);
        
        // গ্লোবাল ভেরিয়েবলে প্রো স্ট্যাটাস রাখা (যাতে app.js চেক করতে পারে)
        window.currentUserIsPro = isPro; 

    } catch (error) {
        console.error("Error fetching user data:", error);
    }
}

// ==========================================
// 3. UI Update Logic (লুক পরিবর্তন করা)
// ==========================================
function updateUIForLoggedInUser(user) {
    userAvatar.innerHTML = `<img src="${user.photoURL}" class="w-full h-full rounded-full border border-gray-600" referrerpolicy="no-referrer">`;
    userName.textContent = user.displayName;
    loginIcon.textContent = "logout";
    loginIcon.classList.replace("text-gray-500", "text-red-400");
    loginIcon.title = "Click to Logout";
}

function updateUIForLoggedOutUser() {
    userAvatar.innerHTML = `?`;
    userName.textContent = "Guest User";
    userStatus.textContent = "Free Tier";
    userStatus.className = "text-xs text-gray-500";
    loginIcon.textContent = "login";
    loginIcon.classList.replace("text-red-400", "text-gray-500");
    loginIcon.title = "Click to Login";
    window.currentUserIsPro = false;
    
    // Remove Admin button if exists
    const adminBtn = document.getElementById('admin-dashboard-btn');
    if(adminBtn) adminBtn.remove();
}

function updateUserStatus(role, isPro) {
    if (role === 'admin') {
        userStatus.textContent = "Admin 👑";
        userStatus.className = "text-xs font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500";
    } else if (isPro) {
        userStatus.textContent = "Pro User 🌟";
        userStatus.className = "text-xs font-bold text-amber-500";
    } else {
        userStatus.textContent = "Free Tier";
        userStatus.className = "text-xs text-gray-500";
    }
}

function addAdminButton() {
    if (!document.getElementById('admin-dashboard-btn')) {
        const adminBtnHtml = `
            <a href="admin.html" id="admin-dashboard-btn" class="flex items-center justify-center gap-2 px-4 py-2 mt-2 rounded-lg bg-purple-600/20 text-purple-400 border border-purple-500/30 hover:bg-purple-600/30 transition-colors font-medium text-sm">
                <span class="material-symbols-outlined text-[18px]">admin_panel_settings</span>
                Admin Panel
            </a>
        `;
        document.getElementById('upgrade-pro-btn').insertAdjacentHTML('afterend', adminBtnHtml);
    }
}

// ==========================================
// 4. Click Handlers (লগইন/লগআউট বাটন)
// ==========================================
userProfileSection.addEventListener('click', async () => {
    if (auth.currentUser) {
        // লগআউট
        if (confirm("Are you sure you want to log out?")) {
            try {
                await signOut(auth);
            } catch (error) {
                console.error("Logout error:", error);
            }
        }
    } else {
        // লগইন (Google)
        try {
            await signInWithPopup(auth, googleProvider);
        } catch (error) {
            console.error("Login error:", error);
            alert("Login failed! Please try again.");
        }
    }
});

