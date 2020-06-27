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
  Request: async (config, key, code, cache) => {
    let retValue = KOCReturn.Value()
    // region 读取缓存
    if (cache) {
      retValue = await KOCReturn.Promise(() => cacheRedis.get(Axios.CacheKey(cache)))
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
    if (key !== undefined && code !== undefined) {
      if (retValue.returnObject[key] === code) {
        cacheRedis.set(Axios.CacheKey(cache), JSON.stringify(retValue.returnObject), 'EX', Axios.CacheExpire())
      }
    }
    return retValue
  },
  /**
   * @description 缓存key
   * @param {Object} value 缓存内容
   * @returns {string}
   */
  CacheKey: (value) => KOCString.MD5(JSON.stringify(value)),
  /**
   * @description 过期时间
   * @param {number} [expire] 分钟
   * @returns {number}
   */
  CacheExpire: (expire) => KOCString.ToIntPositive(expire, 120) * 60
}
