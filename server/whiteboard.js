const WebSocket = require('ws')

const wsServer = new WebSocket.Server({
    port: 8080
})

wsServer.on('connection', onWsConnection)
function onWsConnection (socket) {
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