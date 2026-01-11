// Global localStorage mock for server-side rendering
if (typeof window === 'undefined') {
  // Create a silent mock localStorage object that doesn't crash during SSR
  const mockLocalStorage = {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {},
    clear: () => {},
    key: () => null,
    length: 0,
  };

  // Assign mock to global
  (global as any).localStorage = mockLocalStorage;
}

export {};
