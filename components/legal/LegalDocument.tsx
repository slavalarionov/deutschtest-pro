import { readFileSync } from 'fs'
import { join } from 'path'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface Props {
  filename: string
}

export function LegalDocument({ filename }: Props) {
  const filePath = join(process.cwd(), 'legal', filename)
  const content = readFileSync(filePath, 'utf-8')

  return (
    <article className="prose-legal mx-auto max-w-3xl px-6 py-16 lg:py-24">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </article>
  )
}
