// 模組單元測試。釘住架構文件裡宣告的不變量。
import {run as economy} from './tests/economy.test.js';
import {run as dialogue} from './tests/dialogue.test.js';
import { report } from './lib/tinytest.js';
import { run as pure } from './tests/pure.test.js';
import { run as runtime } from './tests/run.test.js';

pure();
runtime();
economy();
dialogue();
report();
