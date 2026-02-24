<template>
  <div id="article-main">
    <el-row ref="board" :class="articleStyle">
      <Words v-for="word in words" :key="word.id" :word="word" :mode="articleMode"/>
    </el-row>
    <el-divider class="article-info" content-position="right">
      <span>第{{ identity }}段</span>
      <span>{{ title || '未知' }}</span>
      <span>共{{ length }}字</span>
      <span v-if="criteriaOpen">{{ criteriaIndicatorText }}</span>
    </el-divider>
  </div>
</template>

<script lang="ts">
import { Word } from '@/store/types'
import { Edge, ShortestPath } from '@/store/util/Graph'
import { Component, Vue, Watch } from 'vue-property-decorator'
import { namespace } from 'vuex-class'
import Words from '@/components/Words.vue'

const article = namespace('article')
const racing = namespace('racing')
const setting = namespace('setting')
const kata = namespace('kata')

@Component({
  components: { Words }
})
export default class Article extends Vue {
  @article.State('content')
  private content!: string

  @article.State('identity')
  private identity!: string

  @article.State('title')
  private title!: string

  @article.Getter('length')
  private length!: number

  @racing.State('input')
  private input!: string

  @article.State('shortest')
  private shortest!: ShortestPath<Word> | null;

  @racing.Getter('progress')
  private progress!: number

  @setting.State('hint')
  private hint!: boolean

  @setting.State('fontSize')
  private fontSize!: string

  @setting.State('articleRows')
  private articleRows!: number

  @setting.State('articleScrollMode')
  private articleScrollMode!: 'page' | 'line' | 'char'

  @setting.State('hintOptions')
  private hintOptions!: Array<string>

  @kata.State('criteriaOpen')
  private criteriaOpen!: boolean

  @kata.State('criteriaAccuracy')
  private criteriaAccuracy!: number

  @kata.State('criteriaHitSpeed')
  private criteriaHitSpeed!: number

  @kata.State('criteriaSpeed')
  private criteriaSpeed!: number

  @kata.State('criteriaAchieved')
  private criteriaAchieved!: number

  @kata.State('criteriaConsecutive')
  private criteriaConsecutive!: boolean

  @kata.State('achievedCount')
  private achievedCount!: number

  private scrollRafId = 0
  private nextScrollTop: number | null = null

  private measureCacheKey = ''
  private cachedCharsPerLine = 0

  get articleStyle (): Array<string> {
    let mode = 'inline'
    if (this.hint && this.shortest && (this.codeHint || this.selectHint || this.autoSelectHint)) {
      mode = 'grid'
    }
    return ['article', mode]
  }

  get articleMode (): 'inline' | 'grid' {
    return this.articleStyle.indexOf('grid') >= 0 ? 'grid' : 'inline'
  }

  get selectHint (): boolean {
    return this.hintOptions.indexOf('select') >= 0
  }

  get codeHint (): boolean {
    return this.hintOptions.indexOf('code') >= 0
  }

  get autoSelectHint (): boolean {
    return this.hintOptions.indexOf('autoSelect') >= 0
  }

  get criteriaIndicatorText (): string {
    const accuracy = this.formatNumber(this.criteriaAccuracy, 0)
    const hitSpeed = this.formatNumber(this.criteriaHitSpeed, 1)
    const typeSpeed = this.formatNumber(this.criteriaSpeed, 0)

    const achievedTotal = Math.max(0, Number(this.criteriaAchieved) || 0)
    const achievedNow = achievedTotal > 0
      ? Math.max(0, Math.min(Number(this.achievedCount) || 0, achievedTotal))
      : Math.max(0, Number(this.achievedCount) || 0)

    const consecutiveText = this.criteriaConsecutive ? '连续' : ''
    const achievedText = achievedTotal > 0 ? `${consecutiveText}${achievedTotal}次` : ''

    return `指标【键准:${accuracy} 击键:${hitSpeed} 速度:${typeSpeed} ${achievedText}】(${achievedNow}/${achievedTotal})`
  }

  formatNumber (val: number, digits = 0): string {
    if (!Number.isFinite(val)) return `${val}`
    if (digits <= 0) return `${Math.round(val)}`
    const rounded = Number(val.toFixed(digits))
    return `${rounded}`
  }

  get words (): Array<Word> {
    const length = this.content.length
    if (length === 0) {
      return []
    }

    const input = this.input
    const words: Array<Word> = []
    if (!this.hint || !this.shortest) {
      const inputLength = input.length
      const typed = this.content.substring(0, inputLength)
      this.check(0, input, typed, words)
      const pending = this.content.substring(inputLength)
      words.push(new Word(inputLength, pending, 'pending'))
    } else {
      const { path, vertices } = this.shortest
      for (let i = 0; i < length;) {
        // TODO: 扩折号会报错，如：老去——致爸
        const vertice = vertices[path[i]]
        const edge = vertice?.get(i)
        if (!edge) {
          i++
          continue
        }
        const next = this.addPhrase(input, edge, words)
        i = next === 0 ? path[i] : next
      }
    }

    return words
  }

