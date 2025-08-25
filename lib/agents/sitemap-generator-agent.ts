import { BaseAgent } from "./base-agent"
import type { NebiusMessage } from "../nebius-client"
import { AGENT_MODELS } from "../nebius-client"
import { LayoutGeneratorAgent, type LayoutInput, type LayoutOutput } from "./layout-generator-agent"
import type { NebiusClient } from "../nebius-client"
import { parseJsonFromText } from "../utils"

export interface SitemapInput {
  prompt: string
  options?: {
    batchGenerate?: boolean
    pageTypesHint?: string[]
  }
}

export interface SitemapPage {
  id: string
  title: string
  path: string
  type: string
  description?: string
  children?: SitemapPage[]
  wireframe?: LayoutOutput
}

export interface SitemapOutput {
  project: {
    id: string
    name: string
    description?: string
    pages: SitemapPage[]
  }
  generation?: {
    count: number
    generatedAt: string
  }
}

export class SitemapGeneratorAgent extends BaseAgent {
  private layoutAgent: LayoutGeneratorAgent

  constructor(client?: NebiusClient, model?: string) {
    super(client, model || AGENT_MODELS.SITEMAP || AGENT_MODELS.CONVERSATION)
    // Use the same client for layout generation to share auth/config
    this.layoutAgent = new LayoutGeneratorAgent(this.client, AGENT_MODELS.LAYOUT_GENERATOR)
  }

  async process(input: SitemapInput): Promise<SitemapOutput> {
    const systemPrompt = `You are a product IA expert. From a user's description, create a concise multi-page website sitemap following the provided JSON schema.

Rules:
- Use url-safe kebab-case for ids and infer sensible paths
- Keep hierarchy shallow but logical (1-2 levels)
- Prefer common page types (landing, about, pricing, docs, blog-list, blog-post, contact, dashboard, login)
- Only include pages; do not include components or code.
- The response will be validated against a strict JSON schema.`

    const messages: NebiusMessage[] = [
      { role: "system", content: systemPrompt },
      { role: "user", content: input.prompt },
    ]

    const sitemapSchema = {
      type: "object",
      properties: {
        project: {
          type: "object",
          properties: {
            id: { type: "string" },
            name: { type: "string" },
            description: { type: "string" },
            pages: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  id: { type: "string" },
                  title: { type: "string" },
                  path: { type: "string" },
                  type: {
                    type: "string",
                    enum: ["landing", "about", "contact", "blog-list", "blog-post", "dashboard", "login", "signup", "pricing", "docs", "feature", "other"]
                  },
                  description: { type: "string" },
                  children: {
                    type: "array",
                    items: { $ref: "#/properties/project/properties/pages/items" }
                  }
                },
                required: ["id", "title", "path", "type"]
              }
            }
          },
          required: ["id", "name", "pages"]
        }
      },
      required: ["project"]
    }

    let response: string
    const startSitemap = Date.now()
    let mode = "guided_json"
    try {
      response = await this.callModel(messages, {
        temperature: 0.4,
        maxTokens: 8192,
        timeoutMs: 60000,
        retry: 2,
        guidedJson: sitemapSchema,
      })
    } catch (err) {
      console.warn(`Sitemap guided JSON call failed, falling back to json_object. Error: ${err}`)
      // Fallback to non-guided JSON object to avoid repeated guided failures/timeouts
      mode = "json_object"
      response = await this.callModel(messages, {
        temperature: 0.3,
        maxTokens: 8192,
        timeoutMs: 90000,
        retry: 1,
        responseFormat: "json_object",
      })
    }
    console.info(`Sitemap generation completed in ${Date.now() - startSitemap}ms using ${mode}`)

    let parsed: SitemapOutput | null = null
    try {
      parsed = parseJsonFromText(response)
    } catch (e) {
      // Provide a basic fallback sitemap
      parsed = {
        project: {
          id: `project-${Date.now()}`,
          name: "Generated Project",
          description: input.prompt.slice(0, 120),
          pages: [
            { id: "home", title: "Home", path: "/", type: "landing" },
            { id: "about", title: "About", path: "/about", type: "about" },
            { id: "contact", title: "Contact", path: "/contact", type: "contact" },
          ],
        },
        generation: { count: 3, generatedAt: new Date().toISOString() },
      }
    }

    // Ensure required fields
    if (!parsed!.project?.id) parsed!.project.id = `project-${Date.now()}`
    if (!parsed!.project?.pages) parsed!.project.pages = []

    // Optionally batch-generate wireframes per page
    if (input.options?.batchGenerate) {
      const pagesWithWireframes = await this.generateWireframesForPages(parsed!.project.pages)
      parsed!.project.pages = pagesWithWireframes
      parsed!.generation = {
        count: this.countPages(pagesWithWireframes),
        generatedAt: new Date().toISOString(),
      }
    }

    return parsed!
  }

  private async generateWireframesForPages(pages: SitemapPage[]): Promise<SitemapPage[]> {
    const results: SitemapPage[] = []
    for (const page of pages) {
      const wf = await this.generateWireframeForPage(page)
      const children = page.children && page.children.length > 0
        ? await this.generateWireframesForPages(page.children)
        : undefined
      results.push({ ...page, wireframe: wf || page.wireframe, children })
    }
    return results
  }

  private async generateWireframeForPage(page: SitemapPage): Promise<LayoutOutput | undefined> {
    const maxAttempts = 2
    let lastError: any = null
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const start = Date.now()
      try {
        const refinedPrompt = `Create the wireframe for the "${page.title}" page (${page.type}) at route ${page.path}. Include a clear hierarchy and modern UX.`
        const requirements: LayoutInput["requirements"] = {
          screenType: page.type || "general",
          components: ["container", "text", "button"],
          layout: page.type === "dashboard" ? "sidebar" : page.type === "landing" ? "vertical" : "vertical",
          interactions: ["click", "navigation"],
          responsive: true,
          accessibility: ["screen-reader", "keyboard-nav"],
          complexity: "medium",
        }
        const result = await this.layoutAgent.process({ refinedPrompt, requirements })
        // Tag title/description if missing
        if (!result.wireframe.title) result.wireframe.title = page.title
        if (!result.wireframe.description) result.wireframe.description = page.description || page.title
        console.info(`Wireframe for page '${page.id}' generated in ${Date.now() - start}ms (attempt ${attempt + 1})`)
        return result
      } catch (e) {
        lastError = e
        console.warn(`Wireframe generation failed for page '${page.id}' on attempt ${attempt + 1}: ${e}`)
        // simple backoff
        await new Promise((r) => setTimeout(r, 300 * (attempt + 1)))
      }
    }
    console.error(`Wireframe generation ultimately failed for page '${page.id}':`, lastError)
    // If any page fails, continue gracefully
    return undefined
  }

  private countPages(pages: SitemapPage[]): number {
    return pages.reduce((acc, p) => acc + 1 + (p.children ? this.countPages(p.children) : 0), 0)
  }
}
