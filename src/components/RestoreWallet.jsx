import { useState } from 'react'
import { RotateCcw, FileText, Lightbulb, AlertCircle } from 'lucide-react'
import { vibrate } from '../utils/cashu.js'

export default function RestoreWallet({ onRestore, onCancel }) {
  const [seedInput, setSeedInput] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [restoreStatus, setRestoreStatus] = useState('')

  const handleRestore = async () => {
    try {
      setLoading(true)
      setError('')
      setRestoreStatus('Validating seed phrase...')

      const cleanSeed = seedInput.trim().toLowerCase().replace(/\s+/g, ' ')
      const words = cleanSeed.split(' ')

      if (words.length !== 12 && words.length !== 24) {
        throw new Error('Recovery phrase must be 12 or 24 words.')
      }

      setRestoreStatus('Restoring wallet...')
      await onRestore(cleanSeed)
      
      vibrate([100, 50, 100])

    } catch (err) {
      setError(err.message)
      setRestoreStatus('')
      vibrate([200])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="app">
      <header>
        <button className="back-btn" onClick={onCancel} disabled={loading}>Cancel</button>
        <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.5em' }}>
          <RotateCcw size={24} /> Restore Wallet
        </h1>
      </header>

      <div className="card">
        <h3>Enter Recovery Phrase</h3>
        <p style={{ fontSize: '0.9em', marginBottom: '1em', opacity: 0.8 }}>
          Enter your 12 or 24-word recovery phrase to restore your wallet:
        </p>

        {error && (
          <div style={{
            background: 'rgba(255, 107, 107, 0.1)',
            color: '#ff6b6b',
            padding: '0.8em',
            borderRadius: '8px',
            marginBottom: '1em',
            fontSize: '0.9em',
            border: '1px solid rgba(255, 107, 107, 0.3)',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '0.5em'
          }}>
            <AlertCircle size={16} style={{ marginTop: '2px', flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {restoreStatus && (
          <div style={{
            background: 'rgba(33, 150, 243, 0.1)',
            color: '#2196F3',
            padding: '0.8em',
            borderRadius: '8px',
            marginBottom: '1em',
            fontSize: '0.9em',
            border: '1px solid rgba(33, 150, 243, 0.3)',
            textAlign: 'center'
          }}>
            {restoreStatus}
          </div>
        )}

        <div style={{ position: 'relative', marginBottom: '1em' }}>
          <textarea
            placeholder="Enter your 12 or 24 recovery words separated by spaces"
            value={seedInput}
            onChange={(e) => setSeedInput(e.target.value)}
            rows={4}
            disabled={loading}
            style={{
              width: '100%',
              padding: '0.8em',
              paddingRight: '3.5em',
              fontSize: '0.9em',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '8px',
              color: 'white',
              resize: 'vertical',
              opacity: loading ? 0.5 : 1
            }}
          />
          <button
            onClick={async () => {
              try {
                const text = await navigator.clipboard.readText()
                setSeedInput(text.trim())
                vibrate([50])
              } catch (err) {
                setError('Failed to paste from clipboard')
              }
            }}
            disabled={loading}
            style={{
              position: 'absolute',
              right: '8px',
              top: '8px',
              background: 'rgba(255, 215, 0, 0.2)',
              border: '1px solid rgba(255, 215, 0, 0.3)',
              borderRadius: '6px',
              color: '#FFD700',
              padding: '0.5em 0.8em',
              fontSize: '0.85em',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.5 : 1
            }}
          >
            <FileText size={16} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '0.3em' }} /> Paste
          </button>
        </div>

        <button
          className="primary-btn"
          onClick={handleRestore}
          disabled={loading || !seedInput.trim()}
        >
          {loading ? 'Restoring...' : 'Restore Wallet'}
        </button>
      </div>

      <div className="card" style={{ 
        background: 'rgba(255, 152, 0, 0.05)',
        borderColor: 'rgba(255, 152, 0, 0.3)',
        borderWidth: '1px',
        borderStyle: 'solid'
      }}>
        <h4 style={{ 
          color: '#FF9800', 
          fontSize: '0.95em', 
          display: 'flex', 
          alignItems: 'center', 
          gap: '0.5em',
          marginBottom: '0.8em'
        }}>
          <AlertCircle size={16} /> Important
        </h4>
        <p style={{ fontSize: '0.85em', lineHeight: '1.6', marginBottom: '0.8em', opacity: 0.9 }}>
          This will replace your current wallet. Make sure you have backed up your existing wallet before proceeding.
        </p>
        <p style={{ fontSize: '0.85em', lineHeight: '1.6', opacity: 0.9 }}>
          The restore process will scan your previously used mints to recover your tokens. This may take a minute.
        </p>
      </div>

      <div className="card" style={{ borderColor: 'rgba(255, 215, 0, 0.3)' }}>
        <h4 style={{ 
          color: '#FFD700', 
          fontSize: '0.95em', 
          display: 'flex', 
          alignItems: 'center', 
          gap: '0.5em',
          marginBottom: '0.8em'
        }}>
          <Lightbulb size={16} /> Tips
        </h4>
        <ul style={{ fontSize: '0.85em', lineHeight: '1.6', paddingLeft: '1.2em', opacity: 0.8, margin: 0 }}>
          <li>Must be exactly 12 or 24 words</li>
          <li>Separated by single spaces</li>
          <li>All lowercase letters</li>
          <li>Check for typos carefully</li>
          <li>Each word must be from the BIP39 word list</li>
        </ul>
      </div>
    </div>
  )
}

