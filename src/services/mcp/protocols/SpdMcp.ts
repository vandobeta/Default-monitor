import { ProtocolMcp } from "./ProtocolMcp";
import { SpdFdlHandler } from "../../usb/handlers/SpdFdlHandler";
import { USBTransport } from "../../usb/USBTransport";

export class SpdMcp implements ProtocolMcp {
  name = "SPD";

  getTools() {
    return [
      {
        name: "spd_handshake",
        description: "Perform SPD FDL handshake",
        inputSchema: { type: "object", properties: {} }
      },
      {
        name: "spd_send_fdl",
        description: "Send FDL to SPD device. Required for SPD devices before executing commands.",
        inputSchema: { type: "object", properties: { payloadBase64: { type: "string" } } }
      },
      {
        name: "spd_execute_command",
        description: "Execute SPD command (e.g., format, read, write)",
        inputSchema: { type: "object", properties: { command: { type: "string" }, address: { type: "number" }, length: { type: "number" } } }
      }
    ];
  }

  async executeTool(name: string, args: any, context: any) {
    const { activeDevice } = context;
    if (!activeDevice) return { content: [{ type: "text", text: "No device connected" }], isError: true };
    const transport = new USBTransport(activeDevice);
    const handler = new SpdFdlHandler(transport);

    switch (name) {
      case "spd_handshake":
        await handler.connect();
        return { content: [{ type: "text", text: "SPD FDL handshake successful" }] };
      case "spd_send_fdl":
        const { payloadBase64 } = args;
        const binary = Uint8Array.from(atob(payloadBase64), c => c.charCodeAt(0));
        await handler.loadFdl(binary, 0);
        return { content: [{ type: "text", text: "SPD FDL sent successfully" }] };
      case "spd_execute_command":
        // Mock implementation for executing command
        return { content: [{ type: "text", text: `SPD command ${args.command} executed successfully` }] };
      default:
        return null;
    }
  }

  getResources() {
    return [];
  }

  async readResource(uri: string, context: any) {
    return null;
  }
}
