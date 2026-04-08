
export interface ManifestEntry {
  chipset: string;
  vid: number;
  pid: number;
  binaryPath: string;
  type: 'DA' | 'Loader';
}

export class GithubService {
  private authFetch(url: string, options: any = {}) {
    const token = localStorage.getItem('unlockpro_token');
    return fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        'Authorization': `Bearer ${token}`,
      }
    });
  }

  async getManifest(): Promise<ManifestEntry[]> {
    const res = await this.authFetch('/api/github/manifest');
    if (!res.ok) throw new Error('Failed to fetch manifest');
    const text = await res.text();
    
    // Parse GEMINI.md (assuming a simple format for now)
    // Example: | MTK | 0x0E8D | 0x0003 | binaries/mtk_loader.bin | Loader |
    const entries: ManifestEntry[] = [];
    const lines = text.split('\n');
    for (const line of lines) {
      if (line.startsWith('|') && !line.includes('Chipset')) {
        const parts = line.split('|').map(p => p.trim()).filter(p => p);
        if (parts.length >= 5) {
          entries.push({
            chipset: parts[0],
            vid: parseInt(parts[1], 16),
            pid: parseInt(parts[2], 16),
            binaryPath: parts[3],
            type: parts[4] as any
          });
        }
      }
    }
    return entries;
  }

  async getBinary(path: string): Promise<ArrayBuffer> {
    const res = await this.authFetch(`/api/github/binary?path=${encodeURIComponent(path)}`);
    if (!res.ok) throw new Error('Failed to fetch binary');
    return await res.arrayBuffer();
  }

  async findMatch(vid: number, pid: number): Promise<ManifestEntry | null> {
    const manifest = await this.getManifest();
    return manifest.find(e => e.vid === vid && e.pid === pid) || null;
  }
}

export const githubService = new GithubService();