  /**
   * 自动调整滚动条位置
   */
  @Watch('progress')
  autoScroll (progress: number) {
    const el = (this.$refs.board as Vue).$el as HTMLElement
    const { clientHeight, scrollHeight } = el
    const scrollDistance = scrollHeight - clientHeight
    if (scrollDistance <= 0) {
      return
    }

    if (progress === 0) {
      this.requestScrollTop(el, 0)
      return
    }

    const active = this.getActiveElement(el)
    if (!active) {
      this.requestScrollTop(el, Math.min(progress * scrollDistance, scrollDistance))
      return
    }

    if (this.articleScrollMode === 'line') {
      const activeTop = this.getElementTop(el, active)
      const lineHeight = this.getLineHeightPx(active)
      const targetTop = activeTop - (clientHeight / 2 - lineHeight / 2)
      this.requestScrollTop(el, targetTop, 'smooth')
      return
    }

    if (this.articleScrollMode === 'char') {
      const activeTop = this.getElementTop(el, active)
      const lineHeight = this.getLineHeightPx(active)
      const charsPerLine = this.getCharsPerLine(el, active, lineHeight)
      const charIndex = this.getCharIndexInLine(this.input.length, charsPerLine)
      const fallbackFraction = charIndex / charsPerLine
      const offsetLeft = this.getOffsetLeftWithinContainer(el, active)
      const maxLeft = Math.max(1, el.clientWidth - active.offsetWidth)
      const offsetFraction = offsetLeft === null ? null : Math.max(0, Math.min(1, offsetLeft / maxLeft))
      const fraction = offsetFraction ?? fallbackFraction

      const targetTop = activeTop - (clientHeight / 2 - lineHeight / 2) + fraction * lineHeight
      this.requestScrollTop(el, targetTop)
      return
    }

    const activeTop = this.getElementTop(el, active)
    const suffixOffset = this.hint ? 2 : 1
    const baseOffset = (parseFloat(this.fontSize) + suffixOffset) * 12
    const fixed = this.hint
      ? Math.max(0, baseOffset * (this.articleRows - 1) - 0.5 * baseOffset)
      : baseOffset * (this.articleRows - 1)
    this.requestScrollTop(el, Math.max(0, activeTop - fixed))
  }

  private getActiveElement (container: HTMLElement): HTMLElement | null {
    const caret = this.input.length
    const exact = container.querySelector(`[data-word-id="${caret}"]`) as HTMLElement | null
    if (exact) {
      return exact
    }

    const blocks = Array.from(container.querySelectorAll('[data-word-id][data-word-len]')) as HTMLElement[]
    let best: HTMLElement | null = null
    let bestStart = -1
    for (const el of blocks) {
      const start = Number(el.dataset.wordId)
      const len = Number(el.dataset.wordLen)
      if (!Number.isFinite(start) || !Number.isFinite(len) || len <= 0) {
        continue
      }
      if (start <= caret && caret < start + len && start > bestStart) {
        best = el
        bestStart = start
      }
    }
    if (best) {
      return best
    }

    return container.querySelector('.pending,.code1,.code2,.code3,.code4') as HTMLElement | null
  }

  private getElementTop (container: HTMLElement, target: HTMLElement): number {
    // Prefer stable layout coordinates to avoid 1px jitter from getBoundingClientRect rounding
    // when container scrollTop changes frequently (autoScroll).
    const offsetTop = this.getOffsetTopWithinContainer(container, target)
    if (offsetTop !== null) {
      return offsetTop
    }

    return this.getElementTopByRect(container, target)
  }

  private getElementTopByRect (container: HTMLElement, target: HTMLElement): number {
    const containerRect = container.getBoundingClientRect()
    const rects = target.getClientRects()
    const targetRect = rects.length > 0 ? rects[0] : target.getBoundingClientRect()
    return targetRect.top - containerRect.top + container.scrollTop
  }

  private getOffsetTopWithinContainer (container: HTMLElement, target: HTMLElement): number | null {
    // offsetTop is stable, but requires walking offsetParent chain.
    let el: HTMLElement | null = target
    let top = 0
    while (el && el !== container) {
      top += el.offsetTop
      el = el.offsetParent as HTMLElement | null
    }
    return el === container ? top : null
  }

  private getOffsetLeftWithinContainer (container: HTMLElement, target: HTMLElement): number | null {
    let el: HTMLElement | null = target
    let left = 0
    while (el && el !== container) {
      left += el.offsetLeft
      el = el.offsetParent as HTMLElement | null
    }
    return el === container ? left : null
  }

  private getLineHeightPx (el: HTMLElement): number {
    const style = getComputedStyle(el)
    const lineHeight = parseFloat(style.lineHeight || '')
    if (Number.isFinite(lineHeight) && lineHeight > 0) {
      return lineHeight
    }

    const rects = el.getClientRects()
    if (rects.length > 0) {
      return Math.max(1, rects[0].height)
    }

    const fontSize = parseFloat(style.fontSize || '')
    if (Number.isFinite(fontSize) && fontSize > 0) {
      return Math.max(1, fontSize * 1.2)
    }

    return 1
  }

