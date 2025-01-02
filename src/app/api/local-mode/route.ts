import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

const LOCAL_MODE_COOKIE = 'local_mode'
const LOCAL_MODE_PASSWORD = process.env.LOCAL_MODE_PASSWORD

if (!LOCAL_MODE_PASSWORD) {
  throw new Error('LOCAL_MODE_PASSWORD environment variable is not set')
}

export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json()

    if (password !== LOCAL_MODE_PASSWORD) {
      return NextResponse.json(
        { error: 'Invalid password' },
        { status: 401 }
      )
    }

    // Set cookie
    const cookieStore = await cookies()
    await cookieStore.set(LOCAL_MODE_COOKIE, 'true', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 // 24 hours
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error enabling local mode:', error)
    return NextResponse.json(
      { error: 'Failed to enable local mode' },
      { status: 500 }
    )
  }
}

export async function DELETE() {
  try {
    const cookieStore = await cookies()
    await cookieStore.delete(LOCAL_MODE_COOKIE)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error disabling local mode:', error)
    return NextResponse.json(
      { error: 'Failed to disable local mode' },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    const cookieStore = await cookies()
    const cookie = await cookieStore.get(LOCAL_MODE_COOKIE)
    const isEnabled = cookie !== undefined
    return NextResponse.json({ isEnabled })
  } catch (error) {
    console.error('Error checking local mode:', error)
    return NextResponse.json(
      { error: 'Failed to check local mode status' },
      { status: 500 }
    )
  }
}
