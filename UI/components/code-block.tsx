"use client"

import { useState } from 'react'

interface CodeBlockProps {
  code: string
  language: string
  filename?: string
  showLineNumbers?: boolean
  maxHeight?: string
}

export function CodeBlock({ 
  code, 
  language, 
  filename,
  showLineNumbers = true,
  maxHeight = '300px'
}: CodeBlockProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const lines = code.split('\n')

  return (
    <div className="bg-[var(--code-bg)] border border-white/5 rounded-lg overflow-hidden shadow-[0_4px_24px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.03)]">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-white/5 bg-gradient-to-r from-white/[0.02] to-white/[0.01]">
        <div className="flex gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-[#ff5f57]" />
          <div className="w-2.5 h-2.5 rounded-full bg-[#febc2e]" />
          <div className="w-2.5 h-2.5 rounded-full bg-[#28c840]" />
        </div>
        {filename && (
          <span className="font-mono text-[10px] text-[var(--t2)] flex-1 truncate">{filename}</span>
        )}
        <span className="font-mono text-[8px] text-[var(--cyan)] bg-[rgba(34,211,238,0.08)] border border-[rgba(34,211,238,0.18)] px-2 py-0.5 rounded-sm tracking-wider uppercase">
          {language}
        </span>
        <button
          onClick={handleCopy}
          className="font-mono text-[8px] text-[var(--t2)] hover:text-[var(--accent)] transition-colors px-2 py-0.5 rounded hover:bg-white/5"
        >
          {copied ? 'COPIED!' : 'COPY'}
        </button>
      </div>
      
      {/* Code content */}
      <div 
        className="overflow-auto scrollbar-thin scrollbar-thumb-[var(--border-m)]"
        style={{ maxHeight }}
      >
        <pre className="px-4 py-3 font-mono text-[11px] leading-relaxed">
          <code className="block">
            {lines.map((line, i) => (
              <div key={i} className="flex">
                {showLineNumbers && (
                  <span className="select-none text-[var(--t3)] w-8 shrink-0 pr-4 text-right">
                    {i + 1}
                  </span>
                )}
                <span className="text-[var(--t2)] flex-1 whitespace-pre">{highlightSyntax(line, language)}</span>
              </div>
            ))}
          </code>
        </pre>
      </div>
    </div>
  )
}

