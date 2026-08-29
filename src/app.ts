type EntrySection = 'feelings' | 'best-moment' | 'thankful' | 'journal' | 'goal' | 'draw';

type JournalEntryRecord = {
  id: string;
  date: string;
  content: string;
  section: EntrySection;
};

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

const STORAGE_KEY = 'kids-daily-journal.entries';

const SECTION_COPY: Record<EntrySection, { label: string; emoji: string; prompt: string; placeholder: string }> = {
  feelings: {
    label: 'How I Feel',
    emoji: '😊',
    prompt: 'How are you feeling today?',
    placeholder: 'Tell us how your day feels...'
  },
  'best-moment': {
    label: 'My Best Moment',
    emoji: '⭐',
    prompt: 'What made you smile today?',
    placeholder: 'Write about your favorite part of the day...'
  },
  thankful: {
    label: 'I\'m Thankful For',
    emoji: '🌟',
    prompt: 'What are 3 happy things today?',
    placeholder: 'Write 3 things you are thankful for...'
  },
  journal: {
    label: 'My Journal',
    emoji: '📝',
    prompt: 'Write a little about your day.',
    placeholder: 'What happened today?'
  },
  goal: {
    label: 'My Goal',
    emoji: '🌈',
    prompt: 'What do you want to do tomorrow?',
    placeholder: 'My goal for tomorrow is...'
  },
  draw: {
    label: 'Draw My Day',
    emoji: '🎨',
    prompt: 'Draw your favorite part of the day.',
    placeholder: 'You can also write a quick note here...'
  }
};

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

const readEntries = (): JournalEntryRecord[] => {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as JournalEntryRecord[]) : [];
  } catch {
    return [];
  }
};

const writeEntries = (entries: JournalEntryRecord[]) => {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
};

const getToday = () => new Date().toLocaleDateString(undefined, {
  weekday: 'short',
  month: 'short',
  day: 'numeric',
  year: 'numeric'
});

const rootElement = document.getElementById('root');

if (rootElement) {
  let entries = readEntries();
  let selectedSection: EntrySection | null = null;
  let deferredPrompt: BeforeInstallPromptEvent | null = null;

  const updateInstallButton = () => {
    const installButton = document.getElementById('install-button') as HTMLButtonElement | null;
    if (!installButton) return;

    installButton.hidden = !deferredPrompt;
    installButton.textContent = deferredPrompt ? 'Install app' : 'Installed';
  };

  const updateConnectionStatus = () => {
    const status = document.getElementById('connection-status');
    if (!status) return;

    const isOnline = navigator.onLine;
    status.textContent = isOnline ? 'Online & ready' : 'Offline mode';
    status.classList.toggle('offline', !isOnline);
  };

  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferredPrompt = event as BeforeInstallPromptEvent;
    updateInstallButton();
  });

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    updateInstallButton();
  });

  window.addEventListener('online', updateConnectionStatus);
  window.addEventListener('offline', updateConnectionStatus);

  const render = () => {
    const cards = (Object.keys(SECTION_COPY) as EntrySection[]).map((section) => {
      const config = SECTION_COPY[section];
      return `
        <button type="button" class="menu-card ${section}" data-section="${section}">
          <span class="card-emoji">${config.emoji}</span>
          <span>${escapeHtml(config.label)}</span>
        </button>
      `;
    }).join('');

    const formMarkup = selectedSection
      ? `
        <section class="panel prompt-panel">
          <div class="section-label">${SECTION_COPY[selectedSection].emoji} ${escapeHtml(SECTION_COPY[selectedSection].label)}</div>
          <h2>${escapeHtml(SECTION_COPY[selectedSection].prompt)}</h2>
          <form id="journal-form">
            <textarea id="journal-response" placeholder="${escapeHtml(SECTION_COPY[selectedSection].placeholder)}"></textarea>
            <div class="prompt-actions">
              <button type="button" class="secondary-btn" id="back-to-menu">Back</button>
              <button type="submit">Save</button>
            </div>
          </form>
        </section>
      `
      : `
        <section class="panel menu-panel">
          <h2>Pick a page</h2>
          <div class="menu-grid">${cards}</div>
        </section>
      `;

    const entryMarkup = entries.length === 0
      ? '<p class="empty-state">No entries yet. Start writing!</p>'
      : `<ul class="entry-list">${entries.map((entry) => `
          <li class="entry-card">
            <div class="entry-header">
              <span class="entry-badge">${SECTION_COPY[entry.section].emoji} ${escapeHtml(SECTION_COPY[entry.section].label)}</span>
              <span class="entry-date">${escapeHtml(entry.date)}</span>
            </div>
            <p>${escapeHtml(entry.content)}</p>
            <button type="button" class="delete-btn" data-entry-id="${entry.id}">Delete</button>
          </li>`).join('')}</ul>`;

    rootElement.innerHTML = `
      <div class="app-shell">
        <header class="topbar">
          <div class="top-actions">
            <button id="install-button" class="install-btn" hidden>Install app</button>
            <span id="connection-status" class="status-badge">${navigator.onLine ? 'Online & ready' : 'Offline mode'}</span>
          </div>
          <p class="welcome-tag">Hi, Kiddo!</p>
          <h1>🌞 My Daily Journal</h1>
        </header>
        <main class="content">
          ${formMarkup}
          <section class="panel journal-panel">
            <h2>My Journal</h2>
            ${entryMarkup}
          </section>
        </main>
      </div>
    `;

    const installButton = document.getElementById('install-button') as HTMLButtonElement | null;
    installButton?.addEventListener('click', async () => {
      if (!deferredPrompt) return;

      deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      deferredPrompt = null;
      updateInstallButton();
    });

    updateInstallButton();
    updateConnectionStatus();

    rootElement.querySelectorAll<HTMLButtonElement>('[data-section]').forEach((button) => {
      button.addEventListener('click', () => {
        selectedSection = button.dataset.section as EntrySection;
        render();
      });
    });

    const backButton = document.getElementById('back-to-menu');
    backButton?.addEventListener('click', () => {
      selectedSection = null;
      render();
    });

    document.getElementById('journal-form')?.addEventListener('submit', (event) => {
      event.preventDefault();

      if (!selectedSection) return;

      const responseElement = document.getElementById('journal-response') as HTMLTextAreaElement;
      const content = responseElement.value.trim();
      if (!content) return;

      const nextEntry: JournalEntryRecord = {
        id: typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}`,
        date: getToday(),
        content,
        section: selectedSection
      };

      entries = [nextEntry, ...entries];
      writeEntries(entries);
      selectedSection = null;
      render();
    });

    rootElement.querySelectorAll<HTMLButtonElement>('[data-entry-id]').forEach((button) => {
      button.addEventListener('click', () => {
        entries = entries.filter((entry) => entry.id !== button.dataset.entryId);
        writeEntries(entries);
        render();
      });
    });
  };

  render();
}