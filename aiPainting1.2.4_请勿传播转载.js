// 插件目前仅在小范围点对点共享，禁止传播
// 云崽插件库：https://gitee.com/yhArcadia/Yunzai-Bot-plugins-index （gitee）   https://github.com/yhArcadia/Yunzai-Bot-plugins-index  （github）
// 渔糕就读的幼稚园：134086404

import fetch from "node-fetch";
import common from "../../lib/common/common.js";
import { segment } from "oicq";
import plugin from "../../lib/plugins/plugin.js";
import moment from "moment";
import YAML from "yaml";
// import lodash, { includes } from "lodash"
import fs from "fs";
import os from "os";
import { promisify } from "util";
import { pipeline } from "stream";
import cfg from "../../lib/config/config.js";
import sizeOf from "image-size";
import { createRequire } from "module";
import { count } from "console";
const _path = process.cwd();
const path = _path + "/resources/yuhuo/aiPainting";

// 初始化文件
await initfile();
// 读取设置
let settings = await YAML.parse(
  fs.readFileSync(`${path}/settings.yaml`, "utf8")
);
// 更新文件
await updatefile();
// 读取token （token不要填在这里，填在/resources/yuhuo/aiPainting/settings.yaml里，注意格式）
const token = settings.token;
//  读取百度apikey （key不要填在这里，填在/resources/yuhuo/aiPainting/settings.yaml里，注意格式）
const APP_ID = settings.appid;
const API_KEY = settings.apikey;
const SECRET_KEY = settings.secretkey;
// 读取违禁词列表
let badlist = YAML.parse(fs.readFileSync(`${path}/badWords.yaml`, "utf8"));
// 读取预设词
let preSet = YAML.parse(fs.readFileSync(`${path}/preSet.yaml`, "utf8"));
// 用于标记是否纠正了违禁词
let corrected = {};
// 批量绘图任务进行中的标记
let multiTask = 0;

export class AiPainting extends plugin {
  constructor() {
    super({
      name: "AiPainting",
      dsc: "根据输入的文案AI作画",
      event: "message",
      priority: 100,
      rule: [
        {
          reg: "^绘图([\\s\\S]*)$",
          fnc: "AiPainting",
        },
        {
          // 解除屏蔽某个词
          reg: "^ap放行(.*)$",
          fnc: "unBan",
          permission: "master",
        },
        {
          // 屏蔽某个词
          reg: "^ap屏蔽(.*)$",
          fnc: "Ban",
          // permission: "master",
        },
        {
          reg: "^(ap查水表)|(公示xp)|(展示xp)(.*)$",
          fnc: "FBI",
          // permission: "master",
        },
        {
          // AiPainting本地图片检索
          reg: "^ap本地([\\s\\S]*)$",
          fnc: "local",
          // permission: 'master'
        },
        {
          // AiPainting说明书
          reg: "^ap(说明书|帮助)$",
          fnc: "shuomingshu",
          // permission: 'master'
        },
        {
          reg: "^ap设置(.*)$",
          fnc: "setting",
          // permission: "master",
        },
        {
          // 从本地删除包含指定关键词的图片
          reg: "^ap删除([\\s\\S]*)$",
          fnc: "delLocalPic",
          permission: "master",
        },
        {
          // 添加单个预设
          reg: "^(ap预设)?(.+)(>| ==>\n)(.+)$",
          fnc: "preSet",
          permission: "master",
        },
        {
          // 批量添加预设
          reg: "^ap录入预设$",
          fnc: "batchPreSet",
          permission: "master",
        },
        {
          // 删除某个预设
          reg: "^ap预设删除(.+)$",
          fnc: "delPreSet",
          permission: "master",
        },
        {
          // 查看预设
          reg: "^ap预设列表$",
          fnc: "PreSetList",
          // permission: 'master'
        },
        {
          reg: "^ap封禁(.*)$",
          fnc: "BanUser",
          // permission: "master",
        },
        {
          reg: "^ap解封(.*)$",
          fnc: "unBanUser",
          // permission: "master",
        },
        {
          reg: "^ap刷新接口$",
          fnc: "refreshAPI",
          // permission: "master",
        },
        {
          reg: "^群(.*)发送/(.*)以验证token,你的token:(.{32})$",
          fnc: "listenToken",
          permission: "master",
        },
        {
          reg: "^aptest(.*)$",
          fnc: "test",
          permission: "master",
        },
      ],
    });
  }
  async listenToken(e) {
    if (!e.isMaster) return false;
    if (/以验证token,你的token:(.{32})$/g.test(e.msg)) {
      if (e.isGroup) {
        e.reply([
          "仅支持私聊更新token。\n注意，你将token暴露在了群聊中，不建议继续使用该token。\n请访问http://91.217.139.190:5010/token获取新的token，全选页面内容私聊发送给",
          Bot.nickname,
        ]);
        return true;
      }
      settings.token = /以验证token,你的token:(.{32})$/g.exec(e.msg)[1];
      fs.writeFileSync(
        `${path}/settings.yaml`,
        YAML.stringify(settings),
        "utf8"
      );
      let verify = /群(.*)发送(.*)以验证token,你的token:/g.exec(e.msg);
      console.log(verify);
      e.reply([
        "token更新成功,请将下面这条消息转发至群",
        `${verify[1]}`,
        "中，以激活你的token：",
      ]);
      await common.sleep(800);
      e.reply(verify[2]);
      return true;
    }
    return false;
  }
  async test(e) {
    // let basicInfo = await Bot.pickUser(1761869682).getSimpleInfo()
    // logger.info(basicInfo)
    // logger.info((await Bot.pickUser(1761869682).getSimpleInfo()).nickname)
    logger.warn(settings);
    return true;
  }

