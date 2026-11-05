
/* ==================== Knöchel, Fotos und Medikamente ====================
   Knöchel: Skala 0 bis 3 abends, Morgen-Check, Umfang morgens und abends.
   Medikamente: Plan in Versionen mit Startdatum, tägliches Abhaken, Abweichungen.
   Alles liegt in S und damit im JSON-Backup. Im Code steht kein persönlicher Plan. */

/* ---------- Knöchel-Skala ---------- */
const ANK=[
 {k:0,t:'nichts',d:'Nichts, keine Sockenränder.',c:'ok'},
 {k:1,t:'Sockenrand',d:'Leichte Sockenränder, keine Delle.',c:'ok'},
 {k:2,t:'Delle kurz',d:'Deutliche Sockenränder, leichte Delle, verschwindet in unter 10 Sekunden.',c:'warn'},
 {k:3,t:'Delle tief',d:'Tiefe Delle, bleibt länger, sichtbar dicker.',c:'bad'}];
const ANKF=['Knöchel rechts morgens','Knöchel rechts abends'];
function ankMigrate(){
 if(!S||!S.settings||S.settings.ankV)return false;
 ANKF.forEach(f=>{if(!S.settings.mfields.includes(f))S.settings.mfields.push(f)});
 if(!S.meds)S.meds={v:[]};
 S.settings.ankV=1;return true;
}
function ankVal(d){const r=S.days[d];return r?num(r.ankle):null}
function ankWarn(d){
 const r=S.days[d]||{},out=[];
 if(num(r.ankleAM)===1)out.push('Morgens sichtbare Schwellung');
 if(ankVal(d)===3&&ankVal(addDays(d,-1))===3)out.push('Zwei Tage in Folge Stufe 3');
 return out;
}
function ankWarnBox(list,d){
 if(!list.length)return '';
 return `<div class="kwarn"><b>${esc(list.join(' und '))}${d?`, ${d===todayStr()?'heute':fD(d)}`:''}</b>
  <span>Lass das ärztlich anschauen. Nicht abwarten, wenn nur eine Seite dick ist und die Wade schmerzt,
  wenn du kurzatmig bist oder das Gewicht in zwei bis drei Tagen um mehr als ein Kilo steigt.</span></div>`;
}
function ankWarnTop(d){
 let w=ankWarn(d),wd=d;
 if(!w.length&&d===todayStr()){wd=addDays(d,-1);w=ankWarn(wd)}
 return ankWarnBox(w,wd);
}
function ankleSection(d){
 const r=S.days[d]||{},v=num(r.ankle),am=num(r.ankleAM),sel=ANK.find(x=>x.k===v);
 return `<section class="sec" id="anksec"><h3>Knöchel</h3>
  <div class="card list"><div class="srow"><span>Morgens Schwellung sichtbar?</span><div class="chips">
   <button class="chip ${am===0?'on':''}" data-pm="ankam" data-v="0">Nein</button>
   <button class="chip ${am===1?'on':''}" data-pm="ankam" data-v="1">Ja</button></div></div></div>
  <h3 class="mt16">Abends, Skala 0 bis 3</h3>
  <div class="stgrid">${ANK.map(x=>`<button class="stb ${v===x.k?'on '+x.c:''}" data-pm="ank" data-v="${x.k}"
   aria-label="Stufe ${x.k}, ${esc(x.d)}"><b class="ankn">${x.k}</b><span>${x.t}</span></button>`).join('')}</div>
  ${sel?`<p class="stdesc ${sel.c}">${esc(sel.d)}</p>`:''}
  <p class="hint">Drucktest: 5 s mit dem Daumen über dem Knöchel drücken, loslassen, schauen ob eine Delle bleibt.</p></section>`;
}
/* Mittwoch und Samstag: Umfang und Fotos */
function kwDue(d){
 const t=todayStr();if(d!==t)return '';
 const wd=pd(t).getDay();if(wd!==3&&wd!==6)return '';
 const m=S.measures.find(x=>x.date===t),has=f=>!!(m&&m.vals&&m.vals[f]!=null),o=[];
 if(!has(ANKF[0]))o.push('Knöchelumfang morgens');
 if(new Date().getHours()>=16&&!has(ANKF[1]))o.push('Knöchelumfang abends');
 const ph=(S.photos||[]).filter(p=>p.date===t);
 if(!ph.some(p=>/^Knöchel/.test(p.pose)))o.push('Knöchelfotos');
 if(wd===6&&!ph.some(p=>/^Körper/.test(p.pose)))o.push('Körperfotos');
 return o.length?`<button class="note-line" data-a="gohealth" data-v="knoechel">${wd===3?'Mittwoch':'Samstag'}: ${o.join(', ')}</button>`:'';
}

