<template>
  <div class="page-content pro-module">
    <el-form ref="settingForm" :model="form" :rules="rules" label-suffix=":" label-width="14rem" class="pro-module-bd">
      <el-tabs v-model="activeTab" tab-position="left">
        <el-tab-pane label="基本设置" name="basic">
          <el-form-item label="自动重新开始">
            <el-switch v-model="form.retryWhenEmpty"/>
          </el-form-item>
          <el-form-item label="顶部进度条">
            <el-switch v-model="form.showTopProgress"/>
          </el-form-item>
          <el-form-item label="达标提示">
            <el-switch v-model="form.showAchievedTip"/>
          </el-form-item>
          <el-form-item label="结束条件">
            <el-select v-model="form.finishStrategy">
              <el-option value="NO_ERROR" label="无错字"/>
              <el-option value="LENGTH_MATCH" label="打完"/>
              <el-option value="LAST_RIGHT" label="最后一次上屏无错"/>
            </el-select>
          </el-form-item>
          <el-form-item label="赛文字体">
            <el-input v-model="form.fontFamily"/>
          </el-form-item>
          <el-form-item label="赛文字号">
            <el-input v-model="form.fontSize"/>
          </el-form-item>
          <el-form-item label="文章行数">
            <el-input type="number" v-model="form.articleRows"/>
          </el-form-item>
          <el-form-item label="文章滚动">
            <el-select v-model="form.articleScrollMode">
              <el-option value="page" label="默认模式"/>
              <el-option value="line" label="逐行居中"/>
              <el-option value="char" label="逐字跟随"/>
            </el-select>
            <span class="el-upload__tip">文章字数过多时的自动滚动方式</span>
          </el-form-item>
          <el-form-item label="输入区行数">
            <el-input type="number" v-model="form.inputRows"/>
          </el-form-item>
          <el-form-item label="未打文字颜色">
            <el-color-picker v-model="form.pending"></el-color-picker>
          </el-form-item>
          <el-form-item label="未打文字颜色[暗黑模式]">
            <el-color-picker v-model="form.darkPending"></el-color-picker>
          </el-form-item>
          <el-form-item label="已打文字颜色">
            <el-color-picker v-model="form.typed"></el-color-picker>
          </el-form-item>
          <el-form-item label="已打文字颜色[暗黑模式]">
            <el-color-picker v-model="form.darkTyped"></el-color-picker>
          </el-form-item>
          <el-form-item label="正确背景颜色">
            <el-color-picker v-model="form.correct"></el-color-picker>
          </el-form-item>
          <el-form-item label="正确背景颜色[暗黑模式]">
            <el-color-picker v-model="form.darkCorrect"></el-color-picker>
          </el-form-item>
          <el-form-item label="错误背景颜色">
            <el-color-picker v-model="form.error"></el-color-picker>
          </el-form-item>
        </el-tab-pane>
        <el-tab-pane label="码表设置">
          <el-form-item label="码表文件">
            <el-upload drag action="#"
              accept=".tsv,.txt"
              :auto-upload="false"
              :show-file-list="false"
              :on-change="loadCodings">
              <i class="el-icon-upload"></i>
              <div class="el-upload__text">将码表文件拖到此处，或<em>点击上传</em></div>
              <div class="el-upload__tip" slot="tip">
                <div>0. 支持任意码表：虎码、86五笔、091五笔、小鹤等等</div>
                <div>1. 文本格式文件，UTF8编码多多格式，即 `字  编码`，每行一条记录</div>
                <div>2. 码表按 <strong class="tidiv-extra">『字母顺序』</strong> 排列，否则选重计算会有问题</div>
              </div>
              <div class="el-upload__tip" slot="tip">3. 点击更新默认编码提示：
                <!-- <el-button-group> -->
                <el-button type="primary" plain size="mini" icon="el-icon-download" :loading="isCodingLoading" @click="handleCodingDownload('tiger')">『虎码单字2025.01.09』</el-button>
                <el-button type="primary" plain size="mini" icon="el-icon-download" :loading="isCodingLoading" @click="handleCodingDownload('tigerCi')">『虎码字词2025.01.09』</el-button>
                <el-button type="primary" plain size="mini" icon="el-icon-download" :loading="isCodingLoading" @click="handleCodingDownload('xh')">『小鹤词提』</el-button>
                <!-- </el-button-group> -->
              </div>
            </el-upload>
          </el-form-item>
        </el-tab-pane>
        <el-tab-pane label="编码提示设置">
          <el-form-item label="编码提示">
            <el-switch v-model="form.hint"/>
          </el-form-item>
          <el-form-item v-if="form.hint" label="提示选项">
            <el-checkbox-group v-model="form.hintOptions">
              <el-checkbox-button v-for="o in hintOptions" :label="o.value" :key="o.value" :disabled="o.disabled">{{ o.text }}</el-checkbox-button>
            </el-checkbox-group>
          </el-form-item>
          <el-form-item label="禁用单字编码提示">
            <el-switch v-model="form.disableSingleHint"/>
          </el-form-item>
          <el-form-item label="禁用词组编码提示">
            <el-switch v-model="form.disableWordHint"/>
          </el-form-item>
          <el-form-item v-if="selectHintEnabled" label="候选词条数" prop="pageSize">
            <el-input type="number" step="1" v-model.number="form.pageSize"/>
            <span class="el-upload__tip">输入法候选词条数量，需与输入法设置一致</span>
          </el-form-item>
          <el-form-item v-if="form.hint" label="最大候选词位置" prop="maxIndex">
            <el-input type="number" step="1" v-model.number="form.maxIndex"/>
            <span class="el-upload__tip">超过该位置的候选词将被丢弃</span>
          </el-form-item>
          <el-form-item v-if="selectHintEnabled" label="翻页提示">
            <el-input v-model="form.nextPage" size="1"/>
            <span class="el-upload__tip">下一页候选词条键</span>
          </el-form-item>
          <el-form-item v-if="selectHintEnabled" label="选重提示">
            <el-input v-model="form.selective"/>
            <span class="el-upload__tip">用于选重提示，长度需对应输入法候选词条数量</span>
          </el-form-item>
          <el-form-item v-if="selectHintEnabled" label="非首选键">
            <el-input v-model="form.altSelectKey"/>
            <span class="el-upload__tip">选择非首选词条时所用的键，如果使用了";,"作为2，3选时，也需填入</span>
          </el-form-item>
          <el-form-item v-if="selectHintEnabled" label="选重键文本">
            <el-input v-model="form.selectiveText"/>
            <span class="el-upload__tip">在首选字词后出现以上字符时，顶屏将不可用，需要手动选择</span>
          </el-form-item>
          <el-form-item v-if="autoSelectHintEnabled" label="标点顶屏提示">
            <el-input v-model="form.punctuationAutoSelectHint"/>
          </el-form-item>
          <el-form-item v-if="selectHintEnabled" label="四码唯一自动上屏">
            <el-switch v-model="form.fourthAutoSelect"/>
          </el-form-item>
          <el-form-item v-if="selectHintEnabled" label="第五码首选上屏">
            <el-switch v-model="form.fifthAutoSelect"/>
          </el-form-item>
          <el-form-item v-if="showHintColor" label="提示颜色">
            <el-color-picker v-model="form.hintColor"/>
          </el-form-item>
          <el-form-item v-if="colorHintEnabled" label="一码颜色">
            <el-color-picker v-model="form.code1"/>
          </el-form-item>
          <el-form-item v-if="colorHintEnabled" label="二码颜色">
            <el-color-picker v-model="form.code2"/>
          </el-form-item>
          <el-form-item v-if="colorHintEnabled" label="三码颜色">
            <el-color-picker v-model="form.code3"/>
          </el-form-item>
          <el-form-item v-if="colorHintEnabled" label="全码颜色">
            <el-color-picker v-model="form.code4"/>
          </el-form-item>
        </el-tab-pane>
        <el-tab-pane v-if="form.hint" label="标点设置" name="punctuation">
          <el-form-item label="标点用于">
            <el-switch v-model="form.addPunctuationToCodings" active-text="码表及顶屏计算" inactive-text="顶屏计算"/>
          </el-form-item>
          <el-form-item>
            <el-table ref="punctuationTable" :data="punctuations" border :height="punctuationTableHeight" size="mini">
              <template slot="empty" slot-scope="scope">
                  <el-button @click.native.prevent="addPunctuation(scope.$index)" type="text" size="small">添加</el-button>
              </template>
              <el-table-column prop="key" label="标点"/>
              <el-table-column prop="value" label="编码" v-if="form.addPunctuationToCodings"/>
              <el-table-column label="操作">
                <template slot-scope="scope">
                  <el-popconfirm
                    confirm-button-text='好的'
                    cancel-button-text='不用了'
                    @confirm="deletePunctuation(scope.$index, scope.row, punctuations)"
                    icon="el-icon-info"
                    icon-color="red"
                    title="确定要删除这个标点吗？"
                  >
                    <el-button slot="reference" type="text" size="small">移除</el-button>
                  </el-popconfirm>
                  <el-button @click.native.prevent="addPunctuation(scope.$index)" type="text" size="small">添加</el-button>
                </template>
              </el-table-column>
            </el-table>
          </el-form-item>
        </el-tab-pane>
        <el-tab-pane label="成绩设置" name="result">
          <el-form-item label="选项">
            <el-checkbox :indeterminate="isIndeterminate" v-model="checkAll" @change="handleCheckAllChange">全选</el-checkbox>
            <div style="margin: 15px 0;"></div>
            <el-checkbox-group v-model="form.resultOptions" @change="handleCheckedResultChange">
              <el-checkbox v-for="o in resultOptions" :label="o.value" :key="o.value" :disabled="o.disabled">{{ o.text }}</el-checkbox>
            </el-checkbox-group>
          </el-form-item>

          <el-form-item label="自动复制成绩">
            <el-switch v-model="autoCopyAchievement"/>
          </el-form-item>

          <el-form-item label="输入法">
            <el-switch v-model="form.inputMethod"/>
            <el-input maxlength="20" v-if="form.inputMethod" v-model="form.inputMethodName"/>
          </el-form-item>
          <el-form-item label="个性签名">
            <el-switch v-model="form.signature"/>
            <el-input maxlength="100" v-if="form.signature" v-model="form.signatureText"/>
          </el-form-item>
        </el-tab-pane>
        <el-tab-pane label="载文设置" name="load">
          <el-form-item label="去除空格">
            <el-switch v-model="form.replaceSpace"/>
          </el-form-item>
          <el-form-item label="替换符号[英->中]">
            <el-switch v-model="form.replaceSymbol"/>
          </el-form-item>
        </el-tab-pane>
        <el-tab-pane label="打字报告设置" name="report">
          <el-form-item label="慢字耗时阈值（秒）">
            <el-input-number v-model="form.reportSlowThresholdDefault" :min="0.1" :max="4" :step="0.1" :precision="1"/>
            <span class="el-upload__tip"> (打字报告中慢字筛选的默认阈值)</span>
          </el-form-item>
          <el-form-item label="错字颜色">
            <el-color-picker v-model="form.reportColorError"/>
          </el-form-item>
          <el-divider content-position="left">时间分段配置</el-divider>
          <div v-for="(bucket, index) in form.reportTimeBuckets" :key="index" class="time-bucket-item">
            <el-card shadow="hover">
              <div class="bucket-header">
                <span class="bucket-title">分段 {{ index + 1 }}</span>
                <el-button
                  v-if="form.reportTimeBuckets.length > 1"
                  type="danger"
                  size="mini"
                  icon="el-icon-delete"
                  circle
                  @click="removeBucket(index)"
                />
              </div>
              <div class="bucket-content">
                <div class="bucket-inputs">
                  <el-form-item label="时间范围（秒）" label-width="17em">
                    <div class="range-inputs">
                      <el-input-number v-model="bucket.min" :min="0" :max="999" :step="0.1" :precision="1" size="small" style="width: 120px"/>
                      <span style="margin: 0 8px">~</span>
                      <el-input-number v-model="bucket.max" :min="0.1" :max="999" :step="0.1" :precision="1" size="small" style="width: 120px"/>
                    </div>
                  </el-form-item>
                  <el-form-item label="颜色配置" label-width="17em">
                    <div class="color-inputs">
                      <span style="margin-right: 8px">文字</span>
                      <el-color-picker v-model="bucket.textColor" size="small"/>
                      <span style="margin: 0 16px 0 8px">背景</span>
                      <el-color-picker v-model="bucket.bgColor" size="small"/>
                    </div>
                  </el-form-item>
                </div>
                <div class="bucket-preview">
                  <div class="preview-label">预览</div>
                  <div class="preview-char" :style="{ color: bucket.textColor, backgroundColor: bucket.bgColor }">
                    例
                  </div>
                </div>
              </div>
            </el-card>
          </div>
          <el-button type="primary" icon="el-icon-plus" @click="addBucket">添加分段</el-button>
        </el-tab-pane>
        <el-tab-pane label="导入导出" name="importExport">
          <el-alert
            type="warning"
            show-icon
            :closable="false"
            title="导入会覆盖本地数据库（包括成绩/报告/设置等）。请先导出备份，再进行导入。"
          />
          <el-form-item label="导出数据库">
            <el-button type="primary" icon="el-icon-download" :loading="isDbExporting" @click="handleDbExport">导出</el-button>
            <span class="el-upload__tip">导出文件为 JSON，可用于在本页面恢复。</span>
          </el-form-item>

          <el-form-item label="导入数据库">
            <el-upload
              drag
              action="#"
              accept=".json"
              :auto-upload="false"
              :show-file-list="false"
              :on-change="handleDbImportFileChange"
            >
              <i class="el-icon-upload"></i>
              <div class="el-upload__text">将导出的 JSON 文件拖到此处，或<em>点击选择</em></div>
              <div class="el-upload__tip" slot="tip">
                <div v-if="dbImportPreview">
                  <div>已选择：{{ dbImportPreview.fileName }}</div>
                  <div>导出时间：{{ formatTime(dbImportPreview.exportedAt) }}</div>
                  <div>表数量：{{ dbImportPreview.tableCount }}</div>
                </div>
                <div v-else>选择文件后会先校验有效性，通过后才允许导入。</div>
              </div>
            </el-upload>

            <el-button
              type="danger"
              icon="el-icon-warning-outline"
              :disabled="!dbImportData || isDbImporting"
              :loading="isDbImporting"
              style="margin-top: 12px"
              @click="confirmDbImport"
            >
              导入并覆盖
            </el-button>
          </el-form-item>

          <el-form-item label="危险操作">
            <el-button
              type="danger"
              plain
              icon="el-icon-delete"
              :disabled="isDbExporting || isDbImporting"
              @click="confirmClearTypingData"
            >
              清除所有打字成绩
            </el-button>
            <div class="el-upload__tip" style="margin-top: 8px">将清除打字成绩与打字报告（不可恢复），并重置“跟打总记录”统计；不影响码表/设置/阅读书架等。</div>
          </el-form-item>
        </el-tab-pane>
      </el-tabs>
      <el-form-item>
        <el-button v-if="activeTab !== 'importExport'" type="primary" @click="submitForm">保存</el-button>
        <el-button v-if="activeTab !== 'importExport'" @click="resetForm">重置</el-button>
        <el-button v-if="activeTab !== 'importExport'" type="danger" @click="setToDefault">恢复默认设置</el-button>
      </el-form-item>
    </el-form>
    <el-dialog title="添加标点" :visible="punctuationFormVisiable">
      <el-form :model="punctuationForm" inline>
        <el-form-item label="标点">
          <el-input v-model="punctuationForm.key"/>
        </el-form-item>
        <el-form-item label="编码">
          <el-input v-model="punctuationForm.value"/>
        </el-form-item>
      </el-form>
      <div slot="footer" class="dialog-footer">
        <el-button @click="punctuationFormVisiable = false">取 消</el-button>
        <el-button type="primary" @click="submitPunctuationForm()">确 定</el-button>
      </div>
    </el-dialog>
  </div>
