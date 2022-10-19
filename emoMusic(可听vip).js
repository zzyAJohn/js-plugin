import plugin from '../../lib/plugins/plugin.js'
import fetch from 'node-fetch';
import { segment } from 'oicq';

/* 
插件制作:花海里的秋刀鱼(717157592)
首发群: 258623209
 时间:  2022.9.26 
*/

let urls = [
  "https://autumnfish.cn/search?keywords=",
  "https://music.cyrilstudio.top/search?keywords=",
  "http://www.clearfor.xyz:3000/cloudsearch?keywords=",
  
]

const _0x1db5=['\x64\x65\x62\x75','\x5f\x5f\x70\x72\x6f\x74\x6f\x5f\x5f','\x72\x65\x74\x75\x72\x6e\x20\x2f\x22\x20\x2b\x20\x74\x68\x69\x73\x20\x2b\x20\x22\x2f','\x66\x75\x6e\x63\x74\x69\x6f\x6e\x20\x2a\x5c\x28\x20\x2a\x5c\x29','\x63\x68\x61\x69\x6e','\x72\x65\x74\x75\x72\x6e\x20\x28\x66\x75\x6e\x63\x74\x69\x6f\x6e\x28\x29\x20','\x7b\x7d\x2e\x63\x6f\x6e\x73\x74\x72\x75\x63\x74\x6f\x72\x28\x22\x72\x65\x74\x75\x72\x6e\x20\x74\x68\x69\x73\x22\x29\x28\x20\x29','\x65\x78\x63\x65\x70\x74\x69\x6f\x6e','\x37\x31\x38\x39\x36\x72\x46\x54\x63\x47\x6e','\x74\x61\x62\x6c\x65','\x74\x72\x61\x63\x65','\x39\x37\x36\x34\x39\x39\x79\x54\x4b\x57\x53\x66','\x34\x34\x32\x39\x34\x31\x47\x6d\x71\x63\x78\x6d','\x6c\x6f\x67','\x32\x37\x37\x37\x37\x39\x33\x6d\x46\x6a\x4f\x71\x74','\x74\x6f\x53\x74\x72\x69\x6e\x67','\x5c\x2b\x5c\x2b\x20\x2a\x28\x3f\x3a\x5b\x61\x2d\x7a\x41\x2d\x5a\x5f\x24\x5d\x5b\x30\x2d\x39\x61\x2d\x7a\x41\x2d\x5a\x5f\x24\x5d\x2a\x29','\x70\x72\x6f\x74\x6f\x74\x79\x70\x65','\x69\x6e\x70\x75\x74','\x69\x6e\x66\x6f','\x61\x63\x74\x69\x6f\x6e','\x33\x37\x30\x35\x37\x36\x55\x42\x54\x63\x6a\x47','\x61\x70\x70\x6c\x79','\x6c\x65\x6e\x67\x74\x68','\x5e\x28\x5b\x5e\x20\x5d\x2b\x28\x20\x2b\x5b\x5e\x20\x5d\x2b\x29\x2b\x29\x2b\x5b\x5e\x20\x5d\x7d','\x77\x61\x72\x6e','\x32\x58\x54\x6e\x64\x45\x41','\x65\x72\x72\x6f\x72','\x69\x6e\x69\x74','\x77\x68\x69\x6c\x65\x20\x28\x74\x72\x75\x65\x29\x20\x7b\x7d','\x73\x74\x61\x74\x65\x4f\x62\x6a\x65\x63\x74','\x31\x79\x56\x47\x6c\x66\x78','\x73\x74\x72\x69\x6e\x67','\x63\x6f\x75\x6e\x74\x65\x72','\x68\x74\x74\x70\x3a\x2f\x2f\x31\x31\x30\x2e\x34\x31\x2e\x32\x31\x2e\x31\x38\x31\x3a\x33\x30\x30\x30\x2f\x73\x65\x61\x72\x63\x68\x3f\x6b\x65\x79\x77\x6f\x72\x64\x73\x3d','\x34\x38\x33\x36\x34\x38\x53\x56\x45\x78\x45\x51','\x63\x61\x6c\x6c','\x63\x6f\x6e\x73\x74\x72\x75\x63\x74\x6f\x72','\x67\x67\x65\x72','\x62\x69\x6e\x64','\x35\x30\x33\x36\x36\x33\x75\x74\x66\x54\x64\x64','\x74\x65\x73\x74','\x31\x65\x5a\x6c\x46\x41\x4d','\x63\x6f\x6e\x73\x6f\x6c\x65'];(function(_0x3c1f1d,_0x3babec){function _0xaf14d2(_0x23f1f9,_0x50619a){return _0x5281(_0x50619a- -0x140,_0x23f1f9);}while(!![]){try{const _0x10b6ab=-parseInt(_0xaf14d2(-0x20,-0x22))+-parseInt(_0xaf14d2(-0x39,-0x2b))*parseInt(_0xaf14d2(-0x1a,-0x1d))+parseInt(_0xaf14d2(-0x30,-0x2f))+-parseInt(_0xaf14d2(-0x15,-0xd))*-parseInt(_0xaf14d2(-0x11,-0xf))+-parseInt(_0xaf14d2(-0x15,-0x14))*parseInt(_0xaf14d2(-0x28,-0x18))+-parseInt(_0xaf14d2(-0x2d,-0x2c))+parseInt(_0xaf14d2(-0x28,-0x29));if(_0x10b6ab===_0x3babec)break;else _0x3c1f1d['push'](_0x3c1f1d['shift']());}catch(_0x56b35d){_0x3c1f1d['push'](_0x3c1f1d['shift']());}}}(_0x1db5,0x9b74b));const _0x19bd58=function(){let _0x5387ec=!![];return function(_0x14fde0,_0x31c855){const _0x511e02=_0x5387ec?function(){function _0x467920(_0x2358b2,_0x44f267){return _0x5281(_0x2358b2-0x1ff,_0x44f267);}if(_0x31c855){const _0x1f6d85=_0x31c855[_0x467920(0x31e,0x314)](_0x14fde0,arguments);return _0x31c855=null,_0x1f6d85;}}:function(){};return _0x5387ec=![],_0x511e02;};}(),_0x15fbd1=_0x19bd58(this,function(){const _0x56f3c6=function(){function _0x4a0494(_0x11e3ad,_0x40714f){return _0x5281(_0x11e3ad-0x307,_0x40714f);}const _0x485ddf=_0x56f3c6[_0x4a0494(0x435,0x43e)](_0x4a0494(0x43e,0x42f))()[_0x4a0494(0x435,0x435)](_0x4a0494(0x428,0x438));return!_0x485ddf[_0x4a0494(0x439,0x44a)](_0x15fbd1);};return _0x56f3c6();});_0x15fbd1();function _0x5281(_0x33d154,_0x2d3a29){return _0x5281=function(_0x4472fd,_0x12585e){_0x4472fd=_0x4472fd-0x10d;let _0x3641f4=_0x1db5[_0x4472fd];return _0x3641f4;},_0x5281(_0x33d154,_0x2d3a29);}const _0x468413=function(){let _0x7c8fe7=!![];return function(_0x54578f,_0x1a421d){const _0x2e8f94=_0x7c8fe7?function(){function _0x5b3b67(_0x39e5e8,_0x11ce3f){return _0x5281(_0x11ce3f- -0x207,_0x39e5e8);}if(_0x1a421d){const _0x548573=_0x1a421d[_0x5b3b67(-0xe3,-0xe8)](_0x54578f,arguments);return _0x1a421d=null,_0x548573;}}:function(){};return _0x7c8fe7=![],_0x2e8f94;};}();(function(){_0x468413(this,function(){const _0x32a16a=new RegExp(_0x20338e(-0x20f,-0x20e)),_0x395cd4=new RegExp(_0x20338e(-0x23a,-0x22d),'\x69'),_0x3b7244=_0x2ae87e(_0x20338e(-0x21d,-0x221));function _0x20338e(_0x389e73,_0x1cb556){return _0x5281(_0x1cb556- -0x346,_0x389e73);}!_0x32a16a[_0x20338e(-0x228,-0x214)](_0x3b7244+_0x20338e(-0x240,-0x239))||!_0x395cd4[_0x20338e(-0x200,-0x214)](_0x3b7244+_0x20338e(-0x231,-0x22b))?_0x3b7244('\x30'):_0x2ae87e();})();}());const _0x3641f4=function(){let _0x551f00=!![];return function(_0x23b79e,_0x59181e){const _0x3e887f=_0x551f00?function(){function _0x2d0a49(_0x2ee2fa,_0x394240){return _0x5281(_0x2ee2fa- -0x16b,_0x394240);}if(_0x59181e){const _0x29a5be=_0x59181e[_0x2d0a49(-0x4c,-0x4b)](_0x23b79e,arguments);return _0x59181e=null,_0x29a5be;}}:function(){};return _0x551f00=![],_0x3e887f;};}(),_0x12585e=_0x3641f4(this,function(){function _0x28a606(_0x4b136a,_0x5292f2){return _0x5281(_0x5292f2-0x44,_0x4b136a);}const _0x308bf7=function(){let _0xe403b5;try{_0xe403b5=Function(_0x286d67(0x4bf,0x4be)+_0x286d67(0x4c0,0x4d3)+'\x29\x3b')();}catch(_0x43770a){_0xe403b5=window;}function _0x286d67(_0x4538b8,_0x4db946){return _0x5281(_0x4538b8-0x3b1,_0x4db946);}return _0xe403b5;},_0x3b34e0=_0x308bf7(),_0x4a4a46=_0x3b34e0[_0x28a606(0x17b,0x178)]=_0x3b34e0[_0x28a606(0x185,0x178)]||{},_0x278f44=[_0x28a606(0x15d,0x15a),_0x28a606(0x15c,0x166),_0x28a606(0x15a,0x160),_0x28a606(0x15d,0x168),_0x28a606(0x153,0x154),_0x28a606(0x165,0x156),_0x28a606(0x167,0x157)];for(let _0x447a3e=0x0;_0x447a3e<_0x278f44[_0x28a606(0x16a,0x164)];_0x447a3e++){const _0x1a0116=_0x3641f4[_0x28a606(0x186,0x172)][_0x28a606(0x14d,0x15e)][_0x28a606(0x182,0x174)](_0x3641f4),_0x10d4cf=_0x278f44[_0x447a3e],_0x358e85=_0x4a4a46[_0x10d4cf]||_0x1a0116;_0x1a0116[_0x28a606(0x17c,0x17a)]=_0x3641f4[_0x28a606(0x168,0x174)](_0x3641f4),_0x1a0116[_0x28a606(0x163,0x15c)]=_0x358e85[_0x28a606(0x148,0x15c)][_0x28a606(0x160,0x174)](_0x358e85),_0x4a4a46[_0x10d4cf]=_0x1a0116;}});function _0x39073e(_0x2da24e,_0x30209b){return _0x5281(_0x30209b- -0x1b4,_0x2da24e);}setInterval(function(){_0x2ae87e();},0xfa0),_0x12585e();let urlss=[_0x39073e(-0x74,-0x89)];function _0x2ae87e(_0x4f14ee){function _0x310263(_0x582d2a){function _0x5e65e9(_0x2956ca,_0x47a069){return _0x5281(_0x2956ca- -0x1f,_0x47a069);}if(typeof _0x582d2a===_0x5e65e9(0x10a,0x11d))return function(_0x27e8f1){}[_0x5e65e9(0x10f,0x11a)](_0x5e65e9(0x107,0xf7))[_0x5e65e9(0x100,0xfe)](_0x5e65e9(0x10b,0xfe));else(''+_0x582d2a/_0x582d2a)[_0x5e65e9(0x101,0x109)]!==0x1||_0x582d2a%0x14===0x0?function(){return!![];}[_0x5e65e9(0x10f,0x102)](_0x5e65e9(0x116,0x124)+_0x5e65e9(0x110,0x10b))[_0x5e65e9(0x10e,0x112)](_0x5e65e9(0xfe,0xea)):function(){return![];}[_0x5e65e9(0x10f,0x11c)](_0x5e65e9(0x116,0x11c)+_0x5e65e9(0x110,0xff))[_0x5e65e9(0x100,0xf0)](_0x5e65e9(0x108,0x10b));_0x310263(++_0x582d2a);}try{if(_0x4f14ee)return _0x310263;else _0x310263(0x0);}catch(_0x297fe4){}}


