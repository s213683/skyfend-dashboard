<script setup lang="ts">
/**
 * Skyfend C2 · Openclaw — Palantir AIP Style
 * 全屏对话布局，无右侧态势面板
 * Digital Agents: S1指挥官 · S2情报参谋 · S3作战参谋
 * Physical Agents: Spotter Pro · Tracer Air II · HunterMax
 */
import { ref, onMounted, onUnmounted, nextTick, watch } from 'vue';
import {
  INITIAL_DEVICES, INITIAL_TASKS,
  type Device, type TaskSim,
  getUtcTime, sleep
} from '../lib/c2-data';
import PhysicalAgentBar from '../components/PhysicalAgentBar.vue';

// ── Agent 配置 (Palantir 风格配色) ──
const AGENTS = {
  S1: { id: 'S1', name: 'S1 · 指挥官', short: 'S1', color: '#d29922', bg: 'rgba(210,153,34,0.06)', border: '#30363d', avatarBg: '#3d2e00', avatarBorder: '#d29922' },
  S2: { id: 'S2', name: 'S2 · 情报参谋', short: 'S2', color: '#58a6ff', bg: 'rgba(88,166,255,0.04)', border: '#30363d', avatarBg: '#0c2d6b', avatarBorder: '#58a6ff' },
  S3: { id: 'S3', name: 'S3 · 作战参谋', short: 'S3', color: '#3fb950', bg: 'rgba(63,185,80,0.04)', border: '#30363d', avatarBg: '#0a3622', avatarBorder: '#3fb950' },
  SYS: { id: 'SYS', name: 'SYSTEM', short: 'SYS', color: '#f85149', bg: 'rgba(248,81,73,0.04)', border: '#30363d', avatarBg: '#5a0000', avatarBorder: '#f85149' },
  OPR: { id: 'OPR', name: '操作员', short: 'OPR', color: '#8b949e', bg: 'rgba(139,148,158,0.04)', border: '#30363d', avatarBg: '#21262d', avatarBorder: '#8b949e' },
} as const;

type AgentId = keyof typeof AGENTS;

interface AgentMessage {
  id: string;
  agent: AgentId;
  to?: AgentId;
  content: string;
  timestamp: string;
  phase?: number;
}

const PHASES = [
  { id: 0, label: '值守中', color: '#3fb950', icon: '●' },
  { id: 1, label: '早期预警 · 出动', color: '#f85149', icon: '⚡' },
  { id: 2, label: '精确引导逼近', color: '#d29922', icon: '→' },
  { id: 3, label: '上行侦测 · 精准打击', color: '#d29922', icon: '⚡' },
  { id: 4, label: '多模态闭环验证', color: '#58a6ff', icon: '✓' },
  { id: 5, label: '复位', color: '#3fb950', icon: '↺' },
];

// ── 响应式状态 ──
const devices = ref<Device[]>(JSON.parse(JSON.stringify(INITIAL_DEVICES)));
const messages = ref<AgentMessage[]>([]);
const tasks = ref<TaskSim[]>(JSON.parse(JSON.stringify(INITIAL_TASKS)));
const thinking = ref<{ agent: AgentId; text: string } | null>(null);
const inputVal = ref('');
const utcTime = ref(getUtcTime());
const isRunning = ref(false);
const currentPhase = ref(0);
const autoAlertVisible = ref(false);
const taskSimVisible = ref(false);
const taskSimCollapsed = ref(false);
const systemState = ref<'watching' | 'alert' | 'executing' | 'neutralized'>('watching');
const hilVisible = ref(false);
const hilTitle = ref('');
const hilDesc = ref('');
const hilCountdown = ref(5);
let hilResolveRef: (() => void) | null = null;
const messagesEndRef = ref<HTMLDivElement | null>(null);

// ── UTC 时钟 ──
let clockTimer: ReturnType<typeof setInterval>;
onMounted(() => {
  clockTimer = setInterval(() => { utcTime.value = getUtcTime(); }, 1000);
  messages.value = [{
    id: 'init', agent: 'S2', content: `
<div class="aip-msg-inner">
  <div class="aip-msg-label">系统就绪 · OPENCLAW 自动值守 AI</div>
  Openclaw 自动值守 AI 已上线，当前任务：<span class="hl-blue">MISSION-G20-AIRPORT-001</span><br/>
  保护目标：指挥所核心区域 · 任务窗口：<span class="hl-blue">06:00Z – 22:00Z</span><br/><br/>
  <span class="hl-muted">Digital Agents 在线：</span><br/>
  &nbsp;&nbsp;<span class="hl-gold">S1 指挥官</span> — 全局任务理解、指挥决策、关键动作授权<br/>
  &nbsp;&nbsp;<span class="hl-blue">S2 情报参谋</span> — 态势融合、威胁识别、风险评估、情报上报<br/>
  &nbsp;&nbsp;<span class="hl-green">S3 作战参谋</span> — 任务规划、资源调度、行动方案生成<br/><br/>
  <span class="hl-muted">Physical Agents 在线：</span> Spotter Pro · Tracer Air II · HunterMax<br/>
  规则集版本：<span class="hl-blue">Openclaw V1.0</span> · ROE：<span class="hl-gold">半自动（S1 指挥官确认）</span><br/><br/>
  <span class="hl-dim">系统处于</span> <span class="hl-green">值守中</span> <span class="hl-dim">状态，Spotter Pro 全域扫描中...</span>
</div>`, timestamp: getUtcTime(),
  }];
});
onUnmounted(() => { clearInterval(clockTimer); });

watch([messages, thinking], () => {
  nextTick(() => { messagesEndRef.value?.scrollIntoView({ behavior: 'smooth' }); });
});

// ── 辅助函数 ──
function addMsg(agent: AgentId, content: string, to?: AgentId, phase?: number) {
  messages.value.push({
    id: `${Date.now()}-${Math.random()}`, agent, to, content, timestamp: getUtcTime(), phase,
  });
}

function setThink(agent: AgentId | null, text?: string) {
  thinking.value = agent && text ? { agent, text } : null;
}

function updateDevice(id: string, status: Device['status'], detail?: string) {
  const d = devices.value.find(d => d.id === id);
  if (d) { d.status = status; if (detail) d.detail = detail; }
}

// ── 人在环倒计时 ──
function waitHumanInLoop(title: string, desc: string): Promise<void> {
  return new Promise(resolve => {
    hilTitle.value = title;
    hilDesc.value = desc;
    hilCountdown.value = 5;
    hilVisible.value = true;
    hilResolveRef = resolve;
    let count = 5;
    const timer = setInterval(() => {
      count--;
      hilCountdown.value = count;
      if (count <= 0) { clearInterval(timer); hilVisible.value = false; resolve(); }
    }, 1000);
  });
}

function handleHilConfirm() {
  hilVisible.value = false;
  if (hilResolveRef) { hilResolveRef(); hilResolveRef = null; }
}

function handleHilOverride() {
  hilVisible.value = false;
  hilResolveRef = null;
  addMsg('S1', `<span class="hl-red">⊘ S1 指挥官中止授权，任务终止。系统回到值守状态。</span>`);
  isRunning.value = false;
  systemState.value = 'watching';
  currentPhase.value = 0;
}

