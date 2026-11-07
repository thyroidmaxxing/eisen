
/* ==================== Messrhythmus und Samstags-Check-in ====================
   Taille jeden Samstag als eigener Eintrag im Tageslog-Datensatz (waist1, waist2,
   waist als Mittelwert, waistWC 1 oder 0 für den Toilettengang).
   Volles Maßband alle 28 Tage, Fotos alle 14 Tage, beides am Samstag fällig.
   Der Check-in bündelt die Woche von Sonntag bis Samstag. */

const MF_NEU=['Hals (schmalste Stelle)','Brust','Arm rechts','Oberschenkel rechts','Wade rechts','Hüfte','Knöchel rechts morgens','Knöchel rechts abends'];
function mrMigrate(){
 if(!S||!S.settings||(S.settings.mrV||0)>=2)return false;
 /* alte Feldnamen aus dem Sheet-Import vereinheitlichen, damit der Verlauf durchgeht */
 const RN={'Taile (Nabel)':'Taille (Nabel)','Hals':'Hals (schmalste Stelle)'};
 (S.measures||[]).forEach(m=>Object.keys(RN).forEach(k=>{if(m.vals&&m.vals[k]!=null){if(m.vals[RN[k]]==null)m.vals[RN[k]]=m.vals[k];delete m.vals[k]}}));
 const rest=(S.settings.mfields||[]).filter(f=>!MF_NEU.includes(f)&&!RN[f]&&!/^Tail?le/i.test(f));
 S.settings.mfields=MF_NEU.concat(rest);
 S.settings.measureEvery=28;
 if(S.settings.photoEvery==null)S.settings.photoEvery=14;
 S.settings.mrV=2;return true;
}
const isAnkOnly=m=>Object.keys(m.vals||{}).every(k=>ANKF.includes(k));
function lastFull(){for(let i=S.measures.length-1;i>=0;i--){if(!isAnkOnly(S.measures[i]))return S.measures[i]}return null}
const nextSat=d=>addDays(d,(6-pd(d).getDay()+7)%7);
function fullDue(){const m=lastFull();return m?nextSat(addDays(m.date,num(S.settings.measureEvery)||28)):nextSat(todayStr())}
function lastPhotoSet(){return last((S.photos||[]).filter(x=>/^Körper/.test(x.pose)).map(x=>x.date).sort())}
function photoDue(){const l=lastPhotoSet();return l?nextSat(addDays(l,num(S.settings.photoEvery)||14)):nextSat(todayStr())}
function nearMk(d,k,tol=14){let best=null,bd=1e9;S.measures.forEach(m=>{if(!m.vals||m.vals[k]==null)return;const x=Math.abs(daysBetween(m.date,d));if(x<=tol&&x<bd){bd=x;best=m}});return best}

/* ---------- Taille ---------- */
function waistPts(){
 const out=[];
 Object.keys(S.days).forEach(d=>{const r=S.days[d],v=num(r.waist);if(v!=null)out.push({d,v,wc:num(r.waistWC)})});
 S.measures.forEach(m=>{const v=num(m.vals&&m.vals['Taille (Nabel)']);
  if(v!=null&&!out.some(x=>!x.alt&&Math.abs(daysBetween(x.d,m.date))<=3))out.push({d:m.date,v,wc:null,alt:true})});
 return out.sort((a,b)=>a.d<b.d?-1:a.d>b.d?1:0);
}
function waistNear(d,tol=3){let best=null,bd=1e9;waistPts().filter(x=>!x.alt).forEach(x=>{const k=Math.abs(daysBetween(x.d,d));if(k<=tol&&k<bd){bd=k;best=x}});return best}
function waistRecalc(d){
 const r=dayRec(d),a=[num(r.waist1),num(r.waist2)].filter(x=>x!=null);
 if(a.length&&r.waistWC!=null)r.waist=Math.round(avg(a)*100)/100;else delete r.waist;
 if(r.waist1==null)delete r.waist1;if(r.waist2==null)delete r.waist2;
 if(!Object.keys(r).length)delete S.days[d];
}
function dWaist(A,B){const x=waistNear(A,7),y=waistNear(B,7);
 if(x&&y)return sg(y.v-x.v,1);
 const g=(d)=>{const m=nearMk(d,'Taille (Nabel)');return m?num(m.vals['Taille (Nabel)']):null};const p=g(A),q=g(B);
 return p!=null&&q!=null?sg(q-p,1):'–'}
