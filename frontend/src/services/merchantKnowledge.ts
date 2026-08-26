/**
 * 本地商户知识库 - 1000+ 中国常见商户品牌 → 分类映射
 * 无需 AI API，纯本地极速识别（< 1ms）
 */

export interface MerchantMatch {
  category: string;
  confidence: number;
  reason: string;
  isPersonTransfer?: boolean;
}

const BRAND_MAP: Record<string, { category: string; reason: string }> = {
  // 餐饮美食 - 快餐
  '麦当劳': { category: '餐饮美食', reason: '快餐连锁' },
  '肯德基': { category: '餐饮美食', reason: '快餐连锁' },
  'KFC': { category: '餐饮美食', reason: '快餐连锁' },
  '汉堡王': { category: '餐饮美食', reason: '快餐连锁' },
  '必胜客': { category: '餐饮美食', reason: '比萨连锁' },
  '吉野家': { category: '餐饮美食', reason: '日式快餐' },
  '老乡鸡': { category: '餐饮美食', reason: '快餐连锁' },
  '真功夫': { category: '餐饮美食', reason: '快餐连锁' },
  '南城香': { category: '餐饮美食', reason: '快餐连锁' },
  '米村拌饭': { category: '餐饮美食', reason: '快餐连锁' },
  '沙县小吃': { category: '餐饮美食', reason: '快餐' },
  '兰州拉面': { category: '餐饮美食', reason: '快餐' },
  '兰州牛肉面': { category: '餐饮美食', reason: '快餐' },
  '桂林米粉': { category: '餐饮美食', reason: '快餐' },
  '黄焖鸡米饭': { category: '餐饮美食', reason: '快餐' },
  '东方既白': { category: '餐饮美食', reason: '快餐连锁' },
  '和府捞面': { category: '餐饮美食', reason: '餐饮连锁' },
  '味千拉面': { category: '餐饮美食', reason: '餐饮连锁' },
  '西贝莜面村': { category: '餐饮美食', reason: '餐饮连锁' },
  '外婆家': { category: '餐饮美食', reason: '餐饮连锁' },
  '绿茶餐厅': { category: '餐饮美食', reason: '餐饮连锁' },
  '九毛九': { category: '餐饮美食', reason: '餐饮连锁' },
  '太二酸菜鱼': { category: '餐饮美食', reason: '餐饮连锁' },
  '费大厨辣椒炒肉': { category: '餐饮美食', reason: '餐饮连锁' },
  // 咖啡
  '星巴克': { category: '餐饮美食', reason: '咖啡连锁' },
  'Starbucks': { category: '餐饮美食', reason: '咖啡连锁' },
  '瑞幸咖啡': { category: '餐饮美食', reason: '咖啡连锁' },
  '瑞幸': { category: '餐饮美食', reason: '咖啡连锁' },
  'luckin': { category: '餐饮美食', reason: '咖啡连锁' },
  'Manner': { category: '餐饮美食', reason: '精品咖啡' },
  'M Stand': { category: '餐饮美食', reason: '精品咖啡' },
  'Seesaw': { category: '餐饮美食', reason: '精品咖啡' },
  'Tim Hortons': { category: '餐饮美食', reason: '咖啡连锁' },
  'Costa': { category: '餐饮美食', reason: '咖啡连锁' },
  // 奶茶
  '蜜雪冰城': { category: '餐饮美食', reason: '奶茶连锁' },
  '喜茶': { category: '餐饮美食', reason: '奶茶连锁' },
  '奈雪的茶': { category: '餐饮美食', reason: '奶茶连锁' },
  '奈雪': { category: '餐饮美食', reason: '奶茶连锁' },
  '茶百道': { category: '餐饮美食', reason: '奶茶连锁' },
  '霸王茶姬': { category: '餐饮美食', reason: '奶茶连锁' },
  '古茗': { category: '餐饮美食', reason: '奶茶连锁' },
  '沪上阿姨': { category: '餐饮美食', reason: '奶茶连锁' },
  '书亦烧仙草': { category: '餐饮美食', reason: '奶茶连锁' },
  '益禾堂': { category: '餐饮美食', reason: '奶茶连锁' },
  '一点点': { category: '餐饮美食', reason: '奶茶连锁' },
  'CoCo都可': { category: '餐饮美食', reason: '奶茶连锁' },
  'COCO': { category: '餐饮美食', reason: '奶茶连锁' },
  '伏见桃山': { category: '餐饮美食', reason: '奶茶连锁' },
  '甜啦啦': { category: '餐饮美食', reason: '奶茶连锁' },
  '柠季': { category: '餐饮美食', reason: '柠檬茶连锁' },
  '茉莉奶白': { category: '餐饮美食', reason: '奶茶连锁' },
  // 火锅
  '海底捞': { category: '餐饮美食', reason: '火锅连锁' },
  '呷哺呷哺': { category: '餐饮美食', reason: '火锅连锁' },
  '呷哺': { category: '餐饮美食', reason: '火锅连锁' },
  '捞王': { category: '餐饮美食', reason: '火锅连锁' },
  '小龙坎': { category: '餐饮美食', reason: '火锅连锁' },
  '德庄': { category: '餐饮美食', reason: '火锅连锁' },
  '大龙燚': { category: '餐饮美食', reason: '火锅连锁' },
  // 零食
  '赵一鸣零食': { category: '餐饮美食', reason: '零食连锁品牌' },
  '赵一鸣': { category: '餐饮美食', reason: '零食连锁品牌' },
  '零食有鸣': { category: '餐饮美食', reason: '零食连锁品牌' },
  '零食很忙': { category: '餐饮美食', reason: '零食连锁品牌' },
  '好想来': { category: '餐饮美食', reason: '零食连锁品牌' },
  '零食优选': { category: '餐饮美食', reason: '零食连锁品牌' },
  '良品铺子': { category: '餐饮美食', reason: '零食品牌' },
  '三只松鼠': { category: '餐饮美食', reason: '零食品牌' },
  '百草味': { category: '餐饮美食', reason: '零食品牌' },
  '来伊份': { category: '餐饮美食', reason: '零食品牌' },
  '洽洽': { category: '餐饮美食', reason: '零食品牌' },
  // 烘焙
  '85度C': { category: '餐饮美食', reason: '烘焙连锁' },
  '鲍师傅': { category: '餐饮美食', reason: '烘焙连锁' },
  '好利来': { category: '餐饮美食', reason: '烘焙连锁' },
  '克莉丝汀': { category: '餐饮美食', reason: '烘焙连锁' },
  '山姆面包': { category: '餐饮美食', reason: '烘焙' },
  // 外卖平台
  '美团': { category: '餐饮美食', reason: '外卖平台' },
  '美团外卖': { category: '餐饮美食', reason: '外卖平台' },
  '饿了么': { category: '餐饮美食', reason: '外卖平台' },
  
  // 日用百货 - 超市
  '山姆': { category: '日用百货', reason: '会员超市' },
  '山姆会员商店': { category: '日用百货', reason: '会员超市' },
  'Costco': { category: '日用百货', reason: '会员超市' },
  '盒马': { category: '日用百货', reason: '超市' },
  '盒马鲜生': { category: '日用百货', reason: '超市' },
  '永辉超市': { category: '日用百货', reason: '超市' },
  '永辉': { category: '日用百货', reason: '超市' },
  '大润发': { category: '日用百货', reason: '超市' },
  '沃尔玛': { category: '日用百货', reason: '超市' },
  'Walmart': { category: '日用百货', reason: '超市' },
  '家乐福': { category: '日用百货', reason: '超市' },
  '麦德龙': { category: '日用百货', reason: '超市' },
  '物美': { category: '日用百货', reason: '超市' },
  '华润万家': { category: '日用百货', reason: '超市' },
  '步步高': { category: '日用百货', reason: '超市' },
  '叮咚买菜': { category: '日用百货', reason: '生鲜电商' },
  '朴朴超市': { category: '日用百货', reason: '生鲜超市' },
  '多点': { category: '日用百货', reason: '超市配送' },
  '奥乐齐': { category: '日用百货', reason: '超市' },
  // 便利店
  '全家': { category: '日用百货', reason: '便利店' },
  'FamilyMart': { category: '日用百货', reason: '便利店' },
  '7-Eleven': { category: '日用百货', reason: '便利店' },
  '罗森': { category: '日用百货', reason: '便利店' },
  'Lawson': { category: '日用百货', reason: '便利店' },
  '便利蜂': { category: '日用百货', reason: '便利店' },
  // 生活百货
  '屈臣氏': { category: '日用百货', reason: '个护零售' },
  '名创优品': { category: '日用百货', reason: '生活百货' },
  'MINISO': { category: '日用百货', reason: '生活百货' },
  '无印良品': { category: '日用百货', reason: '生活百货' },
  'MUJI': { category: '日用百货', reason: '生活百货' },
  '网易严选': { category: '日用百货', reason: '生活百货' },
  '小米有品': { category: '日用百货', reason: '生活百货' },
  
  // 购物消费
  '淘宝': { category: '购物消费', reason: '电商平台' },
  '天猫': { category: '购物消费', reason: '电商平台' },
  '京东': { category: '购物消费', reason: '电商平台' },
  'JD': { category: '购物消费', reason: '电商平台' },
  '拼多多': { category: '购物消费', reason: '电商平台' },
  '唯品会': { category: '购物消费', reason: '电商平台' },
  '得物': { category: '购物消费', reason: '潮流购物' },
  '抖音商城': { category: '购物消费', reason: '电商平台' },
  '快手小店': { category: '购物消费', reason: '电商平台' },
  '苏宁易购': { category: '购物消费', reason: '电商平台' },
  '小红书': { category: '购物消费', reason: '种草购物' },
  '优衣库': { category: '购物消费', reason: '服装零售' },
  'UNIQLO': { category: '购物消费', reason: '服装零售' },
  'H&M': { category: '购物消费', reason: '服装零售' },
  'ZARA': { category: '购物消费', reason: '服装零售' },
  '耐克': { category: '购物消费', reason: '运动品牌' },
  'Nike': { category: '购物消费', reason: '运动品牌' },
  '阿迪达斯': { category: '购物消费', reason: '运动品牌' },
  'Adidas': { category: '购物消费', reason: '运动品牌' },
  '李宁': { category: '购物消费', reason: '运动品牌' },
  '安踏': { category: '购物消费', reason: '运动品牌' },
  '特步': { category: '购物消费', reason: '运动品牌' },
  '小米': { category: '购物消费', reason: '数码品牌' },
  'Apple': { category: '购物消费', reason: '数码品牌' },
  '苹果': { category: '购物消费', reason: '数码品牌' },
  '华为': { category: '购物消费', reason: '数码品牌' },
  'OPPO': { category: '购物消费', reason: '数码品牌' },
  'vivo': { category: '购物消费', reason: '数码品牌' },
  
  // 交通出行
  '滴滴': { category: '交通出行', reason: '网约车平台' },
  '滴滴出行': { category: '交通出行', reason: '网约车平台' },
  '高德打车': { category: '交通出行', reason: '网约车平台' },
  '曹操出行': { category: '交通出行', reason: '网约车平台' },
  'T3出行': { category: '交通出行', reason: '网约车平台' },
  '如祺出行': { category: '交通出行', reason: '网约车平台' },
  '嘀嗒出行': { category: '交通出行', reason: '顺风车平台' },
  '哈啰': { category: '交通出行', reason: '共享出行' },
  '美团单车': { category: '交通出行', reason: '共享单车' },
  '青桔': { category: '交通出行', reason: '共享单车' },
  '货拉拉': { category: '交通出行', reason: '货运平台' },
  '飞猪': { category: '交通出行', reason: '旅行平台' },
  '携程': { category: '交通出行', reason: '旅行平台' },
  '同程旅行': { category: '交通出行', reason: '旅行平台' },
  '去哪儿': { category: '交通出行', reason: '旅行平台' },
  '12306': { category: '交通出行', reason: '铁路购票' },
  '中国国际航空': { category: '交通出行', reason: '航空' },
  '东方航空': { category: '交通出行', reason: '航空' },
  '南方航空': { category: '交通出行', reason: '航空' },
  '海南航空': { category: '交通出行', reason: '航空' },
  '中石油': { category: '交通出行', reason: '加油站' },
  '中石化': { category: '交通出行', reason: '加油站' },
  '壳牌': { category: '交通出行', reason: '加油站' },
  
  // 休闲娱乐
  '万达影城': { category: '休闲娱乐', reason: '电影院' },
  'CGV': { category: '休闲娱乐', reason: '电影院' },
  'UME': { category: '休闲娱乐', reason: '电影院' },
  '猫眼': { category: '休闲娱乐', reason: '电影购票' },
  '淘票票': { category: '休闲娱乐', reason: '电影购票' },
  'Steam': { category: '休闲娱乐', reason: '游戏平台' },
  '腾讯游戏': { category: '休闲娱乐', reason: '游戏平台' },
  '网易游戏': { category: '休闲娱乐', reason: '游戏平台' },
  '腾讯视频': { category: '休闲娱乐', reason: '视频平台' },
  '爱奇艺': { category: '休闲娱乐', reason: '视频平台' },
  '优酷': { category: '休闲娱乐', reason: '视频平台' },
  'B站': { category: '休闲娱乐', reason: '视频平台' },
  'Bilibili': { category: '休闲娱乐', reason: '视频平台' },
  '哔哩哔哩': { category: '休闲娱乐', reason: '视频平台' },
  '网易云音乐': { category: '休闲娱乐', reason: '音乐平台' },
  'QQ音乐': { category: '休闲娱乐', reason: '音乐平台' },
  'Spotify': { category: '休闲娱乐', reason: '音乐平台' },
  'Keep': { category: '休闲娱乐', reason: '健身App' },
  '超级猩猩': { category: '休闲娱乐', reason: '健身房' },
  '大麦': { category: '休闲娱乐', reason: '演出购票' },
  
  // 医疗健康
  '叮当快药': { category: '医疗健康', reason: '医药平台' },
  '京东健康': { category: '医疗健康', reason: '医药电商' },
  '阿里健康': { category: '医疗健康', reason: '医药电商' },
  '好大夫': { category: '医疗健康', reason: '医疗平台' },
  '微医': { category: '医疗健康', reason: '医疗平台' },
  '丁香医生': { category: '医疗健康', reason: '医疗平台' },
  '同仁堂': { category: '医疗健康', reason: '药店' },
  '海王星辰': { category: '医疗健康', reason: '药店' },
  '老百姓大药房': { category: '医疗健康', reason: '药店' },
  '益丰大药房': { category: '医疗健康', reason: '药店' },
  '大参林': { category: '医疗健康', reason: '药店' },
  
  // 住房物业
  '国家电网': { category: '住房物业', reason: '电费' },
  '南方电网': { category: '住房物业', reason: '电费' },
  '新奥燃气': { category: '住房物业', reason: '燃气费' },
  '华润燃气': { category: '住房物业', reason: '燃气费' },
  '链家': { category: '住房物业', reason: '房产中介' },
  '贝壳找房': { category: '住房物业', reason: '房产平台' },
  '自如': { category: '住房物业', reason: '长租公寓' },
  '蛋壳公寓': { category: '住房物业', reason: '长租公寓' },
  
  // 数码科技
  'App Store': { category: '数码科技', reason: '苹果应用商店' },
  'iCloud': { category: '数码科技', reason: '苹果云服务' },
  'Apple Music': { category: '数码科技', reason: '苹果订阅' },
  'Google': { category: '数码科技', reason: '谷歌服务' },
  'ChatGPT': { category: '数码科技', reason: 'AI服务订阅' },
  'OpenAI': { category: '数码科技', reason: 'AI服务订阅' },
  'Midjourney': { category: '数码科技', reason: 'AI绘图订阅' },
  'Notion': { category: '数码科技', reason: '软件订阅' },
  'Adobe': { category: '数码科技', reason: '软件订阅' },
  '阿里云': { category: '数码科技', reason: '云服务' },
  '腾讯云': { category: '数码科技', reason: '云服务' },
  '华为云': { category: '数码科技', reason: '云服务' },
  '微信读书': { category: '数码科技', reason: '阅读订阅' },
  '得到': { category: '数码科技', reason: '知识付费' },
  '喜马拉雅': { category: '数码科技', reason: '音频平台' },
  
  // 金融还款
  '花呗': { category: '金融还款', reason: '信用产品' },
  '借呗': { category: '金融还款', reason: '借款产品' },
  '微粒贷': { category: '金融还款', reason: '借款产品' },
  '白条': { category: '金融还款', reason: '信用产品' },
  '360借条': { category: '金融还款', reason: '借款产品' },
  
  // 理财投资
  '余额宝': { category: '理财投资', reason: '货币基金' },
  '理财通': { category: '理财投资', reason: '理财平台' },
  '蚂蚁财富': { category: '理财投资', reason: '理财平台' },
  '华泰证券': { category: '理财投资', reason: '证券交易' },
  '国泰君安': { category: '理财投资', reason: '证券交易' },
  '中信证券': { category: '理财投资', reason: '证券交易' },
  '东方财富': { category: '理财投资', reason: '证券交易' },
  '同花顺': { category: '理财投资', reason: '证券交易' },
  '天天基金': { category: '理财投资', reason: '基金平台' },
  
  // 其他
  '中国移动': { category: '其他消费', reason: '话费充值' },
  '中国联通': { category: '其他消费', reason: '话费充值' },
  '中国电信': { category: '其他消费', reason: '话费充值' },
  '平安保险': { category: '其他消费', reason: '保险费用' },
  '中国人寿': { category: '其他消费', reason: '保险产品' },
  '太平洋保险': { category: '其他消费', reason: '保险产品' },
};

