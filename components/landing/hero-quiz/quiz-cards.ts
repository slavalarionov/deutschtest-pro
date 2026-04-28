import type { Locale } from '@/i18n/request'

export type QuizCardType = 'verb-form' | 'article' | 'case-ending' | 'translation'

export type QuizCard = {
  id: string
  level: 'A1' | 'A2' | 'B1'
  type: QuizCardType
  prompt: string
  options: string[]
  correctIndex: number
  feedback: {
    hint: Record<Locale, string>
    correct: Record<Locale, string>
    incorrect: Record<Locale, string>
  }
}

export const HERO_QUIZ_CARDS: QuizCard[] = [
  {
    id: 'a1-article-maedchen',
    level: 'A1',
    type: 'article',
    prompt: '___ Mädchen lernt Deutsch.',
    options: ['der', 'die', 'das'],
    correctIndex: 2,
    feedback: {
      hint: {
        de: 'Achte auf die Endung — manche Wortendungen bestimmen das Genus.',
        ru: 'Обратите внимание на окончание слова — оно подсказывает род.',
        en: 'Watch the suffix — some endings reveal the gender.',
        tr: 'Sonekine dikkat et — bazı ekler cinsiyeti belirler.',
      },
      correct: {
        de: 'Richtig! Verkleinerungen auf -chen sind immer Neutrum: das Mädchen, das Brötchen, das Kätzchen.',
        ru: 'Верно! Слова с уменьшительным -chen всегда среднего рода: das Mädchen, das Brötchen, das Kätzchen.',
        en: 'Correct! Diminutives ending in -chen are always neuter: das Mädchen, das Brötchen, das Kätzchen.',
        tr: 'Doğru! -chen ile biten küçültmeler her zaman nötrdür: das Mädchen, das Brötchen, das Kätzchen.',
      },
      incorrect: {
        de: 'Richtig wäre „das". Verkleinerungen auf -chen und -lein sind immer Neutrum.',
        ru: 'Правильный ответ — «das». Уменьшительные на -chen и -lein всегда среднего рода.',
        en: 'The right answer is "das". Diminutives in -chen and -lein are always neuter.',
        tr: 'Doğru cevap "das". -chen ve -lein ekli küçültmeler her zaman nötrdür.',
      },
    },
  },
  {
    id: 'a1-verb-perfekt-fahren',
    level: 'A1',
    type: 'verb-form',
    prompt: 'Ich ___ nach Berlin gefahren.',
    options: ['war', 'bin', 'habe'],
    correctIndex: 1,
    feedback: {
      hint: {
        de: 'Welches Hilfsverb passt zu Bewegung — „sein" oder „haben"?',
        ru: 'Какой вспомогательный глагол подходит для движения — sein или haben?',
        en: 'Which auxiliary fits motion verbs — "sein" or "haben"?',
        tr: 'Hareket fiilleriyle hangi yardımcı fiil kullanılır — "sein" mi "haben" mi?',
      },
      correct: {
        de: 'Richtig! Bewegungsverben (fahren, gehen, fliegen) bilden das Perfekt mit „sein": ich bin gefahren.',
        ru: 'Верно! Глаголы движения (fahren, gehen, fliegen) образуют Perfekt с sein: ich bin gefahren.',
        en: 'Correct! Verbs of motion (fahren, gehen, fliegen) take "sein" in the Perfekt: ich bin gefahren.',
        tr: 'Doğru! Hareket fiilleri (fahren, gehen, fliegen) Perfekt\'i "sein" ile kurar: ich bin gefahren.',
      },
      incorrect: {
        de: 'Richtig wäre „bin". Bewegungsverben verlangen im Perfekt das Hilfsverb „sein".',
        ru: 'Правильный ответ — «bin». Глаголы движения в Perfekt требуют sein.',
        en: 'The right answer is "bin". Motion verbs take "sein" as the auxiliary in the Perfekt.',
        tr: 'Doğru cevap "bin". Hareket fiilleri Perfekt\'te yardımcı fiil olarak "sein" alır.',
      },
    },
  },
  {
    id: 'a1-translation-geschwister',
    level: 'A1',
    type: 'translation',
    prompt: 'Was bedeutet „Geschwister"?',
    options: ['Eltern und Kinder', 'Brüder und Schwestern', 'Onkel und Tante'],
    correctIndex: 1,
    feedback: {
      hint: {
        de: '„Geschwister" beschreibt eine bestimmte Familienbeziehung.',
        ru: 'Geschwister обозначает определённую родственную связь.',
        en: '"Geschwister" describes a specific family relationship.',
        tr: '"Geschwister" belirli bir aile ilişkisini ifade eder.',
      },
      correct: {
        de: 'Richtig! „Geschwister" fasst Brüder und Schwestern in einem Wort zusammen — ohne Geschlechtsunterschied.',
        ru: 'Верно! Geschwister объединяет братьев и сестёр одним словом — без указания пола.',
        en: 'Correct! "Geschwister" covers brothers and sisters together — gender-neutral.',
        tr: 'Doğru! "Geschwister" erkek ve kız kardeşleri tek kelimede toplar — cinsiyetten bağımsız.',
      },
      incorrect: {
        de: 'Richtig wäre „Brüder und Schwestern". Das deutsche Wort fasst beide Geschlechter zusammen.',
        ru: 'Правильный ответ — «Brüder und Schwestern». Немецкое слово объединяет оба пола.',
        en: 'The right answer is "Brüder und Schwestern". The German word covers both genders.',
        tr: 'Doğru cevap "Brüder und Schwestern". Almanca kelime her iki cinsiyeti kapsar.',
      },
    },
  },
  {
    id: 'a2-article-broetchen',
    level: 'A2',
    type: 'article',
    prompt: '___ Brötchen kostet 50 Cent.',
    options: ['Der', 'Die', 'Das'],
    correctIndex: 2,
    feedback: {
      hint: {
        de: 'Die Wortendung verrät hier das Genus.',
        ru: 'Окончание слова подсказывает род.',
        en: 'The word ending tells you the gender.',
        tr: 'Kelime ekinden cinsiyeti anlayabilirsin.',
      },
      correct: {
        de: 'Richtig! „Brötchen" endet auf -chen und ist deshalb Neutrum: das Brötchen.',
        ru: 'Верно! Brötchen оканчивается на -chen, значит средний род: das Brötchen.',
        en: 'Correct! "Brötchen" ends in -chen, so it is neuter: das Brötchen.',
        tr: 'Doğru! "Brötchen" -chen ile biter, bu yüzden nötrdür: das Brötchen.',
      },
      incorrect: {
        de: 'Richtig wäre „Das". Diminutive auf -chen und -lein sind immer Neutrum.',
        ru: 'Правильный ответ — «Das». Уменьшительные на -chen и -lein всегда среднего рода.',
        en: 'The right answer is "Das". Diminutives in -chen and -lein are always neuter.',
        tr: 'Doğru cevap "Das". -chen ve -lein ekli küçültmeler her zaman nötrdür.',
      },
    },
  },
  {
    id: 'a2-verb-perfekt-lesen',
    level: 'A2',
    type: 'verb-form',
    prompt: 'Sie ___ den Brief gelesen.',
    options: ['hat', 'ist', 'war'],
    correctIndex: 0,
    feedback: {
      hint: {
        de: 'Hat das Verb hier ein Akkusativobjekt? Das entscheidet über das Hilfsverb.',
        ru: 'Есть ли у глагола прямое дополнение? Это определяет вспомогательный глагол.',
        en: 'Does the verb take a direct object? That decides the auxiliary.',
        tr: 'Fiilin doğrudan nesnesi var mı? Bu yardımcı fiili belirler.',
      },
      correct: {
        de: 'Richtig! „lesen" ist transitiv (den Brief = Akkusativ), darum Perfekt mit „haben": sie hat gelesen.',
        ru: 'Верно! lesen — переходный (den Brief = Akkusativ), поэтому Perfekt с haben: sie hat gelesen.',
        en: 'Correct! "lesen" is transitive (den Brief = accusative), so the Perfekt uses "haben": sie hat gelesen.',
        tr: 'Doğru! "lesen" geçişlidir (den Brief = Akkusativ), bu yüzden Perfekt "haben" ile: sie hat gelesen.',
      },
      incorrect: {
        de: 'Richtig wäre „hat". Transitive Verben mit Akkusativobjekt bilden das Perfekt mit „haben".',
        ru: 'Правильный ответ — «hat». Переходные глаголы с прямым дополнением образуют Perfekt с haben.',
        en: 'The right answer is "hat". Transitive verbs with a direct object form the Perfekt with "haben".',
        tr: 'Doğru cevap "hat". Doğrudan nesne alan geçişli fiiller Perfekt\'i "haben" ile kurar.',
      },
    },
  },
  {
    id: 'a2-case-dativ-helfen',
    level: 'A2',
    type: 'case-ending',
    prompt: 'Ich helfe mein__ Bruder.',
    options: ['-en', '-em', '-e'],
    correctIndex: 1,
    feedback: {
      hint: {
        de: '„helfen" verlangt einen bestimmten Kasus — welchen?',
        ru: 'helfen управляет определённым падежом — каким?',
        en: '"helfen" governs a specific case — which one?',
        tr: '"helfen" belirli bir durum (Kasus) ister — hangisi?',
      },
      correct: {
        de: 'Richtig! „helfen" + Dativ. Maskulin Dativ Possessivum endet auf -em: meinem Bruder.',
        ru: 'Верно! helfen + Dativ. Мужской род Dativ у притяжательного — окончание -em: meinem Bruder.',
        en: 'Correct! "helfen" + dative. Masculine dative possessive ends in -em: meinem Bruder.',
        tr: 'Doğru! "helfen" + Dativ. Eril Dativ iyelik -em ile biter: meinem Bruder.',
      },
      incorrect: {
        de: 'Richtig wäre „-em". „helfen" verlangt Dativ; Bruder ist Maskulin → meinem Bruder.',
        ru: 'Правильный ответ — «-em». helfen требует Dativ; Bruder мужского рода → meinem Bruder.',
        en: 'The right answer is "-em". "helfen" takes the dative; Bruder is masculine → meinem Bruder.',
        tr: 'Doğru cevap "-em". "helfen" Dativ alır; Bruder erildir → meinem Bruder.',
      },
    },
  },
  {
    id: 'a2-translation-feierabend',
    level: 'A2',
    type: 'translation',
    prompt: 'Was bedeutet „Feierabend"?',
    options: ['der Beginn der Arbeit', 'das Ende der Arbeit', 'eine Feier am Wochenende'],
    correctIndex: 1,
    feedback: {
      hint: {
        de: 'Feierabend hat mit dem Arbeitstag zu tun — aber wann genau?',
        ru: 'Feierabend связан с рабочим днём — но в какой момент?',
        en: '"Feierabend" relates to the workday — but at which moment?',
        tr: '"Feierabend" iş günüyle ilgilidir — ama hangi anla?',
      },
      correct: {
        de: 'Richtig! „Feierabend" ist die Freizeit nach der Arbeit — der Übergang von Pflicht zu Privatleben.',
        ru: 'Верно! Feierabend — это свободное время после работы, переход от обязанностей к личной жизни.',
        en: 'Correct! "Feierabend" is the free time after work — the shift from duty to private life.',
        tr: 'Doğru! "Feierabend" iş sonrası boş zamandır — görevden özel hayata geçiş.',
      },
      incorrect: {
        de: 'Richtig wäre „das Ende der Arbeit". „Feierabend" markiert den Übergang von Arbeit zu Freizeit.',
        ru: 'Правильный ответ — «das Ende der Arbeit». Feierabend — это переход от работы к отдыху.',
        en: 'The right answer is "das Ende der Arbeit". "Feierabend" marks the shift from work to leisure.',
        tr: 'Doğru cevap "das Ende der Arbeit". "Feierabend" işten boş zamana geçişi belirtir.',
      },
    },
  },
  {
    id: 'b1-verb-konjunktiv-wuerde',
    level: 'B1',
    type: 'verb-form',
    prompt: 'Wenn ich Zeit hätte, ___ ich mitkommen.',
    options: ['werde', 'würde', 'wäre'],
    correctIndex: 1,
    feedback: {
      hint: {
        de: 'Eine irreale Bedingung verlangt einen besonderen Modus — welchen?',
        ru: 'Нереальное условие требует особого наклонения — какого?',
        en: 'An unreal condition needs a specific mood — which one?',
        tr: 'Gerçek olmayan bir koşul özel bir kip ister — hangisi?',
      },
      correct: {
        de: 'Richtig! Konjunktiv II für irreale Bedingungen — meist mit „würde + Infinitiv": würde mitkommen.',
        ru: 'Верно! Konjunktiv II для нереальных условий — обычно würde + инфинитив: würde mitkommen.',
        en: 'Correct! Konjunktiv II for unreal conditions — usually "würde + infinitive": würde mitkommen.',
        tr: 'Doğru! Gerçek olmayan koşullar için Konjunktiv II — genellikle "würde + mastar": würde mitkommen.',
      },
      incorrect: {
        de: 'Richtig wäre „würde". Bei irrealen Wenn-Sätzen steht im Hauptsatz Konjunktiv II.',
        ru: 'Правильный ответ — «würde». В нереальных условных предложениях главное предложение в Konjunktiv II.',
        en: 'The right answer is "würde". Unreal conditional clauses use Konjunktiv II in the main clause.',
        tr: 'Doğru cevap "würde". Gerçek olmayan koşul cümlelerinde ana cümle Konjunktiv II kullanır.',
      },
    },
  },
  {
    id: 'b1-case-akk-adjektiv',
    level: 'B1',
    type: 'case-ending',
    prompt: 'Ich sehe den groß__ Mann.',
    options: ['-en', '-er', '-e'],
    correctIndex: 0,
    feedback: {
      hint: {
        de: 'Nach dem bestimmten Artikel folgt eine schwache Adjektivdeklination.',
        ru: 'После определённого артикля следует слабое склонение прилагательного.',
        en: 'After the definite article comes the weak adjective declension.',
        tr: 'Belirli artikelden sonra sıfatın zayıf çekimi gelir.',
      },
      correct: {
        de: 'Richtig! Nach „den" (Akkusativ Maskulin) im schwachen Schema: -en. → den großen Mann.',
        ru: 'Верно! После den (Akkusativ муж. род) по слабому склонению — -en. → den großen Mann.',
        en: 'Correct! After "den" (masculine accusative) in the weak pattern: -en. → den großen Mann.',
        tr: 'Doğru! "den" (eril Akkusativ) sonrası zayıf çekimde: -en. → den großen Mann.',
      },
      incorrect: {
        de: 'Richtig wäre „-en". Schwache Deklination nach „den" im Akkusativ Maskulin endet auf -en.',
        ru: 'Правильный ответ — «-en». Слабое склонение после den в Akkusativ муж. рода — -en.',
        en: 'The right answer is "-en". Weak declension after "den" in masculine accusative ends in -en.',
        tr: 'Doğru cevap "-en". "den" sonrası eril Akkusativ\'de zayıf çekim -en ile biter.',
      },
    },
  },
  {
    id: 'b1-verb-konjunktiv-plusquam',
    level: 'B1',
    type: 'verb-form',
    prompt: 'Ich ___ ins Kino gegangen, wenn ich Zeit gehabt hätte.',
    options: ['wäre', 'bin', 'hätte'],
    correctIndex: 0,
    feedback: {
      hint: {
        de: 'Vergangenheit + irreale Bedingung — welche Form passt zum Bewegungsverb?',
        ru: 'Прошлое + нереальное условие — какая форма подходит для глагола движения?',
        en: 'Past + unreal condition — which form fits a verb of motion?',
        tr: 'Geçmiş + gerçek olmayan koşul — hareket fiili için hangi biçim uyar?',
      },
      correct: {
        de: 'Richtig! Konjunktiv II Plusquamperfekt: „wäre/hätte" + Partizip II. Für „gehen" → wäre gegangen.',
        ru: 'Верно! Konjunktiv II Plusquamperfekt: wäre/hätte + Partizip II. Для gehen → wäre gegangen.',
        en: 'Correct! Konjunktiv II past: "wäre/hätte" + past participle. For "gehen" → wäre gegangen.',
        tr: 'Doğru! Konjunktiv II geçmiş: "wäre/hätte" + Partizip II. "gehen" için → wäre gegangen.',
      },
      incorrect: {
        de: 'Richtig wäre „wäre". „gehen" bildet Perfekt mit „sein", also Konjunktiv II Plusquamperfekt: wäre gegangen.',
        ru: 'Правильный ответ — «wäre». gehen образует Perfekt с sein, значит в Konjunktiv II Plusquamperfekt: wäre gegangen.',
        en: 'The right answer is "wäre". "gehen" takes "sein" in the Perfekt, so the past Konjunktiv II is: wäre gegangen.',
        tr: 'Doğru cevap "wäre". "gehen" Perfekt\'i "sein" ile kurar, Konjunktiv II geçmişte: wäre gegangen.',
      },
    },
  },
]

export const FINAL_FEEDBACK: {
  low: Record<Locale, string>
  mid: Record<Locale, string>
  high: Record<Locale, string>
} = {
  low: {
    de: 'Hier ist noch Luft nach oben — übe weiter mit allen vier Modulen.',
    ru: 'Есть, куда расти — тренируйтесь во всех четырёх модулях.',
    en: 'Plenty of room to grow — keep practicing across all four modules.',
    tr: 'Gelişmek için yer var — dört modülde de pratik yapmaya devam et.',
  },
  mid: {
    de: 'Solide — mit etwas Übung schaffst du das nächste Niveau.',
    ru: 'Уверенно — с практикой возьмёте следующий уровень.',
    en: 'Solid — with a bit of practice you\'ll reach the next level.',
    tr: 'Sağlam — biraz pratikle bir sonraki seviyeye ulaşırsın.',
  },
  high: {
    de: 'Stark — du bist bereit für deine erste richtige Prüfung.',
    ru: 'Отлично — вы готовы к настоящему экзамену.',
    en: 'Strong — you\'re ready for the real exam.',
    tr: 'Mükemmel — gerçek sınava hazırsın.',
  },
}
