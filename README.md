# Blutsand

Ein Gladiatoren-Manager im Browser. Du führst einen Ludus, ziehst Kämpfer aus Vertragstruhen, trainierst und rüstest sie aus und schickst sie in die Arena, wo das Publikum über Leben und Tod entscheidet.

## Spielen

- **Online:** https://recalm2512.github.io/Blutsand/ (sobald GitHub Pages eingeschaltet ist)
- **Lokal:** `index.html` im Browser öffnen. Es wird nichts installiert und nichts gebaut.

Der Spielstand wird im Browser gespeichert.

## Was schon drin ist

- **Kader und Training:** Werte steigern, Schmiede, Umrüsten, Moral, Freundschaften und Rivalitäten im Kader
- **Ausrüstung mit Kürzeln:** Griff (`1H`, `DW`, `2H`), Waffe (`LW`, `SW`), Schild (`–`, `PAR`, `SCU`), Rüstung (`LR`, `MR`, `SR`), 30 Kombinationen mit Stein-Schere-Papier-Kontern
- **Persönlichkeiten:** 1 bis 4 pro Kämpfer, Stufe I bis III, mit Vor- und Nachteilen
- **Ruhm:** fünf Ränge vom Hinterhof bis zum Kolosseum, Ruhmstufen für jeden Kämpfer
- **Publikum und Urteil:** Spannungswert, Gnade oder Tod, Spenden, Missgunst
- **Nemesis-System und Grubenrangliste**, vier Story-Rivalen
- **15 Zufallsereignisse** zwischen den Kämpfen
- **Figuren** in 2D und als drehbare 3D-Ansicht

## Ordnerstruktur

```
index.html            Seite und Reihenfolge der Skripte
css/style.css         Aussehen
js/logik/             Spielregeln ohne Oberfläche
  grunddaten.js         Zufall, Seltenheiten, Typen, Ausrüstung
  persoenlichkeiten.js  Persönlichkeiten
  ruhm.js               Ränge und Kämpfer-Ruhm
  kaempfer.js           Kämpfer und Gegner erzeugen
  kampf.js              Kampfsimulation, Spannung, Gnade
  packs-arena.js        Truhen, Schwierigkeiten, Rivalen
  spielstand.js         Neues Spiel, Kader, Training, Schmiede
  grube.js              Rangliste und Nemesis
  ablauf.js             Ablauf eines Kampfes und Urteil
  ereignisse.js         Zufallsereignisse
js/figuren.js         Zeichnen der Figuren (2D und 3D)
js/oberflaeche.js     Bedienung, Anzeige, Speichern
tests/simulation.js   Balance- und Ablauftest
```

## Testen

Mit installiertem Node.js im Projektordner:

```
node tests/simulation.js
```

Der Test prüft die Balance der Ausrüstung und lässt einen Bot 40 Partien spielen.

## Als Nächstes geplant

- Kolosseum-Look: Ludus als Trainingszentrum, Kader als Vertragsmappe, Vertragsöffnung mit fünf versiegelten Verträgen
- Kompakte Arena mit Einlauf aus dem Tor und Duell-Kamera fürs Handy
- Taktikwahl vor dem Kampf und „Missio erbitten“ im Kampf
- Typische Helme für Murmillo, Thraex, Secutor und Retiarius
