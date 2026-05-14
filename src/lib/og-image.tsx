import React from 'react'

interface OgImageProps {
  title: string
  description?: string | null
  authorHandle: string
  categoryLabel: string
}

export function OgImage({ title, description, authorHandle, categoryLabel }: OgImageProps) {
  const fontSize = title.length > 30 ? '46px' : title.length > 18 ? '58px' : '70px'
  const truncatedDesc = description
    ? description.length > 90 ? description.slice(0, 90) + '…' : description
    : null

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '1200px',
        height: '630px',
        backgroundColor: '#151515',
        padding: '60px',
        boxSizing: 'border-box',
      }}
    >
      {/* Top row: site name (UbuntuMono) + category (may be Chinese) */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '36px' }}>
        <span style={{ color: '#e37c46', fontSize: '24px', fontFamily: 'UbuntuMono' }}>LATENT · 2026</span>
        <span style={{ color: '#749cba', fontSize: '22px', fontFamily: 'NotoSansTC, UbuntuMono' }}>{categoryLabel}</span>
      </div>

      {/* Accent bar */}
      <div style={{ display: 'flex', width: '64px', height: '2px', backgroundColor: '#e37c46', marginBottom: '40px' }} />

      {/* Title + description: Chinese-first font */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', flex: 1, fontFamily: 'NotoSansTC, UbuntuMono' }}>
        <span style={{ color: '#f0f4f5', fontSize, lineHeight: 1.15, fontWeight: 700 }}>
          {title}
        </span>
        {truncatedDesc && (
          <span style={{ color: '#749cba', fontSize: '32px', lineHeight: 1.55 }}>
            {truncatedDesc}
          </span>
        )}
      </div>

      {/* Bottom row: ASCII-only, use UbuntuMono */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderTop: '1px solid rgba(116,156,186,0.25)',
          paddingTop: '24px',
          fontFamily: 'UbuntuMono',
        }}
      >
        <span style={{ color: '#749cba', fontSize: '22px' }}>by @{authorHandle}</span>
        <span style={{ color: '#749cba', fontSize: '22px' }}>exhibit.ckefgisc.org</span>
      </div>
    </div>
  )
}
