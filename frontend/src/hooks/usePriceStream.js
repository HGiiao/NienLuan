import { useEffect, useRef, useState, useCallback } from 'react'
import * as signalR from '@microsoft/signalr'
import { getCurrentPrices } from '../services/api'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'
const POLL_INTERVAL = 30000

export default function usePriceStream(from, to) {
  const [connected, setConnected] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [lastUpdate, setLastUpdate] = useState(null)
  const [reconnectError, setReconnectError] = useState(false)
  const connectionRef = useRef(null)
  const prevRouteRef = useRef({ from: '', to: '' })
  const rejoinedRef = useRef(false)
  const pollRef = useRef(null)

  const disconnect = useCallback(async () => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null }
    if (connectionRef.current) {
      try { await connectionRef.current.stop() } catch {}
      connectionRef.current = null
    }
  }, [])

  const startPolling = useCallback((f, t) => {
    if (pollRef.current) clearInterval(pollRef.current)
    const poll = async () => {
      try {
        const res = await getCurrentPrices(f, t)
        const data = res.data
        setLastUpdate({ routeFrom: f, routeTo: t, minPrice: data.minPrice, maxPrice: data.maxPrice, avgPrice: data.avgPrice, timestamp: new Date().toISOString(), _poll: true })
      } catch {}
    }
    poll()
    pollRef.current = setInterval(poll, POLL_INTERVAL)
  }, [])

  useEffect(() => {
    if (!from || !to) return

    const prev = prevRouteRef.current
    if (prev.from === from && prev.to === to && connectionRef.current?.state === signalR.HubConnectionState.Connected) return
    prevRouteRef.current = { from, to }
    rejoinedRef.current = false

    const connect = async () => {
      await disconnect()
      setIsConnecting(true)
      setReconnectError(false)

      const connection = new signalR.HubConnectionBuilder()
        .withUrl(`${API_URL}/hubs/prices`)
        .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
        .build()

      connection.on('ReceivePriceUpdate', (data) => {
        if (data.routeFrom === from && data.routeTo === to) {
          if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null }
          setLastUpdate(data)
        }
      })

      connection.onreconnecting(() => {
        setConnected(false)
        setReconnectError(false)
        startPolling(from, to)
      })
      connection.onreconnected(() => {
        setConnected(true)
        setReconnectError(false)
        rejoinedRef.current = true
        if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null }
      })
      connection.onclose(() => {
        setConnected(false)
        setReconnectError(true)
        startPolling(from, to)
      })

      try {
        await connection.start()
        setConnected(true)
        await connection.invoke('JoinRoute', from, to)
        if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null }
      } catch (err) {
        setConnected(false)
        setReconnectError(true)
        startPolling(from, to)
      } finally {
        setIsConnecting(false)
      }

      connectionRef.current = connection
    }

    connect()

    return () => { disconnect() }
  }, [from, to, disconnect, startPolling])

  return { connected, isConnecting, lastUpdate, reconnectError }
}