// ── TASK 仿真引擎 ──
async function simTask(taskIndex: number) {
  const task = INITIAL_TASKS[taskIndex];
  taskSimVisible.value = true;
  const t = tasks.value[taskIndex];
  t.state = 'constraint_check';
  t.startTime = getUtcTime();
  t.simLog = [`[${getUtcTime()}] 约束检查中...`];
  await sleep(400);
  for (let ci = 0; ci < task.constraints.length; ci++) {
    await sleep(300);
    t.constraints[ci].passed = true;
    t.simLog.push(`[${getUtcTime()}] ✓ ${task.constraints[ci].label}`);
  }
  await sleep(250);
  t.state = 'executing';
  t.simLog.push(`[${getUtcTime()}] 约束通过，执行中...`);

  const taskLogs: Record<number, { at: number; log: string }[]> = {
    0: [
      { at: 0.2, log: `[${getUtcTime()}] CMD → STA200: TAKEOFF heading=045° alt=120m` },
      { at: 0.5, log: `[${getUtcTime()}] Tracer Air II 起飞，高度 60m → 120m` },
      { at: 0.8, log: `[${getUtcTime()}] 高度 120m 锁定，航向 045°，侦测模块开启确认` },
    ],
    1: [
      { at: 0.15, log: `[${getUtcTime()}] CMD → STA200: FOLLOW_TARGET guide=Spotter Pro` },
      { at: 0.4, log: `[${getUtcTime()}] Spotter Pro 引导 · 目标距离 2.3km → 1.5km` },
      { at: 0.65, log: `[${getUtcTime()}] 目标距离 1.0km → 700m，安全走廊验证 ✓` },
      { at: 0.85, log: `[${getUtcTime()}] 进入 ELINT 有效距离 500m ✓` },
    ],
    2: [
      { at: 0.1, log: `[${getUtcTime()}] CMD → STA200: ELINT_START band=0.4~6GHz` },
      { at: 0.35, log: `[${getUtcTime()}] 扫描 868MHz 强信号 -58dBm，ELRS 跳频识别` },
      { at: 0.6, log: `[${getUtcTime()}] 上行频率确认：915MHz ELRS · 回传至 HunterMax` },
      { at: 0.9, log: `[${getUtcTime()}] ELINT 完成 ✓ rf_uplink.freq_mhz=915 已推送` },
    ],
    3: [
      { at: 0.2, log: `[${getUtcTime()}] CMD → SHH300: LOAD_FREQ freq=915MHz mode=TRACK` },
      { at: 0.55, log: `[${getUtcTime()}] 915MHz ELRS 跳频模式加载，精准跟踪就绪` },
      { at: 0.85, log: `[${getUtcTime()}] HunterMax 频率锁定 ✓ 等待 S1 授权` },
    ],
    4: [
      { at: 0.1, log: `[${getUtcTime()}] CMD → SHH300: JAM_START power=200W mode=SurgicalStrike` },
      { at: 0.3, log: `[${getUtcTime()}] 干扰功率 200W · 915MHz 精准压制中` },
      { at: 0.55, log: `[${getUtcTime()}] 目标信号 -62dBm → -81dBm → -95dBm` },
      { at: 0.8, log: `[${getUtcTime()}] Failsafe 触发！rf_downlink < -95dBm 持续 12s ✓` },
    ],
    5: [
      { at: 0.15, log: `[${getUtcTime()}] CMD → STF200: VERIFY_KILL mode=TRIMODAL` },
      { at: 0.35, log: `[${getUtcTime()}] [1/3] RF：rf_downlink < -95dBm 持续 12s ✓` },
      { at: 0.55, log: `[${getUtcTime()}] [2/3] 雷达：速度 0.3km/h < 2km/h 持续 11s ✓` },
      { at: 0.8, log: `[${getUtcTime()}] [3/3] EO/IR：目标坠落确认 ✓` },
      { at: 0.95, log: `[${getUtcTime()}] 三模态全部满足 → TARGET-001 NEUTRALIZED ✓` },
    ],
    6: [
      { at: 0.2, log: `[${getUtcTime()}] CMD → SHH300: JAM_STOP condition=KILL_VERIFIED` },
      { at: 0.45, log: `[${getUtcTime()}] CMD → STA200: RTH mode=AUTO` },
      { at: 0.7, log: `[${getUtcTime()}] CMD → STF200: SCAN_RESUME mode=FULLAREA` },
      { at: 0.9, log: `[${getUtcTime()}] 系统复位完成 → 值守中` },
    ],
  };

  const logs = taskLogs[taskIndex] || [];
  const steps = 20;
  for (let step = 0; step <= steps; step++) {
    const pct = Math.round((step / steps) * 100);
    const logEntry = logs.find(l => Math.abs(l.at - step / steps) < 0.06);
    if (logEntry) {
      t.progress = pct;
      if (!t.simLog.includes(logEntry.log)) t.simLog.push(logEntry.log);
    } else {
      t.progress = pct;
    }
    await sleep(task.duration / steps);
  }
  t.state = 'done';
  t.progress = 100;
  t.endTime = getUtcTime();
  t.simLog.push(`[${getUtcTime()}] ✓ ${task.taskId} 完成`);
}

// ── 重置 ──
function resetAll() {
  messages.value = [{
    id: 'init', agent: 'S2', content: `
<div class="aip-msg-inner">
  <div class="aip-msg-label">系统就绪 · OPENCLAW 自动值守 AI</div>
  Openclaw 自动值守 AI 已上线，当前任务：<span class="hl-blue">MISSION-G20-AIRPORT-001</span><br/>
  保护目标：指挥所核心区域 · 任务窗口：<span class="hl-blue">06:00Z – 22:00Z</span><br/><br/>
  <span class="hl-muted">Digital Agents 在线：</span><br/>
  &nbsp;&nbsp;<span class="hl-gold">S1 指挥官</span> — 全局任务理解、指挥决策、关键动作授权<br/>
  &nbsp;&nbsp;<span class="hl-blue">S2 情报参谋</span> — 态势融合、威胁识别、风险评估、情报上报<br/>
  &nbsp;&nbsp;<span class="hl-green">S3 作战参谋</span> — 任务规划、资源调度、行动方案生成<br/><br/>
  <span class="hl-muted">Physical Agents 在线：</span> Spotter Pro · Tracer Air II · HunterMax<br/>
  规则集版本：<span class="hl-blue">Openclaw V1.0</span> · ROE：<span class="hl-gold">半自动（S1 指挥官确认）</span><br/><br/>
  <span class="hl-dim">系统处于</span> <span class="hl-green">值守中</span> <span class="hl-dim">状态，Spotter Pro 全域扫描中...</span>
</div>`, timestamp: getUtcTime(),
  }];
  tasks.value = JSON.parse(JSON.stringify(INITIAL_TASKS));
  thinking.value = null;
  devices.value = JSON.parse(JSON.stringify(INITIAL_DEVICES));
  autoAlertVisible.value = false;
  hilVisible.value = false;
  systemState.value = 'watching';
  currentPhase.value = 0;
  taskSimVisible.value = false;
  isRunning.value = false;
}

