import { NextRequest, NextResponse } from 'next/server'
import sharp from 'sharp'

type SupportedFormat = 'webp' | 'png' | 'jpg' | 'jpeg'

// Configure Sharp for better performance
sharp.cache(false) // Disable cache to reduce memory usage
sharp.concurrency(1) // Limit concurrent processing

// Remove the pixel limit but set a reasonable default for resizing
const TARGET_SIZE = 2048
const MAX_OUTPUT_SIZE = 5 * 1024 * 1024 // 5MB limit for output

async function convertImage(
  converter: sharp.Sharp, 
  format: SupportedFormat, 
  quality: number = 80
): Promise<Buffer> {
  switch (format) {
    case 'webp':
      return converter.webp({ 
        quality,
        effort: 4,
        preset: 'photo'
      }).toBuffer()
    case 'png':
      return converter.png({ 
        compressionLevel: 7,
        palette: quality < 80, // Use palette for lower quality
        colors: quality < 80 ? 128 : 256,
        dither: 0.5
      }).toBuffer()
    case 'jpg':
    case 'jpeg':
      return converter.jpeg({ 
        quality,
        mozjpeg: true,
        optimizeScans: true,
        trellisQuantisation: true
      }).toBuffer()
    default:
      throw new Error(`Unsupported format: ${format}`)
  }
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

    // Type guard for file
    if (!(file instanceof Blob)) {
      return NextResponse.json(
        { error: 'Invalid file type' },
        { status: 400 }
      )
    }

    let buffer: Buffer
    try {
      const arrayBuffer = await file.arrayBuffer()
      buffer = Buffer.from(arrayBuffer)
      console.log('API: Buffer created, size:', buffer.length / 1024 + 'KB')
    } catch (error) {
      console.error('API: Error getting buffer:', error)
      return NextResponse.json(
        { error: 'Could not read file data' },
        { status: 400 }
      )
    }

    try {
      console.log('API: Creating sharp instance')
      let converter = sharp(buffer, {
        failOnError: false, // More permissive parsing
        limitInputPixels: false, // Remove pixel limit
        sequentialRead: true // Process image in chunks
      })

      // Get image metadata
      const metadata = await converter.metadata()
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
          console.log('API: Resizing large image:', {
            originalWidth: metadata.width,
            originalHeight: metadata.height,
            newWidth: Math.round(metadata.width * scale),
            newHeight: Math.round(metadata.height * scale)
          })
        }
      }

      // Auto-rotate based on EXIF
      converter = converter.rotate()

      // Try with initial quality
      let convertedBuffer = await convertImage(converter, format, quality)
      
      // If output is too large, try with progressively lower quality
      if (convertedBuffer.length > MAX_OUTPUT_SIZE && quality > 60) {
        console.log('API: Output too large, trying with lower quality')
        convertedBuffer = await convertImage(converter, format, 60)
      }
      
      if (convertedBuffer.length > MAX_OUTPUT_SIZE && quality > 40) {
        console.log('API: Still too large, trying with minimum quality')
        convertedBuffer = await convertImage(converter, format, 40)
      }

      if (convertedBuffer.length > MAX_OUTPUT_SIZE) {
        return NextResponse.json({
          error: 'Image too large even after compression',
          suggestion: 'Try converting to WebP format or manually reducing the image size'
        }, { status: 413 })
      }

      console.log('API: Conversion result:', {
        originalSize: buffer.length / 1024 + 'KB',
        convertedSize: convertedBuffer.length / 1024 + 'KB',
        compressionRatio: (buffer.length / convertedBuffer.length).toFixed(2) + 'x',
        format,
        finalQuality: quality
      })
      
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
