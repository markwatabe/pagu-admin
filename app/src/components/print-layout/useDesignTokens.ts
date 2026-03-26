import { useState, useEffect, useCallback, useRef } from 'react'

export type DesignTokens = Record<string, string>

export function useDesignTokens() {
  const [tokens, setTokens] = useState<DesignTokens | null>(null)
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)
  const tokensRef = useRef<DesignTokens | null>(null)

  useEffect(() => {
    fetch('/api/design-tokens')
      .then(r => r.json())
      .then((data: DesignTokens) => {
        setTokens(data)
        tokensRef.current = data
      })
      .catch(() => {
        setTokens({})
        tokensRef.current = {}
      })
  }, [])

  const updateToken = useCallback((key: string, value: string) => {
    setTokens(prev => {
      const next = { ...prev, [key]: value }
      tokensRef.current = next
      setDirty(true)
      return next
    })
  }, [])

  const removeToken = useCallback((key: string) => {
    setTokens(prev => {
      const next = { ...prev }
      delete next[key]
      tokensRef.current = next
      setDirty(true)
      return next
    })
  }, [])

  const addToken = useCallback((key: string, value: string) => {
    if (!key.startsWith('--')) key = `--${key}`
    setTokens(prev => {
      const next = { ...prev, [key]: value }
      tokensRef.current = next
      setDirty(true)
      return next
    })
  }, [])

  const save = useCallback(async () => {
    if (!tokensRef.current) return
    setSaving(true)
    try {
      await fetch('/api/design-tokens', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tokensRef.current),
      })
      setDirty(false)
    } finally {
      setSaving(false)
    }
  }, [])

  return { tokens, dirty, saving, updateToken, removeToken, addToken, save }
}