  // mian==============================================================
  async AiPainting(e) {
    // 判断功能是否开启
    if (await this.isDisabled(e)) return true;

    // 判断是否禁用用户
    if (settings.isBanUser) {
      if (settings.bandUsers.indexOf(e.user_id) != -1) {
        e.reply(["你的账号因违规使用屏蔽词绘图已被封禁"], true);
        return true;
      }
    }
    // 判断次数限制
    let usageLimit =
      e.isMaster || settings.apMaster.indexOf(e.user_id) > -1
        ? 0
        : settings.usageLimit;
    let usageData = await redis.get(`Yz:AiPainting:Usage:${e.user_id}`);
    logger.info(`【aiPainting】:用户 ${e.user_id} 今日已使用${usageData}次`);
    if (usageData && usageLimit) {
      if (usageData >= usageLimit) {
        e.reply(`你今天已经绘制过${usageData}张图片了，请明天再来~`);
        return true;
      }
    }

    // 判断cd
    if (await this.checkCD(e)) return true;

    // 取消息中的图片、at的头像、回复的图片，放入e.img
    if (e.at && !e.source) {
      e.img = [`https://q1.qlogo.cn/g?b=qq&s=0&nk=${e.at}`];
    }
    if (e.source) {
      let reply;
      if (e.isGroup) {
        reply = (await e.group.getChatHistory(e.source.seq, 1)).pop()?.message;
      } else {
        reply = (await e.friend.getChatHistory(e.source.time, 1)).pop()
          ?.message;
      }
      if (reply) {
        for (let val of reply) {
          if (val.type == "image") {
            e.img = [val.url];
            break;
          }
        }
      }
    }
    // logger.info(e.img ? e.img[0] : "没图哦")
    // 如果有目标图片，就下载到本地
    if (e.img) {
      const response = await fetch(e.img[0]);
      // 没获取到
      if (!response.ok) {
        e.reply(["源图片下载失败，请重试"], true);
        await this.clearCD(e);
        return true;
      }
      const streamPipeline = promisify(pipeline);
      let tempPic = `${path}/pictures/temp/tempPic_${e.user_id}.png`;
      await streamPipeline(response.body, fs.createWriteStream(tempPic));

      // 根据图片比例加入方向参数
      let h = sizeOf(tempPic).height;
      let w = sizeOf(tempPic).width;
      if (w / h < 1.2 && h / w < 1.2) e.msg = e.msg + "方图";
      if (w / h > 1.2) e.msg = e.msg + "横图";
    }

    // 检测和替换文本中的屏蔽词（如果是主人则不检测）
    var msg =
      e.isMaster || settings.apMaster.indexOf(e.user_id) > -1
        ? e.msg
        : await this.check(e.msg);
    // 判断封禁
    if (await this.banCheck(e)) return true;

    // 替换预设词
    for (var key in preSet) {
      if (msg.includes(key)) {
        msg = msg.replace(key, `${preSet[key]},`);
      }
    }

    // 取参数
    let num = /(\d{1,5})张/.exec(e.msg) ? /(\d{1,5})张/.exec(e.msg)[1] : 0;
    if (num > 1 && multiTask) {
      e.reply(`当前已有批量绘图任务进行中，剩余${multiTask}张图，请稍候`, true);
      this.clearCD(e);
      return true;
    }
    // 判断用户今日剩余可用次数是否足够
    let used = await redis.get(`Yz:AiPainting:Usage:${e.user_id}`);
    let remainingTimes = usageLimit - used;
    if (remainingTimes < 0) remainingTimes = 0;
    if (num > remainingTimes && usageLimit) {
      e.reply(
        ["今日剩余可用次数不足，剩余次数：", `${remainingTimes}`, "次"],
        true,
        { recallMsg: 30 }
      );
      this.clearCD(e);
      return true;
    }

    // logger.info(num)
    let shape = /(竖图|(&shape=)?Portrait)/gi.test(e.msg)
      ? "Portrait"
      : /(横图|(&shape=)?Landscape)/gi.test(e.msg)
      ? "Landscape"
      : /(方图|(&shape=)?Square)/gi.test(e.msg)
      ? "Square"
      : "";
    let scale = /(自由度|&?scale=)((\d{1,2})(.(\d{1,5}))?)/gi.exec(e.msg)
      ? /(自由度|&?scale=)((\d{1,2})(.(\d{1,5}))?)/gi.exec(e.msg)[2]
      : "";
    // logger.info(scale)
    let seed = /(种子|&?seed=)(\d{1,10})/gi.exec(e.msg)
      ? /(种子|&?seed=)(\d{1,10})/gi.exec(e.msg)[2]
      : "";
    let strength = /(强度|&?strength=)(0.(\d{1,5}))/gi.exec(e.msg)
      ? /(强度|&?strength=)(0.(\d{1,5}))/gi.exec(e.msg)[2]
      : "";
    // 汇总参数
    let param =
      (shape ? `&shape=${shape}` : "") +
      (scale ? `&scale=${scale}` : "") +
      (seed ? `&seed=${seed}` : "") +
      (strength && e.img ? `&strength=${strength}` : "");
    // logger.info("【aiPainting】参数：", param)
    // 移除命令中的自定义参数
    msg = msg
      .replace("绘图", "")
      .replace(/(\d{1,5})张/g, "")
      .replace(
        /(竖图|横图|方图|(&shape=)?Portrait|(&shape=)?Landscape|(&shape=)?Square)/gi,
        ""
      )
      .replace(/(自由度|&?scale=)((\d{1,2})(.(\d{1,5}))?)/gi, "")
      .replace(/(种子|&?seed=)(\d{1,10})/gi, "")
      .replace(/(强度|&?strength=)(0.(\d{1,5}))/gi, "")
      .trim();
    // ================================\\

    // 翻译文本中的中文
    let regExp = /[\u4e00-\u9fa5]+/;
    let translated = false;
    if (regExp.exec(msg))
      e.reply(["翻译中，口子有点拉跨，可能有点慢……"], false, { recallMsg: 30 });
    // 标记翻译次数，避免死循环翻译
    let translateCount = 0;
    while (regExp.exec(msg) && translateCount < 50) {
      let test = regExp.exec(msg);
      // logger.info(test)
      // let res = await fetch(`https://api.66mz8.com/api/translation.php?info=${encodeURI(test[0])}`).catch((err) => logger.error(err))
      // let res = await fetch(`https://api.vvhan.com/api/fy?text=${encodeURI(test[0])}`).catch((err) => logger.error(err))
      translated = true;
      let res = await fetch(
        `http://www.iinside.cn:7001/api_req?reqmode=nmt_mt5_jez&password=3652&text=${encodeURI(
          test[0]
        )}&order=zh2en`
      ).catch((err) => logger.error(err));
      /** 判断接口是否请求成功 */
      // logger.info(res)
      if (!res) {
        logger.error("翻译接口寄了~");
        return await e.reply("翻译接口寄了~");
      }
      /** 接口结果，json字符串转对象 */
      res = await res.json();
      if (res.code != 0) {
        e.reply(["翻译报错：", JSON.stringify(res, null, "\t")]);
        return true;
      }
      translateCount++;
      logger.mark(
        "[ aiPainting翻译-",
        `${await getName(e.user_id, e)}`,
        "]  ",
        test[0],
        " ==> ",
        res.data,
        "   计次",
        translateCount,
        "/50次时将强制终止"
      );
      // msg = await msg.replace(test[0], res.fanyi)
      msg = await msg.replace(test[0], res.data);
    }

    // 处理特殊字符==========
    msg = msg
      .replace(/｛/g, "{")
      .replace(/｝/g, "}")
      .replace(/（/g, "(")
      .replace(/）/g, ")")
      .replace(/#|＃/g, "")
      .replace(
        /[\u3002|\uff1f|\uff01|\uff0c|\u3001|\uff1b|\uff1a|\u201c|\u201d|\u2018|\u2019|\uff08|\uff09|\u300a|\u300b|\u3008|\u3009|\u3010|\u3011|\u300e|\u300f|\u300c|\u300d|\ufe43|\ufe44|\u3014|\u3015|\u2026|\u2014|\uff5e|\ufe4f|\uffe5]/g,
        ","
      )
      .trim();

    // =============================================//
    // 检测和替换文本中的屏蔽词（如果是主人则不检测）
    msg =
      e.isMaster || settings.apMaster.indexOf(e.user_id) > -1
        ? msg
        : await this.check(msg);
    // 判断封禁
    if (await this.banCheck(e)) return true;

    // 如果删除了违禁词，就加两件衣服
    if (corrected[e.user_id]) {
      msg = "formal wear," + msg;
    }

    logger.info("【aiPainting】最终Tags:", msg + param);

    e.reply(
      [
        corrected[e.user_id]
          ? "已去除关键词中包含的屏蔽词，并强行加上了几件衣服，正在"
          : "",
        `${e.img ? "以图生图" : "绘制"}中，请稍候。`,
        num > 1 ? "绘制多张图片所需时间较长，请耐心等待~" : "",
        multiTask
          ? "\n\n※当前有进行中的批量绘图任务，您可能需要等待较长时间，请见谅"
          : "",
      ],
      false,
      { at: true, recallMsg: 60 }
    );

    // =======================请求和发送图片======================
    let picPath;
    // 多张，合并转发---------------------------------
    if (num > 1) {
      multiTask = num > 10 ? 10 : num;

      // 写入多图cd---------------------------------------------------------
      let currentTime = moment(new Date()).format("YYYY-MM-DD HH:mm:ss");
      let multiPicInfo = {
        time: currentTime,
        count: multiTask,
      };
      redis.set(
        `Yz:AiPainting:multiPic:${e.user_id}`,
        JSON.stringify(multiPicInfo),
        { EX: settings.cd.person * multiTask }
      );

      // 用于标记合并消息中屏蔽了几张图
      let blocked = 0;
      // 用于标记有几张图请求失败
      let failedCount = 0;
      var data_msg = [];
      for (let i = 0; i < num; i++) {
        if (i >= 10) {
          data_msg.push({
            message: "一次最多10张图哦~",
            nickname: Bot.nickname,
            user_id: cfg.qq,
          });
          break;
        }

        // 尝试下载图片,api1------------------------
        if (settings.apiType == 1) {
          let retryCount = 0;
          do {
            if (retryCount)
              logger.info(
                `【aiPainting】：用户 ${await getName(
                  e.user_id,
                  e
                )} 图片损坏，尝试第${retryCount + 1}次……`
              );

            let response;
            try {
              response = await this.getPic(e, msg, param, settings.retryTimes);
            } catch (err) {
              logger.error(err);
              if (err) {
                await common.sleep(1000);
                e.reply(["接口报错：", JSON.stringify(err, null, "\t")], true);
              }
              await this.clearCD(e);
              multiTask = 0;
              return true;
            }
            // 没获取到
            if (!response.ok) {
              continue;
            }
            // 尝试下载图片------------------------
            let currentTime = moment(new Date()).format("YYMMDD_HHmmss");
            picPath = `${path}/pictures/${currentTime}_${msg
              .substring(0, 170)
              .trim()}${param}_${e.user_id}.png`;
            let res = await response.json();
            let base64 = res.data[0]
              .toString()
              .replace(/data:image\/png;|base64,/g, "");
            fs.writeFile(picPath, base64, "base64", (err) => {});
            retryCount++;
            await common.sleep(200);
            // 如果图片损坏，则更换接口
            if (
              !(await this.CheckImgExists(picPath)) &&
              settings.apiType == 1
            ) {
              logger.warn("【aiPainting】批量绘图：本次获取图片损坏。");
              await refreshapi_();
            }
          } while (
            !(await this.CheckImgExists(picPath)) &&
            retryCount < settings.retryTimes
          );

          await common.sleep(200);
          if (!(await this.CheckImgExists(picPath))) {
            multiTask--;
            failedCount++;
            continue;
          }
        }

        //  尝试下载图片，路路
        else if (settings.apiType == 2 || settings.apiType == 3) {
          let retryCount = 0;
          do {
            if (retryCount) {
              logger.warn(
                "【aiPainting批量绘图",
                `${await getName(e.user_id, e)}`,
                "】路路接口请求频率限制，10秒后自动重试第",
                retryCount + 1,
                "次"
              );
              await common.sleep(10000);
            }
            let response;
            try {
              response = await this.getPic(e, msg, param, settings.retryTimes);
            } catch (err) {
              logger.error(err);
              if (err) {
                await common.sleep(1000);
                e.reply(["接口报错：", JSON.stringify(err, null, "\t")], true);
              }
              await this.clearCD(e);
              multiTask = 0;
              return true;
            }
            let currentTime = moment(new Date()).format("YYMMDD_HHmmss");
            picPath = `${path}/pictures/${currentTime}_${msg
              .substring(0, 170)
              .trim()}${param}_${e.user_id}.png`;
            const streamPipeline = promisify(pipeline);
            await streamPipeline(response.body, fs.createWriteStream(picPath));
            if (!fs.existsSync(picPath)) {
              multiTask--;
              failedCount++;
              continue;
            }
            retryCount++;
          } while (
            sizeOf(picPath).height < 30 &&
            retryCount < settings.retryTimes
          );

          if (sizeOf(picPath).height < 30) {
            multiTask--;
            failedCount++;
            continue;
          }
        }

        // //   判断文件是否损坏？？
        // let isPicOK = await this.CheckImgExists(picPath);

        // if (!isPicOK) {
        //   logger.warn("【aiPainting】：本次获取图片文件损坏，尝试刷新接口");
        //   await refreshapi_();
        //   fs.unlink(picPath, (err) => {});
        //   multiTask--;
        //   failedCount++;
        //   continue;
        // }

        // 使用百度鉴黄========
        if (settings.isJianHuang) {
          let isH = await jianhuang(picPath, e);
          if (isH == 404) {
            await this.clearCD(e);
            multiTask = 0;
            return true;
          } else if (isH == 502) {
            logger.warn("【aiPainting】：本次获取图片文件损坏");
            fs.unlink(picPath, (err) => {});
            multiTask--;
            failedCount++;
            continue;
          } else if (isH == 114514) {
            logger.warn("【aiPainting鉴黄】：图片不合规");
            fs.unlink(picPath, (err) => {});
            blocked++;
            multiTask--;
            continue;
          }
          logger.info("【aiPainting鉴黄】：图片安全");
        }

        // 存入合并消息等待发送-------------
        let bitMap = fs.readFileSync(picPath);
        let base64 = Buffer.from(bitMap, "binary").toString("base64");

        data_msg.push({
          message: [segment.image(`base64://${base64}`)],
          nickname: Bot.nickname,
          user_id: cfg.qq,
        });
        if (settings.apiType == 2 || settings.apiType == 3)
          await common.sleep(5000);
        // 剩余任务数减一
        multiTask--;
      }
      num = num > 10 ? 10 : num;
      // 在合并消息中加入图片信息-------------
      if (shape || scale || seed || msg) {
        data_msg.push({
          message: [
            `${shape ? `shape=${shape}` : ""}${
              scale ? `${shape ? "\n" : ""}scale=${scale}` : ""
            }${seed ? `${scale || shape ? "\n" : ""}seed=${seed}` : ""}${
              strength && e.img
                ? `${scale || shape || seed ? "\n" : ""}strength=${strength}`
                : ""
            }`,
            // (translated && !corrected[e.user_id]) ? msg : ""
            `${shape || scale || seed || strength ? "\n" : ""}`,
            `${msg}`,
          ],
          nickname: Bot.nickname,
          user_id: cfg.qq,
        });
      }
      //  尝试发送合并消息-----------------
      let sendRes = null;
      if (e.isGroup)
        sendRes = await e.reply(await e.group.makeForwardMsg(data_msg), false, {
          recallMsg: settings.isRecall ? settings.recallTime : 0,
        });
      else
        sendRes = await e.reply(
          await e.friend.makeForwardMsg(data_msg),
          false,
          { recallMsg: settings.isRecall ? settings.recallTime : 0 }
        );
      if (!sendRes) {
        e.reply(["消息发送失败，可能被风控"], true, {
          recallMsg: settings.isRecall ? settings.recallTime : 0,
        });
        await this.clearCD(e);
      } else {
        // 记录用户增加一定使用次数
        await this.addUsage(e.user_id, num - failedCount);
        let used = await redis.get(`Yz:AiPainting:Usage:${e.user_id}`);
        let remainingTimes = usageLimit - used < 0 ? 0 : usageLimit - used;
        e.reply(
          [
            `成功绘制${num - failedCount}张图片${
              blocked ? `，有${blocked}张图片因不合规无法展示` : ""
            }${failedCount ? `。\n有${failedCount}张图片绘制失败` : ""}`,
            settings.usageLimit && usageLimit
              ? `\n今日剩余${remainingTimes}次`
              : "",
          ],
          true
        );
      }
      multiTask = 0;
    }

    // 单张，直接发送---------------------------------------------
    else {
      // 尝试下载图片,api1------------------------
      if (settings.apiType == 1) {
        let retryCount = 0;
        do {
          if (retryCount > 0)
            logger.info(
              `【aiPainting】：用户 ${await getName(
                e.user_id,
                e
              )} 图片损坏，尝试第${retryCount + 1}次……`
            );

          let response;
          try {
            response = await this.getPic(e, msg, param, settings.retryTimes);
          } catch (err) {
            logger.error(err);
            if (err) {
              await common.sleep(1000);
              e.reply(["接口报错：", JSON.stringify(err, null, "\t")], true);
            }
            await this.clearCD(e);
            return true;
          }
          // 没获取到
          if (!response.ok) {
            e.reply(
              ["图片绘制失败，请稍后重试，或更换接口。\n命令：ap设置接口1-3"],
              true
            );
            await this.clearCD(e);
            return true;
          }
          // 尝试下载图片------------------------
          let currentTime = moment(new Date()).format("YYMMDD_HHmmss");
          picPath = `${path}/pictures/${currentTime}_${msg
            .substring(0, 170)
            .trim()}${param}_${e.user_id}.png`;
          let res = await response.json();
          let base64 = res.data[0]
            .toString()
            .replace(/data:image\/png;|base64,/g, "");
          fs.writeFile(picPath, base64, "base64", (err) => {});
          retryCount++;
          // 如果图片损坏，则更换接口
          await common.sleep(200);
          if (!(await this.CheckImgExists(picPath)) && settings.apiType == 1) {
            logger.warn("【aiPainting】单次绘制：图片损坏");
            await refreshapi_();
          }
        } while (
          !(await this.CheckImgExists(picPath)) &&
          retryCount < settings.retryTimes
        );

        await common.sleep(200);
        if (!(await this.CheckImgExists(picPath))) {
          e.reply("图片绘制失败，请重试~");
          await this.clearCD(e);
          return true;
        }
      }

      //  尝试下载图片，路路
      else if (settings.apiType == 2 || settings.apiType == 3) {
        let retryCount = 0;
        do {
          if (retryCount) {
            logger.warn(
              "【aiPainting",
              `${await getName(e.user_id, e)}`,
              "】路路接口请求频率限制，10秒后自动重试第",
              retryCount + 1,
              "次"
            );
            await common.sleep(10000);
          }

          let response;
          try {
            response = await this.getPic(e, msg, param, settings.retryTimes);
          } catch (err) {
            logger.error(err);
            if (err) {
              await common.sleep(1000);
              e.reply(["接口报错：", JSON.stringify(err, null, "\t")], true);
            }
            await this.clearCD(e);
            multiTask = 0;
            return true;
          }
          let currentTime = moment(new Date()).format("YYMMDD_HHmmss");
          picPath = `${path}/pictures/${currentTime}_${msg
            .substring(0, 170)
            .trim()}${param}_${e.user_id}.png`;
          const streamPipeline = promisify(pipeline);
          await streamPipeline(response.body, fs.createWriteStream(picPath));
          if (!fs.existsSync(picPath)) {
            e.reply("图片搞丢了，请重试~");
            await this.clearCD(e);
            return true;
          }
          retryCount++;
        } while (
          sizeOf(picPath).height < 30 &&
          retryCount < settings.retryTimes
        );

        if (sizeOf(picPath).height < 30) {
          e.reply("路路接口请求频率限制，请稍后重试", true, { recallMsg: 30 });
          await this.clearCD(e);
          return true;
        }
      }

      // // 尝试请求图片------------------------

      // // 尝试下载图片------------------------
      // let currentTime = moment(new Date()).format("YYMMDD_HHmmss");
      // let picPath = `${path}/pictures/${currentTime}_${msg
      //   .substring(0, 170)
      //   .trim()}${param}_${e.user_id}.png`;
      // // api大全
      // if (settings.apiType == 1) {
      //   await this.downloadApi1Pic(e, picPath, response);
      //   await common.sleep(200);
      //   if (!(await this.CheckImgExists(picPath))) {
      //     e.reply("图片绘制失败，请重试~");
      //     await this.clearCD(e);
      //     return true;
      //   }
      // }
      // // 路路
      // else if (settings.apiType == 2 || settings.apiType == 3) {
      //   const streamPipeline = promisify(pipeline);
      //   await streamPipeline(response.body, fs.createWriteStream(picPath));
      //   if (!fs.existsSync(picPath)) {
      //     e.reply("图片搞丢了，请重试~");
      //     await this.clearCD(e);
      //     return true;
      //   }
      // }

      //   判断文件是否损坏？？？
      // let isPicOK = await this.CheckImgExists(picPath);
      // if (!isPicOK) {
      //   await this.clearCD(e);
      //   logger.warn(
      //     "【aiPainting鉴黄】pluto接口返回图片文件损坏，将尝试自动刷新接口"
      //   );
      //   await refreshapi_();
      //   e.reply(["图片绘制失败，请稍后重试"], true);
      //   return true;
      // }

      // 使用百度鉴黄========
      if (settings.isJianHuang) {
        let isH = await jianhuang(picPath, e);
        if (isH == 404) {
          await this.clearCD(e);
          return true;
        } else if (isH == 502) {
          await this.clearCD(e);
          e.reply(
            ["图片绘制失败，请稍后重试，或更换接口。\n命令：ap设置接口1-3"],
            true
          );
          return true;
        } else if (isH == 114514) {
          logger.warn("【aiPainting】：图片不合规");
          this.e.reply(["图片不合规，不予展示"], true);
          fs.unlink(picPath, (err) => {});
          return true;
        }
        logger.info("【aiPainting】：图片安全");
      }

      // 发送图片===============================================
      let bitMap = fs.readFileSync(picPath);
      let base64 = Buffer.from(bitMap, "binary").toString("base64");
      let sendRes = await e.reply(
        [
          `${shape ? `shape=${shape}` : ""}${
            scale ? `${shape ? "\n" : ""}scale=${scale}` : ""
          }${seed ? `${scale || shape ? "\n" : ""}seed=${seed}` : ""}${
            strength && e.img
              ? `${scale || shape || seed ? "\n" : ""}strength=${strength}`
              : ""
          }`,
          segment.image(`base64://${base64}`),
          // translated && !corrected[e.user_id] ? msg : "",
          msg,
          settings.usageLimit && usageLimit
            ? `\n今日剩余${remainingTimes - 1}次`
            : "",
        ],
        true,
        { recallMsg: settings.isRecall ? settings.recallTime : 0 }
      );
      if (!sendRes) {
        e.reply(["图片发送失败，可能被风控"], true, {
          recallMsg: settings.isRecall ? settings.recallTime : 0,
        });
        await this.clearCD(e);
      } else {
        // 记录用户增加一次使用次数
        this.addUsage(e.user_id, 1);
      }
    }

    // 重置屏蔽词标记
    if (corrected[e.user_id]) delete corrected[e.user_id];
    // 删除以图生图下载的临时图片
    fs.unlink(`${path}/pictures/temp/tempPic_${e.user_id}.png`, (err) => {});
    return true;
  }

  //判断图片是否正常
  async CheckImgExists(imgPath) {
    try {
      sizeOf(imgPath);
    } catch (err) {
      return false;
    }
    return true;
  }
  // // 下载api1的图片
  // async downloadApi1Pic(e, picPath, response) {
  //   let retryCount = 0;
  //   do {
  //     if (retryCount)
  //       logger.info(
  //         `【aiPainting】：用户 ${await getName(e.user_id, e)} 图片损坏，尝试第${
  //           retryCount + 1
  //         }次……`
  //       );
  //     let res = await response.json();
  //     let base64 = res.data[0]
  //       .toString()
  //       .replace(/data:image\/png;|base64,/g, "");
  //     fs.writeFile(picPath, base64, "base64", (err) => {});
  //     retryCount++;
  //     // 如果图片损坏，则更换接口
  //     if (!(await this.CheckImgExists(picPath))) {
  //       await refreshapi_();
  //     }
  //   } while (
  //     !(await this.CheckImgExists(picPath)) &&
  //     retryCount < settings.retryTimes
  //   );
  // }

  // 判断该群聊是否开启aiPainting
  async isDisabled(e) {
    if (e.isGroup && !e.isMaster && settings.apMaster.indexOf(e.user_id) == -1)
      if (settings.enabledGroups.indexOf(e.group_id) == -1) {
        e.reply("aiPainting功能未开启~");
        return true;
      } else return false;
  }

  // CD判定
  async checkCD(e) {
    // 判断cd--------------------------------------------------------------
    let currentTime = moment(new Date()).format("YYYY-MM-DD HH:mm:ss");
    // 个人使用一次生成多张图功能后的CD------------
    let multiPicInfo = JSON.parse(
      await redis.get(`Yz:AiPainting:multiPic:${e.user_id}`)
    );
    if (multiPicInfo && !e.isMaster) {
      let lastTime = multiPicInfo.time;
      let seconds = moment(currentTime).diff(moment(lastTime), "seconds");
      this.e.reply(
        [
          `${settings.cd.person}×${
            multiPicInfo.count
          }秒个人cd（您刚刚批量绘制了${multiPicInfo.count}张图），请等待${
            settings.cd.person * multiPicInfo.count - seconds
          }秒后再使用`,
        ],
        true,
        { recallMsg: 30 }
      );
      return true;
    }
    // 个人CD--------------
    let lastTime = await redis.get(`Yz:AiPainting:${e.group_id}:${e.user_id}`);
    if (lastTime && !e.isMaster) {
      let seconds = moment(currentTime).diff(moment(lastTime), "seconds");
      this.e.reply(
        [
          `${settings.cd.person}秒个人cd，请等待${
            settings.cd.person - seconds
          }秒后再使用`,
        ],
        false,
        { at: true, recallMsg: 30 }
      );
      return true;
    }
    // 群组CD--------------
    lastTime = await redis.get(`Yz:AiPainting:${e.group_id}`);
    if (lastTime && !e.isMaster && settings.apMaster.indexOf(e.user_id) == -1) {
      let seconds = moment(currentTime).diff(moment(lastTime), "seconds");
      this.e.reply(
        [
          `${settings.cd.group}秒群内cd，请等待${
            settings.cd.group - seconds
          }秒后再使用`,
        ],
        false,
        { at: true, recallMsg: 30 }
      );
      return true;
    }
    // 全局CD--------------
    lastTime = await redis.get(`Yz:AiPainting`);
    if (lastTime && !e.isMaster && settings.apMaster.indexOf(e.user_id) == -1) {
      let seconds = moment(currentTime).diff(moment(lastTime), "seconds");
      this.e.reply(
        [
          `${settings.cd.global}秒全局cd，请等待${
            settings.cd.global - seconds
          }秒后再使用`,
        ],
        false,
        { at: true, recallMsg: 30 }
      );
      return true;
    }

    // 写入cd---------------------------------------------------------
    currentTime = moment(new Date()).format("YYYY-MM-DD HH:mm:ss");
    redis.set(`Yz:AiPainting`, currentTime, { EX: settings.cd.global });
    redis.set(`Yz:AiPainting:${e.group_id}`, currentTime, {
      EX: settings.cd.group,
    });
    redis.set(`Yz:AiPainting:${e.group_id}:${e.user_id}`, currentTime, {
      EX: settings.cd.person,
    });

    return false;
  }

  // 封禁判定
  async banCheck(e) {
    if (corrected[e.user_id]) {
      // 如果开启封号，就封禁这小子
      if (settings.isBanUser && !cfg.masterQQ.includes(e.user_id)) {
        settings.bandUsers.push(e.user_id);
        fs.writeFileSync(
          `${path}/settings.yaml`,
          YAML.stringify(settings),
          "utf8"
        );
        e.reply(
          [
            "Tags中包含屏蔽词：",
            corrected[e.user_id],
            "\n您的账号已被封禁。如属误封，请截图您的此条消息，然后联系机器人主人解封~",
          ],
          true
        );
        delete corrected[e.user_id];
        return true;
      }
    }
    return false;
  }

  /**
   * #请求图片,如果失败则重试至指定次数========================
   * @param e oicq传递的事件参数e
   * @param tags 绘图tags
   * @param param 绘图参数,即图片比例、种子等
   * @param times 请求失败时重试的次数
   */
  async getPic(e, tags, param, times) {
    let response = null;
    let retry = 0;
    do {
      if (retry > 0) {
        logger.info(
          `【aiPainting】：用户 ${await getName(e.user_id, e)} 图片获取失败，${
            settings.apiType == 2 || settings.apiType == 3 ? "3秒后" : ""
          }尝试第${retry + 1}次……`
        );
        if (2 <= settings.apiType <= 3) {
          await common.sleep(3000);
        }
      }
      response = await this.getOnePic(e, tags, param);
      // 如果请求失败，则更换接口
      if (!response.ok && settings.apiType == 1) {
        await refreshapi_();
      }
      retry = retry + 1;
    } while (!response.ok && retry < times);
    return response;
  }

  /**
   * #根据参数请求一张图片========================
   * @param e oicq传递的事件参数e
   * @param tags 绘图tags
   * @param param 绘图参数,即图片比例、种子等
   */
  async getOnePic(e, tags, param) {
    // 绘图接口大全https://api.smoe.me/v1/free
    if (settings.apiType == 1) {
      let url = settings.lockedAPI ? settings.lockedAPI : settings.usingAPI;
      logger.info("【aiPainting】尝试获取一张图片，使用接口：", url);
      url = url + "/api/predict/";
      let fn_index;
      let data;
      if (!e.img) {
        fn_index = 12;
        data = [
          tags,
          "lowres, bad anatomy, bad hands, text, error, missing fingers, extra digit, fewer digits, cropped, worst quality, low quality, normal quality, jpeg artifacts, signature, watermark, username, blurry",
          "None",
          "None",
          28,
          "Euler a",
          false,
          false,
          1,
          1,
          12,
          -1,
          -1,
          0,
          0,
          0,
          false,
          512,
          512,
          false,
          false,
          0.7,
          "None",
          false,
          false,
          null,
          "",
          "Seed",
          "",
          "Steps",
          "",
          true,
          false,
          null,
        ];
      } else {
        let bitMap = fs.readFileSync(
          `${path}/pictures/temp/tempPic_${e.user_id}.png`
        );
        let base64 = Buffer.from(bitMap, "binary").toString("base64");
        fn_index = 31;
        data = [
          0,
          tags,
          "lowres, bad anatomy, bad hands, text, error, missing fingers, extra digit, fewer digits, cropped, worst quality, low quality, normal quality, jpeg artifacts, signature, watermark, username, blurry",
          "None",
          "None",
          "data:image/jpeg;base64," + base64,
          null,
          null,
          null,
          "Draw mask",
          28,
          "Euler a",
          "4",
          "original",
          false,
          false,
          1,
          1,
          11,
          0.75,
          -1,
          -1,
          0,
          0,
          0,
          false,
          512,
          512,
          settings.usingAPI == "https://novel.seutools.com"
            ? "直接拉伸"
            : "Just resize",
          false,
          32,
          settings.usingAPI == "https://novel.seutools.com"
            ? "优化蒙版内图像"
            : "Inpaint masked",
          "",
          "",
          "None",
          "",
          "",
          1,
          50,
          0,
          false,
          4,
          1,
          "",
          128,
          8,
          ["left", "right", "up", "down"],
          1,
          0.05,
          128,
          4,
          "fill",
          ["left", "right", "up", "down"],
          false,
          false,
          null,
          "",
          "",
          64,
          "None",
          "Seed",
          "",
          "Steps",
          "",
          true,
          false,
          null,
          "",
          "",
        ];
      }
      return await fetch(url, {
        method: "post",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fn_index: fn_index,
          data: data,
        }),
      });
    }
    // 路路API
    else if (settings.apiType == 2 || settings.apiType == 3) {
      logger.info(
        "【aiPainting】尝试获取一张图片,使用接口：路路api" +
          `${settings.apiType == 2 ? "" : "-备用"}`
      );
      let url = `http://${
        settings.apiType == 2 ? "91.217.139.190:5010" : "185.80.202.180:5010"
      }/got_image${
        e.img ? "2image" : ""
      }?tags=best quality,${tags}${param}&token=${token}`;
      //  如果没有图片，就走以文生图
      if (!e.img) return await fetch(url);
      // 否则就走以图生图
      else {
        let bitMap = fs.readFileSync(
          `${path}/pictures/temp/tempPic_${e.user_id}.png`
        );
        let base64 = Buffer.from(bitMap, "binary").toString("base64");
        return await fetch(url, {
          method: "post",
          body: base64,
        });
      }
    }
  }

  /**
   * #指定用户使用次数加num次 ========================
   * @param qq 用户qq号
   * @param num 数据库中用户使用记录要增加的次数
   */
  async addUsage(qq, num) {
    // logger.info(num);
    // 该用户的使用次数
    let usageData = await redis.get(`Yz:AiPainting:Usage:${qq}`);
    // 当前时间
    let time = moment(Date.now()).add(1, "days").format("YYYY-MM-DD 00:00:00");
    // 到明日零点的剩余秒数
    let exTime = Math.round(
      (new Date(time).getTime() - new Date().getTime()) / 1000
    );
    if (!usageData) {
      await redis.set(`Yz:AiPainting:Usage:${qq}`, num * 1, { EX: exTime });
    } else {
      await redis.set(`Yz:AiPainting:Usage:${qq}`, usageData * 1 + num, {
        EX: exTime,
      });
    }
    return true;
  }

  async BanUser(e) {
    if (!(e.isMaster || settings.apMaster.indexOf(e.user_id) > -1))
      return false;
    if (e.msg == "ap封禁列表") {
      if (settings.bandUsers.length == 0) {
        e.reply("当前没有封禁用户哦～");
        return true;
      }

      e.reply("发送中，请稍等");
      var data_msg = [];
      for (let val of settings.bandUsers) {
        data_msg.push({
          message: [
            segment.image(`https://q1.qlogo.cn/g?b=qq&s=0&nk=${val}`),
            `${val}`,
          ],
          nickname: await getName(val, e),
          user_id: val * 1,
        });
      }
      data_msg = data_msg.reverse();
      data_msg.push({
        message:
          "这些群友为了造福群友，不惜舍身忘死，他们无私无畏的奉献精神值得我们每一个人尊重和铭记",
        nickname: Bot.nickname,
        user_id: cfg.qq,
      });

      let sendRes = null;
      if (e.isGroup)
        sendRes = await e.reply(await e.group.makeForwardMsg(data_msg));
      else sendRes = await e.reply(await e.friend.makeForwardMsg(data_msg));
      if (!sendRes) e.reply("消息发送失败，可能被风控");

      return true;
    } else {
      let userId = /^ap封禁(\d{5,11})$/g.exec(e.msg)
        ? /^ap封禁(\d{5,11})$/g.exec(e.msg)[1]
        : "";
      if (e.at) userId = e.at;
      if (!userId) {
        e.reply("请在命令后附带QQ号，或@该用户。");
        return true;
      }
      var index = settings.bandUsers.indexOf(userId);
      if (index == -1) {
        settings.bandUsers.push(userId);
        fs.writeFileSync(
          `${path}/settings.yaml`,
          YAML.stringify(settings),
          "utf8"
        );
        e.reply("成功封禁该用户");
      } else {
        e.reply("笨比，本来就封着的");
      }
      return true;
    }
  }

  async unBanUser(e) {
    if (!(e.isMaster || settings.apMaster.indexOf(e.user_id) > -1))
      return false;
    let userId = /^ap解封(\d{5,11})$/g.exec(e.msg)
      ? /^ap解封(\d{5,11})$/g.exec(e.msg)[1]
      : "";
    if (e.at) userId = e.at;
    if (!userId) {
      e.reply("请在命令后附带QQ号，或@该用户。");
      return true;
    }
    // logger.info(settings.bandUsers)
    // logger.info(typeof (settings.bandUsers[0]))
    // logger.info(userId)
    var index = settings.bandUsers.indexOf(userId * 1);
    // logger.info(index)
    if (index > -1) {
      settings.bandUsers.splice(index, 1);
      fs.writeFileSync(
        `${path}/settings.yaml`,
        YAML.stringify(settings),
        "utf8"
      );
      e.reply("成功解封该用户");
    } else {
      e.reply("该用户未被封禁");
    }
    return true;
  }

  async FBI(e) {
    // 判断功能是否开启
    if (await this.isDisabled(e)) return true;

    if (!e.at) return false;
    // 读取本地文件列表
    let fileList = [];
    fs.readdirSync(path + "/pictures").forEach((fileName) =>
      fileList.push(fileName)
    );
    fileList = fileList.reverse();
    let count = 0;
    var data_msg = [];
    for (let val of fileList) {
      if (count >= settings.localNum) break;
      if (val.substring(13).includes(e.at)) {
        // logger.info(e.at)
        let picPath = path + "/pictures/" + val;
        let bitMap = fs.readFileSync(picPath);
        let base64 = Buffer.from(bitMap, "binary").toString("base64");
        data_msg.push({
          message: [
            segment.image(`base64://${base64}`),
            val.substring(0, val.length - 4),
          ],
          nickname: await getName(e.at, e),
          user_id: e.at * 1,
        });
        count++;
      }
    }
    if (data_msg.length == 0) {
      e.reply("没有找到ta的使用记录哦~");
      return true;
    }
    e.reply("正在发送中，请稍候~");
    let sendRes = null;
    if (e.isGroup)
      sendRes = await e.reply(await e.group.makeForwardMsg(data_msg));
    else sendRes = await e.reply(await e.friend.makeForwardMsg(data_msg));

    if (!sendRes) {
      e.reply("消息发送失败，改为纯文字发送");
      count = 0;
      data_msg = [];
      for (let val of fileList) {
        if (count >= settings.localNum) break;
        if (val.substring(13, val.length - 1).indexOf(e.at) != -1) {
          data_msg.push({
            message: [val.substring(0, val.length - 4)],
            nickname: await getName(e.at, e),
            user_id: e.at * 1,
          });
          count++;
        }
      }
      let sendRes = null;
      if (e.isGroup)
        sendRes = await e.reply(await e.group.makeForwardMsg(data_msg));
      else sendRes = await e.reply(await e.friend.makeForwardMsg(data_msg));
      if (!sendRes) {
        e.reply("消息发送失败，可能被风控");
      }
    }
    return true;
  }

  async PreSetList(e) {
    // 判断功能是否开启
    if (await this.isDisabled(e)) return true;

    var data_msg = [];
    for (var key in preSet) {
      data_msg.push({
        message: `${key} ==>\n${preSet[key]}`,
        nickname: Bot.nickname,
        user_id: cfg.qq,
      });
    }
    if (data_msg.length == 0) {
      e.reply("当前没有预设~");
      return true;
    }
    let sendRes = null;
    if (e.isGroup)
      sendRes = await e.reply(await e.group.makeForwardMsg(data_msg.reverse()));
    else
      sendRes = await e.reply(
        await e.friend.makeForwardMsg(data_msg.reverse())
      );
    if (!sendRes) {
      e.reply("消息发送失败，可能被风控~");
    }
    return true;
  }

  async delPreSet(e) {
    let keyWord = e.msg.replace("ap预设删除", "");
    if (preSet[keyWord]) {
      let txt = preSet[keyWord];
      delete preSet[keyWord];
      fs.writeFileSync(`${path}/preSet.yaml`, YAML.stringify(preSet), "utf8");
      e.reply(["成功删除预设：\n", keyWord, " ==>\n", txt]);
    } else {
      e.reply("未找到该预设");
    }
    return true;
  }

  // 批量添加预设
  async batchPreSet(e) {
    if (!e.source) {
      e.reply(
        "用法：将他人的预设列表（合并转发的格式）发送给机器人，然后对该消息回复“ap录入预设”"
      );
      return true;
    }
    let reply;
    if (e.isGroup) {
      reply = (await e.group.getChatHistory(e.source.seq, 1)).pop()?.message;
    } else {
      reply = (await e.friend.getChatHistory(e.source.time, 1)).pop()?.message;
    }
    if (reply) {
      let brief = [];
      for (let val of reply) {
        if (val.type == "xml") {
          // console.log( val.data.match(/m_resid="(.*)" m_fileName/))
          // return true
          let id;
          try {
            id = val.data.match(/m_resid="(.*)" m_fileName/)[1];
          } catch (err) {
            e.reply(
              "请尝试将此合并消息重新转发给机器人，然后对该消息回复“ap录入预设”，要是还不行就寄咯~"
            );
            return true;
          }
          let fmessage;
          if (e.isGroup) fmessage = await e.group.getForwardMsg(id);
          else fmessage = await e.friend.getForwardMsg(id);
          for (let item of fmessage) {
            // 对合并消息中的每条消息逐一处理
            for (let val of item.message) {
              if (val.type == "text") {
                // logger.warn(val.text);
                let from = "";
                let to = "";
                let exec = /^(.+) ==>\n(.+)$/.exec(val.text);
                if (exec) {
                  from = exec[1].trim();
                  to = exec[2].trim();
                }
                if (from.length + to.length < 2) continue;
                logger.warn("from:", from, "   to:", to);
                // 如果有重复的就加序号区分
                // if (preSet[from])
                //   for (let i = 1; ; i++) {
                //     if (!preSet[from + `_${i}`]) {
                //       from = from + `_${i}`;
                //       break;
                //     }
                //   }
                preSet[from] = to + ",";
                brief.push(
                  from +
                    "  ==>  " +
                    to.substring(0, 9) +
                    `${to.length > 10 ? "…" : ""}`
                );
                console.log(brief.join("\n"));
              }
            }
          }
          break;
        }
      }
      if (!brief.length) {
        e.reply("没有解析到预设哦~");
        return true;
      }
      fs.writeFileSync(`${path}/preSet.yaml`, YAML.stringify(preSet), "utf8");
      e.reply(["成功录入", `${brief.length}`, "条预设：\n", brief.join("\n")]);
      return true;
    }
    e.reply("没有解析到预设哦~");
    return true;
  }

  // 添加一条预设
  async preSet(e) {
    let from = "";
    let to = "";
    let exec = /^(ap预设)(.+)>(.+)$/.exec(e.msg);
    let exec2 = /^(.+) ==>\n(.+)$/.exec(e.msg);
    if (exec) {
      from = exec[2].trim();
      to = exec[3].trim();
    } else if (exec2) {
      from = exec2[1].trim();
      to = exec2[2].trim();
    }
    // logger.warn("from:",from,"\nto:", to);
    if (from.length + to.length < 2) return false;
    preSet[from] = to;
    fs.writeFileSync(`${path}/preSet.yaml`, YAML.stringify(preSet), "utf8");
    e.reply(["成功添加预设：\n", from, " ==>\n", to]);
    return true;
  }

  async delLocalPic(e) {
    let keyWord = e.msg.replace("ap删除", "").trim();
    if (keyWord.length == 0) {
      e.reply(`请在命令后带上关键词，以删除包含该关键词的本地图片`);
      return true;
    }
    // 读取本地文件列表
    let fileList = [];
    fs.readdirSync(path + "/pictures").forEach((fileName) =>
      fileList.push(fileName)
    );
    let count = 0;
    for (let val of fileList) {
      if (val.indexOf(keyWord) != -1) {
        let picPath = path + "/pictures/" + val;
        fs.unlink(picPath, (err) => {});
        count++;
      }
    }
    e.reply(
      `${
        count
          ? `已删除包含\n${keyWord}\n关键词的${count}张图片~`
          : `未在本地检索到包含\n${keyWord}\n关键词的图片~`
      }`
    );
    return true;
  }

  // 说明书
  async shuomingshu(e) {
    // 判断功能是否开启
    if (await this.isDisabled(e)) return true;

    let shuomingshu = [
      "● 绘图+关键词：ai绘图\n    ※可加参数：竖图、横图、方图、自由度20（0-99）、种子114514（1-10位整数）、强度0.3（0-1的小数）(强度仅在图生图时生效)。可添加于任意位置\n    ※可指定批量绘制几张，如绘图5张a white cat\n\n",
      "● ap本地+关键词：获取此前绘制过的包含指定关键词图片,不加关键词则默认全部\n● ap查水表@某人：查看此人的使用记录",
      `\n● ap删除：删除包含指定关键词的本地图片`,
      `\n\n● ap预设原神>Genshin Impact：自定义替换词，此后使用时自动将“原神”替换为“Genshin Impact”\n● ap预设删除纳西妲：删除指定的自定义替换词\n● ap预设列表：查看添加过的预设`,
      "\n\n● ap屏蔽+关键词：屏蔽某个关键词\n● ap放行+关键词：解除屏蔽某个关键词\n● ap屏蔽词列表：查看当前屏蔽的关键词列表",
      "\n\n● ap设置：查看当前aiPainting的设置\n● ap设置(开启|关闭)：设置当前群是否启用aiPainting\n● ap设置(全局|群聊|个人)cd666：将全局、群聊或个人cd设置为666秒\n● ap设置主人cd(开启|关闭)：设置主人是否受cd限制\n● ap设置撤回(开启|关闭)：设置是否自动撤回\n● ap设置撤回60：自动撤回时间设置为60秒\n● ap设置本地20：本地图片单次最大发送张数设为20\n● ap设置次数(30|无限)：设置每人每天绘图次数上限为30次|无限次\n● ap设置鉴黄(开启|关闭)：设置是否使用百度鉴黄服务检测图片安全性",
      "\n\n● ap设置封禁(开启|关闭)：开启后，将封禁使用屏蔽词绘图的用户\n● ap封禁|解封(@用户|123456)：封禁|解封指定用户,支持qq号\n● ap封禁列表：查看全部封禁用户",
      `\n\n● ap设置(管理|授予管理||解除|解除管理|回收|收回|取消)权限(@用户|123456)：授予和回收aiPainting管理权限，获授权限的用户默认可设置群内aiPainting功能开启关闭、封禁和解封用户、添加违禁词。如需授予更多权限请自行修改插件对应位置的判断`,
      `\n\n● ap设置接口(1|2)：设置接口类型（1：pluto  2：路路）\n● ap设置接口[你的接口]：手动指定接口，仅在接口类型为1时生效，目前仅支持Stable Diffusion\n● ap设置接口锁定|解锁：将接口1锁定为当前使用的接口\n● ap设置重试5：将绘图失败时自动重试的次数设为5\n● ap刷新接口：当处于接口1模式，绘图长时间无响应时使用`,
    ];

    let helpPath = path + "/help/aphelp.png";
    let sendRes;
    if (fs.existsSync(helpPath))
      sendRes = await e.reply([segment.image(helpPath)]);
    else sendRes = await e.reply(shuomingshu.join(""));

    if (!sendRes) {
      let data_msg = [];
      for (let val of shuomingshu) {
        data_msg.push({
          message: val,
          nickname: Bot.nickname,
          user_id: cfg.qq,
        });
      }
      if (e.isGroup)
        sendRes = await e.reply(await e.group.makeForwardMsg(data_msg));
      else sendRes = await e.reply(await e.friend.makeForwardMsg(data_msg));

      if (!sendRes) {
        e.reply("消息发送失败，可能被风控，请前往控制台查看说明书");
        logger.info(
          "【aiPainting说明书】：\n\n",
          shuomingshu.join("\n"),
          "\n\n"
        );
      }
    }
    return true;
  }

  async local(e) {
    // 判断功能是否开启
    if (await this.isDisabled(e)) return true;

    let keyWord = e.msg.replace("ap本地", "");
    // logger.info(keyWord)
    // if (!keyWord)
    // logger.info("没有")

    // 读取本地文件列表
    let fileList = [];
    fs.readdirSync(path + "/pictures").forEach((fileName) =>
      fileList.push(fileName)
    );
    fileList = fileList.reverse();
    // logger.info(fileList)
    let count = 0;
    var data_msg = [];
    data_msg.push({
      message: `以下是检索到的${
        keyWord ? `包含${keyWord}关键词的` : ""
      }本地图片：`,
      nickname: Bot.nickname,
      user_id: cfg.qq,
    });
    for (let val of fileList) {
      if (val == "temp") continue;
      if (count >= settings.localNum) break;
      // if (!keyWord || val.substring(14, val.length-4).indexOf(keyWord) != -1) {
      if (!keyWord || val.substring(0, val.length - 4).indexOf(keyWord) != -1) {
        let picPath = path + "/pictures/" + val;
        // logger.info(picPath)
        let bitMap = fs.readFileSync(picPath);
        let base64 = Buffer.from(bitMap, "binary").toString("base64");
        data_msg.push({
          message: [
            segment.image(`base64://${base64}`),
            val.substring(0, val.length - 4),
          ],
          // message: [segment.image(`base64://${base64}`), val.substring(0, val.length - 10)],
          nickname: Bot.nickname,
          user_id: cfg.qq,
        });
        count++;
      }
    }
    if (data_msg.length == 1) {
      e.reply("没有在本地找到相关图片哦~");
      return true;
    }
    e.reply("正在发送中，请稍候~");
    let sendRes = null;
    if (e.isGroup)
      sendRes = await e.reply(await e.group.makeForwardMsg(data_msg));
    else sendRes = await e.reply(await e.friend.makeForwardMsg(data_msg));

    if (!sendRes) {
      e.reply("消息发送失败，改为纯文字发送");
      count = 0;
      data_msg = [];
      for (let val of fileList) {
        if (val == "temp") continue;
        if (count >= settings.localNum) break;
        if (
          !keyWord ||
          val.substring(0, val.length - 4).indexOf(keyWord) != -1
        ) {
          data_msg.push({
            message: [val.substring(0, val.length - 4)],
            nickname: Bot.nickname,
            user_id: e.at,
          });
          count++;
        }
      }
      let sendRes = null;
      if (e.isGroup)
        sendRes = await e.reply(await e.group.makeForwardMsg(data_msg));
      else sendRes = await e.reply(await e.friend.makeForwardMsg(data_msg));
      if (!sendRes) {
        e.reply("消息发送失败，可能被风控");
      }
    }
    return true;
  }

  // 设置==================================
  async setting(e) {
    if (!(e.isMaster || settings.apMaster.indexOf(e.user_id) > -1))
      return false;
    // 查看当前设置
    if (e.msg == "ap设置") {
      e.reply([
        `════   CD   ════\n`,
        `      全局CD：${settings.cd.global}秒\n`,
        `      群聊CD：${settings.cd.group}秒\n`,
        `      个人CD：${settings.cd.person}秒\n`,
        `\n═══  自动撤回  ═══\n`,
        `      状态：${settings.isRecall ? "开启" : "关闭"}\n`,
        `      时延：${settings.recallTime}秒\n`,
        `\n════  接口  ════\n`,
        ` 1、pluto${settings.apiType == 1 ? " [使用中]" : ""}\n`,
        `    ${e.isGroup ? "[仅私聊时展示]" : settings.usingAPI}${
          settings.lockedAPI ? "[已锁定]" : ""
        }\n`,
        ` 2、路路${settings.apiType == 2 ? " [使用中]" : ""}\n`,
        ` 3、路路备用${settings.apiType == 3 ? " [使用中]" : ""}\n`,
        ` 请求失败时的重试次数：${settings.retryTimes}\n`,
        `\n════  其他  ════\n`,
        ` 本地检索：单次最多${settings.localNum}张\n`,
        ` 百度鉴黄：${settings.isJianHuang ? "开启" : "关闭"}\n`,
        ` 封禁违规用户：${settings.isBanUser ? "开启" : "关闭"}\n`,
        ` 每人每天次数限制：${
          settings.usageLimit ? settings.usageLimit + "次" : "不限"
        }\n`,
        `\n═══启用的群聊═══\n      `,
        e.isGroup ? "   仅私聊时展示" : settings.enabledGroups.join("\n      "),
      ]);
      return true;
    }
    // 删除图片版帮助
    else if (/^ap设置删除帮助$/.test(e.msg)) {
      if (!e.isMaster) return false;
      fs.unlink(`${path}/help/aphelp.png`, (err) => {});
      e.reply("已删除");
      return true;
    }
    // 设置图片版帮助
    else if (/^ap设置帮助/.test(e.msg)) {
      if (!e.isMaster) return false;

      if (!e.img) {
        e.reply("请在命令后附带图片~");
        return true;
      }

      const response = await fetch(e.img[0]);
      // 没获取到
      if (!response.ok) {
        e.reply("图片下载失败，请重试");
        return true;
      }
      initPath(path + "");
      const streamPipeline = promisify(pipeline);
      let helpPic = `${path}/help/aphelp.png`;
      await streamPipeline(response.body, fs.createWriteStream(helpPic));
      e.reply("图片说明书设置成功~");
      return true;
    }

    // 开启关闭功能
    else if (/^ap设置(开启|关闭)$/.test(e.msg)) {
      if (e.isPrivate) {
        e.reply("请前往对应群聊中发送指令");
        return true;
      }
      var index = settings.enabledGroups.indexOf(e.group_id);
      if (/^ap设置关闭$/.test(e.msg)) {
        //关闭
        if (index > -1) {
          settings.enabledGroups.splice(index, 1);
          fs.writeFileSync(
            `${path}/settings.yaml`,
            YAML.stringify(settings),
            "utf8"
          );
          e.reply("aiPainting功能已关闭~");
        } else {
          e.reply("笨比，本来就关着的");
        }
      } else {
        // 开启
        if (index > -1) {
          e.reply("笨比，本来就开着的");
        } else {
          settings.enabledGroups.push(e.group_id);
          fs.writeFileSync(
            `${path}/settings.yaml`,
            YAML.stringify(settings),
            "utf8"
          );
          e.reply("aiPainting功能已开启~");
        }
      }
      return true;
    }

    // 设置cd
    else if (/^ap设置(全局|群聊|个人)cd(\d{1,5})$/g.test(e.msg)) {
      if (!e.isMaster) return false;
      let global = /^ap设置全局cd(\d{1,5})$/g.exec(e.msg);
      let group = /^ap设置群聊cd(\d{1,5})$/g.exec(e.msg);
      let person = /^ap设置个人cd(\d{1,5})$/g.exec(e.msg);
      // logger.info(global, group, person);
      if (global) {
        settings.cd.global = global[1] * 1;
      } else if (group) {
        settings.cd.group = group[1] * 1;
      } else {
        settings.cd.person = person[1] * 1;
      }
      fs.writeFileSync(
        `${path}/settings.yaml`,
        YAML.stringify(settings),
        "utf8"
      );
      e.reply(
        `${global ? "全局" : group ? "群聊" : "个人"}cd已设置为${
          global ? global[1] : group ? group[1] : person[1]
        }秒`
      );
      return true;
    }

    // 授权管理
    else if (
      /^ap设置(管理|授予管理|解除|解除管理|回收|收回|取消)权限/g.test(e.msg)
    ) {
      if (!e.isMaster) {
        e.reply("我的附庸的附庸还得是我的附庸");
        return true;
      }
      let isGive;
      if (/^ap设置(管理|授予管理)权限/g.test(e.msg)) {
        isGive = true;
      } else if (/^ap设置(解除|解除管理|回收|收回|取消)权限/g.test(e.msg)) {
        isGive = false;
      } else return false;
      // logger.warn(isGive);

      let reg1 =
        /^ap设置(管理|授予管理|解除|解除管理|回收|收回|取消)权限(\d{5,11})$/;
      // logger.warn(reg1.exec(e.msg));
      let userId = reg1.test(e.msg) ? reg1.exec(e.msg)[2] : "";
      if (e.at) userId = e.at;
      if (!userId) {
        e.reply("请在命令后附带QQ号，或@该用户。");
        return true;
      }
      // logger.warn(userId);

      var index = settings.apMaster.indexOf(userId);
      if (isGive) {
        if (index == -1) {
          settings.apMaster.push(userId);
          fs.writeFileSync(
            `${path}/settings.yaml`,
            YAML.stringify(settings),
            "utf8"
          );
          e.reply([
            "成功授予",
            await getName(userId, e),
            `（${userId}）aiPainting插件的管理权限~`,
          ]);
        } else {
          e.reply("笨比，本来就有权限");
        }
      } else {
        if (index > -1) {
          settings.apMaster.splice(index, 1);
          fs.writeFileSync(
            `${path}/settings.yaml`,
            YAML.stringify(settings),
            "utf8"
          );
          e.reply([
            "成功解除",
            await getName(userId, e),
            `（${userId}）的aiPainting插件管理权限~`,
          ]);
        } else {
          e.reply("笨比，本来就没权限");
        }
      }
      return true;
    }

    // 设置撤回是否开启
    else if (/^ap设置撤回(开启|关闭)$/.test(e.msg)) {
      if (!e.isMaster) return false;
      let isOpen = /^ap设置撤回开启$/.test(e.msg);
      if ((isOpen && settings.isRecall) || !(isOpen || settings.isRecall)) {
        e.reply(`笨比，本来就${isOpen ? "开" : "关"}着的`);
        return true;
      }
      settings.isRecall = isOpen;
      fs.writeFileSync(
        `${path}/settings.yaml`,
        YAML.stringify(settings),
        "utf8"
      );
      e.reply(
        `自动撤回已${
          isOpen
            ? `开启，绘制的图片将在延迟${settings.recallTime}秒后`
            : "关闭，绘制的图片将不会"
        }自动撤回`
      );
      return true;
    }

    // 设置自动撤回的时间
    else if (/^ap设置撤回(\d{1,3})$/.test(e.msg)) {
      if (!e.isMaster) return false;
      let time = /^ap设置撤回(\d{1,3})$/g.exec(e.msg)[1] * 1;
      if (time < 5 || time > 120) {
        e.reply("仅支持5到120的整数~");
        return true;
      }
      // logger.info(time);
      settings.recallTime = time;
      fs.writeFileSync(
        `${path}/settings.yaml`,
        YAML.stringify(settings),
        "utf8"
      );
      e.reply(`自动撤回延迟已设置为${time}秒~`);
      return true;
    }

    // 设置本地图片单次最大发送张数
    else if (/^ap设置本地(\d{1,3})$/.test(e.msg)) {
      if (!e.isMaster) return false;
      let num = /^ap设置本地(\d{1,3})$/g.exec(e.msg)[1] * 1;
      settings.localNum = num;
      fs.writeFileSync(
        `${path}/settings.yaml`,
        YAML.stringify(settings),
        "utf8"
      );
      e.reply(`本地图片单次最大发送张数已设置为${num}张~`);
      return true;
    }

    // 设置锁定接口
    else if (/^ap设置接口(锁定|解锁)$/.test(e.msg)) {
      if (!e.isMaster) return false;
      let isOpen = /^ap设置接口解锁$/.test(e.msg);
      if ((isOpen && !settings.lockedAPI) || (!isOpen && settings.isRecall)) {
        e.reply([
          `笨比，本来就是${isOpen ? "解锁" : "锁定"}着的`,
          `${
            settings.lockedAPI
              ? `，\n当前接口已被锁定为：${settings.lockedAPI}`
              : ""
          }`,
        ]);
        return true;
      }
      settings.lockedAPI = isOpen ? "" : settings.usingAPI;
      fs.writeFileSync(
        `${path}/settings.yaml`,
        YAML.stringify(settings),
        "utf8"
      );
      e.reply([
        settings.lockedAPI
          ? `接口已成功锁定为：\n${settings.lockedAPI}\n若接口失效，您可发送“ap设置接口解锁”以解锁接口，发送“ap刷新接口”以刷新接口`
          : "接口已解锁，请求失败时将自动刷新接口",
      ]);
      return true;
    }

    // 设置接口类型
    else if (/^ap设置接口(\d{1,2})$/.test(e.msg)) {
      if (!e.isMaster) return false;
      let num = /^ap设置接口(\d{1,2})$/g.exec(e.msg)[1] * 1;
      if (num < 1 || num > 3) {
        e.reply("没有该接口！");
        return true;
      }
      settings.apiType = num;
      fs.writeFileSync(
        `${path}/settings.yaml`,
        YAML.stringify(settings),
        "utf8"
      );
      e.reply([
        "接口已设置为 ",
        `${
          num == 1
            ? "1：pluto"
            : num == 2
            ? "2：路路"
            : num == 3
            ? "3：路路备用"
            : ""
        }`,
      ]);
      return true;
    }

    // 设置指定接口
    else if (/^ap设置接口(.*)$/.test(e.msg)) {
      if (!e.isMaster) return false;
      let api = /^ap设置接口(.*)$/.exec(e.msg)[1];
      // console.log(api);
      settings.usingAPI = api.trim();
      fs.writeFileSync(
        `${path}/settings.yaml`,
        YAML.stringify(settings),
        "utf8"
      );
      e.reply(["接口已设置为：", settings.usingAPI]);
      return true;
    }

    // 设置重试次数
    else if (/^ap设置重试(\d{1,2})$/.test(e.msg)) {
      if (!e.isMaster) return false;
      let num = /^ap设置重试(\d{1,2})$/g.exec(e.msg)[1] * 1;
      settings.retryTimes = num;
      fs.writeFileSync(
        `${path}/settings.yaml`,
        YAML.stringify(settings),
        "utf8"
      );
      e.reply([`重试次数已设为${num}次`]);
      return true;
    }

    // 设置每人单日使用上限
    else if (/^ap设置次数(无限|(\d{1,3}))$/.test(e.msg)) {
      if (!e.isMaster) return false;
      let num = /^ap设置次数(无限|(\d{1,3}))$/.exec(e.msg)[1];
      // logger.info(num)
      if (num == 0) {
        e.reply("如需关闭绘图功能，可使用“ap设置关闭”命令哦");
        return true;
      }
      if (num == "无限") settings.usageLimit = 0;
      else settings.usageLimit = num * 1;
      fs.writeFileSync(
        `${path}/settings.yaml`,
        YAML.stringify(settings),
        "utf8"
      );
      e.reply(
        `每人单日使用次数上限已设为${
          settings.usageLimit ? settings.usageLimit : "无限"
        }张~`
      );
      return true;
    }

    // 设置鉴黄开关
    else if (/^ap设置鉴黄(开启|关闭)$/.test(e.msg)) {
      let isOpen = /^ap设置鉴黄开启$/.test(e.msg);
      if (
        (isOpen && settings.isJianHuang) ||
        !(isOpen || settings.isJianHuang)
      ) {
        e.reply(`笨比，本来就${isOpen ? "开" : "关"}着的`);
        return true;
      }
      settings.isJianHuang = isOpen;
      fs.writeFileSync(
        `${path}/settings.yaml`,
        YAML.stringify(settings),
        "utf8"
      );
      e.reply(
        `鉴黄已${
          isOpen
            ? `开启，图片发送前将进行鉴黄`
            : "关闭，绘制的图片将直接发送，不再进行审核"
        }`
      );
      return true;
    }

    // 设置路路token  @走着走着就走神了
    else if (/^ap设置token.{32}$/.test(e.msg)) {
      if (!e.isMaster) return false;
      let msg = /^ap设置token.{32}$/g.exec(e.msg)[0];
      let token = msg.substring(msg.length - 32, msg.length);
      logger.info("token", token);
      settings.token = token;
      fs.writeFileSync(
        `${path}/settings.yaml`,
        YAML.stringify(settings),
        "utf8"
      );
      e.reply(`token已成功更改`);
      return true;
    }

    // 设置封禁开关
    else if (/^ap设置封禁(开启|关闭)$/.test(e.msg)) {
      if (!e.isMaster) return false;
      let isOpen = /^ap设置封禁开启$/.test(e.msg);
      if ((isOpen && settings.isBanUser) || !(isOpen || settings.isBanUser)) {
        e.reply(`笨比，本来就${isOpen ? "开" : "关"}着的`);
        return true;
      }
      settings.isBanUser = isOpen;
      fs.writeFileSync(
        `${path}/settings.yaml`,
        YAML.stringify(settings),
        "utf8"
      );
      e.reply(
        `屏蔽词封禁已${
          isOpen ? `开启，将封禁` : "关闭，将放行"
        }使用屏蔽词绘图的用户`
      );
      return true;
    }
    return false;
  }

  // 刷新接口====================
  async refreshAPI(e) {
    if (!(e.isMaster || settings.apMaster.indexOf(e.user_id) > -1))
      return false;
    if (settings.apiType != 1) {
      e.reply(
        "仅接口类型为1时支持刷新接口，您当前使用的接口为：" +
          `${
            settings.apiType == 2
              ? "2:路路"
              : settings.apiType == 3
              ? "3:路路备用"
              : "undefined（这是个bug，请联系渔火反馈）"
          }`
      );
      return true;
    }
    if (settings.lockedAPI) {
      e.reply([
        "当前接口已锁定为",
        settings.lockedAPI,
        ",如需刷新，请发送“ap设置接口解锁”",
      ]);
      return true;
    }
    try {
      let originalAPI = settings.usingAPI;
      let api = await (await fetch("https://api.smoe.me/v1/free")).json();
      api.urls.push("https://23036.gradio.app");
      api.urls.push("https://17206.gradio.app");
      api = api.urls[Math.round(Math.random() * (api.urls.length - 1))];
      settings.usingAPI = api;
      fs.writeFileSync(
        `${path}/settings.yaml`,
        YAML.stringify(settings),
        "utf8"
      );
      e.reply(["成功刷新接口：\n", originalAPI, " ==> ", api]);
    } catch (err) {
      e.reply([
        "【aiPainting】接口刷新失败：",
        JSON.stringify(err, null, "\t"),
      ]);
    }
    return true;
  }

  // 清除cd==============
  async clearCD(e) {
    await redis.del(`Yz:AiPainting`);
    await redis.del(`Yz:AiPainting:${e.group_id}`);
    await redis.del(`Yz:AiPainting:${e.group_id}:${e.user_id}`);
    await redis.del(`Yz:AiPainting:multiPic:${e.user_id}`);
    return true;
  }

  // 查看屏蔽词列表==========
  async BanList(e) {
    badlist = await YAML.parse(
      fs.readFileSync(`${path}/badWords.yaml`, "utf8")
    );
    if (badlist.length == 0) {
      e.reply("当前暂未添加屏蔽词");
      return true;
    }

    var data_msg = [];
    let text = "";
    for (let i = 0; i < badlist.length; i++) {
      text = text + "- " + badlist[i] + "\n";
      if ((i + 1) % 50 == 0) {
        data_msg.push({
          message: text,
          nickname: Bot.nickname,
          user_id: cfg.qq,
        });
        text = "";
      }
    }
    if (text.length) {
      data_msg.push({
        message: text,
        nickname: Bot.nickname,
        user_id: cfg.qq,
      });
    }

    let sendRes = null;
    if (e.isGroup)
      sendRes = await e.reply(await e.group.makeForwardMsg(data_msg));
    else sendRes = await e.reply(await e.friend.makeForwardMsg(data_msg));

    if (!sendRes) {
      e.reply("消息发送失败，可能被风控~");
    }
    return true;
  }

  // 添加违禁词=============
  async Ban(e) {
    if (!(e.isMaster || settings.apMaster.indexOf(e.user_id) > -1))
      return false;
    if (e.msg == "ap屏蔽词列表") return this.BanList(e);
    let word = e.msg.replace("ap屏蔽", "").trim();
    if (!word) return false;
    // 读取词列表
    badlist = await YAML.parse(
      fs.readFileSync(`${path}/badWords.yaml`, "utf8")
    );
    // 如果已经存在该词
    if (badlist.indexOf(word) != -1) {
      e.reply("该屏蔽词已存在");
      return true;
    }
    badlist.push(word);
    fs.writeFileSync(`${path}/badWords.yaml`, YAML.stringify(badlist), "utf8");
    e.reply(["成功添加屏蔽词：", word]);
    return true;
  }

  // 解除屏蔽违禁词===================
  async unBan(e) {
    let word = e.msg.replace(/^ap(放行|解除屏蔽)/, "").trim();
    if (!word) return false;
    // 读取词列表
    badlist = await YAML.parse(
      fs.readFileSync(`${path}/badWords.yaml`, "utf8")
    );
    // 查找该词
    var index = badlist.indexOf(word);
    // 删除该词
    if (index > -1) {
      badlist.splice(index, 1);
      // 写文件
      fs.writeFileSync(
        `${path}/badWords.yaml`,
        YAML.stringify(badlist),
        "utf8"
      );
      e.reply(["成功删除屏蔽词：", word]);
    } else {
      e.reply("该词汇不在屏蔽列表中");
    }
    return true;
  }

  // 检查文本中是否包含违禁词=============
  async check(msg) {
    for (let val of badlist) {
      var re = new RegExp(val, `i`);
      while (re.exec(msg)) {
        // logger.info(re.exec(msg))
        corrected[this.e.user_id] = re.exec(msg)[0];
        msg = await msg.replace(re.exec(msg)[0], "");
      }
    }
    return msg;
  }
}
// 使用百度图片鉴黄==========
async function jianhuang(picPath, e) {
  try {
    // 创建百度图像识别client
    const require = createRequire(import.meta.url);
    var AipContentCensorClient = require("baidu-aip-sdk").contentCensor;
    var baiduJianhuangClient = new AipContentCensorClient(
      APP_ID,
      API_KEY,
      SECRET_KEY
    );

    let bitMap = fs.readFileSync(picPath);
    let base64Img = Buffer.from(bitMap, "binary").toString("base64");
    return await baiduJianhuangClient
      .imageCensorUserDefined(base64Img, "base64")
      .then(async function (data) {
        logger.info("【aiPainting鉴黄返回结果】", data);
        if (data.error_code == 14) {
          e.reply(
            [
              "【aiPainting鉴黄】：IAM认证失败，请确认你的百度图片审核apikey有效并且填写正确。\n\napikey获取教程：https://www.wolai.com/x3bbeHstB15LAge9jdqr6y\n获取后打开resources/yuhuo/aiPainting/settings.yaml，填写在如图位置并重启：",
              segment.image(
                `base64://UklGRpgFAABXRUJQVlA4IIwFAABwHgCdASrXAD8AP12aw1iyqygjrbFeOlAriWYAz/c+8+Tz/76P+ptmDGInz25fwd/qdaa0Uf8fNlx+nJDSjSscmt/Ch99Eo0pg/sKWi3J7p2Xzs1FRfSl0Zoc2NZHzjK+y2hb4OkXhwpF1XT0KEeK9zLBTXGUMZK+9G9nmQYiNbnwexmVp1phXV60QXcTTgc9Dd7rKFcz9U2X4kIlgU57bRD8XRHGtMhmLgXQ0m4Q2wCntCTpLR89UiOStYjkPYXk1MCcpzI4LhQSQPeuC170gf3q4gsZQUpzi57ofdYYMor2Aw8rIw8AHuJmHwROe/v/kcjLt4ugQ/HXa8YAA/tNWHNhKObfO2mMREfdxXNr4Zlm4+KtWxpnFRm/PBmxNUI1l/u2nUzA+SMDMKBANNTk2fPrxcWmz67huf5MmdSvIdM6GfDCoB/OLrDigOnxLVXsSar9xVpqqtAP2pADgEj/IBFJl+An59n02Jb1JbIVAlK5+MJmAkYx/exLQbV6TVl4l4coMRZjV6sLRIuhSVIZMYZKiYVQQnCOqOqkMRHvUgtPiUroZCSTfsyQpwsghex5Fc+hnrM8MSOWUOQ+Kjvhk8h8wU4dKwYKljECXr9Zye/j5vxgcAW1CYsq0bQ0r2OrDeh/ZQQOXxoebDhdSh1msH8bH/LIaubps7a9G5Nziy6CWS4KG7ImpHDzmC9cre5YJLh1SZATMRJ2BosJ89RfAMznvHWevy+KYDtWZONDzDOLvS/rRAfH06BPnDU26ef4IHVdl4d2PBzkWY3aN65cXxKULZkwpXAKpjaAghALPiUqmsalFGqsBw+7yqdf6Cd6lse2skiqO4KmvmYZEDThfMOVLDzfZvF2t60oQ8e9Uok0A62FMy09Sxyy5IDoIn8p0eh0Sg3y05t9hrD8aUOJkutFEmH+u9YPxOMybA/cGyBdLVOe3wznwp+5/oHgXj+/+NscOrgDST3bdG49PAqChZ4RmQC7vBCw/8ifVJ8BaYTOE/BVq3tTuuRVvMZtQLkhDFS8ZKrMAl1hDdc7CTQOkVY2AZ0RsB8TLbAwGfA0/KjE/FL8h0I9/73/rUqrpaSFYxLvH87EWLSpCqg9SudMQxK+Xr+DTONx/UBF2IPF3Djgle+mWwIRU9HxW/qJo/Zg3tokmHOWAjZUQRMt6c7D8be8xs2PPiUEWKedn625Dm/Iw6oG+MuM0juaaNGijyVXMweDgYZKrs7yRNqnkdvHI3e/2U7GIcWbCx3ZQYNQos1etC8iqzRvsYant+maosvWUI5E/IUAN/s1TqQt4jtYsR9ao65KTxdR54Z2jja2k/Rk4X/odd9IlHW5W5HO7DX0XFBEwMj+SnWPXRo43LthB8q5104VPV36mW7uBMYxtK6Qc2FFYM1uuIOhdICKq62olQb+Z9N4OIA7x1cVr0jPgyo/anTQBiYdxUveyU71r8l+4fP75PFt9nqxxQnTz36rUJxgo5EDW3znwYNoOMwNINukS9d2iK+6gdiiBoX/fUILG2EKzhr/JfIspib9YpcQTFLxvz7l70ibFVKf90DaBZ6Ij5xeJ7RWeH2rTrrS2pB7803ie5IH19inR0r0Okp+NwmtcelWzRsvMpvlkn893a7udjEIVfzYeiMWlzUu33Gi984wikbnIMNujuOzw/KKrrbKc26o7W8QTJGrAcW6UJOcfh6lSAUzUhzN68BC9O6zwCzXr47MehiHSws57NGTYvca8LDzQfAqCWxJiTkf1Cdr8zO8TCiHyg6AiYO5yHTbuMw3ImaHKDIY3tNFFGDpbha449DF+dIA/ZPBfl2yYWjRbGs9TMGukhjYBPF2I5J/gtgNgY9xa8Rz8aDU6Vym9vDbqCgFAhRdcDZb8NgDS1RXe/JEPmDrlAAAA`
              ),
              "\n\n您可发送“ap设置鉴黄关闭”，以停用鉴黄功能",
            ],
            true
          );
          return 404;
        } else if (data.error_code == 18) {
          e.reply(
            [
              "【aiPainting】：触发QPS限制。可能是请求频率过高，或你没有在百度云控制台开通“内容审核-图像”资源，或开通时间过短（小于15分钟）",
            ],
            true
          );
          return 404;
        } else if (data.error_code == 216201 || data.conclusion == "审核失败") {
          if (settings.apiType == 1) {
            logger.warn(
              "【aiPainting鉴黄】pluto接口返回图片文件损坏，将尝试自动刷新接口"
            );
            // refreshapi_();
          } else {
            logger.warn("【aiPainting鉴黄】路路接口返回图片文件损坏");
          }
          return 502;
        } else if (data.conclusionType == 2 || data.conclusionType == 3)
          return 114514;
        else return false;
      });
  } catch (err) {
    e.reply(JSON.stringify(err, null, "\t"));
    await common.sleep(1000);
    e.reply(
      "【aiPainting】：百度图像审核服务调用失败，请确认你已安装所需依赖。依赖安装方法：执行\npnpm add baidu-aip-sdk -w\n或\ncnpm i baidu-aip-sdk\n\n※注意，有部分用户反馈安装此依赖会掉其他依赖，请谨慎安装。\n如遇掉依赖，请按照控制台相关提醒依次重新安装依赖\n\n※若无需使用鉴黄功能，您也可以发送“ap设置鉴黄关闭”以停用鉴黄，绘制的图片将直接发送，不再审核。"
    );
    return 404;
  }
}

