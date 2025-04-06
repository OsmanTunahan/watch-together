import { IEventHandler, EventHandlerParams } from '@interfaces/index';
import { application } from '../index';

/**
 * DisconnectingHandler - Handles user disconnection
 */
export default class DisconnectingHandler implements IEventHandler {
  private cacheService = application.getCacheService();

  /**
   * Handle disconnecting event
   */
  async handle({ socket, io }: EventHandlerParams): Promise<void> {
    // Get current room
    const rooms = Array.from(socket.rooms);
    const room = rooms[1]; // First room is always the socket ID, second is the joined room

    if (!room) return;

    const socketId = socket.id;
    
    // Get room participants
    const socketRoomParticipants = await this.cacheService.get<any[]>(`room:${room}:users`);

    if (socketRoomParticipants) {
      // Filter out the disconnecting user
      const newParticipants = socketRoomParticipants.filter((user) => user.sid !== socketId);

      // Update participants in cache
      await this.cacheService.set(`room:${room}:users`, newParticipants);

      // Broadcast updated participants list
      io.in(room).emit('participants', {
        participants: newParticipants,
      });
    }

    // Check if room is empty
    const remainingParticipants = io.sockets.adapter.rooms.get(room);
    if (!remainingParticipants) {
      // Clean up room data if no participants remain
      await this.cacheService.delWithPattern(`room:${room}:*`);
      await this.cacheService.del(`sid:${socketId}`);
    }
  }
}