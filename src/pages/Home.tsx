import { useState } from 'react'
import { tools } from '../data/tools'
import Header from '../components/Header'
import SearchBar from '../components/SearchBar'
import ToolGrid from '../components/ToolGrid'

function Home() {
  const [search, setSearch] = useState('')

  const filteredTools = tools.filter((tool) =>
    `${tool.title} ${tool.description} ${tool.category}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  )

  return (
    <main className="min-h-screen bg-[#FDF9FF] px-5 py-12 text-[#352546]">
      <Header />

      <section className="mx-auto mt-12 max-w-6xl">
        <SearchBar value={search} onChange={setSearch} />
        <ToolGrid tools={filteredTools} />
      </section>
    </main>
  )
}

export default Home