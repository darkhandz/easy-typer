<template>
  <div class="page-content history-typing-report">
    <el-card>
      <div class="filter-section">
        <div class="time-filter">
          <span class="filter-label">时间范围：</span>
          <el-date-picker
            v-model="startTime"
            type="datetime"
            placeholder="开始时间"
            value-format="timestamp"
            size="small"
          />
          <span class="filter-separator">至</span>
          <el-date-picker
            v-model="endTime"
            type="datetime"
            placeholder="结束时间"
            value-format="timestamp"
            size="small"
          />
          <el-button-group class="quick-selectors">
            <el-button size="small" @click="selectTimeRange(15)">最近15分钟</el-button>
            <el-button size="small" @click="selectTimeRange(30)">最近30分钟</el-button>
            <el-button size="small" @click="selectTimeRange(60)">最近1小时</el-button>
            <el-button size="small" @click="selectTimeRange(120)">最近2小时</el-button>
            <el-button size="small" @click="selectTimeRange(1440)">最近1天</el-button>
            <el-button size="small" @click="selectTimeRange(4320)">最近3天</el-button>
            <el-button size="small" @click="selectTimeRange(10080)">最近7天</el-button>
          </el-button-group>
          <el-button type="primary" size="small" @click="loadData">查询</el-button>
        </div>

        <div class="duration-filter">
          <span class="filter-label">耗时筛选：</span>
          <el-slider
            v-model="threshold"
            :min="minThreshold"
            :max="maxThreshold"
            :step="0.1"
            :show-tooltip="false"
            class="filter-slider"
          />
          <el-input-number
            v-model="threshold"
            :min="minThreshold"
            :max="maxThreshold"
            :step="0.1"
            :precision="1"
            size="small"
            class="filter-input"
          />
          <el-button
            type="primary"
            size="small"
            icon="el-icon-document-copy"
            @click="handleCopy"
          >
            复制
          </el-button>
        </div>
      </div>

      <el-table
        :data="displayChars"
        height="calc(100vh - 350px)"
        stripe
        size="small"
        @sort-change="handleSortChange"
      >
        <el-table-column
          type="index"
          label="序号"
          width="80"
          align="center"
        />
        <el-table-column
          width="80"
          align="center"
        >
          <template slot-scope="scope">
            <el-checkbox v-model="scope.row.selected" />
          </template>
        </el-table-column>
        <el-table-column
          prop="char"
          label="文字"
          width="80"
          align="center"
        >
          <template slot-scope="scope">
            <span :class="{ 'error-char': scope.row.mistyped }">
              {{ scope.row.char }}
            </span>
          </template>
        </el-table-column>
        <el-table-column
          prop="durationMs"
          label="耗时(秒)"
          sortable="custom"
          align="center"
        >
          <template slot-scope="scope">
            {{ (scope.row.durationMs / 1000).toFixed(3) }}
          </template>
        </el-table-column>
        <el-table-column
          prop="backspaceCount"
          label="回改次数"
          sortable="custom"
          align="center"
        />
      </el-table>
    </el-card>
  </div>
</template>

<script lang="ts">
import { Component, Vue } from 'vue-property-decorator'
import { namespace } from 'vuex-class'
import db from '@/store/util/Database'

const setting = namespace('setting')

interface AggregatedChar {
  char: string;
  durationMs: number;
  backspaceCount: number;
  mistyped: boolean;
  selected: boolean;
}

@Component
export default class HistoryTypingReport extends Vue {
  @setting.State('reportSlowThresholdDefault')
  private defaultThreshold!: number

  @setting.State('reportTimeBuckets')
  private timeBuckets!: Array<{ min: number; max: number; textColor: string; bgColor: string }>

  private startTime: number = Date.now() - 24 * 60 * 60 * 1000
  private endTime: number = Date.now()
  private threshold = 0.5
  private chars: AggregatedChar[] = []
  private sortProp = ''
  private sortOrder = ''

  created (): void {
    this.threshold = this.defaultThreshold
    this.loadData()
  }

