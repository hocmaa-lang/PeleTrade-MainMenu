// Organic dashboard, keyword view — keyword-level. One row per keyword, one cell
// per day, colour = rank band. Sequential single hue (light -> dark = worse -> better),
// with reserved neutrals for "not ranking" and "no crawl" so the two never blur.
const fs = require('fs');
const P = JSON.parse(fs.readFileSync(process.argv[2] + '/payload.json', 'utf8'));

// attach the per-day gap flags onto each product so the client can grey those columns
for (const p of P.products) p.flags = p.trend.map(t => t.gap ? 2 : (t.partial ? 1 : 0));

const html = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${P.brandTitle} — keyword rank by day</title>
<style>
:root{
  --bg:#F7F6F2;--surface:#FFFFFF;--line:#E2DFD6;--grid:#EFECE4;
  --ink:#1B211E;--ink2:#4C5551;--ink3:#7F8A84;
  /* sequential rank ramp: dark = rank 1, light = rank 100 */
  --r1:#0B5C3B;--r2:#1B7A50;--r3:#3E9A6C;--r4:#7DBB98;--r5:#BEDCC9;
  --none:#F0EDE6;--gap:#D3CFC4;
  --good:#1F7A4C;--bad:#B0402C;
}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){
  --bg:#0E1310;--surface:#141A17;--line:#26302B;--grid:#1C2420;
  --ink:#EAEFEB;--ink2:#A9B4AE;--ink3:#77837D;
  --r1:#7BEFBB;--r2:#4FD094;--r3:#34A876;--r4:#2A8760;--r5:#2E6B51;
  --none:#1A211D;--gap:#333D37;
  --good:#4CBF87;--bad:#E0785F;
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
.strip div{display:flex;gap:1px;padding:0 8px}
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
so a gap at either edge never fakes a move.</div>
</div>
<div class="tt" id="tt"></div>
<script>
var BRAND=${JSON.stringify(P.teamName || P.brandTitle)};
(function(){var h=new Date().getHours();
  var g=h<12?'Good morning':(h<18?'Good afternoon':'Good evening');
  var el=document.getElementById('greet');
  if(el) el.innerHTML=g+', <b>'+BRAND+' team</b>';})();
const DATA=${JSON.stringify(P)};
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
  dates:p.dates,flags:p.flags,cov:p.coverage.withData})));

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
      return '<i class="c" style="'+st+'" data-h="<b>'+r.dates[i]+'</b>'+lbl+'"></i>';}).join('');
    const mv=r.delta==null?'<span class="fl">—</span>'
      :r.delta===0?'<span class="fl">0</span>'
      :r.delta<0?'<span class="up">▲ '+(-r.delta)+'</span>':'<span class="dn">▼ '+r.delta+'</span>';
    return '<tr><td class="kw" title="'+r.kw.replace(/"/g,'&quot;')+'">'+r.kw+
      (filt==='all'?'<div class="pr">'+r.pn+'</div>':'')+'</td>'+
      '<td class="n">'+r.sv.toLocaleString()+'</td>'+
      '<td class="strip"><div>'+cells+'</div></td>'+
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

// date ruler in the strip header, aligned cell-for-cell with the rows below
(function ruler(){
  const d=DATA.products[0].dates;
  document.getElementById('ruler').innerHTML='Rank each day \\u2192<div class="dates">'+
    d.map((x,i)=>'<span>'+((i%5===0||i===d.length-1)?x.slice(5):'')+'</span>').join('')+'</div>';
})();
render();
</script></body></html>`;
fs.writeFileSync(process.argv[2] + '/keywords.html', html);
console.log('keywords.html', fs.statSync(process.argv[2] + '/keywords.html').size, 'bytes');
