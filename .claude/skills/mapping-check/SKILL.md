---
name: mapping-check
description: Schicht-Mapping prüfen – MAPPING im Backend vs. Claude-Prompt, Webapp-Farben, offene colorIds und Kalenderregeln. Nutzen nach Änderungen an MAPPING, Prompt oder Farben, oder wenn eine neue Schichtart/ein neuer Standort dazukommt.
allowed-tools: Bash(node --test) Bash(node --test *)
---

1. `node --test` ausführen (prüft u. a. Prompt-Codes = MAPPING-Codes, Zeiten, Standorte, colorIds).
2. Zusätzlich manuell prüfen und als Tabelle berichten (Code | Zeit | Ort | colorId | Farbe | Webapp-Farbe vorhanden?):
   - `MAPPING` in `dienstplan_backend.gs`
   - `COLORS` im Inline-Script von `index.html` – fehlt dort eine colorId, die im MAPPING gesetzt ist?
   - Stimmt die Liste der IGNORIERTEN Einträge im Prompt mit den Fachregeln in CLAUDE.md überein (WX, X, EA, U, Information, "2h bei 12 Stunden")?
3. Offene Farben (`colorId: null`: aktuell N4 Kobald, T4 Radiccio, T8 Kirschblüte) auflisten mit Hinweis: Farb-ID erst per Testtermin im echten Kalender verifizieren, dann eintragen – nicht raten.
4. Bei Abweichungen: Ursache erklären, Fix vorschlagen, erst nach „bau“ ändern.
