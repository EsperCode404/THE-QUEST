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

    const SYSTEM_MATRIX_TREE = {
        "objectives_tree": {
            "children": [
                {
                    "name": "Banking Exams Preparation",
                    "children": [
                        {
                            "id": "quant_trials",
                            "name": "Quantitative Aptitude",
                            "tag": "[QUANTITATIVE APTITUDE]",
                            "type": "sub_quest",
                            "schedule": { "start": "08:00", "end": "10:00" }
                        },
                        {
                            "id": "reasoning_dungeon",
                            "name": "Reasoning Ability",
                            "tag": "[REASONING ABILITY]",
                            "type": "sub_quest",
                            "schedule": { "start": "10:30", "end": "12:30" }
                        },
                        {
                            "id": "linguistic_quest",
                            "name": "English Language",
                            "tag": "[ENGLISH LANGUAGE QUEST]",
                            "type": "sub_quest",
                            "schedule": { "start": "16:00", "end": "17:00" }
                        },
                        {
                            "id": "database_acquisition",
                            "name": "Banking Awareness Database Acquisition",
                            "tag": "[BANKING AWARENESS DATABASE ACQUISITION]",
                            "type": "sub_quest",
                            "schedule": { "start": "17:00", "end": "18:00" }
                        }
                    ]
                }
            ]
        }
    };

    let trackingEnabled = false;

    function extractScheduledTasks() {
        const tasks = [];
        function traverse(node) {
            if (node.type === "sub_quest" && node.schedule) {
                tasks.push({
                    start: node.schedule.start,
                    end: node.schedule.end,
                    tag: node.tag || `[${node.name.toUpperCase()}]`,
                    name: node.name
                });
            }
            if (node.children) node.children.forEach(traverse);
        }
        traverse(SYSTEM_MATRIX_TREE.objectives_tree);
        return tasks;
    }

    const windows = extractScheduledTasks();

    function pad(n) { return String(n).padStart(2, '0'); }

    // 12-Hour System Clock Realtime Formatter
    function formatTime(d) {
        let hours = d.getHours();
        const minutes = pad(d.getMinutes());
        const seconds = pad(d.getSeconds());
        const ampm = hours >= 12 ? 'PM' : 'AM';

        hours = hours % 12;
        hours = hours ? hours : 12;

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

    function getActiveWindow(now) {
        for (const w of windows) {
            const s = timeToDate(now, w.start);
            const e = timeToDate(now, w.end);
            if (now >= s && now < e) return { w, end: e };
        }
        return null;
    }

    function getNextWindowFrom(now) {
        for (const w of windows) {
            const s = timeToDate(now, w.start);
            if (s > now) return { w, start: s };
        }
        return null;
    }

    function updateUI() {
        const now = new Date();

        if (dayLabel) dayLabel.textContent = formatDay(now);
        if (clockEl) clockEl.textContent = formatTime(now);

        const active = getActiveWindow(now);

        if (active) {
            if (questCircleBtn) questCircleBtn.style.cursor = 'pointer';
            if (questTag) questTag.textContent = active.w.tag;
            if (questTitle) questTitle.textContent = active.w.name;
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
            if (questTitle) questTitle.textContent = "REST MODE";
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
        const ms = Math.floor((diffMs % 1000) / 10);

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
    setInterval(updateUI, 33);
})();