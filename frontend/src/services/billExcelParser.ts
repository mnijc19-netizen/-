import * as XLSX from 'xlsx';
import { suggestCategory } from './smsParser';
import { localStore } from './localStore';
import { Transaction } from '../types';

export interface ParsedBillItem {
  id: string;
  date: string;
  type: 'expense' | 'income' | 'other';
  amount: number;
  merchant: string;
  product: string;
  category: string;
  channel: string;
  status: string;
  orderId: string;
  rawText: string;
  selected: boolean;
  isDuplicate?: boolean;
}

export interface ParsedBillResult {
  channel: 'wechat' | 'alipay' | 'other';
  channelName: string;
  totalCount: number;
  expenseCount: number;
  incomeCount: number;
  totalExpense: number;
  totalIncome: number;
  dateRange: { start: string; end: string };
  items: ParsedBillItem[];
}

/**
 * Parses official WeChat Pay or Alipay exported .xlsx, .xls, or .csv bill files.
 * Zero CORS, 100% client-side precision, 0 hallucination on numbers, AI-enhanced categorization.
 */
export async function parseBillExcelOrCsv(file: File): Promise<ParsedBillResult> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
  
  if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
    throw new Error('账单文件工作表为空');
  }

  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1, raw: false, defval: '' });

  if (!rows || rows.length === 0) {
    throw new Error('未读取到有效账单数据');
  }

  // 1. Locate header row (Scan up to 50 rows)
  let headerRowIndex = -1;
  for (let i = 0; i < Math.min(rows.length, 50); i++) {
    const rowStr = (rows[i] || []).join(' ');
    if (
      (rowStr.includes('交易时间') || rowStr.includes('时间')) &&
      (rowStr.includes('金额') || rowStr.includes('收/支') || rowStr.includes('收支'))
    ) {
      headerRowIndex = i;
      break;
    }
  }

  if (headerRowIndex === -1) {
    throw new Error('未识别到微信或支付宝的账单表头，请确认是否为官方导出的明细表格');
  }

  // 2. Identify channel: WeChat vs Alipay
  let channel: 'wechat' | 'alipay' | 'other' = 'other';
  let channelName = '电子账单明细';

  const metadataPrefix = rows.slice(0, headerRowIndex + 1).map(r => r.join(' ')).join('\n');
  if (metadataPrefix.includes('微信支付') || file.name.includes('微信') || metadataPrefix.includes('微信支付账单明细')) {
    channel = 'wechat';
    channelName = '微信支付 (WeChat Pay)';
  } else if (metadataPrefix.includes('支付宝') || file.name.includes('alipay') || file.name.includes('支付宝')) {
    channel = 'alipay';
    channelName = '支付宝 (Alipay)';
  }

  // 3. Map columns dynamically
  const headers = (rows[headerRowIndex] || []).map(h => String(h || '').trim());
  let timeCol = -1;
  let transTypeCol = -1;
  let counterpartyCol = -1;
  let productCol = -1;
  let directionCol = -1;
  let amountCol = -1;
  let channelCol = -1;
  let statusCol = -1;
  let orderIdCol = -1;

  headers.forEach((h, idx) => {
    if (/交易时间|时间|创建时间/.test(h)) timeCol = idx;
    else if (/交易类型|交易分类|类型/.test(h)) transTypeCol = idx;
    else if (/交易对方|对方|商户名称/.test(h)) counterpartyCol = idx;
    else if (/商品说明|商品|商品名称/.test(h)) productCol = idx;
    else if (/收\/支|收支|资金流向/.test(h)) directionCol = idx;
    else if (/金额/.test(h)) amountCol = idx;
    else if (/支付方式|收\/付款方式|收付款方式|渠道/.test(h)) channelCol = idx;
    else if (/当前状态|交易状态|状态/.test(h)) statusCol = idx;
    else if (/交易单号|交易订单号|订单号|流水号/.test(h)) orderIdCol = idx;
  });

  if (amountCol === -1 || timeCol === -1) {
    throw new Error('表格中未找到“交易时间”或“金额”列');
  }

  // 4. Retrieve existing transactions for duplicate avoidance
  const existingTransactions = localStore.getTransactions();
  const existingSet = new Set<string>();
  for (const t of existingTransactions) {
    // Fingerprint: date_substring + amount + merchant
    const datePrefix = t.date.slice(0, 16);
    existingSet.add(`${datePrefix}_${t.amount.toFixed(2)}_${t.merchant}`);
    if (t.raw_text) existingSet.add(t.raw_text.trim());
  }

  const items: ParsedBillItem[] = [];
  let totalExpense = 0;
  let totalIncome = 0;
  let expenseCount = 0;
  let incomeCount = 0;

  // 5. Parse data rows
  for (let r = headerRowIndex + 1; r < rows.length; r++) {
    const row = rows[r];
    if (!row || row.length < 3) continue;

    const rawTime = String(timeCol !== -1 ? row[timeCol] : '').trim();
    const rawAmt = String(amountCol !== -1 ? row[amountCol] : '').trim();
    if (!rawTime || !rawAmt) continue;

    // Clean amount (remove currency signs, commas)
    const cleanAmt = rawAmt.replace(/[¥￥$,\s]/g, '');
    const amount = Math.abs(parseFloat(cleanAmt));
    if (isNaN(amount) || amount <= 0) continue;

    const rawStatus = String(statusCol !== -1 ? row[statusCol] : '').trim();
    // Exclude refunded or failed rows
    if (/全额退款|退款成功|已全额退款|支付失败|已关闭|冻结成功|充值失败/.test(rawStatus)) {
      continue;
    }

    const rawDirection = String(directionCol !== -1 ? row[directionCol] : '').trim();
    const rawCounterparty = String(counterpartyCol !== -1 ? row[counterpartyCol] : '').trim();
    const rawProduct = String(productCol !== -1 ? row[productCol] : '').trim();
    const rawChannel = String(channelCol !== -1 ? row[channelCol] : '').trim();
    const rawOrderId = String(orderIdCol !== -1 ? row[orderIdCol] : '').trim();
    const rawTransType = String(transTypeCol !== -1 ? row[transTypeCol] : '').trim();

    // Determine type: expense vs income
    let type: 'expense' | 'income' | 'other' = 'expense';
    if (rawDirection.includes('收入') || rawDirection === '收入') {
      type = 'income';
    } else if (rawDirection.includes('支出') || rawDirection === '支出') {
      type = 'expense';
    } else {
      // Neutral or unspecified (e.g. '/' or '不计收支')
      if (rawStatus.includes('已收钱') || rawStatus.includes('收钱成功')) {
        type = 'income';
      } else if (rawTransType.includes('红包') || rawProduct.includes('红包')) {
        type = rawDirection.includes('收入') ? 'income' : 'expense';
      } else if (rawProduct.includes('充值') || rawProduct.includes('提现')) {
        type = 'other';
      } else {
        type = 'expense';
      }
    }

    // Determine merchant and product display
    const merchant = rawCounterparty || rawProduct || rawTransType || '消费支出';
    const product = rawProduct && rawProduct !== merchant ? rawProduct : '';

    // Smart Category Inference
    const category = suggestCategory(merchant, `${product} ${rawTransType}`);

    // Standardize date
    let dateStr = rawTime;
    if (rawTime.includes('T')) {
      dateStr = rawTime.replace('T', ' ').slice(0, 19);
    }

    // Check duplicate
    const fp = `${dateStr.slice(0, 16)}_${amount.toFixed(2)}_${merchant}`;
    const isDuplicate = existingSet.has(fp);

    const itemId = `bill-${r}-${Date.now().toString(36)}`;
    const parsedItem: ParsedBillItem = {
      id: itemId,
      date: dateStr,
      type,
      amount,
      merchant,
      product,
      category,
      channel: rawChannel || (channel === 'wechat' ? '微信支付' : '支付宝'),
      status: rawStatus || '支付成功',
      orderId: rawOrderId,
      rawText: `${dateStr} ${merchant} ${amount}`,
      selected: !isDuplicate && type !== 'other', // Auto-select valid non-duplicates
      isDuplicate
    };

    items.push(parsedItem);

    if (type === 'expense') {
      totalExpense += amount;
      expenseCount++;
    } else if (type === 'income') {
      totalIncome += amount;
      incomeCount++;
    }
  }

  if (items.length === 0) {
    throw new Error('未能从账单中提取到有效交易记录，请检查文件是否包含明细行');
  }

  // Determine date range
  const dates = items.map(i => i.date).filter(Boolean).sort();
  const dateRange = {
    start: dates[0] ? dates[0].slice(0, 10) : '',
    end: dates[dates.length - 1] ? dates[dates.length - 1].slice(0, 10) : ''
  };

  return {
    channel,
    channelName,
    totalCount: items.length,
    expenseCount,
    incomeCount,
    totalExpense,
    totalIncome,
    dateRange,
    items
  };
}

