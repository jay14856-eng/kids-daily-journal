// Note: Supabase is loaded from CDN in index.html via global window.supabase object

type EntrySection = 'feelings' | 'best-moment' | 'thankful' | 'journal' | 'goal' | 'draw' | 'photos' | 'gallery';
type ThemeName = 'sunny' | 'garden' | 'space' | 'castle' | 'jungle' | 'pirate';
type GameName = 'star-hunt' | 'quick-math' | 'find-pairs' | 'spot-difference';
type AgeGroup = '5-6' | '7-8' | '9-11';
type MathOperator = '+' | '-' | '×';

type DailySpotScene = {
  left: string[];
  right: string[];
  differenceIndexes: number[];
};

type JournalEntryRecord = {
  id: string;
  date: string;
  content: string;
  section: EntrySection;
  deleted?: boolean;
  isProfile?: boolean;
  profileName?: string;
  profileUpdatedAt?: string;
  emotions?: string[];
  drawing?: string; // base64 PNG data from the drawing canvas
  photos?: string[]; // base64 encoded images
};

type GalleryItem = {
  image: string;
  date: string;
  type: 'drawing' | 'photo';
};

type WeatherDay = {
  date: string;
  code: number;
  high: number;
  low: number;
  rainChance: number;
};

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

const STORAGE_KEY = 'kids-daily-journal.entries';
const DEVICE_ID_KEY = 'kids-daily-journal.device-id';
const SYNC_KEY_STORAGE = 'kids-daily-journal.sync-key';
const LAST_SYNC_KEY = 'kids-daily-journal.last-sync';
const GAME_AGE_GROUP_KEY = 'kids-daily-journal.game-age-group';
const CHILD_NAME_KEY = 'kids-daily-journal.child-name';
const CHILD_PROFILE_ID = 'kids-daily-journal.profile';

const getWeatherCopy = (code: number) => {
  if (code === 0) return { icon: '☀️', label: 'Sunny' };
  if (code <= 2) return { icon: '🌤️', label: 'Bright' };
  if (code === 3) return { icon: '☁️', label: 'Cloudy' };
  if (code <= 48) return { icon: '🌫️', label: 'Misty' };
  if (code <= 67) return { icon: '🌦️', label: 'Rainy' };
  if (code <= 77) return { icon: '❄️', label: 'Snowy' };
  if (code <= 82) return { icon: '🌧️', label: 'Showers' };
  return { icon: '⛈️', label: 'Stormy' };
};

const GAME_LEVELS: Record<AgeGroup, { label: string; starTiles: number; numberLimit: number; mathOperators: MathOperator[]; pairCount: number }> = {
  '5-6': { label: 'Ages 5-6', starTiles: 4, numberLimit: 10, mathOperators: ['+'], pairCount: 3 },
  '7-8': { label: 'Ages 7-8', starTiles: 6, numberLimit: 15, mathOperators: ['+', '-'], pairCount: 4 },
  '9-11': { label: 'Ages 9-11', starTiles: 9, numberLimit: 12, mathOperators: ['+', '-', '×'], pairCount: 6 }
};

const PAIR_ICONS = ['🌈', '🚀', '🦖', '⚽', '🎨', '🌟'];
const FEELING_OPTIONS = [
  { emoji: '😊', label: 'Happy' },
  { emoji: '😄', label: 'Excited' },
  { emoji: '🥰', label: 'Loved' },
  { emoji: '😌', label: 'Calm' },
  { emoji: '😎', label: 'Proud' },
  { emoji: '🤔', label: 'Thoughtful' },
  { emoji: '😴', label: 'Tired' },
  { emoji: '😕', label: 'Confused' },
  { emoji: '😢', label: 'Sad' },
  { emoji: '😠', label: 'Angry' },
  { emoji: '😟', label: 'Worried' },
  { emoji: '😳', label: 'Surprised' }
];
const DAILY_SPOT_SCENES: DailySpotScene[] = [
  {
    left: ['🌤️', '🏠', '🌳', '🐶', '🌷', '🚲', '🐦', '☁️', '🌈'],
    right: ['☀️', '🏠', '🌴', '🐶', '🌼', '🚲', '🐦', '☁️', '🌈'],
    differenceIndexes: [0, 2, 4]
  },
  {
    left: ['🚀', '⭐', '🪐', '👾', '🌙', '🛰️', '☄️', '🌌', '🛸'],
    right: ['🚀', '✨', '🌍', '👾', '🌙', '🛰️', '☄️', '🌌', '🛸'],
    differenceIndexes: [1, 2, 6]
  },
  {
    left: ['🏖️', '☀️', '🐚', '🦀', '🏄', '🌴', '🐠', '⛵', '🌊'],
    right: ['🏖️', '⛅', '🐚', '🦞', '🏄', '🌴', '🐡', '⛵', '🌊'],
    differenceIndexes: [1, 3, 6]
  },
  {
    left: ['🏰', '🐉', '👑', '🦄', '🌲', '🗝️', '🧙', '🏹', '✨'],
    right: ['🏰', '🐲', '👑', '🐴', '🌲', '🔑', '🧙', '🏹', '✨'],
    differenceIndexes: [1, 3, 5]
  }
];

// Supabase client - using global object loaded from CDN
const supabaseUrl = 'https://guhgtuwhnlyfxtlrfjbh.supabase.co';
const supabaseKey = 'sb_publishable_1iIPQEVSIhKxPeVTZNgqYg_fV2UKUmm';
const supabase = (window as any).supabase.createClient(supabaseUrl, supabaseKey);

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js').catch((error) => {
      console.error('Service worker registration failed:', error);
    });
  });
}

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

const mergeEntries = (...entryCollections: JournalEntryRecord[][]): JournalEntryRecord[] => {
  const entriesById = new Map<string, JournalEntryRecord>();
  entryCollections.flat().forEach((entry) => {
    const existingEntry = entriesById.get(entry.id);
    if (entry.isProfile && existingEntry?.isProfile) {
      const entryUpdatedAt = Date.parse(entry.profileUpdatedAt || '') || 0;
      const existingUpdatedAt = Date.parse(existingEntry.profileUpdatedAt || '') || 0;
      if (entryUpdatedAt >= existingUpdatedAt) {
        entriesById.set(entry.id, entry);
      }
      return;
    }
    if (!existingEntry || entry.deleted || !existingEntry.deleted) {
      entriesById.set(entry.id, entry);
    }
  });
  return Array.from(entriesById.values());
};

const getProfileName = (entries: JournalEntryRecord[]): string | null => {
  const profile = entries.find((entry) => entry.id === CHILD_PROFILE_ID && entry.isProfile && !entry.deleted);
  return profile?.profileName?.trim() || null;
};