/* ---------- Medikamente ---------- */
const AMTS=['1/12','1/8','1/6','1/4','1/2','1','2','3'];
const ROUTES=['sublingual','geschluckt'];
const FORMS=['Tablette','Kapsel','Tropfen'];
const frac=a=>{if(a==null||a==='')return null;const m=String(a).match(/^(\d+)\/(\d+)$/);return m?(+m[1])/(+m[2]):num(a)};
const nowHM=()=>{const n=new Date();return p2(n.getHours())+':'+p2(n.getMinutes())};
const hmMin=t=>{const m=String(t||'').match(/^(\d{1,2}):(\d{2})/);return m?(+m[1])*60+(+m[2]):null};
function medVers(){return ((S.meds&&S.meds.v)||[]).slice().sort((a,b)=>a.from<b.from?-1:a.from>b.from?1:0)}
function medPlanFor(d){let p=null;medVers().forEach(v=>{if(v.from<=d)p=v});return p}
function doseUg(it,amt){const f=frac(amt),s=num(it&&it.str);
 if(f==null||s==null)return null;
 if(it.unit==='µg')return f*s;if(it.unit==='mg')return f*s*1000;return null}
function planUg(v){let s=0;if(v)v.items.forEach(it=>it.doses.forEach(x=>{const u=doseUg(it,x.amt);if(u!=null)s+=u}));return Math.round(s*1000)/1000}
function stueck(it,amt){const f=frac(amt),fm=it.form||'Tablette';
 if(f!=null&&f>1)return amt+' '+(fm==='Kapsel'?'Kapseln':fm==='Tablette'?'Tabletten':fm);
 return amt+' '+fm}
const fmtUg=u=>u==null?'':fmt(u,Math.abs(u-Math.round(u))<.005?0:1)+' µg';
function amtTxt(it,amt){const u=doseUg(it,amt);return stueck(it,amt)+(u!=null?' · '+fmtUg(u):'')}
function medRows(d){const v=medPlanFor(d);if(!v)return [];const out=[];
 v.items.forEach(it=>it.doses.forEach(x=>out.push({it,x})));
 return out.sort((a,b)=>(hmMin(a.x.t)??0)-(hmMin(b.x.t)??0))}
function medLog(d){const r=S.days[d];return (r&&r.med)||{}}
function medRecalc(d){
 const r=dayRec(d),L=r.med||{},v=medPlanFor(d);let ug=0,any=false;
 if(v)v.items.forEach(it=>it.doses.forEach(x=>{const e=L[x.id];if(!e)return;any=true;
  if(e.s!=='ok')return;const u=doseUg(it,e.amt||x.amt);if(u!=null)ug+=u}));
 if(r.med&&!Object.keys(r.med).length)delete r.med;
 if(any&&v&&planUg(v)>0)r.medug=Math.round(ug*100)/100;else delete r.medug;
 if(!Object.keys(r).length)delete S.days[d];
}
function medDev(e,o){
 if(!e||e.s!=='ok')return false;
 const dt=Math.abs((hmMin(e.t)??0)-(hmMin(o.x.t)??0));
 return !!((e.amt&&e.amt!==o.x.amt)||(e.route&&e.route!==o.it.route)||e.note||dt>30);
}
function medDue(d){
 if(d!==todayStr())return '';
 const L=medLog(d),now=hmMin(nowHM()),open=medRows(d).filter(o=>!L[o.x.id]&&(hmMin(o.x.t)??0)<=now);
 if(!open.length)return '';
 return `<button class="note-line mdue" data-pm="mjump">Noch nicht abgehakt: ${open.map(o=>esc(o.it.name)+' '+o.x.t).join(', ')}</button>`;
}
function medSection(d){
 const rows=medRows(d);if(!rows.length)return '';
 const L=medLog(d),r=S.days[d]||{},isT=d===todayStr(),now=hmMin(nowHM()),v=medPlanFor(d),pu=planUg(v);
 const done=rows.filter(o=>L[o.x.id]).length;
 const nx=isT?rows.find(o=>!L[o.x.id]&&(hmMin(o.x.t)??0)>now):null;
 let h=`<section class="sec" id="medsec"><div class="sec-h"><h3>Medikamente</h3>
  <span class="mut">${pu?(r.medug!=null?fmtUg(r.medug)+' von '+fmtUg(pu):fmtUg(pu)+' geplant'):''}</span></div><div class="card list">`;
 rows.forEach(o=>{
  const {it,x}=o,e=L[x.id]||{},st=e.s||'',amt=e.amt||x.amt,route=e.route||it.route||'',t=e.t||x.t;
  const due=isT&&!st&&(hmMin(x.t)??0)<=now;
  const info=st==='ok'?`genommen ${esc(t)}${t!==x.t?` · Plan ${x.t}`:''}`:st==='skip'?`ausgelassen · Plan ${x.t}`:(due?`fällig seit ${x.t}`:`geplant ${x.t}`);
  h+=`<div class="mrow ${st}${due?' due':''}">
   <button class="mchk" data-pm="mtog" data-v="${x.id}" aria-label="${esc(it.name)} ${x.t} ${st==='ok'?'zurücknehmen':'abhaken'}">${st==='ok'?'✓':st==='skip'?'–':''}</button>
   <button class="mtx" data-pm="mdet" data-v="${x.id}"><b>${esc(it.name)} <em>${esc(amtTxt(it,amt))}</em></b>
    <small>${info}${route?' · '+esc(route):''}${e.note?' · '+esc(e.note):''}${medDev(e,o)?' · <i class="mdev">abweichend</i>':''}</small></button>
   <button class="ib sm" data-pm="mdet" data-v="${x.id}" aria-label="Abweichung oder Auslassen eintragen">⋯</button></div>`;
 });
 h+=`</div>${done<rows.length?'<button class="ghost" data-pm="mall">Alle wie geplant</button>':''}
  <p class="hint">${nx?`Nächste: ${esc(nx.it.name)} um ${nx.x.t}. `:''}Der Haken setzt ${isT?'die Uhrzeit von jetzt':'die geplante Uhrzeit'}. Abweichungen und Auslassen über ⋯.</p></section>`;
 return h;
}
function medDetSheet(d,id){
 const o=medRows(d).find(o=>o.x.id===id);if(!o)return;
 const e=medLog(d)[id]||{},{it,x}=o;ui.mdet={d,id};
 openSheet(`<div class="sh-h"><h2>${esc(it.name)}, ${x.t}</h2><button class="ib" data-pm="close" aria-label="Schließen">✕</button></div>
  <p class="mut" style="margin-top:0">Plan: ${esc(amtTxt(it,x.amt))}, ${esc(it.route||'')}, ${x.t}</p>
  <div class="grid2"><label class="lbl">Uhrzeit<input class="txt" type="time" id="mdt" value="${esc(e.t||x.t)}"></label>
  <label class="lbl">Menge<select class="txt" id="mda">${AMTS.map(a=>`<option ${(e.amt||x.amt)===a?'selected':''}>${a}</option>`).join('')}</select></label></div>
  <label class="lbl mt8">Einnahmeart<select class="txt" id="mdr">${ROUTES.map(r=>`<option ${(e.route||it.route)===r?'selected':''}>${r}</option>`).join('')}</select></label>
  <label class="lbl mt8">Notiz<input class="txt" id="mdn" value="${esc(e.note||'')}" placeholder="z. B. Milchprodukt vor 1,5 h"></label>
  <button class="primary" data-pm="msave">Als genommen speichern</button>
  <button class="ghost" data-pm="mskip">Ausgelassen</button>
  ${e.s?'<button class="link danger mt8" data-pm="mclr">Eintrag zurücksetzen</button>':''}`);
}

