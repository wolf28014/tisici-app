// 客户端种子数据：首次启动时若数据库为空，则插入预设分类与提示词
import {
  createCategory,
  createPrompt,
  queryPrompts,
  queryCategories,
  type Category,
} from './db'

const SEEDED_FLAG = 'prompthub_seeded_v1'

type CatDef = {
  name: string
  description: string
  icon: string
  color: string
  sortOrder: number
  parentName?: string
}

const CATEGORIES: CatDef[] = [
  { name: '写作创作', description: '文章、故事、文案等创作类提示词', icon: 'PenTool', color: 'rose', sortOrder: 1 },
  { name: '编程开发', description: '编程、代码、技术相关提示词', icon: 'Code2', color: 'emerald', sortOrder: 2 },
  { name: '学习辅导', description: '学习、教学、知识理解提示词', icon: 'GraduationCap', color: 'sky', sortOrder: 3 },
  { name: '生活日常', description: '生活、健康、日常事务提示词', icon: 'Heart', color: 'teal', sortOrder: 4 },
  { name: '工作效率', description: '办公、效率、流程优化提示词', icon: 'Briefcase', color: 'violet', sortOrder: 5 },
  { name: '电商运营', description: '电商运营全套：选品、文案、客服、推广', icon: 'ShoppingBag', color: 'amber', sortOrder: 6 },
  { name: 'AI模特商拍', description: 'AI 模特换装、姿势、场景生成提示词', icon: 'Palette', color: 'pink', sortOrder: 7 },
  { name: 'AI短剧制作', description: 'AI 短剧全流程：剧本→分镜→视频→配音→剪辑', icon: 'Clapperboard', color: 'rose', sortOrder: 8 },
  { name: '其他', description: '未分类提示词', icon: 'MoreHorizontal', color: 'slate', sortOrder: 99 },
]

type PromptDef = {
  title: string
  description?: string
  content: string
  categoryName: string
  tags?: string[]
  isPinned?: boolean
  isFavorite?: boolean
  author?: string
}

