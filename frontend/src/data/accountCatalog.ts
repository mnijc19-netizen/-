import { AccountType } from '../types';

export interface CanonicalAccountItem {
  id: string;
  name: string;
  type: AccountType;
  category: 'popular' | 'wallet_bnpl' | 'bank' | 'investment' | 'cash_other';
  isLiability: boolean;
  bankName?: string;
  defaultSelected?: boolean;
  suggestedBalance?: number;
  description: string;
}

export const CANONICAL_ACCOUNT_CATALOG: CanonicalAccountItem[] = [
  // 1. Popular Presets (最常用 8 大核心预设 · 默认首选)
  {
    id: 'wechat',
    name: '微信零钱',
    type: 'wallet',
    category: 'popular',
    isLiability: false,
    defaultSelected: true,
    suggestedBalance: 200,
    description: '微信日常小额消费与收发红包'
  },
  {
    id: 'alipay',
    name: '支付宝 (含余额宝)',
    type: 'wallet',
    category: 'popular',
    isLiability: false,
    defaultSelected: true,
    suggestedBalance: 1500,
    description: '日常扫码支付与余额宝活期理财'
  },
  {
    id: 'bank_cmb',
    name: '招商银行储蓄卡',
    type: 'bank',
    bankName: '招商银行',
    category: 'popular',
    isLiability: false,
    defaultSelected: true,
    suggestedBalance: 5000,
    description: '主要发薪卡与日常消费卡'
  },
  {
    id: 'bank_icbc',
    name: '中国工商银行储蓄卡',
    type: 'bank',
    bankName: '工商银行',
    category: 'popular',
    isLiability: false,
    defaultSelected: false,
    suggestedBalance: 3000,
    description: '大额资金储备与发薪'
  },
  {
    id: 'bank_ccb',
    name: '中国建设银行储蓄卡',
    type: 'bank',
    bankName: '建设银行',
    category: 'popular',
    isLiability: false,
    defaultSelected: false,
    suggestedBalance: 3000,
    description: '房贷月供或主力银行储蓄'
  },
  {
    id: 'jd_baitiao',
    name: '京东白条 (消费信贷)',
    type: 'baitiao',
    bankName: '京东金融',
    category: 'popular',
    isLiability: true,
    defaultSelected: true,
    suggestedBalance: 600,
    description: '京东购物月付额度（待还负债）'
  },
  {
    id: 'huabei',
    name: '蚂蚁花呗 (月付信贷)',
    type: 'huabei',
    bankName: '蚂蚁消金',
    category: 'popular',
    isLiability: true,
    defaultSelected: false,
    suggestedBalance: 500,
    description: '淘宝天猫月付额度（待还负债）'
  },
  {
    id: 'fund',
    name: '基金与证券持仓',
    type: 'investment',
    category: 'popular',
    isLiability: false,
    defaultSelected: false,
    suggestedBalance: 2000,
    description: '天天基金/券商股票证券组合'
  },
  {
    id: 'cash',
    name: '随身应急现金',
    type: 'cash',
    category: 'popular',
    isLiability: false,
    defaultSelected: false,
    suggestedBalance: 200,
    description: '钱包实体钞票备用金'
  },

  // 2. Wallets & BNPL (钱包与消费信贷)
  {
    id: 'wechat_lingqiantong',
    name: '微信零钱通',
    type: 'wallet',
    category: 'wallet_bnpl',
    isLiability: false,
    defaultSelected: false,
    suggestedBalance: 1000,
    description: '微信活期收益理财'
  },
  {
    id: 'jiebei',
    name: '蚂蚁借呗 (短期借贷)',
    type: 'jiebei',
    bankName: '蚂蚁消金',
    category: 'wallet_bnpl',
    isLiability: true,
    defaultSelected: false,
    suggestedBalance: 0,
    description: '现金借款本金待还'
  },
  {
    id: 'meituan_pay',
    name: '美团月付 (消费信贷)',
    type: 'meituan_pay',
    bankName: '美团',
    category: 'wallet_bnpl',
    isLiability: true,
    defaultSelected: false,
    suggestedBalance: 150,
    description: '美团外卖与买菜月付待还'
  },
  {
    id: 'douyin_pay',
    name: '抖音月付 (消费信贷)',
    type: 'douyin_pay',
    bankName: '抖音',
    category: 'wallet_bnpl',
    isLiability: true,
    defaultSelected: false,
    suggestedBalance: 100,
    description: '抖音商城与直播带货分期待还'
  },
  {
    id: 'fenfu',
    name: '微信分付 (消费信贷)',
    type: 'fenfu',
    bankName: '财付通',
    category: 'wallet_bnpl',
    isLiability: true,
    defaultSelected: false,
    suggestedBalance: 200,
    description: '微信先用后付额度待还'
  },
  {
    id: 'ecny',
    name: '数字人民币钱包',
    type: 'wallet',
    bankName: '中国人民银行',
    category: 'wallet_bnpl',
    isLiability: false,
    defaultSelected: false,
    suggestedBalance: 100,
    description: '法定央行数字货币钱包'
  },

  // 3. Banking Institutions (六大国有行 + 头部股份制行 + 城商行)
  {
    id: 'bank_abc',
    name: '中国农业银行储蓄卡',
    type: 'bank',
    bankName: '农业银行',
    category: 'bank',
    isLiability: false,
    defaultSelected: false,
    suggestedBalance: 2000,
    description: '农行借记卡账户'
  },
  {
    id: 'bank_boc',
    name: '中国银行储蓄卡',
    type: 'bank',
    bankName: '中国银行',
    category: 'bank',
    isLiability: false,
    defaultSelected: false,
    suggestedBalance: 2000,
    description: '中行借记卡与外币账户'
  },
  {
    id: 'bank_bocom',
    name: '交通银行储蓄卡',
    type: 'bank',
    bankName: '交通银行',
    category: 'bank',
    isLiability: false,
    defaultSelected: false,
    suggestedBalance: 2000,
    description: '交行借记卡账户'
  },
  {
    id: 'bank_psbc',
    name: '中国邮政储蓄银行卡',
    type: 'bank',
    bankName: '邮储银行',
    category: 'bank',
    isLiability: false,
    defaultSelected: false,
    suggestedBalance: 2000,
    description: '邮储银行借记卡'
  },
  {
    id: 'bank_cib',
    name: '兴业银行储蓄卡',
    type: 'bank',
    bankName: '兴业银行',
    category: 'bank',
    isLiability: false,
    defaultSelected: false,
    suggestedBalance: 3000,
    description: '兴业银行日常账户'
  },
  {
    id: 'bank_citic',
    name: '中信银行储蓄卡',
    type: 'bank',
    bankName: '中信银行',
    category: 'bank',
    isLiability: false,
    defaultSelected: false,
    suggestedBalance: 3000,
    description: '中信银行借记卡'
  },
  {
    id: 'bank_spdb',
    name: '浦发银行储蓄卡',
    type: 'bank',
    bankName: '浦发银行',
    category: 'bank',
    isLiability: false,
    defaultSelected: false,
    suggestedBalance: 3000,
    description: '浦发银行借记卡'
  },
  {
    id: 'bank_cmbc',
    name: '中国民生银行储蓄卡',
    type: 'bank',
    bankName: '民生银行',
    category: 'bank',
    isLiability: false,
    defaultSelected: false,
    suggestedBalance: 3000,
    description: '民生银行借记卡'
  },
  {
    id: 'bank_ceb',
    name: '中国光大银行储蓄卡',
    type: 'bank',
    bankName: '光大银行',
    category: 'bank',
    isLiability: false,
    defaultSelected: false,
    suggestedBalance: 3000,
    description: '光大银行借记卡'
  },
  {
    id: 'bank_pab',
    name: '平安银行储蓄卡',
    type: 'bank',
    bankName: '平安银行',
    category: 'bank',
    isLiability: false,
    defaultSelected: false,
    suggestedBalance: 3000,
    description: '平安口袋银行账户'
  },
  {
    id: 'bank_cgb',
    name: '广发银行储蓄卡',
    type: 'bank',
    bankName: '广发银行',
    category: 'bank',
    isLiability: false,
    defaultSelected: false,
    suggestedBalance: 3000,
    description: '广发借记卡账户'
  },
  {
    id: 'bank_xm',
    name: '厦门银行储蓄卡',
    type: 'bank',
    bankName: '厦门银行',
    category: 'bank',
    isLiability: false,
    defaultSelected: false,
    suggestedBalance: 2000,
    description: '厦门银行两岸特色账户'
  },
  {
    id: 'bank_fjnx',
    name: '福建农信卡',
    type: 'bank',
    bankName: '福建农信',
    category: 'bank',
    isLiability: false,
    defaultSelected: false,
    suggestedBalance: 2000,
    description: '福建省农村信用社社保与储蓄卡'
  },

  // 4. Investments & Securities (证券与投资)
  {
    id: 'tiantian_fund',
    name: '天天基金账户',
    type: 'investment',
    bankName: '天天基金',
    category: 'investment',
    isLiability: false,
    defaultSelected: false,
    suggestedBalance: 3000,
    description: '公募基金与定投组合'
  },
  {
    id: 'htsc',
    name: '华泰证券账户',
    type: 'investment',
    bankName: '华泰证券',
    category: 'investment',
    isLiability: false,
    defaultSelected: false,
    suggestedBalance: 5000,
    description: 'A股股票与ETF证券持仓'
  },
  {
    id: 'eastmoney',
    name: '东方财富证券',
    type: 'investment',
    bankName: '东方财富',
    category: 'investment',
    isLiability: false,
    defaultSelected: false,
    suggestedBalance: 5000,
    description: '东财股票与可转债账户'
  },
  {
    id: 'futu',
    name: '富途牛牛账户',
    type: 'investment',
    bankName: '富途证券',
    category: 'investment',
    isLiability: false,
    defaultSelected: false,
    suggestedBalance: 5000,
    description: '港美股境外证券资产'
  },
  {
    id: 'crypto_wallet',
    name: 'Web3 / 加密资产持仓',
    type: 'crypto',
    category: 'investment',
    isLiability: false,
    defaultSelected: false,
    suggestedBalance: 1000,
    description: 'BTC / ETH / USDT 等加密数字资产'
  },

  // 5. Large Debt & Fixed Assets (借贷负债与固定资产)
  {
    id: 'credit_card',
    name: '银行信用卡 (待还账单)',
    type: 'credit',
    category: 'cash_other',
    isLiability: true,
    defaultSelected: false,
    suggestedBalance: 2000,
    description: '信用卡账单本期应还款'
  },
  {
    id: 'house_loan',
    name: '房屋抵押按揭贷款',
    type: 'loan',
    category: 'cash_other',
    isLiability: true,
    defaultSelected: false,
    suggestedBalance: 500000,
    description: '长期住房公积金/商业按揭借贷'
  },
  {
    id: 'car_loan',
    name: '汽车消费分期贷款',
    type: 'loan',
    category: 'cash_other',
    isLiability: true,
    defaultSelected: false,
    suggestedBalance: 60000,
    description: '车辆分期还款待还本金'
  }
];
