import { Server } from 'socket.io';
import { CacheService, LoggerService, MessageService } from '@services/index';

/**
 * Application Core
 * Centralizes dependency injection and service management
 */
export class Application {
  private static instance: Application;
  private io: Server | null = null;
  private cacheService: CacheService;
  private loggerService: LoggerService;
  private messageService: MessageService | null = null;

  /**
   * Initialize core services
   */
  private constructor() {
    this.cacheService = new CacheService();
    this.loggerService = new LoggerService();
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): Application {
    if (!Application.instance) {
      Application.instance = new Application();
    }
    return Application.instance;
  }

  /**
   * Initialize Socket.IO server
   */
  public initializeSocketIO(io: Server): void {
    this.io = io;
    this.messageService = new MessageService(io);
  }

  /**
   * Get Socket.IO server instance
   */
  public getSocketIO(): Server {
    if (!this.io) {
      throw new Error('Socket.IO server not initialized');
    }
    return this.io;
  }

  /**
   * Get cache service instance
   */
  public getCacheService(): CacheService {
    return this.cacheService;
  }

  /**
   * Get logger service instance
   */
  public getLoggerService(): LoggerService {
    return this.loggerService;
  }

  /**
   * Get message service instance
   */
  public getMessageService(): MessageService {
    if (!this.messageService) {
      throw new Error('Message service not initialized');
    }
    return this.messageService;
  }
}