# Blutsand

Ein Gladiatoren-Manager im Browser. Du führst einen Ludus, ziehst Kämpfer aus Vertragstruhen, trainierst und rüstest sie aus und schickst sie in die Arena, wo das Publikum über Leben und Tod entscheidet.

## Spielen

- **Online:** https://recalm2512.github.io/Blutsand/
- **Lokal:** `index.html` im Browser öffnen. Es wird nichts installiert und nichts gebaut.

Der Spielstand wird im Browser gespeichert.

## Die Bereiche

- **Ludus (Trainingszentrum):** Kämpfer wählen, an vier Stationen trainieren (Pfahl, Laufbahn, Steine schleppen, Doctor), in der Waffenkammer mit Live-Vorschau umrüsten, in der Schmiede verbessern, Verletzte heilen. 2D- oder drehbare 3D-Figur.
- **Aufstiegskampf:** Mit genug Ruhm (Veteran, Champion, Legende) tritt ein Kämpfer gegen einen Prüfer an. Gewinnt er, steigt er eine Seltenheit auf. Verliert er, darf er es nach 3 Kämpfen erneut versuchen.
- **Kader (Vertragsmappe):** alle Kämpfer als Bogenkarten mit Filter und Sortierung. Ein Klick öffnet den Vertrag als Pergament: Persönlichkeit, Werte, Ausrüstung, Bilanz. Blättern mit ‹ › oder den Pfeiltasten.
- **Verträge:** Kiste öffnen, fünf versiegelte Verträge, je nach Kiste 1, 2 oder 3 wählen. Beim Aufdecken glüht das Siegel in der Farbe der Seltenheit, bei Episch und Legendär gibt es einen Walkout.
- **Arena:** Die Gegner hängen von deiner Liga (deinem Rang) ab, ihre Seltenheit wird ausgewürfelt. Einen anderen Gegner zu suchen kostet Denare und Ruhm. Zu jedem Gegner gibt es zwei Herausforderungen mit Bonusgold, zum Beispiel „Siege mit einem gewöhnlichen Kämpfer“. Einlauf aus den Toren, Jubel, dann der Kampf mit Lebensbalken, Schadenszahlen, Block, Verfehlt und Ausgewichen. Tempo 1×, 2× oder 4×, Überspringen, Kampfprotokoll. Am Handy im Hochformat automatisch als Duell-Kamera (eigener Kämpfer oben, Gegner unten).
- **Grube:** vier Story-Rivalen und die Grubenrangliste mit Nemesis-Kämpfern.
- **Chronik:** Zahlen, Gedenksteine und das Ereignisbuch.

Dazu: Ausrüstung mit Kürzeln (`1H`, `DW`, `2H`, `LW`, `SW`, `–`, `PAR`, `SCU`, `LR`, `MR`, `SR`), Persönlichkeiten I bis III, Ruhm-Ränge, Publikumsurteil mit Gnade oder Tod und 15 Zufallsereignisse.

## Ordnerstruktur

```
index.html              Seite und Reihenfolge der Skripte
css/style.css           Aussehen im Kolosseum-Stil
js/logik/               Spielregeln ohne Oberfläche
  grunddaten.js           Zufall, Seltenheiten, Typen, Ausrüstung
  persoenlichkeiten.js    Persönlichkeiten
  ruhm.js                 Ränge und Kämpfer-Ruhm
  kaempfer.js             Kämpfer und Gegner erzeugen
  kampf.js                Kampfsimulation, Spannung, Gnade
  packs-arena.js          Kisten, Schwierigkeiten, Rivalen
  liga.js                 Liga-Gegner, Gegnersuche, Herausforderungen
  aufstieg.js             Aufstiegskampf in die nächste Seltenheit
  spielstand.js           Neues Spiel, Kader, Training, Schmiede, Verträge
  grube.js                Rangliste und Nemesis
  ablauf.js               Ablauf eines Kampfes und Urteil
  ereignisse.js           Zufallsereignisse
js/figuren.js           Zeichnen der Figuren (2D und 3D)
js/oberflaeche/         Bedienung und Anzeige
  basis.js                Speichern, Kopfzeile, Reiter, Karten, Ereignis-Fenster
  ludus.js                Trainingszentrum
  kader.js                Vertragsmappe und Vertragsfenster
  vertraege.js            Kisten öffnen und Siegel brechen
  arena.js                Vorbereitung, Kampfbühne, Duell-Kamera, Urteil
  grube.js                Rivalen und Rangliste
  chronik.js              Chronik
  start.js                Spielstand laden und starten
tests/simulation.js     Balance- und Ablauftest
```

## Testen

Mit installiertem Node.js im Projektordner:

```
node tests/simulation.js
```

Der Test prüft die Balance der Ausrüstung, zeigt die Stärke der Gegner in jeder Liga, prüft Aufstiegskampf und Herausforderungen und lässt einen Bot 40 Partien spielen.

## Als Nächstes geplant

- Taktikwahl vor dem Kampf und „Missio erbitten“ im Kampf
- Typische Helme für Murmillo, Thraex, Secutor und Retiarius
- Aufträge, Ruhestand für Veteranen, Klänge, Spielstand exportieren
