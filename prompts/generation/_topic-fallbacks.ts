// server-only — импортируется только из lib/topic-sampler.ts.
// Минимальный хардкод-набор тем на случай, если generation_topics недоступна или пуста.
// Источник правды — таблица generation_topics в БД (редактируется через /admin/topics).
// Эти темы дублируются сидером scripts/seed-generation-topics.ts при первом прогоне.

import type { TopicData } from '@/lib/topic-sampler'

export const FALLBACK_TOPICS: Record<string, TopicData[]> = {
  // ─── SCHREIBEN ───────────────────────────────────────────────
  'schreiben:a1:null': [
    { situation: 'Geburtstag feiern', recipient: 'Freundin', taskHints: ['Einladung aussprechen', 'Datum und Ort nennen', 'was mitbringen'] },
    { situation: 'Krank zu Hause', recipient: 'Deutschlehrerin', taskHints: ['entschuldigen', 'wie lange krank', 'Hausaufgaben fragen'] },
    { situation: 'Kollege gesucht für Kaffee', recipient: 'Kollege', taskHints: ['Ort vorschlagen', 'Zeit klären', 'Grund nennen'] },
  ],
  'schreiben:a2:null': [
    { situation: 'Neue Wohnung in Deutschland', recipient: 'Eltern', taskHints: ['Wohnung beschreiben', 'Nachbarschaft', 'Besuch einladen'] },
    { situation: 'Deutschkurs an der Volkshochschule', recipient: 'Freund aus Heimatland', taskHints: ['Kurs beschreiben', 'empfehlen', 'Preis'] },
    { situation: 'Kollege heiratet — Glückwunsch schreiben', recipient: 'Kollege', taskHints: ['gratulieren', 'Geschenkidee', 'Feier'] },
    { situation: 'Fahrrad gefunden, zurückgeben', recipient: 'Nachbar', taskHints: ['Fundort nennen', 'Abholung vereinbaren'] },
  ],
  'schreiben:b1:null': [
    { situation: 'Reklamation — Online-Bestellung kaputt angekommen', recipient: 'Kundenservice', taskHints: ['Problem beschreiben', 'Lösung fordern', 'Frist nennen'] },
    { situation: 'Nachbarschaftskonflikt wegen Lärm', recipient: 'Nachbar', taskHints: ['Problem höflich ansprechen', 'Kompromiss vorschlagen'] },
    { situation: 'Bewerbung für Praktikum absagen', recipient: 'Personalabteilung', taskHints: ['danken', 'Grund der Absage', 'offen für Zukunft'] },
    { situation: 'Kündigung Fitnessstudio', recipient: 'Fitnessstudio-Verwaltung', taskHints: ['zum Monatsende kündigen', 'Bestätigung bitten'] },
  ],

  // ─── SPRECHEN ────────────────────────────────────────────────
  'sprechen:a1:null': [
    { situation: 'Zusammen einkaufen gehen', taskType: 'planning', taskHints: ['Wo?', 'Wann?', 'Was?', 'Wie hinkommen?'] },
    { situation: 'Meine Familie', taskType: 'presentation', taskHints: ['Personen', 'Wo wohnen sie', 'Hobbys', 'Warum wichtig'] },
    { situation: 'Reaktion auf Familien-Präsentation', taskType: 'reaction', taskHints: ['Frage stellen', 'eigene Erfahrung teilen'] },
  ],
  'sprechen:a2:null': [
    { situation: 'Geburtstagsfeier eines Kollegen organisieren', taskType: 'planning', taskHints: ['Ort', 'Zeit', 'Geschenk', 'Einladungen'] },
    { situation: 'Mein Arbeitsweg', taskType: 'presentation', taskHints: ['Verkehrsmittel', 'Dauer', 'Vor-/Nachteile', 'eigene Meinung'] },
    { situation: 'Reaktion auf Arbeitsweg-Präsentation', taskType: 'reaction', taskHints: ['Frage zum Verkehr', 'Empfehlung'] },
  ],
  'sprechen:b1:null': [
    { situation: 'Gemeinsam eine Abschiedsparty für einen Kollegen organisieren', taskType: 'planning', taskHints: ['Ort', 'Datum', 'Gäste', 'Programm'] },
    { situation: 'Soziale Medien im Alltag', taskType: 'presentation', taskHints: ['Situation im Heimatland', 'Vorteile', 'Nachteile', 'eigene Meinung'] },
    { situation: 'Reaktion auf Präsentation über soziale Medien', taskType: 'reaction', taskHints: ['kritische Frage', 'persönliche Erfahrung'] },
  ],

  // ─── LESEN Teil 1 (Blog — persönlicher Text) ─────────────────
  'lesen:a1:1': [
    { situation: 'Mein neues Haustier', category: 'Alltag', sceneHint: 'Blog einer Studentin über ihre Katze' },
    { situation: 'Erster Tag im neuen Job', category: 'Arbeit', sceneHint: 'Blog eines Berufsanfängers' },
    { situation: 'Mein Hobby: Kochen lernen', category: 'Freizeit', sceneHint: 'Food-Blog einer Anfängerin' },
  ],
  'lesen:a2:1': [
    { situation: 'Umzug in eine andere Stadt', category: 'Wohnen', sceneHint: 'Blog über den Umzug nach Köln' },
    { situation: 'Wochenendausflug mit Freunden', category: 'Reise', sceneHint: 'Reiseblog kurzer Trip' },
    { situation: 'Sportverein beitreten', category: 'Freizeit', sceneHint: 'Blog über den ersten Monat im Fußballverein' },
  ],
  'lesen:b1:1': [
    { situation: 'Ehrenamtliche Tätigkeit im Tierheim', category: 'Soziales', sceneHint: 'Blog mit Reflexion über die Erfahrung' },
    { situation: 'Auslandssemester in Spanien', category: 'Bildung', sceneHint: 'Studentin bloggt über kulturelle Eindrücke' },
    { situation: 'Vom Büro ins Homeoffice', category: 'Arbeit', sceneHint: 'Arbeitnehmer reflektiert über Veränderung' },
  ],

  // ─── LESEN Teil 2 (Zeitungsartikel) ──────────────────────────
  'lesen:a1:2': [
    { situation: 'Neues Schwimmbad in der Stadt', category: 'Lokalnachrichten' },
    { situation: 'Bücherei öffnet sonntags', category: 'Stadt' },
    { situation: 'Weihnachtsmarkt eröffnet', category: 'Veranstaltung' },
  ],
  'lesen:a2:2': [
    { situation: 'Neue Buslinie verbindet Stadtteile', category: 'Verkehr' },
    { situation: 'Junge Menschen lesen weniger Zeitung', category: 'Gesellschaft' },
    { situation: 'Schulgarten-Projekt an Grundschulen', category: 'Bildung' },
  ],
  'lesen:b1:2': [
    { situation: 'Digitalisierung an deutschen Schulen', category: 'Bildung' },
    { situation: 'Klimawandel und Weinbau in Deutschland', category: 'Umwelt' },
    { situation: 'Fachkräftemangel in der Pflege', category: 'Wirtschaft' },
  ],

  // ─── LESEN Teil 3 (Regeln/Anweisungen) ───────────────────────
  'lesen:a1:3': [
    { situation: 'Hausordnung eines Wohnhauses', category: 'Wohnen' },
    { situation: 'Nutzungsregeln einer Bibliothek', category: 'Öffentlicher Ort' },
    { situation: 'Regeln im Schwimmbad', category: 'Freizeit' },
  ],
  'lesen:a2:3': [
    { situation: 'Ausleihbedingungen in einer Mediathek', category: 'Bibliothek' },
    { situation: 'Benutzerordnung Sportzentrum', category: 'Sport' },
    { situation: 'Mülltrennung in der Mietwohnung', category: 'Wohnen' },
  ],
  'lesen:b1:3': [
    { situation: 'Teilnahmebedingungen Online-Kurs', category: 'Bildung' },
    { situation: 'Rückgaberecht im Online-Shop', category: 'Verbraucher' },
    { situation: 'Hausordnung Studentenwohnheim', category: 'Wohnen' },
  ],

  // ─── LESEN Teil 4 (Kleinanzeigen) ────────────────────────────
  'lesen:a1:4': [
    { situation: 'Kurzanzeigen für Freizeit und Hobby', category: 'Sport/Verein/Kurs' },
    { situation: 'Kleinanzeigen für Mietgesuche', category: 'Wohnen' },
    { situation: 'Verkaufsanzeigen gebrauchter Möbel', category: 'Möbel' },
  ],
  'lesen:a2:4': [
    { situation: 'Anzeigen für Nebenjobs', category: 'Arbeit' },
    { situation: 'Kurse an der Volkshochschule', category: 'Bildung' },
    { situation: 'Anzeigen für gemeinsame Reisen', category: 'Reise' },
  ],
  'lesen:b1:4': [
    { situation: 'Ehrenamtliche Tätigkeiten in der Stadt', category: 'Soziales' },
    { situation: 'Anzeigen für WG-Zimmer in Berlin', category: 'Wohnen' },
    { situation: 'Anzeigen für Sprachtandem-Partner', category: 'Bildung' },
  ],

  // ─── LESEN Teil 5 (Lückentext) ───────────────────────────────
  'lesen:a1:5': [
    { situation: 'E-Mail an die Vermieterin wegen Reparatur', category: 'Wohnen' },
    { situation: 'Einladung zum Geburtstag', category: 'Privat' },
    { situation: 'Kurze Nachricht an den Sprachkurs', category: 'Bildung' },
  ],
  'lesen:a2:5': [
    { situation: 'Anmeldung zu einem Sportkurs', category: 'Freizeit' },
    { situation: 'Mail an die Reiseagentur', category: 'Reise' },
    { situation: 'Bestätigung eines Termins beim Arzt', category: 'Gesundheit' },
  ],
  'lesen:b1:5': [
    { situation: 'Beschwerde an ein Hotel nach dem Urlaub', category: 'Reise' },
    { situation: 'Bewerbungsanschreiben auf eine Stelle', category: 'Arbeit' },
    { situation: 'Mail an die Krankenkasse wegen Rechnung', category: 'Gesundheit' },
  ],

  // ─── HÖREN Teil 1 (kurze Durchsagen/Ansagen — Mono) ──────────
  'horen:a1:1': [
    { situation: 'Durchsage am Bahnhof', sceneHint: 'Zugverspätung, Gleiswechsel' },
    { situation: 'Anrufbeantworter eines Freundes', sceneHint: 'Treffen verschieben' },
    { situation: 'Ansage im Supermarkt', sceneHint: 'Sonderangebot, Schließzeit' },
  ],
  'horen:a2:1': [
    { situation: 'Durchsage im Flughafen', sceneHint: 'Gate-Änderung, Flugzeitänderung' },
    { situation: 'Nachricht der Arztpraxis', sceneHint: 'Terminverschiebung' },
    { situation: 'Ansage im Einkaufszentrum', sceneHint: 'Aktionsangebot, Kinderfund' },
  ],
  'horen:b1:1': [
    { situation: 'Verkehrsdurchsage im Radio', sceneHint: 'Stau, Umleitung' },
    { situation: 'Nachricht vom Kundenservice', sceneHint: 'Produktrückruf' },
    { situation: 'Ansage im Kino', sceneHint: 'Vorstellungsverschiebung' },
  ],

  // ─── HÖREN Teil 2 (Alltagsdialog mit Szenen) ─────────────────
  'horen:a2:2': [
    { situation: 'Alltag in der Stadt', sceneHint: 'Bahnhof, Markt, Apotheke, Café, Museum' },
    { situation: 'Ein Nachmittag mit Freundin', sceneHint: 'Park, Bäckerei, Kino, Restaurant, Bus' },
    { situation: 'Einkaufsbummel', sceneHint: 'Kleidungsgeschäft, Schuhladen, Kaffee, Drogerie, Buchladen' },
  ],
  'horen:a1:2': [
    { situation: 'Tag an der Uni', sceneHint: 'Mensa, Bibliothek, Seminar, Kiosk, Bushaltestelle' },
    { situation: 'Wochenende in der Stadt', sceneHint: 'Markt, Café, Museum, Park, Straßenbahn' },
    { situation: 'Ausflug zum See', sceneHint: 'Bahnhof, Imbiss, Bootsverleih, Restaurant, Supermarkt' },
  ],
  'horen:b1:2': [
    { situation: 'Ein Tag als Tourist', sceneHint: 'Hotel-Rezeption, Stadtführung, Souvenirladen, Restaurant, Taxi' },
    { situation: 'Umzugstag', sceneHint: 'Mietwagen, Baumarkt, Nachbar, Möbelhaus, Pizza-Lieferung' },
    { situation: 'Behördengang', sceneHint: 'Bürgeramt, Krankenkasse, Post, Bank, Café' },
  ],

  // ─── HÖREN Teil 3 (Interview/Gespräch) ───────────────────────
  'horen:a1:3': [
    { situation: 'Radio-Interview mit einer Studentin', sceneHint: 'über Hobbys' },
    { situation: 'Gespräch mit einem Koch', sceneHint: 'Lieblingsgericht' },
    { situation: 'Interview mit einem Sportler', sceneHint: 'Trainingsalltag' },
  ],
  'horen:a2:3': [
    { situation: 'Podcast-Interview mit einer Reisenden', sceneHint: 'Weltreise erzählen' },
    { situation: 'TV-Interview mit einer Musikerin', sceneHint: 'neues Album' },
    { situation: 'Radio-Gespräch mit einem Bäcker', sceneHint: 'Familienbetrieb' },
  ],
  'horen:b1:3': [
    { situation: 'Podcast mit einer Klimaforscherin', sceneHint: 'Forschungsergebnisse diskutieren' },
    { situation: 'Radio-Interview mit einem Start-up-Gründer', sceneHint: 'Idee und Herausforderungen' },
    { situation: 'TV-Gespräch mit einer Schriftstellerin', sceneHint: 'neues Buch und Schreibprozess' },
  ],

  // ─── HÖREN Teil 4 (5 getrennte kurze Dialoge) ────────────────
  'horen:a1:4': [
    { situation: 'Fünf Alltagsdialoge', sceneHint: 'Bäcker, Bus, Bank, Büro, Bibliothek' },
    { situation: 'Fünf kurze Gespräche', sceneHint: 'Arztpraxis, Apotheke, Schule, Sportplatz, Café' },
    { situation: 'Fünf typische Szenen', sceneHint: 'Kaufhaus, Fahrradladen, Post, Kino, Restaurant' },
  ],
  'horen:a2:4': [
    { situation: 'Fünf kurze Gespräche im Alltag', sceneHint: 'Reisebüro, Autowerkstatt, Friseur, Supermarkt, Hotel' },
    { situation: 'Fünf Dialoge rund ums Wohnen', sceneHint: 'Hausverwaltung, Handwerker, Nachbar, Möbelhaus, Umzugsfirma' },
    { situation: 'Fünf Dialoge im Berufsalltag', sceneHint: 'Kollege, Chef, Kunde, Lieferant, Praktikant' },
  ],
  'horen:b1:4': [
    { situation: 'Fünf kurze Diskussionen', sceneHint: 'Elternabend, Vereinssitzung, Betriebsversammlung, Pressekonferenz, Talk-Show' },
    { situation: 'Fünf Beratungsgespräche', sceneHint: 'Bank, Versicherung, Reisebüro, Jobcenter, Mieterberatung' },
    { situation: 'Fünf Smalltalks mit Fremden', sceneHint: 'Zug, Wartezimmer, Café, Flughafen, Fitnessstudio' },
  ],
}
