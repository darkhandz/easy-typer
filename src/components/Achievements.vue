<template>
  <div>
    <el-table border :data="achievements.slice(0, 10)" stripe="stripe" style="width:100%;" class="achievements-table" :cell-class-name="tableCellClassName" @row-click="handleRowClick">
      <el-table-column prop="title" type="expand" label="">
        <template slot-scope="$props">
          <el-popconfirm style="margin-right:6px;"
            confirm-button-text="删除"
            cancel-button-text="取消"
            @confirm="handleDeleteAchievement($props.row)"
            icon="el-icon-warning"
            icon-color="red"
            title="确定要删除这条成绩及其打字报告吗？删除后无法恢复。"
          >
            <el-button slot="reference" @click.stop type="text" size="medium" style="color: #F56C6C">删除</el-button>
          </el-popconfirm>
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
        :current-page="currentPage"
        :total="totalAchievement">
      </el-pagination>
    </div>
    <TypingReportDialog
      :show.sync="reportDialogVisible"
      :content="reportContent"
      :report-chars="reportChars"
      :achievement="reportAchievement"
    />
  </div>
</template>

<script lang="ts">
import { Achievement, RacingState, TypingReportChar } from '@/store/types'
import { Component, Vue } from 'vue-property-decorator'
import { Mutation, State } from 'vuex-class'
import Clipboard from '@/store/util/Clipboard'
import db from '../store/util/Database'
import dayjs from 'dayjs'
import TypingReportDialog from './TypingReportDialog.vue'
import { getAchievementsPage } from '@/store/util/AchievementQuery'

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
  private reportAchievement: Achievement | null = null
  private currentPage = 1

  async created (): Promise<void> {
    // 如果 Vuex 中没有数据（或旧数据缺少主键），自己加载
    if (this.achievements.length === 0 || this.achievements.some(a => typeof a.id !== 'number')) {
      try {
        await this.reloadCurrentPage()
      } catch (error) {
        console.error('[Achievements] Failed to load from DB:', error)
      }
    }
  }

  titleFormatter (row: Achievement, column: number, value: string) {
    return (value || '未知').slice(0, 16)
    // return value || '未知'
  }

  tableCellClassName ({ row, column }: { row: Achievement; column: { property?: string } }): string {
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
    this.currentPage = currentPage
    this.reloadCurrentPage().catch(console.error)
  }

  async reloadCurrentPage (): Promise<void> {
    const total = await db.achievement.count()
    this.updateTotalAchievements(total)

    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
    if (this.currentPage > totalPages) {
      this.currentPage = totalPages
    }

    const offset = (this.currentPage - 1) * PAGE_SIZE
    const achievements = await getAchievementsPage(offset, PAGE_SIZE)
    this.updateAchievements(achievements)
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
      this.reportAchievement = row
      this.reportDialogVisible = true
    } catch (error) {
      console.error('加载打字报告失败:', error)
      this.$message.error('加载打字报告失败')
    }
  }

  async handleDeleteAchievement (row: Achievement): Promise<void> {
    const reportId = typeof row.reportId === 'number' ? row.reportId : 0

    try {
      // achievement 表使用 out-of-line 主键，必要时通过 reportId 反查主键
      let achievementId = typeof row.id === 'number' ? row.id : 0
      if (!achievementId && reportId) {
        const keys = await db.achievement.where('reportId').equals(reportId).primaryKeys()
        achievementId = (keys[0] as number) || 0
      }

      if (!achievementId) {
        this.$message.error('缺少成绩主键，无法删除（建议刷新页面后重试）')
        return
      }

      await db.transaction('rw', db.achievement, db.typingReport, db.typingReportChar, async () => {
        const reportIds = new Set<number>()
        if (reportId) reportIds.add(reportId)

        const linkedReports = await db.typingReport.where('achievementId').equals(achievementId).toArray()
        for (const r of linkedReports) {
          if (typeof r.id === 'number') reportIds.add(r.id)
        }

        const ids = Array.from(reportIds)
        if (ids.length > 0) {
          await db.typingReportChar.where('reportId').anyOf(ids).delete()
          await db.typingReport.bulkDelete(ids)
        }

        await db.achievement.delete(achievementId)
      })

      if (this.reportDialogVisible && this.reportAchievement && this.reportAchievement.id === achievementId) {
        this.reportDialogVisible = false
        this.reportAchievement = null
        this.reportContent = ''
        this.reportChars = []
      }

      this.$message.success('已删除')
      await this.reloadCurrentPage()
    } catch (error) {
      console.error('删除成绩失败:', error)
      this.$message.error('删除失败')
    }
  }
}
</script>