function waistMsg(d){
 const r=S.days[d]||{},wc=num(r.waistWC),a=[num(r.waist1),num(r.waist2)];
 const both=a[0]!=null&&a[1]!=null,diff=both?Math.abs(a[0]-a[1]):null;
 if((a[0]!=null||a[1]!=null)&&wc==null)return '<p class="hint warn">Bitte noch den Toilettengang angeben. Erst dann zählt die Messung.</p>';
 if(r.waist!=null)return `<p class="hint">Gespeichert: <b>${fmt(num(r.waist),1)} cm</b>${both?', Mittelwert aus beiden Messungen':', aus einer Messung'}.${diff!=null&&diff>1?` <span class="warn">Die Messungen liegen ${fmt(diff,1)} cm auseinander, miss besser ein drittes Mal.</span>`:''}</p>`;
 return '';
}
function waistCard(){
 const d=ui.wdate||todayStr(),r=S.days[d]||{},wc=num(r.waistWC);
 const P=waistPts(),f=ui.wf||'alle',c=cutoff();
 const Pc=P.filter(x=>x.d>=c&&(f==='alle'||(f==='ja'?x.wc===1:x.wc===0)));
 const msg=`<div id="wamsg">${waistMsg(d)}</div>`;
 return `<section class="sec" style="margin-top:6px"><h3>Taille, jeden Samstag</h3><div class="card">
  <label class="lbl">Datum<input class="txt" type="date" data-wa="date" value="${d}"></label>
  <div class="grid2 mt8"><label class="fld"><span>Messung 1</span><div class="in"><input data-wa="waist1" inputmode="decimal" autocomplete="off" value="${esc(dv(r.waist1))}"><i>cm</i></div></label>
   <label class="fld"><span>Messung 2</span><div class="in"><input data-wa="waist2" inputmode="decimal" autocomplete="off" value="${esc(dv(r.waist2))}"><i>cm</i></div></label></div>
  <div class="srow" style="border-top:0;margin-top:4px"><span>Toilettengang vorher</span><div class="chips">
   <button class="chip ${wc===1?'on':''}" data-pm="wawc" data-v="1">Ja</button><button class="chip ${wc===0?'on':''}" data-pm="wawc" data-v="0">Nein</button></div></div>
  <p class="hint" style="margin-top:2px">Morgens nüchtern, stehend, entspannt nach normalem Ausatmen, Maßband waagerecht auf Nabelhöhe, nicht ziehen.</p>${msg}</div>
  <div class="mt8">${ranges()}</div>
  <div class="seg sm">${[['alle','Alle'],['ja','Nur mit Toilettengang'],['nein','Nur ohne']].map(([v,l])=>`<button class="${f===v?'on':''}" data-a="seg" data-k="wf" data-v="${v}">${l}</button>`).join('')}</div>
  <div class="card">${chartSVG([
    {pts:Pc.map(x=>[x.d,x.v]),color:C.chalk,w:1.6},
    {pts:Pc.filter(x=>x.wc===1).map(x=>[x.d,x.v]),color:C.chalk,dots:true,line:false,r:4,op:1},
    {pts:Pc.filter(x=>x.wc===0).map(x=>[x.d,x.v]),color:C.chalk,dots:true,line:false,r:4,hollow:true},
    {pts:Pc.filter(x=>x.alt).map(x=>[x.d,x.v]),color:C.mut,dots:true,line:false,r:2.8,op:.9}],
   {label:'Taille pro Woche',dec:1,r:{pts:rolling(series('w')),color:C.blue,dec:1,unit:'kg'},
    empty:f==='alle'?'Für den Verlauf braucht es mindestens zwei Wochen mit Taille.':'Mit diesem Filter gibt es noch keine zwei Messungen.'})}
  <div class="legend"><span>${dot(C.chalk)}mit Toilettengang</span><span><i class="dot hollow"></i>ohne</span>${P.some(x=>x.alt)?`<span>${dot(C.mut)}ältere Messungen</span>`:''}<span><i class="lnk" style="background:${C.blue}"></i>Gewicht, 7-Tage-Schnitt, rechte Achse</span></div></div></section>`;
}

/* ---------- Samstag: was ist fällig ---------- */
function satDue(d){
 const t=todayStr();if(d!==t)return '';
 const sat=pd(t).getDay()===6,o=[],r=S.days[t]||{};
 if(sat&&num(r.waist)==null)o.push('Taille');
 if(t>=photoDue()&&!(S.photos||[]).some(x=>x.date===t&&/^Körper/.test(x.pose)))o.push('Fotos');
 if(t>=fullDue())o.push('volles Maßband');
 if(!o.length&&!sat)return '';
 const txt=o.length?(o.length>1?o.slice(0,-1).join(', ')+' und '+last(o):o[0])+' fällig':'alles erledigt';
 return `<button class="note-line sat" data-pm="goci">${sat?'Samstag-Check-in':'Nachholen'}: ${txt}</button>`;
}

