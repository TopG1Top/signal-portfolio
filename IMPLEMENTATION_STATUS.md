# SIGNAL — Implementierungsstand

Stand: 18. Oktober 2026. Dies ist ein lokal funktionsfähiger Anwendungskern mit echter PostgreSQL-Datenhaltung und echten öffentlichen Datenquellen. **Die vollständige Definition of Done aller 42 Kapitel ist noch nicht erreicht.** Vorhandener Code, lokal geprüfte Funktionen und noch unbestätigte Integrationen werden hier unterschieden.

## Öffentliche Portfolio-Ausgabe

Die öffentliche Vercel-Ausgabe unter https://signal-portfolio-five.vercel.app läuft als ausdrücklich gekennzeichnete, schreibgeschützte Demo. Sie enthält 24 selbst verfasste fiktive Szenarien über Politik, Wirtschaft, IT, Wissenschaft, Kultur und weitere Themen; alle Titel tragen `[SYNTHETIC]`. Länderfilter umfassen insbesondere Schweiz und Deutschland. Es werden weder eine Datenbank noch Redis, Accounts, echte Nachrichtenimporte oder KI-Schlüssel benötigt. Private Funktionen erklären ihre Verfügbarkeit in der vollständigen lokalen Ausgabe. Der Footer nennt „Programmiert von Linhard Zejneli“.

27 Unit-/Integrationstests sowie ein eigener öffentlicher Browsertest sind bestanden. Der öffentliche Test wurde gegen den lokalen Produktionsbuild und die tatsächliche Vercel-Produktionsadresse ausgeführt. Er prüft auch abgewiesene Account-/Schreibzugriffe und den Status `database: not-used`. Die vollständigen lokalen E2E-Funktionen wurden nach der Trennung erneut geprüft. Die Vercel-Bereitstellung ist READY; die Build-Logs waren über den verbundenen Connector wegen fehlender Scope-Berechtigung nicht abrufbar, der veröffentlichte Dienst wurde direkt erfolgreich getestet.

Details zur Bereitstellung: [docs/PORTFOLIO_DEPLOYMENT.md](docs/PORTFOLIO_DEPLOYMENT.md).

## Funktionsfähiger Kern

- USGS, NASA EONET, NASA RSS sowie SRF, tagesschau und heise wurden tatsächlich abgerufen und in PostgreSQL gespeichert. Nachrichtenfeeds speichern Originaltitel, Links und Publikationszeitpunkte, keine vollständigen Artikel. Die aktuelle Quellenverfügbarkeit ist in `/sources` sichtbar.
- Die Importkette normalisiert Daten, erkennt unveränderte Datensätze, speichert Quellenbelege, Revisionen und eine dauerhafte Outbox. Änderungen und Rückkehr zu früheren Inhalten erzeugen neue Versionen. Fehler einer Quelle blockieren andere Quellen nicht.
- Interaktive MapLibre-Weltkarte mit lokalen Ländergrenzen, Quellenpunkten, Clustern, Heatmap, Viewport-Abfragen, Zoom, Vollbild und Detaildialog. Unbekannte Positionen bleiben unbekannt. Polygonmetadaten werden gespeichert, aber noch nicht als Flächen auf der Karte gerendert.
- Volltextsuche, Länder-/Kategorien-/Quellen-/Zeitfilter, Pagination, Ereignisdetails mit Originalquellen, Timeline-Replay auf gespeicherten Versionen, Cytoscape-Themen-/Quellengraph und ECharts-Datenbankauswertungen.
- SSE mit persistenter Outbox, Event-IDs, Heartbeats, Wiederverbindung und Nachladen. Live- und Demo-Daten sind getrennt. Synthetische Beispieldaten sind ausdrücklich beschriftet.
- Registrierung, Login, Logout, private gespeicherte Ereignisse, Watchlists einschließlich Bearbeiten/Duplizieren/Pausieren/Löschen, In-App-Treffermeldungen und Ruhezeiten. Ownership und Administratorrollen werden serverseitig geprüft.
- Administrationsansichten für Quellen, Jobs, Benutzer, Audit und Systemstatus; manuelle Imports, Quellenaktivierung und auditierte Zusammenführung/Trennung von Ereignisclustern.
- Privater Assistent mit quellengebundener Retrieval-Antwort ohne Modell und wieder ladbarem Chatverlauf. Adapter für OpenAI, Anthropic und Ollama sowie optionale Embeddings sind implementiert, aber ohne Modellzugang nicht live verifiziert.
- Responsives Layout, Fokusmodus, Dark/Light Mode, Radix-Detaildialog mit Fokusführung, reduzierte Animationen und übersetzte Hauptnavigation in sechs Sprachen.

