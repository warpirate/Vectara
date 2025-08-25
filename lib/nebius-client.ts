// Nebius API client for multi-agent wireframe generation
interface NebiusMessage {
  role: "system" | "user" | "assistant"
  content: string
}

interface NebiusResponse {
  choices: Array<{
    message: {
      content: string
      refusal?: string
    }
  }>
}

interface JSONSchema {
  type: string
  properties?: Record<string, any>
  required?: string[]
  items?: JSONSchema
  enum?: string[]
  [key: string]: any
}

class NebiusClient {
  private baseUrl = "https://api.studio.nebius.com/v1/"
  private apiKey: string

  constructor(apiKey: string) {
    this.apiKey = apiKey
  }

  async createCompletion(
    model: string,
    messages: NebiusMessage[],
    options: {
      maxTokens?: number
      temperature?: number
      topP?: number
      timeoutMs?: number
      retry?: number
      responseFormat?: "json_object" | "text"
      guidedJson?: JSONSchema
    } = {},
  ): Promise<string> {
    const {
      maxTokens = 512,
      temperature = 0.3,
      topP = 0.95,
      timeoutMs = 30000,
      retry = 1,
      responseFormat = "text",
      guidedJson,
    } = options

    const doFetch = async () => {
      const controller = new AbortController()
      const timeout = setTimeout(() => {
        console.warn(`Request timeout after ${timeoutMs}ms, aborting...`)
        controller.abort()
      }, timeoutMs)
      
      try {
        const response = await fetch(`${this.baseUrl}chat/completions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.apiKey}`,
          },
          body: JSON.stringify({
            model,
            messages,
            max_tokens: maxTokens,
            temperature,
            top_p: topP,
            ...(guidedJson && {
              extra_body: { guided_json: guidedJson }
            }),
            ...(responseFormat === "json_object" && !guidedJson && {
              response_format: { type: "json_object" }
            }),
          }),
          signal: controller.signal,
        })
        clearTimeout(timeout)
        return response
      } finally {
        clearTimeout(timeout)
      }
    }

    let attempt = 0
    let lastError: any = null
    while (attempt <= retry) {
      try {
        const response = await doFetch()
        if (!response.ok) {
          const status = response.status
          const text = await response.text().catch(() => response.statusText)
          if ((status === 429 || status >= 500) && attempt < retry) {
            await new Promise((r) => setTimeout(r, 500 * (attempt + 1)))
            attempt++
            continue
          }
          throw new Error(`Nebius API error: ${status} ${text}`)
        }

        const data: NebiusResponse = await response.json()
        const choice = data.choices[0]
        
        // Handle refusal (safety/policy violations)
        if (choice?.message?.refusal) {
          throw new Error(`Content refusal: ${choice.message.refusal}`)
        }
        
        return choice?.message?.content || ""
      } catch (err) {
        lastError = err
        if (attempt < retry) {
          await new Promise((r) => setTimeout(r, 500 * (attempt + 1)))
          attempt++
          continue
        }
        throw err
      }
    }

    // Should not reach here
    throw lastError || new Error("Nebius client error")
  }
}

// Agent models configuration - Using faster Qwen models for better performance
export const AGENT_MODELS = {
  CONVERSATION: "Qwen/Qwen3-Coder-480B-A35B-Instruct", // Faster reasoning model
  SITEMAP: "Qwen/Qwen3-Coder-480B-A35B-Instruct", // Best for structured generation
  LAYOUT_GENERATOR: "Qwen/Qwen3-Coder-480B-A35B-Instruct", // Optimized for JSON
  CRITIQUE: "Qwen/Qwen2.5-72B-Instruct", // Good analysis, faster
  CODE_EXPORT: "Qwen/Qwen3-Coder-480B-A35B-Instruct", // Best for code generation
  VISUAL_CREATIVE: "black-forest-labs/FLUX.1-dev",
  VISUAL_POLISHED: "stability-ai/sdxl",
  VISION: "Qwen/Qwen2-VL-72B-Instruct",
  GUARDRAIL: "meta-llama/Meta-Llama-3.1-8B-Instruct",
} as const

export { NebiusClient }
export type { NebiusMessage }
