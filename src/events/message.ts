import { IEventHandler, EventHandlerParams, IParticipant, ICoreParticipant } from '@interfaces/index';
import { messageValidation } from '@utils/validation';
import { application } from '../index';

/**
 * MessageHandler - Handles chat messages between users
 */
export default class MessageHandler implements IEventHandler {
  private cacheService = application.getCacheService();

  /**
   * Handle message event
   */
  async handle({ socket, io, data }: EventHandlerParams): Promise<void> {
    // Validate input data
    const validationResult = messageValidation.safeParse(data);
    if (!validationResult.success) {
      return;
    }

    const message = data?.message?.trim();
    if (!message) return;

    // Get current room
    const rooms = Array.from(socket.rooms);
    const room = rooms[1]; // First room is always the socket ID, second is the joined room

    if (!room) return;

    const socketId = socket.id;
    
    // Get room participants
    const roomParticipants = await this.cacheService.get<IParticipant[]>(`room:${room}:users`);
    if (!roomParticipants) return;

    // Find the sender
    const sender = roomParticipants.find((user) => user.sid === socketId);
    if (!sender) return;

    // Check if user is muted
    const mutedParticipants = await this.cacheService.get<ICoreParticipant[]>(`room:${room}:mutedParticipants`) || [];
    const isMuted = mutedParticipants.some((user) => user._id === sender._id);

    if (isMuted) {
      // Don't broadcast messages from muted users
      return;
    }

    // Broadcast the message to all users in the room
    io.in(room).emit('message', {
      content: message,
      author: {
        _id: sender._id,
        username: sender.username,
        avatar: sender.avatar,
      },
    });
  }
}