## Letzte Fortsetzung

Die Nachrichtenabdeckung umfasst jetzt SRF (Schweiz/International/Wirtschaft/Sport/Kultur/Wissen), tagesschau (Inland/Ausland/Wirtschaft/Technologie/Wissen/Gesundheit/Umwelt) und heise IT. Die drei Publisher nutzen insgesamt 14 Feeds; NASA RSS ist ein zusätzlicher Newsfeed. Pro Publisher werden doppelte Artikel anhand der kanonischen URL vereinigt. Länderfilter umfassen insbesondere CH/Schweiz und DE/Deutschland und wirken auf Feed, Karte und Analytics. Nationale Meldungen färben Länderflächen, ohne genaue Koordinaten zu erfinden. Der Footer nennt „Programmiert von Linhard Zejneli“. Details: [docs/NEWS_COVERAGE.md](docs/NEWS_COVERAGE.md).

Der erneute Prüflauf hat die Dialog-Speicherbestätigung für Screenreader korrigiert. Persönliche Query-Caches sind jetzt nach Benutzer getrennt. Ereigniszählungen schließen zusammengeführte Kindereignisse aus. Suchvektoren werden bei Quellenrevisionen verworfen und bei gleichzeitiger Änderung nicht mit veralteten Ergebnissen überschrieben. Request-Bodies werden beim Lesen auf 20.000 Bytes begrenzt. Produktions-Origin-Prüfungen vertrauen nur dem konfigurierten Origin. Chatverlauf speichert Herkunftsmodus und Provider; Watchlists haben auch im Formular einen Quellenfilter. PWA-Manifest, PNG-Icons und eine Offline-Seite mit ausschließlich öffentlichen statischen Cache-Inhalten sind vorhanden.

## Kapitelabgleich

