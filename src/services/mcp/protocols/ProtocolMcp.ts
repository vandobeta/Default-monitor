export interface ProtocolMcp {
  name: string;
  getTools(): any[];
  executeTool(name: string, args: any, context: any): Promise<any>;
  getResources(): any[];
  readResource(uri: string, context: any): Promise<any>;
}