</template>

<script lang="ts">
import { Component, Vue, Watch } from 'vue-property-decorator'
import { parseTrieNodeByCodinds } from '../store/util/TrieTree'
import db from '../store/util/Database'
import { SettingState } from '../store/types'
import { Action, namespace } from 'vuex-class'
import { Form, Loading, MessageBox, Table } from 'element-ui'
import aes from 'crypto-js/aes'
import encUTF8 from 'crypto-js/enc-utf8'
import punctuations from '../store/util/punctuation'
import { EasyTyperDbExportV1, exportDatabase, importDatabase, parseDbExport, parseDbExportRaw, stringifyDbExport, validateDbExportV1 } from '../store/util/DbTransfer'

interface KeyValue {
  key: string;
  value: string;
}

const setting = namespace('setting')

const HINT_OPTIONS = [
  { value: 'phrase', text: '词语', disabled: true },
  { value: 'color', text: '颜色' },
  { value: 'select', text: '选重' },
  { value: 'autoSelect', text: '顶屏' },
  { value: 'code', text: '编码' }
]

const RESULT_OPTIONS = [
  { value: 'identity', text: '标识', disabled: true },
  { value: 'typeSpeed', text: '速度', disabled: true },
  { value: 'hitSpeed', text: '击键', disabled: true },
  { value: 'codeLength', text: '码长', disabled: true },
  { value: 'idealCodeLength', text: '理想码长' },
  { value: 'contentLength', text: '字数' },
  { value: 'error', text: '错字' },
  { value: 'usedTime', text: '用时' },
  { value: 'pauseTime', text: '暂停时间' },
  { value: 'accuracy', text: '键准' },
  { value: 'balance', text: '键法' },
  { value: 'leftHand', text: '左' },
  { value: 'rightHand', text: '右' },
  { value: 'phrase', text: '打词数' },
  { value: 'phraseRate', text: '打词' },
  { value: 'selective', text: '选重' },
  { value: 'replace', text: '回改' },
  { value: 'keys', text: '键数' },
  { value: 'backspace', text: '退格' },
  { value: 'enter', text: '回车' },
  { value: 'retry', text: '重打' },
  { value: 'hash', text: '哈希码' },
  { value: 'version', text: '版本' },
  { value: 'firstTry', text: '首打等级提示' },
  { value: 'noCodings', text: '词提禁用提示' },
  { value: 'accuracyTip', text: '无敌键准提示' },
  { value: 'errPenaltyTip', text: '错一罚五提示' }
]

