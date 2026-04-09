export class BaseUSBTransport {
  public device: USBDevice;
  public interfaceNumber: number = 0;
  public epIn: number = 0;
  public epOut: number = 0;

  constructor(device: USBDevice) {
    this.device = device;
  }

  async connect(interfaceClass?: number, interfaceSubclass?: number, interfaceProtocol?: number): Promise<void> {
    if (!this.device.opened) {
      await this.device.open();
    }
    if (this.device.configuration === null) {
      await this.device.selectConfiguration(1);
    }

    let found = false;
    for (const iface of this.device.configuration.interfaces) {
      for (const alt of iface.alternates) {
        const matchClass = interfaceClass === undefined || alt.interfaceClass === interfaceClass;
        const matchSubclass = interfaceSubclass === undefined || alt.interfaceSubclass === interfaceSubclass;
        const matchProtocol = interfaceProtocol === undefined || alt.interfaceProtocol === interfaceProtocol;

        if (matchClass && matchSubclass && matchProtocol) {
          this.interfaceNumber = iface.interfaceNumber;
          for (const ep of alt.endpoints) {
            if (ep.direction === 'in') this.epIn = ep.endpointNumber;
            if (ep.direction === 'out') this.epOut = ep.endpointNumber;
          }
          found = true;
          break;
        }
      }
      if (found) break;
    }

    if (!found) {
      // Fallback
      for (const iface of this.device.configuration.interfaces) {
        this.interfaceNumber = iface.interfaceNumber;
        for (const alt of iface.alternates) {
          for (const ep of alt.endpoints) {
            if (ep.direction === 'in') this.epIn = ep.endpointNumber;
            if (ep.direction === 'out') this.epOut = ep.endpointNumber;
          }
        }
      }
    }

    try {
      await this.device.claimInterface(this.interfaceNumber);
    } catch (e) {
      console.warn("Could not claim interface", e);
    }
  }

  async disconnect(): Promise<void> {
    if (this.device.opened) {
      try {
        await this.device.releaseInterface(this.interfaceNumber);
      } catch (e) {}
      await this.device.close();
    }
  }

  async write(data: Uint8Array, chunkSize: number = 1024 * 1024): Promise<void> {
    let offset = 0;
    while (offset < data.length) {
      const chunk = data.slice(offset, offset + chunkSize);
      await this.device.transferOut(this.epOut, chunk);
      offset += chunkSize;
    }
  }

  async send(data: Uint8Array, chunkSize?: number): Promise<void> {
    return this.write(data, chunkSize);
  }

  async read(length: number, timeoutMs: number = 5000): Promise<Uint8Array> {
    // WebUSB doesn't natively support timeouts on transferIn, but we can simulate it
    // by wrapping it in a Promise.race if we had a way to abort.
    // For now, we just await transferIn.
    const result = await this.device.transferIn(this.epIn, length);
    if (result.status !== 'ok' || !result.data) {
      throw new Error(`USB Receive failed: ${result.status}`);
    }
    return new Uint8Array(result.data.buffer);
  }

  async receive(length: number, timeoutMs?: number): Promise<Uint8Array> {
    return this.read(length, timeoutMs);
  }

  async controlTransferOut(setup: USBControlTransferParameters, data?: BufferSource): Promise<USBOutTransferResult> {
    return await this.device.controlTransferOut(setup, data);
  }

  async controlTransferIn(setup: USBControlTransferParameters, length: number): Promise<USBInTransferResult> {
    return await this.device.controlTransferIn(setup, length);
  }
}
