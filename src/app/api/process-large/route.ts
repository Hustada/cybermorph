import { NextRequest, NextResponse } from 'next/server'
import { S3Client, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { uploadToCloudinary } from '@/utils/cloudinary'
import { Readable } from 'stream'
import { logger } from '@/utils/logger'

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
})

export async function POST(request: NextRequest) {
  try {
    logger.info('Starting large file processing')
    
    const { key, format, quality } = await request.json()
    logger.debug('Process request details', { key, format, quality })

    if (!key || !format) {
      logger.warn('Missing required fields', { key, format })
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Get file from S3
    logger.info('Fetching file from S3', { key })
    const getCommand = new GetObjectCommand({
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: key,
    })

    const s3Response = await s3Client.send(getCommand)
    logger.success('File fetched from S3', { 
      contentType: s3Response.ContentType,
      contentLength: s3Response.ContentLength 
    })

    if (!s3Response.Body) {
      logger.error('No file content received from S3')
      throw new Error('No file content received from S3')
    }

    // Convert S3 readable stream
    const stream = s3Response.Body as Readable

    // Upload to Cloudinary with transformation
    logger.info('Uploading to Cloudinary', { format, quality })
    const result = await uploadToCloudinary(stream, {
      targetFormat: format,
      quality: quality || 80,
    })
    
    logger.success('File processed and uploaded to Cloudinary', {
      publicId: result.public_id,
      format: result.format,
      size: result.bytes
    })

    // Cleanup: Delete file from S3
    logger.info('Cleaning up S3 file', { key })
    const deleteCommand = new DeleteObjectCommand({
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: key,
    })
    await s3Client.send(deleteCommand)
    logger.success('S3 file deleted', { key })

    return NextResponse.json({
      success: true,
      result: {
        url: result.secure_url,
        format: result.format,
        size: result.bytes,
        width: result.width,
        height: result.height,
      }
    })

  } catch (error) {
    logger.error('Error processing large file', { error })
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    return NextResponse.json(
      { error: `Failed to process file: ${errorMessage}` },
      { status: 500 }
    )
  }
}
