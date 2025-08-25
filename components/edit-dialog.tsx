"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Loader2, Wand2, Lightbulb } from "lucide-react"

interface EditDialogProps {
  componentId?: string
  componentType?: string
  onEdit: (editPrompt: string, options: any) => Promise<void>
  isEditing: boolean
}

export function EditDialog({ componentId, componentType, onEdit, isEditing }: EditDialogProps) {
  const [editPrompt, setEditPrompt] = useState("")
  const [editMode, setEditMode] = useState<string>("component")
  const [preserveLayout, setPreserveLayout] = useState(true)
  const [open, setOpen] = useState(false)

  const editModes = [
    { value: "full", label: "Full Regeneration", description: "Regenerate entire wireframe with changes" },
    { value: "component", label: "Component Only", description: "Edit only the selected component" },
    { value: "text-only", label: "Text Only", description: "Change only text content" },
    { value: "layout-only", label: "Layout Only", description: "Modify positioning and sizing" },
    { value: "style-only", label: "Style Only", description: "Update colors and visual styling" },
  ]

  const suggestions = [
    "Change the button text to 'Get Started'",
    "Make this component larger",
    "Change the color to blue",
    "Add a subtitle below the heading",
    "Move this to the right side",
    "Make the text bold",
  ]

  const handleEdit = async () => {
    if (!editPrompt.trim()) return

    const options = {
      componentId,
      editMode,
      preserveLayout: editMode !== "layout-only" ? preserveLayout : false,
    }

    await onEdit(editPrompt, options)
    setOpen(false)
    setEditPrompt("")
  }

  const handleSuggestionClick = (suggestion: string) => {
    setEditPrompt(suggestion)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="ghost" className="h-6 w-6 p-0">
          <Wand2 className="h-3 w-3" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="h-5 w-5" />
            Edit with AI
            {componentType && <Badge variant="outline">{componentType}</Badge>}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="edit-prompt">What would you like to change?</Label>
            <Textarea
              id="edit-prompt"
              placeholder="e.g., Change the button text to 'Get Started', Make this component larger, Add a subtitle..."
              value={editPrompt}
              onChange={(e) => setEditPrompt(e.target.value)}
              rows={3}
              className="mt-1"
            />
          </div>

          <div>
            <Label>Quick Suggestions</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {suggestions.map((suggestion, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  className="text-xs h-7 bg-transparent"
                  onClick={() => handleSuggestionClick(suggestion)}
                >
                  <Lightbulb className="h-3 w-3 mr-1" />
                  {suggestion}
                </Button>
              ))}
            </div>
          </div>

          <div>
            <Label htmlFor="edit-mode">Edit Mode</Label>
            <Select value={editMode} onValueChange={setEditMode}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {editModes.map((mode) => (
                  <SelectItem key={mode.value} value={mode.value}>
                    <div>
                      <div className="font-medium">{mode.label}</div>
                      <div className="text-xs text-muted-foreground">{mode.description}</div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {editMode !== "full" && editMode !== "layout-only" && (
            <div className="flex items-center space-x-2">
              <Switch id="preserve-layout" checked={preserveLayout} onCheckedChange={setPreserveLayout} />
              <Label htmlFor="preserve-layout" className="text-sm">
                Preserve existing layout structure
              </Label>
            </div>
          )}

          <div className="flex justify-end space-x-2 pt-4">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEdit} disabled={isEditing || !editPrompt.trim()}>
              {isEditing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Editing...
                </>
              ) : (
                <>
                  <Wand2 className="mr-2 h-4 w-4" />
                  Apply Edit
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
