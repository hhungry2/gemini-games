import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import ts from 'typescript';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const compiled = new Map();

// Execute the real component, RAF loop and input handlers without an audio device.
export function createCountGame({ save = {}, blockedStorage = false, fullscreen = false, width = 800, height = 650 } = {}) {
  const hooks = [], effects = [], frames = new Map(), listeners = new Map();
  const storage = new Map(Object.entries(save).map(([key, value]) => [key, JSON.stringify(value)]));
  const writes = [], sounds = [];
  let cursor = 0, dirty = true, tree, clock = 1000, frame = 0, rendered;
  let random = 0.5;
  const same = (a, b) => a && b && a.length === b.length && a.every((value, index) => Object.is(value, b[index]));
  const react = {
    useState(initial) {
      const index = cursor++;
      const hook = hooks[index] ??= { value: typeof initial === 'function' ? initial() : initial };
      return [hook.value, (update) => {
        const next = typeof update === 'function' ? update(hook.value) : update;
        if (!Object.is(next, hook.value)) { hook.value = next; dirty = true; }
      }];
    },
    useRef(initial) { return hooks[cursor++] ??= { current: initial }; },
    useCallback(fn, deps) {
      const index = cursor++;
      if (!same(hooks[index]?.deps, deps)) hooks[index] = { value: fn, deps };
      return hooks[index].value;
    },
    useEffect(fn, deps) {
      const index = cursor++;
      if (!same(hooks[index]?.deps, deps)) effects.push(() => {
        hooks[index]?.cleanup?.();
        hooks[index] = { deps, cleanup: fn() };
      });
    },
  };
  const add = (type, fn) => {
    if (!listeners.has(type)) listeners.set(type, new Set());
    listeners.get(type).add(fn);
  };
  const remove = (type, fn) => listeners.get(type)?.delete(fn);
  const area = { clientWidth: width, clientHeight: height, getBoundingClientRect: () => ({ width, height }) };
  const canvas = { width: 0, height: 0, getContext: () => ({ resetTransform() {}, scale() {} }) };
  const audio = new Proxy({ isMuted: true }, {
    get: (obj, key) => key in obj ? obj[key] : () => sounds.push(key),
  });
  const muteListeners = new Set();
  let globalMuted = true;
  const sound = {
    getMuted: () => globalMuted,
    setMuted: (value) => { globalMuted = value; muteListeners.forEach((listener) => listener(value)); },
    subscribeMute: (listener) => { muteListeners.add(listener); return () => muteListeners.delete(listener); },
  };
  const document = { hidden: false, addEventListener: add, removeEventListener: remove };
  const math = Object.create(Math);
  math.random = () => random;
  const sandbox = vm.createContext({
    console, Math: math, Date, Set, Map, Object, Number,
    HTMLElement: class { closest() { return null; } }, document,
    window: { devicePixelRatio: 1.25, innerWidth: width, innerHeight: height + 64, addEventListener: add, removeEventListener: remove },
    performance: { now: () => clock },
    requestAnimationFrame: (fn) => { frames.set(++frame, fn); return frame; },
    cancelAnimationFrame: (id) => frames.delete(id),
    localStorage: {
      getItem: (key) => { if (blockedStorage) throw Error('Storage disabled'); return storage.get(key) ?? null; },
      setItem: (key, value) => { if (blockedStorage) throw Error('Quota exceeded'); storage.set(key, value); writes.push({ key, value }); },
    },
  });
  const modules = new Map();
  function load(path) {
    if (modules.has(path)) return modules.get(path).exports;
    const module = { exports: {} };
    modules.set(path, module);
    if (!compiled.has(path)) compiled.set(path, ts.transpileModule(readFileSync(path, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
    }).outputText);
    const require = (name) => {
      if (name === 'react') return react;
      if (name === 'react/jsx-runtime') return { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) };
      if (name === 'lucide-react') return new Proxy({}, { get: (_, key) => key });
      if (name.endsWith('.css')) return {};
      if (name.endsWith('utils/audio')) return { sound };
      if (name.endsWith('/audio')) return { countAudio: audio };
      if (name.endsWith('/renderer')) return { CountMastersRenderer: class { render(value) { rendered = value; } } };
      if (name.startsWith('.')) return load(resolve(dirname(path), `${name}.ts`));
      throw Error(`Unexpected import ${name}`);
    };
    vm.runInContext(`(function(module, exports, require) { ${compiled.get(path)}\n})`, sandbox)(module, module.exports, require);
    return module.exports;
  }
  const module = load(resolve(root, 'src/games/CountMastersGame.tsx'));
  const logic = load(resolve(root, 'src/games/countmasters/logic.ts'));
  const stages = load(resolve(root, 'src/games/countmasters/stages.ts'));
  const nodes = (node) => !node || typeof node !== 'object' ? [] : Array.isArray(node)
    ? node.flatMap(nodes) : [node, ...nodes(node.props?.children)];
  const text = (node) => node == null || typeof node === 'boolean' ? '' : Array.isArray(node)
    ? node.map(text).join('') : typeof node === 'object' ? text(node.props?.children) : String(node);
  function flush() {
    let count = 0;
    while (dirty) {
      assert.ok(++count < 20, 'React updates settle');
      dirty = false; cursor = 0;
      tree = module.CountMastersGame({ isDark: true, isFullscreen: fullscreen, onBackToHub() {} });
      for (const node of nodes(tree)) if (node.props?.ref) node.props.ref.current = node.type === 'canvas' ? canvas : area;
      while (effects.length) effects.shift()();
    }
  }
  const button = (label) => {
    const node = nodes(tree).find((item) => item.type === 'button'
      && (text(item).includes(label) || item.props['aria-label'] === label || item.props.title === label));
    assert.ok(node, `Button exists: ${label}`);
    return node;
  };
  const click = (label) => { const node = button(label); assert.ok(!node.props.disabled); node.props.onClick?.({}); flush(); };
  function emit(type, data = {}) {
    for (const fn of [...(listeners.get(type) ?? [])]) fn({ key: '', code: '', repeat: false, preventDefault() {}, ...data });
    flush();
  }
  function advance(seconds, hz = 60) {
    const count = Math.max(1, Math.round(seconds * hz));
    for (let i = 0; i < count; i++) {
      clock += seconds * 1000 / count;
      const pending = [...frames.values()]; frames.clear();
      pending.forEach((fn) => fn(clock)); flush();
    }
  }
  flush();
  advance(1 / 60);
  return { click, button, emit, advance, logic, stages, storage, writes, sounds, canvas, audio, sound,
    snapshot: () => rendered, text: () => text(tree), tree: () => tree,
    setRandom: (value) => { random = value; },
    hidden: () => { document.hidden = true; emit('visibilitychange'); },
    destroy: () => { for (const hook of hooks) hook?.cleanup?.(); },
  };
}