// ── 完整演示流程（5阶段故事线） ──
async function runFullDemo() {
  if (isRunning.value) return;
  isRunning.value = true;
  resetAll();
  await sleep(500);

  currentPhase.value = 0;
  addMsg('S2', `
<div class="aip-msg-inner">
  <div class="aip-msg-label">S2 · 值守状态报告</div>
  Spotter Pro 全域扫描正常 · RF + 雷达 + EO/IR 三模态运行中<br/>
  当前空域：<span class="hl-green">无异常目标</span> · 扫描范围 3km · 刷新率 10Hz<br/>
  HunterMax 待机 · Tracer Air II 待机（电量 87%）
</div>`, undefined, 0);
  await sleep(1200);

  // 【阶段一：早期预警 + 立即出动】
  currentPhase.value = 1;
  systemState.value = 'alert';
  autoAlertVisible.value = true;

  addMsg('SYS', `
<div class="aip-alert-inline">
  <span class="alert-dot-inline"></span>
  <span class="hl-red" style="font-weight:600;">SPOTTER PRO 自动推送</span>
  <span class="hl-red-dim">射频异常 · 868MHz ELRS · 信号强度 -62dBm · 雷达新目标锁定 · R-01 触发</span>
</div>`, undefined, 1);
  await sleep(600);

  setThink('S2', '[R-01/R-02] 融合 RF + 雷达数据，评估威胁等级...');
  await sleep(2000);
  setThink(null);

  addMsg('S2', `
<div class="aip-msg-inner">
  <div class="aip-msg-label">[R-01 + R-02] 威胁感知报告</div>
  <div class="aip-card-danger">
    <span class="hl-red" style="font-weight:700;">TARGET-001</span> · FPV 竞速机<br/>
    坐标：(lat:30.4521, lon:114.3872, alt:145m) · 速度：95km/h · 方位：NE 045°<br/>
    下行链路：5.8GHz 数字图传 · 上行协议：ELRS 868MHz<br/>
    信号强度：-62dBm（阈值 -85dBm，超出 +23dBm）<br/>
    距指挥所：<span class="hl-gold">2.3km ↗ 逼近中</span>
  </div>
  <span class="hl-red">威胁等级评估：4/5</span> · 识别置信度：<span class="hl-green">87%</span> ≥ 60% ✓<br/>
  <span class="hl-muted">→ 建议：立即出动 Tracer Air II，HunterMax 进入待机就绪</span>
</div>`, undefined, 1);
  await sleep(800);

  setThink('S1', '评估威胁情报，决策出动授权...');
  await sleep(1500);
  setThink(null);

  addMsg('S1', `
<div class="aip-msg-inner">
  <div class="aip-msg-label">[S1 指挥官] 威胁确认 · 授权出动</div>
  收到 S2 情报，TARGET-001 威胁等级 4，置信度 87%，确认为威胁目标。<br/>
  <span class="hl-gold">授权决策：</span>启动 COA-A 标准杀伤链<br/>
  → Tracer Air II 立即起飞，高度 120m，航向 NE<br/>
  → HunterMax 进入待机就绪（<span class="hl-gold">不开启干扰</span>，等待上行频率参数）<br/>
  → Spotter Pro 持续推送目标位置<br/>
  <span class="hl-gold">→ S3 执行任务规划</span>
</div>`, undefined, 1);
  await sleep(600);

  await waitHumanInLoop(
    'S1 指挥官授权 · Tracer Air II 出动',
    'TARGET-001 威胁等级 4 · 置信度 87% · 授权 Tracer Air II 起飞，HunterMax 待机就绪'
  );

  setThink('S3', '[R-04] 生成 TASK-1 起飞指令...');
  await sleep(1000);
  setThink(null);

  addMsg('S3', `
<div class="aip-msg-inner">
  <div class="aip-msg-label">[S3 作战参谋] 阶段一任务下达</div>
  <span class="hl-green">TASK-1</span> · Tracer Air II 起飞<br/>
  <span class="hl-dim">[T+0s]</span> CMD → STA200: TAKEOFF, heading=045°, alt=120m<br/>
  <span class="hl-dim">[T+0s]</span> CMD → SHH300: STANDBY_READY（不开启干扰）<br/>
  <span class="hl-dim">[T+0s]</span> CMD → STF200: TRACK_TARGET, target_id=TARGET-001<br/>
  <span class="hl-muted">注：Tracer Air II 将沿安全走廊飞行，全程在 HunterMax 打击扇区外</span>
</div>`, undefined, 1);

  updateDevice('STA200-001', 'ENGAGING', '起飞中 · 航向 045° · 高度爬升至 120m');
  updateDevice('SHH300-001', 'STANDBY', '待机就绪 · 等待上行频率参数');
  await simTask(0);
  await sleep(400);

  // 【阶段二：精确引导逼近】
  currentPhase.value = 2;

  addMsg('S2', `
<div class="aip-msg-inner">
  <div class="aip-msg-label">[S2 情报参谋] 目标实时态势</div>
  Spotter Pro 雷视锁定 TARGET-001 · 持续输出三维坐标 + 速度矢量<br/>
  当前位置：(lat:30.4498, lon:114.3901, alt:142m) · 速度：92km/h<br/>
  Tracer Air II 当前距目标：<span class="hl-gold">2.1km</span> · 飞行于安全走廊 ✓<br/>
  <span class="hl-muted">→ 建议 S3 实时更新 Tracer Air 航点，持续逼近</span>
</div>`, undefined, 2);
  await sleep(600);

  addMsg('S1', `
<div class="aip-msg-inner">
  <div class="aip-msg-label">[S1 指挥官] 确认引导逼近</div>
  收到 S2 态势，目标持续逼近，Tracer Air II 飞行正常。<br/>
  <span class="hl-gold">指令：</span>S3 实时更新 Tracer Air 航点，持续动态追踪目标
</div>`, undefined, 2);
  await sleep(400);

  setThink('S3', '[R-04] 更新 TASK-2 动态追踪航点...');
  await sleep(1000);
  setThink(null);

  addMsg('S3', `
<div class="aip-msg-inner">
  <div class="aip-msg-label">[S3 作战参谋] 阶段二任务下达</div>
  <span class="hl-green">TASK-2</span> · Tracer Air II 动态追踪逼近<br/>
  <span class="hl-dim">[T+5s]</span> CMD → STA200: FOLLOW_TARGET, target_id=TARGET-001, guide=STF200<br/>
  <span class="hl-dim">[持续]</span> Spotter Pro 实时推送坐标 → 动态更新航点<br/>
  <span class="hl-dim">[持续]</span> SAFETY-2 检查：飞行路径在 HunterMax 打击扇区外 ✓<br/>
  目标：进入 ELINT 有效距离 500m
</div>`, undefined, 2);

  updateDevice('STA200-001', 'ENGAGING', '跟随 Spotter Pro 引导 · 动态追踪逼近');
  await simTask(1);
  await sleep(400);

  // 【阶段三：上行侦测 + 精准打击】
  currentPhase.value = 3;

  addMsg('S2', `
<div class="aip-msg-inner">
  <div class="aip-msg-label">[S2 情报参谋] Tracer Air II 进入 ELINT 距离</div>
  Tracer Air II 距目标 <span class="hl-green">480m</span> ✓ 进入 ELINT 有效距离<br/>
  开启电侦模块，扫描 0.4~6GHz 全频段<br/>
  <span class="hl-gold">侦测结果：上行链路 915MHz ELRS 跳频</span> · 信号强度 -58dBm<br/>
  频率参数已回传 → 推送至 HunterMax<br/>
  <span class="hl-muted">→ 建议：S1 授权 HunterMax 启动精准跟踪干扰</span>
</div>`, undefined, 3);
  await sleep(600);

  updateDevice('STA200-001', 'ENGAGING', 'ELINT 扫描中 · 0.4~6GHz');
  await simTask(2);
  await sleep(400);

  setThink('S1', '评估频率情报，决策干扰授权...');
  await sleep(1200);
  setThink(null);

  addMsg('S1', `
<div class="aip-msg-inner">
  <div class="aip-msg-label">[S1 指挥官] 频率确认 · 授权精准干扰</div>
  收到 S2 情报：上行频率 915MHz ELRS 已确认，置信度 95%。<br/>
  SAFETY-1 检查：目标不在友方白名单 ✓<br/>
  SAFETY-3 检查：ROE 授权范围内 ✓<br/>
  <span class="hl-gold">授权决策：</span>HunterMax 启动 915MHz 精准跟踪干扰<br/>
  <span class="hl-gold">→ S3 立即下达干扰指令</span>
</div>`, undefined, 3);
  await sleep(400);

  await waitHumanInLoop(
    'S1 指挥官授权 · HunterMax 精准干扰',
    '上行频率 915MHz ELRS 已确认 · 授权 HunterMax 启动精准跟踪干扰'
  );

  setThink('S3', '[R-05] 生成 TASK-4/5 干扰指令序列...');
  await sleep(1000);
  setThink(null);

  addMsg('S3', `
<div class="aip-msg-inner">
  <div class="aip-msg-label">[S3 作战参谋] 阶段三任务下达</div>
  <span class="hl-green">TASK-4</span> · HunterMax 加载频率参数<br/>
  <span class="hl-dim">[T+75s]</span> CMD → SHH300: LOAD_FREQ, freq=915MHz, hop=ELRS, mode=TRACK<br/>
  <span class="hl-green">TASK-5</span> · HunterMax 启动精准跟踪干扰<br/>
  <span class="hl-dim">[T+76s]</span> CMD → SHH300: JAM_START, power=200W, mode=SurgicalStrike<br/>
  <span class="hl-muted">预期：目标遥控链路被压制 → Failsafe 触发（降落/返航/失控）</span>
</div>`, undefined, 3);

  updateDevice('SHH300-001', 'ENGAGING', '加载频率参数 · 915MHz ELRS');
  await simTask(3);
  await sleep(300);

  updateDevice('SHH300-001', 'ENGAGING', '精准干扰中 · 915MHz · 200W');
  await simTask(4);
  await sleep(400);

  // 【阶段四：多模态闭环验证】
  currentPhase.value = 4;

  addMsg('S2', `
<div class="aip-msg-inner">
  <div class="aip-msg-label">[S2 情报参谋] 目标失控确认 · 启动闭环验证</div>
  目标 rf_downlink < -95dBm 持续 12s，Failsafe 已触发<br/>
  启动 Spotter Pro 三模态闭环验证：<br/>
  <span class="hl-dim">EO/IR：</span>视觉确认目标坠落/停止飞行<br/>
  <span class="hl-dim">射频：</span>确认下行信号消失<br/>
  <span class="hl-dim">雷达：</span>确认目标轨迹终止<br/>
  <span class="hl-muted">→ 三模态全部满足后上报 S1 威胁解除</span>
</div>`, undefined, 4);
  await sleep(600);

  updateDevice('STF200-001', 'ENGAGING', '三模态闭环验证中');
  await simTask(5);
  await sleep(400);

  addMsg('S2', `
<div class="aip-msg-inner">
  <div class="aip-msg-label">[S2 情报参谋] 三模态验证完成</div>
  <div class="aip-card-success">
    ✓ EO/IR：eo_confirmed = "confirmed" · 目标坠落<br/>
    ✓ 射频：rf_downlink < -95dBm · 持续 12s<br/>
    ✓ 雷达：radar_track 速度 < 2km/h · 持续 11s<br/>
    <span class="hl-green" style="font-weight:700;">三模态全部满足 → 威胁解除判定</span>
  </div>
  <span class="hl-muted">→ 建议 S1 下达复位指令</span>
</div>`, undefined, 4);
  await sleep(600);

  systemState.value = 'neutralized';
  autoAlertVisible.value = false;

  addMsg('S1', `
<div class="aip-msg-inner">
  <div class="aip-msg-label">[S1 指挥官] 威胁解除确认</div>
  <div class="aip-card-success" style="text-align:center;padding:16px;">
    <div style="font-family:'JetBrains Mono',monospace;font-size:16px;font-weight:700;color:#3fb950;letter-spacing:2px;">TARGET NEUTRALIZED</div>
    <div style="font-size:12px;color:#8b949e;margin-top:4px;">TARGET-001 · 处置完成 · 总耗时 ~107s</div>
  </div>
  ROE-2025-G20-042 审计日志已写入<br/>
  <span class="hl-gold">→ S3 下达复位指令</span>
</div>`, undefined, 4);
  await sleep(600);

  // 【阶段五：复位】
  currentPhase.value = 5;

  addMsg('S3', `
<div class="aip-msg-inner">
  <div class="aip-msg-label">[S3 作战参谋] 阶段五 · 系统复位</div>
  <span class="hl-dim">[T+105s]</span> CMD → SHH300: JAM_STOP, condition=KILL_VERIFIED<br/>
  <span class="hl-dim">[T+106s]</span> CMD → STA200: RTH, mode=AUTO<br/>
  <span class="hl-dim">[T+107s]</span> CMD → STF200: SCAN_RESUME, mode=FULLAREA<br/>
  系统回到持续值守状态
</div>`, undefined, 5);

  updateDevice('STA200-001', 'RETURNING', '返航中 · RTH');
  updateDevice('SHH300-001', 'STANDBY', '干扰停止 · 待命');
  updateDevice('STF200-001', 'ONLINE', 'RF + 雷达 + EO/IR 三模态 · 全域扫描中');
  await simTask(6);
  await sleep(400);

  addMsg('S2', `
<div class="aip-msg-inner">
  <div class="aip-msg-label">[S2 情报参谋] 系统复位完成</div>
  Tracer Air II 返回机巢充电复位<br/>
  HunterMax 恢复 Standby 待机<br/>
  Spotter Pro 恢复全域扫描<br/>
  <span class="hl-green">系统状态 → 值守中</span> · 持续监听 Spotter Pro 感知数据...
</div>`, undefined, 5);

  currentPhase.value = 0;
  systemState.value = 'watching';
  isRunning.value = false;
}

