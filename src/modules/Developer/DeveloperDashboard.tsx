import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { Upload, Activity, DollarSign, Code, ShieldCheck, Clock, FileJson, Terminal as TerminalIcon, Package, PlusCircle } from 'lucide-react';
import { DriverDiagnostic } from '../../services/usb/DriverDiagnostic';
import JSZip from 'jszip';
import { VisualExploitBuilder } from './VisualExploitBuilder';
import { io, Socket } from 'socket.io-client';

export function DeveloperDashboard({ authFetch }: { authFetch: (url: string, options?: any) => Promise<Response> }) {
  const [exploits, setExploits] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [isUploading, setIsUploading] = useState(false);
  const [diagnosticLogs, setDiagnosticLogs] = useState<string[]>([]);
  const [isTesting, setIsTesting] = useState(false);
  const [bundleManifest, setBundleManifest] = useState<any>(null);
  
  const [liveRequests, setLiveRequests] = useState<any[]>([]);
  const [activeLiveRequest, setActiveLiveRequest] = useState<any>(null);
  const [liveMessages, setLiveMessages] = useState<any[]>([]);
  const [chatMessage, setChatMessage] = useState('');
  const [chatCommand, setChatCommand] = useState('');
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    fetchExploits();
    fetchLiveRequests();

    const socket = io();
    socketRef.current = socket;

    socket.on('live-help:requests-updated', () => {
      fetchLiveRequests();
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!activeLiveRequest || !socketRef.current) return;

    const socket = socketRef.current;
    
    // Join the specific room for this request
    socket.emit('live-help:join', activeLiveRequest.id);

    const handleNewMessage = (msg: any) => {
      setLiveMessages(prev => [...prev, msg]);
    };

    socket.on('live-help:new-message', handleNewMessage);

    return () => {
      socket.off('live-help:new-message', handleNewMessage);
    };
  }, [activeLiveRequest]);

  async function fetchLiveRequests() {
    try {
      const res = await authFetch('/api/live-help/requests');
      if (res.ok) {
        const data = await res.json();
        setLiveRequests(data);
      }
    } catch (err) {
      console.error("Failed to fetch live requests", err);
    }
  }

  const acceptLiveRequest = async (id: number) => {
    try {
      const res = await authFetch(`/api/live-help/${id}/accept`, { method: 'POST' });
      if (res.ok) {
        const req = liveRequests.find(r => r.id === id);
        setActiveLiveRequest(req);
        fetchLiveRequests();
      }
    } catch (err) {
      console.error("Failed to accept request", err);
    }
  };

  const sendLiveMessage = async () => {
    if (!activeLiveRequest || (!chatMessage && !chatCommand) || !socketRef.current) return;
    try {
      socketRef.current.emit('live-help:message', {
        requestId: activeLiveRequest.id,
        sender: 'tech',
        message: chatMessage,
        command: chatCommand
      });
      setChatMessage('');
      setChatCommand('');
    } catch (err) {
      console.error("Failed to send message", err);
    }
  };

  async function fetchExploits() {
    try {
      const res = await authFetch('/api/exploits');
      const data = await res.json();
      setExploits(data);
    } catch (err) {
      console.error("Failed to fetch exploits", err);
    }
  }

  const runDiagnostics = async () => {
    setIsTesting(true);
    setDiagnosticLogs([]);
    const logger = (msg: string) => setDiagnosticLogs(prev => [...prev, msg]);
    
    await DriverDiagnostic.runDiagnostics(logger);
    setIsTesting(false);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.match(/^exploits\d{16}[0-9A-F]{8}\.bundle\.crypt$/)) {
      alert("Invalid file type. Please upload a valid exploit bundle (exploits[dev][service][date][brand][vid][pid].bundle.crypt)");
      e.target.value = ''; // Reset input
      return;
    }
  };

  const handleUpload = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsUploading(true);
    
    const formData = new FormData(e.currentTarget);
    const file = formData.get('file') as File;
    const uploadData = new FormData();
    
    if (!file || !file.name.match(/^exploits\d{16}[0-9A-F]{8}\.bundle\.crypt$/)) {
      alert("Please select a valid exploit bundle (.crypt) in the format exploits[dev][service][date][brand][vid][pid].bundle.crypt");
      setIsUploading(false);
      return;
    }

    uploadData.append('file', file);
    uploadData.append('price', formData.get('price') as string || '0');

    try {
      const res = await authFetch('/api/exploits', {
        method: 'POST',
        body: uploadData
      });
      
      const result = await res.json();
      if (result.success) {
        alert("Exploit uploaded successfully! It is now pending verification.");
        fetchExploits();
        setActiveTab('exploits');
        (e.target as HTMLFormElement).reset();
      } else {
        alert("Upload failed: " + result.error);
      }
    } catch (err) {
      alert("An error occurred during upload.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <h1 className="text-4xl font-black uppercase tracking-tighter">Developer Portal</h1>
        <div className="flex overflow-x-auto pb-2 -mb-2 gap-2 scrollbar-hide w-full lg:w-auto">
          <button 
            onClick={() => setActiveTab('overview')}
            className={`whitespace-nowrap px-5 py-2.5 rounded-full text-sm font-bold uppercase tracking-widest transition-all ${activeTab === 'overview' ? 'bg-amber-500 text-stone-950' : 'bg-stone-900 text-stone-400 hover:text-white hover:bg-stone-800'}`}
          >
            Overview
          </button>
          <button 
            onClick={() => setActiveTab('exploits')}
            className={`whitespace-nowrap px-5 py-2.5 rounded-full text-sm font-bold uppercase tracking-widest transition-all ${activeTab === 'exploits' ? 'bg-amber-500 text-stone-950' : 'bg-stone-900 text-stone-400 hover:text-white hover:bg-stone-800'}`}
          >
            My Exploits
          </button>
          <button 
            onClick={() => setActiveTab('upload')}
            className={`whitespace-nowrap px-5 py-2.5 rounded-full text-sm font-bold uppercase tracking-widest transition-all ${activeTab === 'upload' ? 'bg-amber-500 text-stone-950' : 'bg-stone-900 text-stone-400 hover:text-white hover:bg-stone-800'}`}
          >
            Upload Exploit
          </button>
          <button 
            onClick={() => setActiveTab('visual')}
            className={`whitespace-nowrap px-5 py-2.5 rounded-full text-sm font-bold uppercase tracking-widest transition-all flex items-center gap-2 ${activeTab === 'visual' ? 'bg-amber-500 text-stone-950' : 'bg-stone-900 text-stone-400 hover:text-white hover:bg-stone-800'}`}
          >
            <PlusCircle className="w-4 h-4" /> New Exploit (Visual)
          </button>
          <button 
            onClick={() => setActiveTab('api')}
            className={`whitespace-nowrap px-5 py-2.5 rounded-full text-sm font-bold uppercase tracking-widest transition-all ${activeTab === 'api' ? 'bg-amber-500 text-stone-950' : 'bg-stone-900 text-stone-400 hover:text-white hover:bg-stone-800'}`}
          >
            API SDK
          </button>
          <button 
            onClick={() => setActiveTab('diagnostics')}
            className={`whitespace-nowrap px-5 py-2.5 rounded-full text-sm font-bold uppercase tracking-widest transition-all ${activeTab === 'diagnostics' ? 'bg-amber-500 text-stone-950' : 'bg-stone-900 text-stone-400 hover:text-white hover:bg-stone-800'}`}
          >
            Diagnostics
          </button>
          <button 
            onClick={() => setActiveTab('live_support')}
            className={`whitespace-nowrap px-5 py-2.5 rounded-full text-sm font-bold uppercase tracking-widest transition-all flex items-center gap-2 ${activeTab === 'live_support' ? 'bg-purple-500 text-white shadow-[0_0_15px_rgba(168,85,247,0.4)]' : 'bg-stone-900 text-stone-400 hover:text-white hover:bg-stone-800'}`}
          >
            <Activity className="w-4 h-4" /> Live Support
          </button>
        </div>
      </div>

      {activeTab === 'live_support' && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-stone-900 border border-stone-800 rounded-3xl p-6">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Activity className="text-purple-500" /> Pending Requests
              </h2>
              <div className="space-y-4">
                {liveRequests.length === 0 ? (
                  <p className="text-stone-500 italic">No active requests.</p>
                ) : (
                  liveRequests.map(req => (
                    <div key={req.id} className={`p-4 rounded-xl border ${activeLiveRequest?.id === req.id ? 'bg-purple-500/20 border-purple-500/50' : 'bg-stone-950 border-stone-800'}`}>
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <div className="font-bold text-white">{req.model}</div>
                          <div className="text-xs text-stone-400">Service: {req.service}</div>
                        </div>
                        <div className="text-xs px-2 py-1 bg-stone-800 rounded-md text-stone-300 uppercase">{req.status}</div>
                      </div>
                      <div className="text-xs text-stone-500 mb-3">User: {req.user_email}</div>
                      {req.status === 'pending' && (
                        <button 
                          onClick={() => acceptLiveRequest(req.id)}
                          className="w-full py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-bold text-sm transition-colors"
                        >
                          Accept Request
                        </button>
                      )}
                      {req.status === 'active' && activeLiveRequest?.id !== req.id && (
                        <button 
                          onClick={() => setActiveLiveRequest(req)}
                          className="w-full py-2 bg-stone-800 hover:bg-stone-700 text-white rounded-lg font-bold text-sm transition-colors"
                        >
                          View Session
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="lg:col-span-2">
            {activeLiveRequest ? (
              <div className="bg-stone-900 border border-stone-800 rounded-3xl p-6 flex flex-col h-[600px]">
                <div className="flex items-center justify-between mb-6 pb-4 border-b border-stone-800">
                  <div>
                    <h2 className="text-2xl font-bold text-white">Live Session: {activeLiveRequest.model}</h2>
                    <p className="text-stone-400 text-sm">User: {activeLiveRequest.user_email} | Service: {activeLiveRequest.service}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-purple-500"></span>
                    </span>
                    <span className="text-purple-400 font-bold text-sm uppercase tracking-wider">Connected</span>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto mb-4 space-y-4 pr-2">
                  {liveMessages.map((msg, i) => (
                    <div key={i} className={`flex flex-col ${msg.sender === 'tech' ? 'items-end' : 'items-start'}`}>
                      {msg.message && (
                        <div className={`max-w-[80%] p-3 rounded-2xl ${msg.sender === 'tech' ? 'bg-purple-600 text-white rounded-tr-sm' : 'bg-stone-800 text-stone-200 rounded-tl-sm'}`}>
                          {msg.message}
                        </div>
                      )}
                      {msg.command && (
                        <div className="mt-1 max-w-[80%] p-3 rounded-xl bg-black border border-stone-800 font-mono text-xs text-green-400">
                          $ {msg.command}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <div className="space-y-3">
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      value={chatMessage}
                      onChange={e => setChatMessage(e.target.value)}
                      placeholder="Type a message to speak to the user..."
                      className="flex-1 bg-stone-950 border border-stone-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500"
                      onKeyDown={e => e.key === 'Enter' && sendLiveMessage()}
                    />
                    <button 
                      onClick={sendLiveMessage}
                      className="px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-bold transition-colors"
                    >
                      Send
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      value={chatCommand}
                      onChange={e => setChatCommand(e.target.value)}
                      placeholder="Enter command (e.g., ROUTE_USB, ERASE_FRP)"
                      className="flex-1 bg-black border border-stone-800 rounded-xl px-4 py-3 text-green-400 font-mono text-sm focus:outline-none focus:border-green-500"
                      onKeyDown={e => e.key === 'Enter' && sendLiveMessage()}
                    />
                    <button 
                      onClick={() => {
                        setChatCommand('ROUTE_USB');
                        setTimeout(sendLiveMessage, 100);
                      }}
                      className="px-4 py-3 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-xl font-bold text-sm transition-colors"
                    >
                      Route USB
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-stone-900 border border-stone-800 rounded-3xl p-6 h-[600px] flex flex-col items-center justify-center text-center">
                <div className="w-20 h-20 bg-stone-950 rounded-full flex items-center justify-center mb-4 border border-stone-800">
                  <Activity className="text-stone-600 w-10 h-10" />
                </div>
                <h2 className="text-xl font-bold text-stone-400 mb-2">No Active Session</h2>
                <p className="text-stone-500 max-w-sm">Select a pending request from the list to start a live remote assistance session.</p>
              </div>
            )}
          </div>
        </motion.div>
      )}

      {activeTab === 'visual' && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <VisualExploitBuilder authFetch={authFetch} />
        </motion.div>
      )}

      {activeTab === 'diagnostics' && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-stone-900 border border-stone-800 rounded-3xl p-8 space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-purple-500/10 rounded-xl flex items-center justify-center">
                    <TerminalIcon className="text-purple-500 w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold">Driver Simulation Test</h2>
                    <p className="text-stone-400">Self-test USB protocol drivers.</p>
                  </div>
                </div>
                <button 
                  onClick={runDiagnostics}
                  disabled={isTesting}
                  className="px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-bold transition-colors disabled:opacity-50"
                >
                  {isTesting ? 'Running...' : 'Run Diagnostics'}
                </button>
              </div>
              
              <div className="bg-stone-950 border border-stone-800 rounded-xl p-4 h-[300px] overflow-y-auto font-mono text-sm space-y-1">
                {diagnosticLogs.length === 0 ? (
                  <p className="text-stone-600 italic">Click "Run Diagnostics" to start the driver self-test...</p>
                ) : (
                  diagnosticLogs.map((log, i) => (
                    <div key={i} className={`${log.includes('[PASS]') ? 'text-green-400' : log.includes('[FAIL]') ? 'text-red-400' : 'text-stone-300'}`}>
                      {log}
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="bg-stone-900 border border-stone-800 rounded-3xl p-8 space-y-6">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center">
                  <Activity className="text-blue-500 w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold">Device Simulator</h2>
                  <p className="text-stone-400">Mock a device connection to test the UI flow.</p>
                </div>
              </div>

              <div className="space-y-4">
                <p className="text-stone-300 text-sm">
                  Use this tool to simulate connecting a device in a specific mode. This will trigger the global device connection event, allowing you to test exploit matching and UI flows without physical hardware.
                </p>
                
                <div className="grid grid-cols-2 gap-4">
                  <button 
                    onClick={() => {
                      const event = new CustomEvent('simulated-device-connect', { 
                        detail: { vid: 0x05C6, pid: 0x9008, mode: 'EDL', modelName: 'Simulated Qualcomm Device (EDL)' } 
                      });
                      window.dispatchEvent(event);
                    }}
                    className="p-4 bg-stone-950 border border-stone-800 rounded-xl hover:border-blue-500 transition-colors text-left"
                  >
                    <div className="font-bold text-blue-400">Simulate EDL Device</div>
                    <div className="text-xs text-stone-500 mt-1">VID: 05C6 PID: 9008</div>
                  </button>

                  <button 
                    onClick={() => {
                      const event = new CustomEvent('simulated-device-connect', { 
                        detail: { vid: 0x0E8D, pid: 0x0003, mode: 'BROM', modelName: 'Simulated MediaTek Device (BROM)' } 
                      });
                      window.dispatchEvent(event);
                    }}
                    className="p-4 bg-stone-950 border border-stone-800 rounded-xl hover:border-green-500 transition-colors text-left"
                  >
                    <div className="font-bold text-green-400">Simulate BROM Device</div>
                    <div className="text-xs text-stone-500 mt-1">VID: 0E8D PID: 0003</div>
                  </button>

                  <button 
                    onClick={() => {
                      const event = new CustomEvent('simulated-device-connect', { 
                        detail: { vid: 0x18D1, pid: 0x4EE0, mode: 'Fastboot', modelName: 'Simulated Android Device (Fastboot)' } 
                      });
                      window.dispatchEvent(event);
                    }}
                    className="p-4 bg-stone-950 border border-stone-800 rounded-xl hover:border-amber-500 transition-colors text-left"
                  >
                    <div className="font-bold text-amber-400">Simulate Fastboot Device</div>
                    <div className="text-xs text-stone-500 mt-1">VID: 18D1 PID: 4EE0</div>
                  </button>

                  <button 
                    onClick={() => {
                      const event = new CustomEvent('simulated-device-connect', { 
                        detail: { vid: 0x04E8, pid: 0x685D, mode: 'Download', modelName: 'Simulated Samsung Device (Download)' } 
                      });
                      window.dispatchEvent(event);
                    }}
                    className="p-4 bg-stone-950 border border-stone-800 rounded-xl hover:border-purple-500 transition-colors text-left"
                  >
                    <div className="font-bold text-purple-400">Simulate Download Mode</div>
                    <div className="text-xs text-stone-500 mt-1">VID: 04E8 PID: 685D</div>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {activeTab === 'overview' && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-stone-900/50 border border-stone-800 rounded-3xl p-8 space-y-4">
            <div className="w-12 h-12 bg-amber-500/10 rounded-xl flex items-center justify-center">
              <DollarSign className="text-amber-500 w-6 h-6" />
            </div>
            <p className="text-stone-400 font-medium">Total Earnings</p>
            <h3 className="text-4xl font-black">$0.00</h3>
          </div>
          <div className="bg-stone-900/50 border border-stone-800 rounded-3xl p-8 space-y-4">
            <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center">
              <Activity className="text-blue-500 w-6 h-6" />
            </div>
            <p className="text-stone-400 font-medium">Active Exploits</p>
            <h3 className="text-4xl font-black">{exploits.filter(e => e.status === 'approved').length}</h3>
          </div>
          <div className="bg-stone-900/50 border border-stone-800 rounded-3xl p-8 space-y-4">
            <div className="w-12 h-12 bg-purple-500/10 rounded-xl flex items-center justify-center">
              <ShieldCheck className="text-purple-500 w-6 h-6" />
            </div>
            <p className="text-stone-400 font-medium">Success Rate</p>
            <h3 className="text-4xl font-black">0%</h3>
          </div>
        </motion.div>
      )}

      {activeTab === 'exploits' && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          {exploits.length === 0 ? (
            <div className="text-center py-20 bg-stone-900/30 rounded-3xl border border-stone-800 border-dashed">
              <Code className="w-16 h-16 text-stone-700 mx-auto mb-4" />
              <h3 className="text-2xl font-bold text-stone-300">No exploits yet</h3>
              <p className="text-stone-500 mt-2">Upload your first exploit to start earning.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {exploits.map((exploit) => (
                <div key={exploit.id} className="bg-stone-900 border border-stone-800 rounded-2xl p-6 hover:border-stone-700 transition-colors flex flex-col">
                  <div className="flex justify-between items-start mb-4">
                    <div className="w-10 h-10 rounded-xl bg-stone-800 flex items-center justify-center">
                      <Package className="w-5 h-5 text-amber-500" />
                    </div>
                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${
                      exploit.status === 'approved' ? 'bg-green-500/10 text-green-500' : 
                      exploit.status === 'pending' ? 'bg-amber-500/10 text-amber-500' : 
                      'bg-red-500/10 text-red-500'
                    }`}>
                      {exploit.status}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-white mb-1 truncate" title={exploit.service}>{exploit.service || 'Unnamed Exploit'}</h3>
                  <p className="text-stone-400 font-mono text-xs mb-4">VID: {exploit.vid} / PID: {exploit.pid}</p>
                  
                  <div className="flex-1"></div>
                  
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="bg-stone-950 rounded-lg p-3 text-center">
                      <div className="text-[10px] text-stone-500 uppercase tracking-widest mb-1">Success</div>
                      <div className="text-green-500 font-bold">{exploit.success_count || 0}</div>
                    </div>
                    <div className="bg-stone-950 rounded-lg p-3 text-center">
                      <div className="text-[10px] text-stone-500 uppercase tracking-widest mb-1">Fails</div>
                      <div className="text-red-500 font-bold">{exploit.fail_count || 0}</div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-stone-800">
                    <div className="flex items-center gap-1 text-amber-500 text-sm font-bold">
                      {exploit.rating > 0 ? `★ ${exploit.rating.toFixed(1)}` : 'No ratings'}
                    </div>
                    <span className="text-amber-500 font-black">${exploit.price.toFixed(2)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      )}

      {activeTab === 'upload' && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-3xl mx-auto">
          <form onSubmit={handleUpload} className="bg-stone-900 border border-stone-800 rounded-3xl p-8 space-y-8">
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">Upload Exploit Bundle</h2>
              <p className="text-stone-400 text-sm">Upload a solution pack (.zip) or individual binaries/scripts to monetize your exploit.</p>
            </div>

            <div className="space-y-4">
              <label className="text-[10px] font-black text-stone-500 uppercase tracking-widest">Exploit File</label>
              <label htmlFor="file-upload" className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-stone-700 rounded-2xl hover:border-amber-500 hover:bg-amber-500/5 transition-all cursor-pointer group">
                <div className="w-16 h-16 bg-stone-950 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Upload className="w-8 h-8 text-stone-400 group-hover:text-amber-500 transition-colors" />
                </div>
                <p className="font-bold text-white mb-1">Click to upload or drag and drop</p>
                <p className="text-xs text-stone-500">exploits[dev][service][date][brand][vid][pid].bundle.crypt</p>
                <input type="file" name="file" id="file-upload" className="hidden" accept=".crypt" onChange={handleFileChange} />
              </label>
            </div>

            <div className="bg-stone-950 border border-amber-500/30 rounded-2xl p-6 space-y-4">
              <div className="flex items-center gap-3">
                <Package className="w-6 h-6 text-amber-500" />
                <h3 className="text-xl font-bold text-amber-500">Solution Pack Details</h3>
              </div>
              <p className="text-stone-400 text-sm mt-4">This bundle will be automatically parsed and verified by the backend.</p>
              
              <div className="space-y-2 mt-4">
                <label className="text-[10px] font-black text-stone-500 uppercase tracking-widest">Price (USD)</label>
                <div className="relative">
                  <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-500" />
                  <input required name="price" type="number" step="0.01" min="0" placeholder="0.00" className="w-full bg-stone-900 border border-stone-800 rounded-xl pl-12 pr-4 py-3 text-white focus:border-amber-500 outline-none transition-colors font-mono" />
                </div>
              </div>
            </div>

            <button disabled={isUploading} type="submit" className="w-full py-4 bg-amber-500 text-stone-950 rounded-xl font-black uppercase tracking-widest hover:bg-amber-400 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
              <Upload className="w-5 h-5" />
              {isUploading ? 'Uploading...' : 'Submit Exploit for Verification'}
            </button>
          </form>
        </motion.div>
      )}

      {activeTab === 'api' && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
          <div className="bg-stone-900 border border-stone-800 rounded-3xl p-8 space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center">
                <FileJson className="text-blue-500 w-6 h-6" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">Public API SDK</h2>
                <p className="text-stone-400">Embed UnlockPro services in your own platform.</p>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="p-4 bg-stone-950 rounded-xl border border-stone-800 flex justify-between items-center">
                <div>
                  <p className="text-sm text-stone-500 font-bold uppercase tracking-wider">Live API Key</p>
                  <p className="font-mono text-stone-300 mt-1">sk_live_***************************</p>
                </div>
                <button className="px-4 py-2 bg-stone-800 hover:bg-stone-700 rounded-lg text-sm font-bold transition-colors">Reveal</button>
              </div>
              <div className="p-4 bg-stone-950 rounded-xl border border-stone-800 flex justify-between items-center">
                <div>
                  <p className="text-sm text-stone-500 font-bold uppercase tracking-wider">Test API Key</p>
                  <p className="font-mono text-stone-300 mt-1">sk_test_***************************</p>
                </div>
                <button className="px-4 py-2 bg-stone-800 hover:bg-stone-700 rounded-lg text-sm font-bold transition-colors">Reveal</button>
              </div>
            </div>
          </div>

          <div className="bg-stone-900 border border-stone-800 rounded-3xl p-8 space-y-6">
            <h3 className="text-xl font-bold">Quickstart</h3>
            <div className="space-y-4">
              <div className="bg-stone-950 rounded-xl p-4 border border-stone-800 overflow-x-auto">
                <pre className="text-sm font-mono text-stone-300">
                  <code className="text-blue-400">const</code> response = <code className="text-blue-400">await</code> fetch(<code className="text-green-400">'https://api.unlockpro.com/v1/unlock'</code>, {'{\n'}
                  {'  '}method: <code className="text-green-400">'POST'</code>,{'\n'}
                  {'  '}headers: {'{\n'}
                  {'    '}<code className="text-green-400">'x-api-key'</code>: <code className="text-green-400">'your_api_key'</code>,{'\n'}
                  {'    '}<code className="text-green-400">'Content-Type'</code>: <code className="text-green-400">'application/json'</code>{'\n'}
                  {'  }'},{'\n'}
                  {'  '}body: JSON.stringify({'{\n'}
                  {'    '}model: <code className="text-green-400">'Samsung Galaxy S23'</code>,{'\n'}
                  {'    '}service: <code className="text-green-400">'FRP'</code>{'\n'}
                  {'  }'}){'\n'}
                  {'}'});
                </pre>
              </div>
              <p className="text-stone-400 text-sm">
                You will be charged a base price per API call. You can set your own markup for your users.
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
