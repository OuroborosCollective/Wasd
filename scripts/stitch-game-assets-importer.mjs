#!/usr/bin/env node
/**
 * Autonomous Stitch asset importer for WASD client-2d.
 * Correct target: apps/client-2d/public/2d-assets/game-assets
 * Usage:
 *   node scripts/stitch-game-assets-importer.mjs --local-inbox=./asset-inbox
 *   node scripts/stitch-game-assets-importer.mjs --local-inbox=./asset-inbox --dry-run
 *   GITHUB_TOKEN=... ISSUE_NUMBER=1071 node scripts/stitch-game-assets-importer.mjs
 */
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { basename, dirname, extname, join, relative, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const REPO = process.env.GITHUB_REPOSITORY || 'OuroborosCollective/Wasd';
const TOKEN = process.env.GITHUB_TOKEN || '';
const ISSUE_NUMBER = String(process.env.ISSUE_NUMBER || '1071');
const STITCH_PROJECT_URL = 'https://stitch.withgoogle.com/projects/5320982353793182486';
const args = new Map(process.argv.slice(2).filter((a) => a.startsWith('--')).map((a) => { const [k, ...v] = a.slice(2).split('='); return [k, v.length ? v.join('=') : 'true']; }));
const dryRun = args.get('dry-run') === 'true';
const localInbox = args.get('local-inbox') || args.get('input') || null;
const scriptDir = dirname(fileURLToPath(import.meta.url));
const root = resolve(scriptDir, '..');
const publicRoot = join(root, 'apps/client-2d/public/2d-assets');
const gameAssetsRoot = join(publicRoot, 'game-assets');
const manifestPath = join(publicRoot, 'manifest.json');
const outputRoot = resolve(args.get('output') || gameAssetsRoot);
const workRoot = join(tmpdir(), `wasd-stitch-assets-${Date.now()}`);
const extractRoot = join(workRoot, 'extract');
const zipRoot = join(workRoot, 'zips');

const EXT_KIND = { '.png': 'image', '.jpg': 'image', '.jpeg': 'image', '.webp': 'image', '.gif': 'image', '.svg': 'vector', '.json': 'metadata', '.atlas': 'metadata', '.glb': 'model3d', '.gltf': 'model3d', '.fbx': 'model3d', '.obj': 'model3d', '.wav': 'audio', '.mp3': 'audio', '.ogg': 'audio', '.mp4': 'video', '.webm': 'video', '.zip': 'archive' };
const CAT = {
  models: { keys: ['character','charakter','player','npc','hero','guard','villager','samurai','mongol','warrior','knight','mage','rogue','archer','enemy','monster','boss'], frame: 256, depth: { zHeight: 2, isoFootprint: { w: 64, h: 64 }, shadow: { w: 72, h: 20, alpha: 0.35 } }, tags: ['character','npc','sprite'] },
  effects: { keys: ['effect','effects','fx','particle','spell','magic','combat','slash','fire','ice','lightning','impact','explosion','aura','hit','spark'], frame: 128, depth: { zHeight: 1, isoFootprint: { w: 32, h: 32 }, shadow: { w: 40, h: 12, alpha: 0.25 } }, tags: ['fx','particle','spell'] },
  biomes: { keys: ['biome','terrain','ground','tile','grass','forest','desert','snow','swamp','water','lava','road','stone','sand','dirt'], frame: 64, depth: { zHeight: 0, tileWidth: 64, tileHeight: 64, shadow: null }, tags: ['terrain','tile'] },
  symbols: { keys: ['symbol','icon','ui','hud','button','panel','slot','inventory','paperdoll','resource','coin','gem','ore','potion','item'], frame: 64, depth: { zHeight: 1, isoFootprint: { w: 32, h: 32 }, shadow: null }, tags: ['ui','icon'] },
  weather: { keys: ['weather','rain','snow','storm','fog','mist','cloud','wind','thunder','overlay'], frame: 128, depth: { zHeight: 0, isoFootprint: { w: 0, h: 0 }, shadow: null }, tags: ['weather','overlay'] },
  shirts: { keys: ['shirt','armor_overlay','equipment','clothing','cloth','tunic','robe','chainmail','plate','leather','helmet','boots','gloves','pants'], frame: 64, depth: { zHeight: 2, isoFootprint: { w: 64, h: 64 }, shadow: null }, tags: ['equipment','overlay'], overlay: true },
  buildings: { keys: ['building','house','wall','castle','tower','gate','door','bridge','city','village','kingdom','fort','dungeon'], frame: 256, depth: { zHeight: 3, isoFootprint: { w: 128, h: 96 }, shadow: { w: 144, h: 32, alpha: 0.3 } }, tags: ['building','world'] },
  audio: { keys: ['audio','sound','sfx','music','ambient','footstep','attack','click'], frame: 0, depth: {}, tags: ['audio'] },
  misc: { keys: [], frame: 64, depth: { zHeight: 1, isoFootprint: { w: 32, h: 32 }, shadow: null }, tags: ['misc'] }
};
const CULTURE = { samurai: ['samurai','japan','ronin','shogun','katana'], mongolian: ['mongol','steppe','khan'], medieval: ['medieval','castle','knight','kingdom','fantasy'], cyber: ['cyber','neon','electron','tech'], forest: ['forest','druid','woodland'], desert: ['desert','sand','nomad'] };
const cats = Object.keys(CAT);

function log(m,t='info'){ console.log(`[StitchGameAssets] ${t==='warn'?'⚠️':t==='dry'?'🧪':'✅'} ${m}`); }
function sh(c,a,o={}){ return execFileSync(c,a,{stdio:'pipe',encoding:'utf8',...o}); }
function slug(s,max=96){ return (String(s||'asset').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_+|_+$/g,'').replace(/_{2,}/g,'_').slice(0,max) || 'asset'); }
function files(d){ const out=[]; if(!existsSync(d)) return out; for(const x of readdirSync(d)){ const p=join(d,x), st=statSync(p); if(st.isDirectory()) out.push(...files(p)); else out.push(p); } return out.sort(); }
function readJson(p){ return JSON.parse(readFileSync(p,'utf8')); }
function writeJson(p,v){ if(dryRun){ log(`[DRY-RUN] write ${p}`,'dry'); return; } mkdirSync(dirname(p),{recursive:true}); writeFileSync(p, JSON.stringify(v,null,2)+'\n'); }
function copy(src,dst){ if(dryRun){ log(`[DRY-RUN] copy ${src} -> ${dst}`,'dry'); return; } mkdirSync(dirname(dst),{recursive:true}); copyFileSync(src,dst); }
function hash(p){ return crypto.createHash('sha256').update(readFileSync(p)).digest('hex'); }
function tokens(p,base){ const rel=relative(base,p), ext=extname(p); return (ext?rel.slice(0,-ext.length):rel).split(/[\\/_.\-\s]+/g).map((x)=>slug(x,48)).filter(Boolean); }
function score(ts,ks){ let n=0; for(const t of ts) for(const k of ks) n += t===k ? 5 : t.includes(k) ? 3 : (k.includes(t)&&t.length>=4) ? 1 : 0; return n; }
function kind(p){ return EXT_KIND[extname(p).toLowerCase()] || 'binary'; }
function category(p,base){ const k=kind(p), ts=tokens(p,base); if(k==='audio') return 'audio'; if(k==='metadata') return 'misc'; let best='misc', bs=0; const order=['shirts','weather','effects','biomes','models','symbols','buildings']; for(const c of order){ const s=score(ts,CAT[c].keys); if(s>bs){ best=c; bs=s; } } if(k==='model3d' && best==='misc') return 'models'; if(k==='image' && best==='misc') return 'effects'; return best; }
function culture(p,base){ const ts=tokens(p,base); let best='cross-cultural', bs=0; for(const [c,ks] of Object.entries(CULTURE)){ const s=score(ts,ks); if(s>bs){ best=c; bs=s; } } return best; }
function pngSize(p){ try{ const b=readFileSync(p); if(b.length>=24 && b[0]===0x89 && b[1]===0x50 && b[2]===0x4e && b[3]===0x47) return { width:b.readUInt32BE(16), height:b.readUInt32BE(20) }; }catch{} return null; }
function ensureManifest(m){ m.version??=1; m.generatedAt=new Date().toISOString(); m.basePath??='/2d-assets'; m.sources??=[]; m.fallbacks??={}; for(const c of cats) m[c]??={}; m.gameAssets??={}; return m; }
function gameManifest(src){ return { version:2, generatedAt:new Date().toISOString(), mode:'deterministic-open-detection', source:src, stitchProjectUrl:STITCH_PROJECT_URL, basePath:'/2d-assets/game-assets', outputPath:'apps/client-2d/public/2d-assets/game-assets', categories:cats, sources:[], stats:{totalFiles:0, importedFiles:0, skippedFiles:0}, assets:Object.fromEntries(cats.map((c)=>[c,{}])), index:[] }; }
function atlasJson({imageName,id,frameSize,size,cat}){ const w=size?.width || frameSize*4, h=size?.height || frameSize*4, cols=Math.max(1,Math.floor(w/frameSize)), rows=Math.max(1,Math.floor(h/frameSize)); const frames={}, names=[]; for(let i=0;i<cols*rows;i++){ const n=`${id}_frame_${String(i+1).padStart(2,'0')}`; names.push(n); frames[n]={ frame:{x:(i%cols)*frameSize,y:Math.floor(i/cols)*frameSize,w:frameSize,h:frameSize}, rotated:false, trimmed:false, spriteSourceSize:{x:0,y:0,w:frameSize,h:frameSize}, sourceSize:{w:frameSize,h:frameSize}, anchor:{x:0.5,y:cat==='models'?0.9:cat==='shirts'?0.85:0.5} }; } return { frames, animations:{ [`${id}_${cat==='models'?'default':'loop'}`]:names }, meta:{ app:'Areloria WASD Stitch Importer', image:imageName, size:{w,h}, scale:'1' } }; }
async function gh(path){ if(!TOKEN) throw new Error('GITHUB_TOKEN required or use --local-inbox'); const r=await fetch(`https://api.github.com${path}`,{headers:{Authorization:`Bearer ${TOKEN}`,Accept:'application/vnd.github+json','User-Agent':'wasd-stitch-assets'}}); if(!r.ok) throw new Error(`${r.status} ${await r.text()}`); return r.json(); }

