<script setup lang="ts">
/**
 * PhysicalAgentBar — Palantir AIP 风格设备卡片区
 * 三台 Physical Agent 设备横向排列
 */
import { ref } from 'vue';
import type { Device } from '../lib/c2-data';

defineProps<{ devices: Device[] }>();

const openDevice = ref<Device | null>(null);

const ONTOLOGY: Record<string, {
  role: string;
  desc: string;
  capabilities: { label: string; value: string }[];
  interfaces: { label: string; value: string }[];
  constraints: { label: string; value: string }[];
  atoms: string[];
}> = {
  'STF200-001': {
    role: 'Sensor / Verifier',
    desc: 'Spotter Pro 是系统的感知核心，集成射频（RF）、毫米波雷达、光电/红外（EO/IR）三模态传感器，承担全域扫描、目标发现、引导定位与闭环验证职责。',
    capabilities: [
      { label: 'RF 侦测', value: '0.4~6GHz 全频段扫描，灵敏度 -85dBm，识别调制方式' },
      { label: '雷达探测', value: 'X波段，探测距离 ≥3km，跟踪 ≥30 目标，速度精度 ±0.5m/s' },
      { label: 'EO/IR 识别', value: '光电/红外双模，目标分类置信度输出，夜视能力' },
      { label: '三模态融合', value: 'RF + 雷达 + EO/IR 数据融合，输出 DroneThreat 对象' },
    ],
    interfaces: [
      { label: '输出协议', value: 'DroneThreat JSON → Openclaw 决策引擎' },
      { label: '推送频率', value: '实时推送，刷新率 10Hz' },
      { label: '引导接口', value: '向 Tracer Air II 推送目标三维坐标 + 速度矢量' },
    ],
    constraints: [
      { label: '工作温度', value: '-20°C ~ +55°C' },
      { label: '安全约束', value: 'SAFETY-1：友方目标白名单过滤' },
      { label: '验证超时', value: 'VERIFY_KILL 超时 120s → 触发 COA-D' },
    ],
    atoms: ['SCAN_START', 'SCAN_RESUME', 'TRACK_TARGET', 'VERIFY_KILL', 'REPORT_THREAT'],
  },
  'STA200-001': {
    role: 'Scout / ELINT Collector',
    desc: 'Tracer Air II 是系统的空中侦察单元，搭载电子侦察（ELINT）模块，负责接收 Spotter Pro 引导坐标后起飞逼近目标，在有效距离内侦测无人机上行链路频率，并将频率参数回传给 HunterMax。',
    capabilities: [
      { label: 'ELINT 侦测', value: '0.4~6GHz 全频段扫描，上行链路识别，有效距离 500m' },
      { label: '飞行性能', value: '最大速度 120km/h，续航 40min，最大高度 500m AGL' },
      { label: '引导跟踪', value: '接收 Spotter Pro 实时坐标引导，动态更新航点' },
      { label: '安全走廊', value: '全程飞行于 HunterMax 打击扇区外的安全走廊内' },
    ],
    interfaces: [
      { label: '输入', value: 'Spotter Pro 目标坐标 (lat, lon, alt) + 速度矢量' },
      { label: '输出', value: 'rf_uplink.freq_mhz → HunterMax LOAD_FREQ 参数' },
      { label: '控制接口', value: 'Openclaw ATOM 指令：TAKEOFF / FOLLOW_TARGET / ELINT_START / RTH' },
    ],
    constraints: [
      { label: '执行条件', value: '电量 ≥ 30% 方可执行 COA-A（低于则触发 COA-B 降级）' },
      { label: '安全约束', value: 'SAFETY-2：飞行路径不得进入 HunterMax 干扰扇区' },
      { label: '降级条件', value: '电量 < 30% 或设备故障 → 系统自动切换 COA-B' },
    ],
    atoms: ['TAKEOFF', 'FOLLOW_TARGET', 'ELINT_START', 'ELINT_STOP', 'RTH', 'HOVER'],
  },
  'SHH300-001': {
    role: 'Effector / Jammer',
    desc: 'HunterMax 是系统的打击执行单元，支持精准跟踪干扰和宽带区域压制双模式。接收 Tracer Air II 回传的上行频率参数后，对目标遥控链路实施精准压制，迫使无人机触发 Failsafe（降落/返航/失控）。',
    capabilities: [
      { label: '精准干扰', value: '针对特定频率（如 868MHz ELRS），功率 ≥200W，跟踪跳频' },
      { label: '宽带压制', value: '2.4GHz / 5.8GHz / GPS 全频段区域压制（COA-B 模式）' },
      { label: '频率覆盖', value: '0.3~7.7GHz，支持 ELRS / DJI OcuSync / FPV 等主流协议' },
      { label: '方向性', value: '定向 + 全向可切换，最大作用距离 3km' },
    ],
    interfaces: [
      { label: '输入', value: 'Tracer Air II rf_uplink.freq_mhz 参数 → LOAD_FREQ 指令' },
      { label: '控制接口', value: 'Openclaw ATOM 指令：LOAD_FREQ / JAM_START / JAM_STOP' },
      { label: '反馈', value: '实时输出干扰功率、目标信号强度变化至 Spotter Pro 验证' },
    ],
    constraints: [
      { label: '安全约束', value: 'SAFETY-3：干扰前需 ROE 授权确认' },
      { label: '熔断机制', value: 'SAFETY-4：连续 2 次验证失败 → 停止干扰，触发 COA-D' },
      { label: '附带损伤', value: 'COA-B 宽带模式可能影响周边无线设备，需 ROE 特别授权' },
    ],
    atoms: ['LOAD_FREQ', 'JAM_START', 'JAM_STOP', 'WIDEBAND_START', 'WIDEBAND_STOP'],
  },
};

