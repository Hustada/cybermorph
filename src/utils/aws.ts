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

export const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB - same as current limit

export async function getPresignedUploadUrl(fileName: string, contentType: string) {
  logger.info('Generating presigned URL', { fileName, contentType })
  
  const key = `uploads/${Date.now()}-${fileName}`
  
  const command = new PutObjectCommand({
    Bucket: process.env.AWS_BUCKET_NAME,
    Key: key,
    ContentType: contentType,
  })

  try {
    const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 })
    logger.success('Generated presigned URL', { key })
    return {
      url: signedUrl,
      key,
    }
  } catch (error) {
    logger.error('Failed to generate presigned URL', { error, fileName })
    throw new Error('Failed to generate upload URL')
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
