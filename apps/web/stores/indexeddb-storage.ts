import { get, set, del } from 'idb-keyval';

export const indexedDBStorage = {
  getItem: async (name: string) => {
    let value = await get(name);
    if (value !== undefined) {
      return value;
    }
    // Migrate from localStorage if exists
    value = localStorage.getItem(name);
    if (value !== null) {
      await set(name, value);
      localStorage.removeItem(name);
      return value;
    }
    return null;
  },
  setItem: async (name: string, value: string) => {
    await set(name, value);
  },
  removeItem: async (name: string) => {
    await del(name);
  },
};
