import { Client } from '@microsoft/microsoft-graph-client';

export interface AzureConfig {
  accessToken: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface AzureUser {
  id: string;
  displayName: string;
  userPrincipalName: string;
  mail?: string;
  jobTitle?: string;
  department?: string;
  officeLocation?: string;
}

export interface AzureMessage {
  id: string;
  subject: string;
  body: string;
  from: string;
  toRecipients: string[];
  receivedDateTime: string;
  importance: string;
  isRead: boolean;
}

export interface AzureCalendarEvent {
  id: string;
  subject: string;
  body: string;
  start: string;
  end: string;
  location: string;
  attendees: string[];
  organizer: string;
  importance: string;
}

export class AzureMCPClient {
  private client: Client;
  private config: AzureConfig;

  constructor(config: AzureConfig) {
    this.config = config;
    this.client = Client.init({
      authProvider: async done => {
        done(null, config.accessToken);
      },
    });
  }

  async getProfile(): Promise<ApiResponse<AzureUser>> {
    try {
      const user = await this.client.api('/me').get();
      return {
        success: true,
        data: {
          id: user.id,
          displayName: user.displayName,
          userPrincipalName: user.userPrincipalName,
          mail: user.mail,
          jobTitle: user.jobTitle,
          department: user.department,
          officeLocation: user.officeLocation,
        },
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Failed to fetch profile',
      };
    }
  }

  async getMessages(options: {
    limit?: number;
    filter?: string;
    search?: string;
  }): Promise<ApiResponse<AzureMessage[]>> {
    try {
      let query = this.client.api('/me/messages');

      if (options.limit) {
        query = query.top(options.limit);
      }

      if (options.filter) {
        query = query.filter(options.filter);
      }

      if (options.search) {
        query = query.search(options.search);
      }

      const response = await query.get();

      const messages: AzureMessage[] = response.value.map((msg: any) => ({
        id: msg.id,
        subject: msg.subject,
        body: msg.body?.content || '',
        from: msg.from?.emailAddress?.address || '',
        toRecipients:
          msg.toRecipients?.map((r: any) => r.emailAddress?.address) || [],
        receivedDateTime: msg.receivedDateTime,
        importance: msg.importance,
        isRead: msg.isRead,
      }));

      return {
        success: true,
        data: messages,
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Failed to fetch messages',
      };
    }
  }

  async getCalendarEvents(options: {
    limit?: number;
    startTime?: string;
    endTime?: string;
  }): Promise<ApiResponse<AzureCalendarEvent[]>> {
    try {
      let query = this.client.api('/me/events');

      if (options.limit) {
        query = query.top(options.limit);
      }

      if (options.startTime && options.endTime) {
        query = query.filter(
          `start/dateTime ge '${options.startTime}' and end/dateTime le '${options.endTime}'`
        );
      }

      const response = await query.get();

      const events: AzureCalendarEvent[] = response.value.map((event: any) => ({
        id: event.id,
        subject: event.subject,
        body: event.body?.content || '',
        start: event.start?.dateTime,
        end: event.end?.dateTime,
        location: event.location?.displayName || '',
        attendees:
          event.attendees?.map((a: any) => a.emailAddress?.address) || [],
        organizer: event.organizer?.emailAddress?.address || '',
        importance: event.importance,
      }));

      return {
        success: true,
        data: events,
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to fetch calendar events',
      };
    }
  }
}
