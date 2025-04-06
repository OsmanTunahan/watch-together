import chalk from 'chalk';
import { ILoggerService } from '@interfaces/index';

/**
 * Logger Service
 * Handles application logging with better formatting
 */
export class LoggerService implements ILoggerService {
  /**
   * Log an informational message
   */
  public info(message: string): void {
    console.log(chalk.blue(`[INFO] ${message}`));
  }

  /**
   * Log a success message
   */
  public success(message: string): void {
    console.log(chalk.green(`[SUCCESS] ${message}`));
  }

  /**
   * Log a warning message
   */
  public warn(message: string): void {
    console.log(chalk.yellow(`[WARNING] ${message}`));
  }

  /**
   * Log an error message
   */
  public error(message: string): void {
    console.error(chalk.red(`[ERROR] ${message}`));
  }
}