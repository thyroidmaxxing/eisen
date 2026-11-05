"""Knöchel-Tracking, Fotos und Medikamentenplan.

Baut auf dem Stand im Repo auf (index.html, Commit a0853a2) und schreibt
index.html und sw.js neu sowie art.html fuer das Claude-Artefakt.
Jede Ersetzung prueft, dass ihr Anker genau einmal vorkommt.
Aufruf: python3 build-2026-11-05.py <repo> <ausgabe-ordner>"""
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

# ------------------------------------------------------------------ Stil
css = open(os.path.join(HERE, 'mod-knoechel-med.css')).read()
rep('\n</style>\n</head>', '\n' + css + '\n</style>\n</head>')

# ------------------------------------------------------------------ Modul vor dem Start
mod = open(os.path.join(HERE, 'mod-knoechel-med.js')).read()
rep('(async()=>{await DB.open();await loadHist();', mod + '\n(async()=>{await DB.open();await loadHist();')

# ------------------------------------------------------------------ Grundzustand
rep('return {v:1,days:{},photos:[],sessions:[]', 'return {v:1,days:{},photos:[],meds:{v:[]},sessions:[]')
rep('settings:{inc:2.5,backupDays:7,', 'settings:{inc:2.5,bkPhotos:false,backupDays:7,')
rep(" try{let ch=markerSync();if(refFill())ch=1;if(ch)DB.set('state',S)}catch(e){}",
    " try{let ch=markerSync();if(refFill())ch=1;if(ch)DB.set('state',S)}catch(e){}\n"
    " try{if(ankMigrate())DB.set('state',S)}catch(e){}")

# ------------------------------------------------------------------ Tageslog
rep("h+=backupBanner()+dueBanner()+readyCard(d);",
    "h+=backupBanner()+dueBanner()+medDue(d)+kwDue(d)+ankWarnTop(d)+readyCard(d);")
rep('h+=`<section class="sec"><h3>Aktivität und Schlaf</h3>',
    'h+=medSection(d)+ankleSection(d);\n h+=`<section class="sec"><h3>Aktivität und Schlaf</h3>')

# ------------------------------------------------------------------ Tageswerte
rep("['sleep','Schlaf','h',1],['stool','Stuhlgang','pro Tag',1]]}",
    "['sleep','Schlaf','h',1],['stool','Stuhlgang','pro Tag',1],['ankle','Knöchel-Skala','0 bis 3',1],['medug','Dosis','µg',1]]}")
rep("if(k==='stool'&&!isAvg)return fmt(v,0);", "if((k==='stool'||k==='ankle')&&!isAvg)return fmt(v,0);")
rep("{pts:ro.filter(p=>p[0]>=c),color:C.chalk,w:2.2}],{label:m[1]})}<p class=\"hint\">Punkte sind Tageswerte, die Linie ist der 7-Tage-Schnitt${m[2]?`, Einheit ${m[2]}`:''}.</p></div>`}",
    "{pts:ro.filter(p=>p[0]>=c),color:C.chalk,w:2.2}],Object.assign({label:m[1],ov:['hr1','t1','ankle'].includes(m[0])?doseOv():null},m[0]==='ankle'?ANKY:{}))}"
    "<p class=\"hint\">Punkte sind Tageswerte, die Linie ist der 7-Tage-Schnitt${m[2]?`, Einheit ${m[2]}`:''}.</p>${ovHint(m[0])}</div>`}")

# ------------------------------------------------------------------ Diagramm: zweite Achse, feste Skala
rep("const W=360,H=opt.h||200,pl=40,pr=10,pt=10,pb=24;", "const W=360,H=opt.h||200,pl=40,pr=opt.ov?40:10,pt=10,pb=24;")
rep("if(t1===t0)t1=t0+864e5;const pad=(v1-v0)*.08||Math.abs(v1)*.05||1;v0-=pad;v1+=pad;",
    "if(t1===t0)t1=t0+864e5;const pad=(v1-v0)*.08||Math.abs(v1)*.05||1;v0-=pad;v1+=pad;"
    "if(opt.y0!=null)v0=Math.min(v0,opt.y0);if(opt.y1!=null)v1=Math.max(v1,opt.y1);")
rep("const span=v1-v0,dec=span<3?2:span<30?1:0;let g='';",
    "const span=v1-v0,dec=opt.dec??(span<3?2:span<30?1:0);let g='';")
