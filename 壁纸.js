import plugin from '../../lib/plugins/plugin.js'
import { segment } from "oicq";
import moment from "moment";


let cd = 20
let botsender = false
let limit = 10
export class wallpaper extends plugin {
  constructor() {
    super({
      name: "wallpaper",
      dsc: "二次元壁纸合并转发",
      event: "message",
      priority: 4999,
      rule: [
        {
          reg: "^(卧槽|woc)$",
          fnc: "wallpaper",
        },
        {
          reg: "^来(.*)(张|个)(((涩|色)*图)|(壁纸)|(老婆))$",
          fnc: "wallpaper",
        },
      ],
    });
  }


  async wallpaper(e) {
    // cd
    let currentTime = moment(new Date()).format('YYYY-MM-DD HH:mm:ss')
    let lastTime = await redis.get(`Yz:wc:${this.e.group_id}`);
    if (lastTime) {
      let seconds = moment(currentTime).diff(moment(lastTime), 'seconds')
      this.e.reply(`cd中，请等待${cd - seconds}秒后再使用`)
      return true
    }
    await redis.set(`Yz:wc:${this.e.group_id}`, currentTime, {
      EX: cd
    })

    let dic = { "一": 1, "二": 2, "两": 2, "三": 3, "四": 4, "五": 5, "六": 6, "七": 7, "八": 8, "九": 9, "十": 10, "几": 0 }
    let num = e.msg.replace(/来|张|个|(色|涩)*图|(壁纸)|(老婆)/g, "")
    console.log(num)

    // 如果num不是纯数字
    if (!(!isNaN(parseFloat(num)) && isFinite(num))) {
      if (num.length < 2)
        num = dic[num]
      else
        num = 11
    }
    // 0表示随机3~10张
    if (num == 0)
      num = Math.floor((Math.random() * 8) + 3)

    // 一张的话就直接发出去
    if (!num || num == 1) {
      e.reply([segment.image("https://iw233.cn/api.php?sort=iw233")])
      return true
    }

    if (e.msg.includes("卧槽") | e.msg.includes("woc")) {
      this.e.reply("触发探索未知的神秘空间，请稍等...");
      num = 10
    } else {
      this.e.reply(`${num > 10 ? "色批，一次最多十张！" : ""}探索中，请稍等`)
    }
    if (num > 10) num = 10
    console.log(num)
    let msgList = []
    const forwarder =
      botsender
        ? { nickname: Bot.nickname, user_id: Bot.uin }
        : {
          nickname: this.e.sender.card || this.e.user_id,
          user_id: this.e.user_id,
        };

    for (let i = 0; i < num; i++) {
      msgList.push({
        // message: segment.image("https://dev.iw233.cn/api.php?sort=random")
        message: segment.image("https://iw233.cn/api.php?sort=iw233"),
        ...forwarder,
      });
      // await common.sleep(300)
    }

    let res;
    if (e.isGroup)
      res = await e.reply(await e.group.makeForwardMsg(msgList))
    else
      res = await e.reply(await e.friend.makeForwardMsg(msgList))
    console.log("res:", res);

    if (!res) {
      e.reply("别等了，你想要的已经被来自mht的神秘力量吞噬了")
    }
    return true
  }
}