| Kapitel | Stand | Präzise Grenze / offene Arbeit |
|---|---|---|
| 1–2 Auftrag/Produktvision | Kern umgesetzt | Kein Anspruch einer vollständig produktionsreifen globalen Nachrichtenplattform. |
| 3 Stack | Weitgehend | Prisma-Schema vorhanden, Laufzeit nutzt parametrisiertes `pg`. deck.gl installiert, noch nicht verwendet. PostGIS/pgvector/Redis nur im unbestätigten Docker-Profil. |
| 4 Designsystem | Umgesetzt, teilweise geprüft | Dark/Light, responsive, Zustände, Fokusdialog; umfassendes Accessibility-Audit offen. Tailwind/Radix und shadcn-artiger Button, kein vollständiger Komponentenbaukasten. |
| 5 Navigation | Vorhanden | Alle angeforderten Haupt- und Adminrouten erreichbar. Manche Ansichten verwenden gemeinsame Komponenten. |
| 6 Command Center | Umgesetzt | Kennzahlen aus DB; „mapped events“ statt erfundener Länderabdeckung. UTC-Datenbasis. |
| 7 Weltkarte | Teilweise | Viewport/Cluster/Heatmap/Replay vorhanden. Länderfilter mit 175 Katalogeinträgen und Länderflächen für redaktionellen Nachrichtenkontext sind vorhanden. Städte, Kontinentauswahl, allgemeine Provider-Polygondarstellung und unbegrenztes serverseitiges Clustering fehlen. Pro Abfrage höchstens 500 Datensätze. |
| 8 Kategorien | Kern vorhanden | 19 Startkategorien einschließlich Sport und Kultur, Admin-API zum Ergänzen, kombinierbare API-Kategorien. UI hat eine Kategorieauswahl; Icon-Editor fehlt. |
| 9 Quellen | Sechs Publisher-/Datenconnectoren | USGS/EONET/NASA RSS sowie SRF, tagesschau und heise mit 14 Nachrichtenfeeds (zusätzlich NASA RSS). Kein GDELT, kommerzieller Provider oder frei konfigurierbarer Feed. Endpunkte bewusst fest freigegeben. |
| 10 Ingestion | Teilweise | Persistenz, Deduplizierung, Zeit/Ort/Kategorie, belegter Titel-Claim, Outbox. Keine allgemeine Sprach-/Entitätenerkennung oder automatische KI-Zusammenfassung. |
| 11 Event Detection | Konservative Grundlage | Ähnlichkeits-, Zeit-, Distanz- und Kategorieprüfung erzeugt Review-Vorschläge; keine automatische semantische Zusammenführung. Manuelles Merge/Split getestet. Entitätsvergleich fehlt. |
| 12 Event Intelligence | Teilweise | Quellen, Claims, Versionen, Unsicherheiten und verwandte Kategorieereignisse. Keine automatische Faktbestätigung, Widerspruchsanalyse oder generierte Summary. Detailansicht zeigt immer aktuellen Stand. |
| 13 Source Intelligence | Grundlage | Quellen/Original-URLs und fehlende Unabhängigkeitsbestätigung sichtbar. Keine automatische Syndizierungs-/Widerspruchs-/Übereinstimmungserkennung. |
| 14 Timeline | Teilweise | Stunde/Tag/Woche/Monat, Replay/Tempo/Regler, historisch gespeicherte Snapshots. Benutzerdefinierte Spanne fehlt. Snapshot-Auswahl wird derzeit in Node gefiltert und muss für große Archive optimiert werden. |
| 15 Graph | Teilweise | Events, Kategorien, Quellen mit erklärten Themen-/Quellenkanten. Keine Personen-/Organisationsgraphen, Expansion oder belegte Kausalkanten. |
| 16 Live-Feed | Kern vorhanden | SSE, Pause, Filter, Speichern, Details. Seitenpagination statt Infinite Scroll/Virtualisierung. |
| 17 Suche | Teilweise | FTS, Datum/Quelle/Kategorie/bbox; optionale semantische/hybride Backend-Suche. Keine natürliche Sprachübersetzung in Filter oder Entity Search. Semantic UI fehlt; top 200 Kandidaten begrenzen die Suche. |
| 18 Assistent | Teilweise | Retrieval, Provideradapter, Quellenprüfung, privater Chatverlauf. SSE liefert eine fertig validierte Antwort, kein Tokenstream. Berichte, historische/regionale Werkzeugplanung und Modell-Evaluation fehlen. |
| 19 Analytics | Teilweise | Ereignisse pro Datum/Kategorie/Quelle und 48h-Aktivität aus DB. Keine Emerging-Topic-/Regional-/Informationslückenanalyse. Länder-, Kategorie-, Quellen-, Zeit- und Suchfilter gelten auch für Aggregate. |
| 20 Watchlists | Kern vorhanden | CRUD/Duplizieren/Aktivieren, Kategorie/Quellen-/Phrasenfilter. Länder/Regionen/Organisationen/Relevanzfilter fehlen. |
| 21 Alerts | Teilweise | In-App-Treffer für spätere Live-Imports, Deduplizierung, max. 50/h, Ruhezeiten. Keine Mail-/Push-/Digestzustellung oder separate Bestätigungs-/Widerspruchstypen. `alerts`/`notification_deliveries` noch ohne aktiven Zustellprozess. |
| 22 Dashboard | Teilweise | Gespeicherte Ereignisse und Treffer. Regionen, Vorschläge und zuletzt besuchte Ereignisse fehlen. |
| 23 Auth | Kern lokal getestet | Better Auth Sessions, Ownership/Rollen, Datenexport, Löschfunktion. Reset-/Verifizierungscode vorhanden, SMTP-Zustellung ungetestet. Profilbearbeitung unvollständig. Analyst-Rolle hat noch keinen eigenen Workflow. |
| 24 Admin | Teilweise | Import, Quellentoggle, Jobstatus, Merge/Split, Audit, Leseliste Benutzer. Keine vollständige Benutzerverwaltung, Connector-Konfiguration oder KI-Kostenmessung. |
| 25 Datenbank | Kern umgesetzt | 35 introspektierte Modelle plus SQL-Migrationshistorie; FKs, Checks, Indizes, Transaktionen. Native Installation ohne Spatial/Vector. Einige Zukunftstabellen sind noch ungenutzt. |
| 26 API | Kern dokumentiert | `docs/openapi.json`: 37 Pfade mit Auth/Input-/Fehlerverträgen. Einige komplexe Response-Schemas noch generische Objekte. Better-Auth-Endpunkte separat vom Hersteller. |
| 27 Real-time | Kern getestet | created/updated/merged/corrected, Outbox, Replay. Keine eigenen source.status_changed/notification.created/resolved-Dispatches; private Daten nicht im öffentlichen Stream. Kein Redis-Fanout. |
| 28 Performance | Erste Messung | 10k/100k SQL-Benchmark dokumentiert. Kein belastbarer Mehrbenutzer-/SSE-/Hochfrequenztest, Redis-Cache oder virtuelle Listen. |
| 29 Security | Basis vorhanden | Zod, Ownership, Rollen, CSRF-Origin, parametrisierte SQL, SSRF-Allowlist, Größenlimits, Header, Audit, Dependency-Scan. Kein unabhängiges Audit; CSP noch mit unsafe-inline/unsafe-eval. Globaler Read-Limiter muss vor öffentlichem Betrieb ergänzt werden. |
| 30 Datenschutz | Technische Grundlage | Minimierung, Löschung/Export und Betriebshinweise. Keine rechtliche Freigabe; Retention ist nicht automatisiert. |
| 31 Sprachen | Teilweise | Hauptnavigation in en/de/fr/it/es/sq. Detailtexte überwiegend Englisch; keine vollständige UI-/Summary-Übersetzung. |
| 32 Mobile/PWA | Teilweise | Mobile Navigation/Detaildialog, Manifest/Icons, Produktions-Service-Worker mit statischer Offline-Seite. Keine Web-Push-Zustellung; kein Offline-Nachrichtenarchiv. Installation auf realen Mobilgeräten ungetestet. |
| 33 Premium | Teilweise | Story-Versionen, Aktivitätsanzeige, Fokus, Karten-Vollbild, öffentliche Filterlinks. Event DNA, Event Compare, Briefs, Story-Abos, What Changed und PDF-Berichte fehlen. Geteilte Ansichten enthalten q/category/mode/country/source. |
| 34 Demo | Umgesetzt | Acht klar synthetische Szenarien, gleiche Datenverträge; Karte/Feed/Details/Replay/Graph/Analytics/Suche. |
| 35 Tests | Kern geprüft | 22 Vitest-Tests und 5 Playwright-Prüfungen bestanden; echte DB/Outbox/Auth/API. Fehlende Abdeckung: Docker, Redis, Spatial/Vector, SMTP, Modellprovider, vollständige Alerts-Zustellung und alle Adminaktionen. |
| 36 Struktur | Umgesetzt | Modularer Monolith in Next.js, separater Worker, gemeinsame Packages. `apps/api` dokumentiert bewusst die integrierte API. |
| 37 Phasen | Teilweise | Foundation/Map/Real Data nutzbar; Intelligence/Advanced AI/Production noch nicht vollständig. |
| 38 Qualitätsregeln | Maßstab | Keine erfundenen Live-Daten/Quellen/Koordinaten; Grenzen ausdrücklich benannt. Vollständige Anforderungserfüllung noch offen. |
| 39 Definition of Done | Nicht erreicht | Insbesondere Docker-Laufzeit, erweiterte Intelligence, Mehrsprachigkeit und Produktionsabnahme offen. |
| 40 Autonome Umsetzung | Dokumentiert | Tatsächlicher Code und lokale Laufzeit; Status/Architektur/Tests/Env vorhanden. |
| 41 Betrieb | Konfiguration/Anleitung | Compose, Dockerfiles, CI, Healthchecks, Backup-/Restore-Anleitung. Keine externe Veröffentlichung; Restore und Docker-Laufzeit noch nicht bestätigt. |
| 42 Gesamtziel | Erweiterbare Grundlage | Größere Produktteile sind offen, nicht nur fehlende API-Schlüssel. |

