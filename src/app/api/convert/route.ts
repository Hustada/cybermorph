import { NextRequest, NextResponse } from 'next/server'
import sharp from 'sharp'
import { cookies } from 'next/headers'
import { uploadToCloudinary } from '@/utils/cloudinary'

// Add colored console logging
const log = {
  info: (msg: string, data?: any) => {
    console.log('\x1b[36m%s\x1b[0m', ' ' + msg, data ? '\n' + JSON.stringify(data, null, 2) : '')
  },
  success: (msg: string, data?: any) => {
    console.log('\x1b[32m%s\x1b[0m', ' ' + msg, data ? '\n' + JSON.stringify(data, null, 2) : '')
  },
  warn: (msg: string, data?: any) => {
    console.log('\x1b[33m%s\x1b[0m', ' ' + msg, data ? '\n' + JSON.stringify(data, null, 2) : '')
  },
  error: (msg: string, data?: any) => {
    console.error('\x1b[31m%s\x1b[0m', ' ' + msg, data ? '\n' + JSON.stringify(data, null, 2) : '')
  }
}

type SupportedFormat = 'webp' | 'png' | 'jpg' | 'jpeg'

const LOCAL_MODE_COOKIE = 'local_mode'
const TARGET_SIZE = 1920
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

// Configure Sharp for better performance
sharp.cache(false)
sharp.concurrency(1)

export async function POST(request: NextRequest) {
  log.info('=== Starting New Image Conversion Request ===')
  try {
    // Get form data
    const formData = await request.formData()
    const file = formData.get('file')
    const format = formData.get('format')?.toString().toLowerCase() as SupportedFormat
    const quality = Number(formData.get('quality')) || 80
    
    // Get cookie store and check local mode
    const cookieStore = await cookies()
    const cookie = await cookieStore.get(LOCAL_MODE_COOKIE)
    const useLocalProcessing = cookie !== undefined

    log.info('Request Details:', {
      format,
      quality,
      mode: useLocalProcessing ? 'local' : 'cloud',
      fileSize: file instanceof File ? `${(file.size / 1024 / 1024).toFixed(2)}MB` : 'N/A',
      fileName: file instanceof File ? file.name : 'N/A'
    })

    if (!file || !format) {
      log.error('Missing Required Fields')
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Validate file
    if (!(file instanceof File)) {
      log.error('Invalid File Type')
      return NextResponse.json(
        { error: 'Invalid file' },
        { status: 400 }
      )
    }

    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      log.warn('File Too Large', { 
        size: `${(file.size / 1024 / 1024).toFixed(2)}MB`,
        maxSize: `${MAX_FILE_SIZE / 1024 / 1024}MB` 
      })
      return NextResponse.json(
        { 
          error: 'File too large',
          suggestion: 'File size must be less than 10MB'
        },
        { status: 413 }
      )
    }

    // Get file buffer
    log.info('Converting File to Buffer')
    const buffer = Buffer.from(await file.arrayBuffer())

    // Process based on mode
    log.info(`Using ${useLocalProcessing ? 'Local' : 'Cloud'} Processing`)
    if (useLocalProcessing) {
      return await handleLocalProcessing(buffer, format, quality)
    } else {
      return await handleCloudProcessing(buffer, format, quality)
    }
  } catch (error) {
    log.error('Conversion Error:', error)
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    )
  }
}

async function handleLocalProcessing(buffer: Buffer, format: SupportedFormat, quality: number) {
  log.info('=== Starting Local Processing ===')
  try {
    let converter = sharp(buffer, {
      failOnError: false,
      sequentialRead: true
    })

    // Verify image and get metadata
    log.info('Getting Image Metadata')
    const metadata = await converter.metadata()
    if (!metadata.width || !metadata.height) {
      log.error('Invalid Image Metadata')
      return NextResponse.json(
        { error: 'Invalid image file' },
        { status: 400 }
      )
    }

    log.info('Image Dimensions', {
      width: metadata.width,
      height: metadata.height,
      format: metadata.format
    })

    // Resize if too large
    const maxDimension = Math.max(metadata.width, metadata.height)
    if (maxDimension > TARGET_SIZE) {
      log.info('Resizing Image', {
        from: maxDimension,
        to: TARGET_SIZE,
        scale: TARGET_SIZE / maxDimension
      })
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
    log.info('Converting Format', { targetFormat: format, quality })
    let outputBuffer: Buffer
    switch (format) {
      case 'webp':
        outputBuffer = await converter.webp({ 
          quality,
          effort: 4,
          smartSubsample: true
        }).toBuffer()
        break
      case 'png':
        outputBuffer = await converter.png({ 
          compressionLevel: 9,
          palette: true,
          quality
        }).toBuffer()
        break
      case 'jpg':
      case 'jpeg':
        outputBuffer = await converter.jpeg({ 
          quality,
          mozjpeg: true,
          chromaSubsampling: '4:4:4'
        }).toBuffer()
        break
      default:
        log.error('Unsupported Format', { format })
        return NextResponse.json(
          { error: 'Unsupported format' },
          { status: 400 }
        )
    }

    log.success('Local Processing Complete', {
      inputSize: `${(buffer.length / 1024).toFixed(2)}KB`,
      outputSize: `${(outputBuffer.length / 1024).toFixed(2)}KB`,
      compressionRatio: `${((1 - outputBuffer.length / buffer.length) * 100).toFixed(1)}%`,
      format,
      quality
    })

    // Return the converted image with proper headers
    return new NextResponse(outputBuffer, {
      headers: {
        'Content-Type': format === 'jpg' ? 'image/jpeg' : `image/${format}`,
        'Content-Length': outputBuffer.length.toString(),
        'Cache-Control': 'public, max-age=31536000'
      }
    })
  } catch (error) {
    log.error('Local Processing Error:', error)
    return NextResponse.json(
      { error: 'Failed to process image locally' },
      { status: 500 }
    )
  }
}

async function handleCloudProcessing(buffer: Buffer, format: SupportedFormat, quality: number) {
  log.info('=== Starting Cloud Processing ===')
  try {
    log.info('Uploading to Cloudinary', { format, quality })
    const result = await uploadToCloudinary(buffer, {
      targetFormat: format,
      quality,
      maxWidth: TARGET_SIZE,
      maxHeight: TARGET_SIZE
    })

    log.success('Cloud Processing Complete', {
      url: result.secure_url,
      format: result.format,
      size: `${(result.bytes / 1024).toFixed(2)}KB`,
      dimensions: `${result.width}x${result.height}`
    })

    // Return the processed image URL and details
    return NextResponse.json({
      url: result.secure_url,
      format: result.format,
      width: result.width,
      height: result.height,
      size: result.bytes,
      publicId: result.public_id
    })
  } catch (error) {
    log.error('Cloud Processing Error:', error)
    return NextResponse.json(
      { error: 'Failed to process image in cloud' },
      { status: 500 }
    )
  }
}