/**
 * Execute batch import of selected items into localStore and updates account balance.
 */
export async function executeImportBillTransactions(
  items: ParsedBillItem[],
  targetAccountId: string
): Promise<{ importedCount: number; totalExpense: number; totalIncome: number }> {
  const selectedItems = items.filter(i => i.selected);
  if (selectedItems.length === 0) {
    return { importedCount: 0, totalExpense: 0, totalIncome: 0 };
  }

  const currentTrans = localStore.getTransactions();
  let totalExpense = 0;
  let totalIncome = 0;
  const newTransactions: Transaction[] = [];

  for (const item of selectedItems) {
    const tId = `t-bill-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    const trans: Transaction = {
      id: tId,
      type: item.type === 'income' ? 'income' : 'expense',
      amount: item.amount,
      account_id: targetAccountId,
      category_name: item.category,
      date: item.date,
      merchant: item.merchant,
      note: `${item.product ? item.product + ' | ' : ''}${item.channel ? item.channel + ' | ' : ''}单号:${item.orderId.slice(-8)}`,
      source: 'excel_import',
      raw_text: item.rawText
    };

    if (trans.type === 'expense') {
      totalExpense += item.amount;
    } else {
      totalIncome += item.amount;
    }
    newTransactions.push(trans);
  }

  // Prepend new transactions
  localStore.saveTransactions([...newTransactions, ...currentTrans]);

  // Update target account balance
  const accounts = localStore.getAccounts();
  const accIdx = accounts.findIndex(a => a.id === targetAccountId);
  if (accIdx !== -1) {
    const netDelta = totalIncome - totalExpense;
    accounts[accIdx].balance += netDelta;
    accounts[accIdx].updated_at = new Date().toISOString();
    localStore.saveAccounts(accounts);
  }

  return {
    importedCount: newTransactions.length,
    totalExpense,
    totalIncome
  };
}
