// src/infrastructure/rabbitmq/exceptions/rabbitmq.exception.ts
export class RabbitMQException extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RabbitMQException';
  }
}
