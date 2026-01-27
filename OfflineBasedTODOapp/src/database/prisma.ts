import 'dotenv/config'

import { PrismaClient } from '../generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

import logger from '../logger'

const connectionString = process.env.DATABASE_URL

if (!connectionString) {
    logger.error('DATABASE_URL environment variable is not set')
    process.exit(1)
}

const adapter = new PrismaPg({ connectionString })
const prisma = new PrismaClient({ adapter })

prisma.$connect()
    .then(() => {
        logger.info('Database connected successfully')
    })
    .catch((error) => {
        logger.error({ error }, 'Failed to connect to database')
        process.exit(1)
    })

// Graceful shutdown
process.on('SIGINT', async () => {
    await prisma.$disconnect()
    logger.info('Database disconnected')
    process.exit(0)
})

process.on('SIGTERM', async () => {
    await prisma.$disconnect()
    logger.info('Database disconnected')
    process.exit(0)
})

export { prisma }