/* Planübersicht */
function medPlanTxt(v){
 if(!v)return '';
 const pu=planUg(v);
 return `<p class="mut" style="margin-top:0">${v.from>todayStr()?'Gilt ab':'Seit'} ${fD(v.from)}${pu?`, ${fmtUg(pu)} pro Tag`:''}</p>`
  +v.items.map(it=>`<div class="mplan"><b>${esc(it.name)}</b><small>${num(it.str)!=null?fmt(num(it.str),num(it.str)%1?1:0)+' '+esc(it.unit||'')+' je '+esc(it.form||'Tablette')+', ':''}${esc(it.route||'')}</small>
   ${it.doses.slice().sort((a,b)=>(hmMin(a.t)??0)-(hmMin(b.t)??0)).map(x=>`<span>${x.t} · ${esc(amtTxt(it,x.amt))}</span>`).join('')}</div>`).join('');
}
function medSettings(){
 const V=medVers(),cur=medPlanFor(todayStr())||last(V);
 return `<section class="sec"><h3>Medikamentenplan</h3><div class="card">
  ${cur?medPlanTxt(cur):'<p class="mut" style="margin-top:0">Noch kein Plan angelegt.</p>'}
  <button class="primary" data-pm="medplan">${V.length?'Plan ändern':'Plan anlegen'}</button>
  ${V.length?`<div class="mt16">${V.slice().reverse().map(v=>{const nx=V[V.indexOf(v)+1];
   const zr=v.from>todayStr()?`ab ${fD(v.from)}`:`${fD(v.from)} bis ${nx?fD(addDays(nx.from,-1)):'heute'}`;
   return `<div class="srow"><span>${zr}<small>${planUg(v)?fmtUg(planUg(v))+' pro Tag, ':''}${v.items.map(it=>esc(it.name)).join(', ')}</small></span>
    <button class="ib sm" data-pm="mvdel" data-v="${v.id}" aria-label="Version löschen">✕</button></div>`}).join('')}</div>
   <p class="hint">Bei einer Änderung bleibt der alte Plan mit seinem Zeitraum gespeichert. So ist jeder Tag der Dosis zugeordnet, die damals galt.</p>`:''}
 </div></section>`;
}

