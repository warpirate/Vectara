import { BaseAgent } from "./base-agent"
import type { NebiusMessage } from "../nebius-client"
import type { WireframeComponent } from "./layout-generator-agent"
import { parseJsonFromText } from "../utils"

export interface VisionInput {
  imageUrl: string
  analysisType: "wireframe-extraction" | "ui-analysis" | "component-identification"
  context?: string
}

export interface VisionOutput {
  extractedWireframe?: {
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
  analysis: {
    screenType: string
    identifiedComponents: string[]
    layoutStructure: string
    designPatterns: string[]
    accessibility: {
      score: number
      issues: string[]
      recommendations: string[]
    }
  }
  confidence: number // 0-1
}

export class VisionAgent extends BaseAgent {
  async process(input: VisionInput): Promise<VisionOutput> {
    const systemPrompt = `You are an expert UI/UX analyst with computer vision capabilities.

Analyze uploaded screenshots, sketches, or mockups to:
1. **Extract wireframe structure**: Identify components, layout, hierarchy
2. **Analyze UI patterns**: Recognize common design patterns and components
3. **Assess accessibility**: Evaluate contrast, spacing, navigation patterns
4. **Generate structured data**: Convert visual elements to component trees

For wireframe extraction:
- Identify all UI components (buttons, inputs, text, images, containers)
- Determine layout structure and component relationships
- Extract text content and placeholder information
- Assess responsive design considerations

Always respond in JSON format matching the VisionOutput interface.
Provide confidence scores and detailed analysis.`

    const messages: NebiusMessage[] = [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: `Analyze this image for ${input.analysisType}:\nImage URL: ${input.imageUrl}\nContext: ${input.context || "None provided"}`,
      },
    ]

    const response = await this.callModel(messages, {
      temperature: 0.3,
      maxTokens: 2048,
      timeoutMs: 40000,
      retry: 1,
    })

    try {
      return parseJsonFromText(response)
    } catch (error) {
      // Fallback analysis
      return {
        extractedWireframe: {
          id: `extracted-${Date.now()}`,
          title: "Extracted Wireframe",
          description: "Wireframe extracted from uploaded image",
          components: [
            {
              id: "root",
              type: "container",
              props: {
                dimensions: { width: 100, height: 100 },
              },
              children: [
                {
                  id: "placeholder",
                  type: "text",
                  props: {
                    text: "Extracted content",
                    size: "md",
                  },
                },
              ],
            },
          ],
          metadata: {
            screenType: "general",
            responsive: true,
            accessibility: true,
          },
        },
        analysis: {
          screenType: "unknown",
          identifiedComponents: ["container", "text"],
          layoutStructure: "vertical",
          designPatterns: ["basic-layout"],
          accessibility: {
            score: 0.7,
            issues: ["Could not fully analyze accessibility"],
            recommendations: ["Review extracted structure manually"],
          },
        },
        confidence: 0.5,
      }
    }
  }
}
