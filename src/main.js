/**
 * DARSHAN INN RESTAURANT - LIGHTWEIGHT & ROBUST FRONTEND SCRIPT
 * Focused on performance, mobile usability, live status calculations,
 * accessibility (WCAG), and smooth interactions.
 */

/* ==========================================================================
   1. OPERATING HOURS & LIVE STATUS (ACCURATE & EDITABLE)
   ========================================================================== */
export const DEFAULT_HOURS = {
  lunchStart: '11:00',
  lunchEnd: '15:00',    // 3:00 PM ("Closes 3 pm")
  dinnerStart: '18:00',  // 6:00 PM ("Reopens 6 pm")
  dinnerEnd: '23:00',   // 11:00 PM
  listingNote: 'Closes 3 pm · Reopens 6 pm'
};

export const RESTAURANT_FULL_ADDRESS =
  'C-Building, 1st, Mark Point, Kharvasa-Dindoli Road, Sai Shiv Shakti Society, Dindoli, Surat, Gujarat 394210';

export function parseTimeToMinutes(timeStr) {
  if (!timeStr || typeof timeStr !== 'string') return null;
  const match = timeStr.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  return hours * 60 + minutes;
}

export function formatTimeTo12Hour(timeStr) {
  if (!timeStr || typeof timeStr !== 'string') return '';
  const total = parseTimeToMinutes(timeStr);
  if (total === null) return '';
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  const period = hours >= 12 ? 'PM' : 'AM';
  const h12 = hours % 12 || 12;
  const mStr = `:${minutes < 10 ? '0' : ''}${minutes}`;
  return `${h12}${mStr} ${period}`;
}

export function validateHours(hours) {
  if (!hours || typeof hours !== 'object') {
    return { valid: false, error: 'Invalid schedule data provided.' };
  }
  const lStart = parseTimeToMinutes(hours.lunchStart);
  const lEnd = parseTimeToMinutes(hours.lunchEnd);
  const dStart = parseTimeToMinutes(hours.dinnerStart);
  const dEnd = parseTimeToMinutes(hours.dinnerEnd);

  if (lStart === null || lEnd === null) {
    return { valid: false, error: 'Please enter valid lunch start and closing times (HH:MM).' };
  }
  if (dStart === null || dEnd === null) {
    return { valid: false, error: 'Please enter valid dinner reopening and closing times (HH:MM).' };
  }
  if (lStart >= lEnd) {
    return { valid: false, error: 'Lunch closing time must be later than lunch open time.' };
  }
  if (lEnd > dStart) {
    return { valid: false, error: 'Dinner reopening time cannot be earlier than lunch close time.' };
  }
  if (dStart >= dEnd) {
    return { valid: false, error: 'Dinner closing time must be later than dinner reopening time.' };
  }
  if (!hours.listingNote || !hours.listingNote.trim()) {
    return { valid: false, error: 'Official schedule note cannot be empty.' };
  }
  return { valid: true };
}

export function getStoredHours() {
  try {
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem('darshan_hours_schedule');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          const merged = { ...DEFAULT_HOURS, ...parsed };
          if (validateHours(merged).valid) return merged;
        }
      }
    }
  } catch (e) {
    console.warn('LocalStorage read error:', e);
  }
  return DEFAULT_HOURS;
}

export function saveHours(hours) {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('darshan_hours_schedule', JSON.stringify(hours));
    }
  } catch (e) {
    console.warn('LocalStorage save error:', e);
  }
}

export function getSuratTime() {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Kolkata',
      hour: 'numeric',
      minute: 'numeric',
      hour12: false
    }).formatToParts(new Date());
    let hour = 0;
    let minute = 0;
    for (const p of parts) {
      if (p.type === 'hour') hour = parseInt(p.value, 10);
      if (p.type === 'minute') minute = parseInt(p.value, 10);
    }
    return { hour: hour % 24, minute };
  } catch (e) {
    // Fallback if Intl fails
    const now = new Date();
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    const istTime = new Date(utc + (3600000 * 5.5));
    return { hour: istTime.getHours(), minute: istTime.getMinutes() };
  }
}