/* Planeditor im Blatt */
function medEdNew(){
 const cur=last(medVers());
 const items=cur?JSON.parse(JSON.stringify(cur.items)):[{id:uid(),name:'',str:null,unit:'µg',form:'Tablette',route:'sublingual',doses:[{id:uid(),t:'08:00',amt:'1'}]}];
 ui.medEd={from:todayStr(),items,txt:''};
}
function medEdHtml(){
 const E=ui.medEd,tot={it:0};
 let h=`<div class="sh-h"><h2>Medikamentenplan</h2><button class="ib" data-pm="close" aria-label="Schließen">✕</button></div>
  <label class="lbl">Gültig ab<input class="txt" type="date" data-mx="from" value="${esc(E.from)}"></label>
  <p class="hint">Ein neues Datum legt eine neue Version an, der bisherige Plan bleibt mit seinem Zeitraum erhalten. Dasselbe Datum wie eine bestehende Version überschreibt diese.</p>`;
 E.items.forEach((it,i)=>{
  const sum=it.doses.reduce((s,x)=>{const u=doseUg(it,x.amt);return u==null?s:s+u},0);
  h+=`<div class="card mt16 medit">
   <div class="grid2"><label class="lbl">Name<input class="txt" data-mx="i.${i}.name" value="${esc(it.name)}" placeholder="z. B. T3"></label>
    <label class="lbl">Form<select class="txt" data-mx="i.${i}.form">${FORMS.map(f=>`<option ${it.form===f?'selected':''}>${f}</option>`).join('')}</select></label></div>
   <div class="grid2 mt8"><label class="lbl">Stärke je Stück<input class="txt" data-mx="i.${i}.str" inputmode="decimal" value="${esc(dv(it.str))}" placeholder="unbekannt"></label>
    <label class="lbl">Einheit<select class="txt" data-mx="i.${i}.unit">${[['µg','µg'],['mg','mg'],['','ohne']].map(([u,l])=>`<option value="${u}" ${(it.unit||'')===u?'selected':''}>${l}</option>`).join('')}</select></label></div>
   <label class="lbl mt8">Einnahmeart<select class="txt" data-mx="i.${i}.route">${ROUTES.map(r=>`<option ${it.route===r?'selected':''}>${r}</option>`).join('')}</select></label>
   <span class="lbl mt16">Einnahmen</span>
   ${it.doses.map((x,j)=>{const u=doseUg(it,x.amt);return `<div class="mdose">
    <input class="txt" type="time" data-mx="i.${i}.d.${j}.t" value="${esc(x.t)}" aria-label="Uhrzeit">
    <select class="txt" data-mx="i.${i}.d.${j}.amt" aria-label="Menge">${AMTS.map(a=>`<option ${x.amt===a?'selected':''}>${a}</option>`).join('')}</select>
    <span class="mug">${u!=null?fmtUg(u):''}</span>
    <button class="ib sm" data-pm="mxdd" data-v="${i}.${j}" aria-label="Einnahme entfernen">✕</button></div>`}).join('')}
   <button class="link mt8" data-pm="mxad" data-v="${i}">+ Einnahme</button>
   ${sum?`<p class="hint">Summe ${fmtUg(sum)} pro Tag.</p>`:''}
   <button class="link danger mt8" data-pm="mxdi" data-v="${i}">Medikament entfernen</button></div>`;
 });
 const all=E.items.reduce((s,it)=>s+it.doses.reduce((t,x)=>{const u=doseUg(it,x.amt);return u==null?t:t+u},0),0);
 h+=`<button class="ghost" data-pm="mxai">+ Medikament</button>
  ${all?`<p class="hint">Gesamt ${fmtUg(all)} pro Tag.</p>`:''}
  <details class="card mt16"><summary>Plan als Text einfügen</summary>
   <p class="hint">Eine Zeile pro Medikament: Name | Stärke und Form | Einnahmeart | Uhrzeit Menge, Uhrzeit Menge.
   Beispiel: <i>Name | 25 µg Tablette | sublingual | 08:00 1/2, 14:00 1/4</i> oder <i>Name | Kapsel | geschluckt | 08:00 2</i></p>
   <textarea class="txt mt8" rows="4" data-mx="txt">${esc(E.txt||'')}</textarea>
   <button class="ghost" data-pm="mxtxt">Text übernehmen</button></details>
  <button class="primary" data-pm="mxsave">Plan speichern</button>`;
 return h;
}
function medEdRender(){const c=$('#sheetc');if(!c)return;const y=c.scrollTop;c.innerHTML=medEdHtml();c.scrollTop=y}
function medEdSet(path,val){
 const E=ui.medEd;if(!E)return;
 if(path==='from'||path==='txt'){E[path]=val;return}
 const p=path.split('.');const it=E.items[+p[1]];if(!it)return;
 if(p[2]==='d'){const x=it.doses[+p[3]];if(x)x[p[4]]=val;return}
 it[p[2]]=p[2]==='str'?num(val):val;
}
function medParse(txt){
 const out=[];
 String(txt||'').split('\n').map(l=>l.trim()).filter(Boolean).forEach(l=>{
  const q=l.split('|').map(x=>x.trim());if(q.length<4)return;
  const it={id:uid(),name:q[0],str:null,unit:'',form:'Tablette',route:/subl/i.test(q[2])?'sublingual':'geschluckt',doses:[]};
  const m=q[1].match(/^([\d.,]+)\s*(µg|ug|mcg|mg)\s*(\S+)?/i);
  if(m){it.str=num(m[1]);it.unit=/mg/i.test(m[2])?'mg':'µg';if(m[3])it.form=m[3]}else if(q[1])it.form=q[1];
  q[3].split(',').forEach(z=>{const k=z.trim().match(/^(\d{1,2}:\d{2})\s+(\S+)$/);
   if(k&&AMTS.includes(k[2]))it.doses.push({id:uid(),t:k[1].padStart(5,'0'),amt:k[2]})});
  if(it.name&&it.doses.length)out.push(it);
 });
 return out;
}
function medEdSave(){
 const E=ui.medEd;if(!E)return;
 if(!/^\d{4}-\d{2}-\d{2}$/.test(E.from||''))return toast('Datum fehlt');
 const items=E.items.map(it=>({id:it.id||uid(),name:String(it.name||'').trim(),str:num(it.str),unit:it.unit||'',form:it.form||'Tablette',route:it.route||'geschluckt',
  doses:it.doses.filter(x=>hmMin(x.t)!=null&&frac(x.amt)!=null).map(x=>({id:x.id||uid(),t:x.t,amt:x.amt}))}))
  .filter(it=>it.name&&it.doses.length);
 if(!items.length)return toast('Mindestens ein Medikament mit Name und Einnahme');
 if(!S.meds)S.meds={v:[]};
 const ex=S.meds.v.find(v=>v.from===E.from);
 if(ex)ex.items=items;else S.meds.v.push({id:uid(),from:E.from,items});
 S.meds.v.sort((a,b)=>a.from<b.from?-1:1);
 Object.keys(S.days).forEach(d=>{if(S.days[d].med)medRecalc(d)});
 ui.medEd=null;save();closeSheet();toast(ex?'Plan ab '+fD(E.from)+' überschrieben':'Plan ab '+fD(E.from)+' gespeichert');
}

