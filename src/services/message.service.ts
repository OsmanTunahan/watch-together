import { Server } from 'socket.io';
import { IMessageService } from '@interfaces/index';
import { ChatbotConfig } from '@config/env';

/**
 * Message Service
 * Handles system messages with better organization
 */
export class MessageService implements IMessageService {
  private io: Server;
  private chatBotProps = {
    id: ChatbotConfig.ID,
    system: true,
    avatar: ChatbotConfig.AVATAR,
    username: ChatbotConfig.NAME,
  };

  /**
   * Initialize with Socket.IO server instance
   */
  constructor(io: Server) {
    this.io = io;
  }

  /**
   * Send a system message to a room
   */
  public sendSystemMessage(roomName: string, message: string): void {
    this.io.in(roomName).emit('systemMessage', {
      content: message,
      author: this.chatBotProps,
    });
  }
}