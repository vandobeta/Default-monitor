export const VendorIdentifiers: Record<string, string> = {
  '05AC': 'Apple Inc.',
  '04E8': 'Samsung Electronics',
  '0E8D': 'MediaTek Inc.',
  '05C6': 'Qualcomm, Inc.',
  '1782': 'Unisoc (Spreadtrum)',
  '2A4B': 'Transsion Holdings',
  '12D1': 'Huawei Technologies',
  '0BB4': 'HTC Corporation',
  '18D1': 'Google Inc.',
  '0421': 'Nokia Mobile Phones',
  '0B05': 'ASUSTek Computer Inc.',
  '413C': 'Dell Inc.',
};

export const QualcommProductIdentifiers: Record<string, { name: string, description: string }> = {
  '9008': { name: 'HS-USB QDLoader', description: 'Emergency Download Mode (EDL) for low-level recovery' },
  '900E': { name: 'HS-USB Diagnostic', description: 'Primary port for calibration, RF testing, and NV management' },
  '9025': { name: 'HS-USB Device', description: 'General-purpose high-speed composite interface' },
  '9018': { name: 'HS-USB QDLoader', description: 'Alternate secondary bootloader identification' },
  '9091': { name: 'Diagnostic Mode', description: 'Specific to Jolla C and Intex Aqua Fish devices' },
  '90BB': { name: 'Snapdragon MIDI', description: 'Composite interface for MIDI and ADB debugging' },
  '9211': { name: 'Gobi QDL Mode', description: 'Modem firmware upload state for Acer hardware' },
  '9215': { name: 'EC20 LTE Modem', description: 'Quectel/Acer cellular modem interface' },
  'F00E': { name: 'FP3 Boot Mode', description: 'Fairphone 3 specific vendor-assigned ID' },
};

export const MediaTekProductIdentifiers: Record<string, { name: string, description: string }> = {
  '0003': { name: 'MTK USB Port', description: 'Initial BROM state for both feature phones and smartphones' },
  '2000': { name: 'Preloader VCOM', description: 'Software-level bootloader active before the OS kernel' },
  '2001': { name: 'DA USB Port', description: 'Download Agent mode, used by SP Flash Tool for partition writes' },
  '2006': { name: 'Gadget CDC Port', description: 'Generic kernel-level serial gadget interface' },
  '0023': { name: 'MTK Modem', description: 'Standard communication port for feature phone modem access' },
  '7630': { name: 'M76USB Bluetooth', description: 'Integrated Bluetooth driver for MT76xx series radios' },
  '3329': { name: 'Qstarz BT-Q1000XT', description: 'MediaTek-based GPS logger identification' },
  '00A5': { name: 'GSM Modem', description: 'Medion Surfstick (MediaTek chipset) modem interface' },
};

export const SamsungProductIdentifiers: Record<string, { name: string, description: string }> = {
  '685D': { name: 'Download Mode', description: 'Active during Odin/Download mode flashing' },
  '6860': { name: 'MTP Mode', description: 'Standard user-facing file transfer mode' },
  '685E': { name: 'ADB Mode', description: 'Active when USB debugging is enabled' },
  '6865': { name: 'PTP Mode', description: 'Picture Transfer Protocol identification' },
};

export const AppleProductIdentifiers: Record<string, { name: string, description: string }> = {
  '12A8': { name: 'Standard', description: 'Normal user operation with MTP/PTP active' },
  '1281': { name: 'Recovery', description: 'iBoot active; "Connect to Computer" screen visible' },
  '1227': { name: 'DFU Mode', description: 'SecureROM active; Screen is black; No serial provided' },
  '04FE': { name: 'Charging', description: 'Low-power charging state without data synchronization' },
};

export const MediaTekChipsetIdentifiers: Record<string, string> = {
  'MT6765': 'Helio P35 / G35',
  'MT6762': 'Helio P22 / G25',
  'MT6769': 'Helio G85 / G88',
  'MT6789': 'Helio G99',
  'MT6833': 'Dimensity 700 / 6080',
  'MT6580': 'MT6580 (Legacy)',
  'MT6781': 'Helio G96',
  'MT6891': 'Dimensity 1100',
};

export const QualcommHWIDIdentifiers: Record<string, string> = {
  '000940E1': 'MSM8909',
  '000BF0E1': 'MSM8937',
  '000460E1': 'MSM8953',
  '000560E1': 'MSM8996',
  '000660E1': 'MSM8998',
  '000720E1': 'SDM660',
  '000100E1': 'APQ8084',
  '001970E1': 'QCM6490',
};

export const UnisocChipsetIdentifiers: Record<string, string> = {
  'SC6531E': 'ARM926EJ-S',
  'T107': 'Cortex-A7 (1.0 GHz)',
  'T117': 'Cortex-A7 (1.0 GHz)',
  'T127': 'Cortex-A7 (1.0 GHz)',
  'UMS9117': 'Cortex-A7 (1.0 GHz)',
  'SC9820E': 'Cortex-A53 (Dual)',
  'SC7701B': 'ARM9 (460 MHz)',
  'Tiger T310': 'Cortex-A75/A55',
};

export function identifyDevice(vid: string, pid: string): { vendor: string, mode: string, description: string } {
  const vendorId = vid.toUpperCase();
  const productId = pid.toUpperCase();

  const vendor = VendorIdentifiers[vendorId] || 'Unknown Vendor';
  let mode = 'Unknown Mode';
  let description = 'No description available';

  if (vendorId === '05C6') {
    const qcom = QualcommProductIdentifiers[productId];
    if (qcom) {
      mode = qcom.name;
      description = qcom.description;
    }
  } else if (vendorId === '0E8D') {
    const mtk = MediaTekProductIdentifiers[productId];
    if (mtk) {
      mode = mtk.name;
      description = mtk.description;
    }
  } else if (vendorId === '04E8') {
    const samsung = SamsungProductIdentifiers[productId];
    if (samsung) {
      mode = samsung.name;
      description = samsung.description;
    }
  } else if (vendorId === '05AC') {
    const apple = AppleProductIdentifiers[productId];
    if (apple) {
      mode = apple.name;
      description = apple.description;
    }
  } else if (vendorId === '18D1') {
    if (productId === 'D00D') {
      mode = 'Fastboot Mode';
      description = 'Android Open Source Project (AOSP) Fastboot interface';
    } else if (productId === '4EE0' || productId === '4EE2' || productId === '4EE7') {
      mode = 'ADB Mode';
      description = 'Android Debug Bridge interface';
    }
  } else if (vendorId === '1782') {
    if (productId === '4D00') {
      mode = 'FDL Mode';
      description = 'Unisoc/Spreadtrum Firmware Downloader mode';
    }
  }

  return { vendor, mode, description };
}