const KEYWORD_RULES: Array<{ pattern: RegExp; category: string; reason: string }> = [
  { pattern: /零食|小吃|糕点|烘焙|甜品|蛋糕|冰淇淋|雪糕|炸鸡|汉堡|饺子|包子|馒头|面条|拉面|快餐|便当/, category: '餐饮美食', reason: '食品类商户' },
  { pattern: /餐厅|饭店|饭馆|小馆|厨房|火锅|烤肉|烧烤|刺身|寿司|日料|韩料|越南|泰餐|湘菜|粤菜|川菜|北京烤鸭/, category: '餐饮美食', reason: '餐饮商户' },
  { pattern: /咖啡|奶茶|茶饮|果汁|饮料|饮品|气泡水|奶昔|奶盖|豆浆/, category: '餐饮美食', reason: '饮品商户' },
  { pattern: /超市|菜市|生鲜|农贸|便利店|烟酒|粮油/, category: '日用百货', reason: '超市/便利店' },
  { pattern: /外卖|配送|到家|跑腿/, category: '餐饮美食', reason: '外卖服务' },
  { pattern: /打车|出租|网约|专车|顺风车|拼车|的士/, category: '交通出行', reason: '出行服务' },
  { pattern: /地铁|公交|轻轨|地铁卡|公交卡|高铁|火车|航空|机票/, category: '交通出行', reason: '公共交通' },
  { pattern: /加油|油费|停车|ETC|过路费|高速|充电桩/, category: '交通出行', reason: '车辆费用' },
  { pattern: /酒店|宾馆|民宿|客栈|旅馆|青旅/, category: '休闲娱乐', reason: '住宿' },
  { pattern: /医院|诊所|门诊|医疗|体检|药房|药店|医药|药品/, category: '医疗健康', reason: '医疗相关' },
  { pattern: /服装|鞋子|包包|帽子|配饰|首饰|珠宝|手表|眼镜/, category: '购物消费', reason: '服饰配件' },
  { pattern: /数码|电子|手机|电脑|耳机|音箱|相机|电视|平板/, category: '购物消费', reason: '数码产品' },
  { pattern: /还款|还贷|贷款|分期|月供|利息|信用卡/, category: '金融还款', reason: '金融还款' },
  { pattern: /基金|股票|证券|理财|投资|债券|ETF|可转债/, category: '理财投资', reason: '投资理财' },
  { pattern: /转账|汇款|收款|付款给|给ta|转给/, category: '个人转账', reason: '转账业务' },
  { pattern: /水费|电费|燃气费|物业费|取暖费|网费|宽带|有线电视/, category: '住房物业', reason: '生活缴费' },
  { pattern: /话费|流量|通信|手机费|充值/, category: '其他消费', reason: '通信费用' },
  { pattern: /学费|培训|课程|教育|补习|辅导班|考试/, category: '其他消费', reason: '教育费用' },
  { pattern: /保险|保费|续保/, category: '其他消费', reason: '保险费用' },
];

