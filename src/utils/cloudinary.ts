import { v2 as cloudinary } from 'cloudinary'
import { Readable } from 'stream'

// Verify environment variables
const requiredEnvVars = [
  'CLOUDINARY_CLOUD_NAME',
  'CLOUDINARY_API_KEY',
  'CLOUDINARY_API_SECRET'
] as const

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`${envVar} environment variable is not set`)
  }
}

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
  api_key: process.env.CLOUDINARY_API_KEY!,
  api_secret: process.env.CLOUDINARY_API_SECRET!,
})

interface CloudinaryUploadOptions {
  targetFormat: string
  quality?: number
  maxWidth?: number
  maxHeight?: number
}

interface CloudinaryUploadResult {
  secure_url: string
  format: string
  bytes: number
  width: number
  height: number
  public_id: string
}

export async function uploadToCloudinary(
  stream: Readable,
  options: CloudinaryUploadOptions
): Promise<CloudinaryUploadResult> {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        format: options.targetFormat,
        quality: options.quality || 'auto',
        width: options.maxWidth,
        height: options.maxHeight,
        crop: 'limit',
        folder: 'cybermorph',
        resource_type: 'auto',
        timeout: 120000, // 2 minutes timeout
        transformation: [
          {
            quality: options.quality || 'auto',
            fetch_format: 'auto',
            dpr: 'auto',
            crop: 'limit',
            width: options.maxWidth,
            height: options.maxHeight
          }
        ]
      },
      (error, result) => {
        if (error) {
          console.error('Cloudinary upload error:', error)
          reject(error)
        } else if (result) {
          resolve(result as CloudinaryUploadResult)
        } else {
          reject(new Error('No result from Cloudinary'))
        }
      }
    )

    stream.pipe(uploadStream)
  })
}

export function getCloudinaryUrl(publicId: string, options: CloudinaryUploadOptions): string {
  return cloudinary.url(publicId, {
    format: options.targetFormat,
    quality: options.quality || 'auto',
    fetch_format: 'auto',
    ...(options.maxWidth && { width: options.maxWidth }),
    ...(options.maxHeight && { height: options.maxHeight }),
    crop: 'limit'
  })
}
