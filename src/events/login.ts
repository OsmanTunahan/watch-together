import { IEventHandler, EventHandlerParams, IParticipant, ICoreParticipant, IUserData, IAnimeInfo } from '@interfaces/index';

import { loginValidation } from '@utils/validation';
import { application } from '../index';
import { ApiConfig } from '@config/env';

/**
 * LoginHandler - Handles user authentication and room joining
 */
export default class LoginHandler implements IEventHandler {
  private cacheService = application.getCacheService();
  private messageService = application.getMessageService();

  /**
   * Handle login event
   */
  async handle({ socket, callback, data }: EventHandlerParams): Promise<void> {
    try {
      // Get token from data or headers
      const author = data?.author || socket.handshake.headers.authorization;

      // Validate input data
      const validationResult = loginValidation.safeParse({
        ...data,
        author,
      });

      if (!validationResult.success) {
        const error = validationResult.error.issues[0].message || 'Invalid data';
        return callback?.({ error });
      }

      let { password, room } = data;
      const { anime } = data;

      // Trim input values
      password = password.trim();
      room = room.trim();

      const prefix = `room:${room}`;

      // Fetch user data from API
      const userResponse = await fetch(`${ApiConfig.URL}/user?username=${author}`, {
        headers: {
          "Content-Type": "application/json"
        },
      });

      // Parse the response JSON only once and store it
      const userResponseData = await userResponse.json();
      const userData = (userResponseData as { userData?: IUserData })?.userData;
      if (!userData?._id) {
        return callback?.({ error: 'Could not retrieve user data' });
      }

      // Check if user is already in the room
      const roomParticipants = await this.cacheService.get<IParticipant[]>(`${prefix}:users`);
      if (roomParticipants && roomParticipants.find((user) => user._id === userData._id)) {
        return callback?.({ error: 'You are already in this room' });
      }

      // Check room password
      const roomPassword = await this.cacheService.get<string>(`${prefix}:password`);
      if (roomPassword && roomPassword !== password) {
        return callback?.({ error: 'Incorrect password' });
      }

      // Check if user is banned
      const bannedParticipants = await this.cacheService.get<ICoreParticipant[]>(`${prefix}:bannedParticipants`) || [];
      const banned = bannedParticipants.find((x) => x._id === userData._id);
      if (banned) {
        return callback?.({ error: 'You are banned from this room' });
      }

      // Get room anime information
      const roomAnimeInfo = await this.cacheService.get<IAnimeInfo>(`${prefix}:anime`);
      const mutedParticipants = await this.cacheService.get<ICoreParticipant[]>(`${prefix}:mutedParticipants`) || [];

      // Check if anime information matches
      if (roomAnimeInfo && JSON.stringify(roomAnimeInfo) !== JSON.stringify(anime)) {
        return callback?.({ error: 'Anime information does not match' });
      }

      // Join the room
      socket.join(room);

      // Create participant object
      const participant: IParticipant = {
        _id: userData._id,
        username: userData.username,
        avatar: userData.avatar,
        owner: false,
        moderator: false,
        sid: socket.id,
      };

      // Set up room if it doesn't exist
      if (!roomAnimeInfo) {
        // First user becomes owner and moderator
        participant.owner = true;
        participant.moderator = true;

        // Initialize room data
        await this.cacheService.multipleSet({
          [`${prefix}:anime`]: anime,
          [`${prefix}:password`]: password,
          [`${prefix}:controlledByMods`]: false,
          [`${prefix}:users`]: [participant],
          [`${prefix}:bannedParticipants`]: [],
          [`${prefix}:mutedParticipants`]: [],
        });

        // Map socket ID to room and user ID
        await this.cacheService.set(`sid:${socket.id}`, {
          room,
          userId: userData._id,
        });

        // Send welcome message
        this.messageService.sendSystemMessage(room, `${userData.username} created the room.`);

        // Return success with room data
        return callback?.({
          success: true,
          users: [participant],
          controlledByMods: false,
          bannedParticipants: [],
          mutedParticipants: [],
          isMuted: false,
        });
      }

      // Add user to existing room
      const users = [...(roomParticipants || []), participant];
      await this.cacheService.set(`${prefix}:users`, users);

      // Map socket ID to room and user ID
      await this.cacheService.set(`sid:${socket.id}`, {
        room,
        userId: userData._id,
      });

      // Check if user is muted
      const isMuted = mutedParticipants.some((x) => x._id === userData._id);

      // Get room control setting
      const controlledByMods = await this.cacheService.get<boolean>(`${prefix}:controlledByMods`) || false;

      // Broadcast user joined message
      socket.broadcast.to(room).emit('userJoined', { user: participant });
      this.messageService.sendSystemMessage(room, `${userData.username} joined the room.`);

      // Return success with room data
      return callback?.({
        success: true,
        users,
        controlledByMods,
        bannedParticipants,
        mutedParticipants,
        isMuted,
      });
    } catch (error) {
      console.error('Login error:', error);
      return callback?.({ error: 'An unexpected error occurred' });
    }
  }
}