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

## 🌐 Auf GitHub hosten (GitHub Pages)

### Schritt 1: Git-Repository initialisieren und zu GitHub pushen

1. Erstelle auf [GitHub.com](https://github.com) ein neues Repository (z. B. `mein-buecher-tracker`).
2. Führe im Terminal im Projektordner folgende Befehle aus:

```bash
cd /Users/peterruscher/.gemini/antigravity/scratch/buecher-tracker
git init
git add .
git commit -m "Initial commit: Bücher-Tracker Web-App"
git branch -M main
git remote add origin https://github.com/<DEIN-GITHUB-NUTZERNAME>/mein-buecher-tracker.git
git push -u origin main
```

### Schritt 2: GitHub Pages aktivieren

1. Gehe in deinem GitHub-Repository auf **Settings** (Einstellungen).
2. Klicke in der linken Seitenleiste auf **Pages**.
3. Wähle unter **Build and deployment**:
   - **Source**: `Deploy from a branch`
   - **Branch**: `main` und Ordner `/ (root)`
4. Klicke auf **Save**.

Nach ca. 1–2 Minuten ist deine Bücher-App unter `https://<DEIN-GITHUB-NUTZERNAME>.github.io/mein-buecher-tracker/` weltweit online erreichbar!
