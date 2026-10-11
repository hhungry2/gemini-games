import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const root = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../../src/games/superkart',
);
const modules = new Map();
export function load(name) {
  if (modules.has(name)) return modules.get(name);
  const module = { exports: {} };
  modules.set(name, module.exports);
  const result = ts.transpileModule(
    readFileSync(resolve(root, `${name}.ts`), 'utf8'),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    },
  );
  new Function('require', 'module', 'exports', result.outputText)(
    (specifier) => load(specifier.replace('./', '')),
    module,
    module.exports,
  );
  return module.exports;
}
