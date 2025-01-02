import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

const LOCAL_MODE_COOKIE = 'local_mode'

export async function GET() {
  try {
    const cookieStore = await cookies()
    const localMode = cookieStore.get(LOCAL_MODE_COOKIE)?.value === 'true'

    return NextResponse.json({ localMode })
  } catch {
    return NextResponse.json({ localMode: false })
  }
}
