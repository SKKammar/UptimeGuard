"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Trash2, Edit } from "lucide-react"
import { useRouter } from "next/navigation"

type Monitor = {
  id: string
  name: string
  url: string
  last_checked_at: string | null
  is_public: boolean
}

type MonitorStatus = {
  monitor_id: string
  is_up: boolean
  response_time_ms: number
}

export function MonitorList({ initialMonitors, initialStatuses }: { initialMonitors: Monitor[], initialStatuses: Record<string, MonitorStatus> }) {
  const [monitors, setMonitors] = useState<Monitor[]>(initialMonitors)
  const [statuses, setStatuses] = useState<Record<string, MonitorStatus>>(initialStatuses)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    const channel = supabase
      .channel('monitors_changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'uptimeguard',
          table: 'monitors',
        },
        (payload) => {
          setMonitors((current) =>
            current.map((m) =>
              m.id === payload.new.id ? { ...m, ...payload.new } : m
            )
          )
        }
      )
      .subscribe()

    const pingChannel = supabase
      .channel('pings_changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'uptimeguard',
          table: 'pings',
        },
        (payload) => {
          const newPing = payload.new as MonitorStatus
          setStatuses((current) => ({
            ...current,
            [newPing.monitor_id]: newPing
          }))
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
      supabase.removeChannel(pingChannel)
    }
  }, [supabase])

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this monitor?")) {
      await fetch(`/api/monitors/${id}`, { method: 'DELETE' })
      setMonitors(monitors.filter(m => m.id !== id))
      router.refresh()
    }
  }

  const togglePublic = async (id: string, currentStatus: boolean) => {
    await fetch(`/api/monitors/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_public: !currentStatus })
    })
    setMonitors(monitors.map(m => m.id === id ? { ...m, is_public: !currentStatus } : m))
    router.refresh()
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Status</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>URL</TableHead>
            <TableHead>Last Ping</TableHead>
            <TableHead>Public Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {monitors.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                No monitors found. Create one to get started.
              </TableCell>
            </TableRow>
          ) : (
            monitors.map((monitor) => {
              const status = statuses[monitor.id]
              return (
                <TableRow key={monitor.id}>
                  <TableCell>
                    {status ? (
                      <Badge variant={status.is_up ? "success" : "destructive"}>
                        {status.is_up ? "UP" : "DOWN"}
                      </Badge>
                    ) : (
                      <Badge variant="secondary">PENDING</Badge>
                    )}
                  </TableCell>
                  <TableCell className="font-medium">
                    <Link href={`/status/${monitor.id}`} className="hover:underline">
                      {monitor.name}
                    </Link>
                  </TableCell>
                  <TableCell className="text-gray-500">{monitor.url}</TableCell>
                  <TableCell>
                    {status ? `${status.response_time_ms}ms` : '-'}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1 items-start">
                      <button 
                        onClick={() => togglePublic(monitor.id, monitor.is_public)}
                        className={`text-xs px-2 py-1 rounded-full font-medium ${monitor.is_public ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}
                      >
                        {monitor.is_public ? 'Public' : 'Private'}
                      </button>
                      {monitor.is_public && (
                        <a href={`/status/${monitor.id}`} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline flex items-center">
                          View Link
                        </a>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(monitor.id)}>
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </TableCell>
                </TableRow>
              )
            })
          )}
        </TableBody>
      </Table>
    </div>
  )
}
