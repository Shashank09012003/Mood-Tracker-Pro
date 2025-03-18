// Constants
const STORAGE_KEY = 'mood-tracker-pro-entries';

// DOM Elements
const elements = {
    moodSelector: document.getElementById('moodSelector'),
    moodNote: document.getElementById('moodNote'),
    saveMoodBtn: document.getElementById('saveMoodBtn'),
    viewBtns: {
        day: document.getElementById('dayViewBtn'),
        week: document.getElementById('weekViewBtn'),
        month: document.getElementById('monthViewBtn'),
        calendar: document.getElementById('calendarViewBtn')
    },
    timeline: document.getElementById('timeline'),
    calendar: document.getElementById('calendar'),
    moodStats: document.getElementById('moodStats')
};

let selectedMood = '';
let currentView = 'day';

// Storage Functions
const getMoodEntries = () => {
    const entries = localStorage.getItem(STORAGE_KEY);
    return entries ? JSON.parse(entries) : [];
};

const saveMoodEntry = (entry) => {
    const entries = getMoodEntries();
    const existingEntryIndex = entries.findIndex(e => e.date === entry.date);
    
    if (existingEntryIndex >= 0) {
        entries[existingEntryIndex] = entry;
    } else {
        entries.push(entry);
    }
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
};

// Statistics Functions
const calculateMoodStats = (entries) => {
    const stats = {
        total: entries.length,
        mostFrequent: { mood: '', count: 0 },
        streak: 0
    };

    const moodCounts = {};
    let currentStreak = 0;
    const today = new Date();

    entries.sort((a, b) => new Date(b.date) - new Date(a.date));

    entries.forEach((entry, index) => {
        // Count moods
        moodCounts[entry.mood] = (moodCounts[entry.mood] || 0) + 1;

        // Calculate streak
        if (index === 0) {
            const entryDate = new Date(entry.date);
            if (isSameDay(entryDate, today)) {
                currentStreak = 1;
            }
        } else {
            const prevDate = new Date(entries[index - 1].date);
            const currentDate = new Date(entry.date);
            const diffDays = Math.floor((prevDate - currentDate) / (1000 * 60 * 60 * 24));
            if (diffDays === 1) {
                currentStreak++;
            } else {
                if (currentStreak > stats.streak) {
                    stats.streak = currentStreak;
                }
                currentStreak = 0;
            }
        }
    });

    // Find most frequent mood
    Object.entries(moodCounts).forEach(([mood, count]) => {
        if (count > stats.mostFrequent.count) {
            stats.mostFrequent = { mood, count };
        }
    });

    return stats;
};

// UI Functions
const createMoodSelector = () => {
    const moodButtons = elements.moodSelector.querySelectorAll('.mood-btn');
    
    moodButtons.forEach(button => {
        const emoji = button.dataset.mood;
        button.textContent = emoji;
        
        button.addEventListener('click', () => {
            selectedMood = emoji;
            moodButtons.forEach(btn => btn.classList.remove('selected'));
            button.classList.add('selected');
            elements.saveMoodBtn.disabled = false;
        });
    });
};

const updateStats = () => {
    const entries = getMoodEntries();
    const stats = calculateMoodStats(entries);

    elements.moodStats.innerHTML = `
        <div class="stat-card">
            <div class="stat-value">${stats.total}</div>
            <div class="stat-label">Total Entries</div>
        </div>
        <div class="stat-card">
            <div class="stat-value">${stats.mostFrequent.mood || '-'}</div>
            <div class="stat-label">Most Frequent Mood</div>
        </div>
        <div class="stat-card">
            <div class="stat-value">${stats.streak}</div>
            <div class="stat-label">Day Streak</div>
        </div>
    `;
};

const updateTimeline = () => {
    const entries = getMoodEntries();
    const today = new Date();
    let daysToShow;
    
    switch (currentView) {
        case 'day':
            daysToShow = 7;
            break;
        case 'week':
            daysToShow = 28;
            break;
        case 'month':
            daysToShow = 90;
            break;
        default:
            daysToShow = 7;
    }

    const days = [];
    for (let i = daysToShow - 1; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        days.push(date);
    }

    elements.timeline.innerHTML = `
        <div class="timeline-scroll">
            ${days.map(day => {
                const dateStr = formatDate(day);
                const entry = entries.find(e => e.date === dateStr);
                return `
                    <div class="timeline-day">
                        <div class="timeline-date">${formatDateShort(day)}</div>
                        <div class="timeline-mood">
                            ${entry ? 
                                `<span title="${entry.note || ''}">${entry.mood}</span>` : 
                                '<span class="no-mood">-</span>'
                            }
                        </div>
                    </div>
                `;
            }).join('')}
        </div>
    `;
};

const updateCalendar = () => {
    const entries = getMoodEntries();
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    
    const days = [];
    for (let d = new Date(firstDay); d <= lastDay; d.setDate(d.getDate() + 1)) {
        days.push(new Date(d));
    }

    elements.calendar.innerHTML = `
        <div class="calendar-grid">
            ${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => 
                `<div class="calendar-header">${day}</div>`
            ).join('')}
            ${Array(firstDay.getDay()).fill(0).map(() => 
                `<div class="calendar-day empty"></div>`
            ).join('')}
            ${days.map(day => {
                const dateStr = formatDate(day);
                const entry = entries.find(e => e.date === dateStr);
                const isToday = isSameDay(day, today);
                return `
                    <div class="calendar-day ${isToday ? 'today' : ''}">
                        <div class="day-number">${day.getDate()}</div>
                        ${entry ? 
                            `<div class="day-mood" title="${entry.note || ''}">${entry.mood}</div>` : 
                            ''
                        }
                    </div>
                `;
            }).join('')}
        </div>
    `;
};

const updateView = () => {
    elements.timeline.style.display = currentView !== 'calendar' ? 'block' : 'none';
    elements.calendar.style.display = currentView === 'calendar' ? 'block' : 'none';

    if (currentView === 'calendar') {
        updateCalendar();
    } else {
        updateTimeline();
    }

    // Update view buttons
    Object.entries(elements.viewBtns).forEach(([view, btn]) => {
        btn.classList.toggle('selected', view === currentView);
    });
};

// Helper Functions
const formatDate = (date) => {
    return date.toISOString().split('T')[0];
};

const formatDateShort = (date) => {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const isSameDay = (date1, date2) => {
    return date1.getDate() === date2.getDate() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getFullYear() === date2.getFullYear();
};

// Event Handlers
elements.saveMoodBtn.addEventListener('click', () => {
    const entry = {
        date: formatDate(new Date()),
        mood: selectedMood,
        note: elements.moodNote.value.trim()
    };
    
    saveMoodEntry(entry);
    selectedMood = '';
    elements.moodNote.value = '';
    elements.saveMoodBtn.disabled = true;
    document.querySelectorAll('.mood-btn').forEach(btn => {
        btn.classList.remove('selected');
    });

    elements.saveMoodBtn.classList.add('save-success');
    setTimeout(() => {
        elements.saveMoodBtn.classList.remove('save-success');
    }, 300);

    updateView();
    updateStats();
});

// View toggle handlers
Object.entries(elements.viewBtns).forEach(([view, btn]) => {
    btn.addEventListener('click', () => {
        currentView = view;
        updateView();
    });
});

// Initialize
createMoodSelector();
updateView();
updateStats();