// ── COA-D 人工介入演示 ──
async function runCoaD() {
  if (isRunning.value) return;
  isRunning.value = true;
  currentPhase.value = 1;
  systemState.value = 'alert';
  autoAlertVisible.value = true;

  addMsg('SYS', `
<div class="aip-alert-inline">
  <span class="alert-dot-inline"></span>
  <span class="hl-red" style="font-weight:600;">SPOTTER PRO 自动推送</span>
  <span class="hl-red-dim">新目标 TARGET-002 · 频率特征部分匹配友方白名单 FRIENDLY-002</span>
</div>`, undefined, 1);
  await sleep(600);

  setThink('S2', '[R-02] 评估识别置信度，检查友方白名单...');
  await sleep(2000);
  setThink(null);

  addMsg('S2', `
<div class="aip-msg-inner">
  <div class="aip-msg-label" style="color:#d29922;">[S2 情报参谋] 威胁评估异常</div>
  TARGET-002 识别置信度：<span class="hl-red">54%</span>（阈值 60%，不足）<br/>
  目标频率特征与 FRIENDLY-002 部分重叠，无法确认<br/>
  <span class="hl-gold">SAFETY-1 友方保护规则触发</span> · 自主执行已暂停<br/>
  <span class="hl-muted">→ 建议 S1 人工介入确认目标身份</span>
</div>`, undefined, 1);
  await sleep(600);

  addMsg('S1', `
<div class="aip-msg-inner">
  <div class="aip-msg-label">[S1 指挥官] 选择 COA-D · 人工介入</div>
  收到 S2 情报，置信度 54% 不足，触发 COA-D。<br/>
  <span class="hl-gold">等待操作员人工确认目标身份...</span>
</div>`, undefined, 1);

  hilTitle.value = 'COA-D · 人工介入 · 目标身份确认';
  hilDesc.value = 'TARGET-002 识别置信度 54% · 疑似友方 · 请操作员确认目标身份';
  hilCountdown.value = 5;
  hilVisible.value = true;
  hilResolveRef = () => {
    addMsg('OPR', '✓ 操作员确认：TARGET-002 为威胁目标，授权执行 COA-A', undefined, 1);
    setTimeout(() => {
      addMsg('S1', `<div class="aip-msg-inner"><div class="aip-msg-label">[S1 指挥官] 人工确认 · 恢复 COA-A</div>操作员确认 TARGET-002 为威胁，识别置信度更新为 95%。<br/><span class="hl-gold">恢复 COA-A 自主执行流程</span></div>`, undefined, 1);
    }, 400);
  };
  isRunning.value = false;
}

