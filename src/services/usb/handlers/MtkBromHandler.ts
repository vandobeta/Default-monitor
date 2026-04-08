
import { USBTransport } from '../USBTransport';

/**
 * Layer 3: MediaTek (BROM & Preloader)
 * Implements the MTK handshake and watchdog disable over WebUSB.
 */
export class MtkBromHandler {
  private transport: USBTransport;

  constructor(transport: USBTransport) {
    this.transport = transport;
  }

  /**
   * MTK Handshake: Send 0xa0 and wait for 0x5f.
   */
  async bromHandshake(): Promise<void> {
    const ping = new Uint8Array([0xa0]);
    await this.transport.send(ping);
    
    const pong = await this.transport.receive(1);
    const view = new DataView(pong.buffer);
    
    if (view.getUint8(0) !== 0x5f) {
      throw new Error("MTK Pong Packet Mismatch");
    }
    
    console.log("[MTK] Handshake Successful");
  }

  /**
   * Disable Watchdog: Send the sequence to disable the watchdog.
   */
  async disableWatchdog(): Promise<void> {
    const sequence = new Uint8Array([0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]);
    await this.transport.send(sequence);
    
    const response = await this.transport.receive(1);
    const view = new DataView(response.buffer);
    
    if (view.getUint8(0) !== 0x01) {
      throw new Error("MTK Watchdog Disable Failed");
    }
    
    console.log("[MTK] Watchdog Disabled Successfully");
  }

  /**
   * Port the "Payload" (the binary code that bypasses security) into a Uint8Array.
   */
  async loadPayload(payload: Uint8Array): Promise<void> {
    await this.transport.send(payload);
    
    const response = await this.transport.receive(1);
    const view = new DataView(response.buffer);
    
    if (view.getUint8(0) !== 0x01) {
      throw new Error("MTK Payload Load Failed");
    }
    
    console.log("[MTK] Payload Loaded Successfully");
  }
}
