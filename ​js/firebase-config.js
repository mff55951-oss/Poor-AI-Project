// ==========================================
// Poor AI - Firebase Configuration
// ==========================================

// Firebase SDK (Standard v10.8.0) ইমপোর্ট করা হচ্ছে
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, collection, addDoc, query, where, getDocs, orderBy } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// আপনার প্রজেক্টের আসল Config কোড
const firebaseConfig = {
  apiKey: "AIzaSyBR8FMbjRjSL34-usa3xKSnJbhBOLda0uM",
  authDomain: "poor-ai.firebaseapp.com",
  projectId: "poor-ai",
  storageBucket: "poor-ai.firebasestorage.app",
  messagingSenderId: "655743636685",
  appId: "1:655743636685:web:606f526d9430414c068584",
  measurementId: "G-79Z3RV9JC9"
};

// Initialize Firebase (ফায়ারবেস চালু করা)
const app = initializeApp(firebaseConfig);

// Auth এবং Database ভেরিয়েবল তৈরি করা (যাতে অন্য ফাইলে ব্যবহার করা যায়)
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

// অন্য জাভাস্ক্রিপ্ট ফাইলে ব্যবহার করার জন্য Export করে দেওয়া হলো
export { auth, db, googleProvider, signInWithPopup, signOut, onAuthStateChanged, doc, setDoc, getDoc, collection, addDoc, query, where, getDocs, orderBy };
