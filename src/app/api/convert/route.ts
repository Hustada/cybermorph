import { NextRequest, NextResponse } from 'next/server'
import sharp from 'sharp'

type SupportedFormat = 'webp' | 'png' | 'jpg' | 'jpeg'

// Configure Sharp for better performance
sharp.cache(false)
sharp.concurrency(1)

const TARGET_SIZE = 2048
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

export async function POST(request: NextRequest) {
  try {
    // Check content length
    const contentLength = request.headers.get('content-length')
    if (contentLength && parseInt(contentLength) > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'File too large', suggestion: 'Try a smaller file or use WebP format' },
        { status: 413 }
      )
    }

    let formData: FormData
    try {
      formData = await request.formData()
    } catch (error) {
      console.error('Failed to parse form data:', error)
      return NextResponse.json(
        { error: 'Invalid form data' },
        { status: 400 }
      )
    }

    const file = formData.get('file')
    const format = formData.get('format')?.toString().toLowerCase() as SupportedFormat
    const quality = Number(formData.get('quality')) || 80

    if (!file || !format) {
      return NextResponse.json(
        { error: 'File and format are required' },
        { status: 400 }
      )
    }

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
      console.log('API: Buffer created, size:', buffer.length / 1024 + 'KB')
    } catch (error) {
      console.error('Failed to read file:', error)
      return NextResponse.json(
        { error: 'Could not read file data' },
        { status: 400 }
      )
    }

    try {
      let converter = sharp(buffer, {
        failOnError: false,
        limitInputPixels: false,
        sequentialRead: true
      })

      // Verify the image is valid
      try {
        const metadata = await converter.metadata()
        if (!metadata.format) {
          throw new Error('Invalid image format')
        }
        console.log('API: Image metadata:', {
          width: metadata.width,
          height: metadata.height,
          format: metadata.format,
          size: buffer.length / 1024 + 'KB'
        })

        // Smart resize for large images
        if (metadata.width && metadata.height) {
          const maxDimension = Math.max(metadata.width, metadata.height)
          if (maxDimension > TARGET_SIZE) {
            const scale = TARGET_SIZE / maxDimension
            converter = converter.resize(
              Math.round(metadata.width * scale),
              Math.round(metadata.height * scale),
              {
                kernel: 'lanczos3',
                fastShrinkOnLoad: true
              }
            )
          }
        }
      } catch (error) {
        console.error('Invalid image:', error)
        return NextResponse.json(
          { error: 'Invalid or corrupted image file' },
          { status: 400 }
        )
      }

      // Auto-rotate based on EXIF
      converter = converter.rotate()

      let convertedBuffer: Buffer
      try {
        switch (format) {
          case 'webp':
            convertedBuffer = await converter.webp({ 
              quality,
              effort: 4,
              preset: 'photo'
            }).toBuffer()
            break
          case 'png':
            convertedBuffer = await converter.png({ 
              compressionLevel: 7,
              palette: quality < 80,
              colors: quality < 80 ? 128 : 256,
              dither: 0.5
            }).toBuffer()
            break
          case 'jpg':
          case 'jpeg':
            convertedBuffer = await converter.jpeg({ 
              quality,
              mozjpeg: true,
              optimizeScans: true,
              trellisQuantisation: true
            }).toBuffer()
            break
          default:
            return NextResponse.json(
              { error: `Unsupported format: ${format}` },
              { status: 400 }
            )
        }
      } catch (error) {
        console.error('Conversion failed:', error)
        return NextResponse.json(
          { 
            error: 'Failed to convert image',
            suggestion: 'Try a different format or check if the file is a valid image'
          },
          { status: 500 }
        )
      }

      if (convertedBuffer.length > MAX_FILE_SIZE) {
        return NextResponse.json(
          { 
            error: 'Converted file too large',
            suggestion: 'Try with lower quality or convert to WebP format'
          },
          { status: 413 }
        )
      }

      console.log('API: Conversion result:', {
        originalSize: buffer.length / 1024 + 'KB',
        convertedSize: convertedBuffer.length / 1024 + 'KB',
        compressionRatio: (buffer.length / convertedBuffer.length).toFixed(2) + 'x',
        format,
        quality
      })
      
      const contentType = format === 'jpg' || format === 'jpeg' 
        ? 'image/jpeg'
        : `image/${format}`

      return new NextResponse(convertedBuffer, {
        headers: {
          'Content-Type': contentType,
          'Content-Length': convertedBuffer.length.toString(),
          'Cache-Control': 'public, max-age=31536000',
        },
      })
    } catch (error) {
      console.error('Processing error:', error)
      return NextResponse.json(
        { 
          error: 'Error processing image',
          details: error instanceof Error ? error.message : String(error)
        },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { 
        error: 'Server error',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}
