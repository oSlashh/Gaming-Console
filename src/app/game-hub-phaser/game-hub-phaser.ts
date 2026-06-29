import { Component, AfterViewInit, OnDestroy, Inject, PLATFORM_ID, NgZone } from '@angular/core';
import { isPlatformBrowser, CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Userdetails } from '../userdetails';
import type * as PhaserType from 'phaser';

interface IslandData {
  key: string;
  name: string;
  subtitle: string;
  xPct: number;
  yPct: number;
  isCenter: boolean;
  themeColor: number;
  spriteKey: string;
  floatSpeed: number;
  floatPhase: number;
  floatAmp: number;
  players?: string;
  status?: string;
  description?: string;
}

interface Star {
  xPct: number;
  yPct: number;
  size: number;
  alpha: number;
  speed: number;
  phase: number;
}

const ISLANDS: IslandData[] = [
  { key: 'wavelength', name: 'Wavelength', subtitle: 'Mind Reading Challenge', xPct: 0.5, yPct: 0.18, isCenter: false, themeColor: 0x7e57c2, spriteKey: 'island-wavelength', floatSpeed: 0.30, floatPhase: 0.0, floatAmp: 4, players: '4–12', status: 'Available', description: 'Tune into the correct mental wavelength and guess your teammate\'s thoughts.' },
  { key: 'flappy', name: 'Flappy Escape', subtitle: 'Skyward Voyage', xPct: 0.27, yPct: 0.34, isCenter: false, themeColor: 0xffa000, spriteKey: 'island-flappy', floatSpeed: 0.45, floatPhase: 1.0, floatAmp: 5, players: '1–2', status: 'Available', description: 'Flap through deadly sky obstacles and escape the temple.' },
  { key: 'reaction', name: 'Reaction Time', subtitle: 'Reflex Trial', xPct: 0.73, yPct: 0.34, isCenter: false, themeColor: 0xff7043, spriteKey: 'island-reaction', floatSpeed: 0.38, floatPhase: 2.0, floatAmp: 4.5, players: '1–2', status: 'Available', description: 'Test your reflexes and match the triggers in record time.' },
  { key: 'nexus', name: 'The Nexus', subtitle: 'Nexus Hearth', xPct: 0.5, yPct: 0.45, isCenter: true, themeColor: 0x00e5ff, spriteKey: 'island-nexus', floatSpeed: 0.25, floatPhase: 3.0, floatAmp: 3.5, description: 'Central gateway connecting all worlds.' },
  { key: 'oops', name: 'Oops!', subtitle: 'Chaos Caster', xPct: 0.27, yPct: 0.64, isCenter: false, themeColor: 0xd32f2f, spriteKey: 'island-oops', floatSpeed: 0.52, floatPhase: 4.0, floatAmp: 5.5, players: '2–6', status: 'Available', description: 'Outwit your friends in a chaotic game of spells and mishaps.' },
  { key: 'puzzle', name: 'Image Puzzle', subtitle: 'Sharded Memories', xPct: 0.73, yPct: 0.64, isCenter: false, themeColor: 0x00b0ff, spriteKey: 'island-image-puzzle', floatSpeed: 0.41, floatPhase: 5.0, floatAmp: 4, players: '1–4', status: 'Available', description: 'Reconstruct broken fragments to unlock ancient memories.' },
  { key: 'howfaroff', name: 'Higher or Lower', subtitle: 'Estimation Battle', xPct: 0.5, yPct: 0.79, isCenter: false, themeColor: 0xb0bec5, spriteKey: 'island-higher-lower', floatSpeed: 0.35, floatPhase: 6.0, floatAmp: 4.8, players: '2–8', status: 'Available', description: 'Bet on higher or lower numbers in this high-stakes game of prediction.' }
];

const CHORDS = [
  [130.81, 164.81, 196.00, 246.94], // Cmaj7
  [110.00, 130.81, 164.81, 196.00], // Am7
  [87.31, 110.00, 130.81, 196.00],  // Fmaj7
  [98.00, 123.47, 146.83, 196.00]   // G6
];

export class HubAudioManager {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;

  // Gains matching the specified mix
  private ambienceGain: GainNode | null = null;    // 10%
  private uiGain: GainNode | null = null;          // 45%
  private portalGain: GainNode | null = null;      // 40%
  private selectGain: GainNode | null = null;      // 35%
  private hoverGain: GainNode | null = null;       // 20%
  private transitionGain: GainNode | null = null;  // 25%

  private delayNode: DelayNode | null = null;
  private delayFeedback: GainNode | null = null;
  private delayFilter: BiquadFilterNode | null = null;

  // Ambient sound sources
  private choirOscillators: OscillatorNode[] = [];
  private choirGains: GainNode[] = [];

  // Active nodes for transitions/camera whoosh
  private activeCameraWhoosh: { noise: AudioBufferSourceNode; gain: GainNode } | null = null;
  private activeTravelNodes: any[] = [];

  private isInitialized = false;
  private interactionListenersBound = false;

  constructor(private isBrowser: boolean) {
    if (this.isBrowser) {
      this.setupInteractionListeners();
    }
  }

  private setupInteractionListeners() {
    if (this.interactionListenersBound) return;
    const resumeHandler = () => {
      this.resume();
    };
    window.addEventListener('click', resumeHandler, { once: true });
    window.addEventListener('keydown', resumeHandler, { once: true });
    this.interactionListenersBound = true;
  }

  resume() {
    if (!this.isBrowser) return;
    this.ensureInitialized();
    const ctx = this.ctx;
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().then(() => {
        console.log('[HubAudioManager] AudioContext resumed successfully.');
      });
    }
  }

  private ensureInitialized() {
    if (!this.isBrowser || this.isInitialized) return;
    try {
      const AudioContextClass = (window as any).AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioContextClass();
      this.ctx = ctx;

      // Master Gain: 0.8 to provide headroom
      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(0.8, ctx.currentTime);
      masterGain.connect(ctx.destination);
      this.masterGain = masterGain;

      // Ambience: 10%
      const ambienceGain = ctx.createGain();
      let enabled = true;
      if (this.isBrowser) {
        const val = localStorage.getItem('game-hub-ambient-enabled');
        if (val === 'false') {
          enabled = false;
        }
      }
      const initialGain = enabled ? 0.14 : 0.0;
      ambienceGain.gain.setValueAtTime(initialGain, ctx.currentTime);
      ambienceGain.connect(masterGain);
      this.ambienceGain = ambienceGain;

      // UI: 45%
      const uiGain = ctx.createGain();
      uiGain.gain.setValueAtTime(0.45, ctx.currentTime);
      uiGain.connect(masterGain);
      this.uiGain = uiGain;

      // Portal: 40%
      const portalGain = ctx.createGain();
      portalGain.gain.setValueAtTime(0.40, ctx.currentTime);
      portalGain.connect(masterGain);
      this.portalGain = portalGain;

      // Selection: 35%
      const selectGain = ctx.createGain();
      selectGain.gain.setValueAtTime(0.35, ctx.currentTime);
      selectGain.connect(masterGain);
      this.selectGain = selectGain;

      // Hover: 20%
      const hoverGain = ctx.createGain();
      hoverGain.gain.setValueAtTime(0.20, ctx.currentTime);
      hoverGain.connect(masterGain);
      this.hoverGain = hoverGain;

      // Transitions: 25%
      const transitionGain = ctx.createGain();
      transitionGain.gain.setValueAtTime(0.25, ctx.currentTime);
      transitionGain.connect(masterGain);
      this.transitionGain = transitionGain;

      // Cozy tape-like delay space (warm reverb)
      const delayNode = ctx.createDelay(1.0);
      delayNode.delayTime.setValueAtTime(0.35, ctx.currentTime);

      const delayFeedback = ctx.createGain();
      delayFeedback.gain.setValueAtTime(0.40, ctx.currentTime);

      const delayFilter = ctx.createBiquadFilter();
      delayFilter.type = 'lowpass';
      delayFilter.frequency.setValueAtTime(1000, ctx.currentTime);

      delayNode.connect(delayFilter);
      delayFilter.connect(delayFeedback);
      delayFeedback.connect(delayNode);
      delayNode.connect(masterGain);

      this.delayNode = delayNode;
      this.delayFeedback = delayFeedback;
      this.delayFilter = delayFilter;

      // Start cozy world elements
      this.initAmbiencePad();

      this.isInitialized = true;
      console.log('[HubAudioManager] Cozy audio engine initialized.');
    } catch (e) {
      console.error('[HubAudioManager] Failed to initialize AudioContext:', e);
    }
  }

  private initAmbiencePad() {
    const ctx = this.ctx;
    const ambienceGain = this.ambienceGain;
    if (!ctx || !ambienceGain) return;

    const freqs = [130.81, 196.00, 329.63];
    const types: OscillatorType[] = ['triangle', 'sine', 'sine'];

    const padFilter = ctx.createBiquadFilter();
    padFilter.type = 'lowpass';
    padFilter.frequency.setValueAtTime(250, ctx.currentTime);
    padFilter.connect(ambienceGain);

    freqs.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      osc.type = types[idx];
      osc.frequency.setValueAtTime(freq, ctx.currentTime);

      const voiceGain = ctx.createGain();
      voiceGain.gain.setValueAtTime(0.08, ctx.currentTime);

      osc.connect(voiceGain);
      voiceGain.connect(padFilter);
      osc.start();

      this.choirOscillators.push(osc);
      this.choirGains.push(voiceGain);
    });
  }

  getAmbienceVolume(): number {
    return this.getAmbienceEnabled() ? 100 : 0;
  }

  setAmbienceVolume(percent: number) {
    this.setAmbienceEnabled(percent > 0);
  }

  getAmbienceEnabled(): boolean {
    if (this.isBrowser) {
      const val = localStorage.getItem('game-hub-ambient-enabled');
      if (val === 'false') {
        return false;
      }
    }
    return true;
  }

  setAmbienceEnabled(enabled: boolean) {
    if (this.isBrowser) {
      localStorage.setItem('game-hub-ambient-enabled', enabled ? 'true' : 'false');
    }
    if (!this.ctx || !this.ambienceGain) return;
    const targetGain = enabled ? 0.14 : 0.0;
    this.ambienceGain.gain.setTargetAtTime(targetGain, this.ctx.currentTime, 0.05);
  }

  getAmbienceFactor(): number {
    return this.getAmbienceEnabled() ? 1.0 : 0.0;
  }


  playUIButtonHover() {
    if (!this.ctx || !this.uiGain) this.ensureInitialized();
    const ctx = this.ctx;
    const uiGain = this.uiGain;
    if (!ctx || !uiGain) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(650, now);

    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.18, now + 0.002);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.018);

    osc.connect(gainNode);
    gainNode.connect(uiGain);

    osc.start(now);
    osc.stop(now + 0.03);
  }

  playUIButtonClick() {
    if (!this.ctx || !this.uiGain) this.ensureInitialized();
    const ctx = this.ctx;
    const uiGain = this.uiGain;
    if (!ctx || !uiGain) return;

    const now = ctx.currentTime;

    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(140, now);
    gain1.gain.setValueAtTime(0, now);
    gain1.gain.linearRampToValueAtTime(0.35, now + 0.002);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.035);
    osc1.connect(gain1);
    gain1.connect(uiGain);

    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(850, now);
    gain2.gain.setValueAtTime(0, now);
    gain2.gain.linearRampToValueAtTime(0.15, now + 0.001);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.015);
    osc2.connect(gain2);
    gain2.connect(uiGain);

    osc1.start(now);
    osc1.stop(now + 0.05);
    osc2.start(now);
    osc2.stop(now + 0.05);
  }

  playConfirmDing() {
    if (!this.ctx || !this.uiGain) this.ensureInitialized();
    const ctx = this.ctx;
    const uiGain = this.uiGain;
    const delayNode = this.delayNode;
    if (!ctx || !uiGain) return;

    const now = ctx.currentTime;
    const freqs = [987.77, 1318.51];

    const masterDing = ctx.createGain();
    masterDing.gain.setValueAtTime(0, now);
    masterDing.gain.linearRampToValueAtTime(0.28, now + 0.005);
    masterDing.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
    masterDing.connect(uiGain);
    if (delayNode) masterDing.connect(delayNode);

    freqs.forEach(f => {
      if (!ctx) return;
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, now);
      osc.connect(masterDing);
      osc.start(now);
      osc.stop(now + 0.7);
    });
  }

  playIslandHover(key: string) {
    if (!this.ctx || !this.hoverGain) this.ensureInitialized();
    const ctx = this.ctx;
    const hoverGain = this.hoverGain;
    if (!ctx || !hoverGain) return;

    const now = ctx.currentTime;

    // Pitch map — each island has a unique crystal note
    let pitch = 1046.50;
    if (key === 'flappy') pitch = 987.77;   // B5
    else if (key === 'wavelength') pitch = 1174.66; // D6
    else if (key === 'reaction') pitch = 1318.51; // E6
    else if (key === 'puzzle') pitch = 1567.98; // G6
    else if (key === 'howfaroff') pitch = 880.00;  // A5
    else if (key === 'oops') pitch = 783.99;  // G5

    // Master envelope: instant attack, 130ms total decay
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0, now);
    masterGain.gain.linearRampToValueAtTime(0.145, now + 0.004); // instant attack
    masterGain.gain.exponentialRampToValueAtTime(0.001, now + 0.130); // 130ms decay
    masterGain.connect(hoverGain);

    // Partial 1 — fundamental sine (body of the ting)
    const osc1 = ctx.createOscillator();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(pitch, now);
    osc1.connect(masterGain);
    osc1.start(now);
    osc1.stop(now + 0.18);

    // Partial 2 — perfect fifth overtone, 40% amplitude (airy shimmer)
    const osc2 = ctx.createOscillator();
    const fifthGain = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(pitch * 1.5, now);
    fifthGain.gain.setValueAtTime(0.4, now);
    osc2.connect(fifthGain);
    fifthGain.connect(masterGain);
    osc2.start(now);
    osc2.stop(now + 0.10); // overtone decays faster for sparkle tail
  }

  playIslandSelect(key: string) {
    if (!this.ctx || !this.selectGain) this.ensureInitialized();
    const ctx = this.ctx;
    const selectGain = this.selectGain;
    const delayNode = this.delayNode;
    if (!ctx || !selectGain) return;

    const now = ctx.currentTime;

    // Layer 1: Airy noise surge — energy flowing through the ley line
    const noiseDur = 0.45;
    const noiseBuf = ctx.createBuffer(1, ctx.sampleRate * noiseDur, ctx.sampleRate);
    const noiseData = noiseBuf.getChannelData(0);
    for (let i = 0; i < noiseData.length; i++) noiseData[i] = Math.random() * 2 - 1;

    const noiseNode = ctx.createBufferSource();
    noiseNode.buffer = noiseBuf;

    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.Q.setValueAtTime(1.8, now);
    noiseFilter.frequency.setValueAtTime(200, now);
    noiseFilter.frequency.exponentialRampToValueAtTime(1400, now + 0.38);

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0, now);
    noiseGain.gain.linearRampToValueAtTime(0.16, now + 0.06);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + noiseDur);

    noiseNode.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(selectGain);
    noiseNode.start(now);
    noiseNode.stop(now + noiseDur + 0.02);

    // Layer 2: Rising shimmer chord — warm harmonic connection
    const chordRoot = 329.63; // E4
    const chordPartials = [
      { freq: chordRoot, startDelay: 0.00, peak: 0.14 },
      { freq: chordRoot * 1.2599, startDelay: 0.04, peak: 0.10 },
      { freq: chordRoot * 1.4983, startDelay: 0.08, peak: 0.10 },
    ];
    chordPartials.forEach(({ freq, startDelay, peak }) => {
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + startDelay);
      osc.frequency.linearRampToValueAtTime(freq * 1.04, now + startDelay + 0.40);
      g.gain.setValueAtTime(0, now + startDelay);
      g.gain.linearRampToValueAtTime(peak, now + startDelay + 0.05);
      g.gain.exponentialRampToValueAtTime(0.001, now + startDelay + 0.42);
      osc.connect(g);
      g.connect(selectGain);
      if (delayNode) g.connect(delayNode);
      osc.start(now + startDelay);
      osc.stop(now + startDelay + 0.50);
    });

    // Layer 3: Crystal terminal ping — the connection-made moment
    const pingDelay = 0.18;
    const pingOsc = ctx.createOscillator();
    const pingGain = ctx.createGain();
    pingOsc.type = 'sine';
    pingOsc.frequency.setValueAtTime(1760, now + pingDelay);
    pingGain.gain.setValueAtTime(0, now + pingDelay);
    pingGain.gain.linearRampToValueAtTime(0.09, now + pingDelay + 0.006);
    pingGain.gain.exponentialRampToValueAtTime(0.001, now + pingDelay + 0.28);
    pingOsc.connect(pingGain);
    pingGain.connect(selectGain);
    if (delayNode) pingGain.connect(delayNode);
    pingOsc.start(now + pingDelay);
    pingOsc.stop(now + pingDelay + 0.32);
  }


  playCardOpen() {
    if (!this.ctx || !this.uiGain) this.ensureInitialized();
    const ctx = this.ctx;
    const uiGain = this.uiGain;
    if (!ctx || !uiGain) return;

    const now = ctx.currentTime;
    const duration = 0.35;

    const bufferSize = ctx.sampleRate * duration;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2.0 - 1.0;

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.Q.setValueAtTime(1.0, now);
    filter.frequency.setValueAtTime(300, now);
    filter.frequency.exponentialRampToValueAtTime(800, now + duration);

    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.18, now + 0.08);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration);

    noise.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(uiGain);

    noise.start(now);
    noise.stop(now + duration + 0.05);

    const sparkleOsc = ctx.createOscillator();
    const sparkleGain = ctx.createGain();
    sparkleOsc.type = 'sine';
    sparkleOsc.frequency.setValueAtTime(1200, now);
    sparkleOsc.frequency.exponentialRampToValueAtTime(1600, now + 0.25);

    sparkleGain.gain.setValueAtTime(0, now);
    sparkleGain.gain.linearRampToValueAtTime(0.08, now + 0.05);
    sparkleGain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

    sparkleOsc.connect(sparkleGain);
    sparkleGain.connect(uiGain);
    if (this.delayNode) sparkleGain.connect(this.delayNode);

    sparkleOsc.start(now);
    sparkleOsc.stop(now + 0.35);
  }

  playCardClose() {
    if (!this.ctx || !this.uiGain) this.ensureInitialized();
    const ctx = this.ctx;
    const uiGain = this.uiGain;
    if (!ctx || !uiGain) return;

    const now = ctx.currentTime;
    const duration = 0.25;

    const bufferSize = ctx.sampleRate * duration;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2.0 - 1.0;

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.Q.setValueAtTime(1.0, now);
    filter.frequency.setValueAtTime(800, now);
    filter.frequency.exponentialRampToValueAtTime(300, now + duration);

    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.15, now + 0.05);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration);

    noise.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(uiGain);

    noise.start(now);
    noise.stop(now + duration + 0.05);

    const shimmerOsc = ctx.createOscillator();
    const shimmerGain = ctx.createGain();
    shimmerOsc.type = 'sine';
    shimmerOsc.frequency.setValueAtTime(1600, now);
    shimmerOsc.frequency.exponentialRampToValueAtTime(1200, now + 0.2);

    shimmerGain.gain.setValueAtTime(0, now);
    shimmerGain.gain.linearRampToValueAtTime(0.06, now + 0.02);
    shimmerGain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

    shimmerOsc.connect(shimmerGain);
    shimmerGain.connect(uiGain);

    shimmerOsc.start(now);
    shimmerOsc.stop(now + 0.25);
  }

  playPlayNowHover() {
    this.playUIButtonHover();
  }

  playPlayNowClick() {
    this.playConfirmDing();
  }

  playPortalTravelSequence() {
    if (!this.ctx || !this.portalGain || !this.ambienceGain) this.ensureInitialized();
    const ctx = this.ctx;
    const portalGain = this.portalGain;
    const ambienceGain = this.ambienceGain;
    const delayNode = this.delayNode;
    if (!ctx || !portalGain || !ambienceGain) return;

    const now = ctx.currentTime;

    ambienceGain.gain.cancelScheduledValues(now);
    ambienceGain.gain.setValueAtTime(ambienceGain.gain.value, now);
    ambienceGain.gain.linearRampToValueAtTime(0.03 * this.getAmbienceFactor(), now + 1.5);

    const humOsc = ctx.createOscillator();
    const humGain = ctx.createGain();
    humOsc.type = 'triangle';
    humOsc.frequency.setValueAtTime(110, now);
    humOsc.frequency.linearRampToValueAtTime(220, now + 1.4);

    humGain.gain.setValueAtTime(0, now);
    humGain.gain.linearRampToValueAtTime(0.28, now + 0.4);
    humGain.gain.linearRampToValueAtTime(0.001, now + 1.4);

    humOsc.connect(humGain);
    humGain.connect(portalGain);

    humOsc.start(now);
    humOsc.stop(now + 1.45);
    this.activeTravelNodes.push(humOsc);
    this.activeTravelNodes.push(humGain);

    const notes = [523.25, 659.25, 783.99, 1046.50, 1318.51];
    notes.forEach((f, idx) => {
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, now + idx * 0.15);

      gainNode.gain.setValueAtTime(0, now + idx * 0.15);
      gainNode.gain.linearRampToValueAtTime(0.12, now + idx * 0.15 + 0.05);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.15 + 0.4);

      osc.connect(gainNode);
      gainNode.connect(portalGain);
      if (delayNode) gainNode.connect(delayNode);

      osc.start(now + idx * 0.15);
      osc.stop(now + idx * 0.15 + 0.45);
      this.activeTravelNodes.push(osc);
      this.activeTravelNodes.push(gainNode);
    });

    const duration = 1.6;
    const bufferSize = ctx.sampleRate * duration;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2.0 - 1.0;

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.Q.setValueAtTime(0.8, now);
    filter.frequency.setValueAtTime(250, now);
    filter.frequency.exponentialRampToValueAtTime(750, now + duration);

    const whooshGain = ctx.createGain();
    whooshGain.gain.setValueAtTime(0, now);
    whooshGain.gain.linearRampToValueAtTime(0.24, now + 0.6);
    whooshGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    noise.connect(filter);
    filter.connect(whooshGain);
    whooshGain.connect(portalGain);

    noise.start(now);
    noise.stop(now + duration + 0.05);
    this.activeTravelNodes.push(noise);
    this.activeTravelNodes.push(whooshGain);
  }

  fadeOutPortalTravel() {
    const ctx = this.ctx;
    const portalGain = this.portalGain;
    if (!ctx || this.activeTravelNodes.length === 0) return;
    const now = ctx.currentTime;

    if (portalGain) {
      portalGain.gain.cancelScheduledValues(now);
      portalGain.gain.setValueAtTime(portalGain.gain.value, now);
      portalGain.gain.linearRampToValueAtTime(0, now + 0.8);
    }

    const nodesToClean = [...this.activeTravelNodes];
    this.activeTravelNodes = [];

    setTimeout(() => {
      nodesToClean.forEach(node => {
        try { node.stop(); } catch (e) { }
        try { node.disconnect(); } catch (e) { }
      });
      const octx = this.ctx;
      const oportalGain = this.portalGain;
      if (octx && oportalGain) {
        oportalGain.gain.setValueAtTime(0.40, octx.currentTime);
      }
    }, 900);
  }

  playPortalEmergence() {
    if (!this.ctx || !this.portalGain) this.ensureInitialized();
    const ctx = this.ctx;
    const portalGain = this.portalGain;
    const delayNode = this.delayNode;
    if (!ctx || !portalGain) return;

    const now = ctx.currentTime;

    const duration = 1.0;
    const bufferSize = ctx.sampleRate * duration;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2.0 - 1.0;

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.Q.setValueAtTime(1.0, now);
    filter.frequency.setValueAtTime(750, now);
    filter.frequency.exponentialRampToValueAtTime(250, now + duration);

    const bloomGain = ctx.createGain();
    bloomGain.gain.setValueAtTime(0, now);
    bloomGain.gain.linearRampToValueAtTime(0.20, now + 0.2);
    bloomGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    noise.connect(filter);
    filter.connect(bloomGain);
    bloomGain.connect(portalGain);

    noise.start(now);
    noise.stop(now + duration + 0.05);

    const descendingNotes = [1046.50, 783.99, 659.25, 523.25];
    descendingNotes.forEach((f, idx) => {
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, now + 0.2 + idx * 0.15);

      gainNode.gain.setValueAtTime(0, now + 0.2 + idx * 0.15);
      gainNode.gain.linearRampToValueAtTime(0.16, now + 0.2 + idx * 0.15 + 0.05);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.2 + idx * 0.15 + 0.5);

      osc.connect(gainNode);
      gainNode.connect(portalGain);
      if (delayNode) gainNode.connect(delayNode);

      osc.start(now + 0.2 + idx * 0.15);
      osc.stop(now + 0.2 + idx * 0.15 + 0.6);
    });
  }

  fadeMusicIn(durationMs: number) {
    if (!this.ctx || !this.ambienceGain) this.ensureInitialized();
    const ctx = this.ctx;
    const ambienceGain = this.ambienceGain;
    if (!ctx || !ambienceGain) return;
    const now = ctx.currentTime;
    ambienceGain.gain.cancelScheduledValues(now);
    ambienceGain.gain.setValueAtTime(ambienceGain.gain.value, now);
    ambienceGain.gain.linearRampToValueAtTime(0.14 * this.getAmbienceFactor(), now + durationMs / 1000);
  }

  fadeMusicOut(durationMs: number) {
    if (!this.ctx || !this.ambienceGain) this.ensureInitialized();
    const ctx = this.ctx;
    const ambienceGain = this.ambienceGain;
    if (!ctx || !ambienceGain) return;
    const now = ctx.currentTime;
    ambienceGain.gain.cancelScheduledValues(now);
    ambienceGain.gain.setValueAtTime(ambienceGain.gain.value, now);
    ambienceGain.gain.linearRampToValueAtTime(0, now + durationMs / 1000);
  }

  playCameraWhoosh() {
    if (!this.ctx || !this.transitionGain) this.ensureInitialized();
    const ctx = this.ctx;
    const transitionGain = this.transitionGain;
    if (!ctx || !transitionGain) return;

    if (this.activeCameraWhoosh) {
      this.fadeCameraWhoosh();
    }

    const now = ctx.currentTime;
    const duration = 4.0;
    const bufferSize = ctx.sampleRate * duration;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2.0 - 1.0;

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.Q.setValueAtTime(0.6, now);
    filter.frequency.setValueAtTime(320, now);
    filter.frequency.exponentialRampToValueAtTime(420, now + 0.8);

    const whooshGain = ctx.createGain();
    whooshGain.gain.setValueAtTime(0, now);
    whooshGain.gain.linearRampToValueAtTime(0.12, now + 0.4);

    noise.connect(filter);
    filter.connect(whooshGain);
    whooshGain.connect(transitionGain);

    noise.start(now);
    this.activeCameraWhoosh = { noise, gain: whooshGain };
  }

  fadeCameraWhoosh() {
    const ctx = this.ctx;
    const whoosh = this.activeCameraWhoosh;
    if (!ctx || !whoosh) return;
    this.activeCameraWhoosh = null;

    const now = ctx.currentTime;
    whoosh.gain.gain.cancelScheduledValues(now);
    whoosh.gain.gain.setValueAtTime(whoosh.gain.gain.value, now);
    whoosh.gain.gain.linearRampToValueAtTime(0, now + 0.6);

    setTimeout(() => {
      try { whoosh.noise.stop(); } catch (e) { }
      try { whoosh.noise.disconnect(); } catch (e) { }
      try { whoosh.gain.disconnect(); } catch (e) { }
    }, 800);
  }

  playProfileHover() {
    if (!this.ctx || !this.uiGain) this.ensureInitialized();
    const ctx = this.ctx;
    const uiGain = this.uiGain;
    if (!ctx || !uiGain) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1500, now);
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.08, now + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    osc.connect(gainNode);
    gainNode.connect(uiGain);
    if (this.delayNode) gainNode.connect(this.delayNode);
    osc.start(now);
    osc.stop(now + 0.2);
  }

  playProfileOpen() {
    if (!this.ctx || !this.uiGain) this.ensureInitialized();
    const ctx = this.ctx;
    const uiGain = this.uiGain;
    if (!ctx || !uiGain) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(440, now + 0.2);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(300, now);

    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.24, now + 0.08);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

    osc.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(uiGain);

    osc.start(now);
    osc.stop(now + 0.3);
  }

  playProfileClose() {
    if (!this.ctx || !this.uiGain) this.ensureInitialized();
    const ctx = this.ctx;
    const uiGain = this.uiGain;
    if (!ctx || !uiGain) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, now);
    osc.frequency.exponentialRampToValueAtTime(220, now + 0.18);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(300, now);

    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.18, now + 0.04);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

    osc.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(uiGain);

    osc.start(now);
    osc.stop(now + 0.25);
  }

  playLogoutSequence(onComplete: () => void) {
    if (!this.ctx || !this.uiGain) {
      onComplete();
      return;
    }
    const ctx = this.ctx;
    const uiGain = this.uiGain;
    const delayNode = this.delayNode;
    const now = ctx.currentTime;

    const bells = [1046.50, 1567.98];
    bells.forEach((f, idx) => {
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, now + idx * 0.1);

      gainNode.gain.setValueAtTime(0, now + idx * 0.1);
      gainNode.gain.linearRampToValueAtTime(0.25, now + idx * 0.1 + 0.005);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.1 + 0.8);

      osc.connect(gainNode);
      gainNode.connect(uiGain);
      if (delayNode) gainNode.connect(delayNode);

      osc.start(now + idx * 0.1);
      osc.stop(now + idx * 0.1 + 0.9);
    });

    const masterGain = this.masterGain;
    if (masterGain) {
      masterGain.gain.cancelScheduledValues(now);
      masterGain.gain.setValueAtTime(masterGain.gain.value, now);
      masterGain.gain.linearRampToValueAtTime(0, now + 1.0);
    }

    setTimeout(() => {
      onComplete();
    }, 1000);
  }

  playNexusArrival() {
    this.playConfirmDing();
  }

  fadeToPeacefulAmbient() {
    const ctx = this.ctx;
    if (!ctx) return;
    const now = ctx.currentTime;

    const transitionGain = this.transitionGain;
    if (transitionGain) {
      transitionGain.gain.cancelScheduledValues(now);
      transitionGain.gain.setValueAtTime(transitionGain.gain.value, now);
      transitionGain.gain.linearRampToValueAtTime(0, now + 1.5);
    }
    const portalGain = this.portalGain;
    if (portalGain) {
      portalGain.gain.cancelScheduledValues(now);
      portalGain.gain.setValueAtTime(portalGain.gain.value, now);
      portalGain.gain.linearRampToValueAtTime(0, now + 1.5);
    }
    const selectGain = this.selectGain;
    if (selectGain) {
      selectGain.gain.cancelScheduledValues(now);
      selectGain.gain.setValueAtTime(selectGain.gain.value, now);
      selectGain.gain.linearRampToValueAtTime(0, now + 1.5);
    }

    const ambienceGain = this.ambienceGain;
    if (ambienceGain) {
      ambienceGain.gain.cancelScheduledValues(now);
      ambienceGain.gain.setValueAtTime(ambienceGain.gain.value, now);
      ambienceGain.gain.linearRampToValueAtTime(0.10 * this.getAmbienceFactor(), now + 1.5);
    }
  }

  startAll(isReturn = false) {
    if (!this.isBrowser) return;
    this.ensureInitialized();
    this.resume();

    const ctx = this.ctx;
    const ambienceGain = this.ambienceGain;
    if (!ctx || !ambienceGain) return;

    const now = ctx.currentTime;

    ambienceGain.gain.cancelScheduledValues(now);
    ambienceGain.gain.setValueAtTime(0.14 * this.getAmbienceFactor(), now);
  }

  destroy() {

    this.activeTravelNodes.forEach(node => {
      try { node.stop(); } catch (e) { }
      try { node.disconnect(); } catch (e) { }
    });
    this.activeTravelNodes = [];

    this.choirOscillators.forEach(osc => {
      try { osc.stop(); } catch (e) { }
      try { osc.disconnect(); } catch (e) { }
    });
    this.choirOscillators = [];
    this.choirGains.forEach(gain => {
      try { gain.disconnect(); } catch (e) { }
    });
    this.choirGains = [];

    if (this.activeCameraWhoosh) {
      try { this.activeCameraWhoosh.noise.stop(); } catch (e) { }
      try { this.activeCameraWhoosh.noise.disconnect(); } catch (e) { }
      try { this.activeCameraWhoosh.gain.disconnect(); } catch (e) { }
      this.activeCameraWhoosh = null;
    }

    const gains = [
      this.masterGain, this.ambienceGain, this.uiGain, this.portalGain,
      this.selectGain, this.hoverGain, this.transitionGain, this.delayNode,
      this.delayFeedback, this.delayFilter
    ];
    gains.forEach(gain => {
      if (gain) {
        try { gain.disconnect(); } catch (e) { }
      }
    });

    if (this.ctx) {
      try {
        this.ctx.close();
      } catch (e) { }
      this.ctx = null;
    }
    this.isInitialized = false;
  }
}

