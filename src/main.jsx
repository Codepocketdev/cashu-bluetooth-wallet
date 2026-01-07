import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import { checkBrowserSupport } from './utils/compatibility.js'
import './index.css'

// Check browser support before rendering
const support = checkBrowserSupport()

if (!support.isSupported) {
  document.getElementById('root').innerHTML = `
    <div style="
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 2em;
      text-align: center;
      background: #1a1a1a;
      color: #fff;
    ">
      <div style="max-width: 500px;">
        <h1 style="font-size: 2.5em; margin-bottom: 0.5em;">⚠️ Browser Not Supported</h1>
        <p style="margin-bottom: 1em; opacity: 0.8;">
          Your browser is missing required features to run this wallet.
        </p>
        <div style="
          text-align: left;
          background: #2a2a2a;
          padding: 1em;
          border-radius: 8px;
          margin-bottom: 1em;
        ">
          <strong>Missing features:</strong>
          <ul style="margin-top: 0.5em;">
            ${support.missingFeatures.map(f => `<li>${f}</li>`).join('')}
          </ul>
        </div>
        <p style="opacity: 0.7; font-size: 0.9em;">
          Please use Chrome 90+, Safari 14.5+, or Firefox 88+
        </p>
      </div>
    </div>
  `
} else {
  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </React.StrictMode>,
  )
}
