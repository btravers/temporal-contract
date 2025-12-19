import { Injectable } from "@nestjs/common";

/**
 * Simple logger service for demonstration
 */
@Injectable()
export class LoggerService {
  log(level: "info" | "warn" | "error", message: string): void {
    const timestamp = new Date().toISOString();
    const prefix = level.toUpperCase().padEnd(5);
    console.log(`[${timestamp}] ${prefix} ${message}`);
  }
}
