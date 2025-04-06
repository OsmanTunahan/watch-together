import { IEventHandler, EventHandlerParams, IParticipant } from '@interfaces/index';
import { moderationTargetValidation } from '@utils/validation';
import { application } from '../index';
import { ModerationService } from '@services/index';

/**
 * KickHandler - Handles kicking users from rooms
 */
export default class KickHandler implements IEventHandler {
  private cacheService = application.getCacheService();
  private messageService = application.getMessageService();
  private moderationService = new ModerationService();

  /**
   * Handle kick event
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

    // Get target user's socket and disconnect them
    const targetSocket = io.sockets.sockets.get(targetUser.sid);
    if (targetSocket) {
      targetSocket.disconnect();

      // Send system message about the kick
      this.messageService.sendSystemMessage(
        room.toString(),
        `${mod.username}, ${targetUser.username} kullanıcısını attı..`
      );
    }
  }
}