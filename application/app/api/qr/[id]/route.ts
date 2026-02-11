import { NextRequest, NextResponse } from 'next/server'
import QRCode from 'qrcode'
import sharp from 'sharp'
import { createClient } from '@/lib/supabase/server'
import path from 'path'
import { readFile } from 'fs/promises'

// Cache the logo buffer so we don't read from disk on every request
let logoBufCache: Buffer | null = null
async function getLogoBuffer(): Promise<Buffer> {
  if (logoBufCache) return logoBufCache
  const logoPath = path.join(process.cwd(), 'public', 'logo.png')
  logoBufCache = await readFile(logoPath)
  return logoBufCache
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  const { data: fanflet } = await supabase
    .from('fanflets')
    .select('id, slug, status, speaker_id')
    .eq('id', id)
    .single()

  if (!fanflet || fanflet.status !== 'published') {
    return NextResponse.json({ error: 'Fanflet not found' }, { status: 404 })
  }

  const { data: speaker } = await supabase
    .from('speakers')
    .select('slug')
    .eq('id', fanflet.speaker_id)
    .single()

  if (!speaker?.slug) {
    return NextResponse.json({ error: 'Fanflet not found' }, { status: 404 })
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3002'
  const fanfletUrl = `${siteUrl}/${speaker.slug}/${fanflet.slug}`

  const format = request.nextUrl.searchParams.get('format') || 'png'
  const size = parseInt(request.nextUrl.searchParams.get('size') || '400')

  if (format === 'svg') {
    let svg = await QRCode.toString(fanfletUrl, {
      type: 'svg',
      width: size,
      color: { dark: '#1B365D', light: '#FFFFFF' },
      errorCorrectionLevel: 'H',
    })

    // Embed the logo in the center of the SVG QR code
    try {
      const logoBuf = await getLogoBuffer()
      const logoB64 = logoBuf.toString('base64')
      const logoSize = Math.round(size * 0.22)
      const logoOffset = Math.round((size - logoSize) / 2)
      const padding = Math.round(logoSize * 0.12)
      const bgSize = logoSize + padding * 2
      const bgOffset = logoOffset - padding
      const bgRadius = Math.round(bgSize * 0.15)

      // Insert logo elements before the closing </svg> tag
      const logoSvg = `
  <rect x="${bgOffset}" y="${bgOffset}" width="${bgSize}" height="${bgSize}" rx="${bgRadius}" ry="${bgRadius}" fill="#FFFFFF"/>
  <image x="${logoOffset}" y="${logoOffset}" width="${logoSize}" height="${logoSize}" href="data:image/png;base64,${logoB64}" />
</svg>`
      svg = svg.replace('</svg>', logoSvg)
    } catch {
      // If logo overlay fails, return plain QR
    }

    return new NextResponse(svg, {
      headers: {
        'Content-Type': 'image/svg+xml',
        'Content-Disposition': `attachment; filename="fanflet-qr-${fanflet.slug}.svg"`,
        'Cache-Control': 'no-store, must-revalidate',
      },
    })
  }

  // PNG format — generate QR then composite logo on top
  const qrBuffer = await QRCode.toBuffer(fanfletUrl, {
    width: size,
    margin: 2,
    color: { dark: '#1B365D', light: '#FFFFFF' },
    errorCorrectionLevel: 'H',
  })

  try {
    const logoBuf = await getLogoBuffer()
    const logoSize = Math.round(size * 0.22)
    const padding = Math.round(logoSize * 0.12)
    const bgSize = logoSize + padding * 2
    const bgRadius = Math.round(bgSize * 0.15)

    // Resize logo to target size
    const resizedLogo = await sharp(logoBuf)
      .resize(logoSize, logoSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toBuffer()

    // Create a white rounded-rect background for the logo
    const bgSvg = `<svg width="${bgSize}" height="${bgSize}">
      <rect x="0" y="0" width="${bgSize}" height="${bgSize}" rx="${bgRadius}" ry="${bgRadius}" fill="#FFFFFF"/>
    </svg>`
    const bgBuffer = await sharp(Buffer.from(bgSvg)).png().toBuffer()

    const bgOffset = Math.round((size - bgSize) / 2)
    const logoOffset = Math.round((size - logoSize) / 2)

    // Composite: QR base -> white background -> logo
    const finalBuffer = await sharp(qrBuffer)
      .composite([
        { input: bgBuffer, left: bgOffset, top: bgOffset },
        { input: resizedLogo, left: logoOffset, top: logoOffset },
      ])
      .png()
      .toBuffer()

    return new NextResponse(new Uint8Array(finalBuffer), {
      headers: {
        'Content-Type': 'image/png',
        'Content-Disposition': `attachment; filename="fanflet-qr-${fanflet.slug}.png"`,
        'Cache-Control': 'no-store, must-revalidate',
      },
    })
  } catch {
    // Fallback to plain QR if logo compositing fails
    return new NextResponse(new Uint8Array(qrBuffer), {
      headers: {
        'Content-Type': 'image/png',
        'Content-Disposition': `attachment; filename="fanflet-qr-${fanflet.slug}.png"`,
        'Cache-Control': 'no-store, must-revalidate',
      },
    })
  }
}
