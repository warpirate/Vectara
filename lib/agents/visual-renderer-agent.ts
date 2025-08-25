import { BaseAgent } from "./base-agent"
import type { NebiusMessage } from "../nebius-client"
import type { WireframeComponent } from "./layout-generator-agent"

export interface VisualRenderInput {
  wireframe: {
    id: string
    title: string
    description: string
    components: WireframeComponent[]
    metadata: {
      screenType: string
      responsive: boolean
      accessibility: boolean
    }
  }
  style: "sketch" | "polished" | "high-fidelity"
  colorScheme?: "light" | "dark" | "auto"
  brandColors?: string[]
}

export interface VisualRenderOutput {
  imageUrl: string
  thumbnailUrl?: string
  metadata: {
    width: number
    height: number
    format: string
    style: string
  }
  prompt: string // The prompt used to generate the image
}

export class VisualRendererAgent extends BaseAgent {
  async process(input: VisualRenderInput): Promise<VisualRenderOutput> {
    const systemPrompt = `You are an expert UI designer that creates detailed prompts for image generation models.

Convert wireframe structures into detailed visual prompts for ${input.style} style mockups.

For sketch style: Focus on hand-drawn, low-fidelity wireframe aesthetics
For polished style: Clean, modern UI with proper spacing and typography  
For high-fidelity style: Pixel-perfect designs with realistic content and interactions

Include details about:
- Layout structure and component positioning
- Typography hierarchy and content
- Color scheme and visual styling
- Interactive elements and states
- Responsive considerations
- Accessibility features

Generate a comprehensive prompt that will produce an accurate visual representation.`

    const colorInfo = input.brandColors?.length
      ? `Brand colors: ${input.brandColors.join(", ")}`
      : `Color scheme: ${input.colorScheme || "light"}`

    const messages: NebiusMessage[] = [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: `Create a ${input.style} visual prompt for this wireframe:\n\n${JSON.stringify(input.wireframe, null, 2)}\n\n${colorInfo}`,
      },
    ]

    const promptResponse = await this.callModel(messages, {
      temperature: 0.6,
      maxTokens: 1024,
    })

    const imageResponse = await this.generateImage(promptResponse, input.style)

    return {
      imageUrl: imageResponse.url,
      thumbnailUrl: imageResponse.thumbnailUrl,
      metadata: {
        width: imageResponse.width,
        height: imageResponse.height,
        format: imageResponse.format,
        style: input.style,
      },
      prompt: promptResponse,
    }
  }

  private async generateImage(prompt: string, style: string) {
    try {
      const imageMessages: NebiusMessage[] = [
        {
          role: "user",
          content: `Generate a ${style} wireframe/mockup: ${prompt}`,
        },
      ]

      const response = await this.callModel(imageMessages, {
        model: "black-forest-labs/FLUX.1-dev",
        temperature: 0.7,
        maxTokens: 512,
      })

      // In production, this would return actual image URLs from the API
      return {
        url: `/placeholder.svg?height=800&width=1200&query=${encodeURIComponent(prompt)}`,
        thumbnailUrl: `/placeholder.svg?height=200&width=300&query=${encodeURIComponent(prompt)}`,
        width: 1200,
        height: 800,
        format: "png",
      }
    } catch (error) {
      console.error("Image generation failed:", error)
      // Fallback to placeholder
      return {
        url: `/placeholder.svg?height=800&width=1200&query=${encodeURIComponent(prompt)}`,
        thumbnailUrl: `/placeholder.svg?height=200&width=300&query=${encodeURIComponent(prompt)}`,
        width: 1200,
        height: 800,
        format: "svg",
      }
    }
  }
}
