import ReactDOM from 'react-dom/client'
import ContentApp from './ContentApp'
import('./base.css')
import('./content.css')

setTimeout(initial, 1000)

function initial() {
  const rootDiv = document.createElement('div')
  rootDiv.id = 'extension-root'
  document.body.appendChild(rootDiv)

  const root = ReactDOM.createRoot(rootDiv)
  root.render(<ContentApp />)
}
