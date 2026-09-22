/* SkyFlow AMS - AI Assistance JS Logic */

async function initAIFloatingWidget() {
  const normPath = window.location.pathname.toLowerCase().replace(/\\/g, '/');
  const isSubdir = normPath.includes('/help') ||
                   normPath.includes('/mybookings') ||
                   normPath.includes('/track');

  // 1. Inject Stylesheet if not present
  if (!document.getElementById('ai-assistance-css')) {
    const cssPath = isSubdir ? '../../../CSS/AI_Assistence/AI_Assistence.css' : '../../CSS/AI_Assistence/AI_Assistence.css';
    const link = document.createElement('link');
    link.id = 'ai-assistance-css';
    link.rel = 'stylesheet';
    link.href = cssPath;
    document.head.appendChild(link);
  }

  // 2. Ensure container element exists
  let container = document.getElementById('ai-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'ai-container';
    document.body.appendChild(container);
  }

  // 3. Load HTML markup if missing
  if (!document.getElementById('aiWidgetTrigger')) {
    const htmlPath = isSubdir ? '../AI_Assistence/AI_Assistence.html' : 'AI_Assistence/AI_Assistence.html';
    try {
      const res = await fetch(htmlPath);
      if (res.ok) {
        container.innerHTML = await res.text();
      }
    } catch (e) {
      console.error('Error loading AI component:', e);
    }
  }

  // 4. Setup Event Listeners & Logic
  setupAIWidgetLogic(isSubdir);
}

