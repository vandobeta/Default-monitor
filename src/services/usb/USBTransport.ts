
/**
 * Layer 1: The WebUSB Transport (The "Pipe")
 * Handles raw USB communication with chunking and promise-based flow control.
 */
export class USBTransport {
  private device: USBDevice;
  private outEndpoint: number = 1;
  private inEndpoint: number = 1;

  constructor(device: USBDevice) {
    this.device = device;
    this.findEndpoints();
  }

  private findEndpoints() {
    if (!this.device.configuration) return;
    
    for (const iface of this.device.configuration.interfaces) {
      for (const alt of iface.alternates) {
        for (const ep of alt.endpoints) {
          if (ep.direction === 'out') this.outEndpoint = ep.endpointNumber;
          if (ep.direction === 'in') this.inEndpoint = ep.endpointNumber;
        }
      }
    }
  }

  /**
   * Sends data in chunks to prevent browser buffer crashes.
   */
  async send(data: Uint8Array, chunkSize: number = 1024 * 1024): Promise<void> {
    let offset = 0;
    while (offset < data.length) {
      const chunk = data.slice(offset, offset + chunkSize);
      await this.device.transferOut(this.outEndpoint, chunk);
      offset += chunkSize;
    }
  }

  /**
   * Receives data from the device.
   */
  async receive(length: number): Promise<Uint8Array> {
    const result = await this.device.transferIn(this.inEndpoint, length);
    if (result.status !== 'ok' || !result.data) {
      throw new Error(`USB Receive failed: ${result.status}`);
    }
    return new Uint8Array(result.data.buffer);
  }

  /**
   * Control transfer wrapper
   */
  async controlTransferOut(setup: USBControlTransferParameters, data?: BufferSource): Promise<USBOutTransferResult> {
    return await this.device.controlTransferOut(setup, data);
  }

  async controlTransferIn(setup: USBControlTransferParameters, length: number): Promise<USBInTransferResult> {
    return await this.device.controlTransferIn(setup, length);
  }
}
