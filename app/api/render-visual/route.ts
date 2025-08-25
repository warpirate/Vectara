import { type NextRequest, NextResponse } from "next/server"
import { AgentOrchestrator } from "@/lib/agents/agent-orchestrator"

export async function POST(request: NextRequest) {
  try {
    const { wireframe, style, colorScheme, brandColors } = await request.json()

    if (!wireframe || !style) {
      return NextResponse.json({ error: "Wireframe and style are required" }, { status: 400 })
    }

    const apiKey = process.env.NEBIUS_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: "NEBIUS_API_KEY environment variable is not configured" }, { status: 500 })
    }

    const orchestrator = new AgentOrchestrator(apiKey)
    const result = await orchestrator.renderVisual(wireframe, style, colorScheme, brandColors)

    return NextResponse.json(result)
  } catch (error) {
    console.error("Visual rendering error:", error)
    return NextResponse.json({ error: "Failed to render visual" }, { status: 500 })
  }
}
