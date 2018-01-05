import { Instance, Logger, SubscriptionEvent } from 'pusher-platform';

import BasicCursor from './basic_cursor';
import BasicMessageEnricher from './basic_message_enricher';
import PayloadDeserializer from './payload_deserializer';
import RoomDelegate from './room_delegate';
import User from './user';

export interface RoomSubscriptionOptions {
  delegate?: RoomDelegate;
  basicMessageEnricher: BasicMessageEnricher;
  cursor?: BasicCursor;
  logger: Logger;
}

export default class RoomSubscription {
  delegate?: RoomDelegate;
  basicMessageEnricher: BasicMessageEnricher;
  cursor?: BasicCursor;
  logger: Logger;

  constructor(options: RoomSubscriptionOptions) {
    this.delegate = options.delegate;
    this.basicMessageEnricher = options.basicMessageEnricher;
    this.cursor = options.cursor;
    this.logger = options.logger;
  }

  handleEvent(event: SubscriptionEvent) {
    const { body, eventId, headers } = event;
    const { data } = body;
    const eventName = body.event_name;

    if (eventName !== 'new_message') {
      this.logger.verbose(
        `Room subscription received event with type ${eventName}, when 'new_message' was expected`,
      );
      return;
    }

    this.logger.verbose(`Received event name: ${eventName}, and data:`, data);

    const basicMessage = PayloadDeserializer.createBasicMessageFromPayload(
      data,
    );

    this.basicMessageEnricher.enrich(
      basicMessage,
      message => {
        if (this.cursor) {
          message.read = message.id <= this.cursor.position;
        }
        this.logger.verbose(`Room received new message: ${message.text}`);

        if (this.delegate && this.delegate.newMessage) {
          this.delegate.newMessage(message);
        }
      },
      error => {
        this.logger.debug('Error receiving new message:', error);
      },
    );
  }
}