async function refreshapi_() {
  try {
    let originalAPI = settings.usingAPI;
    let api = await (await fetch("https://api.smoe.me/v1/free")).json();
    api.urls.push("https://23036.gradio.app");
    api.urls.push("https://17206.gradio.app");
    settings.usingAPI =
      api.urls[Math.round(Math.random() * (api.urls.length - 1))];
    fs.writeFileSync(`${path}/settings.yaml`, YAML.stringify(settings), "utf8");
    logger.warn("成功刷新接口：", originalAPI, " ==> ", api);
  } catch (err) {}
}

// 初始化文件=====================
async function initfile() {
  await initPath(path);
  initPath(path + "/pictures");
  initPath(path + "/pictures/temp");
  initPath(path + "/help");
  if (!fs.existsSync(`${path}/badWords.yaml`)) {
    Bot.pickUser(cfg.masterQQ[0]).sendMsg(
      "【aiPainting】：此插件性质特殊，目前仅在小范围点对点共享，\n请勿传播"
    );
    fs.writeFileSync(
      `${path}/badWords.yaml`,
      YAML.stringify(["naked", "nsfw"]),
      "utf8"
    );
  }
  if (!fs.existsSync(`${path}/preSet.yaml`)) {
    Bot.pickUser(cfg.masterQQ[0]).sendMsg(
      "【aiPainting】：指令较多，您可发送“ap说明书”以查看使用手册，发送“ap设置”以查看当前设置"
    );
    fs.writeFileSync(`${path}/preSet.yaml`, YAML.stringify({}), "utf8");
  }
  if (!fs.existsSync(`${path}/settings.yaml`)) {
    Bot.pickUser(cfg.masterQQ[0]).sendMsg(
      "【aiPainting】：插件各项设置保存在/resources/yuhuo/aiPainting/settings.yaml中，\n如需使用接口2或接口3，请将绘图token填写至该文件对应位置；\n如需使用鉴黄服务，请将百度apiKey填写至该文件对应位置"
    );
    fs.writeFileSync(
      `${path}/settings.yaml`,
      YAML.stringify({
        cd: {
          global: 11,
          group: 15,
          person: 30,
        },
        localNum: 20,
        isRecall: false,
        recallTime: 30,
      }),
      "utf8"
    );
  }
}

