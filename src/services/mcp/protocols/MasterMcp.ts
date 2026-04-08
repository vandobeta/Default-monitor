import { ProtocolMcp } from "./ProtocolMcp";
import { MtkMcp } from "./MtkMcp";
import { SpdMcp } from "./SpdMcp";
import { QualcommMcp } from "./QualcommMcp";
import { AppleMcp } from "./AppleMcp";
import { AndroidMcp } from "./AndroidMcp";
import { HuaweiMcp } from "./HuaweiMcp";
import { SamsungMcp } from "./SamsungMcp";

export class MasterMcp {
  private protocols: ProtocolMcp[] = [];

  constructor() {
    this.protocols = [
      new MtkMcp(),
      new SpdMcp(),
      new QualcommMcp(),
      new AppleMcp(),
      new AndroidMcp(),
      new HuaweiMcp(),
      new SamsungMcp()
    ];
  }

  getTools() {
    let tools: any[] = [];
    for (const protocol of this.protocols) {
      tools = tools.concat(protocol.getTools());
    }
    return tools;
  }

  async executeTool(name: string, args: any, context: any) {
    for (const protocol of this.protocols) {
      const tool = protocol.getTools().find((t: any) => t.name === name);
      if (tool) {
        return await protocol.executeTool(name, args, context);
      }
    }
    return null;
  }

  getResources() {
    let resources: any[] = [
      {
        uri: "hardware://protocols/capabilities",
        name: "Protocol Capabilities",
        description: "Describes which protocols require custom DA/FDL files and which connect directly."
      }
    ];
    for (const protocol of this.protocols) {
      resources = resources.concat(protocol.getResources());
    }
    return resources;
  }

  async readResource(uri: string, context: any) {
    if (uri === "hardware://protocols/capabilities") {
      return {
        contents: [{
          uri,
          text: JSON.stringify({
            MTK: { requiresCustomLoader: true, loaderType: "DA (Download Agent)" },
            SPD: { requiresCustomLoader: true, loaderType: "FDL (Flash Download Loader)" },
            Qualcomm: { requiresCustomLoader: true, loaderType: "Firehose Programmer" },
            Apple: { requiresCustomLoader: false, description: "Direct connection via DFU/checkm8" },
            Android: { requiresCustomLoader: false, description: "Direct connection via ADB/Fastboot" },
            Huawei: { requiresCustomLoader: false, description: "Direct connection via Kirin COM/Fastboot" },
            Samsung: { requiresCustomLoader: false, description: "Direct connection via Download Mode (Odin)" }
          }, null, 2)
        }]
      };
    }

    for (const protocol of this.protocols) {
      const resource = await protocol.readResource(uri, context);
      if (resource) {
        return resource;
      }
    }
    return null;
  }
}