async function importDir(base, rootManifest, gm, source='local-inbox'){
  const all=files(base), jsons=all.filter((p)=>extname(p).toLowerCase()==='.json'); gm.stats.totalFiles+=all.length; log(`Scanning ${all.length} files from ${base}`);
  for(const p of all){ try{
    if(kind(p)==='archive'){ gm.stats.skippedFiles++; continue; }
    const cat=category(p,base), cfg=CAT[cat], group=culture(p,base), h=hash(p), k=kind(p), ext=extname(p).toLowerCase(), size=k==='image'?pngSize(p):null;
    const id=slug(['stitch',cat,group,k,...tokens(p,base).slice(-4),size?`${size.width}x${size.height}`:'nosize',h.slice(0,10)].join('_'),120);
    const dir=join(outputRoot,id), name=`${id}${ext||'.bin'}`; copy(p,join(dir,name));
    let atlas=null; if(k==='image' && ['.png','.jpg','.jpeg','.webp'].includes(ext)){ const an=`${id}.json`; writeJson(join(dir,an), atlasJson({imageName:name,id,frameSize:cfg.frame||64,size,cat})); atlas=`/2d-assets/game-assets/${id}/${an}`; }
    const entry={ id, src:`/2d-assets/game-assets/${id}/${name}`, originalSrc:`/2d-assets/game-assets/${id}/${name}`, atlas, source, sourcePath:relative(base,p), kind:k, category:cat, group, hash:h, sizeBytes:statSync(p).size, tags:['stitch','game-asset',k,cat,group,...cfg.tags], ...cfg.depth };
    if(cfg.overlay){ entry.overlay=true; entry.layer='equipment-overlay'; entry.anchorY=0.85; }
    writeJson(join(dir,`${id}.meta.json`),entry); gm.assets[cat][id]=entry; gm.index.push({id,category:cat,kind:k,group,src:entry.src,atlas,sourcePath:entry.sourcePath}); rootManifest[cat][id]=entry; rootManifest.gameAssets[id]={id,category:cat,kind:k,group,src:entry.src,atlas,tags:entry.tags}; gm.stats.importedFiles++;
  }catch(e){ gm.stats.skippedFiles++; log(`Skipped ${relative(base,p)}: ${e.message}`,'warn'); } }
}
async function importIssue(rootManifest,gm){ const issue=await gh(`/repos/${REPO}/issues/${ISSUE_NUMBER}`), comments=await gh(`/repos/${REPO}/issues/${ISSUE_NUMBER}/comments?per_page=100`); const text=[issue.body||'',...comments.map((c)=>c.body||'')].join('\n'); const urls=[...new Set([...text.matchAll(/https:\/\/github\.com\/user-attachments\/files\/[^\s)\]]+\.zip/gi)].map((m)=>m[0]))]; for(const [i,u] of urls.entries()){ const name=slug(decodeURIComponent(u.split('/').pop()||`pack_${i}.zip`)), zp=join(zipRoot,`${name}.zip`), ex=join(extractRoot,name); gm.sources.push({name,url:u}); if(dryRun) continue; mkdirSync(ex,{recursive:true}); sh('curl',['-L','--fail','--retry','3','-o',zp,u],{stdio:'inherit'}); sh('unzip',['-q','-o',zp,'-d',ex],{stdio:'inherit'}); await importDir(ex,rootManifest,gm,name); } }
async function main(){ log(`2D target locked: ${gameAssetsRoot}`); if(!dryRun){ rmSync(workRoot,{recursive:true,force:true}); mkdirSync(extractRoot,{recursive:true}); mkdirSync(zipRoot,{recursive:true}); mkdirSync(outputRoot,{recursive:true}); mkdirSync(publicRoot,{recursive:true}); } const rootManifest=existsSync(manifestPath)?ensureManifest(readJson(manifestPath)):ensureManifest({}); const gm=gameManifest(localInbox?'local-inbox':`issue-${ISSUE_NUMBER}`); if(localInbox){ const inbox=resolve(localInbox); if(!existsSync(inbox)) throw new Error(`Missing inbox: ${inbox}`); gm.sources.push({name:'local-inbox',path:inbox}); await importDir(inbox,rootManifest,gm); } else await importIssue(rootManifest,gm); gm.index.sort((a,b)=>a.category.localeCompare(b.category)||a.kind.localeCompare(b.kind)||a.id.localeCompare(b.id)); writeJson(join(outputRoot,'manifest.json'),gm); writeJson(manifestPath,rootManifest); if(!dryRun) rmSync(workRoot,{recursive:true,force:true}); log(`Done imported=${gm.stats.importedFiles} skipped=${gm.stats.skippedFiles}`); }
main().catch((e)=>{ console.error(`[StitchGameAssets] ❌ ${e.stack||e.message}`); process.exit(1); });
