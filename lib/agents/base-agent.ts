import { NebiusClient } from "../nebius-client"
import type { NebiusMessage } from "../nebius-client"

interface JSONSchema {
  type: string
  properties?: Record<string, any>
  required?: string[]
  items?: JSONSchema
  enum?: string[]
  [key: string]: any
}

export abstract class BaseAgent {
  protected client: NebiusClient
  protected model: string

  constructor(client?: NebiusClient, model?: string) {
    this.client = client || new NebiusClient("")
    this.model = model || "deepseek-ai/DeepSeek-V3-0324-fast"
  }

  setApiKey(apiKey: string): void {
    this.client = new NebiusClient(apiKey)
  }

  protected async callModel(
    messages: NebiusMessage[],
    options?: {
      model?: string
      maxTokens?: number
      temperature?: number
      topP?: number
      timeoutMs?: number
      retry?: number
      responseFormat?: "json_object" | "text"
      guidedJson?: JSONSchema
    },
  ): Promise<string> {
    const modelToUse = options?.model || this.model
    return await this.client.createCompletion(modelToUse, messages, options)
  }

  abstract process(input: any): Promise<any>
}
