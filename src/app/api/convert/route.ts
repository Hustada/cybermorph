import { NextRequest, NextResponse } from 'next/server'
import sharp from 'sharp'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const format = formData.get('format') as string

    if (!file || !format) {
      return NextResponse.json(
        { error: 'File and format are required' },
        { status: 400 }
      )
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    let converter = sharp(buffer)

    switch (format) {
      case 'webp':
        converter = converter.webp({ quality: 80 })
        break
      case 'png':
        converter = converter.png({ quality: 80 })
        break
      case 'jpg':
      case 'jpeg':
        converter = converter.jpeg({ quality: 80 })
        break
      default:
        return NextResponse.json(
          { error: 'Unsupported format' },
          { status: 400 }
        )
    }

    const convertedBuffer = await converter.toBuffer()

    return new NextResponse(convertedBuffer, {
      headers: {
        'Content-Type': `image/${format}`,
        'Content-Disposition': `attachment; filename=converted.${format}`
      }
    })
  } catch (error) {
    console.error('Error converting image:', error)
    return NextResponse.json(
      { error: 'Failed to convert image' },
      { status: 500 }
    )
  }
}
