import type { tools } from '../data/tools'
import ToolCard from './ToolCard'

type Tool = (typeof tools)[number]

type ToolGridProps = {
  tools: Tool[]
  onToolClick: (title: string) => void
}

function ToolGrid({ tools, onToolClick }: ToolGridProps) {
  return (
    <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {tools.map((tool) => (
        <ToolCard
          key={tool.title}
          title={tool.title}
          description={tool.description}
          icon={tool.icon}
          path={tool.path}
        />
      ))}
    </div>
  )
}

export default ToolGrid