export function getLiveStatusInfo(hours, currentISTMinutes) {
  const lStart = parseTimeToMinutes(hours.lunchStart) ?? 660; // 11:00 AM
  const lEnd = parseTimeToMinutes(hours.lunchEnd) ?? 900;     // 3:00 PM
  const dStart = parseTimeToMinutes(hours.dinnerStart) ?? 1080;// 6:00 PM
  const dEnd = parseTimeToMinutes(hours.dinnerEnd) ?? 1380;   // 11:00 PM

  let statusMsg = '';
  let isOpen = false;
  let isBreak = false;
  let statusType = 'closed';

  if (currentISTMinutes >= lStart && currentISTMinutes < lEnd) {
    isOpen = true;
    statusType = 'open';
    statusMsg = `Open Now for Lunch · Closes at ${formatTimeTo12Hour(hours.lunchEnd)}`;
  } else if (currentISTMinutes >= lEnd && currentISTMinutes < dStart) {
    isBreak = true;
    statusType = 'break';
    statusMsg = `Afternoon Break · Reopens at ${formatTimeTo12Hour(hours.dinnerStart)}`;
  } else if (currentISTMinutes >= dStart && currentISTMinutes < dEnd) {
    isOpen = true;
    statusType = 'open';
    statusMsg = `Open Now for Dinner · Closes at ${formatTimeTo12Hour(hours.dinnerEnd)}`;
  } else {
    isOpen = false;
    statusType = 'closed';
    statusMsg = `Closed Now · Reopens at ${formatTimeTo12Hour(hours.lunchStart)} for Lunch`;
  }

  return { isOpen, isBreak, statusType, statusMsg };
}

export function updateHoursDisplays(hours) {
  const quoteEl = document.getElementById('display-listing-note');
  const lunchEl = document.getElementById('display-lunch-time');
  const dinnerEl = document.getElementById('display-dinner-time');

  if (quoteEl) quoteEl.textContent = `“${hours.listingNote}”`;
  if (lunchEl) lunchEl.textContent = `${formatTimeTo12Hour(hours.lunchStart)} – ${formatTimeTo12Hour(hours.lunchEnd)}`;
  if (dinnerEl) dinnerEl.textContent = `${formatTimeTo12Hour(hours.dinnerStart)} – ${formatTimeTo12Hour(hours.dinnerEnd)}`;
}

export function calculateLiveStatus(hours) {
  const { hour, minute } = getSuratTime();
  const currentTotalMins = hour * 60 + minute;
  const { isOpen, isBreak, statusType, statusMsg } = getLiveStatusInfo(hours, currentTotalMins);

  const statusText = document.getElementById('live-status-text');
  const hoursLiveText = document.getElementById('hours-live-status');

  if (statusText) {
    const textColor = isOpen ? '#15803D' : (isBreak ? '#B45309' : '#DC2626');
    statusText.innerHTML = `Schedule Note: <strong>${hours.listingNote}</strong> &bull; <span style="color: ${textColor}; font-weight: 700;">${statusMsg}</span>`;
  }

  if (hoursLiveText) {
    hoursLiveText.textContent = `Current Status in Surat: ${statusMsg}`;
  }

  // Synchronize both status dots (announcement bar + operating hours section)
  const dots = document.querySelectorAll('.status-dot, .live-dot');
  dots.forEach((dot) => {
    const isLiveDot = dot.classList.contains('live-dot');
    const baseClass = isLiveDot ? 'live-dot' : 'status-dot';

    dot.classList.remove('pulsating', 'status-open', 'status-break', 'status-closed');
    dot.classList.add(baseClass, `status-${statusType}`);

    if (isOpen) {
      dot.classList.add('pulsating');
      dot.style.backgroundColor = '#15803D';
    } else if (isBreak) {
      dot.style.backgroundColor = '#D97706';
    } else {
      dot.style.backgroundColor = '#DC2626';
    }
  });
}

