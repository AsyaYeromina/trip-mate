"use client";

const OWNER_KEY_STORAGE_KEY = "tripMate.anonymousUserId";

function createFallbackId() {
  return `anon_${Date.now().toString(36)}_${Math.random()
    .toString(36)
    .slice(2, 10)}`;
}

export function getOrCreateOwnerKey() {
  const existingKey = window.localStorage.getItem(OWNER_KEY_STORAGE_KEY);

  if (existingKey) {
    return existingKey;
  }

  const newKey =
    typeof window.crypto?.randomUUID === "function"
      ? window.crypto.randomUUID()
      : createFallbackId();

  window.localStorage.setItem(OWNER_KEY_STORAGE_KEY, newKey);
  return newKey;
}