const PROMPTS: PromptDef[] = [
  // ===== 写作创作 =====
  {
    title: '爆款小红书种草文案',
    description: '生成带 emoji 与话题标签的小红书种草笔记',
    categoryName: '写作创作',
    tags: ['小红书', '文案', '种草'],
    isFavorite: true,
    author: 'PromptHub',
    content: `你是一位百万粉丝的小红书种草达人。请为以下主题写一篇种草笔记：

【主题】{{主题}}
【产品特点】{{产品特点}}
【目标人群】{{目标人群}}

要求：
1. 标题抓眼球，使用数字、悬念或反转
2. 正文 300-500 字，分段清晰，每段不超 3 行
3. 大量使用 emoji 提升氛围（每段至少 2 个）
4. 结尾带 5-8 个相关话题标签 #xxx
5. 突出「我」的真实使用感受与对比`,
  },
  {
    title: '公众号深度长文',
    description: '生成有观点、有数据的公众号深度文章',
    categoryName: '写作创作',
    tags: ['公众号', '长文', '深度'],
    author: 'PromptHub',
    content: `你是一位资深公众号主理人。请就以下主题撰写一篇 2000-3000 字的深度文章：

【主题】{{主题}}
【核心观点】{{核心观点}}
【目标读者】{{目标读者}}

文章结构：
1. 引子：用一个真实故事或数据切入
2. 现象：描述问题现状，至少 3 个具体例子
3. 分析：从 2-3 个维度深入剖析原因
4. 解法：给出可执行的建议或方法论
5. 升华：拔高到行业/社会/人性的层面

风格：理性克制但有人文关怀，多用比喻，少用套话。`,
  },
  {
    title: '抖音短视频脚本',
    description: '30 秒抓人眼球的抖音短视频口播脚本',
    categoryName: '写作创作',
    tags: ['抖音', '短视频', '脚本'],
    isPinned: true,
    author: 'PromptHub',
    content: `你是抖音千万粉丝博主。请为以下主题写一条 30 秒口播短视频脚本：

【主题】{{主题}}
【目标观众】{{目标观众}}
【想要的情绪】{{想要的情绪}}

结构（共约 90 字口播）：
- 0-3 秒：黄金开头，制造悬念或反常识
- 3-15 秒：抛出核心观点 + 1 个生动例子
- 15-25 秒：给出可操作建议或反转
- 25-30 秒：CTA（点赞/关注/评论）

同时给出：
- 视频标题（≤20 字）
- 3 条高赞评论预埋`,
  },
  {
    title: '情感故事创作',
    description: '生成有代入感的第一人称情感短篇',
    categoryName: '写作创作',
    tags: ['故事', '情感', '创作'],
    author: 'PromptHub',
    content: `你是一位擅长写情感故事的作家，文风细腻克制。请按以下设定创作一篇 800-1200 字的短篇：

【主角】{{主角描述}}
【情感关系】{{情感关系}}
【冲突事件】{{冲突事件}}
【结局走向】{{结局走向}}

要求：
1. 第一人称视角
2. 通过 3-5 个具体生活细节塑造人物
3. 关键对白不超过 2 句，留白为主
4. 结尾不直白点题，让读者自己体会`,
  },

  // ===== 编程开发 =====
  {
    title: '代码 Review 助手',
    description: '专业审查代码，指出 bug、性能、可读性问题',
    categoryName: '编程开发',
    tags: ['代码审查', '最佳实践'],
    isPinned: true,
    isFavorite: true,
    author: 'PromptHub',
    content: `你是一位有 15 年经验的技术 Leader。请对以下代码进行 Review：

【语言/框架】{{语言/框架}}
【代码】
\`\`\`
{{代码}}
\`\`\`

请按以下格式输出：
1. 🔴 严重问题（bug、安全、性能瓶颈）
2. 🟡 改进建议（可读性、可维护性、架构）
3. 🟢 亮点（值得保留的好做法）
4. 重构后的完整代码（带注释说明改动）

注意：指出问题必须给出具体行号或代码片段，不要泛泛而谈。`,
  },
  {
    title: 'SQL 查询优化器',
    description: '分析 SQL 性能问题并给出优化方案',
    categoryName: '编程开发',
    tags: ['SQL', '性能优化', '数据库'],
    author: 'PromptHub',
    content: `你是资深 DBA。请分析以下 SQL 查询并给出优化方案：

【数据库类型】{{数据库类型：MySQL/PostgreSQL/...}}
【表结构】
{{表结构DDL}}

【慢查询】
\`\`\`sql
{{SQL}}
\`\`\`

【当前执行计划】
{{EXPLAIN结果}}

请输出：
1. 性能问题诊断（索引缺失？全表扫描？临时表？filesort？）
2. 建议添加的索引（给出 DDL）
3. 重写后的 SQL（带注释说明改动）
4. 预期提升效果`,
  },
  {
    title: '正则表达式生成器',
    description: '描述需求自动生成并解释正则表达式',
    categoryName: '编程开发',
    tags: ['正则', '工具'],
    author: 'PromptHub',
    content: `你是正则表达式专家。请根据需求生成正则：

【编程语言】{{编程语言}}
【需求描述】{{需求描述}}
【示例输入（应匹配）】{{应该匹配的样本}}
【示例输入（不应匹配）】{{不应匹配的样本}}

请输出：
1. 正则表达式（带定界符和标志位）
2. 逐段解释每个部分的作用
3. 在 {{编程语言}} 中的使用示例代码
4. 边界 case 测试结果`,
  },
  {
    title: 'API 文档生成器',
    description: '根据代码自动生成 OpenAPI 风格文档',
    categoryName: '编程开发',
    tags: ['API', '文档', 'Swagger'],
    author: 'PromptHub',
    content: `你是 API 文档工程师。请为以下接口生成完整的 API 文档：

【框架】{{框架：Spring Boot/Express/FastAPI/...}}
【接口代码】
\`\`\`
{{代码}}
\`\`\`

输出 Markdown 格式文档，包含：
1. 接口名称、HTTP 方法、路径
2. 请求参数（Query / Path / Body）表格：字段名、类型、是否必填、默认值、说明
3. 响应结构（成功 + 错误）示例
4. curl 调用示例
5. 常见错误码`,
  },

  // ===== 学习辅导 =====
  {
    title: '费曼学习法讲解',
    description: '用最简单的话把复杂概念讲明白',
    categoryName: '学习辅导',
    tags: ['费曼', '学习', '讲解'],
    isFavorite: true,
    author: 'PromptHub',
    content: `你是费曼学习法大师。请用「外行也能听懂」的方式讲解以下概念：

【概念】{{概念}}
【学习者背景】{{学习者背景：例如高中生/产品经理/Java 开发}}
【希望达到的目标】{{希望达到的目标}}

要求：
1. 用一个生活化的类比开头
2. 把概念拆成 3-5 个递进的子概念
3. 每个子概念配 1 个具体例子
4. 最后用「如果只用一句话解释，那就是……」收尾
5. 标注常见误解（× 错误理解 vs ✓ 正确理解）`,
  },
  {
    title: '考点速记口诀',
    description: '为任意知识点生成记忆口诀',
    categoryName: '学习辅导',
    tags: ['记忆', '口诀', '应试'],
    author: 'PromptHub',
    content: `你是记忆大师。请为以下知识生成易记口诀：

【学科】{{学科}}
【知识点】{{知识点}}
【目标年级】{{目标年级}}

请输出：
1. 一句 7 字或 5 字口诀（押韵）
2. 口诀每个字的解释
3. 用口诀串起来的完整知识结构图（Markdown 大纲）
4. 3 道高频考题（带答案与解析）`,
  },
  {
    title: '英语口语陪练',
    description: '扮演外教与用户进行场景化英语对话',
    categoryName: '学习辅导',
    tags: ['英语', '口语', '对话'],
    author: 'PromptHub',
    content: `你是友善的英语外教。请与用户进行场景化口语对话练习：

【场景】{{场景：例如点餐/面试/旅行问路}}
【用户当前水平】{{用户当前水平：初级/中级/高级}}
【重点练习】{{重点练习：例如过去时/商务词汇/发音}}

规则：
1. 每轮你说 1-2 句英文，引导用户回应
2. 用户回应后，先给出 1 句鼓励，再温柔指出 1 个错误并给出更地道说法
3. 每 5 轮总结一次用户的高频错误
4. 全程用英文对话，仅解释时用中文`,
  },

  // ===== 生活日常 =====
  {
    title: '一周营养食谱',
    description: '根据需求生成 7 天三餐食谱',
    categoryName: '生活日常',
    tags: ['食谱', '健康', '营养'],
    author: 'PromptHub',
    content: `你是注册营养师。请根据以下需求制定一周食谱：

【人群】{{人群：例如减脂期女性/增肌男性/三高老人}}
【日均热量目标】{{热量目标}}kcal
【忌口/过敏】{{忌口/过敏}}
【烹饪时间】每日最多 {{烹饪时间}} 分钟

输出格式（表格）：
| 日期 | 早餐 | 午餐 | 晚餐 | 加餐 |
每餐标注：菜名 + 主要食材 + 估算热量 + 烹饪方式
最后给出：本周饮食要点 + 采购清单（按品类分组）`,
  },
  {
    title: '健身训练计划',
    description: '生成个性化周训练计划',
    categoryName: '生活日常',
    tags: ['健身', '训练', '运动'],
    author: 'PromptHub',
    content: `你是 ACE 认证私教。请制定一周训练计划：

【性别/年龄/身高/体重】{{基本信息}}
【训练目标】{{目标：减脂/增肌/塑形/力量}}
【每周可训练天数】{{天数}} 天
【可去健身房？】{{是/否}}
【伤病限制】{{伤病限制}}

输出：
1. 周计划表：每天训练部位 + 动作 + 组数×次数 + 间歇
2. 每个动作附简短要领
3. 热身 / 拉伸建议
4. 饮食与休息建议
5. 4 周渐进方案`,
  },
  {
    title: '旅行攻略生成',
    description: '生成详细到小时的旅行攻略',
    categoryName: '生活日常',
    tags: ['旅行', '攻略', '行程'],
    isFavorite: true,
    author: 'PromptHub',
    content: `你是资深旅行博主。请生成详细旅行攻略：

【目的地】{{目的地}}
【出发城市】{{出发城市}}
【天数】{{天数}} 天
【人数/构成】{{人数/构成：例如情侣/亲子 3 人}}
【预算】{{预算}} 元
【偏好】{{偏好：自然风光/人文历史/美食/购物}}

输出：
1. 行前准备清单（证件、衣物、电子设备、药品）
2. 逐日行程（按小时编排，含交通方式与时间）
3. 每日餐厅推荐 3 家（早/午/晚，含人均）
4. 住宿区域建议（按性价比排序）
5. 必备 App 与离线地图
6. 突发情况预案`,
  },

  // ===== 工作效率 =====
  {
    title: '会议纪要生成器',
    description: '把会议录音/笔记整理成结构化纪要',
    categoryName: '工作效率',
    tags: ['会议', '纪要', '办公'],
    isPinned: true,
    author: 'PromptHub',
    content: `你是专业的会议记录员。请把以下会议内容整理成纪要：

【会议主题】{{会议主题}}
【时间/参会人】{{时间/参会人}}
【原始记录】
{{录音转写或笔记}}

输出格式：
1. 会议概述（3 句话）
2. 关键决议（带编号，每条 ≤30 字）
3. 待办事项表格：任务 / 负责人 / 截止时间 / 验收标准
4. 遗留问题（需进一步讨论）
5. 下次会议建议时间与议题`,
  },
  {
    title: '邮件润色专家',
    description: '把口语化邮件改写为专业商务邮件',
    categoryName: '工作效率',
    tags: ['邮件', '商务', '沟通'],
    author: 'PromptHub',
    content: `你是外企商务沟通专家。请把以下邮件改写得更专业：

【收件人关系】{{关系：上级/客户/跨部门同事/...}}
【邮件目的】{{目的：汇报/请示/拒绝/催办/...}}
【原始草稿】
{{草稿}}

要求：
1. 主题行 ≤15 字，含关键词便于检索
2. 称呼与落款得体
3. 正文采用金字塔结构：结论先行 → 3 点支撑 → 行动号召
4. 提供 2 个版本：正式版 / 简洁版
5. 标注修改前后的关键差异`,
  },
  {
    title: 'OKR 制定助手',
    description: '把模糊目标拆解为可衡量的 OKR',
    categoryName: '工作效率',
    tags: ['OKR', '目标管理', '管理'],
    author: 'PromptHub',
    content: `你是 OKR 教练。请把以下目标转化为季度 OKR：

【岗位/角色】{{岗位/角色}}
【模糊目标】{{模糊目标}}
【团队规模】{{团队规模}}
【本季度关键约束】{{约束：预算/人手/时间}}

输出：
1. 1 个 Objective（鼓舞人心、定性、季度可达）
2. 3 个 Key Results（每个必须可量化，含数值与时间）
3. 每个 KR 的关键举措（how）
4. 风险点与依赖项
5. 周度复盘指标（leading indicators）`,
  },
  {
    title: 'PPT 大纲生成',
    description: '从主题生成 15 页 PPT 完整大纲',
    categoryName: '工作效率',
    tags: ['PPT', '汇报', '演示'],
    author: 'PromptHub',
    content: `你是麦肯锡咨询顾问。请生成 PPT 大纲：

【主题】{{主题}}
【受众】{{受众：CEO/客户/全员/...}}
【时长】{{时长}} 分钟
【目的】{{目的：说服/汇报/培训/...}}

输出：
1. 一句话核心论点（电梯演讲版）
2. 故事线（金字塔结构）
3. 逐页大纲（共 15 页）：每页标题 + 3 个要点 + 建议可视化方式（图表类型）
4. 开场页与结束页的关键文案
5. Q&A 环节预估的 5 个尖锐问题与应答`,
  },

  // ===== 电商运营 =====
  {
    title: '电商商品标题优化',
    description: '生成 SEO + 转化双优的电商商品标题',
    categoryName: '电商运营',
    tags: ['电商', '标题', 'SEO'],
    isPinned: true,
    isFavorite: true,
    author: 'PromptHub',
    content: `你是 10 年经验的电商运营。请为以下商品生成 5 个标题方案：

【平台】{{平台：淘宝/京东/拼多多/抖音}}
【商品】{{商品名称}}
【核心卖点】{{核心卖点}}
【目标人群】{{目标人群}}
【热搜词】{{已知热搜词}}

每个标题要求：
1. ≤30 字（淘宝）/ ≤50 字（京东）
2. 结构：品牌 + 核心词 + 属性词 + 促销词
3. 关键词覆盖：1 个主词 + 2-3 个长尾词
4. 避免极限词违禁词

输出：5 个标题 + 每个标题的关键词解析 + 推荐排序`,
  },
  {
    title: '商品详情页文案',
    description: '高转化详情页 5 段式文案',
    categoryName: '电商运营',
    tags: ['电商', '详情页', '文案'],
    author: 'PromptHub',
    content: `你是详情页转化专家。请按 5 段式生成详情页文案：

【商品】{{商品}}
【价格带】{{价格带}}
【竞品痛点】{{竞品痛点}}
【目标人群】{{目标人群}}

5 段式结构：
1. 痛点共鸣：用 1 个生活场景戳中用户
2. 解决方案：本商品如何解决
3. 信任背书：参数 + 测评 + 销量 + 评价
4. 使用场景：3 个真实场景化描述
5. 行动召唤：限时优惠 + 7 天无理由 + 顺丰包邮

每段 100-150 字，配 emoji 与排版符号`,
  },
  {
    title: '直播带货脚本',
    description: '30 分钟单品直播脚本含话术与节奏',
    categoryName: '电商运营',
    tags: ['直播', '带货', '脚本'],
    author: 'PromptHub',
    content: `你是李佳琦式金牌主播。请生成单品 30 分钟直播脚本：

【商品】{{商品}}
【直播价】{{直播价}}（日常价 {{日常价}}）
【库存】{{库存}} 件
【核心卖点】{{核心卖点}}

输出按时间轴：
- 0-3 分钟：暖场 + 痛点铺垫（话术示例）
- 3-8 分钟：产品展示 + 卖点逐个击破
- 8-12 分钟：对比演示（与竞品/日常版对比）
- 12-18 分钟：用户证言 + 现场答疑
- 18-25 分钟：限量开抢 + 催单话术
- 25-30 分钟：返场 + 加单引导

每段标注：情绪、语速、镜头动作、互动话术`,
  },
  {
    title: '客服话术库',
    description: '售前售后常见问题标准回复',
    categoryName: '电商运营',
    tags: ['客服', '话术', '售后'],
    author: 'PromptHub',
    content: `你是电商客服主管。请生成 {{商品类别}} 的客服话术库：

【商品类别】{{商品类别}}
【常见售后场景】{{常见场景：质量问题/物流延迟/退换货/...}}

输出表格：
| 场景 | 用户原话示例 | 标准回复 | 升级条件 | 备注 |

要求：
1. 每个场景至少 3 个变体回复（礼貌版/亲切版/简洁版）
2. 涉及金额的给出明确话术（如部分退款/补偿券）
3. 标注平台违禁词替换（如"微信"→"私信"）
4. 给出 5 个安抚情绪的金句`,
  },

  // ===== AI 模特商拍 =====
  {
    title: 'AI 男装羽绒服模特提示词',
    description: '男装羽绒服 AI 模特图生成提示词',
    categoryName: 'AI模特商拍',
    tags: ['AI 模特', '男装', '羽绒服'],
    isPinned: true,
    author: 'PromptHub',
    content: `你是一位 AI 商业摄影师。请生成男装羽绒服 AI 模特图提示词：

【款式】{{款式：长款/短款/oversize}}
【颜色】{{颜色}}
【目标人群】{{目标人群：年轻潮流/商务通勤/户外运动}}
【拍摄场景】{{场景：街拍/雪地/咖啡店/...}}

输出（中英双语）：
1. Stable Diffusion / Midjourney 完整 prompt
2. 负面提示词 negative prompt
3. 推荐参数：steps、CFG、sampler、size
4. LoRA 建议（如适用）
5. 后期修图要点`,
  },
  {
    title: 'AI 通用换装提示词',
    description: '任意服装 AI 换装通用提示词',
    categoryName: 'AI模特商拍',
    tags: ['AI 换装', '虚拟试衣'],
    author: 'PromptHub',
    content: `你是 AI 换装工程师。请生成通用换装提示词：

【原模特图描述】{{原模特图描述}}
【新服装描述】{{新服装描述}}
【风格要求】{{风格要求：真实/卡通/油画}}

输出：
1. ControlNet 配置建议（OpenPose / Canny / Depth 哪个？）
2. IP-Adapter 或参考图权重
3. 完整 prompt（含质量词）
4. 多次生成时的种子管理建议
5. 常见失败案例与对策`,
  },
  {
    title: 'AI 场景生成提示词',
    description: '为商品图生成对应拍摄场景',
    categoryName: 'AI模特商拍',
    tags: ['AI 场景', '商品图'],
    author: 'PromptHub',
    content: `你是 AI 场景设计师。请为以下商品生成拍摄场景：

【商品】{{商品}}
【风格定位】{{风格：极简/奢华/自然/科技}}
【色调】{{色调}}
【目标用途】{{目标用途：详情页首图/海报/社媒}}

输出：
1. 3 个场景方案（每个 80 字以内描述）
2. Midjourney 提示词（含 --ar --style --v 等参数）
3. 商品与场景的光影匹配建议
4. 后期合成要点（阴影方向、透视、色温）`,
  },

  // ===== AI 短剧 =====
  {
    title: 'AI 短剧剧本创作',
    description: '生成 3 集竖屏短剧剧本',
    categoryName: 'AI短剧制作',
    tags: ['短剧', '剧本', 'AI 视频'],
    isPinned: true,
    isFavorite: true,
    author: 'PromptHub',
    content: `你是爆款短剧编剧。请创作 3 集竖屏短剧剧本：

【题材】{{题材：霸总/重生/复仇/甜宠/穿越}}
【主角设定】{{主角设定}}
【核心冲突】{{核心冲突}}
【单集时长】{{单集时长}} 分钟

每集输出：
1. 集名（带钩子）
2. 角色表（角色名 + 一句话设定 + 性格标签）
3. 分场剧本（场次 / 场景 / 时长 / 角色 / 画面描述 / 对白）
4. 每集结尾的钩子设计（让人想看下一集）
5. 总览的剧情节奏曲线（标注每集的高潮点）`,
  },
  {
    title: 'AI 分镜脚本',
    description: '把剧本拆解为可拍摄的分镜',
    categoryName: 'AI短剧制作',
    tags: ['分镜', 'AI 短剧', '导演'],
    author: 'PromptHub',
    content: `你是分镜师。请把以下剧本段落拆解为分镜脚本：

【剧本段落】
{{剧本}}

【画幅】{{画幅：9:16 竖屏 / 16:9 横屏}}
【AI 工具】{{工具：Runway/Pika/Sora/Kling}}

输出表格：
| 镜号 | 时长 | 景别 | 角度 | 画面描述 | AI 生成 prompt | 配音/音效 | 转场 |

每个镜头的 AI prompt 要求：
1. 主体 + 动作 + 环境 + 光线 + 镜头语言
2. 中英双语
3. 标注是否需要图生视频（首帧参考）`,
  },
  {
    title: 'AI 配音脚本',
    description: '为短剧角色生成 AI 配音文本',
    categoryName: 'AI短剧制作',
    tags: ['AI 配音', 'TTS', '短剧'],
    author: 'PromptHub',
    content: `你是 AI 配音导演。请把以下对白转化为 TTS 友好的配音脚本：

【角色】{{角色名}} - {{性别}} - {{年龄段}} - {{性格}}
【TTS 工具】{{工具：ElevenLabs/Azure/字节TTS/...}}
【原始对白】
{{对白}}

输出：
1. 标注每句的情感（冷漠/愤怒/惊喜/哭腔/...）与语速（0.8x-1.2x）
2. 在停顿处插入 [pause=500ms] 标记
3. 多音字标注发音
4. 重音字加粗
5. 推荐声音 ID（如适用）`,
  },
]

