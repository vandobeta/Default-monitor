import { USBTransport } from './USBTransport';
import { QualcommEdlHandler } from './handlers/QualcommEdlHandler';
import { MtkBromHandler } from './handlers/MtkBromHandler';
import { AppleDfuHandler } from './handlers/AppleHandler';
import { SpdFdlHandler } from './handlers/SpdFdlHandler';
import { HuaweiKirinHandler } from './handlers/HuaweiHandler';

/**
 * Mock USB Transport for Diagnostic Testing
 * Captures written data and provides predefined responses to verify driver logic.
 */
class MockUSBTransport implements USBTransport {
  public writtenData: Uint8Array[] = [];
  public controlTransfersOut: any[] = [];
  private readQueue: Uint8Array[] = [];
  private controlInQueue: Uint8Array[] = [];

  async connect(): Promise<void> {}
  async disconnect(): Promise<void> {}

  async read(length: number): Promise<Uint8Array> {
    if (this.readQueue.length > 0) {
      return this.readQueue.shift()!;
    }
    return new Uint8Array(length);
  }

  async write(data: Uint8Array): Promise<void> {
    this.writtenData.push(new Uint8Array(data));
  }

  async controlTransferIn(setup: USBControlTransferParameters, length: number): Promise<USBInTransferResult> {
    const data = this.controlInQueue.length > 0 ? this.controlInQueue.shift()! : new Uint8Array(length);
    return {
      data: new DataView(data.buffer),
      status: 'ok'
    };
  }

  async controlTransferOut(setup: USBControlTransferParameters, data?: Uint8Array): Promise<USBOutTransferResult> {
    this.controlTransfersOut.push({ setup, data });
    return {
      bytesWritten: data ? data.length : 0,
      status: 'ok'
    };
  }

  // Aliases
  async send(data: Uint8Array): Promise<void> { return this.write(data); }
  async receive(length: number): Promise<Uint8Array> { return this.read(length); }

  // Test Helpers
  queueRead(data: Uint8Array) {
    this.readQueue.push(data);
  }
  
  queueControlIn(data: Uint8Array) {
    this.controlInQueue.push(data);
  }
}