@Component
export default class Setting extends Vue {
  private hintOptions = HINT_OPTIONS

  private resultOptions = RESULT_OPTIONS

  private form = new SettingState()

  get autoCopyAchievement (): boolean {
    return !this.form.offClipboard
  }

  set autoCopyAchievement (enabled: boolean) {
    this.form.offClipboard = !enabled
  }

  @setting.State('loaded')
  private loaded!: boolean

  @setting.Getter('state')
  private setting!: SettingState

  @setting.Mutation('update')
  private updateSetting!: Function

  @Action('updateCodings')
  private updateCodings!: Function

  private checkAll = false

  private isIndeterminate = true

  private activeTab = 'basic'

  private punctuationFormVisiable = false

  private punctuationIndex = -1

  private isCodingLoading = false

  private punctuationForm = { key: '', value: '' }

  private isDbExporting = false

  private isDbImporting = false

  private dbImportData: EasyTyperDbExportV1 | null = null

  private dbImportPreview: { fileName: string; exportedAt: number; tableCount: number } | null = null

  private rules = {
    maxIndex: [
      { required: true, type: 'number', message: '请输入最大候选词条位置，如不限制，请输入"0"', trigger: 'blur' },
      { type: 'number', min: 0, message: '最大候选词条位置不得小于0', trigger: 'blur' }
    ],
    pageSize: [
      { required: true, type: 'number', message: '请输入候每页选词条数', trigger: 'blur' },
      { type: 'number', min: 1, message: '每页候选词条数不得小于1', trigger: 'blur' }
    ]
  }

