import { Link, useParams } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import Navigation from '../components/Navigation'

interface Job {
  id: string
  status: string
  userRequest: string
  dateCreated?: string
  assignedAgentId?: string
  agentPrice?: string
  platformFee?: string
  totalCost?: string
  locusAmount?: string
  result?: string
  paymentStatus?: string
}

const timelineSteps = [
  { icon: 'checklist', label: 'Job Listed', step: 'Step 1', completed: true },
  { icon: 'groups', label: 'Agent Bidding', step: 'Step 2', completed: true },
  { icon: 'verified', label: 'Agent Selected', step: 'Step 3', completed: true },
  { icon: 'receipt_long', label: 'Execution & Payment', step: 'Step 4', completed: true },
]

export default function JobDashboard() {
  const { id } = useParams<{ id: string }>()
  const [job, setJob] = useState<Job | null>(null)
  const [loading, setLoading] = useState(true)
  const [agent, setAgent] = useState<any>(null)

  useEffect(() => {
    if (id) {
      fetchJob(id)
    } else {
      // If no ID, fetch the most recent job
      fetchJobs()
    }
  }, [id])

  const fetchJob = async (jobId: string) => {
    try {
      const response = await fetch(`/api/tasks/${jobId}`)
      if (!response.ok) throw new Error('Failed to fetch job')
      const data = await response.json()
      setJob(data)
      
      if (data.assignedAgentId) {
        fetchAgent(data.assignedAgentId)
      }
    } catch (error) {
      console.error('Error fetching job:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchJobs = async () => {
    try {
      const response = await fetch('/api/tasks')
      if (!response.ok) throw new Error('Failed to fetch jobs')
      const data = await response.json()
      if (data.length > 0) {
        setJob(data[0])
        if (data[0].assignedAgentId) {
          fetchAgent(data[0].assignedAgentId)
        }
      }
    } catch (error) {
      console.error('Error fetching jobs:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchAgent = async (agentId: string) => {
    try {
      const response = await fetch('/api/agents')
      if (!response.ok) throw new Error('Failed to fetch agents')
      const agents = await response.json()
      const foundAgent = agents.find((a: any) => a.id === agentId)
      setAgent(foundAgent)
    } catch (error) {
      console.error('Error fetching agent:', error)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen">
        <Navigation />
        <main className="flex-1 flex items-center justify-center">
          <svg className="animate-spin h-12 w-12 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </main>
      </div>
    )
  }

  if (!job) {
    return (
      <div className="flex flex-col min-h-screen">
        <Navigation />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-2">No jobs found</h2>
            <Link to="/submit" className="text-primary hover:underline">Create a new task</Link>
          </div>
        </main>
      </div>
    )
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed': return 'bg-secondary-green'
      case 'pending': return 'bg-yellow-400'
      case 'in_progress': return 'bg-blue-400'
      case 'failed': return 'bg-red-400'
      default: return 'bg-gray-400'
    }
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Navigation />

      {/* Main Content */}
      <main className="flex-1 flex flex-col p-4 sm:p-6 md:p-8 overflow-y-auto">
        <div className="max-w-7xl mx-auto w-full">
          {/* Page Heading */}
          <motion.header 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-wrap justify-between items-center gap-4 mb-8"
          >
            <div className="flex flex-col gap-1">
              <h1 className="text-3xl md:text-4xl font-black leading-tight tracking-tight">Job Details</h1>
              <p className="text-gray-500 dark:text-gray-400 text-base font-normal leading-normal">A transparent view of your job from listing to final payment.</p>
            </div>
            <Link to="/submit">
              <motion.button 
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="flex items-center justify-center rounded-lg h-10 px-4 bg-primary text-white text-sm font-bold leading-normal tracking-wide shadow-sm hover:bg-primary/90 transition-colors"
              >
                <span className="material-symbols-outlined text-xl mr-2">add</span>
                <span className="truncate">Run a New Job</span>
              </motion.button>
            </Link>
          </motion.header>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column: Main Content */}
            <div className="lg:col-span-2 flex flex-col gap-8">
              {/* Job Summary Card */}
              <motion.section
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <div className="bg-card-light dark:bg-card-dark rounded-xl border border-border-light dark:border-border-dark shadow-sm">
                  <h2 className="text-xl font-bold leading-tight tracking-tight px-6 py-4 border-b border-border-light dark:border-border-dark">Job Summary</h2>
                  <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-6">
                    <div className="flex flex-col gap-1">
                      <p className="text-gray-500 dark:text-gray-400 text-sm font-normal">Job ID</p>
                      <p className="text-sm font-medium">{job.id}</p>
                    </div>
                    <div className="flex flex-col gap-1">
                      <p className="text-gray-500 dark:text-gray-400 text-sm font-normal">Status</p>
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${getStatusColor(job.status)}`}></span>
                        <p className={`text-sm font-medium ${getStatusColor(job.status).replace('bg-', 'text-')}`}>{job.status}</p>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1 sm:col-span-2">
                      <p className="text-gray-500 dark:text-gray-400 text-sm font-normal">Request</p>
                      <p className="text-sm font-medium">{job.userRequest}</p>
                    </div>
                    <div className="flex flex-col gap-1">
                      <p className="text-gray-500 dark:text-gray-400 text-sm font-normal">Payment Status</p>
                      <p className="text-sm font-medium">{job.paymentStatus || 'pending'}</p>
                    </div>
                  </div>
                </div>
              </motion.section>

              {/* Assigned Agent Section */}
              {agent && (
                <motion.section
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <h2 className="text-xl font-bold leading-tight tracking-tight mb-4">Assigned Agent</h2>
                  <div className="bg-card-light dark:bg-card-dark rounded-xl border border-border-light dark:border-border-dark shadow-sm p-6">
                    <div className="flex items-center gap-4">
                      <div className="size-16 rounded-lg bg-primary/20 text-primary flex items-center justify-center">
                        <span className="material-symbols-outlined text-4xl">smart_toy</span>
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-bold">{agent.name}</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{agent.description}</p>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {agent.capabilities?.slice(0, 3).map((cap: string, idx: number) => (
                            <span key={idx} className="text-xs bg-primary/20 text-primary px-2 py-1 rounded">{cap}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.section>
              )}

              {/* Results Section */}
              {job.result && (
                <motion.section
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <h2 className="text-xl font-bold leading-tight tracking-tight mb-4">Results</h2>
                  <div className="bg-card-light dark:bg-card-dark rounded-xl border border-border-light dark:border-border-dark shadow-sm p-6">
                    <div className="whitespace-pre-wrap text-sm">
                      {typeof job.result === 'object' && job.result !== null
                        ? (job.result.response || JSON.stringify(job.result, null, 2))
                        : job.result}
                    </div>
                  </div>
                </motion.section>
              )}

              {/* Final Cost Section */}
              <motion.section
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <h2 className="text-xl font-bold leading-tight tracking-tight mb-4">Final Cost & Receipt</h2>
                <div className="bg-card-light dark:bg-card-dark rounded-xl border border-border-light dark:border-border-dark shadow-sm">
                  <div className="p-6 flex flex-col gap-4">
                    {job.agentPrice && (
                      <div className="flex justify-between items-center">
                        <p className="text-gray-500 dark:text-gray-400">Agent Fee</p>
                        <p className="font-medium">${job.agentPrice} USD</p>
                      </div>
                    )}
                    {job.platformFee && (
                      <div className="flex justify-between items-center">
                        <p className="text-gray-500 dark:text-gray-400">Platform Fee (10%)</p>
                        <p className="font-medium">${job.platformFee} USD</p>
                      </div>
                    )}
                    {job.totalCost && (
                      <>
                        <div className="border-t border-border-light dark:border-border-dark my-2"></div>
                        <div className="flex justify-between items-center">
                          <p className="font-bold text-lg">Total Cost</p>
                          <div className="text-right">
                            <p className="font-bold text-lg text-primary">${job.totalCost} USD</p>
                            {job.locusAmount && (
                              <p className="text-gray-500 dark:text-gray-400 text-sm">~ {job.locusAmount} Locus</p>
                            )}
                          </div>
                        </div>
                      </>
                    )}
                    <div className="border-t border-border-light dark:border-border-dark pt-4 mt-2 flex flex-wrap gap-4">
                      <button className="flex items-center justify-center rounded-lg h-9 px-4 bg-primary/10 text-primary text-sm font-bold hover:bg-primary/20 transition-colors">
                        <span className="material-symbols-outlined text-lg mr-2">download</span>
                        Download Receipt
                      </button>
                      <button className="flex items-center justify-center rounded-lg h-9 px-4 bg-background-light dark:bg-card-dark border border-border-light dark:border-border-dark text-gray-500 dark:text-gray-400 text-sm font-bold hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                        <span className="material-symbols-outlined text-lg mr-2">description</span>
                        View Execution Logs
                      </button>
                    </div>
                  </div>
                </div>
              </motion.section>
            </div>

            {/* Right Column: Timeline & Winning Agent */}
            <div className="lg:col-span-1 flex flex-col gap-8">
              {/* Timeline */}
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-card-light dark:bg-card-dark rounded-xl border border-border-light dark:border-border-dark shadow-sm p-6"
              >
                <div className="grid grid-cols-[auto_1fr] gap-x-4">
                  {timelineSteps.map((step, index) => (
                    <div key={index} className="contents">
                      <div className="flex flex-col items-center gap-1">
                        <div className={`flex items-center justify-center size-10 rounded-full ${step.completed ? 'bg-primary' : 'bg-gray-300'} text-white`}>
                          <span className="material-symbols-outlined">{step.icon}</span>
                        </div>
                        {index < timelineSteps.length - 1 && (
                          <div className="w-px bg-border-light dark:bg-border-dark h-12"></div>
                        )}
                      </div>
                      <div className={`flex flex-1 flex-col pt-2 ${index < timelineSteps.length - 1 ? 'pb-6' : ''}`}>
                        <p className="text-base font-medium">{step.label}</p>
                        <p className="text-gray-500 dark:text-gray-400 text-sm">{step.step}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>

              {/* Agent Info Card */}
              {agent && (
                <motion.div 
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 }}
                  className="bg-card-light dark:bg-card-dark rounded-xl border border-primary/50 shadow-sm p-6"
                >
                  <h3 className="text-base font-bold mb-4">Assigned Agent</h3>
                  <div className="flex items-center gap-4">
                    <div className="size-12 rounded-lg bg-primary/20 text-primary flex items-center justify-center">
                      <span className="material-symbols-outlined text-2xl">smart_toy</span>
                    </div>
                    <div className="flex-1">
                      <p className="font-bold">{agent.name}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Price: <span className="font-medium text-text-light dark:text-text-dark">${agent.pricePerCall} USD</span>
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 bg-background-light dark:bg-background-dark p-3 rounded-lg">
                    <p className="text-xs text-gray-500 dark:text-gray-400">{agent.description}</p>
                  </div>
                </motion.div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

