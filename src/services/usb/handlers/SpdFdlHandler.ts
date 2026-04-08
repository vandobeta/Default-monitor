
import { USBTransport } from '../USBTransport';
import { CRC16 } from '../utils/CRC16';

/**
 * Layer 3: Spreadtrum/Unisoc FDL (The Big-Endian Serial)
 * Implements the SPD framing and CRC16 checksum over WebUSB.
 */
export class SpdFdlHandler {
  private transport: USBTransport;
  private static readonly FRAME_START = 0x7E;
  private static readonly FRAME_END = 0x7E;

  constructor(transport: USBTransport) {
    this.transport = transport;
  }

  /**
   * SPD Framing: [0x7E, Command, Data, CRC16, 0x7E]
   */
  private createFrame(command: number, data?: Uint8Array): Uint8Array {
    const dataLength = data ? data.length : 0;
    const frame = new Uint8Array(1 + 2 + 2 + dataLength + 2 + 1);
    const view = new DataView(frame.buffer);
    
    view.setUint8(0, SpdFdlHandler.FRAME_START);
    view.setUint16(1, command, false); // Big-endian
    view.setUint16(3, dataLength, false); // Big-endian
    
    if (data) frame.set(data, 5);
    
    const crc = CRC16.calculate(frame.slice(1, 5 + dataLength));
    view.setUint16(5 + dataLength, crc, false); // Big-endian
    view.setUint8(5 + dataLength + 2, SpdFdlHandler.FRAME_END);
    
    return frame;
  }

  /**
   * Sends an SPD frame.
   */
  async sendFrame(command: number, data?: Uint8Array): Promise<void> {
    const frame = this.createFrame(command, data);
    await this.transport.send(frame);
  }

  /**
   * Receives an SPD frame.
   */
  async receiveFrame(): Promise<{ command: number, data?: Uint8Array }> {
    const header = await this.transport.receive(5);
    const view = new DataView(header.buffer);
    
    if (view.getUint8(0) !== SpdFdlHandler.FRAME_START) {
      throw new Error("SPD Frame Start Mismatch");
    }
    
    const command = view.getUint16(1, false);
    const dataLength = view.getUint16(3, false);
    
    let data: Uint8Array | undefined;
    if (dataLength > 0) {
      data = await this.transport.receive(dataLength);
    }
    
    const footer = await this.transport.receive(3);
    const footerView = new DataView(footer.buffer);
    
    if (footerView.getUint8(2) !== SpdFdlHandler.FRAME_END) {
      throw new Error("SPD Frame End Mismatch");
    }
    
    return { command, data };
  }

  /**
   * Performs the SPD handshake.
   */
  async connect(): Promise<void> {
    await this.sendFrame(0x00); // START
    const response = await this.receiveFrame();
    
    if (response.command !== 0x01) { // ACK
      throw new Error(`SPD Connection Failed: ${response.command}`);
    }
    
    console.log("[SPD] Connected Successfully");
  }

  async loadFdl(fdl: Uint8Array, address: number): Promise<void> {
    await this.sendFrame(0x01, fdl); // FDL1
    const response = await this.receiveFrame();
    
    if (response.command !== 0x01) { // ACK
      throw new Error(`SPD FDL Load Failed: ${response.command}`);
    }
    
    await this.sendFrame(0x05); // EXEC
    console.log("[SPD] FDL Loaded and Executed Successfully");
  }
}
