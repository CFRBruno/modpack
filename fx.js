/* fx.js — camada de animação da Forja de Modpack (GSAP + ScrollTrigger + Lenis).
   Tudo aqui é opcional: sem as bibliotecas em vendor/ ou com “reduzir movimento” ligado no sistema,
   o app funciona igual, só sem animação. O app chama FX por meio de um wrapper que checa FX.ok. */
(function(){
'use strict';
var G=window.gsap,ST=window.ScrollTrigger;
var FX=window.FX={ok:false,reduced:false};
var mq=window.matchMedia?window.matchMedia('(prefers-reduced-motion: reduce)'):{matches:false};
FX.reduced=!!mq.matches;
if(!G||!ST)return;
try{G.registerPlugin.apply(G,[ST,window.ScrollToPlugin,window.Flip].filter(Boolean))}catch(e){return}
FX.ok=true;
var $=function(s,r){return (r||document).querySelector(s)};
var $$=function(s,r){return [].slice.call((r||document).querySelectorAll(s))};
var on=function(){return FX.ok&&!FX.reduced};
var rnd=G.utils.random;
if(on())document.documentElement.classList.add('fx');
mq.addEventListener&&mq.addEventListener('change',function(e){FX.reduced=e.matches;document.documentElement.classList.toggle('fx',!e.matches)});

/* ---------- scroll suave (Lenis) sincronizado com o ScrollTrigger ---------- */
var lenis=null;
function initScroll(){
  if(!window.Lenis||!on())return;
  lenis=new window.Lenis({duration:1.05,easing:function(t){return Math.min(1,1.001-Math.pow(2,-10*t))},smoothWheel:true,wheelMultiplier:.9,touchMultiplier:1.4});
  lenis.on('scroll',ST.update);
  G.ticker.add(function(time){lenis.raf(time*1000)});
  G.ticker.lagSmoothing(0);
  document.documentElement.classList.add('lenis','lenis-smooth');
}
FX.scrollTo=function(y,o){
  o=o||{};
  if(lenis)lenis.scrollTo(y,{duration:o.duration==null?.9:o.duration,immediate:!!o.immediate,offset:o.offset||0});
  else window.scrollTo({top:typeof y==='number'?y:0,behavior:o.immediate||!on()?'auto':'smooth'});
};
var refT;
function refreshSoon(){clearTimeout(refT);refT=setTimeout(function(){ST.refresh()},140)}
FX.refresh=refreshSoon;

/* ---------- pixel art: blocos flutuantes, bigorna, martelo ---------- */
function px(rows,pal,scale){
  var w=0;rows.forEach(function(r){w=Math.max(w,r.length)});
  var s='';
  rows.forEach(function(r,y){for(var x=0;x<r.length;x++){var c=pal[r[x]];if(c)s+='<rect x="'+x+'" y="'+y+'" width="1" height="1" fill="'+c+'"/>'}});
  return {svg:'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 '+w+' '+rows.length+'" shape-rendering="crispEdges">'+s+'</svg>',w:w,h:rows.length};
}
var ANVIL=['..........aaaaaaaaaaaaaaaaaa..','......aaaaaaabbbbbbbbbbbbbbbbbc.','.aaaaabbbbbbbbbbbbbbbbbbbbbbbcc','aabbbbbbbbbbbbbbbbbbbbbbbbbbbcc','.bbbbbbbbbbbbbbbbbbbbbbbbbbbbcc','..cccbbbbbbbbbbbbbbbbbbbbbbbcc.','......cccbbbbbbbbbbbbbbbbcc....','.........cbbbbbbbbbbbbbbcc.....','.........ccbbbbbbbbbbbbcc......','........ccbbbbbbbbbbbbbbcc.....','.......ccbbbbbbbbbbbbbbbbcc....','......ccbbbbbbbbbbbbbbbbbbcc...','......cbbbbbbbbbbbbbbbbbbbbc...','......cccccccccccccccccccccc...','.....dddddddddddddddddddddddd..'];
var ANVILPAL={a:'#c8d2e4',b:'#8895ae',c:'#58637c',d:'#363e52'};
var HAMMER=['....hhhhhhhh....','...hhhHHHHhhh...','...hhhHHHHhhh...','....hhhhhhhh....','......ww........','......wW........','......ww........','......wW........','......ww........','......wW........','......ww........','......wW........'];
var HAMPAL={h:'#6b7280',H:'#9aa3b5',w:'#8b5a2b',W:'#a9743b'};
var BLOCKS={
 grass:function(r){var g=['#4f9d2d','#5fb236','#3f8a22'],d=['#6e4520','#7d5128','#5e3a1a'],o=[];for(var y=0;y<16;y++){var row='';for(var x=0;x<16;x++){var top=y<4+(x*7%3==0?1:0);var c=top?g[r()%3]:d[r()%3];row+=c==g[0]?'a':c==g[1]?'b':c==g[2]?'c':c==d[0]?'d':c==d[1]?'e':'f'}o.push(row)}return {rows:o,pal:{a:g[0],b:g[1],c:g[2],d:d[0],e:d[1],f:d[2]}}},
 ore:function(r,oc){var o=[];var st=['#7d7d7d','#8a8a8a','#6d6d6d'];var spots={};for(var i=0;i<7;i++){var sx=r()%14,sy=r()%14;spots[sx+','+sy]=1;spots[(sx+1)+','+sy]=1;spots[sx+','+(sy+1)]=1}for(var y=0;y<16;y++){var row='';for(var x=0;x<16;x++){row+=spots[x+','+y]?'o':'abc'[r()%3]}o.push(row)}return {rows:o,pal:{a:st[0],b:st[1],c:st[2],o:oc}}},
 tnt:function(r){var o=[];for(var y=0;y<16;y++){var row='';for(var x=0;x<16;x++){row+=(y>=6&&y<=9)?(((x+y)%5==0)?'k':'w'):(r()%7==0?'s':'t')}o.push(row)}return {rows:o,pal:{t:'#d03a2e',s:'#b22d23',w:'#ece8df',k:'#33302c'}}},
 table:function(r){var o=[];for(var y=0;y<16;y++){var row='';for(var x=0;x<16;x++){var grid=(y<8)&&(x%5==2||y%5==2);row+=y<8?(grid?'g':'p'):(x%4==0?'l':'q')}o.push(row)}return {rows:o,pal:{g:'#6b4a24',p:'#b88a4a',l:'#8a6030',q:'#a77a3e'}}}
};
function seeded(seed){var h=seed>>>0;return function(){h=Math.imul(h^(h>>>15),2246822519)>>>0;h=(h^(h>>>13))>>>0;return h}}
function blockImg(kind,seed,oc){
  var f=BLOCKS[kind],b=f(seeded(seed),oc),c=document.createElement('canvas');c.width=c.height=16;var x=c.getContext('2d');
  b.rows.forEach(function(row,y){for(var i=0;i<row.length;i++){x.fillStyle=b.pal[row[i]];x.fillRect(i,y,1,1)}});
  x.fillStyle='rgba(255,255,255,.22)';x.fillRect(0,0,16,1);x.fillRect(0,0,1,16);x.fillStyle='rgba(0,0,0,.3)';x.fillRect(0,15,16,1);x.fillRect(15,0,1,16);
  return c.toDataURL();
}

/* ---------- fundo: brasas subindo + blocos flutuantes ---------- */
var bg={c:null,x:null,w:0,h:0,p:[],heat:.3,run:false,col:[255,170,60]};
function initBg(){
  if(!on())return;
  var c=document.createElement('canvas');c.id='fxbg';c.setAttribute('aria-hidden','true');document.body.insertBefore(c,document.body.firstChild);
  bg.c=c;bg.x=c.getContext('2d');
  function size(){var d=Math.min(window.devicePixelRatio||1,1.5);bg.w=window.innerWidth;bg.h=window.innerHeight;c.width=bg.w*d;c.height=bg.h*d;bg.x.setTransform(d,0,0,d,0,0);bg.max=bg.w<700?22:46}
  size();window.addEventListener('resize',size);
  function color(){var s=getComputedStyle(document.documentElement).getPropertyValue('--gold').trim();if(/^#/.test(s)&&s.length===7)bg.col=[parseInt(s.slice(1,3),16),parseInt(s.slice(3,5),16),parseInt(s.slice(5,7),16)]}
  color();FX.recolor=color;
  function spawn(){
    bg.p.push({x:rnd(0,bg.w),y:bg.h+10,vx:rnd(-.2,.2),vy:-rnd(.25,.9)*(.6+bg.heat*1.4),s:rnd(2,4.5)|0,l:0,t:rnd(260,520),ph:rnd(0,6.28)});
  }
  G.ticker.add(function(){
    if(document.hidden)return;
    var x=bg.x;x.clearRect(0,0,bg.w,bg.h);
    var want=Math.round(bg.max*(.12+bg.heat*.88));
    if(bg.p.length<want&&Math.random()<.35)spawn();
    var dark=document.documentElement.getAttribute('data-theme')==='dark'||(!document.documentElement.getAttribute('data-theme')&&window.matchMedia('(prefers-color-scheme: dark)').matches);
    for(var i=bg.p.length-1;i>=0;i--){
      var p=bg.p[i];p.l++;p.ph+=.04;p.x+=p.vx+Math.sin(p.ph)*.25;p.y+=p.vy;
      var k=p.l/p.t,a=Math.sin(Math.min(1,k)*Math.PI)*(dark?.85:.55);
      if(p.l>p.t||p.y<-10){bg.p.splice(i,1);continue}
      x.fillStyle='rgba('+bg.col[0]+','+bg.col[1]+','+bg.col[2]+','+a.toFixed(3)+')';
      x.fillRect(Math.round(p.x/2)*2,Math.round(p.y/2)*2,p.s,p.s);
    }
  });
  document.addEventListener('visibilitychange',function(){if(!document.hidden)G.ticker.wake&&G.ticker.wake()});
}
FX.heat=function(v){if(!bg.c)return;G.to(bg,{heat:Math.max(.05,Math.min(1,v/100)),duration:1.2,ease:'power2.out'})};
function initBlocks(){
  if(!on())return;
  var box=document.createElement('div');box.id='fxblocks';box.setAttribute('aria-hidden','true');document.body.insertBefore(box,document.body.firstChild);
  var defs=[['grass',3,'',9,'left',4,14,.22],['ore',11,'#3de0e8',16,'right',3,26,.26],['tnt',5,'',12,'left',2,52,.18],['ore',17,'#d8b43a',20,'right',5,64,.2],['table',7,'',14,'left',6,78,.2],['ore',23,'#c33a3a',18,'right',2,88,.22]];
  defs.forEach(function(d,i){
    var im=document.createElement('img');im.className='fxblk';im.alt='';im.src=blockImg(d[0],d[1]*977,d[2]);
    var size=d[3]*5;im.style.width=im.style.height=size+'px';im.style[d[4]]=d[5]+'%';im.style.top=d[6]+'%';im.style.opacity=d[7];
    box.appendChild(im);
    G.to(im,{y:'+='+rnd(10,22),rotation:rnd(-7,7),duration:rnd(3,5.5),ease:'sine.inOut',yoyo:true,repeat:-1,delay:i*.4});
    var depth=(i%3+1)*.18;
    ST.create({start:0,end:'max',onUpdate:function(self){G.set(im,{marginTop:-self.progress*window.innerHeight*depth*2.2})}});
  });
}

/* ---------- topo: progresso de rolagem, cabeçalho compacto, “voltar ao topo” ---------- */
function initChrome(){
  if(!on())return;
  var pr=document.createElement('div');pr.id='fxprog';pr.innerHTML='<i></i>';document.body.appendChild(pr);
  var bar=$('i',pr);
  ST.create({start:0,end:'max',onUpdate:function(self){G.set(bar,{scaleX:self.progress})}});
  ST.create({trigger:document.body,start:'top -70',end:'max',onToggle:function(self){document.body.classList.toggle('shrunk',self.isActive);setTimeout(measure,320)}});
  var up=document.createElement('button');up.id='fxtop';up.type='button';up.setAttribute('aria-label','Voltar ao topo');up.title='Voltar ao topo';
  up.innerHTML='<svg viewBox="0 0 10 10" width="22" height="22" shape-rendering="crispEdges" aria-hidden="true"><path fill="currentColor" d="M4 0h2v1h1v1h1v1h1v1H8V3H7V2H6v6H4V2H3v1H2v1H1V3h1V2h1V1h1z"/></svg>';
  document.body.appendChild(up);G.set(up,{autoAlpha:0,y:16});
  up.addEventListener('click',function(){FX.scrollTo(0,{duration:1.1})});
  ST.create({start:700,end:'max',onToggle:function(self){G.to(up,{autoAlpha:self.isActive?1:0,y:self.isActive?0:16,duration:.35,ease:'power2.out'})}});
  function measure(){var t=$('.top');if(t)document.documentElement.style.setProperty('--stick',t.offsetHeight+'px')}
  FX.measure=measure;measure();window.addEventListener('resize',measure);
}

/* ---------- indicador deslizante das abas ---------- */
var lastTab={x:0,w:0};
FX.tabs=function(){
  var wrap=$('#tabs'),sel=$('.tab[aria-selected="true"]',wrap);if(!wrap||!sel)return;
  var ind=$('.tabind',wrap);if(!ind)return;
  var x=sel.offsetLeft,w=sel.offsetWidth;
  G.set(ind,{x:lastTab.x||x,width:lastTab.w||w});
  G.to(ind,{x:x,width:w,duration:.5,ease:'power3.out'});
  lastTab={x:x,w:w};
};

/* ---------- pontuação: contador, barra, nível, bônus flutuante ---------- */
var TIERS=[42,58,72,85];
FX.xp=function(prev,next,empty){
  var lvl=$('#xp .lvl'),fill=$('#xp .fill');if(!lvl||!fill)return;
  var from=prev==null?0:prev;
  G.killTweensOf(fill);G.set(fill,{width:from+'%'});
  G.to(fill,{width:(empty?0:next)+'%',duration:.95,ease:'power3.out'});
  if(empty)return;
  var txt=lvl.firstChild,o={v:from};
  G.to(o,{v:next,duration:.95,ease:'power2.out',onUpdate:function(){txt.nodeValue=String(Math.round(o.v))}});
  var d=next-from;
  if(prev!=null&&Math.abs(d)>=.5&&Date.now()-(FX._xd||0)>450){FX._xd=Date.now();
    var b=document.createElement('span');b.className='xpd '+(d>0?'up':'down');b.textContent=(d>0?'+':'')+(Math.round(d*10)/10).toLocaleString('pt-BR');
    $('#xp').appendChild(b);
    G.fromTo(b,{y:10,opacity:0},{y:0,opacity:1,duration:.35,ease:'power2.out'});
    G.to(b,{y:-9,opacity:0,duration:.6,delay:.8,ease:'power1.in',onComplete:function(){b.remove()}});
  }
  var crossed=TIERS.some(function(t){return from<t&&next>=t});
  if(crossed){
    G.fromTo(lvl,{scale:1.5},{scale:1,duration:.9,ease:'elastic.out(1,.35)'});
    var r=lvl.getBoundingClientRect();FX.burst(r.left+r.width/2,r.top+r.height/2,'xp',22);
    FX.toastLevel&&FX.toastLevel();
  }
  FX.heat(next);
};
FX.chips=function(){$$('#stats .chip').forEach(function(c,i){G.fromTo(c,{y:-4,opacity:.4},{y:0,opacity:1,duration:.35,delay:i*.03,ease:'back.out(2)'})})};

/* ---------- faíscas e orbes ---------- */
var PAL={forge:['#ffd35a','#ff9a2e','#ff6a1f','#fff2b0'],xp:['#8cf03e','#c4ff86','#4ec60c','#f3ffc9'],good:['#4fd2b8','#a8f5e6','#ffffff'],bad:['#ff7070','#ffb0b0','#ffffff']};
FX.burst=function(x,y,kind,n){
  if(!on())return;
  var pal=PAL[kind]||PAL.forge;n=n||14;
  for(var i=0;i<n;i++){
    var s=document.createElement('i');s.className='fxsp';var sz=rnd(3,7,1);
    s.style.cssText='width:'+sz+'px;height:'+sz+'px;background:'+pal[(Math.random()*pal.length)|0];
    document.body.appendChild(s);
    var a=rnd(-Math.PI,0),sp=rnd(40,150),dx=Math.cos(a)*sp,dy=Math.sin(a)*sp;
    G.set(s,{x:x,y:y});
    var tl=G.timeline({onComplete:function(el){return function(){el.remove()}}(s)});
    tl.to(s,{x:x+dx,y:y+dy,duration:rnd(.28,.45),ease:'power2.out'}).to(s,{y:y+dy+rnd(30,80),x:x+dx*1.15,opacity:0,duration:rnd(.4,.7),ease:'power1.in'});
  }
};
FX.celebrate=function(){
  if(!on())return;
  for(var k=0;k<7;k++)(function(k){setTimeout(function(){FX.burst(rnd(window.innerWidth*.15,window.innerWidth*.85),rnd(window.innerHeight*.3,window.innerHeight*.65),k%2?'xp':'forge',20)},k*160)})(k);
};

/* ---------- ícone voando até “Meu pack” (e caindo ao remover) ---------- */
FX.fly=function(btn,src,kind){
  if(!on()||!btn||!btn.getBoundingClientRect)return;
  var r=btn.getBoundingClientRect(),tab=$('.tab[data-id="pack"]');if(!tab)return;
  var t=tab.getBoundingClientRect(),el=document.createElement('img');el.className='fxfly';el.src=src;el.alt='';document.body.appendChild(el);
  var sx=r.left+r.width/2-17,sy=r.top+r.height/2-17,ex=t.left+t.width/2-17,ey=t.top+t.height/2-17;
  if(kind==='rm'){
    G.set(el,{x:sx,y:sy});
    G.to(el,{y:sy+70,x:sx+rnd(-34,34),rotation:rnd(-160,160),scale:.2,opacity:0,duration:.55,ease:'power2.in',onComplete:function(){el.remove()}});
    return;
  }
  G.set(el,{x:sx,y:sy,scale:.5,opacity:0,rotation:-12});
  var tl=G.timeline({onComplete:function(){el.remove();FX.bump(tab);FX.burst(t.left+t.width/2,t.top+t.height/2,'good',12);orbs(t)}});
  tl.to(el,{opacity:1,scale:1.2,duration:.14,ease:'back.out(3)'})
    .to(el,{x:ex,duration:.62,ease:'power1.inOut'},.06)
    .to(el,{y:Math.min(sy,ey)-80,duration:.3,ease:'power2.out'},.06)
    .to(el,{y:ey,duration:.32,ease:'power2.in'},.36)
    .to(el,{rotation:340,duration:.68,ease:'none'},.06)
    .to(el,{scale:.55,duration:.25,ease:'power1.in'},.45);
};
FX.bump=function(el){if(!on()||!el)return;G.fromTo(el,{scale:1},{scale:1.18,duration:.14,yoyo:true,repeat:1,ease:'power2.out'});var n=$('.n',el);if(n)G.fromTo(n,{scale:1},{scale:1.6,duration:.18,yoyo:true,repeat:1,ease:'back.out(3)'})};
function orbs(t){
  var bar=$('#xp .xpbar');if(!bar)return;var b=bar.getBoundingClientRect();
  for(var i=0;i<4;i++){
    var o=document.createElement('i');o.className='fxorb';document.body.appendChild(o);
    G.set(o,{x:t.left+t.width/2,y:t.top+t.height/2,scale:rnd(.7,1.1)});
    G.to(o,{x:b.left+b.width*(.2+Math.random()*.6),y:b.top+b.height/2,duration:rnd(.55,.85),delay:i*.07,ease:'power2.in',onComplete:function(el){return function(){el.remove()}}(o)});
    G.to(o,{y:'-='+rnd(30,70),duration:.3,delay:i*.07,ease:'power1.out',yoyo:false,overwrite:false});
  }
}

/* ---------- toast ---------- */
FX.toast=function(el,msg){
  el.textContent=msg;el.classList.remove('show');
  G.killTweensOf(el);
  G.fromTo(el,{xPercent:-50,y:34,opacity:0,scale:.9},{xPercent:-50,y:0,opacity:1,scale:1,duration:.5,ease:'back.out(2.2)'});
  G.to(el,{y:18,opacity:0,duration:.35,delay:2.5,ease:'power2.in'});
};

/* ---------- entrada das telas ---------- */
var vt=[],heroTl=null,loopTl=null;
function killView(){vt.forEach(function(t){t&&t.kill&&t.kill()});vt=[];if(heroTl){heroTl.kill();heroTl=null}if(loopTl){loopTl.kill();loopTl=null}}
function reveal(v){
  var tg=$$(':scope > h2,:scope > .lead,:scope > .block,:scope > .grid2 > .block,:scope > .filters,:scope > .togs,:scope > .empty,:scope > details,:scope > .foot',v);
  if(!tg.length)return;
  G.set(tg,{opacity:0,y:28});
  var b=ST.batch(tg,{start:'top 94%',once:true,interval:.06,batchMax:8,onEnter:function(batch){G.to(batch,{opacity:1,y:0,duration:.75,ease:'power3.out',stagger:.07,overwrite:true,clearProps:'transform'})}});
  vt=vt.concat(b);
  setTimeout(function(){tg.forEach(function(el){if(+getComputedStyle(el).opacity<.05){var r=el.getBoundingClientRect();if(r.top<window.innerHeight*1.1)G.to(el,{opacity:1,y:0,duration:.5,clearProps:'transform'})}})},1800);
}
function barsIn(v){
  var bs=$$('.crit .bar i,.dimrow .dtrack i,.xpbar.ck .fill,.gaprow .bar i',v);
  bs.forEach(function(el){
    var w=el.style.width;G.set(el,{width:0});
    vt.push(ST.create({trigger:el,start:'top 96%',once:true,onEnter:function(){G.to(el,{width:w,duration:1.1,ease:'power3.out'})}}));
  });
}
FX.countUp=function(el,to,dec,dur){var o={v:0};G.to(o,{v:to,duration:dur||1.4,ease:'power2.out',onUpdate:function(){el.textContent=o.v.toLocaleString('pt-BR',{maximumFractionDigits:dec||0})}})};

/* Hero: bigorna, martelo e faíscas */
function hero(anim){
  var art=$('#heroArt');if(!art)return;
  var A=px(ANVIL,ANVILPAL),H=px(HAMMER,HAMPAL);
  art.innerHTML='<div class="glow"></div><div class="anvil">'+A.svg+'</div><div class="hammer">'+H.svg+'</div><div class="sparks"></div>';
  var anvil=$('.anvil',art),ham=$('.hammer',art),glow=$('.glow',art),sparks=$('.sparks',art);
  var title=$('#heroTitle');
  if(title&&!title.dataset.split){
    var t=title.textContent;title.dataset.split=1;title.setAttribute('aria-label',t);title.innerHTML=t.split(' ').map(function(w){return '<span class="w" aria-hidden="true">'+w.split('').map(function(c){return '<span class="ch">'+c+'</span>'}).join('')+'</span>'}).join(' ');
  }
  if(anim){
  heroTl=G.timeline({defaults:{ease:'power3.out'}});
  heroTl.from('.hero .eyebrow',{opacity:0,y:12,duration:.5})
   .from('.hero .ch',{opacity:0,y:34,rotationX:-70,duration:.6,stagger:.028,transformOrigin:'50% 100%'},.05)
   .from('.hero .hero-sub',{opacity:0,y:16,duration:.6},.35)
   .from('.hero .hero-stats > div',{opacity:0,y:16,duration:.5,stagger:.08},.5)
   .from(anvil,{opacity:0,y:50,scale:.85,duration:.8,ease:'back.out(1.6)'},.1)
   .from(ham,{opacity:0,x:30,duration:.5},.5);
  $$('.hero .hero-stats b[data-count]').forEach(function(b){FX.countUp(b,+b.dataset.count,0,1.6)});
  }
  /* martelada em loop */
  G.set(ham,{transformOrigin:'30% 92%',rotation:-8});
  function spark(){
    for(var i=0;i<9;i++){
      var s=document.createElement('i');s.className='sp';var sz=rnd(3,6,1);s.style.cssText='width:'+sz+'px;height:'+sz+'px;background:'+PAL.forge[(Math.random()*4)|0];sparks.appendChild(s);
      var a=rnd(-2.6,-.55),sp=rnd(50,140);
      G.set(s,{x:0,y:0});
      G.timeline({onComplete:function(el){return function(){el.remove()}}(s)}).to(s,{x:Math.cos(a)*sp,y:Math.sin(a)*sp,duration:rnd(.25,.4),ease:'power2.out'}).to(s,{y:'+='+rnd(30,70),opacity:0,duration:rnd(.35,.6),ease:'power1.in'});
    }
  }
  loopTl=G.timeline({repeat:-1,repeatDelay:1.1,delay:1.6});
  loopTl.to(ham,{rotation:-52,duration:.55,ease:'power2.out'})
    .to(ham,{rotation:6,duration:.13,ease:'power4.in'})
    .add(function(){spark()})
    .fromTo(anvil,{scaleY:1,y:0},{scaleY:.955,y:3,duration:.07,yoyo:true,repeat:1,transformOrigin:'50% 100%'},'<')
    .fromTo(glow,{opacity:0,scale:.7},{opacity:.95,scale:1.15,duration:.12,yoyo:true,repeat:1,ease:'power2.out'},'<')
    .to(ham,{rotation:-8,duration:.4,ease:'power2.inOut'},'+=.05');
  /* parallax ao rolar */
  vt.push(ST.create({trigger:'.hero',start:'top top',end:'bottom top',scrub:.6,animation:G.timeline().to('.hero .hero-art',{y:70,scale:.92,opacity:.2,ease:'none'},0).to('.hero .hero-txt',{y:-24,opacity:.4,ease:'none'},0)}));
}

/* Radar morfando e Mesa de forja */
var lastRadar=null;
function radar(){
  var poly=$('.radar .area');if(!poly)return;
  var vals=poly.getAttribute('data-v').split(',').map(Number),NK=vals.length,cx=140,cy=120,R=78;
  var from=lastRadar&&lastRadar.length===NK?lastRadar:vals.map(function(){return 0});
  var o={t:0};
  function pts(k){return vals.map(function(v,i){var a=-Math.PI/2+i*2*Math.PI/NK,f=(from[i]+(v-from[i])*k)/100;return (cx+Math.cos(a)*R*f).toFixed(1)+','+(cy+Math.sin(a)*R*f).toFixed(1)}).join(' ')}
  poly.setAttribute('points',pts(0));
  vt.push(ST.create({trigger:poly,start:'top 92%',once:true,onEnter:function(){G.to(o,{t:1,duration:1.2,ease:'power3.out',onUpdate:function(){poly.setAttribute('points',pts(o.t))}})}}));
  lastRadar=vals;
}
function craft(){
  var slots=$$('.craft .slot');if(!slots.length)return;
  G.set(slots,{scale:.4,opacity:0});G.set('.craft .arrow',{opacity:0,x:-10});G.set('.craft .result',{scale:.6,opacity:0});
  vt.push(ST.create({trigger:'.craft',start:'top 90%',once:true,onEnter:function(){
    var tl=G.timeline();
    tl.to(slots,{scale:1,opacity:1,duration:.5,ease:'back.out(2.4)',stagger:{each:.06,from:'start'}})
      .to('.craft .arrow',{opacity:1,x:0,duration:.4,ease:'power2.out'},'-=.1')
      .to('.craft .result',{scale:1,opacity:1,duration:.7,ease:'elastic.out(1,.5)'},'-=.1');
    var n=$('.craft .result b');if(n&&n.dataset.v)FX.countUp(n,+n.dataset.v,0,1.1);
    var r=$('.craft .result');if(r){var b=r.getBoundingClientRect();setTimeout(function(){FX.burst(b.left+b.width/2,b.top+b.height/2,'forge',16)},900)}
  }}));
}
/* trilha de versões */
FX.rail=function(){
  var nodes=$$('.vrail .vnode');if(!nodes.length)return;
  G.set(nodes,{scale:.3,opacity:0});G.set('.vrail .vline i',{scaleX:0});
  var tl=G.timeline({scrollTrigger:{trigger:'.vrail',start:'top 90%',once:true}});
  tl.to('.vrail .vline i',{scaleX:1,duration:1.1,ease:'power2.inOut'},0)
    .to(nodes,{scale:1,opacity:1,duration:.5,ease:'back.out(2.4)',stagger:.14},.1);
  vt.push(tl.scrollTrigger);refreshSoon();
};
FX.view=function(tab,anim){
  killView();
  var v=$('#view');if(!v)return;
  $$('textarea',v).forEach(function(t){t.setAttribute('data-lenis-prevent','')});
  if(tab==='goal')hero(anim);
  if(anim){reveal(v);barsIn(v)}
  if(tab==='pack'){radar();if(anim)craft()}
  refreshSoon();
};
FX.swapOut=function(cb){
  var v=$('#view');G.killTweensOf(v);
  G.to(v,{opacity:0,y:-10,duration:.16,ease:'power1.in',onComplete:function(){cb();G.set(v,{opacity:1,y:0,clearProps:'transform'})}});
};
FX.gridIn=function(g,anim){
  var rows=$$('.mrow',g);
  vt=vt.filter(function(t){if(t&&t._grid){t.kill();return false}return true});
  if(!rows.length)return;
  if(!anim){G.fromTo(g,{opacity:.55},{opacity:1,duration:.25});refreshSoon();return}
  var first=rows.slice(0,22),rest=rows.slice(22);
  G.fromTo(first,{opacity:0,y:18},{opacity:1,y:0,duration:.5,stagger:.03,ease:'power2.out',clearProps:'transform'});
  if(rest.length){
    G.set(rest,{opacity:0,y:14});
    var b=ST.batch(rest,{start:'top 96%',once:true,interval:.05,batchMax:6,onEnter:function(bt){G.to(bt,{opacity:1,y:0,duration:.45,stagger:.04,overwrite:true,clearProps:'transform'})}});
    b.forEach(function(t){t._grid=1});vt=vt.concat(b);
  }
  refreshSoon();
};
FX.sugIn=function(el){
  var kids=$$(':scope > .sugrow,:scope > .issue,:scope > .gaprow,:scope > .empty',el).slice(0,14);
  if(kids.length)G.fromTo(kids,{opacity:0,y:14},{opacity:1,y:0,duration:.45,stagger:.05,ease:'power2.out',clearProps:'transform,opacity,visibility'});
  $$('.gain',el).slice(0,14).forEach(function(g){var m=g.textContent.match(/^([+\-−]?)(\d+(?:[.,]\d+)?)$/);if(m){var to=parseFloat(m[2].replace(',','.')),neg=m[1]==='-'||m[1]==='−',pl=m[1]==='+'?'+':neg?'-':'',o={v:0},dec=m[2].indexOf(',')>=0?1:0;G.to(o,{v:to,duration:.8,ease:'power2.out',onUpdate:function(){g.textContent=pl+o.v.toLocaleString('pt-BR',{minimumFractionDigits:dec,maximumFractionDigits:dec})}})}});
  refreshSoon();
};

/* ---------- sliders ---------- */
FX.pop=function(el){if(!on()||!el)return;G.fromTo(el,{scale:1.35},{scale:1,duration:.3,ease:'back.out(3)'})};
FX.preset=function(old){
  if(!on())return;
  $$('input[type=range][data-k]').forEach(function(inp,i){
    var k=inp.dataset.k,to=+inp.value,from=old[k];if(from==null||from===to)return;
    var out=$('#o_'+k),o={v:from},unit=k==='size'?' mods':'';
    function set(v){var r=Math.round(v);inp.value=r;inp.style.setProperty('--p',((r-inp.min)/(inp.max-inp.min)*100)+'%');if(out)out.textContent=r+unit}
    set(from);
    G.to(o,{v:to,duration:.8,delay:i*.035,ease:'power3.out',onUpdate:function(){set(o.v)},onComplete:function(){set(to)}});
    if(out)G.fromTo(out,{scale:1.25},{scale:1,duration:.5,delay:i*.035+.6,ease:'back.out(3)'});
  });
};
/* checklist */
FX.check=function(el,checked,all){
  if(!on()||!el)return;
  var r=el.getBoundingClientRect();
  if(checked)FX.burst(r.left+r.width/2,r.top+r.height/2,'xp',12);
  if(all)setTimeout(FX.celebrate,250);
};

/* ---------- mesa de forja: monta o HTML dos slots a partir dos ícones ---------- */
FX.init=function(){
  if(!on())return;
  initScroll();initBg();initBlocks();initChrome();
};
})();
