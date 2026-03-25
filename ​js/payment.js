// ==========================================
// Poor AI - Payment & WhatsApp Integration
// ==========================================

import { auth } from './firebase-config.js';

document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const pricingCards = document.querySelectorAll('.pricing-card');
    const paymentBox = document.getElementById('payment-instructions');
    const selectedPriceEl = document.getElementById('selected-price');
    const whatsappBtn = document.getElementById('whatsapp-pay-btn');

    let selectedPackage = '';
    let selectedPrice = '';

    // Package Selection Logic
    pricingCards.forEach(card => {
        card.addEventListener('click', () => {
            // Remove highlight from all cards
            pricingCards.forEach(c => {
                c.classList.remove('ring-2', 'ring-amber-500');
            });
            
            // Add highlight to the clicked card
            card.classList.add('ring-2', 'ring-amber-500');
            
            // Get data from the card
            selectedPackage = card.getAttribute('data-package');
            selectedPrice = card.getAttribute('data-price');
            
            // Show payment instructions
            selectedPriceEl.textContent = `৳${selectedPrice}`;
            paymentBox.classList.remove('hidden');

            // Generate WhatsApp Link dynamically on click
            whatsappBtn.onclick = () => {
                // Check if user is logged in
                const userEmail = auth.currentUser 
                    ? auth.currentUser.email 
                    : "(দয়া করে এখানে আপনার লগইন করা ইমেইলটি লিখুন)";
                
                // Formatted Message for WhatsApp
                const message = `Hello Admin! I want to buy Poor AI Pro.\n\n📦 Package: ${selectedPackage}\n💰 Amount Sent: ৳${selectedPrice}\n📧 My Email: ${userEmail}\n💳 TrxID: (এখানে আপনার ট্রানজ্যাকশন আইডি লিখুন)`;
                
                // Encode the message for URL
                const encodedMessage = encodeURIComponent(message);
                
                // Open WhatsApp chat directly to your number
                window.open(`https://wa.me/8801902701458?text=${encodedMessage}`, '_blank');
            };
        });
    });
});

