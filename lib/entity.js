'use strict'

const WritableAppliedEventsStream = require('./writable_applied_events_stream')

class Entity {
  constructor(uid) {
    if (!uid) throw new Error('Missing UID')
    this._uid = uid

    this._version = 0
    this._pendingEvents = []
  }

  get uid() {
    return this._uid
  }
  get version() {
    return this._version
  }
  get pendingEvents() {
    return this._pendingEvents
  }

  trigger(Event, data) {
    if (!Event) throw new Error(`The event type is not valid (${Event}).`)
    if (Event.isHistoric())
      throw new Error(
        `${
          Event.name
        } is an historic event which means it cannot be triggered anymore.`
      )
    const args = {
      entityUid: this.uid,
      entityVersion: this.version + 1,
      timestamp: new Date(),
      isBeingReplayed: false,
    }
    Object.assign(args, data)
    const event = new Event(args)
    this._pendingEvents.push(event)
    this.applyEvent(event)
  }

  applyEvent(event) {
    if (event.entityUid !== this.uid)
      throw new Error('Event Entity UID property must match entity UID')
    if (event.entityVersion <= this.version)
      throw new Error(
        `Event version (${
          event.entityVersion
        }) should be greater than entity version (${this.version})`
      )

    this._handleEvent(event)
    this._version = event.entityVersion
    return this
  }

  openWritableAppliedEventsStream() {
    return new WritableAppliedEventsStream(this)
  }

  clearPendingEvents() {
    this._pendingEvents = []
  }

  _handleEvent(event) {
    const eventHandlerName = `on${event.constructor.name}`
    if (typeof this[eventHandlerName] === 'function') {
      const result = this[eventHandlerName](event)
      if (result && typeof result.then === 'function')
        throw new Error('This land is pure. Begone foul promise.')
    }
  }
}

module.exports = Entity
