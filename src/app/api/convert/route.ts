import { NextRequest, NextResponse } from 'next/server'
import sharp from 'sharp'

type SupportedFormat = 'webp' | 'png' | 'jpg' | 'jpeg'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file')
    const format = formData.get('format')

    if (!file || !format || typeof format !== 'string') {
      return NextResponse.json(
        { error: 'File and format are required' },
        { status: 400 }
      )
    }

    // Type guard for file
    if (!(file instanceof Blob)) {
      return NextResponse.json(
        { error: 'Invalid file type' },
        { status: 400 }
      )
    }

    // Get file data as buffer
    let buffer: Buffer
    try {
      const arrayBuffer = await file.arrayBuffer()
      buffer = Buffer.from(arrayBuffer)
      console.log('API: Buffer created, size:', buffer.length)
    } catch (error) {
      console.error('API: Error getting buffer:', error)
      return NextResponse.json(
        { error: 'Could not read file data' },
        { status: 400 }
      )
    }

    try {
      console.log('API: Creating sharp instance')
      let converter = sharp(buffer)

      // Auto-rotate image based on EXIF data
      converter = converter.rotate()

      console.log('API: Converting to format:', format)
      switch (format as SupportedFormat) {
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
      console.log('API: Conversion successful, size:', convertedBuffer.length)
      
      return new NextResponse(convertedBuffer, {
        headers: {
          'Content-Type': `image/${format}`,
          'Cache-Control': 'public, max-age=31536000',
        },
      })
    } catch (error) {
      console.error('API: Error processing image:', error)
      return NextResponse.json(
        { 
          error: 'Error processing image',
          details: error instanceof Error ? error.message : String(error)
        },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('API: Error in route:', error)
    return NextResponse.json(
      { 
        error: 'Server error',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}
