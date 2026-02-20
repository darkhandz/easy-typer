import { TypingReportChar } from '../types'

/**
 * 字符数据
 */
class CharData {
  durationMs = 0
  backspaceCount = 0
  mistyped = false
}

/**
 * 打字报告构建器
 * 用于在打字过程中收集字符级统计数据
 */
export class ReportBuilder {
  private charData: Map<number, CharData> = new Map()
  private lastActiveMs = 0
  private lastInputLength = 0
  private content: string

  constructor (content: string) {
    this.content = content
  }

  /**
   * 记录输入变化
   * @param newInput 新的输入内容
   * @param activeMs 活动时间（毫秒，已排除暂停时间）
   */
  recordInput (newInput: string, activeMs: number): void {
    const elapsed = activeMs - this.lastActiveMs
    const oldLen = this.lastInputLength
    const newLen = newInput.length

    if (newLen > oldLen) {
      // 新增字符
      const addedCount = newLen - oldLen
      const timePerChar = elapsed / addedCount

      for (let i = oldLen; i < newLen; i++) {
        const data = this.getOrCreate(i)
        data.durationMs += timePerChar

        // 检查是否打错
        if (i < this.content.length && newInput[i] !== this.content[i]) {
          data.mistyped = true
        }
      }
    } else if (newLen < oldLen) {
      // 删除字符（回改）
      const deletedCount = oldLen - newLen
      const timePerChar = elapsed / deletedCount

      for (let i = newLen; i < oldLen; i++) {
        const data = this.getOrCreate(i)
        data.backspaceCount++
        data.durationMs += timePerChar
      }
    }

    this.lastActiveMs = activeMs
    this.lastInputLength = newLen
  }

  /**
   * 生成最终报告数据
   */
  build (): Omit<TypingReportChar, 'id' | 'reportId' | 'finishedTime'>[] {
    const result: Omit<TypingReportChar, 'id' | 'reportId' | 'finishedTime'>[] = []

    for (let i = 0; i < this.content.length; i++) {
      const char = this.content[i]
      const data = this.charData.get(i) || new CharData()

      result.push({
        idx: i,
        char,
        durationMs: Math.round(data.durationMs),
        backspaceCount: data.backspaceCount,
        mistyped: data.mistyped,
        isCjk: this.isCjkChar(char)
      })
    }

    return result
  }

  /**
   * 获取或创建字符数据
   */
  private getOrCreate (idx: number): CharData {
    if (!this.charData.has(idx)) {
      this.charData.set(idx, new CharData())
    }
    return this.charData.get(idx) as CharData
  }

  /**
   * 判断是否为中文字符
   */
  private isCjkChar (char: string): boolean {
    const code = char.charCodeAt(0)
    return (
      (code >= 0x4e00 && code <= 0x9fff) || // CJK统一汉字
      (code >= 0x3400 && code <= 0x4dbf) || // CJK扩展A
      (code >= 0x20000 && code <= 0x2a6df) // CJK扩展B
    )
  }
}
