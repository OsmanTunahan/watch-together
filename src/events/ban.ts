import { IEventHandler, EventHandlerParams, IParticipant, ICoreParticipant } from '@interfaces/index';
import { moderationTargetValidation } from '@utils/validation';
import { application } from '../index';
import { ModerationService } from '@services/index';

/**
 * BanHandler - Handles banning and unbanning users
 */
export default class BanHandler implements IEventHandler {
  private cacheService = application.getCacheService();
  private messageService = application.getMessageService();
  private moderationService = new ModerationService();

  /**
   * Handle ban event
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

    // Get banned participants
    const bannedParticipants = await this.cacheService.get<ICoreParticipant[]>(`room:${room}:bannedParticipants`) || [];

    let newBannedParticipants: ICoreParticipant[] = [];
    const isBanned = bannedParticipants.find((x) => x._id === targetUserId);

    if (isBanned) {
      // Unban operation
      if (mod?.moderator) {
        newBannedParticipants = bannedParticipants.filter((x) => x._id !== targetUserId);

        this.messageService.sendSystemMessage(
          room.toString(),
          `${mod.username} has removed the ban for ${isBanned.username}.`
        );
      }
    } else if (mod && targetUser && this.moderationService.canDoModerationOperationOnTarget(mod, targetUser)) {
      // Ban operation
      const targetUserCopy: ICoreParticipant = {
        _id: targetUser._id,
        username: targetUser.username,
        avatar: targetUser.avatar
      };

      newBannedParticipants = [...bannedParticipants, targetUserCopy];

      // Disconnect the banned user
      const targetSocket = io.sockets.sockets.get(targetUser.sid);
      if (targetSocket) {
        targetSocket.disconnect();
      }

      this.messageService.sendSystemMessage(
        room.toString(),
        `${mod.username} has banned ${targetUser.username}.`
      );
    }

    // Broadcast updated banned list to room
    io.in(room).emit('ban', {
      bannedParticipants: newBannedParticipants,
    });

    // Update banned list in cache
    await this.cacheService.set(`room:${room}:bannedParticipants`, newBannedParticipants);
  }
}