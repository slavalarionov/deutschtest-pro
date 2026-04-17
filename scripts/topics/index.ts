// Агрегатор тем для generation_topics.
// Каждый ключ — `${module}:${level}:${teil ?? 'null'}`.

import type { TopicData } from '@/lib/topic-sampler'

import { SCHREIBEN_A1, SCHREIBEN_A2, SCHREIBEN_B1 } from './schreiben'
import { SPRECHEN_A1, SPRECHEN_A2, SPRECHEN_B1 } from './sprechen'
import {
  LESEN_A1_T1,
  LESEN_A1_T2,
  LESEN_A1_T3,
  LESEN_A1_T4,
  LESEN_A1_T5,
} from './lesen-a1'
import {
  LESEN_A2_T1,
  LESEN_A2_T2,
  LESEN_A2_T3,
  LESEN_A2_T4,
  LESEN_A2_T5,
} from './lesen-a2'
import {
  LESEN_B1_T1,
  LESEN_B1_T2,
  LESEN_B1_T3,
  LESEN_B1_T4,
  LESEN_B1_T5,
} from './lesen-b1'
import { HOREN_A1_T1, HOREN_A1_T2, HOREN_A1_T3, HOREN_A1_T4 } from './horen-a1'
import { HOREN_A2_T1, HOREN_A2_T2, HOREN_A2_T3, HOREN_A2_T4 } from './horen-a2'
import { HOREN_B1_T1, HOREN_B1_T2, HOREN_B1_T3, HOREN_B1_T4 } from './horen-b1'

export const TOPIC_SEEDS: Record<string, TopicData[]> = {
  'schreiben:a1:null': SCHREIBEN_A1,
  'schreiben:a2:null': SCHREIBEN_A2,
  'schreiben:b1:null': SCHREIBEN_B1,

  'sprechen:a1:null': SPRECHEN_A1,
  'sprechen:a2:null': SPRECHEN_A2,
  'sprechen:b1:null': SPRECHEN_B1,

  'lesen:a1:1': LESEN_A1_T1,
  'lesen:a1:2': LESEN_A1_T2,
  'lesen:a1:3': LESEN_A1_T3,
  'lesen:a1:4': LESEN_A1_T4,
  'lesen:a1:5': LESEN_A1_T5,

  'lesen:a2:1': LESEN_A2_T1,
  'lesen:a2:2': LESEN_A2_T2,
  'lesen:a2:3': LESEN_A2_T3,
  'lesen:a2:4': LESEN_A2_T4,
  'lesen:a2:5': LESEN_A2_T5,

  'lesen:b1:1': LESEN_B1_T1,
  'lesen:b1:2': LESEN_B1_T2,
  'lesen:b1:3': LESEN_B1_T3,
  'lesen:b1:4': LESEN_B1_T4,
  'lesen:b1:5': LESEN_B1_T5,

  'horen:a1:1': HOREN_A1_T1,
  'horen:a1:2': HOREN_A1_T2,
  'horen:a1:3': HOREN_A1_T3,
  'horen:a1:4': HOREN_A1_T4,

  'horen:a2:1': HOREN_A2_T1,
  'horen:a2:2': HOREN_A2_T2,
  'horen:a2:3': HOREN_A2_T3,
  'horen:a2:4': HOREN_A2_T4,

  'horen:b1:1': HOREN_B1_T1,
  'horen:b1:2': HOREN_B1_T2,
  'horen:b1:3': HOREN_B1_T3,
  'horen:b1:4': HOREN_B1_T4,
}
