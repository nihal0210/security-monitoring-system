/**
 * Master Enterprise Module Registry & 24-Hour Temporal Baseline
 *
 * Defines the 9 functional modules of the monitored platform (such as WhatsApp/SaaS platforms):
 * - Authentication & Lock
 * - Direct Messaging
 * - Voice Recording
 * - File Accessing
 * - File Writing
 * - View Once Ephemeral Media
 * - Status Broadcasting
 * - High-Res Media Upload & Transcoding (Key focus: Nighttime lull 11 PM - 4 AM)
 * - End-to-End Cryptographic Key Sync
 */

export const ENTERPRISE_MODULES = [
  {
    id: 'MOD-01',
    code: 'AUTH_LOCK',
    name: 'Authentication & Biometric Lock',
    category: 'Security & Identity',
    description: 'User authentication, 2FA validation, app lock PIN/biometrics, and session token renewal.',
    typicalShare: 14.2,
    baseHourly: [18, 12, 8, 5, 4, 15, 42, 85, 110, 125, 95, 88, 92, 84, 90, 88, 94, 108, 115, 98, 75, 52, 38, 24],
    peakWindow: '09:00 - 11:00 & 18:00 - 20:00',
    maintenanceWindow: {
      startHour: 2,
      endHour: 5,
      label: '02:00 AM - 05:00 AM',
      impactRisk: 'LOW',
      avgTrafficShare: 1.1,
      recommendation: 'Viable during deep night; requires standby session token caching.'
    }
  },
  {
    id: 'MOD-02',
    code: 'DIRECT_CHAT',
    name: 'Direct Message & Instant Chat',
    category: 'Core Messaging',
    description: 'High-throughput real-time text exchange, typing indicators, read receipts, and push dispatch.',
    typicalShare: 29.5,
    baseHourly: [45, 25, 15, 10, 8, 20, 65, 140, 210, 260, 280, 295, 310, 290, 285, 305, 320, 350, 360, 340, 290, 210, 150, 85],
    peakWindow: '12:00 - 14:00 & 18:00 - 22:00',
    maintenanceWindow: {
      startHour: 3,
      endHour: 5,
      label: '03:00 AM - 05:00 AM',
      impactRisk: 'MEDIUM',
      avgTrafficShare: 2.8,
      recommendation: 'Core service; avoid full downtime. Use rolling canary zero-downtime deploy.'
    }
  },
  {
    id: 'MOD-03',
    code: 'VOICE_REC',
    name: 'Voice & Audio Recording',
    category: 'Media & Audio',
    description: 'PTT voice note recording, waveform rendering, Opus audio compression, and playback pipeline.',
    typicalShare: 9.8,
    baseHourly: [12, 6, 3, 2, 1, 4, 15, 35, 60, 75, 80, 85, 95, 90, 85, 92, 105, 120, 130, 115, 95, 65, 40, 22],
    peakWindow: '17:00 - 21:00',
    maintenanceWindow: {
      startHour: 1,
      endHour: 5,
      label: '01:00 AM - 05:00 AM',
      impactRisk: 'LOW',
      avgTrafficShare: 0.9,
      recommendation: 'Safe for asynchronous audio codec upgrades between 1 AM and 5 AM.'
    }
  },
  {
    id: 'MOD-04',
    code: 'FILE_ACCESS',
    name: 'File Access & Secure Storage',
    category: 'Storage & Documents',
    description: 'Encrypted document vault access, PDF viewing, file cache verification, and download streaming.',
    typicalShare: 11.4,
    baseHourly: [8, 4, 2, 1, 1, 3, 18, 55, 95, 130, 145, 140, 125, 135, 148, 152, 140, 110, 75, 48, 32, 22, 15, 10],
    peakWindow: '10:00 - 17:00 (Business Hours)',
    maintenanceWindow: {
      startHour: 0,
      endHour: 5,
      label: '12:00 AM - 05:00 AM',
      impactRisk: 'MINIMAL',
      avgTrafficShare: 0.6,
      recommendation: 'Enterprise document store idle at night; safe for cold storage migration.'
    }
  },
  {
    id: 'MOD-05',
    code: 'FILE_WRITE',
    name: 'File Writing & Document Export',
    category: 'Data Processing',
    description: 'Exporting audit records, generating enterprise reports, writing ledger sheets, and document staging.',
    typicalShare: 7.2,
    baseHourly: [4, 2, 1, 0, 0, 2, 10, 32, 58, 72, 85, 82, 70, 78, 88, 92, 84, 60, 35, 20, 12, 8, 6, 4],
    peakWindow: '14:00 - 17:00',
    maintenanceWindow: {
      startHour: 23,
      endHour: 5,
      label: '11:00 PM - 05:00 AM',
      impactRisk: 'MINIMAL',
      avgTrafficShare: 0.4,
      recommendation: 'Extremely quiet outside business hours. Optimal window for database restructuring.'
    }
  },
  {
    id: 'MOD-06',
    code: 'VIEW_ONCE',
    name: 'View-Once & Ephemeral Media',
    category: 'Privacy Service',
    description: 'One-time ephemeral media decryption, self-destruct countdown timer, and screenshot suppression.',
    typicalShare: 8.6,
    baseHourly: [14, 8, 4, 2, 1, 2, 10, 22, 38, 50, 58, 65, 74, 70, 75, 82, 95, 110, 125, 120, 95, 68, 45, 25],
    peakWindow: '19:00 - 23:00',
    maintenanceWindow: {
      startHour: 2,
      endHour: 6,
      label: '02:00 AM - 06:00 AM',
      impactRisk: 'LOW',
      avgTrafficShare: 1.2,
      recommendation: 'Transient state machine; flush pending ephemerals prior to server restart.'
    }
  },
  {
    id: 'MOD-07',
    code: 'STATUS_BROADCAST',
    name: 'Status & Story Broadcast',
    category: 'Broadcast & Feed',
    description: '24-hour temporary media status broadcast, audience viewer tracking, and multi-peer media fan-out.',
    typicalShare: 12.1,
    baseHourly: [22, 12, 6, 3, 2, 8, 35, 75, 95, 105, 110, 115, 125, 120, 115, 130, 145, 160, 175, 165, 140, 98, 60, 35],
    peakWindow: '08:00 - 10:00 & 18:00 - 22:00',
    maintenanceWindow: {
      startHour: 1,
      endHour: 5,
      label: '01:00 AM - 05:00 AM',
      impactRisk: 'LOW',
      avgTrafficShare: 1.4,
      recommendation: 'CDN cache warming handles broadcast reads during quiet night window.'
    }
  },
  {
    id: 'MOD-08',
    code: 'MEDIA_UPLOAD',
    name: 'High-Res Media Upload & Transcoding',
    category: 'Heavy Background Pipeline',
    description: 'Multi-part video/image chunked upload, FFmpeg transcoding, 4K downscaling, and cloud bucket replication.',
    typicalShare: 4.1,
    // Note: Drops to near 0 between 23:00 (11 PM) and 04:00 (4 AM)
    baseHourly: [2, 1, 0, 0, 0, 1, 6, 18, 32, 45, 50, 52, 48, 54, 58, 62, 65, 68, 60, 42, 25, 8, 3, 1],
    peakWindow: '15:00 - 19:00',
    maintenanceWindow: {
      startHour: 23,
      endHour: 4,
      label: '11:00 PM - 04:00 AM (Optimal Target)',
      impactRisk: 'LOWEST POSSIBLE (< 0.2% Traffic)',
      avgTrafficShare: 0.18,
      recommendation: '⭐ PRIME DOWNTIME CANDIDATE: Virtually 0% active uploads between 11 PM and 4 AM. Ideal window for transcode queue restructuring, schema migration, and worker node repair with zero user disruption.'
    }
  },
  {
    id: 'MOD-09',
    code: 'KEY_SYNC',
    name: 'End-to-End Key Exchange & Sync',
    category: 'Cryptographic Security',
    description: 'Double Ratchet prekey bundle rotation, cryptographic handshake validation, and multi-device identity syncing.',
    typicalShare: 3.1,
    baseHourly: [5, 3, 2, 1, 1, 4, 12, 22, 28, 30, 32, 30, 28, 29, 31, 33, 35, 38, 36, 30, 22, 15, 10, 6],
    peakWindow: 'Distributed background synchronization',
    maintenanceWindow: {
      startHour: 2,
      endHour: 5,
      label: '02:00 AM - 05:00 AM',
      impactRisk: 'LOW',
      avgTrafficShare: 0.8,
      recommendation: 'Prekey bundle caching permits quiet window maintenance without breaking sessions.'
    }
  }
];

