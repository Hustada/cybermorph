import { NextRequest, NextResponse } from 'next/server'
import sharp from 'sharp'
import { cookies } from 'next/headers'
import { uploadToCloudinary } from '@/utils/cloudinary'

type LogData = Record<string, unknown>

// Add colored console logging
const log = {
  info: (msg: string, data?: LogData) => {
    console.log('\x1b[36m%s\x1b[0m', ' ' + msg, data ? '\n' + JSON.stringify(data, null, 2) : '')
  },
  success: (msg: string, data?: LogData) => {
    console.log('\x1b[32m%s\x1b[0m', ' ' + msg, data ? '\n' + JSON.stringify(data, null, 2) : '')
  },
  warn: (msg: string, data?: LogData) => {
    console.log('\x1b[33m%s\x1b[0m', ' ' + msg, data ? '\n' + JSON.stringify(data, null, 2) : '')
  },
  error: (msg: string, data?: LogData) => {
    console.error('\x1b[31m%s\x1b[0m', ' ' + msg, data ? '\n' + JSON.stringify(data, null, 2) : '')
  }
}

const LOCAL_MODE_COOKIE = 'local_mode'
const TARGET_SIZE = 1920
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

type SupportedFormat = 'webp' | 'png' | 'jpg' | 'jpeg'

export async function POST(request: NextRequest) {
  try {
    // Check local mode
    const cookieStore = await cookies()
    const localMode = cookieStore.get(LOCAL_MODE_COOKIE)?.value === 'true'

    // Parse form data
    const formData = await request.formData()
    const file = formData.get('file')
    const format = formData.get('format') as SupportedFormat
    const quality = parseInt(formData.get('quality')?.toString() || '80', 10)

    // Validate inputs
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
      log.error('File Too Large', { size: file.size, max: MAX_FILE_SIZE })
      return NextResponse.json(
        { error: 'File too large. Maximum size is 10MB.' },
        { status: 400 }
      )
    }

    // Get file buffer
    log.info('Converting File to Buffer')
    const buffer = Buffer.from(await file.arrayBuffer())

    // Process based on mode
    if (localMode) {
      return await handleLocalProcessing(buffer, format, quality)
    } else {
      return await handleCloudProcessing(buffer, format, quality)
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    log.error('Conversion Error:', { error: errorMessage })
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

    // Calculate dimensions
    let scale = 1
    if (metadata.width > TARGET_SIZE || metadata.height > TARGET_SIZE) {
      if (metadata.width > metadata.height) {
        scale = TARGET_SIZE / metadata.width
      } else {
        scale = TARGET_SIZE / metadata.height
      }
    }

    // Resize if necessary
    if (scale < 1) {
      converter = converter.resize(
        Math.round(metadata.width * scale),
        Math.round(metadata.height * scale),
        { kernel: 'lanczos3' }
      )
    }

    // Convert to target format
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
          mozjpeg: true
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

    return new NextResponse(outputBuffer, {
      headers: {
        'Content-Type': `image/${format}`,
        'Content-Length': outputBuffer.length.toString()
      }
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    log.error('Local Processing Error:', { error: errorMessage })
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

    return NextResponse.json({
      url: result.secure_url,
      format: result.format,
      width: result.width,
      height: result.height,
      size: result.bytes,
      publicId: result.public_id
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    log.error('Cloud Processing Error:', { error: errorMessage })
    return NextResponse.json(
      { error: 'Failed to process image in cloud' },
      { status: 500 }
    )
  }
}
