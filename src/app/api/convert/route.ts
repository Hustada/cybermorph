import { NextRequest, NextResponse } from 'next/server'
import sharp from 'sharp'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file')
    const format = formData.get('format') as string

    console.log('API: Received file:', {
      type: file?.constructor?.name,
      isBlob: file instanceof Blob,
      isFile: file instanceof File,
      hasArrayBuffer: typeof (file as any)?.arrayBuffer === 'function'
    })

    if (!file || !format) {
      return NextResponse.json(
        { error: 'File and format are required' },
        { status: 400 }
      )
    }

    // Get file data as buffer
    let buffer: Buffer
    try {
      if (typeof (file as any)?.arrayBuffer === 'function') {
        // Handle File or Blob
        const arrayBuffer = await (file as Blob).arrayBuffer()
        buffer = Buffer.from(arrayBuffer)
      } else if (typeof file === 'string') {
        // Handle base64 or data URL
        const base64Data = file.split(';base64,').pop()
        if (base64Data) {
          buffer = Buffer.from(base64Data, 'base64')
        } else {
          // Handle raw string data
          buffer = Buffer.from(file)
        }
      } else {
        throw new Error('Unsupported file format')
      }

      console.log('API: Buffer created, size:', buffer.length)
    } catch (error) {
      console.error('API: Error getting buffer:', error)
      return NextResponse.json(
        { error: 'Could not read file data' },
        { status: 400 }
      )
    }
    
    try {
      console.log('API: Creating sharp instance')
      let converter = sharp(buffer)

      console.log('API: Converting to format:', format)
      switch (format) {
        case 'webp':
          converter = converter.webp({ quality: 80 })
          break
        case 'png':
          converter = converter.png({ quality: 80 })
          break
        case 'jpg':
        case 'jpeg':
          converter = converter.jpeg({ quality: 80 })
          break
        default:
          return NextResponse.json(
            { error: 'Unsupported format' },
            { status: 400 }
          )
      }

      const convertedBuffer = await converter.toBuffer()
      console.log('API: Conversion successful, size:', convertedBuffer.length)
      
      return new NextResponse(convertedBuffer, {
        headers: {
          'Content-Type': `image/${format}`,
          'Cache-Control': 'public, max-age=31536000',
        },
      })
    } catch (error) {
      console.error('API: Error processing image:', error)
      return NextResponse.json(
        { 
          error: 'Error processing image',
          details: error instanceof Error ? error.message : String(error)
        },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('API: Error in route:', error)
    return NextResponse.json(
      { 
        error: 'Server error',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}
