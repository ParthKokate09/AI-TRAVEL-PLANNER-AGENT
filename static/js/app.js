/* ============================================================
   AI Travel Planner Agent 2.0 — Frontend Application JS
   Handles: Chat UI, Trip Planner, Budget Calc, Navigation,
            Dark Mode, Saved Trips, Checklist, Toast Alerts
   ============================================================ */

'use strict';

// ────────────────────────────────────────────────────────────
// 1. DOM References
// ────────────────────────────────────────────────────────────
const chatBody       = document.getElementById('chatBody');
const chatInput      = document.getElementById('chatInput');
const sendBtn        = document.getElementById('sendBtn');
const clearChatBtn   = document.getElementById('clearChatBtn');
const themeToggle    = document.getElementById('themeToggle');
const sidebar        = document.getElementById('sidebar');
const sidebarOverlay = document.getElementById('sidebarOverlay');
const mobileTgl      = document.getElementById('mobileToggle');
const toastContainer = document.getElementById('toastContainer');

// ────────────────────────────────────────────────────────────
// 2. State
// ────────────────────────────────────────────────────────────
let isTyping = false;

// ────────────────────────────────────────────────────────────
// 3. Theme Toggle (Dark / Light)
// ────────────────────────────────────────────────────────────
function initTheme() {
  const saved = localStorage.getItem('travel_theme') || 'light';
  document.documentElement.setAttribute('data-theme', saved);
  updateThemeIcon(saved);
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') || 'light';
  const next    = current === 'light' ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('travel_theme', next);
  updateThemeIcon(next);
}

function updateThemeIcon(theme) {
  if (themeToggle) themeToggle.textContent = theme === 'dark' ? '☀️' : '🌙';
}

// ────────────────────────────────────────────────────────────
// 4. Sidebar Toggle (Mobile)
// ────────────────────────────────────────────────────────────
function openSidebar() {
  sidebar?.classList.add('open');
  sidebarOverlay?.classList.add('open');
}
function closeSidebar() {
  sidebar?.classList.remove('open');
  sidebarOverlay?.classList.remove('open');
}

// ────────────────────────────────────────────────────────────
// 5. Section Navigation
// ────────────────────────────────────────────────────────────
function showSection(sectionId) {
  document.querySelectorAll('.section-panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item-custom').forEach(n => n.classList.remove('active'));

  const panel = document.getElementById('section-' + sectionId);
  if (panel) panel.classList.add('active');

  const navEl = document.querySelector(`[data-section="${sectionId}"]`);
  if (navEl) navEl.classList.add('active');

  if (window.innerWidth <= 992) closeSidebar();
}

// ────────────────────────────────────────────────────────────
// 6. Toast Notifications
// ────────────────────────────────────────────────────────────
function showToast(message, type = 'default', duration = 3500) {
  const toast = document.createElement('div');
  toast.className = `toast-msg ${type}`;
  toast.textContent = message;
  toastContainer?.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(20px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 320);
  }, duration);
}

// ────────────────────────────────────────────────────────────
// 7. Chat: Render & Scroll
// ────────────────────────────────────────────────────────────
function scrollChatToBottom() {
  if (chatBody) chatBody.scrollTop = chatBody.scrollHeight;
}

function formatMarkdown(text) {
  // Convert simple markdown-ish formatting to safe HTML
  return text
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g,    '<em>$1</em>')
    .replace(/`(.+?)`/g,      '<code>$1</code>')
    .replace(/\n#{1,3} (.+)/g, '<h4>$1</h4>')
    .replace(/\n• /g,          '\n• ')
    .replace(/\n/g,             '<br>');
}

function appendMessage(role, text, time) {
  if (!chatBody) return;

  const isUser = role === 'user';
  const row    = document.createElement('div');
  row.className = `msg-row ${isUser ? 'user-row' : ''} slide-in`;

  const avatarIcon = isUser ? '🧑' : '✈️';
  const avatarCls  = isUser ? 'user-avatar' : 'ai-avatar';
  const bubbleCls  = isUser ? 'user-bubble' : 'ai-bubble';
  const content    = isUser ? escapeHtml(text) : formatMarkdown(text);

  row.innerHTML = `
    <div class="msg-avatar ${avatarCls}">${avatarIcon}</div>
    <div>
      <div class="msg-bubble ${bubbleCls}">${content}</div>
      <div class="msg-time">${time || getCurrentTime()}</div>
    </div>`;

  chatBody.appendChild(row);
  scrollChatToBottom();
}

function escapeHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function showTypingIndicator() {
  removeTypingIndicator();
  const row = document.createElement('div');
  row.className = 'msg-row';
  row.id = 'typingRow';
  row.innerHTML = `
    <div class="msg-avatar ai-avatar">✈️</div>
    <div class="msg-bubble ai-bubble typing-indicator">
      <span class="typing-dot"></span>
      <span class="typing-dot"></span>
      <span class="typing-dot"></span>
    </div>`;
  chatBody.appendChild(row);
  scrollChatToBottom();
}

function removeTypingIndicator() {
  document.getElementById('typingRow')?.remove();
}

function getCurrentTime() {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// ────────────────────────────────────────────────────────────
// 8. Chat: Send Message
// ────────────────────────────────────────────────────────────
async function sendMessage() {
  if (!chatInput || isTyping) return;

  const message = chatInput.value.trim();
  if (!message) return;

  chatInput.value = '';
  chatInput.style.height = 'auto';

  appendMessage('user', message);

  isTyping = true;
  if (sendBtn) sendBtn.disabled = true;
  showTypingIndicator();

  try {
    const res = await fetch('/api/chat', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ message }),
    });

    const data = await res.json();
    removeTypingIndicator();

    if (res.ok) {
      appendMessage('assistant', data.reply, data.timestamp);
      // Update model badge
      const modelBadge = document.getElementById('modelBadge');
      if (modelBadge && data.model) modelBadge.textContent = data.model;
    } else {
      appendMessage('assistant', `⚠️ Error: ${data.error || 'Unknown error'}`);
    }
  } catch (err) {
    removeTypingIndicator();
    appendMessage('assistant', '⚠️ Network error. Please check your connection and try again.');
    console.error('Chat error:', err);
  } finally {
    isTyping = false;
    if (sendBtn) sendBtn.disabled = false;
    chatInput.focus();
  }
}

async function clearChat() {
  try {
    await fetch('/api/chat/clear', { method: 'POST' });
    if (chatBody) chatBody.innerHTML = '';
    showToast('Chat cleared!', 'success');
    appendWelcomeMessage();
  } catch (err) {
    showToast('Failed to clear chat', 'error');
  }
}

function appendWelcomeMessage() {
  const agentName = document.getElementById('agentName')?.textContent || 'WanderlustAI';
  appendMessage('assistant',
    `**Welcome to ${agentName}!** ✈️\n\nI'm your AI-powered travel planning companion.\nAsk me anything — itineraries, hotels, budgets, visa tips, hidden gems, and more!\n\n*Try a quick question below or use the Trip Planner for a full itinerary!*`
  );
}

// ────────────────────────────────────────────────────────────
// 9. Quick Replies
// ────────────────────────────────────────────────────────────
function sendQuickReply(text) {
  if (!chatInput) return;
  chatInput.value = text;
  showSection('chat');
  sendMessage();
}

// ────────────────────────────────────────────────────────────
// 10. Destination Card click → Chat
// ────────────────────────────────────────────────────────────
function exploreDestination(name) {
  const msg = `Tell me everything about visiting ${name} — best time to go, top attractions, food recommendations, accommodation options, and a suggested 5-day itinerary.`;
  chatInput.value = msg;
  showSection('chat');
  sendMessage();
}

// ────────────────────────────────────────────────────────────
// 11. Trip Planner Form
// ────────────────────────────────────────────────────────────
const tripForm      = document.getElementById('tripPlannerForm');
const itineraryResult = document.getElementById('itineraryResult');
const itineraryBox    = document.getElementById('itineraryBox');

async function generateItinerary(e) {
  e.preventDefault();
  if (!tripForm) return;

  const formData = {
    destination: document.getElementById('tripDest')?.value.trim() || '',
    days:        parseInt(document.getElementById('tripDays')?.value) || 7,
    budget:      document.getElementById('tripBudget')?.value       || 'standard',
    style:       document.getElementById('tripStyle')?.value        || 'cultural',
    interests:   document.getElementById('tripInterests')?.value    || '',
    season:      document.getElementById('tripSeason')?.value       || '',
  };

  if (!formData.destination) {
    showToast('Please enter a destination!', 'error');
    return;
  }

  const btn = tripForm.querySelector('.btn-primary-custom');
  const origText = btn.innerHTML;
  btn.innerHTML = `<span class="spinner"></span> Generating...`;
  btn.disabled = true;

  try {
    const res  = await fetch('/api/itinerary/generate', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(formData),
    });
    const data = await res.json();

    if (res.ok) {
      if (itineraryBox) itineraryBox.innerHTML = formatMarkdown(data.itinerary);
      if (itineraryResult) itineraryResult.style.display = 'block';
      showToast('Itinerary generated! 🗺️', 'success');
      itineraryResult?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      showToast(data.error || 'Failed to generate itinerary', 'error');
    }
  } catch (err) {
    showToast('Network error — please try again', 'error');
    console.error(err);
  } finally {
    btn.innerHTML = origText;
    btn.disabled  = false;
  }
}

