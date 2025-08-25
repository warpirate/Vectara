import { BaseAgent } from "./base-agent"
import type { NebiusMessage } from "../nebius-client"
import { parseJsonFromText } from "../utils"

export interface ConversationInput {
  messages: Array<{ role: "user" | "assistant"; content: string }>
  context?: {
    phase: "chatting" | "ready-to-generate" | "generating"
    previousRequirements?: any[]
  }
}

export interface ConversationOutput {
  response: string
  readyToGenerate: boolean
  requirements?: {
    screenType: string
    components: string[]
    layout: string
    interactions: string[]
    accessibility: string[]
    responsive: boolean
    complexity: string
    style: string
  }
  confidence?: number
  suggestions?: string[]
}

export class ConversationAgent extends BaseAgent {
  async process(input: ConversationInput): Promise<ConversationOutput> {
    const systemPrompt = `You are an enthusiastic, expert UX consultant and wireframe specialist who loves helping users create amazing wireframes through natural conversation.

Your personality:
- Friendly, encouraging, and genuinely excited about their project
- Ask thoughtful questions that show you understand UX/design
- Provide specific, actionable suggestions
- Share brief insights about best practices when relevant

Your conversation flow:
1. UNDERSTAND their project (what they're building, who it's for)
2. EXPLORE their needs (key features, user goals, constraints)
3. REFINE the details (style, layout, specific components)
4. CONFIRM and offer to generate

CHATTING PHASE - Ask engaging questions like:
- "What's the main goal users will accomplish on this screen?"
- "Who's your target audience? That'll help me suggest the right approach."
- "Are there any apps or websites with designs you really like?"
- "What's the most important action you want users to take?"

READY TO GENERATE - You're ready when you know:
- Screen type (login, dashboard, landing, etc.)
- Key components and their purpose
- Target users and their needs
- Basic style direction
- Device/responsive requirements

When ready, say: "I've got a clear picture of what you need! [brief summary of their requirements]. Ready for me to create your wireframe?"

RESPONSE STYLE:
- Conversational and warm (use "you", "your", "we")
- 2-3 sentences max per response
- Ask 1-2 specific questions, not lists
- Show genuine interest in their project
- Provide helpful suggestions when appropriate

WHEN ASKED "WHAT CAN YOU DO?":
- Briefly list capabilities you can execute now in this app:
  • Generate editable wireframes
  • Make targeted AI edits (component/text/layout/style)
  • Critique for accessibility/usability
  • Export code (React/HTML/Vue/Svelte) with notes
  • Create visual previews (sketch/polished)
  • Generate multi-page sitemaps and optionally batch per-page wireframes
  • Manage a reusable blocks library (components/sections)
  • Preview responsive breakpoints (mobile/tablet/desktop)
  • Export parity with Figma/Webflow/Framer (Figma plugin export supported)
- Then immediately suggest a next action relevant to their context.
- Do not imply you only make wireframes.

CAPABILITIES (mention them naturally when helpful):
- Generate an editable wireframe from our chat when we have enough detail
- Generate a multi-page sitemap and optionally create wireframes per page
- Make targeted AI edits: component-only, text-only, layout-only, or style-only
- Use and manage reusable blocks (components/sections)
- Critique a wireframe for accessibility and usability issues
- Export production-oriented code (React TSX/JS, HTML/CSS, Vue, Svelte) with notes/docs
- Create visual previews (sketch or polished) to communicate look-and-feel
- Show responsive breakpoint previews (mobile/tablet/desktop) and provide Figma/Webflow/Framer export guidance (Figma plugin export supported)

WHEN TO OFFER ACTIONS:
- If requirements feel clear → Offer to generate the wireframe
- If the user asks for changes → Offer a targeted AI edit and name the edit mode
- If they want a review → Offer an accessibility/usability critique
- If they’re ready to build → Offer code export and suggest a format
- If they want a quick visual → Offer a visual preview (e.g., polished, light)

AVOID:
- Generic responses like "I can't help with that"
- Robotic or formal language
- Overwhelming question lists
- Vague or unhelpful responses`

    const latestMessage = input.messages[input.messages.length - 1]
    const conversationHistory = input.messages
      .slice(-6)
      .map((m) => `${m.role}: ${m.content}`)
      .join("\n")

    const messages: NebiusMessage[] = [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: `Conversation context:\n${conversationHistory}\n\nLatest user message: "${latestMessage.content}"\n\nCurrent phase: ${input.context?.phase || "chatting"}\n\nRespond naturally as the AI wireframe assistant. Be helpful and engaging!`,
      },
    ]

