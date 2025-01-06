type LogData = Record<string, unknown>

// Add colored console logging
export const logger = {
  info: (msg: string, data?: LogData) => {
    console.log('\x1b[36m%s\x1b[0m', '🔵 ' + msg, data ? '\n' + JSON.stringify(data, null, 2) : '')
  },
  success: (msg: string, data?: LogData) => {
    console.log('\x1b[32m%s\x1b[0m', '✅ ' + msg, data ? '\n' + JSON.stringify(data, null, 2) : '')
  },
  warn: (msg: string, data?: LogData) => {
    console.log('\x1b[33m%s\x1b[0m', '⚠️ ' + msg, data ? '\n' + JSON.stringify(data, null, 2) : '')
  },
  error: (msg: string, data?: LogData) => {
    console.error('\x1b[31m%s\x1b[0m', '❌ ' + msg, data ? '\n' + JSON.stringify(data, null, 2) : '')
  },
  debug: (msg: string, data?: LogData) => {
    if (process.env.NODE_ENV === 'development') {
      console.log('\x1b[35m%s\x1b[0m', '🔍 ' + msg, data ? '\n' + JSON.stringify(data, null, 2) : '')
    }
  }
}