export class DriverDiagnostic {
  static async runDiagnostics(logger: (msg: string) => void): Promise<boolean> {
    let allPassed = true;
    logger("[DIAGNOSTIC] Starting Driver Self-Test...");

    // 1. Test Qualcomm EDL Handler
    try {
      logger("[DIAGNOSTIC] Testing QualcommEdlHandler...");
      const mockEdl = new MockUSBTransport();
      const edlHandler = new QualcommEdlHandler(mockEdl);
      
      // Queue Hello Request (0x01)
      const helloReq = new Uint8Array(0x30);
      new DataView(helloReq.buffer).setUint32(0, 0x01, true); // CMD = 1
      new DataView(helloReq.buffer).setUint32(8, 2, true); // Version = 2
      mockEdl.queueRead(helloReq);
      
      // Queue CMD_READY (0x0B)
      const cmdReady = new Uint8Array(0x30);
      new DataView(cmdReady.buffer).setUint32(0, 0x0B, true);
      mockEdl.queueRead(cmdReady);

      await edlHandler.saharaHandshake();
      
      // Verify response sent
      if (mockEdl.writtenData.length > 0) {
        const responseView = new DataView(mockEdl.writtenData[0].buffer);
        if (responseView.getUint32(0, true) === 0x02) {
          logger("  [PASS] Sahara Handshake generated correct HELLO_RSP (0x02)");
        } else {
          logger("  [FAIL] Sahara Handshake did not generate HELLO_RSP");
          allPassed = false;
        }
      } else {
        logger("  [FAIL] Sahara Handshake sent no data");
        allPassed = false;
      }
    } catch (e: any) {
      logger(`  [FAIL] QualcommEdlHandler Test Error: ${e.message}`);
      allPassed = false;
    }

    // 2. Test MTK BROM Handler
    try {
      logger("[DIAGNOSTIC] Testing MtkBromHandler...");
      const mockMtk = new MockUSBTransport();
      const mtkHandler = new MtkBromHandler(mockMtk);
      
      // Queue NACK (0x5F) for handshake
      mockMtk.queueRead(new Uint8Array([0x5F]));
      await mtkHandler.bromHandshake();
      
      if (mockMtk.writtenData.length > 0 && mockMtk.writtenData[0][0] === 0xA0) {
        logger("  [PASS] MTK Handshake sent correct START (0xA0) and handled 0x5F");
      } else {
        logger("  [FAIL] MTK Handshake failed validation");
        allPassed = false;
      }
    } catch (e: any) {
      logger(`  [FAIL] MtkBromHandler Test Error: ${e.message}`);
      allPassed = false;
    }

    // 3. Test Apple DFU Handler
    try {
      logger("[DIAGNOSTIC] Testing AppleDfuHandler...");
      const mockApple = new MockUSBTransport();
      const appleHandler = new AppleDfuHandler(mockApple);
      
      mockApple.queueControlIn(new Uint8Array([0x00, 0x00, 0x00, 0x00, 0x00, 0x00]));
      await appleHandler.getDfuStatus();
      logger("  [PASS] Apple DFU getDfuStatus executed correctly");
      
      await appleHandler.dfuAbort();
      if (mockApple.controlTransfersOut.length > 0 && mockApple.controlTransfersOut[0].setup.request === 6) {
        logger("  [PASS] Apple DFU Abort sent correct request (6)");
      } else {
        logger("  [FAIL] Apple DFU Abort failed validation");
        allPassed = false;
      }
    } catch (e: any) {
      logger(`  [FAIL] AppleDfuHandler Test Error: ${e.message}`);
      allPassed = false;
    }

    // 4. Test SPD FDL Handler
    try {
      logger("[DIAGNOSTIC] Testing SpdFdlHandler...");
      const mockSpd = new MockUSBTransport();
      const spdHandler = new SpdFdlHandler(mockSpd);
      
      // Queue ACK (0x80) for connect
      // Frame: [0x7E, 0x00, 0x80, 0x00, 0x00, CRC_H, CRC_L, 0x7E]
      const ackFrame = new Uint8Array([0x7E, 0x00, 0x80, 0x00, 0x00, 0x00, 0x00, 0x7E]);
      mockSpd.queueRead(ackFrame.slice(0, 5)); // Header
      mockSpd.queueRead(ackFrame.slice(5, 8)); // Footer
      
      await spdHandler.connect();
      if (mockSpd.writtenData.length > 0 && mockSpd.writtenData[0][1] === 0x00 && mockSpd.writtenData[0][2] === 0x00) {
        logger("  [PASS] SPD Handshake sent correct CMD_CONNECT (0x0000)");
      } else {
        logger("  [FAIL] SPD Handshake failed validation");
        allPassed = false;
      }
    } catch (e: any) {
      logger(`  [FAIL] SpdFdlHandler Test Error: ${e.message}`);
      allPassed = false;
    }

    // 5. Test Huawei Kirin Handler
    try {
      logger("[DIAGNOSTIC] Testing HuaweiKirinHandler...");
      const mockHuawei = new MockUSBTransport();
      const huaweiHandler = new HuaweiKirinHandler(mockHuawei);
      
      // Queue Handshake Response (0xED)
      mockHuawei.queueRead(new Uint8Array([0xED]));
      await huaweiHandler.handshake();
      
      if (mockHuawei.writtenData.length > 0 && mockHuawei.writtenData[0][0] === 0xFE) {
        logger("  [PASS] Huawei Handshake sent correct REQ (0xFE) and handled RSP (0xED)");
      } else {
        logger("  [FAIL] Huawei Handshake failed validation");
        allPassed = false;
      }
    } catch (e: any) {
      logger(`  [FAIL] HuaweiKirinHandler Test Error: ${e.message}`);
      allPassed = false;
    }

    if (allPassed) {
      logger("[DIAGNOSTIC] All Driver Self-Tests Passed Successfully.");
    } else {
      logger("[DIAGNOSTIC] Some Driver Self-Tests Failed.");
    }

    return allPassed;
  }
}