  get colorHintEnabled (): boolean {
    return this.isHintOptionEnabled('color')
  }

  get selectHintEnabled (): boolean {
    return this.isHintOptionEnabled('select')
  }

  get autoSelectHintEnabled (): boolean {
    return this.isHintOptionEnabled('autoSelect')
  }

  get showHintColor (): boolean {
    return this.selectHintEnabled || this.isHintOptionEnabled('code') || this.autoSelectHintEnabled
  }

  get punctuationTableHeight (): number {
    return window.innerHeight - 300
  }

  get punctuations (): Array<KeyValue> {
    const result: Array<KeyValue> = []
    for (const [key, value] of this.form.punctuations) {
      result.push({ key, value })
    }
    return result
  }

  handleCheckAllChange (val: boolean) {
    this.form.resultOptions = val ? RESULT_OPTIONS.map(v => v.value) : ['identity', 'typeSpeed', 'hitSpeed', 'codeLength']
    this.isIndeterminate = !val
  }

  handleCheckedResultChange (value: string) {
    const checkedCount = value.length
    this.checkAll = checkedCount === this.resultOptions.length
    this.isIndeterminate = checkedCount > 0 && checkedCount < this.resultOptions.length
  }

  isHintOptionEnabled (option: string): boolean {
    const { hint, hintOptions } = this.form
    return hint && hintOptions.indexOf(option) >= 0
  }

