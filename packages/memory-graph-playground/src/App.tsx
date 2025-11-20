import { useState } from 'react'
import { MemoryGraph } from '@supermemory/memory-graph'
import './App.css'

function App() {
  const [apiKey, setApiKey] = useState('')
  const [showGraph, setShowGraph] = useState(false)

  return (
    <div className="app">
      <div className="header">
        <h1>Memory Graph Playground</h1>
        <p>Test the @supermemory/memory-graph package</p>
      </div>

      <div className="controls">
        <input
          type="password"
          placeholder="Enter your Supermemory API key"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          className="api-key-input"
        />
        <button
          onClick={() => setShowGraph(true)}
          disabled={!apiKey}
          className="load-button"
        >
          Load Graph
        </button>
      </div>

      {showGraph && apiKey && (
        <div className="graph-container">
          <MemoryGraph
            apiKey={apiKey}
            variant="console"
            onError={(error) => {
              console.error('Graph error:', error)
              alert(`Error: ${error.message}`)
            }}
            onSuccess={(total) => {
              console.log(`Loaded ${total} documents`)
            }}
          />
        </div>
      )}

      {!showGraph && (
        <div className="instructions">
          <h2>Instructions</h2>
          <ol>
            <li>Get your API key from <a href="https://supermemory.ai" target="_blank" rel="noopener noreferrer">supermemory.ai</a></li>
            <li>Enter your API key above</li>
            <li>Click "Load Graph" to visualize your memories</li>
          </ol>
          <h3>Features to test:</h3>
          <ul>
            <li>Pan and zoom the graph</li>
            <li>Click on nodes to see details</li>
            <li>Drag nodes around</li>
            <li>Use the space selector to filter by space</li>
            <li>Check the legend for statistics</li>
          </ul>
        </div>
      )}
    </div>
  )
}

export default App
