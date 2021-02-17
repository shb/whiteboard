const {resolve} = require('path')
const express = require('express')
const WebSocket = require('ws')

const PORT = process.env.PORT || 8080

const server = express()
    .use(express.static(resolve(__dirname, '..', 'client')))
    .listen(PORT, () => console.log(`Listening on ${PORT}`))

const wsServer = new WebSocket.Server({
    server
})

wsServer.on('connection', onWsConnection)

function onWsConnection(socket) {
    const client = new Client({
        server: wsServer,
        socket
    })
    socket.on('message', client.onWsMessage)
}

class Client {
    server = null
    socket = null

    constructor(props) {
        Object.assign(this, props)
    }

    onWsMessage = (message) => {
        console.dir(message)
        this.server.clients.forEach(client => {
            if (client === this.socket) return
            if (client.readyState !== WebSocket.OPEN) return
            client.send(message)
        })
    }
}