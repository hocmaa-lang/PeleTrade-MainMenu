// Organic dashboard, keyword view — keyword-level. One row per keyword, one cell
// per day, colour = rank band. Sequential single hue (light -> dark = worse -> better),
// with reserved neutrals for "not ranking" and "no crawl" so the two never blur.
const fs = require('fs');
const P = JSON.parse(fs.readFileSync(process.argv[2] + '/payload.json', 'utf8'));

// attach the per-day gap flags onto each product so the client can grey those columns
for (const p of P.products) p.flags = p.trend.map(t => t.gap ? 2 : (t.partial ? 1 : 0));

// Marked days (e.g. Fri/Sat/Sun) are drawn as a column band BEHIND the cells rather
// than as a change to any cell's own colour — the cell colour is the rank and must
// keep meaning exactly one thing.
const MARK = P.markDays || [];
const MARKLBL = P.markLabel || (MARK.length ? 'marked days' : '');

const html = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${P.brandTitle} — keyword rank by day</title>
<style>
:root{
  --bg:#F6F7F9;--surface:#FFFFFF;--line:#E1E4E9;--grid:#EDEFF3;
  --ink:#171A1E;--ink2:#4A5158;--ink3:#7C858E;
  /* Ordinal rank ramp — five DISTINCT hues, not one hue in five tints.
     A single-hue ramp failed the dataviz validator here (adjacent bands ΔE 9.6,
     floor is 15) and clients could not read it. Hues run blue -> cyan -> magenta
     -> orange -> red: ordered, and deliberately green-free, because green and
     orange are indistinguishable under deuteranopia (ΔE 1.7 when tested).
     Validated light on #FFFFFF: all five checks PASS. Re-run
     dataviz/scripts/validate_palette.js before touching any of these. */
  --r1:#1D4ED8;--r2:#06B6D4;--r3:#C026D3;--r4:#F97316;--r5:#B91C1C;
  --none:#EDEFF3;--gap:#CDD2D9;
  --good:#1F7A4C;--bad:#B0402C;
  --mark:rgba(194,98,10,.17);--markink:#9A5308;
}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){
  --bg:#0F1114;--surface:#16191D;--line:#282D34;--grid:#1C2026;
  --ink:#EAEDF1;--ink2:#A7AFB8;--ink3:#767E87;
  /* Dark steps are SELECTED, not a flip of the light ramp: the validator's dark
     lightness band is L 0.48-0.67, so the bright pastels you would reach for all
     fail it. Same five hues, retuned into that band against surface #16191D. */
  --r1:#2563EB;--r2:#0891B2;--r3:#C026D3;--r4:#F0761A;--r5:#B02525;
  --none:#191D22;--gap:#343A42;
  --good:#4CBF87;--bad:#E0785F;
  --mark:rgba(217,118,47,.20);--markink:#E09355;
}}
*{box-sizing:border-box;margin:0;padding:0}
body{background:var(--bg);color:var(--ink);
  font:15px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;padding:28px 18px 60px}
.wrap{max-width:1240px;margin:0 auto}
h1{font-size:25px;letter-spacing:-.02em}
.sub{color:var(--ink2);font-size:13.5px;margin-top:3px}
.bar{display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin:20px 0 14px}
button,select,input{font:inherit;font-size:13.5px;color:var(--ink);background:var(--surface);
  border:1px solid var(--line);border-radius:7px;padding:7px 13px;cursor:pointer}
button.on{background:var(--ink);color:var(--surface);border-color:var(--ink)}
input{cursor:text;min-width:190px}
.spacer{flex:1}
.count{color:var(--ink3);font-size:12.5px}
.key{display:flex;gap:14px;flex-wrap:wrap;align-items:center;font-size:12px;color:var(--ink2);
  margin:0 0 14px}