function sendItineraryToChat() {
  if (!itineraryBox) return;
  const text = itineraryBox.innerText;
  if (!text) return;
  chatInput.value = 'Can you give me more details about this itinerary?';
  showSection('chat');
  sendMessage();
}

// ────────────────────────────────────────────────────────────
// 12. Budget Calculator
// ────────────────────────────────────────────────────────────
const budgetForm       = document.getElementById('budgetForm');
const budgetResultWrap = document.getElementById('budgetResult');
const budgetResultBox  = document.getElementById('budgetResultBox');

const BUDGET_RATES = {
  budget:   { accommodation: 35, food: 20, transport: 10, attractions: 12, shopping: 15, misc: 8 },
  standard: { accommodation: 90, food: 45, transport: 20, attractions: 20, shopping: 35, misc: 15 },
  premium:  { accommodation: 200, food: 90, transport: 45, attractions: 35, shopping: 80, misc: 30 },
  luxury:   { accommodation: 500, food: 200, transport: 120, attractions: 60, shopping: 200, misc: 80 },
};

async function estimateBudget(e) {
  e.preventDefault();
  const dest      = document.getElementById('budgetDest')?.value.trim() || 'your destination';
  const days      = parseInt(document.getElementById('budgetDays')?.value) || 7;
  const tier      = document.getElementById('budgetTier')?.value || 'standard';
  const travelers = parseInt(document.getElementById('budgetTravelers')?.value) || 1;

  const rates = BUDGET_RATES[tier] || BUDGET_RATES.standard;
  const categories = {
    '🏨 Accommodation': rates.accommodation,
    '🍽️ Food & Dining':  rates.food,
    '🚌 Transport':       rates.transport,
    '🎟️ Attractions':     rates.attractions,
    '🛍️ Shopping':        rates.shopping,
    '📦 Misc & Tips':     rates.misc,
  };

  const colors = ['#2563eb','#7c3aed','#0ea5e9','#10b981','#f59e0b','#ef4444'];
  const total  = Object.values(categories).reduce((a, b) => a + b, 0) * days * travelers;

  let html = `<div style="margin-bottom:0.75rem;font-weight:700;color:var(--text)">
    📍 ${dest} — ${days} days × ${travelers} traveler(s) <span style="color:var(--text-muted);font-weight:400">(${tier} budget)</span>
  </div>`;

  Object.entries(categories).forEach(([label, daily], i) => {
    const total_cat = daily * days * travelers;
    const pct = Math.round((daily / Object.values(categories).reduce((a,b)=>a+b,0)) * 100);
    html += `<div class="budget-item">
      <div>
        <div class="budget-label">${label}</div>
        <div class="budget-bar-wrap" style="width:140px">
          <div class="budget-bar" style="width:${pct}%;background:${colors[i]}"></div>
        </div>
      </div>
      <div>
        <div class="budget-value">$${total_cat}</div>
        <div style="font-size:0.7rem;color:var(--text-light)">$${daily}/day</div>
      </div>
    </div>`;
  });

  html += `<div class="budget-total">
    <div style="font-size:0.8rem;color:var(--text-muted);margin-bottom:4px">ESTIMATED TOTAL</div>
    <div class="budget-total-num">$${total.toLocaleString()}</div>
    <div style="font-size:0.75rem;color:var(--text-muted);margin-top:4px">
      ~$${Math.round(total/days/travelers)}/person/day · Prices are estimates and may vary
    </div>
  </div>`;

  if (budgetResultBox) budgetResultBox.innerHTML = html;
  if (budgetResultWrap) budgetResultWrap.style.display = 'block';

  // Also ask AI for a more detailed estimate
  try {
    await fetch('/api/budget/estimate', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ destination: dest, days, budget_tier: tier, travelers }),
    });
  } catch (_) { /* silent — local estimate already shown */ }

  showToast('Budget estimated! 💰', 'success');
  budgetResultWrap?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ────────────────────────────────────────────────────────────
