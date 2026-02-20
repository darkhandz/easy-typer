<template>
  <div>
    <el-table border :data="achievements.slice(0, 10)" stripe="stripe" style="width:100%;" class="achievements-table" :cell-class-name="tableCellClassName" @row-click="handleRowClick">
      <el-table-column prop="title" type="expand" label="">
        <template slot-scope="$props">
          <el-button @click.stop="handleCopy($props.row)" type="text" size="medium">复制</el-button>
          <el-button v-if="$props.row.reportId" @click.stop="handleViewReport($props.row)" type="text" size="medium">查看报告</el-button>
          {{ generateRecord($props.row) }}
        </template>
      </el-table-column>
      <el-table-column prop="identity" label="段号" min-width="80"/>
      <el-table-column prop="typeSpeed" label="速度" min-width="70"/>
      <el-table-column prop="hitSpeed" label="击键" min-width="60"/>
      <el-table-column prop="codeLength" label="码长" min-width="60"/>
      <el-table-column prop="contentLength" label="字数" min-width="60"/>
      <el-table-column prop="replace" label="回改" min-width="60"/>
      <el-table-column prop="error" label="错字" min-width="60"/>
      <el-table-column prop="error" label="用时(s)" min-width="70">
        <template slot-scope="$props">
           {{ formatTime($props.row.usedTime) }}
        </template>
      </el-table-column>
      <el-table-column prop="keys" label="键数" min-width="60"/>
      <el-table-column prop="accuracy" label="键准(%)" min-width="80"/>
      <el-table-column prop="phraseRate" label="打词(%)" min-width="80"/>
      <el-table-column prop="title" label="标题" min-width="120" show-overflow-tooltip />
      <el-table-column prop="finishedTime" label="结束时间" :formatter="timeFormatter" width="166"/>
    </el-table>
    <div class="pagination-wrapper">
      <el-pagination
        background
        :pager-count="5"
        layout="total, prev, pager, next"
        @current-change="handleCurrentChange"
        :total="totalAchievement">
      </el-pagination>
    </div>
    <TypingReportDialog
      :show.sync="reportDialogVisible"
      :content="reportContent"
      :report-chars="reportChars"
    />
  </div>
</template>

<script lang="ts">
import { Achievement, RacingState, TypingReportChar } from '@/store/types'
import { Component, Vue, Watch } from 'vue-property-decorator'
import { Mutation, State } from 'vuex-class'
import Clipboard from '@/store/util/Clipboard'
import db from '../store/util/Database'
import dayjs from 'dayjs'
import TypingReportDialog from './TypingReportDialog.vue'

const PAGE_SIZE = 10
const SPEED_GAP = 30 // 速度阶梯，每30新增一个颜色

@Component({
  components: {
    TypingReportDialog
  }
})
export default class Achievements extends Vue {
  @State('achievements')
  private achievements!: Array<Achievement>

  @State('totalAchievements')
  totalAchievement!: number

  @Mutation('updateAchievements')
  private updateAchievements!: Function

  @Mutation('updateTotalAchievements')
  private updateTotalAchievements!: Function

  private reportDialogVisible = false
  private reportContent = ''
  private reportChars: TypingReportChar[] = []

  async created (): Promise<void> {
    // 如果 Vuex 中没有数据，自己加载
    if (this.achievements.length === 0) {
      try {
        const recentAchievements = await db.achievement.reverse().limit(10).toArray()
        this.updateAchievements(recentAchievements)

        const total = await db.achievement.count()
        this.updateTotalAchievements(total)
      } catch (error) {
        console.error('[Achievements] Failed to load from DB:', error)
      }
    }
  }

  @Watch('achievements')
  onAchievementsChange (newVal: Achievement[]): void {
    // 监听 achievements 变化，确保组件响应数据更新
  }

  titleFormatter (row: Achievement, column: number, value: string) {
    return (value || '未知').slice(0, 16)
    // return value || '未知'
  }

  tableCellClassName ({ row, column }: any) {
    if (column.property === 'typeSpeed') {
      const rawLevel = Math.floor(row.typeSpeed / SPEED_GAP)
      const level = rawLevel > 6 ? 6 : rawLevel // 速度等级为 6+ 时按 6 处理

      return `speed-lv-${level}`
    }

    if (column.property === 'accuracy') {
      if (row.accuracy === 100) {
        return 'accuracy-lv-perfect'
      }

      if (row.accuracy < 90) {
        return 'accuracy-lv-warn'
      }
    }

    if (column.property === 'error') {
      if (row.error > 0) {
        return 'achievement-error'
      }
    }

    return ''
  }

  timeFormatter (row: Achievement, column: number, value: number) {
    return dayjs(value).format('YYYY/MM/DD HH:mm:ss')
  }

  formatTime (total: number, mill = 3): string {
    total = total / 1000
    if (total < 60) {
      return `${total.toFixed(mill)}`
    }

    const seconds = total % 60
    const minutes = (total - seconds) / 60
    return `${minutes.toFixed(0)}:${seconds.toFixed(mill)}`
  }

  handleCurrentChange (currentPage: number) {
    const offset = (currentPage - 1) * PAGE_SIZE
    db.achievement.reverse().offset(offset).limit(10).toArray().then(achievements => {
      this.updateAchievements(achievements)
    }, (error) => {
      console.log(error)
    })
  }

  generateRecord (row: Achievement & RacingState) {
    return `第${row.identity}段 速度${row.typeSpeed} 击键${row.hitSpeed} 码长${row.codeLength} 字数${row.contentLength} 错字${row.error} 用时${this.formatTime(row.usedTime)}秒 暂停${row.pauseCount}次${this.formatTime(row.pauseTime)}秒 键准${row.accuracy}% 键法${row.balance}% 左${row.leftHand} 右${row.rightHand} 理论码长${row.idealCodeLength} 打词${row.phrase} 打词率${row.phraseRate}% 选重${row.selective} 回改${row.replace} 键数${row.keys} 退格${row.backspace} 回车${row.enter} 第${row.retry}次跟打`
  }

  handleCopy (row: Achievement & RacingState) {
    Clipboard.copy(this.generateRecord(row), () => {
      this.$message.success(`已复制第${row.identity}段`)
    }, () => {
      this.$message.warning('你的浏览器暂不支持自动复制')
    })
  }

  handleRowClick (row: Achievement): void {
    if (row.reportId) {
      this.handleViewReport(row)
    }
  }

  async handleViewReport (row: Achievement): Promise<void> {
    if (!row.reportId) {
      this.$message.warning('该成绩没有打字报告')
      return
    }

    try {
      const report = await db.typingReport.get(row.reportId)
      if (!report) {
        this.$message.error('打字报告不存在')
        return
      }

      const chars = await db.typingReportChar
        .where('reportId')
        .equals(row.reportId)
        .toArray()

      this.reportContent = report.content
      this.reportChars = chars
      this.reportDialogVisible = true
    } catch (error) {
      console.error('加载打字报告失败:', error)
      this.$message.error('加载打字报告失败')
    }
  }
}
</script>
