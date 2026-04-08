import {
  USBProtocol,
  WebADB,
  WebFastboot,
  WebMTP,
  WebBootrom,
  WebEDL,
  WebFDL,
  WebApple,
  WebHuawei,
  WebSamsung
} from './protocols';
import { mcpServer } from '../mcp/McpServer';

export class USBManager {
  private static activeProtocol: USBProtocol | null = null;
  private static sessionId: string | null = null;

  static async connect(logger: (msg: string) => void): Promise<{ device: USBDevice, info: any, protocol: USBProtocol | null, sessionId: string }> {
    try {
      const device = await navigator.usb.requestDevice({ filters: [] });
      await device.open();
      
      this.sessionId = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      logger(`[Session] New session initialized: ${this.sessionId}`);

      const info = {
        vendorId: device.vendorId.toString(16).padStart(4, '0'),
        productId: device.productId.toString(16).padStart(4, '0'),
        serialNumber: device.serialNumber || 'Unknown',
        manufacturerName: device.manufacturerName || 'Unknown',
        productName: device.productName || 'Unknown',
        usbVersion: `${device.usbVersionMajor}.${device.usbVersionMinor}`,
        deviceClass: device.deviceClass,
        deviceSubclass: device.deviceSubclass,
        deviceProtocol: device.deviceProtocol,
        mode: 'Unknown'
      };

      // Master Routing Table for Device Detection
      let ProtocolClass: new (device: USBDevice) => USBProtocol;

      // Normalize IDs to uppercase for consistent matching
      const vid = info.vendorId.toUpperCase();
      const pid = info.productId.toUpperCase();

      if (vid === '18D1' && pid === 'D00D') {
        info.mode = 'Fastboot';
        ProtocolClass = WebFastboot;
      } else if (vid === '18D1' && pid === '4EE0') {
        info.mode = 'ADB';
        ProtocolClass = WebADB;
      } else if (vid === '05C6' && pid === '9008') {
        info.mode = 'EDL (Qualcomm)';
        ProtocolClass = WebEDL;
      } else if (vid === '0E8D' && pid === '0003') {
        info.mode = 'BROM (MediaTek)';
        ProtocolClass = WebBootrom;
      } else if (vid === '1782' && pid === '4D00') {
        info.mode = 'FDL (Spreadtrum)';
        ProtocolClass = WebFDL;
      } else if (vid === '12D1') {
        info.mode = 'Huawei (Kirin)';
        ProtocolClass = WebHuawei;
      } else if (vid === '04E8') {
        info.mode = 'Samsung (Download Mode)';
        ProtocolClass = WebSamsung;
      } else if (vid === '05AC') {
        info.mode = 'Apple (DFU)';
        ProtocolClass = WebApple;
      } else if (info.deviceClass === 255 && info.deviceSubclass === 66 && info.deviceProtocol === 1) {
        info.mode = 'ADB';
        ProtocolClass = WebADB;
      } else if (info.deviceClass === 255 && info.deviceSubclass === 66 && info.deviceProtocol === 3) {
        info.mode = 'Fastboot';
        ProtocolClass = WebFastboot;
      } else {
        // Default to MTP if we can't determine, or if it's a standard media device
        info.mode = 'MTP/Unknown';
        ProtocolClass = WebMTP;
      }

      logger(`[USB] Device Connected: ${info.manufacturerName} ${info.productName}`);
      logger(`[USB] VID: 0x${info.vendorId} PID: 0x${info.productId}`);
      logger(`[USB] Detected Mode: ${info.mode}`);

      // Update MCP Server context
      mcpServer.setActiveDevice(device);
      mcpServer.setSessionId(this.sessionId!);
      logger(`[MCP] Device context updated for ${info.productName}`);

      // Instantiate the appropriate background module
      this.activeProtocol = new ProtocolClass(device);
      logger(`[USBManager] Loading background module: ${this.activeProtocol.name}`);
      
      // Perform the initial handshake
      await this.activeProtocol.handshake(logger);

      return { device, info, protocol: this.activeProtocol, sessionId: this.sessionId! };
    } catch (err: any) {
      logger(`[ERROR] USB Connection failed: ${err.message}`);
      throw err;
    }
  }

  static getActiveProtocol(): USBProtocol | null {
    return this.activeProtocol;
  }

  static async disconnect(logger: (msg: string) => void) {
    if (this.activeProtocol) {
      await this.activeProtocol.disconnect(logger);
      this.activeProtocol = null;
    }
  }
}
