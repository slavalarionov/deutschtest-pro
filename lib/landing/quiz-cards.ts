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
      correct: {
        de: 'Richtig! Wörter mit -chen sind immer Neutrum (das).',
        ru: 'Верно! Все существительные с суффиксом -chen — среднего рода (das).',
        en: 'Correct! Nouns ending in -chen are always neuter (das).',
        tr: 'Doğru! -chen ekiyle biten isimler her zaman nötrdür (das).',
      },
      incorrect: {
        de: 'Nein — bei -chen und -lein ist das Genus immer „das" (Neutrum).',
        ru: 'Нет — слова с суффиксами -chen и -lein всегда среднего рода (das).',
        en: 'No — nouns with -chen or -lein suffixes are always neuter (das).',
        tr: 'Hayır — -chen ve -lein ekli isimler her zaman nötrdür (das).',
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
      correct: {
        de: 'Richtig! Bewegungsverben bilden das Perfekt mit „sein".',
        ru: 'Верно! Глаголы движения образуют Perfekt со вспомогательным sein.',
        en: 'Correct! Verbs of motion form the Perfekt with "sein".',
        tr: 'Doğru! Hareket fiilleri Perfekt zamanını "sein" ile kurar.',
      },
      incorrect: {
        de: 'Nein — bei Bewegungsverben (fahren, gehen, fliegen) ist „bin" richtig.',
        ru: 'Нет — глаголы движения (fahren, gehen, fliegen) требуют sein, правильно «bin».',
        en: 'No — verbs of motion (fahren, gehen, fliegen) take "sein", so "bin".',
        tr: 'Hayır — hareket fiilleri (fahren, gehen, fliegen) "sein" alır, yani "bin".',
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
      correct: {
        de: 'Richtig! „Geschwister" sind Brüder und Schwestern zusammen.',
        ru: 'Верно! Geschwister — это братья и сёстры вместе.',
        en: 'Correct! "Geschwister" means brothers and sisters together.',
        tr: 'Doğru! "Geschwister" kardeşler (erkek ve kız) anlamına gelir.',
      },
      incorrect: {
        de: 'Nein — „Geschwister" bezeichnet Brüder und Schwestern.',
        ru: 'Нет — Geschwister означает «братья и сёстры».',
        en: 'No — "Geschwister" refers to brothers and sisters.',
        tr: 'Hayır — "Geschwister" erkek ve kız kardeşler demektir.',
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
      correct: {
        de: 'Richtig! „Brötchen" endet auf -chen — also Neutrum.',
        ru: 'Верно! Brötchen заканчивается на -chen — значит das.',
        en: 'Correct! "Brötchen" ends in -chen, so it is neuter (das).',
        tr: 'Doğru! "Brötchen" -chen ile biter, bu yüzden nötrdür (das).',
      },
      incorrect: {
        de: 'Nein — Diminutive auf -chen sind immer Neutrum: das Brötchen.',
        ru: 'Нет — диминутивы с -chen всегда среднего рода: das Brötchen.',
        en: 'No — diminutives ending in -chen are always neuter: das Brötchen.',
        tr: 'Hayır — -chen ile biten küçültmeler hep nötrdür: das Brötchen.',
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
      correct: {
        de: 'Richtig! Transitive Verben bilden das Perfekt mit „haben".',
        ru: 'Верно! Переходные глаголы образуют Perfekt с haben.',
        en: 'Correct! Transitive verbs form the Perfekt with "haben".',
        tr: 'Doğru! Geçişli fiiller Perfekt zamanını "haben" ile kurar.',
      },
      incorrect: {
        de: 'Nein — „lesen" hat ein Akkusativobjekt (den Brief), also „haben".',
        ru: 'Нет — у lesen есть прямое дополнение (den Brief), нужен haben.',
        en: 'No — "lesen" takes a direct object (den Brief), so "haben".',
        tr: 'Hayır — "lesen" doğrudan nesne alır (den Brief), yani "haben".',
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
      correct: {
        de: 'Richtig! „helfen" verlangt Dativ — Maskulin Dativ = -em.',
        ru: 'Верно! helfen управляет Dativ; мужской род в Dativ — окончание -em.',
        en: 'Correct! "helfen" takes the dative — masculine dative ends in -em.',
        tr: 'Doğru! "helfen" Dativ alır — eril Dativ -em ile biter.',
      },
      incorrect: {
        de: 'Nein — „helfen" + Dativ. Bruder ist maskulin → meinem Bruder.',
        ru: 'Нет — helfen + Dativ. Bruder мужской род → meinem Bruder.',
        en: 'No — "helfen" + dative. Bruder is masculine → meinem Bruder.',
        tr: 'Hayır — "helfen" + Dativ. Bruder erildir → meinem Bruder.',
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
      correct: {
        de: 'Richtig! „Feierabend" ist die Zeit nach dem Arbeitstag.',
        ru: 'Верно! Feierabend — это время после окончания рабочего дня.',
        en: 'Correct! "Feierabend" is the time after the workday ends.',
        tr: 'Doğru! "Feierabend" iş gününün bittiği andan sonraki zamandır.',
      },
      incorrect: {
        de: 'Nein — „Feierabend" bedeutet das Ende des Arbeitstages.',
        ru: 'Нет — Feierabend означает окончание рабочего дня.',
        en: 'No — "Feierabend" means the end of the workday.',
        tr: 'Hayır — "Feierabend" iş gününün sonu demektir.',
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
      correct: {
        de: 'Richtig! Konjunktiv II für irreale Bedingungen — meist mit „würde".',
        ru: 'Верно! Konjunktiv II для нереальных условий — обычно с würde.',
        en: 'Correct! Konjunktiv II for unreal conditions — usually formed with "würde".',
        tr: 'Doğru! Gerçek olmayan koşullar için Konjunktiv II — genellikle "würde" ile.',
      },
      incorrect: {
        de: 'Nein — irreale Bedingung verlangt Konjunktiv II: „würde mitkommen".',
        ru: 'Нет — нереальное условие требует Konjunktiv II: «würde mitkommen».',
        en: 'No — an unreal condition needs Konjunktiv II: "würde mitkommen".',
        tr: 'Hayır — gerçek olmayan koşul Konjunktiv II ister: "würde mitkommen".',
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
      correct: {
        de: 'Richtig! Nach bestimmtem Artikel im Akkusativ Maskulin: -en.',
        ru: 'Верно! После определённого артикля в Akkusativ мужского рода — -en.',
        en: 'Correct! After a definite article in masculine accusative: -en.',
        tr: 'Doğru! Belirli artikelden sonra eril Akkusativ\'de: -en.',
      },
      incorrect: {
        de: 'Nein — schwache Deklination nach „den" verlangt -en: den großen Mann.',
        ru: 'Нет — слабое склонение после den требует -en: den großen Mann.',
        en: 'No — weak declension after "den" takes -en: den großen Mann.',
        tr: 'Hayır — "den" sonrası zayıf çekim -en ister: den großen Mann.',
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
      correct: {
        de: 'Richtig! Irrealis der Vergangenheit: „wäre/hätte" + Partizip II.',
        ru: 'Верно! Konjunktiv II Plusquamperfekt: wäre/hätte + Partizip II.',
        en: 'Correct! Past unreal: "wäre/hätte" + past participle.',
        tr: 'Doğru! Geçmişteki gerçek olmayan durum: "wäre/hätte" + Partizip II.',
      },
      incorrect: {
        de: 'Nein — „gehen" bildet Perfekt mit „sein", also „wäre gegangen".',
        ru: 'Нет — gehen образует Perfekt с sein, значит «wäre gegangen».',
        en: 'No — "gehen" takes "sein", so "wäre gegangen".',
        tr: 'Hayır — "gehen" "sein" alır, yani "wäre gegangen".',
      },
    },
  },
]
