import { NextRequest, NextResponse } from 'next/server'
import sharp from 'sharp'

type SupportedFormat = 'webp' | 'png' | 'jpg' | 'jpeg'

// Configure Sharp for better performance
sharp.cache(false)
sharp.concurrency(1)

const TARGET_SIZE = 2048
const MAX_FILE_SIZE = {
  webp: 10 * 1024 * 1024, // 10MB for WebP
  other: 3 * 1024 * 1024  // 3MB for other formats
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
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

    // Check file size limit based on format
    const sizeLimit = format === 'webp' ? MAX_FILE_SIZE.webp : MAX_FILE_SIZE.other
    if (file.size > sizeLimit) {
      return NextResponse.json({
        error: 'File too large',
        suggestion: format === 'webp' 
          ? 'File must be under 10MB'
          : 'File must be under 3MB for non-WebP formats. Try converting to WebP instead.'
      }, { status: 413 })
    }

    let buffer: Buffer
    try {
      const arrayBuffer = await file.arrayBuffer()
      buffer = Buffer.from(arrayBuffer)
    } catch (error) {
      return NextResponse.json(
        { error: 'Could not read file data' },
        { status: 400 }
      )
    }

    try {
      let converter = sharp(buffer, {
        failOnError: false,
        sequentialRead: true
      })

      // Verify image and get metadata
      const metadata = await converter.metadata()
      if (!metadata.width || !metadata.height) {
        return NextResponse.json(
          { error: 'Invalid image file' },
          { status: 400 }
        )
      }

      // Resize if too large
      const maxDimension = Math.max(metadata.width, metadata.height)
      if (maxDimension > TARGET_SIZE) {
        const scale = TARGET_SIZE / maxDimension
        converter = converter.resize(
          Math.round(metadata.width * scale),
          Math.round(metadata.height * scale),
          { kernel: 'lanczos3' }
        )
      }

      // Auto-rotate based on EXIF
      converter = converter.rotate()

      // Convert based on format
      let outputBuffer: Buffer
      switch (format) {
        case 'webp':
          outputBuffer = await converter.webp({ 
            quality,
            effort: 4
          }).toBuffer()
          break
        case 'png':
          outputBuffer = await converter.png({ 
            compressionLevel: 7,
            palette: true
          }).toBuffer()
          break
        case 'jpg':
        case 'jpeg':
          outputBuffer = await converter.jpeg({ 
            quality,
            mozjpeg: true
          }).toBuffer()
          break
        default:
          return NextResponse.json(
            { error: 'Unsupported format' },
            { status: 400 }
          )
      }

      // Check output size
      if (outputBuffer.length > sizeLimit) {
        if (quality > 60) {
          // Try again with lower quality
          switch (format) {
            case 'webp':
              outputBuffer = await converter.webp({ quality: 60 }).toBuffer()
              break
            case 'jpg':
            case 'jpeg':
              outputBuffer = await converter.jpeg({ quality: 60, mozjpeg: true }).toBuffer()
              break
          }
        }

        if (outputBuffer.length > sizeLimit) {
          return NextResponse.json({
            error: 'Output file too large',
            suggestion: format === 'webp'
              ? 'Try reducing the image dimensions'
              : 'Try converting to WebP format for better compression'
          }, { status: 413 })
        }
      }

      // Return the converted image
      return new NextResponse(outputBuffer, {
        headers: {
          'Content-Type': format === 'jpg' || format === 'jpeg' 
            ? 'image/jpeg' 
            : `image/${format}`,
          'Content-Length': outputBuffer.length.toString(),
          'Cache-Control': 'public, max-age=31536000'
        }
      })

    } catch (error) {
      console.error('Conversion error:', error)
      return NextResponse.json(
        { error: 'Failed to convert image' },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Request error:', error)
    return NextResponse.json(
      { error: 'Server error' },
      { status: 500 }
    )
  }
}