.key span{display:flex;align-items:center;gap:5px}
.key i{width:16px;height:12px;border-radius:2px;display:block;border:1px solid var(--grid)}
.card{background:var(--surface);border:1px solid var(--line);border-radius:11px;overflow:hidden}
.scroll{overflow-x:auto}
table{border-collapse:separate;border-spacing:0;width:100%;font-size:13px}
th{position:sticky;top:0;background:var(--surface);z-index:2;text-align:left;color:var(--ink3);
  font-size:10.5px;text-transform:uppercase;letter-spacing:.06em;padding:9px 8px;
  border-bottom:1px solid var(--line);white-space:nowrap}
td{padding:0 8px;border-bottom:1px solid var(--grid);height:30px;white-space:nowrap}
tr:hover td{background:color-mix(in srgb,var(--ink) 4%,transparent)}
.kw{max-width:270px;overflow:hidden;text-overflow:ellipsis;font-weight:500}
.pr{font-size:10.5px;color:var(--ink3);text-transform:uppercase;letter-spacing:.05em}
td.n{text-align:right;font-variant-numeric:tabular-nums}
.strip{padding:0!important}
/* Explicit full-row height so the marked-day band spans the row and forms one
   continuous column stripe through the table, visible above and below each cell. */
.strip div{display:flex;gap:1px;padding:0 8px;height:30px;align-items:center;
  background-repeat:no-repeat}
.c{width:11px;height:17px;border-radius:2px;flex:0 0 auto;
  box-shadow:inset 0 0 0 1px rgba(128,128,128,.18)}