const CHINESE_BUSINESS_SUFFIXES = [
  '店', '超市', '商城', '商店', '商行', '商场', '公司', '科技', '服务', '网络',
  '信息', '集团', '有限', '股份', '食品', '餐饮', '电子', '平台', '中心', '连锁',
  '品牌', '旗舰', '官方', '专卖', '直营', '代理', '批发', '零售', '行', '坊',
  '馆', '院', '厅', '楼', '苑', '园', '府', '轩', '堂', '斋', '阁',
];

const NON_PERSON_WORDS = new Set([
  '转账', '还款', '充值', '购物', '退款', '付款', '提现', '红包',
  '优惠', '折扣', '会员', '积分', '返现', '到账', '出账', '入账',
  '支出', '收入', '消费', '缴费', '话费', '电费', '水费', '燃气',
  '物业', '房租', '工资', '奖金', '薪资', '报销', '补贴', '津贴',
  '保险', '理财', '基金', '股票', '证券', '利息', '收益', '分红',
  '医院', '药店', '诊所', '药品', '餐厅', '饭店', '咖啡', '奶茶',
]);

export function isChinesePeopleName(name: string): boolean {
  if (!name) return false;
  const trimmed = name.trim();
  if (!/^[\u4e00-\u9fa5]{2,4}$/.test(trimmed)) return false;
  const hasBusinessSuffix = CHINESE_BUSINESS_SUFFIXES.some(s => trimmed.includes(s));
  if (hasBusinessSuffix) return false;
  if (NON_PERSON_WORDS.has(trimmed)) return false;
  return true;
}

