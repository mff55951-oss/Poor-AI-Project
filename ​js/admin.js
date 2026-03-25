// ==========================================
// Poor AI - Master Admin Logic (Advanced)
// ==========================================

import { auth, db, getDocs, collection, doc, setDoc, onAuthStateChanged } from './firebase-config.js';

// ⚠️ আপনার সিক্রেট অ্যাডমিন ইমেইল
const ADMIN_EMAIL = "mdeyasin855927@gmail.com";

document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const accessDenied = document.getElementById('access-denied');
    const adminLoading = document.getElementById('admin-loading');
    const adminSidebar = document.getElementById('admin-sidebar');
    const adminMain = document.getElementById('admin-main');
    const usersTableBody = document.getElementById('users-table-body');
    const refreshBtn = document.getElementById('refresh-users');
    const searchInput = document.getElementById('user-search');

    // Stat Elements
    const statTotal = document.getElementById('stat-total-users');
    const statPro = document.getElementById('stat-pro-users');
    const statFree = document.getElementById('stat-free-users');

    let allUsersData = []; // সার্চ করার সুবিধার জন্য ডাটা এখানে স্টোর হবে

    // ==========================================
    // 1. Verify Master Admin Access
    // ==========================================
    onAuthStateChanged(auth, (user) => {
        if (user && user.email === ADMIN_EMAIL) {
            // Success: আপনি লগইন করেছেন!
            adminLoading.classList.add('hidden');
            adminSidebar.classList.remove('hidden');
            adminMain.classList.remove('hidden');
            
            // আপনার প্রোফাইল ছবি হেডারে বসানো
            document.getElementById('admin-avatar').src = user.photoURL || "https://via.placeholder.com/40";
            
            loadUsers(); // ডাটাবেস থেকে ইউজার কল করা
        } else {
            // Failed: অন্য কেউ ঢোকার চেষ্টা করলে ব্লক!
            adminLoading.classList.add('hidden');
            accessDenied.classList.remove('hidden');
        }
    });

    // ==========================================
    // 2. Load Users and Calculate Stats
    // ==========================================
    async function loadUsers() {
        usersTableBody.innerHTML = `<tr><td colspan="5" class="text-center py-8 text-primary font-mono"><div class="animate-pulse">Fetching secure database records...</div></td></tr>`;
        
        try {
            const querySnapshot = await getDocs(collection(db, "users"));
            allUsersData = [];
            
            let totalCount = 0;
            let proCount = 0;
            let freeCount = 0;

            querySnapshot.forEach((documentSnapshot) => {
                const userData = documentSnapshot.data();
                const userId = documentSnapshot.id;
                
                // আপনাকে (অ্যাডমিনকে) ইউজারের লিস্টে দেখানোর দরকার নেই
                if(userData.email === ADMIN_EMAIL) return;

                // স্ট্যাটাস গণনা করা হচ্ছে
                totalCount++;
                if (userData.isPro) proCount++;
                else freeCount++;

                allUsersData.push({ id: userId, ...userData });
            });

            // UI-তে স্ট্যাটিসটিক্স আপডেট করা
            statTotal.innerText = totalCount;
            statPro.innerText = proCount;
            statFree.innerText = freeCount;

            renderTable(allUsersData);

        } catch (error) {
            console.error("Error loading users:", error);
            usersTableBody.innerHTML = `<tr><td colspan="5" class="text-center py-8 text-red-500 font-medium">Database connection failed. Refresh the page.</td></tr>`;
        }
    }

    // ==========================================
    // 3. Render Table Data
    // ==========================================
    function renderTable(users) {
        usersTableBody.innerHTML = '';
        
        if (users.length === 0) {
            usersTableBody.innerHTML = `<tr><td colspan="5" class="text-center py-8 text-gray-500">No users found.</td></tr>`;
            return;
        }

        users.forEach(user => {
            const isPro = user.isPro || false;
            // জয়েন করার তারিখ সুন্দর ফরম্যাটে সাজানো
            const joinDate = user.createdAt ? new Date(user.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Unknown';
            
            const tr = document.createElement('tr');
            tr.className = "hover:bg-white/5 transition-colors border-b border-dark-border/50";
            
            tr.innerHTML = `
                <td class="py-4 px-6 flex items-center gap-3">
                    <img src="${user.photoURL || 'https://via.placeholder.com/40'}" class="w-9 h-9 rounded-full border border-dark-border shadow-sm" referrerpolicy="no-referrer">
                    <span class="font-medium text-gray-200">${user.name || 'Anonymous Coder'}</span>
                </td>
                <td class="py-4 px-6 text-sm text-gray-400 font-mono">${user.email}</td>
                <td class="py-4 px-6 text-sm text-gray-500">${joinDate}</td>
                <td class="py-4 px-6">
                    ${isPro 
                        ? '<span class="px-3 py-1 bg-amber-500/10 text-amber-500 text-xs font-bold rounded-full border border-amber-500/30 shadow-[0_0_10px_rgba(245,158,11,0.1)]">PRO ACTIVE</span>' 
                        : '<span class="px-3 py-1 bg-gray-700/30 text-gray-400 text-xs font-medium rounded-full border border-gray-600/50">FREE TIER</span>'}
                </td>
                <td class="py-4 px-6 text-right">
                    <button onclick="toggleProStatus('${user.id}', ${!isPro})" class="px-4 py-2 rounded-lg text-xs font-bold transition-all shadow-sm flex items-center justify-end gap-1 ml-auto ${
                        isPro 
                        ? 'bg-dark-surface border border-red-500/30 text-red-400 hover:bg-red-500/10 hover:border-red-500/50' 
                        : 'bg-primary/10 border border-primary/30 text-primary hover:bg-primary/20 hover:border-primary/50'
                    }">
                        <span class="material-symbols-outlined text-[14px]">${isPro ? 'cancel' : 'workspace_premium'}</span>
                        ${isPro ? 'Revoke Pro' : 'Make Pro'}
                    </button>
                </td>
            `;
            usersTableBody.appendChild(tr);
        });
    }

    // ==========================================
    // 4. Global Function: Make Pro / Revoke Pro
    // ==========================================
    window.toggleProStatus = async function(userId, newProStatus) {
        const actionText = newProStatus ? "UPGRADE this user to PRO" : "DOWNGRADE this user to FREE";
        
        if(confirm(`SYSTEM WARNING: Are you sure you want to ${actionText}?`)) {
            try {
                // ফায়ারবেস ডাটাবেসে আপডেট করা হচ্ছে
                const userRef = doc(db, 'users', userId);
                await setDoc(userRef, { isPro: newProStatus }, { merge: true });
                
                alert(`✅ User status updated successfully!`);
                loadUsers(); // ডাটাবেস রিলোড করে নতুন স্ট্যাটাস দেখানো
            } catch (error) {
                console.error("Error updating status:", error);
                alert("❌ Failed to update user status. Check console.");
            }
        }
    };

    // ==========================================
    // 5. Search Functionality (ইমেইল দিয়ে খোঁজা)
    // ==========================================
    searchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        
        // সমস্ত ইউজার থেকে সার্চ টার্ম অনুযায়ী ফিল্টার করা
        const filteredUsers = allUsersData.filter(user => 
            user.email.toLowerCase().includes(searchTerm) || 
            (user.name && user.name.toLowerCase().includes(searchTerm))
        );
        
        renderTable(filteredUsers);
    });

    // Refresh Button Event
    refreshBtn.addEventListener('click', loadUsers);
});

