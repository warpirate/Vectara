import { BaseAgent } from "./base-agent"
import type { NebiusMessage } from "../nebius-client"
import { parseJsonFromText } from "../utils"

export interface LayoutInput {
  refinedPrompt: string
  requirements: {
    screenType: string
    components: string[]
    layout: string
    interactions: string[]
    responsive: boolean
    accessibility: string[]
    complexity: string
  }
}

export interface WireframeComponent {
  id: string
  type: "container" | "text" | "button" | "input" | "image" | "list" | "card" | "navigation"
  props: {
    text?: string
    placeholder?: string
    variant?: string
    size?: "sm" | "md" | "lg"
    position?: { x: number; y: number }
    dimensions?: { width: number; height: number }
  }
  children?: WireframeComponent[]
  style?: {
    backgroundColor?: string
    textColor?: string
    borderColor?: string
    padding?: string
    margin?: string
  }
}

export interface LayoutOutput {
  wireframe: {
    id: string
    title: string
    description: string
    components: WireframeComponent[]
    metadata: {
      screenType: string
      responsive: boolean
      accessibility: boolean
      complexity: string
      estimatedComponents: number
    }
  }
}

export interface ConversationLayoutOutput extends LayoutOutput {
  conversationData?: {
    originalPrompt: string
    refinedPrompt: string
    confidence?: number
    suggestions?: string[]
  }
}

export interface EditLayoutOutput extends LayoutOutput {
  editData?: {
    changes: {
      type: "added" | "modified" | "removed"
      componentId: string
      description: string
      before?: any
      after?: any
    }[]
    confidence: number
    suggestions?: string[]
    editMode?: "full" | "component" | "text-only" | "layout-only" | "style-only"
    targetComponent?: string
  }
}

export class LayoutGeneratorAgent extends BaseAgent {
  async process(input: LayoutInput): Promise<LayoutOutput> {
    const systemPrompt = `You are a wireframe generator. Generate detailed, modern wireframes that follow the provided JSON schema.

Use component types: container, text, button, input, image, list, card, navigation.

Generate wireframes with:
- 10+ meaningful components for rich layouts
- Header, main content, footer structure  
- Hero sections, content grids, CTAs
- Realistic dimensions (1200px containers)
- Proper hierarchy with h1/h2/h3 texts
- Modern spacing (8px grid system)

The response will be validated against a strict JSON schema to ensure consistency and reliability.`

    const messages: NebiusMessage[] = [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: `Generate a wireframe for: "${input.refinedPrompt}"

Requirements: ${JSON.stringify(input.requirements, null, 2)}

Create a detailed, accessible wireframe that follows modern UI/UX best practices.`,
      },
    ]

