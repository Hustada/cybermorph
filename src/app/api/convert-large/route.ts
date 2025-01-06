import { NextRequest, NextResponse } from 'next/server'
import { getPresignedUploadUrl } from '@/utils/aws'
import { logger } from '@/utils/logger'

export async function POST(request: NextRequest) {
  try {
    logger.info('Received large file conversion request')
    
    // Parse the request
    const { fileName, fileType } = await request.json()
    logger.debug('Request details', { fileName, fileType })

    if (!fileName || !fileType) {
      logger.warn('Missing required fields', { fileName, fileType })
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Get presigned URL for S3 upload
    const { url, key } = await getPresignedUploadUrl(fileName, fileType)
    logger.success('Generated upload URL', { key })

    return NextResponse.json({
      uploadUrl: url,
      key: key,
    })
  } catch (error) {
    logger.error('Error handling large file request', { error })
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    )
  }
}
