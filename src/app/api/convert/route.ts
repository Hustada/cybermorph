import { NextRequest, NextResponse } from 'next/server'
import sharp from 'sharp'

type SupportedFormat = 'webp' | 'png' | 'jpg' | 'jpeg'

// Maximum file size (10MB)
const MAX_FILE_SIZE = 10 * 1024 * 1024

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file')
    const format = formData.get('format')?.toString().toLowerCase()

    if (!file || !format) {
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

    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'File size exceeds 10MB limit' },
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

      // Get image metadata
      const metadata = await converter.metadata()
      console.log('API: Image metadata:', metadata)

      // Resize if image is too large
      if (metadata.width && metadata.width > 4096 || metadata.height && metadata.height > 4096) {
        converter = converter.resize(4096, 4096, {
          fit: 'inside',
          withoutEnlargement: true
        })
      }

      // Auto-rotate based on EXIF
      converter = converter.rotate()

      console.log('API: Converting to format:', format)
      switch (format as SupportedFormat) {
        case 'webp':
          converter = converter.webp({ 
            quality: 80,
            effort: 4 // Lower effort for faster processing
          })
          break
        case 'png':
          converter = converter.png({ 
            compressionLevel: 6, // Medium compression for balance
            palette: true // Use palette for smaller file size
          })
          break
        case 'jpg':
        case 'jpeg':
          converter = converter.jpeg({ 
            quality: 80,
            mozjpeg: true // Use mozjpeg for better compression
          })
          break
        default:
          return NextResponse.json(
            { error: `Unsupported format: ${format}` },
            { status: 400 }
          )
      }

      const convertedBuffer = await converter.toBuffer()
      console.log('API: Conversion successful, size:', convertedBuffer.length)
      
      // Set correct content type based on format
      const contentType = format === 'jpg' || format === 'jpeg' 
        ? 'image/jpeg'
        : `image/${format}`

      // Return the converted image as a blob with proper content type
      return new NextResponse(convertedBuffer, {
        headers: {
          'Content-Type': contentType,
          'Content-Length': convertedBuffer.length.toString(),
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
