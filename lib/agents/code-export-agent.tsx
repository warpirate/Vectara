import { BaseAgent } from "./base-agent"
import type { NebiusMessage } from "../nebius-client"
import type { WireframeComponent } from "./layout-generator-agent"
import { parseJsonFromText } from "../utils"

export interface CodeExportInput {
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
  exportFormat: "react-tsx" | "react-js" | "html-css" | "figma-plugin" | "vue" | "svelte"
  framework?: "nextjs" | "react" | "vanilla" | "vite" | "nuxt" | "sveltekit"
  styling?: "tailwind" | "css-modules" | "styled-components" | "css" | "scss" | "emotion"
  options?: {
    includeTests?: boolean
    includeStorybook?: boolean
    includeDocumentation?: boolean
    optimizeForProduction?: boolean
    includeAnimations?: boolean
  }
}

export interface CodeExportOutput {
  files: {
    filename: string
    content: string
    language: string
    type: "component" | "style" | "config" | "test" | "story" | "documentation"
  }[]
  instructions: string
  dependencies: string[]
  devDependencies: string[]
  scripts: Record<string, string>
  notes: string[]
  preview?: {
    url: string
    description: string
  }
}

export class CodeExportAgent extends BaseAgent {
  async process(input: CodeExportInput): Promise<CodeExportOutput> {
    const systemPrompt = `You are a senior frontend architect and code generation expert that converts wireframes into production-ready, enterprise-grade code.

EXPERTISE AREAS:
- Modern frontend frameworks (React, Vue, Svelte, Next.js)
- TypeScript and advanced type systems
- Accessibility standards (WCAG 2.1 AA)
- Performance optimization and best practices
- Testing strategies (unit, integration, e2e)
- Design systems and component libraries
- Responsive design and mobile-first development

CODE GENERATION PRINCIPLES:
1. **Semantic HTML**: Use proper HTML5 semantic elements
2. **Accessibility First**: Implement ARIA attributes, keyboard navigation, screen reader support
3. **Performance**: Optimize for Core Web Vitals, lazy loading, code splitting
4. **Maintainability**: Clean architecture, proper separation of concerns
5. **Type Safety**: Full TypeScript support with strict typing
6. **Testing**: Include test files and testing utilities
7. **Documentation**: Generate comprehensive documentation
8. **Modern Patterns**: Use latest framework features and best practices

EXPORT FORMATS:
- **react-tsx**: Modern React with TypeScript, hooks, and functional components
- **react-js**: JavaScript React with PropTypes validation
- **html-css**: Semantic HTML5 with modern CSS (Grid, Flexbox, Custom Properties)
- **figma-plugin**: Figma plugin compatible structure with design tokens
- **vue**: Vue 3 Composition API with TypeScript
- **svelte**: SvelteKit with TypeScript and modern features

STYLING APPROACHES:
- **tailwind**: Utility-first CSS with responsive design
- **css-modules**: Scoped CSS with BEM methodology
- **styled-components**: CSS-in-JS with theme support
- **scss**: Sass with modern features and mixins
- **emotion**: Performant CSS-in-JS library

RESPONSE FORMAT:
{
  "files": [
    {
      "filename": "ComponentName.tsx",
      "content": "// Full component code",
      "language": "typescript",
      "type": "component"
    }
  ],
  "instructions": "Detailed setup and usage instructions",
  "dependencies": ["react", "@types/react"],
  "devDependencies": ["@testing-library/react"],
  "scripts": {"dev": "next dev", "build": "next build"},
  "notes": ["Implementation notes and recommendations"],
  "preview": {
    "url": "https://example.com/preview",
    "description": "Live preview description"
  }
}

ADVANCED FEATURES:
- Generate responsive layouts with proper breakpoints
- Include loading states and error boundaries
- Implement proper form validation and accessibility
- Add animation and micro-interactions where appropriate
- Generate comprehensive test suites
- Create Storybook stories for component documentation
- Include performance monitoring and analytics setup

EXAMPLES:

Login Form (React TSX + Tailwind):
{
  "files": [
    {
      "filename": "LoginForm.tsx",
      "content": "import React, { useState } from 'react';\nimport { Button } from './ui/Button';\n\ninterface LoginFormProps {\n  onSubmit: (credentials: { email: string; password: string }) => void;\n  isLoading?: boolean;\n}\n\nexport function LoginForm({ onSubmit, isLoading = false }: LoginFormProps) {\n  const [email, setEmail] = useState('');\n  const [password, setPassword] = useState('');\n  const [errors, setErrors] = useState<Record<string, string>>({});\n\n  const handleSubmit = (e: React.FormEvent) => {\n    e.preventDefault();\n    const newErrors: Record<string, string> = {};\n    \n    if (!email) newErrors.email = 'Email is required';\n    if (!password) newErrors.password = 'Password is required';\n    \n    if (Object.keys(newErrors).length > 0) {\n      setErrors(newErrors);\n      return;\n    }\n    \n    onSubmit({ email, password });\n  };\n\n  return (\n    <form onSubmit={handleSubmit} className=\"max-w-md mx-auto space-y-6\">\n      <div>\n        <label htmlFor=\"email\" className=\"block text-sm font-medium text-gray-700\">\n          Email\n        </label>\n        <input\n          id=\"email\"\n          type=\"email\"\n          value={email}\n          onChange={(e) => setEmail(e.target.value)}\n          className=\"mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500\"\n          aria-describedby={errors.email ? 'email-error' : undefined}\n          aria-invalid={!!errors.email}\n        />\n        {errors.email && (\n          <p id=\"email-error\" className=\"mt-1 text-sm text-red-600\" role=\"alert\">\n            {errors.email}\n          </p>\n        )}\n      </div>\n      \n      <div>\n        <label htmlFor=\"password\" className=\"block text-sm font-medium text-gray-700\">\n          Password\n        </label>\n        <input\n          id=\"password\"\n          type=\"password\"\n          value={password}\n          onChange={(e) => setPassword(e.target.value)}\n          className=\"mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500\"\n          aria-describedby={errors.password ? 'password-error' : undefined}\n          aria-invalid={!!errors.password}\n        />\n        {errors.password && (\n          <p id=\"password-error\" className=\"mt-1 text-sm text-red-600\" role=\"alert\">\n            {errors.password}\n          </p>\n        )}\n      </div>\n      \n      <Button\n        type=\"submit\"\n        disabled={isLoading}\n        className=\"w-full\"\n      >\n        {isLoading ? 'Signing in...' : 'Sign In'}\n      </Button>\n    </form>\n  );\n}",
      "language": "typescript",
      "type": "component"
    }
  ],
  "dependencies": ["react", "@types/react"],
  "devDependencies": ["@testing-library/react", "@testing-library/jest-dom"],
  "instructions": "Import and use the LoginForm component with proper error handling",
  "notes": ["Includes form validation", "Accessible with ARIA attributes", "Responsive design"]
}

REQUIREMENTS:
- Always generate complete, functional code
- Include proper error handling and loading states
- Implement accessibility best practices
- Use modern framework features and patterns
- Generate comprehensive file structures
- Include setup and deployment instructions`

    const optionsText = input.options
      ? `
Additional Options:
- Include Tests: ${input.options.includeTests ? "Yes" : "No"}
- Include Storybook: ${input.options.includeStorybook ? "Yes" : "No"}
- Include Documentation: ${input.options.includeDocumentation ? "Yes" : "No"}
- Optimize for Production: ${input.options.optimizeForProduction ? "Yes" : "No"}
- Include Animations: ${input.options.includeAnimations ? "Yes" : "No"}`
      : ""

    const messages: NebiusMessage[] = [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: `Convert this wireframe to ${input.exportFormat} code:

Wireframe: ${JSON.stringify(input.wireframe, null, 2)}

Export Configuration:
- Format: ${input.exportFormat}
- Framework: ${input.framework || "react"}
- Styling: ${input.styling || "tailwind"}${optionsText}

Generate production-ready code with proper architecture, accessibility, and modern best practices.`,
      },
    ]

