import { io } from 'socket.io-client';
import { SOCKET_URL } from '../config/api';

class SocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
  }

  connect() {
    this.socket = io(SOCKET_URL, {
      withCredentials: true,
      transports: ['websocket', 'polling'],
    });

    this.socket.on('connect', () => {
      console.log('Connected to server');
      this.isConnected = true;
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from server');
      this.isConnected = false;
    });

    this.socket.on('connect_error', (error) => {
      console.error('Connection error:', error);
    });

    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.isConnected = false;
    }
  }

  joinProduct(productId) {
    if (this.socket) {
      this.socket.emit('join-product', productId);
    }
  }

  leaveProduct(productId) {
    if (this.socket) {
      this.socket.emit('leave-product', productId);
    }
  }

  onBidPlaced(callback) {
    if (this.socket) {
      this.socket.on('bid-placed', callback);
    }
  }

  onBidUpdated(callback) {
    if (this.socket) {
      this.socket.on('bid-updated', callback);
    }
  }

  onAuctionEnded(callback) {
    if (this.socket) {
      this.socket.on('auction-ended', callback);
    }
  }

  onBidResult(callback) {
    if (this.socket) {
      this.socket.on('bid-result', callback);
    }
  }

  joinUserRoom(userId) {
    if (this.socket) {
      this.socket.emit('join-user', userId);
    }
  }

  offBidPlaced(callback) {
    if (this.socket) {
      this.socket.off('bid-placed', callback);
    }
  }

  offBidUpdated(callback) {
    if (this.socket) {
      this.socket.off('bid-updated', callback);
    }
  }

  offAuctionEnded(callback) {
    if (this.socket) {
      this.socket.off('auction-ended', callback);
    }
  }

  offBidResult(callback) {
    if (this.socket) {
      this.socket.off('bid-result', callback);
    }
  }

  getSocket() {
    return this.socket;
  }

  isSocketConnected() {
    return this.isConnected;
  }
}

const socketService = new SocketService();

export default socketService;
