import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { mcpServer } from "./McpServer";

export class McpClient {
  private client: Client;
  private transport: InMemoryTransport;

  constructor() {
    this.client = new Client(
      {
        name: "UnlockPro-Client",
        version: "1.0.0",
      },
      {
        capabilities: {},
      }
    );
    
    // Create a linked pair of transports
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    this.transport = clientTransport;
    
    // Connect the server to its transport
    mcpServer.connectTransport(serverTransport).catch(console.error);
  }

  private isConnected = false;
  private connectPromise: Promise<void> | null = null;

  public async connect() {
    if (this.isConnected) return;
    if (this.connectPromise) return this.connectPromise;

    this.connectPromise = (async () => {
      try {
        await this.client.connect(this.transport);
        this.isConnected = true;
        console.log("[MCP Client] Connected to MCP Server");
      } finally {
        this.connectPromise = null;
      }
    })();

    return this.connectPromise;
  }

  public async listResources() {
    return await this.client.listResources();
  }

  public async readResource(uri: string) {
    return await this.client.readResource({ uri });
  }

  public async listTools() {
    return await this.client.listTools();
  }

  public async callTool(name: string, args: any) {
    return await this.client.callTool({ name, arguments: args });
  }
}

export const mcpClient = new McpClient();
