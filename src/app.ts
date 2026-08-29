type JournalEntryRecord = {
  id: string;
  date: string;
  content: string;
  mood: string;
};

const STORAGE_KEY = 'kids-daily-journal.entries';

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

  const render = () => {
    rootElement.innerHTML = `
      <div class="app-shell">
        <header class="topbar">
          <div class="badge">Daily Journal</div>
          <h1>Kids Daily Journal</h1>
        </header>
        <main class="layout">
          <section class="panel">
            <h2>Today's Prompt</h2>
            <div class="prompt-card">
              <h2>What made you smile today?</h2>
              <form id="journal-form">
                <textarea id="journal-response" placeholder="Write your response here..."></textarea>
                <button type="submit">Save entry</button>
              </form>
            </div>
          </section>
          <section class="panel">
            <h2>My Journal Entries</h2>
            ${entries.length === 0
              ? '<p class="empty-state">No entries yet. Start writing!</p>'
              : `<ul class="entry-list">${entries.map((entry) => `
                <li class="entry-card">
                  <div class="entry-header">
                    <span class="entry-date">${entry.date}</span>
                    <button type="button" class="delete-btn" data-entry-id="${entry.id}">Delete</button>
                  </div>
                  <p>${entry.content}</p>
                </li>`).join('')}</ul>`}
          </section>
        </main>
      </div>`;

    document.getElementById('journal-form')?.addEventListener('submit', (event) => {
      event.preventDefault();
      const responseElement = document.getElementById('journal-response') as HTMLTextAreaElement;
      const content = responseElement.value.trim();
      if (!content) return;

      const nextEntry: JournalEntryRecord = {
        id: typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}`,
        date: getToday(),
        content,
        mood: 'happy'
      };
      entries = [nextEntry, ...entries];
      writeEntries(entries);
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