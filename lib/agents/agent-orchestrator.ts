import { NebiusClient, AGENT_MODELS } from "../nebius-client"
import { ConversationAgent, type ConversationInput } from "./conversation-agent"
import { LayoutGeneratorAgent, type LayoutInput, type LayoutOutput, type ConversationLayoutOutput, type EditLayoutOutput } from "./layout-generator-agent"
import { CritiqueAgent, type CritiqueInput } from "./critique-agent"
import { CodeExportAgent, type CodeExportInput } from "./code-export-agent"
import { VisualRendererAgent, type VisualRenderInput } from "./visual-renderer-agent"
import { VisionAgent, type VisionInput } from "./vision-agent"
import { GuardrailAgent, type GuardrailInput } from "./guardrail-agent"
import { EditAgent, type EditInput } from "./edit-agent"
import { SitemapGeneratorAgent, type SitemapOutput } from "./sitemap-generator-agent"

export class AgentOrchestrator {
  private client: NebiusClient
  private conversationAgent: ConversationAgent
  private layoutAgent: LayoutGeneratorAgent
  private critiqueAgent: CritiqueAgent
  private codeExportAgent: CodeExportAgent
  private visualRendererAgent: VisualRendererAgent
  private visionAgent: VisionAgent
  private guardrailAgent: GuardrailAgent
  private editAgent: EditAgent
  private sitemapAgent: SitemapGeneratorAgent

  constructor(apiKey: string) {
    this.client = new NebiusClient(apiKey)
    this.conversationAgent = new ConversationAgent(this.client, AGENT_MODELS.CONVERSATION)
    this.layoutAgent = new LayoutGeneratorAgent(this.client, AGENT_MODELS.LAYOUT_GENERATOR)
    this.critiqueAgent = new CritiqueAgent(this.client, AGENT_MODELS.CRITIQUE)
    this.codeExportAgent = new CodeExportAgent(this.client, AGENT_MODELS.CODE_EXPORT)
    this.visualRendererAgent = new VisualRendererAgent(this.client, AGENT_MODELS.VISUAL_CREATIVE)
    this.visionAgent = new VisionAgent(this.client, AGENT_MODELS.VISION)
    this.guardrailAgent = new GuardrailAgent(this.client, AGENT_MODELS.GUARDRAIL)
    this.editAgent = new EditAgent(this.client, AGENT_MODELS.LAYOUT_GENERATOR) // Reuse layout model for editing
    this.sitemapAgent = new SitemapGeneratorAgent(this.client, AGENT_MODELS.SITEMAP)
  }

  async generateSitemap(
    prompt: string,
    options?: { batchGenerate?: boolean; pageTypesHint?: string[] },
  ): Promise<SitemapOutput> {
    // Safety check first
    const safetyCheck = await this.checkSafety(prompt, "general")
    if (!safetyCheck.isSafe) {
      const issues = safetyCheck.issues || []
      throw new Error(`Content safety violation: ${issues.map((i) => i.description).join(", ")}`)
    }

    const sitemap = await this.sitemapAgent.process({
      prompt: safetyCheck.sanitizedInput || prompt,
      options,
    })

    return sitemap
  }

  async generateWireframe(userPrompt: string, context?: string, options?: any): Promise<ConversationLayoutOutput> {
    // Step 1: Safety check
    const safetyCheck = await this.checkSafety(userPrompt, "general", context)
    if (!safetyCheck.isSafe) {
      const issues = safetyCheck.issues || []
      throw new Error(`Content safety violation: ${issues.map((i) => i.description).join(", ")}`)
    }

    // Step 2: Build a messages array from the provided conversation history string
    const history = (safetyCheck.sanitizedInput || userPrompt).split("\n").map((line) => line.trim()).filter(Boolean)
    const parsedMessages = history.map((line) => {
      const idx = line.indexOf(":")
      const roleToken = idx > -1 ? line.slice(0, idx).trim().toLowerCase() : "user"
      const content = idx > -1 ? line.slice(idx + 1).trim() : line
      type Role = "user" | "assistant"
      const role: Role = roleToken === "assistant" ? "assistant" : "user"
      return { role, content } as ConversationInput["messages"][number]
    })

    // Ensure we have at least one user message
    const messages: ConversationInput["messages"] =
      parsedMessages.length > 0
        ? (parsedMessages as ConversationInput["messages"]) 
        : ([{ role: "user", content: safetyCheck.sanitizedInput || userPrompt }] as ConversationInput["messages"])

    const conversationOutput = await this.conversationAgent.process({
      messages,
      context: { phase: "ready-to-generate" },
    })

    // Step 3: Prepare refined prompt and requirements (with safe fallbacks)
    const latestUser = [...messages].reverse().find((m) => m.role === "user")
    const refinedPrompt = latestUser?.content || (safetyCheck.sanitizedInput || userPrompt)

    const requirements =
      conversationOutput.requirements || {
        screenType: "general",
        components: ["container", "text", "button"],
        layout: "vertical",
        interactions: ["click"],
        accessibility: ["screen-reader", "keyboard-nav"],
        responsive: true,
        complexity: "medium",
      }

    const layoutInput: LayoutInput = {
      refinedPrompt,
      requirements,
    }

    const layoutOutput = await this.layoutAgent.process(layoutInput)

    // Step 4: Add conversation metadata to the result
    const result: ConversationLayoutOutput = {
      ...layoutOutput,
      conversationData: {
        originalPrompt: userPrompt,
        refinedPrompt,
        confidence: conversationOutput.confidence,
        suggestions: conversationOutput.suggestions,
      },
    }
    return result
  }

