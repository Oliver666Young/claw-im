数据收集完毕，现在整理输出报告。

---

# AI + 放置类/增量游戏 研究报告

---

## Section A: AI 技术在放置类游戏中的应用场景

### A1. AI 生成内容 (PCG / Procedural Content Generation)

放置类游戏的核心循环高度依赖**大量可消耗内容**（关卡、装备、敌人、地图），传统手工设计无法支撑玩家长期留存的内容消耗速度。AI 驱动的 PCG 正在系统性解决这一瓶颈。

**关卡与地图自动生成：** 2025-2026 年，生成式 AI 已从"随机拼接"进化到"带设计意图的生成"——关卡可以自适应、持续演化，且每次体验不重复。新兴技术如神经网络辅助的世界生成，可以在保持风格一致性的同时提供新颖的排列组合。据 [ThinkGamerZ](https://www.thinkgamerz.com/procedural-content-generation-genai-ai-level-design/) 报告，Gen AI 在关卡设计中已能产出"具有意图的关卡"。

**装备与道具生成：** 放置类游戏的装备系统通常需要海量数值组合。AI 模型可以根据已有装备数据分布，自动生成新装备的属性组合、稀有度分布和视觉描述，同时保证数值平衡。据 [Sparkco](https://sparkco.ai/blog/gemini-3-for-game-development) 的数据，Gemini 3 等模型可**减少初始美术资产迭代 40-70%**，在基准测试中**削减手动建模工作量 55%**。

**敌人与 Boss 生成：** AI 可以根据玩家当前进度和阵容配置，动态生成具有针对性技能组合的敌人，避免后期内容单一化。

**行业采纳率：** 截至 2025 年，Steam 上已有超过 7,300 款游戏披露使用了 AI，较 2024 年翻倍。约 **50% 的游戏工作室已在开发中积极使用 AI**（[Playgama](https://playgama.com/blog/uncategorized/crafting-engaging-games-master-procedural-content-generation/)）。但同时也出现了"gameslop"现象——低质量 AI 拼凑游戏泛滥，GDC 2026 报告显示 52% 的游戏从业者对生成式 AI 持负面看法。

---

### A2. AI 驱动的经济系统平衡

放置类游戏经济系统的核心挑战是**后期通胀**：玩家数值指数级增长导致产出/消耗比失衡。

**实时监控与动态调参：** AI 系统可实时监控游戏内货币流通量、资源分布和玩家行为，自动调整掉落率以防止后期超通胀。据 ACM CHI Play 2023 发表的论文 [《Beyond Equilibrium》](https://dl.acm.org/doi/10.1145/3573382.3616092)，利用 AI Agent 进行游戏经济平衡已成为学术研究热点。

**具体应用场景：**
- **产出/消耗比动态调整：** 根据服务器整体经济数据，AI 实时微调每个关卡的金币、经验、道具产出
- **通胀预警系统：** 通过时间序列预测模型，提前 72 小时预警经济系统异常
- **个性化经济体验：** 根据玩家付费档位和游戏进度，提供差异化的资源获取路径

**量化效果：** 据 [BusinessManagementEconomics](https://businessmanagementeconomics.org/ai-game-economy-systems-balancing-virtual-marketplaces-effectively/) 的分析，AI 分析玩家消费习惯后进行智能推荐，可提升游戏内购买量约 **30%**。某位设计过 1.5 亿美元级游戏经济的资深设计师也指出，AI 正在成为经济系统设计的标配工具（[Medium](https://medium.com/@wiserax2037/i-designed-economies-for-150m-games-heres-my-ultimate-handbook-de6212e95759)）。

---

### A3. 智能 NPC / AI 代理

放置类游戏的核心机制是"玩家离线时游戏继续运行"，这天然需要 AI Agent 来代替玩家决策。

**自动配队与技能选择：** AI Agent 可以学习玩家的偏好阵容和技能搭配习惯，在离线期间做出接近玩家风格的决策。NVIDIA ACE 技术已在 PUBG、NARAKA 等游戏中部署自主同伴系统——AI 队友可以搜刮装备、参与战斗、提供战术建议（[NVIDIA](https://www.nvidia.com/en-us/geforce/news/nvidia-ace-autonomous-ai-companions-pubg-naraka-bladepoint/)）。

**技术进展：**
- PUBG Ally 使用 **Mistral-Nemo-Minitron-8B** 小语言模型，让 AI 队友能使用游戏术语交流、提供实时战略建议
- AI NPC 市场估值 2025 年约 **5 亿美元**，预计 CAGR 25%（[TechLife](https://techlife.blog/posts/ai-npcs-gaming-2025/)）
- 端侧小模型可在不联网的情况下处理信息、做出战略决策

**在放置类游戏中的特殊价值：** 相比其他品类，放置类游戏对 AI 代理的需求最为刚性——玩家 90% 以上的时间处于离线状态，AI 代理的决策质量直接决定了玩家回归时的体验满意度。

---

### A4. 个性化体验

**动态难度调节 (DDA)：** AI 实时分析玩家行为和偏好，动态调整游戏难度、叙事分支和奖励节奏，以维持持续的心流体验。据 ACM MuC 2025 的研究（[ACM](https://dl.acm.org/doi/10.1145/3743049.3743070)），最新的 DDA 框架整合了游戏遥测数据、生物传感器数据和人格画像来分类玩家行为。

**推荐系统：** AI 驱动的推荐系统可定制任务、奖励和游戏内容，创造有机的渐进式体验。具体到放置类游戏：
- 如 Eternity: Idle Realms 使用持久化 AI Agent 根据玩家风格调整任务频率、战利品类型和难度
- 根据玩家画像推荐最优挂机策略和阵容搭配

**量化成果：**
- Accenture 研究显示，个性化游戏体验可**提升玩家留存率高达 30%**（[Gamelight](https://www.gamelight.io/post/the-role-of-ai-in-enhancing-player-personalization-in-mobile-games)）
- 但需警惕"过滤气泡效应"——过度个性化可能限制玩家体验的多样性

---

### A5. AI 辅助游戏设计

**LLM 生成任务文本与剧情：**
- [GamePlot](https://nhsjs.com/2025/llms-for-video-games-narrative-generation/) 基于 GPT-3.5-turbo，协助设计师创建、测试和完善回合制游戏叙事
- GenQuest 通过 LLM 动态生成"选择你的冒险"风格叙事（[arXiv](https://arxiv.org/abs/2510.04498)）
- LIGS 系统在涌现式叙事中展示了 LLM 的潜力（[ACM CHI 2025](https://dl.acm.org/doi/10.1145/3706599.3720212)）

**UI 布局自动生成：**
- **GameUIAgent**（2025 年 arXiv 论文）是一个 LLM 驱动的智能体框架，可将自然语言描述转化为可编辑的 Figma 设计，通过 Design Spec JSON 中间表示实现（[arXiv](https://arxiv.org/html/2603.14724)）

**对放置类游戏的特殊价值：** 放置类游戏的文本内容量大（大量成就描述、物品说明、事件文本），但单条文本价值低，非常适合 LLM 批量生成后人工审核的工作流。

---

### A6. 反作弊：检测脚本/外挂挂机

放置类游戏的反作弊有其特殊性：游戏本身就鼓励"挂机"，如何区分正常挂机和非法脚本？

**AI 行为分析方案：**
- [Anybrain](https://www.anybrain.gg/) 通过**超过 70 项行为生物特征**（键盘动态、鼠标动态、触摸数据）创建玩家"游戏指纹"
- 深度学习模型在作弊检测中达到 **F-score 99.68%**（2D-CNN）和 **99.42%**（LSTM）（[Springer](https://link.springer.com/article/10.1007/s44163-025-00715-w)）
- Riot Games 在 Data+AI Summit 2025 展示了下一代反作弊方向（[Databricks](https://www.databricks.com/dataaisummit/session/future-anti-cheat-riot-games)）

**放置类游戏特有挑战：** 需要区分"正常挂机自动收益"与"通过外部脚本加速/跳步"——关键特征包括操作时序规律性异常、API 调用频率异常、收益曲线偏离模型预测等。

---

## Section B: 市场规模与增长趋势

### B1. 全球放置类/挂机游戏市场规模

| 指标 | 数据 | 来源 |
|------|------|------|
| 2024 年全球市场规模 | **USD 25-34 亿** | [Dataintelo](https://dataintelo.com/report/idle-games-market) / [GrowthMarketReports](https://growthmarketreports.com/report/idle-games-market) |
| 预测 CAGR | **9.8%-12.5%** | 多家研究机构综合 |
| 2033 年预测规模 | **USD 61-97 亿** | 同上 |
| 亚太区 2024 年收入 | **USD 11 亿**（占比约 44%） | [Dataintelo](https://dataintelo.com/report/idle-games-market) |
| 北美 2024 年收入 | **USD 7 亿** | 同上 |
| 欧洲 2024 年收入 | **USD 5 亿** | 同上 |

### B2. 主要市场分析

**中国市场：**
- 2024 年中国移动游戏实际销售收入 **2,382.17 亿元**，同比增长 5.01%（[中国音数协](https://www.cgigc.com.cn/details.html?id=08dd2ada-5934-4680-892e-63760092eef9&tp=news)）
- 2025 年国内游戏市场实际销售收入达 **3,507.89 亿元**，同比增长 7.68%，用户规模突破 **6.83 亿**（[南方都市报](https://m.mp.oeeee.com/a/BAAFRD0000202512191496303.html)）
- 微信小游戏生态快速增长，国内小游戏市场收入近 **400 亿元**（[证券时报](https://stcn.com/article/detail/1472367.html)）
- 代表产品：《咸鱼之王》运营超3年仍保持常青活力；《一念逍遥》修仙放置赛道标杆

**日本市场：**
- 放置类 RPG 在日本快速崛起，《菇勇者传说》（Legend of Mushroom）日本上线后首周收入达 **$850 万**，累计日本 App Store 总收入达 **$7.6 亿**（[Automaton](https://automaton-media.com/en/news/legend-of-mushrooms-massive-japanese-release-makes-8-5-million-in-one-week/)）

**韩国市场：**
- Idle RPG 在韩国 RPG 品类收入占比从 2020 年的 **1.7%** 飙升至 2024 年的 **16%**（[Sensor Tower](https://sensortower.com/blog/state-of-mobile-games-in-apac-2024-report)）
- 《菇勇者传说》成为韩国上半年第三大吸金手游

**欧美市场：**
- 美国是全球第二大单一国家市场，Idle Miner Tycoon、Egg Inc. 等经典产品持续领跑
- 2024 Q1 美国 Top 5 放置游戏呈现激增态势（[Sensor Tower](https://sensortower.com/blog/2024-q1-unified-top-5-idler%20games-units-us-602ae7fb241bc16eb874f8e1)）

### B3. 移动端 vs PC/Web

移动端占据放置类游戏的**绝对主导地位**，2024 年在总市场中占据最大份额（[Dataintelo](https://dataintelo.com/report/idle-games-market)）。PC/Web 端虽有 Cookie Clicker、Clicker Heroes 等经典，但市场份额显著小于移动端。Web 端（特别是微信小游戏等平台）在中国是重要增长极。

### B4. 头部产品收入数据

| 产品 | 关键收入数据 | 时间 |
|------|-------------|------|
| AFK Journey (莉莉丝) | 全球累计收入 **$1.58 亿**+；亚洲上线 6 周后从 $7,100 万增至 $1.58 亿 | 2024 |
| Legend of Mushroom (菇勇者传说) | 上线 4 个月近 **$1 亿** IAP；全球累计 **$2.7 亿**+ | 2024.4 |
| 咸鱼之王 | 运营 3 年+进入 2025 常青游戏榜 | 2025 |
| Eatventure | 单日峰值收入 **$83K**，日下载峰值 **87K** | 2024 Q1 |

数据来源：[MAF](https://maf.ad/en/blog/afk-journey-analysis/)、[PocketGamer](https://www.pocketgamer.biz/afk-journey-surpasses-150-million-with-asian-market-dominance/)、[GameMakers](https://www.gamemakers.com/p/legend-of-mushroom-hits-a-new-high)

### B5. AI 赋能前后对比

| 维度 | AI 赋能前 | AI 赋能后 | 来源 |
|------|----------|----------|------|
| 美术资产迭代 | 100% 手工 | 减少 **40-70%** 工作量 | [Sparkco](https://sparkco.ai/blog/gemini-3-for-game-development) |
| 开发成本 | 基准 | 降低 **20-30%** | [Introl](https://introl.com/blog/gaming-industry-ai-infrastructure-cloud-content-creation-2025) |
| 单作品节省 | — | **$50-200 万/作品** | [Sparkco](https://sparkco.ai/blog/gemini-3-for-game-development) |
| 内购转化 | 基准 | 提升约 **30%** | [PatentPC](https://patentpc.com/blog/the-state-of-ai-in-the-gaming-industry-market-growth-and-revenue-stats) |
| 玩家留存 | 基准 | 提升高达 **30%** | [Gamelight](https://www.gamelight.io/post/the-role-of-ai-in-enhancing-player-personalization-in-mobile-games) |

**AI in Gaming 整体市场：** 2024 年约 **USD 32.8 亿**，预测至 2033 年达 **USD 512.6 亿**，CAGR **36.1%**（[Grand View Research](https://www.grandviewresearch.com/industry-analysis/ai-gaming-market-report)）。

---

## Section C: 商业模式与变现

### C1. 放置类游戏典型变现模式

放置类游戏采用**混合变现模式**已成为 2025 年行业标准（[ContextSDK](https://contextsdk.com/blogposts/monetization-trends-in-mobile-gaming-whats-shaping-2025)）：

| 变现模式 | 描述 | 典型占比 |
|----------|------|----------|
| **激励视频广告** | 看广告获得 2x 收益/加速等奖励，放置类天然适配 | 30-50% 收入 |
| **内购 (IAP)** | 宝石/月卡/限时礼包/角色抽卡 | 40-60% 收入 |
| **Battle Pass / 赛季通行证** | 分层付费（免费+付费轨道），提供独占奖励 | 快速增长中 |
| **VIP / 月度订阅** | 去广告、专属特权、高级货币 | 稳定收入流 |
| **横幅/插屏广告** | 非激励性展示广告 | 5-15% 收入 |

放置类游戏 CPM 为休闲游戏各品类 **Top 1**，变现能力最强（[飞书深诺](https://www.fxbaogao.com/detail/4435816)）。

**ARPU 基准数据：**
- 美国放置类游戏 ARPU 约 **$0.29/天**（一般水平）
- Tier 1 西方国家头部产品 ARPU 可达 **$0.36+/天**
- 美国移动游戏整体人均消费 2025 年约 **$95.41/年**（[Segwise](https://segwise.ai/blog/mobile-gaming-statistics)）
- 美国移动游戏 ARPU 预计 2026 年达 **$60.58**（[Udonis](https://www.blog.udonis.co/mobile-marketing/mobile-games/mobile-game-revenue)）

### C2. AI 如何提升 ARPU / LTV

**个性化推荐：**
- AI 根据玩家付费画像和行为数据推荐最匹配的礼包/道具，可提升内购转化约 **30%**
- 健康的 LTV:CAC 比率为 **3:1**——即每获客 $1，可赚回 $3（[Segwise](https://segwise.ai/blog/ltv-to-cac-ratio-gaming-apps-guide)）

**动态定价：**
- AI 分析消费习惯，在最佳时机推送个性化折扣和礼包
- 针对不同付费层级玩家（鲸鱼/海豚/小鱼）提供差异化价格策略
- 据 [Bigabid](https://www.bigabid.com/mobile-gaming-trends-2026/) 报告，2026 年神经网络驱动的用户获取将进一步优化广告支出

**智能广告投放：**
- AI 预测最佳广告展示时机和频次，最大化 eCPM 同时不损害留存
- 2025 年混合变现（IAP + 广告）已成新标准，AI 是实现平衡的关键（[Gamigion](https://www.gamigion.com/idle/)）

### C3. AI 降低研发成本的量化分析

| 成本项 | AI 赋能效果 | 量化数据 | 来源 |
|--------|-----------|---------|------|
| 美术资产制作 | AI 辅助生成 + 迭代 | 降低 **20-30%** 成本 | [StudioKrew](https://studiokrew.com/blog/the-economics-of-game-development-2025/) |
| 单款作品总节省 | 自动化资产生成 + QA | **$50 万-$200 万** | [Sparkco](https://sparkco.ai/blog/gemini-3-for-game-development) |
| QA / 测试 | 自动化 Bug 检测 | 生产力提升 **30-50%** | 同上 |
| 文案内容 | LLM 批量生成 | 减少 **60-80%** 文案写作时间（行业估算） | 综合 |
| 关卡设计 | PCG 自动生成 | 手动建模减少 **55%** | [Sparkco](https://sparkco.ai/blog/gemini-3-for-game-development) |

**工作室采纳率（2025 → 2030 预测）：**
- 独立工作室：15% → 40%
- 中型工作室：25% → 60%
- AAA 工作室：10% → 50%

（来源：[OyeLabs](https://oyelabs.com/ai-in-gaming-how-ai-is-changing-the-industry/)）

### C4. 典型 ROI 模型

以一款中等规模放置类手游为例（估算模型）：

```
┌─────────────────────────────────────────────────────────┐
│              放置类手游 AI 投入 ROI 模型                   │
├─────────────────────────────────────────────────────────┤
│ 【AI 投入成本（一次性）】                                  │
│   AI 工具许可 + 集成开发：$100K-$300K                      │
│   AI 工程师人力（6-12 月）：$150K-$400K                    │
│   云端推理基础设施（年）：$50K-$200K                       │
│   合计：$300K-$900K                                       │
│                                                          │
│ 【AI 带来的收益提升（年化）】                              │
│   内购转化 +30% → +$150K-$500K/年                        │
│   留存提升 +30% → LTV 提升 → +$200K-$600K/年             │
│   研发成本节省 20-30% → $200K-$600K/年                   │
│   运营效率提升（自动平衡/反作弊）→ $50K-$150K/年         │
│   合计收益：$600K-$1,850K/年                             │
│                                                          │
│ 【ROI】                                                   │
│   投资回报期：6-18 个月                                   │
│   年化 ROI：67%-500%+                                    │
│   LLM 本地部署 ROI 回本周期：12-18 个月                   │
└─────────────────────────────────────────────────────────┘
```

来源：基于 [CloudZero](https://www.cloudzero.com/state-of-ai-costs/)、[SumatoSoft](https://sumatosoft.com/blog/ai-development-costs)、上述行业数据综合估算

---

## Section D: 技术架构

### D1. 放置类游戏的离线计算架构

放置类游戏的核心技术挑战在于：**玩家不在线时，游戏仍需准确计算资源累积。**

**方案对比：**

| 架构 | 优势 | 劣势 | 适用场景 |
|------|------|------|---------|
| **纯客户端计算** | 无服务器成本；离线可用 | 易被篡改/作弊；数据不同步 | 单机小型产品 |
| **纯服务端计算** | 安全可控；防作弊 | 服务器成本高；需要联网 | 竞技/社交重度产品 |
| **混合架构（推荐）** | 兼顾安全与体验 | 实现复杂度较高 | 大多数商业化产品 |

**混合架构细节：**

```
┌─────────────────────────────────────────────┐
│                  客户端                       │
│  ┌──────────────┐    ┌──────────────┐       │
│  │ 本地状态缓存  │    │ 离线收益预估  │       │
│  │ (SQLite/      │    │ (确定性公式   │       │
│  │  SharedPrefs) │    │  计算)        │       │
│  └──────┬───────┘    └──────┬───────┘       │
│         │                    │               │
│         └────────┬───────────┘               │
│                  │ 上线时同步                  │
│                  ▼                            │
│  ┌──────────────────────────┐               │
│  │     同步与校验层           │               │
│  │  (冲突解决 / 防作弊校验)  │               │
│  └──────────┬───────────────┘               │
└─────────────┼───────────────────────────────┘
              │ HTTPS / WebSocket
              ▼
┌─────────────────────────────────────────────┐
│                  服务端                       │
│  ┌──────────────┐    ┌──────────────┐       │
│  │ 权威状态服务  │    │ 离线收益验证  │       │
│  │ (Redis/       │    │ (服务端重算   │       │
│  │  PostgreSQL)  │    │  + 上限校验)  │       │
│  └──────────────┘    └──────────────┘       │
│  ┌──────────────┐    ┌──────────────┐       │
│  │ 经济系统监控  │    │ 反作弊引擎    │       │
│  └──────────────┘    └──────────────┘       │
└─────────────────────────────────────────────┘
```

**关键实现要点：**
- 离线收益使用**确定性公式**（非实时模拟），确保即使帧率波动结果也一致
- 渲染与游戏逻辑从原型阶段就**强制分离**（[GameDeveloper](https://www.gamedeveloper.com/design/lessons-of-my-first-incremental-game)）
- 大数运算支持（放置类游戏数值常超过 10^100000，需要 BigNumber 库）
- 弹性服务器架构在 2025 年已成标配，可根据在线人数自动扩缩容（[Unihost](https://unihost.com/blog/game-hosting-2025-dedicated-vs-shared-infrastructure/)）

### D2. AI 模块集成方案

| 方案 | 延迟 | 成本 | 适用场景 |
|------|------|------|---------|
| **在线推理 (Real-time)** | 200-800ms | 高（按调用计费） | 实时对话 NPC、动态难度调节 |
| **离线批处理 (Batch)** | 分钟-小时级 | 低 | 内容生成、数据分析、经济平衡 |
| **边缘推理 (Edge/On-device)** | <10ms | 一次性部署成本 | 低延迟决策、隐私敏感场景 |
| **混合模式（推荐）** | 视场景 | 中 | 大多数实际部署 |

**推荐集成架构：**

```
┌──────────────────────────────────────────────────────┐
│                    AI 模块集成层                       │
├──────────┬──────────────┬────────────────────────────┤
│ 实时推理层│   近实时层    │       批处理层              │
│          │              │                            │
│ • NPC 对话│ • 难度调节    │ • PCG 内容生成             │
│ • 反作弊  │ • 推荐系统    │ • 经济平衡分析             │
│ • 实时决策│ • 广告投放    │ • 玩家画像更新             │
│          │              │ • 模型再训练               │
│ 端侧/云端 │   云端 API    │  离线 Pipeline             │
│ <10-50ms │  100-500ms   │  分钟-小时                  │
└──────────┴──────────────┴────────────────────────────┘
```

### D3. LLM 在游戏中的部署

**本地小模型 vs 云端 API 对比：**

| 维度 | 本地小模型 (On-Device) | 云端 API |
|------|----------------------|----------|
| **延迟** | <10ms | 200-800ms |
| **可用性** | 离线可用 | 依赖网络 |
| **隐私** | 数据不出设备 | 数据上传云端 |
| **成本模型** | 固定部署成本 | 按调用次数计费 |
| **模型能力** | 较弱（1-3B 参数） | 强（100B+ 参数） |
| **更新** | 需要推送更新 | 即时切换模型 |
| **ROI 回本** | **12-18 个月** | 按量付费 |

**2025-2026 可用的端侧模型：**（[On-Device LLMs 综述](https://v-chandra.github.io/on-device-llms/)）

| 模型 | 参数量 | 特点 |
|------|--------|------|
| Llama 3.2 | 1B / 3B | Meta 官方移动端优化 |
| Gemma 3 | 270M-2B | Google 超小模型 |
| Phi-4 mini | 3.8B | 微软，推理能力强 |
| SmolLM2 | 135M-1.7B | HuggingFace，超轻量 |
| Qwen2.5 | 0.5B-1.5B | 阿里，中文友好 |
| Mistral-Nemo-Minitron-8B | 8B | NVIDIA 游戏专用（PUBG Ally） |

**部署框架：** Meta 的 **ExecuTorch** 在 2025 年 10 月达到 1.0 GA，基础占用仅 **50KB**，支持 12+ 硬件后端和 80%+ 主流边缘 LLM（[Edge AI Vision](https://www.edge-ai-vision.com/2026/01/on-device-llms-in-2026-what-changed-what-matters-whats-next/)）。

**放置类游戏推荐策略：**
- **文案/叙事生成** → 云端大模型离线批处理（不需要实时）
- **NPC 离线决策** → 端侧小模型（Gemma 270M-1B 级别）
- **玩家交互对话** → 云端 API（需要高质量回复时）
- **数值平衡分析** → 服务端批处理 Pipeline

### D4. 推荐技术栈

```
┌─────────────────────────────────────────────────────────┐
│              放置类游戏 + AI 推荐技术栈                    │
├─────────────────────────────────────────────────────────┤
│                                                          │
│ 【客户端】                                                │
│   引擎：Unity (C#) / Cocos Creator (TypeScript)          │
│   端侧 AI：ExecuTorch + Gemma 3 (270M) / SmolLM2        │
│   大数库：break_infinity.js / BigInteger                  │
│   本地存储：SQLite / SharedPreferences                    │
│                                                          │
│ 【服务端】                                                │
│   语言：Go / Node.js / Python (AI 服务)                   │
│   数据库：PostgreSQL (持久化) + Redis (缓存/排行榜)       │
│   消息队列：Kafka / RabbitMQ                              │
│   容器编排：Kubernetes (弹性扩缩)                         │
│                                                          │
│ 【AI 基础设施】                                           │
│   实时推理：NVIDIA Triton / vLLM / TensorRT-LLM          │
│   批处理：Apache Spark / Ray                              │
│   模型管理：MLflow / Weights & Biases                     │
│   特征存储：Feast / Redis                                 │
│                                                          │
│ 【AI 模型层】                                             │
│   PCG 内容生成：GPT-4o / Claude (云端批处理)              │
│   NPC 决策：强化学习模型 + 规则引擎混合                   │
│   推荐系统：DeepFM / Wide&Deep / DIN                     │
│   反作弊：LSTM / Transformer 行为检测模型                 │
│   经济平衡：时间序列预测 (Prophet/ARIMA) + RL Agent       │
│                                                          │
│ 【数据 Pipeline】                                         │
│   采集：游戏埋点 SDK → Kafka                              │
│   存储：ClickHouse / BigQuery                             │
│   分析：dbt + Looker / Metabase                           │
│   A/B 测试：LaunchDarkly / 自建                           │
│                                                          │
│ 【DevOps / MLOps】                                        │
│   CI/CD：GitHub Actions / GitLab CI                       │
│   模型部署：Seldon Core / KServe                          │
│   监控：Prometheus + Grafana                              │
│   LLMOps：LangSmith / Helicone                           │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

---

## 数据来源汇总

**市场数据与报告：**
- [Dataintelo - Idle Games Market Report 2033](https://dataintelo.com/report/idle-games-market)
- [GrowthMarketReports - Idle Games Market](https://growthmarketreports.com/report/idle-games-market)
- [Grand View Research - AI in Gaming Market](https://www.grandviewresearch.com/industry-analysis/ai-gaming-market-report)
- [Sensor Tower - Q1/Q2 2024 Idle Games](https://sensortower.com/blog/2024-q1-unified-top-5-idler%20games-units-us-602ae7fb241bc16eb874f8e1)
- [Sensor Tower - APAC Mobile Game Market 2024](https://sensortower.com/blog/state-of-mobile-games-in-apac-2024-report)
- [中国音数协 - 2024年中国游戏产业报告](https://www.cgigc.com.cn/details.html?id=08dd2ada-5934-4680-892e-63760092eef9&tp=news)
- [Udonis - Mobile Game Revenue 2026](https://www.blog.udonis.co/mobile-marketing/mobile-games/mobile-game-revenue)

**产品收入数据：**
- [MAF - AFK Journey $110M Revenue Analysis](https://maf.ad/en/blog/afk-journey-analysis/)
- [PocketGamer - AFK Journey $150M](https://www.pocketgamer.biz/afk-journey-surpasses-150-million-with-asian-market-dominance/)
- [GameMakers - Legend of Mushroom](https://www.gamemakers.com/p/legend-of-mushroom-hits-a-new-high)
- [Automaton - Legend of Mushroom Japan](https://automaton-media.com/en/news/legend-of-mushrooms-massive-japanese-release-makes-8-5-million-in-one-week/)

**AI 技术与应用：**
- [NVIDIA ACE Autonomous Characters](https://www.nvidia.com/en-us/geforce/news/nvidia-ace-autonomous-ai-companions-pubg-naraka-bladepoint/)
- [Sparkco - Gemini 3 Game Development](https://sparkco.ai/blog/gemini-3-for-game-development)
- [Anybrain - AI Anti-Cheat](https://www.anybrain.gg/)
- [Databricks - Agentic AI in Games](https://www.databricks.com/blog/leveraging-agentic-ai-games)
- [Edge AI Vision - On-Device LLMs 2026](https://www.edge-ai-vision.com/2026/01/on-device-llms-in-2026-what-changed-what-matters-whats-next/)
- [On-Device LLMs Survey](https://v-chandra.github.io/on-device-llms/)
- [ACM - Beyond Equilibrium: AI Agents in Game Economy](https://dl.acm.org/doi/10.1145/3573382.3616092)
- [arXiv - GameUIAgent](https://arxiv.org/html/2603.14724)

**变现与用户数据：**
- [Segwise - Mobile Gaming Statistics 2025](https://segwise.ai/blog/mobile-gaming-statistics)
- [Gamigion - Idle Game Monetization 2025](https://www.gamigion.com/idle/)
- [ContextSDK - Monetization Trends 2025](https://contextsdk.com/blogposts/monetization-trends-in-mobile-gaming-whats-shaping-2025)
- [Gamelight - AI Player Personalization](https://www.gamelight.io/post/the-role-of-ai-in-enhancing-player-personalization-in-mobile-games)
- [StudioKrew - Game Dev Economics 2025](https://studiokrew.com/blog/the-economics-of-game-development-2025/)

---

{"id":"dde479cb-b3c8-4bc8-a17a-054f5e8fc6ba","result":{"content":[{"type":"text","text":"From: zayne
Time: 2026-04-07T15:21:24.879Z

【Section E: 代表性产品案例深度分析】

分析了6款代表性产品：

1. Cookie Clicker (2013) - 品类奠基者，Steam收入~2190万美元，200-500万用户，买断制
2. Idle Champions (2017) - D&D IP加持，F2P+DLC，100-200万Steam用户，阵容策略差异化
3. Melvor Idle (2020) - RuneScape式idle RPG，Steam收入~670万美元，买断+DLC模式
4. Cell to Singularity (2018) - 教育+idle融合，3500万下载，进化主题科普
5. AdVenture Capitalist (2014) - 品类先驱，全平台收入>2000万美元，3360万下载
6. AFK Journey (2024) - idle RPG标杆，莉莉丝出品，上线不到一年收入~2.5亿美元

关键发现：当前头部idle游戏几乎都未深度整合AI技术。AI在idle品类中处于极早期阶段，是巨大蓝海。唯一例外是AFK Journey在战斗系统使用自动决策AI，但非生成式AI。"}],"isError":false}}




---

> 本报告由 Oliver 的 Claude Code Agent 与 Zayne 的 Claude Code Agent 通过 Claw IM 协作完成。
> 分工：Sections A/B/C/D 由 Oliver Agent 研究，Sections E/F/G/H 由 Zayne Agent 研究。
> 日期：2026-04-07