/* Dosis als Stufenlinie über anderen Verläufen */
function doseOv(){
 const V=medVers().filter(v=>planUg(v)>0);if(!V.length)return null;
 return {steps:V.map(v=>[v.from,planUg(v)]),dots:series('medug'),color:'#FF5A1F'};
}
function ovHint(k){
 if(!['hr1','t1','ankle'].includes(k)||!doseOv())return '';
 return '<p class="hint"><span class="ovk"></span> Orange gestrichelt: Gesamtdosis laut Plan, orange Punkte: abgehakte Tagessumme, beides in µg auf der rechten Achse.</p>';
}
const ANKY={y0:-.25,y1:3.25,ticks:[0,1,2,3],dec:0};

/* ---------- Health: Knöchel ---------- */
function hKnoechel(){
 ankMigrate();
 let h='';
 const wl=[];for(let i=0;i<14;i++){const d=addDays(todayStr(),-i),w=ankWarn(d);if(w.length)wl.push([d,w])}
 if(wl.length)h+=ankWarnBox(wl[0][1],wl[0][0])+(wl.length>1?`<p class="hint" style="margin-top:0">In den letzten 14 Tagen an ${wl.length} Tagen ein Warnhinweis.</p>`:'');
 const all=series('ankle'),wk={};
 all.forEach(([d,v])=>{const m=monday(d);(wk[m]=wk[m]||[]).push(v)});
 const c=cutoff(),wpts=Object.keys(wk).sort().map(m=>[addDays(m,3),avg(wk[m])]).filter(p=>p[0]>=c);
 h+=`<section class="sec" style="margin-top:6px"><h3>Skala im Wochenschnitt</h3>${ranges()}<div class="card">
  ${chartSVG([{pts:wpts,color:C.chalk,dots:true,r:3.4,op:1,w:2.2}],Object.assign({label:'Knöchel-Skala im Wochenschnitt',ov:doseOv(),
   empty:'Für den Wochenschnitt braucht es Einträge aus mindestens zwei Wochen.'},ANKY))}${ovHint('ankle')}</div>`;
 const W=[];for(let i=0;i<8;i++)W.push(addDays(monday(todayStr()),-7*i));
 const rows=W.map(m=>{const ds=daysIn(m,addDays(m,6)),v=ds.map(ankVal).filter(x=>x!=null);
  const am=ds.filter(d=>num((S.days[d]||{}).ankleAM)===1).length,s3=v.filter(x=>x===3).length;
  const mu=ds.map(d=>num((S.days[d]||{}).medug)).filter(x=>x!=null);
  return {m,n:v.length,a:avg(v),s3,am,mu:mu.length?avg(mu):null}}).filter(r=>r.n||r.am);
 if(rows.length)h+=`<div class="card mt8"><table class="t"><thead><tr><th>KW</th><th>Ø Skala</th><th>Stufe 3</th><th>morgens dick</th><th>Ø Dosis</th></tr></thead><tbody>
  ${rows.map(r=>`<tr><td>${isoWeek(r.m)}<small>${fDs(r.m)}</small></td><td>${fmt(r.a,1)}<small>${r.n} Tage</small></td>
   <td class="${r.s3?'ref-hart-hi':''}">${r.s3}</td><td class="${r.am?'ref-hart-hi':''}">${r.am}</td><td>${r.mu!=null?fmtUg(r.mu):'–'}</td></tr>`).join('')}</tbody></table></div>`;
 h+='</section>';
 /* Umfang */
 const kd=ui.kdate||todayStr(),me=S.measures.find(x=>x.date===kd),gv=f=>me&&me.vals[f]!=null?dv(me.vals[f]):'';
 const both=S.measures.filter(x=>x.vals[ANKF[0]]!=null&&x.vals[ANKF[1]]!=null).map(x=>({d:x.date,m:num(x.vals[ANKF[0]]),a:num(x.vals[ANKF[1]])}));
 const lastB=last(both);
 h+=`<section class="sec"><h3>Knöchelumfang rechts</h3><div class="card">
  <label class="lbl">Datum<input class="txt" type="date" data-ka="date" value="${kd}"></label>
  <div class="grid2 mt8"><label class="fld"><span>Morgens</span><div class="in"><input data-ka="${esc(ANKF[0])}" inputmode="decimal" autocomplete="off" value="${gv(ANKF[0])}"><i>cm</i></div></label>
   <label class="fld"><span>Abends</span><div class="in"><input data-ka="${esc(ANKF[1])}" inputmode="decimal" autocomplete="off" value="${gv(ANKF[1])}"><i>cm</i></div></label></div>
  <p class="hint">Schmalste Stelle über dem Knöchel, jedes Mal dieselbe Stelle, Maßband ohne Zug. Mittwoch und Samstag, morgens direkt nach dem Aufstehen und abends vor dem Schlafen.</p>
  ${lastB?`<div class="trend"><div><small>Abends − morgens</small><b>${sg(lastB.a-lastB.m,1)}</b><em>cm am ${fDs(lastB.d)}</em></div>
   <div><small>Morgens</small><b>${fmt(lastB.m,1)}</b><em>cm</em></div><div><small>Abends</small><b>${fmt(lastB.a,1)}</b><em>cm</em></div></div>`:''}
  ${both.length>1?chartSVG([{pts:both.map(x=>[x.d,x.a-x.m]),color:C.blue,dots:true,r:3.2,op:1,w:2.2}],{label:'Differenz abends minus morgens',h:160})
   +'<p class="hint">Differenz abends minus morgens in cm. Steigt sie über Wochen, sammelt sich tagsüber mehr Wasser in den Beinen.</p>'
   :'<p class="hint">Der Verlauf der Differenz erscheint ab zwei Tagen mit beiden Werten.</p>'}
  ${both.length?`<table class="t mt8"><thead><tr><th>Datum</th><th>morgens</th><th>abends</th><th>Differenz</th></tr></thead><tbody>
   ${both.slice(-8).reverse().map(x=>`<tr><td>${fD(x.d)}</td><td>${fmt(x.m,1)}</td><td>${fmt(x.a,1)}</td><td>${sg(x.a-x.m,1)}</td></tr>`).join('')}</tbody></table>`:''}
 </div></section>`;
 /* Fotos */
 const kp=(S.photos||[]).filter(p=>/^Knöchel/.test(p.pose)).length;
 h+=`<section class="sec"><h3>Fotos</h3><div class="card"><p class="mut" style="margin-top:0">Mittwoch und Samstag beide Knöchel von der Seite, samstags dazu Körper vorne, seitlich und hinten. Gleiches Licht, gleiche Uhrzeit, gleicher Abstand.${kp?` Bisher ${kp} Knöchelfotos.`:''}</p>
  <button class="primary" data-pm="phk" data-v="Knöchel links seitlich">Knöchelfotos hinzufügen</button>
  ${kp?'<button class="ghost" data-pm="phv" data-v="Knöchel links seitlich">Vergleich ansehen</button>':''}</div></section>`;
 return h;
}

