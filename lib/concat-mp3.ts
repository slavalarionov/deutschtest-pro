// server-only — concatenate ElevenLabs MP3 segments (Node.js)

import { spawn } from 'child_process'
import { mkdtemp, writeFile, readFile, rm } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'

function escapeConcatPath(p: string): string {
  return p.replace(/'/g, "'\\''")
}

async function getFfmpegPath(): Promise<string | null> {
  try {
    const mod = await import('@ffmpeg-installer/ffmpeg')
    return mod.default.path
  } catch {
    return null
  }
}

/**
 * Склейка сегментов MP3. Сначала ffmpeg concat demuxer (-c copy), при ошибке — побайтовая склейка.
 */
export async function concatenateMp3Buffers(buffers: Buffer[]): Promise<Buffer> {
  if (buffers.length === 0) throw new Error('No audio buffers')
  if (buffers.length === 1) return buffers[0]

  // Auf Vercel ist spawn/ffmpeg oft langsam/fehleranfällig; naive Concat reicht für ElevenLabs-MP3 in den meisten Playern.
  if (process.env.VERCEL === '1' || process.env.SKIP_FFMPEG === '1') {
    return Buffer.concat(buffers)
  }

  const ffmpegPath = await getFfmpegPath()
  if (!ffmpegPath) {
    return Buffer.concat(buffers)
  }

  const dir = await mkdtemp(join(tmpdir(), 'horen-mp3-'))

  try {
    const paths: string[] = []
    for (let i = 0; i < buffers.length; i++) {
      const fp = join(dir, `seg_${i}.mp3`)
      await writeFile(fp, buffers[i])
      paths.push(fp)
    }
    const listContent = paths.map((p) => `file '${escapeConcatPath(p)}'`).join('\n')
    const listPath = join(dir, 'concat.txt')
    await writeFile(listPath, listContent)
    const outPath = join(dir, 'out.mp3')

    await new Promise<void>((resolve, reject) => {
      const proc = spawn(
        ffmpegPath,
        ['-y', '-f', 'concat', '-safe', '0', '-i', listPath, '-c', 'copy', outPath],
        { stdio: ['ignore', 'ignore', 'pipe'] }
      )
      let err = ''
      proc.stderr?.on('data', (c) => {
        err += c.toString()
      })
      proc.on('close', (code) => {
        if (code === 0) resolve()
        else reject(new Error(`ffmpeg exit ${code}: ${err.slice(-400)}`))
      })
      proc.on('error', reject)
    })

    return await readFile(outPath)
  } catch (e) {
    console.warn('ffmpeg MP3 concat failed, using naive Buffer.concat:', e)
    return Buffer.concat(buffers)
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => {})
  }
}