// 13. Saved Trips
// ────────────────────────────────────────────────────────────
const savedTripsContainer = document.getElementById('savedTripsContainer');

async function loadSavedTrips() {
  try {
    const res  = await fetch('/api/trip/saved');
    const data = await res.json();
    renderSavedTrips(data.trips || []);
  } catch (_) {
    renderSavedTrips([]);
  }
}

function renderSavedTrips(trips) {
  if (!savedTripsContainer) return;
  if (!trips.length) {
    savedTripsContainer.innerHTML = `<div style="text-align:center;color:var(--text-light);padding:2rem">
      <div style="font-size:2rem;margin-bottom:0.5rem">🗺️</div>
      <div>No saved trips yet. Plan and save your first trip!</div>
    </div>`;
    return;
  }
  savedTripsContainer.innerHTML = trips.map(t => `
    <div class="trip-card card-hover" id="trip-${t.id}">
      <div class="trip-card-header">
        <div>
          <div class="trip-dest">📍 ${t.destination}</div>
          <div class="trip-meta">${t.duration} · ${t.style} · ${t.budget} budget</div>
          <div class="trip-meta" style="margin-top:2px">💾 Saved ${t.saved_at}</div>
        </div>
        <button class="trip-delete" onclick="deleteTrip(${t.id})">🗑️</button>
      </div>
      ${t.notes ? `<div style="margin-top:0.5rem;font-size:0.82rem;color:var(--text-muted)">${escapeHtml(t.notes)}</div>` : ''}
    </div>
  `).join('');
}

async function deleteTrip(id) {
  try {
    await fetch(`/api/trip/delete/${id}`, { method: 'DELETE' });
    showToast('Trip removed', 'default');
    await loadSavedTrips();
  } catch (_) {
    showToast('Could not delete trip', 'error');
  }
}

// Save trip from trip planner
async function saveCurrentTrip() {
  const dest = document.getElementById('tripDest')?.value.trim();
  if (!dest) { showToast('Enter a destination first!', 'error'); return; }

  const tripData = {
    destination: dest,
    duration:    `${document.getElementById('tripDays')?.value || '?'} days`,
    budget:      document.getElementById('tripBudget')?.value || 'standard',
    style:       document.getElementById('tripStyle')?.value  || 'cultural',
    notes:       document.getElementById('tripInterests')?.value || '',
  };

  try {
    await fetch('/api/trip/save', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(tripData),
    });
    showToast(`${dest} saved to your trips! 🗺️`, 'success');
    await loadSavedTrips();
    updateTripCount();
  } catch (_) {
    showToast('Could not save trip', 'error');
  }
}

function updateTripCount() {
  fetch('/api/trip/saved')
    .then(r => r.json())
    .then(d => {
      const el = document.getElementById('savedTripCount');
      if (el) el.textContent = (d.trips || []).length;
    });
}

// ────────────────────────────────────────────────────────────
// 14. Checklist
// ────────────────────────────────────────────────────────────
const checklistContainer = document.getElementById('checklistContainer');

async function loadChecklist() {
  try {
    const res  = await fetch('/api/checklist');
    const data = await res.json();
    renderChecklist(data.checklist || {});
  } catch (_) {
    if (checklistContainer) checklistContainer.innerHTML = '<p style="color:var(--text-muted)">Could not load checklist.</p>';
  }
}

const CATEGORY_ICONS = { Documents: '📄', 'Health & Safety': '🏥', Electronics: '📱', Clothing: '👕', Money: '💰', 'Apps to Install': '📲' };

function renderChecklist(checklist) {
  if (!checklistContainer) return;
  const saved = JSON.parse(localStorage.getItem('checklist_state') || '{}');

  checklistContainer.innerHTML = Object.entries(checklist).map(([cat, items]) => `
    <div class="checklist-category">
      <div class="checklist-category-title">
        <span>${CATEGORY_ICONS[cat] || '📋'}</span> ${cat}
        <span style="margin-left:auto;font-size:0.7rem;color:var(--text-light)" id="cat-count-${CSS.escape(cat)}"></span>
      </div>
      ${items.map((item, i) => {
        const key     = `${cat}-${i}`;
        const checked = saved[key] || false;
        return `<label class="checklist-item ${checked ? 'checked' : ''}" id="cl-${CSS.escape(key)}">
          <input type="checkbox" onchange="toggleChecklistItem('${cat}', ${i}, this)" ${checked ? 'checked' : ''}>
          ${escapeHtml(item)}
        </label>`;
      }).join('')}
    </div>
  `).join('');

  updateChecklistCounts(checklist, saved);
}

