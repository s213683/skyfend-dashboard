// ── C2 Message Content · Openclaw Decision Engine ──
// All HTML content for AI responses, following Openclaw output format spec (Section 5)
// Format: ═══ [时间戳] 决策步骤 ─── 输入状态 → 推理过程 → 决策结果 → 下达指令

// ── 系统初始化 ──
export const MSG_SYSTEM_INIT = `
<div class="c2-section-label">系统就绪 · OPENCLAW 自动值守 AI</div>
<div class="c2-msg-text">
  Openclaw 自动值守 AI 已上线，当前任务：<span class="c2-hl">MISSION-G20-AIRPORT-001</span><br/>
  保护目标：指挥所核心区域 · 任务窗口：<span class="c2-hl">06:00Z – 22:00Z</span><br/><br/>
  已接入设备：<span class="c2-hl-green">3 / 3 在线</span> · 规则集版本：<span class="c2-hl">Openclaw V1.0</span><br/>
  COA 预案库已加载（A/B/C/D 四套方案）· ROE：<span class="c2-hl-yellow">半自动（指挥官确认）</span><br/><br/>
  <span class="c2-text-dim">系统处于</span> <span class="c2-hl-green">值守中</span> <span class="c2-text-dim">状态，持续监听 Spotter Pro 感知数据...</span><br/>
  <span class="c2-text-dim">威胁来临时将自动触发告警，无需人工干预。</span>
</div>`;

// ── R-01：威胁触发（自动告警）──
export const MSG_AUTO_ALERT = `
<div class="c2-alert-banner">
  <span class="c2-alert-icon">⚠</span>
  <span class="c2-alert-text">SPOTTER PRO 自动推送 · 射频异常 + 雷达新目标</span>
  <span class="c2-alert-rule">规则 R-01 触发</span>
</div>
<div class="c2-decision-block">
  <div class="c2-db-header">[R-01] 威胁触发规则 · 自动执行</div>
  <div class="c2-db-section">输入状态</div>
  <div class="c2-db-grid">
    <div class="c2-db-row"><span class="c2-db-key">射频信号</span><span class="c2-db-val c2-val-red">868MHz ELRS · 信号强度 -62dBm（阈值 -85dBm）✓</span></div>
    <div class="c2-db-row"><span class="c2-db-key">雷达状态</span><span class="c2-db-val c2-val-red">radar_track = "new" · DPH100-001 锁定 ✓</span></div>
    <div class="c2-db-row"><span class="c2-db-key">触发条件</span><span class="c2-db-val">rf_signal &gt; -85dBm AND radar_track = new → 满足</span></div>
  </div>
  <div class="c2-db-section">推理过程</div>
  <div class="c2-db-reasoning">
    → 射频强度 -62dBm，超过触发阈值 -85dBm，差值 +23dBm<br/>
    → 雷达状态 "new"，为首次发现目标<br/>
    → 双重条件满足，R-01 触发，创建威胁实体，初始化 threat_level = 2
  </div>
  <div class="c2-db-section">决策结果</div>
  <div class="c2-db-result">创建威胁实体 TARGET-001 · 初始威胁等级 2 · 启动威胁评估流程</div>
</div>`;