// ── 发送消息 ──
async function handleSend() {
  const val = inputVal.value.trim();
  if (!val || isRunning.value) return;
  inputVal.value = '';
  addMsg('OPR', val);
  await sleep(400);
  setThink('S2', '分析指令...');
  await sleep(1200);
  setThink(null);
  addMsg('S2', `<div class="aip-msg-inner"><div class="aip-msg-label">指令已接收</div>已记录：<span class="hl-blue">${val}</span><br/><span class="hl-dim">请使用快捷按钮触发标准演示流程。</span></div>`);
}

const QUICK_CMDS = [
  { label: '🎯 完整演示（5阶段）', fn: runFullDemo },
  { label: '⚠ COA-D 人工介入', fn: runCoaD },
  { label: '↺ 重置', fn: resetAll },
];

const sysLabelMap = {
  watching: { text: '值守中', cls: '#3fb950' },
  alert: { text: '威胁告警', cls: '#f85149' },
  executing: { text: '执行中', cls: '#d29922' },
  neutralized: { text: '威胁解除', cls: '#3fb950' },
};

const doneCount = () => tasks.value.filter(t => t.state === 'done').length;
const activeTask = () => tasks.value.find(t => t.state === 'executing' || t.state === 'constraint_check');
const latestLog = () => {
  const withLogs = tasks.value.filter(t => t.simLog.length > 0);
  return withLogs.length > 0 ? withLogs[withLogs.length - 1] : null;
};
</script>

