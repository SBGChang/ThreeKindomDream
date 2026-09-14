import { EconomyReview } from './EconomyReview.js';
import { RealmReview } from './RealmReview.js';
import { InspectionReview } from './InspectionTheater.js';
import { RigReview } from './CaocaoRig.js';
import { ArtGallery } from './ArtGallery.js';
import { StrictMode, lazy, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App.js';
import { GameInput } from './GameInput.js';
import './styles.css';
import './player.css';

const el = document.getElementById('root');
const SoldierReview = lazy(()=>import('./SoldierReview.js').then(m=>({default:m.SoldierReview})));
const UnitMotionReview = lazy(()=>import('./UnitMotionReview.js').then(m=>({default:m.UnitMotionReview})));
const UnitSequenceReview = lazy(()=>import('./UnitSequenceReview.js').then(m=>({default:m.UnitSequenceReview})));
const StoryReview = lazy(()=>import('./StoryReview.js').then(m=>({default:m.StoryReview})));
const RealtimeBattleDemo = lazy(()=>import('./RealtimeBattleDemo.js').then(m=>({default:m.RealtimeBattleDemo})));
if (el === null) throw new Error('#root 不存在');
createRoot(el).render(<StrictMode><GameInput><Suspense fallback={<p>載入驗收頁…</p>}>{new URLSearchParams(location.search).get('art')==='story'?<StoryReview/>:new URLSearchParams(location.search).get('art')==='story-play'?<App preview/>:new URLSearchParams(location.search).get('art')==='battle-demo'?<RealtimeBattleDemo/>:['unit-motion','unit-sequence'].includes(new URLSearchParams(location.search).get('art')??'')?<UnitSequenceReview/>:new URLSearchParams(location.search).get('art')==='unit-rig'?<UnitMotionReview/>:import.meta.env.DEV&&['economy','layout','dialogue'].includes(new URLSearchParams(location.search).get('art')??'')?<EconomyReview/>:new URLSearchParams(location.search).get('art')==='realms'?<RealmReview/>:['inspection','career'].includes(new URLSearchParams(location.search).get('art')??'')?<InspectionReview/>:new URLSearchParams(location.search).get('art')==='rig'?<RigReview/>:new URLSearchParams(location.search).get('art')==='soldier'?<SoldierReview/>:new URLSearchParams(location.search).get('art')==='gallery'?<ArtGallery/>:<App />}</Suspense></GameInput></StrictMode>);
import './game.css';
import './art.css';

import './task-performance.css';

import './compact-hud.css';
import './hud-art.css';

import './action-dock.css';
import './action-dock-art.css';

import './realms.css';

import './training-layout.css';

import './painted-ui.css';

import './demo-match.css';

import './inspection-theater.css';

import './realm-art.css';

import './entry-art.css';

import './run-refresh.css';

import './run-services.css';
import './system-menu.css';
