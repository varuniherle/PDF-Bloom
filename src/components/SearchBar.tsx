import { Search } from 'lucide-react'

type SearchBarProps = {
  value: string
  onChange: (value: string) => void
}

function SearchBar({ value, onChange }: SearchBarProps) {
  return (
    <div className="relative mt-6 max-w-xl">
      <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-purple-400" />
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Search PDF tools..."
        aria-label="Search PDF tools"
        className="w-full rounded-2xl border border-purple-200 bg-white py-3 pl-12 pr-4 outline-none focus:ring-2 focus:ring-purple-200"
      />
    </div>
  )
}

export default SearchBar