function getStatusColor(status: string): string {
  const map: Record<string, string> = {
    ONLINE: '#3fb950', STANDBY: '#d29922', ENGAGING: '#f85149', RETURNING: '#58a6ff', FAULT: '#484f58',
  };
  return map[status] || '#8b949e';
}

function getStatusIcon(status: string): string {
  const map: Record<string, string> = {
    ONLINE: '●', STANDBY: '◐', ENGAGING: '◉', RETURNING: '↺', FAULT: '✕',
  };
  return map[status] || '○';
}
</script>

<template>
  <div class="pa-bar">
    <div
      v-for="device in devices"
      :key="device.id"
      class="pa-card"
      :class="{ engaging: device.status === 'ENGAGING' }"
      @click="openDevice = device"
    >
      <div class="pa-card-top">
        <div class="pa-status-dot" :style="{ background: getStatusColor(device.status) }"></div>
        <span class="pa-card-name">{{ device.name }}</span>
        <span class="pa-status-tag" :style="{ color: getStatusColor(device.status), borderColor: getStatusColor(device.status) + '55' }">
          {{ getStatusIcon(device.status) }} {{ device.status }}
        </span>
      </div>
      <div class="pa-card-body">
        <div class="pa-kv">
          <span class="pa-k">型号</span>
          <span class="pa-v">{{ device.model }}</span>
        </div>
        <div class="pa-kv">
          <span class="pa-k">{{ device.metric }}</span>
          <span class="pa-v pa-v-hl">{{ device.metricValue }}</span>
        </div>
        <div class="pa-kv">
          <span class="pa-k">状态</span>
          <span class="pa-v pa-v-detail">{{ device.detail }}</span>
        </div>
      </div>
    </div>
  </div>

  <!-- Ontology Modal -->
  <Teleport to="body">
    <div v-if="openDevice" class="ont-overlay" @click="openDevice = null">
      <div class="ont-modal" @click.stop>
        <div class="ont-header">
          <div class="ont-header-left">
            <div class="ont-status-dot" :style="{ background: getStatusColor(openDevice.status) }"></div>
            <div>
              <div class="ont-name">{{ openDevice.name }}</div>
              <div class="ont-model">{{ openDevice.model }} · {{ openDevice.id }}</div>
            </div>
            <span class="ont-role-tag">{{ ONTOLOGY[openDevice.id]?.role }}</span>
            <span class="ont-status-tag" :style="{ color: getStatusColor(openDevice.status), borderColor: getStatusColor(openDevice.status) + '55' }">{{ openDevice.status }}</span>
          </div>
          <button class="ont-close" @click="openDevice = null">✕</button>
        </div>

        <div class="ont-desc">{{ ONTOLOGY[openDevice.id]?.desc }}</div>

        <div v-for="sec in [
          { title: 'CAPABILITIES', items: ONTOLOGY[openDevice.id]?.capabilities || [] },
          { title: 'INTERFACES', items: ONTOLOGY[openDevice.id]?.interfaces || [] },
          { title: 'CONSTRAINTS', items: ONTOLOGY[openDevice.id]?.constraints || [] },
        ]" :key="sec.title" class="ont-section">
          <div class="ont-sec-title">{{ sec.title }}</div>
          <div v-for="item in sec.items" :key="item.label" class="ont-row">
            <span class="ont-row-k">{{ item.label }}</span>
            <span class="ont-row-v">{{ item.value }}</span>
          </div>
        </div>

        <div class="ont-section">
          <div class="ont-sec-title">WEAPON-TASK-ATOMS</div>
          <div class="ont-atoms">
            <span v-for="a in ONTOLOGY[openDevice.id]?.atoms || []" :key="a" class="ont-atom">{{ a }}</span>
          </div>
        </div>

        <div class="ont-footer">AI 生成内容 — 需人工审核确认</div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.pa-bar {
  display: flex; gap: 1px; padding: 0; flex-shrink: 0;
  background: #21262d;
}
.pa-card {
  flex: 1; background: #161b22; padding: 12px 16px; cursor: pointer;
  transition: background 0.15s; border-bottom: 2px solid transparent;
}
.pa-card:hover { background: #1c2128; }
.pa-card.engaging { border-bottom-color: #f85149; }
.pa-card-top {
  display: flex; align-items: center; gap: 8px; margin-bottom: 8px;
}
.pa-status-dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }
.pa-card-name {
  font-weight: 600; font-size: 13px; color: #e6edf3; flex: 1;
}
.pa-status-tag {
  font-size: 11px; padding: 1px 8px; border: 1px solid; border-radius: 3px;
  font-family: 'JetBrains Mono', monospace; font-weight: 500; letter-spacing: 0.3px;
}
.pa-card-body { display: flex; flex-direction: column; gap: 3px; }
.pa-kv { display: flex; align-items: baseline; gap: 8px; font-size: 12px; }
.pa-k { color: #8b949e; min-width: 56px; flex-shrink: 0; }
.pa-v { color: #c9d1d9; }
.pa-v-hl { color: #58a6ff; font-family: 'JetBrains Mono', monospace; font-weight: 600; }
.pa-v-detail { color: #8b949e; font-size: 11px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

/* Ontology Modal */
.ont-overlay {
  position: fixed; inset: 0; background: rgba(1,4,9,0.85); z-index: 9999;
  display: flex; align-items: center; justify-content: center;
  animation: fadeIn 0.15s ease;
}
.ont-modal {
  background: #161b22; border: 1px solid #30363d; border-radius: 6px;
  width: 680px; max-height: 82vh; overflow: auto; padding: 24px;
}
.ont-header {
  display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px;
}
.ont-header-left { display: flex; align-items: center; gap: 12px; }
.ont-status-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
.ont-name { font-size: 16px; font-weight: 700; color: #e6edf3; }
.ont-model { font-size: 12px; color: #8b949e; margin-top: 2px; }
.ont-role-tag {
  font-size: 11px; padding: 2px 8px; border: 1px solid #30363d; border-radius: 3px;
  color: #58a6ff; background: rgba(88,166,255,0.08);
}
.ont-status-tag {
  font-size: 11px; padding: 2px 8px; border: 1px solid; border-radius: 3px;
  font-family: 'JetBrains Mono', monospace;
}
.ont-close {
  background: transparent; border: 1px solid #30363d; color: #8b949e;
  padding: 4px 12px; cursor: pointer; border-radius: 4px; font-size: 14px;
  transition: all 0.15s;
}
.ont-close:hover { border-color: #8b949e; color: #e6edf3; }
.ont-desc {
  font-size: 13px; color: #c9d1d9; line-height: 1.7; margin-bottom: 20px;
  padding: 12px 16px; background: #0d1117; border-left: 3px solid #30363d; border-radius: 4px;
}
.ont-section { margin-bottom: 16px; }
.ont-sec-title {
  font-size: 11px; font-weight: 600; letter-spacing: 1.5px; color: #8b949e;
  margin-bottom: 8px; padding-bottom: 6px; border-bottom: 1px solid #21262d;
}
.ont-row {
  display: flex; gap: 12px; margin-bottom: 6px; font-size: 13px; padding: 4px 0;
}
.ont-row-k { color: #8b949e; min-width: 100px; flex-shrink: 0; }
.ont-row-v { color: #e6edf3; flex: 1; }
.ont-atoms { display: flex; flex-wrap: wrap; gap: 6px; }
.ont-atom {
  font-size: 12px; color: #3fb950; border: 1px solid rgba(63,185,80,0.3);
  padding: 3px 10px; border-radius: 3px; background: rgba(63,185,80,0.06);
  font-family: 'JetBrains Mono', monospace;
}
.ont-footer {
  margin-top: 16px; padding-top: 12px; border-top: 1px solid #21262d;
  font-size: 11px; color: #484f58; text-align: center;
}

/* Scrollbar */
.ont-modal::-webkit-scrollbar { width: 4px; }
.ont-modal::-webkit-scrollbar-thumb { background: #30363d; border-radius: 2px; }

@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
</style>
