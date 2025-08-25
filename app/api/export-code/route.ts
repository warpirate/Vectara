import { type NextRequest, NextResponse } from "next/server"
import { AgentOrchestrator } from "@/lib/agents/agent-orchestrator"

export async function POST(request: NextRequest) {
  try {
    const { wireframe, format, framework, styling, options } = await request.json()

    if (!wireframe || !format) {
      return NextResponse.json({ error: "Wireframe and format are required" }, { status: 400 })
    }

    // Validate export format
    const validFormats = ["react-tsx", "react-js", "html-css", "figma-plugin", "vue", "svelte"]
    if (!validFormats.includes(format)) {
      return NextResponse.json(
        { error: `Invalid export format. Supported formats: ${validFormats.join(", ")}` },
        { status: 400 },
      )
    }

    // Validate framework if provided
    const validFrameworks = ["nextjs", "react", "vanilla", "vite", "nuxt", "sveltekit"]
    if (framework && !validFrameworks.includes(framework)) {
      return NextResponse.json(
        { error: `Invalid framework. Supported frameworks: ${validFrameworks.join(", ")}` },
        { status: 400 },
      )
    }

    const apiKey = process.env.NEBIUS_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: "NEBIUS_API_KEY environment variable is not configured" }, { status: 500 })
    }

    const orchestrator = new AgentOrchestrator(apiKey)
    const result = await orchestrator.exportCode(wireframe, format, framework, styling, options)

    // Add export metadata
    const enhancedResult = {
      ...result,
      exportMetadata: {
        exportedAt: new Date().toISOString(),
        format,
        framework: framework || "react",
        styling: styling || "tailwind",
        options: options || {},
        fileCount: result.files.length,
        totalLines: result.files.reduce((total, file) => total + file.content.split("\n").length, 0),
      },
    }

    return NextResponse.json(enhancedResult)
  } catch (error: any) {
    console.error("Code export error:", error)

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
        error: "Failed to export code. Please try again.",
        details: process.env.NODE_ENV === "development" ? error.message : undefined,
      },
      { status: 500 },
    )
  }
}