## Verifikation

Siehe [docs/VERIFICATION.md](docs/VERIFICATION.md) für den abschließenden Prüflauf und [docs/BENCHMARK.json](docs/BENCHMARK.json) für die tatsächlich gemessenen SQL-Zeiten. Ein bestandener Build ist keine Produktionsabnahme.

## Fehlende externe Konfiguration

1. Funktionsfähige Docker-Linux-Engine: Die installierte CLI erreicht hier keine Engine. Containerbuild, PostGIS, pgvector und Redis/BullMQ können deshalb noch nicht bestätigt werden.
2. Optionaler KI-Provider mit Modell und Zugangsdaten beziehungsweise laufender Ollama-Dienst. Embeddings verlangen derzeit 1536 Dimensionen. Bei Modellwechsel sind alle Vektoren neu aufzubauen; es gibt noch keine automatische Modellversionsverwaltung.
3. SMTP samt Versandidentität für Verifizierung/Passwortreset; Mail-Alerts brauchen zusätzlich einen erst noch zu implementierenden Zustellworker.
4. Produktionshost/HTTPS/Origin, überwachte Backups und Restore-Rehearsal, Monitoringziel, Datenschutz-/Aufbewahrungsentscheidung, Lizenzprüfung bei zusätzlichen Quellen.