// ── R-02：威胁等级升级 + R-01 完整输出 ──
export const MSG_STEP1_THREAT = `
<div class="c2-decision-block">
  <div class="c2-db-header">[R-01 + R-02] 威胁感知 · 等级评估</div>
  <div class="c2-db-section">输入状态（Spotter Pro 感知数据）</div>
  <div class="c2-db-grid">
    <div class="c2-db-row"><span class="c2-db-key">target_id</span><span class="c2-db-val">TARGET-001</span></div>
    <div class="c2-db-row"><span class="c2-db-key">position</span><span class="c2-db-val">(lat:30.4521, lon:114.3872, alt:145m)</span></div>
    <div class="c2-db-row"><span class="c2-db-key">velocity</span><span class="c2-db-val c2-val-orange">speed=95km/h · heading=045°(NE)</span></div>
    <div class="c2-db-row"><span class="c2-db-key">rf_downlink</span><span class="c2-db-val">freq=5.8GHz · modulation=Digital · signal=-62dBm</span></div>
    <div class="c2-db-row"><span class="c2-db-key">rf_uplink</span><span class="c2-db-val c2-val-yellow">freq=868MHz · hop_pattern=ELRS（待 Tracer Air 回传确认）</span></div>
    <div class="c2-db-row"><span class="c2-db-key">radar_track</span><span class="c2-db-val c2-val-red">tracking ✓</span></div>
    <div class="c2-db-row"><span class="c2-db-key">eo_confirmed</span><span class="c2-db-val c2-val-yellow">unconfirmed（待视觉确认）</span></div>
    <div class="c2-db-row"><span class="c2-db-key">distance_km</span><span class="c2-db-val c2-val-red">2.3km（≤ 3km 阈值）</span></div>
  </div>
  <div class="c2-db-section">推理过程（R-02 等级升级规则）</div>
  <div class="c2-db-reasoning">
    → 距离 2.3km ≤ 3.0km 阈值 ✓<br/>
    → 航向 045°，指向指挥所，偏差 &lt; 30° ✓<br/>
    → radar_track = "tracking" AND rf_downlink 已确认 ✓<br/>
    → <strong>三条件全部满足 → threat_level 升级为 4（确认威胁）</strong>
  </div>
  <div class="c2-db-result">
    [威胁等级升级] TARGET-001 升级为等级 <span class="c2-val-orange">4</span> · 触发 COA 匹配
  </div>
</div>
<div class="c2-threat-entity">
  <div class="c2-threat-id">⚠ TARGET-001 · FPV 竞速机 · DroneThreat 对象已创建</div>
  <div class="c2-threat-sub">STF200-001 射频异常（868MHz ELRS）+ DPH100-001 雷达锁定 · 多传感器融合确认</div>
  <div class="c2-threat-grid">
    <div class="c2-threat-item"><div class="c2-label">目标类型</div><div class="c2-value c2-val-red">FPV 竞速机</div></div>
    <div class="c2-threat-item"><div class="c2-label">上行协议</div><div class="c2-value">ELRS · 868MHz</div></div>
    <div class="c2-threat-item"><div class="c2-label">坐标 (x,y,z)</div><div class="c2-value">(2340, 1820, 145)m</div></div>
    <div class="c2-threat-item"><div class="c2-label">速度 / 方位</div><div class="c2-value">95 km/h · NE 045°</div></div>
    <div class="c2-threat-item"><div class="c2-label">距指挥所</div><div class="c2-value c2-val-red">2.3 km ↗ 逼近中</div></div>
    <div class="c2-threat-item"><div class="c2-label">信号强度</div><div class="c2-value">-62 dBm</div></div>
  </div>
  <div class="c2-threat-level-row">
    <span class="c2-label">威胁等级</span>
    <div class="c2-threat-bars">
      <div class="c2-tbar c2-tbar-1"></div>
      <div class="c2-tbar c2-tbar-2"></div>
      <div class="c2-tbar c2-tbar-3"></div>
      <div class="c2-tbar c2-tbar-4"></div>
      <div class="c2-tbar"></div>
    </div>
    <span class="c2-val-orange c2-fw-bold">4 / 5 · 确认威胁</span>
  </div>
</div>`;