  async editWireframe(
    currentWireframe: LayoutOutput,
    editPrompt: string,
    options?: {
      componentId?: string
      editMode?: "full" | "component" | "text-only" | "layout-only" | "style-only"
      preserveLayout?: boolean
      targetComponent?: string
    },
  ): Promise<EditLayoutOutput> {
    const editOptions = {
      componentId: options?.componentId,
      editMode: options?.editMode || "full",
      preserveLayout: options?.preserveLayout || false,
      targetComponent: options?.targetComponent || options?.componentId,
    }

    // Safety check for edit prompt
    const safetyCheck = await this.checkSafety(editPrompt, "general")
    if (!safetyCheck.isSafe) {
      const issues = safetyCheck.issues || []
      throw new Error(`Content safety violation: ${issues.map((i) => i.description).join(", ")}`)
    }

    if (editOptions.editMode === "full") {
      // Full regeneration with context
      const context = `Current wireframe: ${JSON.stringify(currentWireframe.wireframe)}`
      return await this.generateWireframe(editPrompt, context)
    } else {
      // Targeted editing using EditAgent
      const editInput: EditInput = {
        currentWireframe,
        editPrompt: safetyCheck.sanitizedInput || editPrompt,
        options: editOptions,
      }

      const editResult = await this.editAgent.process(editInput)

      const result: EditLayoutOutput = {
        wireframe: editResult.wireframe,
        editData: {
          changes: editResult.changes,
          confidence: editResult.confidence,
          suggestions: editResult.suggestions,
          editMode: editOptions.editMode,
          targetComponent: editOptions.targetComponent,
        },
      }
      return result
    }
  }

  async critiqueWireframe(wireframe: LayoutOutput, focusAreas?: string[]) {
    const input: CritiqueInput = {
      wireframe: wireframe.wireframe,
      focusAreas,
    }
    return await this.critiqueAgent.process(input)
  }

  async exportCode(
    wireframe: LayoutOutput,
    format: "react-tsx" | "react-js" | "html-css" | "figma-plugin" | "vue" | "svelte",
    framework?: "nextjs" | "react" | "vanilla" | "vite" | "nuxt" | "sveltekit",
    styling?: "tailwind" | "css-modules" | "styled-components" | "css" | "scss" | "emotion",
    options?: {
      includeTests?: boolean
      includeStorybook?: boolean
      includeDocumentation?: boolean
      optimizeForProduction?: boolean
      includeAnimations?: boolean
    },
  ) {
    const input: CodeExportInput = {
      wireframe: wireframe.wireframe,
      exportFormat: format,
      framework,
      styling,
      options,
    }
    return await this.codeExportAgent.process(input)
  }

  async renderVisual(
    wireframe: LayoutOutput,
    style: "sketch" | "polished" | "high-fidelity",
    colorScheme?: "light" | "dark" | "auto",
    brandColors?: string[],
  ) {
    const input: VisualRenderInput = {
      wireframe: wireframe.wireframe,
      style,
      colorScheme,
      brandColors,
    }
    return await this.visualRendererAgent.process(input)
  }

  async analyzeImage(
    imageUrl: string,
    analysisType: "wireframe-extraction" | "ui-analysis" | "component-identification",
    context?: string,
  ) {
    const input: VisionInput = {
      imageUrl,
      analysisType,
      context,
    }
    return await this.visionAgent.process(input)
  }

  async checkSafety(
    userInput: string,
    checkType: "content-safety" | "prompt-injection" | "data-privacy" | "general",
    context?: string,
  ) {
    const input: GuardrailInput = {
      userInput,
      context,
      checkType,
    }
    return await this.guardrailAgent.process(input)
  }
}
