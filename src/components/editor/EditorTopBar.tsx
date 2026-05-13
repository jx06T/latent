import type { ReactNode } from 'react'

interface Props {
  left?: ReactNode
  center?: ReactNode
  right?: ReactNode
}

export default function EditorTopBar({ left, center, right }: Props) {
  return (
    <div className="fixed w-screen shrink-0 h-11 flex items-center justify-between px-4 border-b border-line bg-bg font-mono z-40">
      <div className="flex items-center gap-2 shrink-0 min-w-0">{left}</div>
      {center && (
        <div className="absolute left-1/2 -translate-x-1/2 pointer-events-none">
          {center}
        </div>
      )}
      <div className="flex items-center gap-2 shrink-0">{right}</div>
    </div>
  )
}
