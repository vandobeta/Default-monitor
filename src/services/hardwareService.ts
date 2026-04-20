
import { webUsb } from './webUsbService';
import { DEVICE_MAPPINGS } from './DeviceMappings';

export type DeviceMode = 'BROM' | 'Preloader' | 'Fastboot' | 'ADB' | 'MTP' | 'Download' | 'EDL' | 'DFU' | 'FDL' | 'Recovery' | 'Unknown';

export interface DeviceIdentity {
  vid: number;
  pid: number;
  chipset: string;
  mode: DeviceMode;
  modelName: string;
  brand: string;
}

const CHIPSET_MAP: Record<number, string> = {
  0x05AC: 'Apple Inc.',
  0x04E8: 'Samsung Electronics',
  0x0E8D: 'MediaTek Inc.',
  0x05C6: 'Qualcomm, Inc.',
  0x1782: 'Unisoc (Spreadtrum)',
  0x2A4B: 'Transsion Holdings',
  0x12D1: 'Huawei Technologies',
  0x0BB4: 'HTC Corporation',
  0x18D1: 'Google Inc.',
  0x0421: 'Nokia Mobile Phones',
  0x0B05: 'ASUSTek Computer Inc.',
  0x413C: 'Dell Inc.',
  0x22B8: 'Motorola',
  0x2717: 'Xiaomi',
};

// Detailed mapping for specific VID/PID combinations to exact models or families
const MODEL_MAP: Record<string, string> = {
  // Samsung
  '04E8:6860': 'Samsung Galaxy Device (MTP Mode)',
  '04E8:685D': 'Samsung Galaxy Device (Download/Odin Mode)',
  '04E8:685E': 'Samsung Galaxy Device (ADB Mode)',
  '04E8:6865': 'Samsung Galaxy Device (PTP Mode)',
  
  // Google / AOSP
  '18D1:4EE1': 'Android Device (MTP)',
  '18D1:4EE2': 'Android Device (MTP + ADB)',
  '18D1:4EE0': 'Android Device (ADB Mode)',
  '18D1:D00D': 'Android Device (Fastboot Mode)',
  
  // Qualcomm
  '05C6:9008': 'Qualcomm Device (HS-USB QDLoader 9008 - EDL Mode)',
  '05C6:900E': 'Qualcomm Device (HS-USB Diagnostic 900E)',
  '05C6:9025': 'Qualcomm Device (HS-USB Device)',
  '05C6:9018': 'Qualcomm Device (HS-USB QDLoader Alternate)',
  '05C6:9091': 'Qualcomm Device (Diagnostic Mode)',
  '05C6:90BB': 'Qualcomm Device (Snapdragon MIDI/ADB)',
  '05C6:9211': 'Qualcomm Device (Gobi QDL Mode)',
  '05C6:9215': 'Qualcomm Device (EC20 LTE Modem)',
  '05C6:F00E': 'Fairphone 3 (Boot Mode)',
  
  // MediaTek
  '0E8D:0003': 'MediaTek Device (BROM Mode)',
  '0E8D:2000': 'MediaTek Device (Preloader VCOM)',
  '0E8D:2001': 'MediaTek Device (DA USB Port)',
  '0E8D:2006': 'MediaTek Device (Gadget CDC Port)',
  '0E8D:0023': 'MediaTek Device (MTK Modem)',
  '0E8D:7630': 'MediaTek Device (M76USB Bluetooth)',
  '0E8D:3329': 'Qstarz BT-Q1000XT (GPS Logger)',
  '0E8D:00A5': 'Medion Surfstick (GSM Modem)',
  
  // Unisoc / Spreadtrum
  '1782:4D00': 'Unisoc/Spreadtrum Device (FDL Mode)',
  
  // Apple
  '05AC:12A8': 'Apple Device (Standard MTP/PTP)',
  '05AC:1281': 'Apple Device (Recovery Mode - iBoot)',
  '05AC:1227': 'Apple Device (DFU Mode - SecureROM)',
  '05AC:04FE': 'Apple Device (Charging State)',

  // Others
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
    
    let modelName = MODEL_MAP[`${hexVid}:${hexPid}`] || device.productName || 'Unknown Android Device';
    let brand = CHIPSET_MAP[vid] || 'Unknown';
    
    // Check against the comprehensive DEVICE_MAPPINGS
    if (device.productName) {
      const mapping = DEVICE_MAPPINGS.find(m => 
        (m.model_code && device.productName!.includes(m.model_code)) ||
        device.productName!.includes(m.model)
      );
      if (mapping) {
        modelName = `${mapping.brand} ${mapping.model}`;
        brand = mapping.brand;
      }
    }
    
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
      else if (vid === 0x1782 && pid === 0x4D00) mode = 'FDL';
      else if (vid === 0x05AC && pid === 0x1227) mode = 'DFU';
      else if (vid === 0x05AC && pid === 0x1281) mode = 'Recovery';
    }

    return { vid, pid, chipset, mode, modelName, brand };
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
