import { type NextRequest, NextResponse } from "next/server"
import { AgentOrchestrator } from "@/lib/agents/agent-orchestrator"

export async function POST(request: NextRequest) {
  try {
    const { prompt, conversational, context, options } = await request.json()

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

    if (prompt.length > 2000) {
      return NextResponse.json({ error: "Prompt too long. Please keep it under 2000 characters." }, { status: 400 })
    }

    const orchestrator = new AgentOrchestrator(apiKey)

    // Enhanced generation with options
    const generationOptions = {
      includeAccessibility: options?.includeAccessibility ?? true,
      responsive: options?.responsive ?? true,
      complexity: options?.complexity ?? "medium",
      style: options?.style ?? "modern",
      conversational: conversational ?? false,
      ...options,
    }

    const result = await orchestrator.generateWireframe(prompt, context, generationOptions)

    // Add generation metadata
    const enhancedResult = {
      ...result,
      metadata: {
        ...result.wireframe.metadata,
        generatedAt: new Date().toISOString(),
        promptLength: prompt.length,
        hasContext: !!context,
        options: generationOptions,
      },
    }

    // Align response with frontend expectation (success + wireframe)
    return NextResponse.json({ success: true, wireframe: enhancedResult })
  } catch (error: any) {
    console.error("Wireframe generation error:", error)

    // Enhanced error handling with specific error types
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
        error: "Failed to generate wireframe. Please try again.",
        details: process.env.NODE_ENV === "development" ? error.message : undefined,
      },
      { status: 500 },
    )
  }
}
