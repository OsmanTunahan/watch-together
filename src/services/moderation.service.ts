import { IParticipant, IModerationService } from '@interfaces/index';

/**
 * Moderation Service
 * Handles user moderation operations with better organization
 */
export class ModerationService implements IModerationService {
  /**
   * Check if a user can perform moderation operations on another user
   * @param requestingParticipant The user requesting the operation
   * @param targetParticipant The user being targeted
   * @returns Whether the operation is allowed
   */
  public canDoModerationOperationOnTarget(
    requestingParticipant: IParticipant,
    targetParticipant: IParticipant
  ): boolean {
    // Basic validation
    if (!requestingParticipant || !targetParticipant) {
      return false;
    }
    
    // Only moderators can perform moderation operations
    if (!requestingParticipant.moderator) {
      return false;
    }
    
    // Users cannot moderate themselves
    if (requestingParticipant._id === targetParticipant._id) {
      return false;
    }
    
    // Room owners can moderate anyone
    if (requestingParticipant.owner) {
      return true;
    }
    
    // Moderators cannot moderate other moderators
    if (targetParticipant.moderator) {
      return false;
    }
    
    // All other cases are allowed
    return true;
  }
}