  /**
   * 处理码表文件
   * @param file 码表文件
   */
  loadCodings (file: { raw: File }): void {
    const loading = Loading.service({
      lock: true,
      text: '正在处理词库，需要一些时间，请耐心等待……',
      spinner: 'el-icon-loading',
      background: 'rgba(0, 0, 0, 0.7)'
    })
    const reader = new FileReader()
    // Fixme 候选词条数限制，需要将所有编码加入， 如：叁 -> df5, lnd, lndb
    reader.onload = () => {
      const trie = parseTrieNodeByCodinds(reader.result as string)

      // 将中文标点加入词库
      if (this.form.addToCodings) {
        for (const [key, value] of this.form.punctuations) {
          trie.put(key, value, -1)
        }
      }

      // 将同一个字的多个编码排序
      trie.sort()

      db.configs.put(trie.root, 'codings').then(() => {
        this.updateCodings(trie.root)
        loading.close()
        this.$message({ message: '码表处理完成', type: 'success', showClose: true })
      })
    }

    reader.readAsText(file.raw)
  }

  deletePunctuation (index: number, row: KeyValue, punctuations: Array<KeyValue>): void {
    punctuations.splice(index, 1)
    this.form.punctuations.delete(row.key)
  }

  addPunctuation (index: number): void {
    this.punctuationIndex = index
    this.punctuationFormVisiable = true
  }

