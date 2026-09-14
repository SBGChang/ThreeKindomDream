// Authored first-edition Shu chapter scenes. Edit here; runtime never reads design documents.
export const shuScript = [
  {
    "stages": [
      "關外亂兵",
      "友軍缺口",
      "華雄前陣",
      "斷旗坡",
      "西涼騎陣",
      "呂布前鋒",
      "呂布突擊"
    ],
    "title": "虎牢相逢：沒有自己的營，也有自己的兄弟",
    "opening": "盟軍帳外，張飛正為分不到軍糧吵得滿臉通紅。劉備把自己的餅掰成幾份，連你的那份也算進去：「先吃。餓著，可守不住旗。」",
    "nodes": [
      {
        "turn": 2,
        "options": [
          {
            "label": "請戰救受困友軍",
            "consequence": "你帶兵補入缺口，關羽抬刀與你並行：「跟好。」結果：記護民，保住友軍隊伍。",
            "id": "rescue"
          },
          {
            "label": "修整破損軍械",
            "consequence": "你把各營丟棄的兵器修成能用的傢伙。張飛試了槍，大笑：「這下不欠他們了！」結果：後勤／軍械路線前置。",
            "id": "repair"
          }
        ],
        "title": "輪不到的軍功",
        "id": "S1.A"
      },
      {
        "turn": 6,
        "options": [
          {
            "label": "把傷兵記入自己名簿",
            "consequence": "劉備看完，將名簿合上：「都算我們的。」結果：記護民。",
            "id": "shelter"
          },
          {
            "label": "教新隊長分段接防",
            "consequence": "你讓隊長輪流守旗，關羽第一次直接向他們交代任務；記交接。",
            "id": "handover"
          }
        ],
        "title": "沒人認領的傷兵",
        "id": "S1.B"
      }
    ],
    "code": "S1",
    "slug": "hulao"
  },
  {
    "stages": [
      "城外哨營",
      "糧道",
      "城門爭奪",
      "巷戰",
      "家眷護送",
      "追騎",
      "突圍接應"
    ],
    "title": "徐州風雨：我們總得有個家",
    "opening": "城裡第一次有人喊你們「自家兵」。張飛高興得在地圖上圈出酒坊，趙雲卻先圈了井與城門：「守住這些，他們才喊得久。」",
    "nodes": [
      {
        "turn": 2,
        "options": [
          {
            "label": "修倉安置流民",
            "consequence": "你把可耕地與糧種一併造冊；記護民，仁政國策前置。",
            "id": "granary"
          },
          {
            "label": "重整城防隊伍",
            "consequence": "你把新舊部曲編入共同守備；軍事國策前置。",
            "id": "defend"
          }
        ],
        "title": "新領地的第一件事",
        "id": "S2.A"
      },
      {
        "turn": 6,
        "options": [
          {
            "label": "分路護送家眷",
            "consequence": "你親自折返最後一條巷子，帶出困住的百姓；記護民。",
            "id": "shelter"
          },
          {
            "label": "讓年輕隊長領一支撤隊",
            "consequence": "你給他真實權責，趙雲護住另一翼；記交接。",
            "id": "handover"
          }
        ],
        "title": "守城失利，必須撤走",
        "id": "S2.B"
      }
    ],
    "code": "S2",
    "slug": "xuzhou"
  },
  {
    "stages": [
      "村口散兵",
      "廢車道",
      "追騎",
      "橋前陣",
      "張飛側翼",
      "渡口護送",
      "趙雲歸途接應"
    ],
    "title": "長坂：回頭的那一騎",
    "opening": "諸葛亮第一次把地圖攤到你面前。你還沒聽完那個遙遠的天下，斥候已帶來追兵的消息。趙雲翻身上馬：「大的計畫先放著。眼前這些人，得先過河。」",
    "nodes": [
      {
        "turn": 2,
        "options": [
          {
            "label": "折返接人",
            "consequence": "你領步卒拆車架、架便橋，為趙雲留接應點；記護民。",
            "id": "rescue"
          },
          {
            "label": "奪側翼高地",
            "consequence": "你用旗號引走部分追騎，張飛得以縮短正面防線；軍事前置。",
            "id": "flank"
          }
        ],
        "title": "道路被車隊堵死",
        "id": "S3.A"
      },
      {
        "turn": 6,
        "options": [
          {
            "label": "留舟接最後一隊",
            "consequence": "劉備已催你登船，你把纜繩重新扣回樁上：「還有一隊。」記護民。",
            "id": "shelter"
          },
          {
            "label": "交新隊長維持渡序",
            "consequence": "你去接趙雲，他接住渡口；記交接。",
            "id": "handover"
          }
        ],
        "title": "到渡口後",
        "id": "S3.B"
      }
    ],
    "code": "S3",
    "slug": "changban"
  },
  {
    "stages": [
      "江口前哨",
      "曹軍游舟",
      "南岸營",
      "火線側翼",
      "聯軍接應",
      "曹軍退道",
      "江陵外圍"
    ],
    "title": "赤壁借勢：有人願與我們同戰",
    "opening": "江東帳上有人問，劉備還剩多少兵。你正要起身，魯肅先將兩張地圖推在一起：「先問，合在一起能做什麼。」諸葛亮朝你點頭。",
    "nodes": [
      {
        "turn": 2,
        "options": [
          {
            "label": "定下互援與通航約章",
            "consequence": "共同確認糧船、軍使與撤退通道，具體到旗號和停靠處。結果：D-S1 第一準備。",
            "id": "pact"
          },
          {
            "label": "優先爭取己方作戰空間",
            "consequence": "確保劉備軍有可立功的戰線。結果：軍事國策前置；維持普通聯盟。",
            "id": "position"
          }
        ],
        "title": "聯軍約定",
        "id": "S4.A"
      },
      {
        "turn": 6,
        "options": [
          {
            "label": "自領救援船隊",
            "consequence": "你照盟約接起兩軍落水者；記護民。",
            "id": "shelter"
          },
          {
            "label": "讓兩軍副將共掌接應",
            "consequence": "一支旗令就能叫動兩家的舟船；記交接，培養跨營信任。",
            "id": "handover"
          }
        ],
        "title": "火起時誰去接人",
        "id": "S4.B"
      }
    ],
    "code": "S4",
    "slug": "chibi"
  },
  {
    "stages": [
      "山口營",
      "涪城外道",
      "雒城前陣",
      "險隘",
      "成都糧路",
      "城外精兵",
      "護民入城"
    ],
    "title": "入蜀：讓天下之計有一個落腳處",
    "opening": "龐統把成都的位置一指：「地方很好，問題是人家還住在裡頭。」劉備沉默片刻，望向你：「進城之後，得讓人知道我們為何而來。」",
    "nodes": [
      {
        "turn": 2,
        "options": [
          {
            "label": "保留地方糧籍，修復水利",
            "consequence": "不因換旗打散耕作，為新政提供基礎；記護民、仁政前置。",
            "id": "granary"
          },
          {
            "label": "先穩住山口與武庫",
            "consequence": "整編交通與軍備，為漢中提供軍事前置。",
            "id": "arsenal"
          }
        ],
        "title": "進軍以後怎麼生活",
        "id": "S5.A"
      },
      {
        "turn": 6,
        "options": [
          {
            "label": "讓新舊官吏共同交接",
            "consequence": "你不把所有公文收進自己案上，明定各署承辦；記交接，D-S2 第一準備。",
            "id": "handover"
          },
          {
            "label": "由自己巡迴統籌",
            "consequence": "迅速處理急務，取得當章收益；分工改命尚缺前置。",
            "id": "personal"
          }
        ],
        "title": "把事情交給誰",
        "id": "S5.B"
      }
    ],
    "code": "S5",
    "slug": "yizhou"
  },
  {
    "stages": [
      "山麓哨寨",
      "弩台",
      "定軍山隘",
      "黃忠接戰",
      "曹軍糧道",
      "反攻精銳",
      "漢水接應"
    ],
    "title": "漢中：這座山，我們一起拿下",
    "opening": "黃忠試弓時，年輕人還在估山有多高。他放下弓，對你說：「我只管前頭那一箭。後頭的事，信你。」",
    "nodes": [
      {
        "turn": 2,
        "options": [
          {
            "label": "開漢中至荊州的接力聯絡",
            "consequence": "預留關津、驛舟與援軍名額，放棄一份當章進攻獎勵；D-S1 第二準備。",
            "id": "corridor"
          },
          {
            "label": "集中精兵奪山",
            "consequence": "支援黃忠與法正的突破方案；軍事國策前置。",
            "id": "assault"
          }
        ],
        "title": "山戰與後路",
        "id": "S6.A"
      },
      {
        "turn": 6,
        "options": [
          {
            "label": "建立可替換的糧運班底",
            "consequence": "讓蔣琬等人能在無主帥逐筆批示時運轉後勤；記交接，D-S2 第二準備。",
            "id": "handover"
          },
          {
            "label": "由你親守前線倉道",
            "consequence": "強化當章前線供給；軍事國策前置。",
            "id": "guard"
          }
        ],
        "title": "誰掌握糧道",
        "id": "S6.B"
      }
    ],
    "code": "S6",
    "slug": "hanzhong"
  },
  {
    "stages": [
      "漢水哨線",
      "斷信驛",
      "江陵外道",
      "夜渡口",
      "散兵接應",
      "麥城外圍",
      "關羽突圍"
    ],
    "title": "荊州烽火：二哥，這次換我來接你",
    "opening": "最初是捷報，接著是斷信，最後只有一個滿身泥水的傳令兵。帳內突然安靜。你展開早已備好的水路圖，手指落在麥城之外。",
    "nodes": [
      {
        "turn": 2,
        "options": [
          {
            "label": "啟用盟約與接力水路",
            "consequence": "需 S4.A=`pact`、S6.A=`corridor`，才能啟動完整 D-S1 挑戰。你把令旗往案上一按：「我知道他在哪裡。」無準備時可救散兵，明示尚不能救關羽。",
            "id": "rescue"
          },
          {
            "label": "集中保住西岸防線",
            "consequence": "穩定蜀軍退路，走常規命運，不把選項寫成懦弱。",
            "id": "defend"
          }
        ],
        "title": "今夜是否出援",
        "id": "S7.A"
      },
      {
        "turn": 6,
        "options": [
          {
            "label": "以活人為先，重修盟約",
            "consequence": "若救援成功，關羽與你一起交出報復軍令，換俘虜與停戰；D-S1 完整收束。若未成功，演劉備東征、夷陵受挫後接受此約。",
            "id": "pact"
          },
          {
            "label": "交下一代整訓國軍",
            "consequence": "記交接。成功救援後未締新約只算階段改寫；常規線則在夷陵之後保留部曲與經驗，不永久封死下一章。",
            "id": "handover"
          }
        ],
        "title": "戰後要追回什麼",
        "id": "S7.B"
      }
    ],
    "code": "S7",
    "slug": "jingzhou"
  },
  {
    "stages": [
      "祁山外寨",
      "隴道守備",
      "前軍脫困",
      "糧道攻防",
      "渭水接應",
      "司馬軍前鋒",
      "五丈原對陣"
    ],
    "title": "北伐星火：丞相，剩下的路一起走",
    "opening": "大帳還亮著。諸葛亮把最後一卷軍報移到燈下，發現你已坐在對面。你放下自己的那一份：「今夜，一人一半。」",
    "nodes": [
      {
        "turn": 2,
        "options": [
          {
            "label": "啟用分工與輪值",
            "consequence": "需 S5.B、S6.B 都是 `handover`，才能接起 D-S2。你帶來的是能運作的人與規程，沒有拿仙丹逼孔明睡覺。",
            "id": "delegate"
          },
          {
            "label": "集中資源決戰前線",
            "consequence": "追求常規軍事圓夢，北伐基線保留，軍事國策前置。",
            "id": "advance"
          }
        ],
        "title": "把重擔接過來",
        "id": "S8.A"
      },
      {
        "turn": 6,
        "options": [
          {
            "label": "交接軍政，接受輪休",
            "consequence": "記交接；D-S2 最終承諾。孔明把一半批示交給蔣琬，又把另一半推給你：「既如此，別讓我明早來替你補。」",
            "id": "handover"
          },
          {
            "label": "親領決勝先鋒",
            "consequence": "把自己的主結局定位在前線功業；沒有交接閉環則不宣告孔明長期得以卸重。",
            "id": "vanguard"
          }
        ],
        "title": "軍令留給明天",
        "id": "S8.B"
      }
    ],
    "code": "S8",
    "slug": "northern"
  }
] as const;