    const codeExportSchema = {
      type: "object",
      properties: {
        files: {
          type: "array",
          items: {
            type: "object",
            properties: {
              filename: { type: "string" },
              content: { type: "string" },
              language: {
                type: "string",
                enum: ["typescript", "javascript", "html", "css", "json"]
              },
              type: {
                type: "string",
                enum: ["component", "style", "config", "test", "story", "documentation"]
              }
            },
            required: ["filename", "content", "language", "type"]
          }
        },
        instructions: { type: "string" },
        dependencies: {
          type: "array",
          items: { type: "string" }
        },
        devDependencies: {
          type: "array",
          items: { type: "string" }
        },
        scripts: {
          type: "object",
          additionalProperties: { type: "string" }
        },
        notes: {
          type: "array",
          items: { type: "string" }
        },
        preview: {
          type: "object",
          properties: {
            url: { type: "string" },
            description: { type: "string" }
          },
          required: ["url", "description"]
        }
      },
      required: ["files", "instructions", "dependencies", "devDependencies", "scripts", "notes"]
    }

    const response = await this.callModel(messages, {
      temperature: 0.2,
      maxTokens: 4096,
      timeoutMs: 40000,
      retry: 1,
      guidedJson: codeExportSchema,
    })

    try {
      const parsed = parseJsonFromText(response)

      // Enhance the response with additional metadata
      return {
        files: parsed.files || [],
        instructions: parsed.instructions || "Import and use the generated components",
        dependencies: parsed.dependencies || this.getDefaultDependencies(input),
        devDependencies: parsed.devDependencies || this.getDefaultDevDependencies(input),
        scripts: parsed.scripts || this.getDefaultScripts(input),
        notes: parsed.notes || [],
        preview: parsed.preview,
      }
    } catch (error) {
      console.error("Failed to parse code export response:", error)
      return this.generateFallbackCode(input)
    }
  }

  private getDefaultDependencies(input: CodeExportInput): string[] {
    const deps: string[] = []

    switch (input.exportFormat) {
      case "react-tsx":
      case "react-js":
        deps.push("react", "react-dom")
        if (input.exportFormat === "react-tsx") deps.push("@types/react", "@types/react-dom")
        break
      case "vue":
        deps.push("vue")
        break
      case "svelte":
        deps.push("svelte")
        break
    }

    switch (input.framework) {
      case "nextjs":
        deps.push("next")
        break
      case "vite":
        deps.push("vite")
        break
      case "nuxt":
        deps.push("nuxt")
        break
      case "sveltekit":
        deps.push("@sveltejs/kit")
        break
    }

    switch (input.styling) {
      case "tailwind":
        deps.push("tailwindcss", "autoprefixer", "postcss")
        break
      case "styled-components":
        deps.push("styled-components")
        break
      case "emotion":
        deps.push("@emotion/react", "@emotion/styled")
        break
    }

    return deps
  }

  private getDefaultDevDependencies(input: CodeExportInput): string[] {
    const devDeps: string[] = []

    if (input.exportFormat.includes("tsx") || input.exportFormat === "vue" || input.exportFormat === "svelte") {
      devDeps.push("typescript")
    }

    if (input.options?.includeTests) {
      devDeps.push("@testing-library/react", "@testing-library/jest-dom", "jest")
    }

    if (input.options?.includeStorybook) {
      devDeps.push("@storybook/react", "@storybook/addon-essentials")
    }

    return devDeps
  }

  private getDefaultScripts(input: CodeExportInput): Record<string, string> {
    const scripts: Record<string, string> = {}

    switch (input.framework) {
      case "nextjs":
        scripts.dev = "next dev"
        scripts.build = "next build"
        scripts.start = "next start"
        break
      case "vite":
        scripts.dev = "vite"
        scripts.build = "vite build"
        scripts.preview = "vite preview"
        break
      case "react":
        scripts.dev = "react-scripts start"
        scripts.build = "react-scripts build"
        break
    }

    if (input.options?.includeTests) {
      scripts.test = "jest"
      scripts["test:watch"] = "jest --watch"
    }

    if (input.options?.includeStorybook) {
      scripts.storybook = "start-storybook -p 6006"
      scripts["build-storybook"] = "build-storybook"
    }

    return scripts
  }

  private generateFallbackCode(input: CodeExportInput): CodeExportOutput {
    const componentName = input.wireframe.title.replace(/\s+/g, "").replace(/[^a-zA-Z0-9]/g, "") || "Component"
    const isTypeScript = input.exportFormat.includes("tsx")
    const extension = isTypeScript ? "tsx" : "jsx"

    const componentContent = this.generateBasicComponent(input.wireframe, componentName, isTypeScript)

    const files: CodeExportOutput["files"] = [
      {
        filename: `${componentName}.${extension}`,
        content: componentContent,
        language: isTypeScript ? "typescript" : "javascript",
        type: "component",
      },
    ]

    // Add package.json if requested
    if (input.options?.optimizeForProduction) {
      files.push({
        filename: "package.json",
        content: JSON.stringify(
          {
            name: componentName.toLowerCase(),
            version: "1.0.0",
            description: input.wireframe.description,
            main: `${componentName}.${extension}`,
            dependencies: this.getDefaultDependencies(input).reduce(
              (acc, dep) => {
                acc[dep] = "latest"
                return acc
              },
              {} as Record<string, string>,
            ),
            devDependencies: this.getDefaultDevDependencies(input).reduce(
              (acc, dep) => {
                acc[dep] = "latest"
                return acc
              },
              {} as Record<string, string>,
            ),
            scripts: this.getDefaultScripts(input),
          },
          null,
          2,
        ),
        language: "json",
        type: "config",
      })
    }

    // Add basic test file if requested
    if (input.options?.includeTests) {
      files.push({
        filename: `${componentName}.test.${extension}`,
        content: this.generateBasicTest(componentName, isTypeScript),
        language: isTypeScript ? "typescript" : "javascript",
        type: "test",
      })
    }

    return {
      files,
      instructions: `1. Install dependencies: npm install\n2. Import the ${componentName} component\n3. Use in your application`,
      dependencies: this.getDefaultDependencies(input),
      devDependencies: this.getDefaultDevDependencies(input),
      scripts: this.getDefaultScripts(input),
      notes: [
        "Basic component structure generated",
        "Customize styling and functionality as needed",
        "Consider adding proper error handling and loading states",
      ],
    }
  }

  private generateBasicComponent(wireframe: any, componentName: string, isTypeScript: boolean): string {
    const imports = isTypeScript
      ? `import React from 'react';\n\ninterface ${componentName}Props {\n  className?: string;\n}\n\n`
      : `import React from 'react';\n\n`

    const propsType = isTypeScript ? `{ className }: ${componentName}Props` : `{ className }`

    const componentBody = this.generateComponentBody(wireframe.components)

    return `${imports}export default function ${componentName}(${propsType}) {
  return (
    <div className={\`p-4 \${className || ''}\`}>
      <h1 className="text-2xl font-bold mb-4">${wireframe.title}</h1>
      <p className="text-gray-600 mb-6">${wireframe.description}</p>
      ${componentBody}
    </div>
  );
}`
  }

  private generateComponentBody(components: WireframeComponent[]): string {
    return components
      .map((component) => {
        switch (component.type) {
          case "text":
            return `<p className="mb-2">${component.props.text || "Text content"}</p>`
          case "button":
            return `<button className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">${component.props.text || "Button"}</button>`
          case "input":
            return `<input 
        type="text" 
        placeholder="${component.props.placeholder || "Enter text"}" 
        className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
      />`
          case "container":
            const childrenContent = component.children ? this.generateComponentBody(component.children) : ""
            return `<div className="border border-gray-200 rounded p-4 mb-4">
        ${childrenContent}
      </div>`
          default:
            return `<div className="p-2 border border-dashed border-gray-300 rounded">${component.type} component</div>`
        }
      })
      .join("\n      ")
  }

  private generateBasicTest(componentName: string, isTypeScript: boolean): string {
    const importStatement = isTypeScript
      ? `import { render, screen } from '@testing-library/react';\nimport ${componentName} from './${componentName}';`
      : `import { render, screen } from '@testing-library/react';\nimport ${componentName} from './${componentName}';`

    return `${importStatement}

describe('${componentName}', () => {
  it('renders without crashing', () => {
    render(<${componentName} />);
  });

  it('displays the component title', () => {
    render(<${componentName} />);
    expect(screen.getByRole('heading')).toBeInTheDocument();
  });
});`
  }
}
