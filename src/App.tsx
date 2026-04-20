import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { USBManager } from './services/usb/USBManager';
import { hardwareService } from './services/hardwareService';
import { USBProtocol } from './services/usb/protocols';
import { wasmEngine } from './services/wasm/WasmEngine';
import { io, Socket } from 'socket.io-client';

import { auth, googleProvider } from './firebase';
import { signInWithPopup } from 'firebase/auth';
import { 
  Smartphone, 
  Unlock, 
  ShieldCheck, 
  Zap, 
  Cpu, 
  ChevronRight, 
  CheckCircle2, 
  AlertCircle,
  Download,
  Usb,
  CreditCard,
  LayoutDashboard,
  History,
  Settings,
  HelpCircle,
  Search,
  Terminal as TerminalIcon,
  Activity,
  ExternalLink,
  Monitor,
  ArrowRight,
  Layers,
  Globe,
  Lock,
  MousePointer2,
  ChevronDown,
  Check,
  Menu,
  X,
  Star,
  LogOut,
  User as UserIcon,
  Wallet,
  Eye,
  EyeOff,
  RefreshCw,
  Apple,
  LayoutGrid,
  Shield
} from 'lucide-react';
import { User, UserRole, Device, ServiceType, UnlockStep, ModuleType, AppStep } from './types';
import { cn } from './lib/utils';
import { GlassCard } from './components/Shared/GlassCard';
import { Terminal } from './components/Shared/Terminal';
import { PhoneAnimation } from './components/Shared/PhoneAnimation';
import { ConnectionGuide } from './components/Shared/ConnectionGuide';
import { AuthTerminal } from './components/Shared/AuthTerminal';
import { Onboarding } from './components/Shared/Onboarding';

import { TopUpModal } from './components/Shared/TopUpModal';

// Modules
import { FeaturePhoneModule } from './modules/FeaturePhones/FeaturePhoneModule';
import { IPhoneModule } from './modules/iPhone/IPhoneModule';
import { AndroidModule } from './modules/Android/AndroidModule';
import { HuaweiModule } from './modules/Huawei/HuaweiModule';
import { DeveloperDashboard } from './modules/Developer/DeveloperDashboard';


const ADB_COMMANDS = [
  { group: "Device Info", commands: [
    { label: "Get Model", cmd: "adb shell getprop ro.product.model", desc: "Retrieves the device model name" },
    { label: "Get Android Version", cmd: "adb shell getprop ro.build.version.release", desc: "Retrieves the Android OS version" },
    { label: "Get Serial Number", cmd: "adb shell getprop ro.serialno", desc: "Retrieves the hardware serial number" },
    { label: "Battery Status", cmd: "adb shell dumpsys battery", desc: "Shows detailed battery information" },
  ]},
  { group: "Display & Input", commands: [
    { label: "Screen Resolution", cmd: "adb shell wm size", desc: "Shows the current screen resolution" },
    { label: "Screen Density", cmd: "adb shell wm density", desc: "Shows the current screen DPI" },
    { label: "Power Button", cmd: "adb shell input keyevent 26", desc: "Simulates a power button press" },
    { label: "Home Button", cmd: "adb shell input keyevent 3", desc: "Simulates a home button press" },
    { label: "Back Button", cmd: "adb shell input keyevent 4", desc: "Simulates a back button press" },
  ]},
  { group: "System Control", commands: [
    { label: "Reboot Device", cmd: "adb reboot", desc: "Restarts the device normally" },
    { label: "Reboot to Bootloader", cmd: "adb reboot bootloader", desc: "Restarts device into Fastboot mode" },
    { label: "Reboot to Recovery", cmd: "adb reboot recovery", desc: "Restarts device into Recovery mode" },
    { label: "List Packages", cmd: "adb shell pm list packages", desc: "Lists all installed app packages" },
  ]},
  { group: "Quick Settings", commands: [
    { label: "Open Settings", cmd: "adb shell am start -a android.settings.SETTINGS", desc: "Opens the main settings menu" },
    { label: "Developer Options", cmd: "adb shell am start -a android.settings.DEVELOPMENT_SETTINGS", desc: "Opens developer settings" },
    { label: "Security Settings", cmd: "adb shell am start -a android.settings.SECURITY_SETTINGS", desc: "Opens security settings" },
  ]}
];

// --- Shared Components ---
// Moved to /src/components/Shared/

// --- USB Protocol Constants ---
const ADB_INTERFACE = { class: 0xFF, subclass: 0x42, protocol: 0x01 };
const FASTBOOT_INTERFACE = { class: 0xFF, subclass: 0x42, protocol: 0x03 };

// --- Module Switcher Component ---
const ModuleSwitcher = ({ activeModule, setActiveModule }: { activeModule: ModuleType, setActiveModule: (m: ModuleType) => void }) => {
  const modules = [
    { id: 'feature-phones', label: 'Feature Phones', icon: Smartphone },
    { id: 'iphone', label: 'iPhone', icon: Apple },
    { id: 'android', label: 'Android & Samsung', icon: Smartphone },
    { id: 'huawei', label: 'Huawei', icon: Globe },
  ] as const;

  return (
    <div className="flex gap-4 border-b border-white/5 pb-4 overflow-x-auto scrollbar-hide max-w-full">
      {modules.map(mod => (
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          key={mod.id}
          onClick={() => setActiveModule(mod.id as ModuleType)}
          className={cn(
            "flex items-center gap-3 px-4 sm:px-8 py-4 rounded-2xl text-[10px] lg:text-xs font-black uppercase tracking-[0.3em] transition-all whitespace-nowrap",
            activeModule === mod.id ? "glass-amber text-amber-500" : "text-stone-500 hover:text-white hover:bg-white/5"
          )}
        >
          <mod.icon size={16} />
          {mod.label}
        </motion.button>
      ))}
    </div>
  );
};

import { mcpServer } from './services/mcp/McpServer';
import { mcpClient } from './services/mcp/McpClient';

// --- Main Application ---

