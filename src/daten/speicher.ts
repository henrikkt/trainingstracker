/**
 * Bittet den Browser, die lokalen Daten nicht automatisch zu löschen (Speicherdruck, Safari-7-Tage-Regel).
 * Chrome/Android entscheidet still anhand der Nutzung (installierte App → meist ja), Safari/iOS gewährt es
 * installierten Web-Apps. Ergebnis wird im Profil angezeigt.
 */
export async function fordereDauerhaftenSpeicherAn(): Promise<boolean> {
  try {
    if (!navigator.storage?.persist) return false;
    if (await navigator.storage.persisted()) return true;
    return await navigator.storage.persist();
  } catch {
    return false;
  }
}

export async function istSpeicherDauerhaft(): Promise<boolean> {
  try {
    return (await navigator.storage?.persisted?.()) ?? false;
  } catch {
    return false;
  }
}
