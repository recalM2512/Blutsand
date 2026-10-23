# Hinweise für die Arbeit an Blutsand

- Der Besitzer ist Programmier-Einsteiger. Erkläre Schritte einfach und auf Deutsch.
- Alle Texte im Spiel sind Deutsch.
- Kein Build-Schritt und keine Abhängigkeiten: einfache `<script>`-Dateien, die `index.html` in fester Reihenfolge lädt. Neue Logikdateien dort an der richtigen Stelle eintragen.
- `js/logik/` enthält nur Regeln ohne DOM-Zugriff, damit `tests/simulation.js` sie in Node laden kann. Alles mit Anzeige gehört nach `js/oberflaeche.js` oder `js/figuren.js`.
- Vor jedem Commit `node tests/simulation.js` laufen lassen. Bei Balance-Änderungen die Ausgabe prüfen.
- Externe Bibliotheken nur von cdnjs laden (three.js r128 wird bei Bedarf für die 3D-Ansicht nachgeladen).
- Das Spiel läuft über GitHub Pages direkt aus dem Branch `main`.
