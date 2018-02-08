import { map } from 'ramda'

import { Store } from './store'
import { parseBasicRoom } from './parsers'
import { Room } from './room'

export class RoomStore {
  constructor ({ instance, userStore, logger }) {
    this.instance = instance
    this.userStore = userStore
    this.logger = logger
  }

  store = new Store()

  initialize = this.store.initialize

  set = this.store.set

  get = roomId => this.store.get(roomId).then(basicRoom =>
    basicRoom || this.fetchBasicRoom(roomId)
  ).then(this.decorate)

  pop = roomId => this.store.pop(roomId).then(this.decorate)

  removeUserFromRoom = (roomId, userId) => this.store.pop(roomId).then(r =>
    this.set(roomId, { ...r, userIds: r.userIds.filter(id => id !== userId) })
  )

  fetchBasicRoom = roomId => {
    return this.instance
      .request({
        method: 'GET',
        path: `/rooms/${roomId}`
      })
      .then(res => {
        const basicRoom = parseBasicRoom(JSON.parse(res))
        this.set(roomId, basicRoom)
        return basicRoom
      })
      .catch(err => {
        this.logger.warn('error fetching room information:', err)
        throw err
      })
  }

  decorate = basicRoom => basicRoom
    ? new Room(basicRoom, this.userStore)
    : undefined

  snapshot = () => map(this.decorate, this.store.snapshot())
}