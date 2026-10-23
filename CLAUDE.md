# Dienstplan-Automation

Liest Dienstpläne (BaBella-Tabellen-PDF oder M-Connect-Screenshot) per Claude-API und trägt die
Schichten nach Vorschau und Bestätigung in den Google-Kalender „Fam.Berg“ ein.
Zwei Eingänge, ein Backend:
- **Telegram-Bot** @ha_berghome_DienstplanBot → Webhook → Apps Script
- **PWA** (GitHub Pages, morbus86.github.io/Dienstplan) → POST → Apps Script

## Dateien
- `dienstplan_backend.gs` – Google Apps Script. Liegt hier nur als Quelle; Deploy = **manuell** in den Script-Editor kopieren (kein clasp). Claude hat keinen Zugriff auf Apps Script.
- `index.html` – PWA, gesamte Logik im Inline-`<script>`, speichert Backend-URL + Passphrase in localStorage
- `sw.js` – Service Worker, Cache `VERSION`; POST/fremde Domains werden nie gecacht
- `manifest.webmanifest`, Icons
- `tests/` – Offline-Tests der Backend-Logik mit Stubs (`node --test`)

## Ablauf im Backend
`doPost` → Telegram (Query `wht` = WEBHOOK_TOKEN) oder Webapp-API (`action`: ping | parse | write, Passphrase)
→ `parseWithClaude_` (PDF/Bild + Prompt → JSON `[{date, code}]`) → Filter auf bekannte Codes
→ `buildEvents_` → Vorschau (Telegram: Inline-Buttons, Vorschau 6 h im CacheService) → `writeEvents_` mit Duplikatschutz (gleicher Titel + gleiche Startzeit).

## Fachregeln (nicht ohne Rückfrage ändern)
- `MAPPING` ist die **einzige Wahrheitsquelle** für Codes, Zeiten, Orte, Farben; die Webapp bekommt es per ping/parse.
- Codes: F/S/N/T + 4 (Gernsheim, Birkenstraße 15) bzw. 8 (Mörlenbach, Jungviehweide 23). Früh 06:00–14:30, Spät 14:00–22:30, Nacht 22:00–06:30 (+1 Tag), Tag 06:00–18:30.
- Nur die Hauptzeile **„Berg, Gregor“** auswerten. EA (Einarbeitung) in einer Unterzeile ersetzt die Schicht **nicht**.
- Nicht eintragen: WX/Wunschfrei, X/Frei, U/Urlaub, EA, „Information“, Zusatzzeile „2h bei 12 Stunden“.
- Kalender immer „Fam.Berg“ (`CONFIG.CALENDAR_ID`), Zeitzone Europe/Berlin.
- Offene Farben (`colorId: null`): N4 Kobald, T4 Radiccio, T8 Kirschblüte – erst per Testtermin verifizieren, nie raten.
- Codes im Prompt („Erlaubte codes: …“) müssen exakt den MAPPING-Keys entsprechen (Test prüft das).
- `pay` im MAPPING ist für eine spätere Abrechnungs-Etappe; `verified:false` = noch nicht am echten Beleg geprüft.

## Sicherheit & Datenschutz – hart
- Repo ist **öffentlich**. In `CONFIG` stehen im Repo nur Platzhalter `HIER-…`. Echte Tokens/Keys/Passphrase nur im Apps-Script-Editor.
  Hook `secret-scan` blockiert echte Werte; ein Test prüft die Platzhalter zusätzlich.
- Keine echten Dienstpläne, Screenshots oder Namen von Kollegen/Klienten ins Repo, in Tests oder Commits. Lokal nur in `private/` (gitignored).
- Keine Aufrufe an Telegram- oder Anthropic-API aus der Entwicklungsumgebung (in settings.json verboten).
- Schreibende Kalenderaktionen nur nach Vorschau + ausdrücklicher Bestätigung – diesen Ablauf nie abkürzen.

## Arbeitsweise
- Erst erklären und Vorschau zeigen, umsetzen erst nach ausdrücklichem **„bau“**. Bei Unsicherheit fragen, nicht raten.
- Bei Fehlern erklären, **warum** sie entstanden sind (Lernziel), nicht nur fixen.
- Antworten auf Deutsch, kurz und direkt.
- Nach Änderungen am Backend: `node --test`. Neue Fehlerfälle als Test ergänzen.
- Apps-Script-Eigenheiten beachten: kein `import`/`require`, kein `fetch` (→ `UrlFetchApp`), Funktionen mit `_`-Suffix sind privat (nicht über `google.script.run` aufrufbar und nicht im Ausführen-Menü des Editors), Webapp-POST als `text/plain` (vermeidet CORS-Preflight).
- Nie direkt auf `main` pushen: eigener Branch + Pull Request. Nach Backend-Änderungen Deploy-Checkliste aus `/release` ausgeben.

## Hooks & Skills
- `secret-scan` (vor jedem Schreiben): blockiert Keys/Tokens und echte Werte in CONFIG
- `syntax-check` (nach jedem Schreiben): kompiliert `.gs`/`.js`, Inline-Script in `index.html`, prüft JSON/Manifest
- `/mapping-check` – MAPPING vs. Prompt vs. Webapp-Farben
- `/release [Beschreibung]` – SW-Version, Changelog, Deploy-Checkliste
