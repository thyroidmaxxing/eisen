"""Leitet aus der GitHub-Seite die Fassung fuer das Claude-Artefakt ab.
Unterschiede: kein Kopf (den setzt der Artefaktserver), oberer Abstand 0,
sonst identischer Stil, Koerper und Code."""
import sys
def art(gh):
    a = gh.index('<style>\n') + len('<style>\n')
    b = gh.index('\n</style>\n</head>')
    css = gh[a:b]
    assert '--sat:env(safe-area-inset-top,0px)}' in css
    css = css.replace('--sat:env(safe-area-inset-top,0px)}', '--sat:0px}')
    c = gh.index('<body>') + len('<body>')
    d = gh.index('\n<script>\n')
    body = gh[c:d]
    e = d + len('\n<script>\n')
    f = gh.rindex('\n</script>\n</body>')
    js = gh[e:f]
    return "<title>Eisen</title>\n<style>\n" + css + "\n</style>\n" + body + "\n<script>\n" + js + "\n</script>\n"
if __name__ == '__main__':
    gh = open(sys.argv[1]).read()
    open(sys.argv[2], 'w').write(art(gh))