  get minThreshold (): number {
    return 0.1
  }

  get maxThreshold (): number {
    if (!this.timeBuckets || this.timeBuckets.length === 0) {
      return 4
    }
    const maxBucket = Math.max(...this.timeBuckets.map(b => b.max))
    return Math.min(maxBucket, 4)
  }

  selectTimeRange (minutes: number): void {
    this.endTime = Date.now()
    this.startTime = this.endTime - minutes * 60 * 1000
    this.loadData()
  }

  async loadData (): Promise<void> {
    try {
      const chars = await db.typingReportChar
        .where('finishedTime')
        .between(this.startTime, this.endTime)
        .toArray()

      // 按字符聚合统计
      const charMap = new Map<string, AggregatedChar>()
      chars.forEach(char => {
        if (!char.isCjk) return

        const existing = charMap.get(char.char)
        if (existing) {
          existing.durationMs = Math.max(existing.durationMs, char.durationMs)
          existing.backspaceCount += char.backspaceCount
          existing.mistyped = existing.mistyped || char.mistyped
        } else {
          charMap.set(char.char, {
            char: char.char,
            durationMs: char.durationMs,
            backspaceCount: char.backspaceCount,
            mistyped: char.mistyped,
            selected: true
          })
        }
      })

      this.chars = Array.from(charMap.values())
      this.$message.success(`加载了 ${this.chars.length} 个字符的统计数据`)
    } catch (error) {
      console.error('加载历史报告失败:', error)
      this.$message.error('加载历史报告失败')
    }
  }

  get displayChars (): AggregatedChar[] {
    let filtered = this.chars.filter(char => {
      return char.mistyped || char.durationMs >= this.threshold * 1000
    })

    if (this.sortProp && this.sortOrder) {
      filtered = filtered.slice().sort((a, b) => {
        const aVal = a[this.sortProp as keyof AggregatedChar] as number
        const bVal = b[this.sortProp as keyof AggregatedChar] as number

        if (this.sortOrder === 'ascending') {
          return aVal - bVal
        } else {
          return bVal - aVal
        }
      })
    } else {
      filtered = filtered.slice().sort((a, b) => {
        if (a.mistyped !== b.mistyped) {
          return a.mistyped ? -1 : 1
        }
        return b.durationMs - a.durationMs
      })
    }

    return filtered
  }

  handleSortChange ({ prop, order }: { prop: string; order: string }): void {
    this.sortProp = prop
    this.sortOrder = order
  }

  handleCopy (): void {
    const selectedChars = this.displayChars
      .filter(c => c.selected)
      .map(c => c.char)

    const uniqueChars = Array.from(new Set(selectedChars))
    const text = uniqueChars.join('')

    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => {
        this.$message.success('已复制到剪贴板')
      }).catch(() => {
        this.$message.error('复制失败')
      })
    } else {
      this.$message.warning('浏览器不支持剪贴板操作')
    }
  }
}
</script>

<style lang="scss" scoped>
.history-typing-report {
  .filter-section {
    margin-bottom: 20px;

    .time-filter {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 15px;
      flex-wrap: wrap;

      .filter-label {
        font-size: 14px;
        color: #606266;
        white-space: nowrap;
      }

      .filter-separator {
        margin: 0 5px;
      }

      .quick-selectors {
        margin-left: 10px;
      }
    }

    .duration-filter {
      display: flex;
      align-items: center;
      gap: 15px;
      padding: 10px;
      background: #f5f7fa;
      border-radius: 4px;

      .filter-label {
        white-space: nowrap;
        font-size: 14px;
        color: #606266;
      }

      .filter-slider {
        flex: 1;
        min-width: 100px;
      }

      .filter-input {
        width: 120px;
      }
    }
  }

  ::v-deep .el-table {
    font-size: 16px;
  }

  .char-text {
    font-size: 16px;
  }
  .error-char {
    color: #f56c6c;
    font-weight: bold;
  }
}
</style>