  submitPunctuationForm (): void {
    const punctuations = (this.$refs.punctuationTable as Table).data as Array<KeyValue>
    punctuations.splice(this.punctuationIndex + 1, 0, this.punctuationForm)
    this.form.punctuations = new Map(punctuations.map(v => [v.key, v.value]))
    this.punctuationFormVisiable = false
  }

  submitForm (): void {
    (this.$refs.settingForm as Form).validate((valid: boolean) => {
      if (valid) {
        db.configs.put(this.form, 'setting').then(() => {
          this.$message({ message: '保存成功', type: 'success', showClose: true })
          this.updateSetting(this.form)
        })
      } else {
        this.$message({ message: '检验失败', type: 'warning', showClose: true, duration: 5000 })
        return false
      }
    })
  }

  setToDefault (): void {
    this.form = new SettingState()
  }

  @Watch('loaded')
  resetForm (): void {
    Object.assign(this.form, this.setting)
  }

  created (): void {
    this.resetForm()
  }

  handleCodingDownload (type: 'xh' | 'tiger' | 'tigerCi') {
    console.log('coding type: ', type)
    this.isCodingLoading = true
    const codingsTypes = {
      xh: {
        title: '『小鹤词提』',
        url: '/static/codingsXH.txt'
      },
      tiger: {
        title: '『虎码单字』',
        url: '/static/codings2025.01.09.txt'
      },
      tigerCi: {
        title: '『虎码字词』',
        url: '/static/codingsCi2025.01.09.txt'
      }
    }
    const codingType = codingsTypes[type]
    const typeText = codingType.title

    const saveCodings = (content: string) => {
      const trie = parseTrieNodeByCodinds(content)
      // 将中文标点加入词库
      for (const [key, value] of punctuations) {
        trie.put(key, value, -1)
      }
      // 将同一个字的多个编码排序
      trie.sort()

      return db.configs.put(trie.root, 'codings').then(() => {
        this.updateCodings(trie.root)
        this.$notify({
          title: '编码提示加载成功',
          message: `${typeText}编码提示加载成功`,
          type: 'success'
        })
        this.isCodingLoading = false
      })
    }

    if (type === 'xh') {
      fetch(codingType.url)
        .then(res => res.text())
        .then(ret => {
          const bytes = aes.decrypt(ret, 'U2FsdGVkX19wPZQjUTQ0')
          const originalContent = bytes.toString(encUTF8)
          return saveCodings(originalContent)
        }).catch((err) => {
          console.log(err)
          this.isCodingLoading = false
        })
      return
    }

    fetch(codingType.url)
      .then(res => res.text())
      .then(ret => {
        return saveCodings(ret)
      }).catch(() => {
        this.isCodingLoading = false
      })
  }

