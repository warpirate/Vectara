import { BaseAgent } from "./base-agent"
import type { NebiusMessage } from "../nebius-client"
import type { WireframeComponent } from "./layout-generator-agent"
import { parseJsonFromText } from "../utils"

export interface CritiqueInput {
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
  focusAreas?: string[] // e.g., ['accessibility', 'usability', 'visual-hierarchy']
}

export interface CritiqueOutput {
  overallScore: number // 1-10
  critiques: {
    category: "accessibility" | "usability" | "visual-hierarchy" | "responsive" | "content"
    severity: "low" | "medium" | "high"
    issue: string
    suggestion: string
    affectedComponents: string[]
  }[]
  improvements: {
    priority: "low" | "medium" | "high"
    description: string
    implementation: string
  }[]
  strengths: string[]
}

export class CritiqueAgent extends BaseAgent {
  async process(input: CritiqueInput): Promise<CritiqueOutput> {
    const systemPrompt = `You are a senior UI/UX expert that evaluates wireframes for usability, accessibility, and design quality.

Analyze wireframes across these dimensions:
1. **Accessibility**: WCAG compliance, screen reader support, keyboard navigation
2. **Usability**: User flow, cognitive load, error prevention, feedback
3. **Visual Hierarchy**: Information architecture, content prioritization, scanning patterns
4. **Responsive Design**: Mobile-first approach, breakpoint considerations
5. **Content Strategy**: Clarity, conciseness, user-focused messaging

Provide constructive feedback with specific, actionable suggestions following the provided JSON schema.
Be thorough but practical - focus on improvements that matter most to users.`

    const focusAreasText = input.focusAreas?.length
      ? `Focus especially on: ${input.focusAreas.join(", ")}`
      : "Evaluate all aspects comprehensively"

    const messages: NebiusMessage[] = [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: `Evaluate this wireframe:\n\n${JSON.stringify(input.wireframe, null, 2)}\n\n${focusAreasText}`,
      },
    ]

    const critiqueSchema = {
      type: "object",
      properties: {
        overallScore: {
          type: "number",
          minimum: 1,
          maximum: 10
        },
        critiques: {
          type: "array",
          items: {
            type: "object",
            properties: {
              category: {
                type: "string",
                enum: ["accessibility", "usability", "visual-hierarchy", "responsive", "content"]
              },
              severity: {
                type: "string",
                enum: ["low", "medium", "high"]
              },
              issue: { type: "string" },
              suggestion: { type: "string" },
              affectedComponents: {
                type: "array",
                items: { type: "string" }
              }
            },
            required: ["category", "severity", "issue", "suggestion", "affectedComponents"]
          }
        },
        improvements: {
          type: "array",
          items: {
            type: "object",
            properties: {
              priority: {
                type: "string",
                enum: ["low", "medium", "high"]
              },
              description: { type: "string" },
              implementation: { type: "string" }
            },
            required: ["priority", "description", "implementation"]
          }
        },
        strengths: {
          type: "array",
          items: { type: "string" }
        }
      },
      required: ["overallScore", "critiques", "improvements", "strengths"]
    }

    const response = await this.callModel(messages, {
      temperature: 0.4,
      maxTokens: 1536,
      timeoutMs: 45000,
      retry: 1,
      guidedJson: critiqueSchema,
    })

    try {
      return parseJsonFromText(response)
    } catch (error) {
      // Fallback critique
      return {
        overallScore: 7,
        critiques: [
          {
            category: "usability",
            severity: "medium",
            issue: "Could not perform detailed analysis",
            suggestion: "Review wireframe structure and component hierarchy",
            affectedComponents: ["root"],
          },
        ],
        improvements: [
          {
            priority: "medium",
            description: "Enhance component labeling and structure",
            implementation: "Add more descriptive component names and properties",
          },
        ],
        strengths: ["Basic structure is present", "Components are organized"],
      }
    }
  }
}
