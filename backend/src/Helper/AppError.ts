// Domain errors. Each one carries its HTTP statusCode; the ErrorMiddleware
// translates it into the response. Controllers/services throw these — never a
// scattered `res.status(...)`.
export abstract class DomainError extends Error {
  abstract readonly statusCode: number;

  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

export class NotFound extends DomainError {
  readonly statusCode = 404;
  constructor(message = "Recurso não encontrado") {
    super(message);
  }
}

export class Conflict extends DomainError {
  readonly statusCode = 409;
  constructor(message = "Conflito com o estado atual do recurso") {
    super(message);
  }
}

export class ValidationError extends DomainError {
  readonly statusCode = 400;
  // Field-by-field details (e.g. Zod output), optional.
  readonly details?: unknown;
  constructor(message = "Dados inválidos", details?: unknown) {
    super(message);
    this.details = details;
  }
}

export class Unauthorized extends DomainError {
  readonly statusCode = 401;
  constructor(message = "Não autorizado") {
    super(message);
  }
}

export class Forbidden extends DomainError {
  readonly statusCode = 403;
  constructor(message = "Acesso negado") {
    super(message);
  }
}
