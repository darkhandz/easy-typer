<template>
  <div class="report-article-view">
    <div class="article-content">
      <span
        v-for="(char, index) in contentChars"
        :key="index"
        class="char-item"
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
</style>
