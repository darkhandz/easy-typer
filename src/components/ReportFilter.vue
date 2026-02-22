<template>
  <div class="report-filter">
    <div class="filter-row">
      <span class="filter-label">耗时筛选：</span>
      <el-slider
        :value="threshold"
        @input="handleSliderChange"
        :min="minThreshold"
        :max="maxThreshold"
        :step="0.1"
        :show-tooltip="false"
        class="filter-slider"
      />
      <el-input-number
        :value="threshold"
        @input="handleInputChange"
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
</template>

<script lang="ts">
import { Component, Vue, Prop } from 'vue-property-decorator'
import { namespace } from 'vuex-class'

const setting = namespace('setting')

@Component
export default class ReportFilter extends Vue {
  @Prop({ type: Number, default: 0.5 })
  private threshold!: number

  @setting.State('reportTimeBuckets')
  private timeBuckets!: Array<{ min: number; max: number; textColor: string; bgColor: string }>

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

  handleSliderChange (val: number): void {
    this.$emit('update:threshold', val)
  }

  handleInputChange (val: number | undefined): void {
    if (val !== undefined) {
      this.$emit('update:threshold', val)
    }
  }

  handleCopy (): void {
    this.$emit('copy')
  }
}
</script>

<style lang="scss" scoped>
.report-filter {
  padding: 10px;
  background: var(--level4-border-color);
  border-radius: 4px;

  .filter-row {
    display: flex;
    align-items: center;
    gap: 15px;

    .filter-label {
      white-space: nowrap;
      font-size: 14px;
      color: var(--secondary-color);
    }

    .filter-slider {
      flex: 1;
      min-width: 76px;
    }

    .filter-input {
      width: 120px;
    }

    .el-button--small {
      padding: 9px 10px;

    }
  }
}
</style>
