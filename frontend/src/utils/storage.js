const memoryStore = new Map();

function hasStorage(type) {
  try {
    if (typeof window === 'undefined' || !window[type]) return false;
    const key = '__storage_test__';
    window[type].setItem(key, key);
    window[type].removeItem(key);
    return true;
  } catch {
    return false;
  }
}

function read(type, key) {
  if (hasStorage(type)) {
    return window[type].getItem(key);
  }

  return memoryStore.has(`${type}:${key}`) ? memoryStore.get(`${type}:${key}`) : null;
}

function write(type, key, value) {
  const stringValue = String(value);

  if (hasStorage(type)) {
    window[type].setItem(key, stringValue);
    return;
  }

  memoryStore.set(`${type}:${key}`, stringValue);
}

function remove(type, key) {
  if (hasStorage(type)) {
    window[type].removeItem(key);
    return;
  }

  memoryStore.delete(`${type}:${key}`);
}

export const storage = {
  getLocalItem: (key) => read('localStorage', key),
  setLocalItem: (key, value) => write('localStorage', key, value),
  removeLocalItem: (key) => remove('localStorage', key),
  getSessionItem: (key) => read('sessionStorage', key),
  setSessionItem: (key, value) => write('sessionStorage', key, value),
  removeSessionItem: (key) => remove('sessionStorage', key),
};

export default storage;
