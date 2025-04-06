import { IEventHandler, EventHandlerParams, IParticipant } from '@interfaces/index';
import { modControlValidation } from '@utils/validation';
import { application } from '../index';

/**
 * ModControlHandler - Handles toggling moderator-only control of the video player
 */
export default class ModControlHandler implements IEventHandler {
  private cacheService = application.getCacheService();
  private messageService = application.getMessageService();

  /**
   * Handle modControl event
   */
  async handle({ socket, io, data }: EventHandlerParams): Promise<void> {
    // Validate input data
    const validationResult = modControlValidation.safeParse(data);
    if (!validationResult.success) {
      return;
    }

    const enabled = data?.enabled;
    if (typeof enabled !== 'boolean') return;

    // Get current room
    const rooms = Array.from(socket.rooms);
    const room = rooms[1]; // First room is always the socket ID, second is the joined room

    if (!room) return;

    const socketId = socket.id;
    
    // Get room participants
    const socketRoomParticipants = await this.cacheService.get<IParticipant[]>(`room:${room}:users`);
    if (!socketRoomParticipants) return;

    // Check if user is a moderator
    const mod = socketRoomParticipants.find((user) => user.sid === socketId);
    if (!mod?.moderator) return;

    // Update moderator control setting
    await this.cacheService.set(`room:${room}:controlledByMods`, enabled);

    // Broadcast the change to all users in the room
    io.in(room).emit('modControl', { enabled });

    // Send system message
    this.messageService.sendSystemMessage(
      room.toString(),
      `${mod.username} has ${enabled ? 'enabled' : 'disabled'} moderator-only control.`
    );
  }
}