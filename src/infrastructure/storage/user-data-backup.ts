/* eslint-disable @typescript-eslint/no-explicit-any */

const storageKey = 'refined-prun';
const maxBackups = 5;
const hoursBetweenBackups = 24;

export interface UserDataBackup {
  data: any;
  timestamp: number;
}

interface Backups {
  backups: UserDataBackup[];
}

const refBackups = shallowRef<UserDataBackup[]>(loadBackups());

export function getUserDataBackups() {
  return refBackups.value;
}

function loadBackups() {
  try {
    const json = localStorage.getItem(storageKey);
    if (!json) {
      return [];
    }
    const backups = JSON.parse(json);
    if (!backups?.backups) {
      return [];
    }
    return (backups as Backups).backups;
  } catch {
    return [];
  }
}

function saveBackups(backups: UserDataBackup[]) {
  localStorage.setItem(storageKey, JSON.stringify({ backups }));
  refBackups.value = [...backups];
}

export function backupUserData(data: any) {
  const backups = getUserDataBackups();
  const hasRecentBackup =
    backups.length > 0 && backups[0].timestamp > Date.now() - hoursBetweenBackups * 3600000;
  if (hasRecentBackup) {
    return;
  }
  backups.unshift({
    data,
    timestamp: Date.now(),
  });
  while (backups.length > maxBackups) {
    backups.pop();
  }
  saveBackups(backups);
}

export function deleteUserDataBackup(backup: UserDataBackup) {
  const backups = getUserDataBackups().filter(x => x !== backup);
  saveBackups(backups);
}

// The newest user data, written on every save. The extension storage is removed together with
// the extension, but the game page storage stays, so a reinstalled extension can load it.
const latestKey = 'refined-prun-latest';

export function saveLatestUserData(data: any) {
  try {
    localStorage.setItem(latestKey, JSON.stringify({ data, timestamp: Date.now() }));
  } catch {
    // The page storage can be full or blocked; the daily backups still exist.
  }
}

export function loadLatestUserData(): UserDataBackup | undefined {
  try {
    const json = localStorage.getItem(latestKey);
    const latest = json ? (JSON.parse(json) as UserDataBackup) : undefined;
    return latest?.data ? latest : undefined;
  } catch {
    return undefined;
  }
}
