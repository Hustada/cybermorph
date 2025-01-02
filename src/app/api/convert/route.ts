import { NextRequest, NextResponse } from 'next/server'
import sharp from 'sharp'
import { cookies } from 'next/headers'
import { uploadToCloudinary } from '@/utils/cloudinary'
import { Readable } from 'stream'

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
    const localModeCookie = cookieStore.get(LOCAL_MODE_COOKIE)
    const localMode = localModeCookie?.value === 'true'
    
    log.info('Mode Check', { 
      cookieExists: !!localModeCookie,
      cookieValue: localModeCookie?.value,
      localMode,
      cookieName: LOCAL_MODE_COOKIE
    })

    // Parse form data
    const formData = await request.formData()
    const file = formData.get('file')
    const format = (formData.get('format')?.toString() || 'webp') as SupportedFormat
    const quality = parseInt(formData.get('quality')?.toString() || '80', 10)

    // Validate inputs
    if (!file) {
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

    // Add file size validation
    if (file.size > MAX_FILE_SIZE) {
      log.error('File Too Large', { size: file.size, maxSize: MAX_FILE_SIZE })
      return NextResponse.json(
        { error: `File size must be less than ${MAX_FILE_SIZE / (1024 * 1024)}MB` },
        { status: 400 }
      )
    }

    // Get file buffer
    log.info('Converting File to Buffer')
    const buffer = Buffer.from(await file.arrayBuffer())

    // Process based on mode
    log.info(`Processing Mode: ${localMode ? 'Local' : 'Cloud'}`)
    
    if (localMode) {
      return await handleLocalProcessing(buffer, format, quality)
    } else {
      const stream = new Readable()
      stream.push(buffer)
      stream.push(null)
      return await handleCloudProcessing(stream, format, quality)
    }
  } catch (error) {
    log.error('Conversion Error:', { error })
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    )
  }
}

async function handleLocalProcessing(buffer: Buffer, format: SupportedFormat, quality: number) {
  log.info('=== Starting Local Processing ===')
  try {
    log.info('Processing with Sharp', { format, quality })
    let sharpInstance = sharp(buffer)

    // Apply format-specific processing
    switch (format) {
      case 'webp':
        sharpInstance = sharpInstance.webp({ quality })
        break
      case 'png':
        sharpInstance = sharpInstance.png({ quality })
        break
      case 'jpg':
      case 'jpeg':
        sharpInstance = sharpInstance.jpeg({ quality })
        break
      default:
        log.error('Unsupported Format', { format })
        return NextResponse.json(
          { error: 'Unsupported format' },
          { status: 400 }
        )
    }

    const processedBuffer = await sharpInstance.toBuffer()
    const metadata = await sharp(processedBuffer).metadata()

    log.success('Local Processing Complete', {
      format: metadata.format,
      size: `${(processedBuffer.length / 1024).toFixed(2)}KB`,
      dimensions: `${metadata.width}x${metadata.height}`
    })

    // Convert buffer to base64 for response
    const base64 = processedBuffer.toString('base64')
    return NextResponse.json({
      data: `data:image/${format};base64,${base64}`,
      format: metadata.format,
      size: processedBuffer.length,
      width: metadata.width,
      height: metadata.height
    })
  } catch (error) {
    log.error('Local Processing Error', { error })
    return NextResponse.json(
      { error: 'Failed to process image locally' },
      { status: 500 }
    )
  }
}

async function handleCloudProcessing(stream: Readable, format: SupportedFormat, quality: number) {
  log.info('=== Starting Cloud Processing ===')
  try {
    log.info('Uploading to Cloudinary', { format, quality })
    const result = await uploadToCloudinary(stream, {
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
      size: result.bytes,
      width: result.width,
      height: result.height
    })
  } catch (error) {
    log.error('Cloud Processing Error', { error })
    return NextResponse.json(
      { error: 'Failed to process image in cloud' },
      { status: 500 }
    )
  }
}
