import { useState } from 'react'
import { motion } from 'framer-motion'
import Navigation from '../components/Navigation'

type Priority = 'cost-saver' | 'balanced' | 'max-quality'
type TaskState = 'idle' | 'processing' | 'completed'

interface TaskResult {
  title: string
  content: string
  jobId?: string
  agent?: {
    id: string
    name: string
    description: string
  }
  pricing?: {
    agentPrice: string
    platformFee: string
    totalCost: string
    locusAmount: string
  }
}

export default function TaskSubmission() {
  const [prompt, setPrompt] = useState('')
  const [userWallet, setUserWallet] = useState('')
  const [priority, setPriority] = useState<Priority>('balanced')
  const [taskState, setTaskState] = useState<TaskState>('idle')
  const [result, setResult] = useState<TaskResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async () => {
    if (!prompt.trim()) return
    if (!userWallet.trim()) {
      setError('Please enter your wallet address')
      return
    }
    
    setTaskState('processing')
    setError(null)
    
    try {
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          request: prompt,
          userWallet: userWallet,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to submit task')
      }

      const data = await response.json()
      
      // Poll for results
      const pollForResults = async (jobId: string) => {
        const maxAttempts = 60 // 5 minutes max
        let attempts = 0
        
        const poll = async () => {
          try {
            const jobResponse = await fetch(`/api/tasks/${jobId}`)
            if (!jobResponse.ok) throw new Error('Failed to fetch job status')
            
            const job = await jobResponse.json()
            
            if (job.status === 'completed' && job.result) {
              setResult({
                title: `Task Completed by ${job.assignedAgent?.name || 'Agent'}`,
                content: job.result,
                jobId: job.id,
                agent: job.assignedAgent,
                pricing: {
                  agentPrice: job.agentPrice || '0.00',
                  platformFee: job.platformFee || '0.00',
                  totalCost: job.totalCost || '0.00',
                  locusAmount: job.locusAmount || '0',
                },
              })
              setTaskState('completed')
            } else if (job.status === 'failed') {
              throw new Error('Task execution failed')
            } else if (attempts < maxAttempts) {
              attempts++
              setTimeout(poll, 5000) // Poll every 5 seconds
            } else {
              throw new Error('Task is taking longer than expected. Please check the dashboard.')
            }
          } catch (err: any) {
            setError(err.message || 'Error checking task status')
            setTaskState('idle')
          }
        }
        
        poll()
      }
      
      // Start polling
      pollForResults(data.jobId)
      
      // Show initial response
      setResult({
        title: `Task Submitted - ${data.agent?.name || 'Agent'}`,
        content: data.message || 'Your task has been submitted and is being processed.',
        jobId: data.jobId,
        agent: data.agent,
        pricing: data.pricing,
      })
    } catch (err: any) {
      setError(err.message || 'Failed to submit task')
      setTaskState('idle')
    }
  }

  const handleNewTask = () => {
    setPrompt('')
    setTaskState('idle')
    setResult(null)
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Navigation />

      <main className="flex-grow w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column: Input */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col gap-8"
          >
            {/* Page Heading */}
            <div>
              <h1 className="text-3xl lg:text-4xl font-black tracking-tight">Create a New Agent Task</h1>
            </div>

            {/* Wallet Input */}
            <div className="flex flex-col gap-3">
              <h2 className="text-lg font-bold tracking-tight">Your Wallet Address</h2>
              <input 
                type="text"
                value={userWallet}
                onChange={(e) => setUserWallet(e.target.value)}
                className="form-input flex w-full min-w-0 flex-1 rounded-lg focus:outline-0 focus:ring-2 focus:ring-primary border border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark h-12 placeholder:text-gray-400 px-4 text-base" 
                placeholder="0x..."
              />
            </div>

            {/* Prompt Input */}
            <div className="flex flex-col gap-3">
              <h2 className="text-lg font-bold tracking-tight">Your Prompt</h2>
              <textarea 
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg focus:outline-0 focus:ring-2 focus:ring-primary border border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark min-h-48 placeholder:text-gray-400 p-4 text-base" 
                placeholder="Describe the task for the AI agent... For example: 'Summarize the latest advancements in quantum computing from the past month.'"
              />
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
              </div>
            )}

            {/* Priority Selection */}
            <div className="flex flex-col gap-4">
              <h2 className="text-lg font-bold tracking-tight">Select Priority</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Cost Saver Card */}
                <motion.div 
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setPriority('cost-saver')}
                  className={`group cursor-pointer rounded-xl border-2 p-4 flex flex-col items-start gap-3 transition-colors ${
                    priority === 'cost-saver' 
                      ? 'border-primary bg-primary/10 dark:bg-primary/20' 
                      : 'border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark hover:border-primary'
                  }`}
                >
                  <div className="flex items-center justify-center size-10 rounded-lg bg-primary/20 text-primary">
                    <span className="material-symbols-outlined">savings</span>
                  </div>
                  <div className="flex flex-col">
                    <h3 className="font-bold">Cost Saver</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Lowest cost, basic results.</p>
                  </div>
                </motion.div>

                {/* Balanced Card */}
                <motion.div 
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setPriority('balanced')}
                  className={`group cursor-pointer rounded-xl border-2 p-4 flex flex-col items-start gap-3 transition-colors ${
                    priority === 'balanced' 
                      ? 'border-primary bg-primary/10 dark:bg-primary/20' 
                      : 'border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark hover:border-primary'
                  }`}
                >
                  <div className="flex items-center justify-center size-10 rounded-lg bg-primary/20 text-primary">
                    <span className="material-symbols-outlined">balance</span>
                  </div>
                  <div className="flex flex-col">
                    <h3 className="font-bold">Balanced</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Good quality and speed.</p>
                  </div>
                </motion.div>

                {/* Max Quality Card */}
                <motion.div 
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setPriority('max-quality')}
                  className={`group cursor-pointer rounded-xl border-2 p-4 flex flex-col items-start gap-3 transition-colors ${
                    priority === 'max-quality' 
                      ? 'border-primary bg-primary/10 dark:bg-primary/20' 
                      : 'border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark hover:border-primary'
                  }`}
                >
                  <div className="flex items-center justify-center size-10 rounded-lg bg-primary/20 text-primary">
                    <span className="material-symbols-outlined">diamond</span>
                  </div>
                  <div className="flex flex-col">
                    <h3 className="font-bold">Max Quality</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Highest quality, slower task.</p>
                  </div>
                </motion.div>
              </div>
            </div>

            {/* Action Button */}
            <div>
              <motion.button 
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleSubmit}
                disabled={!prompt.trim() || !userWallet.trim() || taskState === 'processing'}
                className="w-full sm:w-auto flex items-center justify-center rounded-lg h-12 bg-primary text-white gap-2 text-base font-bold px-8 hover:bg-primary/90 transition-colors disabled:bg-gray-300 dark:disabled:bg-gray-600 disabled:cursor-not-allowed"
              >
                {taskState === 'processing' ? (
                  <>
                    <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <span>Run Agent</span>
                    <span className="material-symbols-outlined">arrow_forward</span>
                  </>
                )}
              </motion.button>
            </div>
          </motion.div>

          {/* Right Column: Output */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="flex flex-col bg-card-light dark:bg-card-dark rounded-xl border border-border-light dark:border-border-dark min-h-[500px] lg:min-h-full"
          >
            {/* Empty State */}
            {taskState === 'idle' && (
              <div className="flex flex-col flex-grow items-center justify-center p-8 text-center">
                <div className="flex items-center justify-center size-16 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400">
                  <span className="material-symbols-outlined text-4xl">inventory_2</span>
                </div>
                <h3 className="mt-4 text-lg font-bold">Your results will appear here</h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Fill out the prompt and select a priority to get started.</p>
              </div>
            )}

            {/* Processing State */}
            {taskState === 'processing' && (
              <div className="flex flex-col flex-grow items-center justify-center p-8 text-center">
                <svg className="animate-spin h-12 w-12 text-secondary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <h3 className="mt-4 text-lg font-bold">Agent at work...</h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">This may take a few moments. Please wait.</p>
              </div>
            )}

            {/* Completed State */}
            {taskState === 'completed' && result && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col flex-grow p-6"
              >
                <div className="flex justify-between items-center pb-4 border-b border-border-light dark:border-border-dark">
                  <h3 className="text-xl font-bold">Results</h3>
                  <div className="flex items-center gap-2">
                    <button className="flex items-center justify-center rounded-lg size-9 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors" aria-label="Copy to Clipboard">
                      <span className="material-symbols-outlined text-xl">content_copy</span>
                    </button>
                    <button className="flex items-center justify-center rounded-lg size-9 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors" aria-label="Download results">
                      <span className="material-symbols-outlined text-xl">download</span>
                    </button>
                  </div>
                </div>
                <div className="flex-grow py-4 overflow-y-auto">
                  <h4 className="text-lg font-bold mb-3">{result.title}</h4>
                  <div className="text-sm whitespace-pre-line leading-relaxed">{result.content}</div>
                </div>
                <div className="pt-4 border-t border-border-light dark:border-border-dark">
                  <button 
                    onClick={handleNewTask}
                    className="w-full sm:w-auto flex items-center justify-center rounded-lg h-10 bg-gray-200 dark:bg-gray-700 text-text-light dark:text-text-dark gap-2 text-sm font-bold px-4 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                  >
                    <span>Start New Task</span>
                  </button>
                </div>
              </motion.div>
            )}
          </motion.div>
        </div>
      </main>
    </div>
  )
}

