import { useState, useEffect } from 'react'
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import CommentLabel from '@/components/ui/CommentLabel'
import { cn } from '@/lib/utils'

type Status = 'idle' | 'submitting' | 'success' | 'error'

export default function ContactForm() {
  const { user, profile, loading } = useSupabaseAuth()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  // 登入資料載入後自動填入（不覆蓋使用者已輸入的內容）
  useEffect(() => {
    if (loading) return
    if (profile?.nickname && !name) setName(profile.nickname)
    if (user?.email && !email) setEmail(user.email)
  }, [loading, profile, user])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus('submitting')
    setErrorMsg('')

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, subject, message }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        setStatus('success')
      } else {
        setErrorMsg((data as any).error ?? '傳送失敗，請稍後再試。')
        setStatus('error')
      }
    } catch {
      setErrorMsg('網路錯誤，請稍後再試。')
      setStatus('error')
    }
  }

  if (status === 'success') {
    return (
      <div className="border border-success/40 bg-bg-surface font-mono p-6 space-y-4">
        <div className="flex items-center gap-2 text-success text-sm">
          <span className="opacity-70">[</span>
          <span className="w-1.5 h-1.5 rounded-full bg-success inline-block" style={{ boxShadow: '0 0 6px currentColor' }} />
          <span className="text-xs tracking-widest">OK</span>
          <span className="opacity-70">]</span>
          <span className="ml-1">TRANSMIT_COMPLETE</span>
        </div>

        <div className="space-y-1 text-sm text-ink-muted pl-2 border-l border-line">
          <p><span className="text-ink-dim"></span> 我們已收到您的反饋</p>
          <p><span className="text-ink-dim"></span> 我們將盡快回覆至您的信箱： <span className="text-ink">{email}</span></p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setStatus('idle')
            setSubject('')
            setMessage('')
          }}
        >
          再傳一則
        </Button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      <div>
        <CommentLabel text="your_name" />
        <Input
          variant="terminal"
          type="text"
          placeholder="你的名字或 handle"
          wrapperClassName="w-full"
          value={name}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
          required
        />
      </div>

      <div>
        <CommentLabel text="email_address" />
        <Input
          variant="terminal"
          type="email"
          placeholder="your@email.com"
          wrapperClassName="w-full"
          value={email}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
          required
        />
      </div>

      <div>
        <CommentLabel text="subject" />
        <Input
          variant="terminal"
          type="text"
          placeholder="一行說明你的來意"
          wrapperClassName="w-full"
          value={subject}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSubject(e.target.value)}
        />
      </div>

      <div>
        <CommentLabel text="message" />
        <Input
          variant="terminal"
          as="textarea"
          rows={5}
          placeholder="詳細說明..."
          wrapperClassName="w-full"
          value={message}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setMessage(e.target.value)}
          required
        />
      </div>

      {status === 'error' && (
        <div className={cn(
          'flex items-center gap-2 font-mono text-sm text-danger',
          'border border-danger/30 bg-bg-surface px-3 py-2',
        )}>
          <span className="opacity-70">[</span>
          <span className="w-1.5 h-1.5 rounded-full bg-danger inline-block shrink-0" />
          <span className="text-xs tracking-widest">ERR</span>
          <span className="opacity-70">]</span>
          <span className="ml-1 text-ink-muted">{errorMsg}</span>
        </div>
      )}

      <div className="pt-2">
        <Button
          variant="primary"
          size="lg"
          bracket
          type="submit"
          disabled={status === 'submitting'}
        >
          {status === 'submitting' ? 'TRANSMITTING…' : 'TRANSMIT_MESSAGE'}
        </Button>
      </div>
    </form>
  )
}
