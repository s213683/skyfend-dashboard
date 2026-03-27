// ── Skyfend C2 Platform · Openclaw Decision Engine ──
// Devices: Spotter Pro (STF200) · Tracer Air II (STA200) · HunterMax (SHH300)
// Rules: Openclaw 自动值守 AI 决策规则集 V1.0

export type DeviceStatus = 'ONLINE' | 'STANDBY' | 'ENGAGING' | 'RETURNING' | 'FAULT';

export interface Device {
  id: string;
  name: string;
  model: string;
  role: string;
  icon: string;
  status: DeviceStatus;
  metric: string;
  metricValue: string;
  detail: string;
}

export const INITIAL_DEVICES: Device[] = [
  {
    id: 'STF200-001', name: 'Spotter Pro', model: 'STF200 · 多传感器侦测站',
    role: 'sensor', icon: '📡', status: 'ONLINE',
    metric: '侦测范围', metricValue: '≥ 3km',
    detail: 'RF + 雷达 + EO/IR 三模态 · 全域扫描中',
  },
  {
    id: 'STA200-001', name: 'Tracer Air II', model: 'STA200 · 机载电侦无人机',
    role: 'uav', icon: '🚁', status: 'STANDBY',
    metric: '电量', metricValue: '87%',
    detail: '电侦有效距离 500m · 续航 40min · 待命',
  },
  {
    id: 'SHH300-001', name: 'HunterMax', model: 'SHH300 · 全向干扰系统',
    role: 'jammer', icon: '⚡', status: 'STANDBY',
    metric: '频段覆盖', metricValue: '0.3~7.7GHz',
    detail: '精准 / 宽带双模 · ≥200W · 等待频率参数',
  },
];

export interface ChatMessage {
  id: string;
  role: 'ai' | 'user' | 'system';
  content: string;
  contentType: 'normal' | 'alert' | 'coa' | 'task' | 'atom' | 'success' | 'warning' | 'safety';
  timestamp: string;
}

// ── TASK 仿真状态机 ──
export type TaskSimState =
  | 'pending'       // 等待前置完成
  | 'constraint_check' // 约束检查中
  | 'executing'     // 执行中
  | 'waiting'       // 等待条件满足（如等待上行频率回传）
  | 'done'          // 完成
  | 'degraded'      // 降级执行
  | 'failed';       // 失败

export interface TaskConstraint {
  id: string;
  label: string;
  check: string;       // 检查条件描述
  passed: boolean | null; // null=未检查, true=通过, false=失败
}

export interface TaskSim {
  id: number;
  taskId: string;      // TASK-1 ~ TASK-7
  title: string;
  device: string;      // 执行设备
  deviceId: string;
  duration: number;    // 预计执行时长(ms，仿真加速)
  realDuration: string; // 真实时长描述
  state: TaskSimState;
  progress: number;    // 0~100
  startTime: string | null;
  endTime: string | null;
  constraints: TaskConstraint[];
  simLog: string[];    // 仿真过程日志
  degradeCondition?: string; // 超时降级条件
  successCondition: string;  // 完成条件
}

