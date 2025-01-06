import { NextRequest, NextResponse } from 'next/server'
import { S3Client } from '@aws-sdk/client-s3'
import { createPresignedPost } from '@aws-sdk/s3-presigned-post'
import { v4 as uuidv4 } from 'uuid'
import { logger } from '@/utils/logger'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    logger.info('Received large file conversion request')
    
    // Debug: Log all AWS-related env vars
    logger.info('AWS Environment Variables', {
      region: process.env.AWS_REGION,
      bucket: process.env.AWS_BUCKET_NAME,
      hasAccessKey: !!process.env.AWS_ACCESS_KEY_ID,
      hasSecretKey: !!process.env.AWS_SECRET_ACCESS_KEY
    })
    
    const { filename, contentType } = await request.json()

    if (!filename || !contentType) {
      logger.warn('Missing file details')
      return NextResponse.json(
        { error: 'Missing file details' },
        { status: 400 }
      )
    }

    if (!process.env.AWS_BUCKET_NAME || !process.env.AWS_REGION) {
      logger.error('Missing AWS configuration', {
        bucket: !!process.env.AWS_BUCKET_NAME,
        region: !!process.env.AWS_REGION
      })
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      )
    }

    const client = new S3Client({
      region: process.env.AWS_REGION,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ''
      }
    })
    const key = `uploads/${uuidv4()}-${filename}`

    const { url, fields } = await createPresignedPost(client, {
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: key,
      Conditions: [
        ['content-length-range', 0, 100 * 1024 * 1024], // up to 100 MB
        ['starts-with', '$Content-Type', contentType],
      ],
      Fields: {
        acl: 'public-read',
        'Content-Type': contentType,
      },
      Expires: 600, // 10 minutes
    })

    logger.success('Generated presigned POST', { key })
    return NextResponse.json({ url, fields, key })

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