/* ---------- Check-in ---------- */
function ciEnd(){if(ui.ciEnd)return ui.ciEnd;const t=todayStr();return addDays(t,-((pd(t).getDay()+1)%7))}
function pCheckin(){
 const e=ciEnd(),a=addDays(e,-6),D=daysIn(a,e),P=daysIn(addDays(a,-7),addDays(e,-7)),t=todayStr();
 const A=(f,X)=>{const v=X.map(x=>dayVal(x,f)).filter(x=>x!=null);return v.length?avg(v):null};
 const N=(f,X)=>X.filter(x=>dayVal(x,f)!=null).length;
 const sgr=(x,k)=>{const r=Number(x.toFixed(k));return sg(r===0?0:r,k)};
 const dl=(c,p,k,u)=>c!=null&&p!=null?`${sgr(c-p,k)}${u?' '+u:''} zur Vorwoche`:'Vorwoche fehlt';
 const cov=f=>`${N(f,D)} von 7 Tagen`;
 const tile=(lab,val,sub,cls='')=>`<div class="ci ${cls}"><small>${lab}</small><b>${val}</b><em>${sub}</em></div>`;
 const w=A('w',D),wp=A('w',P),k=A('kcal',D),kp=A('kcal',P);
 const pr=A('p',D),cb=A('c',D),ft=A('f',D),hr=A('hr1',D),hp=A('hr1',P),tt=A('t1',D),tp=A('t1',P),sl=A('sleep',D),sp=A('sleep',P);
 const bs=A('bps1',D),bd=A('bpd1',D),bsp=A('bps1',P),bdp=A('bpd1',P);
 const WP=waistPts().filter(x=>!x.alt),wk=last(WP.filter(x=>x.d>=a&&x.d<=e)),wv=last(WP.filter(x=>x.d<a&&x.d>=addDays(a,-7)));
 const ak=A('ankle',D),am=D.filter(x=>num((S.days[x]||{}).ankleAM)===1).length,s3=D.filter(x=>ankVal(x)===3).length,aw=D.some(x=>ankWarn(x).length);
 const mv=medPlanFor(e),mp=planUg(mv),mu=D.map(x=>num((S.days[x]||{}).medug)).filter(x=>x!=null);
 const ses=S.sessions.filter(s=>s.date>=a&&s.date<=e);
 const r0=x=>x==null?'–':Math.round(x);
 let h=`<div class="cihead"><button class="ib" data-pm="cinav" data-v="-1" aria-label="Vorwoche">‹</button>
  <div><b>Check-in KW ${isoWeek(e)}</b><span>${fD(a)} bis ${fD(e)}${e>t?', läuft noch':''}</span></div>
  <button class="ib" data-pm="cinav" data-v="1" aria-label="Nächste Woche" ${e>=ciEndDefault()?'disabled':''}>›</button></div>`;
 /* fällig */
 const phW=(S.photos||[]).filter(x=>x.date>=a&&x.date<=e&&/^Körper/.test(x.pose)),pd2=photoDue();
 const mW=S.measures.filter(m=>m.date>=a&&m.date<=e&&!isAnkOnly(m)),fd=fullDue();
 const row=(ok,txt,btn)=>`<div class="srow"><span>${dot(ok===1?C.grn:ok===0?C.yel:C.mut)}${txt}</span>${btn||''}</div>`;
 h+=`<div class="card list cidue">`
  +row(wk?1:0,wk?`Taille ${fmt(wk.v,1)} cm am ${fDs(wk.d)}`:'Taille diese Woche fehlt',wk?'':'<button class="link" data-pm="gok">Eintragen</button>')
  +(phW.length?row(1,`Fotos am ${fDs(last(phW).date)}`):pd2<=e?row(0,'Fotos fällig, alle '+(num(S.settings.photoEvery)||14)+' Tage','<button class="link" data-pm="ciph">Aufnehmen</button>'):row(2,`Fotos wieder am ${fD(pd2)}`))
  +(mW.length?row(1,`Volles Maßband am ${fDs(last(mW).date)}`):fd<=e?row(0,'Volles Maßband fällig, alle '+(num(S.settings.measureEvery)||28)+' Tage','<button class="link" data-pm="gok">Messen</button>'):row(2,`Volles Maßband wieder am ${fD(fd)}`))
  +`</div>`;
 /* Kacheln */
 h+=`<div class="cigrid mt8">`
  +tile('Gewicht Ø',w!=null?fmt(w,1)+' kg':'–',`${dl(w,wp,2,'kg')}${w!=null&&wp?`, ${sgr((w-wp)/wp*100,2)} %`:''}<br>${cov('w')}`)
  +tile('Kalorien Ø',k!=null?Math.round(k).toLocaleString('de-DE'):'–',`${dl(k,kp,0,'kcal')}<br>${cov('kcal')}`)
  +tile('Makros Ø',`${r0(pr)} / ${r0(cb)} / ${r0(ft)}`,'Protein / Carbs / Fett in g')
  +tile('Ruhepuls Ø',hr!=null?fmt(hr,0)+' bpm':'–',`${dl(hr,hp,0,'bpm')}<br>${cov('hr1')}`)
  +tile('Temperatur Ø',tt!=null?fmt(tt,2)+' °C':'–',`${dl(tt,tp,2,'°C')}<br>${cov('t1')}`)
  +tile('Schlaf Ø',sl!=null?fmt(sl,1)+' h':'–',`${dl(sl,sp,1,'h')}<br>${cov('sleep')}`)
  +tile('Blutdruck Ø',bs!=null&&bd!=null?`${Math.round(bs)}/${Math.round(bd)}`:'–',
    `${bs!=null&&bsp!=null?`${sgr(bs-bsp,0)}/${sgr(bd-bdp,0)} zur Vorwoche`:'Vorwoche fehlt'}<br>${cov('bps1')}`)
  +tile('Taille',wk?fmt(wk.v,1)+' cm':'–',wk?`Toilettengang ${wk.wc===1?'ja':'nein'}${wv?`<br>${sgr(wk.v-wv.v,1)} cm zur Vorwoche${wv.wc!==wk.wc?', anderer Toilettenstatus':''}`:''}`:'diese Woche noch nicht gemessen',wk?'':'warn')
  +tile('Knöchel Ø',ak!=null?fmt(ak,1):'–',`Morgens geschwollen an ${am} ${am===1?'Tag':'Tagen'}, Stufe 3 an ${s3}<br>${cov('ankle')}`,aw?'bad':'')
  +tile('T3 pro Tag',mu.length?fmtUg(avg(mu)):'–',mv?`Plan ${fmtUg(mp)||'ohne µg'}, abgehakt an ${mu.length} von 7 Tagen`:'kein Plan in dieser Woche')
  +tile('Training',`${ses.length} ${ses.length===1?'Einheit':'Einheiten'}`,ses.length?ses.map(s=>`${dot(dayColor(s.day))} ${esc(s.day)}`).join('<br>'):'keine Einheit eingetragen')
  +`</div>`;
 const lb=S.settings.lastBackup;
 h+=`<button class="primary" data-a="backup">Backup exportieren</button>
  <p class="hint">${lb?`Letztes Backup am ${fD(lb)}.`:'Noch kein Backup.'} ${S.settings.bkPhotos?'Fotos werden mitgesichert.':'Ohne Fotos. Das lässt sich in den Einstellungen ändern.'}</p>`;
 return h;
}
function ciEndDefault(){const t=todayStr();return addDays(t,-((pd(t).getDay()+1)%7))}