  private getCharsPerLine (container: HTMLElement, sampleEl: HTMLElement, lineHeightPx: number): number {
    const style = getComputedStyle(sampleEl)
    const containerStyle = getComputedStyle(container)
    const width = container.clientWidth
    const font = style.font || `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`
    const letterSpacing = style.letterSpacing || 'normal'
    const columnGap = containerStyle.columnGap || '0px'
    const gapPx = Number.isFinite(parseFloat(columnGap)) ? parseFloat(columnGap) : 0
    const paddingLeftPx = Number.isFinite(parseFloat(style.paddingLeft)) ? parseFloat(style.paddingLeft) : 0
    const paddingRightPx = Number.isFinite(parseFloat(style.paddingRight)) ? parseFloat(style.paddingRight) : 0
    const paddingX = Math.max(0, paddingLeftPx) + Math.max(0, paddingRightPx)
    const key = `${width}|${font}|${letterSpacing}|${gapPx}|${paddingX}`

    if (key === this.measureCacheKey && this.cachedCharsPerLine > 0) {
      return this.cachedCharsPerLine
    }

    const probe = document.createElement('span')
    probe.textContent = '中'.repeat(100)
    probe.style.position = 'fixed'
    probe.style.left = '-9999px'
    probe.style.top = '-9999px'
    probe.style.whiteSpace = 'pre'
    probe.style.font = font
    probe.style.letterSpacing = letterSpacing
    probe.style.lineHeight = `${lineHeightPx}px`
    document.body.appendChild(probe)
    const probeWidth = probe.getBoundingClientRect().width
    document.body.removeChild(probe)

    const charAdvance = probeWidth / 100
    const perChar = Math.max(1, charAdvance + Math.max(0, gapPx) + paddingX)
    const available = width + Math.max(0, gapPx) - 1
    const charsPerLine = Math.max(1, Math.floor(available / perChar))

    this.measureCacheKey = key
    this.cachedCharsPerLine = charsPerLine
    return charsPerLine
  }

  private getCharIndexInLine (typedLength: number, charsPerLine: number): number {
    if (charsPerLine <= 1) {
      return 0
    }

    const safeTypedLength = Math.max(0, Math.min(typedLength, this.content.length))
    const prefix = this.content.slice(0, safeTypedLength)
    const lastBreak = Math.max(prefix.lastIndexOf('\n'), prefix.lastIndexOf('\r'))
    const sinceBreak = lastBreak >= 0 ? prefix.length - lastBreak - 1 : prefix.length
    return sinceBreak % charsPerLine
  }

  private requestScrollTop (container: HTMLElement, top: number, behavior: 'instant' | 'smooth' = 'instant') {
    const scrollDistance = container.scrollHeight - container.clientHeight
    const clamped = Math.max(0, Math.min(top, scrollDistance))
    const desired = Math.round(clamped)

    if (Math.abs(container.scrollTop - desired) < 0.5) {
      return
    }

    if (behavior === 'smooth' && typeof container.scrollTo === 'function') {
      const reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches
      if (!reducedMotion) {
        container.scrollTo({ top: desired, behavior: 'smooth' })
        return
      }
    }

    this.nextScrollTop = desired
    if (this.scrollRafId) {
      return
    }

    this.scrollRafId = requestAnimationFrame(() => {
      this.scrollRafId = 0
      if (this.nextScrollTop === null) {
        return
      }
      container.scrollTop = this.nextScrollTop
      this.nextScrollTop = null
    })
  }

  beforeDestroy () {
    if (this.scrollRafId) {
      cancelAnimationFrame(this.scrollRafId)
      this.scrollRafId = 0
    }
  }

  check (index: number, input: string, target: string, words: Array<Word>): void {
    const length = target.length
    const targetWords = target.split('')
    const inputWords = input.split('')
    let lastCorrect = targetWords[0] === inputWords[0]
    let text = ''

    inputWords.forEach((v, i) => {
      if (i >= length) {
        return
      }

      const target = targetWords[i]
      const correct = v === target

      if (correct !== lastCorrect) {
        words.push(new Word(index + i - text.length, text, lastCorrect ? 'correct' : 'error'))
        text = ''
        lastCorrect = correct
      }
      text = text.concat(target)
    })

    if (text.length > 0) {
      words.push(new Word(index + input.length - text.length, text, lastCorrect ? 'correct' : 'error'))
    }
  }

  addPhrase (content: string, edge: Edge<Word>, words: Array<Word>): number {
    const { from, to, value } = edge

    if (content.length <= to) {
      // 输入长度小于当前词首，未打
      words.push(value)
      return 0
    } else {
      // 输入长度大于当前词尾，已打, 否则部分已打
      const length = content.length
      const source = content.substring(to, Math.min(from, length))
      this.check(to, source, value.text, words)
      return length > from ? 0 : length
    }
  }
}
</script>

<style lang="scss">
  #article-main {
    word-break: break-all;
  }
</style>
