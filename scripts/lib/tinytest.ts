// 極簡測試框架。不引入 framework —— 這個專案的測試都是純函式斷言。
let passed = 0;
const failures: string[] = [];
let group = '';

export const describe = (name: string, fn: () => void): void => {
  group = name;
  fn();
  group = '';
};

export function it(name: string, fn: () => void): void {
  try {
    fn();
    passed += 1;
  } catch (e) {
    failures.push(`${group} › ${name}${chr(10)}      ${(e as Error).message}`);
  }
}

const chr = (n: number): string => String.fromCharCode(n);

export function eq<T>(actual: T, expected: T, msg = ''): void {
  const a = JSON.stringify(actual);
  const b = JSON.stringify(expected);
  if (a !== b) throw new Error(`${msg}期望 ${b}，實得 ${a}`);
}

export function near(actual: number, expected: number, tol: number, msg = ''): void {
  if (Math.abs(actual - expected) > tol) {
    throw new Error(`${msg}期望 ${expected}±${tol}，實得 ${actual}`);
  }
}

export function ok(cond: boolean, msg: string): void {
  if (!cond) throw new Error(msg);
}

export function throws(fn: () => unknown, msg: string): void {
  try {
    fn();
  } catch {
    return;
  }
  throw new Error(`${msg}（預期 throw 但沒有）`);
}

export function report(): void {
  if (failures.length === 0) {
    console.log(`verify:modules 通過（${passed} 項斷言）`);
    return;
  }
  console.error(`verify:modules 失敗（${failures.length} 項）${chr(10)}`);
  for (const f of failures) console.error(`  ✗ ${f}${chr(10)}`);
  process.exit(1);
}
