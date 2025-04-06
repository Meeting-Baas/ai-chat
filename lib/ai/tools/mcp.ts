import { z } from "zod";

export const toolsSchemas = {
  'joinMeeting': {
    parameters: z.object({
      meetingUrl: z.string(),
      botName: z.string(),
      reserved: z.boolean(),
    }),
    required: ['meetingUrl', 'botName', 'reserved']
  },
  'leaveMeeting': {
    parameters: z.object({
      botId: z.string()
    }),
    required: ['botId']
  },
  'getMeetingData': {
    parameters: z.object({
      botId: z.string()
    }),
    required: ['botId']
  },
  'deleteData': {
    parameters: z.object({
      botId: z.string()
    }),
    required: ['botId']
  },
  'createCalendar': {
    parameters: z.object({
      oauthClientId: z.string(),
      oauthClientSecret: z.string(),
      oauthRefreshToken: z.string(),
      platform: z.enum(["Google", "Microsoft"]),
      rawCalendarId: z.string(),
    }),
    required: ['oauthClientId', 'oauthClientSecret', 'oauthRefreshToken', 'platform', 'rawCalendarId']
  },
  'listCalendars': {
    parameters: z.object({}),
    required: []
  },
  'getCalendar': {
    parameters: z.object({
      uuid: z.string()
    }),
    required: ['uuid']
  },
  'deleteCalendar': {
    parameters: z.object({
      uuid: z.string()
    }),
    required: ['uuid']
  },
  'resyncAllCalendars': {
    parameters: z.object({}),
    required: []
  },
  'botsWithMetadata': {
    parameters: z.object({
      botName: z.string(),
      createdAfter: z.string(),
      createdBefore: z.string(),
      cursor: z.string(),
      filterByExtra: z.string(),
      limit: z.number(),
      meetingUrl: z.string(),
      sortByExtra: z.string(),
      speakerName: z.string(),
    }),
    required: ['botName', 'createdAfter', 'createdBefore', 'cursor', 'filterByExtra', 'limit', 'meetingUrl', 'sortByExtra', 'speakerName']
  },
  'listEvents': {
    parameters: z.object({
      calendarUuid: z.string()
    }),
    required: ['calendarUuid']
  },
  'scheduleRecordEvent': {
    parameters: z.object({
      eventUuid: z.string(),
      botName: z.string(),
    }),
    required: ['eventUuid', 'botName']
  },
  'unscheduleRecordEvent': {
    parameters: z.object({
      eventUuid: z.string()
    }),
    required: ['eventUuid']
  },
  'updateCalendar': {
    parameters: z.object({
      uuid: z.string(),
      oauthClientId: z.string(),
      oauthClientSecret: z.string(),
      oauthRefreshToken: z.string(),
      platform: z.enum(["Google", "Microsoft"]),
      rawCalendarId: z.string(),
    }),
    required: ['uuid', 'oauthClientId', 'oauthClientSecret', 'oauthRefreshToken', 'platform', 'rawCalendarId']
  },
  'echo': {
    parameters: z.object({
      message: z.string()
    }),
    required: ['message']
  },
};