export const DEMO_USERS_MODULE_STATE = [
  {
    userId: 'U001',
    name: 'Rahul Sharma',
    dept: 'Engineering',
    role: 'Lead Architect',
    currentModuleId: 'MOD-05',
    currentAction: 'Writing system schema update (system_config.json)',
    sessionStartTime: '10:05 AM',
    lastActive: 'Just now',
    ip: '192.168.1.20',
    status: 'active',
    maintenanceConflict: false
  },
  {
    userId: 'U002',
    name: 'Amit Patel',
    dept: 'Finance',
    role: 'Financial Analyst',
    currentModuleId: 'MOD-04',
    currentAction: 'Accessing Q3 balance ledger (finance_q3.xlsx)',
    sessionStartTime: '09:42 AM',
    lastActive: '2m ago',
    ip: '192.168.1.34',
    status: 'active',
    maintenanceConflict: false
  },
  {
    userId: 'U003',
    name: 'Priya Singh',
    dept: 'Human Resources',
    role: 'HR Manager',
    currentModuleId: 'MOD-03',
    currentAction: 'Recording policy audio briefing (Voice note #104)',
    sessionStartTime: '10:14 AM',
    lastActive: '1m ago',
    ip: '192.168.1.58',
    status: 'active',
    maintenanceConflict: false
  },
  {
    userId: 'U004',
    name: 'Neha Gupta',
    dept: 'Sales',
    role: 'Account Executive',
    currentModuleId: 'MOD-06',
    currentAction: 'Viewing one-time proposal pricing media',
    sessionStartTime: '09:15 AM',
    lastActive: '5m ago',
    ip: '192.168.1.72',
    status: 'active',
    maintenanceConflict: false
  },
  {
    userId: 'U005',
    name: 'Rohan Verma',
    dept: 'Marketing',
    role: 'Growth Lead',
    currentModuleId: 'MOD-07',
    currentAction: 'Broadcasting campaign announcement story',
    sessionStartTime: '08:50 AM',
    lastActive: '4m ago',
    ip: '192.168.1.89',
    status: 'active',
    maintenanceConflict: false
  }
];

export const HOURS_LABELS = [
  '12 AM', '1 AM', '2 AM', '3 AM', '4 AM', '5 AM',
  '6 AM', '7 AM', '8 AM', '9 AM', '10 AM', '11 AM',
  '12 PM', '1 PM', '2 PM', '3 PM', '4 PM', '5 PM',
  '6 PM', '7 PM', '8 PM', '9 PM', '10 PM', '11 PM'
];
