import Dexie from 'dexie'
import { Achievement, Identity, LooseObject, SettingState, TypingReport, TypingReportChar } from '../types'
import { TrieNode } from './TrieTree'

class QuickTypingDatabase extends Dexie {
  /**
   * 配置
   */
  configs: Dexie.Table<unknown, string>
  /**
   * 汇总
   */
  summary: Dexie.Table<LooseObject<unknown>, string>
  /**
   * 汇总
   */
  bookShelf: Dexie.Table<unknown, string>
  /**
   * 成绩
   */
  achievement: Dexie.Table<Achievement, number>
  /**
   * 打字报告主表
   */
  typingReport: Dexie.Table<TypingReport, number>
  /**
   * 打字报告字符级统计
   */
  typingReportChar: Dexie.Table<TypingReportChar, number>

  constructor (databaseName: string) {
    super(databaseName)
    this.version(1).stores({
      configs: 'id',
      summary: 'id'
    })
    this.version(2).stores({
      configs: 'id',
      summary: 'id',
      achievement: '++'
    })
    this.version(3).stores({
      configs: '',
      summary: '',
      achievement: '++'
    })
    this.version(4).stores({
      configs: '',
      summary: '',
      achievement: '++',
      bookShelf: ''
    })

    this.version(5).stores({
      configs: '',
      summary: '',
      achievement: '++',
      bookShelf: '',
      typingReport: '++id, achievementId, finishedTime, contentHash',
      typingReportChar: '++id, reportId, finishedTime, durationMs, mistyped, isCjk, [reportId+idx], [finishedTime+durationMs]'
    })

    this.version(6).stores({
      configs: '',
      summary: '',
      achievement: '++, reportId',
      bookShelf: '',
      typingReport: '++id, achievementId, finishedTime, contentHash',
      typingReportChar: '++id, reportId, finishedTime, durationMs, mistyped, isCjk, [reportId+idx], [finishedTime+durationMs]'
    })

    this.configs = this.table('configs')
    this.summary = this.table('summary')
    this.achievement = this.table('achievement')
    this.bookShelf = this.table('bookShelf')
    this.typingReport = this.table('typingReport')
    this.typingReportChar = this.table('typingReportChar')
  }
}

const db = new QuickTypingDatabase('QuickTyping')

db.open().catch(err => {
  console.error(`Open failed: ${err.stack}`)
  const tempdb = new Dexie('QuickTyping')
  tempdb.version(2).stores({
    configs: 'id',
    summary: 'id',
    achievement: '++'
  })
  tempdb.open().then(() => {
    const data = new Map()
    tempdb.tables.forEach(table => {
      data.set(table.name, table.toArray())
    })
    Promise.all(data.values()).then(val => {
      const [configs, summarys, achievements] = val
      db.delete().then(() => {
        db.open().then(() => {
          data.set('configs', configs.forEach((config: Identity) => {
            const { id } = config
            delete config.id
            db.configs.add(config as (TrieNode|SettingState), id)
          }))
          data.set('summary', summarys.forEach((rec: Identity) => {
            const { id } = rec
            delete rec.id
            db.summary.add(rec as LooseObject<number>, id)
          }))
          data.set('achievement', achievements.forEach((achieve: Achievement) => db.achievement.add(achieve)))

          Promise.all(data.values()).then(() => {
            tempdb.close()
            alert('检测到数据库版本不兼容，已升级，请刷新页面后开始使用')
          })
        })
      })
    })
  })
})

export default db
