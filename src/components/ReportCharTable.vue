<template>
  <div class="report-char-table">
    <el-table
      :data="sortedChars"
      height="100%"
      stripe
      size="small"
      @sort-change="handleSortChange"
      @row-click="handleRowClick"
    >
      <el-table-column
        type="index"
        label="序号"
        width="80"
        align="center"
      />
      <el-table-column
        prop="char"
        label="文字"
        width="80"
        align="center"
      >
        <template slot-scope="scope">
          <span :class="{ 'error-char': scope.row.mistyped }" class="char-text">
            {{ scope.row.char }}
          </span>
        </template>
      </el-table-column>
      <el-table-column
        prop="durationMs"
        label="耗时(秒)"
        sortable="custom"
        align="center"
        width="120"
      >
        <template slot-scope="scope">
          {{ (scope.row.durationMs / 1000).toFixed(3) }}
        </template>
      </el-table-column>
      <el-table-column
        prop="backspaceCount"
        label="回改"
        sortable="custom"
        align="center"
        width="80"
      />
    </el-table>
  </div>
</template>

<script lang="ts">
import { Component, Vue, Prop } from 'vue-property-decorator'
import { TypingReportChar } from '@/store/types'

@Component
export default class ReportCharTable extends Vue {
  @Prop({ type: Array, default: () => [] })
  private chars!: TypingReportChar[]

  @Prop({ type: Number, default: 0.5 })
  private threshold!: number

  private sortProp = ''
  private sortOrder = ''

  get sortedChars (): TypingReportChar[] {
    const chars = this.chars.slice()

    if (this.sortProp && this.sortOrder) {
      chars.sort((a, b) => {
        const aVal = a[this.sortProp as keyof TypingReportChar] as number
        const bVal = b[this.sortProp as keyof TypingReportChar] as number

        if (this.sortOrder === 'ascending') {
          return aVal - bVal
        } else {
          return bVal - aVal
        }
      })
    } else {
      // 默认排序：错字优先，然后按耗时降序
      chars.sort((a, b) => {
        if (a.mistyped !== b.mistyped) {
          return a.mistyped ? -1 : 1
        }
        return b.durationMs - a.durationMs
      })
    }

    return chars
  }

  handleSortChange ({ prop, order }: { prop: string; order: string }): void {
    this.sortProp = prop
    this.sortOrder = order
  }

  handleRowClick (row: TypingReportChar): void {
    this.$emit('row-click', row.idx)
  }
}
</script>

<style lang="scss" scoped>
.report-char-table {
  flex: 1;
  overflow: hidden;

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
