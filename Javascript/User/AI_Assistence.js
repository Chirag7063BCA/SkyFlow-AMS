/* SkyFlow AMS - AI Assistance JS Logic */

async function loadComponent(url, id) {
  try {
    const res = await fetch(url);
    if (res.ok) {
      const container = document.getElementById(id);
      if (container) container.innerHTML = await res.text();
    }
  } catch (e) { console.error('Error loading component:', e); }
}

async function initAIPage() {
  await loadComponent('../globalcomp/navbar.html', 'navbar-container');
  await loadComponent('../globalcomp/footer.html', 'footer-container');
  if (typeof initSkyFlowPage === 'function') {
    initSkyFlowPage('offers');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  initAIPage();

  const chatMessages = document.getElementById('chatMessages');
  const chatInput = document.getElementById('chatInput');
  const sendBtn = document.getElementById('sendBtn');
  const quickRepliesContainer = document.getElementById('quickReplies');
  const clearChatBtn = document.getElementById('clearChatBtn');
  const headerClearBtn = document.getElementById('headerClearBtn');

  let userName = '';

  function checkAIAuth() {
    let user = null;
    try {
      const raw = localStorage.getItem('skyflow_user');
      if (raw && raw !== 'undefined' && raw !== 'null') {
        user = JSON.parse(raw);
      }
    } catch (e) {
      user = null;
    }

    const workspace = document.querySelector('.ai-workspace-wrapper');
    const lockSection = document.getElementById('authLockSection');

    if (user && (user.name || user.email)) {
      if (workspace) workspace.style.display = 'block';
      if (lockSection) lockSection.style.display = 'none';
      if (user.name && !userName) {
        userName = user.name;
      }
    } else {
      if (workspace) workspace.style.display = 'none';
      if (lockSection) lockSection.style.display = 'flex';
    }
  }

  // Perform Auth Check on load & listen to auth state changes
  checkAIAuth();
  window.addEventListener('skyflow_auth_changed', checkAIAuth);
  window.addEventListener('storage', checkAIAuth);
  setInterval(checkAIAuth, 1000);

  if (chatInput) {
    chatInput.focus();
    chatInput.addEventListener('input', () => {
      sendBtn.classList.toggle('active', chatInput.value.trim() !== '');
    });

    chatInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleSendMessage();
      }
    });
  }

  if (sendBtn) sendBtn.addEventListener('click', handleSendMessage);

  // Quick Chips Click
  if (quickRepliesContainer) {
    quickRepliesContainer.addEventListener('click', (e) => {
      const chip = e.target.closest('.quick-chip');
      if (chip) sendMessage(chip.getAttribute('data-msg') || chip.innerText.trim());
    });
  }

  // Sidebar Topics Click
  document.addEventListener('click', (e) => {
    const topicBtn = e.target.closest('.topic-chip-btn');
    if (topicBtn) sendMessage(topicBtn.getAttribute('data-topic') || topicBtn.innerText.trim());
  });

  // Clear Chat Triggers
  if (clearChatBtn) clearChatBtn.addEventListener('click', resetChat);
  if (headerClearBtn) headerClearBtn.addEventListener('click', resetChat);

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
  }

  function handleSendMessage() {
    const text = chatInput.value.trim();
    if (!text) return;
    sendMessage(text);
    chatInput.value = '';
    sendBtn.classList.remove('active');
  }

  function sendMessage(text) {
    appendUserBubble(text);
    showTypingIndicator();

    setTimeout(() => {
      removeTypingIndicator();
      appendBotBubble(generateBotReply(text));
    }, 600);
  }

  function appendUserBubble(text) {
    const row = document.createElement('div');
    row.className = 'message-row user-row';
    row.innerHTML = `<div class="message-bubble user-bubble">${escapeHtml(text)}</div>`;
    chatMessages.appendChild(row);
    scrollToBottom();
  }

  function appendBotBubble(text) {
    const row = document.createElement('div');
    row.className = 'message-row bot-row';
    row.innerHTML = `
      <div class="bot-mini-avatar">
        <div class="mini-bot-face"><span class="mini-eye"></span><span class="mini-eye"></span></div>
      </div>
      <div class="message-bubble bot-bubble">${text}</div>
    `;
    chatMessages.appendChild(row);
    scrollToBottom();
  }

  function showTypingIndicator() {
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
    scrollToBottom();
  }

  function removeTypingIndicator() {
    document.getElementById('typingIndicator')?.remove();
  }

  function scrollToBottom() {
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  function escapeHtml(str) {
    return str.replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m]));
  }

  function generateBotReply(msg) {
    const lower = msg.toLowerCase().trim();

    if (lower.includes("prefer not to say") || lower.includes("no name")) {
      return "No problem at all! How can I assist you with your flight details today?";
    }

    if (lower.startsWith("i am ") || lower.startsWith("my name is ") || lower.startsWith("call me ") || (lower.split(" ").length === 1 && !userName && !lower.includes("flight") && !lower.includes("help"))) {
      let extracted = msg;
      if (lower.startsWith("i am ")) extracted = msg.substring(5);
      else if (lower.startsWith("my name is ")) extracted = msg.substring(11);
      else if (lower.startsWith("call me ")) extracted = msg.substring(8);

      userName = extracted.trim();
      return `Pleased to meet you, <strong>${escapeHtml(userName)}</strong>! ✨ What can Navigator help you explore today?`;
    }

    if (lower.includes("book") || lower.includes("flight") || lower.includes("search") || lower.includes("ticket")) {
      return `✈️ Search flights and book tickets easily on our <a href="../index.html#flights">Flights Page</a>!`;
    }

    if (lower.includes("track") || lower.includes("status") || lower.includes("radar")) {
      return `🔍 Track live aircraft positions and departure gates on our <a href="../Track%20Flight/trackFlight.html">Flight Radar Page</a>.`;
    }

    if (lower.includes("baggage") || lower.includes("luggage") || lower.includes("bag")) {
      return `🎒 <strong>Baggage Rules:</strong><br>• Cabin Hand Bag: 1 bag up to 7 kg (Free)<br>• Economy: 1 checked bag up to 23 kg<br>• Business: 2 bags up to 32 kg each`;
    }

    if (lower.includes("cancel") || lower.includes("refund") || lower.includes("my booking")) {
      return `🎫 Manage active tickets or request cancellations under <a href="../mybookings/mybookings.html">My Bookings</a>. Eligible refunds credit in 5-7 business days.`;
    }

    if (lower.includes("delay") || lower.includes("gate") || lower.includes("alert")) {
      return `🕒 Departure gates and status updates refresh live. Check your flight number on the <a href="../Track%20Flight/trackFlight.html">Track Flight</a> page.`;
    }

    if (lower.includes("hi") || lower.includes("hello") || lower.includes("hey")) {
      return `Hello! 👋 I'm Navigator, your SkyFlow AI assistant. How can I help you today?`;
    }

    if (lower.includes("help") || lower.includes("support") || lower.includes("contact")) {
      return `📞 Customer support is available 24/7 on the <a href="../help/help.html">Help Center Page</a>.`;
    }

    return `As your SkyFlow assistant, I can help with <a href="../index.html#flights">flight bookings</a>, <a href="../Track%20Flight/trackFlight.html">live tracking</a>, <a href="../mybookings/mybookings.html">ticket management</a>, or baggage rules!`;
  }
});
