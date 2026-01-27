import type { Response } from 'express';

export interface ServiceResponse<T = unknown> {
    success: boolean;
    message: string;
    responseObject?: T;
    statusCode: number;
}

export class ServiceResponseBuilder {
    static success<T>(message: string, data: T, statusCode: number = 200): ServiceResponse<T> {
        return {
            success: true,
            message,
            responseObject: data,
            statusCode,
        };
    }

    static error<T = unknown>(message: string, statusCode: number = 500): ServiceResponse<T> {
        return {
            success: false,
            message,
            statusCode,
        } as ServiceResponse<T>;
    }

    static notFound<T = unknown>(resource: string): ServiceResponse<T> {
        return this.error<T>(`${resource} not found`, 404);
    }

    static validationError<T = unknown>(message: string, error?: any): ServiceResponse<T> {
        return this.error<T>(message, 400);
    }

    static conflict<T = unknown>(message: string): ServiceResponse<T> {
        return this.error<T>(message, 409);
    }

    static internalError<T = unknown>(message: string = 'Internal server error'): ServiceResponse<T> {
        return this.error<T>(message, 500);
    }
}

export function handleServiceResponse<T>(
    res: Response,
    serviceResponse: ServiceResponse<T>
): Response {
    return res.status(serviceResponse.statusCode).json({
        success: serviceResponse.success,
        message: serviceResponse.message,
        responseObject: serviceResponse.responseObject,
        statusCode: serviceResponse.statusCode,
    });
}
