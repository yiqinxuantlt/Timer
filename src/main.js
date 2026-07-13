// ========================================
// Study Timer — Soft Minimalism
// ========================================

// Timer State
let timerInterval = null;
let elapsedSeconds = 0;
let isRunning = false;
let isPaused = false;

// DOM Elements
const timerDisplay = document.getElementById('timerDisplay');
const timeLabel = document.getElementById('timeLabel');
const startBtn = document.getElementById('startBtn');
const pauseBtn = document.getElementById('pauseBtn');
const stopBtn = document.getElementById('stopBtn');
const minimizeBtn = document.getElementById('minimizeBtn');
const closeBtn = document.getElementById('closeBtn');
const subjectInput = document.getElementById('subjectInput');
const todayTotal = document.getElementById('todayTotal');
const allTotal = document.getElementById('allTotal');
const historyToggle = document.getElementById('historyToggle');
const historyPanel = document.getElementById('historyPanel');
const historyList = document.getElementById('historyList');
const progressCircle = document.getElementById('progressCircle');

// Constants
const CIRCLE_CIRCUMFERENCE = 2 * Math.PI * 70; // r=70 (updated from 80)
const TARGET_SECONDS = 3600; // 1 hour target for progress ring

// ========================================
// Format Helpers
// ========================================

function formatTime(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function formatDuration(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) {
    return `${h}h ${m}m`;
  }
  return `${m}m`;
}

// ========================================
// Progress Ring
// ========================================

function updateProgressRing() {
  const progress = Math.min(elapsedSeconds / TARGET_SECONDS, 1);
  const offset = CIRCLE_CIRCUMFERENCE * (1 - progress);
  progressCircle.style.strokeDashoffset = offset;
}

function updateDisplay() {
  timerDisplay.textContent = formatTime(elapsedSeconds);
  updateProgressRing();
}

// ========================================
// Stats & History
// ========================================

function updateStats(data) {
  const today = new Date().toISOString().split('T')[0];
  const todaySeconds = data.records
    .filter(r => r.date === today)
    .reduce((sum, r) => sum + r.duration_seconds, 0);
  
  todayTotal.textContent = formatDuration(todaySeconds);
  allTotal.textContent = formatDuration(data.total_seconds);
  
  renderHistory(data.records);
}

function renderHistory(records) {
  if (records.length === 0) {
    historyList.innerHTML = '<div class="history-empty">no records yet</div>';
    return;
  }
  
  const sorted = [...records].sort((a, b) => b.date.localeCompare(a.date));
  
  historyList.innerHTML = sorted.map(record => `
    <div class="history-item">
      <div class="history-item-left">
        <span class="history-date">${record.date}</span>
        <span class="history-subject">${record.subject || 'untitled'}</span>
      </div>
      <span class="history-duration">${formatDuration(record.duration_seconds)}</span>
    </div>
  `).join('');
}

// ========================================
// Timer Controls
// ========================================

function startTimer() {
  if (isRunning && !isPaused) return;
  
  if (!isPaused) {
    elapsedSeconds = 0;
  }
  
  isRunning = true;
  isPaused = false;
  
  // Update UI state
  document.querySelector('.timer-ring').classList.add('running');
  timeLabel.textContent = 'focusing';
  
  timerInterval = setInterval(() => {
    elapsedSeconds++;
    updateDisplay();
  }, 1000);
  
  updateButtons();
}

function pauseTimer() {
  if (!isRunning || isPaused) return;
  
  isPaused = true;
  clearInterval(timerInterval);
  timerInterval = null;
  
  timeLabel.textContent = 'paused';
  updateButtons();
}

function stopTimer() {
  if (!isRunning) return;
  
  clearInterval(timerInterval);
  timerInterval = null;
  
  if (elapsedSeconds > 0) {
    const subject = subjectInput.value.trim() || '学习';
    saveSession(elapsedSeconds, subject);
  }
  
  elapsedSeconds = 0;
  isRunning = false;
  isPaused = false;
  
  // Reset UI state
  document.querySelector('.timer-ring').classList.remove('running');
  timeLabel.textContent = 'ready';
  
  updateDisplay();
  updateButtons();
}

function updateButtons() {
  startBtn.disabled = isRunning && !isPaused;
  pauseBtn.disabled = !isRunning || isPaused;
  stopBtn.disabled = !isRunning;
}

// ========================================
// Data Persistence
// ========================================

async function saveSession(duration, subject) {
  try {
    if (window.__TAURI__) {
      const data = await window.__TAURI__.invoke('save_study_session', {
        durationSeconds: duration,
        subject: subject
      });
      updateStats(data);
    } else {
      const data = saveSessionFallback(duration, subject);
      updateStats(data);
    }
  } catch (error) {
    console.error('Failed to save session:', error);
  }
}

function saveSessionFallback(duration, subject) {
  const storageKey = 'studyTimerData';
  let data = JSON.parse(localStorage.getItem(storageKey) || '{"records":[],"total_seconds":0}');
  
  const today = new Date().toISOString().split('T')[0];
  const existing = data.records.find(r => r.date === today && r.subject === subject);
  
  if (existing) {
    existing.duration_seconds += duration;
  } else {
    data.records.push({
      date: today,
      duration_seconds: duration,
      subject: subject
    });
  }
  
  data.total_seconds += duration;
  localStorage.setItem(storageKey, JSON.stringify(data));
  return data;
}

async function loadData() {
  try {
    if (window.__TAURI__) {
      const data = await window.__TAURI__.invoke('get_study_data');
      updateStats(data);
    } else {
      const data = JSON.parse(localStorage.getItem('studyTimerData') || '{"records":[],"total_seconds":0}');
      updateStats(data);
    }
  } catch (error) {
    console.error('Failed to load data:', error);
  }
}

// ========================================
// Event Listeners
// ========================================

startBtn.addEventListener('click', startTimer);
pauseBtn.addEventListener('click', pauseTimer);
stopBtn.addEventListener('click', stopTimer);

minimizeBtn.addEventListener('click', async () => {
  if (window.__TAURI__) {
    await window.__TAURI__.invoke('plugin:window|minimize');
  }
});

closeBtn.addEventListener('click', async () => {
  if (window.__TAURI__) {
    await window.__TAURI__.invoke('plugin:window|close');
  }
});

historyToggle.addEventListener('click', () => {
  const isActive = historyToggle.classList.toggle('active');
  historyPanel.classList.toggle('open');
  historyToggle.setAttribute('aria-expanded', isActive);
});

// ========================================
// Initialize
// ========================================

loadData();
updateDisplay();
progressCircle.style.strokeDasharray = CIRCLE_CIRCUMFERENCE;
progressCircle.style.strokeDashoffset = CIRCLE_CIRCUMFERENCE;