/* ---------- Health: Medikamente ---------- */
function hMed(){
 const V=medVers();
 if(!V.length)return `<p class="empty">Noch kein Medikamentenplan. Leg ihn hier oder in den Einstellungen an. Danach kannst du jeden Tag im Tageslog abhaken.</p><button class="ghost" data-pm="medplan">Plan anlegen</button>`;
 const cur=medPlanFor(todayStr())||last(V),t=todayStr(),now=hmMin(nowHM());
 let pl=0,ok=0,sk=0,dev=0;
 for(let i=0;i<14;i++){const d=addDays(t,-i),L=medLog(d);
  medRows(d).forEach(o=>{if(i===0&&(hmMin(o.x.t)??0)>now)return;pl++;const e=L[o.x.id];if(!e)return;if(e.s==='ok'){ok++;if(medDev(e,o))dev++}else sk++})}
 let h=`<section class="sec" style="margin-top:6px"><h3>Aktueller Plan</h3><div class="card">${medPlanTxt(cur)}<button class="ghost" data-pm="medplan">Plan ändern</button></div></section>`;
 h+=`<section class="sec"><h3>Letzte 14 Tage</h3><div class="trend" style="margin-top:0"><div><small>Abgehakt</small><b>${ok}</b><em>von ${pl} fälligen</em></div>
  <div><small>Ausgelassen</small><b>${sk}</b><em>Einnahmen</em></div><div><small>Abweichend</small><b>${dev}</b><em>Zeit, Menge, Art, Notiz</em></div></div></section>`;
 h+=`<section class="sec"><h3>Dosis über Ruhepuls, Temperatur und Knöchel</h3>${ranges()}`;
 const L=S.settings.labels,c=cutoff();
 [['hr1',L[2],{}],['t1',L[0],{}],['ankle','Knöchel-Skala',ANKY]].forEach(([k,l,o])=>{
  const all=series(k).filter(p=>p[0]>=c),ro=rolling(series(k)).filter(p=>p[0]>=c);
  h+=`<div class="card mt8"><b class="chl">${esc(l)}</b>${chartSVG([{pts:all,color:C.mut,dots:true,line:false},{pts:ro,color:C.chalk,w:2.2}],
   Object.assign({label:l,ov:doseOv(),h:170,empty:'Noch zu wenig Werte im Zeitraum.'},o))}</div>`});
 h+=`<p class="hint"><span class="ovk"></span> Orange gestrichelt: Gesamtdosis laut Plan, orange Punkte: abgehakte Tagessumme, beides in µg auf der rechten Achse. Weiße Linie: 7-Tage-Schnitt, graue Punkte: Tageswerte.</p></section>`;
 const lg=Object.keys(S.days).filter(d=>S.days[d].med).sort().slice(-10).reverse();
 if(lg.length)h+=`<section class="sec"><h3>Tagessummen</h3><div class="card list">${lg.map(d=>{const Lg=medLog(d),rows=medRows(d);
  const okN=rows.filter(o=>(Lg[o.x.id]||{}).s==='ok').length,skN=rows.filter(o=>(Lg[o.x.id]||{}).s==='skip').length;
  return `<button class="row" data-pa="dgo" data-v="${d}"><span class="grow"><b>${fD(d)}</b><small>${okN} von ${rows.length} genommen${skN?`, ${skN} ausgelassen`:''}</small></span><span class="mut">${fmtUg(num(S.days[d].medug))}</span></button>`}).join('')}</div></section>`;
 return h;
}

