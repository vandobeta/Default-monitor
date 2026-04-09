
import { USBTransport } from '../USBTransport';
import { CRC16 } from '../utils/CRC16';

/**
 * Layer 3: Spreadtrum/Unisoc FDL (BootROM Serial Link)
 * Implements the SPD framing and CRC16 checksum over WebUSB.
 */
export class SpdFdlHandler {
  private transport: USBTransport;
  private static readonly FRAME_START = 0x7E;
  private static readonly FRAME_END = 0x7E;

  // BSL (BootROM Serial Link) Commands
  private readonly BSL = {
    CMD_CONNECT: 0x0000,
    CMD_START_DATA: 0x0003,
    CMD_MIDST_DATA: 0x0004,
    CMD_END_DATA: 0x0005,
    CMD_EXEC_DATA: 0x0006,
    CMD_NORMAL_RESET: 0x0008,
    CMD_READ_FLASH: 0x0009,
    CMD_READ_CHIP_TYPE: 0x000C,
    CMD_KEEP_CHARGE: 0x0013,
    CMD_POWER_OFF: 0x0017,
    REP_ACK: 0x0080,
    REP_VER: 0x0081,
    REP_UNK_CMD: 0x0084,
    REP_LOG: 0x0090
  };

  constructor(transport: USBTransport) {
    this.transport = transport;
  }

  /**
   * SPD Framing: [0x7E, Command, DataLength, Data, CRC16, 0x7E]
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
    await this.transport.write(frame);
  }

  /**
   * Receives an SPD frame.
   */
  async receiveFrame(): Promise<{ command: number, data?: Uint8Array }> {
    const header = await this.transport.read(5);
    const view = new DataView(header.buffer);
    
    if (view.getUint8(0) !== SpdFdlHandler.FRAME_START) {
      throw new Error("SPD Frame Start Mismatch");
    }
    
    const command = view.getUint16(1, false);
    const dataLength = view.getUint16(3, false);
    
    let data: Uint8Array | undefined;
    if (dataLength > 0) {
      data = await this.transport.read(dataLength);
    }
    
    const footer = await this.transport.read(3);
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
    await this.transport.connect();
    
    await this.sendFrame(this.BSL.CMD_CONNECT); // START
    const response = await this.receiveFrame();
    
    if (response.command !== this.BSL.REP_ACK) { // ACK
      throw new Error(`SPD Connection Failed, expected ACK (0x80), got: 0x${response.command.toString(16)}`);
    }
    
    console.log("[SPD] Connected Successfully");
  }

  async sendBaudRate(baudRate: number): Promise<void> {
    const baudBuffer = new Uint8Array(4);
    new DataView(baudBuffer.buffer).setUint32(0, baudRate, false); // Big-endian
    await this.sendFrame(0x0001, baudBuffer); // CMD_CHANGE_BAUD
    const response = await this.receiveFrame();
    if (response.command !== this.BSL.REP_ACK) {
      throw new Error("SPD Change Baud Rate Failed");
    }
  }

  async readFlash(address: number, length: number): Promise<Uint8Array> {
    const payload = new Uint8Array(8);
    const view = new DataView(payload.buffer);
    view.setUint32(0, address, false);
    view.setUint32(4, length, false);
    
    await this.sendFrame(this.BSL.CMD_READ_FLASH, payload);
    
    // The device will respond with CMD_READ_FLASH, followed by the data
    const response = await this.receiveFrame();
    if (response.command !== this.BSL.CMD_READ_FLASH || !response.data) {
      throw new Error("SPD Read Flash Failed");
    }
    
    return response.data;
  }

  async loadFdl(fdl: Uint8Array, address: number): Promise<void> {
    // FDL1 Load sequence
    const addrBuffer = new Uint8Array(4);
    new DataView(addrBuffer.buffer).setUint32(0, address, false);
    
    await this.sendFrame(this.BSL.CMD_START_DATA, addrBuffer); 
    let response = await this.receiveFrame();
    if (response.command !== this.BSL.REP_ACK) throw new Error("FDL Start Data Failed");

    // Send data in chunks (simplified)
    await this.sendFrame(this.BSL.CMD_MIDST_DATA, fdl);
    response = await this.receiveFrame();
    if (response.command !== this.BSL.REP_ACK) throw new Error("FDL Midst Data Failed");

    await this.sendFrame(this.BSL.CMD_END_DATA);
    response = await this.receiveFrame();
    if (response.command !== this.BSL.REP_ACK) throw new Error("FDL End Data Failed");
    
    await this.sendFrame(this.BSL.CMD_EXEC_DATA); // EXEC
    console.log("[SPD] FDL Loaded and Executed Successfully");
  }
}
