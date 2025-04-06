import { IEventHandler, EventHandlerParams, IParticipant } from '@interfaces/index';
import { moderationTargetValidation } from '@utils/validation';
import { application } from '../index';

/**
 * ModHandler - Handles promoting and demoting moderators
 */
export default class ModHandler implements IEventHandler {
  private cacheService = application.getCacheService();
  private messageService = application.getMessageService();

  /**
   * Handle mod event
   */
  async handle({ socket, io, data }: EventHandlerParams): Promise<void> {
    // Validate target data
    const validationResult = moderationTargetValidation.safeParse(data);
    if (!validationResult.success) {
      return;
    }

    const targetUserId = data?.target;
    if (!targetUserId) return;

    // Get current room
    const rooms = Array.from(socket.rooms);
    const room = rooms[1]; // First room is always the socket ID, second is the joined room

    if (!room) return;

    const socketId = socket.id;
    
    // Get room participants
    const socketRoomParticipants = await this.cacheService.get<IParticipant[]>(`room:${room}:users`);
    if (!socketRoomParticipants) return;

    // Find requesting user and target user
    const requestedBy = socketRoomParticipants.find((user) => user.sid === socketId);
    const targetUser = socketRoomParticipants.find((user) => user._id === targetUserId);

    if (!requestedBy?.owner || !targetUser) return;

    // Check if target is already a moderator
    const isTargetAlreadyMod = targetUser.moderator;

    // Update participants list
    const newParticipants = socketRoomParticipants.map((participant) => {
      if (participant._id === targetUserId) {
        return {
          ...participant,
          moderator: !isTargetAlreadyMod,
        };
      }
      return participant;
    });

    // Broadcast updated participants list
    io.in(room).emit('participants', {
      participants: newParticipants,
    });

    // Update participants in cache
    await this.cacheService.set(`room:${room}:users`, newParticipants);

    // Send system message
    this.messageService.sendSystemMessage(
      room.toString(),
      `${requestedBy.username} has ${isTargetAlreadyMod ? 'removed moderator status from' : 'made'} ${targetUser.username} ${isTargetAlreadyMod ? '' : 'a moderator'}.`
    );
  }
}