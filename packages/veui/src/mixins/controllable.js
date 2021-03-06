import { capitalize, isString, isPlainObject, reduce } from 'lodash'

let options = {
  methods: {
    isControlled (name) {
      // 排除 default value 的影响
      return name in this.$options.propsData && this[name] !== undefined
    },
    getReal ({ prop, local } = {}) {
      return this.isControlled(prop)
        ? this[prop]
        : local
          ? this[local]
          : this[`local${capitalize(prop)}`]
    },
    setReal (value, { prop, local, event } = {}) {
      // TODO forceUpdate
      // null 则认为忽略对应的操作
      if (local !== null) {
        local = local || `local${capitalize(prop)}`
        this[local] = value
      }
      if (event !== null) {
        event = event || `update:${prop}`
        this.$emit(event, value)
      }
    }
  }
}

const errorMsg =
  '[controllable] prop config must be either a string, an object or an object array.'

/**
 * 自动将对应的 prop 转换成受控的
 * @param {string|Object|[string|Object]} props - 定义的受控props
 * @return 转换后的 mixin
 */
export default function makeControllable (props) {
  if (!props) {
    // expose default methods
    return options
  }

  if (isString(props)) {
    props = [
      {
        prop: props
      }
    ]
  } else if (isPlainObject(props)) {
    props = [props]
  }
  if (!Array.isArray(props)) {
    throw new Error(errorMsg)
  }

  let result = props.reduce(
    (result, def) => {
      if (isString(def)) {
        def = { prop: def }
      } else if (!isPlainObject(def)) {
        console.error(errorMsg)
        return result
      } else if (!def.prop) {
        console.error(
          '[controllable] the `prop` property is required when prop config item is an object.'
        )
        return result
      }

      // { prop, local, computed, event, get, set }
      let { prop, local, computed, get, set } = def
      if (local !== null) {
        result.data[local || `local${capitalize(prop)}`] = vm => vm[prop]
      }
      let name = computed || `real${capitalize(prop)}`
      let hasGet = get !== false
      result.computed[name] = {
        get () {
          if (hasGet) {
            return get ? get.call(this, def) : this.getReal(def)
          }
        },
        set (value) {
          if (set !== false && ((hasGet && value !== this[name]) || !hasGet)) {
            return set ? set.call(this, value, def) : this.setReal(value, def)
          }
        }
      }

      return result
    },
    { computed: {}, data: {} }
  )
  return {
    ...options,
    computed: result.computed,
    data () {
      return reduce(
        result.data,
        (res, fn, key) => {
          res[key] = fn(this)
          return res
        },
        {}
      )
    }
  }
}
