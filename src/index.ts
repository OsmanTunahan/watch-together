import { promises as fs } from 'fs';
import { Server } from 'socket.io';
import { App } from 'uWebSockets.js';

import { ServerConfig } from '@config/env';
import { Application } from '@core/application';
import { IEventHandler } from '@interfaces/index';

// Initialize application singleton
export const application = Application.getInstance();

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  application.getLoggerService().error(`Uncaught Exception: ${err.message}`);
  console.error(err);
});

/**
 * Event Router
 * Loads all event handlers dynamically
 */
async function loadEventHandlers(): Promise<((socket: any, io: any) => void)[]> {
  const functions: ((socket: any, io: any) => void)[] = [];
  // Remove unused cacheService variable
  const loggerService = application.getLoggerService();
  
  try {
    // Read event files from the dist directory
    const files = await fs.readdir('./dist/events');
    
    for (const file of files) {
      const filePath = './events/' + file.replace('.ts', '.js');
      
      try {
        // Import the event handler
        const { default: EventHandlerClass } = await import(filePath);
        
        // Create socket event listener
        functions.push((socket, io) => {
          const instance = new EventHandlerClass() as IEventHandler;
          const eventName = file.replace('.js', '');
          
          // Handle async and sync event handlers differently
          if (instance.handle.constructor.name === 'AsyncFunction') {
            socket.on(eventName, (data = {}, callback: (response: any) => void) => {
              const result = instance.handle({ socket, callback, io, data });
              // Check if result is a Promise before calling catch
              if (result instanceof Promise) {
                result.catch((err: Error) => {
                  loggerService.error(`Error in event ${eventName}: ${err.message}`);
                  if (callback) {
                    callback({ error: err.message });
                  }
                });
              }
            });
          } else {
            socket.on(eventName, (data = {}, callback: (response: any) => void) => {
              try {
                instance.handle({ socket, callback, io, data });
              } catch (err: unknown) {
                const errorMessage = err instanceof Error ? err.message : String(err);
                loggerService.error(`Error in event ${eventName}: ${errorMessage}`);
                if (callback) {
                  callback({ error: errorMessage });
                }
              }
            });
          }
        });
        
        loggerService.info(`Loaded event handler: ${file}`);
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        loggerService.error(`Failed to load event handler ${file}: ${errorMessage}`);
      }
    }
    
    return functions;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    loggerService.error(`Failed to load event handlers: ${errorMessage}`);
    return [];
  }
}

/**
 * Main application startup
 */
(async () => {
  const loggerService = application.getLoggerService();
  const cacheService = application.getCacheService();
  
  // Create uWebSockets app and Socket.IO server
  const app = App();
  const io = new Server();
  
  // Initialize Socket.IO in the application
  application.initializeSocketIO(io);
  
  // Connect to Redis
  loggerService.info('Connecting to Redis...');
  await new Promise((resolve) => {
    const redis = cacheService.getClient();
    redis.on('connect', resolve);
  });
  
  // Clean up existing Redis keys
  loggerService.info('Removing existing keys...');
  await cacheService.delWithPattern('room:*');
  await cacheService.delWithPattern('sid:*');
  
  // Load event handlers
  const events = await loadEventHandlers();
  
  // Set up health check endpoint
  app.get('/', (res, _) => {
    res.writeStatus('200 OK').end('Anizu Watch Together Socket 👌');
  });
  
  // Attach Socket.IO to uWebSockets
  io.attachApp(app, {
    cors: {
      origin: ServerConfig.CORS_ORIGIN,
    },
  });
  
  // Set up connection handler
  io.on('connection', (socket) => {
    loggerService.info(`New connection: ${socket.id}`);
    
    // Register all event handlers for this socket
    for (const event of events) {
      event(socket, io);
    }
  });
  
  // Start the server
  app.listen(ServerConfig.HOST, ServerConfig.PORT, (token) => {
    if (!token) {
      return loggerService.warn(`Port ${ServerConfig.PORT} is already in use.`);
    }
    
    loggerService.success(`Server is running on http://${ServerConfig.HOST}:${ServerConfig.PORT}`);
  });
})();