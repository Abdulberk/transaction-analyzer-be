// src/infrastructure/rabbitmq/interfaces/rabbitmq.interface.ts
export interface RabbitMQMessage<T> {
  content: T;
  timestamp: number;
  messageId: string;
}

export interface RabbitMQExchanges {
  transaction: string;
  merchant: string;
  pattern: string;
}

export interface RabbitMQQueues {
  transactionAnalysis: string;
  merchantNormalization: string;
  patternDetection: string;
}
