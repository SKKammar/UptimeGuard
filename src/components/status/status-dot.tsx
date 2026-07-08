import { cn } from "@/lib/utils/cn"

export function StatusDot({ isUp, className }: { isUp: boolean, className?: string }) {
  return (
    <div className={cn("relative flex h-3 w-3", className)}>
      {isUp ? (
        <>
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
        </>
      ) : (
        <>
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
        </>
      )}
    </div>
  )
}
