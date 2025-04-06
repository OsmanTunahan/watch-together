import { IEventHandler, EventHandlerParams, IParticipant, ICoreParticipant } from '@interfaces/index';
import { moderationTargetValidation } from '@utils/validation';
import { application } from '../index';
import { ModerationService } from '@services/index';

/**
 * MuteHandler - Handles muting and unmuting users
 */
export default class MuteHandler implements IEventHandler {
  private cacheService = application.getCacheService();
  private messageService = application.getMessageService();
  private moderationService = new ModerationService();

  /**
   * Handle mute event
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

    // Find moderator and target user
    const mod = socketRoomParticipants.find((user) => user.sid === socketId);
    const targetUser = socketRoomParticipants.find((user) => user._id === targetUserId);

    if (!mod || !targetUser) return;

    // Check if moderator can perform this action
    if (!this.moderationService.canDoModerationOperationOnTarget(mod, targetUser)) {
      return;
    }

    // Get muted participants
    const mutedParticipants = await this.cacheService.get<ICoreParticipant[]>(`room:${room}:mutedParticipants`) || [];

    // Check if user is already muted
    const isMuted = mutedParticipants.some(user => user._id === targetUserId);
    let newMutedParticipants: ICoreParticipant[] = [];

    if (isMuted) {
      // Unmute operation
      newMutedParticipants = mutedParticipants.filter(user => user._id !== targetUserId);

      this.messageService.sendSystemMessage(
        room.toString(),
        `${mod.username} has unmuted ${targetUser.username}.`
      );
    } else {
      // Mute operation
      const targetUserCore: ICoreParticipant = {
        _id: targetUser._id,
        username: targetUser.username,
        avatar: targetUser.avatar
      };
      
      newMutedParticipants = [...mutedParticipants, targetUserCore];

      this.messageService.sendSystemMessage(
        room.toString(),
        `${mod.username} has muted ${targetUser.username}.`
      );
    }

    // Update muted participants in cache
    await this.cacheService.set(`room:${room}:mutedParticipants`, newMutedParticipants);

    // Broadcast the updated muted participants list to all users in the room
    io.in(room).emit('mute', {
      mutedParticipants: newMutedParticipants,
    });
  }
}