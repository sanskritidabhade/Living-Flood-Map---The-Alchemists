"use client";

import { useSyncExternalStore } from "react";

/**
 * UI sounds synthesised with Web Audio (no files) plus a short vibration where
 * the browser allows it (Android; iOS Safari has no Vibration API).
 */

const KEY = "lfm-muted";
let ctx: AudioContext | null = null;
let muted = read();
const listeners = new Set<() => void>();

function read(): boolean {
  try {
    return typeof window !== "undefined" && localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

export function setMuted(value: boolean) {
  muted = value;
  try {
    localStorage.setItem(KEY, value ? "1" : "0");
  } catch {
    // Storage blocked: the setting just lasts for this visit.
  }
  listeners.forEach((l) => l());
}

export function useMuted(): boolean {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => muted,
    () => false,
  );
}

function audio(): AudioContext | null {
  if (typeof window === "undefined") return null;
  // Browsers only allow audio after a user gesture, which every caller is.
  ctx ??= new AudioContext();
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

function blip(from: number, to: number, ms: number, volume: number, type: OscillatorType, delay = 0) {
  const ac = audio();
  if (!ac) return;
  const t = ac.currentTime + delay;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(from, t);
  osc.frequency.exponentialRampToValueAtTime(to, t + ms / 1000);
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(volume, t + 0.004);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + ms / 1000);
  osc.connect(gain).connect(ac.destination);
  osc.start(t);
  osc.stop(t + ms / 1000 + 0.02);
}

function buzz(pattern: number | number[]) {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate(pattern);
}

/** Plain button press. */
export function tick() {
  if (muted) return;
  blip(2200, 1300, 35, 0.05, "triangle");
  buzz(8);
}

/** Toggle switched on (rising) or off (falling). */
export function toggle(on: boolean) {
  if (muted) return;
  if (on) blip(900, 1800, 60, 0.05, "sine");
  else blip(1600, 800, 60, 0.04, "sine");
  buzz(on ? [6, 30, 6] : 6);
}

/** Selecting a report on the map or in the list. */
export function select() {
  if (muted) return;
  blip(700, 1400, 90, 0.06, "sine");
  buzz(12);
}

/** Something arrived: a chat answer, sorting finished. */
export function chime() {
  if (muted) return;
  blip(880, 880, 140, 0.045, "sine");
  blip(1320, 1320, 220, 0.04, "sine", 0.09);
  buzz([10, 40, 10]);
}