function initHoursAndStatus() {
  const currentHours = getStoredHours();
  updateHoursDisplays(currentHours);
  calculateLiveStatus(currentHours);

  // Periodic update every minute
  setInterval(() => {
    calculateLiveStatus(getStoredHours());
  }, 60000);

  // Modal logic with accessibility focus management & keyboard trap
  const modal = document.getElementById('hours-modal');
  const openBtn1 = document.getElementById('open-hours-modal-btn');
  const openBtn2 = document.getElementById('open-edit-hours-btn');
  const closeBtn = document.getElementById('close-hours-modal-btn');
  const resetBtn = document.getElementById('reset-hours-btn');
  const form = document.getElementById('hours-form');
  const errorAlert = document.getElementById('modal-error-msg');

  let lastActiveElement = null;

  function setModalError(msg) {
    if (!errorAlert) return;
    if (msg) {
      errorAlert.textContent = msg;
      errorAlert.style.display = 'flex';
    } else {
      errorAlert.textContent = '';
      errorAlert.style.display = 'none';
    }
  }

  function openModal(triggerElement) {
    lastActiveElement = triggerElement || document.activeElement;
    const h = getStoredHours();
    setModalError('');

    const inLunchStart = document.getElementById('input-lunch-start');
    const inLunchEnd = document.getElementById('input-lunch-end');
    const inDinnerStart = document.getElementById('input-dinner-start');
    const inDinnerEnd = document.getElementById('input-dinner-end');
    const inListingNote = document.getElementById('input-listing-note');

    if (inLunchStart) inLunchStart.value = h.lunchStart;
    if (inLunchEnd) inLunchEnd.value = h.lunchEnd;
    if (inDinnerStart) inDinnerStart.value = h.dinnerStart;
    if (inDinnerEnd) inDinnerEnd.value = h.dinnerEnd;
    if (inListingNote) inListingNote.value = h.listingNote;

    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';

    // Focus first interactive element in modal
    setTimeout(() => {
      if (inLunchStart) inLunchStart.focus();
    }, 50);
  }

  function closeModal() {
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    setModalError('');

    if (lastActiveElement && typeof lastActiveElement.focus === 'function') {
      lastActiveElement.focus();
    }
  }

  if (openBtn1) openBtn1.addEventListener('click', (e) => openModal(e.currentTarget));
  if (openBtn2) openBtn2.addEventListener('click', (e) => openModal(e.currentTarget));
  if (closeBtn) closeBtn.addEventListener('click', closeModal);

  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });

  // Modal focus trap & ESC handling
  modal.addEventListener('keydown', (e) => {
    if (e.key === 'Tab') {
      const focusable = modal.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        last.focus();
        e.preventDefault();
      } else if (!e.shiftKey && document.activeElement === last) {
        first.focus();
        e.preventDefault();
      }
    }
  });

  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      saveHours(DEFAULT_HOURS);
      updateHoursDisplays(DEFAULT_HOURS);
      calculateLiveStatus(DEFAULT_HOURS);
      closeModal();
      showToast('Hours reset to official defaults', 'success');
    });
  }

  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const lunchStartVal = document.getElementById('input-lunch-start')?.value || '';
      const lunchEndVal = document.getElementById('input-lunch-end')?.value || '';
      const dinnerStartVal = document.getElementById('input-dinner-start')?.value || '';
      const dinnerEndVal = document.getElementById('input-dinner-end')?.value || '';
      const listingNoteVal = document.getElementById('input-listing-note')?.value.trim() || DEFAULT_HOURS.listingNote;

      const updated = {
        lunchStart: lunchStartVal,
        lunchEnd: lunchEndVal,
        dinnerStart: dinnerStartVal,
        dinnerEnd: dinnerEndVal,
        listingNote: listingNoteVal
      };

      const validation = validateHours(updated);
      if (!validation.valid) {
        setModalError(validation.error);
        showToast(validation.error, 'error');
        return;
      }

      setModalError('');
      saveHours(updated);
      updateHoursDisplays(updated);
      calculateLiveStatus(updated);
      closeModal();
      showToast('Operating schedule updated!', 'success');
    });
  }
}

/* ==========================================================================
   2. ONE-CLICK ADDRESS COPY & TOAST NOTIFICATION
   ========================================================================== */
export async function copyToClipboard(text) {
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (e) {
      // Fall through to textarea fallback
    }
  }

  try {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-9999px';
    textArea.style.top = '0';
    textArea.setAttribute('readonly', '');
    document.body.appendChild(textArea);
    textArea.select();
    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    return successful;
  } catch (err) {
    console.warn('Fallback copy error:', err);
    return false;
  }
}

