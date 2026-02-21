<template>
  <component
    :is="mode === 'inline' ? 'span' : 'div'"
    :class="mode === 'inline' ? 'word-fragment' : style"
    :data-word-id="mode === 'grid' ? word.id : undefined"
    :data-word-len="mode === 'grid' ? word.text.length : undefined"
  >
    <template v-if="mode === 'inline'">
      <span
        v-for="(ch, i) in chars"
        :key="word.id + i"
        :class="style"
        :data-word-id="word.id + i"
        data-word-len="1"
      >{{ ch }}</span>
    </template>
    <template v-else>
      <span>{{ word.text }}</span>
      <label v-if="hasHint">{{ hintText }}</label>
    </template>
  </component>
</template>

<script lang="ts">
import { Word } from '@/store/types'
import { Component, Prop, Vue } from 'vue-property-decorator'
import { namespace } from 'vuex-class'

const setting = namespace('setting')

@Component
export default class Words extends Vue {
  @Prop({ type: Word, required: true })
  readonly word!: Word

  @Prop({ type: String, default: 'grid' })
  readonly mode!: 'inline' | 'grid'

  @setting.State('hint')
  private hint!: boolean

  @setting.State('punctuationAutoSelectHint')
  private punctuationAutoSelectHint!: string

  @setting.State('hintOptions')
  private hintOptions!: Array<string>

  @setting.State('disableSingleHint')
  private disableSingleHint!: boolean

  get single (): boolean {
    const word = this.word
    const length = word.text.length
    return !this.disableSingleHint || length > (word.autoSelect ? 2 : 1)
  }

  get hasColorHint (): boolean {
    return (this.hintOptions.indexOf('color') >= 0 && this.single) || !this.word.type.startsWith('code')
  }

  get hasSelectHint (): boolean {
    return this.hintOptions.indexOf('select') >= 0 && !!this.word.select && this.single
  }

  get hasCodeHint (): boolean {
    const { codings } = this.word
    return this.hintOptions.indexOf('code') >= 0 && codings && codings.length > 0 && !!codings[0].code && this.single
  }

  get hasAutoSelectHint (): boolean {
    return this.hintOptions.indexOf('autoSelect') >= 0 && this.word.autoSelect && this.single
  }

  get style (): Array<string> {
    const styles = ['code']

    if (this.hasColorHint) {
      styles.push(this.word.type)
    } else {
      styles.push('pending')
    }

    return styles
  }

  get chars (): Array<string> {
    return this.word.text.split('')
  }

  get hasHint (): boolean {
    return this.hint && (this.hasCodeHint || this.hasSelectHint || this.hasAutoSelectHint)
  }

  get hintText (): string {
    let text = ''
    const { select, codings } = this.word
    if (this.hasCodeHint) {
      text += codings[0].code
    }
    if (this.hasSelectHint) {
      text += select
    }
    if (this.hasAutoSelectHint) {
      text += this.punctuationAutoSelectHint
    }
    return text
  }
}
</script>