// ── R-03：COA 匹配 ──
export const MSG_STEP2_COA = `
<div class="c2-decision-block">
  <div class="c2-db-header">[R-03] COA 匹配规则</div>
  <div class="c2-db-section">输入状态</div>
  <div class="c2-db-grid">
    <div class="c2-db-row"><span class="c2-db-key">威胁等级</span><span class="c2-db-val c2-val-orange">4（确认威胁）</span></div>
    <div class="c2-db-row"><span class="c2-db-key">Tracer Air II</span><span class="c2-db-val c2-val-green">电量 87% · 状态就绪 ✓</span></div>
    <div class="c2-db-row"><span class="c2-db-key">Hunter Max</span><span class="c2-db-val c2-val-green">状态就绪 ✓</span></div>
    <div class="c2-db-row"><span class="c2-db-key">识别置信度</span><span class="c2-db-val c2-val-green">92%（≥ 60% 阈值）✓</span></div>
    <div class="c2-db-row"><span class="c2-db-key">友方白名单</span><span class="c2-db-val c2-val-green">频率特征不匹配，非友方 ✓</span></div>
  </div>
  <div class="c2-db-section">推理过程</div>
  <div class="c2-db-reasoning">
    → 威胁等级 = 4，排除 COA-B（仅等级5或Tracer Air不可用时触发）<br/>
    → Tracer Air 电量 87% ≥ 30% 阈值，状态就绪 ✓<br/>
    → Hunter Max 就绪 ✓<br/>
    → 识别置信度 92% ≥ 60%，排除 COA-D ✓<br/>
    → 目标非友方白名单，排除 SAFETY-1 约束 ✓<br/>
    → <strong>全部条件满足 → 选择 COA-A（标准杀伤链）</strong>
  </div>
  <div class="c2-db-result">[COA 匹配] 选择 COA-A，置信度 92%</div>
</div>
<div class="c2-coa-box">
  <div class="c2-coa-header">
    <div class="c2-coa-id">COA-A · 标准杀伤链</div>
    <div class="c2-confidence">置信度 92%</div>
  </div>
  <div class="c2-coa-desc">Tracer Air II 电侦引导 + Hunter Max 精准跟踪干扰</div>
  <div class="c2-coa-reason">
    ① 目标 FPV + ELRS 868MHz，SHH300 精准反制比 ≥3:1 ✓<br/>
    ② 868MHz 在 SHH300 覆盖频段 0.3~7.7GHz 内 ✓<br/>
    ③ 设备全就绪，具备完整杀伤链执行能力 ✓<br/>
    ④ 精准模式可避免宽带压制的附带干扰
  </div>
</div>
<div class="c2-text-dim c2-text-xs c2-mt-6">备选：COA-B（Tracer Air 不可用时降级）· COA-D（置信度 &lt; 60% 时人工介入）</div>`;

// ── R-04：TASK 生成（COA-A 展开，含安全约束检查）──
export const MSG_STEP3_TASKS = `
<div class="c2-decision-block">
  <div class="c2-db-header">[R-04] TASK 生成规则 · COA-A 展开</div>
  <div class="c2-db-section">安全约束检查（执行前置）</div>
  <div class="c2-db-grid">
    <div class="c2-db-row"><span class="c2-db-key">SAFETY-1 友方保护</span><span class="c2-db-val c2-val-green">频率不匹配白名单 · 通过 ✓</span></div>
    <div class="c2-db-row"><span class="c2-db-key">SAFETY-2 航路约束</span><span class="c2-db-val c2-val-green">Tracer Air 航路偏离 HunterMax 扇区 &gt; 30° · 通过 ✓</span></div>
    <div class="c2-db-row"><span class="c2-db-key">SAFETY-3 HunterMax 前置</span><span class="c2-db-val c2-val-yellow">上行频率待确认，HunterMax 暂缓开启（威胁等级 &lt; 5）</span></div>
  </div>
  <div class="c2-db-section">推理过程</div>
  <div class="c2-db-reasoning">
    → COA-A 分解为 7 个有序任务（含复位）<br/>
    → TASK-3 超时降级：60s 内未获上行频率 → 继续逼近至 200m（TASK-3B）<br/>
    → TASK-5 超时降级：60s 内目标未失控 → 切换 JAM_WIDEBAND<br/>
    → TASK-6 闭环验证：三模态全满足 → 威胁解除；120s 后仍不满足 → COA-D
  </div>
  <div class="c2-db-result">生成 7 个 TASK，已分配至对应 Asset，安全约束检查通过</div>
</div>
<div class="c2-text-secondary c2-text-xs c2-mb-8">COA-A 分解为 7 个有序行动，已分配至对应 Asset</div>
<div class="c2-task-list">
  <div class="c2-task-item">
    <div class="c2-task-num">TASK-1</div>
    <div class="c2-task-body">
      <div class="c2-task-title">Tracer Air II 起飞</div>
      <div class="c2-task-detail">Asset: STA200-001 · 航向 045°(NE) · 高度 max(150m, 145+30)=175m · 超时 30s → 切换 COA-B</div>
    </div>
  </div>
  <div class="c2-task-item">
    <div class="c2-task-num">TASK-2</div>
    <div class="c2-task-body">
      <div class="c2-task-title">跟随 Spotter Pro 引导坐标</div>
      <div class="c2-task-detail">Asset: STA200-001 · STF200 实时引导 · 飞行路径在 HunterMax 安全走廊内 · 直到距目标 ≤ 500m</div>
    </div>
  </div>
  <div class="c2-task-item">
    <div class="c2-task-num">TASK-3</div>
    <div class="c2-task-body">
      <div class="c2-task-title">上行链路侦测（ELINT）</div>
      <div class="c2-task-detail">Asset: STA200-001 · 距目标 ≤ 500m 时开启 · 超时 60s → TASK-3B（继续逼近至 200m）</div>
    </div>
  </div>
  <div class="c2-task-item">
    <div class="c2-task-num">TASK-4</div>
    <div class="c2-task-body">
      <div class="c2-task-title">Hunter Max 加载频率参数</div>
      <div class="c2-task-detail">Asset: SHH300-001 · 条件：rf_uplink.freq_mhz 已回传（非空）· 加载 868MHz + ELRS 跳频模式</div>
    </div>
  </div>
  <div class="c2-task-item">
    <div class="c2-task-num">TASK-5</div>
    <div class="c2-task-body">
      <div class="c2-task-title">Hunter Max 精准跟踪干扰</div>
      <div class="c2-task-detail">Asset: SHH300-001 · mode=TRACK · 预期 30s 内触发 Failsafe · 超时 60s → JAM_WIDEBAND</div>
    </div>
  </div>
  <div class="c2-task-item">
    <div class="c2-task-num">TASK-6</div>
    <div class="c2-task-body">
      <div class="c2-task-title">Spotter Pro 三模态闭环验证</div>
      <div class="c2-task-detail">Asset: STF200-001 · 验证：RF消失 + 雷达终止 + EO确认坠落 · 全满足→解除 · 120s未满足→COA-D</div>
    </div>
  </div>
  <div class="c2-task-item">
    <div class="c2-task-num">TASK-7</div>
    <div class="c2-task-body">
      <div class="c2-task-title">系统复位</div>
      <div class="c2-task-detail">JAM_STOP → Tracer Air RTH → Spotter Pro 恢复全域扫描 → 系统状态 → 值守中</div>
    </div>
  </div>
</div>`;