export async function seedIfEmpty(): Promise<void> {
  if (typeof localStorage === 'undefined') return
  if (localStorage.getItem(SEEDED_FLAG)) return

  const existingCats = await queryCategories()
  if (existingCats.length > 0) {
    localStorage.setItem(SEEDED_FLAG, '1')
    return
  }

  // 创建分类，建立 name -> Category 映射
  const catMap = new Map<string, Category>()
  for (const def of CATEGORIES) {
    const cat = await createCategory({
      name: def.name,
      description: def.description,
      icon: def.icon,
      color: def.color,
      parentId: def.parentName ? catMap.get(def.parentName)?.id ?? null : null,
    })
    catMap.set(def.name, cat)
  }

  // 创建提示词
  for (const p of PROMPTS) {
    const cat = catMap.get(p.categoryName)
    await createPrompt({
      title: p.title,
      content: p.content,
      description: p.description,
      categoryId: cat?.id ?? null,
      tags: p.tags ?? [],
      isPinned: p.isPinned ?? false,
      isFavorite: p.isFavorite ?? false,
      author: p.author,
    })
  }

  localStorage.setItem(SEEDED_FLAG, '1')
}

export async function isSeeded(): Promise<boolean> {
  if (typeof localStorage === 'undefined') return false
  return localStorage.getItem(SEEDED_FLAG) === '1'
}

export async function resetSeedFlag(): Promise<void> {
  if (typeof localStorage === 'undefined') return
  localStorage.removeItem(SEEDED_FLAG)
}
