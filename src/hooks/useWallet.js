import { useState, useEffect, useRef } from 'react'
import { CashuMint, CashuWallet } from '@cashu/cashu-ts'
import {
  generateWalletSeed,
  deriveMasterKey,
  deriveEncryptionKey,
  DEFAULT_MINTS
} from '../utils/cashu.js'
import {
  saveProofsForMint,
  getProofsForMint,
  loadTransactions,
  saveTransactions,
  addTransaction as addTx,
  updateTransactionStatus as updateTxStatus,
  loadCustomMints,
  saveCustomMints
} from '../utils/storage.js'

export const useWallet = () => {
  // Wallet state
  const [wallet, setWallet] = useState(null)
  const [mintUrl, setMintUrl] = useState(DEFAULT_MINTS[0].url)
  const [customMints, setCustomMints] = useState([])
  const [allMints, setAllMints] = useState(DEFAULT_MINTS)
  const [mintInfo, setMintInfo] = useState(null)

  // Balance
  const [balances, setBalances] = useState({})
  const [totalBalance, setTotalBalance] = useState(0)

  // Transactions
  const [transactions, setTransactions] = useState([])

  // Seed & Encryption
  const [seedPhrase, setSeedPhrase] = useState('')
  const [masterKey, setMasterKey] = useState('')
  const [bip39Seed, setBip39Seed] = useState(null)
  const [isNewWallet, setIsNewWallet] = useState(false)
  const [showSeedBackup, setShowSeedBackup] = useState(false)

  // UI
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Race condition prevention
  const isInitializing = useRef(false)

  // Initialize wallet
  useEffect(() => {
    const initializeWallet = async () => {
      const existingSeed = localStorage.getItem('wallet_seed')

      if (existingSeed) {
        const seed = deriveMasterKey(existingSeed)
        const encKey = deriveEncryptionKey(existingSeed)
        setBip39Seed(seed)
        setMasterKey(encKey)
        setSeedPhrase(existingSeed)
        loadCustomMintsData()
        initWallet()
        loadTxData()
        calculateAllBalances()
      } else {
        const newSeed = generateWalletSeed()
        setSeedPhrase(newSeed)
        localStorage.setItem('wallet_seed', newSeed)
        setIsNewWallet(true)
        setTimeout(() => setShowSeedBackup(true), 200)
      }
    }

    initializeWallet()
  }, [])

  useEffect(() => {
    if (mintUrl && bip39Seed) {
      initWallet()
    }
  }, [mintUrl, bip39Seed])

  const initWallet = async () => {
    if (isInitializing.current) {
      console.log('Init already in progress, skipping...')
      return
    }

    isInitializing.current = true

    try {
      setLoading(true)
      setError('')

      const mint = new CashuMint(mintUrl)
      const newWallet = new CashuWallet(mint, { bip39seed: bip39Seed })

      try {
        const info = await mint.getInfo()
        setMintInfo(info)
      } catch (infoError) {
        console.warn('Failed to fetch mint info:', infoError)
        setMintInfo({ name: 'Mint', nuts: {} })
      }

      setWallet(newWallet)
      calculateAllBalances()
    } catch (err) {
      console.error('Wallet init error:', err)
      setError(`Failed to connect to mint: ${err.message}`)
      setWallet(null)
    } finally {
      setLoading(false)
      isInitializing.current = false
    }
  }

  const calculateAllBalances = () => {
    const mintBalances = {}
    let total = 0

    allMints.forEach(mint => {
      const proofs = getProofsForMint(mint.url, masterKey)
      const balance = proofs.reduce((sum, p) => sum + (p.amount || 0), 0)
      mintBalances[mint.url] = balance
      total += balance
    })

    setBalances(mintBalances)
    setTotalBalance(total)
  }

  const handleSeedBackupConfirm = () => {
    localStorage.setItem('wallet_seed', seedPhrase)
    localStorage.setItem('wallet_backed_up', 'true')
    const seed = deriveMasterKey(seedPhrase)
    const encKey = deriveEncryptionKey(seedPhrase)
    setBip39Seed(seed)
    setMasterKey(encKey)
    setShowSeedBackup(false)
    setIsNewWallet(false)
    loadCustomMintsData()
    initWallet()
    loadTxData()
    calculateAllBalances()
  }

  // CORRECTED handleRestoreWallet function for useWallet.js
// Replace the existing handleRestoreWallet function with this one

const handleRestoreWallet = async (restoredSeed) => {
  try {
    setLoading(true)
    setError('')
    
    console.log('Starting wallet restoration...')
    
    // Step 1: Derive keys from restored seed
    const seed = deriveMasterKey(restoredSeed)
    const encKey = deriveEncryptionKey(restoredSeed)
    
    // Step 2: Clear old data ONLY from transactions (keep mint URLs for scanning)
    localStorage.removeItem('cashu_transactions')
    localStorage.removeItem('pending_tokens')
    
    // Step 3: Save new seed
    localStorage.setItem('wallet_seed', restoredSeed)
    localStorage.setItem('wallet_backed_up', 'true')
    setSeedPhrase(restoredSeed)
    setBip39Seed(seed)
    setMasterKey(encKey)
    
    // Step 4: Load mints (both default and custom)
    loadCustomMintsData()
    
    // Step 5: Initialize wallet with new seed
    const mint = new CashuMint(mintUrl)
    const newWallet = new CashuWallet(mint, { bip39seed: seed })
    setWallet(newWallet)
    
    console.log('Wallet initialized with restored seed')
    
    // Step 6: CRITICAL - Restore proofs from all mints
    console.log('Scanning mints for tokens...')
    
    let totalRestored = 0
    const allMintsToScan = [...DEFAULT_MINTS, ...customMints]
    
    for (const mintToScan of allMintsToScan) {
      try {
        console.log(`Scanning ${mintToScan.name}...`)
        
        const scanMint = new CashuMint(mintToScan.url)
        const scanWallet = new CashuWallet(scanMint, { bip39seed: seed })
        
        // Get mint info to check keysets
        const info = await scanMint.getInfo()
        
        if (info?.nuts?.['7']?.supported) {
          // NUT-07: Token state check - Restore by checking state
          try {
            // Try to restore tokens by deriving keys and checking with mint
            // This uses the deterministic derivation from the seed
            const keysetIds = info.keysets || []
            
            for (const keysetId of keysetIds) {
              try {
                // Derive proofs for this keyset
                // The wallet will automatically derive correct keys from seed
                const keyset = await scanMint.getKeys(keysetId)
                
                // Check if we have any proofs for this keyset
                // By trying to restore from the deterministic path
                const restoredProofs = await scanWallet.restore(0, 5, { keysetId })
                
                if (restoredProofs && restoredProofs.length > 0) {
                  // Save restored proofs
                  const key = `cashu_proofs_${btoa(mintToScan.url)}`
                  const existing = JSON.parse(localStorage.getItem(key) || '[]')
                  const combined = [...existing, ...restoredProofs]
                  localStorage.setItem(key, JSON.stringify(combined))
                  
                  const amount = restoredProofs.reduce((sum, p) => sum + p.amount, 0)
                  totalRestored += amount
                  
                  console.log(`Restored ${amount} sats from ${mintToScan.name}`)
                }
              } catch (keysetErr) {
                // Keyset might not have our tokens, continue
                console.log(`No tokens in keyset ${keysetId}`)
              }
            }
          } catch (restoreErr) {
            console.log(`Could not restore from ${mintToScan.name}:`, restoreErr.message)
          }
        } else {
          console.log(`${mintToScan.name} does not support NUT-07 restore`)
        }
        
      } catch (mintErr) {
        console.log(`Error scanning ${mintToScan.name}:`, mintErr.message)
        // Continue with other mints
      }
    }
    
    // Step 7: Recalculate balances with restored proofs
    calculateAllBalances()
    
    console.log(`Wallet restoration complete. Restored ${totalRestored} sats total.`)
    
    setSuccess(`Wallet restored successfully! Found ${totalRestored} sats.`)
    setTimeout(() => setSuccess(''), 5000)
    
    setLoading(false)
    
  } catch (err) {
    console.error('Restoration error:', err)
    setError(`Restoration failed: ${err.message}`)
    setLoading(false)
    throw err
  }
}


  const loadCustomMintsData = () => {
    const custom = loadCustomMints()
    setCustomMints(custom)
    setAllMints([...DEFAULT_MINTS, ...custom])
  }

  const addCustomMint = (name, url) => {
    if (!name || !url) {
      setError('Please enter both name and URL')
      return false
    }

    const newMint = { name, url }
    const updated = [...customMints, newMint]
    saveCustomMints(updated)
    setCustomMints(updated)
    setAllMints([...DEFAULT_MINTS, ...updated])

    setSuccess('Mint added!')
    setTimeout(() => setSuccess(''), 2000)
    return true
  }

  const removeCustomMint = (url) => {
    const updated = customMints.filter(m => m.url !== url)
    saveCustomMints(updated)
    setCustomMints(updated)
    setAllMints([...DEFAULT_MINTS, ...updated])
    setSuccess('Mint removed!')
    setTimeout(() => setSuccess(''), 2000)
  }

  const resetMint = (specificMint = null) => {
    const targetMint = specificMint || mintUrl
    const key = `cashu_proofs_${btoa(targetMint)}`
    localStorage.removeItem(key)
    calculateAllBalances()
  }

  const loadTxData = () => {
    const txs = loadTransactions()
    setTransactions(txs)
  }

  const addTransaction = (type, amount, note, mint, status = 'paid') => {
    const { transactions: updated, txId } = addTx(transactions, type, amount, note, mint || mintUrl, status)
    setTransactions(updated)
    return txId
  }

  const updateTransactionStatus = (txId, newStatus) => {
    const updated = updateTxStatus(transactions, txId, newStatus)
    setTransactions(updated)
  }

  const getProofs = (url) => getProofsForMint(url, masterKey)
  const saveProofs = (url, proofs) => saveProofsForMint(url, proofs, masterKey)

  return {
    wallet,
    mintUrl,
    setMintUrl,
    customMints,
    allMints,
    mintInfo,
    balances,
    totalBalance,
    currentMintBalance: balances[mintUrl] || 0,
    calculateAllBalances,
    transactions,
    addTransaction,
    updateTransactionStatus,
    seedPhrase,
    isNewWallet,
    showSeedBackup,
    setShowSeedBackup,
    handleSeedBackupConfirm,
    handleRestoreWallet,
    masterKey,
    bip39Seed,
    addCustomMint,
    removeCustomMint,
    resetMint,
    getProofs,
    saveProofs,
    loading,
    setLoading,
    error,
    setError,
    success,
    setSuccess
  }
}