<template>
  <div class="aip-root">
    <!-- TOP CLASSIFICATION BAR -->
    <div class="aip-class-bar">UNCLASSIFIED // NOTIONAL DATA // SKYFEND C2 PLATFORM</div>

    <!-- HEADER -->
    <header class="aip-header">
      <div class="aip-header-left">
        <div class="aip-logo">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="8" stroke="#58a6ff" stroke-width="1.5"/><circle cx="10" cy="10" r="3" fill="#58a6ff"/><line x1="10" y1="2" x2="10" y2="6" stroke="#58a6ff" stroke-width="1.5"/><line x1="10" y1="14" x2="10" y2="18" stroke="#58a6ff" stroke-width="1.5"/><line x1="2" y1="10" x2="6" y2="10" stroke="#58a6ff" stroke-width="1.5"/><line x1="14" y1="10" x2="18" y2="10" stroke="#58a6ff" stroke-width="1.5"/></svg>
        </div>
        <span class="aip-brand">Skyfend C2</span>
        <div class="aip-tabs">
          <div class="aip-tab active">AI Terminal</div>
          <div class="aip-tab">Agent 编排</div>
          <div class="aip-tab">装备状态</div>
          <div class="aip-tab">COA 库</div>
        </div>
      </div>
      <div class="aip-header-right">
        <div class="aip-phase-tag" v-if="currentPhase > 0" :style="{ color: PHASES[currentPhase]?.color, borderColor: PHASES[currentPhase]?.color + '55' }">
          {{ PHASES[currentPhase]?.icon }} Phase {{ currentPhase }} — {{ PHASES[currentPhase]?.label }}
        </div>
        <div class="aip-sys-tag" :style="{ color: sysLabelMap[systemState].cls, borderColor: sysLabelMap[systemState].cls + '55' }">
          {{ sysLabelMap[systemState].text }}
        </div>
        <div class="aip-roe-tag">ROE: SEMI-AUTO</div>
        <div v-if="taskSimVisible && doneCount() > 0" class="aip-task-tag">
          TASK {{ doneCount() }}/7
        </div>
        <div class="aip-sep"></div>
        <div class="aip-agents-row">
          <span class="aip-agent-dot" v-for="id in (['S1','S2','S3'] as const)" :key="id" :style="{ color: AGENTS[id].color }">{{ id }}</span>
        </div>
        <div class="aip-sep"></div>
        <div class="aip-utc">{{ utcTime }}</div>
        <div class="aip-online-dot"></div>
      </div>
    </header>

    <!-- AUTO ALERT -->
    <div v-if="autoAlertVisible" class="aip-alert-bar">
      <span class="aip-alert-dot"></span>
      <span class="aip-alert-title">THREAT DETECTED</span>
      <span class="aip-alert-desc">射频异常 + 雷达新目标 · R-01 规则触发 · S2 情报参谋介入</span>
      <button class="aip-alert-close" @click="autoAlertVisible = false">Dismiss</button>
    </div>

    <!-- PHYSICAL AGENT BAR -->
    <PhysicalAgentBar :devices="devices" />

    <!-- PHASE PROGRESS -->
    <div class="aip-phase-bar">
      <div v-for="(p, i) in PHASES" :key="p.id" class="aip-phase-item">
        <div v-if="i > 0" class="aip-phase-line" :class="{ done: i <= currentPhase }"></div>
        <div class="aip-phase-dot" :class="{ active: i === currentPhase, done: i < currentPhase && currentPhase > 0 }">
          <span>{{ i < currentPhase && currentPhase > 0 ? '✓' : (i + 1) }}</span>
        </div>
        <span class="aip-phase-label" :class="{ active: i === currentPhase }">{{ p.label }}</span>
      </div>
    </div>

    <!-- MAIN CHAT -->
    <div class="aip-chat">
      <!-- Messages -->
      <div class="aip-messages">
        <div v-for="m in messages" :key="m.id" class="aip-msg-row" :class="{ 'opr-row': m.agent === 'OPR' }">
          <!-- Avatar -->
          <div class="aip-avatar" :style="{ background: AGENTS[m.agent].avatarBg, borderColor: AGENTS[m.agent].avatarBorder }">
            {{ AGENTS[m.agent].short }}
          </div>
          <!-- Body -->
          <div class="aip-msg-body">
            <div class="aip-msg-meta">
              <span class="aip-msg-name" :style="{ color: AGENTS[m.agent].color }">{{ AGENTS[m.agent].name }}</span>
              <span class="aip-msg-time">{{ m.timestamp }}</span>
              <span v-if="m.phase !== undefined && m.phase > 0" class="aip-msg-phase-tag" :style="{ color: PHASES[m.phase]?.color, borderColor: PHASES[m.phase]?.color + '44' }">
                Phase {{ m.phase }}
              </span>
            </div>
            <div class="aip-msg-content" v-html="m.content" />
          </div>
        </div>

        <!-- Thinking -->
        <div v-if="thinking" class="aip-msg-row">
          <div class="aip-avatar" :style="{ background: AGENTS[thinking.agent].avatarBg, borderColor: AGENTS[thinking.agent].avatarBorder }">
            {{ AGENTS[thinking.agent].short }}
          </div>
          <div class="aip-msg-body">
            <div class="aip-msg-meta">
              <span class="aip-msg-name" :style="{ color: AGENTS[thinking.agent].color }">{{ AGENTS[thinking.agent].name }}</span>
              <span class="aip-think-label">Processing</span>
            </div>
            <div class="aip-think-box">
              <div class="aip-think-dots"><span></span><span></span><span></span></div>
              <span class="aip-think-text">{{ thinking.text }}</span>
            </div>
          </div>
        </div>

        <div ref="messagesEndRef" />
      </div>

      <!-- TASK 仿真内嵌 -->
      <div v-if="taskSimVisible" class="aip-task-panel">
        <div class="aip-task-header" @click="taskSimCollapsed = !taskSimCollapsed">
          <div class="aip-task-left">
            <span class="aip-task-arrow" :class="{ collapsed: taskSimCollapsed }">▾</span>
            <span class="aip-task-title">TASK Simulation · R-05</span>
            <span class="aip-task-count">{{ doneCount() }}/{{ tasks.length }}</span>
          </div>
          <div class="aip-task-right">
            <span v-if="taskSimCollapsed && activeTask()" class="aip-task-active">▶ {{ activeTask()!.taskId }} {{ activeTask()!.progress }}%</span>
            <span v-if="taskSimCollapsed && !activeTask() && doneCount() === tasks.length" class="aip-task-done">✓ Complete</span>
            <span class="aip-task-toggle">{{ taskSimCollapsed ? 'Expand' : 'Collapse' }}</span>
          </div>
        </div>
        <div v-if="!taskSimCollapsed" class="aip-task-body">
          <div v-for="task in tasks" :key="task.id" class="aip-task-row" :class="{ pending: task.state === 'pending', active: task.state === 'executing' || task.state === 'constraint_check', done: task.state === 'done' }">
            <div class="aip-task-icon">
              {{ task.state === 'done' ? '✓' : (task.state === 'executing' || task.state === 'constraint_check') ? '▶' : '○' }}
            </div>
            <span class="aip-task-id">{{ task.taskId }}</span>
            <span class="aip-task-name">{{ task.title }}</span>
            <div v-if="task.state !== 'pending'" class="aip-task-progress">
              <div class="aip-task-fill" :class="{ done: task.state === 'done' }" :style="{ width: task.progress + '%' }"></div>
            </div>
            <span v-if="task.endTime" class="aip-task-time">{{ task.endTime }}</span>
          </div>
          <div v-if="latestLog()" class="aip-task-log">
            {{ latestLog()!.simLog[latestLog()!.simLog.length - 1] }}
          </div>
        </div>
      </div>

      <!-- 人在环确认 -->
      <div v-if="hilVisible" class="aip-hil">
        <div class="aip-hil-top">
          <div class="aip-hil-badge">HUMAN-IN-THE-LOOP</div>
          <div class="aip-hil-info">
            <div class="aip-hil-title">{{ hilTitle }}</div>
            <div class="aip-hil-desc">{{ hilDesc }}</div>
          </div>
          <div class="aip-hil-countdown" :class="{ urgent: hilCountdown <= 2 }">{{ hilCountdown }}s</div>
        </div>
        <div class="aip-hil-progress">
          <div class="aip-hil-fill" :style="{ width: Math.max(0, (hilCountdown / 5) * 100) + '%' }"></div>
        </div>
        <div class="aip-hil-actions">
          <button class="aip-hil-confirm" @click="handleHilConfirm">Authorize</button>
          <button class="aip-hil-abort" @click="handleHilOverride">Abort</button>
        </div>
      </div>

      <!-- Input -->
      <div class="aip-input-area">
        <div class="aip-quick-row">
          <button v-for="q in QUICK_CMDS" :key="q.label" class="aip-quick-btn" :disabled="isRunning" @click="q.fn()">{{ q.label }}</button>
        </div>
        <div class="aip-input-row">
          <input
            v-model="inputVal"
            @keydown.enter="handleSend"
            placeholder="输入指令或向 S1/S2/S3 发送消息..."
            class="aip-input"
          />
          <button class="aip-send" :disabled="isRunning" @click="handleSend">Send</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* ── Palantir AIP Style ── */
.aip-root {
  display: flex; flex-direction: column; height: 100vh; overflow: hidden;
  background: #0d1117; color: #e6edf3;
}

/* Classification Bar */
.aip-class-bar {
  background: #1a7f37; color: #fff; text-align: center;
  font-size: 11px; font-weight: 600; letter-spacing: 1.5px; padding: 3px 0;
  flex-shrink: 0;
}