export const INITIAL_TASKS: TaskSim[] = [
  {
    id: 1, taskId: 'TASK-1', title: 'Tracer Air II 起飞',
    device: 'Tracer Air II', deviceId: 'STA200-001',
    duration: 3000, realDuration: '约 30s',
    state: 'pending', progress: 0, startTime: null, endTime: null,
    constraints: [
      { id: 'C1-1', label: 'Tracer Air 电量', check: '电量 ≥ 30%', passed: null },
      { id: 'C1-2', label: 'Tracer Air 状态', check: '状态 = STANDBY', passed: null },
      { id: 'C1-3', label: 'SAFETY-2 航路', check: '起飞航路偏离 HunterMax 扇区 > 30°', passed: null },
    ],
    simLog: [],
    degradeCondition: '超时 30s → 切换 COA-B（仅 HunterMax 宽带压制）',
    successCondition: 'Tracer Air 高度 ≥ 150m，航向锁定 045°',
  },
  {
    id: 2, taskId: 'TASK-2', title: '跟随 Spotter Pro 引导坐标逼近目标',
    device: 'Tracer Air II', deviceId: 'STA200-001',
    duration: 4000, realDuration: '约 60s（飞行 2.3km）',
    state: 'pending', progress: 0, startTime: null, endTime: null,
    constraints: [
      { id: 'C2-1', label: 'Spotter Pro 引导', check: 'STF200 持续推送目标坐标', passed: null },
      { id: 'C2-2', label: '目标距离', check: '距目标 ≤ 500m（ELINT 有效距离）', passed: null },
      { id: 'C2-3', label: 'SAFETY-2 航路', check: '飞行路径在 HunterMax 安全走廊内', passed: null },
    ],
    simLog: [],
    successCondition: '距目标 ≤ 500m，进入 ELINT 有效距离',
  },
  {
    id: 3, taskId: 'TASK-3', title: '上行链路侦测（ELINT）',
    device: 'Tracer Air II', deviceId: 'STA200-001',
    duration: 3500, realDuration: '约 30s（扫描 0.4~6GHz）',
    state: 'pending', progress: 0, startTime: null, endTime: null,
    constraints: [
      { id: 'C3-1', label: '距目标距离', check: '距目标 ≤ 500m', passed: null },
      { id: 'C3-2', label: 'ELINT 模块', check: 'ELINT 模块已就绪', passed: null },
      { id: 'C3-3', label: '扫描频段', check: '0.4~6GHz 全频段扫描', passed: null },
    ],
    simLog: [],
    degradeCondition: '超时 60s 未获上行频率 → TASK-3B（继续逼近至 200m）',
    successCondition: '上行频率回传：868MHz ELRS，rf_uplink.freq_mhz 非空',
  },
  {
    id: 4, taskId: 'TASK-4', title: 'HunterMax 加载频率参数',
    device: 'HunterMax', deviceId: 'SHH300-001',
    duration: 1500, realDuration: '约 5s（参数加载）',
    state: 'pending', progress: 0, startTime: null, endTime: null,
    constraints: [
      { id: 'C4-1', label: '上行频率', check: 'rf_uplink.freq_mhz 已回传（非空）', passed: null },
      { id: 'C4-2', label: 'HunterMax 状态', check: '状态 = STANDBY', passed: null },
      { id: 'C4-3', label: '频段覆盖', check: '868MHz 在 SHH300 覆盖范围 0.3~7.7GHz 内', passed: null },
    ],
    simLog: [],
    successCondition: 'HunterMax 频率参数加载完成，mode=TRACK 就绪',
  },
  {
    id: 5, taskId: 'TASK-5', title: 'HunterMax 精准跟踪干扰',
    device: 'HunterMax', deviceId: 'SHH300-001',
    duration: 4500, realDuration: '约 30s（预期触发 Failsafe）',
    state: 'pending', progress: 0, startTime: null, endTime: null,
    constraints: [
      { id: 'C5-1', label: '频率参数', check: '频率参数已加载（TASK-4 完成）', passed: null },
      { id: 'C5-2', label: 'SAFETY-1 友方', check: '目标不在友方白名单', passed: null },
      { id: 'C5-3', label: 'ROE 授权', check: 'ROE-2025-G20-042 有效', passed: null },
    ],
    simLog: [],
    degradeCondition: '超时 60s 目标未失控 → JAM_WIDEBAND（宽带压制）',
    successCondition: '目标 Failsafe 触发，rf_downlink < -95dBm 持续 ≥ 10s',
  },
  {
    id: 6, taskId: 'TASK-6', title: 'Spotter Pro 三模态闭环验证',
    device: 'Spotter Pro', deviceId: 'STF200-001',
    duration: 3000, realDuration: '约 15s（三模态确认）',
    state: 'pending', progress: 0, startTime: null, endTime: null,
    constraints: [
      { id: 'C6-1', label: 'RF 信号消失', check: 'rf_downlink < -95dBm 持续 ≥ 10s', passed: null },
      { id: 'C6-2', label: '雷达轨迹终止', check: 'radar_track 速度 < 2km/h 持续 ≥ 10s', passed: null },
      { id: 'C6-3', label: 'EO/IR 确认', check: 'eo_confirmed = "confirmed"（目标坠落）', passed: null },
    ],
    simLog: [],
    degradeCondition: '120s 内三模态未全满足 → COA-D（人工介入）',
    successCondition: '三模态全部满足 → 威胁解除，TARGET-001 NEUTRALIZED',
  },
  {
    id: 7, taskId: 'TASK-7', title: '系统复位',
    device: '全系统', deviceId: 'ALL',
    duration: 2000, realDuration: '约 10s',
    state: 'pending', progress: 0, startTime: null, endTime: null,
    constraints: [
      { id: 'C7-1', label: '威胁解除确认', check: 'TASK-6 闭环验证通过', passed: null },
    ],
    simLog: [],
    successCondition: 'JAM_STOP → Tracer Air RTH → Spotter Pro 恢复全域扫描 → 值守中',
  },
];

// ── 决策时间轴（4步，无适应分）──
export interface TimelineStep {
  id: number;
  title: string;
  desc: string;
  state: 'pending' | 'active' | 'done';
  time: string;
  rule: string;
}

