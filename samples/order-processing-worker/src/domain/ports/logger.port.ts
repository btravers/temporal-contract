/**
 * Logger Port - Interface for logging operations
 */
export interface LoggerPort {
  /**
   * Log a message with a specific level
   */
  log(level: "fatal" | "error" | "warn" | "info" | "debug" | "trace", message: string): void;
}