// 更新文件==========
async function updatefile() {
  // 后续新增的条目
  let newObj = {
    isJianHuang: true,
    isBanUser: true,
    usageLimit: 20,
    bandUsers: [],
    enabledGroups: [],
    token: "public_token",
    appid: "Your_App_ID",
    apikey: "Your_Api_Key",
    secretkey: "Your_Secret_Key",
    retryTimes: 10,
    apiType: 1,
    usingAPI: "https://23860.gradio.app",
    lockedAPI: "",
    apMaster: [],
  };
  // 将新增的键值对写入文件
  for (var newkey in newObj) {
    let existed = false;
    for (var key in settings) {
      if (key == newkey) {
        existed = true;
        break;
      }
    }
    if (!existed) {
      settings[newkey] = newObj[newkey];
    }
  }
  try {
    delete settings[bandGroups];
  } catch (err) {}
  fs.writeFileSync(`${path}/settings.yaml`, YAML.stringify(settings));
  return true;
}

// 初始化路径 =======================
async function initPath(thisPath) {
  if (fs.existsSync(thisPath)) return true;
  // 取上一级路径
  let symbol = "/";
  if (os.platform() == "win32") symbol = "/";
  let upperPath = thisPath.split(symbol);
  upperPath.splice(-1);
  upperPath = upperPath.join(symbol);
  // 如果不存在上一级路径则递归处理
  if (!fs.existsSync(upperPath)) await initPath(upperPath);
  // 创建本级路径
  fs.mkdirSync(thisPath);
}

// 获取QQ的昵称
async function getName(qq, e) {
  if (e.isGroup) {
    try {
      let member = await Bot.getGroupMemberInfo(e.group_id, qq);
      // logger.info("member:", member)
      if (member != undefined)
        return member.card
          ? member.card
          : member.nickname
          ? member.nickname
          : qq;
    } catch (err) {}
  }
  let user = await Bot.pickUser(qq).getSimpleInfo();
  return user.nickname ? user.nickname : qq;
}
