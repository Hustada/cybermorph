import { NextRequest, NextResponse } from 'next/server'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { logger } from '@/utils/logger'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
})

export async function POST(request: NextRequest) {
  try {
    logger.info('Received large file conversion request')
    
    // Log environment variables
    logger.info('Environment check', {
      aws: {
        region: process.env.AWS_REGION || 'us-east-1',
        bucket: process.env.AWS_BUCKET_NAME,
        hasAccessKey: !!process.env.AWS_ACCESS_KEY_ID,
        hasSecretKey: !!process.env.AWS_SECRET_ACCESS_KEY
      }
    })

    const formData = await request.formData()
    const file = formData.get('file')

    if (!file || !(file instanceof File)) {
      logger.warn('Missing or invalid file')
      return NextResponse.json(
        { error: 'Missing or invalid file' },
        { status: 400 }
      )
    }

    if (file.size > MAX_FILE_SIZE) {
      logger.warn('File too large', { size: file.size, maxSize: MAX_FILE_SIZE })
      return NextResponse.json(
        { error: 'File too large. Maximum size is 10MB' },
        { status: 413 }
      )
    }

    if (!process.env.AWS_BUCKET_NAME) {
      logger.error('AWS_BUCKET_NAME not configured')
      return NextResponse.json(
        { error: 'Server configuration error: AWS_BUCKET_NAME not set' },
        { status: 500 }
      )
    }

    logger.info('Request details', { 
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size
    })

    // Generate a unique key for the file
    const key = `uploads/${Date.now()}-${file.name}`

    const command = new PutObjectCommand({
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: key,
      ContentType: file.type,
    })

    const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 })
    logger.success('Generated presigned URL', { key })

    return NextResponse.json({ uploadUrl, key })

  } catch (error) {
    logger.error('Error handling large file request', { 
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    })
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process request' },
      { status: 500 }
    )
  }
}
