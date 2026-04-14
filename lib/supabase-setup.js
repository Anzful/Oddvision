// Custom Storage Adapter for Chrome Extension (Async)
const chromeStorageAdapter = {
  getItem: (key) => {
    return new Promise((resolve) => {
      chrome.storage.local.get([key], (result) => {
        resolve(result[key] || null);
      });
    });
  },
  setItem: (key, value) => {
    return new Promise((resolve) => {
      chrome.storage.local.set({ [key]: value }, () => {
        resolve();
      });
    });
  },
  removeItem: (key) => {
    return new Promise((resolve) => {
      chrome.storage.local.remove([key], () => {
        resolve();
      });
    });
  },
};

// Initialize Supabase
// Handle different environments (Window vs Service Worker)
const context = typeof globalThis !== 'undefined' ? globalThis : (typeof self !== 'undefined' ? self : window);
const { createClient } = context.supabase || globalThis.supabase;

context.supabase = createClient(globalThis.OddvisionConfig.supabaseUrl, globalThis.OddvisionConfig.supabaseKey, {
  auth: {
    storage: chromeStorageAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false
  }
});