/* ---------- Fotos im Backup ---------- */
function blobToData(b){return new Promise(res=>{const fr=new FileReader();fr.onload=()=>res(fr.result);fr.onerror=()=>res(null);fr.readAsDataURL(b)})}
async function dataToBlob(u){const r=await fetch(u);return r.blob()}
async function phExport(){
 const out={};let n=0;
 for(const p of (S.photos||[])){
  try{let b=null;
   if(p.blobKey)b=await DB.get(p.blobKey);
   if(!b&&p.asset){const r=await fetch(phUrl(p));if(r.ok)b=await r.blob()}
   if(b){const u=await blobToData(b);if(u){out[p.id]=u;n++}}
  }catch(e){}
 }
 return n?out:null;
}
async function phImport(){
 const P=ui.pendingPhotos;ui.pendingPhotos=null;if(!P)return 0;let n=0;
 for(const p of (S.photos||[])){
  const u=P[p.id];if(!u)continue;
  try{
   const b=await dataToBlob(u);
   if(AS){if(!p.asset){const r=await AS.upload(b);p.asset=r.id;delete p.blobKey;n++}}
   else{const k='photo-'+p.id,have=await DB.get(k);if(!have){await DB.set(k,b);n++}p.blobKey=k;delete p.asset;PURL[p.id]=URL.createObjectURL(b)}
  }catch(e){}
 }
 phHydrate();return n;
}
function mergeExtra(src){
 const pid=new Set((S.photos||[]).map(p=>p.id));
 (src.photos||[]).forEach(p=>{if(!pid.has(p.id))S.photos.push(p)});
 S.photos.sort((a,b)=>a.date<b.date?-1:1);
 if(src.meds&&src.meds.v){if(!S.meds)S.meds={v:[]};const have=new Set(S.meds.v.map(v=>v.from));
  src.meds.v.forEach(v=>{if(!have.has(v.from))S.meds.v.push(v)});S.meds.v.sort((a,b)=>a.from<b.from?-1:1)}
}
function ankPhStats(A,B){
 const m=d=>S.measures.find(x=>x.date===d)||{vals:{}},ab=d=>num(m(d).vals[ANKF[1]]);
 const df=d=>{const x=num(m(d).vals[ANKF[0]]),y=ab(d);return x!=null&&y!=null?y-x:null};
 const pair=(a,b,k)=>a==null&&b==null?'–':`${a==null?'–':fmt(a,k)} → ${b==null?'–':fmt(b,k)}`;
 return `<div class="trend" style="margin-top:8px"><div><small>Skala</small><b class="pb">${pair(ankVal(A.date),ankVal(B.date),0)}</b><em>0 bis 3</em></div>
  <div><small>Umfang abends</small><b class="pb">${pair(ab(A.date),ab(B.date),1)}</b><em>cm</em></div>
  <div><small>Abends − morgens</small><b class="pb">${pair(df(A.date),df(B.date),1)}</b><em>cm</em></div></div>`;
}