/* Header */
.aip-header {
  background: #161b22; border-bottom: 1px solid #21262d;
  padding: 0 16px; height: 44px; display: flex; align-items: center;
  justify-content: space-between; flex-shrink: 0;
}
.aip-header-left { display: flex; align-items: center; gap: 12px; }
.aip-header-right { display: flex; align-items: center; gap: 10px; }
.aip-logo { display: flex; align-items: center; }
.aip-brand { font-size: 14px; font-weight: 700; color: #e6edf3; letter-spacing: 0.5px; }
.aip-tabs { display: flex; gap: 0; margin-left: 8px; }
.aip-tab {
  font-size: 12px; color: #8b949e; padding: 12px 14px; cursor: pointer;
  border-bottom: 2px solid transparent; transition: all 0.15s;
}
.aip-tab:hover { color: #c9d1d9; }
.aip-tab.active { color: #e6edf3; border-bottom-color: #58a6ff; }
.aip-phase-tag, .aip-sys-tag, .aip-roe-tag, .aip-task-tag {
  font-size: 11px; padding: 2px 8px; border: 1px solid; border-radius: 3px;
  font-family: 'JetBrains Mono', monospace; font-weight: 500;
}
.aip-roe-tag { color: #d29922; border-color: rgba(210,153,34,0.4); }
.aip-task-tag { color: #d29922; border-color: rgba(210,153,34,0.4); }
.aip-sep { width: 1px; height: 20px; background: #30363d; }
.aip-agents-row { display: flex; gap: 6px; }
.aip-agent-dot {
  font-size: 11px; font-weight: 600; font-family: 'JetBrains Mono', monospace;
}
.aip-utc { font-size: 12px; color: #8b949e; font-family: 'JetBrains Mono', monospace; }
.aip-online-dot {
  width: 6px; height: 6px; border-radius: 50%; background: #3fb950;
  box-shadow: 0 0 6px rgba(63,185,80,0.5);
}

/* Alert Bar */
.aip-alert-bar {
  background: rgba(248,81,73,0.08); border-bottom: 1px solid rgba(248,81,73,0.25);
  padding: 6px 16px; display: flex; align-items: center; gap: 10px; flex-shrink: 0;
  animation: slideDown 0.2s ease;
}
.aip-alert-dot {
  width: 6px; height: 6px; border-radius: 50%; background: #f85149;
  animation: pulse 1s infinite; flex-shrink: 0;
}
.aip-alert-title { font-size: 11px; font-weight: 600; color: #f85149; letter-spacing: 1px; }
.aip-alert-desc { font-size: 12px; color: #f8877f; flex: 1; }
.aip-alert-close {
  font-size: 11px; color: #8b949e; border: 1px solid #30363d; background: transparent;
  padding: 2px 10px; border-radius: 3px; cursor: pointer;
}

/* Phase Bar */
.aip-phase-bar {
  display: flex; align-items: center; padding: 8px 16px; gap: 0;
  background: #0d1117; border-bottom: 1px solid #21262d; flex-shrink: 0;
}
.aip-phase-item { display: flex; align-items: center; flex: 1; }
.aip-phase-item:first-child { flex: 0; }
.aip-phase-line {
  flex: 1; height: 2px; background: #21262d; transition: background 0.4s;
}
.aip-phase-line.done { background: #30363d; }
.aip-phase-dot {
  width: 24px; height: 24px; border-radius: 50%; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  font-size: 11px; font-weight: 600; color: #484f58;
  border: 1.5px solid #30363d; background: #0d1117; transition: all 0.3s;
}
.aip-phase-dot.active { border-color: #58a6ff; color: #58a6ff; background: rgba(88,166,255,0.08); }
.aip-phase-dot.done { border-color: #3fb950; color: #3fb950; background: rgba(63,185,80,0.08); }
.aip-phase-label {
  font-size: 11px; color: #484f58; margin-left: 6px; white-space: nowrap; transition: color 0.3s;
}
.aip-phase-label.active { color: #e6edf3; }

/* Chat */
.aip-chat { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
.aip-messages {
  flex: 1; overflow-y: auto; padding: 16px 20px;
  display: flex; flex-direction: column; gap: 16px; scroll-behavior: smooth;
}
.aip-msg-row { display: flex; gap: 12px; animation: fadeUp 0.25s ease; }
.aip-msg-row.opr-row { flex-direction: row-reverse; }
.aip-avatar {
  width: 32px; height: 32px; border-radius: 50%; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  font-size: 10px; font-weight: 700; color: #e6edf3;
  border: 1.5px solid; font-family: 'JetBrains Mono', monospace;
}
.aip-msg-body { flex: 1; max-width: 85%; }
.opr-row .aip-msg-body { align-items: flex-end; display: flex; flex-direction: column; }
.aip-msg-meta { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
.aip-msg-name { font-size: 12px; font-weight: 600; }
.aip-msg-time { font-size: 11px; color: #484f58; font-family: 'JetBrains Mono', monospace; }
.aip-msg-phase-tag {
  font-size: 10px; padding: 1px 6px; border: 1px solid; border-radius: 3px;
  font-family: 'JetBrains Mono', monospace;
}
.aip-msg-content {
  font-size: 13px; line-height: 1.7; color: #c9d1d9;
  padding: 10px 14px; background: #161b22; border: 1px solid #21262d;
  border-radius: 4px; border-top-left-radius: 0;
}
.opr-row .aip-msg-content {
  background: #0c2d6b; border-color: #1a4a8a; border-radius: 4px; border-top-right-radius: 0;
}

/* Thinking */
.aip-think-label {
  font-size: 10px; color: #484f58; font-style: italic;
}
.aip-think-box {
  display: flex; align-items: center; gap: 10px;
  padding: 10px 14px; background: #161b22; border: 1px solid #21262d; border-radius: 4px;
}
.aip-think-dots { display: flex; gap: 4px; }
.aip-think-dots span {
  width: 5px; height: 5px; border-radius: 50%; background: #58a6ff;
  animation: dotPulse 1.2s infinite;
}
.aip-think-dots span:nth-child(2) { animation-delay: 0.2s; }
.aip-think-dots span:nth-child(3) { animation-delay: 0.4s; }
.aip-think-text { font-size: 12px; color: #8b949e; }

/* TASK Panel */
.aip-task-panel {
  background: #161b22; border: 1px solid #21262d; border-radius: 4px;
  margin: 0 20px 8px; animation: fadeUp 0.2s ease;
}
.aip-task-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 8px 14px; cursor: pointer; user-select: none;
}
.aip-task-left { display: flex; align-items: center; gap: 8px; }
.aip-task-arrow {
  font-size: 10px; color: #8b949e; transition: transform 0.2s; display: inline-block;
}
.aip-task-arrow.collapsed { transform: rotate(-90deg); }
.aip-task-title { font-size: 11px; color: #8b949e; letter-spacing: 1px; font-weight: 600; }
.aip-task-count { font-size: 11px; color: #484f58; font-family: 'JetBrains Mono', monospace; }
.aip-task-right { display: flex; align-items: center; gap: 8px; }
.aip-task-active { font-size: 11px; color: #d29922; font-family: 'JetBrains Mono', monospace; }
.aip-task-done { font-size: 11px; color: #3fb950; }
.aip-task-toggle { font-size: 11px; color: #484f58; }
.aip-task-body { padding: 0 14px 10px; display: flex; flex-direction: column; gap: 4px; }
.aip-task-row {
  display: flex; align-items: center; gap: 8px; padding: 3px 0; transition: opacity 0.2s;
}
.aip-task-row.pending { opacity: 0.35; }
.aip-task-icon {
  width: 18px; height: 18px; border-radius: 50%; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  font-size: 10px; color: #484f58; border: 1px solid #30363d;
}
.aip-task-row.done .aip-task-icon { color: #3fb950; border-color: #3fb950; background: rgba(63,185,80,0.08); }
.aip-task-row.active .aip-task-icon { color: #d29922; border-color: #d29922; background: rgba(210,153,34,0.08); }
.aip-task-id { font-size: 11px; min-width: 52px; font-family: 'JetBrains Mono', monospace; color: #8b949e; }
.aip-task-row.done .aip-task-id { color: #3fb950; }
.aip-task-row.active .aip-task-id { color: #d29922; }
.aip-task-name { font-size: 12px; color: #c9d1d9; flex: 1; }
.aip-task-row.pending .aip-task-name { color: #484f58; }
.aip-task-progress { width: 80px; height: 3px; background: #21262d; border-radius: 2px; overflow: hidden; flex-shrink: 0; }
.aip-task-fill { height: 100%; background: #d29922; transition: width 0.3s; border-radius: 2px; }
.aip-task-fill.done { background: #3fb950; }
.aip-task-time { font-size: 10px; color: #484f58; font-family: 'JetBrains Mono', monospace; min-width: 50px; text-align: right; }
.aip-task-log {
  margin-top: 6px; padding-top: 6px; border-top: 1px solid #21262d;
  font-size: 11px; color: #484f58; font-family: 'JetBrains Mono', monospace;
}

/* Human-in-the-Loop */
.aip-hil {
  background: #161b22; border-top: 2px solid #d29922; padding: 14px 20px;
  flex-shrink: 0; animation: fadeUp 0.2s ease;
}
.aip-hil-top { display: flex; align-items: center; gap: 12px; margin-bottom: 10px; }
.aip-hil-badge {
  font-size: 10px; font-weight: 600; letter-spacing: 1px; color: #d29922;
  border: 1px solid rgba(210,153,34,0.4); padding: 2px 8px; border-radius: 3px;
  white-space: nowrap;
}
.aip-hil-info { flex: 1; }
.aip-hil-title { font-size: 13px; font-weight: 600; color: #e6edf3; }
.aip-hil-desc { font-size: 12px; color: #8b949e; margin-top: 2px; }
.aip-hil-countdown {
  font-family: 'JetBrains Mono', monospace; font-size: 20px; font-weight: 700;
  color: #d29922; min-width: 36px; text-align: center;
}
.aip-hil-countdown.urgent { color: #f85149; }
.aip-hil-progress { height: 3px; background: #21262d; border-radius: 2px; margin-bottom: 12px; overflow: hidden; }
.aip-hil-fill { height: 100%; background: #d29922; transition: width 1s linear; border-radius: 2px; }
.aip-hil-actions { display: flex; gap: 8px; }
.aip-hil-confirm {
  flex: 1; font-size: 13px; padding: 8px 20px; border-radius: 4px; cursor: pointer;
  font-weight: 600; color: #fff; background: #1a7f37; border: 1px solid #238636;
  transition: background 0.15s;
}
.aip-hil-confirm:hover { background: #238636; }
.aip-hil-abort {
  font-size: 13px; padding: 8px 20px; border-radius: 4px; cursor: pointer;
  font-weight: 500; color: #f85149; background: transparent; border: 1px solid #30363d;
  transition: all 0.15s;
}
.aip-hil-abort:hover { border-color: #f85149; }

/* Input */
.aip-input-area { border-top: 1px solid #21262d; padding: 10px 20px; background: #0d1117; flex-shrink: 0; }
.aip-quick-row { display: flex; gap: 6px; margin-bottom: 8px; flex-wrap: wrap; }
.aip-quick-btn {
  font-size: 12px; color: #8b949e; border: 1px solid #30363d; background: #161b22;
  padding: 5px 14px; border-radius: 16px; cursor: pointer; transition: all 0.15s;
}
.aip-quick-btn:hover:not(:disabled) { border-color: #58a6ff; color: #58a6ff; }
.aip-quick-btn:disabled { color: #30363d; cursor: not-allowed; }
.aip-input-row { display: flex; gap: 8px; }
.aip-input {
  flex: 1; background: #161b22; border: 1px solid #30363d; border-radius: 6px;
  padding: 10px 14px; color: #e6edf3; font-size: 13px; outline: none;
  font-family: 'Inter', sans-serif; transition: border-color 0.15s;
}
.aip-input:focus { border-color: #58a6ff; }
.aip-input::placeholder { color: #484f58; }
.aip-send {
  background: #238636; border: 1px solid #2ea043; color: #fff;
  padding: 0 24px; border-radius: 6px; cursor: pointer;
  font-size: 13px; font-weight: 600; transition: background 0.15s;
}
.aip-send:hover:not(:disabled) { background: #2ea043; }
.aip-send:disabled { background: #21262d; border-color: #30363d; color: #484f58; cursor: not-allowed; }

/* Scrollbar */
.aip-messages::-webkit-scrollbar { width: 6px; }
.aip-messages::-webkit-scrollbar-thumb { background: #30363d; border-radius: 3px; }
.aip-messages::-webkit-scrollbar-track { background: transparent; }

/* Animations */
@keyframes fadeUp { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
@keyframes slideDown { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }
@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
@keyframes dotPulse { 0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; } 40% { transform: scale(1); opacity: 1; } }
</style>

<style>
/* Global content classes used in v-html messages */
.aip-msg-inner { font-size: 13px; line-height: 1.8; }
.aip-msg-label {
  font-size: 11px; font-weight: 600; letter-spacing: 0.5px; color: #8b949e;
  margin-bottom: 6px; padding-bottom: 4px; border-bottom: 1px solid #21262d;
}
.aip-card-danger {
  background: rgba(248,81,73,0.05); border: 1px solid rgba(248,81,73,0.2);
  border-radius: 4px; padding: 10px 14px; margin: 6px 0;
}
.aip-card-success {
  background: rgba(63,185,80,0.05); border: 1px solid rgba(63,185,80,0.2);
  border-radius: 4px; padding: 10px 14px; margin: 6px 0;
}
.aip-alert-inline { display: flex; align-items: center; gap: 8px; padding: 2px 0; }
.alert-dot-inline {
  width: 6px; height: 6px; border-radius: 50%; background: #f85149;
  animation: pulse 1s infinite; flex-shrink: 0;
}
.hl-blue { color: #58a6ff; }
.hl-green { color: #3fb950; }
.hl-gold { color: #d29922; }
.hl-red { color: #f85149; }
.hl-red-dim { color: #f8877f; }
.hl-muted { color: #8b949e; }
.hl-dim { color: #484f58; }
</style>