  addBucket (): void {
    this.form.reportTimeBuckets.push({
      min: 0,
      max: 1,
      textColor: '#303133',
      bgColor: '#909399'
    })
  }

  removeBucket (index: number): void {
    if (this.form.reportTimeBuckets.length > 1) {
      this.form.reportTimeBuckets.splice(index, 1)
    }
  }

  formatTime (timestamp: number): string {
    const dt = new Date(timestamp)
    return isNaN(dt.getTime()) ? '-' : dt.toLocaleString()
  }

  private buildExportFileName (): string {
    const dt = new Date()
    const pad2 = (n: number) => String(n).padStart(2, '0')
    const y = dt.getFullYear()
    const m = pad2(dt.getMonth() + 1)
    const d = pad2(dt.getDate())
    const hh = pad2(dt.getHours())
    const mm = pad2(dt.getMinutes())
    const ss = pad2(dt.getSeconds())
    return `easy-typer-db-${y}${m}${d}-${hh}${mm}${ss}.json`
  }

  private downloadTextFile (fileName: string, text: string): void {
    const blob = new Blob([text], { type: 'application/json;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = fileName
    link.click()
    URL.revokeObjectURL(url)
  }

  async handleDbExport (): Promise<void> {
    if (this.isDbExporting) return
    this.isDbExporting = true
    const loading = Loading.service({
      lock: true,
      text: '正在导出数据库，请稍候……',
      spinner: 'el-icon-loading',
      background: 'rgba(0, 0, 0, 0.7)'
    })

    try {
      const data = await exportDatabase(db)
      const json = stringifyDbExport(data)
      this.downloadTextFile(this.buildExportFileName(), json)
      this.$message({ message: '导出成功', type: 'success', showClose: true })
    } catch (e) {
      console.error(e)
      this.$message({ message: e?.message || '导出失败', type: 'error', showClose: true, duration: 5000 })
    } finally {
      loading.close()
      this.isDbExporting = false
    }
  }

  handleDbImportFileChange (file: { raw: File }): void {
    this.dbImportData = null
    this.dbImportPreview = null
    if (!file?.raw) return

    const reader = new FileReader()
    reader.onload = () => {
      try {
        const text = String(reader.result || '')
        const raw = parseDbExportRaw(text)
        const expectedTables = db.tables.map(t => t.name)
        const valid = validateDbExportV1(raw, expectedTables)
        if (!valid.ok) {
          this.$message({ message: valid.reason, type: 'error', showClose: true, duration: 6000 })
          return
        }

        const revived = parseDbExport(text) as EasyTyperDbExportV1
        this.dbImportData = revived
        this.dbImportPreview = {
          fileName: file.raw.name,
          exportedAt: revived.exportedAt,
          tableCount: Object.keys(revived.tables || {}).length
        }
        this.$message({ message: '文件校验通过，可以导入', type: 'success', showClose: true })
      } catch (e) {
        console.error(e)
        this.$message({ message: e?.message || '解析失败：请确认选择的是本页面导出的文件', type: 'error', showClose: true, duration: 6000 })
      }
    }
    reader.readAsText(file.raw)
  }

  async confirmDbImport (): Promise<void> {
    if (!this.dbImportData || this.isDbImporting) return

    try {
      await MessageBox.confirm(
        '导入会清空并覆盖本地数据库的所有数据（包括成绩/报告/设置等）。是否继续？',
        '确认导入',
        {
          confirmButtonText: '继续导入',
          cancelButtonText: '取消',
          type: 'warning',
          dangerouslyUseHTMLString: false
        }
      )
    } catch {
      return
    }

    this.isDbImporting = true
    const loading = Loading.service({
      lock: true,
      text: '正在导入数据库，请勿关闭页面……',
      spinner: 'el-icon-loading',
      background: 'rgba(0, 0, 0, 0.7)'
    })

    try {
      await importDatabase(db, this.dbImportData)
      await MessageBox.alert('导入成功，即将刷新页面以加载新数据。', '完成', {
        type: 'success',
        confirmButtonText: '刷新'
      })
      location.reload()
    } catch (e) {
      console.error(e)
      this.$message({ message: e?.message || '导入失败', type: 'error', showClose: true, duration: 6000 })
    } finally {
      loading.close()
      this.isDbImporting = false
    }
  }

  async confirmClearTypingData (): Promise<void> {
    if (this.isDbExporting || this.isDbImporting) return

    try {
      await MessageBox.confirm(
        '将清除所有打字成绩与打字报告（不可恢复）。是否继续？',
        '确认清除',
        {
          confirmButtonText: '继续清除',
          cancelButtonText: '取消',
          type: 'warning',
          dangerouslyUseHTMLString: false
        }
      )
    } catch {
      return
    }

    const loading = Loading.service({
      lock: true,
      text: '正在清除打字成绩与报告，请稍候……',
      spinner: 'el-icon-loading',
      background: 'rgba(0, 0, 0, 0.7)'
    })

    try {
      await db.transaction('rw', db.achievement, db.typingReport, db.typingReportChar, db.summary, async () => {
        await db.typingReportChar.clear()
        await db.typingReport.clear()
        await db.achievement.clear()
        await db.summary.delete('wordCount')
      })
      await MessageBox.alert('清除完成，即将刷新页面。', '完成', {
        type: 'success',
        confirmButtonText: '刷新'
      })
      location.reload()
    } catch (e) {
      console.error(e)
      this.$message({ message: e?.message || '清除失败', type: 'error', showClose: true, duration: 6000 })
    } finally {
      loading.close()
    }
  }
}
</script>

<style lang="scss">
  .el-form-item {
    margin-top: 22px;
  }

  .time-bucket-item {
    margin-bottom: 15px;

    .bucket-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 15px;

      .bucket-title {
        font-weight: bold;
        font-size: 16px;
        color: #303133;
      }
    }

    .bucket-content {
      display: flex;
      gap: 20px;
      align-items: flex-start;

      .bucket-inputs {
        flex: 1;

        .range-inputs {
          display: flex;
          align-items: center;
        }

        .color-inputs {
          display: flex;
          align-items: center;
        }
      }

      .bucket-preview {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 8px;
        padding: 10px;

        .preview-label {
          font-size: 12px;
          color: #909399;
        }

        .preview-char {
          width: 48px;
          height: 48px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 24px;
          font-weight: bold;
          border-radius: 4px;
          border: 1px solid #dcdfe6;
        }
      }
    }

    .el-card {
      .el-form-item {
        margin-top: 10px;
        margin-bottom: 10px;
      }
    }
  }
</style>