rep("for(let i=0;i<4;i++){const v=v0+span*i/3,y=Y(v);",
    "for(const v of (opt.ticks||[0,1,2,3].map(i=>v0+span*i/3))){const y=Y(v);")
rep(" return `<svg class=\"chart\" viewBox=\"0 0 ${W} ${H}\" role=\"img\" aria-label=\"${esc(opt.label||'Verlauf')}\">${g}</svg>`}",
    " if(opt.ov&&opt.ov.steps&&opt.ov.steps.length){const st=opt.ov.steps,dt=opt.ov.dots||[],oc=opt.ov.color||'#FF5A1F';\n"
    "  const at=t=>{let v=0;st.forEach(([d,u])=>{if(tms(d)<=t)v=u});return v};\n"
    "  const top=Math.max(at(t0),...st.filter(x=>tms(x[0])>t0&&tms(x[0])<=t1).map(x=>x[1]),...dt.filter(x=>tms(x[0])>=t0&&tms(x[0])<=t1).map(x=>x[1]),1),mx=top*1.15;\n"
    "  const Y2=v=>+(pt+(1-v/mx)*(H-pt-pb)).toFixed(1);\n"
    "  let p='M'+X(t0)+','+Y2(at(t0));st.forEach(([d,u])=>{const t=tms(d);if(t>t0&&t<=t1)p+='H'+X(t)+'V'+Y2(u)});p+='H'+X(t1);\n"
    "  g+=`<path d=\"${p}\" fill=\"none\" stroke=\"${oc}\" stroke-width=\"2\" stroke-dasharray=\"5 3\"/>`;\n"
    "  dt.forEach(([d,u])=>{const t=tms(d);if(t>=t0&&t<=t1)g+=`<circle cx=\"${X(t)}\" cy=\"${Y2(u)}\" r=\"2.4\" fill=\"${oc}\"/>`});\n"
    "  g+=`<text x=\"${W-pr+5}\" y=\"${Y2(top)+4}\" class=\"ax ov\">${fmt(top,top%1?1:0)}</text><text x=\"${W-pr+5}\" y=\"${Y2(0)+4}\" class=\"ax ov\">0</text><text x=\"${W-pr+5}\" y=\"${pt+4}\" class=\"ax ov\">µg</text>`}\n"
    " return `<svg class=\"chart\" viewBox=\"0 0 ${W} ${H}\" role=\"img\" aria-label=\"${esc(opt.label||'Verlauf')}\">${g}</svg>`}")

# ------------------------------------------------------------------ Health
rep("function vHealth(){return segs('health',[['koerper','Körper'],['blut','Blutwerte'],['vert','Verträglichkeit']])+({koerper:hKoerper,blut:hBlut,vert:hVert})[ui.health]()}",
    "function vHealth(){return segs('health',[['koerper','Körper'],['knoechel','Knöchel'],['med','Medikamente'],['blut','Blutwerte'],['vert','Verträglichkeit']])"
    "+({koerper:hKoerper,knoechel:hKnoechel,med:hMed,blut:hBlut,vert:hVert})[ui.health]()}")

# ------------------------------------------------------------------ Einstellungen
rep(' <section class="sec"><h3>Training und Erinnerungen</h3>', ' ${medSettings()}\n <section class="sec"><h3>Training und Erinnerungen</h3>')
rep(' <div class="srow mt8"><span>Erinnerung nach Tagen</span>',
    ' <div class="srow mt8"><span>Fotos mitsichern<small>Macht die Datei deutlich größer, je Foto etwa 150 bis 300 KB.</small></span>'
    '<button class="tog ${st.bkPhotos?\'on\':\'\'}" data-pm="bkph" aria-label="Fotos mitsichern"></button></div>'
    '<div class="srow"><span>Erinnerung nach Tagen</span>')

# ------------------------------------------------------------------ Backup und Import
rep("async function exportBackup(){const name=`eisen-backup-${todayStr()}.json`,data=JSON.stringify({app:'eisen',v:1,exported:new Date().toISOString(),data:S});",
    "async function exportBackup(){const ph=S.settings.bkPhotos?(toast('Fotos werden verpackt'),await phExport()):null;"
    "const name=`eisen-backup-${todayStr()}${ph?'-mit-fotos':''}.json`,"
    "data=JSON.stringify(ph?{app:'eisen',v:1,exported:new Date().toISOString(),data:S,photoData:ph}:{app:'eisen',v:1,exported:new Date().toISOString(),data:S});")
