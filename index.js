'use strict'

const axios = require('axios')
const KOCReturn = require('koc-common-return/index')
const KOCString = require('koc-common-string')

class KOCRequest {
  #cacheRedis

  constructor (config, redis) {
    this.axiosInstance = axios.create(config)
    this.#cacheRedis = redis
  }

  /**
   * 初始化实例对象
   * @param config
   * @param [redis]
   * @return {*}
   */
  static Init (config, redis) {
    return new KOCRequest(config, redis)
  }

  /**
   * @desc Request
   * @param config
   * @param [key] 响应数据成功参数字段名
   * @param [code] 响应数据成功参数值
   * @param [cache] 缓存
   * @param [cache.name] 缓存名称
   * @param [cache.value] 缓存内容
   * @param [cache.expire] 缓存内容
   * @param [cacheRemove] 删除缓存
   * @returns {Promise}
   */
  async Request (config, key, code, cache, cacheRemove) {
    cacheRemove = KOCString.ToArray(cacheRemove)
    let retValue = KOCReturn.Value()
    // region 删除缓存
    for (const thisValue of cacheRemove) {
      this.ClearCache(thisValue.name, thisValue.value)
    }
    // endregion
    // region 读取缓存
    if (this.#cacheRedis && cache) {
      retValue = await KOCReturn.Promise(() => this.#cacheRedis.get(CacheKey(cache.name, cache.value)))
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
    if (this.#cacheRedis && key !== undefined && code !== undefined && cache) {
      if (retValue.returnObject[key] === code) {
        this.#cacheRedis.set(CacheKey(cache.name, cache.value), JSON.stringify(retValue.returnObject), 'EX', CacheExpire(cache.expire))
      }
    }
    // endregion
    return retValue
  }

  /**
   * 清除缓存
   * @param {string} name 缓存名称
   * @param {Object} value 缓存内容
   */
  ClearCache (name, value) {
    if (this.#cacheRedis) this.#cacheRedis.del(CacheKey(name, value))
  }
}

/**
 * 缓存key
 * @param {string} name 缓存名称
 * @param {Object} value 缓存内容
 * @returns {string}
 */
const CacheKey = (name, value) => KOCString.MD5(KOCString.ToString(name) + JSON.stringify(value))
/**
 * 过期时间
 * @param {number} [expire] 分钟
 * @returns {number}
 */
const CacheExpire = (expire) => KOCString.ToIntPositive(expire, 10) * 60

module.exports = KOCRequest
