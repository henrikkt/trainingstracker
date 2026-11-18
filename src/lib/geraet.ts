import { useEffect, useState } from 'react';

/**
 * Geräte-Funktionen, jeweils „wo der Browser es erlaubt“:
 *  - Vibration: Android/Chrome ja, iPhone/Safari nein
 *  - Ton: überall, aber erst nach einer Nutzer-Geste (deshalb entsperreTon() beim Abhaken aufrufen)
 *  - Wake Lock (Bildschirm bleibt an): Chrome/Android und Safari ab iOS 16.4
 */

let audio: AudioContext | null = null;

/** Muss aus einem Klick/Tipp heraus aufgerufen werden, damit späterer Ton erlaubt ist. */
export function entsperreTon(): void {
  try {
    audio ??= new AudioContext();
    if (audio.state === 'suspended') void audio.resume();
  } catch {
    audio = null;
  }
}

/** Drei kurze Pieptöne + Vibrationsmuster. */
export function signalisierePausenende(): void {
  try {
    navigator.vibrate?.([300, 150, 300, 150, 300]);
  } catch {
    // nicht unterstützt
  }
  try {
    if (!audio) return;
    const t0 = audio.currentTime;
    for (const versatz of [0, 0.25, 0.5]) {
      const ton = audio.createOscillator();
      const lautstaerke = audio.createGain();
      ton.frequency.value = 880;
      lautstaerke.gain.setValueAtTime(0.0001, t0 + versatz);
      lautstaerke.gain.exponentialRampToValueAtTime(0.35, t0 + versatz + 0.02);
      lautstaerke.gain.exponentialRampToValueAtTime(0.0001, t0 + versatz + 0.18);
      ton.connect(lautstaerke).connect(audio.destination);
      ton.start(t0 + versatz);
      ton.stop(t0 + versatz + 0.2);
    }
  } catch {
    // Ton nicht möglich
  }
}

/** Hält den Bildschirm an, solange `aktiv` (fordert nach App-Wechsel erneut an). */
export function useWakeLock(aktiv: boolean): void {
  useEffect(() => {
    if (!aktiv || !('wakeLock' in navigator)) return;
    let sperre: WakeLockSentinel | null = null;
    let beendet = false;
    const anfordern = async () => {
      try {
        if (document.visibilityState === 'visible' && !beendet) sperre = await navigator.wakeLock.request('screen');
      } catch {
        // z. B. Energiesparmodus – kein Problem
      }
    };
    const beiSichtbarkeit = () => void anfordern();
    void anfordern();
    document.addEventListener('visibilitychange', beiSichtbarkeit);
    return () => {
      beendet = true;
      document.removeEventListener('visibilitychange', beiSichtbarkeit);
      void sperre?.release().catch(() => undefined);
    };
  }, [aktiv]);
}

/** Aktuelle Zeit in ms, aktualisiert alle `intervallMs`. */
export function useJetzt(intervallMs = 1000): number {
  const [jetzt, setJetzt] = useState(Date.now);
  useEffect(() => {
    const id = window.setInterval(() => setJetzt(Date.now()), intervallMs);
    return () => window.clearInterval(id);
  }, [intervallMs]);
  return jetzt;
}