    const wireframeSchema = {
      type: "object",
      properties: {
        wireframe: {
          type: "object",
          properties: {
            id: { type: "string" },
            title: { type: "string" },
            description: { type: "string" },
            components: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  id: { type: "string" },
                  type: { 
                    type: "string",
                    enum: ["container", "text", "button", "input", "image", "list", "card", "navigation"]
                  },
                  props: {
                    type: "object",
                    properties: {
                      text: { type: "string" },
                      placeholder: { type: "string" },
                      variant: { type: "string", enum: ["primary", "secondary"] },
                      size: { type: "string", enum: ["sm", "md", "lg"] },
                      dimensions: {
                        type: "object",
                        properties: {
                          width: { type: "number" },
                          height: { type: "number" }
                        },
                        required: ["width", "height"]
                      },
                      position: {
                        type: "object",
                        properties: {
                          x: { type: "number" },
                          y: { type: "number" }
                        },
                        required: ["x", "y"]
                      }
                    }
                  },
                  children: { type: "array", items: { $ref: "#" } },
                  style: {
                    type: "object",
                    properties: {
                      backgroundColor: { type: "string" },
                      textColor: { type: "string" },
                      borderColor: { type: "string" },
                      padding: { type: "string" },
                      margin: { type: "string" }
                    }
                  }
                },
                required: ["id", "type", "props"]
              }
            },
            metadata: {
              type: "object",
              properties: {
                screenType: { type: "string" },
                responsive: { type: "boolean" },
                accessibility: { type: "boolean" },
                complexity: { type: "string", enum: ["simple", "medium", "complex"] },
                estimatedComponents: { type: "number" }
              },
              required: ["screenType", "responsive", "complexity", "estimatedComponents"]
            }
          },
          required: ["id", "title", "description", "components", "metadata"]
        }
      },
      required: ["wireframe"]
    }

    let response: string
    try {
      response = await this.callModel(messages, {
        temperature: 0.2,
        maxTokens: 16384,
        timeoutMs: 60000, // Increased to 60 seconds for complex wireframes
        retry: 1,
        guidedJson: wireframeSchema,
      })
    } catch (err) {
      console.error("LayoutGeneratorAgent: model call failed, using fallback wireframe.", err)
      return this.generateFallbackWireframe(input)
    }

    try {
      if (process.env.NODE_ENV === "development") {
        const preview = (response || "").slice(0, 400)
        console.debug("LayoutGeneratorAgent raw response (truncated):", preview)
      }
      const parsed = parseJsonFromText(response)

      // Validate and enhance the wireframe
      if (!parsed.wireframe) {
        throw new Error("Invalid wireframe structure")
      }

      return {
        wireframe: {
          id: parsed.wireframe.id || `wireframe-${Date.now()}`,
          title: parsed.wireframe.title || "Generated Wireframe",
          description: parsed.wireframe.description || input.refinedPrompt,
          components: parsed.wireframe.components || [],
          metadata: {
            screenType: input.requirements.screenType,
            responsive: input.requirements.responsive,
            accessibility: input.requirements.accessibility?.length > 0,
            complexity: input.requirements.complexity,
            estimatedComponents: this.countComponents(parsed.wireframe.components || []),
            ...parsed.wireframe.metadata,
          },
        },
      }
    } catch (error) {
      console.error("Failed to parse layout generator response:", error)

      // Enhanced fallback wireframe based on requirements
      return this.generateFallbackWireframe(input)
    }
  }

  // Helper methods for better wireframe generation
  private countComponents(components: WireframeComponent[]): number {
    let count = components.length
    components.forEach((comp) => {
      if (comp.children) {
        count += this.countComponents(comp.children)
      }
    })
    return count
  }

  private generateFallbackWireframe(input: LayoutInput): LayoutOutput {
    const { requirements } = input

    // Generate appropriate fallback based on screen type
    let fallbackComponents: WireframeComponent[] = []

    switch (requirements.screenType) {
      case "login":
        fallbackComponents = this.generateLoginFallback()
        break
      case "dashboard":
        fallbackComponents = this.generateDashboardFallback()
        break
      case "landing":
        fallbackComponents = this.generateLandingFallback()
        break
      default:
        fallbackComponents = this.generateGenericFallback(requirements)
    }

    return {
      wireframe: {
        id: `wireframe-${Date.now()}`,
        title: `${requirements.screenType.charAt(0).toUpperCase() + requirements.screenType.slice(1)} Wireframe`,
        description: input.refinedPrompt,
        components: fallbackComponents,
        metadata: {
          screenType: requirements.screenType,
          responsive: requirements.responsive,
          accessibility: requirements.accessibility?.length > 0,
          complexity: requirements.complexity,
          estimatedComponents: this.countComponents(fallbackComponents),
        },
      },
    }
  }

  private generateLoginFallback(): WireframeComponent[] {
    return [
      {
        id: "login-container",
        type: "container",
        props: {
          dimensions: { width: 400, height: 500 },
          position: { x: 0, y: 0 },
        },
        children: [
          {
            id: "login-title",
            type: "text",
            props: {
              text: "Sign In",
              size: "lg",
            },
          },
          {
            id: "email-field",
            type: "input",
            props: {
              placeholder: "Email address",
              dimensions: { width: 336, height: 40 },
            },
          },
          {
            id: "password-field",
            type: "input",
            props: {
              placeholder: "Password",
              dimensions: { width: 336, height: 40 },
            },
          },
          {
            id: "signin-btn",
            type: "button",
            props: {
              text: "Sign In",
              variant: "primary",
              dimensions: { width: 336, height: 44 },
            },
          },
        ],
      },
    ]
  }

  private generateDashboardFallback(): WireframeComponent[] {
    return [
      {
        id: "dashboard-layout",
        type: "container",
        props: {
          dimensions: { width: 1200, height: 800 },
        },
        children: [
          {
            id: "sidebar",
            type: "navigation",
            props: {
              dimensions: { width: 250, height: 800 },
            },
          },
          {
            id: "main-content",
            type: "container",
            props: {
              dimensions: { width: 950, height: 800 },
            },
            children: [
              {
                id: "dashboard-title",
                type: "text",
                props: {
                  text: "Dashboard",
                  size: "lg",
                },
              },
              {
                id: "stats-cards",
                type: "container",
                props: {
                  dimensions: { width: 900, height: 200 },
                },
                children: [
                  {
                    id: "stat-card-1",
                    type: "card",
                    props: {
                      dimensions: { width: 280, height: 150 },
                    },
                  },
                  {
                    id: "stat-card-2",
                    type: "card",
                    props: {
                      dimensions: { width: 280, height: 150 },
                    },
                  },
                  {
                    id: "stat-card-3",
                    type: "card",
                    props: {
                      dimensions: { width: 280, height: 150 },
                    },
                  },
                ],
              },
            ],
          },
        ],
      },
    ]
  }

  private generateLandingFallback(): WireframeComponent[] {
    return [
      {
        id: "landing-page",
        type: "container",
        props: {
          dimensions: { width: 1200, height: 1000 },
        },
        children: [
          {
            id: "hero-section",
            type: "container",
            props: {
              dimensions: { width: 1200, height: 400 },
            },
            children: [
              {
                id: "hero-title",
                type: "text",
                props: {
                  text: "Welcome to Our Platform",
                  size: "lg",
                },
              },
              {
                id: "hero-subtitle",
                type: "text",
                props: {
                  text: "Discover amazing features and capabilities",
                },
              },
              {
                id: "cta-button",
                type: "button",
                props: {
                  text: "Get Started",
                  variant: "primary",
                  size: "lg",
                },
              },
            ],
          },
        ],
      },
    ]
  }

  private generateGenericFallback(requirements: any): WireframeComponent[] {
    return [
      {
        id: "root-container",
        type: "container",
        props: {
          dimensions: { width: 800, height: 600 },
        },
        children: requirements.components.map((compType: string, index: number) => ({
          id: `${compType}-${index}`,
          type: compType as any,
          props: {
            text: compType === "text" ? `${compType} content` : compType === "button" ? `${compType}` : undefined,
            placeholder: compType === "input" ? `Enter ${compType}` : undefined,
            dimensions: { width: 200, height: compType === "input" ? 40 : 50 },
          },
        })),
      },
    ]
  }
}
