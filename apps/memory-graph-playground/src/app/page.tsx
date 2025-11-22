"use client"

import { useState, useCallback } from 'react'
import { MemoryGraph, type DocumentWithMemories } from '@supermemory/memory-graph'

interface DocumentsResponse {
  documents: DocumentWithMemories[]
  pagination: {
    currentPage: number
    limit: number
    totalItems: number
    totalPages: number
  }
}

export default function Home() {
  const [apiKey, setApiKey] = useState('')
  const [documents, setDocuments] = useState<DocumentWithMemories[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const [currentPage, setCurrentPage] = useState(0)
  const [showGraph, setShowGraph] = useState(false)

  const PAGE_SIZE = 500

  const fetchDocuments = useCallback(async (page: number, append = false) => {
    if (!apiKey) return

    if (page === 1) {
      setIsLoading(true)
    } else {
      setIsLoadingMore(true)
    }
    setError(null)

    try {
      const response = await fetch('/api/graph', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          apiKey,
          page,
          limit: PAGE_SIZE,
          sort: 'createdAt',
          order: 'desc',
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to fetch documents')
      }

      const data: DocumentsResponse = await response.json()

      if (append) {
        setDocuments(prev => [...prev, ...data.documents])
      } else {
        setDocuments(data.documents)
      }

      setCurrentPage(data.pagination.currentPage)
      setHasMore(data.pagination.currentPage < data.pagination.totalPages)
      setShowGraph(true)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'))
    } finally {
      setIsLoading(false)
      setIsLoadingMore(false)
    }
  }, [apiKey])

  const loadMoreDocuments = useCallback(async () => {
    if (hasMore && !isLoadingMore) {
      await fetchDocuments(currentPage + 1, true)
    }
  }, [hasMore, isLoadingMore, currentPage, fetchDocuments])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (apiKey) {
      setDocuments([])
      setCurrentPage(0)
      fetchDocuments(1)
    }
  }

  return (
    <div className="flex flex-col h-screen bg-zinc-950">
      {/* Header */}
      <header className="shrink-0 border-b border-zinc-800 bg-zinc-900 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-white">Memory Graph Playground</h1>
            <p className="text-sm text-zinc-400">Test the @supermemory/memory-graph package</p>
          </div>

          <form onSubmit={handleSubmit} className="flex items-center gap-3">
            <input
              type="password"
              placeholder="Enter your Supermemory API key"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="w-80 rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-sm text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <button
              type="submit"
              disabled={!apiKey || isLoading}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isLoading ? 'Loading...' : 'Load Graph'}
            </button>
          </form>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 overflow-hidden">
        {!showGraph ? (
          <div className="flex h-full items-center justify-center">
            <div className="max-w-md text-center">
              <div className="mb-6 text-6xl">
                <svg className="mx-auto h-16 w-16 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
              </div>
              <h2 className="mb-2 text-xl font-semibold text-white">Get Started</h2>
              <p className="mb-6 text-zinc-400">
                Enter your Supermemory API key above to visualize your memory graph.
              </p>
              <div className="text-left text-sm text-zinc-500">
                <p className="mb-2 font-medium text-zinc-400">Features to test:</p>
                <ul className="list-inside list-disc space-y-1">
                  <li>Pan and zoom the graph</li>
                  <li>Click on nodes to see details</li>
                  <li>Drag nodes around</li>
                  <li>Use the space selector to filter</li>
                  <li>Pagination loads more documents</li>
                </ul>
              </div>
            </div>
          </div>
        ) : (
          <div className="h-full w-full">
            <MemoryGraph
              documents={documents}
              isLoading={isLoading}
              isLoadingMore={isLoadingMore}
              error={error}
              hasMore={hasMore}
              loadMoreDocuments={loadMoreDocuments}
              totalLoaded={documents.length}
              variant="console"
              showSpacesSelector={true}
            >
              <div className="flex h-full items-center justify-center">
                <p className="text-zinc-400">No memories found. Add some content to see your graph.</p>
              </div>
            </MemoryGraph>
          </div>
        )}
      </main>
    </div>
  )
}