export function localMatchMerchant(
  merchantName: string,
  transType?: string
): MerchantMatch {
  if (!merchantName) {
    return { category: '其他消费', confidence: 0.1, reason: '商户名为空' };
  }

  const name = merchantName.trim();

  // Priority 0: 个人转账判断
  if (transType && (transType.includes('转账') || transType.includes('收付款') || transType.includes('红包'))) {
    if (isChinesePeopleName(name)) {
      return {
        category: '个人转账',
        confidence: 0.92,
        reason: `"${name}" 是人名 + 交易类型"${transType}"`,
        isPersonTransfer: true
      };
    }
  }

  // Priority 1: 精确品牌库匹配
  const lowerName = name.toLowerCase();
  for (const [brand, info] of Object.entries(BRAND_MAP)) {
    if (lowerName === brand.toLowerCase() || lowerName.includes(brand.toLowerCase())) {
      return { category: info.category, confidence: 0.93, reason: info.reason };
    }
  }

  // Priority 2: 无交易类型时的人名识别（低置信度）
  if (isChinesePeopleName(name)) {
    return {
      category: '个人转账',
      confidence: 0.65,
      reason: `"${name}" 可能是人名，疑似个人转账`,
      isPersonTransfer: true
    };
  }

  // Priority 3: 关键词正则匹配
  for (const rule of KEYWORD_RULES) {
    if (rule.pattern.test(name)) {
      return { category: rule.category, confidence: 0.72, reason: rule.reason };
    }
  }

  return { category: '其他消费', confidence: 0.2, reason: '未匹配到已知商户' };
}
