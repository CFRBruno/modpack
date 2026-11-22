// Gera data/mods.js a partir de tools/src/* conferindo cada mod na API do Modrinth.
//   node tools/verify.mjs            (usa cache em tools/.cache.json, se existir)
//   node tools/verify.mjs --fresh    (ignora o cache)
// Para cada mod: acha o projeto, lista as builds Fabric, define em quais versões (A–E) existe build
// não-alpha, lê as dependências obrigatórias da build mais recente e grava slug/downloads/data.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import existingOv from './src/existing.mjs';
import newRows1 from './src/new.mjs';
import newRows2 from './src/new2.mjs';
const newRows=[...newRows1,...newRows2];

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const CACHE=path.join(ROOT,'tools','.cache.json');
const API='https://api.modrinth.com/v2';
const UA='modpack-planner-verify/1.0';
const fresh=process.argv.includes('--fresh');
let cache={};try{if(!fresh)cache=JSON.parse(fs.readFileSync(CACHE,'utf8'))}catch{}
const save=()=>fs.writeFileSync(CACHE,JSON.stringify(cache));

/* Versões do app (mantenha igual ao VERS em index.html) */
const TIERS=[
  {t:'A',match:g=>g==='1.20.1'},
  {t:'B',match:g=>g==='1.21.1'},
  {t:'C',match:g=>g==='1.21.11'},
  {t:'D',match:g=>/^26\.1(\.|$)/.test(g)},
  {t:'E',match:g=>/^26\.2(\.|$)/.test(g)},
  {t:'F',match:g=>/^26\.3(\.|$)/.test(g)}
];
const norm=s=>String(s).replace(/\[[^\]]*\]/g,' ').replace(/\([^)]*\)/g,' ').replace(/\s[-–—]\s*(fabric|quilt).*$/i,' ').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[’'`´]/g,'').replace(/[^a-z0-9]+/g,'');
const fixq=s=>String(s).replace(/[’`´]/g,"'");
let last=0;
async function get(url){
  if(cache[url])return cache[url];
  for(let tr=0;tr<5;tr++){
    const w=Math.max(0,230-(Date.now()-last));if(w)await new Promise(r=>setTimeout(r,w));last=Date.now();
    const r=await fetch(url,{headers:{'User-Agent':UA}});
    if(r.status===429){await new Promise(r=>setTimeout(r,8000));continue}
    if(!r.ok)throw new Error(url+' -> '+r.status);
    const j=await r.json();cache[url]=j;return j;
  }
  throw new Error('rate limit '+url);
}
const DROP=new Set(['croptopia']);               // não existe build Fabric no Modrinth
const SLUG={runes:'runes',megashowdown:'cobblemon-mega-showdown',fabricskyboxes:'nuit',vinery:'lets-do-vinery',candlelight:'lets-do-candlelight',meadow:'lets-do-meadow',bakery:'lets-do-bakery',noisium:'noisiumforked',chunkanimator:'chunk-animator-plus'};
const PATCH={
  fabricskyboxes:{name:'Nuit',desc:'Céus personalizados por resource pack, com estrelas, nebulosas e dimensões próprias. Sucessor do FabricSkyBoxes; só visual.'},
  noisium:{name:'Noisium (Forked)',desc:'Acelera a geração do terreno sem alterar o resultado. O mundo novo carrega mais rápido.'},
  candlelight:{desc:'Restaurante medieval com pratos, velas e utensílios. Versão legada; o Farm & Charm a substitui.'},
  bakery:{desc:'Pães, bolos e padaria com receitas variadas. Versão legada; o Farm & Charm a substitui.'}
};
const EXTRA={universalgraves:{grp:'graves'},waystones:{grp:'waystone'},lambdynlights:{grp:'dynlights'},continuity:{grp:'ctm'},fabricseasons:{grp:'seasons'}};
const QOVR={create:'Create Fabric',c2me:'Concurrent Chunk Management Engine',skinlayers:'3D Skin Layers',rso:'Reese\'s Sodium Options',farmersdelight:'Farmer\'s Delight Refabricated',spellengine:'Spell Engine',jade:'Jade',wthit:'WTHIT',lithium:'Lithium',moonlight:'Moonlight'};

/* ---- monta a lista base ---- */
const orig=JSON.parse(fs.readFileSync('/tmp/existing.json','utf8'));
const recs=[];
for(const r of orig){
  const [id,name,cat,desc,aff,ram,cpu,inv,ver,o]=r,ov=existingOv[id];
  if(!ov)console.warn('sem override:',id);
  const op={...(o||{})};delete op.nofapi;
  recs.push({id,name,cat:ov?ov[0]:cat,sub:ov?ov[1]:'',desc:ov?ov[2]:desc,aff:aff||'',ram,cpu,inv,ver0:ver,opts:op,origDep:o&&o.dep,nofapi:!!(o&&o.nofapi)});
}
for(const r of newRows){
  const [id,name,cat,sub,desc,aff,ram,cpu,inv,o]=r;
  recs.push({id,name,cat,sub,desc,aff:aff||'',ram,cpu,inv,ver0:'',opts:{...(o||{})},isNew:true});
}
for(let i=recs.length-1;i>=0;i--)if(DROP.has(recs[i].id))recs.splice(i,1);
for(const r of recs){
  if(SLUG[r.id])r.opts.slug=SLUG[r.id];
  if(PATCH[r.id])Object.assign(r,PATCH[r.id]);
  if(EXTRA[r.id])Object.assign(r.opts,EXTRA[r.id]);
}
const seen=new Set();for(const r of recs){if(seen.has(r.id))throw new Error('id repetido '+r.id);seen.add(r.id)}

/* ---- resolve um projeto ---- */
async function findProject(q){
  const nq=norm(q),facets=encodeURIComponent('[["project_type:mod"],["categories:fabric"]]');
  const j=await get(`${API}/search?query=${encodeURIComponent(fixq(q))}&facets=${facets}&limit=20`);
  let best=null;
  for(const h of j.hits||[]){
    const nt=norm(h.title),sc=nt===nq?3:(nt.startsWith(nq)?2:(nt.includes(nq)||(nt.length>=8&&nq.includes(nt))?1:0));
    if(sc&&(!best||sc>best.sc||(sc===best.sc&&h.downloads>best.h.downloads)))best={sc,h};
  }
  return best;
}
async function loadVersions(pid){
  return get(`${API}/project/${pid}/version?loaders=${encodeURIComponent('["fabric"]')}&include_changelog=false`);
}
function analyse(vs){
  const tiers={},alpha={};let latest=null;
  for(const v of vs){
    const d=v.date_published;if(!latest||d>latest)latest=d;
    for(const T of TIERS){
      if((v.game_versions||[]).some(T.match)){
        if(v.version_type==='alpha'){alpha[T.t]=1}else tiers[T.t]=1;
      }
    }
  }
  let ver='';for(const T of TIERS)if(tiers[T.t])ver+=T.t;
  const av='';let aOnly='';for(const T of TIERS)if(!tiers[T.t]&&alpha[T.t])aOnly+=T.t;
  /* deps obrigatórias da build não-alpha mais recente de CADA versão do app */
  const sorted=vs.slice().sort((a,b)=>String(b.date_published).localeCompare(String(a.date_published)));
  const tierDeps={};
  for(const T of TIERS){
    const v=sorted.find(x=>x.version_type!=='alpha'&&(x.game_versions||[]).some(T.match));
    if(v)tierDeps[T.t]=(v.dependencies||[]).filter(d=>d.dependency_type==='required'&&d.project_id).map(d=>d.project_id);
  }
  const deps=[...new Set(Object.values(tierDeps).flat())];
  const tu={};
  for(const T of TIERS){const v=sorted.find(x=>x.version_type!=='alpha'&&(x.game_versions||[]).some(T.match));if(v){const d=String(v.date_published);tu[T.t]=+(d.slice(2,4)+d.slice(5,7))}}
  return {ver,aOnly,latest:latest?latest.slice(0,10):'',deps,tierDeps,tu};
}

const byPid={},report={unmatched:[],fuzzy:[],noFabricTier:[],stale:[],alpha:[]};
async function resolve(r){
  if(r.id==='shaders'){r.ver='ABCDE';r.slug='';r.pid='';r.deps=[];return}
  const q=r.opts.q||QOVR[r.id]||r.name;
  let m;
  if(r.opts.slug){const pr=await get(`${API}/project/${r.opts.slug}`);m={sc:3,h:{project_id:pr.id,slug:pr.slug,title:pr.title,downloads:pr.downloads}}}
  else m=await findProject(q);
  if(!m){report.unmatched.push(r.id+' ('+q+')');return}
  if(m.sc<3)report.fuzzy.push(r.id+' → '+m.h.title);
  r.pid=m.h.project_id;r.slug=m.h.slug;r.dl=m.h.downloads;r.title=m.h.title;
  const vs=await loadVersions(r.pid),a=analyse(vs);
  r.ver=a.ver;r.upd=a.latest;r.apiDeps=a.deps;r.tierDeps=a.tierDeps;r.tu=a.tu;
  if(a.aOnly)report.alpha.push(r.id+': só alpha em '+a.aOnly);
  if(!a.ver)report.noFabricTier.push(r.id);
  byPid[r.pid]=r;
}
for(const r of recs){await resolve(r);process.stdout.write('.')}
console.log();
save();

/* ---- dependências obrigatórias não catalogadas viram bibliotecas ---- */
const extra=[];let guard=0,pending=true;
while(pending&&guard++<4){
  pending=false;
  const need=new Set();
  for(const r of [...recs,...extra])for(const p of (r.apiDeps||[]))if(!byPid[p])need.add(p);
  for(const p of need){
    let pr;try{pr=await get(`${API}/project/${p}`)}catch(e){console.warn('dep inacessível',p);byPid[p]={skip:1};continue}
    if(pr.project_type!=='mod'){byPid[p]={skip:1};continue}
    const id=pr.slug.replace(/[^a-z0-9-]/g,'');
    const r={id,name:pr.title,cat:'Bibliotecas',sub:'Núcleo',desc:'',aff:'',ram:8,cpu:0,inv:0,ver0:'',opts:{lib:1},isNew:true,auto:true,pid:p,slug:pr.slug,dl:pr.downloads,title:pr.title};
    const vs=await loadVersions(p),a=analyse(vs);r.ver=a.ver;r.upd=a.latest;r.apiDeps=a.deps;r.tierDeps=a.tierDeps;r.tu=a.tu;
    byPid[p]=r;extra.push(r);pending=true;
    process.stdout.write('+');
  }
}
console.log();save();
const all=[...recs,...extra].filter(r=>r.pid||r.id==='shaders');

/* ---- finaliza deps e textos ---- */
const idByPid={};for(const r of all)if(r.pid)idByPid[r.pid]=r.id;
const usedBy={};
const mapDeps=(r,T)=>{
  const out=[];
  for(const p of ((r.tierDeps&&r.tierDeps[T])||[])){const i=idByPid[p];if(i&&i!==r.id&&!out.includes(i))out.push(i)}
  for(const d of (r.opts.dep||[]))if(!out.includes(d)&&d!==r.id)out.push(d);
  if(r.id==='shaders'&&!out.includes('iris'))out.push('iris');
  return out;
};
for(const r of all){
  r.dt={};
  const tiers=r.id==='shaders'?'ABCDEF':(r.ver||'');
  for(const T of tiers)r.dt[T]=mapDeps(r,T);
  const un=[...new Set(Object.values(r.dt).flat())];
  for(const d of un)(usedBy[d]=usedBy[d]||[]).push(r.name);
}
for(const r of all)if(r.auto){
  const u=usedBy[r.id]||[];
  r.desc='Biblioteca exigida por '+(u.slice(0,3).join(', ')||'outros mods')+(u.length>3?' e mais '+(u.length-3):'')+'. Sozinha não muda nada no jogo.';
  r.sub='Núcleo';
}
/* descarta bibliotecas automáticas que ninguém usa */
const final=all.filter(r=>!r.auto||((usedBy[r.id]||[]).length&&r.ver));
const finalIds=new Set(final.map(r=>r.id));
/* dependências: só as que existem no catálogo e têm build na mesma versão */
const ids=finalIds,byId0={};for(const r of final)byId0[r.id]=r;
let dropped=0;
for(const r of final){
  for(const T of Object.keys(r.dt))r.dt[T]=r.dt[T].sort().filter(d=>{const x=byId0[d];if(!x)return false;if(x.ver&&!x.ver.includes(T)){dropped++;return false}return true});
  const keys=Object.keys(r.dt).sort(),top=keys[keys.length-1];
  r.dep=top?r.dt[top]:[];
  const diff={};for(const T of keys)if(JSON.stringify(r.dt[T])!==JSON.stringify(r.dep))diff[T]=r.dt[T];
  r.dtDiff=diff;
}
console.log('dependências descartadas por não ter build na mesma versão:',dropped);
/* conflitos que apontam para mod inexistente */
for(const r of final)if(r.opts.con)r.opts.con=r.opts.con.filter(c=>ids.has(c));

const order=['Otimização','Bibliotecas','Interface & QoL','Mapas & Navegação','Visual & Som','Mundo & Estruturas','Aventura & Combate','Itens & Equipamentos','Tecnologia','Armazenamento','Magia','Sobrevivência','Comida & Fazenda','Criaturas','Construção','Ferramentas & Utilidades'];
final.sort((a,b)=>order.indexOf(a.cat)-order.indexOf(b.cat)||(b.dl||0)-(a.dl||0));
const out=final.map(r=>{
  const o={id:r.id,name:r.name,cat:r.cat,sub:r.sub,desc:r.desc,aff:r.aff,ram:r.ram,cpu:r.cpu,inv:r.inv,ver:r.ver,dep:r.dep};
  if(Object.keys(r.dtDiff).length)o.dt=r.dtDiff;
  for(const k of ['core','fragile','lib','gpu','heavy'])if(r.opts[k])o[k]=1;
  if(r.opts.note)o.note=r.opts.note;if(r.opts.grp)o.grp=r.opts.grp;if(r.opts.con&&r.opts.con.length)o.con=r.opts.con;
  if(r.slug)o.slug=r.slug;if(r.dl)o.dl=r.dl;if(r.upd)o.upd=r.upd;
  if(r.tu&&Object.keys(r.tu).length)o.tu=r.tu;
  return JSON.stringify(o);
});
const stamp=new Date().toISOString().slice(0,10);
fs.mkdirSync(path.join(ROOT,'data'),{recursive:true});
fs.writeFileSync(path.join(ROOT,'data','mods.js'),
 '/* Gerado por tools/verify.mjs em '+stamp+' a partir da API do Modrinth (loader Fabric). Não edite à mão: altere tools/src/* e rode de novo. */\n'
 +'window.FORJA_DATA={generated:"'+stamp+'",mods:[\n'+out.join(',\n')+'\n]};\n');
/* stale: sem build em B..E e atualizado há mais de 2 anos */
for(const r of final){if(r.upd&&!/[BCDE]/.test(r.ver))report.stale.push(r.id+' (última '+r.upd+', ver '+(r.ver||'—')+')')}
console.log('mods:',final.length,'(novos auto-libs:',final.filter(r=>r.auto).length+')');
console.log(JSON.stringify(report,null,1));
const dist={};for(const r of final)for(const c of r.ver)dist[c]=(dist[c]||0)+1;console.log('por versão',dist);
// diferenças com a estimativa antiga
const diff=final.filter(r=>r.ver0&&r.ver0!==r.ver).map(r=>r.id+': '+r.ver0+' → '+(r.ver||'—'));
console.log('mudou vs estimativa antiga ('+diff.length+'):\n'+diff.join('\n'));
