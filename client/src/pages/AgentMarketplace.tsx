import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import AnimatedBackground from '../components/AnimatedBackground'
import Navigation from '../components/Navigation'

interface Agent {
  id: string
  name: string
  description: string
  capabilities: string[]
  pricePerCall: string
  status: string
  isActive: string
  icon?: string
  iconColor?: string
}

export default function AgentMarketplace() {
  const [agents, setAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [selectedModels, setSelectedModels] = useState<string[]>([])
  const [selectedPrices, setSelectedPrices] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    fetchAgents()
  }, [])

  const fetchAgents = async () => {
    try {
      const response = await fetch('/api/agents')
      if (!response.ok) throw new Error('Failed to fetch agents')
      const data = await response.json()
      
      // Map backend agents to frontend format with icons
      const iconMap: Record<string, { icon: string; color: string }> = {
        'research': { icon: 'query_stats', color: 'bg-primary/20 text-primary' },
        'coding': { icon: 'code', color: 'bg-orange-500/20 text-orange-400' },
        'writing': { icon: 'edit', color: 'bg-purple-500/20 text-purple-400' },
        'data analysis': { icon: 'analytics', color: 'bg-primary/20 text-primary' },
        'general assistance': { icon: 'support_agent', color: 'bg-green-500/20 text-green-400' },
      }
      
      const mappedAgents = data.map((agent: any) => {
        const firstCapability = agent.capabilities?.[0]?.toLowerCase() || 'general assistance'
        const iconInfo = iconMap[firstCapability] || { icon: 'smart_toy', color: 'bg-primary/20 text-primary' }
        return {
          ...agent,
          icon: iconInfo.icon,
          iconColor: iconInfo.color,
        }
      })
      
      setAgents(mappedAgents)
    } catch (error) {
      console.error('Error fetching agents:', error)
    } finally {
      setLoading(false)
    }
  }

  // Extract unique categories and models from agents
  const categories = Array.from(new Set(agents.flatMap(a => a.capabilities || [])))
  const models = ['GPT-4', 'Claude 3', 'Llama 3', 'Gemini Pro'] // These are not in backend, keeping for UI
  const prices = ['Free', 'Paid'] // Simplified pricing

  const toggleFilter = (value: string, selected: string[], setter: (val: string[]) => void) => {
    if (selected.includes(value)) {
      setter(selected.filter(item => item !== value))
    } else {
      setter([...selected, value])
    }
  }

  const clearAllFilters = () => {
    setSelectedCategories([])
    setSelectedModels([])
    setSelectedPrices([])
    setSearchQuery('')
  }

  const filteredAgents = agents.filter(agent => {
    const agentCategories = agent.capabilities || []
    const matchesCategory = selectedCategories.length === 0 || selectedCategories.some(cat => agentCategories.includes(cat))
    const matchesModel = selectedModels.length === 0 // Models not in backend, so always match if no filter
    const priceType = parseFloat(agent.pricePerCall) === 0 ? 'Free' : 'Paid'
    const matchesPrice = selectedPrices.length === 0 || selectedPrices.includes(priceType)
    const matchesSearch = searchQuery === '' || agent.name.toLowerCase().includes(searchQuery.toLowerCase()) || agent.description.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesCategory && matchesModel && matchesPrice && matchesSearch && agent.isActive === 'true' && agent.status === 'available'
  })

  return (
    <div className="relative flex h-auto min-h-screen w-full flex-col">
      <AnimatedBackground />
      <Navigation />

      {/* Main Content */}
      <div className="flex flex-1">
        {/* Filter Sidebar */}
        <aside className="w-72 flex-shrink-0 border-r border-border-light dark:border-border-dark p-6 sticky top-[65px] h-[calc(100vh-65px)] overflow-y-auto">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold">Filters</h3>
            <button onClick={clearAllFilters} className="text-primary hover:underline text-sm font-medium">Clear All</button>
          </div>

          {/* Search Bar (Mobile) */}
          <div className="md:hidden mb-6">
            <div className="flex w-full items-stretch rounded-lg border border-border-light dark:border-border-dark overflow-hidden">
              <div className="text-gray-400 flex bg-card-light dark:bg-card-dark items-center justify-center pl-3">
                <span className="material-symbols-outlined">search</span>
              </div>
              <input 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="form-input flex w-full min-w-0 flex-1 bg-card-light dark:bg-card-dark focus:outline-0 focus:ring-0 border-0 placeholder:text-gray-400 px-4 text-sm" 
                placeholder="Search agents..." 
              />
            </div>
          </div>

          <div className="space-y-6">
            {/* Agent Category */}
            <div>
              <h4 className="font-semibold mb-3">Agent Category</h4>
              <div className="space-y-2">
                {categories.map(category => (
                  <label key={category} className="flex items-center gap-2 cursor-pointer text-sm">
                    <input 
                      checked={selectedCategories.includes(category)}
                      onChange={() => toggleFilter(category, selectedCategories, setSelectedCategories)}
                      className="form-checkbox border-gray-300 dark:border-gray-600 rounded text-primary focus:ring-primary/50" 
                      type="checkbox"
                    />
                    {category}
                  </label>
                ))}
              </div>
            </div>
            
            {/* Underlying Model */}
            <div>
              <h4 className="font-semibold mb-3">Underlying Model</h4>
              <div className="space-y-2">
                {models.map(model => (
                  <label key={model} className="flex items-center gap-2 cursor-pointer text-sm">
                    <input 
                      checked={selectedModels.includes(model)}
                      onChange={() => toggleFilter(model, selectedModels, setSelectedModels)}
                      className="form-checkbox border-gray-300 dark:border-gray-600 rounded text-primary focus:ring-primary/50" 
                      type="checkbox"
                    />
                    {model}
                  </label>
                ))}
              </div>
            </div>

            {/* Price */}
            <div>
              <h4 className="font-semibold mb-3">Price</h4>
              <div className="space-y-2">
                {prices.map(price => (
                  <label key={price} className="flex items-center gap-2 cursor-pointer text-sm">
                    <input 
                      checked={selectedPrices.includes(price)}
                      onChange={() => toggleFilter(price, selectedPrices, setSelectedPrices)}
                      className="form-checkbox border-gray-300 dark:border-gray-600 rounded text-primary focus:ring-primary/50" 
                      type="checkbox"
                    />
                    {price}
                  </label>
                ))}
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 p-6 lg:p-8">
          <div className="mx-auto max-w-7xl">
            {/* Page Heading */}
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-wrap justify-between gap-4 mb-8"
            >
              <div className="flex min-w-72 flex-col gap-2">
                <p className="text-4xl font-black leading-tight tracking-[-0.033em]">AI Agent Marketplace</p>
                <p className="text-gray-500 dark:text-gray-400 text-base font-normal leading-normal">Discover and deploy autonomous agents for any task.</p>
              </div>
            </motion.div>

            {/* Featured Carousel */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="mb-10"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold leading-tight tracking-[-0.015em]">Editor's Picks</h2>
              </div>
              <div className="flex overflow-x-auto [-ms-scrollbar-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden -mx-4 px-4">
                <div className="flex items-stretch gap-6">
                  {[
                    { title: 'Top Agents This Week', desc: 'Our curated selection of the most innovative agents.', gradient: 'from-primary/60 to-secondary/60' },
                    { title: 'New! Claude 3 Powered', desc: 'Explore the next generation of intelligence.', gradient: 'from-purple-600/60 to-pink-600/60' },
                    { title: 'Automate Your Workflow', desc: 'Boost productivity with powerful automation agents.', gradient: 'from-green-600/60 to-teal-600/60' },
                  ].map((item, idx) => (
                    <motion.div 
                      key={idx}
                      whileHover={{ scale: 1.02, y: -5 }}
                      className="flex h-full flex-1 flex-col gap-4 rounded-xl bg-white/5 shadow-lg w-72 flex-shrink-0 cursor-pointer transition-all"
                    >
                      <div className={`w-full aspect-video rounded-t-xl bg-gradient-to-br ${item.gradient}`}></div>
                      <div className="flex flex-col flex-1 justify-between p-4 pt-0 gap-4">
                        <div>
                          <p className="text-base font-medium leading-normal">{item.title}</p>
                          <p className="text-gray-500 dark:text-gray-400 text-sm font-normal leading-normal">{item.desc}</p>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>

            {/* Section Header and Sort Controls */}
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold leading-tight tracking-[-0.015em]">
                All Agents {filteredAgents.length !== agents.length && `(${filteredAgents.length} results)`}
              </h2>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500 dark:text-gray-400">Sort by:</span>
                <select className="form-select bg-card-light dark:bg-card-dark border-border-light dark:border-border-dark rounded-md text-sm focus:ring-primary/50 focus:border-primary/50">
                  <option>Popularity</option>
                  <option>Newest</option>
                  <option>Rating</option>
                </select>
              </div>
            </div>

            {/* Loading State */}
            {loading && (
              <div className="flex items-center justify-center py-16">
                <svg className="animate-spin h-12 w-12 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </div>
            )}

            {/* Agent Cards Grid */}
            {!loading && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
              >
                {filteredAgents.map((agent, idx) => (
                <motion.div 
                  key={agent.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 * idx }}
                  whileHover={{ scale: 1.05 }}
                  className="flex flex-col bg-white/5 rounded-xl p-4 transition-all duration-300 hover:bg-white/10 cursor-pointer"
                >
                  <div className="flex items-center gap-4 mb-3">
                    <div className={`size-12 rounded-lg ${agent.iconColor || 'bg-primary/20 text-primary'} flex items-center justify-center`}>
                      <span className="material-symbols-outlined" style={{ fontSize: '32px' }}>{agent.icon || 'smart_toy'}</span>
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold">{agent.name}</h3>
                    </div>
                  </div>
                  <p className="text-gray-500 dark:text-gray-400 text-sm mb-4 flex-grow">{agent.description}</p>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {agent.capabilities?.slice(0, 2).map((cap: string, idx: number) => (
                      <span key={idx} className="text-xs font-medium bg-primary/20 text-primary px-2 py-1 rounded">{cap}</span>
                    ))}
                  </div>
                  <div className="flex justify-between items-center text-sm text-gray-500 dark:text-gray-400">
                    <div className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-green-400">check_circle</span>
                      <span className="text-secondary-green">{agent.status}</span>
                    </div>
                    <span className="font-bold">${agent.pricePerCall}</span>
                  </div>
                </motion.div>
              ))}
              </motion.div>
            )}

            {/* Empty State */}
            {filteredAgents.length === 0 && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center py-16 text-center"
              >
                <div className="size-16 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-400 flex items-center justify-center mb-4">
                  <span className="material-symbols-outlined text-4xl">search_off</span>
                </div>
                <h3 className="text-xl font-bold mb-2">No agents found</h3>
                <p className="text-gray-500 dark:text-gray-400 mb-4">Try adjusting your filters or search query</p>
                <button onClick={clearAllFilters} className="text-primary hover:underline font-medium">Clear all filters</button>
              </motion.div>
            )}

            {/* Pagination */}
            {filteredAgents.length > 0 && (
              <div className="flex justify-center mt-10">
                <nav className="flex items-center gap-2">
                  <a className="flex items-center justify-center size-9 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors" href="#">
                    <span className="material-symbols-outlined">chevron_left</span>
                  </a>
                  <a className="flex items-center justify-center size-9 rounded-lg bg-primary text-white font-bold" href="#">1</a>
                  <a className="flex items-center justify-center size-9 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors" href="#">2</a>
                  <a className="flex items-center justify-center size-9 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors" href="#">3</a>
                  <span className="text-gray-400">...</span>
                  <a className="flex items-center justify-center size-9 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors" href="#">10</a>
                  <a className="flex items-center justify-center size-9 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors" href="#">
                    <span className="material-symbols-outlined">chevron_right</span>
                  </a>
                </nav>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}

