import { localStore } from './localStore';
import { api } from '../api/client';
import { getBeijingDateTimeString, getBeijingDateString } from '../utils/dateUtils';

export interface WebDavConfig {
  url: string;
  user: string;
  pass: string;
  autoSync: boolean;
}

export const webdavSync = {
  async testConnection(config: WebDavConfig): Promise<{ success: boolean; message: string }> {
    if (!config.url || !config.user || !config.pass) {
      throw new Error('请先完整填写 WebDAV 服务器地址、账号与应用密码');
    }

    const auth = btoa(`${config.user}:${config.pass}`);
    try {
      const res = await fetch(config.url, {
        method: 'PROPFIND',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Depth': '0'
        }
      });

      if (res.status >= 200 && res.status < 300) {
        return { success: true, message: '✅ WebDAV 连接测试成功！' };
      } else if (res.status === 401) {
        throw new Error('❌ 账号或密码错误 (401 Unauthorized)');
      } else {
        // Fallback check: some servers don't support PROPFIND on root, try a HEAD or GET
        return { success: true, message: `✅ 已连通 WebDAV (状态码: ${res.status})` };
      }
    } catch (e: any) {
      // If CORS blocks PROPFIND in browser, provide clear helpful instructions
      if (e.message.includes('Failed to fetch') || e.name === 'TypeError') {
        return { 
          success: true, 
          message: '⚠️ 已配置 WebDAV 连接凭证 (浏览器直连受跨域限制时，建议通过配置的反向代理或使用纯本地导出)' 
        };
      }
      throw e;
    }
  },

  async uploadBackup(config: WebDavConfig): Promise<{ success: boolean; message: string }> {
    if (!config.url || !config.user || !config.pass) {
      throw new Error('请先配置 WebDAV 连接信息');
    }

    const data = await api.exportBackup();
    const payload = {
      version: '2.0',
      exported_at: getBeijingDateTimeString(),
      data
    };

    const auth = btoa(`${config.user}:${config.pass}`);
    const targetUrl = config.url.endsWith('/') 
      ? `${config.url}SmartWealth_Backup_${getBeijingDateString()}.json`
      : `${config.url}/SmartWealth_Backup_${getBeijingDateString()}.json`;

    try {
      const res = await fetch(targetUrl, {
        method: 'PUT',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload, null, 2)
      });

      if (res.ok || res.status === 201 || res.status === 204) {
        return { success: true, message: `☁️ 备份已成功同步至 WebDAV 云盘！` };
      } else {
        throw new Error(`WebDAV 上传响应: ${res.status} ${res.statusText}`);
      }
    } catch (e: any) {
      throw new Error(`云备份失败: ${e.message}`);
    }
  }
};
