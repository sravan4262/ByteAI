"use client"

import { useState } from 'react'
import { Code2, Wand2, ChevronDown, Search, X } from 'lucide-react'
import { formatCode as formatCodeApi } from '@/lib/api/client'
import { useFeatureFlag } from '@/hooks/use-feature-flags'

export interface Language {
  id: string
  label: string
  parser: 'babel' | 'typescript' | 'html' | 'css' | 'scss' | 'json' | 'yaml' | 'markdown' | 'graphql' | null
}

export const LANGUAGES: Language[] = [
  // Web frontend
  { id: 'JS',     label: 'JavaScript',  parser: 'babel'      },
  { id: 'TS',     label: 'TypeScript',  parser: 'typescript' },
  { id: 'JSX',    label: 'React JSX',   parser: 'babel'      },
  { id: 'TSX',    label: 'React TSX',   parser: 'typescript' },
  { id: 'HTML',   label: 'HTML',        parser: 'html'       },
  { id: 'CSS',    label: 'CSS',         parser: 'css'        },
  { id: 'SCSS',   label: 'SCSS',        parser: 'scss'       },
  // Backend
  { id: 'PY',     label: 'Python',      parser: null },
  { id: 'JAVA',   label: 'Java',        parser: null },
  { id: 'CS',     label: 'C#',          parser: null },
  { id: 'GO',     label: 'Go',          parser: null },
  { id: 'RS',     label: 'Rust',        parser: null },
  { id: 'RB',     label: 'Ruby',        parser: null },
  { id: 'PHP',    label: 'PHP',         parser: null },
  { id: 'SWIFT',  label: 'Swift',       parser: null },
  { id: 'KT',     label: 'Kotlin',      parser: null },
  { id: 'SCALA',  label: 'Scala',       parser: null },
  { id: 'ELIXIR', label: 'Elixir',      parser: null },
  // Systems
  { id: 'C',      label: 'C',           parser: null },
  { id: 'CPP',    label: 'C++',         parser: null },
  { id: 'RS_ASM', label: 'Assembly',    parser: null },
  // Mobile
  { id: 'DART',   label: 'Dart',        parser: null },
  { id: 'OBJC',   label: 'Objective-C', parser: null },
  // Data / ML
  { id: 'R',      label: 'R',           parser: null },
  { id: 'SQL',    label: 'SQL',         parser: null },
  { id: 'MATLAB', label: 'MATLAB',      parser: null },
  // Config / Markup
  { id: 'JSON',   label: 'JSON',        parser: 'json'     },
  { id: 'YAML',   label: 'YAML',        parser: 'yaml'     },
  { id: 'TOML',   label: 'TOML',        parser: null       },
  { id: 'XML',    label: 'XML',         parser: null       },
  { id: 'MD',     label: 'Markdown',    parser: 'markdown' },
  { id: 'GQL',    label: 'GraphQL',     parser: 'graphql'  },
  // Scripting / DevOps
  { id: 'BASH',   label: 'Bash',        parser: null },
  { id: 'PS1',    label: 'PowerShell',  parser: null },
  { id: 'LUA',    label: 'Lua',         parser: null },
  { id: 'DOCKER', label: 'Dockerfile',  parser: null },
]

async function formatWithPrettier(code: string, lang: Language): Promise<string> {
  const prettier = await import('prettier/standalone')

  if (lang.parser === 'babel') {
    const [babel, estree] = await Promise.all([
      import('prettier/plugins/babel'),
      import('prettier/plugins/estree'),
    ])
    return prettier.format(code, { parser: 'babel', plugins: [babel, estree], semi: true, singleQuote: true, tabWidth: 2, printWidth: 80 })
  }

  if (lang.parser === 'typescript') {
    const [ts, estree] = await Promise.all([
      import('prettier/plugins/typescript'),
      import('prettier/plugins/estree'),
    ])
    return prettier.format(code, { parser: 'typescript', plugins: [ts, estree], semi: true, singleQuote: true, tabWidth: 2, printWidth: 80 })
  }

  if (lang.parser === 'html') {
    const html = await import('prettier/plugins/html')
    return prettier.format(code, { parser: 'html', plugins: [html], tabWidth: 2 })
  }

  if (lang.parser === 'css' || lang.parser === 'scss') {
    const postcss = await import('prettier/plugins/postcss')
    return prettier.format(code, { parser: lang.parser, plugins: [postcss], tabWidth: 2 })
  }

  if (lang.parser === 'json') {
    return JSON.stringify(JSON.parse(code), null, 2)
  }

  if (lang.parser === 'yaml') {
    const yaml = await import('prettier/plugins/yaml')
    return prettier.format(code, { parser: 'yaml', plugins: [yaml] })
  }

  if (lang.parser === 'markdown') {
    const md = await import('prettier/plugins/markdown')
    return prettier.format(code, { parser: 'markdown', plugins: [md] })
  }

  if (lang.parser === 'graphql') {
    const gql = await import('prettier/plugins/graphql')
    return prettier.format(code, { parser: 'graphql', plugins: [gql] })
  }

  return code
}

