import { useEffect, useRef, useState, useCallback } from 'react'
import * as signalR from '@microsoft/signalr'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

export default function usePriceStream(from, to) {
  const [connected, setConnected] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [lastUpdate, setLastUpdate] = useState(null)
  const [reconnectError, setReconnectError] = useState(false)
  const connectionRef = useRef(null)
  const prevRouteRef = useRef({ from: '', to: '' })
  const rejoinedRef = useRef(false)

  const disconnect = useCallback(async () => {
    if (connectionRef.current) {
      try { await connectionRef.current.stop() } catch {}
      connectionRef.current = null
    }
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
          setLastUpdate(data)
        }
      })

      connection.onreconnecting((err) => {
        setConnected(false)
        setReconnectError(false)
        console.warn('[SignalR] reconnecting', err?.message || err)
      })
      connection.onreconnected(() => {
        setConnected(true)
        setReconnectError(false)
        rejoinedRef.current = true
        console.log('[SignalR] reconnected')
      })
      connection.onclose((err) => {
        setConnected(false)
        setReconnectError(true)
        console.warn('[SignalR] closed', err?.message || err)
      })

      try {
        await connection.start()
        setConnected(true)
        await connection.invoke('JoinRoute', from, to)
      } catch (err) {
        setConnected(false)
        setReconnectError(true)
        console.error('[SignalR] start failed', err)
      } finally {
        setIsConnecting(false)
      }

      connectionRef.current = connection
    }

    connect()

    return () => { disconnect() }
  }, [from, to, disconnect])

  return { connected, isConnecting, lastUpdate, reconnectError }
}
