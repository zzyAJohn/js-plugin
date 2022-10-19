import plugin from '../../lib/plugins/plugin.js'
import { segment } from "oicq";
import moment from "moment";
import fetch from 'node-fetch'
let videolist_ = [];

let wocpluscd_ = 20     //触发cd 单位是秒
let wocRefreshTimer = 1
let usedvideo = []  //保存最近几次使用的视频，以避免短时间内出现重复视频（line 61）
export class wocplus_ extends plugin {
  constructor() {
    super({
      name: "wocplus_",
      dsc: "神秘指令",
      event: "message",
      priority: 4999,
      rule: [
        {
          reg: "^(wocplus|卧槽plus|秀付)$",
          fnc: "wocplus_",
        }
      ],
    });
  }

  // main======================
  async wocplus_(e) {
    // cd
    let currentTime = moment(new Date()).format('YYYY-MM-DD HH:mm:ss')
    let lastTime = await redis.get(`Yz:wcplus_:${this.e.group_id}`);
    if (lastTime) {
      let seconds = moment(currentTime).diff(moment(lastTime), 'seconds')
      this.e.reply(`cd中，请等待${wocpluscd_ - seconds}秒后再使用`)
      return true
    }
    await redis.set(`Yz:wcplus_:${this.e.group_id}`, currentTime, {
      EX: wocpluscd_
    })

    if (!videolist_ || videolist_.length == 0 || wocRefreshTimer) {
      console.log("初始化videolist,存入全局变量")
      try {
        let res = await fetch("https://gitee.com/yhArcadia/woc/raw/master/wocplus.json")
        videolist_ = await res.json()
      } catch (error) {
        e.reply(error)
        return true
      }
      wocRefreshTimer = 0
      setTimeout(() => {
        wocRefreshTimer = 1
      }, 15 * 60 * 1000);  //计时15分钟，定时从仓库获取视频列表
    }

    // 生成随机数，发送视频
    let num = Number
    do {
      num = Math.round(Math.random() * (videolist_.length - 1))
    } while (usedvideo.includes(num))
    usedvideo.push(num)
    if (usedvideo.length > 15)
      usedvideo = usedvideo.slice(1)
    console.log(videolist_.length)
    console.log("usedvideo:", usedvideo)
    e.reply(videolist_[num])
    return true
  }
}
