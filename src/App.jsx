import { useEffect, useMemo, useState } from 'react'

const STORAGE_KEY = 'account_status_tracker_v1'

const initialRows = [
  {
    id: crypto.randomUUID(),
    account: 'xxxxxx@outlook.com',
    platform: 'Outlook',
    status: '正常使用',
    owner: '',
    lastUsed: '',
    notes: '示例账号',
    updatedAt: new Date().toLocaleString('zh-CN')
  }
]

const statusOptions = ['正常使用', '待验证', '异常', '已停用', '备用']

function downloadFile(filename, content, type = 'text/plain;charset=utf-8') {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function toCSV(rows) {
  const headers = ['账号', '平台', '使用状态', '负责人', '最近使用日期', '备注', '更新时间']
  const escapeCell = (value) => {
    const text = String(value ?? '')
    return `"${text.replace(/"/g, '""')}"`
  }

  const lines = rows.map((row) => [
    row.account,
    row.platform,
    row.status,
    row.owner,
    row.lastUsed,
    row.notes,
    row.updatedAt
  ].map(escapeCell).join(','))

  return [headers.join(','), ...lines].join('\n')
}

function parseCSV(text) {
  const lines = text.split(/\r?\n/).filter(Boolean)
  if (lines.length <= 1) return []

  return lines.slice(1).map((line) => {
    const cols = []
    let current = ''
    let inQuotes = false

    for (let i = 0; i < line.length; i += 1) {
      const char = line[i]
      const next = line[i + 1]

      if (char === '"') {
        if (inQuotes && next === '"') {
          current += '"'
          i += 1
        } else {
          inQuotes = !inQuotes
        }
      } else if (char === ',' && !inQuotes) {
        cols.push(current)
        current = ''
      } else {
        current += char
      }
    }
    cols.push(current)

    return {
      id: crypto.randomUUID(),
      account: cols[0] || '',
      platform: cols[1] || '',
      status: cols[2] || '待验证',
      owner: cols[3] || '',
      lastUsed: cols[4] || '',
      notes: cols[5] || '',
      updatedAt: cols[6] || new Date().toLocaleString('zh-CN')
    }
  })
}

function emptyRow() {
  return {
    id: crypto.randomUUID(),
    account: '',
    platform: '',
    status: '待验证',
    owner: '',
    lastUsed: '',
    notes: '',
    updatedAt: new Date().toLocaleString('zh-CN')
  }
}

export default function App() {
  const [rows, setRows] = useState([])
  const [query, setQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState('全部')
  const [editingRow, setEditingRow] = useState(emptyRow())
  const [isModalOpen, setIsModalOpen] = useState(false)

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      try {
        setRows(JSON.parse(raw))
        return
      } catch {
        // ignore invalid local data
      }
    }
    setRows(initialRows)
  }, [])

  useEffect(() => {
    if (rows.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(rows))
    }
  }, [rows])

  const filteredRows = useMemo(() => rows.filter((row) => {
    const text = [row.account, row.platform, row.owner, row.notes].join(' ').toLowerCase()
    const matchesQuery = text.includes(query.toLowerCase())
    const matchesStatus = filterStatus === '全部' || row.status === filterStatus
    return matchesQuery && matchesStatus
  }), [rows, query, filterStatus])

  const stats = useMemo(() => ({
    total: rows.length,
    active: rows.filter((item) => item.status === '正常使用').length,
    warning: rows.filter((item) => item.status === '待验证' || item.status === '异常').length,
    disabled: rows.filter((item) => item.status === '已停用').length
  }), [rows])

  function openCreate() {
    setEditingRow(emptyRow())
    setIsModalOpen(true)
  }

  function openEdit(row) {
    setEditingRow({ ...row })
    setIsModalOpen(true)
  }

  function saveRow() {
    if (!editingRow.account.trim()) {
      alert('请先填写账号')
      return
    }

    const payload = {
      ...editingRow,
      updatedAt: new Date().toLocaleString('zh-CN')
    }

    setRows((prev) => {
      const exists = prev.some((item) => item.id === payload.id)
      if (exists) {
        return prev.map((item) => item.id === payload.id ? payload : item)
      }
      return [payload, ...prev]
    })

    setIsModalOpen(false)
  }

  function deleteRow(id) {
    const confirmed = window.confirm('确认删除这条记录吗？')
    if (!confirmed) return
    setRows((prev) => prev.filter((item) => item.id !== id))
  }

  function exportCsv() {
    const csv = toCSV(rows)
    downloadFile(`账号状态表_${new Date().toISOString().slice(0, 10)}.csv`, csv, 'text/csv;charset=utf-8')
  }

  function backupJson() {
    downloadFile(`账号状态备份_${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(rows, null, 2), 'application/json;charset=utf-8')
  }

  function importFile(event) {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = () => {
      const text = String(reader.result || '')
      if (file.name.endsWith('.json')) {
        try {
          const data = JSON.parse(text)
          if (Array.isArray(data)) setRows(data)
        } catch {
          alert('JSON 导入失败，请检查文件格式')
        }
      } else {
        const data = parseCSV(text)
        if (data.length) {
          setRows(data)
        } else {
          alert('CSV 导入失败，请检查文件内容')
        }
      }
    }
    reader.readAsText(file, 'utf-8')
    event.target.value = ''
  }

  function resetAll() {
    const confirmed = window.confirm('确认重置为初始示例数据吗？')
    if (!confirmed) return
    localStorage.removeItem(STORAGE_KEY)
    setRows(initialRows)
  }

  return (
    <div className="page-shell">
      <div className="container">
        <header className="hero-card">
          <div>
            <h1>账号使用状态管理表</h1>
            <p>适合记录邮箱、平台账号、使用状态、负责人和备注。数据默认保存在当前浏览器。</p>
          </div>
          <div className="hero-actions">
            <button className="primary" onClick={openCreate}>新增账号</button>
            <button onClick={exportCsv}>导出 CSV</button>
            <button onClick={backupJson}>备份 JSON</button>
            <label className="button-like">
              导入文件
              <input type="file" accept=".csv,.json" onChange={importFile} hidden />
            </label>
            <button onClick={resetAll}>重置</button>
          </div>
        </header>

        <section className="stats-grid">
          <div className="stat-card"><span>总账号数</span><strong>{stats.total}</strong></div>
          <div className="stat-card"><span>正常使用</span><strong>{stats.active}</strong></div>
          <div className="stat-card"><span>需关注</span><strong>{stats.warning}</strong></div>
          <div className="stat-card"><span>已停用</span><strong>{stats.disabled}</strong></div>
        </section>

        <section className="toolbar-card">
          <input
            className="search-input"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜索账号、平台、负责人、备注"
          />
          <select value={filterStatus} onChange={(event) => setFilterStatus(event.target.value)}>
            <option value="全部">全部状态</option>
            {statusOptions.map((status) => <option key={status} value={status}>{status}</option>)}
          </select>
        </section>

        <section className="table-card">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>账号</th>
                  <th>平台</th>
                  <th>使用状态</th>
                  <th>负责人</th>
                  <th>最近使用</th>
                  <th>备注</th>
                  <th>更新时间</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="empty-cell">没有匹配的数据，试试新增一条账号记录。</td>
                  </tr>
                ) : filteredRows.map((row) => (
                  <tr key={row.id}>
                    <td className="strong-cell">{row.account}</td>
                    <td>{row.platform || '-'}</td>
                    <td><span className={`status-pill status-${row.status}`}>{row.status}</span></td>
                    <td>{row.owner || '-'}</td>
                    <td>{row.lastUsed || '-'}</td>
                    <td className="notes-cell" title={row.notes}>{row.notes || '-'}</td>
                    <td>{row.updatedAt}</td>
                    <td>
                      <div className="action-group">
                        <button onClick={() => openEdit(row)}>编辑</button>
                        <button className="danger" onClick={() => deleteRow(row.id)}>删除</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {isModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsModalOpen(false)}>
          <div className="modal-card" onClick={(event) => event.stopPropagation()}>
            <h2>{rows.some((item) => item.id === editingRow.id) ? '编辑账号' : '新增账号'}</h2>
            <div className="form-grid">
              <label>
                <span>账号</span>
                <input
                  value={editingRow.account}
                  onChange={(event) => setEditingRow({ ...editingRow, account: event.target.value })}
                  placeholder="例如 xxxxxx@outlook.com"
                />
              </label>
              <label>
                <span>平台</span>
                <input
                  value={editingRow.platform}
                  onChange={(event) => setEditingRow({ ...editingRow, platform: event.target.value })}
                  placeholder="例如 Outlook / Google"
                />
              </label>
              <label>
                <span>使用状态</span>
                <select
                  value={editingRow.status}
                  onChange={(event) => setEditingRow({ ...editingRow, status: event.target.value })}
                >
                  {statusOptions.map((status) => <option key={status} value={status}>{status}</option>)}
                </select>
              </label>
              <label>
                <span>负责人</span>
                <input
                  value={editingRow.owner}
                  onChange={(event) => setEditingRow({ ...editingRow, owner: event.target.value })}
                  placeholder="谁在使用这个账号"
                />
              </label>
              <label>
                <span>最近使用日期</span>
                <input
                  type="date"
                  value={editingRow.lastUsed}
                  onChange={(event) => setEditingRow({ ...editingRow, lastUsed: event.target.value })}
                />
              </label>
              <label className="full-width">
                <span>备注</span>
                <textarea
                  value={editingRow.notes}
                  onChange={(event) => setEditingRow({ ...editingRow, notes: event.target.value })}
                  placeholder="记录登录情况、异常信息、验证要求等"
                  rows="5"
                />
              </label>
            </div>
            <div className="modal-actions">
              <button onClick={() => setIsModalOpen(false)}>取消</button>
              <button className="primary" onClick={saveRow}>保存</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
