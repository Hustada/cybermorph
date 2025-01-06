import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { logger } from './logger'

// Initialize S3 client
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
})

// Set threshold lower than Vercel's limit to ensure we use S3 for larger files
export const MAX_FILE_SIZE = 4 * 1024 * 1024 // 4MB - Vercel's limit

export async function getPresignedUploadUrl(fileName: string, contentType: string) {
  if (!process.env.AWS_BUCKET_NAME) {
    throw new Error('AWS_BUCKET_NAME not configured')
  }

  const key = `uploads/${Date.now()}-${fileName}`
  logger.info('Generating presigned URL', { fileName, contentType, key })

  const command = new PutObjectCommand({
    Bucket: process.env.AWS_BUCKET_NAME,
    Key: key,
    ContentType: contentType,
  })

  try {
    const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 })
    logger.success('Generated presigned URL', { 
      key,
      uploadUrl: uploadUrl.substring(0, 100) + '...' // Log only part of the URL for security
    })
    return { uploadUrl, key }
  } catch (error) {
    logger.error('Failed to generate presigned URL', { 
      error: error instanceof Error ? error.message : 'Unknown error',
      fileName,
      key
    })
    throw error
  }
}

export function isLargeFile(file: File): boolean {
  const isLarge = file.size > MAX_FILE_SIZE
  logger.debug('Checking file size', { 
    fileName: file.name,
    fileSize: file.size,
    maxSize: MAX_FILE_SIZE,
    isLarge 
  })
  return isLarge
}
