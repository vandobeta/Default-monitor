
/**
 * CRC16 Checksum Utility for SPD/Unisoc FDL
 */
export class CRC16 {
  private static readonly TABLE: Uint16Array = new Uint16Array(256).map((_, i) => {
    let crc = i << 8;
    for (let j = 0; j < 8; j++) {
      crc = (crc & 0x8000) ? (crc << 1) ^ 0x1021 : crc << 1;
    }
    return crc & 0xFFFF;
  });

  static calculate(data: Uint8Array): number {
    let crc = 0xFFFF;
    for (const byte of data) {
      crc = (crc << 8) ^ this.TABLE[((crc >> 8) ^ byte) & 0xFF];
    }
    return crc & 0xFFFF;
  }
}
