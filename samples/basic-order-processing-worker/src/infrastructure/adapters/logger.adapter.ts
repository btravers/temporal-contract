import type { LoggerPort } from "../../domain/ports/logger.port.js";
import { logger } from "../../logger.js";

/**
 * Pino Logger Adapter
 *
 * Concrete implementation of LoggerPort using Pino
 */
export class PinoLoggerAdapter implements LoggerPort {
  log(level: "fatal" | "error" | "warn" | "info" | "debug" | "trace", message: string): void {
    logger[level](message);
  }
}
