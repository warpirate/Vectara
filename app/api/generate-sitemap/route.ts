import { type NextRequest, NextResponse } from "next/server"
import { AgentOrchestrator } from "@/lib/agents/agent-orchestrator"

export async function POST(request: NextRequest) {
  try {
    const { prompt, options } = await request.json()

    if (!prompt) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 })
    }

    const apiKey = process.env.NEBIUS_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: "NEBIUS_API_KEY environment variable is not configured" }, { status: 500 })
    }

    // Validate prompt length and content
    if (prompt.length < 10) {
      return NextResponse.json({ error: "Prompt too short. Please provide more details." }, { status: 400 })
    }

    if (prompt.length > 4000) {
      return NextResponse.json({ error: "Prompt too long. Please keep it under 4000 characters." }, { status: 400 })
    }

    const orchestrator = new AgentOrchestrator(apiKey)

    const generationOptions = {
      batchGenerate: options?.batchGenerate ?? false,
      pageTypesHint: options?.pageTypesHint ?? undefined,
      ...options,
    }

    const sitemap = await orchestrator.generateSitemap(prompt, generationOptions)

    const enhanced = {
      ...sitemap,
      generation: {
        ...(sitemap.generation || {}),
        generatedAt: new Date().toISOString(),
        pagesCount: countPages(sitemap.project.pages),
        batchGenerated: !!generationOptions.batchGenerate,
      },
    }

    return NextResponse.json({ success: true, sitemap: enhanced })
  } catch (error: any) {
    console.error("Sitemap generation error:", error)

    if (error.message?.includes("API key")) {
      return NextResponse.json({ error: "Invalid API key. Please check your Nebius API key." }, { status: 401 })
    }

    if (error.message?.includes("rate limit")) {
      return NextResponse.json({ error: "Rate limit exceeded. Please try again later." }, { status: 429 })
    }

    if (error.message?.includes("Content safety")) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json(
      {
        error: "Failed to generate sitemap. Please try again.",
        details: process.env.NODE_ENV === "development" ? error.message : undefined,
      },
      { status: 500 },
    )
  }
}

function countPages(pages: any[]): number {
  return pages.reduce((acc, p) => acc + 1 + (p.children ? countPages(p.children) : 0), 0)
}
