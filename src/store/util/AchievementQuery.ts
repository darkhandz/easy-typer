import db from './Database'
import { Achievement } from '../types'

/**
 * achievement 表的主键是 out-of-line（schema 使用 '++' 而非 '++id'），
 * 因此从 Dexie 读出来的记录里默认不会带主键。
 * 这里将 primaryKeys() 取回并写入到 Achievement.id，便于 UI 侧做删除等操作。
 */
export async function getAchievementsPage (offset: number, limit: number): Promise<Achievement[]> {
  const collection = db.achievement.reverse().offset(offset).limit(limit)
  const [rows, keys] = await Promise.all([
    collection.toArray(),
    collection.primaryKeys()
  ])

  // Safari 某些 IndexedDB 实现下可能会返回包含 `undefined` 的数组，直接写 row.id 会抛错。
  // 这里做一次防御性处理，确保不会因为单条异常记录导致整页崩溃。
  const result: Achievement[] = []
  const count = Math.min(rows.length, keys.length)
  for (let idx = 0; idx < count; idx++) {
    const row = rows[idx]
    if (!row) continue
    const key = keys[idx]
    if (typeof key === 'number') {
      row.id = key
    }
    result.push(row)
  }
  return result
}

export async function getRecentAchievements (limit: number): Promise<Achievement[]> {
  return getAchievementsPage(0, limit)
}