// Sync entries to Supabase
const syncToSupabase = async (entries: JournalEntryRecord[]): Promise<JournalEntryRecord[] | null> => {
  const syncKey = getSyncKey();
  if (!syncKey) return null;

  try {
    const { data: cloudData, error: fetchError } = await supabase
      .from('kids_journal_entries')
      .select('entries')
      .eq('sync_key', syncKey)
      .maybeSingle();

    if (fetchError) throw fetchError;
    const mergedEntries = mergeEntries(cloudData?.entries as JournalEntryRecord[] || [], entries);
    const { error } = await supabase
      .from('kids_journal_entries')
      .upsert(
        {
          sync_key: syncKey,
          entries: mergedEntries,
          updated_at: new Date().toISOString()
        },
        { onConflict: 'sync_key' }
      );

    if (error) throw error;
    window.localStorage.setItem(LAST_SYNC_KEY, new Date().toISOString());
    return mergedEntries;
  } catch (err) {
    console.error('Failed to sync to Supabase:', err);
    return null;
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

const THEME_COLORS: Record<ThemeName, string> = {
  sunny: '#7cc7ff',
  garden: '#2f9d5e',
  space: '#112b4d',
  castle: '#ff75a0',
  jungle: '#3ba46e',
  pirate: '#2c3e50'
};

const updateThemeMetaColor = (theme: ThemeName) => {
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) {
    meta.setAttribute('content', THEME_COLORS[theme] || '#7cc7ff');
  }
};

const triggerHaptic = (pattern: number | number[] = 30) => {
  if ('vibrate' in navigator) {
    try {
      navigator.vibrate(pattern);
    } catch {}
  }
};

// IndexedDB Media & Offline Storage Helper
const DB_NAME = 'KidsDailyJournalDB';
const DB_VERSION = 1;
const STORE_NAME = 'journal_media';

const openIDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    if (!window.indexedDB) return reject(new Error('IndexedDB not supported'));
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

const saveMediaToIDB = async (key: string, data: string): Promise<void> => {
  try {
    const db = await openIDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(data, key);
  } catch (err) {
    console.warn('IDB save fallback:', err);
  }
};

const getMediaFromIDB = async (key: string): Promise<string | null> => {
  try {
    const db = await openIDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).get(key);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
};

// Text-to-Speech (TTS) Prompt Reader
const speakPromptText = (text: string) => {
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.pitch = 1.1;
  utterance.rate = 0.95;
  window.speechSynthesis.speak(utterance);
};

// Speech Recognition (Voice-to-Text) Dictation
let activeSpeechRecognition: any = null;
const toggleVoiceDictation = (textareaElement: HTMLTextAreaElement, buttonElement: HTMLButtonElement) => {
  const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  if (!SpeechRecognition) {
    alert('Voice input is not supported in this browser.');
    return;
  }

  if (activeSpeechRecognition) {
    activeSpeechRecognition.stop();
    activeSpeechRecognition = null;
    buttonElement.textContent = '🎤 Voice Note';
    buttonElement.classList.remove('listening');
    return;
  }

  try {
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      buttonElement.textContent = '🛑 Listening...';
      buttonElement.classList.add('listening');
    };

    recognition.onresult = (event: any) => {
      let finalTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript + ' ';
        }
      }
      if (finalTranscript) {
        textareaElement.value = (textareaElement.value + ' ' + finalTranscript).trim();
      }
    };

    recognition.onerror = () => {
      buttonElement.textContent = '🎤 Voice Note';
      buttonElement.classList.remove('listening');
      activeSpeechRecognition = null;
    };

    recognition.onend = () => {
      buttonElement.textContent = '🎤 Voice Note';
      buttonElement.classList.remove('listening');
      activeSpeechRecognition = null;
    };

    recognition.start();
    activeSpeechRecognition = recognition;
  } catch (err) {
    console.error('Speech recognition error:', err);
  }
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
  },
  gallery: {
    label: 'My Gallery',
    emoji: '🖼️',
    prompt: 'Look back at your photos and drawings.',
    placeholder: ''
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
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch (quotaErr) {
    console.warn('localStorage full, relying on IDB & Supabase sync:', quotaErr);
  }
  saveMediaToIDB('journal_entries_backup', JSON.stringify(entries));

  syncToSupabase(entries).then((mergedEntries) => {
    if (!mergedEntries) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(mergedEntries));
    } catch {}
    saveMediaToIDB('journal_entries_backup', JSON.stringify(mergedEntries));
    window.dispatchEvent(new CustomEvent<JournalEntryRecord[]>('journal-entries-synced', { detail: mergedEntries }));
  });
};

// Photo handling with WebP compression & JPEG fallback
const compressImage = async (file: File, maxWidth: number = 800, maxHeight: number = 800, quality: number = 0.75): Promise<string> => {
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
        let webpData = canvas.toDataURL('image/webp', quality);
        if (webpData.startsWith('data:image/webp')) {
          resolve(webpData);
        } else {
          resolve(canvas.toDataURL('image/jpeg', quality));
        }
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

const setupDrawingCanvas = () => {
  const canvas = document.getElementById('drawing-canvas') as HTMLCanvasElement | null;
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const colorButtons = document.querySelectorAll<HTMLButtonElement>('[data-drawing-color]');
  const stickerButtons = document.querySelectorAll<HTMLButtonElement>('[data-drawing-sticker]');
  const brushSizeInput = document.getElementById('drawing-size') as HTMLInputElement | null;
  const clearButton = document.getElementById('drawing-clear');
  const eraserButton = document.getElementById('drawing-eraser');
  const backgroundButton = document.getElementById('drawing-bg');
  const downloadButton = document.getElementById('drawing-download');

  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  let isDrawing = false;
  let currentColor = '#ff5a7a';
  let currentSize = 6;
  let isEraserMode = false;
  let selectedSticker: string | null = null;

  const updateBrushState = () => {
    if (isEraserMode) {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = currentSize + 2;
    } else {
      ctx.strokeStyle = currentColor;
      ctx.lineWidth = currentSize;
    }

    colorButtons.forEach((button) => {
      const isActive = !isEraserMode && button.dataset.drawingColor === currentColor;
      button.classList.toggle('active', isActive);
    });

    eraserButton?.classList.toggle('active', isEraserMode);
    stickerButtons.forEach((button) => {
      button.classList.toggle('active', button.dataset.drawingSticker === selectedSticker);
    });
  };

  const fillCanvasBackground = () => {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    (window as any).drawingDirty = true;
  };

  const getPointerPosition = (event: PointerEvent | TouchEvent) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const point = 'touches' in event ? event.touches[0] ?? event.changedTouches[0] : event;
    const clientX = point.clientX;
    const clientY = point.clientY;

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  };

  const startDrawing = (event: PointerEvent | TouchEvent) => {
    event.preventDefault();
    const pos = getPointerPosition(event);

    if (selectedSticker) {
      ctx.save();
      ctx.font = '44px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(selectedSticker, pos.x, pos.y);
      ctx.restore();
      selectedSticker = null;
      (window as any).drawingDirty = true;
      updateBrushState();
      return;
    }

    isDrawing = true;
    (window as any).drawingDirty = true;
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    if (isEraserMode) {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = currentSize + 2;
    } else {
      ctx.strokeStyle = currentColor;
      ctx.lineWidth = currentSize;
    }
  };

  const draw = (event: PointerEvent | TouchEvent) => {
    if (!isDrawing) return;
    event.preventDefault();
    const pos = getPointerPosition(event);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  };

  const stopDrawing = (event?: Event) => {
    if (event) {
      event.preventDefault();
    }
    isDrawing = false;
    ctx.beginPath();
  };

  colorButtons.forEach((button) => {
    button.addEventListener('click', () => {
      isEraserMode = false;
      selectedSticker = null;
      currentColor = button.dataset.drawingColor || currentColor;
      updateBrushState();
    });
  });

  stickerButtons.forEach((button) => {
    button.addEventListener('click', () => {
      isEraserMode = false;
      selectedSticker = button.dataset.drawingSticker || null;
      updateBrushState();
    });
  });

  eraserButton?.addEventListener('click', () => {
    isEraserMode = !isEraserMode;
    selectedSticker = null;
    updateBrushState();
  });

  brushSizeInput?.addEventListener('input', () => {
    currentSize = Number(brushSizeInput.value) || 6;
    updateBrushState();
  });

  clearButton?.addEventListener('click', () => {
    fillCanvasBackground();
  });

  backgroundButton?.addEventListener('click', () => {
    fillCanvasBackground();
  });

  downloadButton?.addEventListener('click', () => {
    const link = document.createElement('a');
    link.download = 'my-day-drawing.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
  });

  canvas.addEventListener('pointerdown', startDrawing as EventListener);
  canvas.addEventListener('pointermove', draw as EventListener);
  canvas.addEventListener('pointerup', stopDrawing as EventListener);
  canvas.addEventListener('pointerleave', stopDrawing as EventListener);
  canvas.addEventListener('pointercancel', stopDrawing as EventListener);

  canvas.addEventListener('touchstart', startDrawing as EventListener, { passive: false });
  canvas.addEventListener('touchmove', draw as EventListener, { passive: false });
  canvas.addEventListener('touchend', stopDrawing as EventListener, { passive: false });
  canvas.addEventListener('touchcancel', stopDrawing as EventListener, { passive: false });

  updateBrushState();
};

