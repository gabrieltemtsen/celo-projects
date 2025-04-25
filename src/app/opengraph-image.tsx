// opengraph-image.tsx
import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = process.env.NEXT_PUBLIC_FRAME_NAME || 'Frames V2 Demo'
export const size = { width: 600, height: 400 }
export const contentType = 'image/png'

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: size.width,
          height: size.height,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          position: 'relative',
          background: 'linear-gradient(135deg, #FBCC5C 0%, #35D07F 100%)',
          fontFamily: 'Arial, sans-serif',
        }}
      >
        {/* Title */}
        <h1
          style={{
            margin: 0,
            color: '#FFFFFF',
            fontSize: 48,
            fontWeight: 700,
            textAlign: 'center',
            lineHeight: 1.1,
            padding: '0 16px',
          }}
        >
          {alt}
        </h1>

        {/* Subtitle */}
        <p
          style={{
            margin: '16px 0 0',
            color: 'rgba(255,255,255,0.9)',
            fontSize: 20,
            fontWeight: 500,
            textAlign: 'center',
            padding: '0 16px',
          }}
        >
          Swipe to Support Your Projects
        </p>
      </div>
    ),
    {
      ...size,
    }
  )
}
