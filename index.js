'use strict'

const axios = require('axios')
const KOCReturn = require('koc-common-return')
const KOCString = require('koc-common-string')

let axiosInstance = null
let cacheRedis = null

const Axios = module.exports = {
  Init: (config, redis) => {
    axiosInstance = axios.create(config)
    cacheRedis = redis
    return Axios
  },
  /**
   * @description request
   * @param config
   * @param key
   * @param code
   * @param cache 缓存
   * @param cache.name 缓存名称
   * @param cache.value 缓存内容
   * @param [cache.expire] 缓存内容
   * @returns {Promise<*|ReturnValue>}
   * @constructor
   */
  Request: async (config, key, code, cache) => {
    let retValue = KOCReturn.Value()
    // region 读取缓存
    if (cache) {
      retValue = await KOCReturn.Promise(() => cacheRedis.get(Axios.CacheKey(cache.name, cache.value)))
      if (!retValue.hasError && retValue.returnObject) {
        try {
          retValue.returnObject = JSON.parse(retValue.returnObject)
          return retValue
        } catch {}
      }
    }
    // endregion
    retValue = await KOCReturn.Promise(() => axiosInstance.request(config))
    if (retValue.hasError || !retValue.returnObject) return retValue
    retValue.returnObject = retValue.returnObject.data
    // region 写入缓存
    if (key !== undefined && code !== undefined && cache) {
      if (retValue.returnObject[key] === code) {
        cacheRedis.set(Axios.CacheKey(cache.name, cache.value), JSON.stringify(retValue.returnObject), 'EX', Axios.CacheExpire(cache.expire))
      }
    }
    // endregion
    return retValue
  },
  /**
   * @description 缓存key
   * @param {string} name 缓存名称
   * @param {Object} value 缓存内容
   * @returns {string}
   */
  CacheKey: (name, value) => KOCString.MD5(KOCString.ToString(name) + JSON.stringify(value)),
  /**
   * @description 过期时间
   * @param {number} [expire] 分钟
   * @returns {number}
   */
  CacheExpire: (expire) => KOCString.ToIntPositive(expire, 10) * 60
}