.up{color:var(--good);font-weight:600}.dn{color:var(--bad);font-weight:600}.fl{color:var(--ink3)}
.badge{display:inline-block;min-width:26px;text-align:center;padding:1px 6px;border-radius:20px;
  font-size:11.5px;font-weight:600;color:#fff}
.tt{position:fixed;pointer-events:none;opacity:0;transition:opacity .08s;background:var(--surface);
  border:1px solid var(--line);border-radius:7px;padding:7px 10px;font-size:12.5px;
  box-shadow:0 6px 20px rgba(0,0,0,.18);z-index:9;white-space:nowrap}
.tt b{display:block}
.note{background:var(--surface);border:1px solid var(--line);border-left:3px solid var(--ink3);
  border-radius:8px;padding:11px 15px;margin:16px 0 0;font-size:13px;color:var(--ink2)}
.note b{color:var(--ink)}
.greet{font-size:13px;letter-spacing:.14em;text-transform:uppercase;
  color:var(--ink3);font-weight:600;margin-bottom:6px}
.greet b{color:var(--ink);font-weight:600}
.dates{display:flex;gap:1px;padding:6px 8px 2px;font-size:9.5px;color:var(--ink3)}
.dates span{width:11px;flex:0 0 auto;text-align:center;overflow:visible}
.dows{display:flex;gap:1px;padding:2px 8px 0;font-size:9px;color:var(--ink3);
  background-repeat:no-repeat;letter-spacing:0}
.dows span{width:11px;flex:0 0 auto;text-align:center;font-weight:600}
.dows span.m{color:var(--markink);font-weight:800}
</style></head><body><div class="wrap">
<div class="greet" id="greet"></div>
<h1>${P.brandTitle} — keyword rank, day by day</h1>
<div class="sub">${P.marketplace} · ${P.dates[0]} → ${P.built} · Data Dive Rank Radar · one cell = one day</div>

<div class="bar">
  <button data-p="all" class="on">All products</button>
  ${P.products.map(p => `<button data-p="${p.key}">${p.short}</button>`).join('')}
  <input id="q" placeholder="filter keywords…">
  <select id="sort">
    <option value="sv">Sort: search volume</option>
    <option value="best">Sort: best rank</option>
    <option value="now">Sort: latest rank</option>
    <option value="move">Sort: biggest move</option>
  </select>
  <span class="spacer"></span><span class="count" id="cnt"></span>
</div>

<div class="key">
  <span><i style="background:var(--r1)"></i>1–3</span>
  <span><i style="background:var(--r2)"></i>4–10</span>
  <span><i style="background:var(--r3)"></i>11–20</span>
  <span><i style="background:var(--r4)"></i>21–50</span>
  <span><i style="background:var(--r5)"></i>51–100</span>
  <span><i style="background:var(--none)"></i>not ranking</span>
  <span><i style="background:var(--gap);background-image:repeating-linear-gradient(45deg,transparent,transparent 2px,rgba(128,128,128,.5) 2px,rgba(128,128,128,.5) 3px)"></i>no crawl</span>
  ${MARK.length ? `<span style="color:var(--markink);font-weight:600"><i style="background:var(--mark);border-color:var(--markink)"></i>${MARKLBL}</span>` : ''}
</div>

<div class="card"><div class="scroll"><table>
  <thead><tr>
    <th>Keyword</th><th class="n">Vol</th><th id="ruler">Rank each day →</th>
    <th class="n">First</th><th class="n">Now</th><th class="n">Best</th><th class="n">Move</th>
  </tr></thead><tbody id="rows"></tbody></table></div></div>

<div class="note"><b>Hatched cells are days the tracker did not run</b> — every keyword
returned 101 that day, which is the signature of a crawl that never fired, not of a
product leaving Amazon. They are drawn differently from a plain "not ranking" cell on
purpose. <b>First</b> and <b>Now</b> are the first and last days that actually carry data,
so a gap at either edge never fakes a move.${MARK.length ? `
<b>The tinted columns are ${MARKLBL}</b> — the letter row above the grid names every day
(S M T W T F S). The tint sits <i>behind</i> the cells and never changes a cell's colour,
so a cell still reads as nothing but its rank.` : ''}</div>
</div>
<div class="tt" id="tt"></div>
<script>
var BRAND=${JSON.stringify(P.teamName || P.brandTitle)};
(function(){var h=new Date().getHours();
  var g=h<12?'Good morning':(h<18?'Good afternoon':'Good evening');
  var el=document.getElementById('greet');
  if(el) el.innerHTML=g+', <b>'+BRAND+' team</b>';})();
const DATA=${JSON.stringify(P)};
const DOWNAME=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const DOWLTR=['S','M','T','W','T','F','S'];
// One cell occupies 11px + a 1px flex gap = a 12px pitch, after 8px of left padding.
// Painting the marked days as hard-stop bands on the row's own background puts the
// stripe BEHIND the cells: it shows through the gaps and the 6.5px above and below
// each 17px cell, so it reads as one continuous column without touching cell colour.
const CELL=11, PITCH=12, PAD=8;
function markCSS(marks){
  if(!marks) return 'none';
  const s=[];
  marks.forEach((m,i)=>{ if(!m) return;
    const a=PAD+i*PITCH, b=a+CELL;
    s.push('transparent '+a+'px','var(--mark) '+a+'px','var(--mark) '+b+'px','transparent '+b+'px');});
  return s.length?'linear-gradient(to right,'+s.join(',')+')':'none';
}
const band=r=>r==null?'var(--none)':r<=3?'var(--r1)':r<=10?'var(--r2)':r<=20?'var(--r3)':r<=50?'var(--r4)':'var(--r5)';
const badge=r=>r==null?'<span class="fl">—</span>'
  :'<span class="badge" style="background:'+band(r)+';color:'+(r<=20?'#fff':'var(--ink)')+'">'+r+'</span>';
const tt=document.getElementById('tt');
const show=(e,h)=>{tt.innerHTML=h;tt.style.opacity=1;const r=tt.getBoundingClientRect();
  tt.style.left=Math.min(e.clientX+13,innerWidth-r.width-8)+'px';
  tt.style.top=Math.max(e.clientY-r.height-11,6)+'px';};
const hide=()=>tt.style.opacity=0;

// flatten every keyword of every product into one list
const ALL=[];
DATA.products.forEach(p=>p.rows.forEach(r=>ALL.push({...r,pk:p.key,pn:p.short,
  dates:p.dates,flags:p.flags,dow:p.dow,mark:p.mark,markCSS:markCSS(p.mark),
  cov:p.coverage.withData})));

let filt='all',sort='sv',q='';
function render(){
  let list=ALL.filter(r=>(filt==='all'||r.pk===filt)&&r.days>0
    &&(!q||r.kw.toLowerCase().includes(q)));
  const key={sv:r=>-r.sv,best:r=>r.best==null?999:r.best,now:r=>r.end==null?999:r.end,
             move:r=>r.delta==null?999:r.delta};
  list.sort((a,b)=>key[sort](a)-key[sort](b));
  document.getElementById('cnt').textContent=list.length+' keywords ranking at least once';
  document.getElementById('rows').innerHTML=list.map(r=>{
    const cells=r.series.map((v,i)=>{
      const f=r.flags[i];
      const st=f===2
        ? 'background:var(--gap);background-image:repeating-linear-gradient(45deg,transparent,transparent 2px,rgba(128,128,128,.5) 2px,rgba(128,128,128,.5) 3px)'
        : 'background:'+band(v)+(f===1?';opacity:.55':'');
      const lbl=f===2?'no crawl':(v==null?'not ranking':'rank '+v+(f===1?' · partial crawl':''));
      const dn=r.dow?DOWNAME[r.dow[i]]:'';
      const hd=dn?r.dates[i]+' · '+dn:r.dates[i];
      return '<i class="c" style="'+st+'" data-h="<b>'+hd+'</b>'+lbl+'"></i>';}).join('');
    const mv=r.delta==null?'<span class="fl">—</span>'
      :r.delta===0?'<span class="fl">0</span>'
      :r.delta<0?'<span class="up">▲ '+(-r.delta)+'</span>':'<span class="dn">▼ '+r.delta+'</span>';
    return '<tr><td class="kw" title="'+r.kw.replace(/"/g,'&quot;')+'">'+r.kw+
      (filt==='all'?'<div class="pr">'+r.pn+'</div>':'')+'</td>'+
      '<td class="n">'+r.sv.toLocaleString()+'</td>'+
      '<td class="strip"><div style="background-image:'+r.markCSS+'">'+cells+'</div></td>'+
      '<td class="n">'+badge(r.start)+'</td><td class="n">'+badge(r.end)+'</td>'+
      '<td class="n">'+badge(r.best)+'</td><td class="n">'+mv+'</td></tr>';}).join('');
  document.querySelectorAll('.c').forEach(c=>{
    c.addEventListener('mousemove',e=>show(e,c.dataset.h));
    c.addEventListener('mouseleave',hide);});
}
document.querySelectorAll('.bar button').forEach(b=>b.addEventListener('click',()=>{
  document.querySelectorAll('.bar button').forEach(x=>x.classList.remove('on'));
  b.classList.add('on');filt=b.dataset.p;render();}));
document.getElementById('sort').addEventListener('change',e=>{sort=e.target.value;render();});
document.getElementById('q').addEventListener('input',e=>{q=e.target.value.toLowerCase();render();});

// date ruler in the strip header, aligned cell-for-cell with the rows below.
// The weekday letter row is what actually names the marked days — the band alone
// tells you a column is special but not which day it is.
(function ruler(){
  const p0=DATA.products[0], d=p0.dates, dow=p0.dow, mk=p0.mark;
  const dows=dow?'<div class="dows" style="background-image:'+markCSS(mk)+'">'+
    dow.map((w,i)=>'<span class="'+(mk&&mk[i]?'m':'')+'">'+DOWLTR[w]+'</span>').join('')+'</div>':'';
  document.getElementById('ruler').innerHTML='Rank each day \\u2192'+dows+'<div class="dates">'+
    d.map((x,i)=>'<span>'+((i%5===0||i===d.length-1)?x.slice(5):'')+'</span>').join('')+'</div>';
})();
render();
</script></body></html>`;
fs.writeFileSync(process.argv[2] + '/keywords.html', html);
console.log('keywords.html', fs.statSync(process.argv[2] + '/keywords.html').size, 'bytes');
