
import { USBTransport } from '../USBTransport';

/**
 * Layer 3: Qualcomm EDL (Sahara & Firehose)
 * Implements the Sahara and Firehose protocols over WebUSB.
 * Packet structures based on bkerler/edl
 */
export class QualcommEdlHandler {
  private transport: USBTransport;

  // Sahara Commands
  private readonly SAHARA = {
    HELLO_REQ: 0x01,
    HELLO_RSP: 0x02,
    READ_DATA: 0x03,
    END_TRANSFER: 0x04,
    DONE_REQ: 0x05,
    DONE_RSP: 0x06,
    RESET_REQ: 0x07,
    RESET_RSP: 0x08,
    MEMORY_DEBUG: 0x09,
    MEMORY_READ: 0x0A,
    CMD_READY: 0x0B,
    CMD_SWITCH_MODE: 0x0C,
    CMD_EXEC: 0x0D,
    CMD_EXEC_RSP: 0x0E,
    CMD_EXEC_DATA: 0x0F
  };

  // Sahara Modes
  private readonly SAHARA_MODE = {
    IMAGE_TX_PENDING: 0x00,
    IMAGE_TX_COMPLETE: 0x01,
    MEMORY_DEBUG: 0x02,
    COMMAND: 0x03
  };

  constructor(transport: USBTransport) {
    this.transport = transport;
  }

  /**
   * Sahara Handshake: Listen for 0x01 (Hello) packet.
   */
  async saharaHandshake(): Promise<void> {
    await this.transport.connect();
    
    // Read Hello packet (usually 0x30 bytes)
    const hello = await this.transport.read(0x30);
    const view = new DataView(hello.buffer);
    
    const cmd = view.getUint32(0, true);
    if (cmd !== this.SAHARA.HELLO_REQ) {
      throw new Error(`Sahara Hello Packet Expected, got 0x${cmd.toString(16)}`);
    }
    
    // Parse Hello Request
    const version = view.getUint32(8, true);
    const minVersion = view.getUint32(12, true);
    const maxCommand = view.getUint32(16, true);
    const mode = view.getUint32(36, true);
    
    console.log(`[Sahara] Hello Received. Ver: ${version}, Mode: ${mode}`);
    
    // Respond with 0x02 (Hello Response)
    // Format: [cmd, len, version, min_version, status, mode, reserved...]
    const response = new Uint32Array([
      this.SAHARA.HELLO_RSP, 
      0x30, 
      version, 
      minVersion, 
      0x00, // status ok
      this.SAHARA_MODE.COMMAND, // Request command mode
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00
    ]);
    
    await this.transport.write(new Uint8Array(response.buffer));
    
    // Wait for CMD_READY
    const ready = await this.transport.read(0x30);
    const readyView = new DataView(ready.buffer);
    if (readyView.getUint32(0, true) !== this.SAHARA.CMD_READY) {
      console.warn("[Sahara] Did not receive CMD_READY, device might be in different mode");
    } else {
      console.log("[Sahara] Handshake Successful, in Command Mode");
    }
  }

  /**
   * Streams the Programmer (ELF/MBN) in 4KB blocks.
   */
  async streamProgrammer(programmer: Uint8Array): Promise<void> {
    let offset = 0;
    const blockSize = 4096;
    
    while (offset < programmer.length) {
      const chunk = programmer.slice(offset, offset + blockSize);
      await this.transport.write(chunk);
      offset += blockSize;
    }
    
    console.log("[Sahara] Programmer Streamed Successfully");
  }

  /**
   * Switches Sahara Mode
   */
  async switchMode(mode: number): Promise<void> {
    const packet = new Uint32Array([
      this.SAHARA.CMD_SWITCH_MODE,
      0x0C,
      mode
    ]);
    await this.transport.write(new Uint8Array(packet.buffer));
  }

  /**
   * Sends a Command Execution Request
   */
  async executeCommand(command: number): Promise<void> {
    const packet = new Uint32Array([
      this.SAHARA.CMD_EXEC,
      0x0C,
      command
    ]);
    await this.transport.write(new Uint8Array(packet.buffer));
    
    // Read Response
    const response = await this.transport.read(0x30);
    const view = new DataView(response.buffer);
    if (view.getUint32(0, true) !== this.SAHARA.CMD_EXEC_RSP) {
      throw new Error("Sahara Command Execution Failed");
    }
  }

  /**
   * Resets the device via Sahara
   */
  async resetDevice(): Promise<void> {
    const packet = new Uint32Array([
      this.SAHARA.RESET_REQ,
      0x08
    ]);
    await this.transport.write(new Uint8Array(packet.buffer));
    
    const response = await this.transport.read(0x30);
    const view = new DataView(response.buffer);
    if (view.getUint32(0, true) !== this.SAHARA.RESET_RSP) {
      throw new Error("Sahara Reset Failed");
    }
    console.log("[Sahara] Device Reset Successfully");
  }

  /**
   * Firehose: XML-based command engine.
   */
  async executeFirehose(xmlCommand: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(xmlCommand);
    await this.transport.write(data);
    
    const response = await this.transport.read(4096);
    const decoder = new TextDecoder();
    return decoder.decode(response);
  }

  async pingFirehose(): Promise<boolean> {
    const response = await this.executeFirehose('<?xml version="1.0" ?><data><ping /></data>');
    return response.includes('ACK');
  }

  async readMemory(startSector: number, numSectors: number): Promise<Uint8Array> {
    const response = await this.executeFirehose(`<?xml version="1.0" ?><data><read SECTOR_SIZE_IN_BYTES="512" num_partition_sectors="${numSectors}" start_sector="${startSector}"/></data>`);
    if (!response.includes('ACK')) {
      throw new Error("Firehose Read Memory Failed");
    }
    // After ACK, device sends the raw data
    const data = await this.transport.read(numSectors * 512);
    return data;
  }

  async eraseFrp(): Promise<void> {
    const response = await this.executeFirehose('<?xml version="1.0" ?><data><erase label="frp" /></data>');
    if (!response.includes('ACK')) {
      throw new Error(`Firehose Erase FRP Failed: ${response}`);
    }
    console.log("[Firehose] FRP Erased Successfully");
  }
}
