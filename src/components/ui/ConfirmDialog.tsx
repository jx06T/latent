import { useState, useCallback, type ReactNode } from 'react'
import { Button } from '@/components/ui/Button'

// ── Pure dialog UI ────────────────────────────────────────────────────────

interface DialogProps {
  title: string
  message: string
  confirmText?: string
  variant?: 'danger' | 'primary'
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({
  title,
  message,
  confirmText = 'Confirm',
  variant = 'danger',
  onConfirm,
  onCancel,
}: DialogProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 font-mono"
      onClick={onCancel}
    >
      <div
        className="bg-bg border border-line w-full max-w-sm mx-4 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="px-5 py-3 border-b border-line">
          <p className="text-xs uppercase tracking-widest text-ink-muted">{title}</p>
        </div>
        <div className="px-5 py-5">
          <p className="text-sm text-ink whitespace-pre-wrap leading-relaxed">{message}</p>
        </div>
        <div className="px-5 py-3 flex justify-end gap-2 border-t border-line">
          <Button variant="ghost" onClick={onCancel} className="text-xs px-3">取消</Button>
          <Button variant={variant} onClick={onConfirm} className="text-xs px-3">{confirmText}</Button>
        </div>
      </div>
    </div>
  )
}

// ── useConfirm hook ───────────────────────────────────────────────────────

export interface ConfirmOptions {
  title: string
  message: string
  confirmText?: string
  variant?: 'danger' | 'primary'
}

interface ConfirmState extends ConfirmOptions {
  resolve: (ok: boolean) => void
}

export function useConfirm(): {
  confirm: (opts: ConfirmOptions) => Promise<boolean>
  dialog: ReactNode
} {
  const [state, setState] = useState<ConfirmState | null>(null)

  const confirm = useCallback(
    (opts: ConfirmOptions) => new Promise<boolean>(resolve => setState({ ...opts, resolve })),
    [],
  )

  const close = useCallback(
    (ok: boolean) => {
      state?.resolve(ok)
      setState(null)
    },
    [state],
  )

  const dialog: ReactNode = state ? (
    <ConfirmDialog
      title={state.title}
      message={state.message}
      confirmText={state.confirmText}
      variant={state.variant}
      onConfirm={() => close(true)}
      onCancel={() => close(false)}
    />
  ) : null

  return { confirm, dialog }
}