## Bekannte technische Grenzen

- EONET-Import erfasst höchstens 500 Datensätze des 30-Tage-Fensters; USGS verwendet den Magnitude-2,5-Wochenfeed. Kein Anspruch auf weltweite Nachrichtenabdeckung.
- Quellensprachen werden aus den konfigurierten Feeds übernommen (Deutsch/Englisch); keine automatische Spracherkennung. Relevanz ist eine nachvollziehbare Connector-Heuristik, keine objektive globale Wichtigkeit.
- Länderzuordnung für Nachrichten verwendet Landesrubriken oder vollständige Ländernamen/ausgewählte eindeutige Adjektive in Überschriften. Mehrere Länder sind möglich; Zuordnungsbasis ist sichtbar. Fehlende Länderangaben bleiben leer. Naturereignispunkte werden noch nicht automatisch einem Land zugeordnet.
- Zusammengeführte Quellen behalten ihre eigenen Revisionen. Eine spätere Quellenrevision erzeugt noch nicht zusätzlich einen vollständigen neuen Snapshot des übergeordneten Clusters.
- AI-Zitatprüfung validiert vorhandene Quellen-IDs und wörtliche Belegauszüge; sie beweist nicht jede Schlussfolgerung eines Modells. Retrieval ist derzeit lexikalisch und kann relevante Belege verpassen.
- BullMQ-Scheduler lesen die aktivierten Quellen beim Workerstart. Nach Aktivierung einer weiteren Quelle den Redis-Worker neu starten; lokale Polling-Schleife liest Quellen jeweils erneut.
- Outbox, Audit, Rohmetadaten und Chats wachsen derzeit ohne automatische Aufbewahrungsbereinigung. Öffentliche SSE-Verbindungsquoten und Backpressure müssen vor größerem Betrieb ergänzt werden.
- Entwicklungsdatenbank verwendet einen Embedded-PostgreSQL-Wrapper mit Beta-Versionskennung. Die eigentliche Datenbank ist PostgreSQL; diese Startmethode ist nur für lokale Entwicklung vorgesehen.

## Nächste technische Arbeit

Docker/Redis/PostGIS/pgvector in einer erreichbaren Linux-Engine verifizieren; anschließend Quellenvergleich/Entity-Pipeline und Provider-Flächendarstellung und Kontinentfilter vervollständigen, Benachrichtigungszustellung ausbauen, die Oberfläche vollständig übersetzen und einen realistischen Last-/Security-/Restore-Test durchführen. Offene Funktionen sollten als eigenständige vertikale Abläufe implementiert und getestet werden.
