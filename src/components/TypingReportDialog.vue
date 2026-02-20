<template>
  <el-dialog
    title="打字报告"
    :visible.sync="visible"
    width="90%"
    top="5vh"
    :before-close="handleClose"
    class="typing-report-dialog"
  >
    <div class="report-container">
      <div class="report-left">
        <ReportFilter
          :threshold="threshold"
          @update:threshold="threshold = $event"
          @copy="handleCopy"
        />
        <ReportCharTable
          :chars="filteredChars"
          :threshold="threshold"
          @row-click="handleCharClick"
        />
      </div>
      <div class="report-right">
        <ReportArticleView
          :content="content"
          :charData="charDataMap"
          :highlightIdx="highlightIdx"
        />
      </div>
    </div>
  </el-dialog>
</template>

<script lang="ts">
import { Component, Vue, Prop, Watch } from 'vue-property-decorator'
import { TypingReportChar } from '@/store/types'
import { namespace } from 'vuex-class'
import ReportFilter from './ReportFilter.vue'
import ReportCharTable from './ReportCharTable.vue'
import ReportArticleView from './ReportArticleView.vue'

const setting = namespace('setting')

interface CharData {
  char: string;
  durationMs: number;
  backspaceCount: number;
  mistyped: boolean;
}

@Component({
  components: {
    ReportFilter,
    ReportCharTable,
    ReportArticleView
  }
})
export default class TypingReportDialog extends Vue {
  @Prop({ type: Boolean, default: false })
  private show!: boolean

  @Prop({ type: String, default: '' })
  private content!: string

  @Prop({ type: Array, default: () => [] })
  private reportChars!: TypingReportChar[]

  @setting.State('reportSlowThresholdDefault')
  private defaultThreshold!: number

  private threshold = 1.0
  private highlightIdx = -1
  private highlightTimer: number | null = null

  @Watch('show')
  onShowChange (val: boolean): void {
    if (val) {
      this.threshold = this.defaultThreshold
    }
  }

  get visible (): boolean {
    return this.show
  }

  set visible (val: boolean) {
    this.$emit('update:show', val)
  }

  get charDataMap (): Map<number, CharData> {
    const map = new Map<number, CharData>()
    this.reportChars.forEach(char => {
      map.set(char.idx, {
        char: char.char,
        durationMs: char.durationMs,
        backspaceCount: char.backspaceCount,
        mistyped: char.mistyped
      })
    })
    return map
  }

  get filteredChars (): TypingReportChar[] {
    return this.reportChars.filter(char => {
      // 只显示中文字符
      if (!char.isCjk) return false
      // 错字或慢字
      return char.mistyped || char.durationMs >= this.threshold * 1000
    })
  }

  handleClose (): void {
    this.visible = false
  }

  handleCopy (): void {
    const chars = this.filteredChars
      .slice()
      .sort((a, b) => {
        // 错字优先
        if (a.mistyped !== b.mistyped) {
          return a.mistyped ? -1 : 1
        }
        // 按耗时降序
        return b.durationMs - a.durationMs
      })
      .map(c => c.char)

    // 去重
    const uniqueChars = Array.from(new Set(chars))
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

  handleCharClick (idx: number): void {
    // 清除之前的定时器
    if (this.highlightTimer !== null) {
      clearTimeout(this.highlightTimer)
    }

    this.highlightIdx = idx
    // 重置高亮，以便下次点击同一个字符时也能触发动画
    this.$nextTick(() => {
      this.highlightTimer = window.setTimeout(() => {
        this.highlightIdx = -1
        this.highlightTimer = null
      }, 1000)
    })
  }
}
</script>

<style lang="scss" scoped>
.typing-report-dialog {
  .report-container {
    display: flex;
    gap: 10px;
    height: 70vh;

    .report-left {
      flex: 0 0 380px;
      display: flex;
      flex-direction: column;
      gap: 4px;
      overflow: hidden;
    }

    .report-right {
      flex: 1;
      overflow: auto;
    }
  }
}
</style>