    let response: string
    try {
      response = await this.callModel(messages, {
        temperature: 0.9, // Increased temperature for more natural responses
        maxTokens: 256, // Reduced for more concise responses
        timeoutMs: 35000,
        retry: 1,
      })
    } catch (err) {
      console.error("ConversationAgent: model call failed, returning fallback conversation.", err)
      return {
        response: "I've got a clear picture of what you need! Ready for me to create your wireframe?",
        readyToGenerate: true,
        requirements: {
          screenType: "general",
          components: ["container", "text", "button"],
          layout: "vertical",
          interactions: ["click"],
          accessibility: ["screen-reader", "keyboard-nav"],
          responsive: true,
          complexity: "medium",
          style: "modern",
        },
        confidence: 0.5,
      }
    }

    const r = response.toLowerCase()
    const readyToGenerate =
      r.includes("ready for me to create") ||
      r.includes("ready to create") ||
      r.includes("generate your wireframe") ||
      r.includes("create your wireframe") ||
      (r.includes("clear picture") && r.includes("ready")) ||
      // Broader phrasing coverage to ensure the button appears
      r.includes("i'll create") ||
      r.includes("i will create") ||
      r.includes("i'll generate") ||
      r.includes("i will generate") ||
      r.includes("generating your wireframe") ||
      r.includes("let me create") ||
      r.includes("let me generate") ||
      r.includes("ready to craft your wireframe") ||
      r.includes("let's create your wireframe") ||
      r.includes("shall i generate") ||
      r.includes("want me to create")

    let requirements = undefined
    if (readyToGenerate) {
      requirements = await this.extractRequirements(conversationHistory)
    }

    return {
      response,
      readyToGenerate,
      requirements,
      confidence: readyToGenerate ? 0.8 : undefined,
    }
  }

  private async extractRequirements(conversationHistory: string) {
    const systemPrompt = `Extract wireframe requirements from this conversation following the provided JSON schema.`

    const requirementsSchema = {
      type: "object",
      properties: {
        screenType: {
          type: "string",
          enum: ["login", "dashboard", "landing", "form", "list", "detail", "navigation", "other"]
        },
        components: {
          type: "array",
          items: { type: "string" }
        },
        layout: {
          type: "string",
          enum: ["vertical", "horizontal", "grid", "sidebar", "tabs", "modal"]
        },
        interactions: {
          type: "array",
          items: {
            type: "string",
            enum: ["click", "hover", "scroll", "drag", "form-submit", "navigation"]
          }
        },
        accessibility: {
          type: "array",
          items: {
            type: "string",
            enum: ["screen-reader", "keyboard-nav", "high-contrast", "focus-indicators"]
          }
        },
        responsive: { type: "boolean" },
        complexity: {
          type: "string",
          enum: ["simple", "medium", "complex"]
        },
        style: {
          type: "string",
          enum: ["modern", "minimal", "classic", "mobile-first"]
        }
      },
      required: ["screenType", "components", "layout", "interactions", "accessibility", "responsive", "complexity", "style"]
    }

    const messages: NebiusMessage[] = [
      { role: "system", content: systemPrompt },
      { role: "user", content: conversationHistory },
    ]

    try {
      const response = await this.callModel(messages, {
        temperature: 0.3,
        maxTokens: 512,
        timeoutMs: 35000,
        retry: 1,
        responseFormat: "json_object",
      })

      let parsed: any
      try {
        parsed = parseJsonFromText(response)
      } catch (parseError) {
        console.warn("JSON parsing failed in extractRequirements, using fallback", parseError)
        // Return safe defaults if JSON parsing fails
        return {
          screenType: "general",
          components: ["container", "text", "button"],
          layout: "vertical",
          interactions: ["click"],
          accessibility: ["screen-reader", "keyboard-nav"],
          responsive: true,
          complexity: "medium",
          style: "modern",
        }
      }
      
      return {
        screenType: parsed.screenType || "general",
        components: parsed.components || ["container", "text", "button"],
        layout: parsed.layout || "vertical",
        interactions: parsed.interactions || ["click"],
        accessibility: parsed.accessibility || ["screen-reader", "keyboard-nav"],
        responsive: parsed.responsive ?? true,
        complexity: parsed.complexity || "medium",
        style: parsed.style || "modern",
      }
    } catch (error) {
      console.error("Failed to extract requirements:", error)
      return {
        screenType: "general",
        components: ["container", "text", "button"],
        layout: "vertical",
        interactions: ["click"],
        accessibility: ["screen-reader", "keyboard-nav"],
        responsive: true,
        complexity: "medium",
        style: "modern",
      }
    }
  }
}
