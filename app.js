(function () {
    const dayLabel = document.getElementById('dayLabel');
    const clockEl = document.getElementById('clock');
    const questTag = document.getElementById('questTag');
    const questTitle = document.getElementById('questTitle');
    const questState = document.getElementById('questState');
    const questDesc = document.getElementById('questDescription');
    const timeRemainingEl = document.getElementById('timeRemaining');
    const nextWindowEl = document.getElementById('nextWindow');
    const feedContentEl = document.getElementById('feedContent');
    const questCircleBtn = document.getElementById('questCircleBtn');
    const questStatusText = document.getElementById('questStatusText');

    // INTEGRATED MATRIX: Restored full 24-hour approved tracking layout
    const QUEST_WINDOWS = [
        { id: "quant_trials", name: "Quantitative Aptitude", tag: "[QUANTITATIVE APTITUDE]", start: "08:00", end: "10:00" },
        { id: "reasoning_dungeon", name: "Reasoning Ability", tag: "[REASONING ABILITY]", start: "10:30", end: "12:30" },
        { id: "ecom_matrix", name: "E-com Listings & Trend Analysis", tag: "[E-COM OPERATIONS]", start: "13:30", end: "14:30" },
        { id: "linguistic_quest", name: "English Language Focus", tag: "[ENGLISH LANGUAGE QUEST]", start: "16:00", end: "17:00" },
        { id: "database_acquisition", name: "Banking Awareness News", tag: "[BANKING AWARENESS ACQUISITION]", start: "17:00", end: "18:00" },
        { id: "physical_conditioning", name: "Evening Gym Conditioning (PPL)", tag: "[PHYSICAL CONDITIONING]", start: "18:30", end: "19:30" }
    ];

    let trackingEnabled = false;
    let swRegistration = null;
    let triggeredAlarms = new Set(); // Tracks fired alerts across current date cycles

    function pad(n) { return String(n).padStart(2, '0'); }

    function formatTime(d) {
        let hours = d.getHours();
        const minutes = pad(d.getMinutes());
        const seconds = pad(d.getSeconds());
        const ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12 || 12;
        return `${pad(hours)}:${minutes}:${seconds} ${ampm}`;
    }

    function formatDay(d) {
        return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase();
    }

    function timeToDate(today, hhmm) {
        const [hh, mm] = hhmm.split(':').map(Number);
        const date = new Date(today);
        date.setHours(hh, mm, 0, 0);
        return date;
    }

    // PWA Service Worker Registration & Notification Permissions Protocol
    if ('serviceWorker' in navigator && 'Notification' in window) {
        navigator.serviceWorker.register('sw.js')
            .then((reg) => {
                swRegistration = reg;
                logToFeed("SYSTEM: ServiceWorker linked and stable.");
                return Notification.requestPermission();
            })
            .then((permission) => {
                if (permission === 'granted') {
                    logToFeed("SYSTEM: Mobile Push Permissions Granted.");
                } else {
                    logToFeed("WARNING: Push Access Denied.");
                }
            })
            .catch(err => logToFeed(`CRITICAL: PWA Init Failed -> ${err}`));
    }

    function checkAlarmTriggers(now) {
        if (!swRegistration) return;

        QUEST_WINDOWS.forEach(w => {
            const startTime = timeToDate(now, w.start);
            const endTime = timeToDate(now, w.end);

            // Pre-Warning threshold: Exactly 5 minutes before quest start
            const warningTime = new Date(startTime.getTime() - (5 * 60 * 1000));

            const dateStr = now.toDateString();
            const warningKey = `${w.id}_warn_${dateStr}`;
            const completeKey = `${w.id}_comp_${dateStr}`;

            // Check Pre-Quest Warning Alert Trigger Window
            if (now >= warningTime && now < startTime && !triggeredAlarms.has(warningKey)) {
                triggeredAlarms.add(warningKey);
                sendSystemPush(`⚠️ SYSTEM INTERRUPT: NEXT INITIALIZATION`, `5 minutes until quest window activates: ${w.name}`, warningKey);
            }

            // Check Quest Completion Target Window
            if (now >= endTime && !triggeredAlarms.has(completeKey)) {
                triggeredAlarms.add(completeKey);
                sendSystemPush(`✅ QUEST COMPLETED`, `${w.name} sequence complete. Clear workspace immediately.`, completeKey);
            }
        });
    }

    function sendSystemPush(title, body, tag) {
        if (navigator.serviceWorker.controller) {
            navigator.serviceWorker.controller.postMessage({
                type: 'TRIGGER_ALARM',
                title: title,
                body: body,
                tag: tag
            });
        }
    }

    function getActiveWindow(now) {
        for (const w of QUEST_WINDOWS) {
            const s = timeToDate(now, w.start);
            const e = timeToDate(now, w.end);
            if (now >= s && now < e) return { w, end: e };
        }
        return null;
    }

    function getNextWindowFrom(now) {
        for (const w of QUEST_WINDOWS) {
            const s = timeToDate(now, w.start);
            if (s > now) return { w, start: s };
        }
        return null;
    }

    function updateUI() {
        const now = new Date();

        if (dayLabel) dayLabel.textContent = formatDay(now);
        if (clockEl) clockEl.textContent = formatTime(now);

        checkAlarmTriggers(now);

        const active = getActiveWindow(now);

        if (active) {
            if (questCircleBtn) questCircleBtn.style.cursor = 'pointer';
            if (questTag) questTag.textContent = active.w.tag;

            // DYNAMIC BUFF: Inject the glow class rule onto your active objective text
            if (questTitle) {
                questTitle.textContent = active.w.name;
                questTitle.classList.add('active-quest-glow');
            }

            if (questState) {
                questState.textContent = trackingEnabled ? "TRACKING ACTIVE" : "STANDBY";
                questState.style.color = trackingEnabled ? 'var(--accent)' : '#00f0ff';
            }
            if (questDesc) questDesc.textContent = "⚠️ EXECUTE THIS QUEST IMMEDIATELY. NO DELAYS.";
            updateCountdown(active.end, now);
        } else {
            trackingEnabled = false;
            updateButtonState(false);
            if (questCircleBtn) questCircleBtn.style.cursor = 'not-allowed';

            if (questTag) questTag.textContent = "[SYSTEM RESTCYCLE]";

            // DYNAMIC DE-ACTIVATION: Strip away the glow protocol during system rest cycles
            if (questTitle) {
                questTitle.textContent = "REST MODE";
                questTitle.classList.remove('active-quest-glow');
            }

            if (questState) {
                questState.textContent = "IDLE";
                questState.style.color = 'rgba(255,255,255,0.3)';
            }
            if (questDesc) questDesc.textContent = "NO CURRENT OBJECTIVE.";

            const next = getNextWindowFrom(now);
            const endTarget = next ? next.start : new Date(new Date().setHours(24, 0, 0, 0));
            updateCountdown(endTarget, now);
        }

        const next = getNextWindowFrom(now);
        if (nextWindowEl) {
            if (next) {
                const rawTime = next.start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
                nextWindowEl.innerHTML = `NEXT SEQUENCE: <span style="color: var(--active); text-shadow: 0 0 6px rgba(0, 240, 255, 0.5); font-weight:700;">${next.w.name.toUpperCase()}</span> @ <span style="color: #ffffff;">${rawTime}</span>`;
            } else {
                nextWindowEl.textContent = 'NEXT SEQUENCE: NONE SCHEDULED';
            }
        }
    }

    function updateCountdown(targetDate, now) {
        if (!timeRemainingEl) return;
        const diffMs = targetDate - now;

        if (diffMs <= 0) {
            timeRemainingEl.textContent = "00:00:00";
            timeRemainingEl.removeAttribute('data-time');
            const msNode = document.getElementById('msNode');
            if (msNode) msNode.textContent = ".00";
            return;
        }

        const totalSeconds = Math.floor(diffMs / 1000);
        const hh = Math.floor(totalSeconds / 3600);
        const mm = Math.floor((totalSeconds % 3600) / 60);
        const ss = totalSeconds % 60;
        const ms = Math.floor((diffMs % 1000) / 10); // Precise millisecond node parsing

        const currentCountdownStr = `${pad(hh)}:${pad(mm)}:${pad(ss)}`;

        timeRemainingEl.textContent = currentCountdownStr;
        timeRemainingEl.setAttribute('data-time', currentCountdownStr);

        const msNode = document.getElementById('msNode');
        if (msNode) msNode.textContent = `.${pad(ms)}`;
    }

    function updateButtonState(enabled) {
        if (!questCircleBtn) return;
        if (enabled) {
            questCircleBtn.classList.add('enabled');
            if (questStatusText) questStatusText.textContent = "TRACK: ACTIVE";
            if (questStatusText) questStatusText.style.color = "var(--accent)";
        } else {
            questCircleBtn.classList.remove('enabled');
            if (questStatusText) questStatusText.textContent = "TRACK: STDBY";
            if (questStatusText) questStatusText.style.color = "rgba(255,255,255,0.4)";
        }
    }

    if (questCircleBtn) {
        questCircleBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const now = new Date();
            if (!getActiveWindow(now)) return;

            trackingEnabled = !trackingEnabled;
            updateButtonState(trackingEnabled);
            logToFeed(`Quest status changed: ${trackingEnabled ? 'RUNNING' : 'STANDBY'}`);
        });
    }

    function logToFeed(text) {
        if (!feedContentEl) return;
        const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
        feedContentEl.textContent = `[${timestamp}] ${text}\n` + feedContentEl.textContent;
    }

    updateUI();
    setInterval(updateUI, 33); // 33ms High-Refresh Frame Engine RESTORED
})();