@Component({
  selector: 'app-game-hub-phaser',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './game-hub-phaser.html',
  styleUrls: ['./game-hub-phaser.css']
})
export class GameHubPhaserComponent implements AfterViewInit, OnDestroy {
  private game: PhaserType.Game | null = null;
  audioManager: HubAudioManager;

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    private ngZone: NgZone,
    private router: Router,
    public userDetails: Userdetails
  ) {
    this.audioManager = new HubAudioManager(isPlatformBrowser(this.platformId));
  }

  async ngAfterViewInit(): Promise<void> {
    if (isPlatformBrowser(this.platformId)) {
      const Phaser = await import('phaser');
      const component = this;

      class HubScene extends Phaser.Scene {
        // Layout Layers (Containers)
        private worldContainer!: Phaser.GameObjects.Container;
        private backgroundLayer!: Phaser.GameObjects.Container;
        private islandLayer!: Phaser.GameObjects.Container;
        private portalLayer!: Phaser.GameObjects.Container;
        private decorationLayer!: Phaser.GameObjects.Container;
        private characterLayer!: Phaser.GameObjects.Container;
        private uiLayer!: Phaser.GameObjects.Container;

        private stars: Star[] = [];
        private distantStars: { img: Phaser.GameObjects.Image; baseAlpha: number; speed: number; phase: number }[] = [];
        private driftingParticles: { img: Phaser.GameObjects.Image; speedX: number; speedY: number; baseAlpha: number; speed: number; phase: number }[] = [];
        private floatingDust: { img: Phaser.GameObjects.Image; speedX: number; speedY: number; baseAlpha: number; speed: number; phase: number }[] = [];
        private glowingMotes: { img: Phaser.GameObjects.Image; speedX: number; speedY: number; baseAlpha: number; speed: number; phase: number; color: number }[] = [];
        private ambientMagic: { img: Phaser.GameObjects.Image; speedX: number; speedY: number; rotSpeed: number; baseAlpha: number; speed: number; phase: number }[] = [];
        private nexusPulseTimer: number = 0;

        private islandContainers: {
          container: Phaser.GameObjects.Container;
          data: IslandData;
          initialY: number;
          labelTxt: Phaser.GameObjects.Text;
          baseScale: number;
          islandImg: Phaser.GameObjects.Image;
          glowImgs: Phaser.GameObjects.Image[];
          wizardImg: Phaser.GameObjects.Image | null;
          auraParticles: { img: Phaser.GameObjects.Image; baseAlpha: number; speed: number; phase: number; baseScale: number }[];
          nexusOrbitals?: { img: Phaser.GameObjects.Image; speed: number; phase: number }[];
        }[] = [];
        private glowObjs: { img: Phaser.GameObjects.Image; baseAlpha: number; speed: number; phase: number }[] = [];
        private shadowObjs: { img: Phaser.GameObjects.Image; data: IslandData; initialY: number; shadowOffsetY: number }[] = [];
        private runeRingObj: Phaser.GameObjects.Container | null = null;
        private nebulaClouds: { img: Phaser.GameObjects.Image; speed: number; phase: number; baseX: number }[] = [];
        private bgClouds: { img: Phaser.GameObjects.Image; speed: number; phase: number; baseX: number; baseY: number }[] = [];
        private leyLineParticles: {
          key: string;
          illuminationImg: Phaser.GameObjects.Image;
          glowImg: Phaser.GameObjects.Image;
          coreImg: Phaser.GameObjects.Image;
          startX: number;
          startY: number;
          controlX: number;
          controlY: number;
          endX: number;
          endY: number;
          speed: number;
          t: number;
          baseGlowScale: number;
          baseCoreScale: number;
          baseIllumScale: number;
        }[] = [];
        private leyLineGraphics: {
          key: string;
          neutralGraphics: Phaser.GameObjects.Graphics;
          activeGraphics: Phaser.GameObjects.Graphics;
        }[] = [];
        private nexusConvergence: Phaser.GameObjects.Container | null = null;

        private selectedIslandKey: string | null = null;
        private selectedRingImg: Phaser.GameObjects.Container | null = null;
        private nexusWidth: number = 200;
        private infoCard: Phaser.GameObjects.Container | null = null;
        private isTransitioning: boolean = false;
        private returnFromHandled: boolean = false;
        private isReturning: boolean = false;
        private cinematicAmbienceAlphaFactor: number = 1.0;
        private hoveredIslandKey: string | null = null;

        private isProfileMenuOpen: boolean = false;
        private isProfileStarSpinning: boolean = false;
        private profileSystemContainer!: Phaser.GameObjects.Container;
        private profileStarContainer!: Phaser.GameObjects.Container;
        private profilePanelContainer!: Phaser.GameObjects.Container;
        private outerGlow!: Phaser.GameObjects.Image;
        private starCore!: Phaser.GameObjects.Image;
        private profileSparkles: Phaser.GameObjects.Image[] = [];
        private systemTargetScreenX: number = 60;
        private audioToggleGraphics!: Phaser.GameObjects.Graphics;
        private audioToggleText!: Phaser.GameObjects.Text;
        private audioToggleZone!: Phaser.GameObjects.Zone;

        private idleStarScaleTween: Phaser.Tweens.Tween | null = null;
        private idleStarRotateTween: Phaser.Tweens.Tween | null = null;
        private idleGlowAlphaTween: Phaser.Tweens.Tween | null = null;

        private updateAuthStatus!: () => void;
        private drawAudioToggle!: (enabled: boolean) => void;
        private thumbContainer!: Phaser.GameObjects.Container;
        private sliderMinX = 42;
        private sliderMaxX = 288;
        private sliderWidth = 246;

        constructor() {
          super({ key: 'HubScene' });
        }

        init() {
          this.stars = [];
          for (let i = 0; i < 100; i++) {
            this.stars.push({
              xPct: Math.random(),
              yPct: Math.random(),
              size: 0.3 + Math.random() * 0.7,
              alpha: 0.15 + Math.random() * 0.65,
              speed: 0.5 + Math.random() * 1.5,
              phase: Math.random() * Math.PI * 2
            });
          }
        }

        preload() {
          this.load.setPath('assets/game-hub/');
          this.load.on('loaderror', (fileObj: any) => {
            console.warn(`[Preloader Warning] Failed to load asset: ${fileObj.key} from ${fileObj.url}`);
          });

          this.load.image('island-nexus', 'islands/island-nexus.png');
          this.load.image('island-wavelength', 'islands/island-wavelength.png');
          this.load.image('island-reaction', 'islands/island-reaction.png');
          this.load.image('island-image-puzzle', 'islands/island-image-puzzle.png');
          this.load.image('island-oops', 'islands/island-oops.png');
          this.load.image('island-higher-lower', 'islands/island-higher-lower.png');
          this.load.image('island-flappy', 'islands/island-flappy.png');
          this.load.image('wizard-idle', 'characters/wizard-idle.png');
          this.load.image('celestial-star', 'ui/celestial-star.png');
        }

        create() {
          if (!this.textures.exists('star')) {
            const starCanvas = this.textures.createCanvas('star', 8, 8);
            if (starCanvas) {
              const starCtx = starCanvas.context;
              const starGrad = starCtx.createRadialGradient(4, 4, 0, 4, 4, 4);
              starGrad.addColorStop(0, 'rgba(255, 255, 255, 1)');
              starGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
              starCtx.fillStyle = starGrad;
              starCtx.beginPath();
              starCtx.arc(4, 4, 4, 0, Math.PI * 2);
              starCtx.fill();
              starCanvas.refresh();
            }
          }

          if (!this.textures.exists('glow')) {
            const glowCanvas = this.textures.createCanvas('glow', 256, 256);
            if (glowCanvas) {
              const glowCtx = glowCanvas.context;
              const glowGrad = glowCtx.createRadialGradient(128, 128, 0, 128, 128, 128);
              glowGrad.addColorStop(0, 'rgba(255, 255, 255, 1)');
              glowGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0.4)');
              glowGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
              glowCtx.fillStyle = glowGrad;
              glowCtx.beginPath();
              glowCtx.arc(128, 128, 128, 0, Math.PI * 2);
              glowCtx.fill();
              glowCanvas.refresh();
            }
          }

          if (!this.textures.exists('star-core-texture')) {
            const starCoreCanvas = this.textures.createCanvas('star-core-texture', 64, 64);
            if (starCoreCanvas) {
              const starCtx = starCoreCanvas.context;
              starCtx.fillStyle = '#ffffff';
              const cx = 32;
              const cy = 32;
              const spikes = 5;
              const outerRadius = 24;
              const innerRadius = 9;
              let rot = Math.PI / 2 * 3;
              let x = cx;
              let y = cy;
              const step = Math.PI / spikes;

              starCtx.beginPath();
              starCtx.moveTo(cx, cy - outerRadius);
              for (let i = 0; i < spikes; i++) {
                x = cx + Math.cos(rot) * outerRadius;
                y = cy + Math.sin(rot) * outerRadius;
                starCtx.lineTo(x, y);
                rot += step;

                x = cx + Math.cos(rot) * innerRadius;
                y = cy + Math.sin(rot) * innerRadius;
                starCtx.lineTo(x, y);
                rot += step;
              }
              starCtx.lineTo(cx, cy - outerRadius);
              starCtx.closePath();
              starCtx.fill();
              starCoreCanvas.refresh();
            }
          }

          if (!this.textures.exists('shadow')) {
            const shadowCanvas = this.textures.createCanvas('shadow', 256, 64);
            if (shadowCanvas) {
              const shadowCtx = shadowCanvas.context;
              shadowCtx.save();
              shadowCtx.scale(1, 0.25);
              const shadowGrad = shadowCtx.createRadialGradient(128, 128, 0, 128, 128, 128);
              shadowGrad.addColorStop(0, 'rgba(0, 0, 0, 1)');
              shadowGrad.addColorStop(0.4, 'rgba(0, 0, 0, 0.7)');
              shadowGrad.addColorStop(0.8, 'rgba(0, 0, 0, 0.2)');
              shadowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
              shadowCtx.fillStyle = shadowGrad;
              shadowCtx.beginPath();
              shadowCtx.arc(128, 128, 128, 0, Math.PI * 2);
              shadowCtx.fill();
              shadowCtx.restore();
              shadowCanvas.refresh();
            }
          }

          if (!this.textures.exists('nebula-purple')) {
            const npCanvas = this.textures.createCanvas('nebula-purple', 256, 256);
            if (npCanvas) {
              const npCtx = npCanvas.context;
              const npGrad = npCtx.createRadialGradient(128, 128, 0, 128, 128, 128);
              npGrad.addColorStop(0, 'rgba(103, 80, 164, 1)');
              npGrad.addColorStop(1, 'rgba(103, 80, 164, 0)');
              npCtx.fillStyle = npGrad;
              npCtx.beginPath();
              npCtx.arc(128, 128, 128, 0, Math.PI * 2);
              npCtx.fill();
              npCanvas.refresh();
            }
          }

          if (!this.textures.exists('nebula-cyan')) {
            const ncCanvas = this.textures.createCanvas('nebula-cyan', 256, 256);
            if (ncCanvas) {
              const ncCtx = ncCanvas.context;
              const ncGrad = ncCtx.createRadialGradient(128, 128, 0, 128, 128, 128);
              ncGrad.addColorStop(0, 'rgba(0, 229, 255, 1)');
              ncGrad.addColorStop(1, 'rgba(0, 229, 255, 0)');
              ncCtx.fillStyle = ncGrad;
              ncCtx.beginPath();
              ncCtx.arc(128, 128, 128, 0, Math.PI * 2);
              ncCtx.fill();
              ncCanvas.refresh();
            }
          }

          if (!this.textures.exists('nebula-blue')) {
            const nbCanvas = this.textures.createCanvas('nebula-blue', 256, 256);
            if (nbCanvas) {
              const nbCtx = nbCanvas.context;
              const nbGrad = nbCtx.createRadialGradient(128, 128, 0, 128, 128, 128);
              nbGrad.addColorStop(0, 'rgba(0, 172, 193, 1)');
              nbGrad.addColorStop(1, 'rgba(0, 172, 193, 0)');
              nbCtx.fillStyle = nbGrad;
              nbCtx.beginPath();
              nbCtx.arc(128, 128, 128, 0, Math.PI * 2);
              nbCtx.fill();
              nbCanvas.refresh();
            }
          }

          if (!this.textures.exists('cloud')) {
            const cloudCanvas = this.textures.createCanvas('cloud', 256, 128);
            if (cloudCanvas) {
              const cloudCtx = cloudCanvas.context;
              cloudCtx.fillStyle = 'rgba(0, 0, 0, 0)';
              cloudCtx.fillRect(0, 0, 256, 128);

              const gradC1 = cloudCtx.createRadialGradient(128, 80, 0, 128, 80, 80);
              gradC1.addColorStop(0, 'rgba(224, 247, 250, 0.25)');
              gradC1.addColorStop(1, 'rgba(224, 247, 250, 0)');
              cloudCtx.fillStyle = gradC1;
              cloudCtx.beginPath();
              cloudCtx.arc(128, 80, 80, 0, Math.PI * 2);
              cloudCtx.fill();

              const gradC2 = cloudCtx.createRadialGradient(80, 70, 0, 80, 70, 60);
              gradC2.addColorStop(0, 'rgba(224, 247, 250, 0.20)');
              gradC2.addColorStop(1, 'rgba(224, 247, 250, 0)');
              cloudCtx.fillStyle = gradC2;
              cloudCtx.beginPath();
              cloudCtx.arc(80, 70, 60, 0, Math.PI * 2);
              cloudCtx.fill();

              const gradC3 = cloudCtx.createRadialGradient(176, 70, 0, 176, 70, 60);
              gradC3.addColorStop(0, 'rgba(224, 247, 250, 0.20)');
              gradC3.addColorStop(1, 'rgba(224, 247, 250, 0)');
              cloudCtx.fillStyle = gradC3;
              cloudCtx.beginPath();
              cloudCtx.arc(176, 70, 60, 0, Math.PI * 2);
              cloudCtx.fill();

              cloudCanvas.refresh();
            }
          }

          if (!this.textures.exists('vignette')) {
            const vigCanvas = this.textures.createCanvas('vignette', 512, 512);
            if (vigCanvas) {
              const vigCtx = vigCanvas.context;
              const vigGrad = vigCtx.createRadialGradient(256, 256, 160, 256, 256, 256);
              vigGrad.addColorStop(0, 'rgba(5, 3, 13, 0)');
              vigGrad.addColorStop(0.7, 'rgba(5, 3, 13, 0.25)');
              vigGrad.addColorStop(1, 'rgba(5, 3, 13, 0.70)');
              vigCtx.fillStyle = vigGrad;
              vigCtx.fillRect(0, 0, 512, 512);
              vigCanvas.refresh();
            }
          }

          if (!this.textures.exists('moon')) {
            const moonCanvas = this.textures.createCanvas('moon', 512, 512);
            if (moonCanvas) {
              const moonCtx = moonCanvas.context;
              moonCtx.fillStyle = 'rgba(0,0,0,0)';
              moonCtx.fillRect(0, 0, 512, 512);

              const moonGrad = moonCtx.createRadialGradient(200, 200, 20, 256, 256, 240);
              moonGrad.addColorStop(0, '#e0f7fa');
              moonGrad.addColorStop(0.5, '#b2ebf2');
              moonGrad.addColorStop(1, '#006064');

              moonCtx.fillStyle = moonGrad;
              moonCtx.beginPath();
              moonCtx.arc(256, 256, 240, 0, Math.PI * 2);
              moonCtx.fill();

              moonCtx.fillStyle = 'rgba(0, 96, 100, 0.15)';
              const craters = [
                { x: 160, y: 240, r: 48 },
                { x: 320, y: 180, r: 36 },
                { x: 260, y: 320, r: 30 },
                { x: 180, y: 140, r: 24 },
                { x: 360, y: 300, r: 28 }
              ];
              craters.forEach(c => {
                moonCtx.beginPath();
                moonCtx.arc(c.x, c.y, c.r, 0, Math.PI * 2);
                moonCtx.fill();
              });
              moonCanvas.refresh();
            }
          }

          if (!this.textures.exists('rune-ring')) {
            const ringCanvas = this.textures.createCanvas('rune-ring', 256, 256);
            if (ringCanvas) {
              const ringCtx = ringCanvas.context;
              ringCtx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
              ringCtx.lineWidth = 2;
              ringCtx.beginPath();
              ringCtx.arc(128, 128, 105, 0, Math.PI * 2);
              ringCtx.stroke();

              ringCtx.setLineDash([5, 10]);
              ringCtx.beginPath();
              ringCtx.arc(128, 128, 90, 0, Math.PI * 2);
              ringCtx.stroke();
              ringCtx.setLineDash([]);

              ringCtx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
              ringCtx.lineWidth = 1.5;
              for (let i = 0; i < 8; i++) {
                const angle = i * Math.PI / 4;
                const rx = 128 + Math.cos(angle) * 105;
                const ry = 128 + Math.sin(angle) * 105;

                ringCtx.save();
                ringCtx.translate(rx, ry);
                // Draw a beautiful mystical diamond rune shape instead of directional arrows
                ringCtx.beginPath();
                ringCtx.moveTo(0, -4);
                ringCtx.lineTo(4, 0);
                ringCtx.lineTo(0, 4);
                ringCtx.lineTo(-4, 0);
                ringCtx.closePath();
                ringCtx.stroke();
                ringCtx.restore();
              }
              ringCanvas.refresh();
            }
          }

          if (!this.textures.exists('star-core-texture')) {
            const starCanvas = this.textures.createCanvas('star-core-texture', 64, 64);
            if (starCanvas) {
              const ctx = starCanvas.context;
              const cx = 32;
              const cy = 32;
              const spikes = 5;
              const outerRadius = 24;
              const innerRadius = 9;
              let rot = Math.PI / 2 * 3;
              let x = cx;
              let y = cy;
              const step = Math.PI / spikes;

              ctx.beginPath();
              ctx.moveTo(cx, cy - outerRadius);
              for (let i = 0; i < spikes; i++) {
                x = cx + Math.cos(rot) * outerRadius;
                y = cy + Math.sin(rot) * outerRadius;
                ctx.lineTo(x, y);
                rot += step;

                x = cx + Math.cos(rot) * innerRadius;
                y = cy + Math.sin(rot) * innerRadius;
                ctx.lineTo(x, y);
                rot += step;
              }
              ctx.lineTo(cx, cy - outerRadius);
              ctx.closePath();
              ctx.fillStyle = '#ffffff';
              ctx.fill();
              starCanvas.refresh();
            }
          }

          this.worldContainer = this.add.container();
          this.backgroundLayer = this.add.container();
          this.decorationLayer = this.add.container();
          this.islandLayer = this.add.container();
          this.portalLayer = this.add.container();
          this.characterLayer = this.add.container();

          this.worldContainer.add([
            this.backgroundLayer,
            this.decorationLayer,
            this.islandLayer,
            this.portalLayer,
            this.characterLayer
          ]);

          this.uiLayer = this.add.container();
          this.drawAll();
          this.scale.on('resize', this.handleResize, this);
        }

        private getIslandWidth(isCenter: boolean): number {
          // Rebalance the scale hierarchy:
          // Increase Nexus (center) scale by 40% to establish it as the prominent central platform.
          // Reduce all game islands by 20% (0.77 * 0.8 = 0.616) to make them smaller surrounding realms.
          return isCenter ? this.nexusWidth * 0.8 : this.nexusWidth * 0.516;
        }

        private drawAll() {
          const width = this.scale.width;
          const height = this.scale.height;

          this.backgroundLayer.removeAll(true);
          this.decorationLayer.removeAll(true);
          this.islandLayer.removeAll(true);
          this.portalLayer.removeAll(true);
          this.characterLayer.removeAll(true);
          this.stopIdleStarBreathing();
          if (this.profileSystemContainer) {
            this.profileSystemContainer.destroy();
            this.profileSystemContainer = null as any;
          }
          this.uiLayer.removeAll(true);

          this.islandContainers = [];
          this.glowObjs = [];
          this.shadowObjs = [];
          this.leyLineParticles = [];
          this.nebulaClouds = [];
          this.bgClouds = [];
          this.runeRingObj = null;

          // Solid background matching page color (Phase 1)
          const bgG = this.add.graphics();
          bgG.fillStyle(0x04030a, 1);
          bgG.fillRect(0, 0, width, height);
          this.backgroundLayer.add(bgG);

          // Deep Space Celestial Moon (Parallax 2% - Phase 3)
          const moonImg = this.add.image(width * 0.90, height * 0.10, 'moon');
          moonImg.setDisplaySize(900, 900);
          moonImg.setAlpha(0.14);
          moonImg.setScrollFactor(0.02);
          this.backgroundLayer.add(moonImg);

          // Nebula Clouds (Parallax 5% - Phase 3)
          const purpleCloud = this.add.image(width * 0.35, height * 0.35, 'nebula-purple');
          purpleCloud.setDisplaySize(width * 0.8, width * 0.8);
          purpleCloud.setAlpha(0.08);
          purpleCloud.setScrollFactor(0.05);
          this.backgroundLayer.add(purpleCloud);
          this.nebulaClouds = [{
            img: purpleCloud,
            speed: 0.015,
            phase: 0.0,
            baseX: width * 0.35
          }];

          const cyanCloud = this.add.image(width * 0.65, height * 0.60, 'nebula-cyan');
          cyanCloud.setDisplaySize(width * 0.7, width * 0.7);
          cyanCloud.setAlpha(0.06);
          cyanCloud.setScrollFactor(0.05);
          this.backgroundLayer.add(cyanCloud);
          this.nebulaClouds.push({
            img: cyanCloud,
            speed: 0.010,
            phase: 1.5,
            baseX: width * 0.65
          });

          const blueCloud = this.add.image(width * 0.50, height * 0.20, 'nebula-blue');
          blueCloud.setDisplaySize(width * 0.75, width * 0.75);
          blueCloud.setAlpha(0.06);
          blueCloud.setScrollFactor(0.05);
          this.backgroundLayer.add(blueCloud);
          this.nebulaClouds.push({
            img: blueCloud,
            speed: 0.012,
            phase: 3.0,
            baseX: width * 0.50
          });

          // --------------------------------------------------
          // LAYER 1: Very distant stars (10% scroll factor - Phase 2 & 3)
          // --------------------------------------------------
          this.distantStars = [];
          for (let i = 0; i < 120; i++) {
            const x = Math.random() * width;
            const y = Math.random() * height;
            const starImg = this.add.image(x, y, 'star');
            const size = 0.1 + Math.random() * 0.2;
            const alpha = 0.08 + Math.random() * 0.25;
            starImg.setScale(size);
            starImg.setAlpha(alpha);
            starImg.setScrollFactor(0.1);
            this.backgroundLayer.add(starImg);
            this.distantStars.push({
              img: starImg,
              baseAlpha: alpha,
              speed: 0.4 + Math.random() * 0.6,
              phase: Math.random() * Math.PI * 2
            });
          }

          // --------------------------------------------------
          // LAYER 2: Small drifting particles (30% scroll factor - Phase 2 & 3)
          // --------------------------------------------------
          this.driftingParticles = [];
          for (let i = 0; i < 45; i++) {
            const x = Math.random() * width;
            const y = Math.random() * height;
            const pImg = this.add.image(x, y, 'star');
            const size = 0.25 + Math.random() * 0.25;
            const alpha = 0.12 + Math.random() * 0.25;
            pImg.setScale(size);
            pImg.setAlpha(alpha);
            pImg.setScrollFactor(0.3);
            this.backgroundLayer.add(pImg);
            this.driftingParticles.push({
              img: pImg,
              speedX: -3 - Math.random() * 6,
              speedY: -5 - Math.random() * 10,
              baseAlpha: alpha,
              speed: 0.6 + Math.random() * 0.8,
              phase: Math.random() * Math.PI * 2
            });
          }

          // --------------------------------------------------
          // LAYER 3: Slow floating dust (50% scroll factor - Phase 2 & 3)
          // --------------------------------------------------
          this.floatingDust = [];
          for (let i = 0; i < 25; i++) {
            const x = Math.random() * width;
            const y = Math.random() * height;
            const dImg = this.add.image(x, y, 'glow');
            const size = 0.04 + Math.random() * 0.06;
            const alpha = 0.02 + Math.random() * 0.03;
            dImg.setScale(size);
            dImg.setAlpha(alpha);
            dImg.setScrollFactor(0.5);
            this.backgroundLayer.add(dImg);
            this.floatingDust.push({
              img: dImg,
              speedX: -1 - Math.random() * 3,
              speedY: -2 - Math.random() * 5,
              baseAlpha: alpha,
              speed: 0.3 + Math.random() * 0.5,
              phase: Math.random() * Math.PI * 2
            });
          }

          // --------------------------------------------------
          // LAYER 4: Occasional glowing motes (50% scroll factor - Phase 2 & 3)
          // --------------------------------------------------
          this.glowingMotes = [];
          const moteColors = [0x7e57c2, 0x00e5ff, 0xffa000, 0x2e7d32, 0xd32f2f];
          for (let i = 0; i < 12; i++) {
            const x = Math.random() * width;
            const y = Math.random() * height;
            const mImg = this.add.image(x, y, 'glow');
            const size = 0.12 + Math.random() * 0.15;
            const alpha = 0.03 + Math.random() * 0.06;
            mImg.setScale(size);
            mImg.setAlpha(alpha);
            mImg.setTint(moteColors[Math.floor(Math.random() * moteColors.length)]);
            mImg.setScrollFactor(0.5);
            mImg.setBlendMode(Phaser.BlendModes.ADD);
            this.backgroundLayer.add(mImg);
            this.glowingMotes.push({
              img: mImg,
              speedX: -2 - Math.random() * 4,
              speedY: -3 - Math.random() * 7,
              baseAlpha: alpha,
              speed: 0.5 + Math.random() * 0.7,
              phase: Math.random() * Math.PI * 2,
              color: moteColors[Math.floor(Math.random() * moteColors.length)]
            });
          }

          // --------------------------------------------------
          // AMBIENT MAGIC: Rare foreground elements (80% scroll factor - Phase 4)
          // --------------------------------------------------
          this.ambientMagic = [];
          for (let i = 0; i < 6; i++) {
            const x = Math.random() * width;
            const y = Math.random() * height;
            const amImg = this.add.image(x, y, 'star');
            const size = 0.35 + Math.random() * 0.35;
            const alpha = 0.05 + Math.random() * 0.15;
            amImg.setScale(size);
            amImg.setAlpha(alpha);
            amImg.setScrollFactor(0.8);
            amImg.setTint(moteColors[Math.floor(Math.random() * moteColors.length)]);
            amImg.setBlendMode(Phaser.BlendModes.ADD);
            this.decorationLayer.add(amImg);
            this.ambientMagic.push({
              img: amImg,
              speedX: -4 - Math.random() * 8,
              speedY: -8 - Math.random() * 12,
              rotSpeed: 0.02 + Math.random() * 0.04,
              baseAlpha: alpha,
              speed: 0.8 + Math.random() * 1.2,
              phase: Math.random() * Math.PI * 2
            });
          }

          // Parallax Midground Clouds (15% scroll factor - Phase 3)
          const cloud1 = this.add.image(width * 0.20, height * 0.50, 'cloud');
          cloud1.setDisplaySize(width * 0.40, width * 0.20);
          cloud1.setAlpha(0.08);
          cloud1.setScrollFactor(0.15);
          this.decorationLayer.add(cloud1);
          this.bgClouds.push({
            img: cloud1,
            speed: 0.012,
            phase: 0.0,
            baseX: width * 0.20,
            baseY: height * 0.50
          });

          const cloud2 = this.add.image(width * 0.80, height * 0.50, 'cloud');
          cloud2.setDisplaySize(width * 0.35, width * 0.175);
          cloud2.setAlpha(0.07);
          cloud2.setScrollFactor(0.15);
          this.decorationLayer.add(cloud2);
          this.bgClouds.push({
            img: cloud2,
            speed: 0.008,
            phase: 2.0,
            baseX: width * 0.80,
            baseY: height * 0.50
          });

          const cloud3 = this.add.image(width * 0.50, height * 0.12, 'cloud');
          cloud3.setDisplaySize(width * 0.30, width * 0.15);
          cloud3.setAlpha(0.06);
          cloud3.setScrollFactor(0.15);
          this.decorationLayer.add(cloud3);
          this.bgClouds.push({
            img: cloud3,
            speed: 0.010,
            phase: 4.0,
            baseX: width * 0.50,
            baseY: height * 0.12
          });

          const nexusData = ISLANDS.find(i => i.isCenter)!;
          const nexusX = width * nexusData.xPct;
          const nexusY = height * nexusData.yPct;

          this.leyLineGraphics = [];

          // Create the Nexus Convergence at (nexusX, nexusY)
          this.nexusConvergence = this.add.container(nexusX, nexusY);
          this.decorationLayer.add(this.nexusConvergence);

          const convGlow = this.add.image(0, 0, 'glow');
          convGlow.setScale(1.8);
          convGlow.setTint(0x00e5ff);
          convGlow.setAlpha(0.25);
          convGlow.setBlendMode(Phaser.BlendModes.ADD);
          this.nexusConvergence.add(convGlow);

          const convCore = this.add.image(0, 0, 'star');
          convCore.setScale(0.5);
          convCore.setTint(0xffffff);
          convCore.setAlpha(0.4);
          convCore.setBlendMode(Phaser.BlendModes.ADD);
          this.nexusConvergence.add(convCore);

          this.tweens.add({
            targets: [convGlow, convCore],
            alpha: '+=0.12',
            scale: '*=1.10',
            duration: 3500,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
          });

          ISLANDS.forEach(data => {
            if (data.isCenter) return;

            const startX = width * data.xPct;
            const startY = height * data.yPct;

            const controlX = (startX + nexusX) / 2 + (nexusY - startY) * 0.15;
            const controlY = (startY + nexusY) / 2 - (nexusX - startX) * 0.15;

            // 1. Permanent Neutral Graphics (subtly tinted theme colors)
            const neutralG = this.add.graphics();
            this.decorationLayer.add(neutralG);

            // Define muted colors (saturation 25–35%, brightness 55–65%)
            const mutedColors: Record<string, number> = {
              flappy: 0xaa9577,      // Muted Warm Gold
              wavelength: 0x8a779e,  // Muted Violet
              reaction: 0xaa887c,    // Muted Orange
              puzzle: 0x7fa2ad,      // Muted Cyan
              howfaroff: 0x95a3a8,   // Muted Silver-White
              oops: 0xaa7777         // Muted Crimson
            };
            const mutedColor = mutedColors[data.key] || 0x8ea8c3;
            const steps = 24;

            if (data.key === 'reaction') {
              // Special Muted Reaction Time: muted orange with muted green influence
              // Muted green outer soft glow (width 5, alpha 0.06)
              neutralG.lineStyle(5, 0x557a5c, 0.06);
              neutralG.beginPath();
              neutralG.moveTo(startX, startY);
              for (let i = 1; i <= steps; i++) {
                const t = i / steps;
                const mt = 1 - t;
                const px = mt * mt * startX + 2 * mt * t * controlX + t * t * nexusX;
                const py = mt * mt * startY + 2 * mt * t * controlY + t * t * nexusY;
                neutralG.lineTo(px, py);
              }
              neutralG.strokePath();

              // Muted orange mid glow (width 3, alpha 0.15)
              neutralG.lineStyle(3, 0xaa887c, 0.15);
              neutralG.beginPath();
              neutralG.moveTo(startX, startY);
              for (let i = 1; i <= steps; i++) {
                const t = i / steps;
                const mt = 1 - t;
                const px = mt * mt * startX + 2 * mt * t * controlX + t * t * nexusX;
                const py = mt * mt * startY + 2 * mt * t * controlY + t * t * nexusY;
                neutralG.lineTo(px, py);
              }
              neutralG.strokePath();

              // Muted orange core (width 1.5, alpha 0.35)
              neutralG.lineStyle(1.5, 0xbaa096, 0.35);
              neutralG.beginPath();
              neutralG.moveTo(startX, startY);
              for (let i = 1; i <= steps; i++) {
                const t = i / steps;
                const mt = 1 - t;
                const px = mt * mt * startX + 2 * mt * t * controlX + t * t * nexusX;
                const py = mt * mt * startY + 2 * mt * t * controlY + t * t * nexusY;
                neutralG.lineTo(px, py);
              }
              neutralG.strokePath();
            } else {
              // Standard Muted Themed Pathway
              // Outer soft glow (width 5, alpha 0.06)
              neutralG.lineStyle(5, mutedColor, 0.06);
              neutralG.beginPath();
              neutralG.moveTo(startX, startY);
              for (let i = 1; i <= steps; i++) {
                const t = i / steps;
                const mt = 1 - t;
                const px = mt * mt * startX + 2 * mt * t * controlX + t * t * nexusX;
                const py = mt * mt * startY + 2 * mt * t * controlY + t * t * nexusY;
                neutralG.lineTo(px, py);
              }
              neutralG.strokePath();

              // Mid glow (width 3, alpha 0.15)
              neutralG.lineStyle(3, mutedColor, 0.15);
              neutralG.beginPath();
              neutralG.moveTo(startX, startY);
              for (let i = 1; i <= steps; i++) {
                const t = i / steps;
                const mt = 1 - t;
                const px = mt * mt * startX + 2 * mt * t * controlX + t * t * nexusX;
                const py = mt * mt * startY + 2 * mt * t * controlY + t * t * nexusY;
                neutralG.lineTo(px, py);
              }
              neutralG.strokePath();

              // Core line (width 1.5, alpha 0.35)
              neutralG.lineStyle(1.5, 0xffffff, 0.35);
              neutralG.beginPath();
              neutralG.moveTo(startX, startY);
              for (let i = 1; i <= steps; i++) {
                const t = i / steps;
                const mt = 1 - t;
                const px = mt * mt * startX + 2 * mt * t * controlX + t * t * nexusX;
                const py = mt * mt * startY + 2 * mt * t * controlY + t * t * nexusY;
                neutralG.lineTo(px, py);
              }
              neutralG.strokePath();
            }

            neutralG.setAlpha(0.92); // Idle network brightness remains at 0.92

            // 2. Active overlay Graphics (vibrant themed path, 40% bloom reduction)
            const activeG = this.add.graphics();
            this.decorationLayer.add(activeG);

            if (data.key === 'reaction') {
              // Special Reaction Time: orange core/mid with green outer glow
              // Green outer soft glow (width 7.5, alpha 0.15)
              activeG.lineStyle(7.5, 0x2e7d32, 0.15);
              activeG.beginPath();
              activeG.moveTo(startX, startY);
              for (let i = 1; i <= steps; i++) {
                const t = i / steps;
                const mt = 1 - t;
                const px = mt * mt * startX + 2 * mt * t * controlX + t * t * nexusX;
                const py = mt * mt * startY + 2 * mt * t * controlY + t * t * nexusY;
                activeG.lineTo(px, py);
              }
              activeG.strokePath();

              // Orange mid glow (width 4, alpha 0.40)
              activeG.lineStyle(4, 0xff7043, 0.40);
              activeG.beginPath();
              activeG.moveTo(startX, startY);
              for (let i = 1; i <= steps; i++) {
                const t = i / steps;
                const mt = 1 - t;
                const px = mt * mt * startX + 2 * mt * t * controlX + t * t * nexusX;
                const py = mt * mt * startY + 2 * mt * t * controlY + t * t * nexusY;
                activeG.lineTo(px, py);
              }
              activeG.strokePath();

              // Orange-white core (width 1.5, alpha 0.85)
              activeG.lineStyle(1.5, 0xffab91, 0.85);
              activeG.beginPath();
              activeG.moveTo(startX, startY);
              for (let i = 1; i <= steps; i++) {
                const t = i / steps;
                const mt = 1 - t;
                const px = mt * mt * startX + 2 * mt * t * controlX + t * t * nexusX;
                const py = mt * mt * startY + 2 * mt * t * controlY + t * t * nexusY;
                activeG.lineTo(px, py);
              }
              activeG.strokePath();
            } else {
              // Standard Vibrant Themed Pathway
              // Outer soft theme glow (width 7.5, alpha 0.12)
              activeG.lineStyle(7.5, data.themeColor, 0.12);
              activeG.beginPath();
              activeG.moveTo(startX, startY);
              for (let i = 1; i <= steps; i++) {
                const t = i / steps;
                const mt = 1 - t;
                const px = mt * mt * startX + 2 * mt * t * controlX + t * t * nexusX;
                const py = mt * mt * startY + 2 * mt * t * controlY + t * t * nexusY;
                activeG.lineTo(px, py);
              }
              activeG.strokePath();

              // Mid themed glow (width 4, alpha 0.32)
              activeG.lineStyle(4, data.themeColor, 0.32);
              activeG.beginPath();
              activeG.moveTo(startX, startY);
              for (let i = 1; i <= steps; i++) {
                const t = i / steps;
                const mt = 1 - t;
                const px = mt * mt * startX + 2 * mt * t * controlX + t * t * nexusX;
                const py = mt * mt * startY + 2 * mt * t * controlY + t * t * nexusY;
                activeG.lineTo(px, py);
              }
              activeG.strokePath();

              // Core bright line (width 1.5, alpha 0.85)
              const activeCoreColor = (data.key === 'howfaroff') ? 0xffffff : data.themeColor;
              activeG.lineStyle(1.5, activeCoreColor, 0.85);
              activeG.beginPath();
              activeG.moveTo(startX, startY);
              for (let i = 1; i <= steps; i++) {
                const t = i / steps;
                const mt = 1 - t;
                const px = mt * mt * startX + 2 * mt * t * controlX + t * t * nexusX;
                const py = mt * mt * startY + 2 * mt * t * controlY + t * t * nexusY;
                activeG.lineTo(px, py);
              }
              activeG.strokePath();
            }

            activeG.setAlpha(0.0); // Selected overlay starts invisible

            this.leyLineGraphics.push({
              key: data.key,
              neutralGraphics: neutralG,
              activeGraphics: activeG
            });

            // 3. Three-Layer Randomized Energy Pulses (Subtle: Max 3 pulses, 40% size reduction, slower speed)
            const pulseCount = 3;
            for (let p = 0; p < pulseCount; p++) {
              // Randomized size (reduced by an additional 50% to read as tiny sparks)
              const baseIllumScale = (0.8 + Math.random() * 0.3) * 0.3;
              const baseGlowScale = (0.35 + Math.random() * 0.15) * 0.3;
              const baseCoreScale = (0.16 + Math.random() * 0.08) * 0.3;

              // Slower calm travel speed
              const speed = 0.08 + Math.random() * 0.03;

              // Randomized starting position t with wider spacing (3 pulses)
              const tOffset = Math.random() * 0.08 - 0.04;
              const startingT = Phaser.Math.Clamp((p / pulseCount) + tOffset, 0.0, 1.0);

              // Determine pulse color (alternate for Reaction Time)
              let pulseColor = data.themeColor;
              if (data.key === 'reaction') {
                pulseColor = (p % 2 === 0) ? 0xff7043 : 0x2e7d32;
              }

              // 1. Outer localized path illumination (soft, subtle pool of light)
              const illumImg = this.add.image(nexusX, nexusY, 'glow');
              illumImg.setScale(baseIllumScale);
              illumImg.setTint(pulseColor);
              illumImg.setAlpha(0);
              illumImg.setBlendMode(Phaser.BlendModes.ADD);
              this.decorationLayer.add(illumImg);

              // 2. Main energy body
              const glowImg = this.add.image(nexusX, nexusY, 'glow');
              glowImg.setScale(baseGlowScale);
              glowImg.setTint(pulseColor);
              glowImg.setAlpha(0);
              glowImg.setBlendMode(Phaser.BlendModes.ADD);
              this.decorationLayer.add(glowImg);

              // 3. Bright core
              const coreImg = this.add.image(nexusX, nexusY, 'star');
              coreImg.setScale(baseCoreScale);
              coreImg.setTint(0xffffff); // white core
              coreImg.setAlpha(0);
              coreImg.setBlendMode(Phaser.BlendModes.ADD);
              this.decorationLayer.add(coreImg);

              this.leyLineParticles.push({
                key: data.key,
                illuminationImg: illumImg,
                glowImg,
                coreImg,
                startX: nexusX,
                startY: nexusY,
                controlX,
                controlY,
                endX: startX,
                endY: startY,
                speed,
                t: startingT,
                baseGlowScale,
                baseCoreScale,
                baseIllumScale
              });
            }
          });

          this.nexusWidth = Math.min(width * 0.24, height * 0.20, 300);

          ISLANDS.forEach(data => {
            const x = width * data.xPct;
            const y = height * data.yPct;

            const currentWidth = this.getIslandWidth(data.isCenter);

            const shadowWidth = currentWidth * 1.15;
            const shadowHeight = currentWidth * 0.22;
            const shadowOffsetY = currentWidth * 0.38;

            const shadowImg = this.add.image(x, y + shadowOffsetY, 'shadow');
            shadowImg.setDisplaySize(shadowWidth, shadowHeight);
            shadowImg.setAlpha(0.20);
            this.islandLayer.add(shadowImg);

            this.shadowObjs.push({
              img: shadowImg,
              data,
              initialY: y,
              shadowOffsetY
            });
          });

          ISLANDS.forEach(data => {
            const x = width * data.xPct;
            const y = height * data.yPct;

            const currentWidth = this.getIslandWidth(data.isCenter);
            const scale = currentWidth / 512;

            const container = this.add.container(x, y);
            container.setScale(scale);
            container.setData('baseScale', scale);

            let auraImg: Phaser.GameObjects.Image | null = null;

            if (data.isCenter) {
              auraImg = this.add.image(0, 0, 'glow');
              auraImg.setScale(5.0);
              auraImg.setTint(0x00e5ff);
              auraImg.setAlpha(0.22);
              container.add(auraImg);

              // Sub-container for Nexus flat squashed perspective ring
              const ringSubContainer = this.add.container(0, 25.6);
              ringSubContainer.setScale(3.2, 1.2);
              container.add(ringSubContainer);

              // Outer glowing ring
              const ringGlow = this.add.image(0, 0, 'rune-ring');
              ringGlow.setScale(1.04);
              ringGlow.setAlpha(0.12);
              ringGlow.setTint(0x00e5ff);
              ringGlow.setBlendMode(Phaser.BlendModes.ADD);
              ringSubContainer.add(ringGlow);

              // Inner sharp ring
              const ringImgInner = this.add.image(0, 0, 'rune-ring');
              ringImgInner.setAlpha(0.22);
              ringImgInner.setTint(0x00e5ff);
              ringImgInner.setBlendMode(Phaser.BlendModes.ADD);
              ringSubContainer.add(ringImgInner);

              this.runeRingObj = ringSubContainer;
            }

            const islandGlows: Phaser.GameObjects.Image[] = [];

            if (data.key === 'flappy') {
              const outerGlow = this.add.image(0, -61.44, 'glow');
              outerGlow.setBlendMode(Phaser.BlendModes.ADD);
              outerGlow.setTint(0xffa000);
              outerGlow.setScale(1.4);
              outerGlow.setAlpha(0.42);
              container.add(outerGlow);
              islandGlows.push(outerGlow);
              this.glowObjs.push({ img: outerGlow, baseAlpha: 0.42, speed: 1.0 + Math.random() * 0.8, phase: data.floatPhase });

              const innerGlow = this.add.image(0, -61.44, 'glow');
              innerGlow.setBlendMode(Phaser.BlendModes.ADD);
              innerGlow.setTint(0xffd54f);
              innerGlow.setScale(0.85);
              innerGlow.setAlpha(0.38);
              container.add(innerGlow);
              islandGlows.push(innerGlow);
              this.glowObjs.push({ img: innerGlow, baseAlpha: 0.38, speed: 1.2 + Math.random() * 0.6, phase: data.floatPhase + 0.5 });
            } else if (data.key === 'wavelength') {
              const outerGlow = this.add.image(0, -61.44, 'glow');
              outerGlow.setBlendMode(Phaser.BlendModes.ADD);
              outerGlow.setTint(0x7e57c2);
              outerGlow.setScale(1.4);
              outerGlow.setAlpha(0.42);
              container.add(outerGlow);
              islandGlows.push(outerGlow);
              this.glowObjs.push({ img: outerGlow, baseAlpha: 0.42, speed: 1.0 + Math.random() * 0.8, phase: data.floatPhase });

              const innerGlow = this.add.image(0, -61.44, 'glow');
              innerGlow.setBlendMode(Phaser.BlendModes.ADD);
              innerGlow.setTint(0xb39ddb);
              innerGlow.setScale(0.85);
              innerGlow.setAlpha(0.38);
              container.add(innerGlow);
              islandGlows.push(innerGlow);
              this.glowObjs.push({ img: innerGlow, baseAlpha: 0.38, speed: 1.2 + Math.random() * 0.6, phase: data.floatPhase + 0.5 });
            } else if (data.key === 'reaction') {
              const leftOuter = this.add.image(-20, -61.44, 'glow');
              leftOuter.setBlendMode(Phaser.BlendModes.ADD);
              leftOuter.setTint(0xff7043);
              leftOuter.setScale(1.15);
              leftOuter.setAlpha(0.38);
              container.add(leftOuter);
              islandGlows.push(leftOuter);
              this.glowObjs.push({ img: leftOuter, baseAlpha: 0.38, speed: 1.0 + Math.random() * 0.8, phase: data.floatPhase });

              const leftInner = this.add.image(-20, -61.44, 'glow');
              leftInner.setBlendMode(Phaser.BlendModes.ADD);
              leftInner.setTint(0xffab91);
              leftInner.setScale(0.75);
              leftInner.setAlpha(0.32);
              container.add(leftInner);
              islandGlows.push(leftInner);
              this.glowObjs.push({ img: leftInner, baseAlpha: 0.32, speed: 1.2 + Math.random() * 0.6, phase: data.floatPhase + 0.5 });

              const rightOuter = this.add.image(20, -61.44, 'glow');
              rightOuter.setBlendMode(Phaser.BlendModes.ADD);
              rightOuter.setTint(0x2e7d32);
              rightOuter.setScale(1.15);
              rightOuter.setAlpha(0.38);
              container.add(rightOuter);
              islandGlows.push(rightOuter);
              this.glowObjs.push({ img: rightOuter, baseAlpha: 0.38, speed: 1.0 + Math.random() * 0.8, phase: data.floatPhase + Math.PI });

              const rightInner = this.add.image(20, -61.44, 'glow');
              rightInner.setBlendMode(Phaser.BlendModes.ADD);
              rightInner.setTint(0x81c784);
              rightInner.setScale(0.75);
              rightInner.setAlpha(0.32);
              container.add(rightInner);
              islandGlows.push(rightInner);
              this.glowObjs.push({ img: rightInner, baseAlpha: 0.32, speed: 1.2 + Math.random() * 0.6, phase: data.floatPhase + Math.PI + 0.5 });
            } else if (data.key === 'puzzle') {
              const outerGlow = this.add.image(0, -61.44, 'glow');
              outerGlow.setBlendMode(Phaser.BlendModes.ADD);
              outerGlow.setTint(0x00b0ff);
              outerGlow.setScale(1.4);
              outerGlow.setAlpha(0.42);
              container.add(outerGlow);
              islandGlows.push(outerGlow);
              this.glowObjs.push({ img: outerGlow, baseAlpha: 0.42, speed: 1.0 + Math.random() * 0.8, phase: data.floatPhase });

              const innerGlow = this.add.image(0, -61.44, 'glow');
              innerGlow.setBlendMode(Phaser.BlendModes.ADD);
              innerGlow.setTint(0x80d8ff);
              innerGlow.setScale(0.85);
              innerGlow.setAlpha(0.38);
              container.add(innerGlow);
              islandGlows.push(innerGlow);
              this.glowObjs.push({ img: innerGlow, baseAlpha: 0.38, speed: 1.2 + Math.random() * 0.6, phase: data.floatPhase + 0.5 });
            } else if (data.key === 'oops') {
              const outerGlow = this.add.image(0, -61.44, 'glow');
              outerGlow.setBlendMode(Phaser.BlendModes.ADD);
              outerGlow.setTint(0xd32f2f);
              outerGlow.setScale(1.4);
              outerGlow.setAlpha(0.42);
              container.add(outerGlow);
              islandGlows.push(outerGlow);
              this.glowObjs.push({ img: outerGlow, baseAlpha: 0.42, speed: 1.0 + Math.random() * 0.8, phase: data.floatPhase });

              const innerGlow = this.add.image(0, -61.44, 'glow');
              innerGlow.setBlendMode(Phaser.BlendModes.ADD);
              innerGlow.setTint(0xff8a80);
              innerGlow.setScale(0.85);
              innerGlow.setAlpha(0.38);
              container.add(innerGlow);
              islandGlows.push(innerGlow);
              this.glowObjs.push({ img: innerGlow, baseAlpha: 0.38, speed: 1.2 + Math.random() * 0.6, phase: data.floatPhase + 0.5 });
            } else if (data.key === 'howfaroff') {
              const outerGlow = this.add.image(0, -61.44, 'glow');
              outerGlow.setBlendMode(Phaser.BlendModes.ADD);
              outerGlow.setTint(0xb0bec5);
              outerGlow.setScale(1.3);
              outerGlow.setAlpha(0.35);
              container.add(outerGlow);
              islandGlows.push(outerGlow);
              this.glowObjs.push({ img: outerGlow, baseAlpha: 0.35, speed: 1.0 + Math.random() * 0.8, phase: data.floatPhase });

              const innerGlow = this.add.image(0, -61.44, 'glow');
              innerGlow.setBlendMode(Phaser.BlendModes.ADD);
              innerGlow.setTint(0xeceff1);
              innerGlow.setScale(0.80);
              innerGlow.setAlpha(0.30);
              container.add(innerGlow);
              islandGlows.push(innerGlow);
              this.glowObjs.push({ img: innerGlow, baseAlpha: 0.30, speed: 1.2 + Math.random() * 0.6, phase: data.floatPhase + 0.5 });
            } else {
              // Nexus (Center)
              const outerGlow = this.add.image(0, -61.44, 'glow');
              outerGlow.setBlendMode(Phaser.BlendModes.ADD);
              outerGlow.setTint(0x00e5ff);
              outerGlow.setScale(1.8);
              outerGlow.setAlpha(0.65);
              container.add(outerGlow);
              islandGlows.push(outerGlow);
              this.glowObjs.push({ img: outerGlow, baseAlpha: 0.65, speed: 1.0 + Math.random() * 0.8, phase: data.floatPhase });

              const innerGlow = this.add.image(0, -61.44, 'glow');
              innerGlow.setBlendMode(Phaser.BlendModes.ADD);
              innerGlow.setTint(0xe0f7fa);
              innerGlow.setScale(1.1);
              innerGlow.setAlpha(0.50);
              container.add(innerGlow);
              islandGlows.push(innerGlow);
              this.glowObjs.push({ img: innerGlow, baseAlpha: 0.50, speed: 1.2 + Math.random() * 0.6, phase: data.floatPhase + 0.5 });
            }

            islandGlows.forEach(g => {
              g.setData('baseScale', g.scaleX);
            });

            const islandImg = this.add.image(0, 0, data.spriteKey);
            islandImg.setScale(1.0);
            container.add(islandImg);

            let wizardImg: Phaser.GameObjects.Image | null = null;
            if (data.isCenter) {
              wizardImg = this.add.image(0, -20.48, 'wizard-idle');
              wizardImg.setScale(0.28);
              container.add(wizardImg);
            }

            // Localized aura particles setup (Phase 5)
            const auraParticles: { img: Phaser.GameObjects.Image; baseAlpha: number; speed: number; phase: number; baseScale: number }[] = [];
            if (!data.isCenter) {
              const auraColors: Record<string, number> = {
                flappy: 0xffa000,
                wavelength: 0x7e57c2,
                reaction: 0xff7043,
                puzzle: 0x00b0ff,
                howfaroff: 0xffffff,
                oops: 0xd32f2f
              };

              const auraCount = 5;
              for (let i = 0; i < auraCount; i++) {
                const angle = (i / auraCount) * Math.PI * 2 + Math.random() * 0.5;
                const radius = 25 + Math.random() * 20;
                const lx = Math.cos(angle) * radius;
                const ly = -61.44 + Math.sin(angle) * radius;

                let pColor = auraColors[data.key] || 0xffffff;
                if (data.key === 'reaction') {
                  pColor = i % 2 === 0 ? 0xff7043 : 0x2e7d32;
                }

                const useGlow = data.key === 'puzzle' || data.key === 'flappy' || data.key === 'wavelength';
                const pImg = this.add.image(lx, ly, useGlow ? 'glow' : 'star');

                let pScale = 0.12 + Math.random() * 0.15;
                if (useGlow) {
                  pScale = data.key === 'puzzle' ? 0.30 + Math.random() * 0.20 : 0.18 + Math.random() * 0.12;
                }

                const baseAlpha = data.key === 'puzzle' ? 0.06 + Math.random() * 0.06 : 0.12 + Math.random() * 0.15;

                pImg.setScale(pScale);
                pImg.setAlpha(0);
                pImg.setTint(pColor);
                pImg.setBlendMode(Phaser.BlendModes.ADD);
                container.add(pImg);

                auraParticles.push({
                  img: pImg,
                  baseAlpha,
                  speed: 0.4 + Math.random() * 0.6,
                  phase: Math.random() * Math.PI * 2,
                  baseScale: pScale
                });
              }
            } else {
              // Nexus orbital energy flow (4 particles - Phase 6)
              const nexusOrbitals: { img: Phaser.GameObjects.Image; speed: number; phase: number }[] = [];
              for (let i = 0; i < 4; i++) {
                const pImg = this.add.image(0, 0, 'star');
                pImg.setScale(0.22 + Math.random() * 0.12);
                pImg.setAlpha(0);
                pImg.setTint(0x00e5ff);
                pImg.setBlendMode(Phaser.BlendModes.ADD);
                container.add(pImg);

                nexusOrbitals.push({
                  img: pImg,
                  speed: 0.6 + Math.random() * 0.3,
                  phase: (i / 4) * Math.PI * 2
                });
              }
              (container as any).nexusOrbitals = nexusOrbitals;
            }

            const labelOffsetY = data.isCenter ? currentWidth * 0.28 : currentWidth * 0.32;

            const BRIGHT_COLORS: Record<string, string> = {
              wavelength: '#e1bee7',
              flappy: '#ffe082',
              reaction: '#ffab91',
              nexus: '#ffffff',
              oops: '#ff8a80',
              puzzle: '#80deea',
              howfaroff: '#e0e0e0'
            };

            const textColor = BRIGHT_COLORS[data.key] || '#ffffff';
            const titleStyle = {
              fontFamily: 'Outfit, Arial, sans-serif',
              fontSize: data.isCenter ? '19px' : '14px',
              color: textColor,
              fontStyle: 'bold',
              stroke: '#05030d',
              strokeThickness: data.isCenter ? 4.5 : 3.0,
              shadow: { color: '#000000', blur: data.isCenter ? 8 : 6, stroke: true, fill: true }
            };
            const txt = this.add.text(x, y + labelOffsetY, data.name, titleStyle);
            txt.setOrigin(0.5);
            this.uiLayer.add(txt);

            this.islandLayer.add(container);

            this.islandContainers.push({
              container,
              data,
              initialY: y,
              labelTxt: txt,
              baseScale: scale,
              islandImg,
              glowImgs: islandGlows,
              wizardImg,
              auraParticles,
              nexusOrbitals: (container as any).nexusOrbitals
            });

            container.setInteractive(
              new Phaser.Geom.Ellipse(0, 0, 665.6, 537.6),
              Phaser.Geom.Ellipse.Contains
            );

            container.on('pointerover', () => {
              this.onIslandHover(container, data);
            });

            container.on('pointerout', () => {
              this.onIslandHoverExit(container, data);
            });

            container.on('pointerdown', () => {
              this.onIslandSelect(container, data);
            });
          });

          const vignetteImg = this.add.image(width / 2, height / 2, 'vignette');
          vignetteImg.setDisplaySize(width, height);
          vignetteImg.setAlpha(0.60);
          this.uiLayer.add(vignetteImg);

          if (this.selectedIslandKey) {
            const selectedData = ISLANDS.find(i => i.key === this.selectedIslandKey);
            if (selectedData) {
              this.applySelectionVisuals(selectedData);
            }
          }

          const returnFrom = history.state?.returnFrom;
          const playReturnAnimation = history.state?.playReturnAnimation;

          if (playReturnAnimation && returnFrom && !this.returnFromHandled) {
            this.returnFromHandled = true;
            component.audioManager.playPortalEmergence();
            component.audioManager.fadeMusicIn(2000);

            // Consume the trigger immediately to prevent replaying on refresh, back/forward, or history navigation
            try {
              history.replaceState({ ...history.state, playReturnAnimation: false, returnFrom: null }, '');
            } catch (e) {
              console.warn('[History API] Failed to clear return navigation state:', e);
            }

            const keyMap: Record<string, string> = {
              'flappy-escape': 'flappy',
              'wavelength': 'wavelength',
              'reaction-time': 'reaction',
              'image-puzzle': 'puzzle',
              'higher-or-lower': 'howfaroff',
              'oops': 'oops'
            };
            const mappedKey = keyMap[returnFrom];
            if (mappedKey) {
              const islandData = ISLANDS.find(i => i.key === mappedKey);
              const selectedItem = this.islandContainers.find(
                i => i.data.key === mappedKey
              );
              const nexusItem = this.islandContainers.find(
                i => i.data.key === 'nexus'
              );

              if (islandData && selectedItem && nexusItem) {
                console.log(`[RETURN]\nreturnFrom: ${returnFrom}\n\nStarting at island portal: ${mappedKey}`);

                // 1. Hide information card, disable player interaction
                this.isTransitioning = true;
                this.isReturning = true;
                this.selectedIslandKey = null; // Clean return, no pre-selection

                // 2. Position the camera extremely close to the selected island's portal (at 3.8x zoom)
                const portalSprite = selectedItem.glowImgs[0];
                const portalSpriteX = portalSprite ? portalSprite.x : 0;
                const portalSpriteY = portalSprite ? portalSprite.y : -61.44;

                const portalWorldX = selectedItem.container.x + portalSpriteX * selectedItem.container.scaleX;
                const portalWorldY = selectedItem.container.y + portalSpriteY * selectedItem.container.scaleY;

                const cam = this.cameras.main;
                cam.setZoom(3.8);
                cam.setScroll(portalWorldX - cam.width / 2, portalWorldY - cam.height / 2);

                // 3. Cover screen with a black overlay (starts at 95% opacity) so the glow is faintly visible
                const blackOverlay = this.add.graphics();
                blackOverlay.fillStyle(0x000000, 0.95);
                blackOverlay.fillRect(0, 0, width, height);
                blackOverlay.setScrollFactor(0);
                blackOverlay.setDepth(9999);
                this.uiLayer.add(blackOverlay);

                // Fade to reveal portal over 300ms (Issue 1: Quick and fluid)
                this.tweens.add({
                  targets: blackOverlay,
                  alpha: 0.0,
                  duration: 300,
                  ease: 'Sine.easeOut',
                  onComplete: () => {
                    blackOverlay.destroy();
                  }
                });

                // Kill the default fast 300ms selection tweens
                this.islandContainers.forEach(item => {
                  this.tweens.killTweensOf(item.container);
                  this.tweens.killTweensOf(item.labelTxt);
                  const shadow = this.shadowObjs.find(s => s.data.key === item.data.key);
                  if (shadow) {
                    this.tweens.killTweensOf(shadow.img);
                  }
                });

                // Set initial states for the return cinematic:
                // - Selected island starts fully visible, normal base scale
                const selectedBaseScale = selectedItem.container.getData('baseScale') || 1.0;
                selectedItem.container.setScale(selectedBaseScale);
                selectedItem.container.setAlpha(1.0);
                selectedItem.container.y = selectedItem.initialY;

                // - Selected island label starts invisible
                selectedItem.labelTxt.setScale(1.0);
                selectedItem.labelTxt.setAlpha(0.0);

                const selectedShadow = this.shadowObjs.find(s => s.data.key === mappedKey);
                if (selectedShadow) {
                  selectedShadow.img.setAlpha(0.20);
                }

                // - Nexus starts faintly visible (0.35 alpha) at normal scale
                const nexusBaseScale = nexusItem.container.getData('baseScale') || 1.0;
                nexusItem.container.setScale(nexusBaseScale);
                nexusItem.container.setAlpha(0.35);
                nexusItem.container.y = nexusItem.initialY;

                const nexusShadow = this.shadowObjs.find(s => s.data.key === 'nexus');
                if (nexusShadow) {
                  nexusShadow.img.setAlpha(0.10);
                }

                // - Other surrounding game islands start faintly visible (0.12 alpha) at their normal base scales (no dark tint)
                // - All text labels start invisible (0.0 alpha)
                this.islandContainers.forEach(item => {
                  item.labelTxt.setScale(1.0);
                  item.labelTxt.setAlpha(0.0);

                  if (item.data.key !== mappedKey && item.data.key !== 'nexus') {
                    const itemBaseScale = item.container.getData('baseScale') || 1.0;
                    item.container.setAlpha(0.12);
                    item.container.setScale(itemBaseScale);
                    item.container.y = item.initialY;

                    const shadow = this.shadowObjs.find(s => s.data.key === item.data.key);
                    if (shadow) {
                      shadow.img.setAlpha(0.02);
                    }
                  }
                });

                // Connection ley lines start faintly visible (0.20 alpha)
                this.leyLineGraphics.forEach(lineG => {
                  lineG.neutralGraphics.setAlpha(0.20);
                  lineG.activeGraphics.setAlpha(0.0);
                });

                // Background fog starts dense (0.45 alpha)
                this.nebulaClouds.forEach(cloud => {
                  cloud.img.setAlpha(0.45);
                });

                // Ambience alpha factor starts at 0.20
                this.cinematicAmbienceAlphaFactor = 0.20;

                // 4. A small burst of soft theme-coloured magical particles emerges from the portal (delayed by 650ms, immediately after pulse completes)
                const themeColors: Record<string, number[]> = {
                  flappy: [0xffa000, 0xffd54f, 0xffeb3b],
                  wavelength: [0x7e57c2, 0xb39ddb, 0xe040fb],
                  reaction: [0xff7043, 0x2e7d32, 0x81c784],
                  puzzle: [0x00b0ff, 0x80d8ff, 0x00e5ff],
                  howfaroff: [0xb0bec5, 0xeceff1, 0xffffff],
                  oops: [0xd32f2f, 0xff8a80, 0xff1744]
                };
                const colors = themeColors[mappedKey] || [0xffffff];

                this.time.delayedCall(650, () => {
                  for (let i = 0; i < 25; i++) {
                    const angle = Math.random() * Math.PI * 2;
                    const destDist = 60 + Math.random() * 90;
                    const dx = portalWorldX + Math.cos(angle) * destDist;
                    const dy = portalWorldY + Math.sin(angle) * destDist;

                    const pImg = this.add.image(portalWorldX, portalWorldY, 'star');
                    pImg.setScale(0.12 + Math.random() * 0.08);
                    pImg.setTint(colors[Math.floor(Math.random() * colors.length)]);
                    pImg.setAlpha(0.90);
                    pImg.setBlendMode(Phaser.BlendModes.ADD);
                    this.decorationLayer.add(pImg);

                    this.tweens.add({
                      targets: pImg,
                      x: dx,
                      y: dy,
                      scaleX: 0.4 + Math.random() * 0.3,
                      scaleY: 0.4 + Math.random() * 0.3,
                      alpha: { from: 0.90, to: 0 },
                      duration: 800 + Math.random() * 500,
                      ease: 'Quad.easeOut',
                      onComplete: () => {
                        pImg.destroy();
                      }
                    });
                  }
                });

                // 5. The portal emits one gentle pulse (delayed by 350ms: 300ms overlay fade-out + 50ms pre-pulse pause)
                if (portalSprite) {
                  const originalScaleX = portalSprite.scaleX;
                  const originalScaleY = portalSprite.scaleY;
                  this.tweens.add({
                    targets: portalSprite,
                    scaleX: originalScaleX * 1.30,
                    scaleY: originalScaleY * 1.30,
                    alpha: 1.0,
                    duration: 150,
                    delay: 350,
                    yoyo: true,
                    ease: 'Quad.easeInOut'
                  });
                }

                // 6. Begin slowly pulling the camera backward to the Nexus overview
                // (delayed by 800ms: 300ms overlay fade-out + 50ms pause + 300ms portal pulse + 150ms post-pulse pause)
                const nexusData = ISLANDS.find(i => i.isCenter)!;
                const defaultOverviewX = width * nexusData.xPct;
                const defaultOverviewY = height * nexusData.yPct;

                const camState = { t: 0 };
                this.tweens.add({
                  targets: camState,
                  t: 1,
                  duration: 3400, // Restored to 3400ms for graceful, cinematic flight
                  delay: 800,
                  ease: 'Cubic.easeInOut',
                  onStart: () => {
                    component.audioManager.fadeToPeacefulAmbient();
                    component.audioManager.playCameraWhoosh();
                  },
                  onUpdate: () => {
                    const currentPortalSprite = selectedItem.glowImgs[0];
                    const currentPortalSpriteX = currentPortalSprite ? currentPortalSprite.x : 0;
                    const currentPortalSpriteY = currentPortalSprite ? currentPortalSprite.y : -61.44;

                    const currentPortalWorldX = selectedItem.container.x + currentPortalSpriteX * selectedItem.container.scaleX;
                    const currentPortalWorldY = selectedItem.container.y + currentPortalSpriteY * selectedItem.container.scaleY;

                    const endScrollX = defaultOverviewX - cam.width / 2;
                    const endScrollY = defaultOverviewY - cam.height / 2;
                    const startScrollX = currentPortalWorldX - cam.width / 2;
                    const startScrollY = currentPortalWorldY - cam.height / 2;

                    // Calculate Quadratic Bezier curved arc for flying through the world
                    const midX = (startScrollX + endScrollX) / 2;
                    const midY = (startScrollY + endScrollY) / 2;
                    const offsetVal = 0.15; // mirror ley line perpendicular curve offset
                    const controlX = midX + (endScrollY - startScrollY) * offsetVal;
                    const controlY = midY - (endScrollX - startScrollX) * offsetVal;

                    const mt = 1 - camState.t;
                    const currentScrollX = mt * mt * startScrollX + 2 * mt * camState.t * controlX + camState.t * camState.t * endScrollX;
                    const currentScrollY = mt * mt * startScrollY + 2 * mt * camState.t * controlY + camState.t * camState.t * endScrollY;
                    const currentZoom = Phaser.Math.Interpolation.Linear([3.8, 1.0], camState.t);

                    // Add a very subtle floating drift that fades out towards the end of traversal (1 - t)
                    const elapsedSeconds = this.time.now / 1000;
                    const driftX = Math.sin(elapsedSeconds * 3.0) * 4.0 * mt;
                    const driftY = Math.cos(elapsedSeconds * 2.5) * 3.0 * mt;

                    cam.setScroll(currentScrollX + driftX, currentScrollY + driftY);
                    cam.setZoom(currentZoom);

                    // 10. Progressive Layered World Reveal:
                    const t = camState.t;

                    // Layer 1 (t = 0.0 to 0.2): Selected island label fades to 1.0 alpha
                    const t_aura = Phaser.Math.Clamp((t - 0.0) / 0.2, 0, 1);
                    selectedItem.labelTxt.setAlpha(t_aura);

                    // Layer 2 (t = 0.15 to 0.45): Nearby fog (nebula clouds) fades down to gameplay levels
                    const t_fog = Phaser.Math.Clamp((t - 0.15) / 0.3, 0, 1);
                    this.nebulaClouds.forEach(cloud => {
                      const defaultAlpha = cloud.img.texture.key === 'nebula-purple' ? 0.08 : 0.06;
                      const currentAlpha = Phaser.Math.Interpolation.Linear([0.45, defaultAlpha], t_fog);
                      cloud.img.setAlpha(currentAlpha);
                    });

                    // Layer 3 (t = 0.3 to 0.6): Connection ley line from selected island to Nexus illuminates
                    const t_line = Phaser.Math.Clamp((t - 0.3) / 0.3, 0, 1);
                    this.leyLineGraphics.forEach(lineG => {
                      if (lineG.key === mappedKey) {
                        const currentAlpha = Phaser.Math.Interpolation.Linear([0.20, 0.92], t_line);
                        lineG.neutralGraphics.setAlpha(currentAlpha);
                        lineG.activeGraphics.setAlpha(0.0);
                      }
                    });

                    // Layer 4 (t = 0.5 to 0.8): Neighbouring game islands and labels fade in to full gameplay values
                    const t_neighbors = Phaser.Math.Clamp((t - 0.5) / 0.3, 0, 1);
                    this.islandContainers.forEach(item => {
                      if (item.data.key === mappedKey || item.data.key === 'nexus') return;
                      const currentAlpha = Phaser.Math.Interpolation.Linear([0.12, 1.0], t_neighbors);
                      item.container.setAlpha(currentAlpha);
                      item.labelTxt.setAlpha(currentAlpha);
                      const shadow = this.shadowObjs.find(s => s.data.key === item.data.key);
                      if (shadow) {
                        shadow.img.setAlpha(Phaser.Math.Interpolation.Linear([0.02, 0.20], t_neighbors));
                      }
                    });

                    // Layer 5 (t = 0.6 to 0.9): Remaining connection lines fade to normal idle alpha (0.92)
                    // Global ambience factor rises from 0.20 to 1.0
                    const t_lines_other = Phaser.Math.Clamp((t - 0.6) / 0.3, 0, 1);
                    this.leyLineGraphics.forEach(lineG => {
                      if (lineG.key !== mappedKey) {
                        const currentAlpha = Phaser.Math.Interpolation.Linear([0.20, 0.92], t_lines_other);
                        lineG.neutralGraphics.setAlpha(currentAlpha);
                        lineG.activeGraphics.setAlpha(0.0);
                      }
                    });
                    this.cinematicAmbienceAlphaFactor = Phaser.Math.Interpolation.Linear([0.20, 1.0], t_lines_other);

                    // Layer 6 (t = 0.8 to 1.0): Central Nexus fades in from starting 0.35 to full 1.0 alpha
                    const t_nexus = Phaser.Math.Clamp((t - 0.8) / 0.2, 0, 1);
                    const nexusAlpha = Phaser.Math.Interpolation.Linear([0.35, 1.0], t_nexus);
                    nexusItem.container.setAlpha(nexusAlpha);
                    nexusItem.labelTxt.setAlpha(nexusAlpha);
                    const nexusShadow = this.shadowObjs.find(s => s.data.key === 'nexus');
                    if (nexusShadow) {
                      nexusShadow.img.setAlpha(Phaser.Math.Interpolation.Linear([0.10, 0.20], t_nexus));
                    }
                  },
                  onComplete: () => {
                    // Clear tints on all game islands
                    this.islandContainers.forEach(item => {
                      item.islandImg.clearTint();
                      if (item.wizardImg) {
                        item.wizardImg.clearTint();
                      }
                    });

                    // 13. Arrival breathing pulse on the entire Nexus container (1.00 -> 1.02 -> 1.00 over 750ms)
                    // Wait 250ms before triggering the breathing pulse (Restored to previous elegant delay)
                    this.time.delayedCall(250, () => {
                      this.tweens.add({
                        targets: nexusItem.container,
                        scaleX: nexusBaseScale * 1.02,
                        scaleY: nexusBaseScale * 1.02,
                        duration: 375,
                        yoyo: true,
                        ease: 'Sine.easeInOut',
                        onComplete: () => {
                          // 14. End of cinematic: Wait 300ms, then restore interaction
                          this.game.events.emit('camera-arrived');
                          component.audioManager.fadeCameraWhoosh();
                          component.audioManager.playNexusArrival();
                          this.time.delayedCall(300, () => {
                            this.isTransitioning = false;
                            this.isReturning = false;
                            this.cinematicAmbienceAlphaFactor = 1.0;

                            // Synchronize Phaser input plugin with final camera transform.
                            // Toggling input.enabled forces the input manager to re-evaluate
                            // all interactive object hit regions relative to the current camera
                            // state (zoom=1.0, scroll at nexus center), eliminating any
                            // hover/click offset accumulated during the cinematic pan/zoom.
                            this.input.enabled = false;
                            this.input.enabled = true;

                            // Restore companion star to its fully idle, interactive state
                            this.forceResetProfileState();
                          });
                        }
                      });
                    });
                  }
                });
              }
            }
          }

          const isReturn = !!(playReturnAnimation && returnFrom && !this.returnFromHandled);
          component.audioManager.startAll(isReturn);

          // Profile Star and Panel Setup
          this.profileSystemContainer = this.add.container(this.systemTargetScreenX, 60);
          this.profileSystemContainer.setDepth(9998);
          this.profileSystemContainer.setScrollFactor(0);

          // Panel setup (Created and added first so it is rendered behind the star)
          this.profilePanelContainer = this.add.container(0, 0);
          this.profilePanelContainer.setScale(0.96);
          this.profilePanelContainer.setAlpha(0.0);
          this.profilePanelContainer.setVisible(false);
          this.profileSystemContainer.add(this.profilePanelContainer);

          // Star Container setup (Created and added second so it is rendered in front)
          this.profileStarContainer = this.add.container(0, 0);

          this.outerGlow = this.add.image(0, 0, 'glow');
          this.outerGlow.setScale(0.3);
          this.outerGlow.setTint(0xffd700);
          this.outerGlow.setAlpha(0.55);

          this.starCore = this.add.image(0, 0, 'star-core-texture');
          this.starCore.setScale(1.0); // 48px star visually matching standard bounds

          // Create Orbiting Sparkles
          this.profileSparkles = [];
          for (let i = 0; i < 3; i++) {
            const sparkle = this.add.image(0, 0, 'star');
            sparkle.setTint(0xffd700);
            sparkle.setScale(0.4);
            sparkle.setAlpha(0.8);
            this.profileSparkles.push(sparkle);
          }

          this.profileStarContainer.add([this.outerGlow, this.starCore, ...this.profileSparkles]);
          this.profileSystemContainer.add(this.profileStarContainer);

          // Star Core Interactions with custom 5-point star polygon hitbox (matching texture bounds exactly)
          const spikes = 5;
          const outerRadius = 24;
          const innerRadius = 9;
          const cx = 32;
          const cy = 32;
          let rot = Math.PI / 2 * 3;
          const step = Math.PI / spikes;
          const points: number[] = [];

          for (let i = 0; i < spikes; i++) {
            points.push(cx + Math.cos(rot) * outerRadius);
            points.push(cy + Math.sin(rot) * outerRadius);
            rot += step;

            points.push(cx + Math.cos(rot) * innerRadius);
            points.push(cy + Math.sin(rot) * innerRadius);
            rot += step;
          }

          const starPolygon = new Phaser.Geom.Polygon(points);
          this.starCore.setInteractive(starPolygon, Phaser.Geom.Polygon.Contains);

          this.starCore.on('pointerover', () => {
            if (this.isProfileStarSpinning || this.isProfileMenuOpen) return;
            this.sys.canvas.style.cursor = 'pointer';
            component.audioManager.playProfileHover();
            this.stopIdleStarBreathing();
            this.tweens.add({
              targets: this.profileStarContainer,
              scaleX: 1.10,
              scaleY: 1.10,
              duration: 180,
              ease: 'Sine.easeOut'
            });
            this.tweens.add({
              targets: this.outerGlow,
              alpha: 0.90,
              duration: 180,
              ease: 'Sine.easeOut'
            });
          });
          this.starCore.on('pointerout', () => {
            this.sys.canvas.style.cursor = 'default';
            if (this.isProfileMenuOpen) return;
            this.tweens.add({
              targets: this.profileStarContainer,
              scaleX: 1.0,
              scaleY: 1.0,
              duration: 180,
              ease: 'Sine.easeOut',
              onComplete: () => {
                if (!this.isProfileMenuOpen && !this.isProfileStarSpinning) {
                  this.startIdleStarBreathing();
                }
              }
            });
            this.tweens.add({
              targets: this.outerGlow,
              alpha: 0.55,
              duration: 180,
              ease: 'Sine.easeOut'
            });
          });
          this.starCore.on('pointerdown', () => {
            if (this.isProfileStarSpinning) return;
            this.toggleProfilePanel();
          });

          const panelGlow = this.add.image(-160, 200, 'glow').setDisplaySize(450, 580).setTint(0xffd700).setAlpha(0.12);
          const panelBg = this.add.graphics();
          panelBg.fillStyle(0x0a0714, 0.85);
          panelBg.lineStyle(2, 0xffd700, 0.4);
          panelBg.fillRoundedRect(-335, -40, 350, 480, 16);
          panelBg.strokeRoundedRect(-335, -40, 350, 480, 16);
          this.profilePanelContainer.add([panelGlow, panelBg]);

          // Profile Section inside Panel
          const avatarContainer = this.add.container(-160, 35);
          const avatarBg = this.add.graphics().fillStyle(0x28194c, 1.0).fillCircle(0, 0, 27);
          const avatarBorder = this.add.graphics().lineStyle(2, 0xffd700, 0.8).strokeCircle(0, 0, 27);
          const avatarText = this.add.text(0, 0, 'G', {
            fontFamily: 'Outfit, Arial, sans-serif',
            fontSize: '24px',
            color: '#ffffff',
            fontStyle: 'bold'
          }).setOrigin(0.5);
          avatarContainer.add([avatarBg, avatarBorder, avatarText]);

          const usernameText = this.add.text(-160, 80, 'Guest Traveler', {
            fontFamily: 'Outfit, Arial, sans-serif',
            fontSize: '18px',
            color: '#ffffff',
            fontStyle: 'bold'
          }).setOrigin(0.5);

          const emailText = this.add.text(-160, 104, 'Log in to save progress', {
            fontFamily: 'Outfit, Arial, sans-serif',
            fontSize: '13px',
            color: '#7e73a6'
          }).setOrigin(0.5);

          this.profilePanelContainer.add([avatarContainer, usernameText, emailText]);

          // Audio Toggle Control inside Panel
          const sliderLabel = this.add.text(-273, 142, 'HUB AMBIENCE', {
            fontFamily: 'Outfit, Arial, sans-serif',
            fontSize: '11px',
            fontStyle: 'bold',
            color: '#8a82a8'
          });
          this.audioToggleGraphics = this.add.graphics();
          this.audioToggleText = this.add.text(-95, 148, '', {
            fontFamily: 'Outfit, Arial, sans-serif',
            fontSize: '12px',
            fontStyle: 'bold',
            color: '#ffffff'
          }).setOrigin(0.5);
          this.audioToggleZone = this.add.zone(-95, 148, 110, 26);
          this.audioToggleZone.setInteractive({ useHandCursor: true });
          this.profilePanelContainer.add([sliderLabel, this.audioToggleGraphics, this.audioToggleText, this.audioToggleZone]);

          const drawAudioToggle = (enabled: boolean) => {
            this.audioToggleGraphics.clear();
            if (enabled) {
              this.audioToggleGraphics.fillStyle(0xffd700, 0.2);
              this.audioToggleGraphics.lineStyle(1.5, 0xffd700, 0.8);
              this.audioToggleText.setText('🔊 ON');
              this.audioToggleText.setColor('#ffffff');
            } else {
              this.audioToggleGraphics.fillStyle(0x28194c, 0.5);
              this.audioToggleGraphics.lineStyle(1.5, 0x7e73a6, 0.4);
              this.audioToggleText.setText('🔇 OFF');
              this.audioToggleText.setColor('#b3accf');
            }
            this.audioToggleGraphics.fillRoundedRect(-150, 135, 110, 26, 6);
            this.audioToggleGraphics.strokeRoundedRect(-150, 135, 110, 26, 6);
          };

          this.audioToggleZone.on('pointerover', () => {
            this.sys.canvas.style.cursor = 'pointer';
            component.audioManager.playUIButtonHover();
            this.audioToggleGraphics.setAlpha(0.85);
          });
          this.audioToggleZone.on('pointerout', () => {
            this.sys.canvas.style.cursor = 'default';
            this.audioToggleGraphics.setAlpha(1.0);
          });
          this.audioToggleZone.on('pointerdown', () => {
            component.audioManager.playUIButtonClick();
            const nextEnabled = !component.audioManager.getAmbienceEnabled();
            component.audioManager.setAmbienceEnabled(nextEnabled);
            drawAudioToggle(nextEnabled);
          });

          // Adventure Stats Section
          const statsLabel = this.add.text(-273, 192, 'ADVENTURE STATS', {
            fontFamily: 'Outfit, Arial, sans-serif',
            fontSize: '11px',
            fontStyle: 'bold',
            color: '#8a82a8'
          });
          this.profilePanelContainer.add(statsLabel);

          const games = [
            { key: 'wavelength', name: 'Wavelength', color: 0x7e57c2 },
            { key: 'flappy', name: 'Flappy Escape', color: 0xffa000 },
            { key: 'reaction', name: 'Reaction Time', color: 0xff7043 },
            { key: 'puzzle', name: 'Image Puzzle', color: 0x00b0ff },
            { key: 'howfaroff', name: 'Higher or Lower', color: 0xb0bec5 },
            { key: 'oops', name: 'Oops!', color: 0xd32f2f }
          ];

          const playCountTextObjects: Record<string, Phaser.GameObjects.Text> = {};

          games.forEach((game, index) => {
            const yPos = 216 + index * 26;
            const circle = this.add.graphics().fillStyle(game.color, 1.0).fillCircle(-265, yPos + 6, 5);
            const nameText = this.add.text(-251, yPos, game.name, {
              fontFamily: 'Outfit, Arial, sans-serif',
              fontSize: '13px',
              fontStyle: 'bold',
              color: '#ffffff'
            });
            const playsText = this.add.text(-27, yPos, '0 plays', {
              fontFamily: 'Outfit, Arial, sans-serif',
              fontSize: '13px',
              color: '#b3accf'
            }).setOrigin(1, 0);

            const rowZone = this.add.zone(-146, yPos + 8, 260, 22);
            rowZone.setInteractive({ useHandCursor: true });

            this.profilePanelContainer.add([circle, nameText, playsText, rowZone]);
            playCountTextObjects[game.key] = playsText;

            rowZone.on('pointerover', () => {
              this.sys.canvas.style.cursor = 'pointer';
              component.audioManager.playUIButtonHover();
              nameText.setColor('#ffd700');
            });
            rowZone.on('pointerout', () => {
              this.sys.canvas.style.cursor = 'default';
              nameText.setColor('#ffffff');
            });
            rowZone.on('pointerdown', () => {
              component.audioManager.playUIButtonClick();
              this.closeProfilePanel();
              this.time.delayedCall(220, () => {
                const targetItem = this.islandContainers.find(item => item.data.key === game.key);
                if (targetItem) {
                  this.onIslandSelect(targetItem.container, targetItem.data);
                }
              });
            });
          });

          // Logout / Login button
          const authButtonBg = this.add.graphics();
          const authButtonTxt = this.add.text(-160, 388, 'LOGOUT', {
            fontFamily: 'Outfit, Arial, sans-serif',
            fontSize: '13px',
            fontStyle: 'bold',
            color: '#ffffff'
          }).setOrigin(0.5);
          
          const authButtonZone = this.add.zone(-160, 388, 180, 36);
          authButtonZone.setInteractive({ useHandCursor: true });

          this.profilePanelContainer.add([authButtonBg, authButtonTxt, authButtonZone]);

          const drawAuthButton = (isLoggedIn: boolean) => {
            authButtonBg.clear();
            if (isLoggedIn) {
              authButtonBg.fillStyle(0xd32f2f, 0.85);
              authButtonBg.lineStyle(1.5, 0xff5252, 0.5);
            } else {
              authButtonBg.fillStyle(0x00e5ff, 0.2);
              authButtonBg.lineStyle(1.5, 0x00e5ff, 0.8);
            }
            authButtonBg.fillRoundedRect(-250, 370, 180, 36, 8);
            authButtonBg.strokeRoundedRect(-250, 370, 180, 36, 8);
            authButtonTxt.setText(isLoggedIn ? 'LOGOUT' : 'LOGIN / REGISTER');
          };

          authButtonZone.on('pointerover', () => {
            this.sys.canvas.style.cursor = 'pointer';
            component.audioManager.playUIButtonHover();
            authButtonBg.setAlpha(0.85);
          });
          authButtonZone.on('pointerout', () => {
            this.sys.canvas.style.cursor = 'default';
            authButtonBg.setAlpha(1.0);
          });
          authButtonZone.on('pointerdown', () => {
            component.audioManager.playUIButtonClick();
            const user = component.userDetails.getUserDetails();
            if (user) {
              component.userDetails.setUserDetails(null);
              this.updateAuthStatus();
            } else {
              component.ngZone.run(() => {
                component.router.navigate(['/login']);
              });
            }
          });

          // Update Status function
          this.updateAuthStatus = () => {
            const user = component.userDetails.getUserDetails();
            if (user) {
              avatarText.setText(user.name.charAt(0).toUpperCase());
              usernameText.setText(user.name);
              emailText.setText(user.email);
              emailText.setColor('#b3accf');
              drawAuthButton(true);
            } else {
              avatarText.setText('?');
              usernameText.setText('Guest Traveler');
              emailText.setText('Log in to save progress');
              emailText.setColor('#7e73a6');
              drawAuthButton(false);
            }

            games.forEach(game => {
              const wPlays = localStorage.getItem(`game-play-count-${game.key}`) || '0';
              const playsObj = playCountTextObjects[game.key];
              if (playsObj) {
                playsObj.setText(wPlays + (wPlays === '1' ? ' play' : ' plays'));
              }
            });
          };

          this.updateAuthStatus();

          // Restore menu visibility/breathing status
          const currentAmbEnabled = component.audioManager.getAmbienceEnabled();
          drawAudioToggle(currentAmbEnabled);

          if (this.isProfileMenuOpen) {
            this.profilePanelContainer.setVisible(true);
            this.profilePanelContainer.setScale(1.0);
            this.profilePanelContainer.setAlpha(1.0);
            this.systemTargetScreenX = 380;
            this.outerGlow.setAlpha(0.82);
            this.updateAuthStatus();
          } else {
            this.profilePanelContainer.setVisible(false);
            this.profilePanelContainer.setScale(0.96);
            this.profilePanelContainer.setAlpha(0.0);
            this.systemTargetScreenX = 60;
            this.startIdleStarBreathing();
          }

          // Global background click: close panel when clicking outside panel + star region
          this.input.off('pointerdown', (this as any)._bgCloseHandler);
          (this as any)._bgCloseHandler = (pointer: Phaser.Input.Pointer) => {
            if (!this.isProfileMenuOpen) return;
            // Panel region in screen-space: star is at (systemTargetScreenX, 60), panel extends ~335px to the left
            const starSX = this.systemTargetScreenX;
            const panelLeft   = starSX - 335;
            const panelRight  = starSX + 30;
            const panelTop    = 60 - 55;
            const panelBottom = 60 + 445;
            const starLeft    = starSX - 30;
            const starRight   = starSX + 30;
            const starTop     = 60 - 30;
            const starBottom  = 60 + 30;
            const px = pointer.x;
            const py = pointer.y;
            const inPanel = px >= panelLeft && px <= panelRight && py >= panelTop && py <= panelBottom;
            const inStar  = px >= starLeft  && px <= starRight  && py >= starTop  && py <= starBottom;
            if (!inPanel && !inStar) {
              this.closeProfilePanel();
            }
          };
          this.input.on('pointerdown', (this as any)._bgCloseHandler);
        }

        startIdleStarBreathing() {
          this.profileStarContainer.setScale(1.0);
          this.idleStarScaleTween = this.tweens.add({
            targets: this.profileStarContainer,
            scaleX: 1.04,
            scaleY: 1.04,
            duration: 1600,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
          });

          this.profileStarContainer.setAngle(-3);
          this.idleStarRotateTween = this.tweens.add({
            targets: this.profileStarContainer,
            angle: 3,
            duration: 1600,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
          });

          this.outerGlow.setAlpha(0.55);
          this.idleGlowAlphaTween = this.tweens.add({
            targets: this.outerGlow,
            alpha: 0.80,
            duration: 1600,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
          });
        }

        stopIdleStarBreathing() {
          if (this.idleStarScaleTween) {
            this.idleStarScaleTween.stop();
            this.idleStarScaleTween = null;
          }
          if (this.idleStarRotateTween) {
            this.idleStarRotateTween.stop();
            this.idleStarRotateTween = null;
          }
          if (this.idleGlowAlphaTween) {
            this.idleGlowAlphaTween.stop();
            this.idleGlowAlphaTween = null;
          }
        }

        toggleProfilePanel() {
          if (this.isProfileStarSpinning) return;
          if (this.isProfileMenuOpen) {
            this.closeProfilePanel();
          } else {
            // Spin starCore 180° over 300ms first, emitting particles, playing open sound
            this.isProfileStarSpinning = true;
            this.stopIdleStarBreathing();
            this.profileStarContainer.setScale(1.0);
            this.profileStarContainer.setAngle(0);
            this.starCore.setAngle(0);

            component.audioManager.playProfileOpen();

            // Emit 8 golden particles
            const px = this.profileSystemContainer.x;
            const py = this.profileSystemContainer.y;
            const cam = this.cameras.main;
            for (let i = 0; i < 8; i++) {
              const angle = i * Math.PI / 4;
              const p = this.add.image(px, py, 'star');
              p.setTint(0xffd700);
              p.setScale(1.5 / cam.zoom);
              p.setScrollFactor(0);
              p.setDepth(9999);
              p.setBlendMode(Phaser.BlendModes.ADD);
              const speed = 60 + Math.random() * 40;
              this.tweens.add({
                targets: p,
                x: px + (Math.cos(angle) * speed) / cam.zoom,
                y: py + (Math.sin(angle) * speed) / cam.zoom,
                scaleX: 0.1 / cam.zoom,
                scaleY: 0.1 / cam.zoom,
                alpha: 0,
                duration: 500,
                ease: 'Quad.easeOut',
                onComplete: () => p.destroy()
              });
            }

            // Spin starCore 180° over 300ms
            this.tweens.add({
              targets: this.starCore,
              angle: 180,
              duration: 300,
              ease: 'Sine.easeInOut',
              onComplete: () => {
                this.isProfileStarSpinning = false;
                this.openProfilePanel();
              }
            });
          }
        }

        openProfilePanel() {
          if (this.isProfileStarSpinning) return;
          this.isProfileStarSpinning = true;
          this.isProfileMenuOpen = true;

          this.stopIdleStarBreathing();
          this.profileStarContainer.setScale(1.0);
          this.profileStarContainer.setAngle(0);

          this.profilePanelContainer.setVisible(true);
          this.profilePanelContainer.setScale(0.96);
          this.profilePanelContainer.setAlpha(0.0);

          if (this.updateAuthStatus) this.updateAuthStatus();

          // Unfold: Slide parent target screen X and scale/fade panel container (Cubic.easeOut, 350ms)
          this.tweens.add({
            targets: this,
            systemTargetScreenX: 380,
            duration: 350,
            ease: 'Cubic.easeOut',
            onComplete: () => {
              this.isProfileStarSpinning = false;
            }
          });

          this.tweens.add({
            targets: this.profilePanelContainer,
            scaleX: 1.0,
            scaleY: 1.0,
            alpha: 1.0,
            duration: 350,
            ease: 'Cubic.easeOut'
          });

          this.tweens.add({
            targets: this.outerGlow,
            alpha: 0.82,
            duration: 350,
            ease: 'Cubic.easeOut'
          });
        }

        closeProfilePanel() {
          if (this.isProfileStarSpinning) return;
          this.isProfileStarSpinning = true;

          component.audioManager.playProfileClose();

          // Sequence: 1. Fold: Slide parent target screen X back and scale/fade panel container (Cubic.easeIn, 350ms)
          this.tweens.add({
            targets: this,
            systemTargetScreenX: 60,
            duration: 350,
            ease: 'Cubic.easeIn',
            onComplete: () => {
              this.profilePanelContainer.setVisible(false);

              // 2. Rotate back: Rotate the star core back to 0 degrees (Sine.easeInOut, 300ms)
              this.tweens.add({
                targets: this.starCore,
                angle: 0,
                duration: 300,
                ease: 'Sine.easeInOut',
                onComplete: () => {
                  this.isProfileStarSpinning = false;
                  this.isProfileMenuOpen = false;
                  this.startIdleStarBreathing();
                }
              });
            }
          });

          this.tweens.add({
            targets: this.profilePanelContainer,
            scaleX: 0.96,
            scaleY: 0.96,
            alpha: 0.0,
            duration: 350,
            ease: 'Cubic.easeIn'
          });

          this.tweens.add({
            targets: this.outerGlow,
            alpha: 0.55,
            duration: 350,
            ease: 'Cubic.easeIn'
          });
        }

        closeProfilePanelImmediately() {
          this.forceResetProfileState();
        }

        forceResetProfileState() {
          this.tweens.killTweensOf(this);
          if (this.profileSystemContainer) this.tweens.killTweensOf(this.profileSystemContainer);
          if (this.profileStarContainer) this.tweens.killTweensOf(this.profileStarContainer);
          if (this.profilePanelContainer) this.tweens.killTweensOf(this.profilePanelContainer);
          if (this.starCore) this.tweens.killTweensOf(this.starCore);
          if (this.outerGlow) this.tweens.killTweensOf(this.outerGlow);

          this.isProfileMenuOpen = false;
          this.isProfileStarSpinning = false;
          this.systemTargetScreenX = 60;

          const cam = this.cameras.main;
          if (this.profileSystemContainer) {
            this.profileSystemContainer.x = 60 / cam.zoom;
            this.profileSystemContainer.y = 60 / cam.zoom;
            this.profileSystemContainer.setScale(1.0 / cam.zoom);
          }

          if (this.profilePanelContainer) {
            this.profilePanelContainer.setVisible(false);
            this.profilePanelContainer.setScale(0.96);
            this.profilePanelContainer.setAlpha(0.0);
          }

          if (this.profileStarContainer) {
            this.profileStarContainer.setScale(1.0);
            this.profileStarContainer.setAngle(0);
          }

          if (this.starCore) {
            this.starCore.setAngle(0);
            this.starCore.setScale(1.0);
          }

          if (this.outerGlow) {
            this.outerGlow.setAlpha(0.55);
          }

          this.stopIdleStarBreathing();
          this.startIdleStarBreathing();
        }

        private onIslandHover(container: Phaser.GameObjects.Container, data: IslandData) {
          // Play immediately on enter; skip if still hovering the same island
          if (this.hoveredIslandKey !== data.key) {
            this.hoveredIslandKey = data.key;
            component.audioManager.playIslandHover(data.key);
          }

          const item = this.islandContainers.find(i => i.data.key === data.key);
          if (!item) return;

          this.sys.canvas.style.cursor = 'pointer';

          const baseScale = container.getData('baseScale') || 1.0;
          const isSelected = this.selectedIslandKey === data.key;
          const targetScale = isSelected ? baseScale * 1.08 : baseScale * 1.05;
          const targetY = isSelected ? item.initialY - 4 : item.initialY - 8;

          this.tweens.add({
            targets: container,
            scaleX: targetScale,
            scaleY: targetScale,
            y: targetY,
            duration: 200,
            ease: 'Power2'
          });

          // Pulse all glows on hover
          const glows = this.glowObjs.filter(g => g.img.parentContainer === container);
          glows.forEach(glow => {
            this.tweens.add({
              targets: glow.img,
              alpha: Math.min(1.0, glow.baseAlpha * 1.3),
              duration: 200
            });
            glow.speed = data.floatSpeed * 3.5;
          });

          const shadow = this.shadowObjs.find(s => s.data.key === data.key);
          if (shadow) {
            this.tweens.add({
              targets: shadow.img,
              alpha: 0.35,
              duration: 200
            });
          }

          this.tweens.add({
            targets: item.labelTxt,
            scaleX: 1.10,
            scaleY: 1.10,
            duration: 200
          });
        }

        private onIslandHoverExit(container: Phaser.GameObjects.Container, data: IslandData) {
          // Allow hover sound to replay when re-entering this island
          if (this.hoveredIslandKey === data.key) {
            this.hoveredIslandKey = null;
          }

          const item = this.islandContainers.find(i => i.data.key === data.key);
          if (!item) return;

          this.sys.canvas.style.cursor = 'default';

          const baseScale = container.getData('baseScale') || 1.0;
          const isSelected = this.selectedIslandKey === data.key;
          const targetScale = isSelected ? baseScale * 1.08 : baseScale;
          const targetY = isSelected ? item.initialY - 12 : item.initialY;

          this.tweens.add({
            targets: container,
            scaleX: targetScale,
            scaleY: targetScale,
            y: targetY,
            duration: 200,
            ease: 'Power2'
          });

          // Restore glow alphas
          const glows = this.glowObjs.filter(g => g.img.parentContainer === container);
          glows.forEach(glow => {
            const destAlpha = this.selectedIslandKey && !isSelected ? glow.baseAlpha * 0.5 : glow.baseAlpha;
            this.tweens.add({
              targets: glow.img,
              alpha: destAlpha,
              duration: 200
            });
            glow.speed = data.floatSpeed * 2.0;
          });

          const shadow = this.shadowObjs.find(s => s.data.key === data.key);
          if (shadow) {
            const destAlpha = this.selectedIslandKey && !isSelected ? 0.10 : 0.20;
            this.tweens.add({
              targets: shadow.img,
              alpha: destAlpha,
              duration: 200
            });
          }

          const destLabelScale = isSelected ? 1.15 : 1.0;
          this.tweens.add({
            targets: item.labelTxt,
            scaleX: destLabelScale,
            scaleY: destLabelScale,
            duration: 200
          });
        }

        private onIslandSelect(container: Phaser.GameObjects.Container, data: IslandData) {
          this.closeProfilePanelImmediately();
          if (data.isCenter) {
            if (this.selectedIslandKey !== null) {
              this.resetMap();
            }
            return;
          }
          if (this.selectedIslandKey === data.key) {
            console.log(`[Portal] activated`);

            const selectedItem = this.islandContainers.find(
              i => i.data.key === data.key
            );

            if (selectedItem) {
              const baseScale = selectedItem.container.getData('baseScale') || 1.0;
              this.tweens.add({
                targets: selectedItem.container,
                scaleX: baseScale * 1.50,
                scaleY: baseScale * 1.50,
                duration: 180,
                yoyo: true,
                ease: 'Power2'
              });
            }

            return;
          }

          component.audioManager.playIslandSelect(data.key);

          this.selectedIslandKey = data.key;
          if (this.infoCard) {
            this.infoCard.destroy();
            this.infoCard = null;
          }
          this.game.events.emit('island-selected', data);
          this.applySelectionVisuals(data);

          // Tween the selected container scale to 1.18x over the 900ms camera travel duration.
          const selectedItem = this.islandContainers.find(i => i.data.key === data.key);
          if (selectedItem) {
            this.tweens.killTweensOf(selectedItem.container);
            const baseScale = selectedItem.container.getData('baseScale') || 1.0;
            this.tweens.add({
              targets: selectedItem.container,
              scaleX: baseScale * 1.18,
              scaleY: baseScale * 1.18,
              alpha: 1.0,
              y: selectedItem.initialY - 4,
              duration: 900,
              ease: 'Sine.easeInOut'
            });
          }

          // Camera pan and zoom to selected island
          const targetX = this.scale.width * data.xPct;
          const targetY = this.scale.height * data.yPct;
          const cam = this.cameras.main;
          const camData = {
            scrollX: cam.scrollX,
            scrollY: cam.scrollY,
            zoom: cam.zoom
          };
          this.tweens.add({
            targets: camData,
            scrollX: targetX - cam.width / 2,
            scrollY: targetY - cam.height / 2,
            zoom: 1.6,
            duration: 900,
            ease: 'Sine.easeInOut',
            onStart: () => {
              component.audioManager.playCameraWhoosh();
            },
            onUpdate: () => {
              cam.setScroll(camData.scrollX, camData.scrollY);
              cam.setZoom(camData.zoom);
            },
            onComplete: () => {
              component.audioManager.fadeCameraWhoosh();
              this.game.events.emit('camera-arrived');
              this.showPhaserInfoCard(data);
              const selectedItem = this.islandContainers.find(
                i => i.data.key === data.key
              );

              if (selectedItem) {
                this.tweens.add({
                  targets: selectedItem.container,
                  y: selectedItem.initialY - 20,
                  duration: 600,
                  ease: 'Sine.easeOut'
                });
              }

              if (this.selectedRingImg) {
                this.tweens.add({
                  targets: this.selectedRingImg,
                  alpha: 1.0,
                  duration: 400,
                  ease: 'Sine.easeOut'
                });
              }
            }
          });
        }

        private applySelectionVisuals(data: IslandData) {
          if (this.selectedRingImg) {
            this.selectedRingImg.destroy();
            this.selectedRingImg = null;
          }

          const currentWidth = this.getIslandWidth(data.isCenter);
          const rx = this.scale.width * data.xPct;
          const ry = this.scale.height * data.yPct + currentWidth * 0.35;

          // Double ring system for premium magic/portal aura
          const ringContainer = this.add.container(rx, ry);
          ringContainer.setScale((currentWidth * 1.25) / 256, (currentWidth * 0.45) / 256);
          this.decorationLayer.add(ringContainer);

          // Outer glowing/soft ring
          const ringGlow = this.add.image(0, 0, 'rune-ring');
          ringGlow.setScale(1.04);
          ringGlow.setAlpha(0.35);
          ringGlow.setTint(data.themeColor);
          ringGlow.setBlendMode(Phaser.BlendModes.ADD);
          ringContainer.add(ringGlow);

          // Inner sharp ring
          const ringImg = this.add.image(0, 0, 'rune-ring');
          ringImg.setAlpha(0.65);
          ringImg.setTint(data.themeColor);
          ringImg.setBlendMode(Phaser.BlendModes.ADD);
          ringContainer.add(ringImg);

          this.selectedRingImg = ringContainer;

          // Pulse breathing effect on container
          this.tweens.add({
            targets: ringContainer,
            scaleX: ringContainer.scaleX * 1.08,
            scaleY: ringContainer.scaleY * 1.08,
            duration: 1200,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
          });

          // Focus levels:
          // Selected: scale +10%, alpha 100%, tint 0xffffff (full brightness)
          // Nexus: scale -8%, alpha 60%, tint 0x8899aa (readable anchor)
          // Non-selected: scale -25%, alpha 15%, tint 0x333344 (deep background fade)
          this.islandContainers.forEach(item => {
            const isSelected = item.data.key === data.key;
            const isNexus = item.data.key === 'nexus';

            const baseScale = item.container.getData('baseScale') || 1.0;

            let targetAlpha = 0.15;
            let targetScale = baseScale * 0.75;
            let targetY = item.initialY;
            let tintColor = 0x333344;

            if (isSelected) {
              targetAlpha = 1.0;
              targetScale = baseScale * 1.10;
              targetY = item.initialY - 12;
              tintColor = 0xffffff;
            } else if (isNexus) {
              targetAlpha = 0.60;
              targetScale = baseScale * 0.92;
              tintColor = 0x8899aa;
            }

            this.tweens.add({
              targets: item.container,
              alpha: targetAlpha,
              scaleX: targetScale,
              scaleY: targetScale,
              y: targetY,
              duration: 300,
              ease: 'Power2'
            });

            item.islandImg.setTint(tintColor);
            if (item.wizardImg) {
              item.wizardImg.setTint(tintColor);
            }

            // Portal glow scaling
            item.glowImgs.forEach(g => {
              const baseGlowScale = g.getData('baseScale') || g.scaleX;
              this.tweens.add({
                targets: g,
                scaleX: isSelected ? baseGlowScale * 1.30 : baseGlowScale,
                scaleY: isSelected ? baseGlowScale * 1.30 : baseGlowScale,
                duration: 400,
                ease: 'Sine.easeInOut'
              });
            });

            const shadow = this.shadowObjs.find(s => s.data.key === item.data.key);
            if (shadow) {
              let destAlpha = 0.02;
              if (isSelected) destAlpha = 0.30;
              else if (isNexus) destAlpha = 0.10;

              this.tweens.add({
                targets: shadow.img,
                alpha: destAlpha,
                duration: 300
              });
            }

            if (isSelected) {
              item.labelTxt.setFontStyle('bold');
              this.tweens.add({
                targets: item.labelTxt,
                scaleX: 1.15,
                scaleY: 1.15,
                alpha: 1.0,
                duration: 300
              });
            } else if (isNexus) {
              this.tweens.add({
                targets: item.labelTxt,
                scaleX: 0.95,
                scaleY: 0.95,
                alpha: 0.50,
                duration: 300
              });
            } else {
              this.tweens.add({
                targets: item.labelTxt,
                scaleX: 0.85,
                scaleY: 0.85,
                alpha: 0.12,
                duration: 300
              });
            }
          });

          // Ley lines transitions: selected pathway awakens, all others fade away completely to 0.0 alpha over 350ms
          this.leyLineGraphics.forEach(lineG => {
            const isSelected = lineG.key === data.key;

            // Active themed overlay (awakens to 1.0 if selected, fades to 0.0 otherwise)
            this.tweens.add({
              targets: lineG.activeGraphics,
              alpha: isSelected ? 1.0 : 0.0,
              duration: 350,
              ease: 'Sine.easeInOut'
            });

            // Neutral line (selected neutral line fades to 0.0 to cross-fade with vibrant active graphics, non-selected lines fade completely to 0.0)
            this.tweens.add({
              targets: lineG.neutralGraphics,
              alpha: 0.0,
              duration: 350,
              ease: 'Sine.easeInOut'
            });
          });
        }

        override update(time: number, delta: number) {
          const elapsedSeconds = time / 1000;
          const width = this.scale.width;
          const height = this.scale.height;
          const dt = delta / 1000;

          // Update Profile System Container position and scale (compensating for zoom)
          const cam = this.cameras.main;
          if (this.profileSystemContainer && this.profileSystemContainer.active) {
            this.profileSystemContainer.x = this.systemTargetScreenX / cam.zoom;
            this.profileSystemContainer.y = 60 / cam.zoom;
            this.profileSystemContainer.setScale(1.0 / cam.zoom);
          }

          // Update Orbiting Sparkles
          if (this.profileSparkles && this.profileSparkles.length > 0) {
            this.profileSparkles.forEach((sparkle, idx) => {
              if (sparkle && sparkle.active) {
                // Circular orbits with different speed/offset per sparkle
                const speed = 1.2 + idx * 0.4;
                const phase = idx * (Math.PI * 2 / 3);
                const angle = elapsedSeconds * speed + phase;
                const radius = 34; // Visually orbiting the star core
                sparkle.x = Math.cos(angle) * radius;
                sparkle.y = Math.sin(angle) * radius;

                // Subtle scale breathing and rotation of each sparkle
                const breathe = 0.4 + Math.sin(elapsedSeconds * 3 + idx) * 0.1;
                sparkle.setScale(breathe);
                sparkle.angle = elapsedSeconds * 45 + idx * 30;
              }
            });
          }

          this.islandContainers.forEach(item => {
            const floatY = Math.sin(elapsedSeconds * item.data.floatSpeed + item.data.floatPhase) * item.data.floatAmp;
            const baseScale = item.container.getData('baseScale') || 1.0;
            const localFloatY = floatY / baseScale;

            item.islandImg.y = localFloatY;
            item.glowImgs.forEach(g => {
              g.y = -61.44 + localFloatY;
            });
            if (item.wizardImg) {
              item.wizardImg.y = -20.48 + localFloatY;
            }
            // Sync text label Y to float dynamically with the island to prevent static overlaps
            const currentWidth = this.getIslandWidth(item.data.isCenter);
            const labelOffsetY = item.data.isCenter ? currentWidth * 0.28 : currentWidth * 0.32;
            item.labelTxt.y = item.initialY + labelOffsetY + floatY;

            // Phase 5: Local Aura Particles Update (floating, breathing locally in container)
            if (item.auraParticles) {
              item.auraParticles.forEach(p => {
                p.phase += p.speed * dt;
                const driftRadiusX = 18;
                const driftRadiusY = 14;
                p.img.x = Math.cos(p.phase) * driftRadiusX;
                p.img.y = -61.44 + Math.sin(p.phase * 1.3) * driftRadiusY + localFloatY;

                const pulse = Math.sin(elapsedSeconds * 1.5 + p.phase);
                p.img.setAlpha(Math.max(0.04, (p.baseAlpha + pulse * 0.04) * item.container.alpha));
              });
            }

            // Phase 6: Nexus Orbitals (subtle energy flow between crystals)
            if (item.nexusOrbitals) {
              item.nexusOrbitals.forEach(p => {
                p.phase += p.speed * dt;
                p.img.x = Math.cos(p.phase) * 55;
                p.img.y = -22 + Math.sin(p.phase) * 16 + localFloatY;

                const alphaPulse = Math.sin(p.phase);
                const depthAlpha = 0.35 + (alphaPulse + 1) * 0.20;
                p.img.setAlpha(depthAlpha * item.container.alpha);
              });
            }
          });

          this.shadowObjs.forEach(item => {
            const floatY = Math.sin(elapsedSeconds * item.data.floatSpeed + item.data.floatPhase) * (item.data.floatAmp * 0.4);
            item.img.y = item.shadowOffsetY + floatY;
          });

          if (!this.isTransitioning) {
            this.glowObjs.forEach(glow => {
              const pulse = Math.sin(elapsedSeconds * glow.speed + glow.phase);
              const container = glow.img.parentContainer;
              const containerData = this.islandContainers.find(i => i.container === container);
              const isSelected = containerData && this.selectedIslandKey === containerData.data.key;

              // Phase 6: Soft breathing glow (Nexus has a very slow breathing rhythm)
              const pulseSpeed = (containerData && containerData.data.key === 'nexus') ? 1.0 : glow.speed;
              const actualPulse = Math.sin(elapsedSeconds * pulseSpeed + glow.phase);

              const currentBase = isSelected ? glow.baseAlpha * 1.45 : glow.baseAlpha;

              let selectionFactor = 1.0;
              if (this.selectedIslandKey && !isSelected) {
                selectionFactor = (containerData && containerData.data.key === 'nexus') ? 0.50 : 0.10;
              }

              glow.img.setAlpha((currentBase + actualPulse * 0.08) * selectionFactor);
            });
          }

          // 1. Twinkling Distant Stars (twinkle only, no drift)
          this.distantStars.forEach(star => {
            const shimmer = Math.sin(elapsedSeconds * star.speed + star.phase);
            star.img.setAlpha(Math.max(0.05, star.baseAlpha + shimmer * 0.12));
          });

          // Helper to wrap particles within screen bounds with padding
          const wrapPadding = 40;
          const wrapParticle = (img: Phaser.GameObjects.Image, speedX: number, speedY: number) => {
            img.x += speedX * dt;
            img.y += speedY * dt;

            if (img.x < -wrapPadding) img.x = width + wrapPadding;
            if (img.x > width + wrapPadding) img.x = -wrapPadding;
            if (img.y < -wrapPadding) img.y = height + wrapPadding;
            if (img.y > height + wrapPadding) img.y = -wrapPadding;
          };

          // 2. Drifting Particles (Layer 2 - 30% Parallax)
          this.driftingParticles.forEach(p => {
            wrapParticle(p.img, p.speedX, p.speedY);
            const twinkle = Math.sin(elapsedSeconds * p.speed + p.phase);
            p.img.setAlpha(Math.max(0.05, p.baseAlpha + twinkle * 0.08) * this.cinematicAmbienceAlphaFactor);
          });

          // 3. Floating Dust (Layer 3 - 50% Parallax)
          this.floatingDust.forEach(p => {
            wrapParticle(p.img, p.speedX, p.speedY);
            const twinkle = Math.sin(elapsedSeconds * p.speed + p.phase);
            p.img.setAlpha(Math.max(0.01, p.baseAlpha + twinkle * 0.015) * this.cinematicAmbienceAlphaFactor);
          });

          // 4. Glowing Motes (Layer 4 - 50% Parallax)
          this.glowingMotes.forEach(p => {
            wrapParticle(p.img, p.speedX, p.speedY);
            const pulse = Math.sin(elapsedSeconds * p.speed + p.phase);
            p.img.setAlpha(Math.max(0.02, p.baseAlpha + pulse * 0.03) * this.cinematicAmbienceAlphaFactor);
          });

          // 5. Ambient Magic (Rare foreground particles - Phase 4)
          this.ambientMagic.forEach(p => {
            wrapParticle(p.img, p.speedX, p.speedY);
            p.img.rotation += p.rotSpeed;
            const pulse = Math.sin(elapsedSeconds * p.speed + p.phase);
            p.img.setAlpha(Math.max(0.02, p.baseAlpha + pulse * 0.06) * this.cinematicAmbienceAlphaFactor);
          });

          // Phase 6: Occasional elegant ripple pulse through the Nexus ring (every 5.0 seconds)
          this.nexusPulseTimer += dt;
          if (this.nexusPulseTimer >= 5.0) {
            this.nexusPulseTimer = 0;
            if (this.runeRingObj) {
              const ring = this.runeRingObj;
              const baseScaleX = 3.2;
              const baseScaleY = 1.2;
              this.tweens.add({
                targets: ring,
                scaleX: baseScaleX * 1.15,
                scaleY: baseScaleY * 1.15,
                alpha: { from: 1.0, to: 0.15 },
                duration: 1600,
                ease: 'Quad.easeOut',
                onComplete: () => {
                  ring.setScale(baseScaleX, baseScaleY);
                  ring.setAlpha(1.0);
                }
              });
            }
          }

          if (this.runeRingObj) {
            this.runeRingObj.list.forEach((child: any) => {
              if (child && child.rotation !== undefined) {
                child.rotation = elapsedSeconds * 0.03;
              }
            });
          }

          if (this.selectedRingImg) {
            this.selectedRingImg.list.forEach((child: any) => {
              if (child && child.rotation !== undefined) {
                child.rotation = -elapsedSeconds * 0.03;
              }
            });
          }

          this.bgClouds.forEach(c => {
            const offset = Math.sin(elapsedSeconds * c.speed + c.phase) * 12;
            c.img.x = c.baseX + offset;
          });

          this.nebulaClouds.forEach(cloud => {
            const offset = Math.sin(elapsedSeconds * cloud.speed + cloud.phase) * 20;
            cloud.img.x = cloud.baseX + offset;
          });

          // Update selected line breathing oscillation
          this.leyLineGraphics.forEach(lineG => {
            if (this.selectedIslandKey === lineG.key) {
              const breathOsc = Math.sin(elapsedSeconds * (Math.PI * 2 / 3.5)) * 0.035; // 7% total variation over 3.5s
              lineG.activeGraphics.alpha = 0.965 + breathOsc;
            }
          });

          if (!this.isTransitioning || this.isReturning) {
            // Update flowing ley line energy particles
            this.leyLineParticles.forEach(p => {
              p.t += p.speed * dt;

              // Absorption Detection & Wrap Around
              if (p.t >= 1.0) {
                p.t = p.t % 1.0;

                // 1. Sparkle at destination portal
                const sparkle = this.add.image(p.endX, p.endY, 'star');
                sparkle.setScale(0.1);
                sparkle.setTint(0xffffff);
                sparkle.setAlpha(0.9);
                sparkle.setBlendMode(Phaser.BlendModes.ADD);
                this.decorationLayer.add(sparkle);
                this.tweens.add({
                  targets: sparkle,
                  scaleX: 0.5,
                  scaleY: 0.5,
                  x: p.endX + (Math.random() * 24 - 12),
                  y: p.endY + (Math.random() * 24 - 12),
                  alpha: 0,
                  duration: 400,
                  ease: 'Sine.easeOut',
                  onComplete: () => sparkle.destroy()
                });

                // 2. Gentle pulse on the destination portal glow
                const destIsland = this.islandContainers.find(i => i.data.key === p.key);
                if (destIsland) {
                  destIsland.glowImgs.forEach(g => {
                    const baseGlowScale = g.getData('baseScale') || g.scaleX;
                    this.tweens.add({
                      targets: g,
                      scaleX: baseGlowScale * 1.30 * 1.08,
                      scaleY: baseGlowScale * 1.30 * 1.08,
                      duration: 150,
                      yoyo: true,
                      ease: 'Quad.easeInOut'
                    });
                  });
                }

                // 3. Brighten Nexus convergence briefly by 10-15% (smooth 300ms yoyo)
                if (this.nexusConvergence) {
                  this.tweens.add({
                    targets: this.nexusConvergence,
                    scaleX: 1.12,
                    scaleY: 1.12,
                    duration: 150,
                    yoyo: true,
                    ease: 'Quad.easeInOut'
                  });
                }

                // 4. Spawn expanding launch ripple from the Nexus convergence point
                const islandData = ISLANDS.find(i => i.key === p.key);
                const rippleColor = islandData ? islandData.themeColor : 0x00e5ff;
                const ripple = this.add.image(p.startX, p.startY, 'star');
                ripple.setScale(0.1);
                ripple.setTint(rippleColor);
                ripple.setAlpha(0.40);
                ripple.setBlendMode(Phaser.BlendModes.ADD);
                this.decorationLayer.add(ripple);
                this.tweens.add({
                  targets: ripple,
                  scaleX: 0.7,
                  scaleY: 0.7,
                  alpha: 0,
                  duration: 500,
                  ease: 'Quad.easeOut',
                  onComplete: () => ripple.destroy()
                });
              }

              const t = p.t;
              const mt = 1 - t;
              const px = mt * mt * p.startX + 2 * mt * t * p.controlX + t * t * p.endX;
              const py = mt * mt * p.startY + 2 * mt * t * p.controlY + t * t * p.endY;

              p.illuminationImg.x = px;
              p.illuminationImg.y = py;
              p.glowImg.x = px;
              p.glowImg.y = py;
              p.coreImg.x = px;
              p.coreImg.y = py;

              // Smooth 300-500ms alpha fade on select/deselect
              if ((p as any).activeAlpha === undefined) {
                (p as any).activeAlpha = 0.0;
              }
              const targetAlphaFactor = (this.selectedIslandKey === p.key) ? 1.0 : 0.0;
              (p as any).activeAlpha = Phaser.Math.Linear((p as any).activeAlpha, targetAlphaFactor, 0.08);

              // Fading in and out along the curve
              const fade = Math.sin(t * Math.PI);

              // Portal absorption shrinking (t >= 0.9)
              let scaleFactor = 1.0;
              let brightnessBoost = 1.0;
              if (t >= 0.9) {
                const progress = (t - 0.9) / 0.1; // 0.0 to 1.0
                scaleFactor = 1.0 - (progress * 0.6); // shrinks to 40% scale
                brightnessBoost = 1.0 + (progress * 0.25); // 25% brightness boost
              }

              p.illuminationImg.setScale(p.baseIllumScale * scaleFactor);
              p.glowImg.setScale(p.baseGlowScale * scaleFactor);
              p.coreImg.setScale(p.baseCoreScale * scaleFactor);

              const finalFade = fade * (p as any).activeAlpha * this.cinematicAmbienceAlphaFactor;
              p.illuminationImg.setAlpha(finalFade * 0.08 * brightnessBoost);
              p.glowImg.setAlpha(finalFade * 0.40 * brightnessBoost);
              p.coreImg.setAlpha(finalFade * 0.65 * brightnessBoost);
            });
          } else {
            // Fade out ley particles smoothly during portal entry
            this.leyLineParticles.forEach(p => {
              p.illuminationImg.alpha = Phaser.Math.Linear(p.illuminationImg.alpha, 0, 0.08);
              p.glowImg.alpha = Phaser.Math.Linear(p.glowImg.alpha, 0, 0.08);
              p.coreImg.alpha = Phaser.Math.Linear(p.coreImg.alpha, 0, 0.08);
            });
          }

          if (this.infoCard) {
            const cam = this.cameras.main;
            const screenWidth = this.scale.width;
            const screenHeight = this.scale.height;
            const cardKey = this.infoCard.getData('key');

            const cardWidth = 350;
            const cardHeight = 180;
            const gap = 60;
            const islandScreenRadius = 140;

            const islandScreenX = screenWidth / 2;
            const islandScreenY = screenHeight / 2;

            let side: 'left' | 'right' = 'left';
            if (cardKey === 'flappy' || cardKey === 'oops') {
              side = 'right';
            } else {
              side = 'left';
            }

            let targetScreenX = 0;
            if (side === 'right') {
              targetScreenX = islandScreenX + islandScreenRadius + gap;
            } else {
              targetScreenX = islandScreenX - islandScreenRadius - gap - cardWidth;
            }

            const minX = 10;
            const maxX = screenWidth - cardWidth - 10;
            targetScreenX = Phaser.Math.Clamp(targetScreenX, minX, maxX);

            const minY = 10;
            const maxY = screenHeight - cardHeight - 10;

            let targetScreenY = islandScreenY - cardHeight / 2;
            if (cardKey === 'flappy') {
              targetScreenY += 25; // Sit slightly lower than portal center
            }
            targetScreenY = Phaser.Math.Clamp(targetScreenY, minY, maxY);

            this.infoCard.x = cam.worldView.x + targetScreenX / cam.zoom;
            this.infoCard.y = cam.worldView.y + targetScreenY / cam.zoom;
            this.infoCard.setScale(1 / cam.zoom);
          }
        }

        resetMap() {
          this.closeProfilePanelImmediately();
          component.audioManager.playCardClose();
          component.audioManager.fadeToPeacefulAmbient();

          this.isTransitioning = false;
          this.selectedIslandKey = null;
          this.game.events.emit('map-reset');
          if (this.infoCard) {
            this.infoCard.destroy();
            this.infoCard = null;
          }
          if (this.selectedRingImg) {
            this.selectedRingImg.destroy();
            this.selectedRingImg = null;
          }

          // Restore all island containers to base scale, full alpha, and clear tints
          this.islandContainers.forEach(item => {
            const baseScale = item.container.getData('baseScale') || 1.0;
            item.islandImg.clearTint();
            if (item.wizardImg) {
              item.wizardImg.clearTint();
            }
            this.tweens.killTweensOf(item.container);
            this.tweens.add({
              targets: item.container,
              scaleX: baseScale,
              scaleY: baseScale,
              alpha: 1.0,
              y: item.initialY,
              duration: 600,
              ease: 'Sine.easeInOut'
            });
            this.tweens.add({
              targets: item.labelTxt,
              scaleX: 1.0,
              scaleY: 1.0,
              alpha: 1.0,
              duration: 600
            });
            const shadow = this.shadowObjs.find(s => s.data.key === item.data.key);
            if (shadow) {
              this.tweens.add({ targets: shadow.img, alpha: 0.20, duration: 600 });
            }
            const glows = this.glowObjs.filter(g => g.img.parentContainer === item.container);
            glows.forEach(glow => {
              this.tweens.add({ targets: glow.img, alpha: glow.baseAlpha, duration: 600 });
              const baseGlowScale = glow.img.getData('baseScale') || glow.img.scaleX;
              this.tweens.add({
                targets: glow.img,
                scaleX: baseGlowScale,
                scaleY: baseGlowScale,
                duration: 600,
                ease: 'Sine.easeInOut'
              });
            });
          });

          // Restore ley line graphics: neutral back to 0.92, active back to 0.0
          this.leyLineGraphics.forEach(lineG => {
            this.tweens.add({
              targets: lineG.neutralGraphics,
              alpha: 0.92,
              duration: 400,
              ease: 'Sine.easeInOut'
            });
            this.tweens.add({
              targets: lineG.activeGraphics,
              alpha: 0.0,
              duration: 400,
              ease: 'Sine.easeInOut'
            });
          });

          // Restore Nexus ring container alpha to 1.0
          if (this.runeRingObj) {
            this.runeRingObj.setAlpha(1.0);
          }

          // Pan camera back to Nexus at default zoom
          const nexusData = ISLANDS.find(i => i.isCenter)!;
          const nexusX = this.scale.width * nexusData.xPct;
          const nexusY = this.scale.height * nexusData.yPct;
          const cam = this.cameras.main;
          const camData = { scrollX: cam.scrollX, scrollY: cam.scrollY, zoom: cam.zoom };
          this.tweens.add({
            targets: camData,
            scrollX: nexusX - cam.width / 2,
            scrollY: nexusY - cam.height / 2,
            zoom: 1.0,
            duration: 700,
            ease: 'Sine.easeInOut',
            onStart: () => {
              component.audioManager.playCameraWhoosh();
            },
            onComplete: () => {
              component.audioManager.fadeCameraWhoosh();
              // Re-sync Phaser input hit regions to the restored camera transform
              this.input.enabled = false;
              this.input.enabled = true;
              this.forceResetProfileState();
            },
            onUpdate: () => {
              cam.setScroll(camData.scrollX, camData.scrollY);
              cam.setZoom(camData.zoom);
            }
          });
        }

        private showPhaserInfoCard(data: IslandData) {
          component.audioManager.playCardOpen();

          if (this.infoCard) {
            this.infoCard.destroy();
            this.infoCard = null;
          }

          const cam = this.cameras.main;
          const screenWidth = this.scale.width;
          const screenHeight = this.scale.height;

          const cardWidth = 350;
          const cardHeight = 180;
          const gap = 60;
          const islandScreenRadius = 140;

          const islandScreenX = screenWidth / 2;
          const islandScreenY = screenHeight / 2;

          let side: 'left' | 'right' = 'left';
          if (data.key === 'flappy' || data.key === 'oops') {
            side = 'right';
          } else {
            side = 'left';
          }

          let targetScreenX = 0;
          if (side === 'right') {
            targetScreenX = islandScreenX + islandScreenRadius + gap;
          } else {
            targetScreenX = islandScreenX - islandScreenRadius - gap - cardWidth;
          }

          const minX = 10;
          const maxX = screenWidth - cardWidth - 10;
          targetScreenX = Phaser.Math.Clamp(targetScreenX, minX, maxX);

          const minY = 10;
          const maxY = screenHeight - cardHeight - 10;

          let targetScreenY = islandScreenY - cardHeight / 2;
          if (data.key === 'flappy') {
            targetScreenY += 25; // Sit slightly lower than portal center
          }
          targetScreenY = Phaser.Math.Clamp(targetScreenY, minY, maxY);

          const initialX = cam.worldView.x + targetScreenX / cam.zoom;
          const initialY = cam.worldView.y + targetScreenY / cam.zoom;

          this.infoCard = this.add.container(initialX, initialY);
          this.infoCard.setData('key', data.key);
          this.infoCard.setScale(1 / cam.zoom);

          const bg = this.add.graphics();
          bg.fillStyle(0x0d0a18, 0.85);
          bg.lineStyle(2, data.themeColor, 0.6);
          bg.fillRoundedRect(0, 0, 350, 180, 12);
          bg.strokeRoundedRect(0, 0, 350, 180, 12);
          this.infoCard.add(bg);

          const titleTxt = this.add.text(175, 38, data.name, {
            fontFamily: 'Cinzel, Georgia, serif',
            fontSize: '20px',
            color: '#ffffff',
            fontStyle: 'bold'
          });
          titleTxt.setOrigin(0.5);
          this.infoCard.add(titleTxt);

          const descTxt = this.add.text(175, 84, data.description || 'Placeholder Description', {
            fontFamily: 'Outfit, Arial, sans-serif',
            fontSize: '13px',
            color: '#b3accf',
            align: 'center',
            wordWrap: { width: 300, useAdvancedWrap: true }
          });
          descTxt.setOrigin(0.5);
          this.infoCard.add(descTxt);

          // Play Now Button
          const btnBg = this.add.graphics();
          btnBg.fillStyle(data.themeColor, 0.9);
          btnBg.fillRoundedRect(175 - 75, 130, 150, 32, 6);
          this.infoCard.add(btnBg);

          // Semi-transparent hover highlight
          const btnHover = this.add.graphics();
          btnHover.fillStyle(0xffffff, 0.2);
          btnHover.fillRoundedRect(175 - 75, 130, 150, 32, 6);
          btnHover.setAlpha(0);
          this.infoCard.add(btnHover);

          const btnTxt = this.add.text(175, 146, 'PLAY NOW', {
            fontFamily: 'Outfit, Arial, sans-serif',
            fontSize: '12px',
            fontStyle: 'bold',
            color: '#ffffff'
          });
          btnTxt.setOrigin(0.5);
          this.infoCard.add(btnTxt);

          const btnZone = this.add.zone(175, 146, 150, 32);
          btnZone.setInteractive({ useHandCursor: true });
          this.infoCard.add(btnZone);

          btnZone.on('pointerover', () => {
            component.audioManager.playPlayNowHover();
            this.sys.canvas.style.cursor = 'pointer';
            this.tweens.add({
              targets: btnHover,
              alpha: 1,
              duration: 100
            });
          });

          btnZone.on('pointerout', () => {
            this.sys.canvas.style.cursor = 'default';
            this.tweens.add({
              targets: btnHover,
              alpha: 0,
              duration: 100
            });
          });

          btnZone.on('pointerdown', () => {
            btnZone.destroy();
            component.audioManager.playPlayNowClick();
            component.audioManager.playPortalTravelSequence();

            const countKey = `game-play-count-${data.key}`;
            const currentCount = parseInt(localStorage.getItem(countKey) || '0', 10);
            localStorage.setItem(countKey, (currentCount + 1).toString());

            console.log(`[PLAY CLICKED] ${this.selectedIslandKey}`);
            this.playPortalEntryAnimation(data);
          });

          this.uiLayer.add(this.infoCard);
        }

        private playPortalEntryAnimation(data: IslandData) {
          // Set the transitioning flag to true to lock ambient updates
          this.isTransitioning = true;

          // 1. Fade out the card smoothly
          if (this.infoCard) {
            const card = this.infoCard;
            this.tweens.add({
              targets: card,
              alpha: 0,
              duration: 400,
              onComplete: () => {
                card.destroy();
                if (this.infoCard === card) {
                  this.infoCard = null;
                }
              }
            });
          }

          const selectedItem = this.islandContainers.find(i => i.data.key === data.key);
          if (selectedItem) {
            this.tweens.killTweensOf(selectedItem.container);
            const baseScale = selectedItem.container.getData('baseScale') || 1.0;

            // 2. Expand selected island container smoothly so portal fills screen
            this.tweens.add({
              targets: selectedItem.container,
              scaleX: baseScale * 1.55,
              scaleY: baseScale * 1.55,
              duration: 1800,
              ease: 'Sine.easeInOut'
            });

            // 3. Intensify selected portal glows (make them larger, brighter, and pulse faster)
            const glows = this.glowObjs.filter(g => g.img.parentContainer === selectedItem.container);
            glows.forEach(glow => {
              this.tweens.killTweensOf(glow.img);
              this.tweens.add({
                targets: glow.img,
                alpha: 1.0,
                scaleX: glow.img.scaleX * 1.50,
                scaleY: glow.img.scaleY * 1.50,
                duration: 1500,
                ease: 'Sine.easeInOut'
              });
              glow.speed = data.floatSpeed * 4.0;
            });

            // 4. Expand selected perspective rune ring
            if (this.selectedRingImg) {
              this.tweens.add({
                targets: this.selectedRingImg,
                scaleX: this.selectedRingImg.scaleX * 2.5,
                scaleY: this.selectedRingImg.scaleY * 2.5,
                alpha: 0.9,
                duration: 1800,
                ease: 'Sine.easeInOut'
              });
            }

            // 5. Fade out other islands, labels, lines, and shadows (deep cinematic focus)
            this.islandContainers.forEach(item => {
              const isSelected = item.data.key === data.key;
              if (!isSelected) {
                this.tweens.add({
                  targets: item.container,
                  alpha: 0,
                  duration: 800,
                  ease: 'Sine.easeInOut'
                });
              }
              // Fade out ALL label texts for absolute visual cleanliness
              this.tweens.add({
                targets: item.labelTxt,
                alpha: 0,
                duration: 600,
                ease: 'Sine.easeInOut'
              });

              const shadow = this.shadowObjs.find(s => s.data.key === item.data.key);
              if (shadow) {
                this.tweens.add({
                  targets: shadow.img,
                  alpha: 0,
                  duration: 800
                });
              }
            });

            // Fade out all connection ley lines
            this.leyLineGraphics.forEach(lineG => {
              this.tweens.add({
                targets: [lineG.neutralGraphics, lineG.activeGraphics],
                alpha: 0,
                duration: 800
              });
            });

            // 6. Increase background fog/nebula alpha for dense, mystical atmosphere
            this.nebulaClouds.forEach(cloud => {
              this.tweens.add({
                targets: cloud.img,
                alpha: 0.45,
                duration: 1500,
                ease: 'Sine.easeInOut'
              });
            });

            // 7. Emit theme-colored particles that drift INWARD into the portal
            const portalSprite = selectedItem.glowImgs[0];
            const portalSpriteX = portalSprite ? portalSprite.x : 0;
            const portalSpriteY = portalSprite ? portalSprite.y : -61.44;

            const initialPortalWorldX = selectedItem.container.x + portalSpriteX * selectedItem.container.scaleX;
            const initialPortalWorldY = selectedItem.container.y + portalSpriteY * selectedItem.container.scaleY;

            const particleColors: Record<string, number[]> = {
              flappy: [0xffa000, 0xffd54f, 0xffeb3b],
              wavelength: [0x7e57c2, 0xb39ddb, 0xe040fb],
              reaction: [0xff7043, 0x2e7d32, 0x81c784],
              puzzle: [0x00b0ff, 0x80d8ff, 0x00e5ff],
              howfaroff: [0xb0bec5, 0xeceff1, 0xffffff],
              oops: [0xd32f2f, 0xff8a80, 0xff1744]
            };

            const colors = particleColors[data.key] || [0xffffff];

            for (let i = 0; i < 35; i++) {
              const angle = Math.random() * Math.PI * 2;
              const startDist = 140 + Math.random() * 90;
              const px = initialPortalWorldX + Math.cos(angle) * startDist;
              const py = initialPortalWorldY + Math.sin(angle) * startDist;

              const pImg = this.add.image(px, py, 'star');
              pImg.setScale(0.8 + Math.random() * 0.6);
              pImg.setTint(colors[Math.floor(Math.random() * colors.length)]);
              pImg.setAlpha(0);
              pImg.setBlendMode(Phaser.BlendModes.ADD);
              this.decorationLayer.add(pImg);

              // Drift inward toward the portal gate center
              this.tweens.add({
                targets: pImg,
                x: initialPortalWorldX,
                y: initialPortalWorldY,
                scaleX: 0.1,
                scaleY: 0.1,
                alpha: { from: 0, to: 0.85 },
                duration: 1200 + Math.random() * 600,
                ease: 'Sine.easeIn',
                onComplete: () => {
                  pImg.destroy();
                }
              });
            }

            // 8. Camera slowly glides/pans deeper toward portal (no shake, locks and tracks portalWorldX/Y dynamically)
            const cam = this.cameras.main;
            const startScrollX = cam.scrollX;
            const startScrollY = cam.scrollY;
            const startZoom = cam.zoom;
            const targetZoom = 8.0;

            const camState = { t: 0 };
            this.tweens.add({
              targets: camState,
              t: 1,
              duration: 1800,
              ease: 'Cubic.easeInOut',
              onUpdate: () => {
                const currentPortalSprite = selectedItem.glowImgs[0];
                const currentPortalSpriteX = currentPortalSprite ? currentPortalSprite.x : 0;
                const currentPortalSpriteY = currentPortalSprite ? currentPortalSprite.y : -61.44;

                const portalWorldX = selectedItem.container.x + currentPortalSpriteX * selectedItem.container.scaleX;
                const portalWorldY = selectedItem.container.y + currentPortalSpriteY * selectedItem.container.scaleY;

                const targetScrollX = portalWorldX - cam.width / 2;
                const targetScrollY = portalWorldY - cam.height / 2;

                const currentScrollX = Phaser.Math.Interpolation.Linear([startScrollX, targetScrollX], camState.t);
                const currentScrollY = Phaser.Math.Interpolation.Linear([startScrollY, targetScrollY], camState.t);
                const currentZoom = Phaser.Math.Interpolation.Linear([startZoom, targetZoom], camState.t);

                cam.setScroll(currentScrollX, currentScrollY);
                cam.setZoom(currentZoom);
              }
            });

            // 9. Full-screen theme-colored portal texture overlay fades in
            const portalFill = this.add.graphics();
            portalFill.fillStyle(data.themeColor, 1.0);
            portalFill.fillRect(0, 0, this.scale.width, this.scale.height);
            portalFill.setScrollFactor(0);
            portalFill.setAlpha(0);
            portalFill.setDepth(9999);
            this.uiLayer.add(portalFill);

            this.tweens.add({
              targets: portalFill,
              alpha: 1.0,
              delay: 1400, // Starts as camera zoom gets deep
              duration: 600,
              ease: 'Sine.easeInOut',
              onComplete: () => {
                // 10. Quick transition sequence: island color -> white -> black
                const whiteOverlay = this.add.graphics();
                whiteOverlay.fillStyle(0xffffff, 1.0);
                whiteOverlay.fillRect(0, 0, this.scale.width, this.scale.height);
                whiteOverlay.setScrollFactor(0);
                whiteOverlay.setAlpha(0);
                whiteOverlay.setDepth(9999);
                this.uiLayer.add(whiteOverlay);

                this.tweens.add({
                  targets: whiteOverlay,
                  alpha: 1.0,
                  duration: 200,
                  onComplete: () => {
                    const blackOverlay = this.add.graphics();
                    blackOverlay.fillStyle(0x000000, 1.0);
                    blackOverlay.fillRect(0, 0, this.scale.width, this.scale.height);
                    blackOverlay.setScrollFactor(0);
                    blackOverlay.setAlpha(0);
                    blackOverlay.setDepth(9999);
                    this.uiLayer.add(blackOverlay);

                    this.tweens.add({
                      targets: blackOverlay,
                      alpha: 1.0,
                      duration: 300,
                      onComplete: () => {
                        // Clean up all temporary assets and route
                        this.decorationLayer.removeAll(true);

                        const routes: Record<string, string> = {
                          flappy: '/flappy-bird',
                          wavelength: '/wavelength',
                          reaction: '/reaction-time',
                          puzzle: '/image-puzzle-info',
                          howfaroff: '/guess',
                          oops: '/oops'
                        };
                        const targetRoute = routes[data.key];

                        console.log(
                          '[PLAY ROUTE]',
                          data.key,
                          targetRoute
                        );

                        component.audioManager.fadeOutPortalTravel();
                        if (targetRoute) {
                          component.ngZone.run(() => {
                            component.router.navigate([targetRoute]);
                          });
                        }
                      }
                    });
                  }
                });
              }
            });
          }
        }

        private handleResize(gameSize: { width: number; height: number }) {
          this.drawAll();
        }
      }

      const config: PhaserType.Types.Core.GameConfig = {
        type: Phaser.AUTO,
        width: '100%',
        height: '100%',
        parent: 'phaser-game-container',
        scale: {
          mode: Phaser.Scale.RESIZE,
          autoCenter: Phaser.Scale.CENTER_BOTH
        },
        scene: [HubScene],
        physics: {
          default: 'arcade',
          arcade: {
            gravity: { x: 0, y: 0 }
          }
        }
      };

      this.game = new Phaser.Game(config);
    }

  }

  ngOnDestroy(): void {
    if (this.audioManager) {
      this.audioManager.destroy();
    }
    if (this.game) {
      this.game.destroy(true);
      this.game = null;
    }
  }
}
