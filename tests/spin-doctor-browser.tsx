import React from 'react';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import '../src/index.css';
import traces from './fixtures/spin-doctor-playthroughs.json';

// This page is a local test entry point, excluded from the production build.
// Only the browser clock, normal inputs and test storage are controlled.
// The game component and all physics/collision/clear/save handlers are real.
const nativeRAF = window.requestAnimationFrame.bind(window);
let clock = 10000;
let frameId = 0;
const frames = new Map<number, FrameRequestCallback>();
window.requestAnimationFrame = (callback) => { frames.set(++frameId, callback); return frameId; };
window.cancelAnimationFrame = (id) => { frames.delete(id); };
Object.defineProperty(performance, 'now', { configurable: true, value: () => clock });
const testStorage = new Map<string, string>([['gemini_games_muted_v1', 'true']]);
const storageGet = Storage.prototype.getItem;
const storageSet = Storage.prototype.setItem;
Storage.prototype.getItem = function (key) {
  return key === 'spindoctor_save_v1' || key === 'gemini_games_muted_v1'
    ? testStorage.get(key) ?? null : storageGet.call(this, key);
};
Storage.prototype.setItem = function (key, value) {
  if (key === 'spindoctor_save_v1' || key === 'gemini_games_muted_v1') testStorage.set(key, value);
  else storageSet.call(this, key, value);
};
const { SpinDoctorGame } = await import('../src/games/SpinDoctorGame');
const { sound } = await import('../src/utils/audio');
sound.setMuted(true);
const host = document.querySelector<HTMLDivElement>('#game')!;
const root = createRoot(host);
const status = document.querySelector<HTMLSpanElement>('#status')!;
const results = document.querySelector<HTMLTableSectionElement>('#results')!;
const runButton = document.querySelector<HTMLButtonElement>('#run')!;
const proof = document.querySelector<HTMLParagraphElement>('#proof')!;
flushSync(() => root.render(<SpinDoctorGame isDark onBackToHub={() => {}} />));

runButton.onclick = () => {
  runButton.disabled = true;
  let stageIndex = 0;
  let frame = 0;
  let inputIndex = 0;
  let totalFrames = 0;
  let lastNativeTime: number | undefined;
  let accumulator = 0;
  const fail = (message: string) => {
    status.textContent = `FAIL: ${message}・音声 OFF`;
    status.style.color = '#fca5a5';
  };
  const tick = () => {
    const trace = traces[stageIndex];
    for (; inputIndex < trace.inputs.length && trace.inputs[inputIndex].frame === frame; inputIndex++) {
      const code = trace.inputs[inputIndex].code;
      flushSync(() => {
        window.dispatchEvent(new KeyboardEvent('keydown', { code, bubbles: true, cancelable: true }));
        if (code !== 'KeyW') window.dispatchEvent(new KeyboardEvent('keyup', { code, bubbles: true }));
      });
    }
    if (sound.getMuted() !== true) { sound.setMuted(true); fail('ミュートが解除されました'); return false; }
    if (host.textContent?.includes('MISS!')) { fail(`ステージ ${trace.stage} でミス`); return false; }
    if (frame === trace.frames) {
      const record = JSON.parse(testStorage.get('spindoctor_save_v1') ?? '{}').records?.[trace.stage];
      if (!host.textContent?.includes('STAGE CLEAR!') || record?.cleared !== true) {
        fail(`ステージ ${trace.stage} のクリア画面・保存結果が一致しません`); return false;
      }
      const row = results.insertRow();
      for (const value of [trace.stage, 'CLEAR', (frame / 60).toFixed(2), record.stars]) row.insertCell().textContent = String(value);
      row.style.color = '#86efac';
      row.style.height = '25px';
      if (++stageIndex === traces.length) {
        status.textContent = 'PASS 15 / 15・音声 OFF';
        proof.textContent = '全15ステージを新規セーブから順にクリア。ミス・Undo・状態書き換えなし。クリア画面・15件の保存記録を照合済み。';
        return false;
      }
      const next = [...host.querySelectorAll('button')].find(button => button.textContent?.includes('次のステージ'));
      if (!next || next.disabled) { fail('次のステージへ進めません'); return false; }
      flushSync(() => next.click());
      frame = 0;
      inputIndex = 0;
      status.textContent = `実行中 ${stageIndex + 1} / 15・音声 OFF`;
      return true;
    }
    clock = 10000 + ++totalFrames * 1000 / 60;
    const pending = [...frames.values()];
    frames.clear();
    flushSync(() => pending.forEach(callback => callback(clock)));
    frame++;
    return true;
  };
  status.textContent = '実行中 1 / 15・音声 OFF';
  const animate = (now: number) => {
    if (lastNativeTime !== undefined) accumulator += Math.min(now - lastNativeTime, 250);
    lastNativeTime = now;
    while (accumulator >= 1000 / 60) {
      accumulator -= 1000 / 60;
      if (!tick()) return;
    }
    nativeRAF(animate);
  };
  nativeRAF(animate);
};
