
// ==========================================
// Poor AI - Master Application Logic (v1.0)
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
    
    // ⚠️ আপনার Google Apps Script এর Web App URL টি এখানে বসান:
    const PROXY_URL = "https://script.google.com/macros/s/AKfycbzRCmuSc55I5D8WU-aKuBvy_x5gc5_Ea3G9YnSztAg54dx775lAsWjGQAdUabFSWhvL/exec"; 
    // উদাহরণ: "https://script.google.com/macros/s/AKfycb.../exec"

    // State Management
    const state = {
        messages: [], // {role: 'user'/'assistant', content: text, image: base64}
        isGenerating: false,
        abortController: null,
        currentImage: null
    };

    // DOM Elements
    const els = {
        userInput: document.getElementById('user-input'),
        sendBtn: document.getElementById('send-btn'),
        stopBtn: document.getElementById('stop-btn'),
        messagesContainer: document.getElementById('messages-container'),
        welcomeScreen: document.getElementById('welcome-screen'),
        typingIndicator: document.getElementById('typing-indicator'),
        chatContainer: document.getElementById('chat-container'),
        imageInput: document.getElementById('image-upload'),
        imagePreviewContainer: document.getElementById('image-preview-container'),
        imagePreview: document.getElementById('image-preview'),
        removeImageBtn: document.getElementById('remove-image-btn'),
        voiceBtn: document.getElementById('voice-btn'),
        micIcon: document.getElementById('mic-icon'),
        statusBanner: document.getElementById('status-banner')
    };

    // ==========================================
    // 1. Markdown & Code Highlighting Setup
    // ==========================================
    // Custom renderer to add "Copy Code" button to code blocks
    const renderer = new marked.Renderer();
    renderer.code = function(code, language) {
        const langClass = language ? `language-${language}` : '';
        const escapedCode = code.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
        
        return `
        <div class="code-block-wrapper my-4 rounded-xl overflow-hidden border border-dark-border bg-[#0d1117]">
            <div class="flex items-center justify-between px-4 py-2 bg-[#161b22] border-b border-dark-border">
                <span class="text-xs font-mono text-gray-400">${language || 'code'}</span>
                <button class="copy-code-btn flex items-center gap-1 text-xs text-gray-400 hover:text-white transition-colors px-2 py-1 rounded bg-white/5 hover:bg-white/10" onclick="copyCodeBlock(this)">
                    <span class="material-symbols-outlined text-[14px]">content_copy</span> Copy
                </button>
            </div>
            <div class="p-4 overflow-x-auto custom-scrollbar">
                <pre><code class="${langClass} text-sm font-mono text-gray-300">${escapedCode}</code></pre>
            </div>
        </div>`;
    };
    marked.setOptions({ renderer: renderer, breaks: true });

    // Global function for the copy button
    window.copyCodeBlock = function(btn) {
        const pre = btn.parentElement.nextElementSibling.querySelector('code');
        navigator.clipboard.writeText(pre.innerText).then(() => {
            const originalHTML = btn.innerHTML;
            btn.innerHTML = `<span class="material-symbols-outlined text-[14px] text-green-400">check</span> <span class="text-green-400">Copied</span>`;
            setTimeout(() => { btn.innerHTML = originalHTML; }, 2000);
        });
    };

    // ==========================================
    // 2. UI Updates & Helpers
    // ==========================================
    function scrollToBottom() {
        setTimeout(() => {
            els.chatContainer.scrollTop = els.chatContainer.scrollHeight;
        }, 50);
    }

    function showStatus(msg, type = 'error') {
        els.statusBanner.textContent = msg;
        els.statusBanner.className = `absolute -top-12 left-0 right-0 px-4 py-2 rounded-lg text-sm text-center font-medium transition-all shadow-lg border z-50 ${
            type === 'error' ? 'bg-red-900/80 text-red-200 border-red-700' : 'bg-green-900/80 text-green-200 border-green-700'
        }`;
        els.statusBanner.classList.remove('hidden');
        setTimeout(() => els.statusBanner.classList.add('hidden'), 4000);
    }

    // ==========================================
    // 3. Message Rendering
    // ==========================================
    function renderMessage(role, content, imageUrl = null) {
        els.welcomeScreen.classList.add('hidden');
        els.messagesContainer.classList.remove('hidden');

        const wrapper = document.createElement('div');
        wrapper.className = `flex w-full mb-6 fade-enter ${role === 'user' ? 'justify-end' : 'justify-start'}`;

        if (role === 'user') {
            const safeText = DOMPurify.sanitize(content);
            wrapper.innerHTML = `
                <div class="bg-dark-surface border border-dark-border px-5 py-3.5 rounded-2xl rounded-tr-sm max-w-[85%] shadow-sm">
                    ${imageUrl ? `<img src="${imageUrl}" class="max-w-[200px] rounded-lg mb-3 border border-dark-border">` : ''}
                    <div class="text-[15px] leading-relaxed whitespace-pre-wrap text-gray-200 font-sans">${safeText}</div>
                </div>
            `;
        } else {
            const safeHTML = DOMPurify.sanitize(marked.parse(content));
            wrapper.innerHTML = `
                <div class="flex gap-4 w-full">
                    <div class="font-mono text-primary font-bold text-xl shrink-0 mt-1">>_</div>
                    <div class="flex flex-col gap-1 w-full min-w-0">
                        <div class="prose prose-invert max-w-none text-[15px] leading-relaxed text-gray-300">
                            ${safeHTML}
                        </div>
                    </div>
                </div>
            `;
        }

        els.messagesContainer.appendChild(wrapper);
        scrollToBottom();
    }

    // ==========================================
    // 4. API Communication (Via Proxy)
    // ==========================================
    async function sendMessageToAPI(userText, userImage) {
        if (!PROXY_URL || PROXY_URL === "YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE") {
            showStatus("System Error: Proxy URL not configured by Admin.");
            return;
        }

        // Add user message to state and UI
        state.messages.push({ role: 'user', content: userText, image: userImage });
        renderMessage('user', userText, userImage);

        // Prepare context for API
        // We format it for OpenRouter (OpenAI compatible) format
        const apiMessages = [
            { role: "system", content: "You are Poor AI, an advanced, highly capable programming assistant and AI developed to write extremely accurate code. Give detailed, structured responses." }
        ];

        // Send last 6 messages for context memory
        const recentMessages = state.messages.slice(-6);
        recentMessages.forEach(msg => {
            if (msg.image) {
                // Multimodal format
                apiMessages.push({
                    role: msg.role,
                    content: [
                        { type: "text", text: msg.content || "Analyze this image." },
                        { type: "image_url", image_url: { url: msg.image } }
                    ]
                });
            } else {
                apiMessages.push({ role: msg.role, content: msg.content });
            }
        });

        // UI State: Generating
        state.isGenerating = true;
        els.userInput.value = '';
        els.userInput.style.height = '48px';
        els.sendBtn.parentElement.classList.add('hidden');
        els.stopBtn.classList.remove('hidden');
        els.typingIndicator.classList.remove('hidden');
        els.removeImageBtn.click(); // Clear image preview
        scrollToBottom();

        state.abortController = new AbortController();

        try {
            const payload = {
                model: "google/gemini-pro", // Default Free Model (Admin can change logic later)
                messages: apiMessages
            };

            const response = await fetch(PROXY_URL, {
                method: "POST",
                headers: { "Content-Type": "text/plain;charset=utf-8" }, // Google App Script requires text/plain for CORS
                body: JSON.stringify(payload),
                signal: state.abortController.signal
            });

            if (!response.ok) throw new Error("Server communication failed.");

            const data = await response.json();
            
            if (data.error) throw new Error(data.error.message || data.error);

            const aiResponseText = data.choices[0].message.content;

            // Save and Render AI Response
            state.messages.push({ role: 'assistant', content: aiResponseText });
            renderMessage('assistant', aiResponseText);

        } catch (error) {
            if (error.name === 'AbortError') {
                showStatus("Generation stopped.", "success");
            } else {
                showStatus(`Error: ${error.message}`);
            }
        } finally {
            // Restore UI State
            state.isGenerating = false;
            els.typingIndicator.classList.add('hidden');
            els.stopBtn.classList.add('hidden');
            els.sendBtn.parentElement.classList.remove('hidden');
            els.sendBtn.disabled = true; // Disable until new text
            els.userInput.focus();
        }
    }

    // ==========================================
    // 5. Input Handling (Text, Image, Voice)
    // ==========================================
    
    // Handle Send Button
    els.sendBtn.addEventListener('click', () => {
        const text = els.userInput.value.trim();
        if (text || state.currentImage) {
            sendMessageToAPI(text, state.currentImage);
        }
    });

    // Handle Enter Key
    els.userInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (!els.sendBtn.disabled) {
                els.sendBtn.click();
            }
        }
    });

    // Enable/Disable Send Button based on input
    els.userInput.addEventListener('input', () => {
        els.sendBtn.disabled = els.userInput.value.trim().length === 0 && !state.currentImage;
    });

    // Stop Generation
    els.stopBtn.addEventListener('click', () => {
        if (state.abortController) state.abortController.abort();
    });

    // Image Upload Logic
    els.imageInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                state.currentImage = e.target.result;
                els.imagePreview.src = state.currentImage;
                els.imagePreviewContainer.classList.remove('hidden');
                els.sendBtn.disabled = false;
            };
            reader.readAsDataURL(file);
        }
    });

    els.removeImageBtn.addEventListener('click', () => {
        state.currentImage = null;
        els.imageInput.value = '';
        els.imagePreviewContainer.classList.add('hidden');
        els.sendBtn.disabled = els.userInput.value.trim().length === 0;
    });

    // Voice Input Logic (Speech Recognition)
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = true;
        
        recognition.onstart = () => {
            els.micIcon.classList.add('text-red-500', 'animate-pulse');
            els.userInput.placeholder = "Listening... Speak now.";
        };
        
        recognition.onresult = (event) => {
            const transcript = Array.from(event.results)
                .map(result => result[0].transcript)
                .join('');
            els.userInput.value = transcript;
            els.userInput.dispatchEvent(new Event('input')); // Trigger resize & button enable
        };
        
        recognition.onend = () => {
            els.micIcon.classList.remove('text-red-500', 'animate-pulse');
            els.userInput.placeholder = "Message Poor AI... (Shift+Enter for new line)";
        };
        
        els.voiceBtn.addEventListener('click', () => {
            if (els.micIcon.classList.contains('animate-pulse')) {
                recognition.stop();
            } else {
                recognition.start();
            }
        });
    } else {
        els.voiceBtn.style.display = 'none'; // Hide if browser doesn't support
    }

    // Handle Quick Prompts
    document.querySelectorAll('.prompt-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const text = btn.querySelector('p').innerText;
            sendMessageToAPI(text, null);
        });
    });

});