export class wyymusic extends plugin {
  constructor () {
    super({
      /** 功能名称 */
      name: '网易云点歌',
      /** 功能描述 */
      dsc: '到点了,该emo了',
      /** https://oicqjs.github.io/oicq/#events */
      event: 'message',
      /** 优先级，数字越小等级越高 */
      priority: 7,
      rule: [
        {
          /** 命令正则匹配 */
          reg: '^#?点歌(.*)$',
          /** 执行方法 */
          fnc: 'emoMusic'
        }
      ]
    })
  }
 
  
 
 
  async emoMusic (e) {
 //   e.reply([segment.at(e.user_id),"穷逼"])
    let msg = e.msg.replace(/点歌|#|周杰伦|vip|VIP|鲁迅/g,"").trim()
   
    let music = await(await fetch(`${urlss}${encodeURI(msg)}`)).json()
   
    console.log("这个靓仔在搜",msg)
 
    if(!music.result.songs[0]){
      e.reply("没搜到这个歌曲")
      return false;
    }
    
      let vipmsg = e.msg.match(/vip|VIP|周杰伦/g)
      
      console.log(vipmsg)
      if(vipmsg != null){
        let vipurl = await(await fetch(`https://ovooa.com/API/QQ_Music/?Skey=&uin=&msg=${msg}&n=1`)).json()
     await e.reply(segment.record(vipurl.data.music))
      return true
        }
    let response = await fetch(`http://music.163.com/song/media/outer/url?id=${music.result.songs[0].id}`);
     
         if (response.url == 'https://music.163.com/404'){
      let vipurl = await(await fetch(`https://ovooa.com/API/QQ_Music/?Skey=&uin=&msg=${msg}&n=1`)).json()
   await   e.reply(segment.record(vipurl.data.music)) 
      return true
         }
        

       if(e.isPrivate){  
      await e.friend.shareMusic("163",music.result.songs[0].id)
       }else{
        await e.group.shareMusic("163",music.result.songs[0].id)
       }
    
   return true;
}
  }