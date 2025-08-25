import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Attempts to parse JSON from a model response that might include code fences or extra prose.
// Strategy:
// 1) If a ```json fenced block exists, parse its inner content.
// 2) Otherwise, trim and slice from the first '{' or '[' to the last '}' or ']' and parse.
// Throws if parsing ultimately fails.
export function parseJsonFromText(text: string): any {
  if (!text || typeof text !== "string") {
    throw new Error("parseJsonFromText: input is empty or not a string")
  }

  // Prefer a fenced code block
  const fenceRegex = /```\s*(json)?\s*([\s\S]*?)\s*```/i
  const fenceMatch = text.match(fenceRegex)
  const candidate = fenceMatch ? fenceMatch[2] : text

  // Remove leading prose before JSON start
  let trimmed = candidate.trim()
  const firstBrace = trimmed.indexOf("{")
  const firstBracket = trimmed.indexOf("[")
  const firstStart = [firstBrace, firstBracket].filter((i) => i >= 0).sort((a, b) => a - b)[0]
  if (firstStart !== undefined) {
    trimmed = trimmed.slice(firstStart)
  }

  // Cut at the last likely JSON end
  const lastCurly = trimmed.lastIndexOf("}")
  const lastSquare = trimmed.lastIndexOf("]")
  const lastEnd = Math.max(lastCurly, lastSquare)
  if (lastEnd >= 0) {
    trimmed = trimmed.slice(0, lastEnd + 1)
  }

  try {
    return JSON.parse(trimmed)
  } catch (error) {
    // Try to fix common JSON issues
    let fixed = trimmed
      .replace(/,\s*([}\]])/g, '$1') // Remove trailing commas
      .replace(/([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*):/g, '$1"$2":') // Quote unquoted keys
      .replace(/:\s*([a-zA-Z_][a-zA-Z0-9_]*)(\s*[,}\]])/g, ':"$1"$2') // Quote unquoted string values
    
    try {
      return JSON.parse(fixed)
    } catch (secondError) {
      // If still failing, try to truncate to last valid object/array
      let depth = 0
      let lastValidEnd = -1
      
      for (let i = 0; i < trimmed.length; i++) {
        const char = trimmed[i]
        if (char === '{' || char === '[') depth++
        else if (char === '}' || char === ']') {
          depth--
          if (depth === 0) lastValidEnd = i
        }
      }
      
      if (lastValidEnd > 0) {
        try {
          return JSON.parse(trimmed.slice(0, lastValidEnd + 1))
        } catch {}
      }
      
      throw new Error(`JSON parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }
}