rep("const o=JSON.parse(fr.result),src=o.data||o;if(!src.days&&!src.sessions)throw 0;ui.pendingImport=src;",
    "const o=JSON.parse(fr.result),src=o.data||o;if(!src.days&&!src.sessions)throw 0;ui.pendingImport=src;ui.pendingPhotos=o.photoData||null;")
rep("${(src.phases||[]).length} Phasen.</p>",
    "${(src.phases||[]).length} Phasen${ui.pendingPhotos?`, ${Object.keys(ui.pendingPhotos).length} Fotos`:''}.</p>")
rep("case 'impmerge':merge(ui.pendingImport);ui.pendingImport=null;save();",
    "case 'impmerge':merge(ui.pendingImport);ui.pendingImport=null;await phImport();save();")
rep("S=migrate(ui.pendingImport);ui.pendingImport=null;save();",
    "S=migrate(ui.pendingImport);ui.pendingImport=null;ankMigrate();await phImport();save();")
rep("if(src.plan&&src.plan.days)src.plan.days.forEach(d=>d.ex.forEach(e=>{const pe=planExIn(d.name,e.name);if(pe&&!pe.setup&&e.setup)pe.setup=e.setup}))}",
    "if(src.plan&&src.plan.days)src.plan.days.forEach(d=>d.ex.forEach(e=>{const pe=planExIn(d.name,e.name);if(pe&&!pe.setup&&e.setup)pe.setup=e.setup}));mergeExtra(src)}")

# ------------------------------------------------------------------ Fotos
rep("const POSES=['Front entspannt','Front angespannt','Seite','Rücken','Beine'];",
    "const POSES_NEU=['Knöchel links seitlich','Knöchel rechts seitlich','Körper vorne','Körper seitlich','Körper hinten'];\n"
    "const POSES_ALT=['Front entspannt','Front angespannt','Seite','Rücken','Beine'];\n"
    "function poseList(){return POSES_NEU.concat(POSES_ALT.filter(p=>(S.photos||[]).some(x=>x.pose===p)))}")
rep("${POSES.map(p=>", "${poseList().map(p=>")
rep("(ui.ppose||POSES[0])===p", "(ui.ppose||poseList()[0])===p")
rep("const poses=POSES.filter(p=>ph.some(x=>x.pose===p));", "const poses=poseList().filter(p=>ph.some(x=>x.pose===p));")
rep("p=ui.ppose||POSES[0];", "p=ui.ppose||poseList()[0];")
assert 'POSES[' not in s.replace('POSES_NEU', '').replace('POSES_ALT', '') and 'POSES.' not in s, 'POSES noch in Benutzung'
rep("const sc=Math.min(1,1600/Math.max(im.width,im.height));", "const sc=Math.min(1,1080/Math.max(im.width,im.height));")
rep("c.toBlob(b=>b?res(b):rej(new Error('encode')),'image/jpeg',.86)", "c.toBlob(b=>b?res(b):rej(new Error('encode')),'image/jpeg',.7)")
rep("<p class=\"hint\">Bilder werden auf 1600 px verkleinert. Gewicht und KFA des Tages werden automatisch mitgespeichert.",
    "<p class=\"hint\">Bilder werden auf 1080 px an der langen Seite verkleinert und als JPEG mit Qualität 0,7 gespeichert. Gewicht und KFA des Tages werden automatisch mitgespeichert.")
rep("'Sie liegen auf diesem Gerät und wandern nicht ins Backup.'",
    "'Sie liegen auf diesem Gerät. Ins Backup kommen sie nur, wenn in den Einstellungen „Fotos mitsichern“ an ist.'")
a = s.index('<div class="trend" style="margin-top:8px"><div><small>Arm rechts</small>')
b = s.index('<em>cm</em></div></div>', a) + len('<em>cm</em></div></div>')
assert b - a < 600
s = s[:a] + "${/^Knöchel/.test(ui.ppose)?ankPhStats(A,B):`" + s[a:b] + "`}" + s[b:]

os.makedirs(OUT, exist_ok=True)
open(os.path.join(OUT, 'index.html'), 'w').write(s)
open(os.path.join(OUT, 'art.html'), 'w').write(art(s))
sw = open(os.path.join(REPO, 'sw.js')).read()
assert "const V='eisen-v18';" in sw
open(os.path.join(OUT, 'sw.js'), 'w').write(sw.replace("const V='eisen-v18';", "const V='eisen-v19';"))
print('index.html %d bytes, art.html %d bytes' % (len(s), len(art(s))))