function setupAIWidgetLogic(isSubdir = false) {
  const getRelPath = (path) => (isSubdir ? '../' : './') + path;

  const trigger = document.getElementById('aiWidgetTrigger');
  const chatWidget = document.getElementById('aiChatWidget');
  const closeBtn = document.getElementById('closeChatBtn');
  const toggleTopicsBtn = document.getElementById('toggleTopicsBtn');
  const topicsDrawer = document.getElementById('popupTopicsDrawer');

  const chatMessages = document.getElementById('chatMessages');
  const chatInput = document.getElementById('chatInput');
  const sendBtn = document.getElementById('sendBtn');
  const quickReplies = document.getElementById('quickReplies');
  const clearBtn = document.getElementById('headerClearBtn');

  let userName = '';
  let awaitingPhone = false;

  if (!trigger || !chatWidget) return;

  // Toggle Chat Box Overlay
  trigger.onclick = (e) => {
    e.stopPropagation();
    chatWidget.classList.contains('open') ? closeChat() : openChat();
  };

  if (closeBtn) {
    closeBtn.onclick = (e) => {
      e.stopPropagation();
      closeChat();
    };
  }

  function openChat() {
    chatWidget.classList.add('open');
    chatWidget.setAttribute('aria-hidden', 'false');
    trigger.classList.add('active');
    setTimeout(() => { if (chatInput) chatInput.focus(); }, 250);
  }

  function closeChat() {
    chatWidget.classList.remove('open');
    chatWidget.setAttribute('aria-hidden', 'true');
    trigger.classList.remove('active');
  }

  // Toggle Topics Drawer
  if (toggleTopicsBtn && topicsDrawer) {
    toggleTopicsBtn.onclick = () => {
      const isHidden = topicsDrawer.style.display === 'none' || topicsDrawer.style.display === '';
      topicsDrawer.style.display = isHidden ? 'block' : 'none';
    };
  }

  // Auth User Name Check
  function updateUserName() {
    try {
      const raw = localStorage.getItem('skyflow_user');
      if (raw) {
        const u = JSON.parse(raw);
        if (u && u.name) userName = u.name;
      }
    } catch (e) { /* ignore */ }
  }

  updateUserName();
  window.addEventListener('skyflow_auth_changed', updateUserName);

  // Input listeners
  if (chatInput) {
    chatInput.oninput = () => {
      if (sendBtn) sendBtn.classList.toggle('active', chatInput.value.trim() !== '');
    };
    chatInput.onkeydown = (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleSend();
      }
    };
  }

  if (sendBtn) sendBtn.onclick = handleSend;

  // Quick Chips click
  if (quickReplies) {
    quickReplies.onclick = (e) => {
      const chip = e.target.closest('.quick-chip');
      if (chip) sendMessage(chip.getAttribute('data-msg') || chip.innerText.trim());
    };
  }

  // Topic Chips click
  document.onclick = (e) => {
    const topicBtn = e.target.closest('.topic-chip-btn');
    if (topicBtn) {
      sendMessage(topicBtn.getAttribute('data-topic') || topicBtn.innerText.trim());
      if (topicsDrawer) topicsDrawer.style.display = 'none';
    }
  };

  // Clear Chat
  if (clearBtn) clearBtn.onclick = resetChat;

  function resetChat() {
    if (!chatMessages) return;
    chatMessages.innerHTML = `
      <div class="message-row bot-row">
        <div class="bot-mini-avatar">
          <div class="mini-bot-face"><span class="mini-eye"></span><span class="mini-eye"></span></div>
        </div>
        <div class="message-bubble bot-bubble">Conversation reset! 👋 How can Navigator assist you today?</div>
      </div>
    `;
    userName = '';
    awaitingPhone = false;
  }

  function handleSend() {
    if (!chatInput) return;
    const text = chatInput.value.trim();
    if (!text) return;
    sendMessage(text);
    chatInput.value = '';
    if (sendBtn) sendBtn.classList.remove('active');
  }

  function sendMessage(text) {
    appendBubble(text, 'user');
    showTyping();
    setTimeout(() => {
      removeTyping();
      appendBubble(generateReply(text), 'bot');
    }, 600);
  }

  function appendBubble(content, sender) {
    if (!chatMessages) return;
    const row = document.createElement('div');
    row.className = `message-row ${sender}-row`;
    if (sender === 'user') {
      row.innerHTML = `<div class="message-bubble user-bubble">${escapeHtml(content)}</div>`;
    } else {
      row.innerHTML = `
        <div class="bot-mini-avatar">
          <div class="mini-bot-face"><span class="mini-eye"></span><span class="mini-eye"></span></div>
        </div>
        <div class="message-bubble bot-bubble">${content}</div>
      `;
    }
    chatMessages.appendChild(row);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  function showTyping() {
    if (!chatMessages) return;
    const row = document.createElement('div');
    row.className = 'message-row bot-row typing-row';
    row.id = 'typingIndicator';
    row.innerHTML = `
      <div class="bot-mini-avatar">
        <div class="mini-bot-face"><span class="mini-eye"></span><span class="mini-eye"></span></div>
      </div>
      <div class="message-bubble bot-bubble">
        <div class="typing-dots"><span class="typing-dot"></span><span class="typing-dot"></span><span class="typing-dot"></span></div>
      </div>
    `;
    chatMessages.appendChild(row);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  function removeTyping() {
    document.getElementById('typingIndicator')?.remove();
  }

  function escapeHtml(str) {
    return str.replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m]));
  }

  function generateReply(msg) {
    const q = msg.toLowerCase().trim();

    if (awaitingPhone) {
      if (q === 'cancel' || q === 'no' || q === 'stop' || q.includes('nevermind') || q.includes('no thanks') || q.includes('dont want')) {
        awaitingPhone = false;
        return `Booking request cancelled. How else can Navigator assist you today?`;
      }

      const cleanPhone = msg.replace(/[\s\-\(\)\+]/g, '');
      const isValidPhone = /^\d{10,13}$/.test(cleanPhone);

      if (isValidPhone) {
        awaitingPhone = false;
        return `📞 Thank you! For now, you got a call for booking a flight on <strong>${escapeHtml(msg.trim())}</strong>. Our team will contact you shortly!`;
      } else {
        return `⚠️ Please enter a valid phone number (10-12 digits, e.g., 9876543210) so our team can call you for booking:`;
      }
    }

    if (q.includes("prefer not to say") || q.includes("no name")) {
      return "No problem at all! How can I assist you with your flight details today?";
    }

    if (q.startsWith("i am ") || q.startsWith("my name is ") || q.startsWith("call me ")) {
      let name = msg.replace(/^(i am|my name is|call me)\s+/i, '').trim();
      userName = name;
      return `Pleased to meet you, <strong>${escapeHtml(userName)}</strong>! ✨ What can Navigator help you explore today?`;
    }

    if (q.includes("cancel") || q.includes("refund")) {
      return `🎫 Manage active tickets or request cancellations under <a href="${getRelPath('mybookings/mybookings.html')}">My Bookings</a>. Eligible refunds credit in 5-7 business days.`;
    }

    if (q.includes("track") || q.includes("radar") || q.includes("status")) {
      return `🔍 Track live aircraft positions and departure gates on our <a href="${getRelPath('Track%20Flight/trackFlight.html')}">Flight Radar Page</a>.`;
    }

    if (q.includes("book") || q.includes("ticket") || q.includes("reservation")) {
      awaitingPhone = true;
      return `✈️ Please enter your phone number to proceed with booking a flight:`;
    }

    if (q.includes("baggage") || q.includes("luggage") || q.includes("bag")) {
      return `🎒 <strong>Baggage Rules:</strong><br>• Cabin Hand Bag: 1 bag up to 7 kg (Free)<br>• Economy: 1 checked bag up to 23 kg<br>• Business: 2 bags up to 32 kg each`;
    }

    if (q.includes("booking")) {
      return `🎫 Manage active tickets or request cancellations under <a href="${getRelPath('mybookings/mybookings.html')}">My Bookings</a>. Eligible refunds credit in 5-7 business days.`;
    }

    if (q.includes("delay") || q.includes("gate") || q.includes("alert")) {
      return `🕒 Departure gates and status updates refresh live on our <a href="${getRelPath('Track%20Flight/trackFlight.html')}">Track Flight</a> page.`;
    }

    if (q.includes("hi") || q.includes("hello") || q.includes("hey")) {
      return `Hello! 👋 I'm Navigator, your SkyFlow AI assistant. How can I help you today?`;
    }

    if (q.includes("help") || q.includes("support") || q.includes("contact")) {
      return `📞 Customer support is available 24/7 on the <a href="${getRelPath('help/help.html')}">Help Center Page</a>.`;
    }

    return `As your SkyFlow assistant, I can help with <a href="${getRelPath('index.html#flights')}">flight bookings</a>, <a href="${getRelPath('Track%20Flight/trackFlight.html')}">live tracking</a>, <a href="${getRelPath('mybookings/mybookings.html')}">ticket management</a>, or baggage rules!`;
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initAIFloatingWidget);
} else {
  initAIFloatingWidget();
}