function initAddressCopy() {
  const copyBtn = document.getElementById('copy-address-btn');
  const copyText = document.getElementById('copy-btn-text');

  if (!copyBtn) return;

  copyBtn.addEventListener('click', async () => {
    const copied = await copyToClipboard(RESTAURANT_FULL_ADDRESS);
    if (copied) {
      if (copyText) copyText.textContent = 'Copied!';
      showToast('Address copied to clipboard!', 'success');

      setTimeout(() => {
        if (copyText) copyText.textContent = 'Copy Full Address';
      }, 2500);
    } else {
      showToast('Address: ' + RESTAURANT_FULL_ADDRESS, 'success');
    }
  });
}

export function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast ${type === 'error' ? 'toast-error' : ''}`;
  const icon = type === 'error'
    ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#DC2626" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`
    : `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#15803D" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>`;

  toast.innerHTML = `
    ${icon}
    <span>${message}</span>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3200);
}

/* ==========================================================================
   3. MOBILE NAVIGATION DRAWER & ACCESSIBILITY
   ========================================================================== */
function initMobileNavigation() {
  const toggleBtn = document.getElementById('mobile-menu-toggle');
  const drawer = document.getElementById('mobile-nav-drawer');
  const backdrop = document.getElementById('mobile-drawer-backdrop');
  const closeBtn = document.getElementById('drawer-close');
  const navLinks = document.querySelectorAll('.mobile-nav-link');

  if (!toggleBtn || !drawer) return;

  function openDrawer() {
    drawer.classList.add('open');
    drawer.setAttribute('aria-hidden', 'false');
    if (backdrop) {
      backdrop.classList.add('open');
      backdrop.setAttribute('aria-hidden', 'false');
    }
    toggleBtn.classList.add('active');
    toggleBtn.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
  }

  function closeDrawer() {
    drawer.classList.remove('open');
    drawer.setAttribute('aria-hidden', 'true');
    if (backdrop) {
      backdrop.classList.remove('open');
      backdrop.setAttribute('aria-hidden', 'true');
    }
    toggleBtn.classList.remove('active');
    toggleBtn.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
  }

  toggleBtn.addEventListener('click', () => {
    if (drawer.classList.contains('open')) closeDrawer();
    else openDrawer();
  });

  if (closeBtn) closeBtn.addEventListener('click', closeDrawer);
  if (backdrop) backdrop.addEventListener('click', closeDrawer);

  navLinks.forEach((link) => {
    link.addEventListener('click', closeDrawer);
  });

  // Global ESC key listener (handles modal and mobile drawer)
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const modal = document.getElementById('hours-modal');
      if (modal && modal.classList.contains('open')) {
        const closeBtn = document.getElementById('close-hours-modal-btn');
        if (closeBtn) closeBtn.click();
      } else if (drawer.classList.contains('open')) {
        closeDrawer();
      }
    }
  });
}

/* ==========================================================================
   4. SCROLL PROGRESS, DYNAMIC YEAR & HEADER SHADOW
   ========================================================================== */
function initScrollFeatures() {
  const progressBar = document.getElementById('scroll-progress-bar');
  const header = document.getElementById('site-header');
  const yearEl = document.getElementById('current-year');

  if (yearEl) {
    yearEl.textContent = new Date().getFullYear();
  }

  window.addEventListener('scroll', () => {
    const scrollY = window.scrollY;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const progress = docHeight > 0 ? (scrollY / docHeight) * 100 : 0;

    if (progressBar) {
      progressBar.style.width = `${progress}%`;
    }

    if (header) {
      if (scrollY > 20) header.classList.add('scrolled');
      else header.classList.remove('scrolled');
    }
  }, { passive: true });
}

/* Initialize when DOM is ready */
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      initHoursAndStatus();
      initAddressCopy();
      initMobileNavigation();
      initScrollFeatures();
    });
  } else {
    initHoursAndStatus();
    initAddressCopy();
    initMobileNavigation();
    initScrollFeatures();
  }
}
