<template>
  <div id="article-main">
    <el-row ref="board" :class="articleStyle">
      <Words v-for="word in words" :key="word.id" :word="word"/>
    </el-row>
    <el-divider class="article-info" content-position="right">
      <span>第{{ identity }}段</span>
      <span>{{ title || '未知' }}</span>
      <span>共{{ length }}字</span>
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

  get selectHint (): boolean {
    return this.hintOptions.indexOf('select') >= 0
  }

  get codeHint (): boolean {
    return this.hintOptions.indexOf('code') >= 0
  }

  get autoSelectHint (): boolean {
    return this.hintOptions.indexOf('autoSelect') >= 0
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

    const activeTop = this.getElementTop(el, active)

    if (this.articleScrollMode === 'line') {
      const lineHeight = this.getLineHeightPx(active)
      const targetTop = activeTop - (clientHeight / 2 - lineHeight / 2)
      this.requestScrollTop(el, targetTop, 'smooth')
      return
    }

    if (this.articleScrollMode === 'char') {
      const lineHeight = this.getLineHeightPx(active)
      const charsPerLine = this.getCharsPerLine(el, active, lineHeight)
      const charIndex = this.getCharIndexInLine(this.input.length, charsPerLine)
      const fraction = charIndex / charsPerLine

      const targetTop = activeTop - (clientHeight / 2 - lineHeight / 2) + fraction * lineHeight
      this.requestScrollTop(el, targetTop)
      return
    }

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
    const containerRect = container.getBoundingClientRect()
    const targetRect = target.getBoundingClientRect()
    return targetRect.top - containerRect.top + container.scrollTop
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
    const width = container.clientWidth
    const font = style.font || `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`
    const letterSpacing = style.letterSpacing || 'normal'
    const key = `${width}|${font}|${letterSpacing}`

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
    const charsPerLine = Math.max(1, Math.floor((width - 1) / Math.max(1, charAdvance)))

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

    if (behavior === 'smooth' && typeof container.scrollTo === 'function') {
      const reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches
      if (!reducedMotion) {
        container.scrollTo({ top: clamped, behavior: 'smooth' })
        return
      }
    }

    this.nextScrollTop = clamped
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
