export class CoreError extends Error {
  readonly statusCode: number
  readonly title: string
  readonly details?: unknown

  constructor(params: {
    title: string
    message?: string
    statusCode?: number
    details?: unknown
    cause?: unknown
  }) {
    super(params.message ?? params.title, params.cause ? { cause: params.cause } : undefined)
    this.name = 'CoreError'
    this.statusCode = params.statusCode ?? 500
    this.title = params.title
    this.details = params.details
  }
}

export function isCoreError(error: unknown): error is CoreError {
  return error instanceof CoreError
}
