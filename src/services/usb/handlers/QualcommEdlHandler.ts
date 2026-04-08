
import { USBTransport } from '../USBTransport';

/**
 * Layer 3: Qualcomm EDL (Sahara & Firehose)
 * Implements the Sahara and Firehose protocols over WebUSB.
 */
export class QualcommEdlHandler {
  private transport: USBTransport;

  constructor(transport: USBTransport) {
    this.transport = transport;
  }

  /**
   * Sahara Handshake: Listen for 0x01 (Hello) packet.
   */
  async saharaHandshake(): Promise<void> {
    const hello = await this.transport.receive(0x30);
    const view = new DataView(hello.buffer);
    
    if (view.getUint32(0, true) !== 0x01) {
      throw new Error("Sahara Hello Packet Expected");
    }
    
    // Respond with 0x02 (Hello Response)
    const response = new Uint32Array([0x02, 0x30, 0x02, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]);
    await this.transport.send(new Uint8Array(response.buffer));
    
    console.log("[Sahara] Handshake Successful");
  }

  /**
   * Streams the Programmer (ELF/MBN) in 4KB blocks.
   */
  async streamProgrammer(programmer: Uint8Array): Promise<void> {
    let offset = 0;
    const blockSize = 4096;
    
    while (offset < programmer.length) {
      const chunk = programmer.slice(offset, offset + blockSize);
      await this.transport.send(chunk);
      offset += blockSize;
    }
    
    console.log("[Sahara] Programmer Streamed Successfully");
  }

  /**
   * Firehose: XML-based command engine.
   */
  async executeFirehose(xmlCommand: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(xmlCommand);
    await this.transport.send(data);
    
    const response = await this.transport.receive(4096);
    const decoder = new TextDecoder();
    return decoder.decode(response);
  }

  async eraseFrp(): Promise<void> {
    const response = await this.executeFirehose('<?xml version="1.0" ?><data><erase label="frp" /></data>');
    if (!response.includes('ACK')) {
      throw new Error(`Firehose Erase FRP Failed: ${response}`);
    }
    console.log("[Firehose] FRP Erased Successfully");
  }
}