/* ---------- Eingaben ---------- */
document.addEventListener('click',e=>{
 if(!S)return;const t=e.target.closest('[data-pm]');if(!t)return;
 const a=t.dataset.pm,v=t.dataset.v,d=ui.date||todayStr();
 if(a==='close'){ui.medEd=null;return closeSheet()}
 if(a==='ankam'){const r=dayRec(d),x=+v;if(num(r.ankleAM)===x)delete r.ankleAM;else r.ankleAM=x;if(!Object.keys(r).length)delete S.days[d];save();return render()}
 if(a==='ank'){const r=dayRec(d),x=+v;if(num(r.ankle)===x)delete r.ankle;else r.ankle=x;if(!Object.keys(r).length)delete S.days[d];save();return render()}
 if(a==='mtog'){const r=dayRec(d),L=r.med||(r.med={}),o=medRows(d).find(o=>o.x.id===v);if(!o)return;
  if(L[v]&&L[v].s==='ok')delete L[v];else L[v]={s:'ok',t:d===todayStr()?nowHM():o.x.t};
  medRecalc(d);save();return render()}
 if(a==='mall'){const r=dayRec(d),L=r.med||(r.med={});medRows(d).forEach(o=>{if(!L[o.x.id])L[o.x.id]={s:'ok',t:o.x.t}});
  medRecalc(d);save();render();return toast('Alle Einnahmen wie geplant abgehakt')}
 if(a==='mdet')return medDetSheet(d,v);
 if(a==='msave'||a==='mskip'){const M=ui.mdet;if(!M)return;const o=medRows(M.d).find(o=>o.x.id===M.id);if(!o)return;
  const r=dayRec(M.d),L=r.med||(r.med={}),note=($('#mdn')||{}).value||'';let en;
  if(a==='msave'){const amt=$('#mda').value,route=$('#mdr').value,tt=$('#mdt').value||o.x.t;
   en={s:'ok',t:tt};if(amt!==o.x.amt)en.amt=amt;if(route!==(o.it.route||''))en.route=route}
  else en={s:'skip'};
  if(note.trim())en.note=note.trim();
  L[M.id]=en;medRecalc(M.d);ui.mdet=null;save();return closeSheet()}
 if(a==='mclr'){const M=ui.mdet;if(!M)return;const r=dayRec(M.d);if(r.med)delete r.med[M.id];medRecalc(M.d);ui.mdet=null;save();return closeSheet()}
 if(a==='mjump'){const el=document.getElementById('medsec');if(el)el.scrollIntoView({behavior:'smooth',block:'start'});return}
 if(a==='medplan'){medEdNew();return openSheet(medEdHtml())}
 if(a==='mxad'){const it=ui.medEd.items[+v];const lt=last(it.doses);it.doses.push({id:uid(),t:lt?lt.t:'08:00',amt:lt?lt.amt:'1'});return medEdRender()}
 if(a==='mxdd'){const [i,j]=v.split('.').map(Number);ui.medEd.items[i].doses.splice(j,1);return medEdRender()}
 if(a==='mxai'){ui.medEd.items.push({id:uid(),name:'',str:null,unit:'',form:'Kapsel',route:'geschluckt',doses:[{id:uid(),t:'08:00',amt:'1'}]});return medEdRender()}
 if(a==='mxdi'){ui.medEd.items.splice(+v,1);return medEdRender()}
 if(a==='mxtxt'){const it=medParse(ui.medEd.txt);if(!it.length)return toast('Keine Zeile erkannt');ui.medEd.items=it;ui.medEd.txt='';medEdRender();return toast(it.length+(it.length>1?' Medikamente':' Medikament')+' übernommen')}
 if(a==='mxsave')return medEdSave();
 if(a==='mvdel'){askC('Diese Planversion löschen? Tage in ihrem Zeitraum fallen dann auf die Version davor zurück.').then(ok=>{if(!ok)return;
  S.meds.v=S.meds.v.filter(x=>x.id!==v);Object.keys(S.days).forEach(x=>{if(S.days[x].med)medRecalc(x)});save();render()});return}
 if(a==='bkph'){S.settings.bkPhotos=!S.settings.bkPhotos;save();return render()}
 if(a==='phk'){ui.ppose=v;ui.pdate=todayStr();return phSheet()}
 if(a==='phv'){ui.prog='fotos';ui.ppose=v;ui.pa=null;ui.pb=null;return go('progress')}
});
document.addEventListener('input',e=>{
 if(!S)return;const t=e.target,ds=t.dataset;if(!ds)return;
 if(ds.mx){medEdSet(ds.mx,t.value);return}
 if(ds.ka&&ds.ka!=='date'){const d=ui.kdate||todayStr();let m=S.measures.find(x=>x.date===d);
  const v=num(t.value);
  if(!m){if(v==null)return;m={date:d,vals:{}};S.measures.push(m);S.measures.sort((a,b)=>a.date.localeCompare(b.date))}
  if(v==null)delete m.vals[ds.ka];else m.vals[ds.ka]=v;
  if(!Object.keys(m.vals).length)S.measures=S.measures.filter(x=>x!==m);
  save();return}
});
document.addEventListener('change',e=>{
 if(!S)return;const t=e.target,ds=t.dataset;if(!ds)return;
 if(ds.mx){medEdSet(ds.mx,t.value);if(t.tagName==='SELECT'||t.type==='time')medEdRender();return}
 if(ds.ka==='date'){ui.kdate=t.value||todayStr();return render()}
 if(ds.ka)return render();
});
