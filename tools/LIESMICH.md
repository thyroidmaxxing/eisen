# Build-Werkzeuge

Jede Datei `build-JJJJ-MM-TT.py` baut auf dem aktuellen `index.html` im Repo auf
und prüft für jede Ersetzung, dass ihr Anker genau einmal vorkommt.

    python3 tools/build-2026-11-05.py . /tmp/out

`mkart.py` leitet aus der Seite die Fassung für das Claude-Artefakt ab
(ohne Kopf, oberer Abstand 0, sonst identisch).

Hier liegen keine persönlichen Daten. Pläne, Messwerte und Fotos bleiben auf dem Gerät.
