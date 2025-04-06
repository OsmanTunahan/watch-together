import { IEventHandler, EventHandlerParams, IParticipant } from '@interfaces/index';
import { playerStateValidation } from '@utils/validation';
import { application } from '../index';

/**
 * PlayerStateHandler - Handles video player state changes (play/pause)
 */
export default class PlayerStateHandler implements IEventHandler {
  private cacheService = application.getCacheService();

  /**
   * Handle playerState event
   */
  async handle({ socket, data }: EventHandlerParams): Promise<void> {
    // Validate input data
    const validationResult = playerStateValidation.safeParse(data);
    if (!validationResult.success) {
      return;
    }

    const playing = data?.playing;
    if (typeof playing !== 'boolean') return;

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

    // Broadcast player state change if user has permission
    if (canControl) {
      socket.broadcast.to(room).emit('playerState', { playing });
    }
  }
}