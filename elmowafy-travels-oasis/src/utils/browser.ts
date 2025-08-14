/**
 * Browser utilities for safe access to browser APIs
 * This helps prevent issues when code is executed in non-browser environments
 */

// Safe reference to document object
export const document = typeof window !== 'undefined' ? window.document : undefined;

// Safe reference to window object
export const safeWindow = typeof window !== 'undefined' ? window : undefined;

// Safe reference to localStorage
export const localStorage = typeof window !== 'undefined' ? window.localStorage : {
  getItem: () => null,
  setItem: () => null,
  removeItem: () => null,
  length: 0,
  clear: () => null,
  key: () => null
};

// Safe reference to sessionStorage
export const sessionStorage = typeof window !== 'undefined' ? window.sessionStorage : {
  getItem: () => null,
  setItem: () => null,
  removeItem: () => null,
  length: 0,
  clear: () => null,
  key: () => null
};

/**
 * Safely adds a class to the document body
 */
export const addBodyClass = (className: string): void => {
  if (document?.body) {
    document.body.classList.add(className);
  }
};

/**
 * Safely removes a class from the document body
 */
export const removeBodyClass = (className: string): void => {
  if (document?.body) {
    document.body.classList.remove(className);
  }
};

/**
 * Sets the document direction (RTL/LTR)
 */
export const setDocumentDirection = (isRTL: boolean): void => {
  if (document?.documentElement) {
    document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
  }
};

/**
 * Sets the document language
 */
export const setDocumentLanguage = (lang: string): void => {
  if (document?.documentElement) {
    document.documentElement.lang = lang;
  }
};