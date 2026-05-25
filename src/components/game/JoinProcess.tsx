import React, { useEffect, useState } from 'react'

interface Props {
  code: string
}

export default function JoinProcess({ code }: Props) {
  const [status, setStatus] = useState<'initializing' | 'joining' | 'error' | 'success'>('initializing')
  const [message, setMessage] = useState('正在初始化連線...')

  useEffect(() => {
    const performJoin = async () => {
      try {
        setStatus('joining')
        setMessage(`正在加入隊伍 [${code}]...`)

        // 這裡呼叫後端 API
        const response = await fetch('/api/game/join', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code })
        })

        const result = await response.json()

        if (!response.ok) {
          throw new Error(result.message || '加入失敗，邀請碼可能無效或已過期')
        }

        setStatus('success')
        setMessage('成功加入！正在進入研究終端...')
        
        // 加入成功後，延遲一小段時間讓使用者看見狀態，然後重定向至主遊戲頁面
        setTimeout(() => {
          window.location.href = '/game/'
        }, 1500)
      } catch (err: any) {
        setStatus('error')
        setMessage(err.message)
      }
    }

    performJoin()
  }, [code])

  return (
    <div className="text-center space-y-4">
      <div className={`text-2xl font-mono ${status === 'error' ? 'text-red-500' : 'text-emerald-500'}`}>
        {status === 'error' ? '> ERROR' : '> SYSTEM_MESSAGE'}
      </div>
      <div className="text-ink/80 font-mono animate-pulse">{message}</div>
      {status === 'error' && (
        <a href="/" className="mt-4 inline-block px-4 py-2 border border-ink/30 hover:bg-ink/10 transition-colors">
          返回首頁
        </a>
      )}
    </div>
  )
}