const rootElement = document.getElementById('root');

const leaveDrawingFullscreen = async () => {
  if (document.fullscreenElement && document.fullscreenEnabled) {
    try {
      await document.exitFullscreen();
    } catch {
      // Ignore browser fullscreen errors and keep the app usable.
    }
  }
};

if (rootElement) {
  let entries = readEntries();
  let selectedSection: EntrySection | null = null;
  let selectedGame: GameName | null = null;
  let isLookingBack = false;
  let selectedTheme: ThemeName = 'sunny';
  let deferredPrompt: BeforeInstallPromptEvent | null = null;
  let childName = window.localStorage.getItem(CHILD_NAME_KEY)?.trim() || '';
  let isEditingChildName = !childName;
  let selectedAgeGroup = (window.localStorage.getItem(GAME_AGE_GROUP_KEY) as AgeGroup) || '5-6';
  let starHuntScore = 0;
  let starHuntRound = 1;
  let starPosition = Math.floor(Math.random() * GAME_LEVELS[selectedAgeGroup].starTiles);
  let revealedStarTile: number | null = null;
  let isRevealingStarTile = false;
  let mathScore = 0;
  let mathFirstNumber = 1;
  let mathSecondNumber = 1;
  let mathOperator: MathOperator = '+';
  let pairCards: string[] = [];
  let flippedPairIndexes: number[] = [];
  let matchedPairIndexes = new Set<number>();
  let pairTurns = 0;
  let isCheckingPair = false;
  let foundSpotIndexes = new Set<number>();
  let selectedEmotions: string[] = [];
  let weatherDays: WeatherDay[] = [];
  let weatherStatus: 'loading' | 'ready' | 'unavailable' = 'loading';

  const newMathQuestion = () => {
    const level = GAME_LEVELS[selectedAgeGroup];
    mathFirstNumber = Math.floor(Math.random() * level.numberLimit) + 1;
    mathSecondNumber = Math.floor(Math.random() * level.numberLimit) + 1;
    mathOperator = level.mathOperators[Math.floor(Math.random() * level.mathOperators.length)];
    if (mathOperator === '-') {
      mathFirstNumber = Math.floor(Math.random() * (level.numberLimit - 1)) + 2;
      mathSecondNumber = Math.floor(Math.random() * (mathFirstNumber - 1)) + 1;
    }
  };

  const applySyncedChildName = (syncedEntries: JournalEntryRecord[]) => {
    const syncedName = getProfileName(syncedEntries);
    if (!syncedName) return;
    childName = syncedName;
    isEditingChildName = false;
    window.localStorage.setItem(CHILD_NAME_KEY, childName);
  };

  const getMathAnswer = () => {
    if (mathOperator === '-') return mathFirstNumber - mathSecondNumber;
    if (mathOperator === '×') return mathFirstNumber * mathSecondNumber;
    return mathFirstNumber + mathSecondNumber;
  };

  const startPairGame = () => {
    const icons = PAIR_ICONS.slice(0, GAME_LEVELS[selectedAgeGroup].pairCount);
    pairCards = [...icons, ...icons].sort(() => Math.random() - 0.5);
    flippedPairIndexes = [];
    matchedPairIndexes = new Set<number>();
    pairTurns = 0;
    isCheckingPair = false;
  };

  const getDailySpotScene = (): DailySpotScene => {
    const today = new Date();
    const dayNumber = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()) / 86400000;
    return DAILY_SPOT_SCENES[dayNumber % DAILY_SPOT_SCENES.length];
  };

  const resetSpotDifference = () => {
    foundSpotIndexes = new Set<number>();
  };

  const loadWeatherForecast = () => {
    if (!navigator.geolocation) {
      weatherStatus = 'unavailable';
      render();
      return;
    }

    navigator.geolocation.getCurrentPosition(async (position) => {
      try {
        const { latitude, longitude } = position.coords;
        const response = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&temperature_unit=celsius&timezone=auto`);
        if (!response.ok) throw new Error('Weather request failed');
        const forecast = await response.json();
        weatherDays = forecast.daily.time.slice(0, 3).map((date: string, index: number) => ({
          date,
          code: forecast.daily.weather_code[index],
          high: Math.round(forecast.daily.temperature_2m_max[index]),
          low: Math.round(forecast.daily.temperature_2m_min[index]),
          rainChance: forecast.daily.precipitation_probability_max[index]
        }));
        weatherStatus = 'ready';
      } catch {
        weatherStatus = 'unavailable';
      }
      render();
    }, () => {
      weatherStatus = 'unavailable';
      render();
    }, { timeout: 8000, maximumAge: 1800000 });
  };

  newMathQuestion();
  startPairGame();

  const openDrawFullscreen = async () => {
    if (selectedSection !== 'draw' || !document.fullscreenEnabled) return;

    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      }
    } catch {
      // Some browsers block fullscreen requests; the canvas still remains usable inline.
    }
  };

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
    const activeEntries = entries.filter((entry) => !entry.deleted && !entry.isProfile);
    const cards = (Object.keys(SECTION_COPY) as EntrySection[]).map((section) => {
      const config = SECTION_COPY[section];
      return `
        <button type="button" class="menu-card ${section}" data-section="${section}">
          <span class="card-emoji">${config.emoji}</span>
          <span>${escapeHtml(config.label)}</span>
        </button>
      `;
    }).join('');

    const reward = getProgressSummary(activeEntries.length);
    const stickerCollection = getStickerCollection(activeEntries);
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
          <span>${activeEntries.length} journal ${activeEntries.length === 1 ? 'entry' : 'entries'}</span>
          <span>Next goal: ${activeEntries.length >= 6 ? 'You are a superstar!' : `${6 - activeEntries.length} more to win 👑`}</span>
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

    const weatherMarkup = `
      <section class="panel weather-panel">
        <div class="weather-heading">
          <div>
            <p class="section-kicker">Outside today</p>
            <h2>Weather Watch</h2>
          </div>
          <span class="weather-icon">${weatherStatus === 'ready' ? '🌈' : '🌦️'}</span>
        </div>
        ${weatherStatus === 'loading' ? '<p class="weather-message">Finding your three-day forecast...</p>' : weatherStatus === 'unavailable' ? '<p class="weather-message">Turn on location to see the weather where you are.</p>' : `
          <div class="forecast-grid">
            ${weatherDays.map((day, index) => {
              const weather = getWeatherCopy(day.code);
              const label = index === 0 ? 'Today' : index === 1 ? 'Tomorrow' : new Intl.DateTimeFormat(undefined, { weekday: 'short' }).format(new Date(`${day.date}T12:00:00`));
              return `<div class="forecast-day"><strong>${label}</strong><span class="forecast-icon">${weather.icon}</span><span>${weather.label}</span><b>${day.high}°</b><small>${day.low}° low · ${day.rainChance}% rain</small></div>`;
            }).join('')}
          </div>
        `}
      </section>
    `;

    const gameLevel = GAME_LEVELS[selectedAgeGroup];
    const dailySpotScene = getDailySpotScene();
    const activeSpotIndexes = dailySpotScene.differenceIndexes.slice(0, gameLevel.pairCount - 2);
    const mathAnswer = getMathAnswer();
    const mathChoices = [mathAnswer - 1, mathAnswer, mathAnswer + 1]
      .sort(() => Math.random() - 0.5)
      .map((answer) => `<button type="button" class="game-answer" data-math-answer="${answer}">${answer}</button>`)
      .join('');
    const gamesMarkup = `
      <section class="panel games-panel">
        <div class="games-heading">
          <div>
            <p class="section-kicker">Play time</p>
            <h2>Little Games</h2>
          </div>
          ${selectedGame ? '<button type="button" class="secondary-btn game-back-btn" id="close-game">Back to games</button>' : ''}
        </div>
        <div class="age-group-picker" aria-label="Game age group">
          ${(Object.keys(GAME_LEVELS) as AgeGroup[]).map((ageGroup) => `<button type="button" class="age-group-btn ${selectedAgeGroup === ageGroup ? 'active' : ''}" data-age-group="${ageGroup}" aria-pressed="${selectedAgeGroup === ageGroup}">${GAME_LEVELS[ageGroup].label}</button>`).join('')}
        </div>
        ${selectedGame === 'star-hunt' ? `
          <div class="game-stage">
            <div class="game-status"><span>Round ${starHuntRound}</span><span>${starHuntScore} stars found</span></div>
            <h3>Find the hidden star!</h3>
            <div class="star-hunt-grid tiles-${gameLevel.starTiles}">
              ${Array.from({ length: gameLevel.starTiles }, (_, index) => {
                const isRevealed = revealedStarTile === index;
                const isStar = index === starPosition;
                return `<button type="button" class="hunt-tile ${isRevealed ? (isStar ? 'revealed-star' : 'revealed-miss') : ''}" data-hunt-tile="${index}" aria-label="${isRevealed ? (isStar ? 'You found the star' : 'No star here') : `Look behind tile ${index + 1}`}" ${isRevealingStarTile ? 'disabled' : ''}>${isRevealed ? (isStar ? '⭐' : '✖') : '?'}</button>`;
              }).join('')}
            </div>
          </div>
        ` : selectedGame === 'quick-math' ? `
          <div class="game-stage">
            <div class="game-status"><span>Quick Maths</span><span>${mathScore} correct</span></div>
            <p class="math-question">${mathFirstNumber} ${mathOperator} ${mathSecondNumber} = ?</p>
            <div class="math-answers">${mathChoices}</div>
          </div>
        ` : selectedGame === 'find-pairs' ? `
          <div class="game-stage">
            <div class="game-status"><span>${matchedPairIndexes.size / 2} of ${gameLevel.pairCount} pairs</span><span>${pairTurns} turns</span></div>
            <h3>Find the matching pairs!</h3>
            <div class="pair-grid pairs-${gameLevel.pairCount}">
              ${pairCards.map((icon, index) => {
                const isVisible = flippedPairIndexes.includes(index) || matchedPairIndexes.has(index);
                const isMatched = matchedPairIndexes.has(index);
                return `<button type="button" class="pair-card ${isVisible ? 'flipped' : ''} ${isMatched ? 'matched' : ''}" data-pair-index="${index}" aria-label="${isVisible ? `Card ${index + 1}: ${icon}` : `Turn over card ${index + 1}`}" ${isMatched ? 'disabled' : ''}>${isVisible ? icon : '?'}</button>`;
              }).join('')}
            </div>
            <button type="button" class="secondary-btn restart-pairs-btn" id="restart-pairs">Start again</button>
          </div>
        ` : selectedGame === 'spot-difference' ? `
          <div class="game-stage">
            <div class="game-status"><span>Today's picture</span><span>${foundSpotIndexes.size} of ${activeSpotIndexes.length} found</span></div>
            <h3>Spot the differences!</h3>
            <div class="spot-scenes">
              <div class="spot-scene" aria-label="Picture one">${dailySpotScene.left.map((icon) => `<span class="spot-cell">${icon}</span>`).join('')}</div>
              <div class="spot-scene" aria-label="Picture two">${dailySpotScene.right.map((icon, index) => {
                const isFound = foundSpotIndexes.has(index);
                return `<button type="button" class="spot-cell spot-target ${isFound ? 'found' : ''}" data-spot-index="${index}" aria-label="Check picture two square ${index + 1}" ${isFound ? 'disabled' : ''}>${icon}</button>`;
              }).join('')}</div>
            </div>
            <p class="spot-progress">${foundSpotIndexes.size === activeSpotIndexes.length ? 'Amazing spotting!' : 'Tap a difference in the picture on the right.'}</p>
          </div>
        ` : `
          <div class="game-picker">
            <button type="button" class="game-card star-game" data-game="star-hunt"><span>⭐</span><strong>Star Hunt</strong><small>Find the hidden star</small></button>
            <button type="button" class="game-card math-game" data-game="quick-math"><span>🔢</span><strong>Quick Maths</strong><small>Pick the right answer</small></button>
            <button type="button" class="game-card pairs-game" data-game="find-pairs"><span>🧩</span><strong>Find the Pairs</strong><small>Turn over matching cards</small></button>
            <button type="button" class="game-card spot-game" data-game="spot-difference"><span>🔎</span><strong>Spot the Difference</strong><small>Find today's changes</small></button>
          </div>
        `}
      </section>
    `;

    const savedDrawings = activeEntries.filter((entry) => entry.section === 'draw' && entry.drawing);
    const galleryItems: GalleryItem[] = activeEntries.flatMap((entry) => [
      ...(entry.drawing ? [{ image: entry.drawing, date: entry.date, type: 'drawing' as const }] : []),
      ...(entry.photos?.map((photo) => ({ image: photo, date: entry.date, type: 'photo' as const })) || [])
    ]);
    const todaysDrawingCount = savedDrawings.filter((entry) => entry.date === getToday()).length;
    const savedDrawingsMarkup = savedDrawings.length > 0
      ? `
        <details class="past-drawings" open>
          <summary>Your saved drawings (${savedDrawings.length})</summary>
          <div class="past-drawings-list">
            ${savedDrawings.map((entry) => `
              <a class="past-drawing" href="${entry.drawing}" target="_blank" rel="noopener" aria-label="Open drawing from ${escapeHtml(entry.date)}">
                <img src="${entry.drawing}" alt="Drawing from ${escapeHtml(entry.date)}" />
                <span>${escapeHtml(entry.date)}</span>
              </a>
            `).join('')}
          </div>
        </details>
      `
      : '';
    const formMarkup = selectedSection
      ? selectedSection === 'draw'
        ? `
        <section class="panel prompt-panel draw-fullscreen-panel">
          <div class="draw-fullscreen-header">
            <div>
              <div class="section-label">${SECTION_COPY[selectedSection].emoji} ${escapeHtml(SECTION_COPY[selectedSection].label)}</div>
              <p class="drawing-count">${todaysDrawingCount === 0 ? 'Start your first drawing today' : `${todaysDrawingCount} ${todaysDrawingCount === 1 ? 'drawing' : 'drawings'} saved today`}</p>
            </div>
            <button type="button" class="secondary-btn exit-drawing-btn" id="exit-drawing-fullscreen">Exit full screen</button>
          </div>
          <div class="prompt-header-row">
            <h2>${escapeHtml(SECTION_COPY[selectedSection].prompt)}</h2>
            <button type="button" class="speech-btn tts-btn" id="tts-prompt-btn" aria-label="Read prompt aloud">🔊 Read</button>
          </div>
          ${savedDrawingsMarkup}
          <form id="journal-form">
            <div class="drawing-board-wrap">
              <canvas id="drawing-canvas" width="640" height="420" aria-label="Draw your day"></canvas>
              <div class="drawing-toolbar">
                <div class="color-palette" aria-label="Drawing colors">
                  <button type="button" class="color-swatch active" data-drawing-color="#ff5a7a" style="background:#ff5a7a" aria-label="Pink"></button>
                  <button type="button" class="color-swatch" data-drawing-color="#ef4444" style="background:#ef4444" aria-label="Red"></button>
                  <button type="button" class="color-swatch" data-drawing-color="#f97316" style="background:#f97316" aria-label="Orange"></button>
                  <button type="button" class="color-swatch" data-drawing-color="#ffbf47" style="background:#ffbf47" aria-label="Yellow"></button>
                  <button type="button" class="color-swatch" data-drawing-color="#38bdf8" style="background:#38bdf8" aria-label="Blue"></button>
                  <button type="button" class="color-swatch" data-drawing-color="#2563eb" style="background:#2563eb" aria-label="Deep blue"></button>
                  <button type="button" class="color-swatch" data-drawing-color="#14b8a6" style="background:#14b8a6" aria-label="Teal"></button>
                  <button type="button" class="color-swatch" data-drawing-color="#4ade80" style="background:#4ade80" aria-label="Green"></button>
                  <button type="button" class="color-swatch" data-drawing-color="#a78bfa" style="background:#a78bfa" aria-label="Purple"></button>
                  <button type="button" class="color-swatch" data-drawing-color="#8b5e3c" style="background:#8b5e3c" aria-label="Brown"></button>
                  <button type="button" class="color-swatch" data-drawing-color="#1f2937" style="background:#1f2937" aria-label="Black"></button>
                </div>
                <div class="sticker-palette" aria-label="Drawing stickers">
                  <button type="button" class="sticker-button" data-drawing-sticker="⭐" aria-label="Star sticker" title="Star">⭐</button>
                  <button type="button" class="sticker-button" data-drawing-sticker="🌈" aria-label="Rainbow sticker" title="Rainbow">🌈</button>
                  <button type="button" class="sticker-button" data-drawing-sticker="☀️" aria-label="Sun sticker" title="Sun">☀️</button>
                  <button type="button" class="sticker-button" data-drawing-sticker="🌸" aria-label="Flower sticker" title="Flower">🌸</button>
                  <button type="button" class="sticker-button" data-drawing-sticker="🦋" aria-label="Butterfly sticker" title="Butterfly">🦋</button>
                  <button type="button" class="sticker-button" data-drawing-sticker="🎈" aria-label="Balloon sticker" title="Balloon">🎈</button>
                  <button type="button" class="sticker-button" data-drawing-sticker="🚀" aria-label="Rocket sticker" title="Rocket">🚀</button>
                  <button type="button" class="sticker-button" data-drawing-sticker="❤️" aria-label="Heart sticker" title="Heart">❤️</button>
                  <button type="button" class="sticker-button" data-drawing-sticker="⚽" aria-label="Soccer ball sticker" title="Soccer ball">⚽</button>
                  <button type="button" class="sticker-button" data-drawing-sticker="🏀" aria-label="Basketball sticker" title="Basketball">🏀</button>
                  <button type="button" class="sticker-button" data-drawing-sticker="🏆" aria-label="Trophy sticker" title="Trophy">🏆</button>
                  <button type="button" class="sticker-button" data-drawing-sticker="🎮" aria-label="Game controller sticker" title="Game controller">🎮</button>
                  <button type="button" class="sticker-button" data-drawing-sticker="🏎️" aria-label="Race car sticker" title="Race car">🏎️</button>
                  <button type="button" class="sticker-button" data-drawing-sticker="🚜" aria-label="Tractor sticker" title="Tractor">🚜</button>
                  <button type="button" class="sticker-button" data-drawing-sticker="🦖" aria-label="Dinosaur sticker" title="Dinosaur">🦖</button>
                  <button type="button" class="sticker-button" data-drawing-sticker="🤖" aria-label="Robot sticker" title="Robot">🤖</button>
                  <button type="button" class="sticker-button" data-drawing-sticker="💎" aria-label="Gem sticker" title="Gem">💎</button>
                  <button type="button" class="sticker-button" data-drawing-sticker="🏴‍☠️" aria-label="Pirate flag sticker" title="Pirate flag">🏴‍☠️</button>
                </div>
                <label class="brush-control">
                  Brush size
                  <input id="drawing-size" type="range" min="2" max="18" value="6" />
                </label>
                <div class="drawing-tools-extra">
                  <button type="button" id="drawing-eraser" class="secondary-btn small-btn">Eraser</button>
                  <button type="button" id="drawing-bg" class="secondary-btn small-btn">White page</button>
                  <button type="button" id="drawing-download" class="secondary-btn small-btn">Download</button>
                </div>
                <button type="button" id="drawing-clear" class="secondary-btn small-btn">Clear</button>
              </div>
            </div>
            <div class="textarea-wrapper">
              <textarea id="journal-response" placeholder="Add a quick note to your drawing..."></textarea>
              <button type="button" class="speech-btn stt-btn" id="stt-voice-btn" aria-label="Voice input">🎤 Voice Note</button>
            </div>
            <div class="prompt-actions">
              <button type="button" class="secondary-btn" id="back-to-menu">Back</button>
              <button type="submit" class="secondary-btn" id="save-and-new-drawing">Save &amp; draw another</button>
              <button type="submit">Save</button>
            </div>
          </form>
        </section>
      `
      : selectedSection === 'photos'
        ? `
        <section class="panel prompt-panel" id="photo-prompt">
          <div class="section-label">${SECTION_COPY[selectedSection].emoji} ${escapeHtml(SECTION_COPY[selectedSection].label)}</div>
          <div class="prompt-header-row">
            <h2>${escapeHtml(SECTION_COPY[selectedSection].prompt)}</h2>
            <button type="button" class="speech-btn tts-btn" id="tts-prompt-btn" aria-label="Read prompt aloud">🔊 Read</button>
          </div>
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
      : selectedSection === 'feelings'
        ? `
        <section class="panel prompt-panel feelings-panel">
          <div class="section-label">${SECTION_COPY[selectedSection].emoji} ${escapeHtml(SECTION_COPY[selectedSection].label)}</div>
          <div class="prompt-header-row">
            <h2>Pick all the feelings that fit today.</h2>
            <button type="button" class="speech-btn tts-btn" id="tts-prompt-btn" aria-label="Read prompt aloud">🔊 Read</button>
          </div>
          <form id="journal-form">
            <div class="emotion-picker" aria-label="Choose your feelings">
              ${FEELING_OPTIONS.map((feeling) => {
                const isSelected = selectedEmotions.includes(feeling.emoji);
                return `<button type="button" class="emotion-option ${isSelected ? 'selected' : ''}" data-emotion="${feeling.emoji}" aria-pressed="${isSelected}" aria-label="${feeling.label}"><span>${feeling.emoji}</span><small>${feeling.label}</small></button>`;
              }).join('')}
            </div>
            ${selectedEmotions.length > 0 ? `
              <div class="feeling-explanation">
                <label for="journal-response">Why did you pick ${selectedEmotions.join(' ')}?</label>
                <div class="textarea-wrapper">
                  <textarea id="journal-response" placeholder="Tell us what made you feel this way..."></textarea>
                  <button type="button" class="speech-btn stt-btn" id="stt-voice-btn" aria-label="Voice input">🎤 Voice Note</button>
                </div>
              </div>
            ` : ''}
            <div class="prompt-actions">
              <button type="button" class="secondary-btn" id="back-to-menu">Back</button>
              <button type="submit">Save</button>
            </div>
          </form>
        </section>
      `
      : selectedSection === 'gallery'
        ? `
        <section class="panel gallery-panel">
          <div class="gallery-heading">
            <div>
              <div class="section-label">${SECTION_COPY[selectedSection].emoji} ${escapeHtml(SECTION_COPY[selectedSection].label)}</div>
              <h2>${escapeHtml(SECTION_COPY[selectedSection].prompt)}</h2>
            </div>
            <button type="button" class="secondary-btn" id="back-to-menu">Back</button>
          </div>
          ${galleryItems.length > 0 ? `
            <div class="gallery-grid">
              ${galleryItems.map((item) => `
                <a class="gallery-item" href="${item.image}" target="_blank" rel="noopener" aria-label="Open ${item.type} from ${escapeHtml(item.date)}">
                  <img src="${item.image}" alt="${item.type === 'drawing' ? 'Drawing' : 'Photo'} from ${escapeHtml(item.date)}" />
                  <span class="gallery-item-type">${item.type === 'drawing' ? '🎨 Drawing' : '📸 Photo'}</span>
                  <time>${escapeHtml(item.date)}</time>
                </a>
              `).join('')}
            </div>
          ` : '<p class="empty-state">No photos or drawings yet. Make a memory to see it here!</p>'}
        </section>
      `
        : `
        <section class="panel prompt-panel">
          <div class="section-label">${SECTION_COPY[selectedSection].emoji} ${escapeHtml(SECTION_COPY[selectedSection].label)}</div>
          <div class="prompt-header-row">
            <h2>${escapeHtml(SECTION_COPY[selectedSection].prompt)}</h2>
            <button type="button" class="speech-btn tts-btn" id="tts-prompt-btn" aria-label="Read prompt aloud">🔊 Read</button>
          </div>
          <form id="journal-form">
            <div class="textarea-wrapper">
              <textarea id="journal-response" placeholder="${escapeHtml(SECTION_COPY[selectedSection].placeholder)}"></textarea>
              <button type="button" class="speech-btn stt-btn" id="stt-voice-btn" aria-label="Voice input">🎤 Voice Note</button>
            </div>
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

    const visibleEntries = isLookingBack ? activeEntries : activeEntries.slice(0, 3);
    const entryMarkup = activeEntries.length === 0
      ? '<p class="empty-state">No entries yet. Start writing!</p>'
      : `<ul class="entry-list">${visibleEntries.map((entry) => {
          const photoGallery = entry.photos && entry.photos.length > 0
            ? `<div class="entry-photos">${entry.photos
                .map(
                  (photo, idx) => `<img src="${photo}" alt="Photo ${idx + 1}" class="entry-photo" />`
                )
                .join('')}</div>`
            : '';
          
          const drawingMarkup = entry.drawing
            ? `<img src="${entry.drawing}" alt="Drawing for ${escapeHtml(entry.date)}" class="entry-drawing" />`
            : '';
          const emotionMarkup = entry.emotions && entry.emotions.length > 0
            ? `<div class="entry-emotions" aria-label="Feelings: ${entry.emotions.join(' ')}">${entry.emotions.map((emotion) => `<span>${emotion}</span>`).join('')}</div>`
            : '';

          return `
          <li class="entry-card">
            <div class="entry-header">
              <span class="entry-badge">${SECTION_COPY[entry.section].emoji} ${escapeHtml(SECTION_COPY[entry.section].label)}</span>
              <span class="entry-date">${escapeHtml(entry.date)}</span>
            </div>
            ${emotionMarkup}
            ${entry.content ? `<p>${escapeHtml(entry.content)}</p>` : ''}
            ${drawingMarkup}
            ${photoGallery}
            <button type="button" class="delete-btn" data-entry-id="${entry.id}">Delete</button>
          </li>`;
        }).join('')}</ul>
        ${activeEntries.length > 3 ? `<button type="button" class="look-back-btn" id="look-back-toggle" aria-expanded="${isLookingBack}">${isLookingBack ? 'Show recent entries' : `Look back at all ${activeEntries.length} entries`}</button>` : ''}`;

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
    const greeting = childName ? `Hi, ${childName}!` : 'Hi, Kiddo!';
    const journalTitle = childName ? `${childName}'s Daily Journal` : 'My Daily Journal';
    const nameMarkup = isEditingChildName
      ? `
        <form class="child-name-form" id="child-name-form">
          <label for="child-name-input">Your first name</label>
          <div>
            <input id="child-name-input" type="text" value="${escapeHtml(childName)}" maxlength="20" autocomplete="given-name" placeholder="Enter your name" />
            <button type="submit">Save name</button>
          </div>
        </form>
      `
      : `<button type="button" class="edit-name-btn" id="edit-child-name" aria-label="Edit your name">Change name</button>`;
    
    const deviceLinkingMarkup = currentSyncKey
      ? `
        <section class="panel device-panel">
          <div class="device-header">
            <span class="device-badge">📱 Connected</span>
            <div class="device-actions">
              <button id="refresh-entries" class="link-btn" type="button">Refresh entries</button>
              <button id="unlink-device" class="link-btn" type="button">Unlink device</button>
            </div>
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
            <button id="update-app-button" class="update-app-btn" type="button">Update app</button>
            <span id="connection-status" class="status-badge">${navigator.onLine ? 'Online & ready' : 'Offline mode'}</span>
          </div>
          <p class="welcome-tag">${escapeHtml(greeting)}</p>
          <h1>🌞 ${escapeHtml(journalTitle)}</h1>
          ${nameMarkup}
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
          ${weatherMarkup}
          ${formMarkup}
          ${gamesMarkup}
          <section class="panel journal-panel">
            <div class="journal-heading">
              <div>
                <p class="section-kicker">Memory book</p>
                <h2>Look Back</h2>
              </div>
              <span class="entry-total">${activeEntries.length} ${activeEntries.length === 1 ? 'entry' : 'entries'}</span>
            </div>
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

    const updateAppButton = document.getElementById('update-app-button') as HTMLButtonElement | null;
    updateAppButton?.addEventListener('click', async () => {
      updateAppButton.disabled = true;
      updateAppButton.textContent = 'Updating...';

      try {
        const registration = await navigator.serviceWorker.getRegistration();
        await registration?.update();
        registration?.waiting?.postMessage({ type: 'SKIP_WAITING' });

        const cacheNames = await caches.keys();
        await Promise.all(cacheNames
          .filter((cacheName) => cacheName.startsWith('kids-journal-cache-'))
          .map((cacheName) => caches.delete(cacheName)));
      } catch {}

      const updatedUrl = new URL(window.location.href);
      updatedUrl.searchParams.set('updated', `${Date.now()}`);
      window.location.replace(updatedUrl.toString());
    });

    document.getElementById('edit-child-name')?.addEventListener('click', () => {
      isEditingChildName = true;
      render();
    });

    document.getElementById('child-name-form')?.addEventListener('submit', (event) => {
      event.preventDefault();
      const input = document.getElementById('child-name-input') as HTMLInputElement | null;
      const nextName = input?.value.trim().replace(/\s+/g, ' ') || '';
      childName = nextName;
      if (childName) {
        window.localStorage.setItem(CHILD_NAME_KEY, childName);
        isEditingChildName = false;
        const profileEntry: JournalEntryRecord = {
          id: CHILD_PROFILE_ID,
          date: '',
          content: '',
          section: 'journal',
          isProfile: true,
          profileName: childName,
          profileUpdatedAt: new Date().toISOString()
        };
        entries = [...entries.filter((entry) => entry.id !== CHILD_PROFILE_ID), profileEntry];
        writeEntries(entries);
      } else {
        window.localStorage.removeItem(CHILD_NAME_KEY);
      }
      render();
    });

    // Device linking
    const createSyncKeyBtn = document.getElementById('create-sync-key');
    createSyncKeyBtn?.addEventListener('click', () => {
      const newSyncKey = Math.random().toString(36).substring(2, 8).toUpperCase();
      setSyncKey(newSyncKey);
      syncToSupabase(entries).then((mergedEntries) => {
        if (mergedEntries) {
          entries = mergedEntries;
          applySyncedChildName(entries);
          window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
        }
        render();
      });
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
          const merged = mergeEntries(readEntries(), cloudEntries);
          applySyncedChildName(merged);
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

    document.getElementById('refresh-entries')?.addEventListener('click', async () => {
      const cloudEntries = await fetchFromSupabase();
      if (!cloudEntries) return;
      entries = mergeEntries(entries, cloudEntries);
      applySyncedChildName(entries);
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
      render();
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
    updateThemeMetaColor(selectedTheme);
    confettiBurst();

    document.getElementById('tts-prompt-btn')?.addEventListener('click', () => {
      if (selectedSection) {
        triggerHaptic(25);
        speakPromptText(SECTION_COPY[selectedSection].prompt);
      }
    });

    const voiceBtn = document.getElementById('stt-voice-btn') as HTMLButtonElement | null;
    const responseTextarea = document.getElementById('journal-response') as HTMLTextAreaElement | null;
    if (voiceBtn && responseTextarea) {
      voiceBtn.addEventListener('click', () => {
        triggerHaptic(30);
        toggleVoiceDictation(responseTextarea, voiceBtn);
      });
    }

    rootElement.querySelectorAll<HTMLButtonElement>('[data-theme]').forEach((button) => {
      button.addEventListener('click', () => {
        const nextTheme = button.dataset.theme as ThemeName;
        if (!nextTheme) return;
        triggerHaptic(20);
        selectedTheme = nextTheme;
        render();
      });
    });

    rootElement.querySelectorAll<HTMLButtonElement>('[data-section]').forEach((button) => {
      button.addEventListener('click', async () => {
        triggerHaptic(30);
        selectedSection = button.dataset.section as EntrySection;
        if (selectedSection === 'feelings') {
          selectedEmotions = [];
        }
        if (selectedSection === 'draw') {
          await openDrawFullscreen();
        }
        render();
        if (selectedSection === 'photos') {
          window.requestAnimationFrame(() => {
            document.getElementById('photo-prompt')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          });
        }
      });
    });

    rootElement.querySelectorAll<HTMLButtonElement>('[data-emotion]').forEach((button) => {
      button.addEventListener('click', () => {
        const emotion = button.dataset.emotion;
        if (!emotion) return;
        selectedEmotions = selectedEmotions.includes(emotion)
          ? selectedEmotions.filter((selectedEmotion) => selectedEmotion !== emotion)
          : [...selectedEmotions, emotion];
        render();
      });
    });

    rootElement.querySelectorAll<HTMLButtonElement>('[data-game]').forEach((button) => {
      button.addEventListener('click', () => {
        selectedGame = button.dataset.game as GameName;
        render();
      });
    });

    rootElement.querySelectorAll<HTMLButtonElement>('[data-age-group]').forEach((button) => {
      button.addEventListener('click', () => {
        selectedAgeGroup = button.dataset.ageGroup as AgeGroup;
        window.localStorage.setItem(GAME_AGE_GROUP_KEY, selectedAgeGroup);
        starPosition = Math.floor(Math.random() * GAME_LEVELS[selectedAgeGroup].starTiles);
        newMathQuestion();
        startPairGame();
        resetSpotDifference();
        render();
      });
    });

    document.getElementById('close-game')?.addEventListener('click', () => {
      selectedGame = null;
      render();
    });

    rootElement.querySelectorAll<HTMLButtonElement>('[data-hunt-tile]').forEach((button) => {
      button.addEventListener('click', () => {
        if (isRevealingStarTile) return;

        const selectedTile = Number(button.dataset.huntTile);
        const foundStar = selectedTile === starPosition;
        revealedStarTile = selectedTile;
        isRevealingStarTile = true;

        if (foundStar) {
          starHuntScore += 1;
        }
        render();

        window.setTimeout(() => {
          revealedStarTile = null;
          isRevealingStarTile = false;
          starHuntRound += 1;
          starPosition = Math.floor(Math.random() * GAME_LEVELS[selectedAgeGroup].starTiles);
          render();
        }, 850);
      });
    });

    rootElement.querySelectorAll<HTMLButtonElement>('[data-math-answer]').forEach((button) => {
      button.addEventListener('click', () => {
        const answer = getMathAnswer();
        if (Number(button.dataset.mathAnswer) === answer) {
          mathScore += 1;
          alert('Correct!');
        } else {
          alert('Good try!');
        }
        newMathQuestion();
        render();
      });
    });

    rootElement.querySelectorAll<HTMLButtonElement>('[data-pair-index]').forEach((button) => {
      button.addEventListener('click', () => {
        const index = Number(button.dataset.pairIndex);
        if (isCheckingPair || flippedPairIndexes.includes(index) || matchedPairIndexes.has(index)) return;

        const nextFlippedIndexes = [...flippedPairIndexes, index];
        flippedPairIndexes = nextFlippedIndexes;

        if (nextFlippedIndexes.length < 2) {
          render();
          return;
        }

        pairTurns += 1;
        isCheckingPair = true;
        const [firstIndex, secondIndex] = nextFlippedIndexes;
        const isMatch = pairCards[firstIndex] === pairCards[secondIndex];
        render();

        window.setTimeout(() => {
          if (isMatch) {
            matchedPairIndexes.add(firstIndex);
            matchedPairIndexes.add(secondIndex);
          }
          flippedPairIndexes = [];
          isCheckingPair = false;
          render();
        }, 600);
      });
    });

    document.getElementById('restart-pairs')?.addEventListener('click', () => {
      startPairGame();
      render();
    });

    rootElement.querySelectorAll<HTMLButtonElement>('[data-spot-index]').forEach((button) => {
      button.addEventListener('click', () => {
        const index = Number(button.dataset.spotIndex);
        const dailyScene = getDailySpotScene();
        const differences = dailyScene.differenceIndexes.slice(0, GAME_LEVELS[selectedAgeGroup].pairCount - 2);

        if (differences.includes(index)) {
          foundSpotIndexes.add(index);
        } else {
          alert('Keep looking!');
        }
        render();
      });
    });

    document.getElementById('look-back-toggle')?.addEventListener('click', () => {
      isLookingBack = !isLookingBack;
      render();
    });

    const closeDrawingView = async () => {
      selectedSection = null;
      await leaveDrawingFullscreen();
      render();
    };

    const backButton = document.getElementById('back-to-menu');
    backButton?.addEventListener('click', () => {
      closeDrawingView();
    });

    const exitFullscreenButton = document.getElementById('exit-drawing-fullscreen');
    exitFullscreenButton?.addEventListener('click', () => {
      closeDrawingView();
    });

    document.addEventListener('keydown', (event) => {
      if (selectedSection === 'draw' && event.key === 'Escape') {
        closeDrawingView();
      }
    }, { once: false });

    if (selectedSection === 'draw') {
      openDrawFullscreen();
    }

    setupDrawingCanvas();

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
      triggerHaptic([40, 60, 40]);

      if (selectedSection === 'draw') {
        const responseElement = document.getElementById('journal-response') as HTMLTextAreaElement | null;
        const content = responseElement?.value.trim() || '';
        const drawingCanvas = document.getElementById('drawing-canvas') as HTMLCanvasElement | null;
        const hasDrawing = Boolean((window as any).drawingDirty);

        if (!content && !hasDrawing) {
          alert('Please draw something or add a note before saving');
          return;
        }

        const nextEntry: JournalEntryRecord = {
          id: typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}`,
          date: getToday(),
          content,
          section: selectedSection,
          drawing: drawingCanvas ? drawingCanvas.toDataURL('image/png') : undefined
        };

        entries = [nextEntry, ...entries];
        writeEntries(entries);
  const saveAnotherDrawing = (event as SubmitEvent).submitter?.id === 'save-and-new-drawing';
  selectedSection = saveAnotherDrawing ? 'draw' : null;
        render();
      } else if (selectedSection === 'photos') {
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
      } else if (selectedSection === 'feelings') {
        const responseElement = document.getElementById('journal-response') as HTMLTextAreaElement | null;
        const content = responseElement?.value.trim() || '';
        if (selectedEmotions.length === 0 || !content) return;

        const nextEntry: JournalEntryRecord = {
          id: typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}`,
          date: getToday(),
          content,
          section: selectedSection,
          emotions: selectedEmotions
        };

        entries = [nextEntry, ...entries];
        writeEntries(entries);
        selectedEmotions = [];
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
        entries = entries.map((entry) => entry.id === button.dataset.entryId ? { ...entry, deleted: true } : entry);
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

  window.addEventListener('journal-entries-synced', ((event: CustomEvent<JournalEntryRecord[]>) => {
    entries = event.detail;
    applySyncedChildName(entries);
    if (document.visibilityState === 'visible') {
      render();
    }
  }) as EventListener);

  window.addEventListener('offline', () => {
    updateConnectionStatus();
  });

  // Periodically check for updates (every 30 seconds when online and synced)
  setInterval(async () => {
    if (!navigator.onLine || !getSyncKey()) return;
    
    const cloudEntries = await fetchFromSupabase();
    if (!cloudEntries || cloudEntries.length === 0) return;
    
    const localEntries = readEntries();
    const mergedEntries = mergeEntries(localEntries, cloudEntries);
    if (JSON.stringify(mergedEntries) !== JSON.stringify(localEntries)) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(mergedEntries));
      entries = mergedEntries;
      applySyncedChildName(entries);
      if (document.visibilityState === 'visible') {
        render();
      }
    }
  }, 30000);

  render();
  loadWeatherForecast();
}