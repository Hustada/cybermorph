import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

const LOCAL_MODE_COOKIE = 'local_mode'

export async function GET() {
  try {
    const cookieStore = await cookies()
    const localModeCookie = cookieStore.get(LOCAL_MODE_COOKIE)
    const localMode = localModeCookie?.value === 'true'
    
    console.log('Local Mode Status:', { 
      cookieExists: !!localModeCookie,
      cookieValue: localModeCookie?.value,
      localMode 
    })

    return NextResponse.json({ isEnabled: localMode })
  } catch (error) {
    console.error('Error checking local mode:', error)
    return NextResponse.json({ isEnabled: false })
  }
}