// ── 武器分配原子生成 ──
export const MSG_STEP4_ATOMS = `
<div class="c2-decision-block">
  <div class="c2-db-header">[R-05] 武器分配原子生成</div>
  <div class="c2-db-section">输入状态</div>
  <div class="c2-db-grid">
    <div class="c2-db-row"><span class="c2-db-key">COA</span><span class="c2-db-val">COA-A · 置信度 92%</span></div>
    <div class="c2-db-row"><span class="c2-db-key">设备状态</span><span class="c2-db-val c2-val-green">STA200-001 就绪(87%) | SHH300-001 就绪 ✓</span></div>
    <div class="c2-db-row"><span class="c2-db-key">ROE 授权</span><span class="c2-db-val c2-val-yellow">ROE-2025-G20-042 · 半自动 · 指挥官已确认</span></div>
  </div>
  <div class="c2-db-section">推理过程</div>
  <div class="c2-db-reasoning">
    → TASK-1~7 转换为 8 条时序原子指令<br/>
    → T+0s 起飞，T+5s 开始跟踪，T+45s 进入 ELINT 距离后开启侦测<br/>
    → T+75s 上行频率回传，HunterMax 加载参数并立即开始精准干扰<br/>
    → T+90s 闭环验证，T+105s 确认击落后 JAM_STOP，T+106s RTH
  </div>
  <div class="c2-db-result">生成 8 条 Weapon-Task-Atom，等待执行</div>
</div>
<div class="c2-roe-badge">⚖ ROE-2025-G20-042 · 半自动授权 · 指挥官已确认</div>
<div class="c2-atom-list">
  <div class="c2-atom-item"><span class="c2-atom-time">[T+0s]</span><span class="c2-atom-id">ATOM-001</span><span class="c2-atom-dev">STA200-001</span><span class="c2-atom-cmd">TAKEOFF</span><span class="c2-atom-params">heading=045°, alt=175m</span></div>
  <div class="c2-atom-item"><span class="c2-atom-time">[T+5s]</span><span class="c2-atom-id">ATOM-002</span><span class="c2-atom-dev">STA200-001</span><span class="c2-atom-cmd">FOLLOW_TARGET</span><span class="c2-atom-params">target_id=TARGET-001, guide=STF200-001</span></div>
  <div class="c2-atom-item"><span class="c2-atom-time">[T+45s]</span><span class="c2-atom-id">ATOM-003</span><span class="c2-atom-dev">STA200-001</span><span class="c2-atom-cmd">ELINT_START</span><span class="c2-atom-params">band=0.4~6GHz, mode=SCAN, timeout=60s</span></div>
  <div class="c2-atom-item"><span class="c2-atom-time">[T+75s]</span><span class="c2-atom-id">ATOM-004</span><span class="c2-atom-dev">SHH300-001</span><span class="c2-atom-cmd">LOAD_FREQ</span><span class="c2-atom-params">freq=868MHz, hop=ELRS, mode=TRACK</span></div>
  <div class="c2-atom-item"><span class="c2-atom-time">[T+76s]</span><span class="c2-atom-id">ATOM-005</span><span class="c2-atom-dev">SHH300-001</span><span class="c2-atom-cmd">JAM_START</span><span class="c2-atom-params">power=200W, mode=SurgicalStrike, timeout=60s→WIDEBAND</span></div>
  <div class="c2-atom-item"><span class="c2-atom-time">[T+90s]</span><span class="c2-atom-id">ATOM-006</span><span class="c2-atom-dev">STF200-001</span><span class="c2-atom-cmd">VERIFY_KILL</span><span class="c2-atom-params">target_id=TARGET-001, mode=TRIMODAL, timeout=120s→COA-D</span></div>
  <div class="c2-atom-item"><span class="c2-atom-time">[T+105s]</span><span class="c2-atom-id">ATOM-007</span><span class="c2-atom-dev">SHH300-001</span><span class="c2-atom-cmd">JAM_STOP</span><span class="c2-atom-params">condition=KILL_VERIFIED</span></div>
  <div class="c2-atom-item"><span class="c2-atom-time">[T+106s]</span><span class="c2-atom-id">ATOM-008</span><span class="c2-atom-dev">STA200-001</span><span class="c2-atom-cmd">RTH</span><span class="c2-atom-params">mode=AUTO, restore=STANDBY</span></div>
</div>`;

