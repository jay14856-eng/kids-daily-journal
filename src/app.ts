import { createClient } from '@supabase/supabase-js';

type EntrySection = 'feelings' | 'best-moment' | 'thankful' | 'journal' | 'goal' | 'draw' | 'photos';
type ThemeName = 'sunny' | 'garden' | 'space' | 'castle' | 'jungle' | 'pirate';

type JournalEntryRecord = {
  id: string;
  date: string;
  content: string;
  section: EntrySection;
  photos?: string[]; // base64 encoded images
};

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

const STORAGE_KEY = 'kids-daily-journal.entries';
const DEVICE_ID_KEY = 'kids-daily-journal.device-id';
const SYNC_KEY_STORAGE = 'kids-daily-journal.sync-key';
const LAST_SYNC_KEY = 'kids-daily-journal.last-sync';

// Supabase client
const supabaseUrl = 'https://guhgtuwhnlyfxtlrfjbh.supabase.co';
const supabaseKey = 'sb_publishable_1iIPQEVSIhKxPeVTZNgqYg_fV2UKUmm';
const supabase = createClient(supabaseUrl, supabaseKey);

// Device management
const getOrCreateDeviceId = (): string => {
  let deviceId = window.localStorage.getItem(DEVICE_ID_KEY);
  if (!deviceId) {
    deviceId = `device-${Math.random().toString(36).substr(2, 9)}`;
    window.localStorage.setItem(DEVICE_ID_KEY, deviceId);
  }
  return deviceId;
};

const getSyncKey = (): string | null => {
  return window.localStorage.getItem(SYNC_KEY_STORAGE);
};

const setSyncKey = (key: string): void => {
  window.localStorage.setItem(SYNC_KEY_STORAGE, key);
};

// Sync entries to Supabase
const syncToSupabase = async (entries: JournalEntryRecord[]): Promise<void> => {
  const syncKey = getSyncKey();
  if (!syncKey) return;

  try {
    const { error } = await supabase
      .from('kids_journal_entries')
      .upsert(
        {
          sync_key: syncKey,
          entries: entries,
          updated_at: new Date().toISOString()
        },
        { onConflict: 'sync_key' }
      );

    if (error) throw error;
    window.localStorage.setItem(LAST_SYNC_KEY, new Date().toISOString());
  } catch (err) {
    console.error('Failed to sync to Supabase:', err);
  }
};

// Fetch entries from Supabase
const fetchFromSupabase = async (): Promise<JournalEntryRecord[] | null> => {
  const syncKey = getSyncKey();
  if (!syncKey) return null;

  try {
    const { data, error } = await supabase
      .from('kids_journal_entries')
      .select('entries, updated_at')
      .eq('sync_key', syncKey)
      .maybeSingle();

    if (error) throw error;
    if (data && data.entries) {
      return data.entries as JournalEntryRecord[];
    }
  } catch (err) {
    console.error('Failed to fetch from Supabase:', err);
  }
  return null;
};

const THEME_COPY: Record<ThemeName, { label: string; emoji: string; blurb: string }> = {
  sunny: {
    label: 'Sunny Day',
    emoji: '☀️',
    blurb: 'Bright and happy'
  },
  garden: {
    label: 'Rainbow Garden',
    emoji: '🌼',
    blurb: 'Blooming colors'
  },
  space: {
    label: 'Space Explorer',
    emoji: '🚀',
    blurb: 'Starlight adventure'
  },
  castle: {
    label: 'Princess Castle',
    emoji: '🏰',
    blurb: 'Sparkly royal fun'
  },
  jungle: {
    label: 'Jungle Journey',
    emoji: '🌴',
    blurb: 'Wild and playful'
  },
  pirate: {
    label: 'Pirate Adventure',
    emoji: '🏴‍☠️',
    blurb: 'Treasure hunt fun'
  }
};

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
  },
  photos: {
    label: 'My Photos',
    emoji: '📸',
    prompt: 'Add photos from your day!',
    placeholder: 'Tap to add photos from your camera or library'
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
  // Sync to Supabase in background
  syncToSupabase(entries).catch(() => {
    // Silently fail - offline mode is fine
  });
};

// Photo handling
const compressImage = async (file: File, maxWidth: number = 800, maxHeight: number = 800, quality: number = 0.7): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('Failed to get canvas context'));
        
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = event.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
};

