
import { USBTransport } from '../USBTransport';

/**
 * Layer 2: WebADB (The Handshake)
 * Implements the ADB message format and handshake over WebUSB.
 */
export class WebAdbHandler {
  private transport: USBTransport;
  private static readonly MAX_PAYLOAD = 256 * 1024;

  constructor(transport: USBTransport) {
    this.transport = transport;
  }

  /**
   * ADB Message Format: [Command, Arg0, Arg1, DataLength, DataChecksum, Magic]
   */
  private createHeader(command: string, arg0: number, arg1: number, dataLength: number): Uint32Array {
    const cmd = new TextEncoder().encode(command);
    const cmdVal = new DataView(cmd.buffer).getUint32(0, true);
    const magic = cmdVal ^ 0xFFFFFFFF;
    
    return new Uint32Array([cmdVal, arg0, arg1, dataLength, 0, magic]);
  }

  /**
   * Sends an ADB message.
   */
  async sendMessage(command: string, arg0: number, arg1: number, data?: Uint8Array): Promise<void> {
    const dataLength = data ? data.length : 0;
    const header = this.createHeader(command, arg0, arg1, dataLength);
    
    await this.transport.send(new Uint8Array(header.buffer));
    if (data) await this.transport.send(data);
  }

  /**
   * Receives an ADB message.
   */
  async receiveMessage(): Promise<{ command: string, arg0: number, arg1: number, data?: Uint8Array }> {
    const headerData = await this.transport.receive(24);
    const view = new DataView(headerData.buffer);
    
    const cmdVal = view.getUint32(0, true);
    const arg0 = view.getUint32(4, true);
    const arg1 = view.getUint32(8, true);
    const dataLength = view.getUint32(12, true);
    const magic = view.getUint32(20, true);
    
    if ((cmdVal ^ 0xFFFFFFFF) !== magic) throw new Error("ADB Header Magic Mismatch");
    
    const command = new TextDecoder().decode(headerData.slice(0, 4));
    let data: Uint8Array | undefined;
    
    if (dataLength > 0) {
      data = await this.transport.receive(dataLength);
    }
    
    return { command, arg0, arg1, data };
  }

  /**
   * Performs the ADB handshake.
   */
  async connect(): Promise<void> {
    await this.transport.connect();
    await this.sendMessage('CNXN', 0x01000000, WebAdbHandler.MAX_PAYLOAD, new TextEncoder().encode('host::\0'));
    const response = await this.receiveMessage();
    
    if (response.command === 'AUTH') {
      // Handle authentication (RSA key signing)
      // For now, we'll just throw an error as it's complex
      throw new Error("ADB Authentication Required. Please allow the connection on your device.");
    }
    
    if (response.command !== 'CNXN') {
      throw new Error(`ADB Connection Failed: ${response.command}`);
    }
    
    console.log("[ADB] Connected Successfully");
  }

  /**
   * Reboots the device via ADB.
   */
  async reboot(mode: string = ''): Promise<void> {
    const rebootCmd = mode ? `reboot:${mode}` : 'reboot:';
    await this.sendMessage('OPEN', 1, 0, new TextEncoder().encode(`${rebootCmd}\0`));
    console.log(`[ADB] Reboot command sent: ${rebootCmd}`);
  }

  /**
   * Sideloads a firmware package (OTA) to the device.
   */
  async sideload(data: Uint8Array): Promise<void> {
    console.log("[ADB] Initiating Sideload...");
    // Sideload protocol: Open sideload service, then stream data
    await this.sendMessage('OPEN', 2, 0, new TextEncoder().encode('sideload:host\0'));
    // In a real implementation, we would handle the stream and write the data in chunks
    await this.sendMessage('WRTE', 2, 0, data);
    console.log("[ADB] Sideload complete");
  }
}
