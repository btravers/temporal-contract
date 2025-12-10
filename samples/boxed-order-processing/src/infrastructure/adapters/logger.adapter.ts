import type { LoggerPort } from "../../domain/ports/logger.port.js";
import { pino } from "pino";

/**
 * Pino Logger Adapter
 *
 * Concrete implementation of LoggerPort using Pino
 */
export class PinoLoggerAdapter implements LoggerPort {
  private readonly logger = pino({
    transport: {
      target: "pino-pretty",
      options: {
        colorize: true,
        translateTime: "SYS:standard",
        ignore: "pid,hostname",
      },
    },
  });

  log(level: "fatal" | "error" | "warn" | "info" | "debug" | "trace", message: string): void {
    this.logger[level](message);
  }
}
