import { ArrowRight } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Link } from 'react-router'
type ToolCardProps = {
  title: string
  description: string
  icon: LucideIcon
  path: string
}

function ToolCard({
  title,
  description,
  icon: Icon,
  path,
}: ToolCardProps) {
  return (
    <Link to={path}
    className="block rounded-2xl border border-purple-100 bg-white p-6 text-left shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
      <Icon className="text-purple-500" size={28} />
      <h3 className="mt-4 text-lg font-bold">{title}</h3>
      <p className="mt-2 text-sm text-gray-500">{description}</p>
      <ArrowRight className="mt-4 text-pink-400" size={18} />
    </Link>
  )
}

export default ToolCard