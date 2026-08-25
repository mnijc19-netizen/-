import React, { useState, useEffect } from 'react';
import { 
  CreditCard, 
  Building, 
  Flame, 
  Snowflake, 
  Plus, 
  Trash2, 
  Calendar, 
  CheckCircle2, 
  AlertCircle,
  X
} from 'lucide-react';
import { Debt, Account } from '../types';
import { api } from '../api/client';

interface DebtsPageProps {
  debts: Debt[];
  accounts: Account[];
  onRefresh: () => void;
}

export const DebtsPage: React.FC<DebtsPageProps> = ({ debts, accounts, onRefresh }) => {
  const [simulatorData, setSimulatorData] = useState<any>(null);
  const [extraMonthly, setExtraMonthly] = useState('1000');
  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [type, setType] = useState<any>('credit_card');
  const [totalPrincipal, setTotalPrincipal] = useState('');
  const [remainingPrincipal, setRemainingPrincipal] = useState('');
  const [interestRate, setInterestRate] = useState('');
  const [monthlyPayment, setMonthlyPayment] = useState('');
  const [billDay, setBillDay] = useState('10');
  const [repayDay, setRepayDay] = useState('28');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.getDebtSimulator(parseFloat(extraMonthly) || 1000).then(setSimulatorData).catch(() => {});
  }, [extraMonthly, debts]);

  const totalDebt = debts.reduce((s, d) => s + d.remaining_principal, 0);
  const totalMonthlyPay = debts.reduce((s, d) => s + d.monthly_payment, 0);

  const handleSaveDebt = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.addDebt({
        name,
        type,
        total_principal: parseFloat(totalPrincipal) || 0,
        remaining_principal: parseFloat(remainingPrincipal) || 0,
        interest_rate_annual: parseFloat(interestRate) || 0,
        monthly_payment: parseFloat(monthlyPayment) || 0,
        bill_day: parseInt(billDay) || 1,
        repay_day: parseInt(repayDay) || 20
      });
      setModalOpen(false);
      setName('');
      setTotalPrincipal('');
      setRemainingPrincipal('');
      onRefresh();
    } catch (e: any) {
      alert(e.message || '保存失败');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('确定删除此债务记录吗？')) {
      await api.deleteDebt(id);
      onRefresh();
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-rose-500" />
            负债清偿与信用管理中心
          </h2>
          <p className="text-xs text-slate-400">
            信用卡账单周期、房贷车贷跟踪与雪球/雪崩科学还债规划
          </p>
        </div>
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-lg shadow-rose-500/20 flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" /> 添加负债/信用卡
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="text-xs text-slate-400 mb-1">当前总负债余额</div>
          <div className="text-2xl font-black text-rose-500 font-mono">
            ¥{totalDebt.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="text-xs text-slate-400 mb-1">每月固定还款支出</div>
          <div className="text-2xl font-black text-slate-800 dark:text-slate-200 font-mono">
            ¥{totalMonthlyPay.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="text-xs text-slate-400 mb-1">负债总笔数</div>
          <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400 font-mono">
            {debts.length} 笔
          </div>
        </div>
      </div>

      {/* Debts List */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
          现有负债明细与清偿进度
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {debts.map(d => (
            <div key={d.id} className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    {d.type === 'credit_card' ? <CreditCard className="w-4 h-4 text-rose-500" /> : <Building className="w-4 h-4 text-slate-500" />}
                    {d.name}
                  </h4>
                  <div className="text-[11px] text-slate-400">
                    年化利率: {(d.interest_rate_annual * 100).toFixed(2)}% • 月供 ¥{d.monthly_payment.toFixed(2)}
                  </div>
                </div>

                <button
                  onClick={() => handleDelete(d.id)}
                  className="p-1 rounded text-slate-400 hover:text-rose-500"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {/* Progress Bar */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">已还清 {d.progress_percentage}%</span>
                  <span className="font-mono font-bold text-rose-500">剩余 ¥{d.remaining_principal.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-emerald-500 rounded-full" 
                    style={{ width: `${Math.min(100, d.progress_percentage)}%` }} 
                  />
                </div>
              </div>

              {d.type === 'credit_card' && (
                <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-xs text-rose-700 dark:text-rose-300 flex items-center justify-between">
                  <span>账单日: 每月 {d.bill_day} 日</span>
                  <span>还款日: 每月 {d.repay_day} 日</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Simulator Strategy Section */}
      {simulatorData && (
        <div className="p-6 rounded-3xl bg-gradient-to-br from-indigo-500/10 via-purple-500/5 to-transparent border border-indigo-500/20 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-indigo-900 dark:text-indigo-200 flex items-center gap-2">
                <Snowflake className="w-4 h-4 text-indigo-500" />
                科学还债策略模拟器 (Snowball vs Avalanche)
              </h3>
              <p className="text-xs text-slate-400">
                对比「雪球法」与「雪崩法」的清偿优先级
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            {/* Snowball */}
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
              <div className="flex items-center gap-2 font-bold text-indigo-600 dark:text-indigo-400">
                <Snowflake className="w-4 h-4" />
                <span>{simulatorData.snowball_strategy.name}</span>
              </div>
              <p className="text-slate-500 dark:text-slate-400 leading-relaxed">
                {simulatorData.snowball_strategy.description}
              </p>
              <div className="pt-2">
                <div className="text-[11px] font-semibold text-slate-400 mb-1">推荐清偿优先级顺序：</div>
                <div className="space-y-1 font-mono">
                  {simulatorData.snowball_strategy.priority.map((item: string, idx: number) => (
                    <div key={idx} className="p-1.5 rounded bg-slate-50 dark:bg-slate-800 flex items-center gap-2">
                      <span className="w-4 h-4 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-600 text-center font-bold text-[10px] leading-4">{idx + 1}</span>
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Avalanche */}
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
              <div className="flex items-center gap-2 font-bold text-rose-600 dark:text-rose-400">
                <Flame className="w-4 h-4" />
                <span>{simulatorData.avalanche_strategy.name}</span>
              </div>
              <p className="text-slate-500 dark:text-slate-400 leading-relaxed">
                {simulatorData.avalanche_strategy.description}
              </p>
              <div className="pt-2">
                <div className="text-[11px] font-semibold text-slate-400 mb-1">推荐清偿优先级顺序：</div>
                <div className="space-y-1 font-mono">
                  {simulatorData.avalanche_strategy.priority.map((item: string, idx: number) => (
                    <div key={idx} className="p-1.5 rounded bg-slate-50 dark:bg-slate-800 flex items-center gap-2">
                      <span className="w-4 h-4 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-600 text-center font-bold text-[10px] leading-4">{idx + 1}</span>
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                添加负债 / 信用卡
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveDebt} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-500 block mb-1">负债名称</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="例如：招商银行信用卡账单、住房公积金贷款"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="text-slate-500 block mb-1">快速选择现代消费信贷模板</label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {[
                    { label: '🌸 蚂蚁花呗', type: 'huabei', name: '蚂蚁花呗账单', billDay: '1', repayDay: '10' },
                    { label: '🐕 京东白条', type: 'baitiao', name: '京东白条账单', billDay: '1', repayDay: '20' },
                    { label: '🦘 美团月付', type: 'meituan_pay', name: '美团月付账单', billDay: '1', repayDay: '8' },
                    { label: '🎵 抖音月付', type: 'douyin_pay', name: '抖音月付账单', billDay: '1', repayDay: '6' },
                    { label: '💰 蚂蚁借呗', type: 'jiebei', name: '蚂蚁借呗借款', billDay: '1', repayDay: '15' },
                    { label: '💬 微信分付', type: 'fenfu', name: '微信分付借款', billDay: '1', repayDay: '25' },
                    { label: '💳 信用卡分期', type: 'credit_card', name: '信用卡账单', billDay: '10', repayDay: '28' }
                  ].map((p, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setName(p.name);
                        setType(p.type);
                        setBillDay(p.billDay);
                        setRepayDay(p.repayDay);
                      }}
                      className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-rose-50 hover:text-rose-600 text-[10px] font-bold text-slate-700 dark:text-slate-300 transition"
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-500 block mb-1">负债类型</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    <option value="huabei">🌸 蚂蚁花呗</option>
                    <option value="baitiao">🐕 京东白条</option>
                    <option value="meituan_pay">🦘 美团月付</option>
                    <option value="douyin_pay">🎵 抖音月付</option>
                    <option value="jiebei">💰 蚂蚁借呗</option>
                    <option value="fenfu">💬 微信分付/微粒贷</option>
                    <option value="credit_card">💳 银行信用卡</option>
                    <option value="mortgage">🏠 住房按揭贷款</option>
                    <option value="car_loan">🚗 汽车分期贷款</option>
                    <option value="consumer_loan">📱 消费网贷</option>
                    <option value="personal_borrow">🤝 个人借款</option>
                  </select>
                </div>
                <div>
                  <label className="text-slate-500 block mb-1">年化利率 (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={interestRate}
                    onChange={(e) => setInterestRate(e.target.value)}
                    placeholder="如 3.5 代表 3.5%"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-500 block mb-1">总本金 (¥)</label>
                  <input
                    type="number"
                    required
                    value={totalPrincipal}
                    onChange={(e) => setTotalPrincipal(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-500 block mb-1">剩余未还本金 (¥)</label>
                  <input
                    type="number"
                    required
                    value={remainingPrincipal}
                    onChange={(e) => setRemainingPrincipal(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-slate-500 block mb-1">每月应还 (¥)</label>
                  <input
                    type="number"
                    value={monthlyPayment}
                    onChange={(e) => setMonthlyPayment(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-500 block mb-1">账单日</label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={billDay}
                    onChange={(e) => setBillDay(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="text-slate-500 block mb-1">还款日</label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={repayDay}
                    onChange={(e) => setRepayDay(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold"
                >
                  {saving ? '保存中...' : '保存'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
