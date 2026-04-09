
import { USBTransport } from '../USBTransport';

/**
 * Layer 2: WebFastboot (ASCII Command-Response)
 * Implements the Fastboot protocol over WebUSB.
 */
export class WebFastbootHandler {
  private transport: USBTransport;

  constructor(transport: USBTransport) {
    this.transport = transport;
  }

  /**
   * Connects to the device.
   */
  async connect(): Promise<void> {
    await this.transport.connect();
  }

  /**
   * Sends a command and waits for a response.
   */
  async execute(command: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(command);
    await this.transport.send(data);

    const response = await this.transport.receive(64);
    const decoder = new TextDecoder();
    const result = decoder.decode(response);

    if (result.startsWith('OKAY')) return result.slice(4);
    if (result.startsWith('DATA')) return result.slice(4);
    if (result.startsWith('FAIL')) throw new Error(`Fastboot Command Failed: ${result.slice(4)}`);
    
    return result;
  }

  async getVar(variable: string): Promise<string> {
    return await this.execute(`getvar:${variable}`);
  }

  async flash(partition: string, data: Uint8Array): Promise<void> {
    await this.execute(`download:${data.length.toString(16)}`);
    await this.transport.send(data);
    await this.execute(`flash:${partition}`);
  }

  async reboot(): Promise<void> {
    await this.execute('reboot');
  }

  async setActive(slot: string): Promise<void> {
    await this.execute(`set_active:${slot}`);
  }

  async unlock(): Promise<void> {
    await this.execute('flashing unlock');
  }
}
