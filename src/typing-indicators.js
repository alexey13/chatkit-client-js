import { TYPING_INDICATOR_TTL, TYPING_INDICATOR_LEEWAY } from './constants'

export class TypingIndicators {
  constructor ({ userId, apiInstance, logger }) {
    this.userId = userId
    this.apiInstance = apiInstance
    this.logger = logger
    this.lastSentRequests = {}
    this.timers = {}
  }

  sendThrottledRequest = roomId => {
    const now = Date.now()
    const sent = this.lastSentRequests[roomId]
    if (sent && now - sent < TYPING_INDICATOR_TTL - TYPING_INDICATOR_LEEWAY) {
      return Promise.resolve()
    }
    this.lastSentRequests[roomId] = now
    return this.apiInstance
      .request({
        method: 'POST',
        path: `/rooms/${roomId}/events`,
        json: {
          name: 'typing_start', // TODO 'is_typing'
          user_id: this.userId
        }
      })
      .catch(err => {
        delete this.typingRequestSent[roomId]
        this.logger.warning(
          `Error sending is_typing event in room ${roomId}`,
          err
        )
        throw err
      })
  }

  onIsTyping = (room, user, hooks) => {
    if (!this.timers[room.id]) {
      this.timers[room.id] = {}
    }
    if (this.timers[room.id][user.id]) {
      clearTimeout(this.timers[room.id][user.id])
    } else if (hooks.userStartedTyping) {
      hooks.userStartedTyping(room, user)
    }
    this.timers[room.id][user.id] = setTimeout(() => {
      if (hooks.userStoppedTyping) {
        hooks.userStoppedTyping(room, user)
      }
      delete this.timers[room.id][user.id]
    }, TYPING_INDICATOR_TTL)
  }
}
