// Core interfaces for the application

// Socket event handler interface
export interface IEventHandler {
  handle(params: EventHandlerParams): Promise<void> | void;
}

// Parameters for event handlers
export interface EventHandlerParams {
  socket: any; // Socket.io socket
  io?: any; // Socket.io server instance
  data?: any; // Event data
  callback?: (response: any) => void; // Callback function
}

// User/Participant interfaces
export interface IParticipant {
  _id: string;
  username: string;
  avatar: string;
  owner: boolean;
  moderator: boolean;
  sid: string; // Socket ID
}

export interface ICoreParticipant {
  _id: string;
  username: string;
  avatar: string;
}

// User data interface
export interface IUserData {
  _id: string;
  username: string;
  avatar: string;
  [key: string]: any; // For any additional properties
}

// Room interfaces
export interface IRoom {
  name: string;
  password: string;
  anime: IAnimeInfo;
  controlledByMods: boolean;
  users: IParticipant[];
  bannedParticipants: ICoreParticipant[];
  mutedParticipants: ICoreParticipant[];
}

// Anime information interface
export interface IAnimeInfo {
  slug: string;
  season: number;
  episode: number;
}

// Cache service interface
export interface ICacheService {
  get<T>(key: string, raw?: boolean): Promise<T | null>;
  set<T>(key: string, value: T, expr?: string): Promise<void>;
  multipleSet(data: Record<string, any>): Promise<void>;
  multipleGet(keys: string[]): Promise<any[]>;
  del(key: string): Promise<void>;
  delWithPattern(pattern: string): Promise<void>;
  keys(pattern: string): Promise<string[]>;
}

// System message service interface
export interface IMessageService {
  sendSystemMessage(roomName: string, message: string): void;
}

// Logger service interface
export interface ILoggerService {
  info(message: string): void;
  success(message: string): void;
  warn(message: string): void;
  error(message: string): void;
}

// Moderation service interface
export interface IModerationService {
  canDoModerationOperationOnTarget(
    requestingParticipant: IParticipant,
    targetParticipant: IParticipant
  ): boolean;
}