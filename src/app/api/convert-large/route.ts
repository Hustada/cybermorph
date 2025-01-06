import { NextRequest, NextResponse } from 'next/server'
import { getPresignedUploadUrl } from '@/utils/aws'
import { logger } from '@/utils/logger'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    logger.info('Received large file conversion request')
    
    const body = await request.json()
    logger.info('Request body', body)
    
    const { fileName, fileType } = body

    if (!fileName || !fileType) {
      logger.warn('Missing file details')
      return NextResponse.json(
        { error: 'Missing file details' },
        { status: 400 }
      )
    }

    if (!process.env.AWS_BUCKET_NAME) {
      logger.error('AWS_BUCKET_NAME not configured')
      return NextResponse.json(
        { error: 'Server configuration error: AWS_BUCKET_NAME not set' },
        { status: 500 }
      )
    }

    logger.info('Getting presigned URL', { fileName, fileType })
    const { uploadUrl, key } = await getPresignedUploadUrl(fileName, fileType)
    logger.success('Generated presigned URL', { key, uploadUrl })

    return NextResponse.json({ uploadUrl, key })

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
