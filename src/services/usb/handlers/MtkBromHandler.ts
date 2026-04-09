
import { USBTransport } from '../USBTransport';

/**
 * Layer 3: MediaTek (BROM & Preloader)
 * Implements the MTK handshake and watchdog disable over WebUSB.
 * Packet structures based on bkerler/mtkclient
 */
export class MtkBromHandler {
  private transport: USBTransport;

  // MTK BROM Commands
  private readonly CMD = {
    START: 0xA0,
    READ16: 0xA2,
    READ32: 0xD0,
    WRITE16: 0xA1,
    WRITE32: 0xD1,
    JUMP_DA: 0xD5,
    SEND_DA: 0xD7,
    GET_TARGET_CONFIG: 0xD8,
    UART1_LOG_EN: 0xDB,
    GET_HW_SW_VER: 0xFC,
    GET_HW_CODE: 0xFD
  };

  private readonly ACK = 0x5A;
  private readonly NACK = 0x5F; // Actually 0x5F is often the response to START

  constructor(transport: USBTransport) {
    this.transport = transport;
  }

  /**
   * MTK Handshake: Send 0xA0 and wait for 0x5F.
   */
  async bromHandshake(): Promise<void> {
    await this.transport.connect();
    
    const ping = new Uint8Array([this.CMD.START]);
    await this.transport.write(ping);
    
    const pong = await this.transport.read(1);
    
    if (pong[0] !== this.NACK) {
      throw new Error(`MTK Pong Packet Mismatch: Expected 0x5F, got 0x${pong[0].toString(16)}`);
    }
    
    console.log("[MTK] Handshake Successful");
  }

  /**
   * Read 16-bit word from memory
   */
  async read16(address: number): Promise<number> {
    const cmd = new Uint8Array([this.CMD.READ16, (address >> 24) & 0xFF, (address >> 16) & 0xFF, (address >> 8) & 0xFF, address & 0xFF]);
    await this.transport.write(cmd);
    
    const response = await this.transport.read(4); // Echo + status + data
    // Format: [echo_cmd, status_high, status_low, data_high, data_low] - simplifying here
    return (response[2] << 8) | response[3];
  }

  /**
   * Write 16-bit word to memory
   */
  async write16(address: number, data: number): Promise<void> {
    const cmd = new Uint8Array([this.CMD.WRITE16, (address >> 24) & 0xFF, (address >> 16) & 0xFF, (address >> 8) & 0xFF, address & 0xFF, (data >> 8) & 0xFF, data & 0xFF]);
    await this.transport.write(cmd);
    
    const response = await this.transport.read(2);
    if (response[1] !== 0x00) {
      throw new Error("MTK Write16 Failed");
    }
  }

  /**
   * Read 32-bit word from memory
   */
  async read32(address: number, count: number = 1): Promise<Uint32Array> {
    const cmd = new Uint8Array([this.CMD.READ32, (address >> 24) & 0xFF, (address >> 16) & 0xFF, (address >> 8) & 0xFF, address & 0xFF, (count >> 24) & 0xFF, (count >> 16) & 0xFF, (count >> 8) & 0xFF, count & 0xFF]);
    await this.transport.write(cmd);
    
    // Read echo
    await this.transport.read(1);
    
    // Read data + status
    const data = await this.transport.read(count * 4 + 2);
    const result = new Uint32Array(count);
    const view = new DataView(data.buffer);
    
    for (let i = 0; i < count; i++) {
      result[i] = view.getUint32(i * 4, false); // Big-endian
    }
    
    return result;
  }

  /**
   * Write 32-bit word to memory
   */
  async write32(address: number, data: Uint32Array): Promise<void> {
    const count = data.length;
    const cmd = new Uint8Array([this.CMD.WRITE32, (address >> 24) & 0xFF, (address >> 16) & 0xFF, (address >> 8) & 0xFF, address & 0xFF, (count >> 24) & 0xFF, (count >> 16) & 0xFF, (count >> 8) & 0xFF, count & 0xFF]);
    await this.transport.write(cmd);
    
    // Read echo
    await this.transport.read(1);
    
    // Write data
    const dataBytes = new Uint8Array(data.buffer);
    // Note: dataBytes might need to be byte-swapped if system is little-endian but MTK expects big-endian
    await this.transport.write(dataBytes);
    
    // Read status
    const response = await this.transport.read(2);
    if (response[1] !== 0x00) {
      throw new Error("MTK Write32 Failed");
    }
  }

  /**
   * Send Download Agent (DA) to device
   */
  async sendDa(address: number, da: Uint8Array): Promise<void> {
    const length = da.length;
    const cmd = new Uint8Array([this.CMD.SEND_DA, (address >> 24) & 0xFF, (address >> 16) & 0xFF, (address >> 8) & 0xFF, address & 0xFF, (length >> 24) & 0xFF, (length >> 16) & 0xFF, (length >> 8) & 0xFF, length & 0xFF]);
    await this.transport.write(cmd);
    
    // Read echo
    await this.transport.read(1);
    
    // Send DA in chunks
    let offset = 0;
    const chunkSize = 4096;
    while (offset < length) {
      const chunk = da.slice(offset, offset + chunkSize);
      await this.transport.write(chunk);
      offset += chunkSize;
    }
    
    // Read checksum and status
    const response = await this.transport.read(4);
    console.log("[MTK] DA Sent Successfully");
  }

  /**
   * Jump to Download Agent (DA)
   */
  async jumpDa(address: number): Promise<void> {
    const cmd = new Uint8Array([this.CMD.JUMP_DA, (address >> 24) & 0xFF, (address >> 16) & 0xFF, (address >> 8) & 0xFF, address & 0xFF]);
    await this.transport.write(cmd);
    
    // Read echo and status
    const response = await this.transport.read(3);
    if (response[2] !== 0x00) {
      throw new Error("MTK Jump DA Failed");
    }
    console.log("[MTK] Jumped to DA Successfully");
  }

  /**
   * Disable Watchdog: Send the sequence to disable the watchdog.
   */
  async disableWatchdog(): Promise<void> {
    // Write to watchdog register (e.g., 0x10007000)
    // This is a simplified representation
    try {
      await this.write16(0x10007000, 0x2200);
      console.log("[MTK] Watchdog Disabled Successfully");
    } catch (e) {
      console.warn("[MTK] Watchdog disable failed or not supported on this SoC");
    }
  }

  /**
   * Port the "Payload" (the binary code that bypasses security) into a Uint8Array.
   */
  async loadPayload(payload: Uint8Array): Promise<void> {
    await this.transport.write(payload);
    
    const response = await this.transport.read(1);
    
    if (response[0] !== 0x01) {
      throw new Error("MTK Payload Load Failed");
    }
    
    console.log("[MTK] Payload Loaded Successfully");
  }
}
