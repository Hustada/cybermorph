import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

const LOCAL_MODE_COOKIE = 'local_mode'

export async function GET() {
  try {
    const cookieStore = cookies()
    const isEnabled = cookieStore.has(LOCAL_MODE_COOKIE)
    return NextResponse.json({ isEnabled })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to check local mode status' },
      { status: 500 }
    )
  }
}
