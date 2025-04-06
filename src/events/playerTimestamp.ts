import { IEventHandler, EventHandlerParams, IParticipant } from '@interfaces/index';
import { playerTimestampValidation } from '@utils/validation';
import { application } from '../index';

/**
 * PlayerTimestampHandler - Handles video player timestamp synchronization
 */
export default class PlayerTimestampHandler implements IEventHandler {
  private cacheService = application.getCacheService();

  /**
   * Handle playerTimestamp event
   */
  async handle({ socket, data }: EventHandlerParams): Promise<void> {
    // Validate input data
    const validationResult = playerTimestampValidation.safeParse(data);
    if (!validationResult.success) {
      return;
    }

    const timestamp = data?.timestamp;
    if (typeof timestamp !== 'number' || timestamp < 0) return;

    // Get current room
    const rooms = Array.from(socket.rooms);
    const room = rooms[1]; // First room is always the socket ID, second is the joined room

    if (!room) return;

    const socketId = socket.id;
    let canControl = false;

    // Check if room is controlled by moderators only
    const modRequired = await this.cacheService.get<boolean>(`room:${room}:controlledByMods`) || false;
    
    if (modRequired) {
      // Only moderators can control the player
      const roomParticipants = await this.cacheService.get<IParticipant[]>(`room:${room}:users`);
      
      if (roomParticipants) {
        const user = roomParticipants.find((user) => user.sid === socketId);
        if (user?.moderator) {
          canControl = true;
        }
      }
    } else {
      // Anyone can control the player
      canControl = true;
    }

    // Broadcast timestamp change if user has permission
    if (canControl) {
      socket.broadcast.to(room).emit('playerTimestamp', { timestamp });
    }
  }
}