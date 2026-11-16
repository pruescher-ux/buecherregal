# 📚 Mein Bücher-Tracker

Eine moderne, elegante Web-App zur Erfassung und Verwaltung deiner Leseliste und gelesenen Bücher – optimiert für das kostenlose Hosting auf **GitHub Pages**.

---

## ✨ Features

- 🔍 **Live-Buchsuche:**
  - Zugriff auf Millionen Bücher via **Google Books API** & **Open Library API**.
  - Gezielte Suche nach **Titel**, **Autor** oder **ISBN** (sowie Freitextsuche).
  - Zeigt Buchcover, Erscheinungsjahr, ISBN und Zusammenfassung (Klappentext).
- 📑 **Listenverwaltung:**
  - **Leseliste**: Bücher, die du noch lesen möchtest.
  - **Gelesen**: Bücher, die du beendet hast.
  - Ein-Klick-Verschieben zwischen den Listen.
- 💬 **Kommentare & Rezensionen:**
  - Eigener Kommentar- / Notizbereich für jedes Buch (Lieblingszitate, Notizen, Gedanken).
  - 1–5 Sterne-Bewertung für beendete Bücher.
  - Automatisch übernommene Inhaltsangabe.
- 💾 **Datenschutz & Backup:**
  - Speicherung direkt im Browser (`localStorage`) – keine Cookies, kein Login-Zwang.
  - **Export & Import (JSON)**: Sichere deine Listen jederzeit oder nimm sie auf ein anderes Gerät mit.
- 📱 **Responsive & Modern:**
  - Funktioniert nahtlos auf Smartphones, Tablets und Desktops.

---

## 🚀 Lokale Vorschau testen

Du kannst die Datei `index.html` direkt im Browser per Doppelklick öffnen oder einen lokalen Webserver starten:

```bash
# Im Projektordner:
cd /Users/peterruscher/.gemini/antigravity/scratch/buecher-tracker
python3 -m http.server 8000
```
Öffne anschließend [http://localhost:8000](http://localhost:8000) im Browser.

---

## 🌐 Live-Version & GitHub Pages

- **Live-URL:** [https://pruescher-ux.github.io/buecherregal/](https://pruescher-ux.github.io/buecherregal/)
- **Repository:** [https://github.com/pruescher-ux/buecherregal](https://github.com/pruescher-ux/buecherregal)
