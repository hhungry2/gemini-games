import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import ts from 'typescript';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const compiledModules = new Map();

// Run the actual component and its RAF/input handlers with a deterministic clock.
// No browser globals, audio devices, or extra test dependencies are required.
export function createGame(storedSave) {
  const hooks = [];
  let cursor = 0;
  let dirty = true;
  let tree;
  let clock = 10000;
  let frameId = 0;
  const frames = new Map();
  const effects = [];
  const listeners = new Map();
  const storage = new Map(storedSave ? [['spindoctor_save_v1', JSON.stringify(storedSave)]] : []);
  const writes = [];
  const sameDeps = (a, b) => a && b && a.length === b.length && a.every((v, i) => Object.is(v, b[i]));
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
      if (!sameDeps(hooks[index]?.deps, deps)) hooks[index] = { value: fn, deps };
      return hooks[index].value;
    },
    useEffect(fn, deps) {
      const index = cursor++;
      if (!sameDeps(hooks[index]?.deps, deps)) effects.push(() => {
        hooks[index]?.cleanup?.();
        hooks[index] = { deps, cleanup: fn() };
      });
    },
  };
  const context = new Proxy({}, { get: (obj, key) => obj[key] ?? (() => {}), set: (obj, key, val) => { obj[key] = val; return true; } });
  const canvas = { width: 800, height: 560, getContext: () => context };
  const area = { clientWidth: 800, clientHeight: 560 };
  const addEventListener = (type, fn) => {
    if (!listeners.has(type)) listeners.set(type, new Set());
    listeners.get(type).add(fn);
  };
  const removeEventListener = (type, fn) => listeners.get(type)?.delete(fn);
  const sandbox = vm.createContext({
    console, Math, Date, Set, Map,
    HTMLElement: class { closest() { return null; } },
    window: { devicePixelRatio: 1, addEventListener, removeEventListener },
    document: { hidden: false, addEventListener, removeEventListener },
    localStorage: {
      getItem: (key) => storage.get(key) ?? null,
      setItem: (key, value) => { storage.set(key, value); writes.push(key); },
    },
    performance: { now: () => clock },
    requestAnimationFrame: (fn) => { frames.set(++frameId, fn); return frameId; },
    cancelAnimationFrame: (id) => frames.delete(id),
    ResizeObserver: class { observe() {} disconnect() {} },
  });
  const cache = new Map();
  const sound = new Proxy({ getMuted: () => true }, { get: (obj, key) => obj[key] ?? (() => {}) });
  function load(path) {
    if (cache.has(path)) return cache.get(path).exports;
    const module = { exports: {} };
    cache.set(path, module);
    if (!compiledModules.has(path)) compiledModules.set(path, ts.transpileModule(readFileSync(path, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
    }).outputText);
    const code = compiledModules.get(path);
    const require = (name) => {
      if (name === 'react') return react;
      if (name === 'react/jsx-runtime') return { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) };
      if (name === 'lucide-react') return new Proxy({}, { get: (_, key) => key });
      if (name.endsWith('/audio')) return { sound };
      if (name.startsWith('.')) return load(resolve(dirname(path), `${name}.ts`));
      throw new Error(`Unexpected import: ${name}`);
    };
    vm.runInContext(`(function (module, exports, require) { ${code}\n})`, sandbox)(module, module.exports, require);
    return module.exports;
  }
  const { SpinDoctorGame, STAGES } = load(resolve(root, 'src/games/SpinDoctorGame.tsx'));
  const logic = load(resolve(root, 'src/games/spinDoctorLogic.ts'));
  const nodes = (node) => !node || typeof node !== 'object' ? []
    : Array.isArray(node) ? node.flatMap((child) => nodes(child))
    : [node, ...nodes(node.props?.children)];
  const text = (node) => node == null || typeof node === 'boolean' ? ''
    : Array.isArray(node) ? node.map(text).join('')
    : typeof node === 'object' ? text(node.props?.children) : String(node);
  function flush() {
    let count = 0;
    while (dirty) {
      assert.ok(++count < 20, 'Component must settle without a render loop');
      dirty = false;
      cursor = 0;
      tree = SpinDoctorGame({ isDark: true, onBackToHub() {} });
      for (const node of nodes(tree)) {
        if (node.props?.ref) node.props.ref.current = node.type === 'canvas' ? canvas : area;
      }
      while (effects.length) effects.shift()();
    }
  }
  function emit(type, extra = {}) {
    for (const fn of [...(listeners.get(type) ?? [])]) fn({ code: '', repeat: false, preventDefault() {}, ...extra });
    flush();
  }
  function button(label) {
    const found = nodes(tree).find((node) => node.type === 'button'
      && (text(node).includes(label) || node.props['aria-label'] === label || node.props.title === label));
    assert.ok(found, `Button exists: ${label}`);
    return found;
  }
  function click(label) { button(label).props.onClick?.({ detail: 0 }); flush(); }
  function advance(seconds, hz = 60) {
    const count = Math.round(seconds * hz);
    for (let i = 0; i < count; i++) {
      clock += seconds * 1000 / count;
      const pending = [...frames.values()];
      frames.clear();
      pending.forEach((fn) => fn(clock));
      flush();
    }
  }
  flush();
  const state = () => hooks.find((hook) => hook?.current?.pivotPinId !== undefined).current;
  function selectStage(number) {
    click(`STAGE ${state().stage.stageNumber}`);
    click(`#${number}`);
  }
  return { state, logic, STAGES, advance, emit, click, button, nodes: () => nodes(tree), text: () => text(tree),
    key: (code, extra) => emit('keydown', { code, ...extra }), storage, writes, selectStage };
}
