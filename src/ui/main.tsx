import { CampaignReview } from './CampaignReview.js';
import { RealmReview } from './RealmReview.js';
import { InspectionReview } from './InspectionTheater.js';
import { RigReview } from './CaocaoRig.js';
import { ArtGallery } from './ArtGallery.js';
import { StrictMode, lazy, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App.js';
import './styles.css';
import './player.css';

const el = document.getElementById('root');
const SoldierReview = lazy(()=>import('./SoldierReview.js').then(m=>({default:m.SoldierReview})));
if (el === null) throw new Error('#root 不存在');
createRoot(el).render(<StrictMode><Suspense fallback={<p>載入驗收頁…</p>}>{new URLSearchParams(location.search).get('art')==='campaign'?<CampaignReview/>:new URLSearchParams(location.search).get('art')==='realms'?<RealmReview/>:['inspection','career'].includes(new URLSearchParams(location.search).get('art')??'')?<InspectionReview/>:new URLSearchParams(location.search).get('art')==='rig'?<RigReview/>:new URLSearchParams(location.search).get('art')==='soldier'?<SoldierReview/>:new URLSearchParams(location.search).get('art')==='gallery'?<ArtGallery/>:<App />}</Suspense></StrictMode>);
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

import './campaign-prep.css';
