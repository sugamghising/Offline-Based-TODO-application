import pino, { type LoggerOptions } from 'pino'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const level = process.env.LOG_LEVEL ?? 'info'

// Get current directory
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Create logs directory path
const logsDir = join(dirname(__dirname), '..', 'logs')

const baseOptions: LoggerOptions = { level }

function buildLogger() {
    try {
        const targets = []

        // File transport - always log to file
        targets.push({
            level,
            target: 'pino/file',
            options: {
                destination: join(logsDir, 'combined.log'),
                mkdir: true,
            },
        })

        // Error file transport
        targets.push({
            level: 'error',
            target: 'pino/file',
            options: {
                destination: join(logsDir, 'error.log'),
                mkdir: true,
            },
        })

        // Console transport for development
        if (process.env.NODE_ENV !== 'production') {
            targets.push({
                level,
                target: 'pino-pretty',
                options: {
                    colorize: true,
                    translateTime: 'HH:MM:ss.l',
                    ignore: 'pid,hostname',
                },
            })
        }

        return pino(
            { ...baseOptions, transport: { targets } }
        )
    } catch (error) {
        console.error('Failed to initialize logger:', error)
        return pino(baseOptions)
    }
}

const logger = buildLogger()

export default logger
