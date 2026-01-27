import cors from 'cors'
import dotenv from 'dotenv'
import express, { type NextFunction, type Request, type Response } from 'express'
import { registerRoutes } from './routes/registerRoutes'
import logger from './logger'

dotenv.config()

const app: express.Express = express()

// Middleware
app.use(cors())
app.use(express.json({ limit: '10mb' })) // Support larger batch sync requests

// Request logging
app.use((req: Request, _res: Response, next: NextFunction) => {
    logger.info({ method: req.method, url: req.url }, 'Incoming request')
    next()
})

// Health check endpoint
app.get('/health', (_req: Request, res: Response) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
    })
})

// Register all API routes
registerRoutes(app)

// 404 handler
app.use((_req: Request, res: Response) => {
    res.status(404).json({
        success: false,
        message: 'Route not found',
        statusCode: 404,
    })
})

// Global error handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    logger.error({ error: err }, 'Unhandled error')
    res.status(500).json({
        success: false,
        message: 'Internal server error',
        statusCode: 500,
    })
})

const port = Number(process.env.PORT) || 3000

app.listen(port, () => {
    logger.info({ port }, 'Server started successfully')
    logger.info('Offline-first backend ready for sync operations')
})

export default app