export const INITIAL_TIMELINE: TimelineStep[] = [
  { id: 1, title: '威胁感知 · R-01/R-02', desc: 'Spotter Pro 自动推送，多传感器融合，创建 DroneThreat 对象', state: 'pending', time: '—', rule: 'R-01' },
  { id: 2, title: 'COA 匹配 · R-03', desc: '依据威胁等级和设备状态，从 COA 库匹配最优行动方案', state: 'pending', time: '—', rule: 'R-03' },
  { id: 3, title: 'TASK 生成 · R-04', desc: 'COA 分解为有序任务列表，分配至各 Asset，检查安全约束', state: 'pending', time: '—', rule: 'R-04' },
  { id: 4, title: '武器原子执行 · R-05', desc: '逐步仿真执行 TASK-1~7，闭环验证威胁解除，系统复位', state: 'pending', time: '—', rule: 'R-05' },
];

// ── Swarm Types ──
export type SwarmTargetStatus = 'detected' | 'coa_matching' | 'coa_assigned' | 'executing' | 'neutralized' | 'escaped';

export interface SwarmTarget {
  id: string;
  type: string;
  protocol: string;
  freq: string;
  coords: string;
  speed: string;
  bearing: string;
  threatLevel: number;
  threatScore: number;
  coa: string;
  coaDesc: string;
  assignedDevice: string;
  status: SwarmTargetStatus;
  atoms: string[];
  neutralizedAt?: string;
}

export const SWARM_TARGETS: SwarmTarget[] = [
  {
    id: 'TARGET-S01', type: 'FPV 竞速机', protocol: 'ELRS', freq: '868MHz',
    coords: '(2340,1820,145)', speed: '95km/h', bearing: 'NE·045°',
    threatLevel: 4, threatScore: 87,
    coa: 'COA-A', coaDesc: 'Tracer Air II 引导 + HunterMax 精准干扰',
    assignedDevice: 'STA200 + SHH300', status: 'detected',
    atoms: ['TAKEOFF heading=045°', 'ELINT_START', 'JAM_START freq=868MHz'],
  },
  {
    id: 'TARGET-S02', type: '固定翼侦察', protocol: 'DJI OcuSync', freq: '2.4GHz',
    coords: '(3100,2200,280)', speed: '72km/h', bearing: 'NW·315°',
    threatLevel: 3, threatScore: 71,
    coa: 'COA-B', coaDesc: 'HunterMax 宽带压制（Tracer Air 已占用）',
    assignedDevice: 'SHH300', status: 'detected',
    atoms: ['JAM_WIDEBAND freq=2.4GHz', 'VERIFY_KILL'],
  },
  {
    id: 'TARGET-S03', type: '多旋翼载荷', protocol: 'Lightbridge', freq: '5.8GHz',
    coords: '(1800,3400,95)', speed: '48km/h', bearing: 'SE·135°',
    threatLevel: 5, threatScore: 96,
    coa: 'COA-B', coaDesc: 'HunterMax 宽带压制（威胁等级5，时间紧迫）',
    assignedDevice: 'SHH300', status: 'detected',
    atoms: ['JAM_START freq=5.8GHz', 'JAM_WIDEBAND', 'VERIFY_KILL'],
  },
  {
    id: 'TARGET-S04', type: 'FPV 竞速机', protocol: 'ELRS', freq: '915MHz',
    coords: '(4200,1100,120)', speed: '110km/h', bearing: 'E·090°',
    threatLevel: 4, threatScore: 83,
    coa: 'COA-B', coaDesc: 'HunterMax 区域压制（Tracer Air 已占用）',
    assignedDevice: 'SHH300', status: 'detected',
    atoms: ['LOAD_FREQ freq=915MHz', 'JAM_START mode=AreaDenial', 'VERIFY_KILL'],
  },
  {
    id: 'TARGET-S05', type: '微型四旋翼', protocol: 'WiFi 802.11', freq: '2.4GHz',
    coords: '(1200,4100,60)', speed: '35km/h', bearing: 'SW·225°',
    threatLevel: 2, threatScore: 42,
    coa: 'COA-C', coaDesc: '持续监视不干预（威胁等级低，疑似民用）',
    assignedDevice: 'STF200', status: 'detected',
    atoms: ['TRACK target_id=TARGET-S05', 'MONITOR mode=PASSIVE'],
  },
];

export function getUtcTime(): string {
  const now = new Date();
  return `${String(now.getUTCHours()).padStart(2,'0')}:${String(now.getUTCMinutes()).padStart(2,'0')}:${String(now.getUTCSeconds()).padStart(2,'0')}Z`;
}

export function sleep(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}