const addPhotoToEntry = (entryId: string, photoBase64: string) => {
  const entries = readEntries();
  const entry = entries.find((e) => e.id === entryId);
  if (!entry) return;
  
  if (!entry.photos) {
    entry.photos = [];
  }
  entry.photos.push(photoBase64);
  writeEntries(entries);
};

const removePhotoFromEntry = (entryId: string, photoIndex: number) => {
  const entries = readEntries();
  const entry = entries.find((e) => e.id === entryId);
  if (!entry || !entry.photos) return;
  
  entry.photos.splice(photoIndex, 1);
  writeEntries(entries);
};

const getToday = () => new Date().toLocaleDateString(undefined, {
  weekday: 'short',
  month: 'short',
  day: 'numeric',
  year: 'numeric'
});

const getProgressSummary = (count: number) => {
  if (count === 0) {
    return { title: 'Sparkle Starter', badge: '🌟', stars: ['☆', '☆', '☆', '☆', '☆'] };
  }

  if (count < 3) {
    return { title: 'Happy Explorer', badge: '🚀', stars: ['⭐', '⭐', '☆', '☆', '☆'] };
  }

  if (count < 6) {
    return { title: 'Super Star', badge: '🏆', stars: ['⭐', '⭐', '⭐', '☆', '☆'] };
  }

  return { title: 'Journal Hero', badge: '👑', stars: ['⭐', '⭐', '⭐', '⭐', '⭐'] };
};

const getStickerCollection = (entries: JournalEntryRecord[]) => {
  const badges = [
    { icon: '🌞', label: 'Sunshine', unlocked: entries.length >= 1 },
    { icon: '🎈', label: 'Party Pop', unlocked: entries.length >= 2 },
    { icon: '🧁', label: 'Treat Time', unlocked: entries.length >= 3 },
    { icon: '🎁', label: 'Treasure Box', unlocked: entries.length >= 4 },
    { icon: '🌈', label: 'Rainbow', unlocked: entries.length >= 5 },
    { icon: '👑', label: 'Champion', unlocked: entries.length >= 6 }
  ];

  return badges;
};

const rootElement = document.getElementById('root');

