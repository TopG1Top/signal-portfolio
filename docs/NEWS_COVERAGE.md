# Nachrichten und Länderfilter

SIGNAL erfasst jetzt neben Naturereignissen auch allgemeine Nachrichten. Die drei ergänzten Publisher wurden mit ihren echten öffentlichen Feeds abgerufen:

| Publisher | Rubriken | Feed-Vertrag |
|---|---|---|
| [SRF](https://www.srf.ch/really-simple-syndication-rss-feeds-von-srf) | Schweiz, International, Wirtschaft, Sport, Kultur, Wissen | 6 RSS-Feeds |
| [tagesschau](https://www.tagesschau.de/infoservices/rssfeeds) | Inland, Ausland, Wirtschaft, Technologie, Wissen, Gesundheit, Klima/Umwelt | 7 RSS-Feeds |
| [heise online](https://www.heise.de/rss/heise-atom.xml) | IT und Technologie; Schlagwortverfeinerung für KI und Cybersecurity | 1 Atom-Feed |

USGS, NASA EONET und NASA RSS bleiben zusätzlich aktiv. Die Zahl gespeicherter Meldungen ist ein Importbestand, keine Aussage über Vollständigkeit oder Zahl unabhängiger Ereignisse. Veröffentlichungszeitpunkte und Original-URLs bleiben erhalten.

## Bedienung

1. In der Filterleiste **Country filter** öffnen und **Schweiz / Switzerland** oder **Deutschland / Germany** wählen. Weitere Länder stehen alphabetisch zur Auswahl.
2. Mit **Category filter** beispielsweise Politics, Economy, Technology, Artificial Intelligence oder Cybersecurity kombinieren. Zusätzlich sind Quellen- und Zeitfilter möglich.
3. Feed und Karte zeigen passende Meldungen; Kennzahlen und Analytics berücksichtigen dieselben Länder-/Themen-/Quellen-/Zeit-/Suchfilter.
4. **Share view** kopiert eine öffentliche URL mit Land, Kategorie, Quelle, Suche und Modus.

Direkte lokale Beispiele:

- Schweiz: `http://127.0.0.1:3000/live?mode=live&country=CH`
- Deutsche Politik: `http://127.0.0.1:3000/live?mode=live&country=DE&category=Politics`
- IT-Nachrichten: `http://127.0.0.1:3000/live?mode=live&category=Technology`
- Wirtschaft: `http://127.0.0.1:3000/live?mode=live&category=Economy`

## Länderzuordnung

Eine Rubrik wie SRF Schweiz oder tagesschau Inland belegt einen redaktionellen Landesbezug. Zusätzlich erkennt die Importlogik ausdrücklich genannte Ländernamen und ausgewählte eindeutige Länderadjektive in Überschriften. Ein Bericht kann mehrere Länder betreffen. Die Detailansicht erklärt, ob die Zuordnung aus einer Landesrubrik oder einer Schlagzeilenreferenz stammt.

Diese Zuordnung bestimmt **keinen exakten Ereignisort**. Die Karte färbt deshalb Länderflächen und zählt „COUNTRY REPORTS“. Nur Daten mit Provider-Koordinaten erscheinen als Punkte. Unbekannte Länder bleiben unbekannt. Die Auswahl enthält 175 Natural-Earth-Ländercodes; kleine, dort fehlende Staaten und historische Sonderfälle sind nicht vollständig abgedeckt. Für nationale Meldungen verwendet der native Viewport-Filter grobe Länder-Bounding-Boxes.

## Datenqualität und Rechte

Gespeichert werden Schlagzeilen, Original-Links, Publikationszeitpunkte sowie Klassifikationsmetadaten. Artikelvolltexte, Bilder und Feed-Content-Blöcke werden verworfen. Kategorien sind nachvollziehbare Rubrik-/Schlagwortheuristiken und können Korrekturen benötigen. Es gibt keine automatische Tatsachenbestätigung.

Mehrere Rubriken desselben Publishers erzeugen anhand der kanonischen Artikel-URL einen gemeinsamen Datensatz. Unterschiedliche Publisher werden ohne Prüfung nicht automatisch zusammengeführt. Einzelne fehlgeschlagene Rubrikabrufe markieren eine Quelle als „degraded“; erfolgreiche Rubriken können weiter importieren.

Die aktivierten Nachrichtenfeeds dienen hier dem lokalen persönlichen Lesen. Publisher behalten ihre Rechte. Insbesondere tagesschau erlaubt private, nicht-kommerzielle Feednutzung; öffentliche oder kommerzielle Veröffentlichung benötigt die entsprechende Berechtigung. Diese Implementierung erteilt keine Weiterverbreitungslizenz.

Der zentrale Quellenkatalog liegt in `packages/ingestion/sources.ts`. Neue Endpunkte müssen dort ausdrücklich freigegeben werden. `NEWS_FEEDS_ENABLED=false` deaktiviert die drei Publisher bei der erstmaligen Einrichtung; bestehende Quellen werden im Adminbereich aktiviert/deaktiviert. Anschließend lassen sich mit `npm run ingest` Meldungen abrufen. Der laufende Worker aktualisiert sie regelmäßig.

Der Footer jeder Hauptansicht enthält **„Programmiert von Linhard Zejneli“**.
