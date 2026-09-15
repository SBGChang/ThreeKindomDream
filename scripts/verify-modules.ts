import { run as progressionBalance } from './tests/progression-balance.test.js';
// 模組單元測試。釘住架構文件裡宣告的不變量。
import {run as economy} from './tests/economy.test.js';
import {run as dialogue} from './tests/dialogue.test.js';
import { report } from './lib/tinytest.js';
import { run as pure } from './tests/pure.test.js';
import { run as runtime } from './tests/run.test.js';
import { run as story } from './tests/story.test.js';
import { run as storyDialogue } from './tests/story-dialogue.test.js';
import { run as teaching } from './tests/teaching.test.js';
import { run as auditRegressions } from './tests/audit-regressions.test.js';

pure();
runtime();
economy();
dialogue();
story();
storyDialogue();
teaching();
auditRegressions();
progressionBalance();
report();
