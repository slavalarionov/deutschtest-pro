// server-only — 1s Stille zwischen Hören-Repliken (echtes MP3, mono 44100)

import { readFileSync } from 'fs'
import { join } from 'path'

let cached: Buffer | null = null

export function getInterLineSilenceMp3(): Buffer {
  if (!cached) {
    const path = join(process.cwd(), 'lib/audio/silence-1s.mp3')
    cached = readFileSync(path)
  }
  return cached
}