function toggleChecklistItem(cat, idx, checkbox) {
  const saved = JSON.parse(localStorage.getItem('checklist_state') || '{}');
  const key   = `${cat}-${idx}`;
  saved[key]  = checkbox.checked;
  localStorage.setItem('checklist_state', JSON.stringify(saved));

  const label = checkbox.closest('.checklist-item');
  if (label) label.classList.toggle('checked', checkbox.checked);

  // Update category count
  const checklist = window._checklistData || {};
  updateChecklistCounts(checklist, saved);
}

function updateChecklistCounts(checklist, saved) {
  window._checklistData = checklist;
  Object.entries(checklist).forEach(([cat, items]) => {
    const done  = items.filter((_, i) => saved[`${cat}-${i}`]).length;
    const total = items.length;
    const el    = document.getElementById(`cat-count-${CSS.escape(cat)}`);
    if (el) el.textContent = `${done}/${total}`;
  });

  const totalItems = Object.values(checklist).reduce((a, b) => a + b.length, 0);
  const totalDone  = Object.values(checklist).reduce((a, items, _, __, cat) => {
    return a + items.filter((_, i) => saved[`${Object.keys(checklist)[Object.values(checklist).indexOf(items)]}-${i}`]).length;
  }, 0);

  const progressEl = document.getElementById('checklistProgress');
  if (progressEl) progressEl.textContent = `${totalDone} / ${totalItems} items packed`;
}

function clearChecklist() {
  localStorage.removeItem('checklist_state');
  loadChecklist();
  showToast('Checklist cleared', 'default');
}

// ────────────────────────────────────────────────────────────
// 15. Auto-resize Textarea
// ────────────────────────────────────────────────────────────
function autoResizeTextarea(el) {
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 130) + 'px';
}

// ────────────────────────────────────────────────────────────
// 16. Status Check
// ────────────────────────────────────────────────────────────
async function checkStatus() {
  try {
    const res  = await fetch('/api/status');
    const data = await res.json();

    const statusEl = document.getElementById('statusBadge');
    if (statusEl) {
      if (data.watsonx_ready) {
        statusEl.className = 'status-badge status-online';
        statusEl.innerHTML = '<span class="pulse-dot"></span> Watsonx.ai Connected';
      } else {
        statusEl.className = 'status-badge status-demo';
        statusEl.innerHTML = '⚡ Demo Mode';
      }
    }
  } catch (_) {
    const statusEl = document.getElementById('statusBadge');
    if (statusEl) {
      statusEl.className = 'status-badge status-offline';
      statusEl.innerHTML = '❌ Offline';
    }
  }
}

// ────────────────────────────────────────────────────────────
// 17. Event Listeners & Init
// ────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // Theme
  initTheme();
  themeToggle?.addEventListener('click', toggleTheme);

  // Sidebar mobile
  mobileTgl?.addEventListener('click', openSidebar);
  sidebarOverlay?.addEventListener('click', closeSidebar);

  // Chat input — send on Enter (Shift+Enter = new line)
  chatInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });
  chatInput?.addEventListener('input', () => autoResizeTextarea(chatInput));

  sendBtn?.addEventListener('click', sendMessage);
  clearChatBtn?.addEventListener('click', clearChat);

  // Trip Planner form
  tripForm?.addEventListener('submit', generateItinerary);

  // Budget form
  budgetForm?.addEventListener('submit', estimateBudget);

  // Sidebar navigation
  document.querySelectorAll('.nav-item-custom').forEach(btn => {
    btn.addEventListener('click', () => {
      const section = btn.dataset.section;
      if (section) showSection(section);
    });
  });

  // Initial section
  showSection('dashboard');

  // Load async data
  loadSavedTrips();
  loadChecklist();
  checkStatus();
  updateTripCount();

  // Welcome message if chat is empty
  if (chatBody && chatBody.children.length === 0) {
    appendWelcomeMessage();
  }

  // Check status every 60s
  setInterval(checkStatus, 60_000);
});