// ── 威胁解除 + 系统复位 ──
export const MSG_ACCOMPLISHED = `
<div class="c2-decision-block">
  <div class="c2-db-header">[TASK-6] 闭环验证 · 威胁解除确认</div>
  <div class="c2-db-section">三模态验证结果</div>
  <div class="c2-db-grid">
    <div class="c2-db-row"><span class="c2-db-key">EO/IR 确认</span><span class="c2-db-val c2-val-green">eo_confirmed = "confirmed" · 目标坠落 ✓</span></div>
    <div class="c2-db-row"><span class="c2-db-key">RF 信号</span><span class="c2-db-val c2-val-green">rf_downlink &lt; -95dBm · 持续 12s ✓</span></div>
    <div class="c2-db-row"><span class="c2-db-key">雷达轨迹</span><span class="c2-db-val c2-val-green">radar_track 速度 &lt; 2km/h · 持续 11s ✓</span></div>
    <div class="c2-db-row"><span class="c2-db-key">验证结论</span><span class="c2-db-val c2-val-green">三模态全部满足 → 威胁解除</span></div>
  </div>
</div>
<div class="c2-accomplished">
  <div class="c2-accomplished-icon">✓</div>
  <div class="c2-accomplished-title">TARGET NEUTRALIZED</div>
  <div class="c2-accomplished-detail">
    RF信号消失 · 雷达轨迹终止 · 光电确认目标坠落<br/>
    TARGET-001 · 处置完成 · 总耗时 107s<br/>
    ATOM-008 RTH 已下达 · 系统复位中
  </div>
  <div class="c2-accomplished-log">
    ROE-2025-G20-042 审计日志已写入 · 8 条 Atom 执行完毕<br/>
    Tracer Air II 返航充电 · Hunter Max 恢复 Standby · Spotter Pro 恢复全域扫描<br/>
    <span style="color:#00e5ff">系统状态 → 值守中</span>
  </div>
</div>`;

