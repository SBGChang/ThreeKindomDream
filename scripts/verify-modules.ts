// 模組單元測試。釘住架構文件裡宣告的不變量。
import { report } from './lib/tinytest.js';
import { run as pure } from './tests/pure.test.js';
import { run as runtime } from './tests/run.test.js';

pure();
runtime();
report();