export default function App() {
  useEffect(() => {
    mcpServer.start();
    mcpClient.connect().catch(console.error);
  }, []);
  const [view, setView] = useState<'landing' | 'app' | 'auth' | 'admin' | 'developer' | 'license' | 'token-choice' | 'verify' | 'sessions' | 'history' | 'settings' | 'feedback' | 'guide' | 'onboarding'>('landing');
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [user, setUser] = useState<User | null>(null);
  const [devices, setDevices] = useState<Device[]>([]);
  const [step, setStep] = useState<AppStep>('selection');
  const [settings, setSettings] = useState({
    autoBypass: true,
    highPerformance: false,
    verboseLogs: true,
    theme: 'liquid-glass',
    notifications: true,
    aiReasoning: 'high'
  });
  const [selectedBrand, setSelectedBrand] = useState<string>('');
  const [selectedModel, setSelectedModel] = useState<Device | null>(null);
  const [selectedService, setSelectedService] = useState<ServiceType | ''>('');
  const [tutorialStep, setTutorialStep] = useState(0);
  const [terminalLines, setTerminalLines] = useState<string[]>([]);
  const addTerminalLine = (line: string) => setTerminalLines(prev => [...prev, line]);
  const [isBypassPurchased, setIsBypassPurchased] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isHudOpen, setIsHudOpen] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [unlockProgress, setUnlockProgress] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [appScale, setAppScale] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isTopUpModalOpen, setIsTopUpModalOpen] = useState(false);
  const [isUnlockInProgress, setIsUnlockInProgress] = useState(false);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isUnlockInProgress) {
        e.preventDefault();
        e.returnValue = ''; // Required for Chrome
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isUnlockInProgress]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && isUnlockInProgress) {
        if (Notification.permission === 'granted') {
          new Notification('Unlock in Progress', {
            body: 'Please keep the application open until the unlock process is complete.',
            icon: '/favicon.ico'
          });
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isUnlockInProgress]);

  const requestFullscreen = () => {
    if (document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen().catch(console.error);
    }
  };

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      const minWidth = 380;
      if (width < minWidth) {
        setAppScale(width / minWidth);
      } else {
        setAppScale(1);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (isComplete) {
      const timer = setTimeout(() => {
        setView('feedback');
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isComplete]);
  const [activeCategory, setActiveCategory] = useState<'trending' | 'most-unlocked' | 'coming-soon' | 'feature-phones'>('trending');
  const [activeModule, setActiveModule] = useState<ModuleType>('feature-phones');
  const [usbDevice, setUsbDevice] = useState<USBDevice | null>(null);
  const [usbHardwareInfo, setUsbHardwareInfo] = useState<any>(null);
  const [usbMode, setUsbMode] = useState<'adb' | 'fastboot' | 'unknown' | null>(null);
  const [geminiPayload, setGeminiPayload] = useState<any>(null);
  const [isLiveSession, setIsLiveSession] = useState(false);
  const [remoteSocket, setRemoteSocket] = useState<Socket | null>(null);
  const [usbLogs, setUsbLogs] = useState<string[]>([]);
  const [adminStats, setAdminStats] = useState<any>(null);
  const [adminUsers, setAdminUsers] = useState<any[]>([]);
  const [adminTransactions, setAdminTransactions] = useState<any[]>([]);
  const [adminLogs, setAdminLogs] = useState<any[]>([]);
  const [developerExploits, setDeveloperExploits] = useState<any[]>([]);
  const [unlockCommands, setUnlockCommands] = useState<string[]>([]);
  const [adminTab, setAdminTab] = useState<'stats' | 'users' | 'devices' | 'transactions' | 'logs' | 'diagnostics' | 'exploits'>('stats');
  const [showPassword, setShowPassword] = useState(false);
  const [sessions, setSessions] = useState<any[]>([]);
  const [showModuleInstructions, setShowModuleInstructions] = useState(false);
  const [moduleInstructionsText, setModuleInstructionsText] = useState('');

  const [matchedExploit, setMatchedExploit] = useState<any>(null);

  const formatCurrency = (amount: number) => {
    const currency = localStorage.getItem('unlockpro_currency') || 'USD';
    const rate = parseFloat(localStorage.getItem('unlockpro_exchange_rate') || '1');
    const converted = amount * rate;
    
    try {
      return new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency: currency
      }).format(converted);
    } catch (e) {
      return `${currency} ${converted.toFixed(2)}`;
    }
  };

  useEffect(() => {
    // Clear state when switching modules to ensure pure separation
    setTerminalLines([]);
    setUsbDevice(null);
    setUsbHardwareInfo(null);
    setUsbMode(null);
    setSelectedModel(null);
    setSelectedService('');
    setGeminiPayload(null);
    setUnlockProgress(0);
    setMatchedExploit(null);
  }, [activeModule]);

  const brands = useMemo(() => Array.from(new Set(devices.map(m => m.brand))), [devices]);
  const modelsForBrand = useMemo(() => devices.filter(m => m.brand === selectedBrand), [selectedBrand, devices]);

  const authFetch = (url: string, options: any = {}) => {
    const token = localStorage.getItem('unlockpro_token');
    const isFormData = options.body instanceof FormData;
    
    const headers: any = {
      ...options.headers,
      'Authorization': `Bearer ${token}`
    };

    if (!isFormData) {
      headers['Content-Type'] = 'application/json';
    }

    return fetch(url, {
      ...options,
      headers
    });
  };

  useEffect(() => {
    const fetchDevices = async (retries = 3) => {
      try {
        const res = await fetch("/api/devices");
        if (!res.ok) {
          const text = await res.text();
          throw new Error(`HTTP ${res.status}: ${text.substring(0, 100)}`);
        }
        const data = await res.json();
        setDevices(data);
      } catch (err: any) {
        console.error("Failed to fetch devices:", err);
        if (retries > 0) {
          console.log(`Retrying fetch in 2s... (${retries} left)`);
          setTimeout(() => fetchDevices(retries - 1), 2000);
        }
      }
    };

    fetchDevices();
      
    const token = localStorage.getItem('unlockpro_token');
    if (token) {
      authFetch("/api/auth/me")
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          if (data && !data.error) {
            setUser(data);
          } else {
            localStorage.removeItem('unlockpro_token');
          }
        })
        .catch(() => {
          localStorage.removeItem('unlockpro_token');
        });
    }
  }, []);

  const handleUnlockNow = () => {
    if (user) {
      if (!localStorage.getItem('unlockpro_onboarded')) {
        setView('onboarding');
      } else {
        setView('guide');
      }
    } else {
      setView('auth');
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      
      const res = await fetch("/api/auth/firebase", {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          uid: user.uid, 
          email: user.email, 
          displayName: user.displayName 
        })
      });
      
      const data = await res.json();
      setIsLoading(false);
      
      if (data.token) {
        localStorage.setItem('unlockpro_token', data.token);
        setUser(data);
        if (!localStorage.getItem('unlockpro_onboarded')) {
          setView('onboarding');
        } else {
          setView('guide');
        }
      } else {
        alert(data.error || "Google Authentication failed");
      }
    } catch (error: any) {
      setIsLoading(false);
      console.error(error);
      alert("Google Sign-In failed or was cancelled.");
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const res = await fetch(authMode === 'login' ? "/api/auth/login" : "/api/auth/register", {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      setIsLoading(false);
      if (data.token) {
        localStorage.setItem('unlockpro_token', data.token);
        setUser(data);
        if (!localStorage.getItem('unlockpro_onboarded')) {
          setView('onboarding');
        } else {
          setView('guide');
        }
      } else {
        alert(data.error || "Authentication failed");
      }
    } catch (err) {
      setIsLoading(false);
      alert("Connection error. Please try again.");
    }
  };

  const fetchAdminData = () => {
    if (view === 'admin') {
      authFetch("/api/admin/stats").then(res => res.ok ? res.json() : null).then(data => data && !data.error && setAdminStats(data)).catch(console.error);
      authFetch("/api/admin/users").then(res => res.ok ? res.json() : []).then(data => Array.isArray(data) && setAdminUsers(data)).catch(console.error);
      authFetch("/api/admin/transactions").then(res => res.ok ? res.json() : []).then(data => Array.isArray(data) && setAdminTransactions(data)).catch(console.error);
      authFetch("/api/admin/logs").then(res => res.ok ? res.json() : []).then(data => Array.isArray(data) && setAdminLogs(data)).catch(console.error);
    }
    if (view === 'developer' || view === 'admin') {
      authFetch("/api/exploits").then(res => res.ok ? res.json() : []).then(data => Array.isArray(data) && setDeveloperExploits(data)).catch(console.error);
    }
  };

  useEffect(() => {
    fetchAdminData();
    if (view === 'sessions' || view === 'history') {
      authFetch("/api/sessions").then(res => res.ok ? res.json() : []).then(setSessions);
    }
  }, [view]);

  const runAdbCommand = (cmd: string) => {
    setTerminalLines(prev => [...prev, `> ${cmd}`, `[OK] Executing remote command...`, `[OK] Response: Command sent to device bridge.`]);
  };

  const connectWebUSB = async () => {
    try {
      const logger = (msg: string) => setTerminalLines(prev => [...prev, msg]);
      const { device, info, protocol } = await USBManager.connect(logger);
      
      setUsbDevice(device);
      setUsbHardwareInfo(info);
      setUsbMode(info.mode.toLowerCase().includes('adb') ? 'adb' : info.mode.toLowerCase().includes('fastboot') ? 'fastboot' : 'unknown');
      
    } catch (err: any) {
      console.error(err);
      setTerminalLines(prev => [...prev, `[ERROR] USB Connection failed: ${err.message}`]);
    }
  };

  useEffect(() => {
    let pollInterval: any;

    const handleDisconnect = (event: USBConnectionEvent) => {
      if (usbDevice && event.device === usbDevice) {
        setUsbDevice(null);
        setUsbHardwareInfo(null);
        setUsbMode(null);
        addTerminalLine('[ERROR] Device disconnected unexpectedly.');
      }
    };

    const handleConnect = async (event: USBConnectionEvent) => {
      // Auto-reconnect if we have a device that was previously connected
      // or if we're in the middle of a process
      try {
        const device = event.device;
        await device.open();
        const identity = hardwareService.identifyDevice(device);
        const newMode = identity.mode.toLowerCase().includes('adb') ? 'adb' : identity.mode.toLowerCase().includes('fastboot') ? 'fastboot' : 'unknown';
        
        setUsbDevice(device);
        setUsbHardwareInfo({
          vendorId: device.vendorId.toString(16).padStart(4, '0'),
          productId: device.productId.toString(16).padStart(4, '0'),
          serialNumber: device.serialNumber || 'Unknown',
          manufacturerName: device.manufacturerName || 'Unknown',
          productName: device.productName || 'Unknown',
          mode: identity.mode
        });
        setUsbMode(newMode);
        addTerminalLine(`[INFO] Device auto-reconnected: ${device.productName || 'Unknown'} (${newMode.toUpperCase()} mode)`);
      } catch (err) {
        console.error("Auto-reconnect error:", err);
      }
    };

    navigator.usb.addEventListener('disconnect', handleDisconnect);
    navigator.usb.addEventListener('connect', handleConnect);

    const pollDevice = async () => {
      if (!usbDevice) return;
      try {
        const devices = await navigator.usb.getDevices();
        const isConnected = devices.some(d => d === usbDevice || (d.vendorId === usbDevice.vendorId && d.productId === usbDevice.productId && d.serialNumber === usbDevice.serialNumber));
        
        if (!isConnected) {
          setUsbDevice(null);
          setUsbHardwareInfo(null);
          setUsbMode(null);
          addTerminalLine('[ERROR] Device disconnected unexpectedly.');
        } else {
          // Check if device mode changed (e.g. rebooted to fastboot but same USBDevice instance)
          const identity = hardwareService.identifyDevice(usbDevice);
          const newMode = identity.mode.toLowerCase().includes('adb') ? 'adb' : identity.mode.toLowerCase().includes('fastboot') ? 'fastboot' : 'unknown';
          
          if (newMode !== usbMode) {
            setUsbMode(newMode);
            addTerminalLine(`[INFO] Device mode changed to: ${newMode.toUpperCase()}`);
          }
        }
      } catch (err) {
        console.error("Polling error:", err);
      }
    };

    if (usbDevice) {
      pollInterval = setInterval(pollDevice, 2000);
    }

    return () => {
      if (pollInterval) clearInterval(pollInterval);
      navigator.usb.removeEventListener('disconnect', handleDisconnect);
      navigator.usb.removeEventListener('connect', handleConnect);
    };
  }, [usbDevice, usbMode]);

  const [tutorialSteps, setTutorialSteps] = useState<UnlockStep[]>([
    { id: 0, title: "Physical Bridge", description: "Establish a direct hardware link using a high-speed USB-C data cable.", animationType: 'plug' },
    { id: 1, title: "Security Bypass", description: "Trigger the device's low-level bootloader by holding the specified key combination.", animationType: 'button' },
    { id: 2, title: "Cloud Patching", description: "Our distributed server network is injecting a temporary security bypass into the device's RAM.", animationType: 'wait' },
    { id: 3, title: "Permanent Unlock", description: "The carrier lock has been successfully purged from the device's persistent storage.", animationType: 'success' },
  ]);

  useEffect(() => {
    if (selectedModel) {
      const constraints = typeof selectedModel.constraints === 'string' ? JSON.parse(selectedModel.constraints) : (selectedModel.constraints || {});
      const steps: UnlockStep[] = [
        { id: 0, title: "Physical Bridge", description: "Establish a direct hardware link using a high-speed USB-C data cable.", animationType: 'plug' }
      ];

      if (constraints.requires_adb) {
        steps.push({ id: 1, title: "ADB Handshake", description: "Enable USB Debugging and authorize the RSA fingerprint on your device.", animationType: 'button' });
      } else if (constraints.requires_fastboot) {
        steps.push({ id: 1, title: "Fastboot Mode", description: "Reboot to bootloader (Power + Vol Down) to enter Fastboot mode.", animationType: 'button' });
      } else if (constraints.requires_edl) {
        steps.push({ id: 1, title: "EDL Mode", description: "Enter Emergency Download Mode (EDL) via test points or cable combo.", animationType: 'button' });
      } else if (constraints.requires_dfu) {
        steps.push({ id: 1, title: "DFU Mode", description: "Enter Device Firmware Upgrade (DFU) mode for low-level exploit execution.", animationType: 'button' });
      }

      steps.push({ id: 2, title: "Cloud Patching", description: "Our distributed server network is injecting a temporary security bypass into the device's RAM.", animationType: 'wait' });
      steps.push({ id: 3, title: "Permanent Unlock", description: "The carrier lock has been successfully purged from the device's persistent storage.", animationType: 'success' });
      
      setTutorialSteps(steps);
    }
  }, [selectedModel]);

  // --- Auth Logic ---
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const paymentType = params.get('payment');
    const reference = params.get('reference');

    if (paymentType === 'paystack' && reference) {
      authFetch(`/api/paystack/verify?reference=${reference}`)
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            alert(`Payment successful! Added ${data.amount} tokens.`);
            window.history.replaceState({}, document.title, window.location.pathname);
            // Refresh user data
            authFetch("/api/auth/me").then(res => res.json()).then(setUser);
          }
        });
    }

    const token = localStorage.getItem('unlockpro_token');
    if (token) {
      authFetch("/api/auth/me")
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          if (data) {
            setUser(data);
            if (!localStorage.getItem('unlockpro_onboarded')) {
              setView('onboarding');
            } else if (!data.isVerified) {
              setView('verify');
            } else {
              setView('app');
            }
          }
        });
    }
  }, []);

  const handleAuth = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const username = formData.get('username');
    const password = formData.get('password');
    
    const endpoint = authMode === 'login' ? '/api/auth/login' : '/api/auth/register';
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    
    if (res.ok) {
      const data = await res.json();
      localStorage.setItem('unlockpro_token', data.token);
      setUser(data);
      if (authMode === 'register') {
        setView('license');
      } else if (!localStorage.getItem('unlockpro_onboarded')) {
        setView('onboarding');
      } else if (!data.isVerified) {
        setView('verify');
      } else {
        setView('app');
      }
    } else {
      const err = await res.json();
      if (res.status === 404 && authMode === 'login') {
        if (confirm("User not found. Would you like to create a new account?")) {
          setAuthMode('register');
        }
      } else {
        alert(err.error);
      }
    }
  };

  const verifyEmail = async () => {
    const res = await authFetch("/api/auth/verify", { method: 'POST' });
    if (res.ok) {
      setUser(prev => prev ? { ...prev, isVerified: true } : null);
      setView('app');
    }
  };

  const handleLogout = async () => {
    await authFetch("/api/auth/logout", { method: 'POST' });
    localStorage.removeItem('unlockpro_token');
    setUser(null);
    setView('landing');
  };

  // --- Payment Logic ---
  const handleTopUp = async (data: any) => {
    if (!user) return;
    try {
      if (data.method === 'card') {
        const res = await authFetch("/api/paystack/initialize", {
          method: 'POST',
          body: JSON.stringify({ amount: data.amount, email: user.username })
        });
        const resData = await res.json();
        if (resData.status && resData.data && resData.data.authorization_url) {
          window.location.href = resData.data.authorization_url;
        } else {
          alert("Failed to initialize payment.");
        }
      } else {
        const res = await authFetch("/api/paystack/charge-mobile", {
          method: 'POST',
          body: JSON.stringify({ 
            amount: data.amount, 
            email: user.username,
            phone: data.phone,
            provider: data.provider,
            country: data.country,
            type: data.method
          })
        });
        const resData = await res.json();
        if (resData.status && resData.data) {
          if (resData.data.status === 'pay_offline') {
            alert(`Please check your phone to complete the payment. Reference: ${resData.data.reference}`);
          } else if (resData.data.status === 'send_otp') {
            const otp = prompt("Enter the OTP sent to your phone:");
            if (otp) {
              const otpRes = await authFetch("/api/paystack/submit-otp", {
                method: 'POST',
                body: JSON.stringify({ otp, reference: resData.data.reference })
              });
              const otpData = await otpRes.json();
              alert(otpData.message || "OTP submitted.");
            }
          } else if (resData.data.status === 'send_pin') {
            const pin = prompt("Enter your PIN:");
            if (pin) {
              const pinRes = await authFetch("/api/paystack/submit-pin", {
                method: 'POST',
                body: JSON.stringify({ pin, reference: resData.data.reference })
              });
              const pinData = await pinRes.json();
              alert(pinData.message || "PIN submitted.");
            }
          } else {
            alert(resData.message || "Payment initiated.");
          }
        } else {
          alert("Failed to initialize payment: " + (resData.message || "Unknown error"));
        }
      }
    } catch (err: any) {
      alert("Payment failed: " + err.message);
    }
  };

  const handleLoadCredits = async (amount: number) => {
    setIsTopUpModalOpen(true);
  };

  // --- WebUSB Logic ---
  const handleConnectClick = () => {
    let instructions = "";
    switch (activeModule) {
      case 'iphone':
        instructions = "Hold Power and Volume buttons while inserting USB to enter DFU mode.";
        break;
      case 'huawei':
        instructions = "Hold Volume Up and Volume Down buttons while inserting USB to enter Fastboot/EDL mode.";
        break;
      case 'android':
        instructions = "Hold Volume Down and Power buttons while inserting USB to enter Fastboot mode.";
        break;
      case 'feature-phones':
        instructions = "Hold the '*' and '#' keys while inserting USB to enter Boot mode.";
        break;
      default:
        instructions = "Hold the required key combination while inserting USB.";
    }
    setModuleInstructionsText(instructions);
    setShowModuleInstructions(true);
    
    setTimeout(() => {
      setShowModuleInstructions(false);
      // Note: Some browsers may block this if not directly triggered by user click,
      // but we follow the prompt's requirement to auto-hide and then open WebUSB.
      connectUsb().catch(err => console.error("WebUSB connection error:", err));
    }, 3000);
  };

  const connectUsb = async () => {
    try {
      setTerminalLines(prev => [...prev, `> Requesting USB device access...`]);
      const device = await navigator.usb.requestDevice({ filters: [] });
      
      setTerminalLines(prev => [...prev, `> Opening connection to ${device.productName || 'Unknown Device'}...`]);
      try {
        await device.open();
      } catch (openErr: any) {
        throw new Error(`Failed to open device: ${openErr.message}. Ensure no other app is using it.`);
      }
      
      if (device.configuration === null) {
        setTerminalLines(prev => [...prev, `> Selecting configuration...`]);
        try {
          await device.selectConfiguration(1);
        } catch (confErr: any) {
          throw new Error(`Configuration selection failed: ${confErr.message}`);
        }
      }
      
      // Identify Mode
      let mode: 'adb' | 'fastboot' | 'unknown' = 'unknown';
      const interfaces = device.configuration?.interfaces || [];
      for (const iface of interfaces) {
        const alt = iface.alternates[0];
        if (alt.interfaceClass === ADB_INTERFACE.class && alt.interfaceSubclass === ADB_INTERFACE.subclass && alt.interfaceProtocol === ADB_INTERFACE.protocol) {
          mode = 'adb';
          try {
            await device.claimInterface(iface.interfaceNumber);
          } catch (claimErr: any) {
            setTerminalLines(prev => [...prev, `[WARN] Could not claim ADB interface: ${claimErr.message}`]);
          }
          break;
        } else if (alt.interfaceClass === FASTBOOT_INTERFACE.class && alt.interfaceSubclass === FASTBOOT_INTERFACE.subclass && alt.interfaceProtocol === FASTBOOT_INTERFACE.protocol) {
          mode = 'fastboot';
          try {
            await device.claimInterface(iface.interfaceNumber);
          } catch (claimErr: any) {
            setTerminalLines(prev => [...prev, `[WARN] Could not claim Fastboot interface: ${claimErr.message}`]);
          }
          break;
        }
      }
      
      setUsbMode(mode);
      setUsbDevice(device);
      const hwInfo = {
        productName: device.productName,
        manufacturerName: device.manufacturerName,
        serialNumber: device.serialNumber,
        vendorId: `0x${device.vendorId.toString(16).padStart(4, '0')}`,
        productId: `0x${device.productId.toString(16).padStart(4, '0')}`,
        usbVersion: `${device.usbVersionMajor}.${device.usbVersionMinor}.${device.usbVersionSubminor}`,
        mode: mode.toUpperCase()
      };
      setUsbHardwareInfo(hwInfo);
      setTerminalLines(prev => [...prev, `[OK] Hardware Bridge Established: ${device.productName}`, `[OK] Mode: ${mode.toUpperCase()}`]);

      // Check for matching exploits
      if (selectedBrand && selectedService) {
        try {
          const matchRes = await authFetch(`/api/exploits/match?vid=${device.vendorId.toString(16).padStart(4, '0')}&pid=${device.productId.toString(16).padStart(4, '0')}&service=${selectedService}&brand=${selectedBrand}`);
          if (matchRes.ok) {
            const matchData = await matchRes.json();
            if (matchData.exploits && matchData.exploits.length > 0) {
              setTerminalLines(prev => [...prev, `[OK] Found ${matchData.exploits.length} matching exploit(s) for this device.`]);
              setMatchedExploit(matchData.exploits[0]);
              setTerminalLines(prev => [...prev, `> Selected Exploit: ${matchData.exploits[0].id || 'Bundle Exploit'}`]);
            } else {
              setTerminalLines(prev => [...prev, `[WARN] No matching exploits found for this device in the database.`]);
            }
          }
        } catch (err) {
          console.error("Failed to check for matching exploits", err);
        }
      }

    } catch (err: any) {
      setTerminalLines(prev => [...prev, `[ERROR] USB Bridge failed: ${err.message}`]);
    }
  };

  const startLiveSession = () => {
    if (!user) return;
    const socket = io();
    const roomId = `room-${user.id}`;
    socket.emit("join-room", roomId);
    
    socket.on("usb:request", async (request) => {
      if (!usbDevice) return;
      // Real USB logic: forward request to device
      setTerminalLines(prev => [...prev, `[REMOTE] Request: ${request.type}`]);
      // ... perform transferIn/transferOut ...
      // socket.emit("usb:packet", { roomId, packet: result });
    });

    setRemoteSocket(socket);
    setIsLiveSession(true);
    setTerminalLines(prev => [...prev, `[OK] Live Session interlinked. Technician is now connected to your device bridge.`]);
  };

  const disconnectUsb = async () => {
    if (usbDevice) {
      try {
        await usbDevice.close();
        setUsbDevice(null);
        setUsbHardwareInfo(null);
        setUsbMode(null);
        setGeminiPayload(null);
        setIsLiveSession(false);
        if (remoteSocket) remoteSocket.disconnect();
        setTerminalLines(prev => [...prev, `[OK] USB Device Disconnected.`]);
      } catch (err: any) {
        setTerminalLines(prev => [...prev, `[ERROR] Disconnect failed: ${err.message}`]);
      }
    }
  };

  const [isSmartUnlocking, setIsSmartUnlocking] = useState(false);
  const [smartProgress, setSmartProgress] = useState(0);

  const uploadLogs = async (status: string) => {
    if (!selectedModel) return;
    try {
      await authFetch('/api/logs/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: selectedModel.model,
          logs: terminalLines,
          status
        })
      });
    } catch (e) {
      console.error('Failed to upload logs', e);
    }
  };

  const purchaseBypass = async () => {
    if (!user || !selectedModel) return;
    const prices = typeof selectedModel.prices === 'string' ? JSON.parse(selectedModel.prices) : selectedModel.prices;
    const price = selectedModel.category === 'feature-phones' ? (prices['Passcode'] || 1.3) : 5;
    
    if (user.tokens < price) {
      alert(`Insufficient tokens. Please add ${formatCurrency(price)} to your balance.`);
      return;
    }

    const res = await authFetch("/api/unlock/authorize", {
      method: 'POST',
      body: JSON.stringify({ 
        model: selectedModel.model || 'Manual Bypass', 
        service: 'Guided Bypass', 
        price,
        exploitId: geminiPayload?.id // Pass exploit ID if available
      })
    });

    if (res.ok) {
      const data = await res.json();
      setUser(prev => prev ? { ...prev, tokens: data.newBalance } : null);
      setIsBypassPurchased(true);
      setTerminalLines(prev => [...prev, `[OK] Bypass Authorization Granted. Manual steps unlocked.`]);
    } else {
      const err = await res.json();
      alert(err.error);
    }
  };
  const startUnlock = async () => {
    if (!user || !selectedModel || !selectedService) return;
    if (!usbDevice) {
      alert("Please connect your device via USB first.");
      return;
    }
    
    try {
      const prices = typeof selectedModel.prices === 'string' ? JSON.parse(selectedModel.prices) : selectedModel.prices;
      const price = prices[selectedService as ServiceType] || 0;
      
      if (user.tokens < price) {
        alert(`Insufficient tokens. This service requires ${price} tokens.`);
        return;
      }

      // Fetch commands first
      try {
        if (matchedExploit && matchedExploit.commands && matchedExploit.commands.length > 0) {
          setUnlockCommands(matchedExploit.commands);
          setTerminalLines(prev => [...prev, `> Using commands from matched exploit: ${matchedExploit.id}`]);
        } else if (geminiPayload && geminiPayload.commands && geminiPayload.commands.length > 0) {
          if (geminiPayload.reliabilityScore < 60) {
            if (!confirm(`Warning: This method has a low reliability score (${geminiPayload.reliabilityScore}%). Proceed with caution?`)) return;
          }
          setUnlockCommands(geminiPayload.commands);
        } else {
          const cmdRes = await authFetch(`/api/unlock/commands?brand=${selectedBrand}&model=${selectedModel.model}&lockType=${selectedService}`);
          if (!cmdRes.ok) throw new Error("Failed to fetch commands from server.");
          const cmdData = await cmdRes.json();
          const allCmds = Object.values(cmdData).flat().filter(c => typeof c === 'string') as string[];
          setUnlockCommands(allCmds.length > 0 ? allCmds : [
            "> Reading partition table...",
            "> Identifying security sectors...",
            "> Injecting exploit payload...",
            "> Bypassing signature verification...",
            "> Patching kernel memory...",
            "> Verifying integrity...",
            "> Finalizing persistent changes...",
            "> Cleaning up trace files...",
          ]);
        }
      } catch (e: any) {
        setTerminalLines(prev => [...prev, `[WARN] Command fetch failed: ${e.message}. Using fallback sequence.`]);
      }

      const res = await authFetch("/api/unlock/authorize", {
        method: 'POST',
        body: JSON.stringify({ model: selectedModel.model, service: selectedService, price })
      });

      if (res.ok) {
        const data = await res.json();
        setUser(prev => prev ? { ...prev, tokens: data.newBalance } : null);
        setStep('unlocking');
        setIsUnlockInProgress(true);
        setIsBypassPurchased(true); // Also unlock manual steps if available
      } else {
        const err = await res.json();
        throw new Error(err.error || "Authorization failed.");
      }
    } catch (err: any) {
      alert(`Unlock failed: ${err.message}`);
      setTerminalLines(prev => [...prev, `[ERROR] Unlock initialization failed: ${err.message}`]);
    }
  };

  // --- Unlocking Progress ---
  useEffect(() => {
    if (step === 'unlocking' && !isComplete) {
      const constraints = typeof selectedModel?.constraints === 'string' ? JSON.parse(selectedModel.constraints) : (selectedModel?.constraints || {});
      setUnlockProgress(0);
      setTerminalLines([
        "> Initializing secure bridge...",
        `> Handshaking with ${usbDevice?.productName || 'device'}...`,
        `[OK] USB Connection: 0x${usbDevice?.vendorId?.toString(16).padStart(4, '0') || '0000'}:0x${usbDevice?.productId?.toString(16).padStart(4, '0') || '0000'}`,
        "[OK] Connection established",
        "> Starting memory dump...",
      ]);

      let currentProgress = 0;
      let isWasmRunning = false;

      const runWasmExploit = async () => {
        isWasmRunning = true;
        try {
          setTerminalLines(prev => [...prev, "> Loading native WebAssembly engine..."]);
          await wasmEngine.initialize();
          setTerminalLines(prev => [...prev, "[OK] WASM engine loaded. Memory footprint: <5MB"]);
          
          setTerminalLines(prev => [...prev, `> Executing payload for ${selectedBrand} ${selectedModel?.model}...`]);
          const hwToken = await wasmEngine.executeExploit('fdl_payload', { brand: selectedBrand, model: selectedModel?.model });
          setTerminalLines(prev => [...prev, `[OK] Payload executed. Hardware token generated: ${hwToken.substring(0, 15)}...`]);
          
          setTerminalLines(prev => [...prev, "> Verifying hardware token with server..."]);
          const token = localStorage.getItem('unlockpro_token') || '';
          // We need a transaction ID. For demo, we use a mock ID. In production, this comes from the authorize response.
          const mockTxId = "1"; 
          const isValid = await wasmEngine.verifyHardwareTokenWithServer(hwToken, mockTxId, token);
          
          if (isValid) {
            setTerminalLines(prev => [...prev, "[OK] Server verification successful. Finalizing unlock..."]);
          } else {
            setTerminalLines(prev => [...prev, "[WARNING] Server verification failed or mocked. Proceeding in demo mode..."]);
          }
          
          setUnlockProgress(100);
          setTimeout(() => {
            setIsComplete(true);
            setIsUnlockInProgress(false);
          }, 1000);
        } catch (error: any) {
          setTerminalLines(prev => [...prev, `[ERROR] WASM execution failed: ${error.message}`]);
          setIsUnlockInProgress(false);
        }
      };

      const interval = setInterval(() => {
        if (currentProgress >= 90 && !isWasmRunning) {
          // Pause progress bar at 90% and run WASM
          clearInterval(interval);
          runWasmExploit();
          return;
        }

        if (currentProgress < 90) {
          const increment = Math.floor(Math.random() * 8) + 2;
          currentProgress = Math.min(currentProgress + increment, 90);
          setUnlockProgress(currentProgress);

          const currentLogs = constraints.requires_edl ? [
            "Detecting Qualcomm HS-USB QDLoader 9008...",
            "Handshake successful. Sending Firehose payload...",
            "Payload uploaded. Initializing memory map...",
            "Exploiting persist partition...",
            "Uploading logs to secure server...",
            "Patching security module...",
            "Verifying integrity...",
          ] : (unlockCommands.length > 0 ? unlockCommands : [
            "> Reading partition table...",
            "> Identifying security sectors...",
            "> Injecting exploit payload...",
            "> Bypassing signature verification...",
            "> Patching kernel memory...",
            "> Verifying integrity...",
          ]);

          const logIndex = Math.floor(currentProgress / (90 / currentLogs.length));

          if (logIndex < currentLogs.length) {
            setTerminalLines(prev => {
              const currentLog = currentLogs[logIndex];
              if (prev.includes(currentLog)) return prev;
              const barWidth = 20;
              const filled = Math.floor((currentProgress / 100) * barWidth);
              const empty = barWidth - filled;
              const asciiBar = `[${'#'.repeat(filled)}${'.'.repeat(empty)}] ${currentProgress}%`;
              return [...prev, currentLog, asciiBar];
            });
          }
        }
      }, Math.random() * 400 + 200);

      return () => clearInterval(interval);
    }
  }, [step, isComplete, selectedModel, unlockCommands]);

  return (
    <div 
      className="min-h-screen bg-[#0c0a09] text-stone-100 font-sans selection:bg-amber-500/30 selection:text-amber-200 overflow-hidden flex relative"
      style={{ 
        transform: appScale < 1 ? `scale(${appScale})` : 'none', 
        transformOrigin: 'top center',
        width: appScale < 1 ? `${100 / appScale}%` : '100%',
        height: appScale < 1 ? `${100 / appScale}%` : '100%',
        position: 'absolute',
        left: '50%',
        top: 0,
        translate: '-50% 0'
      }}
    >
      {/* Liquid Background Video */}
      <div className="bg-video-container">
        <video 
          autoPlay 
          muted 
          loop 
          playsInline 
          className="bg-video"
          src="https://cdn.pixabay.com/vimeo/478334612/fluid-57353.mp4?width=1280&hash=8562725585045437812"
        />
      </div>

      <AnimatePresence mode="wait">
        {view === 'landing' && (
          <motion.div 
            key="landing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-6"
          >
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <GlassCard className="max-w-4xl w-full p-8 sm:p-12 lg:p-20 text-center space-y-8 lg:space-y-12 liquid-glass relative z-10">
              <div className="space-y-6">
                <motion.div 
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="inline-flex items-center gap-3 px-6 py-2 glass-amber rounded-full text-amber-500 text-[10px] lg:text-xs font-black uppercase tracking-[0.4em]"
                >
                  <Zap size={14} /> Next-Gen Hardware Bridge
                </motion.div>
                <h1 className="text-4xl sm:text-6xl lg:text-8xl font-black tracking-tighter uppercase leading-[0.85] text-gradient">
                  UnlockPro<br />Online
                </h1>
                <p className="text-base lg:text-xl text-stone-400 max-w-2xl mx-auto font-medium leading-relaxed">
                  The world's most advanced web-based mobile forensics and repair platform. Liquid-fast, AI-driven, and hardware-native.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-6 justify-center">
                <motion.button 
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    requestFullscreen();
                    handleUnlockNow();
                  }}
                  className="px-12 py-6 bg-white text-stone-950 rounded-[2rem] font-black text-lg uppercase tracking-widest hover:bg-amber-600 hover:text-white transition-all shadow-2xl group"
                >
                  Unlock Now
                  <motion.span 
                    animate={{ x: [0, 5, 0] }} 
                    transition={{ repeat: Infinity, duration: 1.5 }}
                    className="inline-block ml-3"
                  >
                    →
                  </motion.span>
                </motion.button>
                <button className="px-12 py-6 glass rounded-[2rem] font-black text-lg uppercase tracking-widest hover:bg-white/5 transition-all">
                  Documentation
                </button>
              </div>
            </GlassCard>
          </motion.div>
        )}

        {view === 'auth' && (
          <AuthTerminal 
            key="auth"
            authMode={authMode}
            setAuthMode={setAuthMode}
            username={username}
            setUsername={setUsername}
            password={password}
            setPassword={setPassword}
            handleLogin={handleLogin}
            handleGoogleLogin={handleGoogleLogin}
            isLoading={isLoading}
          />
        )}

        {view === 'onboarding' && (
          <Onboarding 
            key="onboarding" 
            onComplete={() => {
              if (user?.isVerified) setView('app');
              else setView('verify');
            }} 
          />
        )}

        {view === 'guide' && (
          <ConnectionGuide key="guide" onComplete={() => setView('app')} />
        )}
      </AnimatePresence>

      {/* Mobile Menu Overlay */}
      {user && isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[45] lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Floating Premium Sidebar */}
      {user && view !== 'landing' && view !== 'auth' && view !== 'guide' && (
        <aside className={cn(
          "fixed z-50 transition-all duration-500",
          "lg:left-6 lg:top-6 lg:bottom-6 lg:w-32",
          "max-lg:inset-y-0 max-lg:left-0 max-lg:w-72 max-lg:glass max-lg:rounded-r-[3rem]",
          isSidebarOpen ? "max-lg:translate-x-0" : "max-lg:-translate-x-full"
        )}>
          <div className="h-full liquid-glass lg:rounded-[3rem] flex flex-col items-center py-10 gap-10 border-white/[0.05] relative">
            {/* Close button for mobile */}
            <button 
              onClick={() => setIsSidebarOpen(false)}
              className="lg:hidden absolute top-8 right-8 p-2 text-stone-500 hover:text-white"
            >
              <X size={24} />
            </button>

            <div className="w-12 h-12 lg:w-16 lg:h-16 rounded-3xl bg-amber-600 flex items-center justify-center text-stone-950 shadow-[0_0_30px_rgba(217,119,6,0.3)]">
              <Zap size={28} />
            </div>
            
            <nav className="flex-1 flex flex-col gap-4 w-full px-6 lg:px-0 items-center">
              {[
                { id: 'app', icon: LayoutGrid, label: 'Dashboard' },
                { id: 'sessions', icon: Activity, label: 'Sessions' },
                { id: 'history', icon: History, label: 'History' },
                { id: 'admin', icon: Shield, label: 'Admin', adminOnly: true },
                { id: 'developer', icon: TerminalIcon, label: 'Developer', devOnly: true },
                { id: 'settings', icon: Settings, label: 'Settings' }
              ].map(item => {
                if (item.adminOnly && user.role !== 'Admin' && user.role !== 'Support') return null;
                if (item.devOnly && user.role !== 'Admin' && user.role !== 'Developer') return null;
                const isActive = view === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setView(item.id as any);
                      setIsSidebarOpen(false);
                    }}
                    className={cn(
                      "w-full lg:w-16 h-14 lg:h-16 rounded-3xl flex flex-row lg:flex-col items-center justify-start lg:justify-center gap-4 lg:gap-1 px-6 lg:px-0 transition-all group relative",
                      isActive ? "bg-white/10 text-white" : "text-stone-500 hover:text-white hover:bg-white/5"
                    )}
                  >
                    <item.icon size={20} className={cn("transition-transform group-hover:scale-110", isActive && "text-amber-500")} />
                    <span className={cn(
                      "text-[10px] lg:text-[8px] font-black uppercase tracking-widest lg:tracking-tighter transition-all lg:opacity-0 lg:group-hover:opacity-100",
                      isActive ? "opacity-100" : ""
                    )}>
                      {item.label}
                    </span>
                    {isActive && <motion.div layoutId="nav-active" className="absolute right-0 lg:-right-1 top-1/2 -translate-y-1/2 w-1 h-8 bg-amber-600 rounded-full" />}
                  </button>
                );
              })}
            </nav>

            <button 
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="w-12 h-12 lg:w-16 lg:h-16 rounded-3xl bg-white/5 border border-white/5 flex items-center justify-center text-stone-500 hover:text-white transition-all overflow-hidden mb-6 lg:mb-0"
            >
              <UserIcon size={24} />
            </button>
          </div>
        </aside>
      )}

      <main className={cn("flex-1 flex flex-col transition-all duration-700 max-w-full overflow-x-hidden", user && view !== 'landing' && view !== 'auth' && view !== 'guide' ? "lg:ml-44" : "")}>
        {/* Top Header */}
        {user && view !== 'landing' && view !== 'auth' && view !== 'guide' && (
          <header className="h-24 px-6 lg:px-12 flex items-center justify-between relative z-40">
            <div className="flex items-center gap-4 lg:gap-6">
              <button 
                onClick={() => setIsSidebarOpen(true)}
                className="lg:hidden p-2 text-stone-500 hover:text-white transition-colors"
              >
                <Menu size={24} />
              </button>
              <div className="hidden sm:block text-[10px] font-black text-stone-500 uppercase tracking-[0.4em]">System Status</div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-[10px] font-black uppercase tracking-widest text-white">Live Bridge Active</span>
              </div>
            </div>

            <div className="flex items-center gap-8">
              <div className="flex flex-col items-end">
                <span className="text-[8px] font-black text-stone-500 uppercase tracking-widest">Available Balance</span>
                <span className="text-xl font-black text-amber-500 tracking-tighter">{formatCurrency(user.tokens)}</span>
              </div>
              <button onClick={() => setIsTopUpModalOpen(true)} className="p-3 rounded-2xl bg-amber-600/20 border border-amber-500/30 text-amber-500 hover:bg-amber-600 hover:text-stone-950 transition-all flex items-center gap-2">
                <Wallet size={20} />
                <span className="text-xs font-black uppercase tracking-widest hidden lg:block">Top Up</span>
              </button>
            </div>
          </header>
        )}

        <div className="flex-1 overflow-y-auto p-6 lg:p-12 relative z-30">
          <AnimatePresence mode="wait">
            {view === 'sessions' && (
              <motion.div key="sessions" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-12">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                  <div className="space-y-2">
                    <h1 className="text-3xl sm:text-5xl font-black tracking-tighter uppercase">Active Sessions</h1>
                    <p className="text-stone-500 text-base lg:text-lg font-medium">Your recent hardware interactions and AI-driven operations.</p>
                  </div>
                  <div className="flex gap-4">
                    <div className="liquid-glass px-6 lg:px-8 py-3 lg:py-4 rounded-3xl text-center">
                      <div className="text-[10px] text-stone-500 font-black uppercase tracking-widest mb-1">Success Rate</div>
                      <div className="text-xl lg:text-2xl font-black text-green-500">98.4%</div>
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {sessions.map((s, i) => (
                    <GlassCard key={i} className="p-8 space-y-6 liquid-glass group hover:scale-[1.02] transition-all">
                      <div className="flex items-center justify-between">
                        <div className="w-14 h-14 bg-amber-600/10 rounded-2xl flex items-center justify-center group-hover:bg-amber-600/20 transition-colors">
                          <Activity className="text-amber-500" size={28} />
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <span className={cn("px-4 py-1.5 rounded-full text-[8px] font-black uppercase tracking-widest", s.status === 'completed' ? "bg-green-600/10 text-green-500" : "bg-amber-600/10 text-amber-500")}>
                            {s.status}
                          </span>
                          <div className="text-[8px] text-stone-600 font-mono">ID: {s.id.slice(0, 8)}</div>
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] text-stone-500 font-black uppercase tracking-widest mb-1">{s.brand}</div>
                        <div className="text-3xl font-black uppercase tracking-tighter text-white">{s.model || s.type}</div>
                        <div className="mt-2 flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-amber-600" />
                          <span className="text-[10px] font-black text-stone-400 uppercase tracking-widest">{s.service_type || 'Full Unlock'}</span>
                        </div>
                      </div>
                      <div className="pt-6 border-t border-white/5 flex items-center justify-between">
                        <div className="space-y-1">
                          <div className="text-[8px] text-stone-600 font-black uppercase tracking-widest">Timestamp</div>
                          <div className="text-[10px] text-stone-400 font-mono">{new Date(s.created_at).toLocaleString()}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-[8px] text-stone-600 font-black uppercase tracking-widest">Cost</div>
                          <div className="text-xl font-black text-amber-500">{formatCurrency(s.amount)}</div>
                        </div>
                      </div>
                    </GlassCard>
                  ))}
                  {sessions.length === 0 && (
                    <div className="col-span-full py-32 text-center liquid-glass rounded-[3rem]">
                      <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Activity className="text-stone-700" size={32} />
                      </div>
                      <div className="text-stone-600 font-black uppercase tracking-widest">No active sessions found in your history</div>
                      <button onClick={() => setView('app')} className="mt-8 px-8 py-4 bg-white/5 hover:bg-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all">Start New Operation</button>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {view === 'history' && (
              <motion.div key="history" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-12">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                  <div className="space-y-2">
                    <h1 className="text-3xl sm:text-5xl font-black tracking-tighter uppercase">Unlock History</h1>
                    <p className="text-stone-500 text-base lg:text-lg font-medium">A complete record of your completed unlock transactions.</p>
                  </div>
                </div>
                
                <div className="glass rounded-[2rem] overflow-hidden border-white/[0.02]">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-white/5 bg-white/[0.02]">
                          <th className="p-6 text-[10px] font-black text-stone-500 uppercase tracking-widest">Date</th>
                          <th className="p-6 text-[10px] font-black text-stone-500 uppercase tracking-widest">Device Model</th>
                          <th className="p-6 text-[10px] font-black text-stone-500 uppercase tracking-widest">Service Type</th>
                          <th className="p-6 text-[10px] font-black text-stone-500 uppercase tracking-widest">Cost</th>
                          <th className="p-6 text-[10px] font-black text-stone-500 uppercase tracking-widest">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sessions.filter(s => s.status === 'completed').map((s, i) => (
                          <tr key={i} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                            <td className="p-6 text-sm text-stone-300">{new Date(s.created_at).toLocaleString()}</td>
                            <td className="p-6 text-sm font-bold text-white">{s.model || s.type}</td>
                            <td className="p-6 text-sm text-stone-400">{s.service_type || 'Full Unlock'}</td>
                            <td className="p-6 text-sm font-bold text-amber-500">{formatCurrency(s.amount)}</td>
                            <td className="p-6">
                              <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-green-600/10 text-green-500">
                                {s.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                        {sessions.filter(s => s.status === 'completed').length === 0 && (
                          <tr>
                            <td colSpan={5} className="p-12 text-center text-stone-500 font-medium">
                              No completed unlock transactions found.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </motion.div>
            )}

            {view === 'settings' && (
              <motion.div key="settings" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-12">
                <div className="space-y-2">
                  <h1 className="text-5xl font-black tracking-tighter uppercase">System Settings</h1>
                  <p className="text-stone-500 text-lg font-medium">Fine-tune the hardware bridge and AI orchestration engine.</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                  <div className="lg:col-span-8 space-y-8">
                    <GlassCard className="p-10 liquid-glass space-y-10">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-amber-600 rounded-2xl flex items-center justify-center">
                          <Globe size={24} className="text-stone-950" />
                        </div>
                        <div>
                          <h3 className="text-2xl font-black uppercase tracking-tighter">Region & Accounting</h3>
                          <p className="text-stone-500 text-[10px] font-black uppercase tracking-widest">Localized Forensic Protocols</p>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                        <div className="space-y-3">
                          <label className="text-[10px] font-black text-stone-500 uppercase tracking-widest ml-4 italic">Active Country</label>
                          <div className="px-6 py-4 bg-white/5 border border-white/5 rounded-2xl text-white font-bold uppercase tracking-tight">
                            {localStorage.getItem('unlockpro_country') || 'US'}
                          </div>
                        </div>
                        <div className="space-y-3">
                          <label className="text-[10px] font-black text-stone-500 uppercase tracking-widest ml-4 italic">Exchange Base</label>
                          <div className="px-6 py-4 bg-white/5 border border-white/5 rounded-2xl text-amber-500 font-bold uppercase tracking-tight">
                            {localStorage.getItem('unlockpro_currency') || 'USD'}
                          </div>
                        </div>
                      </div>
                      
                      <button 
                        onClick={() => setView('onboarding')}
                        className="w-full py-4 bg-white/5 hover:bg-white/10 border border-white/5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all"
                      >
                        Re-initialize System Onboarding
                      </button>
                    </GlassCard>

                    <GlassCard className="p-10 liquid-glass space-y-10">
                      <div className="space-y-8">
                        <h3 className="text-[10px] font-black text-stone-500 uppercase tracking-[0.4em] flex items-center gap-6">Automation Engine <div className="flex-1 h-px bg-white/5" /></h3>
                        <div className="grid grid-cols-1 gap-6">
                          {[
                            { id: 'autoBypass', label: 'Auto-Bypass Handshake', desc: 'Automatically execute identified bypass sequences without confirmation.' },
                            { id: 'highPerformance', label: 'High Performance Mode', desc: 'Prioritize speed over stability for USB transfers (may cause packet loss).' },
                            { id: 'verboseLogs', label: 'Verbose Terminal Logs', desc: 'Output detailed protocol-level information to the terminal.' },
                            { id: 'notifications', label: 'System Notifications', desc: 'Receive desktop alerts when operations complete or require attention.' }
                          ].map(item => (
                            <div key={item.id} className="flex items-center justify-between p-6 rounded-3xl bg-white/[0.02] border border-white/5">
                              <div className="space-y-1">
                                <div className="text-sm font-black uppercase tracking-tighter text-white">{item.label}</div>
                                <p className="text-xs text-stone-500 font-medium">{item.desc}</p>
                              </div>
                              <button 
                                onClick={() => setSettings(prev => ({ ...prev, [item.id]: !(prev as any)[item.id] }))}
                                className={cn(
                                  "w-14 h-8 rounded-full transition-all relative p-1",
                                  (settings as any)[item.id] ? "bg-amber-600" : "bg-stone-800"
                                )}
                              >
                                <motion.div 
                                  animate={{ x: (settings as any)[item.id] ? 24 : 0 }}
                                  className="w-6 h-6 bg-white rounded-full shadow-lg"
                                />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-8">
                        <h3 className="text-[10px] font-black text-stone-500 uppercase tracking-[0.4em] flex items-center gap-6">AI Configuration <div className="flex-1 h-px bg-white/5" /></h3>
                        <div className="p-8 rounded-3xl bg-white/[0.02] border border-white/5 space-y-6">
                          <label className="text-[10px] font-black text-stone-500 uppercase tracking-widest">Reasoning Level</label>
                          <div className="grid grid-cols-3 gap-4">
                            {['low', 'medium', 'high'].map(level => (
                              <button
                                key={level}
                                onClick={() => setSettings(prev => ({ ...prev, aiReasoning: level }))}
                                className={cn(
                                  "py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border",
                                  settings.aiReasoning === level ? "bg-amber-600 border-amber-600 text-stone-950" : "bg-white/5 border-white/5 text-stone-500 hover:text-white"
                                )}
                              >
                                {level}
                              </button>
                            ))}
                          </div>
                          <p className="text-[10px] text-stone-600 font-medium italic">High reasoning increases latency but improves success rate for complex chipset security.</p>
                        </div>
                      </div>
                    </GlassCard>
                  </div>

                  <div className="lg:col-span-4 space-y-8">
                    <GlassCard className="p-8 liquid-glass space-y-6">
                      <h3 className="text-[10px] font-black text-stone-500 uppercase tracking-widest">Account Security</h3>
                      <div className="space-y-4">
                        <button className="w-full py-4 rounded-2xl bg-white/5 border border-white/5 text-white font-black text-[10px] uppercase tracking-widest hover:bg-white/10 transition-all">Change Access Key</button>
                        <button className="w-full py-4 rounded-2xl bg-white/5 border border-white/5 text-white font-black text-[10px] uppercase tracking-widest hover:bg-white/10 transition-all">Manage API Tokens</button>
                        <button className="w-full py-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 font-black text-[10px] uppercase tracking-widest hover:bg-red-500/20 transition-all">Purge Session Data</button>
                      </div>
                    </GlassCard>

                    <GlassCard className="p-8 bg-amber-600/5 border-amber-600/20 liquid-glass space-y-4">
                      <div className="flex items-center gap-3 text-amber-500">
                        <Shield size={20} />
                        <span className="text-[10px] font-black uppercase tracking-widest">Hardware Integrity</span>
                      </div>
                      <p className="text-[10px] text-stone-400 font-medium leading-relaxed">Your hardware bridge is currently operating in encrypted mode. All USB data is tunneled through a secure end-to-end bridge.</p>
                      <div className="pt-4 flex items-center justify-between">
                        <span className="text-[8px] font-black text-stone-600 uppercase tracking-widest">Firmware v2.4.1</span>
                        <span className="text-[8px] font-black text-green-500 uppercase tracking-widest">Up to date</span>
                      </div>
                    </GlassCard>
                  </div>
                </div>
              </motion.div>
            )}

            {view === 'developer' && (
              <motion.div key="developer" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-12">
                <DeveloperDashboard authFetch={authFetch} />
              </motion.div>
            )}

            {view === 'admin' && (
              <motion.div key="admin" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-12">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                  <div className="space-y-2">
                    <h1 className="text-3xl sm:text-5xl font-black tracking-tighter uppercase">Admin Console</h1>
                    <p className="text-stone-500 text-base lg:text-lg font-medium">System management and hardware diagnostics.</p>
                  </div>
                  <div className="flex gap-4">
                    <div className="glass px-4 lg:px-6 py-3 lg:py-4 rounded-2xl border-white/[0.02] text-center">
                      <div className="text-[10px] text-stone-500 font-black uppercase tracking-widest mb-1">Total Users</div>
                      <div className="text-xl lg:text-2xl font-black">{adminStats?.totalUsers || 0}</div>
                    </div>
                    <div className="glass px-4 lg:px-6 py-3 lg:py-4 rounded-2xl border-white/[0.02] text-center">
                      <div className="text-[10px] text-stone-500 font-black uppercase tracking-widest mb-1">Total Tokens</div>
                      <div className="text-xl lg:text-2xl font-black text-amber-500">{adminStats?.totalTokens || 0}</div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-4 border-b border-white/5 pb-4 overflow-x-auto scrollbar-hide">
                  {(['stats', 'users', 'devices', 'transactions', 'logs', 'exploits', 'diagnostics'] as const).map(tab => {
                    if (tab === 'devices' && user?.role === 'Support') return null;
                    return (
                      <button
                        key={tab}
                        onClick={() => setAdminTab(tab)}
                        className={cn(
                          "px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap",
                          adminTab === tab ? "glass-amber text-amber-500" : "text-stone-500 hover:text-white hover:bg-white/5"
                        )}
                      >
                        {tab}
                      </button>
                    );
                  })}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                  <div className="lg:col-span-8 space-y-10">
                    {usbHardwareInfo && (
                      <GlassCard className="p-8 lg:p-10 border-amber-600/20 bg-amber-600/5">
                        <div className="flex items-center justify-between mb-8">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-amber-600 rounded-2xl flex items-center justify-center shadow-2xl">
                              <Usb className="text-stone-950" size={24} />
                            </div>
                            <div>
                              <h3 className="text-2xl font-black uppercase tracking-tighter">Hardware Diagnostics</h3>
                              <p className="text-amber-500/60 text-[10px] font-black uppercase tracking-widest">Live USB Bridge Active</p>
                            </div>
                          </div>
                          <button onClick={disconnectUsb} className="px-6 py-3 bg-white/5 hover:bg-red-500/10 text-stone-500 hover:text-red-500 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all">Disconnect</button>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                          {Object.entries(usbHardwareInfo).map(([key, value]) => (
                            <div key={key} className="glass rounded-2xl p-4 border-white/[0.02]">
                              <div className="text-[8px] text-stone-500 font-black uppercase tracking-widest mb-1">{key.replace(/([A-Z])/g, ' $1')}</div>
                              <div className="text-xs font-black text-white uppercase tracking-tighter truncate">{String(value)}</div>
                            </div>
                          ))}
                        </div>
                      </GlassCard>
                    )}

                    {adminTab === 'logs' && (
                      <div className="space-y-6">
                        <div className="flex items-center justify-between">
                          <h3 className="text-2xl font-black uppercase tracking-tighter">Device Operation Logs</h3>
                          <button onClick={() => fetchAdminData()} className="p-2 hover:bg-white/5 rounded-lg transition-all text-stone-500 hover:text-white"><RefreshCw size={18} /></button>
                        </div>
                        <div className="grid grid-cols-1 gap-4">
                          {adminLogs?.map((log: any) => (
                            <div key={log.id} className="glass rounded-2xl p-6 border-white/[0.02] space-y-4">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                  <div className="w-10 h-10 rounded-xl bg-stone-900 flex items-center justify-center text-amber-500">
                                    <Activity size={20} />
                                  </div>
                                  <div>
                                    <div className="text-sm font-black uppercase tracking-tighter">{log.model}</div>
                                    <div className="text-[8px] text-stone-500 font-black uppercase tracking-widest">{log.username} | {new Date(log.created_at).toLocaleString()}</div>
                                  </div>
                                </div>
                                <div className={cn(
                                  "px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest",
                                  log.status === 'success' ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"
                                )}>
                                  {log.status}
                                </div>
                              </div>
                              <div className="bg-stone-950/40 rounded-xl p-4 font-mono text-[9px] text-stone-400 max-h-40 overflow-y-auto scrollbar-hide">
                                {JSON.parse(log.logs).map((line: string, i: number) => (
                                  <div key={i}>{line}</div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {adminTab === 'devices' && (
                      <div className="space-y-6">
                        <div className="flex items-center justify-between">
                          <h3 className="text-[10px] font-black text-stone-600 uppercase tracking-[0.4em] flex-1 flex items-center gap-6">Device Inventory<div className="flex-1 h-px bg-white/5" /></h3>
                          <button 
                            onClick={() => {
                              const brand = prompt("Brand? (e.g. Samsung, Apple, Xiaomi, BBK, Transsion, Huawei, Lenovo, Google, Sony, Asus, Nokia, Honor, HTC, Fairphone)");
                              const model = prompt("Model?");
                              const chipset = prompt("Chipset? (e.g. Snapdragon 8 Gen 3, A17 Pro, MediaTek Dimensity 9300)");
                              const image_url = prompt("Image URL?");
                              const mode = prompt("Mode? (FRP, MDM, SIM, BOOTLOADER, iCloud, Mi Account)");
                              const fastboot = prompt("Fastboot Commands? (comma separated)");
                              const adb = prompt("ADB Commands? (comma separated)");
                              const edl = prompt("EDL Commands? (comma separated)");
                              const price = prompt("Price (Tokens)?");

                              if (brand && model) {
                                const unlock_commands: any = {};
                                if (mode) {
                                  unlock_commands[mode] = {};
                                  if (fastboot) unlock_commands[mode].fastboot = fastboot.split(',').map(s => s.trim());
                                  if (adb) unlock_commands[mode].adb = adb.split(',').map(s => s.trim());
                                  if (edl) unlock_commands[mode].edl = edl.split(',').map(s => s.trim());
                                }
                                
                                authFetch("/api/devices", {
                                  method: 'POST',
                                  body: JSON.stringify({ 
                                    brand, 
                                    model, 
                                    chipset,
                                    image_url, 
                                    prices: mode ? { [mode]: parseInt(price || '10') } : { FRP: 10 }, 
                                    unlock_commands, 
                                    constraints: { requires_adb: !!adb, requires_fastboot: !!fastboot, requires_edl: !!edl } 
                                  })
                                }).then(() => fetch("/api/devices").then(res => res.json()).then(setDevices).catch(console.error)).catch(console.error);
                              }
                            }}
                            className="px-6 py-3 bg-amber-600 text-stone-950 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-amber-500 transition-all"
                          >
                            Add Device
                          </button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {devices.map((device, i) => (
                            <div key={i} className="glass rounded-[2rem] p-6 border-white/[0.02] flex gap-6 items-center">
                              <img src={device.imageUrl} alt={device.model} className="w-24 h-24 rounded-2xl object-cover" referrerPolicy="no-referrer" />
                              <div className="flex-1 space-y-2">
                                <div className="text-[10px] text-amber-500 font-black uppercase tracking-widest">{device.brand}</div>
                                <div className="text-xl font-black uppercase tracking-tighter">{device.model}</div>
                                <div className="text-[9px] text-stone-500 font-mono">{device.chipset}</div>
                                <div className="flex gap-2">
                                  <button onClick={() => {
                                    if (confirm("Delete this device?")) {
                                      authFetch(`/api/devices/${device.id}`, { method: 'DELETE' })
                                        .then(() => fetch("/api/devices").then(res => res.json()).then(setDevices).catch(console.error)).catch(console.error);
                                    }
                                  }} className="text-[8px] font-black uppercase tracking-widest text-red-500 hover:text-red-400">Delete</button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {(adminTab === 'transactions' || adminTab === 'stats') && (
                      <div className="space-y-6">
                        <h3 className="text-[10px] font-black text-stone-600 uppercase tracking-[0.4em] flex items-center gap-6">
                          {adminTab === 'stats' ? 'Recent Activity' : 'Full Transaction History'}
                          <div className="flex-1 h-px bg-white/5" />
                        </h3>
                        <div className="glass rounded-[2rem] overflow-hidden border-white/[0.02]">
                          <table className="w-full text-left border-collapse">
                            <thead>
                              <tr className="border-b border-white/5 bg-white/[0.02]">
                                <th className="px-6 py-4 text-[10px] font-black text-stone-500 uppercase tracking-widest">User</th>
                                <th className="px-6 py-4 text-[10px] font-black text-stone-500 uppercase tracking-widest">Type</th>
                                <th className="px-6 py-4 text-[10px] font-black text-stone-500 uppercase tracking-widest">Amount</th>
                                <th className="px-6 py-4 text-[10px] font-black text-stone-500 uppercase tracking-widest">Status</th>
                                <th className="px-6 py-4 text-[10px] font-black text-stone-500 uppercase tracking-widest">Date</th>
                              </tr>
                            </thead>
                            <tbody className="text-xs font-medium">
                              {(adminTab === 'stats' ? adminTransactions.slice(0, 5) : adminTransactions).map((t, i) => (
                                <tr key={i} className="border-b border-white/5 hover:bg-white/[0.01] transition-colors">
                                  <td className="px-6 py-4 text-white uppercase tracking-tighter">{t.user_username}</td>
                                  <td className="px-6 py-4 text-stone-500 uppercase">{t.type}</td>
                                  <td className="px-6 py-4 text-amber-500 font-black">{formatCurrency(t.amount)}</td>
                                  <td className="px-6 py-4">
                                    <span className={cn("px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest", t.status === 'completed' ? "bg-amber-600/10 text-amber-500" : "bg-stone-800 text-stone-500")}>
                                      {t.status}
                                    </span>
                                  </td>
                                  <td className="px-6 py-4 text-stone-600 text-[10px]">{new Date(t.created_at).toLocaleDateString()}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {adminTab === 'exploits' && (
                      <div className="space-y-6">
                        <div className="flex items-center justify-between">
                          <h3 className="text-[10px] font-black text-stone-600 uppercase tracking-[0.4em] flex-1 flex items-center gap-6">Exploit Submissions<div className="flex-1 h-px bg-white/5" /></h3>
                        </div>
                        <div className="grid grid-cols-1 gap-6">
                          {developerExploits.map((exploit: any) => (
                            <div key={exploit.id} className="glass rounded-[2rem] p-6 border-white/[0.02] space-y-4">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                  <div className="w-10 h-10 rounded-xl bg-stone-900 flex items-center justify-center text-amber-500">
                                    <Cpu size={20} />
                                  </div>
                                  <div>
                                    <div className="text-sm font-black uppercase tracking-tighter">VID: {exploit.vid} | PID: {exploit.pid}</div>
                                    <div className="text-[8px] text-stone-500 font-black uppercase tracking-widest">{exploit.service} | By: {exploit.developer_username} | {new Date(exploit.created_at).toLocaleString()}</div>
                                  </div>
                                </div>
                                <div className={cn(
                                  "px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest",
                                  exploit.status === 'approved' ? "bg-green-500/10 text-green-500" : 
                                  exploit.status === 'rejected' ? "bg-red-500/10 text-red-500" : 
                                  "bg-amber-500/10 text-amber-500"
                                )}>
                                  {exploit.status}
                                </div>
                              </div>
                              <div className="bg-stone-950/40 rounded-xl p-4 font-mono text-[9px] text-stone-400 max-h-40 overflow-y-auto scrollbar-hide">
                                <div>Commands: {JSON.stringify(exploit.commands)}</div>
                                <div>Manual Steps: {JSON.stringify(exploit.manual_steps)}</div>
                              </div>
                              {exploit.status === 'pending' && (
                                <div className="flex gap-4 pt-4 border-t border-white/5">
                                  <button
                                    onClick={() => {
                                      authFetch(`/api/exploits/${exploit.id}/analyze`, { method: 'POST' })
                                        .then(res => res.json())
                                        .then(data => {
                                          if (data.success) {
                                            alert(`Analysis Complete:\nReliability: ${data.analysis.reliabilityScore}\nSummary: ${data.analysis.operationSummary}\nRecommendation: ${data.analysis.recommendation}`);
                                          } else {
                                            alert(`Analysis Failed: ${data.error}`);
                                          }
                                        }).catch(console.error);
                                    }}
                                    className="flex-1 py-3 bg-blue-600/20 text-blue-500 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-600/30 transition-all"
                                  >
                                    Analyze with AI
                                  </button>
                                  <button
                                    onClick={() => {
                                      if (confirm("Approve this exploit?")) {
                                        authFetch(`/api/exploits/${exploit.id}/approve`, { method: 'POST' })
                                          .then(() => fetchAdminData()).catch(console.error);
                                      }
                                    }}
                                    className="flex-1 py-3 bg-green-600/20 text-green-500 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-green-600/30 transition-all"
                                  >
                                    Approve
                                  </button>
                                  <button
                                    onClick={() => {
                                      if (confirm("Reject this exploit?")) {
                                        authFetch(`/api/exploits/${exploit.id}/reject`, { method: 'POST' })
                                          .then(() => fetchAdminData()).catch(console.error);
                                      }
                                    }}
                                    className="flex-1 py-3 bg-red-600/20 text-red-500 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-red-600/30 transition-all"
                                  >
                                    Reject
                                  </button>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {adminTab === 'diagnostics' && (
                      <div className="space-y-10">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                          <div className="space-y-6">
                            <h3 className="text-[10px] font-black text-stone-600 uppercase tracking-[0.4em] flex items-center gap-6">Device Control<div className="flex-1 h-px bg-white/5" /></h3>
                            <div className="glass rounded-[2rem] p-8 border-white/[0.02] space-y-6">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-black text-stone-500 uppercase tracking-widest">USB Status</span>
                                <div className="flex items-center gap-4">
                                  <button 
                                    onClick={connectWebUSB} 
                                    className="px-4 py-2 bg-amber-600 text-stone-950 rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-amber-500 transition-all"
                                  >
                                    Connect USB
                                  </button>
                                  <span className={cn("px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest", usbDevice ? "bg-green-600/10 text-green-500" : "bg-red-600/10 text-red-500")}>
                                    {usbDevice ? 'Connected' : 'Disconnected'}
                                  </span>
                                </div>
                              </div>
                              {usbHardwareInfo && (
                                <div className="space-y-4">
                                  <div className="flex justify-between text-[10px] font-black uppercase tracking-tighter"><span className="text-stone-500">Model</span><span className="text-white">{usbHardwareInfo.productName}</span></div>
                                  <div className="flex justify-between text-[10px] font-black uppercase tracking-tighter"><span className="text-stone-500">Manufacturer</span><span className="text-white">{usbHardwareInfo.manufacturerName}</span></div>
                                  <div className="flex justify-between text-[10px] font-black uppercase tracking-tighter"><span className="text-stone-500">Serial</span><span className="text-white">{usbHardwareInfo.serialNumber}</span></div>
                                  <div className="flex justify-between text-[10px] font-black uppercase tracking-tighter"><span className="text-stone-500">VID:PID</span><span className="text-white font-mono">0x{usbHardwareInfo.vendorId}:0x{usbHardwareInfo.productId}</span></div>
                                  <div className="flex justify-between text-[10px] font-black uppercase tracking-tighter"><span className="text-stone-500">Class/Subclass/Protocol</span><span className="text-white font-mono">{usbHardwareInfo.deviceClass}/{usbHardwareInfo.deviceSubclass}/{usbHardwareInfo.deviceProtocol}</span></div>
                                  <div className="flex justify-between text-[10px] font-black uppercase tracking-tighter"><span className="text-stone-500">Detected Mode</span><span className="text-amber-500">{usbHardwareInfo.mode}</span></div>
                                </div>
                              )}
                              <div className="h-px bg-white/5" />
                              <div className="space-y-4">
                                <label className="text-[10px] font-black text-stone-500 uppercase tracking-widest">Background Module Status</label>
                                <div className="p-4 bg-white/5 rounded-xl border border-white/5 space-y-2">
                                  <div className="flex justify-between text-[9px] font-black uppercase tracking-widest">
                                    <span className="text-stone-400">Active Protocol Handler</span>
                                    <span className="text-amber-500">{USBManager.getActiveProtocol()?.name || 'None'}</span>
                                  </div>
                                  <div className="text-[8px] text-stone-500 uppercase tracking-widest leading-relaxed">
                                    The AI agent will automatically route low-level commands through the active protocol handler. Manual command execution is disabled in this environment.
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="space-y-6">
                            <h3 className="text-[10px] font-black text-stone-600 uppercase tracking-[0.4em] flex items-center gap-6">Terminal Output<div className="flex-1 h-px bg-white/5" /></h3>
                            <Terminal lines={terminalLines} />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="lg:col-span-4 space-y-10">
                    <div className="space-y-6">
                      <h3 className="text-[10px] font-black text-stone-600 uppercase tracking-[0.4em] flex items-center gap-6">Diagnostics<div className="flex-1 h-px bg-white/5" /></h3>
                      <Terminal lines={terminalLines} />
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {view === 'app' && step === 'selection' && (
              <motion.div key="selection" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-12">
                <div className="space-y-2">
                  <h1 className="text-3xl sm:text-5xl font-black tracking-tighter uppercase">Platform</h1>
                  <p className="text-stone-500 text-lg font-medium">Select a specialized module to begin.</p>
                </div>
                
                <ModuleSwitcher activeModule={activeModule} setActiveModule={setActiveModule} />

                <div className="mt-8">
                  {activeModule === 'feature-phones' && (
                    <FeaturePhoneModule 
                      user={user} 
                      authFetch={authFetch} 
                      usbDevice={usbDevice}
                      usbMode={usbMode}
                      addTerminalLine={addTerminalLine}
                      terminalLines={terminalLines}
                      setIsComplete={setIsComplete}
                      uploadLogs={uploadLogs}
                      selectedModel={selectedModel}
                      step={step}
                      setStep={setStep}
                      selectedService={selectedService}
                      setSelectedService={setSelectedService}
                      setSelectedModel={setSelectedModel}
                    />
                  )}
                  {activeModule === 'iphone' && (
                    <IPhoneModule 
                      user={user!} 
                      authFetch={authFetch} 
                      usbDevice={usbDevice}
                      usbMode={usbMode}
                      addTerminalLine={addTerminalLine}
                      terminalLines={terminalLines}
                      setIsComplete={setIsComplete}
                      uploadLogs={uploadLogs}
                      selectedModel={selectedModel}
                      step={step}
                      setStep={setStep}
                      selectedService={selectedService}
                      setSelectedService={setSelectedService}
                      setSelectedModel={setSelectedModel}
                    />
                  )}
                  {activeModule === 'android' && (
                    <AndroidModule 
                      user={user!} 
                      authFetch={authFetch} 
                      usbDevice={usbDevice}
                      usbMode={usbMode}
                      addTerminalLine={addTerminalLine}
                      terminalLines={terminalLines}
                      setIsComplete={setIsComplete}
                      uploadLogs={uploadLogs}
                      selectedModel={selectedModel}
                      step={step}
                      setStep={setStep}
                      selectedService={selectedService}
                      setSelectedService={setSelectedService}
                      setSelectedModel={setSelectedModel}
                    />
                  )}
                  {activeModule === 'huawei' && (
                    <HuaweiModule 
                      user={user!} 
                      authFetch={authFetch} 
                      usbDevice={usbDevice}
                      usbMode={usbMode}
                      addTerminalLine={addTerminalLine}
                      terminalLines={terminalLines}
                      setIsComplete={setIsComplete}
                      uploadLogs={uploadLogs}
                      selectedModel={selectedModel}
                      step={step}
                      setStep={setStep}
                      selectedService={selectedService}
                      setSelectedService={setSelectedService}
                      setSelectedModel={setSelectedModel}
                    />
                  )}

                </div>
              </motion.div>
            )}

            {step === 'payment' && selectedModel && (
              <motion.div key="payment" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.02 }} className="max-w-5xl mx-auto space-y-8 lg:space-y-12">
                <button onClick={() => setStep('selection')} className="text-stone-500 hover:text-white flex items-center gap-3 text-[10px] lg:text-xs font-black uppercase tracking-[0.3em] transition-all">← Back</button>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16">
                  <div className="space-y-6 lg:space-y-10">
                    <h2 className="text-4xl lg:text-6xl font-black tracking-tighter uppercase leading-none">Authorization</h2>
                    <div className="glass rounded-[2rem] lg:rounded-[3rem] p-8 lg:p-10 space-y-6 lg:space-y-8 border-white/[0.02]">
                      <div className="flex justify-between items-center"><span className="text-stone-500 font-bold uppercase tracking-widest text-[10px] lg:text-xs">Device</span><span className="text-white font-black text-lg lg:text-xl uppercase tracking-tighter">{selectedModel.model}</span></div>
                      <div className="flex justify-between items-center"><span className="text-stone-500 font-bold uppercase tracking-widest text-[10px] lg:text-xs">Chipset</span><span className="text-amber-500 font-black text-lg lg:text-xl uppercase tracking-tighter">{selectedModel.chipset}</span></div>
                      <div className="flex justify-between items-center"><span className="text-stone-500 font-bold uppercase tracking-widest text-[10px] lg:text-xs">Service</span><span className="text-amber-600 font-black text-lg lg:text-xl uppercase tracking-tighter">{selectedService} Unlock</span></div>
                      <div className="h-px bg-white/5" />
                      <div className="flex justify-between items-center text-2xl lg:text-3xl"><span className="text-white font-black uppercase tracking-tighter">Required Tokens</span><span className="text-amber-600 font-black">{(selectedModel.prices as any)[selectedService as ServiceType]}</span></div>
                    </div>
                  </div>
                  <div className="glass-card rounded-[2.5rem] lg:rounded-[3.5rem] p-8 lg:p-12 space-y-10">
                    <div className="space-y-6">
                      <h3 className="text-2xl font-black uppercase tracking-tighter">Hardware Bridge</h3>
                      <p className="text-stone-500 font-medium">Connect your device via USB to begin the low-level handshake.</p>
                      <button onClick={handleConnectClick} className={cn("w-full py-6 rounded-2xl font-black text-lg transition-all flex items-center justify-center gap-4 uppercase tracking-widest", usbDevice ? "bg-stone-800 text-amber-500 border border-amber-600/30" : "bg-white text-stone-950 hover:bg-amber-600 hover:text-white")}>
                        {usbDevice ? <><Usb size={24} /> Device Connected</> : <><Smartphone size={24} /> Connect Device</>}
                      </button>
                    </div>

                    {geminiPayload && geminiPayload.isEasyBypass && (
                      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-3xl p-8 border-amber-600/30 bg-amber-600/10 space-y-6">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-amber-600 flex items-center justify-center text-stone-950">
                              <Zap size={24} />
                            </div>
                            <div>
                              <h3 className="text-xl font-black uppercase tracking-tighter text-white">
                                {selectedModel.category === 'feature-phones' ? 'Button Phone Reset' : 'Manual Bypass Available'}
                              </h3>
                              <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest">
                                {selectedModel.category === 'feature-phones' ? 'Standard factory reset procedure identified' : 'Gemini identified a high-reliability manual procedure'}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-[8px] text-stone-500 font-black uppercase tracking-widest mb-1">Reliability</div>
                            <div className="text-lg font-black text-amber-500">{geminiPayload.reliabilityScore}%</div>
                          </div>
                        </div>

                        {!isBypassPurchased ? (
                          <div className="space-y-6">
                            <div className="p-6 bg-stone-950/40 rounded-2xl border border-white/5 space-y-4">
                              <p className="text-xs font-medium text-stone-300 leading-relaxed">
                                {geminiPayload.description}
                              </p>
                              <div className="flex items-center gap-2 text-[10px] font-black text-amber-500/60 uppercase tracking-widest">
                                <AlertCircle size={14} />
                                {selectedModel.category === 'feature-phones' ? 'Reset steps hidden until authorized' : 'Steps are hidden until authorized'}
                              </div>
                            </div>
                            <button 
                              onClick={purchaseBypass} 
                              className="w-full py-6 bg-amber-600 text-stone-950 rounded-2xl font-black text-lg hover:bg-amber-500 transition-all shadow-2xl uppercase tracking-widest flex items-center justify-center gap-4"
                            >
                              <Lock size={20} /> {selectedModel.category === 'feature-phones' ? `Purchase Unlock Guide (${formatCurrency(1.3)})` : `Purchase Guided Bypass (${formatCurrency(5)})`}
                            </button>
                          </div>
                        ) : (
                          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                            <div className="space-y-4">
                              {geminiPayload.manualSteps?.map((step: string, i: number) => (
                                <div key={i} className="flex gap-4 items-start p-4 bg-stone-950/40 rounded-xl border border-white/5">
                                  <div className="w-6 h-6 rounded-full bg-amber-600/20 flex items-center justify-center text-amber-500 font-black text-[10px] shrink-0">{i + 1}</div>
                                  <p className="text-xs font-medium text-stone-200 leading-relaxed">{step}</p>
                                </div>
                              ))}
                            </div>
                            <div className="p-4 bg-green-600/10 border border-green-600/20 rounded-xl flex items-center gap-3">
                              <CheckCircle2 className="text-green-500" size={18} />
                              <span className="text-[10px] font-black text-green-500 uppercase tracking-widest">Authorization Active - Steps Unlocked</span>
                            </div>
                          </motion.div>
                        )}
                        
                        <div className="h-px bg-white/5" />
                        <p className="text-[10px] text-stone-500 font-medium italic">Note: Guided bypasses are premium services. All methods are verified by community consensus.</p>
                      </motion.div>
                    )}

                    {geminiPayload && !geminiPayload.isEasyBypass && (
                      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-3xl p-6 border-amber-600/20 bg-amber-600/5 space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Cpu className="text-amber-500" size={20} />
                            <span className="text-[10px] font-black uppercase tracking-widest text-amber-500">Gemini Identification</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="text-[8px] text-stone-500 font-black uppercase tracking-widest">Reliability</div>
                            <div className="text-xs font-black text-amber-500">{geminiPayload.reliabilityScore}%</div>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <div className="text-[8px] text-stone-500 font-black uppercase tracking-widest">Chipset</div>
                            <div className="text-xs font-black text-white">{geminiPayload.chipset}</div>
                          </div>
                          <div>
                            <div className="text-[8px] text-stone-500 font-black uppercase tracking-widest">Risk</div>
                            <div className="text-xs font-black text-amber-500 uppercase">{geminiPayload.risk}</div>
                          </div>
                        </div>
                        <p className="text-[10px] text-stone-400 font-medium leading-relaxed">{geminiPayload.description}</p>
                      </motion.div>
                    )}

                    {!geminiPayload && usbDevice && (
                      <div className="text-center space-y-4">
                        <p className="text-stone-500 text-xs font-medium">No automated payload found for this chipset.</p>
                        <button onClick={startLiveSession} className="w-full py-4 bg-white/5 border border-white/10 rounded-2xl text-white font-black text-xs uppercase tracking-widest hover:bg-white/10 transition-all flex items-center justify-center gap-3">
                          <Activity size={16} className="text-amber-500" /> Start Live Session with Technician
                        </button>
                      </div>
                    )}

                    {usbDevice && !geminiPayload?.isEasyBypass && (
                      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                        <button 
                          onClick={startUnlock} 
                          className="w-full py-6 bg-amber-600 text-stone-950 rounded-2xl font-black text-lg hover:bg-amber-500 transition-all shadow-2xl uppercase tracking-widest flex items-center justify-center gap-4 relative"
                        >
                          {geminiPayload && (
                            <span className="absolute -top-3 -right-3 bg-white text-stone-950 text-[8px] font-black px-3 py-1.5 rounded-full shadow-[0_0_20px_rgba(255,255,255,0.3)] border border-amber-600/20">
                              {geminiPayload.reliabilityScore}% RELIABLE
                            </span>
                          )}
                          <Zap size={24} /> Start Automated Unlock
                        </button>
                        <p className="text-[10px] text-stone-500 text-center font-black uppercase tracking-widest">
                          Authorization will deduct {(selectedModel.prices as any)[selectedService as ServiceType]} tokens
                        </p>
                      </motion.div>
                    )}

                    {isLiveSession && (
                      <div className="flex items-center gap-3 px-4 py-3 glass-amber rounded-xl text-amber-500 text-[10px] font-black uppercase tracking-widest animate-pulse">
                        <Globe size={14} /> Live Session Interlinked
                      </div>
                    )}

                    <button disabled={!usbDevice || (!geminiPayload && !isLiveSession)} onClick={() => setStep('tutorial')} className="w-full py-8 bg-amber-600 text-stone-950 rounded-2xl lg:rounded-[2rem] font-black text-xl lg:text-2xl hover:bg-amber-500 transition-all shadow-2xl uppercase tracking-widest disabled:opacity-30">Authorize Unlock</button>
                  </div>
                </div>
              </motion.div>
            )}

            {step === 'tutorial' && selectedModel && (
              <motion.div key="tutorial" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-20">
                <div className="lg:col-span-5 space-y-8 lg:space-y-12">
                  <div className="space-y-6 lg:space-y-8">
                    <div className="inline-flex items-center gap-3 px-4 py-1.5 glass-amber rounded-full text-amber-500 text-[9px] lg:text-[10px] font-black uppercase tracking-[0.3em]">Step {tutorialStep + 1}</div>
                    <h2 className="text-4xl lg:text-6xl font-black tracking-tighter leading-[0.9] uppercase">{tutorialSteps[tutorialStep].title}</h2>
                    <p className="text-stone-500 text-lg lg:text-xl leading-relaxed font-medium">{tutorialSteps[tutorialStep].description}</p>
                  </div>
                  <div className="space-y-4 lg:space-y-5">
                    {tutorialSteps.map((s, i) => (
                      <div key={s.id} className={cn("flex items-center gap-4 lg:gap-6 p-4 lg:p-6 rounded-2xl lg:rounded-[2.5rem] border transition-all duration-700", i === tutorialStep ? "glass-amber border-amber-600/20 scale-[1.02] lg:scale-[1.05]" : "bg-transparent border-transparent opacity-20")}>
                        <div className={cn("w-10 h-10 lg:w-12 lg:h-12 rounded-xl lg:rounded-2xl flex items-center justify-center text-base lg:text-lg font-black", i === tutorialStep ? "bg-amber-600 text-stone-950 shadow-[0_0_30px_rgba(217,119,6,0.4)]" : "bg-stone-800 text-stone-600")}>{i + 1}</div>
                        <span className={cn("font-black text-[10px] lg:text-sm uppercase tracking-[0.2em]", i === tutorialStep ? "text-white" : "text-stone-600")}>{s.title}</span>
                        {i < tutorialStep && <CheckCircle2 className="ml-auto text-amber-500 w-5 h-5 lg:w-6 lg:h-6" />}
                      </div>
                    ))}
                  </div>
                  <button onClick={() => tutorialStep < tutorialSteps.length - 1 ? setTutorialStep(tutorialStep + 1) : startUnlock()} className="w-full py-6 lg:py-8 bg-white text-stone-950 rounded-2xl lg:rounded-[2.5rem] font-black text-xl lg:text-2xl hover:bg-amber-600 hover:text-white transition-all flex items-center justify-center gap-4 shadow-2xl uppercase tracking-widest">{tutorialStep === tutorialSteps.length - 1 ? "Start Unlock" : "Continue"} <ChevronRight className="w-6 h-6 lg:w-7 lg:h-7" /></button>
                </div>
                <div className="lg:col-span-7 space-y-8 lg:space-y-12">
                  <div className="glass rounded-[3rem] lg:rounded-[5rem] p-10 lg:p-20 flex items-center justify-center min-h-[400px] lg:min-h-[700px] relative overflow-hidden border-white/[0.02]">
                    <PhoneAnimation type={tutorialSteps[tutorialStep].animationType} />
                  </div>
                  <Terminal lines={terminalLines} />
                </div>
              </motion.div>
            )}

            {step === 'unlocking' && (
              <motion.div key="unlocking" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="max-w-7xl mx-auto space-y-12 lg:space-y-20 py-8 lg:py-16">
                {activeModule === 'feature-phones' ? (
                  <FeaturePhoneModule 
                    user={user} 
                    authFetch={authFetch} 
                    usbDevice={usbDevice}
                    usbMode={usbMode}
                    addTerminalLine={addTerminalLine}
                    terminalLines={terminalLines}
                    setIsComplete={setIsComplete}
                    uploadLogs={uploadLogs}
                    selectedModel={selectedModel}
                    step={step}
                    setStep={setStep}
                    selectedService={selectedService}
                    setSelectedService={setSelectedService}
                    setSelectedModel={setSelectedModel}
                  />
                ) : !isComplete ? (
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-20 items-start">
                    <div className="lg:col-span-5 space-y-12">
                      <div className="space-y-6">
                        <div className="inline-flex items-center gap-3 px-4 py-1.5 glass-amber rounded-full text-amber-500 text-[10px] font-black uppercase tracking-[0.3em]">
                          <Activity size={14} className="animate-pulse" /> Live Operation
                        </div>
                        <h2 className="text-5xl lg:text-7xl font-black tracking-tighter uppercase leading-none">Unlocking...</h2>
                        <p className="text-stone-500 text-lg lg:text-xl font-medium">Injecting security bypass into {selectedModel?.model}</p>
                      </div>

                      <div className="space-y-8">
                        <div className="space-y-4">
                          <div className="flex justify-between items-end">
                            <span className="text-[10px] font-black text-amber-500 uppercase tracking-[0.4em]">System Progress</span>
                            <span className="text-3xl font-black text-white">{unlockProgress}%</span>
                          </div>
                          <div className="h-4 bg-white/5 rounded-full overflow-hidden border border-white/5 p-1">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${unlockProgress}%` }}
                              className="h-full bg-gradient-to-r from-amber-900 via-amber-600 to-amber-400 rounded-full shadow-[0_0_20px_rgba(217,119,6,0.5)]"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 gap-4">
                          {[
                            { label: "Memory Dump", threshold: 30 },
                            { label: "Exploit Injection", threshold: 60 },
                            { label: "Finalizing", threshold: 90 }
                          ].map((phase, i) => (
                            <div key={i} className={cn("flex items-center justify-between p-5 rounded-2xl border transition-all duration-500", unlockProgress >= phase.threshold ? "glass-amber border-amber-600/20" : "bg-white/[0.02] border-white/5 opacity-40")}>
                              <div className="flex items-center gap-4">
                                <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", unlockProgress >= phase.threshold ? "bg-amber-600 text-stone-950" : "bg-stone-800 text-stone-600")}>
                                  {unlockProgress >= phase.threshold ? <Check size={16} /> : <div className="w-1.5 h-1.5 rounded-full bg-current" />}
                                </div>
                                <span className="text-[10px] font-black uppercase tracking-widest">{phase.label}</span>
                              </div>
                              {unlockProgress >= phase.threshold && <span className="text-[10px] font-mono text-amber-500">COMPLETED</span>}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="lg:col-span-7 space-y-12">
                      <div className="glass rounded-[3rem] lg:rounded-[5rem] p-10 lg:p-20 flex items-center justify-center min-h-[400px] lg:min-h-[600px] relative overflow-hidden border-white/[0.02]">
                        <div className="absolute inset-0 bg-amber-600/5 blur-[120px] rounded-full" />
                        <PhoneAnimation 
                          type={
                            unlockProgress < 25 ? 'plug' : 
                            unlockProgress < 50 ? 'button' : 
                            unlockProgress < 100 ? 'wait' : 'success'
                          } 
                        />
                      </div>
                      <Terminal lines={terminalLines} />
                    </div>
                  </div>
                ) : (
                  <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center space-y-20">
                    <div className="relative inline-block">
                      <motion.div animate={{ scale: [1, 1.3, 1], opacity: [0.1, 0.3, 0.1] }} transition={{ repeat: Infinity, duration: 4 }} className="absolute inset-0 bg-amber-600 blur-[120px] rounded-full" />
                      <div className="relative w-48 h-48 lg:w-56 lg:h-56 glass-amber rounded-[3rem] lg:rounded-[4rem] border-2 border-amber-600/30 flex items-center justify-center shadow-[0_0_100px_rgba(0,0,0,0.5)]"><Unlock className="w-24 h-24 lg:w-28 lg:h-28 text-amber-500" /></div>
                    </div>
                    <div className="space-y-8">
                      <h2 className="text-6xl lg:text-8xl font-black tracking-tighter uppercase leading-none">Success.</h2>
                      <p className="text-stone-500 text-xl lg:text-2xl max-w-xl mx-auto leading-relaxed font-medium">The security module for your {selectedModel?.model} has been permanently patched. The gold standard in unlocking.</p>
                    </div>
                    <div className="flex gap-8 max-w-2xl mx-auto">
                      <button onClick={() => { setStep('selection'); setView('landing'); setIsComplete(false); }} className="flex-1 py-6 lg:py-8 bg-white text-stone-950 rounded-2xl lg:rounded-[2.5rem] font-black text-xl lg:text-2xl hover:bg-amber-600 hover:text-white transition-all shadow-2xl uppercase tracking-widest">Return Home</button>
                    </div>
                  </motion.div>
                )}
              </motion.div>
            )}
            {view === 'feedback' && (
              <motion.div key="feedback" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.05 }} className="max-w-2xl mx-auto py-20">
                <GlassCard className="p-12 text-center space-y-10 liquid-glass">
                  <div className="w-24 h-24 bg-green-500/10 rounded-full flex items-center justify-center mx-auto">
                    <CheckCircle2 className="text-green-500" size={48} />
                  </div>
                  <div className="space-y-4">
                    <h1 className="text-5xl font-black tracking-tighter uppercase">Operation Successful</h1>
                    <p className="text-stone-500 text-lg font-medium">Your device has been successfully processed. How was your experience with UnlockPro Online?</p>
                  </div>
                  
                  <div className="flex justify-center gap-4">
                    {[1, 2, 3, 4, 5].map(star => (
                      <button key={star} className="p-4 hover:scale-110 transition-transform text-amber-500">
                        <Zap size={32} fill={star <= 4 ? "currentColor" : "none"} />
                      </button>
                    ))}
                  </div>

                  <div className="space-y-4">
                    <textarea 
                      placeholder="Share your feedback with our engineering team..."
                      className="w-full h-32 bg-white/5 border border-white/5 rounded-2xl p-6 text-sm outline-none focus:border-amber-600/30 transition-all resize-none"
                    />
                    <button 
                      onClick={() => { setView('app'); setStep('selection'); setIsComplete(false); }}
                      className="w-full py-6 bg-white text-stone-950 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-amber-600 hover:text-white transition-all shadow-2xl"
                    >
                      Submit & Return to Dashboard
                    </button>
                  </div>
                </GlassCard>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Module Instructions Overlay */}
        <AnimatePresence>
          {showModuleInstructions && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
            >
              <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                className="glass-card rounded-[2rem] p-10 max-w-2xl w-full text-center space-y-8 border-amber-500/30 bg-stone-950/90"
              >
                <div className="w-20 h-20 bg-amber-500/20 rounded-full flex items-center justify-center mx-auto">
                  <Usb className="w-10 h-10 text-amber-500" />
                </div>
                <div className="space-y-4">
                  <h2 className="text-3xl font-black uppercase tracking-tighter text-white">Action Required</h2>
                  <p className="text-xl text-amber-500 font-bold leading-relaxed">
                    {moduleInstructionsText}
                  </p>
                  <p className="text-stone-400 text-sm font-medium">
                    Please perform this action now. The connection phase will open automatically in 3 seconds.
                  </p>
                </div>
                <div className="w-full bg-stone-900 rounded-full h-2 overflow-hidden">
                  <motion.div
                    initial={{ width: "0%" }}
                    animate={{ width: "100%" }}
                    transition={{ duration: 3, ease: "linear" }}
                    className="h-full bg-amber-500"
                  />
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
        
        <TopUpModal 
          isOpen={isTopUpModalOpen} 
          onClose={() => setIsTopUpModalOpen(false)} 
          onTopUp={handleTopUp} 
        />
      </main>
    </div>
  );
}
