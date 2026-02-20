<template>
  <div class="report-article-view">
    <div v-if="achievement" class="stats-table">
      <el-table :data="[achievement]" border size="middle" :show-header="true">
        <el-table-column prop="typeSpeed" label="速度" width="68" align="center"/>
        <el-table-column prop="hitSpeed" label="击键" width="64" align="center"/>
        <el-table-column prop="contentLength" label="字数" width="70" align="center"/>
        <el-table-column prop="codeLength" label="码长" width="50" align="center"/>
        <el-table-column prop="accuracy" label="键准(%)" width="80" align="center"/>
        <el-table-column prop="replace" label="回改" width="68" align="center"/>
        <el-table-column prop="error" label="错字" width="68" align="center"/>
        <el-table-column prop="phraseRate" label="打词(%)" width="80" align="center"/>
        <el-table-column label="用时(s)" width="90" align="center">
          <template slot-scope="scope">
            {{ formatUsedTime(scope.row.usedTime) }}
          </template>
        </el-table-column>
        <el-table-column prop="finishedTime" label="打字时间" width="162" align="center">
          <template slot-scope="scope">
            {{ formatFinishedTime(scope.row.finishedTime) }}
          </template>
        </el-table-column>
      </el-table>
    </div>
    <div class="article-content">
      <span
        v-for="(char, index) in contentChars"
        :key="index"
        class="char-item"
        :class="{ 'highlight-flash': highlightIdx === index }"
        :style="getCharStyle(index)"
      >
        <span class="char-text">{{ char }}</span>
        <span v-if="getCharData(index)" class="char-info">
          <span class="char-duration">{{ formatDuration(getCharData(index).durationMs) }}</span>
          <span v-if="getCharData(index).backspaceCount > 0" class="char-backspace">
            ⚠️ {{ getCharData(index).backspaceCount }}
          </span>
        </span>
      </span>
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Vue, Prop } from 'vue-property-decorator'
import { namespace } from 'vuex-class'
import dayjs from 'dayjs'

const setting = namespace('setting')

interface CharData {
  char: string;
  durationMs: number;
  backspaceCount: number;
  mistyped: boolean;
}

@Component
export default class ReportArticleView extends Vue {
  @Prop({ type: String, default: '' })
  private content!: string

  @Prop({ type: Map, default: () => new Map() })
  private charData!: Map<number, CharData>

  @Prop({ type: Number, default: -1 })
  private highlightIdx!: number

  @Prop({ type: Object, default: null })
  private achievement!: any

  @setting.State('reportColorError')
  private colorError!: string

  @setting.State('reportTimeBuckets')
  private timeBuckets!: Array<{ min: number; max: number; textColor: string; bgColor: string }>

  get contentChars (): string[] {
    return this.content.split('')
  }

  getCharData (index: number): CharData | undefined {
    return this.charData.get(index)
  }

  formatDuration (ms: number): string {
    return (ms / 1000).toFixed(2)
  }

  formatUsedTime (ms: number): string {
    const seconds = ms / 1000
    if (seconds < 60) {
      return seconds.toFixed(2)
    }
    const mins = Math.floor(seconds / 60)
    const secs = (seconds % 60).toFixed(3)
    return `${mins}:${secs}`
  }

  formatFinishedTime (timestamp: number): string {
    return dayjs(timestamp).format('YYYY/MM/DD HH:mm:ss')
  }

  getCharStyle (index: number): Record<string, string> {
    const data = this.getCharData(index)
    if (!data) {
      return {}
    }

    const durationSec = data.durationMs / 1000

    let textColor = '#303133'
    let bgColor = ''

    if (data.mistyped) {
      bgColor = this.colorError
      textColor = '#FFFFFF'
    } else if (this.timeBuckets && this.timeBuckets.length > 0) {
      for (const bucket of this.timeBuckets) {
        if (durationSec > bucket.min && durationSec <= bucket.max) {
          bgColor = bucket.bgColor
          textColor = bucket.textColor
          break
        }
      }
    }

    return {
      backgroundColor: bgColor,
      color: textColor
    }
  }
}
</script>

<style lang="scss" scoped>
.report-article-view {
  padding: 8px 4px;
  background: #fff;
  border-radius: 4px;
  border: 1px solid #dcdfe6;

  .stats-table {
    margin-bottom: 10px;
  }

  .article-content {
    line-height: 1.3;
    font-size: 18px;

    .char-item {
      display: inline-flex;
      flex-direction: column;
      align-items: center;
      justify-content: flex-start;
      position: relative;
      padding: 3px 2px;
      margin: 1px;
      border-radius: 2px;
      min-width: 32px;
      vertical-align: top;
      transition: transform 0.3s ease;

      &.highlight-flash {
        animation: flash-highlight 1s ease;
        z-index: 10;
      }

      .char-text {
        display: block;
        text-align: center;
        margin-top: 2px;
        line-height: 1.1;
      }

      .char-info {
        display: flex;
        flex-direction: column;
        align-items: center;
        font-size: 12px;
        text-align: center;
        margin-top: 2px;
        min-height: 32px;

        .char-duration {
          display: block;
          white-space: nowrap;
        }

        .char-backspace {
          display: block;
          font-size: 11px;
          margin-top: 1px;
          white-space: nowrap;
        }
      }
    }
  }
}

@keyframes flash-highlight {
  0%, 100% {
    transform: scale(1);
    box-shadow: none;
  }
  25% {
    transform: scale(1.2);
    box-shadow: 0 0 15px 5px #409EFF;
  }
  50% {
    transform: scale(1);
    box-shadow: 0 0 10px 3px #409EFF;
  }
  75% {
    transform: scale(1.2);
    box-shadow: 0 0 15px 5px #409EFF;
  }
}
</style>
