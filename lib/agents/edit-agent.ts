import { BaseAgent } from "./base-agent"
import type { NebiusMessage } from "../nebius-client"
import type { WireframeComponent, LayoutOutput } from "./layout-generator-agent"
import { parseJsonFromText } from "../utils"

export interface EditInput {
  currentWireframe: LayoutOutput
  editPrompt: string
  options: {
    componentId?: string
    editMode: "full" | "component" | "text-only" | "layout-only" | "style-only"
    preserveLayout?: boolean
    targetComponent?: string
  }
}

export interface EditOutput {
  wireframe: LayoutOutput["wireframe"]
  changes: {
    type: "added" | "modified" | "removed"
    componentId: string
    description: string
    before?: any
    after?: any
  }[]
  confidence: number
  suggestions?: string[]
}

export class EditAgent extends BaseAgent {
  async process(input: EditInput): Promise<EditOutput> {
    const { currentWireframe, editPrompt, options } = input

    const systemPrompt = `You are an expert wireframe editor that makes precise, contextual modifications to existing wireframes following the provided JSON schema.

EDITING MODES:
- **full**: Complete wireframe regeneration with edit applied
- **component**: Edit specific component while preserving others
- **text-only**: Only modify text content, preserve layout and structure
- **layout-only**: Only modify layout and positioning, preserve content
- **style-only**: Only modify styling and visual properties

EDITING PRINCIPLES:
1. **Precision**: Make only the changes requested, preserve everything else
2. **Context Awareness**: Understand component relationships and dependencies
3. **Consistency**: Maintain design system consistency across changes
4. **Accessibility**: Preserve or improve accessibility in edits
5. **User Intent**: Interpret user intent accurately from edit prompts

EDITING STRATEGIES:

**Component-Specific Editing:**
- Locate the target component by ID
- Apply changes only to that component and its children
- Preserve parent-child relationships
- Maintain component hierarchy

**Text-Only Editing:**
- Only modify text, placeholder, and label properties
- Preserve all layout, styling, and structural properties
- Update related text elements consistently

**Layout-Only Editing:**
- Modify positions, dimensions, spacing, alignment
- Preserve all text content and styling
- Ensure responsive behavior is maintained

**Style-Only Editing:**
- Modify colors, typography, borders, shadows
- Preserve layout and content
- Maintain accessibility contrast ratios

EXAMPLES:

Edit Prompt: "Change the button text to 'Get Started'"
Mode: text-only
Target: button-123

Response:
{
  "wireframe": {/* wireframe with updated button text */},
  "changes": [
    {
      "type": "modified",
      "componentId": "button-123",
      "description": "Changed button text from 'Sign Up' to 'Get Started'",
      "before": {"text": "Sign Up"},
      "after": {"text": "Get Started"}
    }
  ],
  "confidence": 0.95
}

Edit Prompt: "Make the login form wider"
Mode: layout-only
Target: login-form-container

Response:
{
  "wireframe": {/* wireframe with wider form */},
  "changes": [
    {
      "type": "modified", 
      "componentId": "login-form-container",
      "description": "Increased form width from 400px to 500px",
      "before": {"dimensions": {"width": 400, "height": 500}},
      "after": {"dimensions": {"width": 500, "height": 500}}
    }
  ],
  "confidence": 0.9
}`

    const contextInfo = options.componentId
      ? `Target Component ID: ${options.componentId}`
      : "No specific component targeted"

    const preserveInfo = options.preserveLayout ? "IMPORTANT: Preserve existing layout structure" : ""

    const messages: NebiusMessage[] = [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: `Edit this wireframe:

Current Wireframe: ${JSON.stringify(currentWireframe, null, 2)}

Edit Request: "${editPrompt}"
Edit Mode: ${options.editMode}
${contextInfo}
${preserveInfo}

Apply the requested changes precisely while preserving everything else.`,
      },
    ]

    const editSchema = {
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
                  props: { type: "object" },
                  children: { type: "array" },
                  style: { type: "object" }
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
                complexity: { type: "string" },
                estimatedComponents: { type: "number" }
              }
            }
          },
          required: ["id", "title", "description", "components", "metadata"]
        },
        changes: {
          type: "array",
          items: {
            type: "object",
            properties: {
              type: {
                type: "string",
                enum: ["added", "modified", "removed"]
              },
              componentId: { type: "string" },
              description: { type: "string" },
              before: { type: "object" },
              after: { type: "object" }
            },
            required: ["type", "componentId", "description"]
          }
        },
        confidence: {
          type: "number",
          minimum: 0,
          maximum: 1
        },
        suggestions: {
          type: "array",
          items: { type: "string" }
        }
      },
      required: ["wireframe", "changes", "confidence"]
    }

    const response = await this.callModel(messages, {
      temperature: 0.4,
      maxTokens: 3072,
      timeoutMs: 45000,
      retry: 1,
      guidedJson: editSchema,
    })

    try {
      const parsed = parseJsonFromText(response)

      return {
        wireframe: parsed.wireframe || currentWireframe.wireframe,
        changes: parsed.changes || [],
        confidence: Math.min(Math.max(parsed.confidence || 0.7, 0), 1),
        suggestions: parsed.suggestions,
      }
    } catch (error) {
      console.error("Failed to parse edit agent response:", error)

      // Fallback: apply basic text changes if possible
      return this.applyBasicEdit(currentWireframe, editPrompt, options)
    }
  }

  private applyBasicEdit(
    currentWireframe: LayoutOutput,
    editPrompt: string,
    options: EditInput["options"],
  ): EditOutput {
    // Simple fallback editing logic
    const wireframe = JSON.parse(JSON.stringify(currentWireframe.wireframe))

    if (options.editMode === "text-only" && options.componentId) {
      const component = this.findComponentById(wireframe.components, options.componentId)
      if (component && component.props.text) {
        const oldText = component.props.text
        // Simple text replacement logic
        if (editPrompt.toLowerCase().includes("change") && editPrompt.includes("to")) {
          const match = editPrompt.match(/to\s+"([^"]+)"/i) || editPrompt.match(/to\s+(.+)$/i)
          if (match) {
            component.props.text = match[1].trim()
            return {
              wireframe,
              changes: [
                {
                  type: "modified",
                  componentId: options.componentId,
                  description: `Changed text from "${oldText}" to "${component.props.text}"`,
                  before: { text: oldText },
                  after: { text: component.props.text },
                },
              ],
              confidence: 0.6,
            }
          }
        }
      }
    }

    return {
      wireframe: currentWireframe.wireframe,
      changes: [],
      confidence: 0.3,
      suggestions: ["Could not apply the requested edit. Please try a more specific prompt."],
    }
  }

  private findComponentById(components: WireframeComponent[], id: string): WireframeComponent | null {
    for (const component of components) {
      if (component.id === id) return component
      if (component.children) {
        const found = this.findComponentById(component.children, id)
        if (found) return found
      }
    }
    return null
  }
}
