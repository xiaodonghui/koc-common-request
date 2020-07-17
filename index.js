'use strict'

const axios = require('axios')
const KOCReturn = require('koc-common-return')
const KOCString = require('koc-common-string')

class KOCRequest {
  constructor (config, redis) {
    this.axiosInstance = axios.create(config)
    this.cacheRedis = redis
  }

  /**
   * @description Request
   * @param config
   * @param key
   * @param code
   * @param [cache] 缓存
   * @param cache.name 缓存名称
   * @param cache.value 缓存内容
   * @param [cache.expire] 缓存内容
   * @param {Array} [cacheRemove] 删除缓存
   * @returns {Promise<*|ReturnValue>}
   * @constructor
   */
  async Request (config, key, code, cache, cacheRemove = []) {
    let retValue = KOCReturn.Value()
    // region 读取缓存
    if (cache) {
      retValue = await KOCReturn.Promise(() => this.cacheRedis.get(this.CacheKey(cache.name, cache.value)))
      if (!retValue.hasError && retValue.returnObject) {
        try {
          retValue.returnObject = JSON.parse(retValue.returnObject)
          return retValue
        } catch {}
      }
    }
    // endregion
    retValue = await KOCReturn.Promise(() => this.axiosInstance.request(config))
    if (retValue.hasError || !retValue.returnObject) return retValue
    retValue.returnObject = retValue.returnObject.data
    // region 写入缓存
    if (key !== undefined && code !== undefined && cache) {
      if (retValue.returnObject[key] === code) {
        this.cacheRedis.set(this.CacheKey(cache.name, cache.value), JSON.stringify(retValue.returnObject), 'EX', this.CacheExpire(cache.expire))
      }
    }
    // endregion
    // region 删除缓存
    for (const thisValue of cacheRemove) {
      this.cacheRedis.del(this.CacheKey(thisValue.name, thisValue.value))
    }
    // endregion
    return retValue
  }

  /**
   * @description 缓存key
   * @param {string} name 缓存名称
   * @param {Object} value 缓存内容
   * @returns {string}
   */
  CacheKey (name, value) {
    return KOCString.MD5(KOCString.ToString(name) + JSON.stringify(value))
  }

  /**
   * @description 过期时间
   * @param {number} [expire] 分钟
   * @returns {number}
   */
  CacheExpire (expire) {
    return KOCString.ToIntPositive(expire, 10) * 60
  }
}

module.exports = KOCRequest