// ── COA-D：人工介入请求 ──
export const MSG_COA_D = `
<div class="c2-decision-block c2-db-warn">
  <div class="c2-db-header c2-db-header-warn">[COA-D] 人工介入请求</div>
  <div class="c2-db-section">触发原因</div>
  <div class="c2-db-grid">
    <div class="c2-db-row"><span class="c2-db-key">识别置信度</span><span class="c2-db-val c2-val-red">54%（&lt; 60% 阈值）</span></div>
    <div class="c2-db-row"><span class="c2-db-key">目标特征</span><span class="c2-db-val c2-val-yellow">频率特征部分匹配友方白名单，无法确认</span></div>
    <div class="c2-db-row"><span class="c2-db-key">自主执行</span><span class="c2-db-val c2-val-red">已暂停</span></div>
  </div>
  <div class="c2-db-section">推理过程</div>
  <div class="c2-db-reasoning">
    → 识别置信度 54% &lt; 60% 阈值，无法确认是否为威胁<br/>
    → 目标频率特征与 FRIENDLY-002 部分重叠，触发 SAFETY-1 友方保护<br/>
    → 依据 R-03 规则，选择 COA-D（人工介入）<br/>
    → 已暂停所有自主打击行为，等待操作员确认
  </div>
  <div class="c2-db-result c2-db-result-warn">[COA 匹配] 识别置信度不足，请求人工介入</div>
</div>
<div class="c2-warn-note">
  ⚠ <strong>操作员请注意</strong>：目标 TARGET-002 识别置信度 54%，疑似友方无人机。<br/>
  请确认后选择：<strong>确认为威胁 → 恢复 COA-A 自主执行</strong> | <strong>确认为友方 → 加入白名单，切换 COA-C 监视</strong>
</div>`;

// ── 安全约束触发消息 ──
export const MSG_SAFETY_TRIGGERED = (safetyId: string, detail: string) => `
<div class="c2-decision-block c2-db-safety">
  <div class="c2-db-header c2-db-header-safety">[${safetyId}] 安全约束触发 · 最高优先级</div>
  <div class="c2-db-reasoning">${detail}</div>
</div>`;

// ── 设备状态报告 ──
export const MSG_DEVICE_STATUS = `
<div class="c2-section-label">设备状态 · ASSET STATUS REPORT</div>
<div class="c2-device-table">
  <div class="c2-dt-header"><span>设备</span><span>型号</span><span>状态</span><span>关键参数</span></div>
  <div class="c2-dt-row"><span class="c2-dt-name">Spotter Pro</span><span class="c2-dt-model">STF200</span><span class="c2-status-online">ONLINE</span><span>RF + 雷达 + EO/IR 三模态 · 侵测范围 ≥3km · 全域扫描中</span></div>
  <div class="c2-dt-row"><span class="c2-dt-name">Tracer Air II</span><span class="c2-dt-model">STA200</span><span class="c2-status-standby">STANDBY</span><span>电量 87%（≥30% 可执行 COA-A）· 电侵有效距离 500m · 续航 40min</span></div>
  <div class="c2-dt-row"><span class="c2-dt-name">HunterMax</span><span class="c2-dt-model">SHH300</span><span class="c2-status-standby">STANDBY</span><span>0.3~7.7GHz · 精准/宽带双模 · ≥20W · 等待上行频率参数</span></div>
</div>
<div class="c2-text-dim c2-text-xs c2-mt-6">Tracer Air II 电量 87% · 满足 COA-A 执行条件（阈値 30%）· 3 台设备通信正常</div>`;

