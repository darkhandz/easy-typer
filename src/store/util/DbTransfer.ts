import Dexie, { IndexableTypeArrayReadonly } from 'dexie'

type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue }

export interface EasyTyperDbExportRow {
  key: unknown;
  value: unknown;
}

export interface EasyTyperDbExportV1 {
  format: 'easy-typer-db-export';
  formatVersion: 1;
  dbName: string;
  exportedAt: number;
  tables: Record<string, { rows: EasyTyperDbExportRow[] }>;
}

const TYPE_KEY = '__easyTyperType'

function isPlainObject (v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === 'object' && !Array.isArray(v)
}

function encodeDbValue (value: unknown, stack = new WeakSet<object>()): JsonValue {
  if (value === null) return null
  if (value === undefined) return null

  if (typeof value === 'string' || typeof value === 'boolean') return value
  if (typeof value === 'number') return isFinite(value) ? value : null
  if (typeof value === 'bigint' || typeof value === 'function' || typeof value === 'symbol') {
    throw new Error('导出失败：数据包含无法序列化的类型。')
  }

  if (value instanceof Date) {
    return { [TYPE_KEY]: 'Date', value: value.toISOString() }
  }
  if (value instanceof Map) {
    if (stack.has(value)) throw new Error('导出失败：检测到循环引用，无法导出。')
    stack.add(value)
    const entries = Array.from(value.entries()).map(([k, v]) => ([
      encodeDbValue(k, stack),
      encodeDbValue(v, stack)
    ]))
    stack.delete(value)
    return { [TYPE_KEY]: 'Map', entries: entries as unknown as JsonValue }
  }
  if (value instanceof Set) {
    if (stack.has(value)) throw new Error('导出失败：检测到循环引用，无法导出。')
    stack.add(value)
    const values = Array.from(value.values()).map(v => encodeDbValue(v, stack))
    stack.delete(value)
    return { [TYPE_KEY]: 'Set', values }
  }

  if (Array.isArray(value)) {
    if (stack.has(value)) throw new Error('导出失败：检测到循环引用，无法导出。')
    stack.add(value)
    const arr = value.map(v => encodeDbValue(v, stack))
    stack.delete(value)
    return arr
  }

  if (typeof value === 'object') {
    if (value === null) return null
    const obj = value as object
    if (stack.has(obj)) {
      throw new Error('导出失败：检测到循环引用，无法导出。')
    }
    stack.add(obj)
    const out: Record<string, JsonValue> = {}
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = encodeDbValue(v, stack)
    }
    stack.delete(obj)
    return out
  }

  return null
}

function jsonReviver (_key: string, value: unknown): unknown {
  if (!isPlainObject(value)) return value
  const type = value[TYPE_KEY]
  if (type === 'Map' && Array.isArray((value as { entries?: unknown }).entries)) {
    const entries = (value as { entries: unknown[] }).entries as unknown as Array<[unknown, unknown]>
    return new Map(entries)
  }
  if (type === 'Set' && Array.isArray((value as { values?: unknown }).values)) {
    return new Set((value as { values: unknown[] }).values)
  }
  if (type === 'Date' && typeof (value as { value?: unknown }).value === 'string') {
    const dt = new Date((value as { value: string }).value)
    return isNaN(dt.getTime()) ? value : dt
  }
  return value
}

export function stringifyDbExport (data: EasyTyperDbExportV1): string {
  return JSON.stringify(encodeDbValue(data), null, 2)
}

export function parseDbExportRaw (text: string): unknown {
  return JSON.parse(text)
}

export function parseDbExport (text: string): unknown {
  return JSON.parse(text, jsonReviver)
}

function isJsonValue (v: unknown): v is JsonValue {
  if (v === null) return true
  const t = typeof v
  if (t === 'string' || t === 'number' || t === 'boolean') return true
  if (Array.isArray(v)) return v.every(isJsonValue)
  if (t === 'object') {
    return Object.values(v as Record<string, unknown>).every(isJsonValue)
  }
  return false
}

export function validateDbExportV1 (data: unknown, expectedTables: string[]): { ok: true; data: EasyTyperDbExportV1 } | { ok: false; reason: string } {
  if (!isPlainObject(data)) return { ok: false, reason: '文件内容不是有效的对象(JSON).' }
  if (data.format !== 'easy-typer-db-export') return { ok: false, reason: '文件格式不匹配。' }
  if (data.formatVersion !== 1) return { ok: false, reason: '文件版本不支持。' }
  if (typeof data.dbName !== 'string' || !data.dbName) return { ok: false, reason: '缺少 dbName。' }
  if (typeof data.exportedAt !== 'number' || !isFinite(data.exportedAt)) return { ok: false, reason: 'exportedAt 无效。' }
  if (!isPlainObject(data.tables)) return { ok: false, reason: 'tables 字段无效。' }

  for (const tableName of expectedTables) {
    const table = (data.tables as Record<string, unknown>)[tableName]
    if (!isPlainObject(table)) return { ok: false, reason: `缺少表数据：${tableName}` }
    const rows = (table as { rows?: unknown }).rows
    if (!Array.isArray(rows)) return { ok: false, reason: `表 ${tableName} 的 rows 无效。` }
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      if (!isPlainObject(row)) return { ok: false, reason: `表 ${tableName} 第 ${i + 1} 条记录结构无效。` }
      if (!('key' in row) || !('value' in row)) return { ok: false, reason: `表 ${tableName} 第 ${i + 1} 条记录缺少 key/value。` }
      const key = (row as { key?: unknown }).key
      const value = (row as { value?: unknown }).value
      if (!isJsonValue(key) || !isJsonValue(value)) {
        return { ok: false, reason: `表 ${tableName} 第 ${i + 1} 条记录包含不支持的类型（请使用本页面导出的文件）。` }
      }
    }
  }

  return { ok: true, data: data as unknown as EasyTyperDbExportV1 }
}

export async function exportDatabase (db: Dexie): Promise<EasyTyperDbExportV1> {
  const tables: Record<string, { rows: EasyTyperDbExportRow[] }> = {}

  for (const table of db.tables) {
    const values = await table.toArray()
    const keys = await table.toCollection().primaryKeys()
    if (values.length !== keys.length) {
      throw new Error(`导出失败：表 ${table.name} 的记录数量与主键数量不一致。`)
    }
    tables[table.name] = {
      rows: keys.map((key, idx) => ({
        key,
        value: values[idx]
      }))
    }
  }

  return {
    format: 'easy-typer-db-export',
    formatVersion: 1,
    dbName: db.name,
    exportedAt: Date.now(),
    tables
  }
}

export async function importDatabase (db: Dexie, data: EasyTyperDbExportV1): Promise<void> {
  await db.transaction('rw', db.tables, async () => {
    for (const table of db.tables) {
      await table.clear()
    }

    for (const table of db.tables) {
      const tableData = data.tables[table.name]
      const rows = tableData?.rows || []
      const values = rows.map(r => r.value)
      const keys = rows.map(r => r.key)

      const keyPath = table.schema.primKey.keyPath
      if (keyPath) {
        await (table as Dexie.Table<unknown, unknown>).bulkPut(values as unknown[])
      } else {
        await (table as Dexie.Table<unknown, unknown>).bulkPut(
          values as unknown[],
          keys as IndexableTypeArrayReadonly
        )
      }
    }
  })
}
