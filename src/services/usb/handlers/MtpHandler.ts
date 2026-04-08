
import { USBTransport } from '../USBTransport';

/**
 * Layer 2: WebMTP (The Object Model)
 * Implements the MTP/PTP (Picture Transfer Protocol) spec over WebUSB.
 */
export class WebMtpHandler {
  private transport: USBTransport;
  private sessionId: number = 0;

  constructor(transport: USBTransport) {
    this.transport = transport;
  }

  /**
   * MTP Packet Format: [Length, Type, Code, TransactionID, Data]
   */
  private createPacket(type: number, code: number, transactionId: number, data?: Uint8Array): Uint8Array {
    const dataLength = data ? data.length : 0;
    const length = 12 + dataLength;
    const packet = new Uint8Array(length);
    const view = new DataView(packet.buffer);
    
    view.setUint32(0, length, true);
    view.setUint16(4, type, true);
    view.setUint16(6, code, true);
    view.setUint32(8, transactionId, true);
    
    if (data) packet.set(data, 12);
    
    return packet;
  }

  /**
   * Sends an MTP packet.
   */
  async sendPacket(type: number, code: number, transactionId: number, data?: Uint8Array): Promise<void> {
    const packet = this.createPacket(type, code, transactionId, data);
    await this.transport.send(packet);
  }

  /**
   * Receives an MTP packet.
   */
  async receivePacket(): Promise<{ type: number, code: number, transactionId: number, data?: Uint8Array }> {
    const header = await this.transport.receive(12);
    const view = new DataView(header.buffer);
    
    const length = view.getUint32(0, true);
    const type = view.getUint16(4, true);
    const code = view.getUint16(6, true);
    const transactionId = view.getUint32(8, true);
    
    let data: Uint8Array | undefined;
    if (length > 12) {
      data = await this.transport.receive(length - 12);
    }
    
    return { type, code, transactionId, data };
  }

  /**
   * Performs the MTP handshake.
   */
  async openSession(): Promise<void> {
    this.sessionId++;
    await this.sendPacket(0x01, 0x1002, 0x00000001, new Uint8Array(new Uint32Array([this.sessionId]).buffer));
    const response = await this.receivePacket();
    
    if (response.code !== 0x2001) { // OK
      throw new Error(`MTP Session Failed: ${response.code}`);
    }
    
    console.log("[MTP] Session Opened Successfully");
  }

  async getObjectHandles(): Promise<Uint32Array> {
    await this.sendPacket(0x01, 0x1007, 0x00000002, new Uint8Array(new Uint32Array([0xFFFFFFFF, 0x00000000, 0x00000000]).buffer));
    const response = await this.receivePacket();
    
    if (response.code !== 0x2001) { // OK
      throw new Error(`MTP GetObjectHandles Failed: ${response.code}`);
    }
    
    if (!response.data) return new Uint32Array(0);
    
    const count = new DataView(response.data.buffer).getUint32(0, true);
    return new Uint32Array(response.data.buffer.slice(4, 4 + count * 4));
  }

  async getObject(handle: number): Promise<Uint8Array> {
    await this.sendPacket(0x01, 0x1009, 0x00000003, new Uint8Array(new Uint32Array([handle]).buffer));
    const response = await this.receivePacket();
    
    if (response.code !== 0x2001) { // OK
      throw new Error(`MTP GetObject Failed: ${response.code}`);
    }
    
    return response.data || new Uint8Array(0);
  }
}