// ── COA 预案库 ──
export const MSG_COA_LIBRARY = `
<div class="c2-section-label">COA 预案库 · COURSE OF ACTION LIBRARY (Openclaw V1.0)</div>
<div class="c2-coa-box c2-mb-8">
  <div class="c2-coa-header"><div class="c2-coa-id">COA-A · 标准杀伤链</div><div class="c2-coa-tag">威胁等级 4</div></div>
  <div class="c2-coa-desc">Tracer Air II 电侦引导 + Hunter Max 精准跟踪干扰</div>
  <div class="c2-coa-reason">适用：威胁等级 4，Tracer Air 电量 ≥ 30% 就绪，Hunter Max 就绪，识别置信度 ≥ 60%</div>
</div>
<div class="c2-coa-box c2-coa-box-warn c2-mb-8">
  <div class="c2-coa-header"><div class="c2-coa-id c2-val-yellow">COA-B · 宽带压制（降级）</div><div class="c2-coa-tag">威胁等级 5 / Tracer Air 不可用</div></div>
  <div class="c2-coa-desc">仅 Hunter Max 宽带区域压制（2.4GHz / 5.8GHz / GPS）</div>
  <div class="c2-coa-reason">适用：威胁等级 5（时间不足）或 Tracer Air 电量 &lt; 30% / 故障。注意：可能影响周边无线设备</div>
</div>
<div class="c2-coa-box c2-coa-box-dim c2-mb-8">
  <div class="c2-coa-header"><div class="c2-coa-id c2-text-secondary">COA-C · 持续监视</div><div class="c2-coa-tag">威胁等级 ≤ 2</div></div>
  <div class="c2-coa-desc">不干预，持续监视跟踪，每 30s 重新评估</div>
  <div class="c2-coa-reason">适用：威胁等级 ≤ 2，或目标已识别为友方，或轨迹远离指挥所。等级升至 3 → 预热 Tracer Air；升至 4 → 立即切换 COA-A</div>
</div>
<div class="c2-coa-box c2-coa-box-red">
  <div class="c2-coa-header"><div class="c2-coa-id c2-val-red">COA-D · 人工介入请求</div><div class="c2-coa-tag">识别置信度 &lt; 60%</div></div>
  <div class="c2-coa-desc">暂停自主执行，向操作员发送告警，等待人工确认</div>
  <div class="c2-coa-reason">适用：置信度 &lt; 60% / 疑似友方 / 连续 2 次闭环验证失败 / 触发 SAFETY-4 熔断</div>
</div>`;

// ── 自动值守状态消息 ──
export const MSG_WATCHING = `
<div class="c2-section-label">值守中 · STANDBY WATCHING</div>
<div class="c2-msg-text">
  <span class="c2-hl-green">● 系统值守中</span><br/>
  Spotter Pro STF200-001 全域扫描模式 · 持续监听射频 + 雷达数据<br/>
  Hunter Max 待机 · Tracer Air II 待机（电量 87%）<br/><br/>
  <span class="c2-text-dim">威胁来临时将自动触发 R-01 规则，无需人工操作。</span>
</div>`;

// ── 旧的适应分消息（保留兼容，但不在主流程中使用）──
export const MSG_STEP4_FITNESS = MSG_STEP4_ATOMS; // 重定向到原子生成

// ── 旧的步骤5消息（兼容）──
export const MSG_STEP5_ATOMS = MSG_STEP4_ATOMS;

export const MSG_SWARM_THREAT = `
<div class="c2-section-label">蜂群威胁评估 · SWARM THREAT ASSESSMENT</div>
<div class="c2-threat-entity c2-threat-entity-red">
  <div class="c2-threat-id c2-val-red">⚠ SWARM-001 · 多目标蜂群威胁</div>
  <div class="c2-threat-grid">
    <div class="c2-threat-item"><div class="c2-label">目标数量</div><div class="c2-value c2-val-red">12 架次</div></div>
    <div class="c2-threat-item"><div class="c2-label">编队方式</div><div class="c2-value">分散阵型</div></div>
    <div class="c2-threat-item"><div class="c2-label">威胁等级</div><div class="c2-value c2-val-red">5 / 5</div></div>
  </div>
</div>
<div class="c2-coa-box c2-coa-box-red c2-mt-8">
  <div class="c2-coa-header"><div class="c2-coa-id c2-val-red">推荐 COA-B · 宽带区域压制</div><div class="c2-confidence">置信度 89%</div></div>
  <div class="c2-coa-desc">Hunter Max SHH300 全向宽带压制 + Sniper STJ100 跳频精准打击协同</div>
  <div class="c2-coa-reason">理由：蜂群场景威胁等级 5，R-03 规则直接选择 COA-B（无需等待 Tracer Air）。SHH300 具备 AreaDenial + SwarmCountermeasure 能力，360°覆盖，各频段 ≥200W 输出。</div>
</div>
<div class="c2-warn-note">⚠ 注意：COA-B 宽带压制可能影响周边无线设备，建议确认 ROE 授权后执行。</div>`;