interface CodeEditorProps {
  value: string
  language: string
  onChange: (code: string) => void
  onLanguageChange: (lang: string) => void
}

export function CodeEditor({ value, language, onChange, onLanguageChange }: CodeEditorProps) {
  const [search, setSearch] = useState('')
  const [showLangPicker, setShowLangPicker] = useState(!language)
  const [isFormatting, setIsFormatting] = useState(false)
  const [formatError, setFormatError] = useState<string | null>(null)
  const hasAiFormatCode = useFeatureFlag('ai-format-code')

  const selected = LANGUAGES.find(l => l.id === language) ?? null
  const filtered = LANGUAGES.filter(l =>
    l.label.toLowerCase().includes(search.toLowerCase()) ||
    l.id.toLowerCase().includes(search.toLowerCase())
  )

  const handleSelectLanguage = (lang: Language) => {
    if (lang.id === language) {
      onLanguageChange('')
      setShowLangPicker(true)
      setSearch('')
      return
    }
    onLanguageChange(lang.id)
    setShowLangPicker(false)
    setSearch('')
  }

  const handleClearLanguage = () => {
    onLanguageChange('')
    onChange('')
    setShowLangPicker(true)
    setSearch('')
  }

  const handleFormat = async () => {
    if (!selected || !value.trim()) return
    setIsFormatting(true)
    setFormatError(null)
    try {
      let formatted: string
      if (selected.parser) {
        formatted = await formatWithPrettier(value, selected)
      } else {
        if (!hasAiFormatCode) {
          setFormatError('AI code formatting is not available — contact your admin')
          return
        }
        formatted = await formatCodeApi(value, selected.label)
      }
      onChange(formatted)
    } catch {
      setFormatError('Could not format — check for syntax errors')
    } finally {
      setIsFormatting(false)
    }
  }

  const canFormat = selected != null && value.trim().length > 0 && (selected.parser !== null || hasAiFormatCode)

  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border-h)] rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--border-h)]">
        <div className="flex items-center gap-2">
          <Code2 size={14} className="text-[var(--accent)]" />
          <span className="font-mono text-[10px] font-bold text-[var(--t1)] tracking-[0.08em]">CODE_SNIPPET</span>
        </div>
        <div className="flex items-center gap-2">
          {/* Format button — only visible when ff is on */}
          {hasAiFormatCode && (
            <button
              onClick={handleFormat}
              disabled={!canFormat || isFormatting}
              title={!selected ? 'Select a language first' : selected.parser ? 'Format with Prettier' : 'Format with AI (Groq)'}
              className={`flex items-center gap-1.5 font-mono text-[10px] font-bold px-3 py-1.5 rounded-lg border transition-all ${
                canFormat && !isFormatting
                  ? 'border-[rgba(59,130,246,0.6)] bg-[rgba(59,130,246,0.22)] text-[var(--accent)] shadow-[0_0_10px_rgba(59,130,246,0.18)] hover:border-[var(--accent)] hover:shadow-[0_0_14px_rgba(59,130,246,0.25)]'
                  : 'border-[rgba(59,130,246,0.2)] bg-[rgba(59,130,246,0.03)] text-[var(--t2)] cursor-not-allowed opacity-50'
              }`}
            >
              <Wand2 size={11} />
              {isFormatting ? 'FORMATTING...' : 'FORMAT'}
            </button>
          )}
          {/* Language selector button */}
          <div className="flex items-center gap-0.5">
            <button
              onClick={() => setShowLangPicker(v => !v)}
              className={`flex items-center gap-1.5 font-mono text-[10px] font-bold px-3 py-1.5 rounded-l-lg border transition-all ${
                selected
                  ? 'border-[var(--accent)] text-[var(--accent)] bg-[var(--accent-d)] shadow-[0_0_10px_rgba(59,130,246,0.15)]'
                  : 'border-[rgba(59,130,246,0.2)] bg-[rgba(59,130,246,0.03)] text-[var(--t1)] hover:border-[rgba(59,130,246,0.45)] hover:bg-[rgba(59,130,246,0.07)] hover:text-[var(--accent)]'
              }`}
            >
              {selected ? selected.id : 'SELECT LANG'}
              <ChevronDown size={10} className={`transition-transform ${showLangPicker ? 'rotate-180' : ''}`} />
            </button>
            {selected && (
              <button
                onClick={handleClearLanguage}
                title="Clear language"
                className="flex items-center justify-center px-2 py-1.5 rounded-r-lg border border-l-0 border-[var(--accent)] bg-[var(--accent-d)] text-[var(--accent)] hover:bg-[rgba(59,130,246,0.2)] transition-all"
              >
                <X size={10} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Language picker */}
      {showLangPicker && (
        <div className="border-b border-[var(--border-h)] bg-[var(--bg-el)]">
          <div className="px-3 py-2.5 flex items-center gap-2 border-b border-[var(--border-h)]">
            <Search size={13} className="text-[var(--t2)] flex-shrink-0" />
            <input
              autoFocus
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search language..."
              className="flex-1 bg-transparent font-mono text-xs text-[var(--t1)] outline-none placeholder:text-[var(--t2)]"
            />
          </div>
          <div className="flex flex-wrap gap-1.5 p-3 max-h-44 overflow-y-auto scrollbar-thin scrollbar-thumb-[var(--border-m)]">
            {filtered.map(lang => (
              <button
                key={lang.id}
                onClick={() => handleSelectLanguage(lang)}
                className={`flex items-center gap-1.5 font-mono text-[10px] px-3 py-1.5 rounded-lg border transition-all ${
                  lang.id === language
                    ? 'border-[var(--accent)] bg-[var(--accent-d)] text-[var(--accent)] shadow-[0_0_10px_rgba(59,130,246,0.15)]'
                    : 'border-[rgba(59,130,246,0.2)] bg-[rgba(59,130,246,0.03)] text-[var(--t1)] hover:border-[rgba(59,130,246,0.45)] hover:bg-[rgba(59,130,246,0.07)] hover:text-[var(--accent)]'
                }`}
              >
                <span className="text-[10px] text-[var(--t2)] font-bold">{lang.id}</span>
                <span>{lang.label}</span>
                {lang.parser
                  ? <span className="text-[10px] text-[var(--green)]">✦</span>
                  : hasAiFormatCode
                    ? <span className="text-[10px] text-[var(--accent)]">⚡</span>
                    : null
                }
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Code textarea */}
      <div className="relative">
        {!selected && (
          <div className="absolute inset-0 bg-[var(--bg-card)]/80 backdrop-blur-[1px] flex items-center justify-center z-10 rounded-b-xl">
            <span className="font-mono text-[10px] font-bold text-[var(--t1)] tracking-[0.05em]">SELECT A LANGUAGE TO ADD A CODE SNIPPET</span>
          </div>
        )}
        <div className="flex px-4 py-3 gap-3">
          <div className="flex flex-col gap-1 select-none pt-px">
            {(value || ' ').split('\n').map((_, i) => (
              <span key={i} className="font-mono text-[10px] text-[var(--t3)] leading-relaxed w-6 text-right">
                {String(i + 1).padStart(2, '0')}
              </span>
            ))}
          </div>
          <textarea
            value={value}
            onChange={e => onChange(e.target.value)}
            placeholder={selected ? `// ${selected.label} code here` : ''}
            disabled={!selected}
            rows={Math.max(4, value.split('\n').length)}
            className="flex-1 bg-transparent font-mono text-xs text-[var(--t1)] outline-none resize-none leading-relaxed disabled:cursor-not-allowed placeholder:text-[var(--t2)]"
          />
        </div>
      </div>

      {/* Format error */}
      {formatError && (
        <div className="px-4 py-2 border-t border-[var(--border-h)] font-mono text-xs text-[var(--red)]">
          {formatError}
        </div>
      )}
    </div>
  )
}
