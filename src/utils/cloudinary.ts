import { v2 as cloudinary } from 'cloudinary'

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
  buffer: Buffer,
  options: CloudinaryUploadOptions
): Promise<CloudinaryUploadResult> {
  try {
    // Convert buffer to base64
    const base64Data = buffer.toString('base64')
    const dataURI = `data:image/jpeg;base64,${base64Data}`

    // Prepare transformation options
    const transformationOptions = {
      format: options.targetFormat,
      quality: options.quality || 'auto',
      fetch_format: 'auto',
      ...(options.maxWidth && { width: options.maxWidth }),
      ...(options.maxHeight && { height: options.maxHeight }),
      crop: 'limit'
    }

    // Upload to Cloudinary with Promise wrapper
    return new Promise((resolve, reject) => {
      cloudinary.uploader.upload(
        dataURI,
        {
          transformation: [transformationOptions],
          folder: 'cybermorph',
          resource_type: 'auto',
          timeout: 60000 // 60 seconds timeout
        },
        (error, result) => {
          if (error) {
            console.error('Cloudinary upload error:', error)
            reject(new Error(error.message))
          } else if (result) {
            resolve(result as CloudinaryUploadResult)
          } else {
            reject(new Error('No result from Cloudinary'))
          }
        }
      )
    })
  } catch (error) {
    console.error('Cloudinary upload error:', error)
    throw error instanceof Error ? error : new Error('Failed to upload to Cloudinary')
  }
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
