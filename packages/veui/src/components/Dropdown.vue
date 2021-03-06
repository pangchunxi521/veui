<template>
<div
  ref="main"
  :ui="realUi"
  :class="{
    [$c('dropdown')]: true,
    [$c('dropdown-expanded')]: expanded,
    [$c('dropdown-split')]: split
  }"
>
  <veui-button
    v-if="split"
    ref="command"
    :class="$c('dropdown-command')"
    :disabled="disabled"
    @click="$emit('click')"
  >
    <span :class="$c('dropdown-label')">
      <slot
        name="label"
        :label="label"
      >{{ label }}</slot>
    </span>
  </veui-button>
  <veui-button
    ref="button"
    :class="$c('dropdown-button')"
    :disabled="disabled"
    aria-haspopup="menu"
    :aria-disabled="disabled"
    :aria-owns="dropdownId"
    v-on="toggleHandlers"
    @keydown.down.up.enter.space.prevent="handleTriggerKeydown"
  >
    <span
      v-if="!split"
      :class="$c('dropdown-label')"
    >
      <slot
        name="label"
        :label="label"
      >{{ label }}</slot>
    </span>
    <veui-icon
      :class="$c('dropdown-icon')"
      :name="icons[expanded ? 'collapse' : 'expand']"
    />
  </veui-button>
  <veui-overlay
    target="main"
    :open="expanded"
    autofocus
    modal
    match-width
    :options="realOverlayOptions"
    :overlay-class="mergeOverlayClass($c('dropdown-box'))"
    :priority="overlayPriority"
  >
    <div
      :id="dropdownId"
      ref="box"
      v-outside="{
        refs: outsideRefs,
        handler: close,
        trigger,
        delay: 300
      }"
      :class="$c('dropdown-options')"
      :ui="realUi"
      role="menu"
      :tabindex="searchable ? -1 : 0"
      :aria-expanded="expanded"
      @keydown="handleKeydown"
      @focus="focusAt(0)"
    >
      <veui-search-box
        v-if="searchable"
        v-model="keyword"
        :class="$c('dropdown-search-box')"
        :ui="uiParts.search"
        :placeholder="placeholder"
        clearable
      />
      <div
        v-if="isSearching && !filteredSuggestions.length"
        :class="$c('dropdown-options-no-data')"
      >
        <slot
          name="no-data"
          v-bind="{ keyword }"
        >{{ t('noData') }}</slot>
      </div>
      <veui-option-group
        v-else
        ref="options"
        :options="isSearching ? filteredSuggestions : options"
        :trigger="trigger"
        :overlay-class="overlayClass"
      >
        <slot/>
        <template
          v-if="$scopedSlots['group-label']"
          slot="label"
          slot-scope="group"
        >
          <slot
            name="group-label"
            v-bind="group"
          />
        </template>
        <template
          v-if="$scopedSlots.option"
          slot="option"
          slot-scope="option"
        >
          <slot
            name="option"
            v-bind="option"
          />
        </template>
        <template
          slot="option-label"
          slot-scope="option"
        >
          <slot
            name="option-label"
            v-bind="option"
          >
            <template v-if="!!searchable && keyword">
              <template v-for="({ parts }, idx) in option.matches">
                <template v-for="({ text, matched }, index) in parts">
                  <mark
                    v-if="matched"
                    :key="`${idx}-${index}`"
                    :class="$c('option-matched')"
                  >{{ text }}</mark>
                  <span
                    v-else
                    :key="`${idx}-${index}`"
                  >{{ text }}</span>
                </template>
                <span
                  v-if="idx < option.matches.length - 1"
                  :key="idx"
                  :class="$c('option-separator')"
                >&gt;</span>
              </template>
            </template>
          </slot>
        </template>
      </veui-option-group>
    </div>
  </veui-overlay>
</div>
</template>

<script>
import Icon from './Icon'
import Button from './Button'
import Overlay from './Overlay'
import SearchBox from './SearchBox'
import OptionGroup from './Select/OptionGroup'
import prefix from '../mixins/prefix'
import ui from '../mixins/ui'
import dropdown from '../mixins/dropdown'
import { createKeySelect } from '../mixins/key-select'
import focusable from '../mixins/focusable'
import searchable from '../mixins/searchable'
import i18n from '../mixins/i18n'
import '../common/uiTypes'
import { includes } from 'lodash'

const EVENT_MAP = {
  hover: 'mouseenter',
  click: 'click'
}

const MODE_MAP = {
  hover: 'expand',
  click: 'toggle'
}

export default {
  name: 'veui-dropdown',
  uiTypes: ['select'],
  components: {
    'veui-icon': Icon,
    'veui-button': Button,
    'veui-overlay': Overlay,
    'veui-search-box': SearchBox,
    'veui-option-group': OptionGroup
  },
  mixins: [
    prefix,
    ui,
    dropdown,
    createKeySelect({
      useNativeFocus (vm) {
        return !vm.searchable
      },
      handlers: {
        tab () {
          if (this.searchable) {
            this.close()
          }
        },
        enter () {
          if (this.searchable) {
            let elem = this.getCurrentActiveElement()
            if (elem) {
              elem.click()
            }
          }
        }
      }
    }),
    searchable({
      datasourceKey: 'options',
      childrenKey: 'options',
      keywordKey: 'keyword',
      resultKey: 'filteredSuggestions'
    }),
    focusable,
    i18n
  ],
  props: {
    label: String,
    disabled: Boolean,
    options: Array,
    trigger: {
      type: String,
      default: 'click',
      validator (val) {
        return includes(['hover', 'click'], val)
      }
    },
    split: Boolean,
    searchable: Boolean,
    placeholder: SearchBox.props.placeholder,
    memoize: Boolean
  },
  data () {
    return {
      outsideRefs: ['button'],
      keyword: ''
    }
  },
  computed: {
    toggleHandlers () {
      return {
        [EVENT_MAP[this.trigger]]: this.handleToggle
      }
    },
    isSearching () {
      return this.searchable && this.keyword
    }
  },
  methods: {
    handleTriggerKeydown (e) {
      this.expanded = true
    },
    handleToggle () {
      let mode = MODE_MAP[this.trigger]
      if (mode === 'toggle') {
        this.expanded = !this.expanded
      } else if (mode === 'expand') {
        this.expanded = true
      }
      if (this.expanded) {
        this.keyword = ''
      }
    },
    handleSelect (value) {
      this.expanded = false
      if (value != null) {
        this.$emit('click', value)
      }
    },
    focus () {
      let { command, button } = this.$refs
      ;(command || button).focus()
    },
    getFocusableContainer () {
      return this.$refs.options.$el
    }
  }
}
</script>
