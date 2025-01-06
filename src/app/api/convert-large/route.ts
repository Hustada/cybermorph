import { NextRequest, NextResponse } from 'next/server'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { v2 as cloudinary } from 'cloudinary'
import { logger } from '@/lib/logger'

const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!
  }
})

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
})

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb'
    }
  }
}

export async function POST(request: NextRequest) {
  const headers = {
    'Cache-Control': 'no-store, must-revalidate'
  }

  try {
    logger.info('🔵 Received large file conversion request')

    // Log environment status
    logger.info('🔍 Environment check', {
      aws: {
        hasRegion: !!process.env.AWS_REGION,
        hasAccessKey: !!process.env.AWS_ACCESS_KEY_ID,
        hasSecretKey: !!process.env.AWS_SECRET_ACCESS_KEY,
        hasBucket: !!process.env.AWS_BUCKET_NAME,
        region: process.env.AWS_REGION
      },
      cloudinary: {
        hasCloudName: !!process.env.CLOUDINARY_CLOUD_NAME,
        hasApiKey: !!process.env.CLOUDINARY_API_KEY,
        hasApiSecret: !!process.env.CLOUDINARY_API_SECRET
      }
    })

    const formData = await request.formData()
    const file = formData.get('file')

    if (!file || !(file instanceof File)) {
      logger.error('❌ No file provided')
      return NextResponse.json({ error: 'No file provided' }, { status: 400, headers })
    }

    logger.info('🔍 Request details', {
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size
    })

    // Generate S3 key
    const key = `uploads/${Date.now()}-${file.name}`
    const buffer = await file.arrayBuffer()

    // Upload to S3
    try {
      await s3Client.send(new PutObjectCommand({
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: key,
        Body: Buffer.from(buffer),
        ContentType: file.type
      }))
      logger.info('✅ File uploaded to S3', { key })
    } catch (error) {
      logger.error('❌ S3 upload error', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      })
      throw error
    }

    return NextResponse.json({ key }, { headers })
  } catch (error) {
    logger.error('❌ Error handling large file request', {
      error: error instanceof Error ? {
        message: error.message,
        stack: error.stack,
        name: error.name
      } : error
    })

    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Unknown error',
        type: error?.constructor?.name
      },
      { status: 500, headers }
    )
  }
}
