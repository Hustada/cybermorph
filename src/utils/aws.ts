import { S3Client } from '@aws-sdk/client-s3'
import { createPresignedPost } from '@aws-sdk/s3-presigned-post'
import { v4 as uuidv4 } from 'uuid'
import { logger } from './logger'

// Size thresholds
export const MAX_DIRECT_UPLOAD_SIZE = 4 * 1024 * 1024  // 4MB - Vercel's limit
export const MAX_S3_UPLOAD_SIZE = 100 * 1024 * 1024    // 100MB - Our S3 limit

export function isLargeFile(file: File): boolean {
  return file.size > MAX_DIRECT_UPLOAD_SIZE
}

export async function getPresignedPost(filename: string, contentType: string) {
  if (!process.env.AWS_BUCKET_NAME || !process.env.AWS_REGION) {
    throw new Error('Missing AWS configuration')
  }

  const client = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ''
    }
  })
  const key = `uploads/${uuidv4()}-${filename}`

  try {
    const { url, fields } = await createPresignedPost(client, {
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: key,
      Conditions: [
        ['content-length-range', 0, MAX_S3_UPLOAD_SIZE], // up to 100 MB
        ['starts-with', '$Content-Type', contentType],
      ],
      Fields: {
        acl: 'public-read',
        'Content-Type': contentType,
      },
      Expires: 600, // 10 minutes
    })

    logger.success('Generated presigned POST', { key })
    return { url, fields, key }
  } catch (error) {
    logger.error('Failed to generate presigned POST', {
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    throw error
  }
}