// Basic syntax highlighting - you can enhance this or use a library like Prism/Shiki
function highlightSyntax(line: string, language: string): React.ReactNode {
  // Keywords for different languages
  const keywords: Record<string, string[]> = {
    typescript: ['const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while', 'import', 'export', 'from', 'async', 'await', 'interface', 'type', 'extends', 'implements', 'class', 'new', 'this', 'super', 'default', 'null', 'undefined', 'true', 'false', 'try', 'catch', 'throw'],
    javascript: ['const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while', 'import', 'export', 'from', 'async', 'await', 'class', 'new', 'this', 'super', 'default', 'null', 'undefined', 'true', 'false', 'try', 'catch', 'throw'],
    python: ['def', 'return', 'if', 'else', 'elif', 'for', 'while', 'import', 'from', 'class', 'self', 'None', 'True', 'False', 'try', 'except', 'with', 'as', 'lambda', 'pass', 'break', 'continue', 'and', 'or', 'not', 'in', 'is', 'async', 'await'],
    go: ['func', 'return', 'if', 'else', 'for', 'range', 'import', 'package', 'type', 'struct', 'interface', 'var', 'const', 'nil', 'true', 'false', 'defer', 'go', 'chan', 'select', 'case', 'default', 'switch', 'break', 'continue'],
    rust: ['fn', 'let', 'mut', 'const', 'return', 'if', 'else', 'for', 'while', 'loop', 'match', 'use', 'mod', 'pub', 'struct', 'enum', 'impl', 'trait', 'self', 'Self', 'true', 'false', 'None', 'Some', 'Ok', 'Err', 'async', 'await', 'move'],
    java: ['public', 'private', 'protected', 'class', 'interface', 'extends', 'implements', 'static', 'final', 'void', 'return', 'if', 'else', 'for', 'while', 'new', 'this', 'super', 'null', 'true', 'false', 'try', 'catch', 'throw', 'throws', 'import', 'package'],
    sql: ['SELECT', 'FROM', 'WHERE', 'INSERT', 'UPDATE', 'DELETE', 'CREATE', 'DROP', 'ALTER', 'TABLE', 'INDEX', 'JOIN', 'LEFT', 'RIGHT', 'INNER', 'OUTER', 'ON', 'AND', 'OR', 'NOT', 'NULL', 'PRIMARY', 'KEY', 'FOREIGN', 'REFERENCES', 'ORDER', 'BY', 'GROUP', 'HAVING', 'LIMIT', 'OFFSET', 'AS', 'INTO', 'VALUES', 'SET'],
    html: ['html', 'head', 'body', 'div', 'span', 'p', 'a', 'img', 'button', 'input', 'form', 'script', 'style', 'link', 'meta', 'title'],
    css: ['color', 'background', 'margin', 'padding', 'border', 'display', 'flex', 'grid', 'width', 'height', 'position', 'top', 'left', 'right', 'bottom', 'font', 'text'],
    bash: ['if', 'then', 'else', 'fi', 'for', 'do', 'done', 'while', 'case', 'esac', 'function', 'return', 'exit', 'echo', 'export', 'source', 'cd', 'ls', 'rm', 'cp', 'mv', 'mkdir', 'chmod', 'chown', 'grep', 'sed', 'awk', 'curl', 'wget'],
    yaml: ['true', 'false', 'null', 'yes', 'no'],
    json: ['true', 'false', 'null'],
  }

  const langKey = language.toLowerCase().replace(/\s+/g, '')
  const langKeywords = keywords[langKey] || keywords['typescript'] || []
  
  // Simple regex-based highlighting
  let result = line

  // Handle strings (both single and double quotes)
  const stringParts: Array<{ type: 'text' | 'string' | 'comment' | 'keyword' | 'number'; value: string }> = []
  let remaining = line
  let inString = false
  let stringChar = ''
  let currentText = ''

  for (let i = 0; i < remaining.length; i++) {
    const char = remaining[i]
    const prevChar = i > 0 ? remaining[i - 1] : ''

    // Check for comments
    if (!inString && (remaining.slice(i, i + 2) === '//' || remaining[i] === '#' && ['python', 'bash', 'yaml'].includes(langKey))) {
      if (currentText) {
        stringParts.push({ type: 'text', value: currentText })
        currentText = ''
      }
      stringParts.push({ type: 'comment', value: remaining.slice(i) })
      break
    }

    // Check for string start/end
    if ((char === '"' || char === "'" || char === '`') && prevChar !== '\\') {
      if (!inString) {
        if (currentText) {
          stringParts.push({ type: 'text', value: currentText })
          currentText = ''
        }
        inString = true
        stringChar = char
        currentText = char
      } else if (char === stringChar) {
        currentText += char
        stringParts.push({ type: 'string', value: currentText })
        currentText = ''
        inString = false
        stringChar = ''
      } else {
        currentText += char
      }
    } else {
      currentText += char
    }
  }

  if (currentText) {
    stringParts.push({ type: inString ? 'string' : 'text', value: currentText })
  }

  // Process text parts for keywords and numbers
  const processedParts: React.ReactNode[] = stringParts.map((part, idx) => {
    if (part.type === 'string') {
      return <span key={idx} className="text-[var(--green)]">{part.value}</span>
    }
    if (part.type === 'comment') {
      return <span key={idx} className="text-[var(--t3)] italic">{part.value}</span>
    }
    
    // Process text for keywords
    let text = part.value
    const words = text.split(/(\b|\s+|[(){}[\],;:.<>+=\-*/&|!?@#$%^~`\\])/)
    
    return words.map((word, wordIdx) => {
      if (langKeywords.includes(word)) {
        return <span key={`${idx}-${wordIdx}`} className="text-[var(--purple)]">{word}</span>
      }
      if (/^\d+\.?\d*$/.test(word)) {
        return <span key={`${idx}-${wordIdx}`} className="text-[var(--orange)]">{word}</span>
      }
      if (word.startsWith('@') || (langKey === 'typescript' && /^[A-Z][a-zA-Z]*$/.test(word))) {
        return <span key={`${idx}-${wordIdx}`} className="text-[var(--cyan)]">{word}</span>
      }
      return word
    })
  })

  return <>{processedParts}</>
}
