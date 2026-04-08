
export class WebUsbService {
  private device: USBDevice | null = null;

  async requestDevice(): Promise<USBDevice> {
    const device = await navigator.usb.requestDevice({
      filters: [
        { classCode: 0xFF, subclassCode: 0x42, protocolCode: 0x01 }, // ADB
        { classCode: 0xFF, subclassCode: 0x42, protocolCode: 0x03 }, // Fastboot
        { classCode: 0xFF }, // Generic Vendor-Specific (Common for Download Modes)
        { vendorId: 0x0E8D }, // MediaTek
        { vendorId: 0x1782 }, // Spreadtrum / Unisoc
        { vendorId: 0x05C6 }, // Qualcomm (EDL Mode)
        { vendorId: 0x04E8 }, // Samsung (Download Mode)
        { vendorId: 0x05AC }, // Apple (DFU Mode)
        { vendorId: 0x12D1 }, // Huawei
        { vendorId: 0x22B8 }, // Motorola
        { vendorId: 0x0BB4 }, // HTC
        { vendorId: 0x19D2 }, // ZTE
        { vendorId: 0x2D95 }, // Oppo / Realme / Vivo
      ]
    });
    this.device = device;
    return device;
  }

  async connect(device: USBDevice): Promise<void> {
    this.device = device;
    await this.device.open();
    if (this.device.configuration === null) {
      await this.device.selectConfiguration(1);
    }
    await this.device.claimInterface(0);
  }

  async sendData(data: Uint8Array): Promise<USBOutTransferResult> {
    if (!this.device) throw new Error("No device connected");
    return await this.device.transferOut(1, data);
  }

  async receiveData(length: number): Promise<USBInTransferResult> {
    if (!this.device) throw new Error("No device connected");
    return await this.device.transferIn(1, length);
  }

  async close(): Promise<void> {
    if (this.device) {
      await this.device.releaseInterface(0);
      await this.device.close();
      this.device = null;
    }
  }

  getDevice(): USBDevice | null {
    return this.device;
  }
}

export const webUsb = new WebUsbService();
