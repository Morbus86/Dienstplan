---
name: release
description: Release vorbereiten – Tests, Service-Worker-Version hochzählen, Changelog, Deploy-Checkliste für Apps Script. Nur auf ausdrückliche Anforderung.
disable-model-invocation: true
argument-hint: "[kurze Beschreibung der Änderung]"
---

Bereite ein Release vor. Nach jedem Schritt kurz berichten:

1. `node --test` – bei Fehlern abbrechen und berichten.
2. Wurden `index.html`, `manifest.webmanifest`, Icons oder `sw.js` geändert? Dann in `sw.js` `VERSION` hochzählen (`dienstplan-vN` → `vN+1`).
   Warum: Sonst liefert die installierte PWA Teile aus dem alten Cache.
3. In `CHANGELOG.md` (anlegen, falls nicht vorhanden) oben einen Eintrag mit Datum, SW-Version und `$ARGUMENTS`.
4. Diff zeigen, Commit vorschlagen. Nie direkt auf `main` pushen – eigener Branch + Pull Request.
5. Wurde `dienstplan_backend.gs` geändert, am Ende diese Checkliste für Gregor ausgeben (das macht er selbst, Claude hat keinen Zugriff auf Apps Script):
   - [ ] Code in den Apps-Script-Editor kopieren – **echte Werte in CONFIG dort behalten**, nicht mit den Platzhaltern aus dem Repo überschreiben
   - [ ] Bereitstellen → Bereitstellungen verwalten → bestehende Bereitstellung bearbeiten → Version: **Neue Version**. So bleibt die /exec-URL gleich. Eine *neue* Bereitstellung erzeugt eine neue URL → Telegram-Webhook und Webapp zeigen dann ins Leere.
   - [ ] Test: Webapp → Verbindung → „Speichern und prüfen“ (ping) und ein Screenshot an den Bot → Vorschau prüfen, **nicht** eintragen
