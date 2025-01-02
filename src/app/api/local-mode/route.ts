import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

const LOCAL_MODE_COOKIE = 'local_mode'
const LOCAL_MODE_PASSWORD = process.env.LOCAL_MODE_PASSWORD || 'cybermorph'

export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json()

    if (password !== LOCAL_MODE_PASSWORD) {
      return NextResponse.json(
        { error: 'Invalid password' },
        { status: 401 }
      )
    }

    // Set cookie for local mode
    const cookieStore = cookies()
    cookieStore.set(LOCAL_MODE_COOKIE, 'true', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24 // 24 hours
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to enable local mode' },
      { status: 500 }
    )
  }
}

export async function DELETE() {
  try {
    // Delete the local mode cookie
    const cookieStore = cookies()
    cookieStore.delete(LOCAL_MODE_COOKIE)
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to disable local mode' },
      { status: 500 }
    )
  }
}

export function isLocalModeEnabled(): boolean {
  const cookieStore = cookies()
  return cookieStore.has(LOCAL_MODE_COOKIE)
}
