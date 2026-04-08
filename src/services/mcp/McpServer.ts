
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { CallToolRequestSchema, ListToolsRequestSchema, ListResourcesRequestSchema, ReadResourceRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { supabase } from "../supabaseClient";
import { USBManager } from "../usb/USBManager";
import { USBTransport } from "../usb/USBTransport";
import { MasterMcp } from "./protocols/MasterMcp";

/**
 * UnlockPro Hardware Bridge MCP Server
 * Orchestrates WebUSB, Supabase, and GitHub operations.
 */
export class McpServer {
  private server: Server;
  private activeDevice: USBDevice | null = null;
  private transport: USBTransport | null = null;
  private sessionId: string | null = null;
  private masterMcp: MasterMcp;

  constructor() {
    this.server = new Server(
      {
        name: "UnlockPro-Hardware-Bridge",
        version: "1.0.0",
      },
      {
        capabilities: {
          resources: {},
          tools: {},
        },
      }
    );

    this.masterMcp = new MasterMcp();
    this.setupHandlers();
  }

  private setupHandlers() {
    // 1. Resources
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => {
      const baseResources = [
        { uri: "usb://device/active", name: "Active USB Device", description: "Connected device descriptors" },
        { uri: "platform://user/session", name: "User Session", description: "Current technician session and balance" },
        { uri: "github://payloads/catalog", name: "Payload Catalog", description: "Available exploit loaders" },
        { uri: "hardware://database/testpoints", name: "Testpoint Database", description: "Manual routing guides" },
      ];
      return { resources: [...baseResources, ...this.masterMcp.getResources()] };
    });

    this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      const { uri } = request.params;
      
      if (uri === "usb://device/active") {
        if (!this.activeDevice) return { contents: [{ uri, text: "No device connected" }] };
        return {
          contents: [{
            uri,
            text: JSON.stringify({
              vendorId: this.activeDevice.vendorId,
              productId: this.activeDevice.productId,
              productName: this.activeDevice.productName,
              manufacturerName: this.activeDevice.manufacturerName,
              serialNumber: this.activeDevice.serialNumber,
              configuration: this.activeDevice.configuration,
            }, null, 2),
          }],
        };
      }
      
      const protocolResource = await this.masterMcp.readResource(uri, { activeDevice: this.activeDevice });
      if (protocolResource) return protocolResource;

      return { contents: [{ uri, text: "Resource not implemented" }] };
    });

    // 2. Tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      const baseTools = [
        { name: "claim_usb_interface", description: "Claim a USB interface", inputSchema: { type: "object", properties: { interfaceNumber: { type: "number" } } } },
        { name: "usb_transfer_out", description: "Send raw binary packet", inputSchema: { type: "object", properties: { endpoint: { type: "number" }, data: { type: "object" } } } },
        { name: "usb_transfer_in", description: "Read bytes from device", inputSchema: { type: "object", properties: { endpoint: { type: "number" }, length: { type: "number" } } } },
        { name: "verify_device_subscription", description: "Verify device payment", inputSchema: { type: "object", properties: { hardwareId: { type: "string" } } } },
        { name: "trigger_easypay_stk", description: "Initiate MoMo payment", inputSchema: { type: "object", properties: { phoneNumber: { type: "string" }, amount: { type: "number" } } } },
        { name: "fetch_binary_payload", description: "Download loader from GitHub", inputSchema: { type: "object", properties: { modelId: { type: "string" }, chipsetType: { type: "string" } } } },
      ];
      return { tools: [...baseTools, ...this.masterMcp.getTools()] };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      const protocolResult = await this.masterMcp.executeTool(name, args, { activeDevice: this.activeDevice });
      if (protocolResult) return protocolResult;

      switch (name) {
        case "verify_device_subscription": {
          const { hardwareId } = args as { hardwareId: string };
          const { data, error } = await supabase
            .from('subscriptions')
            .select('status')
            .eq('device_id', hardwareId)
            .single();

          if (error || !data || data.status !== 'active') {
            return { content: [{ type: "text", text: "Subscription required. Trigger Easypay STK." }], isError: true };
          }
          return { content: [{ type: "text", text: "Subscription active. Proceed with hardware handshake." }] };
        }

        case "claim_usb_interface": {
          const { interfaceNumber } = args as { interfaceNumber: number };
          if (!this.activeDevice) return { content: [{ type: "text", text: "No device connected" }], isError: true };
          await this.activeDevice.claimInterface(interfaceNumber);
          return { content: [{ type: "text", text: `Interface ${interfaceNumber} claimed` }] };
        }

        case "fetch_binary_payload": {
          const { modelId, chipsetType } = args as { modelId: string, chipsetType: string };
          // Implementation for GitHub fetch...
          return { content: [{ type: "text", text: `Payload for ${modelId} fetched` }] };
        }

        default:
          return { content: [{ type: "text", text: `Tool ${name} not found` }], isError: true };
      }
    });
  }

  /**
   * Connects a device to the MCP server context.
   */
  public setActiveDevice(device: USBDevice) {
    this.activeDevice = device;
    this.transport = new USBTransport(device);
  }

  public setSessionId(sessionId: string) {
    this.sessionId = sessionId;
  }

  private isConnected = false;
  private connectPromise: Promise<void> | null = null;

  public async connectTransport(transport: any) {
    if (this.isConnected) return;
    if (this.connectPromise) return this.connectPromise;

    this.connectPromise = (async () => {
      try {
        await this.server.connect(transport);
        this.isConnected = true;
      } finally {
        this.connectPromise = null;
      }
    })();

    return this.connectPromise;
  }

  /**
   * Starts the server (usually called from the main thread).
   */
  public async start() {
    // In a browser, we might use a custom transport or just expose the server instance.
    console.log("[MCP] UnlockPro Hardware Bridge Server Started");
  }
}

export const mcpServer = new McpServer();
