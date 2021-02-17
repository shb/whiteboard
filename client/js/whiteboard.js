'use strict';

class DebugConsole {
    _buffer = []
    _element = undefined

    constructor(el) {
        this._element = el
    }

    log (text) {
        this.write(text)
    }

    error (text) {
        this.write('<strong class="error">'+text+'</strong>')
    }

    write (text) {
        this._buffer.push(typeof text === 'object' ? JSON.stringify(text) : text)
        if (this._buffer.length > 1000) {
            this._buffer = this._buffer.splice(0, 100)
        }
        this._element.innerHTML = this._buffer.join("<br/>\n")
        this._element.scrollTop = this._element.scrollHeight
    }
}

class ConsoleTap {
    dest = null
    source = null

    methods = ['log', 'error']

    constructor (props) {
        Object.assign(this, props)
        const tap = this

        const source = {}
        this.methods.forEach(method => {
            source[method] = tap.source[method]
            tap.source[method] = function () {
                tap.dest[method].apply(tap.dest, arguments)
                source[method].apply(tap.source, arguments)
            }
        })
    }

}

class BoardInput {
    board = null
    console = window.console
    client = null

    minX = 0
    minY = 0
    maxX = 0
    maxY = 0

    buffer = []

    constructor(props) {
        Object.assign(this, props)
        this.updateBoardLimits()
        this.board.addEventListener('touchstart', this.onTouchStart)
    }

    updateBoardLimits() {
        const rect = this.board.getBoundingClientRect()
        this.minX = rect.left
        this.minY = rect.top
        this.maxX = rect.right
        this.maxY = rect.bottom
    }

    onTouchStart = (e) => {
        try {
            this.record(e)
            this.board.addEventListener('touchmove', this.onTouchMove)
            this.board.addEventListener('touchend', this.onTouchEnd)
        } catch (err) {
            this.console.error(err)
        }
    }

    onTouchMove = (e) => {
        this.record(e)
    }

    onTouchEnd = (e) => {
        const xy = this.record(e)
        this.board.removeEventListener('touchmove', this.onTouchMove)
        this.board.removeEventListener('touchend', this.onTouchEnd)
    }

    getEvents() {
        const events = this.buffer
        this.buffer = []
        return events
    }

    record(event) {
        event.preventDefault()
        const ev = this.getDrawingEvent((event))
        this.buffer.push(ev)
        this.client.send(ev)
    }

    getDrawingEvent(event) {
        if (event.touches.length === 0) {
            return new DrawingEvent(null, 'stop', -1, -1)
        }
        const touch = event.touches[0]
        const x = Math.min(touch.clientX, this.maxX) - this.minX
        const y = Math.min(touch.clientY, this.maxY) - this.minY
        switch (event.type) {
            case 'touchstart':
                return new DrawingEvent(touch.identifier, 'start', x, y)
            default:
            case 'touchmove':
                return new DrawingEvent(touch.identifier, 'move', x, y)
        }
    }
}

class BoardDrawer {
    board = null
    client = null
    ctx = null
    input = null
    color = new ColorHash()

    constructor(props) {
        Object.assign(this, props)
        this.ctx = this.board.getContext('2d')
        window.requestAnimationFrame(this.onFrame)
    }

    onFrame = () => {
        const events = [
            ...this.client.getEvents(),
            ...this.input.getEvents()
        ]
        events.forEach(evt => {
            switch (evt.type) {
                case 'start':
                    this.ctx.strokeStyle = this.color.hex(evt.id)
                    //this._drawCross(evt.x, evt.y)
                    this.ctx.fillText(evt.id, evt.x, evt.y)
                    this.ctx.beginPath()
                    this.ctx.moveTo(evt.x, evt.y)
                    return
                case 'move':
                    this.ctx.lineTo(evt.x, evt.y)
                    this.ctx.stroke()
                    return
                case 'stop':
                    //this._drawCircle(evt.x, evt.y)
                    this.ctx.stroke()
            }
        })
        window.requestAnimationFrame(this.onFrame)
    }

    _drawCross(x, y) {
        this.ctx.beginPath()
        this.ctx.moveTo(x - 5, y)
        this.ctx.lineTo(x + 5, y)
        this.ctx.moveTo(x, y - 5)
        this.ctx.lineTo(x, y + 5)
        this.ctx.stroke()
    }

    _drawCircle(x, y) {
        this.ctx.beginPath()
        this.ctx.ellipse(x, y, 5, 5, 0, 0, 2 * Math.PI)
        this.ctx.stroke()
    }
}

class DrawingEvent {
    id = null
    type = null
    x = -1
    y = -1

    constructor(id, type, x, y) {
        Object.assign(this, {id, type, x, y})
    }
}

class Client {
    buffer = []
    console = window.console
    url = null
    socket = null

    constructor(props) {
        Object.assign(this, props)
        this.socket = this.socket || new WebSocket(this.url)
        this.socket.onmessage = this.onMessage
    }

    onMessage = (evt) => {
        this.buffer.push(JSON.parse(evt.data))
    }

    send (evt) {
        const text = JSON.stringify(evt)
        this.socket.send(text)
    }

    getEvents () {
        const events = this.buffer
        this.buffer = []
        return events
    }
}