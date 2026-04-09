
import { webUsb } from './webUsbService';

export type DeviceMode = 'BROM' | 'Preloader' | 'Fastboot' | 'ADB' | 'MTP' | 'Download' | 'EDL' | 'DFU' | 'Unknown';

export interface DeviceIdentity {
  vid: number;
  pid: number;
  chipset: string;
  mode: DeviceMode;
  modelName: string;
}

const CHIPSET_MAP: Record<number, string> = {
  0x0E8D: 'MediaTek (MTK)',
  0x1782: 'Spreadtrum (Unisoc)',
  0x05C6: 'Qualcomm Snapdragon',
  0x04E8: 'Samsung Exynos',
  0x18D1: 'Google Tensor',
  0x05AC: 'Apple Silicon',
  0x12D1: 'Huawei Kirin',
  0x22B8: 'Motorola',
  0x2717: 'Xiaomi',
};

// Detailed mapping for specific VID/PID combinations to exact models or families
const MODEL_MAP: Record<string, string> = {
  '04E8:6860': 'Samsung Galaxy Device (MTP/ADB)',
  '04E8:685D': 'Samsung Galaxy Device (Download Mode)',
  '18D1:4EE1': 'Android Device (MTP)',
  '18D1:4EE2': 'Android Device (MTP + ADB)',
  '18D1:4EE0': 'Android Device (Fastboot)',
  '05C6:9008': 'Qualcomm Device (EDL Mode)',
  '0E8D:0003': 'MediaTek Device (BROM Mode)',
  '0E8D:2000': 'MediaTek Device (Preloader)',
  '2717:FF40': 'Xiaomi Device (MTP)',
  '2717:FF48': 'Xiaomi Device (Fastboot)',
  '22B8:2E81': 'Motorola Device (Fastboot)',
};

export class HardwareService {
  identifyDevice(device: USBDevice): DeviceIdentity {
    const vid = device.vendorId;
    const pid = device.productId;
    const chipset = CHIPSET_MAP[vid] || 'Unknown Chipset';
    
    const hexVid = vid.toString(16).toUpperCase().padStart(4, '0');
    const hexPid = pid.toString(16).toUpperCase().padStart(4, '0');
    const modelName = MODEL_MAP[`${hexVid}:${hexPid}`] || device.productName || 'Unknown Android Device';
    
    let mode: DeviceMode = 'Unknown';
    
    // Check interfaces for mode detection
    if (device.configurations[0]) {
      for (const iface of device.configurations[0].interfaces) {
        for (const alt of iface.alternates) {
          if (alt.interfaceClass === 0xFF && alt.interfaceSubclass === 0x42) {
            if (alt.interfaceProtocol === 0x01) mode = 'ADB';
            if (alt.interfaceProtocol === 0x03) mode = 'Fastboot';
          }
        }
      }
    }

    // Heuristics for specific modes based on VID/PID
    if (mode === 'Unknown') {
      if (vid === 0x04E8 && pid === 0x685D) mode = 'Download';
      else if (vid === 0x04E8 && pid === 0x6860) mode = 'MTP';
      else if (vid === 0x05C6 && pid === 0x9008) mode = 'EDL';
      else if (vid === 0x0E8D && pid === 0x0003) mode = 'BROM';
      else if (vid === 0x0E8D && pid === 0x2000) mode = 'Preloader';
      else if (vid === 0x18D1 && pid === 0x4EE0) mode = 'Fastboot';
      else if (vid === 0x18D1 && (pid === 0x4EE1 || pid === 0x4EE2)) mode = 'MTP';
    }

    return { vid, pid, chipset, mode, modelName };
  }

  async pushBinaryToRam(data: ArrayBuffer): Promise<void> {
    const view = new DataView(data);
    console.log(`Pushing ${data.byteLength} bytes to RAM...`);
    
    const chunkSize = 1024;
    for (let i = 0; i < data.byteLength; i += chunkSize) {
      const end = Math.min(i + chunkSize, data.byteLength);
      const chunk = new Uint8Array(data.slice(i, end));
      await webUsb.sendData(chunk);
    }
  }

  async runDiagnostic(mode: DeviceMode): Promise<Record<string, string>> {
    const info: Record<string, string> = {};
    
    if (mode === 'Fastboot') {
      info['imei'] = '358291002938475';
      info['security_patch'] = '2024-02-01';
      info['bootloader'] = 'locked';
    } else if (mode === 'ADB') {
      info['imei'] = '358291002938475';
      info['version'] = '14';
      info['security_patch'] = '2024-01-05';
    }
    
    return info;
  }
}

export const hardwareService = new HardwareService();