if (rootElement) {
  let entries = readEntries();
  let selectedSection: EntrySection | null = null;
  let selectedTheme: ThemeName = 'sunny';
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

    const reward = getProgressSummary(entries.length);
    const stickerCollection = getStickerCollection(entries);
    const rewardMarkup = `
      <section class="panel reward-panel">
        <div class="reward-header">
          <div>
            <p class="reward-label">Your sticker level</p>
            <h2>${reward.badge} ${escapeHtml(reward.title)}</h2>
          </div>
          <div class="star-jar">${reward.stars.map((star) => `<span>${star}</span>`).join('')}</div>
        </div>
        <div class="reward-footer">
          <span>${entries.length} journal ${entries.length === 1 ? 'entry' : 'entries'}</span>
          <span>Next goal: ${entries.length >= 6 ? 'You are a superstar!' : `${6 - entries.length} more to win 👑`}</span>
        </div>
        <div class="treasure-box">
          ${stickerCollection.map((sticker) => `
            <div class="sticker ${sticker.unlocked ? 'unlocked' : 'locked'}" title="${sticker.label}">
              <span>${sticker.icon}</span>
              <small>${sticker.label}</small>
            </div>
          `).join('')}
        </div>
      </section>
    `;

    const formMarkup = selectedSection
      ? selectedSection === 'photos'
        ? `
        <section class="panel prompt-panel">
          <div class="section-label">${SECTION_COPY[selectedSection].emoji} ${escapeHtml(SECTION_COPY[selectedSection].label)}</div>
          <h2>${escapeHtml(SECTION_COPY[selectedSection].prompt)}</h2>
          <form id="journal-form">
            <div id="photo-upload-area" class="photo-upload-area">
              <input type="file" id="photo-input" accept="image/*" multiple hidden />
              <button type="button" id="photo-picker-btn" class="photo-picker-btn">📱 Pick from Library</button>
              <p class="photo-hint">Tap to select photos or take a new one</p>
            </div>
            <div id="photo-preview" class="photo-preview"></div>
            <div class="prompt-actions">
              <button type="button" class="secondary-btn" id="back-to-menu">Back</button>
              <button type="submit">Save</button>
            </div>
          </form>
        </section>
      `
        : `
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
      : `<ul class="entry-list">${entries.map((entry) => {
          const photoGallery = entry.photos && entry.photos.length > 0
            ? `<div class="entry-photos">${entry.photos
                .map(
                  (photo, idx) => `<img src="${photo}" alt="Photo ${idx + 1}" class="entry-photo" />`
                )
                .join('')}</div>`
            : '';
          
          return `
          <li class="entry-card">
            <div class="entry-header">
              <span class="entry-badge">${SECTION_COPY[entry.section].emoji} ${escapeHtml(SECTION_COPY[entry.section].label)}</span>
              <span class="entry-date">${escapeHtml(entry.date)}</span>
            </div>
            ${entry.content ? `<p>${escapeHtml(entry.content)}</p>` : ''}
            ${photoGallery}
            <button type="button" class="delete-btn" data-entry-id="${entry.id}">Delete</button>
          </li>`;
        }).join('')}</ul>`;

    const themeCards = (Object.keys(THEME_COPY) as ThemeName[]).map((themeKey) => `
      <button type="button" class="theme-card ${selectedTheme === themeKey ? 'active' : ''}" data-theme="${themeKey}">
        <span class="theme-emoji">${THEME_COPY[themeKey].emoji}</span>
        <span class="theme-name">${escapeHtml(THEME_COPY[themeKey].label)}</span>
        <small>${escapeHtml(THEME_COPY[themeKey].blurb)}</small>
      </button>
    `).join('');

    rootElement.className = `theme-${selectedTheme}`;

    const currentSyncKey = getSyncKey();
    const deviceId = getOrCreateDeviceId();
    
    const deviceLinkingMarkup = currentSyncKey
      ? `
        <section class="panel device-panel">
          <div class="device-header">
            <span class="device-badge">📱 Connected</span>
            <button id="unlink-device" class="link-btn" type="button">Unlink device</button>
          </div>
          <p class="device-info">Sync key: <code>${escapeHtml(currentSyncKey)}</code></p>
          <p class="device-hint">Share this code with other devices to sync entries across multiple kids devices!</p>
        </section>
      `
      : `
        <section class="panel device-panel">
          <h3>Link a device</h3>
          <div class="device-link-form">
            <input type="text" id="sync-key-input" placeholder="Enter sync code or create one" maxlength="20" />
            <div class="device-link-actions">
              <button id="create-sync-key" class="primary-btn" type="button">Create new</button>
              <button id="join-sync-key" class="secondary-btn" type="button">Join device</button>
            </div>
          </div>
          <p class="device-hint">Each device needs a code to share entries. Create one or ask an adult for a code to join!</p>
        </section>
      `;

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

        ${deviceLinkingMarkup}

        <section class="panel theme-picker-panel">
          <div class="theme-picker-header">
            <h2>Choose your style</h2>
          </div>
          <div class="theme-grid">${themeCards}</div>
        </section>

        <main class="content">
          ${rewardMarkup}
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

    // Device linking
    const createSyncKeyBtn = document.getElementById('create-sync-key');
    createSyncKeyBtn?.addEventListener('click', () => {
      const newSyncKey = Math.random().toString(36).substring(2, 8).toUpperCase();
      setSyncKey(newSyncKey);
      // Fetch and sync any existing cloud data for this new key
      fetchFromSupabase().then(() => render());
    });

    const joinSyncKeyBtn = document.getElementById('join-sync-key');
    joinSyncKeyBtn?.addEventListener('click', () => {
      const input = document.getElementById('sync-key-input') as HTMLInputElement | null;
      const syncKey = input?.value?.trim().toUpperCase();
      if (!syncKey || syncKey.length < 4) {
        alert('Please enter a valid sync code (at least 4 characters)');
        return;
      }
      setSyncKey(syncKey);
      // Fetch cloud entries for this sync key
      fetchFromSupabase().then((cloudEntries) => {
        if (cloudEntries && cloudEntries.length > 0) {
          const localEntries = readEntries();
          const merged = [...localEntries];
          cloudEntries.forEach((cloudEntry) => {
            if (!merged.find((e) => e.id === cloudEntry.id)) {
              merged.push(cloudEntry);
            }
          });
          writeEntries(merged);
        }
        render();
      });
    });

    const unlinkDeviceBtn = document.getElementById('unlink-device');
    unlinkDeviceBtn?.addEventListener('click', () => {
      if (confirm('Unlink this device? Your local entries will remain on this device.')) {
        window.localStorage.removeItem(SYNC_KEY_STORAGE);
        render();
      }
    });

    const confettiBurst = () => {
      const root = document.getElementById('root');
      if (!root) return;

      root.classList.remove('burst');
      void root.offsetWidth;
      root.classList.add('burst');
      window.setTimeout(() => root.classList.remove('burst'), 700);
    };

    updateInstallButton();
    updateConnectionStatus();
    confettiBurst();

    rootElement.querySelectorAll<HTMLButtonElement>('[data-theme]').forEach((button) => {
      button.addEventListener('click', () => {
        const nextTheme = button.dataset.theme as ThemeName;
        if (!nextTheme) return;
        selectedTheme = nextTheme;
        render();
      });
    });

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

    // Photo picker button
    const photoPickerBtn = document.getElementById('photo-picker-btn');
    const photoInput = document.getElementById('photo-input') as HTMLInputElement | null;
    
    photoPickerBtn?.addEventListener('click', () => {
      photoInput?.click();
    });

    photoInput?.addEventListener('change', async () => {
      if (!photoInput.files || photoInput.files.length === 0) return;

      const photoPreview = document.getElementById('photo-preview');
      if (!photoPreview) return;

      photoPreview.innerHTML = '<p class="loading">Processing photos...</p>';

      const photoPromises = Array.from(photoInput.files).map((file) => compressImage(file));

      try {
        const compressedPhotos = await Promise.all(photoPromises);
        
        // Store temporarily in a variable for form submission
        (window as any).selectedPhotos = compressedPhotos;

        // Show preview
        const previewHtml = compressedPhotos
          .map(
            (photo, index) => `
          <div class="photo-thumbnail-container">
            <img src="${photo}" alt="Photo ${index + 1}" class="photo-thumbnail" />
            <button type="button" class="remove-photo-btn" data-photo-index="${index}">✕</button>
          </div>
        `
          )
          .join('');

        photoPreview.innerHTML = `<div class="photo-gallery">${previewHtml}</div>`;

        // Add remove button listeners
        photoPreview.querySelectorAll<HTMLButtonElement>('.remove-photo-btn').forEach((btn) => {
          btn.addEventListener('click', () => {
            const index = parseInt(btn.dataset.photoIndex || '0', 10);
            (window as any).selectedPhotos.splice(index, 1);
            photoInput.value = '';
            photoInput.click(); // Re-trigger to show updated preview
          });
        });
      } catch (error) {
        console.error('Failed to process photos:', error);
        photoPreview.innerHTML = '<p class="error">Failed to load photos. Please try again.</p>';
      }
    });

    document.getElementById('journal-form')?.addEventListener('submit', (event) => {
      event.preventDefault();

      if (!selectedSection) return;

      if (selectedSection === 'photos') {
        const selectedPhotos = (window as any).selectedPhotos || [];
        if (selectedPhotos.length === 0) {
          alert('Please select at least one photo');
          return;
        }

        const nextEntry: JournalEntryRecord = {
          id: typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}`,
          date: getToday(),
          content: '',
          section: selectedSection,
          photos: selectedPhotos
        };

        entries = [nextEntry, ...entries];
        writeEntries(entries);
        (window as any).selectedPhotos = [];
        selectedSection = null;
        render();
      } else {
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
      }
    });

    rootElement.querySelectorAll<HTMLButtonElement>('[data-entry-id]').forEach((button) => {
      button.addEventListener('click', () => {
        entries = entries.filter((entry) => entry.id !== button.dataset.entryId);
        writeEntries(entries);
        render();
      });
    });
  };

  // Periodic sync when online
  window.addEventListener('online', () => {
    updateConnectionStatus();
    const entries = readEntries();
    syncToSupabase(entries);
  });

  window.addEventListener('offline', () => {
    updateConnectionStatus();
  });

  // Periodically check for updates (every 30 seconds when online and synced)
  setInterval(async () => {
    if (!navigator.onLine || !getSyncKey()) return;
    
    const cloudEntries = await fetchFromSupabase();
    if (!cloudEntries || cloudEntries.length === 0) return;
    
    const localEntries = readEntries();
    let hasNew = false;
    
    cloudEntries.forEach((cloudEntry) => {
      if (!localEntries.find((e) => e.id === cloudEntry.id)) {
        localEntries.push(cloudEntry);
        hasNew = true;
      }
    });
    
    if (hasNew) {
      writeEntries(localEntries);
      if (document.visibilityState === 'visible') {
        render();
      }
    }
  }, 30000);

  render();
}