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

  return rows.map((row, idx) => {
    row.id = keys[idx] as number
    return row
  })
}

export async function getRecentAchievements (limit: number): Promise<Achievement[]> {
  return getAchievementsPage(0, limit)
}