/* ---------- Eingaben ---------- */
document.addEventListener('click',e=>{
 if(!S)return;const t=e.target.closest('[data-pm]');if(!t)return;
 const a=t.dataset.pm,v=t.dataset.v;
 if(a==='wawc'){const d=ui.wdate||todayStr(),r=dayRec(d),x=+v;if(num(r.waistWC)===x)delete r.waistWC;else r.waistWC=x;waistRecalc(d);save();return render()}
 if(a==='goci'){ui.prog='checkin';ui.ciEnd=null;return go('progress')}
 if(a==='cinav'){const n=addDays(ciEnd(),7*(+v));ui.ciEnd=n>=ciEndDefault()?null:n;return render()}
 if(a==='gok'){ui.health='koerper';ui.wdate=null;return go('health')}
 if(a==='ciph'){ui.ppose='Körper vorne';ui.pdate=todayStr();return phSheet()}
});
document.addEventListener('input',e=>{
 if(!S)return;const t=e.target,ds=t.dataset;if(!ds||!ds.wa||ds.wa==='date')return;
 const d=ui.wdate||todayStr(),r=dayRec(d),v=num(t.value);
 if(v==null)delete r[ds.wa];else r[ds.wa]=v;
 waistRecalc(d);save();
 const el=document.getElementById('wamsg');if(el)el.innerHTML=waistMsg(d);
});
document.addEventListener('change',e=>{
 if(!S)return;const t=e.target,ds=t.dataset;if(!ds||ds.wa!=='date')return;
 ui.wdate=t.value||todayStr();render();
});
