import { NextRequest, NextResponse } from 'next/server'
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { v2, UploadApiResponse } from 'cloudinary'
import { Readable } from 'stream'
import { logger } from '@/utils/logger'

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ''
  }
})

export async function POST(request: NextRequest) {
  const headers = {
    'Cache-Control': 'no-store, must-revalidate'
  };

  try {
    logger.info('Starting large file processing')
    logger.info('Environment configured via Vercel dashboard')
    
    const formData = await request.formData()
    const file = formData.get('file')
    const format = formData.get('format')?.toString() || 'webp'
    const quality = parseInt(formData.get('quality')?.toString() || '80', 10)

    if (!file || !(file instanceof File)) {
      logger.warn('No file provided')
      return NextResponse.json({ error: 'No file provided' }, { status: 400, headers })
    }

    // Get the file buffer
    const buffer = Buffer.from(await file.arrayBuffer())

    // Upload to S3
    const key = `uploads/${Date.now()}-${file.name}`
    logger.info('Uploading to S3', { key })
    await s3Client.send(new PutObjectCommand({
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: key,
      Body: buffer,
      ContentType: file.type
    }))
    logger.success('File uploaded to S3', { key })

    // Upload to Cloudinary
    v2.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET
    })

    logger.info('Uploading to Cloudinary', { format, quality })
    const uploadResult = await new Promise<UploadApiResponse>((resolve, reject) => {
      const uploadStream = v2.uploader.upload_stream(
        {
          folder: 'cybermorph',
          format,
          quality: quality,
          transformation: [
            { width: 1920, height: 1920, crop: 'limit' }
          ]
        },
        (error, result) => {
          if (error) reject(error)
          if (result) resolve(result)
        }
      )

      const readStream = new Readable()
      readStream._read = () => {}
      readStream.push(buffer)
      readStream.push(null)
      readStream.pipe(uploadStream)
    })
    logger.success('File uploaded to Cloudinary', {
      publicId: uploadResult.public_id,
      format: uploadResult.format,
      size: uploadResult.bytes,
      width: uploadResult.width,
      height: uploadResult.height
    })

    // Cleanup: Delete file from S3
    logger.info('Cleaning up S3 file', { key })
    await s3Client.send(new DeleteObjectCommand({
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: key,
    }))
    logger.success('S3 file deleted', { key })

    return NextResponse.json({
      success: true,
      result: {
        url: uploadResult.secure_url,
        format: uploadResult.format,
        size: uploadResult.bytes,
        width: uploadResult.width,
        height: uploadResult.height
      }
    }, { headers })
  } catch (error) {
    logger.error('Process error', { 
      error: error instanceof Error ? error.message : 'Unknown error' 
    })
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500, headers }
    )
  }
}
