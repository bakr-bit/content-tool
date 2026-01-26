export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode = 500, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    Object.setPrototypeOf(this, AppError.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 400);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(`${resource} not found`, 404);
  }
}

export class ExternalServiceError extends AppError {
  public readonly service: string;

  constructor(service: string, message: string) {
    super(`${service} error: ${message}`, 502);
    this.service = service;
  }
}

export class RateLimitError extends AppError {
  public readonly retryAfter?: number;

  constructor(service: string, retryAfter?: number) {
    super(`Rate limited by ${service}`, 429);
    this.retryAfter = retryAfter;
  }
}

export class LLMError extends AppError {
  public readonly provider: string;

  constructor(provider: string, message: string) {
    super(`LLM error (${provider}): ${message}`, 500);
    this.provider = provider;
  }
}

export class EmbeddingError extends AppError {
  public readonly provider: string;

  constructor(provider: string, message: string) {
    super(`Embedding error (${provider}): ${message}`, 500);
    this.provider = provider;
  }
}

export class VectorStoreError extends AppError {
  public readonly operation: string;

  constructor(operation: string, message: string) {
    super(`Vector store error (${operation}): ${message}`, 500);
    this.operation = operation;
  }
}
