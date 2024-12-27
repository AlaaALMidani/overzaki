import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';
import { Injectable } from '@nestjs/common';
@Injectable()
@WebSocketGateway({
  cors: {
    origin: ['http://localhost:3001'],
    methods: ['GET', 'POST'],
    credentials: true,
  },
})
export class OrderGateway {
  @WebSocketServer()
  server: Server;

  notifyOrderStatus(orderId: string, status: string) {
    this.server.emit('order-status-update', { orderId, status });
  }
}
