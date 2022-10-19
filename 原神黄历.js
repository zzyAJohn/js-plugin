//by 癫癫博士
//仓库地址：https://gitee.com/huangshx2001/yunzai-js-plug-in
//欢迎访问仓库评论和留个star！
//遇到了问题和bug也可以来仓库反馈

import plugin from '../../lib/plugins/plugin.js'
import fetch from 'node-fetch'
import{segment}from'oicq'


export class example extends plugin {
  constructor () {
    super({
      /** 功能名称 */
      name: '原神黄历',
      /** 功能描述 */
      dsc: '简单开发示例',
      /** https://oicqjs.github.io/oicq/#events */
      event: 'message',
      /** 优先级，数字越小等级越高 */
      priority: 5000,
      rule: [
        {
          /** 命令正则匹配 */
          reg: '^黄历',
          /** 执行方法 */
          fnc: 'yshl'
        }
      ]
    })
  }

  async yshl (e) {
    /** e.msg 用户的命令消息 */
    logger.info('[用户命令]', e.msg)

    /** 一言接口地址 */
    let url = 'https://api.xingzhige.com/API/yshl/'
    /** 调用接口获取数据 */
    let res = await fetch(url).catch((err) => logger.error(err))
    /** 最后回复消息 */
    await this.reply([
      segment.at(this.e.user_id),
      // segment.image(),
      segment.image(url)
    ])
  }
}
