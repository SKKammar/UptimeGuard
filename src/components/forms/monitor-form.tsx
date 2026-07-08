"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export function MonitorForm() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    const formData = new FormData(e.currentTarget)
    const data = {
      name: formData.get("name"),
      url: formData.get("url"),
      method: formData.get("method"),
      expected_status: Number(formData.get("expected_status")),
      check_interval_seconds: Number(formData.get("interval")),
    }

    try {
      const res = await fetch("/api/monitors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })

      if (!res.ok) {
        throw new Error("Failed to create monitor")
      }

      router.push("/")
      router.refresh()
    } catch (err: any) {
      setError(err.message)
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-md">
      {error && <div className="text-red-500 text-sm">{error}</div>}
      
      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <Input id="name" name="name" required placeholder="My Website" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="url">URL</Label>
        <Input id="url" name="url" type="url" required placeholder="https://example.com" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="method">Method</Label>
        <select
          id="method"
          name="method"
          className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
          defaultValue="GET"
        >
          <option value="GET">GET</option>
          <option value="POST">POST</option>
          <option value="PUT">PUT</option>
        </select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="expected_status">Expected Status</Label>
        <Input id="expected_status" name="expected_status" type="number" required defaultValue={200} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="interval">Check Interval</Label>
        <select
          id="interval"
          name="interval"
          className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
          defaultValue={60}
        >
          <option value={60}>Every 1 minute</option>
          <option value={300}>Every 5 minutes</option>
          <option value={900}>Every 15 minutes</option>
        </select>
      </div>

      <Button type="submit" disabled={loading} className="w-full">
        {loading ? "Creating..." : "Create Monitor"}
      </Button>
    </form>
  )
}
