import type { ExamLevel } from '@/types/exam'

export function getHorenTeil2Prompt(level: ExamLevel): string {
  return `Erstelle Teil 2 des Moduls Hören für das Goethe-Zertifikat ${level}.

STRUKTUR:
- **Ein** Script (ID 6), **ein** durchgehendes "dialogue"-Array, **eine** Audio-Datei (playCount 1).
- Inhalt = **5 kurze Dialogszenen hintereinander** (z. B. Bahnhof, Markt, Apotheke, Café, Museum).
- **Pro Szene: höchstens 2 verschiedene Sprecher** — genau **2 verschiedene role-Werte**, die sich abwechseln (kein dritter Charakter in derselben Szene).
- Von Szene zu Szene **wechselt das Paar** (andere Rollen-Kombination).

BEISPIEL-PAARE (Orientierung, du darfst ähnlich variieren):
1. Bahnhof: casual_male + professional_female (Fahrgast + Schalter)
2. Markt: casual_female + professional_male (Kundin + Verkäufer)
3. Apotheke: elderly_female + professional_female (Kundin + Apothekerin)
4. Café: casual_male + casual_female (Gast + Kellner/in)
5. Museum: child + professional_male (Kind + Guide) — Erwachsenen-Begleitung nicht als dritte Stimme nötig; Kind führt Dialog mit Guide.

ROLLEN-POOL (nur diese Keys): casual_female, casual_male, professional_female, professional_male, announcer, elderly_female, child  
— **Vielfalt über alle 5 Szenen**, nicht alle 7 in jeder Szene erzwingen.

ANFORDERUNGEN:
- Gesamt ca. 200–300 Wörter gesprochener Inhalt, pro Szene 3–6 Repliken (nur die zwei Stimmen).
- 5 Multiple-Choice-Aufgaben (a, b, c), Task-IDs 6–10 — **eine Frage soll sich auf den Inhalt einer der Szenen beziehen** (logisch verteilen).
- Kein "script"/"voiceType".

emotion optional: neutral | happy | worried | angry | sad | polite

VOR DEM ABSENDEN PRÜFEN: In jedem zusammenhängenden Mini-Dialogblock höchstens **zwei** unterschiedliche "role"-Werte.

Für jedes Hörscript wähle entweder "mode": "mono" (eine Person spricht — dann fülle "script" und "voiceType") oder "mode": "dialogue" (mehrere Personen — dann fülle "dialogue" als Liste von Repliken). Mische die beiden Modi nicht innerhalb eines Scripts.

Übergib das Ergebnis ausschließlich über das bereitgestellte Tool. Verwende authentisches, natürliches Deutsch — typografische Anführungszeichen („…") sind im Inhalt erwünscht.

Niveau: ${level}.`
}
