import { USBTransport } from './USBTransport';
import JSZip from 'jszip';

export interface DeviceAPI {
  loadProgrammer: (path: string) => Promise<void>;
  erase: (partition: string) => Promise<void>;
  read: (partition: string) => Promise<Uint8Array>;
  reboot: () => Promise<void>;
  log: (msg: string) => void;
}

export class ScriptRunner {
  private zip: JSZip | null = null;
  private deviceApi: DeviceAPI;

  constructor(deviceApi: DeviceAPI) {
    this.deviceApi = deviceApi;
  }

  /**
   * Loads a Solution Pack bundle (.zip) into memory.
   */
  async loadBundle(bundleBuffer: ArrayBuffer) {
    this.zip = await JSZip.loadAsync(bundleBuffer);
    
    // Verify manifest exists
    const manifestFile = this.zip.file('manifest.json');
    if (!manifestFile) {
      throw new Error("Invalid bundle: missing manifest.json");
    }
    
    // Verify script exists
    const scriptFile = this.zip.file('script.ts') || this.zip.file('script.js');
    if (!scriptFile) {
      throw new Error("Invalid bundle: missing script.ts or script.js");
    }
    
    this.deviceApi.log("[ScriptRunner] Bundle loaded successfully.");
  }

  /**
   * Executes the script from the loaded bundle.
   */
  async execute() {
    if (!this.zip) {
      throw new Error("No bundle loaded.");
    }

    const scriptFile = this.zip.file('script.ts') || this.zip.file('script.js');
    let scriptContent = await scriptFile!.async('string');

    // Basic transpilation for TS (strip type annotations if any, though new Function expects JS)
    // In a real production app, we'd use Babel standalone or require developers to upload JS.
    // We'll wrap it in an async function.
    
    this.deviceApi.log("[ScriptRunner] Executing bundled script...");

    try {
      // Create a sandbox environment
      const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;
      
      // The script expects a `device` object in its scope
      const executeScript = new AsyncFunction('device', `
        try {
          ${scriptContent}
        } catch (err) {
          throw err;
        }
      `);

      // We intercept loadProgrammer to fetch from the zip
      const sandboxedDevice: DeviceAPI = {
        ...this.deviceApi,
        loadProgrammer: async (path: string) => {
          this.deviceApi.log(`[ScriptRunner] Loading programmer from bundle: ${path}`);
          // Remove leading './' if present
          const cleanPath = path.replace(/^\.\//, '');
          const file = this.zip!.file(cleanPath);
          if (!file) {
            throw new Error(`File not found in bundle: ${cleanPath}`);
          }
          const data = await file.async('uint8array');
          // In a real scenario, we'd pass this data to the actual USB handler
          // For now, we simulate the load
          await this.deviceApi.loadProgrammer(path); 
        }
      };

      await executeScript(sandboxedDevice);
      this.deviceApi.log("[ScriptRunner] Execution Complete.");
      
    } catch (err: any) {
      this.deviceApi.log(`[ScriptRunner] Execution Error: ${err.message}`);
      throw err;
    }
  }
}
