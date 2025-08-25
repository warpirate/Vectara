import { type NextRequest, NextResponse } from "next/server"
import { AgentOrchestrator } from "@/lib/agents/agent-orchestrator"

export async function POST(request: NextRequest) {
  try {
    const { wireframe, focusAreas } = await request.json()

    if (!wireframe) {
      return NextResponse.json({ error: "Wireframe is required" }, { status: 400 })
    }

    const apiKey = process.env.NEBIUS_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: "NEBIUS_API_KEY environment variable is not configured" }, { status: 500 })
    }

    const orchestrator = new AgentOrchestrator(apiKey)
    const result = await orchestrator.critiqueWireframe(wireframe, focusAreas)

    return NextResponse.json(result)
  } catch (error) {
    console.error("Wireframe critique error:", error)
    return NextResponse.json({ error: "Failed to critique wireframe" }, { status: 500 })
  }
}
