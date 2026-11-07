"""Messrhythmus: Taille jeden Samstag, volles Maßband alle 28 Tage, Fotos alle 14 Tage,
Samstags-Check-in. Baut auf dem Stand d7e3e5b auf (Knöchel, Medikamente, Fotos).
Aufruf: python3 build-2026-11-07.py <repo> <ausgabe-ordner>"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from mkart import art

REPO, OUT = sys.argv[1], sys.argv[2]
HERE = os.path.dirname(os.path.abspath(__file__))
s = open(os.path.join(REPO, 'index.html')).read()

def rep(a, b, cnt=1):
    global s
    n = s.count(a)
    assert n == cnt, ('Anker %d mal statt %d' % (n, cnt), a[:120])
    s = s.replace(a, b)

def cut(start, end_incl, new):
    """ersetzt den Abschnitt von start bis einschliesslich end_incl"""
    global s
    assert s.count(start) == 1, ('Start nicht eindeutig', start[:80])
    a = s.index(start)
    b = s.index(end_incl, a) + len(end_incl)
    assert b - a < 4000, 'Abschnitt zu lang'
    s = s[:a] + new + s[b:]

CSS = """
.ci{background:var(--s1);border-radius:16px;padding:11px 12px;min-width:0}
.cigrid{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.ci small{display:block;font-size:12px;color:var(--mut)}
.ci b{display:block;font:700 20px/1.25 var(--num);font-variant-numeric:tabular-nums;margin-top:2px}
.ci em{display:block;font-style:normal;font-size:12px;color:var(--dim);line-height:1.4;margin-top:3px}
.ci em .dot{width:9px;height:9px;vertical-align:-1px}
.ci.warn{box-shadow:inset 3px 0 0 var(--yel)}
.ci.bad{box-shadow:inset 3px 0 0 var(--red)}
.cihead{display:flex;align-items:center;gap:8px;margin:2px 0 10px}
.cihead div{flex:1;min-width:0}
.cihead b{display:block;font-size:18px;font-weight:750}
.cihead span{font-size:13px;color:var(--mut)}
.cihead .ib[disabled]{opacity:.3}
.cidue .srow span{display:flex;align-items:center;gap:8px}
.cidue .srow .dot{width:10px;height:10px}
.note-line.sat{box-shadow:inset 4px 0 0 var(--acc)}
.dot.hollow{background:transparent;background-image:none;box-shadow:inset 0 0 0 2px #ECEAE4}
.lnk{display:inline-block;width:16px;height:3px;border-radius:2px}
"""
rep('\n</style>\n</head>', '\n' + CSS + '\n</style>\n</head>')

mod = open(os.path.join(HERE, 'mod-messrhythmus.js')).read()
rep('\n(async()=>{await DB.open();await loadHist();', mod + '\n(async()=>{await DB.open();await loadHist();')

# ---------------------------------------------------------------- Einstellungen und Migration
rep('measureEvery:14,bloodEvery:90,', 'measureEvery:28,photoEvery:14,bloodEvery:90,')
rep(" try{if(ankMigrate())DB.set('state',S)}catch(e){}",
    " try{if(ankMigrate())DB.set('state',S)}catch(e){}\n try{if(mrMigrate())DB.set('state',S)}catch(e){}")
rep("ankMigrate();await phImport();", "ankMigrate();mrMigrate();await phImport();")
rep('<span>Abstand Messungen in Tagen</span><input class="txt num-s" data-setting="measureEvery" inputmode="numeric" value="${st.measureEvery}"></div>',
    '<span>Abstand volles Maßband in Tagen<small>fällig am Samstag danach</small></span><input class="txt num-s" data-setting="measureEvery" inputmode="numeric" value="${st.measureEvery}"></div>'
    '<div class="srow"><span>Abstand Fotos in Tagen<small>fällig am Samstag danach</small></span><input class="txt num-s" data-setting="photoEvery" inputmode="numeric" value="${st.photoEvery??14}"></div>')

# ---------------------------------------------------------------- Erinnerungen
rep(" if(m&&S.settings.measureEvery-daysBetween(m.date,todayStr())<=0)o+=`<button class=\"note-line\" data-a=\"gohealth\" data-v=\"koerper\">Messung: ${dueText(m.date,S.settings.measureEvery)}</button>`;\n", "")
cut("function kwDue(d){", ":'';\n}", "function kwDue(d){return satDue(d)}")

# ---------------------------------------------------------------- Tageswerte
rep("['ankle','Knöchel-Skala','0 bis 3',1],['medug','Dosis','µg',1]]}",
    "['ankle','Knöchel-Skala','0 bis 3',1],['medug','Dosis','µg',1],['waist','Taille','cm',1]]}")

# ---------------------------------------------------------------- Körper
cut("function hKoerper(){", "return h+entryList('measures','mdel')}",
"""function hKoerper(){const F=S.settings.mfields,m=lastFull(),fd=fullDue(),t=todayStr(),w=waistNear(ui.mform.date||t,3);if(!F.includes(ui.mf))ui.mf=F[0];
 let h=waistCard();
 h+=`<section class="sec"><h3>Volles Maßband, alle ${num(S.settings.measureEvery)||28} Tage</h3><p class="mut" style="margin-top:0">${m?`Letzte volle Messung am ${fD(m.date)}. `:'Noch keine volle Messung. '}${fd<=t?(fd<t?`Fällig seit Samstag, ${fD(fd)}.`:'Heute fällig.'):`Nächste am Samstag, ${fD(fd)}.`}</p>`
  +mbForm('measures','mform',F,n=>/%/.test(n)?'%':'cm','Neue Messung eintragen','Messung speichern')
  +`<p class="hint">Hals an der schmalsten Stelle, Knöchel morgens und abends. Die Taille fragt das Maßband nicht ab: Beim Speichern übernimmt die App den Wochenwert${w?`, gerade ${fmt(w.v,1)} cm vom ${fDs(w.d)}`:''}, wenn er höchstens drei Tage entfernt liegt.</p></section>`;
 if(S.measures.length){const pts=S.measures.map(x=>[x.date,num(x.vals[ui.mf])]).filter(p=>p[1]!=null);
  h+=`<section class="sec"><h3>Verlauf</h3><select class="txt" data-sel="mf">${F.map(f=>`<option ${f===ui.mf?'selected':''}>${esc(f)}</option>`).join('')}</select><div class="card mt8">${chartSVG([{pts,color:C.chalk,dots:true,r:3,op:1,w:2}],{label:ui.mf,empty:'Für einen Verlauf braucht es mindestens zwei Messungen.'})}</div></section>`}
 return h+entryList('measures','mdel')}""")
rep(" const ex=S[key].find(x=>x.date===f.date);if(ex)Object.assign(ex.vals,vals);",
    " if(key==='measures'&&vals['Taille (Nabel)']==null&&Object.keys(vals).some(k=>!ANKF.includes(k))){const w=waistNear(f.date,3);if(w)vals['Taille (Nabel)']=w.v}\n"
    " const ex=S[key].find(x=>x.date===f.date);if(ex)Object.assign(ex.vals,vals);")

# ---------------------------------------------------------------- Progress: Check-in
rep("function vProgress(){let h=segs('prog',[['gewicht','Gewicht'],",
    "function vProgress(){let h=segs('prog',[['checkin','Check-in'],['gewicht','Gewicht'],")
rep("return h+({gewicht:pGewicht,", "return h+({checkin:pCheckin,gewicht:pGewicht,")

# ---------------------------------------------------------------- Fotos
rep("const POSES_NEU=['Knöchel links seitlich','Knöchel rechts seitlich','Körper vorne','Körper seitlich','Körper hinten'];",
    "const POSES_NEU=['Körper vorne','Körper seitlich','Körper hinten','Knöchel links seitlich','Knöchel rechts seitlich'];")
rep('<p class="hint">Bilder werden auf 1080 px an der langen Seite',
    '<p class="hint"><b>Morgens nüchtern, gleiches Licht, gleicher Ort, gleicher Abstand.</b> Bilder werden auf 1080 px an der langen Seite')
rep("const da=(k)=>{const x=g(m1,k),y=g(m2,k);", "const da=(k)=>{const x=g(nearMk(A.date,k),k),y=g(nearMk(B.date,k),k);")
rep("<b>${da(S.settings.mfields.find(f=>/Tai/i.test(f))||'Taille (Nabel)')}</b>", "<b>${dWaist(A.date,B.date)}</b>")
rep("Maßband ohne Zug. Mittwoch und Samstag, morgens direkt nach dem Aufstehen und abends vor dem Schlafen.",
    "Maßband ohne Zug. Fester Termin ist das volle Maßband alle 4 Wochen, morgens direkt nach dem Aufstehen und abends vor dem Schlafen. Zwischendurch kannst du jederzeit messen.")
rep("Mittwoch und Samstag beide Knöchel von der Seite, samstags dazu Körper vorne, seitlich und hinten. Gleiches Licht, gleiche Uhrzeit, gleicher Abstand.",
    "Alle 2 Wochen samstags morgens: Körper vorne, seitlich und hinten, dazu beide Knöchel von der Seite. Nüchtern, gleiches Licht, gleicher Ort, gleicher Abstand.")

# ---------------------------------------------------------------- Diagramm: hohle Punkte, zweite Achse als Linie
rep("const W=360,H=opt.h||200,pl=40,pr=opt.ov?40:10,pt=10,pb=24;", "const W=360,H=opt.h||200,pl=40,pr=(opt.ov||opt.r)?40:10,pt=10,pb=24;")
rep('r="${s.r||2}" fill="${s.color}" opacity="${s.op||.5}"/>',
    'r="${s.r||2}" ${s.hollow?`style="fill:var(--s1)" stroke="${s.color}" stroke-width="1.8"`:`fill="${s.color}" opacity="${s.op||.5}"`}/>')
rep(" if(opt.ov&&opt.ov.steps&&opt.ov.steps.length){",
    " if(opt.r&&opt.r.pts){const rp=opt.r.pts.filter(([d])=>{const t=tms(d);return t>=t0&&t<=t1});\n"
    "  if(rp.length>1){let r0=Math.min(...rp.map(x=>x[1])),r1=Math.max(...rp.map(x=>x[1]));const lo=r0,hi=r1,rpad=(r1-r0)*.12||.5;r0-=rpad;r1+=rpad;\n"
    "   const Y3=v=>+(pt+(1-(v-r0)/(r1-r0))*(H-pt-pb)).toFixed(1),rc=opt.r.color||'#3B7BDB',rd=opt.r.dec??1;\n"
    "   g+=`<path d=\"${rp.map(([d,v],i)=>(i?'L':'M')+X(tms(d))+','+Y3(v)).join('')}\" fill=\"none\" stroke=\"${rc}\" stroke-width=\"1.8\" opacity=\".9\"/>`;\n"
    "   g+=`<text x=\"${W-pr+5}\" y=\"${Y3(hi)+4}\" class=\"ax\" style=\"fill:${rc}\">${fmt(hi,rd)}</text><text x=\"${W-pr+5}\" y=\"${Y3(lo)+4}\" class=\"ax\" style=\"fill:${rc}\">${fmt(lo,rd)}</text>${opt.r.unit?`<text x=\"${W-pr+5}\" y=\"${pt+4}\" class=\"ax\" style=\"fill:${rc}\">${opt.r.unit}</text>`:''}`}}\n"
    " if(opt.ov&&opt.ov.steps&&opt.ov.steps.length){")

# ---------------------------------------------------------------- Fokus bleibt beim Tippen
# Ein komplettes Neuzeichnen beim Verlassen eines Feldes ersetzt das naechste Feld,
# bevor man hineintippen kann. Knoechelumfang und Planeditor zeichnen deshalb nicht mehr neu.
rep(" if(ds.ka==='date'){ui.kdate=t.value||todayStr();return render()}\n if(ds.ka)return render();",
    " if(ds.ka==='date'){ui.kdate=t.value||todayStr();return render()}")
rep("if(t.tagName==='SELECT'||t.type==='time')medEdRender();", "if(t.tagName==='SELECT')medEdRender();")

os.makedirs(OUT, exist_ok=True)
open(os.path.join(OUT, 'index.html'), 'w').write(s)
open(os.path.join(OUT, 'art.html'), 'w').write(art(s))
sw = open(os.path.join(REPO, 'sw.js')).read()
assert "const V='eisen-v19';" in sw
open(os.path.join(OUT, 'sw.js'), 'w').write(sw.replace("const V='eisen-v19';", "const V='eisen-v20';"))
print('index.html %d bytes' % len(s))
