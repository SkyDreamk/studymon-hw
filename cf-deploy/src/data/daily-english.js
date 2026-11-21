/* 每日英语内容池（快照）
 * 来源：跟读站素材只读 API v1（english.example.com/api/materials/v1，见 ~/workspace/user/files/API-_-v1.md）
 * 快照日期：2026-11-19（work/daily-english-pool.json）
 * 刷新方法：python3 work/extract-daily-english-pool.py（经 API 重拉跟读站）→ node scripts/gen-daily-english.mjs --write（重生成本文件）
 * 内容只用快照原样数据，不得手改句子、翻译、音频。API version 变了重拉对应集，音频 URL 以最新响应为准。
 * 小宝池：g1＋starter，43 集 464 句（口语 card 137＋video 173 句）；大宝池：g3，54 集 1462 句（口语 card 152＋video 985 句）。
 * 每日选题只取课本句（见 src/index.js dailyEnglishTodayFor；2026-11-13 用户定：每日英语走课本内容，口语对话归 Oak）。
 */

/* DAILY_ENGLISH_EPISODES:BEGIN */
export const DAILY_ENGLISH_EPISODES = {
  "ep-starter-hello": {
    "t": "Hello, Friends!",
    "z": "你好，朋友",
    "k": "textbook"
  },
  "ep-card-01": {
    "t": "Meet & Greet",
    "z": "集合打招呼",
    "k": "card"
  },
  "ep-card-intro-g1": {
    "t": "Hi, I'm Lily!",
    "z": "我来介绍自己",
    "k": "card"
  },
  "ep-card-needs-g1": {
    "t": "I Need Help",
    "z": "说出我需要",
    "k": "card"
  },
  "ep-card-play-g1": {
    "t": "Play with Me!",
    "z": "一起玩吧",
    "k": "card"
  },
  "ep-card-school-g1": {
    "t": "At School",
    "z": "在学校",
    "k": "card"
  },
  "ep-card-meal-g1": {
    "t": "Time to Eat",
    "z": "吃饭时间",
    "k": "card"
  },
  "ep-card-polite-g1": {
    "t": "Sorry and Thanks",
    "z": "说对不起和谢谢",
    "k": "card"
  },
  "ep-pep1-u1": {
    "t": "Unit 1 Hello!",
    "z": "一上 第一单元 问候与自我介绍",
    "k": "textbook"
  },
  "ep-pep1-u2": {
    "t": "Unit 2 My Body",
    "z": "一上 第二单元 我的身体",
    "k": "textbook"
  },
  "ep-pep1-u3": {
    "t": "Unit 3 Colours",
    "z": "一上 第三单元 颜色",
    "k": "textbook"
  },
  "ep-pep1-u4": {
    "t": "Unit 4 Numbers",
    "z": "一上 第四单元 数字",
    "k": "textbook"
  },
  "ep-pep1-u5": {
    "t": "Unit 5 School Things",
    "z": "一上 第五单元 学习用品",
    "k": "textbook"
  },
  "ep-pep1-u6": {
    "t": "Unit 6 Animals",
    "z": "一上 第六单元 小动物",
    "k": "textbook"
  },
  "ep-pep1b-u1": {
    "t": "Unit 1 In the Classroom",
    "z": "一下 第一单元 教室里",
    "k": "textbook"
  },
  "ep-pep1b-u2": {
    "t": "Unit 2 My Family",
    "z": "一下 第二单元 我的家人",
    "k": "textbook"
  },
  "ep-pep1b-u3": {
    "t": "Unit 3 Fruit",
    "z": "一下 第三单元 水果",
    "k": "textbook"
  },
  "ep-pep1b-u4": {
    "t": "Unit 4 Toys",
    "z": "一下 第四单元 玩具",
    "k": "textbook"
  },
  "ep-pep1b-u5": {
    "t": "Unit 5 Weather",
    "z": "一下 第五单元 天气",
    "k": "textbook"
  },
  "ep-pep1b-u6": {
    "t": "Unit 6 Farm Animals",
    "z": "一下 第六单元 农场动物",
    "k": "textbook"
  },
  "ep-card-feelings-g1": {
    "t": "How I Feel",
    "z": "说说我的感受",
    "k": "card"
  },
  "ep-card-day-g1": {
    "t": "My Day",
    "z": "我的一天",
    "k": "card"
  },
  "ep-card-weather-g1": {
    "t": "Weather and Clothes",
    "z": "天气和穿衣",
    "k": "card"
  },
  "ep-card-hurt-g1": {
    "t": "It Hurts",
    "z": "我有点疼",
    "k": "card"
  },
  "ep-card-toys-g1": {
    "t": "Let's Share",
    "z": "一起分享玩具",
    "k": "card"
  },
  "ep-card-park-g1": {
    "t": "Let's Go Out",
    "z": "我们出去吧",
    "k": "card"
  },
  "ep-card-shop-g1": {
    "t": "How Much Is This?",
    "z": "这个多少钱",
    "k": "card"
  },
  "ep-card-pets-g1": {
    "t": "This Is My Cat",
    "z": "这是我的猫",
    "k": "card"
  },
  "ep-card-bedtime-g1": {
    "t": "Time for Bed",
    "z": "该睡觉了",
    "k": "card"
  },
  "ep-card-family-g1": {
    "t": "This Is My Family",
    "z": "这是我的家人",
    "k": "card"
  },
  "ep-card-birthday-g1": {
    "t": "Happy Birthday",
    "z": "生日快乐",
    "k": "card"
  },
  "ep-card-help-g1": {
    "t": "Can I Help?",
    "z": "我能帮忙吗",
    "k": "card"
  },
  "ep-card-library-g1": {
    "t": "This Is the Library",
    "z": "这是图书馆",
    "k": "card"
  },
  "ep-card-soccer-g1": {
    "t": "Let's Play Soccer",
    "z": "我们来踢足球",
    "k": "card"
  },
  "ep-card-bus-g1": {
    "t": "Here's the Bus",
    "z": "公交车来了",
    "k": "card"
  },
  "ep-video-grocerystore-1": {
    "t": "Grocery Store (Part 1)",
    "z": "超市购物（上）",
    "k": "video"
  },
  "ep-video-grocerystore-2": {
    "t": "Grocery Store (Part 2)",
    "z": "超市购物（下）",
    "k": "video"
  },
  "ep-card-doctor-g1": {
    "t": "I Have a Cold",
    "z": "我感冒了",
    "k": "card"
  },
  "ep-card-directions-g1": {
    "t": "Where Is the Playground?",
    "z": "请问怎么走",
    "k": "card"
  },
  "ep-card-weekend-g1": {
    "t": "It's Saturday Today",
    "z": "周末到了",
    "k": "card"
  },
  "ep-video-hobbies": {
    "t": "Talking About Hobbies",
    "z": "谈谈爱好",
    "k": "video"
  },
  "ep-card-letters-g1": {
    "t": "What's This Letter?",
    "z": "这是什么字母",
    "k": "card"
  },
  "ep-card-sounds-g1": {
    "t": "Apple Starts With A",
    "z": "苹果是 A 开头的",
    "k": "card"
  },
  "ep-card-03": {
    "t": "Build a House Together",
    "z": "分工盖房子",
    "k": "card"
  },
  "ep-card-intro-g3": {
    "t": "Meeting a New Friend",
    "z": "认识新朋友",
    "k": "card"
  },
  "ep-card-needs-g3": {
    "t": "Can I Borrow It?",
    "z": "礼貌地提出需要",
    "k": "card"
  },
  "ep-card-play-g3": {
    "t": "Do You Want to Play?",
    "z": "邀请朋友一起玩",
    "k": "card"
  },
  "ep-card-school-g3": {
    "t": "In the Classroom",
    "z": "在教室里",
    "k": "card"
  },
  "ep-card-meal-g3": {
    "t": "At the Table",
    "z": "在餐桌上",
    "k": "card"
  },
  "ep-card-polite-g3": {
    "t": "Say Sorry and Thank You",
    "z": "礼貌地说对不起和谢谢",
    "k": "card"
  },
  "ep-video-firstnight": {
    "t": "My First Night",
    "z": "我的第一夜",
    "k": "video"
  },
  "ep-pep3-u1": {
    "t": "Unit 1 Making friends",
    "z": "第一单元 交朋友",
    "k": "textbook"
  },
  "ep-pep3-u2": {
    "t": "Unit 2 Different families",
    "z": "第二单元 不同的家庭",
    "k": "textbook"
  },
  "ep-pep3a-u3": {
    "t": "Unit 3 Amazing Animals",
    "z": "第三单元 神奇的动物",
    "k": "textbook"
  },
  "ep-pep3-u3": {
    "t": "Amazing Animals · Extra Practice",
    "z": "神奇的动物 · 拓展练习",
    "k": "textbook"
  },
  "ep-pep3-u4": {
    "t": "Unit 4 Plants around us",
    "z": "第四单元 我们身边的植物",
    "k": "textbook"
  },
  "ep-pep3-u5": {
    "t": "Unit 5 The colourful world",
    "z": "第五单元 多彩的世界",
    "k": "textbook"
  },
  "ep-pep3-u6": {
    "t": "Unit 6 Useful numbers",
    "z": "第六单元 有用的数字",
    "k": "textbook"
  },
  "ep-pep3b-u1": {
    "t": "Unit 1 Meeting new people",
    "z": "三下 第一单元 认识新朋友",
    "k": "textbook"
  },
  "ep-pep3b-u2": {
    "t": "Unit 2 My words and actions",
    "z": "三下 第二单元 我的言行",
    "k": "textbook"
  },
  "ep-pep3b-u3": {
    "t": "Unit 3 Tools and senses for learning",
    "z": "三下 第三单元 学习的工具和感官",
    "k": "textbook"
  },
  "ep-pep3b-u4": {
    "t": "Unit 4 Healthy food",
    "z": "三下 第四单元 健康的食物",
    "k": "textbook"
  },
  "ep-pep3b-u5": {
    "t": "Unit 5 Old things",
    "z": "三下 第五单元 旧物",
    "k": "textbook"
  },
  "ep-pep3b-u6": {
    "t": "Unit 6 Numbers in life",
    "z": "三下 第六单元 生活中的数字",
    "k": "textbook"
  },
  "ep-video-firstnight-2": {
    "t": "My First Night (Part 2)",
    "z": "我的第一夜（下）",
    "k": "video"
  },
  "ep-video-makingfriends-1": {
    "t": "Making Friends (Part 1)",
    "z": "交朋友（上）",
    "k": "video"
  },
  "ep-video-makingfriends-2": {
    "t": "Making Friends (Part 2)",
    "z": "交朋友（下）",
    "k": "video"
  },
  "ep-card-feelings-g3": {
    "t": "What's Wrong?",
    "z": "你怎么了",
    "k": "card"
  },
  "ep-card-day-g3": {
    "t": "A Day at Home",
    "z": "在家的一天",
    "k": "card"
  },
  "ep-card-weather-g3": {
    "t": "Do I Need a Coat?",
    "z": "今天要穿外套吗",
    "k": "card"
  },
  "ep-video-strikinggold-1": {
    "t": "Striking Gold (Part 1)",
    "z": "挖到金矿（上）",
    "k": "video"
  },
  "ep-video-strikinggold-2": {
    "t": "Striking Gold (Part 2)",
    "z": "挖到金矿（下）",
    "k": "video"
  },
  "ep-card-hurt-g3": {
    "t": "I Need a Bandage",
    "z": "我需要创可贴",
    "k": "card"
  },
  "ep-card-toys-g3": {
    "t": "Can I Play With Yours?",
    "z": "我能玩你的吗",
    "k": "card"
  },
  "ep-card-park-g3": {
    "t": "Can We Go to the Park?",
    "z": "我们去公园吧",
    "k": "card"
  },
  "ep-video-losteverything-1": {
    "t": "I Lost Everything (Part 1)",
    "z": "我失去了一切（上）",
    "k": "video"
  },
  "ep-video-losteverything-2": {
    "t": "I Lost Everything (Part 2)",
    "z": "我失去了一切（下）",
    "k": "video"
  },
  "ep-card-shop-g3": {
    "t": "How Much Is This Eraser?",
    "z": "这块橡皮多少钱",
    "k": "card"
  },
  "ep-card-pets-g3": {
    "t": "Can I Pet Your Dog?",
    "z": "我可以摸摸你的狗吗",
    "k": "card"
  },
  "ep-card-bedtime-g3": {
    "t": "Can I Have One More Story?",
    "z": "可以再讲一个故事吗",
    "k": "card"
  },
  "ep-video-exploringcave-1": {
    "t": "Exploring a Cave (Part 1)",
    "z": "探索洞穴（上）",
    "k": "video"
  },
  "ep-video-exploringcave-2": {
    "t": "Exploring a Cave (Part 2)",
    "z": "探索洞穴（中）",
    "k": "video"
  },
  "ep-video-exploringcave-3": {
    "t": "Exploring a Cave (Part 3)",
    "z": "探索洞穴（下）",
    "k": "video"
  },
  "ep-card-family-g3": {
    "t": "Do You Have a Brother?",
    "z": "你有弟弟吗",
    "k": "card"
  },
  "ep-card-birthday-g3": {
    "t": "Can You Come to My Party?",
    "z": "你能来我的聚会吗",
    "k": "card"
  },
  "ep-card-help-g3": {
    "t": "I'll Help You Tidy Up",
    "z": "我来帮你收拾",
    "k": "card"
  },
  "ep-video-potatofarm-1": {
    "t": "Potato Farm (Part 1)",
    "z": "土豆农场（上）",
    "k": "video"
  },
  "ep-video-potatofarm-2": {
    "t": "Potato Farm (Part 2)",
    "z": "土豆农场（下）",
    "k": "video"
  },
  "ep-card-library-g3": {
    "t": "Can I Borrow This Book?",
    "z": "我能借这本书吗",
    "k": "card"
  },
  "ep-card-soccer-g3": {
    "t": "Do You Want to Play Soccer?",
    "z": "你想踢足球吗",
    "k": "card"
  },
  "ep-card-bus-g3": {
    "t": "Should We Get On Now?",
    "z": "我们现在上车吗",
    "k": "card"
  },
  "ep-card-doctor-g3": {
    "t": "Should We See the Doctor?",
    "z": "我们去看医生吧",
    "k": "card"
  },
  "ep-card-directions-g3": {
    "t": "How Do I Get There?",
    "z": "操场怎么走",
    "k": "card"
  },
  "ep-card-weekend-g3": {
    "t": "What Should We Do This Weekend?",
    "z": "周末你想做什么",
    "k": "card"
  }
};
/* DAILY_ENGLISH_EPISODES:END */

/* DAILY_ENGLISH_POOL:BEGIN */
export const DAILY_ENGLISH_POOL = {
  "xiaobao": [
    {
      "s": "s001",
      "e": "ep-starter-hello",
      "k": "textbook",
      "sp": null,
      "en": "Hello!",
      "zh": "你好！",
      "an": "https://english.example.com/audio/ep/ep-starter-hello/s001-n-d19399.mp3",
      "as": "https://english.example.com/audio/ep/ep-starter-hello/s001-s-bedbb4.mp3"
    },
    {
      "s": "s002",
      "e": "ep-starter-hello",
      "k": "textbook",
      "sp": null,
      "en": "Good morning!",
      "zh": "早上好！",
      "an": "https://english.example.com/audio/ep/ep-starter-hello/s002-n-019e6d.mp3",
      "as": "https://english.example.com/audio/ep/ep-starter-hello/s002-s-68a57c.mp3"
    },
    {
      "s": "s003",
      "e": "ep-starter-hello",
      "k": "textbook",
      "sp": null,
      "en": "I'm Tom.",
      "zh": "我是汤姆。",
      "an": "https://english.example.com/audio/ep/ep-starter-hello/s003-n-cb0797.mp3",
      "as": "https://english.example.com/audio/ep/ep-starter-hello/s003-s-de2a16.mp3"
    },
    {
      "s": "s004",
      "e": "ep-starter-hello",
      "k": "textbook",
      "sp": null,
      "en": "This is my mum.",
      "zh": "这是我妈妈。",
      "an": "https://english.example.com/audio/ep/ep-starter-hello/s004-n-c39323.mp3",
      "as": "https://english.example.com/audio/ep/ep-starter-hello/s004-s-d57b66.mp3"
    },
    {
      "s": "s005",
      "e": "ep-starter-hello",
      "k": "textbook",
      "sp": null,
      "en": "This is my dad.",
      "zh": "这是我爸爸。",
      "an": "https://english.example.com/audio/ep/ep-starter-hello/s005-n-67e1f9.mp3",
      "as": "https://english.example.com/audio/ep/ep-starter-hello/s005-s-f924e8.mp3"
    },
    {
      "s": "s006",
      "e": "ep-starter-hello",
      "k": "textbook",
      "sp": null,
      "en": "I like apples.",
      "zh": "我喜欢苹果。",
      "an": "https://english.example.com/audio/ep/ep-starter-hello/s006-n-ab2c7f.mp3",
      "as": "https://english.example.com/audio/ep/ep-starter-hello/s006-s-7c1f7c.mp3"
    },
    {
      "s": "s007",
      "e": "ep-starter-hello",
      "k": "textbook",
      "sp": null,
      "en": "Look! A cat!",
      "zh": "看！一只小猫！",
      "an": "https://english.example.com/audio/ep/ep-starter-hello/s007-n-52a4f5.mp3",
      "as": "https://english.example.com/audio/ep/ep-starter-hello/s007-s-c51ae1.mp3"
    },
    {
      "s": "s008",
      "e": "ep-starter-hello",
      "k": "textbook",
      "sp": null,
      "en": "What colour is it?",
      "zh": "它是什么颜色的？",
      "an": "https://english.example.com/audio/ep/ep-starter-hello/s008-n-6d6b9e.mp3",
      "as": "https://english.example.com/audio/ep/ep-starter-hello/s008-s-0fa2bd.mp3"
    },
    {
      "s": "s009",
      "e": "ep-starter-hello",
      "k": "textbook",
      "sp": null,
      "en": "It's red.",
      "zh": "是红色的。",
      "an": "https://english.example.com/audio/ep/ep-starter-hello/s009-n-4101a2.mp3",
      "as": "https://english.example.com/audio/ep/ep-starter-hello/s009-s-55826d.mp3"
    },
    {
      "s": "s010",
      "e": "ep-starter-hello",
      "k": "textbook",
      "sp": null,
      "en": "I like red.",
      "zh": "我喜欢红色。",
      "an": "https://english.example.com/audio/ep/ep-starter-hello/s010-n-6b62cd.mp3",
      "as": "https://english.example.com/audio/ep/ep-starter-hello/s010-s-6e9325.mp3"
    },
    {
      "s": "s001",
      "e": "ep-card-01",
      "k": "card",
      "sp": "孩子",
      "en": "Hi, Dad!",
      "zh": "嗨，爸爸！",
      "an": "https://english.example.com/audio/ep/ep-card-01/s001-n-0dbfe1.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-01/s001-s-1f2f1c.mp3"
    },
    {
      "s": "s002",
      "e": "ep-card-01",
      "k": "card",
      "sp": "孩子",
      "en": "I'm here!",
      "zh": "我在这儿！",
      "an": "https://english.example.com/audio/ep/ep-card-01/s002-n-49f0f0.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-01/s002-s-70d1ee.mp3"
    },
    {
      "s": "s003",
      "e": "ep-card-01",
      "k": "card",
      "sp": "孩子",
      "en": "Come here!",
      "zh": "过来这边！",
      "an": "https://english.example.com/audio/ep/ep-card-01/s003-n-b9a731.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-01/s003-s-16ed52.mp3"
    },
    {
      "s": "s004",
      "e": "ep-card-01",
      "k": "card",
      "sp": "孩子",
      "en": "Follow me!",
      "zh": "跟我走！",
      "an": "https://english.example.com/audio/ep/ep-card-01/s004-n-8ada93.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-01/s004-s-cb03a5.mp3"
    },
    {
      "s": "s005",
      "e": "ep-card-01",
      "k": "card",
      "sp": "孩子",
      "en": "Let's play!",
      "zh": "我们开始玩吧！",
      "an": "https://english.example.com/audio/ep/ep-card-01/s005-n-d54db8.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-01/s005-s-a0c40d.mp3"
    },
    {
      "s": "s006",
      "e": "ep-card-01",
      "k": "card",
      "sp": "家长",
      "en": "Hi! I see you.",
      "zh": "嗨！我看到你了。",
      "an": "https://english.example.com/audio/ep/ep-card-01/s006-n-111d70.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-01/s006-s-975d92.mp3"
    },
    {
      "s": "s007",
      "e": "ep-card-01",
      "k": "card",
      "sp": "家长",
      "en": "OK, I'm coming!",
      "zh": "好，我来了！",
      "an": "https://english.example.com/audio/ep/ep-card-01/s007-n-5e5679.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-01/s007-s-709214.mp3"
    },
    {
      "s": "s001",
      "e": "ep-card-intro-g1",
      "k": "card",
      "sp": "同学",
      "en": "Hi! What's your name?",
      "zh": "你好！你叫什么名字？",
      "an": "https://english.example.com/audio/ep/ep-card-intro-g1/s001-n-60ddfc.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-intro-g1/s001-s-bffb13.mp3"
    },
    {
      "s": "s002",
      "e": "ep-card-intro-g1",
      "k": "card",
      "sp": "孩子",
      "en": "I'm Lily.",
      "zh": "我叫莉莉。",
      "an": "https://english.example.com/audio/ep/ep-card-intro-g1/s002-n-6f173b.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-intro-g1/s002-s-39ff4d.mp3"
    },
    {
      "s": "s003",
      "e": "ep-card-intro-g1",
      "k": "card",
      "sp": "同学",
      "en": "How old are you?",
      "zh": "你几岁了？",
      "an": "https://english.example.com/audio/ep/ep-card-intro-g1/s003-n-8f2b79.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-intro-g1/s003-s-78aa41.mp3"
    },
    {
      "s": "s004",
      "e": "ep-card-intro-g1",
      "k": "card",
      "sp": "孩子",
      "en": "I'm six.",
      "zh": "我六岁了。",
      "an": "https://english.example.com/audio/ep/ep-card-intro-g1/s004-n-a15a3d.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-intro-g1/s004-s-8fd3c1.mp3"
    },
    {
      "s": "s005",
      "e": "ep-card-intro-g1",
      "k": "card",
      "sp": "孩子",
      "en": "Nice to meet you!",
      "zh": "很高兴认识你！",
      "an": "https://english.example.com/audio/ep/ep-card-intro-g1/s005-n-7c82d5.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-intro-g1/s005-s-4ebdc3.mp3"
    },
    {
      "s": "s001",
      "e": "ep-card-needs-g1",
      "k": "card",
      "sp": "孩子",
      "en": "I'm thirsty.",
      "zh": "我渴了。",
      "an": "https://english.example.com/audio/ep/ep-card-needs-g1/s001-n-0c4188.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-needs-g1/s001-s-ed3e23.mp3"
    },
    {
      "s": "s002",
      "e": "ep-card-needs-g1",
      "k": "card",
      "sp": "孩子",
      "en": "Water, please.",
      "zh": "请给我一点水。",
      "an": "https://english.example.com/audio/ep/ep-card-needs-g1/s002-n-e8c89a.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-needs-g1/s002-s-a3ff69.mp3"
    },
    {
      "s": "s003",
      "e": "ep-card-needs-g1",
      "k": "card",
      "sp": "孩子",
      "en": "I need help.",
      "zh": "我需要帮忙。",
      "an": "https://english.example.com/audio/ep/ep-card-needs-g1/s003-n-3abe90.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-needs-g1/s003-s-42a9c3.mp3"
    },
    {
      "s": "s004",
      "e": "ep-card-needs-g1",
      "k": "card",
      "sp": "家长",
      "en": "OK. Here you are.",
      "zh": "好的，给你。",
      "an": "https://english.example.com/audio/ep/ep-card-needs-g1/s004-n-6685c4.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-needs-g1/s004-s-ce2a64.mp3"
    },
    {
      "s": "s005",
      "e": "ep-card-needs-g1",
      "k": "card",
      "sp": "孩子",
      "en": "Thank you!",
      "zh": "谢谢！",
      "an": "https://english.example.com/audio/ep/ep-card-needs-g1/s005-n-1f519b.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-needs-g1/s005-s-cd28e1.mp3"
    },
    {
      "s": "s001",
      "e": "ep-card-play-g1",
      "k": "card",
      "sp": "孩子",
      "en": "Play with me!",
      "zh": "和我一起玩吧！",
      "an": "https://english.example.com/audio/ep/ep-card-play-g1/s001-n-751a9e.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-play-g1/s001-s-4a2f3f.mp3"
    },
    {
      "s": "s002",
      "e": "ep-card-play-g1",
      "k": "card",
      "sp": "同学",
      "en": "OK! Let's go!",
      "zh": "好呀！我们走！",
      "an": "https://english.example.com/audio/ep/ep-card-play-g1/s002-n-371604.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-play-g1/s002-s-685c2f.mp3"
    },
    {
      "s": "s003",
      "e": "ep-card-play-g1",
      "k": "card",
      "sp": "孩子",
      "en": "My turn!",
      "zh": "轮到我了！",
      "an": "https://english.example.com/audio/ep/ep-card-play-g1/s003-n-aaf939.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-play-g1/s003-s-520594.mp3"
    },
    {
      "s": "s004",
      "e": "ep-card-play-g1",
      "k": "card",
      "sp": "孩子",
      "en": "Your turn!",
      "zh": "轮到你了！",
      "an": "https://english.example.com/audio/ep/ep-card-play-g1/s004-n-8a01f3.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-play-g1/s004-s-4fb09a.mp3"
    },
    {
      "s": "s005",
      "e": "ep-card-play-g1",
      "k": "card",
      "sp": "同学",
      "en": "This is fun!",
      "zh": "真好玩！",
      "an": "https://english.example.com/audio/ep/ep-card-play-g1/s005-n-495354.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-play-g1/s005-s-989930.mp3"
    },
    {
      "s": "s001",
      "e": "ep-card-school-g1",
      "k": "card",
      "sp": "老师",
      "en": "Good morning, class!",
      "zh": "同学们，早上好！",
      "an": "https://english.example.com/audio/ep/ep-card-school-g1/s001-n-c0c7f2.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-school-g1/s001-s-35c104.mp3"
    },
    {
      "s": "s002",
      "e": "ep-card-school-g1",
      "k": "card",
      "sp": "孩子",
      "en": "Good morning!",
      "zh": "早上好！",
      "an": "https://english.example.com/audio/ep/ep-card-school-g1/s002-n-6d391f.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-school-g1/s002-s-ac7af7.mp3"
    },
    {
      "s": "s003",
      "e": "ep-card-school-g1",
      "k": "card",
      "sp": "老师",
      "en": "Please sit down.",
      "zh": "请坐下。",
      "an": "https://english.example.com/audio/ep/ep-card-school-g1/s003-n-a160bc.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-school-g1/s003-s-498d16.mp3"
    },
    {
      "s": "s004",
      "e": "ep-card-school-g1",
      "k": "card",
      "sp": "孩子",
      "en": "May I speak?",
      "zh": "我可以发言吗？",
      "an": "https://english.example.com/audio/ep/ep-card-school-g1/s004-n-aa96a9.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-school-g1/s004-s-277bc3.mp3"
    },
    {
      "s": "s005",
      "e": "ep-card-school-g1",
      "k": "card",
      "sp": "孩子",
      "en": "I know it!",
      "zh": "我知道！",
      "an": "https://english.example.com/audio/ep/ep-card-school-g1/s005-n-f0c286.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-school-g1/s005-s-733779.mp3"
    },
    {
      "s": "s001",
      "e": "ep-card-meal-g1",
      "k": "card",
      "sp": "家长",
      "en": "Are you hungry?",
      "zh": "你饿了吗？",
      "an": "https://english.example.com/audio/ep/ep-card-meal-g1/s001-n-939331.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-meal-g1/s001-s-599de7.mp3"
    },
    {
      "s": "s002",
      "e": "ep-card-meal-g1",
      "k": "card",
      "sp": "孩子",
      "en": "Yes, I'm hungry!",
      "zh": "嗯，我饿了！",
      "an": "https://english.example.com/audio/ep/ep-card-meal-g1/s002-n-0fa47e.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-meal-g1/s002-s-b28869.mp3"
    },
    {
      "s": "s003",
      "e": "ep-card-meal-g1",
      "k": "card",
      "sp": "孩子",
      "en": "Rice, please.",
      "zh": "请给我米饭。",
      "an": "https://english.example.com/audio/ep/ep-card-meal-g1/s003-n-72dfd7.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-meal-g1/s003-s-79be5c.mp3"
    },
    {
      "s": "s004",
      "e": "ep-card-meal-g1",
      "k": "card",
      "sp": "家长",
      "en": "Here you go.",
      "zh": "给你。",
      "an": "https://english.example.com/audio/ep/ep-card-meal-g1/s004-n-9c1949.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-meal-g1/s004-s-c015c5.mp3"
    },
    {
      "s": "s005",
      "e": "ep-card-meal-g1",
      "k": "card",
      "sp": "孩子",
      "en": "Yummy! I like it.",
      "zh": "真好吃！我喜欢。",
      "an": "https://english.example.com/audio/ep/ep-card-meal-g1/s005-n-587ead.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-meal-g1/s005-s-0d26bd.mp3"
    },
    {
      "s": "s001",
      "e": "ep-card-polite-g1",
      "k": "card",
      "sp": "孩子",
      "en": "Sorry!",
      "zh": "对不起！",
      "an": "https://english.example.com/audio/ep/ep-card-polite-g1/s001-n-dacc0a.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-polite-g1/s001-s-af6b8a.mp3"
    },
    {
      "s": "s002",
      "e": "ep-card-polite-g1",
      "k": "card",
      "sp": "同学",
      "en": "It's OK.",
      "zh": "没关系。",
      "an": "https://english.example.com/audio/ep/ep-card-polite-g1/s002-n-d9c110.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-polite-g1/s002-s-269fd9.mp3"
    },
    {
      "s": "s003",
      "e": "ep-card-polite-g1",
      "k": "card",
      "sp": "孩子",
      "en": "Thanks a lot!",
      "zh": "非常感谢！",
      "an": "https://english.example.com/audio/ep/ep-card-polite-g1/s003-n-29f19e.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-polite-g1/s003-s-e7c308.mp3"
    },
    {
      "s": "s004",
      "e": "ep-card-polite-g1",
      "k": "card",
      "sp": "同学",
      "en": "You're welcome!",
      "zh": "不客气！",
      "an": "https://english.example.com/audio/ep/ep-card-polite-g1/s004-n-0b4819.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-polite-g1/s004-s-fc6bcf.mp3"
    },
    {
      "s": "s005",
      "e": "ep-card-polite-g1",
      "k": "card",
      "sp": "孩子",
      "en": "Sorry I'm late.",
      "zh": "对不起，我迟到了。",
      "an": "https://english.example.com/audio/ep/ep-card-polite-g1/s005-n-2f3577.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-polite-g1/s005-s-af0f77.mp3"
    },
    {
      "s": "s001",
      "e": "ep-pep1-u1",
      "k": "textbook",
      "sp": null,
      "en": "Hi, Tom!",
      "zh": "嗨，汤姆！",
      "an": "https://english.example.com/audio/ep/ep-pep1-u1/s001-n-bbeeb5.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep1-u1/s001-s-7d803b.mp3"
    },
    {
      "s": "s002",
      "e": "ep-pep1-u1",
      "k": "textbook",
      "sp": null,
      "en": "Hi, Lily!",
      "zh": "嗨，莉莉！",
      "an": "https://english.example.com/audio/ep/ep-pep1-u1/s002-n-c3cab5.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep1-u1/s002-s-3038fa.mp3"
    },
    {
      "s": "s003",
      "e": "ep-pep1-u1",
      "k": "textbook",
      "sp": null,
      "en": "Hello, Tom!",
      "zh": "你好，汤姆！",
      "an": "https://english.example.com/audio/ep/ep-pep1-u1/s003-n-98d69e.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep1-u1/s003-s-360b90.mp3"
    },
    {
      "s": "s004",
      "e": "ep-pep1-u1",
      "k": "textbook",
      "sp": null,
      "en": "Hello, Lily!",
      "zh": "你好，莉莉！",
      "an": "https://english.example.com/audio/ep/ep-pep1-u1/s004-n-1b245d.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep1-u1/s004-s-c5c1c7.mp3"
    },
    {
      "s": "s005",
      "e": "ep-pep1-u1",
      "k": "textbook",
      "sp": null,
      "en": "Goodbye, Tom!",
      "zh": "再见，汤姆！",
      "an": "https://english.example.com/audio/ep/ep-pep1-u1/s005-n-efa42e.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep1-u1/s005-s-23e355.mp3"
    },
    {
      "s": "s006",
      "e": "ep-pep1-u1",
      "k": "textbook",
      "sp": null,
      "en": "Good morning!",
      "zh": "早上好！",
      "an": "https://english.example.com/audio/ep/ep-pep1-u1/s006-n-019e6d.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep1-u1/s006-s-68a57c.mp3"
    },
    {
      "s": "s007",
      "e": "ep-pep1-u1",
      "k": "textbook",
      "sp": null,
      "en": "Good morning, Lily!",
      "zh": "早上好，莉莉！",
      "an": "https://english.example.com/audio/ep/ep-pep1-u1/s007-n-2c74ba.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep1-u1/s007-s-13affd.mp3"
    },
    {
      "s": "s008",
      "e": "ep-pep1-u1",
      "k": "textbook",
      "sp": null,
      "en": "I'm Lily.",
      "zh": "我是莉莉。",
      "an": "https://english.example.com/audio/ep/ep-pep1-u1/s008-n-2fe429.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep1-u1/s008-s-e352d5.mp3"
    },
    {
      "s": "s009",
      "e": "ep-pep1-u1",
      "k": "textbook",
      "sp": null,
      "en": "What's your name?",
      "zh": "你叫什么名字？",
      "an": "https://english.example.com/audio/ep/ep-pep1-u1/s009-n-4e6efe.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep1-u1/s009-s-77a0ec.mp3"
    },
    {
      "s": "s010",
      "e": "ep-pep1-u1",
      "k": "textbook",
      "sp": null,
      "en": "I'm Tom.",
      "zh": "我是汤姆。",
      "an": "https://english.example.com/audio/ep/ep-pep1-u1/s010-n-cb0797.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep1-u1/s010-s-de2a16.mp3"
    },
    {
      "s": "s011",
      "e": "ep-pep1-u1",
      "k": "textbook",
      "sp": null,
      "en": "Nice to meet you.",
      "zh": "很高兴认识你。",
      "an": "https://english.example.com/audio/ep/ep-pep1-u1/s011-n-f2b6dd.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep1-u1/s011-s-7c389e.mp3"
    },
    {
      "s": "s012",
      "e": "ep-pep1-u1",
      "k": "textbook",
      "sp": null,
      "en": "Nice to meet you, too.",
      "zh": "我也很高兴认识你。",
      "an": "https://english.example.com/audio/ep/ep-pep1-u1/s012-n-c766cc.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep1-u1/s012-s-71aa57.mp3"
    },
    {
      "s": "s001",
      "e": "ep-pep1-u2",
      "k": "textbook",
      "sp": null,
      "en": "Touch your head.",
      "zh": "摸摸你的头。",
      "an": "https://english.example.com/audio/ep/ep-pep1-u2/s001-n-7ea4b8.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep1-u2/s001-s-fea4a9.mp3"
    },
    {
      "s": "s002",
      "e": "ep-pep1-u2",
      "k": "textbook",
      "sp": null,
      "en": "Touch your eye.",
      "zh": "摸摸你的眼睛。",
      "an": "https://english.example.com/audio/ep/ep-pep1-u2/s002-n-d91b05.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep1-u2/s002-s-96ee10.mp3"
    },
    {
      "s": "s003",
      "e": "ep-pep1-u2",
      "k": "textbook",
      "sp": null,
      "en": "Touch your ear.",
      "zh": "摸摸你的耳朵。",
      "an": "https://english.example.com/audio/ep/ep-pep1-u2/s003-n-ca2f4a.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep1-u2/s003-s-b9e623.mp3"
    },
    {
      "s": "s004",
      "e": "ep-pep1-u2",
      "k": "textbook",
      "sp": null,
      "en": "Touch your nose.",
      "zh": "摸摸你的鼻子。",
      "an": "https://english.example.com/audio/ep/ep-pep1-u2/s004-n-cf335c.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep1-u2/s004-s-8c082f.mp3"
    },
    {
      "s": "s005",
      "e": "ep-pep1-u2",
      "k": "textbook",
      "sp": null,
      "en": "Touch your mouth.",
      "zh": "摸摸你的嘴巴。",
      "an": "https://english.example.com/audio/ep/ep-pep1-u2/s005-n-fb3743.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep1-u2/s005-s-f9ef20.mp3"
    },
    {
      "s": "s006",
      "e": "ep-pep1-u2",
      "k": "textbook",
      "sp": null,
      "en": "Touch your hand.",
      "zh": "摸摸你的手。",
      "an": "https://english.example.com/audio/ep/ep-pep1-u2/s006-n-0343c9.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep1-u2/s006-s-af16fd.mp3"
    },
    {
      "s": "s007",
      "e": "ep-pep1-u2",
      "k": "textbook",
      "sp": null,
      "en": "Touch your arm.",
      "zh": "摸摸你的胳膊。",
      "an": "https://english.example.com/audio/ep/ep-pep1-u2/s007-n-1325d9.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep1-u2/s007-s-d24369.mp3"
    },
    {
      "s": "s008",
      "e": "ep-pep1-u2",
      "k": "textbook",
      "sp": null,
      "en": "Open your mouth.",
      "zh": "张开你的嘴巴。",
      "an": "https://english.example.com/audio/ep/ep-pep1-u2/s008-n-cf7b44.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep1-u2/s008-s-46c05d.mp3"
    },
    {
      "s": "s009",
      "e": "ep-pep1-u2",
      "k": "textbook",
      "sp": null,
      "en": "This is my head.",
      "zh": "这是我的头。",
      "an": "https://english.example.com/audio/ep/ep-pep1-u2/s009-n-40847f.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep1-u2/s009-s-64b575.mp3"
    },
    {
      "s": "s010",
      "e": "ep-pep1-u2",
      "k": "textbook",
      "sp": null,
      "en": "This is my nose.",
      "zh": "这是我的鼻子。",
      "an": "https://english.example.com/audio/ep/ep-pep1-u2/s010-n-ae198e.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep1-u2/s010-s-f5f0f7.mp3"
    },
    {
      "s": "s011",
      "e": "ep-pep1-u2",
      "k": "textbook",
      "sp": null,
      "en": "This is my hand.",
      "zh": "这是我的手。",
      "an": "https://english.example.com/audio/ep/ep-pep1-u2/s011-n-749147.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep1-u2/s011-s-0a771c.mp3"
    },
    {
      "s": "s012",
      "e": "ep-pep1-u2",
      "k": "textbook",
      "sp": null,
      "en": "This is my arm.",
      "zh": "这是我的胳膊。",
      "an": "https://english.example.com/audio/ep/ep-pep1-u2/s012-n-a0e58e.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep1-u2/s012-s-6151a5.mp3"
    },
    {
      "s": "s001",
      "e": "ep-pep1-u3",
      "k": "textbook",
      "sp": null,
      "en": "It's red.",
      "zh": "它是红色的。",
      "an": "https://english.example.com/audio/ep/ep-pep1-u3/s001-n-4101a2.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep1-u3/s001-s-55826d.mp3"
    },
    {
      "s": "s002",
      "e": "ep-pep1-u3",
      "k": "textbook",
      "sp": null,
      "en": "It's yellow.",
      "zh": "它是黄色的。",
      "an": "https://english.example.com/audio/ep/ep-pep1-u3/s002-n-b13e6b.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep1-u3/s002-s-e68d89.mp3"
    },
    {
      "s": "s003",
      "e": "ep-pep1-u3",
      "k": "textbook",
      "sp": null,
      "en": "It's green.",
      "zh": "它是绿色的。",
      "an": "https://english.example.com/audio/ep/ep-pep1-u3/s003-n-74ef97.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep1-u3/s003-s-35646e.mp3"
    },
    {
      "s": "s004",
      "e": "ep-pep1-u3",
      "k": "textbook",
      "sp": null,
      "en": "It's blue.",
      "zh": "它是蓝色的。",
      "an": "https://english.example.com/audio/ep/ep-pep1-u3/s004-n-27f6d7.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep1-u3/s004-s-890d2e.mp3"
    },
    {
      "s": "s005",
      "e": "ep-pep1-u3",
      "k": "textbook",
      "sp": null,
      "en": "It's black.",
      "zh": "它是黑色的。",
      "an": "https://english.example.com/audio/ep/ep-pep1-u3/s005-n-fb9d87.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep1-u3/s005-s-bd4ab7.mp3"
    },
    {
      "s": "s006",
      "e": "ep-pep1-u3",
      "k": "textbook",
      "sp": null,
      "en": "It's white.",
      "zh": "它是白色的。",
      "an": "https://english.example.com/audio/ep/ep-pep1-u3/s006-n-62c027.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep1-u3/s006-s-e09aba.mp3"
    },
    {
      "s": "s007",
      "e": "ep-pep1-u3",
      "k": "textbook",
      "sp": null,
      "en": "I like red.",
      "zh": "我喜欢红色。",
      "an": "https://english.example.com/audio/ep/ep-pep1-u3/s007-n-6b62cd.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep1-u3/s007-s-6e9325.mp3"
    },
    {
      "s": "s008",
      "e": "ep-pep1-u3",
      "k": "textbook",
      "sp": null,
      "en": "I like yellow.",
      "zh": "我喜欢黄色。",
      "an": "https://english.example.com/audio/ep/ep-pep1-u3/s008-n-985b56.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep1-u3/s008-s-e4cf36.mp3"
    },
    {
      "s": "s009",
      "e": "ep-pep1-u3",
      "k": "textbook",
      "sp": null,
      "en": "I like green.",
      "zh": "我喜欢绿色。",
      "an": "https://english.example.com/audio/ep/ep-pep1-u3/s009-n-538144.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep1-u3/s009-s-9e3cd6.mp3"
    },
    {
      "s": "s010",
      "e": "ep-pep1-u3",
      "k": "textbook",
      "sp": null,
      "en": "I like blue.",
      "zh": "我喜欢蓝色。",
      "an": "https://english.example.com/audio/ep/ep-pep1-u3/s010-n-911a61.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep1-u3/s010-s-7d6000.mp3"
    },
    {
      "s": "s011",
      "e": "ep-pep1-u3",
      "k": "textbook",
      "sp": null,
      "en": "What colour is it?",
      "zh": "它是什么颜色的？",
      "an": "https://english.example.com/audio/ep/ep-pep1-u3/s011-n-6d6b9e.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep1-u3/s011-s-0fa2bd.mp3"
    },
    {
      "s": "s012",
      "e": "ep-pep1-u3",
      "k": "textbook",
      "sp": null,
      "en": "It's black and white.",
      "zh": "它是黑白两色的。",
      "an": "https://english.example.com/audio/ep/ep-pep1-u3/s012-n-3be42e.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep1-u3/s012-s-02cd6b.mp3"
    },
    {
      "s": "s001",
      "e": "ep-pep1-u4",
      "k": "textbook",
      "sp": null,
      "en": "One pen.",
      "zh": "一支钢笔。",
      "an": "https://english.example.com/audio/ep/ep-pep1-u4/s001-n-cc94d2.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep1-u4/s001-s-2035cd.mp3"
    },
    {
      "s": "s002",
      "e": "ep-pep1-u4",
      "k": "textbook",
      "sp": null,
      "en": "Two pens.",
      "zh": "两支钢笔。",
      "an": "https://english.example.com/audio/ep/ep-pep1-u4/s002-n-7236c8.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep1-u4/s002-s-029cd3.mp3"
    },
    {
      "s": "s003",
      "e": "ep-pep1-u4",
      "k": "textbook",
      "sp": null,
      "en": "Three pens.",
      "zh": "三支钢笔。",
      "an": "https://english.example.com/audio/ep/ep-pep1-u4/s003-n-0b889b.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep1-u4/s003-s-0f7b4b.mp3"
    },
    {
      "s": "s004",
      "e": "ep-pep1-u4",
      "k": "textbook",
      "sp": null,
      "en": "Four books.",
      "zh": "四本书。",
      "an": "https://english.example.com/audio/ep/ep-pep1-u4/s004-n-de8634.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep1-u4/s004-s-7c1882.mp3"
    },
    {
      "s": "s005",
      "e": "ep-pep1-u4",
      "k": "textbook",
      "sp": null,
      "en": "Five books.",
      "zh": "五本书。",
      "an": "https://english.example.com/audio/ep/ep-pep1-u4/s005-n-48fd4b.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep1-u4/s005-s-03a397.mp3"
    },
    {
      "s": "s006",
      "e": "ep-pep1-u4",
      "k": "textbook",
      "sp": null,
      "en": "Six books.",
      "zh": "六本书。",
      "an": "https://english.example.com/audio/ep/ep-pep1-u4/s006-n-71568d.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep1-u4/s006-s-982afa.mp3"
    },
    {
      "s": "s007",
      "e": "ep-pep1-u4",
      "k": "textbook",
      "sp": null,
      "en": "I'm seven.",
      "zh": "我七岁了。",
      "an": "https://english.example.com/audio/ep/ep-pep1-u4/s007-n-612de6.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep1-u4/s007-s-dfa816.mp3"
    },
    {
      "s": "s008",
      "e": "ep-pep1-u4",
      "k": "textbook",
      "sp": null,
      "en": "Eight pencils.",
      "zh": "八支铅笔。",
      "an": "https://english.example.com/audio/ep/ep-pep1-u4/s008-n-e9e2d8.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep1-u4/s008-s-a96cf7.mp3"
    },
    {
      "s": "s009",
      "e": "ep-pep1-u4",
      "k": "textbook",
      "sp": null,
      "en": "Show me nine pens.",
      "zh": "给我看九支钢笔。",
      "an": "https://english.example.com/audio/ep/ep-pep1-u4/s009-n-3be960.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep1-u4/s009-s-35edb8.mp3"
    },
    {
      "s": "s010",
      "e": "ep-pep1-u4",
      "k": "textbook",
      "sp": null,
      "en": "Show me ten pencils.",
      "zh": "给我看十支铅笔。",
      "an": "https://english.example.com/audio/ep/ep-pep1-u4/s010-n-da7273.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep1-u4/s010-s-139127.mp3"
    },
    {
      "s": "s011",
      "e": "ep-pep1-u4",
      "k": "textbook",
      "sp": null,
      "en": "How many pencils?",
      "zh": "有多少支铅笔？",
      "an": "https://english.example.com/audio/ep/ep-pep1-u4/s011-n-6dd5c4.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep1-u4/s011-s-6c1a42.mp3"
    },
    {
      "s": "s012",
      "e": "ep-pep1-u4",
      "k": "textbook",
      "sp": null,
      "en": "Ten pencils.",
      "zh": "十支铅笔。",
      "an": "https://english.example.com/audio/ep/ep-pep1-u4/s012-n-83f660.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep1-u4/s012-s-521912.mp3"
    },
    {
      "s": "s001",
      "e": "ep-pep1-u5",
      "k": "textbook",
      "sp": null,
      "en": "A book.",
      "zh": "一本书。",
      "an": "https://english.example.com/audio/ep/ep-pep1-u5/s001-n-8eeafc.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep1-u5/s001-s-dd123a.mp3"
    },
    {
      "s": "s002",
      "e": "ep-pep1-u5",
      "k": "textbook",
      "sp": null,
      "en": "A pen.",
      "zh": "一支钢笔。",
      "an": "https://english.example.com/audio/ep/ep-pep1-u5/s002-n-5f63c4.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep1-u5/s002-s-f9ef31.mp3"
    },
    {
      "s": "s003",
      "e": "ep-pep1-u5",
      "k": "textbook",
      "sp": null,
      "en": "A pencil.",
      "zh": "一支铅笔。",
      "an": "https://english.example.com/audio/ep/ep-pep1-u5/s003-n-dc4ff0.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep1-u5/s003-s-5183a8.mp3"
    },
    {
      "s": "s004",
      "e": "ep-pep1-u5",
      "k": "textbook",
      "sp": null,
      "en": "A ruler.",
      "zh": "一把尺子。",
      "an": "https://english.example.com/audio/ep/ep-pep1-u5/s004-n-cca695.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep1-u5/s004-s-164452.mp3"
    },
    {
      "s": "s005",
      "e": "ep-pep1-u5",
      "k": "textbook",
      "sp": null,
      "en": "A bag.",
      "zh": "一个书包。",
      "an": "https://english.example.com/audio/ep/ep-pep1-u5/s005-n-33edcb.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep1-u5/s005-s-9f3440.mp3"
    },
    {
      "s": "s006",
      "e": "ep-pep1-u5",
      "k": "textbook",
      "sp": null,
      "en": "Sit down.",
      "zh": "坐下。",
      "an": "https://english.example.com/audio/ep/ep-pep1-u5/s006-n-03db57.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep1-u5/s006-s-2d9e1e.mp3"
    },
    {
      "s": "s007",
      "e": "ep-pep1-u5",
      "k": "textbook",
      "sp": null,
      "en": "Stand up.",
      "zh": "起立。",
      "an": "https://english.example.com/audio/ep/ep-pep1-u5/s007-n-7e8359.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep1-u5/s007-s-d8f080.mp3"
    },
    {
      "s": "s008",
      "e": "ep-pep1-u5",
      "k": "textbook",
      "sp": null,
      "en": "Look at me.",
      "zh": "看着我。",
      "an": "https://english.example.com/audio/ep/ep-pep1-u5/s008-n-e80fe7.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep1-u5/s008-s-d9910c.mp3"
    },
    {
      "s": "s009",
      "e": "ep-pep1-u5",
      "k": "textbook",
      "sp": null,
      "en": "Open your book.",
      "zh": "打开你的书。",
      "an": "https://english.example.com/audio/ep/ep-pep1-u5/s009-n-698fe5.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep1-u5/s009-s-984934.mp3"
    },
    {
      "s": "s010",
      "e": "ep-pep1-u5",
      "k": "textbook",
      "sp": null,
      "en": "I have a pen.",
      "zh": "我有一支钢笔。",
      "an": "https://english.example.com/audio/ep/ep-pep1-u5/s010-n-386986.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep1-u5/s010-s-600a1e.mp3"
    },
    {
      "s": "s011",
      "e": "ep-pep1-u5",
      "k": "textbook",
      "sp": null,
      "en": "I have a pencil.",
      "zh": "我有一支铅笔。",
      "an": "https://english.example.com/audio/ep/ep-pep1-u5/s011-n-efa051.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep1-u5/s011-s-c8a685.mp3"
    },
    {
      "s": "s012",
      "e": "ep-pep1-u5",
      "k": "textbook",
      "sp": null,
      "en": "I have a ruler.",
      "zh": "我有一把尺子。",
      "an": "https://english.example.com/audio/ep/ep-pep1-u5/s012-n-7b8527.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep1-u5/s012-s-06c1e9.mp3"
    },
    {
      "s": "s001",
      "e": "ep-pep1-u6",
      "k": "textbook",
      "sp": null,
      "en": "A cat.",
      "zh": "一只猫。",
      "an": "https://english.example.com/audio/ep/ep-pep1-u6/s001-n-6c0cbc.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep1-u6/s001-s-b42222.mp3"
    },
    {
      "s": "s002",
      "e": "ep-pep1-u6",
      "k": "textbook",
      "sp": null,
      "en": "It's cute.",
      "zh": "它很可爱。",
      "an": "https://english.example.com/audio/ep/ep-pep1-u6/s002-n-075e52.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep1-u6/s002-s-a3cb08.mp3"
    },
    {
      "s": "s003",
      "e": "ep-pep1-u6",
      "k": "textbook",
      "sp": null,
      "en": "A dog.",
      "zh": "一只狗。",
      "an": "https://english.example.com/audio/ep/ep-pep1-u6/s003-n-332e32.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep1-u6/s003-s-14cf5d.mp3"
    },
    {
      "s": "s004",
      "e": "ep-pep1-u6",
      "k": "textbook",
      "sp": null,
      "en": "It's small.",
      "zh": "它很小。",
      "an": "https://english.example.com/audio/ep/ep-pep1-u6/s004-n-918365.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep1-u6/s004-s-a6ff9b.mp3"
    },
    {
      "s": "s005",
      "e": "ep-pep1-u6",
      "k": "textbook",
      "sp": null,
      "en": "Look! A bird.",
      "zh": "看！一只鸟。",
      "an": "https://english.example.com/audio/ep/ep-pep1-u6/s005-n-1c34b6.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep1-u6/s005-s-b38610.mp3"
    },
    {
      "s": "s006",
      "e": "ep-pep1-u6",
      "k": "textbook",
      "sp": null,
      "en": "Look! A fish.",
      "zh": "看！一条鱼。",
      "an": "https://english.example.com/audio/ep/ep-pep1-u6/s006-n-02c1c0.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep1-u6/s006-s-30be90.mp3"
    },
    {
      "s": "s007",
      "e": "ep-pep1-u6",
      "k": "textbook",
      "sp": null,
      "en": "Look! A rabbit.",
      "zh": "看！一只兔子。",
      "an": "https://english.example.com/audio/ep/ep-pep1-u6/s007-n-1b8b85.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep1-u6/s007-s-185f4d.mp3"
    },
    {
      "s": "s008",
      "e": "ep-pep1-u6",
      "k": "textbook",
      "sp": null,
      "en": "Look! A panda.",
      "zh": "看！一只熊猫。",
      "an": "https://english.example.com/audio/ep/ep-pep1-u6/s008-n-6655e8.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep1-u6/s008-s-3e73c6.mp3"
    },
    {
      "s": "s009",
      "e": "ep-pep1-u6",
      "k": "textbook",
      "sp": null,
      "en": "I like cats.",
      "zh": "我喜欢猫。",
      "an": "https://english.example.com/audio/ep/ep-pep1-u6/s009-n-a5eb32.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep1-u6/s009-s-f2feea.mp3"
    },
    {
      "s": "s010",
      "e": "ep-pep1-u6",
      "k": "textbook",
      "sp": null,
      "en": "I like dogs.",
      "zh": "我喜欢狗。",
      "an": "https://english.example.com/audio/ep/ep-pep1-u6/s010-n-bbdd29.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep1-u6/s010-s-7e0eae.mp3"
    },
    {
      "s": "s011",
      "e": "ep-pep1-u6",
      "k": "textbook",
      "sp": null,
      "en": "I like rabbits.",
      "zh": "我喜欢兔子。",
      "an": "https://english.example.com/audio/ep/ep-pep1-u6/s011-n-026f13.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep1-u6/s011-s-d35c42.mp3"
    },
    {
      "s": "s012",
      "e": "ep-pep1-u6",
      "k": "textbook",
      "sp": null,
      "en": "I like pandas.",
      "zh": "我喜欢熊猫。",
      "an": "https://english.example.com/audio/ep/ep-pep1-u6/s012-n-c57554.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep1-u6/s012-s-05d251.mp3"
    },
    {
      "s": "s001",
      "e": "ep-pep1b-u1",
      "k": "textbook",
      "sp": null,
      "en": "Sit down.",
      "zh": "坐下。",
      "an": "https://english.example.com/audio/ep/ep-pep1b-u1/s001-n-03db57.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep1b-u1/s001-s-2d9e1e.mp3"
    },
    {
      "s": "s002",
      "e": "ep-pep1b-u1",
      "k": "textbook",
      "sp": null,
      "en": "Stand up.",
      "zh": "起立。",
      "an": "https://english.example.com/audio/ep/ep-pep1b-u1/s002-n-7e8359.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep1b-u1/s002-s-d8f080.mp3"
    },
    {
      "s": "s003",
      "e": "ep-pep1b-u1",
      "k": "textbook",
      "sp": null,
      "en": "Open the door.",
      "zh": "打开门。",
      "an": "https://english.example.com/audio/ep/ep-pep1b-u1/s003-n-f2a992.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep1b-u1/s003-s-7150fd.mp3"
    },
    {
      "s": "s004",
      "e": "ep-pep1b-u1",
      "k": "textbook",
      "sp": null,
      "en": "It's a desk.",
      "zh": "这是一张课桌。",
      "an": "https://english.example.com/audio/ep/ep-pep1b-u1/s004-n-8ea1c8.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep1b-u1/s004-s-2615de.mp3"
    },
    {
      "s": "s005",
      "e": "ep-pep1b-u1",
      "k": "textbook",
      "sp": null,
      "en": "It's a chair.",
      "zh": "这是一把椅子。",
      "an": "https://english.example.com/audio/ep/ep-pep1b-u1/s005-n-6c7a23.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep1b-u1/s005-s-6afa18.mp3"
    },
    {
      "s": "s006",
      "e": "ep-pep1b-u1",
      "k": "textbook",
      "sp": null,
      "en": "It's a window.",
      "zh": "这是一扇窗户。",
      "an": "https://english.example.com/audio/ep/ep-pep1b-u1/s006-n-459785.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep1b-u1/s006-s-ba62c1.mp3"
    },
    {
      "s": "s007",
      "e": "ep-pep1b-u1",
      "k": "textbook",
      "sp": null,
      "en": "Point to the door.",
      "zh": "指一指门。",
      "an": "https://english.example.com/audio/ep/ep-pep1b-u1/s007-n-e57962.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep1b-u1/s007-s-e40da6.mp3"
    },
    {
      "s": "s008",
      "e": "ep-pep1b-u1",
      "k": "textbook",
      "sp": null,
      "en": "Point to the window.",
      "zh": "指一指窗户。",
      "an": "https://english.example.com/audio/ep/ep-pep1b-u1/s008-n-23a11f.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep1b-u1/s008-s-ddd255.mp3"
    },
    {
      "s": "s009",
      "e": "ep-pep1b-u1",
      "k": "textbook",
      "sp": null,
      "en": "Point to the blackboard.",
      "zh": "指一指黑板。",
      "an": "https://english.example.com/audio/ep/ep-pep1b-u1/s009-n-ffa6e6.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep1b-u1/s009-s-03899b.mp3"
    },
    {
      "s": "s010",
      "e": "ep-pep1b-u1",
      "k": "textbook",
      "sp": null,
      "en": "Is this your desk?",
      "zh": "这是你的课桌吗？",
      "an": "https://english.example.com/audio/ep/ep-pep1b-u1/s010-n-348352.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep1b-u1/s010-s-2cb78e.mp3"
    },
    {
      "s": "s011",
      "e": "ep-pep1b-u1",
      "k": "textbook",
      "sp": null,
      "en": "Yes, this is my desk.",
      "zh": "是的，这是我的课桌。",
      "an": "https://english.example.com/audio/ep/ep-pep1b-u1/s011-n-62f2d5.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep1b-u1/s011-s-126869.mp3"
    },
    {
      "s": "s012",
      "e": "ep-pep1b-u1",
      "k": "textbook",
      "sp": null,
      "en": "Please stand up and open the door.",
      "zh": "请站起来，然后打开门。",
      "an": "https://english.example.com/audio/ep/ep-pep1b-u1/s012-n-18e0ba.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep1b-u1/s012-s-f8bf8c.mp3"
    },
    {
      "s": "s001",
      "e": "ep-pep1b-u2",
      "k": "textbook",
      "sp": null,
      "en": "This is my father.",
      "zh": "这是我的爸爸。",
      "an": "https://english.example.com/audio/ep/ep-pep1b-u2/s001-n-3f60a2.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep1b-u2/s001-s-1c91f1.mp3"
    },
    {
      "s": "s002",
      "e": "ep-pep1b-u2",
      "k": "textbook",
      "sp": null,
      "en": "This is my mother.",
      "zh": "这是我的妈妈。",
      "an": "https://english.example.com/audio/ep/ep-pep1b-u2/s002-n-60c7aa.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep1b-u2/s002-s-e220f9.mp3"
    },
    {
      "s": "s003",
      "e": "ep-pep1b-u2",
      "k": "textbook",
      "sp": null,
      "en": "This is my baby.",
      "zh": "这是我家的宝宝。",
      "an": "https://english.example.com/audio/ep/ep-pep1b-u2/s003-n-5624d5.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep1b-u2/s003-s-6864d8.mp3"
    },
    {
      "s": "s004",
      "e": "ep-pep1b-u2",
      "k": "textbook",
      "sp": null,
      "en": "This is my brother.",
      "zh": "这是我的哥哥。",
      "an": "https://english.example.com/audio/ep/ep-pep1b-u2/s004-n-aec563.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep1b-u2/s004-s-25ae04.mp3"
    },
    {
      "s": "s005",
      "e": "ep-pep1b-u2",
      "k": "textbook",
      "sp": null,
      "en": "This is my sister.",
      "zh": "这是我的姐姐。",
      "an": "https://english.example.com/audio/ep/ep-pep1b-u2/s005-n-c0a0db.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep1b-u2/s005-s-24dcec.mp3"
    },
    {
      "s": "s006",
      "e": "ep-pep1b-u2",
      "k": "textbook",
      "sp": null,
      "en": "This is my grandpa.",
      "zh": "这是我的爷爷。",
      "an": "https://english.example.com/audio/ep/ep-pep1b-u2/s006-n-97e70f.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep1b-u2/s006-s-7b781c.mp3"
    },
    {
      "s": "s007",
      "e": "ep-pep1b-u2",
      "k": "textbook",
      "sp": null,
      "en": "This is my grandma.",
      "zh": "这是我的奶奶。",
      "an": "https://english.example.com/audio/ep/ep-pep1b-u2/s007-n-54cf9a.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep1b-u2/s007-s-d6620f.mp3"
    },
    {
      "s": "s008",
      "e": "ep-pep1b-u2",
      "k": "textbook",
      "sp": null,
      "en": "I love my mother.",
      "zh": "我爱我的妈妈。",
      "an": "https://english.example.com/audio/ep/ep-pep1b-u2/s008-n-93a728.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep1b-u2/s008-s-22706d.mp3"
    },
    {
      "s": "s009",
      "e": "ep-pep1b-u2",
      "k": "textbook",
      "sp": null,
      "en": "Who is he?",
      "zh": "他是谁？",
      "an": "https://english.example.com/audio/ep/ep-pep1b-u2/s009-n-9f8523.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep1b-u2/s009-s-59aa84.mp3"
    },
    {
      "s": "s010",
      "e": "ep-pep1b-u2",
      "k": "textbook",
      "sp": null,
      "en": "He is my father.",
      "zh": "他是我的爸爸。",
      "an": "https://english.example.com/audio/ep/ep-pep1b-u2/s010-n-e12ff8.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep1b-u2/s010-s-d84c39.mp3"
    },
    {
      "s": "s011",
      "e": "ep-pep1b-u2",
      "k": "textbook",
      "sp": null,
      "en": "Who is she?",
      "zh": "她是谁？",
      "an": "https://english.example.com/audio/ep/ep-pep1b-u2/s011-n-2ba289.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep1b-u2/s011-s-6daa7e.mp3"
    },
    {
      "s": "s012",
      "e": "ep-pep1b-u2",
      "k": "textbook",
      "sp": null,
      "en": "She is my sister.",
      "zh": "她是我的姐姐。",
      "an": "https://english.example.com/audio/ep/ep-pep1b-u2/s012-n-94aeab.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep1b-u2/s012-s-a01eeb.mp3"
    },
    {
      "s": "s001",
      "e": "ep-pep1b-u3",
      "k": "textbook",
      "sp": null,
      "en": "I like apples.",
      "zh": "我喜欢苹果。",
      "an": "https://english.example.com/audio/ep/ep-pep1b-u3/s001-n-ab2c7f.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep1b-u3/s001-s-7c1f7c.mp3"
    },
    {
      "s": "s002",
      "e": "ep-pep1b-u3",
      "k": "textbook",
      "sp": null,
      "en": "I like bananas.",
      "zh": "我喜欢香蕉。",
      "an": "https://english.example.com/audio/ep/ep-pep1b-u3/s002-n-e809a6.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep1b-u3/s002-s-fd98fd.mp3"
    },
    {
      "s": "s003",
      "e": "ep-pep1b-u3",
      "k": "textbook",
      "sp": null,
      "en": "I like oranges.",
      "zh": "我喜欢橙子。",
      "an": "https://english.example.com/audio/ep/ep-pep1b-u3/s003-n-4fee88.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep1b-u3/s003-s-8bc08a.mp3"
    },
    {
      "s": "s004",
      "e": "ep-pep1b-u3",
      "k": "textbook",
      "sp": null,
      "en": "I like pears.",
      "zh": "我喜欢梨。",
      "an": "https://english.example.com/audio/ep/ep-pep1b-u3/s004-n-030803.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep1b-u3/s004-s-a6c9bc.mp3"
    },
    {
      "s": "s005",
      "e": "ep-pep1b-u3",
      "k": "textbook",
      "sp": null,
      "en": "I like grapes.",
      "zh": "我喜欢葡萄。",
      "an": "https://english.example.com/audio/ep/ep-pep1b-u3/s005-n-3bae88.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep1b-u3/s005-s-e7bdb0.mp3"
    },
    {
      "s": "s006",
      "e": "ep-pep1b-u3",
      "k": "textbook",
      "sp": null,
      "en": "I like watermelon.",
      "zh": "我喜欢西瓜。",
      "an": "https://english.example.com/audio/ep/ep-pep1b-u3/s006-n-ec4876.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep1b-u3/s006-s-7dcfca.mp3"
    },
    {
      "s": "s007",
      "e": "ep-pep1b-u3",
      "k": "textbook",
      "sp": null,
      "en": "Do you like apples?",
      "zh": "你喜欢苹果吗？",
      "an": "https://english.example.com/audio/ep/ep-pep1b-u3/s007-n-7631f1.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep1b-u3/s007-s-1cf52c.mp3"
    },
    {
      "s": "s008",
      "e": "ep-pep1b-u3",
      "k": "textbook",
      "sp": null,
      "en": "Yes, I do.",
      "zh": "是的，我喜欢。",
      "an": "https://english.example.com/audio/ep/ep-pep1b-u3/s008-n-06ba4f.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep1b-u3/s008-s-2ea218.mp3"
    },
    {
      "s": "s009",
      "e": "ep-pep1b-u3",
      "k": "textbook",
      "sp": null,
      "en": "Do you like bananas?",
      "zh": "你喜欢香蕉吗？",
      "an": "https://english.example.com/audio/ep/ep-pep1b-u3/s009-n-57767c.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep1b-u3/s009-s-e3cd82.mp3"
    },
    {
      "s": "s010",
      "e": "ep-pep1b-u3",
      "k": "textbook",
      "sp": null,
      "en": "No, I don't.",
      "zh": "不，我不喜欢。",
      "an": "https://english.example.com/audio/ep/ep-pep1b-u3/s010-n-52b796.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep1b-u3/s010-s-b8175c.mp3"
    },
    {
      "s": "s011",
      "e": "ep-pep1b-u3",
      "k": "textbook",
      "sp": null,
      "en": "Do you like oranges and pears?",
      "zh": "你喜欢橙子和梨吗？",
      "an": "https://english.example.com/audio/ep/ep-pep1b-u3/s011-n-3a9743.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep1b-u3/s011-s-a4a475.mp3"
    },
    {
      "s": "s012",
      "e": "ep-pep1b-u3",
      "k": "textbook",
      "sp": null,
      "en": "Yes, I do.",
      "zh": "是的，我喜欢。",
      "an": "https://english.example.com/audio/ep/ep-pep1b-u3/s012-n-06ba4f.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep1b-u3/s012-s-2ea218.mp3"
    },
    {
      "s": "s001",
      "e": "ep-pep1b-u4",
      "k": "textbook",
      "sp": null,
      "en": "Look! A ball.",
      "zh": "看！一个球。",
      "an": "https://english.example.com/audio/ep/ep-pep1b-u4/s001-n-8e999a.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep1b-u4/s001-s-aea6a9.mp3"
    },
    {
      "s": "s002",
      "e": "ep-pep1b-u4",
      "k": "textbook",
      "sp": null,
      "en": "Look! A kite.",
      "zh": "看！一只风筝。",
      "an": "https://english.example.com/audio/ep/ep-pep1b-u4/s002-n-8ea3dc.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep1b-u4/s002-s-2bfa76.mp3"
    },
    {
      "s": "s003",
      "e": "ep-pep1b-u4",
      "k": "textbook",
      "sp": null,
      "en": "Look! A car.",
      "zh": "看！一辆玩具车。",
      "an": "https://english.example.com/audio/ep/ep-pep1b-u4/s003-n-7cdb03.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep1b-u4/s003-s-02d9e9.mp3"
    },
    {
      "s": "s004",
      "e": "ep-pep1b-u4",
      "k": "textbook",
      "sp": null,
      "en": "Look! A doll.",
      "zh": "看！一个娃娃。",
      "an": "https://english.example.com/audio/ep/ep-pep1b-u4/s004-n-75e496.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep1b-u4/s004-s-2a227b.mp3"
    },
    {
      "s": "s005",
      "e": "ep-pep1b-u4",
      "k": "textbook",
      "sp": null,
      "en": "Look! A bear.",
      "zh": "看！一只玩具熊。",
      "an": "https://english.example.com/audio/ep/ep-pep1b-u4/s005-n-1f0cf4.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep1b-u4/s005-s-9403ac.mp3"
    },
    {
      "s": "s006",
      "e": "ep-pep1b-u4",
      "k": "textbook",
      "sp": null,
      "en": "Look! A boat.",
      "zh": "看！一艘玩具船。",
      "an": "https://english.example.com/audio/ep/ep-pep1b-u4/s006-n-df62c7.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep1b-u4/s006-s-a31a8c.mp3"
    },
    {
      "s": "s007",
      "e": "ep-pep1b-u4",
      "k": "textbook",
      "sp": null,
      "en": "I have a car.",
      "zh": "我有一辆玩具车。",
      "an": "https://english.example.com/audio/ep/ep-pep1b-u4/s007-n-ae9037.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep1b-u4/s007-s-f95af5.mp3"
    },
    {
      "s": "s008",
      "e": "ep-pep1b-u4",
      "k": "textbook",
      "sp": null,
      "en": "I have a doll.",
      "zh": "我有一个娃娃。",
      "an": "https://english.example.com/audio/ep/ep-pep1b-u4/s008-n-7637bc.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep1b-u4/s008-s-7dfa75.mp3"
    },
    {
      "s": "s009",
      "e": "ep-pep1b-u4",
      "k": "textbook",
      "sp": null,
      "en": "I have a bear.",
      "zh": "我有一只玩具熊。",
      "an": "https://english.example.com/audio/ep/ep-pep1b-u4/s009-n-fa8451.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep1b-u4/s009-s-f364fa.mp3"
    },
    {
      "s": "s010",
      "e": "ep-pep1b-u4",
      "k": "textbook",
      "sp": null,
      "en": "Let's play with my ball.",
      "zh": "我们一起玩我的球吧。",
      "an": "https://english.example.com/audio/ep/ep-pep1b-u4/s010-n-535b7e.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep1b-u4/s010-s-550bce.mp3"
    },
    {
      "s": "s011",
      "e": "ep-pep1b-u4",
      "k": "textbook",
      "sp": null,
      "en": "Can I play with you?",
      "zh": "我可以和你一起玩吗？",
      "an": "https://english.example.com/audio/ep/ep-pep1b-u4/s011-n-997b7c.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep1b-u4/s011-s-5e8dc5.mp3"
    },
    {
      "s": "s012",
      "e": "ep-pep1b-u4",
      "k": "textbook",
      "sp": null,
      "en": "Yes! Let's play with my ball.",
      "zh": "可以！我们一起玩我的球吧。",
      "an": "https://english.example.com/audio/ep/ep-pep1b-u4/s012-n-5add99.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep1b-u4/s012-s-51fb3b.mp3"
    },
    {
      "s": "s001",
      "e": "ep-pep1b-u5",
      "k": "textbook",
      "sp": null,
      "en": "It's sunny.",
      "zh": "天气晴朗。",
      "an": "https://english.example.com/audio/ep/ep-pep1b-u5/s001-n-0ceb10.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep1b-u5/s001-s-a42084.mp3"
    },
    {
      "s": "s002",
      "e": "ep-pep1b-u5",
      "k": "textbook",
      "sp": null,
      "en": "It's rainy.",
      "zh": "下雨了。",
      "an": "https://english.example.com/audio/ep/ep-pep1b-u5/s002-n-49a069.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep1b-u5/s002-s-b45556.mp3"
    },
    {
      "s": "s003",
      "e": "ep-pep1b-u5",
      "k": "textbook",
      "sp": null,
      "en": "It's windy.",
      "zh": "刮风了。",
      "an": "https://english.example.com/audio/ep/ep-pep1b-u5/s003-n-47fd72.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep1b-u5/s003-s-1d1bcc.mp3"
    },
    {
      "s": "s004",
      "e": "ep-pep1b-u5",
      "k": "textbook",
      "sp": null,
      "en": "It's snowy.",
      "zh": "下雪了。",
      "an": "https://english.example.com/audio/ep/ep-pep1b-u5/s004-n-345ce1.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep1b-u5/s004-s-c05d1f.mp3"
    },
    {
      "s": "s005",
      "e": "ep-pep1b-u5",
      "k": "textbook",
      "sp": null,
      "en": "It's cloudy.",
      "zh": "天气多云。",
      "an": "https://english.example.com/audio/ep/ep-pep1b-u5/s005-n-aa54ca.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep1b-u5/s005-s-e45577.mp3"
    },
    {
      "s": "s006",
      "e": "ep-pep1b-u5",
      "k": "textbook",
      "sp": null,
      "en": "Let's go out.",
      "zh": "我们出去吧。",
      "an": "https://english.example.com/audio/ep/ep-pep1b-u5/s006-n-dd6eb8.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep1b-u5/s006-s-b56c0a.mp3"
    },
    {
      "s": "s007",
      "e": "ep-pep1b-u5",
      "k": "textbook",
      "sp": null,
      "en": "It's sunny today.",
      "zh": "今天天气晴朗。",
      "an": "https://english.example.com/audio/ep/ep-pep1b-u5/s007-n-60babf.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep1b-u5/s007-s-3b7a79.mp3"
    },
    {
      "s": "s008",
      "e": "ep-pep1b-u5",
      "k": "textbook",
      "sp": null,
      "en": "It's rainy today.",
      "zh": "今天下雨了。",
      "an": "https://english.example.com/audio/ep/ep-pep1b-u5/s008-n-b7652e.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep1b-u5/s008-s-0207ab.mp3"
    },
    {
      "s": "s009",
      "e": "ep-pep1b-u5",
      "k": "textbook",
      "sp": null,
      "en": "It's windy today.",
      "zh": "今天刮风了。",
      "an": "https://english.example.com/audio/ep/ep-pep1b-u5/s009-n-20a539.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep1b-u5/s009-s-17b7fb.mp3"
    },
    {
      "s": "s010",
      "e": "ep-pep1b-u5",
      "k": "textbook",
      "sp": null,
      "en": "How is the weather?",
      "zh": "天气怎么样？",
      "an": "https://english.example.com/audio/ep/ep-pep1b-u5/s010-n-d98959.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep1b-u5/s010-s-567718.mp3"
    },
    {
      "s": "s011",
      "e": "ep-pep1b-u5",
      "k": "textbook",
      "sp": null,
      "en": "It's sunny and warm.",
      "zh": "天气晴朗又暖和。",
      "an": "https://english.example.com/audio/ep/ep-pep1b-u5/s011-n-1bcece.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep1b-u5/s011-s-3fc740.mp3"
    },
    {
      "s": "s012",
      "e": "ep-pep1b-u5",
      "k": "textbook",
      "sp": null,
      "en": "Let's go out and play.",
      "zh": "我们出去玩吧。",
      "an": "https://english.example.com/audio/ep/ep-pep1b-u5/s012-n-74f83b.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep1b-u5/s012-s-50e8a9.mp3"
    },
    {
      "s": "s001",
      "e": "ep-pep1b-u6",
      "k": "textbook",
      "sp": null,
      "en": "What's this?",
      "zh": "这是什么？",
      "an": "https://english.example.com/audio/ep/ep-pep1b-u6/s001-n-86880c.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep1b-u6/s001-s-caea06.mp3"
    },
    {
      "s": "s002",
      "e": "ep-pep1b-u6",
      "k": "textbook",
      "sp": null,
      "en": "It's a pig.",
      "zh": "这是一头猪。",
      "an": "https://english.example.com/audio/ep/ep-pep1b-u6/s002-n-a3729f.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep1b-u6/s002-s-f97edd.mp3"
    },
    {
      "s": "s003",
      "e": "ep-pep1b-u6",
      "k": "textbook",
      "sp": null,
      "en": "It's a duck.",
      "zh": "这是一只鸭子。",
      "an": "https://english.example.com/audio/ep/ep-pep1b-u6/s003-n-ca733d.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep1b-u6/s003-s-1cc8af.mp3"
    },
    {
      "s": "s004",
      "e": "ep-pep1b-u6",
      "k": "textbook",
      "sp": null,
      "en": "It's a cow.",
      "zh": "这是一头奶牛。",
      "an": "https://english.example.com/audio/ep/ep-pep1b-u6/s004-n-5420a8.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep1b-u6/s004-s-ca49bc.mp3"
    },
    {
      "s": "s005",
      "e": "ep-pep1b-u6",
      "k": "textbook",
      "sp": null,
      "en": "It's a sheep.",
      "zh": "这是一只绵羊。",
      "an": "https://english.example.com/audio/ep/ep-pep1b-u6/s005-n-58b45c.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep1b-u6/s005-s-dec5d5.mp3"
    },
    {
      "s": "s006",
      "e": "ep-pep1b-u6",
      "k": "textbook",
      "sp": null,
      "en": "It's a horse.",
      "zh": "这是一匹马。",
      "an": "https://english.example.com/audio/ep/ep-pep1b-u6/s006-n-09172a.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep1b-u6/s006-s-7eef97.mp3"
    },
    {
      "s": "s007",
      "e": "ep-pep1b-u6",
      "k": "textbook",
      "sp": null,
      "en": "It's a hen.",
      "zh": "这是一只母鸡。",
      "an": "https://english.example.com/audio/ep/ep-pep1b-u6/s007-n-33359c.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep1b-u6/s007-s-9552b8.mp3"
    },
    {
      "s": "s008",
      "e": "ep-pep1b-u6",
      "k": "textbook",
      "sp": null,
      "en": "The pig is fat.",
      "zh": "这头猪很胖。",
      "an": "https://english.example.com/audio/ep/ep-pep1b-u6/s008-n-eaaac3.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep1b-u6/s008-s-359ac1.mp3"
    },
    {
      "s": "s009",
      "e": "ep-pep1b-u6",
      "k": "textbook",
      "sp": null,
      "en": "The duck is small.",
      "zh": "这只鸭子很小。",
      "an": "https://english.example.com/audio/ep/ep-pep1b-u6/s009-n-320dfd.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep1b-u6/s009-s-060e1e.mp3"
    },
    {
      "s": "s010",
      "e": "ep-pep1b-u6",
      "k": "textbook",
      "sp": null,
      "en": "The cow is big.",
      "zh": "这头奶牛很大。",
      "an": "https://english.example.com/audio/ep/ep-pep1b-u6/s010-n-a0dd47.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep1b-u6/s010-s-077087.mp3"
    },
    {
      "s": "s011",
      "e": "ep-pep1b-u6",
      "k": "textbook",
      "sp": null,
      "en": "The sheep is white.",
      "zh": "这只绵羊是白色的。",
      "an": "https://english.example.com/audio/ep/ep-pep1b-u6/s011-n-6cc421.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep1b-u6/s011-s-9bf423.mp3"
    },
    {
      "s": "s012",
      "e": "ep-pep1b-u6",
      "k": "textbook",
      "sp": null,
      "en": "The horse is big and tall.",
      "zh": "这匹马又大又高。",
      "an": "https://english.example.com/audio/ep/ep-pep1b-u6/s012-n-8df5fe.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep1b-u6/s012-s-fe1958.mp3"
    },
    {
      "s": "s001",
      "e": "ep-card-feelings-g1",
      "k": "card",
      "sp": "孩子",
      "en": "I'm so happy!",
      "zh": "我好开心！",
      "an": "https://english.example.com/audio/ep/ep-card-feelings-g1/s001-n-593b4e.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-feelings-g1/s001-s-d0d2af.mp3"
    },
    {
      "s": "s002",
      "e": "ep-card-feelings-g1",
      "k": "card",
      "sp": "孩子",
      "en": "I'm tired.",
      "zh": "我累了。",
      "an": "https://english.example.com/audio/ep/ep-card-feelings-g1/s002-n-8f11b3.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-feelings-g1/s002-s-da84fd.mp3"
    },
    {
      "s": "s003",
      "e": "ep-card-feelings-g1",
      "k": "card",
      "sp": "同学",
      "en": "What's wrong?",
      "zh": "你怎么了？",
      "an": "https://english.example.com/audio/ep/ep-card-feelings-g1/s003-n-616ff5.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-feelings-g1/s003-s-a7b416.mp3"
    },
    {
      "s": "s004",
      "e": "ep-card-feelings-g1",
      "k": "card",
      "sp": "孩子",
      "en": "I feel sad.",
      "zh": "我很难过。",
      "an": "https://english.example.com/audio/ep/ep-card-feelings-g1/s004-n-da963f.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-feelings-g1/s004-s-416d1d.mp3"
    },
    {
      "s": "s005",
      "e": "ep-card-feelings-g1",
      "k": "card",
      "sp": "孩子",
      "en": "I feel sick.",
      "zh": "我不舒服。",
      "an": "https://english.example.com/audio/ep/ep-card-feelings-g1/s005-n-9d24ec.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-feelings-g1/s005-s-4b6181.mp3"
    },
    {
      "s": "s001",
      "e": "ep-card-day-g1",
      "k": "card",
      "sp": "家长",
      "en": "Time to get up!",
      "zh": "该起床了！",
      "an": "https://english.example.com/audio/ep/ep-card-day-g1/s001-n-adc088.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-day-g1/s001-s-bd22c8.mp3"
    },
    {
      "s": "s002",
      "e": "ep-card-day-g1",
      "k": "card",
      "sp": "孩子",
      "en": "I'm getting up.",
      "zh": "我起来了。",
      "an": "https://english.example.com/audio/ep/ep-card-day-g1/s002-n-b6cf0b.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-day-g1/s002-s-16c8ce.mp3"
    },
    {
      "s": "s003",
      "e": "ep-card-day-g1",
      "k": "card",
      "sp": "孩子",
      "en": "I'm brushing my teeth.",
      "zh": "我在刷牙。",
      "an": "https://english.example.com/audio/ep/ep-card-day-g1/s003-n-c02191.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-day-g1/s003-s-7461b9.mp3"
    },
    {
      "s": "s004",
      "e": "ep-card-day-g1",
      "k": "card",
      "sp": "家长",
      "en": "Time for school!",
      "zh": "该上学了！",
      "an": "https://english.example.com/audio/ep/ep-card-day-g1/s004-n-330e62.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-day-g1/s004-s-0330c5.mp3"
    },
    {
      "s": "s005",
      "e": "ep-card-day-g1",
      "k": "card",
      "sp": "孩子",
      "en": "Good night, Mom!",
      "zh": "晚安，妈妈！",
      "an": "https://english.example.com/audio/ep/ep-card-day-g1/s005-n-7ce6ee.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-day-g1/s005-s-c1b95d.mp3"
    },
    {
      "s": "s001",
      "e": "ep-card-weather-g1",
      "k": "card",
      "sp": "家长",
      "en": "How's the weather?",
      "zh": "今天天气怎么样？",
      "an": "https://english.example.com/audio/ep/ep-card-weather-g1/s001-n-90225f.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-weather-g1/s001-s-b8e1ca.mp3"
    },
    {
      "s": "s002",
      "e": "ep-card-weather-g1",
      "k": "card",
      "sp": "孩子",
      "en": "It's rainy today.",
      "zh": "今天是雨天。",
      "an": "https://english.example.com/audio/ep/ep-card-weather-g1/s002-n-933181.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-weather-g1/s002-s-1dde99.mp3"
    },
    {
      "s": "s003",
      "e": "ep-card-weather-g1",
      "k": "card",
      "sp": "家长",
      "en": "Take your umbrella.",
      "zh": "带上你的伞。",
      "an": "https://english.example.com/audio/ep/ep-card-weather-g1/s003-n-f732a5.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-weather-g1/s003-s-e40973.mp3"
    },
    {
      "s": "s004",
      "e": "ep-card-weather-g1",
      "k": "card",
      "sp": "孩子",
      "en": "It's cold, too.",
      "zh": "也很冷。",
      "an": "https://english.example.com/audio/ep/ep-card-weather-g1/s004-n-c364f1.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-weather-g1/s004-s-59ff9a.mp3"
    },
    {
      "s": "s005",
      "e": "ep-card-weather-g1",
      "k": "card",
      "sp": "家长",
      "en": "Wear your coat.",
      "zh": "穿上外套。",
      "an": "https://english.example.com/audio/ep/ep-card-weather-g1/s005-n-58e9ff.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-weather-g1/s005-s-7fbf5f.mp3"
    },
    {
      "s": "s001",
      "e": "ep-card-hurt-g1",
      "k": "card",
      "sp": "孩子",
      "en": "My tummy hurts.",
      "zh": "我肚子疼。",
      "an": "https://english.example.com/audio/ep/ep-card-hurt-g1/s001-n-3da224.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-hurt-g1/s001-s-72a379.mp3"
    },
    {
      "s": "s002",
      "e": "ep-card-hurt-g1",
      "k": "card",
      "sp": "孩子",
      "en": "My head hurts.",
      "zh": "我头疼。",
      "an": "https://english.example.com/audio/ep/ep-card-hurt-g1/s002-n-8772b9.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-hurt-g1/s002-s-84b2be.mp3"
    },
    {
      "s": "s003",
      "e": "ep-card-hurt-g1",
      "k": "card",
      "sp": "孩子",
      "en": "I bumped my knee.",
      "zh": "我磕到膝盖了。",
      "an": "https://english.example.com/audio/ep/ep-card-hurt-g1/s003-n-5c6e8c.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-hurt-g1/s003-s-92c9ce.mp3"
    },
    {
      "s": "s004",
      "e": "ep-card-hurt-g1",
      "k": "card",
      "sp": "孩子",
      "en": "I need a bandage.",
      "zh": "我需要创可贴。",
      "an": "https://english.example.com/audio/ep/ep-card-hurt-g1/s004-n-cfd8ab.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-hurt-g1/s004-s-a2aeb1.mp3"
    },
    {
      "s": "s005",
      "e": "ep-card-hurt-g1",
      "k": "card",
      "sp": "孩子",
      "en": "Please call my mom.",
      "zh": "请给我妈妈打电话。",
      "an": "https://english.example.com/audio/ep/ep-card-hurt-g1/s005-n-ed01df.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-hurt-g1/s005-s-08da55.mp3"
    },
    {
      "s": "s001",
      "e": "ep-card-toys-g1",
      "k": "card",
      "sp": "孩子",
      "en": "This is my toy.",
      "zh": "这是我的玩具。",
      "an": "https://english.example.com/audio/ep/ep-card-toys-g1/s001-n-d81f45.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-toys-g1/s001-s-f116fb.mp3"
    },
    {
      "s": "s002",
      "e": "ep-card-toys-g1",
      "k": "card",
      "sp": "同学",
      "en": "Can I play too?",
      "zh": "我也能玩吗？",
      "an": "https://english.example.com/audio/ep/ep-card-toys-g1/s002-n-95d637.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-toys-g1/s002-s-7b445a.mp3"
    },
    {
      "s": "s003",
      "e": "ep-card-toys-g1",
      "k": "card",
      "sp": "孩子",
      "en": "Yes. Let's share.",
      "zh": "可以。我们一起分享。",
      "an": "https://english.example.com/audio/ep/ep-card-toys-g1/s003-n-6bf561.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-toys-g1/s003-s-cd96b9.mp3"
    },
    {
      "s": "s004",
      "e": "ep-card-toys-g1",
      "k": "card",
      "sp": "孩子",
      "en": "You can use this.",
      "zh": "这个给你用。",
      "an": "https://english.example.com/audio/ep/ep-card-toys-g1/s004-n-0ea39a.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-toys-g1/s004-s-384cf0.mp3"
    },
    {
      "s": "s005",
      "e": "ep-card-toys-g1",
      "k": "card",
      "sp": "同学",
      "en": "Here, this is for you.",
      "zh": "给，这个给你。",
      "an": "https://english.example.com/audio/ep/ep-card-toys-g1/s005-n-a28ca0.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-toys-g1/s005-s-f2021e.mp3"
    },
    {
      "s": "s001",
      "e": "ep-card-park-g1",
      "k": "card",
      "sp": "孩子",
      "en": "Let's go outside!",
      "zh": "我们出去吧！",
      "an": "https://english.example.com/audio/ep/ep-card-park-g1/s001-n-b84237.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-park-g1/s001-s-49c254.mp3"
    },
    {
      "s": "s002",
      "e": "ep-card-park-g1",
      "k": "card",
      "sp": "家长",
      "en": "Get your shoes.",
      "zh": "去拿你的鞋子。",
      "an": "https://english.example.com/audio/ep/ep-card-park-g1/s002-n-777d0d.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-park-g1/s002-s-24dcf3.mp3"
    },
    {
      "s": "s003",
      "e": "ep-card-park-g1",
      "k": "card",
      "sp": "孩子",
      "en": "Can we go now?",
      "zh": "我们现在可以走了吗？",
      "an": "https://english.example.com/audio/ep/ep-card-park-g1/s003-n-e902c8.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-park-g1/s003-s-1e4bca.mp3"
    },
    {
      "s": "s004",
      "e": "ep-card-park-g1",
      "k": "card",
      "sp": "孩子",
      "en": "I want to swing.",
      "zh": "我想荡秋千。",
      "an": "https://english.example.com/audio/ep/ep-card-park-g1/s004-n-f34766.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-park-g1/s004-s-ee7c96.mp3"
    },
    {
      "s": "s005",
      "e": "ep-card-park-g1",
      "k": "card",
      "sp": "家长",
      "en": "Time to go home.",
      "zh": "该回家了。",
      "an": "https://english.example.com/audio/ep/ep-card-park-g1/s005-n-cca411.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-park-g1/s005-s-f492b6.mp3"
    },
    {
      "s": "s001",
      "e": "ep-card-shop-g1",
      "k": "card",
      "sp": "孩子",
      "en": "How much is this?",
      "zh": "这个多少钱？",
      "an": "https://english.example.com/audio/ep/ep-card-shop-g1/s001-n-ad1418.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-shop-g1/s001-s-a9a9cb.mp3"
    },
    {
      "s": "s002",
      "e": "ep-card-shop-g1",
      "k": "card",
      "sp": "店员",
      "en": "It's five yuan.",
      "zh": "五块钱。",
      "an": "https://english.example.com/audio/ep/ep-card-shop-g1/s002-n-834c61.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-shop-g1/s002-s-580004.mp3"
    },
    {
      "s": "s003",
      "e": "ep-card-shop-g1",
      "k": "card",
      "sp": "孩子",
      "en": "I want this, please.",
      "zh": "请给我这个。",
      "an": "https://english.example.com/audio/ep/ep-card-shop-g1/s003-n-28bf2e.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-shop-g1/s003-s-298fbb.mp3"
    },
    {
      "s": "s004",
      "e": "ep-card-shop-g1",
      "k": "card",
      "sp": "孩子",
      "en": "Can I have a bag?",
      "zh": "可以给我一个袋子吗？",
      "an": "https://english.example.com/audio/ep/ep-card-shop-g1/s004-n-2363f0.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-shop-g1/s004-s-fe03ec.mp3"
    },
    {
      "s": "s005",
      "e": "ep-card-shop-g1",
      "k": "card",
      "sp": "店员",
      "en": "Here is your bag.",
      "zh": "这是你的袋子。",
      "an": "https://english.example.com/audio/ep/ep-card-shop-g1/s005-n-44a5f6.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-shop-g1/s005-s-aaba38.mp3"
    },
    {
      "s": "s001",
      "e": "ep-card-pets-g1",
      "k": "card",
      "sp": "孩子",
      "en": "This is my cat.",
      "zh": "这是我的猫。",
      "an": "https://english.example.com/audio/ep/ep-card-pets-g1/s001-n-15c2da.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-pets-g1/s001-s-edef9f.mp3"
    },
    {
      "s": "s002",
      "e": "ep-card-pets-g1",
      "k": "card",
      "sp": "同学",
      "en": "What's its name?",
      "zh": "它叫什么名字？",
      "an": "https://english.example.com/audio/ep/ep-card-pets-g1/s002-n-8d81b9.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-pets-g1/s002-s-dc322f.mp3"
    },
    {
      "s": "s003",
      "e": "ep-card-pets-g1",
      "k": "card",
      "sp": "孩子",
      "en": "Her name is Mimi.",
      "zh": "它叫咪咪。",
      "an": "https://english.example.com/audio/ep/ep-card-pets-g1/s003-n-bf571e.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-pets-g1/s003-s-c8bcdb.mp3"
    },
    {
      "s": "s004",
      "e": "ep-card-pets-g1",
      "k": "card",
      "sp": "孩子",
      "en": "Can I pet your dog?",
      "zh": "我可以摸摸你的狗吗？",
      "an": "https://english.example.com/audio/ep/ep-card-pets-g1/s004-n-0bc732.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-pets-g1/s004-s-cdd3e8.mp3"
    },
    {
      "s": "s005",
      "e": "ep-card-pets-g1",
      "k": "card",
      "sp": "同学",
      "en": "Yes. Be gentle.",
      "zh": "可以。要轻轻的。",
      "an": "https://english.example.com/audio/ep/ep-card-pets-g1/s005-n-1ed9a5.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-pets-g1/s005-s-0e68b4.mp3"
    },
    {
      "s": "s001",
      "e": "ep-card-bedtime-g1",
      "k": "card",
      "sp": "家长",
      "en": "It's time for bed.",
      "zh": "该睡觉了。",
      "an": "https://english.example.com/audio/ep/ep-card-bedtime-g1/s001-n-6ee3b7.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-bedtime-g1/s001-s-6a087f.mp3"
    },
    {
      "s": "s002",
      "e": "ep-card-bedtime-g1",
      "k": "card",
      "sp": "孩子",
      "en": "I'm sleepy.",
      "zh": "我困了。",
      "an": "https://english.example.com/audio/ep/ep-card-bedtime-g1/s002-n-ce5433.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-bedtime-g1/s002-s-954f33.mp3"
    },
    {
      "s": "s003",
      "e": "ep-card-bedtime-g1",
      "k": "card",
      "sp": "孩子",
      "en": "Can I have a story?",
      "zh": "可以给我讲个故事吗？",
      "an": "https://english.example.com/audio/ep/ep-card-bedtime-g1/s003-n-f514fa.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-bedtime-g1/s003-s-c48389.mp3"
    },
    {
      "s": "s004",
      "e": "ep-card-bedtime-g1",
      "k": "card",
      "sp": "家长",
      "en": "Yes. Let's read one.",
      "zh": "可以。我们读一个吧。",
      "an": "https://english.example.com/audio/ep/ep-card-bedtime-g1/s004-n-826ad3.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-bedtime-g1/s004-s-e336e3.mp3"
    },
    {
      "s": "s005",
      "e": "ep-card-bedtime-g1",
      "k": "card",
      "sp": "孩子",
      "en": "Good night. I love you.",
      "zh": "晚安。我爱你。",
      "an": "https://english.example.com/audio/ep/ep-card-bedtime-g1/s005-n-81338f.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-bedtime-g1/s005-s-df7cfe.mp3"
    },
    {
      "s": "s001",
      "e": "ep-card-family-g1",
      "k": "card",
      "sp": "孩子",
      "en": "This is my mom.",
      "zh": "这是我妈妈。",
      "an": "https://english.example.com/audio/ep/ep-card-family-g1/s001-n-316632.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-family-g1/s001-s-d98f55.mp3"
    },
    {
      "s": "s002",
      "e": "ep-card-family-g1",
      "k": "card",
      "sp": "孩子",
      "en": "This is my dad.",
      "zh": "这是我爸爸。",
      "an": "https://english.example.com/audio/ep/ep-card-family-g1/s002-n-89bd05.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-family-g1/s002-s-c9a5c9.mp3"
    },
    {
      "s": "s003",
      "e": "ep-card-family-g1",
      "k": "card",
      "sp": "同学",
      "en": "Who is this?",
      "zh": "这是谁？",
      "an": "https://english.example.com/audio/ep/ep-card-family-g1/s003-n-5b02f5.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-family-g1/s003-s-0b528e.mp3"
    },
    {
      "s": "s004",
      "e": "ep-card-family-g1",
      "k": "card",
      "sp": "孩子",
      "en": "This is my brother.",
      "zh": "这是我弟弟。",
      "an": "https://english.example.com/audio/ep/ep-card-family-g1/s004-n-d4cada.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-family-g1/s004-s-98970e.mp3"
    },
    {
      "s": "s005",
      "e": "ep-card-family-g1",
      "k": "card",
      "sp": "孩子",
      "en": "I love my family.",
      "zh": "我爱我的家人。",
      "an": "https://english.example.com/audio/ep/ep-card-family-g1/s005-n-a09c4d.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-family-g1/s005-s-95803e.mp3"
    },
    {
      "s": "s001",
      "e": "ep-card-birthday-g1",
      "k": "card",
      "sp": "孩子",
      "en": "Happy birthday, Ben!",
      "zh": "生日快乐，Ben！",
      "an": "https://english.example.com/audio/ep/ep-card-birthday-g1/s001-n-2f02db.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-birthday-g1/s001-s-cbbca3.mp3"
    },
    {
      "s": "s002",
      "e": "ep-card-birthday-g1",
      "k": "card",
      "sp": "同学",
      "en": "Thank you, Lily.",
      "zh": "谢谢你，Lily。",
      "an": "https://english.example.com/audio/ep/ep-card-birthday-g1/s002-n-18775d.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-birthday-g1/s002-s-d3b2b6.mp3"
    },
    {
      "s": "s003",
      "e": "ep-card-birthday-g1",
      "k": "card",
      "sp": "孩子",
      "en": "Here's your gift.",
      "zh": "这是给你的礼物。",
      "an": "https://english.example.com/audio/ep/ep-card-birthday-g1/s003-n-1fe37f.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-birthday-g1/s003-s-3b9c8e.mp3"
    },
    {
      "s": "s004",
      "e": "ep-card-birthday-g1",
      "k": "card",
      "sp": "同学",
      "en": "Wow, I love it!",
      "zh": "哇，我好喜欢！",
      "an": "https://english.example.com/audio/ep/ep-card-birthday-g1/s004-n-50ab9c.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-birthday-g1/s004-s-63deb3.mp3"
    },
    {
      "s": "s005",
      "e": "ep-card-birthday-g1",
      "k": "card",
      "sp": "孩子",
      "en": "Make a wish!",
      "zh": "许个愿吧！",
      "an": "https://english.example.com/audio/ep/ep-card-birthday-g1/s005-n-444ec2.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-birthday-g1/s005-s-075e9a.mp3"
    },
    {
      "s": "s001",
      "e": "ep-card-help-g1",
      "k": "card",
      "sp": "家长",
      "en": "Can you help me?",
      "zh": "你能帮帮我吗？",
      "an": "https://english.example.com/audio/ep/ep-card-help-g1/s001-n-744790.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-help-g1/s001-s-bb3c44.mp3"
    },
    {
      "s": "s002",
      "e": "ep-card-help-g1",
      "k": "card",
      "sp": "孩子",
      "en": "Yes, I can help.",
      "zh": "可以，我能帮忙。",
      "an": "https://english.example.com/audio/ep/ep-card-help-g1/s002-n-fb5737.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-help-g1/s002-s-bfd3ec.mp3"
    },
    {
      "s": "s003",
      "e": "ep-card-help-g1",
      "k": "card",
      "sp": "家长",
      "en": "Please tidy up.",
      "zh": "请收拾一下。",
      "an": "https://english.example.com/audio/ep/ep-card-help-g1/s003-n-9750bf.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-help-g1/s003-s-d644e2.mp3"
    },
    {
      "s": "s004",
      "e": "ep-card-help-g1",
      "k": "card",
      "sp": "孩子",
      "en": "I can do it.",
      "zh": "我能做到。",
      "an": "https://english.example.com/audio/ep/ep-card-help-g1/s004-n-c66915.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-help-g1/s004-s-937fe3.mp3"
    },
    {
      "s": "s005",
      "e": "ep-card-help-g1",
      "k": "card",
      "sp": "家长",
      "en": "You're a great helper.",
      "zh": "你真是个好帮手。",
      "an": "https://english.example.com/audio/ep/ep-card-help-g1/s005-n-233370.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-help-g1/s005-s-dbfee5.mp3"
    },
    {
      "s": "s001",
      "e": "ep-card-library-g1",
      "k": "card",
      "sp": "孩子",
      "en": "This is the library.",
      "zh": "这是图书馆。",
      "an": "https://english.example.com/audio/ep/ep-card-library-g1/s001-n-bfe94c.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-library-g1/s001-s-6f6f29.mp3"
    },
    {
      "s": "s002",
      "e": "ep-card-library-g1",
      "k": "card",
      "sp": "同学",
      "en": "Please be quiet.",
      "zh": "请安静。",
      "an": "https://english.example.com/audio/ep/ep-card-library-g1/s002-n-438972.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-library-g1/s002-s-b0abca.mp3"
    },
    {
      "s": "s003",
      "e": "ep-card-library-g1",
      "k": "card",
      "sp": "孩子",
      "en": "I like this book.",
      "zh": "我喜欢这本书。",
      "an": "https://english.example.com/audio/ep/ep-card-library-g1/s003-n-686df8.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-library-g1/s003-s-04c171.mp3"
    },
    {
      "s": "s004",
      "e": "ep-card-library-g1",
      "k": "card",
      "sp": "同学",
      "en": "Can I read it?",
      "zh": "我可以看吗？",
      "an": "https://english.example.com/audio/ep/ep-card-library-g1/s004-n-4daf3b.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-library-g1/s004-s-45f795.mp3"
    },
    {
      "s": "s005",
      "e": "ep-card-library-g1",
      "k": "card",
      "sp": "孩子",
      "en": "Let's sit down.",
      "zh": "我们坐下吧。",
      "an": "https://english.example.com/audio/ep/ep-card-library-g1/s005-n-10befa.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-library-g1/s005-s-bf9b41.mp3"
    },
    {
      "s": "s001",
      "e": "ep-card-soccer-g1",
      "k": "card",
      "sp": "孩子",
      "en": "Let's play soccer.",
      "zh": "我们来踢足球吧。",
      "an": "https://english.example.com/audio/ep/ep-card-soccer-g1/s001-n-e3c660.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-soccer-g1/s001-s-203393.mp3"
    },
    {
      "s": "s002",
      "e": "ep-card-soccer-g1",
      "k": "card",
      "sp": "同学",
      "en": "Pass the ball, please.",
      "zh": "请把球传过来。",
      "an": "https://english.example.com/audio/ep/ep-card-soccer-g1/s002-n-156a4e.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-soccer-g1/s002-s-4d30d2.mp3"
    },
    {
      "s": "s003",
      "e": "ep-card-soccer-g1",
      "k": "card",
      "sp": "孩子",
      "en": "Nice shot, Ben!",
      "zh": "好球，Ben！",
      "an": "https://english.example.com/audio/ep/ep-card-soccer-g1/s003-n-2b3a24.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-soccer-g1/s003-s-c297e1.mp3"
    },
    {
      "s": "s004",
      "e": "ep-card-soccer-g1",
      "k": "card",
      "sp": "同学",
      "en": "We can do it.",
      "zh": "我们能行。",
      "an": "https://english.example.com/audio/ep/ep-card-soccer-g1/s004-n-95cb7d.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-soccer-g1/s004-s-3f5eb7.mp3"
    },
    {
      "s": "s005",
      "e": "ep-card-soccer-g1",
      "k": "card",
      "sp": "孩子",
      "en": "Good game!",
      "zh": "比赛真精彩！",
      "an": "https://english.example.com/audio/ep/ep-card-soccer-g1/s005-n-7f9b2d.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-soccer-g1/s005-s-d28467.mp3"
    },
    {
      "s": "s001",
      "e": "ep-card-bus-g1",
      "k": "card",
      "sp": "孩子",
      "en": "Here's the bus.",
      "zh": "公交车来了。",
      "an": "https://english.example.com/audio/ep/ep-card-bus-g1/s001-n-44997e.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-bus-g1/s001-s-8b4162.mp3"
    },
    {
      "s": "s002",
      "e": "ep-card-bus-g1",
      "k": "card",
      "sp": "同学",
      "en": "Let's get on.",
      "zh": "我们上车吧。",
      "an": "https://english.example.com/audio/ep/ep-card-bus-g1/s002-n-06e3f1.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-bus-g1/s002-s-c41957.mp3"
    },
    {
      "s": "s003",
      "e": "ep-card-bus-g1",
      "k": "card",
      "sp": "孩子",
      "en": "I have a ticket.",
      "zh": "我有车票。",
      "an": "https://english.example.com/audio/ep/ep-card-bus-g1/s003-n-167b7b.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-bus-g1/s003-s-abef70.mp3"
    },
    {
      "s": "s004",
      "e": "ep-card-bus-g1",
      "k": "card",
      "sp": "同学",
      "en": "We can sit here.",
      "zh": "我们可以坐这里。",
      "an": "https://english.example.com/audio/ep/ep-card-bus-g1/s004-n-78b1fc.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-bus-g1/s004-s-198af6.mp3"
    },
    {
      "s": "s005",
      "e": "ep-card-bus-g1",
      "k": "card",
      "sp": "孩子",
      "en": "This is our stop.",
      "zh": "这是我们的站。",
      "an": "https://english.example.com/audio/ep/ep-card-bus-g1/s005-n-dec63a.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-bus-g1/s005-s-91eead.mp3"
    },
    {
      "s": "s001",
      "e": "ep-video-grocerystore-1",
      "k": "video",
      "sp": "Caitie",
      "en": "Let's go on a field trip with Caitie's Classroom.",
      "zh": "我们跟着 Caitie's Classroom 去实地看看吧。",
      "an": "https://english.example.com/audio/ep/ep-video-grocerystore-1/s001-n-9f48ad.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-grocerystore-1/s001-s-460d49.mp3"
    },
    {
      "s": "s002",
      "e": "ep-video-grocerystore-1",
      "k": "video",
      "sp": "Caitie",
      "en": "Hi, friends.",
      "zh": "嗨，朋友们。",
      "an": "https://english.example.com/audio/ep/ep-video-grocerystore-1/s002-n-4492df.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-grocerystore-1/s002-s-a2b6fc.mp3"
    },
    {
      "s": "s003",
      "e": "ep-video-grocerystore-1",
      "k": "video",
      "sp": "Caitie",
      "en": "I'm grocery shopping at the grocery store.",
      "zh": "我正在超市买东西。",
      "an": "https://english.example.com/audio/ep/ep-video-grocerystore-1/s003-n-6e286f.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-grocerystore-1/s003-s-a46d36.mp3"
    },
    {
      "s": "s004",
      "e": "ep-video-grocerystore-1",
      "k": "video",
      "sp": "Caitie",
      "en": "I have a list of things that I need and my shopping cart all ready to go.",
      "zh": "我有一份要买的清单，购物车也准备好了。",
      "an": "https://english.example.com/audio/ep/ep-video-grocerystore-1/s004-n-3a50bf.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-grocerystore-1/s004-s-f47fd8.mp3"
    },
    {
      "s": "s005",
      "e": "ep-video-grocerystore-1",
      "k": "video",
      "sp": "Caitie",
      "en": "Would you like to come grocery shopping with me?",
      "zh": "你想和我一起去超市购物吗？",
      "an": "https://english.example.com/audio/ep/ep-video-grocerystore-1/s005-n-3880aa.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-grocerystore-1/s005-s-bc53db.mp3"
    },
    {
      "s": "s006",
      "e": "ep-video-grocerystore-1",
      "k": "video",
      "sp": "Caitie",
      "en": "I could use your help.",
      "zh": "我需要你帮帮忙。",
      "an": "https://english.example.com/audio/ep/ep-video-grocerystore-1/s006-n-f28654.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-grocerystore-1/s006-s-18fc6d.mp3"
    },
    {
      "s": "s007",
      "e": "ep-video-grocerystore-1",
      "k": "video",
      "sp": "Caitie",
      "en": "Let's go!",
      "zh": "我们走吧！",
      "an": "https://english.example.com/audio/ep/ep-video-grocerystore-1/s007-n-72ca0f.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-grocerystore-1/s007-s-f5b69c.mp3"
    },
    {
      "s": "s008",
      "e": "ep-video-grocerystore-1",
      "k": "video",
      "sp": "Caitie",
      "en": "There are so many different colors in the produce section.",
      "zh": "果蔬区有好多不同的颜色。",
      "an": "https://english.example.com/audio/ep/ep-video-grocerystore-1/s008-n-b775a4.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-grocerystore-1/s008-s-9c02bf.mp3"
    },
    {
      "s": "s009",
      "e": "ep-video-grocerystore-1",
      "k": "video",
      "sp": "Caitie",
      "en": "That's where all the fruits and vegetables are.",
      "zh": "水果和蔬菜都在那里。",
      "an": "https://english.example.com/audio/ep/ep-video-grocerystore-1/s009-n-9bfcba.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-grocerystore-1/s009-s-2d0521.mp3"
    },
    {
      "s": "s010",
      "e": "ep-video-grocerystore-1",
      "k": "video",
      "sp": "Caitie",
      "en": "I see green, red, orange, yellow, purple, white, blue, and brown.",
      "zh": "我看到绿色、红色、橙色、黄色、紫色、白色、蓝色和棕色。",
      "an": "https://english.example.com/audio/ep/ep-video-grocerystore-1/s010-n-f4277f.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-grocerystore-1/s010-s-6b1269.mp3"
    },
    {
      "s": "s011",
      "e": "ep-video-grocerystore-1",
      "k": "video",
      "sp": "Caitie",
      "en": "The first thing on our list is bell peppers.",
      "zh": "清单上第一样是彩椒。",
      "an": "https://english.example.com/audio/ep/ep-video-grocerystore-1/s011-n-44e5f3.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-grocerystore-1/s011-s-2978b1.mp3"
    },
    {
      "s": "s012",
      "e": "ep-video-grocerystore-1",
      "k": "video",
      "sp": "Caitie",
      "en": "It looks like this and comes in different colors.",
      "zh": "它长这样，而且有不同的颜色。",
      "an": "https://english.example.com/audio/ep/ep-video-grocerystore-1/s012-n-1f5777.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-grocerystore-1/s012-s-68763e.mp3"
    },
    {
      "s": "s013",
      "e": "ep-video-grocerystore-1",
      "k": "video",
      "sp": "Caitie",
      "en": "Can you see the bell peppers?",
      "zh": "你能看到彩椒吗？",
      "an": "https://english.example.com/audio/ep/ep-video-grocerystore-1/s013-n-56a589.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-grocerystore-1/s013-s-02a69c.mp3"
    },
    {
      "s": "s014",
      "e": "ep-video-grocerystore-1",
      "k": "video",
      "sp": "Caitie",
      "en": "We found them!",
      "zh": "我们找到了！",
      "an": "https://english.example.com/audio/ep/ep-video-grocerystore-1/s014-n-f07988.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-grocerystore-1/s014-s-34ef5c.mp3"
    },
    {
      "s": "s015",
      "e": "ep-video-grocerystore-1",
      "k": "video",
      "sp": "Caitie",
      "en": "Look at all the different colors.",
      "zh": "看看这些不同的颜色。",
      "an": "https://english.example.com/audio/ep/ep-video-grocerystore-1/s015-n-b0dcaa.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-grocerystore-1/s015-s-7cd0de.mp3"
    },
    {
      "s": "s016",
      "e": "ep-video-grocerystore-1",
      "k": "video",
      "sp": "Caitie",
      "en": "There's red bell peppers, green bell peppers, yellow bell peppers, and orange bell peppers.",
      "zh": "有红彩椒、绿彩椒、黄彩椒，还有橙色彩椒。",
      "an": "https://english.example.com/audio/ep/ep-video-grocerystore-1/s016-n-b1f925.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-grocerystore-1/s016-s-b7f416.mp3"
    },
    {
      "s": "s017",
      "e": "ep-video-grocerystore-1",
      "k": "video",
      "sp": "Caitie",
      "en": "Which color should we get?",
      "zh": "我们要买哪种颜色呢？",
      "an": "https://english.example.com/audio/ep/ep-video-grocerystore-1/s017-n-3ae04a.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-grocerystore-1/s017-s-5918ff.mp3"
    },
    {
      "s": "s018",
      "e": "ep-video-grocerystore-1",
      "k": "video",
      "sp": "Caitie",
      "en": "Let's get the yellow bell pepper.",
      "zh": "我们买黄彩椒吧。",
      "an": "https://english.example.com/audio/ep/ep-video-grocerystore-1/s018-n-229892.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-grocerystore-1/s018-s-595a68.mp3"
    },
    {
      "s": "s019",
      "e": "ep-video-grocerystore-1",
      "k": "video",
      "sp": "Caitie",
      "en": "Kind of matches the color of my apron.",
      "zh": "有点配我围裙的颜色。",
      "an": "https://english.example.com/audio/ep/ep-video-grocerystore-1/s019-n-892722.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-grocerystore-1/s019-s-37a48e.mp3"
    },
    {
      "s": "s020",
      "e": "ep-video-grocerystore-1",
      "k": "video",
      "sp": "Caitie",
      "en": "Great job!",
      "zh": "做得好！",
      "an": "https://english.example.com/audio/ep/ep-video-grocerystore-1/s020-n-f64c77.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-grocerystore-1/s020-s-4ee986.mp3"
    },
    {
      "s": "s021",
      "e": "ep-video-grocerystore-1",
      "k": "video",
      "sp": "Caitie",
      "en": "Next on our list is oranges.",
      "zh": "清单上下一样是橙子。",
      "an": "https://english.example.com/audio/ep/ep-video-grocerystore-1/s021-n-17c36d.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-grocerystore-1/s021-s-e31152.mp3"
    },
    {
      "s": "s022",
      "e": "ep-video-grocerystore-1",
      "k": "video",
      "sp": "Caitie",
      "en": "Can you find the oranges?",
      "zh": "你能找到橙子吗？",
      "an": "https://english.example.com/audio/ep/ep-video-grocerystore-1/s022-n-739a5f.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-grocerystore-1/s022-s-d6ca41.mp3"
    },
    {
      "s": "s023",
      "e": "ep-video-grocerystore-1",
      "k": "video",
      "sp": "Caitie",
      "en": "Here they are.",
      "zh": "在这里。",
      "an": "https://english.example.com/audio/ep/ep-video-grocerystore-1/s023-n-8cd2ed.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-grocerystore-1/s023-s-2ef23d.mp3"
    },
    {
      "s": "s024",
      "e": "ep-video-grocerystore-1",
      "k": "video",
      "sp": "Caitie",
      "en": "Way to go!",
      "zh": "真棒！",
      "an": "https://english.example.com/audio/ep/ep-video-grocerystore-1/s024-n-056757.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-grocerystore-1/s024-s-3d3620.mp3"
    },
    {
      "s": "s025",
      "e": "ep-video-grocerystore-1",
      "k": "video",
      "sp": "Caitie",
      "en": "Let's get four oranges.",
      "zh": "我们买四个橙子吧。",
      "an": "https://english.example.com/audio/ep/ep-video-grocerystore-1/s025-n-029183.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-grocerystore-1/s025-s-7f306e.mp3"
    },
    {
      "s": "s026",
      "e": "ep-video-grocerystore-1",
      "k": "video",
      "sp": "Caitie",
      "en": "We can count them together as we put them inside this bag.",
      "zh": "我们把它们放进袋子里的时候，可以一起数。",
      "an": "https://english.example.com/audio/ep/ep-video-grocerystore-1/s026-n-72aeb9.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-grocerystore-1/s026-s-ef26ba.mp3"
    },
    {
      "s": "s027",
      "e": "ep-video-grocerystore-1",
      "k": "video",
      "sp": "Caitie",
      "en": "One, two, three, four.",
      "zh": "一，二，三，四。",
      "an": "https://english.example.com/audio/ep/ep-video-grocerystore-1/s027-n-614e94.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-grocerystore-1/s027-s-1171b4.mp3"
    },
    {
      "s": "s028",
      "e": "ep-video-grocerystore-1",
      "k": "video",
      "sp": "Caitie",
      "en": "Four oranges.",
      "zh": "四个橙子。",
      "an": "https://english.example.com/audio/ep/ep-video-grocerystore-1/s028-n-5da4ed.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-grocerystore-1/s028-s-20d36f.mp3"
    },
    {
      "s": "s029",
      "e": "ep-video-grocerystore-1",
      "k": "video",
      "sp": "Caitie",
      "en": "It's kind of funny that oranges are called oranges and they're the color orange.",
      "zh": "有点好玩：橙子叫 orange，而它们的颜色也是橙色。",
      "an": "https://english.example.com/audio/ep/ep-video-grocerystore-1/s029-n-cad72d.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-grocerystore-1/s029-s-872a2b.mp3"
    },
    {
      "s": "s030",
      "e": "ep-video-grocerystore-1",
      "k": "video",
      "sp": "Caitie",
      "en": "Next on our list is, ooh, mushrooms.",
      "zh": "清单上下一样是——噢，蘑菇。",
      "an": "https://english.example.com/audio/ep/ep-video-grocerystore-1/s030-n-9b2f58.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-grocerystore-1/s030-s-6d6d42.mp3"
    },
    {
      "s": "s031",
      "e": "ep-video-grocerystore-1",
      "k": "video",
      "sp": "Caitie",
      "en": "This store has an excellent selection of mushrooms.",
      "zh": "这家店的蘑菇种类非常多。",
      "an": "https://english.example.com/audio/ep/ep-video-grocerystore-1/s031-n-464d24.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-grocerystore-1/s031-s-52f676.mp3"
    },
    {
      "s": "s032",
      "e": "ep-video-grocerystore-1",
      "k": "video",
      "sp": "Caitie",
      "en": "Come with me.",
      "zh": "跟我来。",
      "an": "https://english.example.com/audio/ep/ep-video-grocerystore-1/s032-n-7acc69.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-grocerystore-1/s032-s-3f81a8.mp3"
    },
    {
      "s": "s033",
      "e": "ep-video-grocerystore-1",
      "k": "video",
      "sp": "Caitie",
      "en": "Look at how many different kinds of mushrooms there are.",
      "zh": "看看这里有多少种不同的蘑菇。",
      "an": "https://english.example.com/audio/ep/ep-video-grocerystore-1/s033-n-d97f62.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-grocerystore-1/s033-s-36016a.mp3"
    },
    {
      "s": "s034",
      "e": "ep-video-grocerystore-1",
      "k": "video",
      "sp": "Caitie",
      "en": "They have some fun names too.",
      "zh": "它们的名字也很好玩。",
      "an": "https://english.example.com/audio/ep/ep-video-grocerystore-1/s034-n-dfc537.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-grocerystore-1/s034-s-019b1c.mp3"
    },
    {
      "s": "s035",
      "e": "ep-video-grocerystore-1",
      "k": "video",
      "sp": "Caitie",
      "en": "Blue oyster.",
      "zh": "蓝平菇。",
      "an": "https://english.example.com/audio/ep/ep-video-grocerystore-1/s035-n-27793c.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-grocerystore-1/s035-s-bd2e71.mp3"
    },
    {
      "s": "s036",
      "e": "ep-video-grocerystore-1",
      "k": "video",
      "sp": "Caitie",
      "en": "Hen of the woods.",
      "zh": "灰树花。",
      "an": "https://english.example.com/audio/ep/ep-video-grocerystore-1/s036-n-52e9af.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-grocerystore-1/s036-s-e23d4e.mp3"
    },
    {
      "s": "s037",
      "e": "ep-video-grocerystore-1",
      "k": "video",
      "sp": "Caitie",
      "en": "Lion's mane.",
      "zh": "猴头菇。",
      "an": "https://english.example.com/audio/ep/ep-video-grocerystore-1/s037-n-e111af.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-grocerystore-1/s037-s-9e2d9c.mp3"
    },
    {
      "s": "s038",
      "e": "ep-video-grocerystore-1",
      "k": "video",
      "sp": "Caitie",
      "en": "Today, let's get eight cremini mushrooms.",
      "zh": "今天我们买八朵棕色蘑菇吧。",
      "an": "https://english.example.com/audio/ep/ep-video-grocerystore-1/s038-n-f2e86c.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-grocerystore-1/s038-s-ae3f1b.mp3"
    },
    {
      "s": "s039",
      "e": "ep-video-grocerystore-1",
      "k": "video",
      "sp": "Caitie",
      "en": "We can count them as we put them inside the bag.",
      "zh": "我们把它们放进袋子里的时候可以一起数。",
      "an": "https://english.example.com/audio/ep/ep-video-grocerystore-1/s039-n-0e423f.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-grocerystore-1/s039-s-9c9d96.mp3"
    },
    {
      "s": "s040",
      "e": "ep-video-grocerystore-1",
      "k": "video",
      "sp": "Caitie",
      "en": "Now, it's important when picking your produce to only touch the ones you're gonna buy.",
      "zh": "选果蔬的时候，重要的是只碰你要买的那些。",
      "an": "https://english.example.com/audio/ep/ep-video-grocerystore-1/s040-n-d972b8.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-grocerystore-1/s040-s-7783e5.mp3"
    },
    {
      "s": "s041",
      "e": "ep-video-grocerystore-1",
      "k": "video",
      "sp": "Caitie",
      "en": "So we can use these tongs to help us out.",
      "zh": "所以我们可以用这些夹子来帮忙。",
      "an": "https://english.example.com/audio/ep/ep-video-grocerystore-1/s041-n-94c063.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-grocerystore-1/s041-s-748328.mp3"
    },
    {
      "s": "s042",
      "e": "ep-video-grocerystore-1",
      "k": "video",
      "sp": "Caitie",
      "en": "One, two, three.",
      "zh": "一，二，三。",
      "an": "https://english.example.com/audio/ep/ep-video-grocerystore-1/s042-n-e77b0e.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-grocerystore-1/s042-s-ff7c5b.mp3"
    },
    {
      "s": "s043",
      "e": "ep-video-grocerystore-1",
      "k": "video",
      "sp": "Caitie",
      "en": "Four, five, six.",
      "zh": "四，五，六。",
      "an": "https://english.example.com/audio/ep/ep-video-grocerystore-1/s043-n-7ce84b.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-grocerystore-1/s043-s-122824.mp3"
    },
    {
      "s": "s044",
      "e": "ep-video-grocerystore-1",
      "k": "video",
      "sp": "Caitie",
      "en": "Seven, eight.",
      "zh": "七，八。",
      "an": "https://english.example.com/audio/ep/ep-video-grocerystore-1/s044-n-6a861e.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-grocerystore-1/s044-s-0cbdef.mp3"
    },
    {
      "s": "s045",
      "e": "ep-video-grocerystore-1",
      "k": "video",
      "sp": "Caitie",
      "en": "Eight mushrooms.",
      "zh": "八朵蘑菇。",
      "an": "https://english.example.com/audio/ep/ep-video-grocerystore-1/s045-n-0aec1f.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-grocerystore-1/s045-s-1b9675.mp3"
    },
    {
      "s": "s046",
      "e": "ep-video-grocerystore-1",
      "k": "video",
      "sp": "Caitie",
      "en": "Well, I think that's it for our fruits and vegetables.",
      "zh": "好，水果和蔬菜应该就这些了。",
      "an": "https://english.example.com/audio/ep/ep-video-grocerystore-1/s046-n-4e1dbc.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-grocerystore-1/s046-s-b0b6e9.mp3"
    },
    {
      "s": "s047",
      "e": "ep-video-grocerystore-1",
      "k": "video",
      "sp": "Caitie",
      "en": "Next is bread.",
      "zh": "接下来是面包。",
      "an": "https://english.example.com/audio/ep/ep-video-grocerystore-1/s047-n-50626d.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-grocerystore-1/s047-s-0279bd.mp3"
    },
    {
      "s": "s048",
      "e": "ep-video-grocerystore-1",
      "k": "video",
      "sp": "Caitie",
      "en": "I know where that is.",
      "zh": "我知道在哪里。",
      "an": "https://english.example.com/audio/ep/ep-video-grocerystore-1/s048-n-0dd06e.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-grocerystore-1/s048-s-6b770c.mp3"
    },
    {
      "s": "s049",
      "e": "ep-video-grocerystore-1",
      "k": "video",
      "sp": "Caitie",
      "en": "Follow me.",
      "zh": "跟我来。",
      "an": "https://english.example.com/audio/ep/ep-video-grocerystore-1/s049-n-809d5d.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-grocerystore-1/s049-s-8c72b7.mp3"
    },
    {
      "s": "s050",
      "e": "ep-video-grocerystore-1",
      "k": "video",
      "sp": "Caitie",
      "en": "Look at all the different kinds of bread there are.",
      "zh": "看看这里有多少种不同的面包。",
      "an": "https://english.example.com/audio/ep/ep-video-grocerystore-1/s050-n-154ef7.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-grocerystore-1/s050-s-026273.mp3"
    },
    {
      "s": "s051",
      "e": "ep-video-grocerystore-1",
      "k": "video",
      "sp": "Caitie",
      "en": "This looks like what I'm looking for.",
      "zh": "这看起来就是我要找的。",
      "an": "https://english.example.com/audio/ep/ep-video-grocerystore-1/s051-n-79ef44.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-grocerystore-1/s051-s-73f861.mp3"
    },
    {
      "s": "s052",
      "e": "ep-video-grocerystore-1",
      "k": "video",
      "sp": "Caitie",
      "en": "This is perfect for toast and sandwiches.",
      "zh": "这个很适合做吐司和三明治。",
      "an": "https://english.example.com/audio/ep/ep-video-grocerystore-1/s052-n-ee6dac.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-grocerystore-1/s052-s-23b8a5.mp3"
    },
    {
      "s": "s053",
      "e": "ep-video-grocerystore-1",
      "k": "video",
      "sp": "Caitie",
      "en": "This bread is made with something called gluten.",
      "zh": "这种面包是用一种叫麸质的东西做的。",
      "an": "https://english.example.com/audio/ep/ep-video-grocerystore-1/s053-n-9bdfc1.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-grocerystore-1/s053-s-87a2a3.mp3"
    },
    {
      "s": "s054",
      "e": "ep-video-grocerystore-1",
      "k": "video",
      "sp": "Caitie",
      "en": "And that's okay for most people, but for some friends, it can make their tummies feel a little upset.",
      "zh": "对大多数人没问题，但有些朋友吃了可能会肚子不舒服。",
      "an": "https://english.example.com/audio/ep/ep-video-grocerystore-1/s054-n-203e86.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-grocerystore-1/s054-s-3865f9.mp3"
    },
    {
      "s": "s055",
      "e": "ep-video-grocerystore-1",
      "k": "video",
      "sp": "Caitie",
      "en": "So they also make bread without gluten.",
      "zh": "所以也有不含麸质的面包。",
      "an": "https://english.example.com/audio/ep/ep-video-grocerystore-1/s055-n-f75162.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-grocerystore-1/s055-s-2f0732.mp3"
    },
    {
      "s": "s056",
      "e": "ep-video-grocerystore-1",
      "k": "video",
      "sp": "Caitie",
      "en": "That's called gluten-free bread.",
      "zh": "那叫无麸质面包。",
      "an": "https://english.example.com/audio/ep/ep-video-grocerystore-1/s056-n-acc322.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-grocerystore-1/s056-s-09f8c7.mp3"
    },
    {
      "s": "s057",
      "e": "ep-video-grocerystore-1",
      "k": "video",
      "sp": "Caitie",
      "en": "It's nice that there's different options so everybody can find something that makes them feel good.",
      "zh": "有不同的选择真好，这样每个人都能找到让自己舒服的。",
      "an": "https://english.example.com/audio/ep/ep-video-grocerystore-1/s057-n-f9fe63.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-grocerystore-1/s057-s-1c48ec.mp3"
    },
    {
      "s": "s058",
      "e": "ep-video-grocerystore-1",
      "k": "video",
      "sp": "Caitie",
      "en": "And you can tell it's gluten-free because it says so right on the package.",
      "zh": "你能看出它是无麸质的，因为包装上就写着。",
      "an": "https://english.example.com/audio/ep/ep-video-grocerystore-1/s058-n-92aae9.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-grocerystore-1/s058-s-015e83.mp3"
    },
    {
      "s": "s059",
      "e": "ep-video-grocerystore-1",
      "k": "video",
      "sp": "Caitie",
      "en": "I'm gonna get some gluten-free bread too.",
      "zh": "我也要拿一些无麸质面包。",
      "an": "https://english.example.com/audio/ep/ep-video-grocerystore-1/s059-n-57c887.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-grocerystore-1/s059-s-54d122.mp3"
    },
    {
      "s": "s060",
      "e": "ep-video-grocerystore-1",
      "k": "video",
      "sp": "Caitie",
      "en": "That way if a friend comes over who can't have gluten, they can have a snack that's just for them.",
      "zh": "这样如果有不能吃麸质的朋友来玩，他们也能吃到适合自己的点心。",
      "an": "https://english.example.com/audio/ep/ep-video-grocerystore-1/s060-n-2c7fbc.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-grocerystore-1/s060-s-18985d.mp3"
    },
    {
      "s": "s061",
      "e": "ep-video-grocerystore-1",
      "k": "video",
      "sp": "Caitie",
      "en": "We got our bread.",
      "zh": "面包我们买到了。",
      "an": "https://english.example.com/audio/ep/ep-video-grocerystore-1/s061-n-90fbae.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-grocerystore-1/s061-s-739e28.mp3"
    },
    {
      "s": "s062",
      "e": "ep-video-grocerystore-1",
      "k": "video",
      "sp": "Caitie",
      "en": "Let's keep shopping.",
      "zh": "我们继续购物吧。",
      "an": "https://english.example.com/audio/ep/ep-video-grocerystore-1/s062-n-ee072a.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-grocerystore-1/s062-s-5847b8.mp3"
    },
    {
      "s": "s001",
      "e": "ep-video-grocerystore-2",
      "k": "video",
      "sp": "Caitie",
      "en": "Look at all the cakes, the colors, the frosting.",
      "zh": "看看这些蛋糕，这些颜色，还有糖霜。",
      "an": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s001-n-292893.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s001-s-393927.mp3"
    },
    {
      "s": "s002",
      "e": "ep-video-grocerystore-2",
      "k": "video",
      "sp": "Caitie",
      "en": "A cake would be so delicious, but cake isn't on our list today.",
      "zh": "蛋糕会很好吃，可是今天清单上没有蛋糕。",
      "an": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s002-n-5fdcd4.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s002-s-63f268.mp3"
    },
    {
      "s": "s003",
      "e": "ep-video-grocerystore-2",
      "k": "video",
      "sp": "Caitie",
      "en": "We can't get everything that looks delicious, even though it is hard to say no sometimes.",
      "zh": "不能看到好吃的就都买，虽然有时候很难说不。",
      "an": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s003-n-b91b3e.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s003-s-508a4d.mp3"
    },
    {
      "s": "s004",
      "e": "ep-video-grocerystore-2",
      "k": "video",
      "sp": "Caitie",
      "en": "But you know what? Maybe we could get a special treat later.",
      "zh": "不过你知道吗？也许我们待会可以买点特别的小零食。",
      "an": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s004-n-674829.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s004-s-48ffff.mp3"
    },
    {
      "s": "s005",
      "e": "ep-video-grocerystore-2",
      "k": "video",
      "sp": "Caitie",
      "en": "That's sometimes the tricky thing about grocery stores.",
      "zh": "有时候超市让人为难的就是这一点。",
      "an": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s005-n-aaf243.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s005-s-acbd44.mp3"
    },
    {
      "s": "s006",
      "e": "ep-video-grocerystore-2",
      "k": "video",
      "sp": "Caitie",
      "en": "It's fun to look at all the yummy things, but we don't need to put everything in our cart.",
      "zh": "看那些好吃的东西很有趣，但我们不必把每一样都放进购物车。",
      "an": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s006-n-b1a651.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s006-s-3148e0.mp3"
    },
    {
      "s": "s007",
      "e": "ep-video-grocerystore-2",
      "k": "video",
      "sp": "Caitie",
      "en": "Let's see what's next on our list.",
      "zh": "看看清单上下一样是什么。",
      "an": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s007-n-17f1b1.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s007-s-3c394c.mp3"
    },
    {
      "s": "s008",
      "e": "ep-video-grocerystore-2",
      "k": "video",
      "sp": "Caitie",
      "en": "Cheese!",
      "zh": "奶酪！",
      "an": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s008-n-5c8c26.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s008-s-ab0095.mp3"
    },
    {
      "s": "s009",
      "e": "ep-video-grocerystore-2",
      "k": "video",
      "sp": "Caitie",
      "en": "Let's go to the deli counter.",
      "zh": "我们去熟食柜台吧。",
      "an": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s009-n-32fcf9.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s009-s-f2f67b.mp3"
    },
    {
      "s": "s010",
      "e": "ep-video-grocerystore-2",
      "k": "video",
      "sp": "Caitie",
      "en": "The deli counter has lots of different kinds of cheese and meats to choose from.",
      "zh": "熟食柜台有很多种奶酪和肉可以选。",
      "an": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s010-n-8ba46f.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s010-s-13d361.mp3"
    },
    {
      "s": "s011",
      "e": "ep-video-grocerystore-2",
      "k": "video",
      "sp": "Caitie",
      "en": "Sometimes there are big blocks of cheese and big hunks of meat.",
      "zh": "有时候会有大块的奶酪和大块的肉。",
      "an": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s011-n-75ab87.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s011-s-2fc157.mp3"
    },
    {
      "s": "s012",
      "e": "ep-video-grocerystore-2",
      "k": "video",
      "sp": "Caitie",
      "en": "And you can ask the person working at the deli counter to slice it for you.",
      "zh": "你可以请熟食柜台的工作人员帮你切片。",
      "an": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s012-n-7b6f57.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s012-s-426050.mp3"
    },
    {
      "s": "s013",
      "e": "ep-video-grocerystore-2",
      "k": "video",
      "sp": "Caitie",
      "en": "They have a special machine called a slicer that can cut just the right amount.",
      "zh": "他们有一台叫切片机的机器，可以切出刚好的份量。",
      "an": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s013-n-f9394c.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s013-s-72cd61.mp3"
    },
    {
      "s": "s014",
      "e": "ep-video-grocerystore-2",
      "k": "video",
      "sp": "Caitie",
      "en": "Other times, you can just get some cheese that's already packaged in smaller portions.",
      "zh": "还有些时候，你可以直接拿已经分装好的小份奶酪。",
      "an": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s014-n-98d862.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s014-s-3afef5.mp3"
    },
    {
      "s": "s015",
      "e": "ep-video-grocerystore-2",
      "k": "video",
      "sp": "Caitie",
      "en": "Like this one.",
      "zh": "就像这一份。",
      "an": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s015-n-94595c.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s015-s-e60223.mp3"
    },
    {
      "s": "s016",
      "e": "ep-video-grocerystore-2",
      "k": "video",
      "sp": "Caitie",
      "en": "This is actually Brie cheese.",
      "zh": "这其实是布里奶酪。",
      "an": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s016-n-48fd53.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s016-s-3eaa5c.mp3"
    },
    {
      "s": "s017",
      "e": "ep-video-grocerystore-2",
      "k": "video",
      "sp": "Caitie",
      "en": "It's my favorite kind of cheese.",
      "zh": "这是我最喜欢的奶酪。",
      "an": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s017-n-751d2d.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s017-s-0ad5b1.mp3"
    },
    {
      "s": "s018",
      "e": "ep-video-grocerystore-2",
      "k": "video",
      "sp": "Caitie",
      "en": "And in the deli counter, there's a really big one.",
      "zh": "熟食柜台里还有一块特别大的。",
      "an": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s018-n-e54805.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s018-s-ae0afd.mp3"
    },
    {
      "s": "s019",
      "e": "ep-video-grocerystore-2",
      "k": "video",
      "sp": "Caitie",
      "en": "That one is big, and this one is small, but it's the perfect size for me.",
      "zh": "那块很大，这一块很小，但对我来说大小正好。",
      "an": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s019-n-e18568.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s019-s-42b49f.mp3"
    },
    {
      "s": "s020",
      "e": "ep-video-grocerystore-2",
      "k": "video",
      "sp": "Caitie",
      "en": "So into the cart it goes.",
      "zh": "那就放进购物车吧。",
      "an": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s020-n-982e10.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s020-s-c0dab0.mp3"
    },
    {
      "s": "s021",
      "e": "ep-video-grocerystore-2",
      "k": "video",
      "sp": "Caitie",
      "en": "We actually only have a couple things left on our list.",
      "zh": "其实清单上只剩几样东西了。",
      "an": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s021-n-d68dc7.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s021-s-dac3c2.mp3"
    },
    {
      "s": "s022",
      "e": "ep-video-grocerystore-2",
      "k": "video",
      "sp": "Caitie",
      "en": "We are doing excellent shopping.",
      "zh": "我们买得很棒。",
      "an": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s022-n-b375be.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s022-s-68345b.mp3"
    },
    {
      "s": "s023",
      "e": "ep-video-grocerystore-2",
      "k": "video",
      "sp": "Caitie",
      "en": "Next is rice.",
      "zh": "接下来是米。",
      "an": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s023-n-8b7d97.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s023-s-6bdc98.mp3"
    },
    {
      "s": "s024",
      "e": "ep-video-grocerystore-2",
      "k": "video",
      "sp": "Caitie",
      "en": "Let's see if we can find it.",
      "zh": "我们看看能不能找到。",
      "an": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s024-n-a8af13.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s024-s-93511c.mp3"
    },
    {
      "s": "s025",
      "e": "ep-video-grocerystore-2",
      "k": "video",
      "sp": "Caitie",
      "en": "There are lots of long rows of shelves at the grocery store.",
      "zh": "超市里有很多一长排一长排的货架。",
      "an": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s025-n-71b684.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s025-s-22af00.mp3"
    },
    {
      "s": "s026",
      "e": "ep-video-grocerystore-2",
      "k": "video",
      "sp": "Caitie",
      "en": "Those rows are called aisles.",
      "zh": "那些一排排的过道叫 aisle。",
      "an": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s026-n-3bb3f6.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s026-s-5de9f0.mp3"
    },
    {
      "s": "s027",
      "e": "ep-video-grocerystore-2",
      "k": "video",
      "sp": "Caitie",
      "en": "We can walk up and down the aisle to find what we need.",
      "zh": "我们可以在过道里来回走，找到需要的东西。",
      "an": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s027-n-236d7e.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s027-s-b9472d.mp3"
    },
    {
      "s": "s028",
      "e": "ep-video-grocerystore-2",
      "k": "video",
      "sp": "Caitie",
      "en": "The signs can also help us find what we're looking for.",
      "zh": "那些指示牌也可以帮我们找到要找的东西。",
      "an": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s028-n-4241f6.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s028-s-8b082b.mp3"
    },
    {
      "s": "s029",
      "e": "ep-video-grocerystore-2",
      "k": "video",
      "sp": "Caitie",
      "en": "Rice is down this aisle.",
      "zh": "米就在这条过道里。",
      "an": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s029-n-b83bbe.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s029-s-8f6bf5.mp3"
    },
    {
      "s": "s030",
      "e": "ep-video-grocerystore-2",
      "k": "video",
      "sp": "Caitie",
      "en": "I think I'd like to try something new.",
      "zh": "我想试点新的东西。",
      "an": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s030-n-3d48af.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s030-s-f514d3.mp3"
    },
    {
      "s": "s031",
      "e": "ep-video-grocerystore-2",
      "k": "video",
      "sp": "Caitie",
      "en": "Maybe a wild rice blend.",
      "zh": "也许来一包野生米混合装。",
      "an": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s031-n-b86f5b.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s031-s-4f71ca.mp3"
    },
    {
      "s": "s032",
      "e": "ep-video-grocerystore-2",
      "k": "video",
      "sp": "Caitie",
      "en": "This has all different kinds of rice that I haven't tried before all mixed together.",
      "zh": "这里混合了我以前没吃过的各种米。",
      "an": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s032-n-da370f.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s032-s-1f8d4c.mp3"
    },
    {
      "s": "s033",
      "e": "ep-video-grocerystore-2",
      "k": "video",
      "sp": "Caitie",
      "en": "Sounds exciting.",
      "zh": "听起来真有趣。",
      "an": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s033-n-e96df3.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s033-s-e3436c.mp3"
    },
    {
      "s": "s034",
      "e": "ep-video-grocerystore-2",
      "k": "video",
      "sp": "Caitie",
      "en": "Let's see what's next on our list.",
      "zh": "看看清单上下一样是什么。",
      "an": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s034-n-17f1b1.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s034-s-3c394c.mp3"
    },
    {
      "s": "s035",
      "e": "ep-video-grocerystore-2",
      "k": "video",
      "sp": "Caitie",
      "en": "Ooh, fish.",
      "zh": "噢，鱼。",
      "an": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s035-n-7a31f1.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s035-s-11319a.mp3"
    },
    {
      "s": "s036",
      "e": "ep-video-grocerystore-2",
      "k": "video",
      "sp": "Caitie",
      "en": "That means we'll have to go to the seafood counter.",
      "zh": "那就是说我们得去海鲜柜台了。",
      "an": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s036-n-146187.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s036-s-e8ed1a.mp3"
    },
    {
      "s": "s037",
      "e": "ep-video-grocerystore-2",
      "k": "video",
      "sp": "Caitie",
      "en": "Ooh, it all looks so good.",
      "zh": "噢，看起来都好诱人。",
      "an": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s037-n-15a25e.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s037-s-89871c.mp3"
    },
    {
      "s": "s038",
      "e": "ep-video-grocerystore-2",
      "k": "video",
      "sp": "Caitie",
      "en": "Not sure what kind to get though.",
      "zh": "不过我还不确定要买哪种。",
      "an": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s038-n-7ddb54.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s038-s-bf2e4b.mp3"
    },
    {
      "s": "s039",
      "e": "ep-video-grocerystore-2",
      "k": "video",
      "sp": "Clerk",
      "en": "Can I get you anything?",
      "zh": "您需要点什么吗？",
      "an": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s039-n-65f054.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s039-s-7e8890.mp3"
    },
    {
      "s": "s040",
      "e": "ep-video-grocerystore-2",
      "k": "video",
      "sp": "Caitie",
      "en": "Oh, thank you.",
      "zh": "哦，谢谢。",
      "an": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s040-n-668d32.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s040-s-c8747e.mp3"
    },
    {
      "s": "s041",
      "e": "ep-video-grocerystore-2",
      "k": "video",
      "sp": "Caitie",
      "en": "I'm looking for some fish, but I'm not sure what kind I should get.",
      "zh": "我想买一点鱼，但不确定该买哪种。",
      "an": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s041-n-ffa17d.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s041-s-72f1df.mp3"
    },
    {
      "s": "s042",
      "e": "ep-video-grocerystore-2",
      "k": "video",
      "sp": "Clerk",
      "en": "May I recommend the rainbow trout?",
      "zh": "要不要试试虹鳟鱼？",
      "an": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s042-n-66fbb7.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s042-s-c57f50.mp3"
    },
    {
      "s": "s043",
      "e": "ep-video-grocerystore-2",
      "k": "video",
      "sp": "Clerk",
      "en": "It's local and it's fantastic.",
      "zh": "这是本地的，而且非常好吃。",
      "an": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s043-n-567b60.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s043-s-4f4004.mp3"
    },
    {
      "s": "s044",
      "e": "ep-video-grocerystore-2",
      "k": "video",
      "sp": "Caitie",
      "en": "Oh, local. That sounds good.",
      "zh": "哦，本地的。听起来不错。",
      "an": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s044-n-ac2db1.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s044-s-354447.mp3"
    },
    {
      "s": "s045",
      "e": "ep-video-grocerystore-2",
      "k": "video",
      "sp": "Caitie",
      "en": "I'll take some trout, please.",
      "zh": "那我要一些鳟鱼，谢谢。",
      "an": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s045-n-9a44c9.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s045-s-a8125d.mp3"
    },
    {
      "s": "s046",
      "e": "ep-video-grocerystore-2",
      "k": "video",
      "sp": "Clerk",
      "en": "No problem.",
      "zh": "没问题。",
      "an": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s046-n-d533c5.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s046-s-1762a8.mp3"
    },
    {
      "s": "s047",
      "e": "ep-video-grocerystore-2",
      "k": "video",
      "sp": "Clerk",
      "en": "There you go.",
      "zh": "给您。",
      "an": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s047-n-733a1d.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s047-s-07fde2.mp3"
    },
    {
      "s": "s048",
      "e": "ep-video-grocerystore-2",
      "k": "video",
      "sp": "Caitie",
      "en": "Thank you so much.",
      "zh": "非常感谢。",
      "an": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s048-n-76627f.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s048-s-07beb3.mp3"
    },
    {
      "s": "s049",
      "e": "ep-video-grocerystore-2",
      "k": "video",
      "sp": "Clerk",
      "en": "No problem. Have a good day.",
      "zh": "没问题。祝你今天愉快。",
      "an": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s049-n-71187b.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s049-s-5cbe87.mp3"
    },
    {
      "s": "s050",
      "e": "ep-video-grocerystore-2",
      "k": "video",
      "sp": "Caitie",
      "en": "You too.",
      "zh": "你也是。",
      "an": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s050-n-a7daf2.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s050-s-34ab3a.mp3"
    },
    {
      "s": "s051",
      "e": "ep-video-grocerystore-2",
      "k": "video",
      "sp": "Caitie",
      "en": "I'm excited to try this.",
      "zh": "我很期待尝尝这个。",
      "an": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s051-n-e1a7f4.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s051-s-eb0d6a.mp3"
    },
    {
      "s": "s052",
      "e": "ep-video-grocerystore-2",
      "k": "video",
      "sp": "Caitie",
      "en": "We have one more thing on our list, and it's pizza!",
      "zh": "清单上还剩一样，是披萨！",
      "an": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s052-n-bdb4c8.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s052-s-16a52b.mp3"
    },
    {
      "s": "s053",
      "e": "ep-video-grocerystore-2",
      "k": "video",
      "sp": "Caitie",
      "en": "I'm gonna get a frozen pizza from the frozen food section.",
      "zh": "我要在冷冻食品区拿一个冷冻披萨。",
      "an": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s053-n-f280a9.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s053-s-5d3043.mp3"
    },
    {
      "s": "s054",
      "e": "ep-video-grocerystore-2",
      "k": "video",
      "sp": "Caitie",
      "en": "Maybe this veggie pizza.",
      "zh": "也许就这个蔬菜披萨吧。",
      "an": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s054-n-07eaca.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s054-s-74687b.mp3"
    },
    {
      "s": "s055",
      "e": "ep-video-grocerystore-2",
      "k": "video",
      "sp": "Caitie",
      "en": "Well, that's the last thing on our list.",
      "zh": "好，这就是清单上的最后一样了。",
      "an": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s055-n-dc39dd.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s055-s-ee9934.mp3"
    },
    {
      "s": "s056",
      "e": "ep-video-grocerystore-2",
      "k": "video",
      "sp": "Caitie",
      "en": "I like to get the food from the frozen section last, so it doesn't melt in my cart before I get home.",
      "zh": "我喜欢最后再拿冷冻食品，这样在到家前就不会在购物车里化掉。",
      "an": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s056-n-00c564.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s056-s-720ece.mp3"
    },
    {
      "s": "s057",
      "e": "ep-video-grocerystore-2",
      "k": "video",
      "sp": "Caitie",
      "en": "You did great grocery shopping today.",
      "zh": "你今天购物做得真棒。",
      "an": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s057-n-841ca5.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s057-s-6b0673.mp3"
    },
    {
      "s": "s058",
      "e": "ep-video-grocerystore-2",
      "k": "video",
      "sp": "Caitie",
      "en": "I think we can get ourselves a little treat.",
      "zh": "我想我们可以给自己买点小零食。",
      "an": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s058-n-058ed5.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s058-s-f4cee7.mp3"
    },
    {
      "s": "s059",
      "e": "ep-video-grocerystore-2",
      "k": "video",
      "sp": "Caitie",
      "en": "Follow me.",
      "zh": "跟我来。",
      "an": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s059-n-809d5d.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s059-s-8c72b7.mp3"
    },
    {
      "s": "s060",
      "e": "ep-video-grocerystore-2",
      "k": "video",
      "sp": "Caitie",
      "en": "How about cookies?",
      "zh": "买饼干怎么样？",
      "an": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s060-n-999d60.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s060-s-53798c.mp3"
    },
    {
      "s": "s061",
      "e": "ep-video-grocerystore-2",
      "k": "video",
      "sp": "Caitie",
      "en": "This is a special treat and it's perfect for sharing.",
      "zh": "这是特别的小零食，而且很适合分享。",
      "an": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s061-n-52f1a4.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s061-s-e34b59.mp3"
    },
    {
      "s": "s062",
      "e": "ep-video-grocerystore-2",
      "k": "video",
      "sp": "Caitie",
      "en": "But we'll have to wait to eat it until we've paid for everything.",
      "zh": "不过要等我们付完钱才能吃。",
      "an": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s062-n-7bab42.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s062-s-047244.mp3"
    },
    {
      "s": "s063",
      "e": "ep-video-grocerystore-2",
      "k": "video",
      "sp": "Caitie",
      "en": "Are you ready for the grocery store grand finale?",
      "zh": "准备好迎接超市的压轴环节了吗？",
      "an": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s063-n-62ceb0.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s063-s-68ca5c.mp3"
    },
    {
      "s": "s064",
      "e": "ep-video-grocerystore-2",
      "k": "video",
      "sp": "Caitie",
      "en": "Let's go to the checkout.",
      "zh": "我们去收银台吧。",
      "an": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s064-n-fb7b1d.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s064-s-754318.mp3"
    },
    {
      "s": "s065",
      "e": "ep-video-grocerystore-2",
      "k": "video",
      "sp": "Caitie",
      "en": "This is the checkout.",
      "zh": "这就是收银台。",
      "an": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s065-n-c23087.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s065-s-9a4c62.mp3"
    },
    {
      "s": "s066",
      "e": "ep-video-grocerystore-2",
      "k": "video",
      "sp": "Caitie",
      "en": "It's where we pay for everything in our cart.",
      "zh": "我们在这里为购物车里的东西付钱。",
      "an": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s066-n-7ce25c.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s066-s-0652d2.mp3"
    },
    {
      "s": "s067",
      "e": "ep-video-grocerystore-2",
      "k": "video",
      "sp": "Caitie",
      "en": "We wait our turn, then put our groceries on the counter.",
      "zh": "我们先排队，然后把买的东西放到柜台上。",
      "an": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s067-n-2fb03c.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s067-s-b84d82.mp3"
    },
    {
      "s": "s068",
      "e": "ep-video-grocerystore-2",
      "k": "video",
      "sp": "Caitie",
      "en": "That's the sound of the scanner.",
      "zh": "那就是扫描器的声音。",
      "an": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s068-n-0f0aae.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s068-s-7d60a9.mp3"
    },
    {
      "s": "s069",
      "e": "ep-video-grocerystore-2",
      "k": "video",
      "sp": "Caitie",
      "en": "Each thing has a price, and when the cashier adds them all together, that's our total.",
      "zh": "每一样东西都有价格，收银员把它们加在一起，就是我们要付的总数。",
      "an": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s069-n-0d0753.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s069-s-95a93d.mp3"
    },
    {
      "s": "s070",
      "e": "ep-video-grocerystore-2",
      "k": "video",
      "sp": "Caitie",
      "en": "Once we pay and pack our bags, we're all set to go home and put everything away.",
      "zh": "付完钱、装好袋子，我们就可以回家把东西放好了。",
      "an": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s070-n-317a36.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s070-s-126c22.mp3"
    },
    {
      "s": "s071",
      "e": "ep-video-grocerystore-2",
      "k": "video",
      "sp": "Caitie",
      "en": "That was fun.",
      "zh": "真有趣。",
      "an": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s071-n-e231bc.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s071-s-168944.mp3"
    },
    {
      "s": "s072",
      "e": "ep-video-grocerystore-2",
      "k": "video",
      "sp": "Caitie",
      "en": "Thank you so much for helping me with my grocery shopping today.",
      "zh": "非常感谢你今天帮我一起购物。",
      "an": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s072-n-897d58.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s072-s-e4b87b.mp3"
    },
    {
      "s": "s073",
      "e": "ep-video-grocerystore-2",
      "k": "video",
      "sp": "Caitie",
      "en": "I hope you have fun the next time you're at a grocery store too.",
      "zh": "希望你下次去超市也会觉得有趣。",
      "an": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s073-n-dac36e.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s073-s-c8b0db.mp3"
    },
    {
      "s": "s074",
      "e": "ep-video-grocerystore-2",
      "k": "video",
      "sp": "Caitie",
      "en": "I think it's time for a little treat.",
      "zh": "我想是时候吃点小零食了。",
      "an": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s074-n-091e11.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s074-s-123fbc.mp3"
    },
    {
      "s": "s075",
      "e": "ep-video-grocerystore-2",
      "k": "video",
      "sp": "Caitie",
      "en": "I'll see you later.",
      "zh": "回头见。",
      "an": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s075-n-33342b.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s075-s-e73771.mp3"
    },
    {
      "s": "s076",
      "e": "ep-video-grocerystore-2",
      "k": "video",
      "sp": "Caitie",
      "en": "Bye, friends.",
      "zh": "再见，朋友们。",
      "an": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s076-n-e79a71.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s076-s-b918cc.mp3"
    },
    {
      "s": "s001",
      "e": "ep-card-doctor-g1",
      "k": "card",
      "sp": "孩子",
      "en": "I have a cold.",
      "zh": "我感冒了。",
      "an": "https://english.example.com/audio/ep/ep-card-doctor-g1/s001-n-7d611f.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-doctor-g1/s001-s-bfa4ab.mp3"
    },
    {
      "s": "s002",
      "e": "ep-card-doctor-g1",
      "k": "card",
      "sp": "家长",
      "en": "Let's see the doctor.",
      "zh": "我们去看医生吧。",
      "an": "https://english.example.com/audio/ep/ep-card-doctor-g1/s002-n-dc377d.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-doctor-g1/s002-s-7ae924.mp3"
    },
    {
      "s": "s003",
      "e": "ep-card-doctor-g1",
      "k": "card",
      "sp": "医生",
      "en": "Open your mouth.",
      "zh": "请张开嘴。",
      "an": "https://english.example.com/audio/ep/ep-card-doctor-g1/s003-n-a6be0b.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-doctor-g1/s003-s-d6c2a0.mp3"
    },
    {
      "s": "s004",
      "e": "ep-card-doctor-g1",
      "k": "card",
      "sp": "医生",
      "en": "Take this medicine.",
      "zh": "把这个药吃了。",
      "an": "https://english.example.com/audio/ep/ep-card-doctor-g1/s004-n-fffb50.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-doctor-g1/s004-s-7656eb.mp3"
    },
    {
      "s": "s005",
      "e": "ep-card-doctor-g1",
      "k": "card",
      "sp": "孩子",
      "en": "I will feel better.",
      "zh": "我会好起来的。",
      "an": "https://english.example.com/audio/ep/ep-card-doctor-g1/s005-n-42233a.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-doctor-g1/s005-s-23602c.mp3"
    },
    {
      "s": "s001",
      "e": "ep-card-directions-g1",
      "k": "card",
      "sp": "孩子",
      "en": "Excuse me.",
      "zh": "打扰一下。",
      "an": "https://english.example.com/audio/ep/ep-card-directions-g1/s001-n-c66e84.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-directions-g1/s001-s-2c2147.mp3"
    },
    {
      "s": "s002",
      "e": "ep-card-directions-g1",
      "k": "card",
      "sp": "孩子",
      "en": "Where is the playground?",
      "zh": "操场在哪里？",
      "an": "https://english.example.com/audio/ep/ep-card-directions-g1/s002-n-bb3dd2.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-directions-g1/s002-s-d5ceb1.mp3"
    },
    {
      "s": "s003",
      "e": "ep-card-directions-g1",
      "k": "card",
      "sp": "路人",
      "en": "Go straight, please.",
      "zh": "请直走。",
      "an": "https://english.example.com/audio/ep/ep-card-directions-g1/s003-n-2a9a68.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-directions-g1/s003-s-700d3b.mp3"
    },
    {
      "s": "s004",
      "e": "ep-card-directions-g1",
      "k": "card",
      "sp": "路人",
      "en": "Then turn left.",
      "zh": "然后向左转。",
      "an": "https://english.example.com/audio/ep/ep-card-directions-g1/s004-n-4d5d79.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-directions-g1/s004-s-77d006.mp3"
    },
    {
      "s": "s005",
      "e": "ep-card-directions-g1",
      "k": "card",
      "sp": "路人",
      "en": "It's over there.",
      "zh": "就在那边。",
      "an": "https://english.example.com/audio/ep/ep-card-directions-g1/s005-n-a5672b.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-directions-g1/s005-s-27f415.mp3"
    },
    {
      "s": "s001",
      "e": "ep-card-weekend-g1",
      "k": "card",
      "sp": "孩子",
      "en": "It's Saturday today.",
      "zh": "今天是星期六。",
      "an": "https://english.example.com/audio/ep/ep-card-weekend-g1/s001-n-308945.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-weekend-g1/s001-s-212c29.mp3"
    },
    {
      "s": "s002",
      "e": "ep-card-weekend-g1",
      "k": "card",
      "sp": "同学",
      "en": "Let's go swimming.",
      "zh": "我们去游泳吧。",
      "an": "https://english.example.com/audio/ep/ep-card-weekend-g1/s002-n-574601.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-weekend-g1/s002-s-b6ffb1.mp3"
    },
    {
      "s": "s003",
      "e": "ep-card-weekend-g1",
      "k": "card",
      "sp": "孩子",
      "en": "I'll bring a towel.",
      "zh": "我会带一条毛巾。",
      "an": "https://english.example.com/audio/ep/ep-card-weekend-g1/s003-n-0260b8.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-weekend-g1/s003-s-c3df67.mp3"
    },
    {
      "s": "s004",
      "e": "ep-card-weekend-g1",
      "k": "card",
      "sp": "同学",
      "en": "See you at ten.",
      "zh": "十点见。",
      "an": "https://english.example.com/audio/ep/ep-card-weekend-g1/s004-n-5ee29b.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-weekend-g1/s004-s-d8f45b.mp3"
    },
    {
      "s": "s005",
      "e": "ep-card-weekend-g1",
      "k": "card",
      "sp": "孩子",
      "en": "This is so fun!",
      "zh": "这真有趣！",
      "an": "https://english.example.com/audio/ep/ep-card-weekend-g1/s005-n-b83291.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-weekend-g1/s005-s-2e9f16.mp3"
    },
    {
      "s": "s001",
      "e": "ep-video-hobbies",
      "k": "video",
      "sp": "Anne",
      "en": "Hey guys, did you decide which club to join?",
      "zh": "嗨，你们决定参加哪个社团了吗？",
      "an": "https://english.example.com/audio/ep/ep-video-hobbies/s001-n-0008d8.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-hobbies/s001-s-a978bd.mp3"
    },
    {
      "s": "s002",
      "e": "ep-video-hobbies",
      "k": "video",
      "sp": "Kevin",
      "en": "Not yet! I still have no idea.",
      "zh": "还没有！我还没想好。",
      "an": "https://english.example.com/audio/ep/ep-video-hobbies/s002-n-8f4a64.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-hobbies/s002-s-054c49.mp3"
    },
    {
      "s": "s003",
      "e": "ep-video-hobbies",
      "k": "video",
      "sp": "Olivia",
      "en": "Think about what you like to do for fun.",
      "zh": "想想你平时喜欢做什么。",
      "an": "https://english.example.com/audio/ep/ep-video-hobbies/s003-n-ad819f.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-hobbies/s003-s-8a8384.mp3"
    },
    {
      "s": "s004",
      "e": "ep-video-hobbies",
      "k": "video",
      "sp": "Olivia",
      "en": "What are your hobbies?",
      "zh": "你的爱好是什么？",
      "an": "https://english.example.com/audio/ep/ep-video-hobbies/s004-n-7d73ae.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-hobbies/s004-s-9ebcc2.mp3"
    },
    {
      "s": "s005",
      "e": "ep-video-hobbies",
      "k": "video",
      "sp": "John",
      "en": "I just have too many hobbies!",
      "zh": "我的爱好实在太多了！",
      "an": "https://english.example.com/audio/ep/ep-video-hobbies/s005-n-e92dbf.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-hobbies/s005-s-60438e.mp3"
    },
    {
      "s": "s006",
      "e": "ep-video-hobbies",
      "k": "video",
      "sp": "John",
      "en": "I love taking photographs, and even making and collecting jet model figures!",
      "zh": "我喜欢拍照，还喜欢做喷气机模型、收集模型手办！",
      "an": "https://english.example.com/audio/ep/ep-video-hobbies/s006-n-e9ba39.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-hobbies/s006-s-b91237.mp3"
    },
    {
      "s": "s007",
      "e": "ep-video-hobbies",
      "k": "video",
      "sp": "John",
      "en": "Oh, and I also love cooking, watching science fiction movies, skateboarding and…",
      "zh": "哦，我还喜欢做饭、看科幻电影、滑板，还有……",
      "an": "https://english.example.com/audio/ep/ep-video-hobbies/s007-n-796e13.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-hobbies/s007-s-f1c7a7.mp3"
    },
    {
      "s": "s008",
      "e": "ep-video-hobbies",
      "k": "video",
      "sp": "Anne",
      "en": "John, just pick one of them.",
      "zh": "John，就从里面挑一个吧。",
      "an": "https://english.example.com/audio/ep/ep-video-hobbies/s008-n-32cb6f.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-hobbies/s008-s-0f0b01.mp3"
    },
    {
      "s": "s009",
      "e": "ep-video-hobbies",
      "k": "video",
      "sp": "John",
      "en": "Why do I need to choose one?",
      "zh": "我为什么一定要选一个？",
      "an": "https://english.example.com/audio/ep/ep-video-hobbies/s009-n-8847ac.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-hobbies/s009-s-2beaee.mp3"
    },
    {
      "s": "s010",
      "e": "ep-video-hobbies",
      "k": "video",
      "sp": "John",
      "en": "There's too much fun in this world!",
      "zh": "这个世界上好玩的事情太多了！",
      "an": "https://english.example.com/audio/ep/ep-video-hobbies/s010-n-c5f096.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-hobbies/s010-s-444b25.mp3"
    },
    {
      "s": "s011",
      "e": "ep-video-hobbies",
      "k": "video",
      "sp": "Kevin",
      "en": "What is your hobby, Olivia?",
      "zh": "Olivia，你的爱好是什么？",
      "an": "https://english.example.com/audio/ep/ep-video-hobbies/s011-n-30469e.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-hobbies/s011-s-42108d.mp3"
    },
    {
      "s": "s012",
      "e": "ep-video-hobbies",
      "k": "video",
      "sp": "Olivia",
      "en": "I enjoy reading travel books.",
      "zh": "我喜欢读旅行方面的书。",
      "an": "https://english.example.com/audio/ep/ep-video-hobbies/s012-n-4078aa.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-hobbies/s012-s-a4cef7.mp3"
    },
    {
      "s": "s013",
      "e": "ep-video-hobbies",
      "k": "video",
      "sp": "Olivia",
      "en": "So I signed up for a book club.",
      "zh": "所以我报名参加了读书社。",
      "an": "https://english.example.com/audio/ep/ep-video-hobbies/s013-n-6f4056.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-hobbies/s013-s-de6c39.mp3"
    },
    {
      "s": "s014",
      "e": "ep-video-hobbies",
      "k": "video",
      "sp": "Olivia",
      "en": "Don't you want to join the club with me?",
      "zh": "你不想和我一起参加这个社团吗？",
      "an": "https://english.example.com/audio/ep/ep-video-hobbies/s014-n-8cf1d8.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-hobbies/s014-s-d292f3.mp3"
    },
    {
      "s": "s015",
      "e": "ep-video-hobbies",
      "k": "video",
      "sp": "Kevin",
      "en": "I actually love reading comic books.",
      "zh": "其实我很喜欢看漫画书。",
      "an": "https://english.example.com/audio/ep/ep-video-hobbies/s015-n-044502.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-hobbies/s015-s-9654b2.mp3"
    },
    {
      "s": "s016",
      "e": "ep-video-hobbies",
      "k": "video",
      "sp": "Anne",
      "en": "Well, a comic book is a type of book.",
      "zh": "嗯，漫画书也是书的一种。",
      "an": "https://english.example.com/audio/ep/ep-video-hobbies/s016-n-e7c286.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-hobbies/s016-s-6e97c3.mp3"
    },
    {
      "s": "s017",
      "e": "ep-video-hobbies",
      "k": "video",
      "sp": "Olivia",
      "en": "That's perfect!",
      "zh": "太合适了！",
      "an": "https://english.example.com/audio/ep/ep-video-hobbies/s017-n-679db6.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-hobbies/s017-s-4cc8c7.mp3"
    },
    {
      "s": "s018",
      "e": "ep-video-hobbies",
      "k": "video",
      "sp": "Olivia",
      "en": "Let's sign up for it.",
      "zh": "我们去报名吧。",
      "an": "https://english.example.com/audio/ep/ep-video-hobbies/s018-n-070c3a.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-hobbies/s018-s-b7d969.mp3"
    },
    {
      "s": "s019",
      "e": "ep-video-hobbies",
      "k": "video",
      "sp": "Olivia",
      "en": "It will be awesome!",
      "zh": "一定会很棒！",
      "an": "https://english.example.com/audio/ep/ep-video-hobbies/s019-n-231104.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-hobbies/s019-s-1cd233.mp3"
    },
    {
      "s": "s020",
      "e": "ep-video-hobbies",
      "k": "video",
      "sp": "Kevin",
      "en": "Alright, fine.",
      "zh": "好吧，行。",
      "an": "https://english.example.com/audio/ep/ep-video-hobbies/s020-n-8d7e64.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-hobbies/s020-s-6c195f.mp3"
    },
    {
      "s": "s021",
      "e": "ep-video-hobbies",
      "k": "video",
      "sp": "Olivia",
      "en": "Let's go now!",
      "zh": "我们现在就去吧！",
      "an": "https://english.example.com/audio/ep/ep-video-hobbies/s021-n-36e1c2.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-hobbies/s021-s-5f0cdc.mp3"
    },
    {
      "s": "s022",
      "e": "ep-video-hobbies",
      "k": "video",
      "sp": "Anne",
      "en": "I'm glad Kevin found the right hobby.",
      "zh": "我很高兴 Kevin 找到了合适的爱好。",
      "an": "https://english.example.com/audio/ep/ep-video-hobbies/s022-n-193160.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-hobbies/s022-s-28bd7b.mp3"
    },
    {
      "s": "s023",
      "e": "ep-video-hobbies",
      "k": "video",
      "sp": "John",
      "en": "I'm not really sure if he likes the book club or… Olivia.",
      "zh": "我不太确定他喜欢的是读书社，还是……Olivia。",
      "an": "https://english.example.com/audio/ep/ep-video-hobbies/s023-n-25af0a.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-hobbies/s023-s-9b58ef.mp3"
    },
    {
      "s": "s024",
      "e": "ep-video-hobbies",
      "k": "video",
      "sp": "Anne",
      "en": "Anyways, what about you, John?",
      "zh": "对了，John，那你呢？",
      "an": "https://english.example.com/audio/ep/ep-video-hobbies/s024-n-a67a20.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-hobbies/s024-s-94e264.mp3"
    },
    {
      "s": "s025",
      "e": "ep-video-hobbies",
      "k": "video",
      "sp": "Anne",
      "en": "Which club will you join?",
      "zh": "你要参加哪个社团？",
      "an": "https://english.example.com/audio/ep/ep-video-hobbies/s025-n-9c9aa6.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-hobbies/s025-s-e43205.mp3"
    },
    {
      "s": "s026",
      "e": "ep-video-hobbies",
      "k": "video",
      "sp": "John",
      "en": "Hmm. Science is the answer.",
      "zh": "嗯。答案是科学。",
      "an": "https://english.example.com/audio/ep/ep-video-hobbies/s026-n-070b4d.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-hobbies/s026-s-a9be67.mp3"
    },
    {
      "s": "s027",
      "e": "ep-video-hobbies",
      "k": "video",
      "sp": "John",
      "en": "I will join a science club.",
      "zh": "我要参加科学社。",
      "an": "https://english.example.com/audio/ep/ep-video-hobbies/s027-n-d6817c.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-hobbies/s027-s-46e7ea.mp3"
    },
    {
      "s": "s028",
      "e": "ep-video-hobbies",
      "k": "video",
      "sp": "Anne",
      "en": "That's a great idea, but I heard it's really tough.",
      "zh": "这主意很棒，不过我听说真的很难。",
      "an": "https://english.example.com/audio/ep/ep-video-hobbies/s028-n-03513f.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-hobbies/s028-s-611760.mp3"
    },
    {
      "s": "s029",
      "e": "ep-video-hobbies",
      "k": "video",
      "sp": "Anne",
      "en": "You need to work on many projects.",
      "zh": "你要做很多课题。",
      "an": "https://english.example.com/audio/ep/ep-video-hobbies/s029-n-0ec064.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-hobbies/s029-s-8dc497.mp3"
    },
    {
      "s": "s030",
      "e": "ep-video-hobbies",
      "k": "video",
      "sp": "Anne",
      "en": "And plus, the teacher is really strict.",
      "zh": "而且，老师还特别严格。",
      "an": "https://english.example.com/audio/ep/ep-video-hobbies/s030-n-77cbe5.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-hobbies/s030-s-980e0e.mp3"
    },
    {
      "s": "s031",
      "e": "ep-video-hobbies",
      "k": "video",
      "sp": "John",
      "en": "Umm… I just changed my mind.",
      "zh": "嗯……我刚改主意了。",
      "an": "https://english.example.com/audio/ep/ep-video-hobbies/s031-n-7fc052.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-hobbies/s031-s-71ab3a.mp3"
    },
    {
      "s": "s032",
      "e": "ep-video-hobbies",
      "k": "video",
      "sp": "John",
      "en": "I will probably join a photography club.",
      "zh": "我大概会参加摄影社。",
      "an": "https://english.example.com/audio/ep/ep-video-hobbies/s032-n-3d099f.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-hobbies/s032-s-818b96.mp3"
    },
    {
      "s": "s033",
      "e": "ep-video-hobbies",
      "k": "video",
      "sp": "Anne",
      "en": "Oh, really? That's a great idea!",
      "zh": "哦，真的吗？这主意很棒！",
      "an": "https://english.example.com/audio/ep/ep-video-hobbies/s033-n-e3a306.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-hobbies/s033-s-d69b0b.mp3"
    },
    {
      "s": "s034",
      "e": "ep-video-hobbies",
      "k": "video",
      "sp": "Anne",
      "en": "Please take an awesome picture of me when you become a pro.",
      "zh": "等你成了高手，请给我拍一张超棒的照片。",
      "an": "https://english.example.com/audio/ep/ep-video-hobbies/s034-n-f94750.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-hobbies/s034-s-df945a.mp3"
    },
    {
      "s": "s035",
      "e": "ep-video-hobbies",
      "k": "video",
      "sp": "John",
      "en": "Yep yep!",
      "zh": "对对！",
      "an": "https://english.example.com/audio/ep/ep-video-hobbies/s035-n-27ccc3.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-hobbies/s035-s-3ee84c.mp3"
    },
    {
      "s": "s001",
      "e": "ep-card-letters-g1",
      "k": "card",
      "sp": "孩子",
      "en": "What's this letter?",
      "zh": "这是什么字母？",
      "an": "https://english.example.com/audio/ep/ep-card-letters-g1/s001-n-6d8b6c.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-letters-g1/s001-s-a71f29.mp3"
    },
    {
      "s": "s002",
      "e": "ep-card-letters-g1",
      "k": "card",
      "sp": "家长",
      "en": "It's the letter A.",
      "zh": "这是字母 A。",
      "an": "https://english.example.com/audio/ep/ep-card-letters-g1/s002-n-d225ad.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-letters-g1/s002-s-91e927.mp3"
    },
    {
      "s": "s003",
      "e": "ep-card-letters-g1",
      "k": "card",
      "sp": "孩子",
      "en": "Is this letter B?",
      "zh": "这是字母 B 吗？",
      "an": "https://english.example.com/audio/ep/ep-card-letters-g1/s003-n-fe6909.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-letters-g1/s003-s-0c090d.mp3"
    },
    {
      "s": "s004",
      "e": "ep-card-letters-g1",
      "k": "card",
      "sp": "家长",
      "en": "Yes. B is for book.",
      "zh": "对。B 是 book 的首字母。",
      "an": "https://english.example.com/audio/ep/ep-card-letters-g1/s004-n-2e3578.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-letters-g1/s004-s-49445b.mp3"
    },
    {
      "s": "s005",
      "e": "ep-card-letters-g1",
      "k": "card",
      "sp": "孩子",
      "en": "Let's say A, B, C!",
      "zh": "我们一起来读 A、B、C！",
      "an": "https://english.example.com/audio/ep/ep-card-letters-g1/s005-n-69d60e.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-letters-g1/s005-s-18e06b.mp3"
    },
    {
      "s": "s001",
      "e": "ep-card-sounds-g1",
      "k": "card",
      "sp": "孩子",
      "en": "Look, I see an apple!",
      "zh": "看，我看见一个苹果！",
      "an": "https://english.example.com/audio/ep/ep-card-sounds-g1/s001-n-46d149.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-sounds-g1/s001-s-c5b046.mp3"
    },
    {
      "s": "s002",
      "e": "ep-card-sounds-g1",
      "k": "card",
      "sp": "家长",
      "en": "Apple starts with A.",
      "zh": "Apple 是 A 开头的。",
      "an": "https://english.example.com/audio/ep/ep-card-sounds-g1/s002-n-e08afc.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-sounds-g1/s002-s-97d1f8.mp3"
    },
    {
      "s": "s003",
      "e": "ep-card-sounds-g1",
      "k": "card",
      "sp": "孩子",
      "en": "Does book start with B?",
      "zh": "Book 是 B 开头的吗？",
      "an": "https://english.example.com/audio/ep/ep-card-sounds-g1/s003-n-c554dd.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-sounds-g1/s003-s-f484d2.mp3"
    },
    {
      "s": "s004",
      "e": "ep-card-sounds-g1",
      "k": "card",
      "sp": "家长",
      "en": "Yes. Book starts with B.",
      "zh": "对。Book 是 B 开头的。",
      "an": "https://english.example.com/audio/ep/ep-card-sounds-g1/s004-n-3168ec.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-sounds-g1/s004-s-f54391.mp3"
    },
    {
      "s": "s005",
      "e": "ep-card-sounds-g1",
      "k": "card",
      "sp": "孩子",
      "en": "I see A and B!",
      "zh": "我看到 A 和 B 了！",
      "an": "https://english.example.com/audio/ep/ep-card-sounds-g1/s005-n-7ee64d.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-sounds-g1/s005-s-02ad91.mp3"
    }
  ],
  "dabao": [
    {
      "s": "s001",
      "e": "ep-card-03",
      "k": "card",
      "sp": "孩子",
      "en": "Let's build a house.",
      "zh": "我们来盖个房子吧。",
      "an": "https://english.example.com/audio/ep/ep-card-03/s001-n-4cbc6d.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-03/s001-s-6a455a.mp3"
    },
    {
      "s": "s002",
      "e": "ep-card-03",
      "k": "card",
      "sp": "孩子",
      "en": "Can you get some wood?",
      "zh": "你能去拿点木头吗？",
      "an": "https://english.example.com/audio/ep/ep-card-03/s002-n-fb1880.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-03/s002-s-1382d7.mp3"
    },
    {
      "s": "s003",
      "e": "ep-card-03",
      "k": "card",
      "sp": "孩子",
      "en": "I need more planks.",
      "zh": "我需要更多木板。",
      "an": "https://english.example.com/audio/ep/ep-card-03/s003-n-6d8f33.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-03/s003-s-3c015f.mp3"
    },
    {
      "s": "s004",
      "e": "ep-card-03",
      "k": "card",
      "sp": "孩子",
      "en": "I'll make the door.",
      "zh": "门我来做。",
      "an": "https://english.example.com/audio/ep/ep-card-03/s004-n-4ecdb7.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-03/s004-s-0607e8.mp3"
    },
    {
      "s": "s005",
      "e": "ep-card-03",
      "k": "card",
      "sp": "孩子",
      "en": "Can you put on the roof?",
      "zh": "你能把屋顶盖上吗？",
      "an": "https://english.example.com/audio/ep/ep-card-03/s005-n-1b54ba.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-03/s005-s-17b870.mp3"
    },
    {
      "s": "s006",
      "e": "ep-card-03",
      "k": "card",
      "sp": "家长",
      "en": "Sure! I'll get the wood.",
      "zh": "没问题！我去拿木头。",
      "an": "https://english.example.com/audio/ep/ep-card-03/s006-n-26f3dc.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-03/s006-s-0efe89.mp3"
    },
    {
      "s": "s007",
      "e": "ep-card-03",
      "k": "card",
      "sp": "家长",
      "en": "Where do you want the window?",
      "zh": "窗户你想放在哪儿？",
      "an": "https://english.example.com/audio/ep/ep-card-03/s007-n-b4b8ad.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-03/s007-s-d039b0.mp3"
    },
    {
      "s": "s008",
      "e": "ep-card-03",
      "k": "card",
      "sp": "家长",
      "en": "Here are ten planks.",
      "zh": "给你十块木板。",
      "an": "https://english.example.com/audio/ep/ep-card-03/s008-n-54074b.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-03/s008-s-f0776f.mp3"
    },
    {
      "s": "s001",
      "e": "ep-card-intro-g3",
      "k": "card",
      "sp": "孩子",
      "en": "Hi, I'm Lily. What's your name?",
      "zh": "你好，我是莉莉。你叫什么名字？",
      "an": "https://english.example.com/audio/ep/ep-card-intro-g3/s001-n-327707.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-intro-g3/s001-s-cadf43.mp3"
    },
    {
      "s": "s002",
      "e": "ep-card-intro-g3",
      "k": "card",
      "sp": "同学",
      "en": "My name is Ben. I'm new here.",
      "zh": "我叫本。我是新来的。",
      "an": "https://english.example.com/audio/ep/ep-card-intro-g3/s002-n-1b84fa.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-intro-g3/s002-s-8c4cb7.mp3"
    },
    {
      "s": "s003",
      "e": "ep-card-intro-g3",
      "k": "card",
      "sp": "孩子",
      "en": "Nice to meet you, Ben. How old are you?",
      "zh": "很高兴认识你，本。你几岁了？",
      "an": "https://english.example.com/audio/ep/ep-card-intro-g3/s003-n-829a7c.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-intro-g3/s003-s-f3cc66.mp3"
    },
    {
      "s": "s004",
      "e": "ep-card-intro-g3",
      "k": "card",
      "sp": "同学",
      "en": "I'm nine. I like drawing. What do you like?",
      "zh": "我九岁。我喜欢画画。你喜欢什么？",
      "an": "https://english.example.com/audio/ep/ep-card-intro-g3/s004-n-4ddff1.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-intro-g3/s004-s-be2018.mp3"
    },
    {
      "s": "s005",
      "e": "ep-card-intro-g3",
      "k": "card",
      "sp": "孩子",
      "en": "I like reading. Do you want to sit with me?",
      "zh": "我喜欢看书。你想和我坐在一起吗？",
      "an": "https://english.example.com/audio/ep/ep-card-intro-g3/s005-n-eaed2e.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-intro-g3/s005-s-fe7387.mp3"
    },
    {
      "s": "s006",
      "e": "ep-card-intro-g3",
      "k": "card",
      "sp": "同学",
      "en": "Sure! Thank you, Lily.",
      "zh": "好呀！谢谢你，莉莉。",
      "an": "https://english.example.com/audio/ep/ep-card-intro-g3/s006-n-451a17.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-intro-g3/s006-s-38f5ec.mp3"
    },
    {
      "s": "s001",
      "e": "ep-card-needs-g3",
      "k": "card",
      "sp": "孩子",
      "en": "Excuse me, can I borrow your eraser?",
      "zh": "打扰一下，我能借用你的橡皮吗？",
      "an": "https://english.example.com/audio/ep/ep-card-needs-g3/s001-n-f5b672.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-needs-g3/s001-s-93eade.mp3"
    },
    {
      "s": "s002",
      "e": "ep-card-needs-g3",
      "k": "card",
      "sp": "同学",
      "en": "Sure. Here you are.",
      "zh": "当然可以，给你。",
      "an": "https://english.example.com/audio/ep/ep-card-needs-g3/s002-n-eaa2c7.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-needs-g3/s002-s-741c9f.mp3"
    },
    {
      "s": "s003",
      "e": "ep-card-needs-g3",
      "k": "card",
      "sp": "孩子",
      "en": "Thanks! I can't find mine.",
      "zh": "谢谢！我找不到我的了。",
      "an": "https://english.example.com/audio/ep/ep-card-needs-g3/s003-n-3f0fa4.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-needs-g3/s003-s-e92e71.mp3"
    },
    {
      "s": "s004",
      "e": "ep-card-needs-g3",
      "k": "card",
      "sp": "孩子",
      "en": "Mom, I feel cold. Can I have my jacket, please?",
      "zh": "妈妈，我觉得冷。可以把我的外套给我吗？",
      "an": "https://english.example.com/audio/ep/ep-card-needs-g3/s004-n-06106b.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-needs-g3/s004-s-e526e3.mp3"
    },
    {
      "s": "s005",
      "e": "ep-card-needs-g3",
      "k": "card",
      "sp": "家长",
      "en": "Of course. Here it is.",
      "zh": "当然，给你。",
      "an": "https://english.example.com/audio/ep/ep-card-needs-g3/s005-n-5bcd71.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-needs-g3/s005-s-8b7699.mp3"
    },
    {
      "s": "s006",
      "e": "ep-card-needs-g3",
      "k": "card",
      "sp": "孩子",
      "en": "Sorry, I don't understand. Can you say it again, please?",
      "zh": "对不起，我没听懂。你能再说一遍吗？",
      "an": "https://english.example.com/audio/ep/ep-card-needs-g3/s006-n-2983db.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-needs-g3/s006-s-b23f4c.mp3"
    },
    {
      "s": "s001",
      "e": "ep-card-play-g3",
      "k": "card",
      "sp": "孩子",
      "en": "Do you want to play tag with me?",
      "zh": "你想和我玩捉人游戏吗？",
      "an": "https://english.example.com/audio/ep/ep-card-play-g3/s001-n-af9b9b.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-play-g3/s001-s-3dfb6a.mp3"
    },
    {
      "s": "s002",
      "e": "ep-card-play-g3",
      "k": "card",
      "sp": "同学",
      "en": "Yes! Can my friend play too?",
      "zh": "想！我的朋友也能一起玩吗？",
      "an": "https://english.example.com/audio/ep/ep-card-play-g3/s002-n-5af65a.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-play-g3/s002-s-3afcef.mp3"
    },
    {
      "s": "s003",
      "e": "ep-card-play-g3",
      "k": "card",
      "sp": "孩子",
      "en": "Of course! Let's play together.",
      "zh": "当然！我们一起玩吧。",
      "an": "https://english.example.com/audio/ep/ep-card-play-g3/s003-n-215844.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-play-g3/s003-s-aff2f0.mp3"
    },
    {
      "s": "s004",
      "e": "ep-card-play-g3",
      "k": "card",
      "sp": "同学",
      "en": "Let's take turns. Who wants to go first?",
      "zh": "我们轮流来。谁想先来？",
      "an": "https://english.example.com/audio/ep/ep-card-play-g3/s004-n-d387b8.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-play-g3/s004-s-e11c7f.mp3"
    },
    {
      "s": "s005",
      "e": "ep-card-play-g3",
      "k": "card",
      "sp": "孩子",
      "en": "You go first. I'll count to ten.",
      "zh": "你先来。我数到十。",
      "an": "https://english.example.com/audio/ep/ep-card-play-g3/s005-n-d0f2ff.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-play-g3/s005-s-62c0c6.mp3"
    },
    {
      "s": "s006",
      "e": "ep-card-play-g3",
      "k": "card",
      "sp": "同学",
      "en": "That was fun! Can we play again tomorrow?",
      "zh": "真好玩！我们明天还能再玩吗？",
      "an": "https://english.example.com/audio/ep/ep-card-play-g3/s006-n-602655.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-play-g3/s006-s-8f02aa.mp3"
    },
    {
      "s": "s001",
      "e": "ep-card-school-g3",
      "k": "card",
      "sp": "孩子",
      "en": "Excuse me, where is the art room?",
      "zh": "请问，美术教室在哪里？",
      "an": "https://english.example.com/audio/ep/ep-card-school-g3/s001-n-e1fa9d.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-school-g3/s001-s-a7d3bc.mp3"
    },
    {
      "s": "s002",
      "e": "ep-card-school-g3",
      "k": "card",
      "sp": "同学",
      "en": "It's next to the library. Do you need help?",
      "zh": "就在图书馆旁边。你需要帮忙吗？",
      "an": "https://english.example.com/audio/ep/ep-card-school-g3/s002-n-c6ecf6.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-school-g3/s002-s-88b358.mp3"
    },
    {
      "s": "s003",
      "e": "ep-card-school-g3",
      "k": "card",
      "sp": "孩子",
      "en": "Yes, please. Can you show me the way?",
      "zh": "好的，谢谢。你能带我去吗？",
      "an": "https://english.example.com/audio/ep/ep-card-school-g3/s003-n-237d72.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-school-g3/s003-s-1c686e.mp3"
    },
    {
      "s": "s004",
      "e": "ep-card-school-g3",
      "k": "card",
      "sp": "同学",
      "en": "Sure! What class do you have next?",
      "zh": "当然！你下一节是什么课？",
      "an": "https://english.example.com/audio/ep/ep-card-school-g3/s004-n-f8b39d.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-school-g3/s004-s-97f399.mp3"
    },
    {
      "s": "s005",
      "e": "ep-card-school-g3",
      "k": "card",
      "sp": "孩子",
      "en": "I have math. Is it in room three?",
      "zh": "我有数学课。是在三号教室吗？",
      "an": "https://english.example.com/audio/ep/ep-card-school-g3/s005-n-950909.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-school-g3/s005-s-fc3691.mp3"
    },
    {
      "s": "s006",
      "e": "ep-card-school-g3",
      "k": "card",
      "sp": "同学",
      "en": "Yes. Come with me!",
      "zh": "是的。跟我来！",
      "an": "https://english.example.com/audio/ep/ep-card-school-g3/s006-n-28cb5e.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-school-g3/s006-s-ef05e4.mp3"
    },
    {
      "s": "s001",
      "e": "ep-card-meal-g3",
      "k": "card",
      "sp": "孩子",
      "en": "Mom, what's for dinner tonight?",
      "zh": "妈妈，今晚吃什么？",
      "an": "https://english.example.com/audio/ep/ep-card-meal-g3/s001-n-7f93bd.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-meal-g3/s001-s-50a881.mp3"
    },
    {
      "s": "s002",
      "e": "ep-card-meal-g3",
      "k": "card",
      "sp": "家长",
      "en": "We're having chicken and vegetables. Are you hungry?",
      "zh": "我们吃鸡肉和蔬菜。你饿了吗？",
      "an": "https://english.example.com/audio/ep/ep-card-meal-g3/s002-n-1a9a8a.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-meal-g3/s002-s-5ccb74.mp3"
    },
    {
      "s": "s003",
      "e": "ep-card-meal-g3",
      "k": "card",
      "sp": "孩子",
      "en": "Yes! Can I have some soup, please?",
      "zh": "饿了！我可以喝一点汤吗？",
      "an": "https://english.example.com/audio/ep/ep-card-meal-g3/s003-n-0b3a70.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-meal-g3/s003-s-9afacf.mp3"
    },
    {
      "s": "s004",
      "e": "ep-card-meal-g3",
      "k": "card",
      "sp": "家长",
      "en": "Of course. Do you want more rice?",
      "zh": "当然。你还要米饭吗？",
      "an": "https://english.example.com/audio/ep/ep-card-meal-g3/s004-n-f67c56.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-meal-g3/s004-s-e1c61d.mp3"
    },
    {
      "s": "s005",
      "e": "ep-card-meal-g3",
      "k": "card",
      "sp": "孩子",
      "en": "No, thanks. This is enough for me.",
      "zh": "不用了，谢谢。这些对我够了。",
      "an": "https://english.example.com/audio/ep/ep-card-meal-g3/s005-n-0dbfd9.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-meal-g3/s005-s-62ecc8.mp3"
    },
    {
      "s": "s006",
      "e": "ep-card-meal-g3",
      "k": "card",
      "sp": "孩子",
      "en": "May I leave the table now?",
      "zh": "我现在可以离开餐桌了吗？",
      "an": "https://english.example.com/audio/ep/ep-card-meal-g3/s006-n-78cb39.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-meal-g3/s006-s-1c1dcf.mp3"
    },
    {
      "s": "s001",
      "e": "ep-card-polite-g3",
      "k": "card",
      "sp": "孩子",
      "en": "I'm sorry I bumped into you.",
      "zh": "对不起，我撞到你了。",
      "an": "https://english.example.com/audio/ep/ep-card-polite-g3/s001-n-b7f95c.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-polite-g3/s001-s-56c613.mp3"
    },
    {
      "s": "s002",
      "e": "ep-card-polite-g3",
      "k": "card",
      "sp": "同学",
      "en": "That's all right. Are you OK?",
      "zh": "没关系。你还好吗？",
      "an": "https://english.example.com/audio/ep/ep-card-polite-g3/s002-n-b4a1fa.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-polite-g3/s002-s-95bd1e.mp3"
    },
    {
      "s": "s003",
      "e": "ep-card-polite-g3",
      "k": "card",
      "sp": "孩子",
      "en": "Yes, thanks. Did I drop your book?",
      "zh": "没事，谢谢。我是不是弄掉了你的书？",
      "an": "https://english.example.com/audio/ep/ep-card-polite-g3/s003-n-7c3c96.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-polite-g3/s003-s-b9d750.mp3"
    },
    {
      "s": "s004",
      "e": "ep-card-polite-g3",
      "k": "card",
      "sp": "同学",
      "en": "Yes. Can you pick it up, please?",
      "zh": "是的。你能把它捡起来吗？",
      "an": "https://english.example.com/audio/ep/ep-card-polite-g3/s004-n-28a57d.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-polite-g3/s004-s-7e458a.mp3"
    },
    {
      "s": "s005",
      "e": "ep-card-polite-g3",
      "k": "card",
      "sp": "孩子",
      "en": "Here you are. Thank you for waiting.",
      "zh": "给你。谢谢你等我。",
      "an": "https://english.example.com/audio/ep/ep-card-polite-g3/s005-n-d7f656.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-polite-g3/s005-s-a06b72.mp3"
    },
    {
      "s": "s006",
      "e": "ep-card-polite-g3",
      "k": "card",
      "sp": "同学",
      "en": "No problem. See you after class!",
      "zh": "没事。下课后见！",
      "an": "https://english.example.com/audio/ep/ep-card-polite-g3/s006-n-e3b4d7.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-polite-g3/s006-s-ee2dae.mp3"
    },
    {
      "s": "s001",
      "e": "ep-video-firstnight",
      "k": "video",
      "sp": "Kenzo",
      "en": "Hello and welcome back to English From the Ground Up.",
      "zh": "大家好，欢迎回到“从零开始学英语”（English From the Ground Up）。",
      "an": "https://english.example.com/audio/ep/ep-video-firstnight/s001-n-4637ee.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-firstnight/s001-s-2a44fc.mp3"
    },
    {
      "s": "s002",
      "e": "ep-video-firstnight",
      "k": "video",
      "sp": "Kenzo",
      "en": "My name is Kenzo and today I'm starting a new Minecraft series.",
      "zh": "我叫 Kenzo，今天我要开始一个新的《我的世界》系列。",
      "an": "https://english.example.com/audio/ep/ep-video-firstnight/s002-n-847c9b.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-firstnight/s002-s-3ea42d.mp3"
    },
    {
      "s": "s003",
      "e": "ep-video-firstnight",
      "k": "video",
      "sp": "Kenzo",
      "en": "In this series, we'll learn some English while playing Minecraft hardcore.",
      "zh": "在这个系列里，我们会一边玩《我的世界》极限模式，一边学英语。",
      "an": "https://english.example.com/audio/ep/ep-video-firstnight/s003-n-a76176.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-firstnight/s003-s-22c341.mp3"
    },
    {
      "s": "s004",
      "e": "ep-video-firstnight",
      "k": "video",
      "sp": "Kenzo",
      "en": "Let's do it. Let's create a new world.",
      "zh": "开始吧。我们来创建一个新世界。",
      "an": "https://english.example.com/audio/ep/ep-video-firstnight/s004-n-aba03d.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-firstnight/s004-s-ea6687.mp3"
    },
    {
      "s": "s005",
      "e": "ep-video-firstnight",
      "k": "video",
      "sp": "Kenzo",
      "en": "I'm going to name this world Hard World and let's turn hardcore on.",
      "zh": "我要给这个世界取名叫“Hard World（困难世界）”，然后我们把极限模式打开。",
      "an": "https://english.example.com/audio/ep/ep-video-firstnight/s005-n-0e278e.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-firstnight/s005-s-6e4e42.mp3"
    },
    {
      "s": "s006",
      "e": "ep-video-firstnight",
      "k": "video",
      "sp": "Kenzo",
      "en": "So, normally in Minecraft when you die you can respawn over and over again, but in hardcore when you die it's done.",
      "zh": "平时在《我的世界》里，你死了可以一次又一次地重生，但是在极限模式里，死了就结束了。",
      "an": "https://english.example.com/audio/ep/ep-video-firstnight/s006-n-fe627d.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-firstnight/s006-s-cde7fe.mp3"
    },
    {
      "s": "s007",
      "e": "ep-video-firstnight",
      "k": "video",
      "sp": "Kenzo",
      "en": "You can't respawn. Nope.",
      "zh": "你不能重生。不行哦。",
      "an": "https://english.example.com/audio/ep/ep-video-firstnight/s007-n-c5cea5.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-firstnight/s007-s-efa7a8.mp3"
    },
    {
      "s": "s008",
      "e": "ep-video-firstnight",
      "k": "video",
      "sp": "Kenzo",
      "en": "All right, let's create Hard World. Create.",
      "zh": "好了，我们来创建“Hard World”吧。创建！",
      "an": "https://english.example.com/audio/ep/ep-video-firstnight/s008-n-e01034.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-firstnight/s008-s-467f6c.mp3"
    },
    {
      "s": "s009",
      "e": "ep-video-firstnight",
      "k": "video",
      "sp": "Kenzo",
      "en": "Loading. Loading. Loading. Here we are.",
      "zh": "加载中……加载中……加载中……我们到了。",
      "an": "https://english.example.com/audio/ep/ep-video-firstnight/s009-n-419f8c.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-firstnight/s009-s-3ff614.mp3"
    },
    {
      "s": "s010",
      "e": "ep-video-firstnight",
      "k": "video",
      "sp": "Kenzo",
      "en": "We spawned in a jungle.",
      "zh": "我们出生在一片丛林里。",
      "an": "https://english.example.com/audio/ep/ep-video-firstnight/s010-n-1096d3.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-firstnight/s010-s-a0807c.mp3"
    },
    {
      "s": "s011",
      "e": "ep-video-firstnight",
      "k": "video",
      "sp": "Kenzo",
      "en": "I see a parrot. I can see a green parrot flying.",
      "zh": "我看到一只鹦鹉。我能看到一只绿色的鹦鹉在飞。",
      "an": "https://english.example.com/audio/ep/ep-video-firstnight/s011-n-c976ce.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-firstnight/s011-s-2ed056.mp3"
    },
    {
      "s": "s012",
      "e": "ep-video-firstnight",
      "k": "video",
      "sp": "Kenzo",
      "en": "I'm in a jungle. There's some bamboo over there.",
      "zh": "我在丛林里。那边有一些竹子。",
      "an": "https://english.example.com/audio/ep/ep-video-firstnight/s012-n-a456a2.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-firstnight/s012-s-b3ba60.mp3"
    },
    {
      "s": "s013",
      "e": "ep-video-firstnight",
      "k": "video",
      "sp": "Kenzo",
      "en": "Wow. A cow.",
      "zh": "哇，一头牛。",
      "an": "https://english.example.com/audio/ep/ep-video-firstnight/s013-n-7cbdde.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-firstnight/s013-s-5a63fc.mp3"
    },
    {
      "s": "s014",
      "e": "ep-video-firstnight",
      "k": "video",
      "sp": "Kenzo",
      "en": "Okay, first I'm going to collect some wood.",
      "zh": "好，首先我要收集一些木头。",
      "an": "https://english.example.com/audio/ep/ep-video-firstnight/s014-n-44ff33.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-firstnight/s014-s-e819e9.mp3"
    },
    {
      "s": "s015",
      "e": "ep-video-firstnight",
      "k": "video",
      "sp": "Kenzo",
      "en": "So, let's chop down some trees.",
      "zh": "我们来砍几棵树吧。",
      "an": "https://english.example.com/audio/ep/ep-video-firstnight/s015-n-871099.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-firstnight/s015-s-2e2225.mp3"
    },
    {
      "s": "s016",
      "e": "ep-video-firstnight",
      "k": "video",
      "sp": "Kenzo",
      "en": "All right, let's collect some wood. Some jungle wood.",
      "zh": "好了，我们来收集一些木头，一些丛林木。",
      "an": "https://english.example.com/audio/ep/ep-video-firstnight/s016-n-3d35b1.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-firstnight/s016-s-2909e7.mp3"
    },
    {
      "s": "s017",
      "e": "ep-video-firstnight",
      "k": "video",
      "sp": "Kenzo",
      "en": "All right, I have 4 logs.",
      "zh": "好了，我有4块原木了。",
      "an": "https://english.example.com/audio/ep/ep-video-firstnight/s017-n-777e74.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-firstnight/s017-s-5293fb.mp3"
    },
    {
      "s": "s018",
      "e": "ep-video-firstnight",
      "k": "video",
      "sp": "Kenzo",
      "en": "Let's turn these logs into planks.",
      "zh": "我们把这些原木做成木板吧。",
      "an": "https://english.example.com/audio/ep/ep-video-firstnight/s018-n-4e6c15.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-firstnight/s018-s-e84599.mp3"
    },
    {
      "s": "s019",
      "e": "ep-video-firstnight",
      "k": "video",
      "sp": "Kenzo",
      "en": "Now I have 16 wood planks.",
      "zh": "现在我有16块木板了。",
      "an": "https://english.example.com/audio/ep/ep-video-firstnight/s019-n-6c8aeb.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-firstnight/s019-s-26c00f.mp3"
    },
    {
      "s": "s020",
      "e": "ep-video-firstnight",
      "k": "video",
      "sp": "Kenzo",
      "en": "Let's build a crafting table. Crafting table.",
      "zh": "我们来做一个工作台。工作台！",
      "an": "https://english.example.com/audio/ep/ep-video-firstnight/s020-n-3e2908.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-firstnight/s020-s-4b052b.mp3"
    },
    {
      "s": "s021",
      "e": "ep-video-firstnight",
      "k": "video",
      "sp": "Kenzo",
      "en": "Melons. There are some melons here. I'm going to collect some melons.",
      "zh": "西瓜！这里有一些西瓜。我要收集一些西瓜。",
      "an": "https://english.example.com/audio/ep/ep-video-firstnight/s021-n-c45554.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-firstnight/s021-s-5fcf6c.mp3"
    },
    {
      "s": "s022",
      "e": "ep-video-firstnight",
      "k": "video",
      "sp": "Kenzo",
      "en": "Melons will be a good source of food. Melons.",
      "zh": "西瓜会是很好的食物来源。西瓜！",
      "an": "https://english.example.com/audio/ep/ep-video-firstnight/s022-n-c52bfa.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-firstnight/s022-s-5d11ec.mp3"
    },
    {
      "s": "s023",
      "e": "ep-video-firstnight",
      "k": "video",
      "sp": "Kenzo",
      "en": "No. Die. Die. Die. Die. Die, die. It's a baby zombie with a leather helmet.",
      "zh": "不！倒下吧，倒下吧……这是一只戴着皮革头盔的小僵尸！",
      "an": "https://english.example.com/audio/ep/ep-video-firstnight/s023-n-cdf941.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-firstnight/s023-s-a14746.mp3"
    },
    {
      "s": "s024",
      "e": "ep-video-firstnight",
      "k": "video",
      "sp": "Kenzo",
      "en": "Die, die, die, die, die, die, die. How many times do I have to punch him?",
      "zh": "倒下吧，倒下吧……我到底要打他多少下啊？",
      "an": "https://english.example.com/audio/ep/ep-video-firstnight/s024-n-39fed1.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-firstnight/s024-s-d0647e.mp3"
    },
    {
      "s": "s025",
      "e": "ep-video-firstnight",
      "k": "video",
      "sp": "Kenzo",
      "en": "Wow, I need a sword.",
      "zh": "哇，我需要一把剑。",
      "an": "https://english.example.com/audio/ep/ep-video-firstnight/s025-n-535352.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-firstnight/s025-s-ef7b10.mp3"
    },
    {
      "s": "s026",
      "e": "ep-video-firstnight",
      "k": "video",
      "sp": "Kenzo",
      "en": "I really need a sword. Let's place the crafting table. Place.",
      "zh": "我真的需要一把剑。我们把工作台放下来。放！",
      "an": "https://english.example.com/audio/ep/ep-video-firstnight/s026-n-f81d6b.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-firstnight/s026-s-83dc14.mp3"
    },
    {
      "s": "s027",
      "e": "ep-video-firstnight",
      "k": "video",
      "sp": "Kenzo",
      "en": "And with the crafting table, let's build some sticks.",
      "zh": "用工作台，我们来做一些木棍。",
      "an": "https://english.example.com/audio/ep/ep-video-firstnight/s027-n-c61493.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-firstnight/s027-s-bee27d.mp3"
    },
    {
      "s": "s028",
      "e": "ep-video-firstnight",
      "k": "video",
      "sp": "Kenzo",
      "en": "And now let's build a wooden pickaxe.",
      "zh": "现在我们来做一把木镐。",
      "an": "https://english.example.com/audio/ep/ep-video-firstnight/s028-n-619d84.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-firstnight/s028-s-569ec9.mp3"
    },
    {
      "s": "s029",
      "e": "ep-video-firstnight",
      "k": "video",
      "sp": "Kenzo",
      "en": "And with this wooden pickaxe, let's collect some stone.",
      "zh": "用这把木镐，我们来收集一些石头。",
      "an": "https://english.example.com/audio/ep/ep-video-firstnight/s029-n-1a15aa.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-firstnight/s029-s-e23a6c.mp3"
    },
    {
      "s": "s030",
      "e": "ep-video-firstnight",
      "k": "video",
      "sp": "Kenzo",
      "en": "I'm going to dig underground right here. Dig.",
      "zh": "我要就在这里往地下挖。挖！",
      "an": "https://english.example.com/audio/ep/ep-video-firstnight/s030-n-ed5404.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-firstnight/s030-s-f3f2ac.mp3"
    },
    {
      "s": "s031",
      "e": "ep-video-firstnight",
      "k": "video",
      "sp": "Kenzo",
      "en": "I only have 3 hearts. I need to eat.",
      "zh": "我只剩3颗心的血量了。我需要吃东西。",
      "an": "https://english.example.com/audio/ep/ep-video-firstnight/s031-n-889135.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-firstnight/s031-s-b8a7af.mp3"
    },
    {
      "s": "s032",
      "e": "ep-video-firstnight",
      "k": "video",
      "sp": "Kenzo",
      "en": "Okay, now my hunger is full, so I'll begin healing.",
      "zh": "好，现在我的饥饿值满了，所以我会开始回血。",
      "an": "https://english.example.com/audio/ep/ep-video-firstnight/s032-n-abc346.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-firstnight/s032-s-1df1b7.mp3"
    },
    {
      "s": "s033",
      "e": "ep-video-firstnight",
      "k": "video",
      "sp": "Kenzo",
      "en": "Let's collect some stone using our wooden pickaxe.",
      "zh": "我们用木镐来收集一些石头吧。",
      "an": "https://english.example.com/audio/ep/ep-video-firstnight/s033-n-761aa3.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-firstnight/s033-s-66b6f1.mp3"
    },
    {
      "s": "s034",
      "e": "ep-video-firstnight",
      "k": "video",
      "sp": "Kenzo",
      "en": "I hear another zombie.",
      "zh": "我听到另一只僵尸的声音。",
      "an": "https://english.example.com/audio/ep/ep-video-firstnight/s034-n-290c2f.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-firstnight/s034-s-ed1c65.mp3"
    },
    {
      "s": "s035",
      "e": "ep-video-firstnight",
      "k": "video",
      "sp": "Kenzo",
      "en": "Coal. I found some coal.",
      "zh": "煤！我找到了一些煤。",
      "an": "https://english.example.com/audio/ep/ep-video-firstnight/s035-n-cd4236.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-firstnight/s035-s-39e2e5.mp3"
    },
    {
      "s": "s036",
      "e": "ep-video-firstnight",
      "k": "video",
      "sp": "Kenzo",
      "en": "Now I can build torches.",
      "zh": "现在我可以做火把了。",
      "an": "https://english.example.com/audio/ep/ep-video-firstnight/s036-n-a1111f.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-firstnight/s036-s-50cb86.mp3"
    },
    {
      "s": "s037",
      "e": "ep-video-firstnight",
      "k": "video",
      "sp": "Kenzo",
      "en": "Iron. Wow. I already found some coal and some iron.",
      "zh": "铁！哇，我已经找到了一些煤和铁。",
      "an": "https://english.example.com/audio/ep/ep-video-firstnight/s037-n-bd65d1.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-firstnight/s037-s-df44d6.mp3"
    },
    {
      "s": "s038",
      "e": "ep-video-firstnight",
      "k": "video",
      "sp": "Kenzo",
      "en": "Great, great, great, great. I still hear a zombie.",
      "zh": "太好了，太好了！我还是能听到僵尸的声音。",
      "an": "https://english.example.com/audio/ep/ep-video-firstnight/s038-n-ad9e01.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-firstnight/s038-s-f3c440.mp3"
    },
    {
      "s": "s039",
      "e": "ep-video-firstnight",
      "k": "video",
      "sp": "Kenzo",
      "en": "It sounds close.",
      "zh": "听起来很近。",
      "an": "https://english.example.com/audio/ep/ep-video-firstnight/s039-n-d8278b.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-firstnight/s039-s-b2c9ab.mp3"
    },
    {
      "s": "s040",
      "e": "ep-video-firstnight",
      "k": "video",
      "sp": "Kenzo",
      "en": "My wooden pickaxe is almost broken, so I'm going to stop using it.",
      "zh": "我的木镐快坏了，所以我不再用它了。",
      "an": "https://english.example.com/audio/ep/ep-video-firstnight/s040-n-d11ad9.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-firstnight/s040-s-a8c7a2.mp3"
    },
    {
      "s": "s041",
      "e": "ep-video-firstnight",
      "k": "video",
      "sp": "Kenzo",
      "en": "You see, this is my very first pickaxe in this world.",
      "zh": "你看，这是我在这个世界里的第一把镐。",
      "an": "https://english.example.com/audio/ep/ep-video-firstnight/s041-n-bb0cf7.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-firstnight/s041-s-2e2c04.mp3"
    },
    {
      "s": "s042",
      "e": "ep-video-firstnight",
      "k": "video",
      "sp": "Kenzo",
      "en": "So, I'm going to save this pickaxe.",
      "zh": "所以，我要把这把镐留下来。",
      "an": "https://english.example.com/audio/ep/ep-video-firstnight/s042-n-8a9057.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-firstnight/s042-s-b0a09f.mp3"
    },
    {
      "s": "s043",
      "e": "ep-video-firstnight",
      "k": "video",
      "sp": "Kenzo",
      "en": "I'm going to stop using it.",
      "zh": "我不再用它了。",
      "an": "https://english.example.com/audio/ep/ep-video-firstnight/s043-n-bc00c9.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-firstnight/s043-s-a2db63.mp3"
    },
    {
      "s": "s044",
      "e": "ep-video-firstnight",
      "k": "video",
      "sp": "Kenzo",
      "en": "Now, I'm going to go back up and build a stone pickaxe.",
      "zh": "现在，我要回到上面去，做一把石镐。",
      "an": "https://english.example.com/audio/ep/ep-video-firstnight/s044-n-e4de5b.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-firstnight/s044-s-6e7f92.mp3"
    },
    {
      "s": "s045",
      "e": "ep-video-firstnight",
      "k": "video",
      "sp": "Kenzo",
      "en": "Now that we have cobblestone, we can upgrade to stone tools.",
      "zh": "既然我们有了圆石，就可以升级成石头工具了。",
      "an": "https://english.example.com/audio/ep/ep-video-firstnight/s045-n-7fe94d.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-firstnight/s045-s-7fb9c2.mp3"
    },
    {
      "s": "s046",
      "e": "ep-video-firstnight",
      "k": "video",
      "sp": "Kenzo",
      "en": "Let's build a stone pickaxe, a stone sword, and a stone axe.",
      "zh": "我们来做一把石镐、一把石剑和一把石斧。",
      "an": "https://english.example.com/audio/ep/ep-video-firstnight/s046-n-7ca7ee.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-firstnight/s046-s-fcfe13.mp3"
    },
    {
      "s": "s047",
      "e": "ep-video-firstnight",
      "k": "video",
      "sp": "Kenzo",
      "en": "Let's build two stone swords.",
      "zh": "我们做两把石剑吧。",
      "an": "https://english.example.com/audio/ep/ep-video-firstnight/s047-n-4a5d37.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-firstnight/s047-s-9d6e9b.mp3"
    },
    {
      "s": "s048",
      "e": "ep-video-firstnight",
      "k": "video",
      "sp": "Kenzo",
      "en": "There we go. And let's build some torches.",
      "zh": "好了。我们再做一些火把。",
      "an": "https://english.example.com/audio/ep/ep-video-firstnight/s048-n-e1958e.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-firstnight/s048-s-2a584c.mp3"
    },
    {
      "s": "s049",
      "e": "ep-video-firstnight",
      "k": "video",
      "sp": "Kenzo",
      "en": "There we go. 16 torches.",
      "zh": "好了。16个火把。",
      "an": "https://english.example.com/audio/ep/ep-video-firstnight/s049-n-6a3c5c.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-firstnight/s049-s-59ec18.mp3"
    },
    {
      "s": "s050",
      "e": "ep-video-firstnight",
      "k": "video",
      "sp": "Kenzo",
      "en": "With my sword, I'm going to kill this cow.",
      "zh": "我要用我的剑打倒这头牛。",
      "an": "https://english.example.com/audio/ep/ep-video-firstnight/s050-n-b13a0a.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-firstnight/s050-s-ae9579.mp3"
    },
    {
      "s": "s051",
      "e": "ep-video-firstnight",
      "k": "video",
      "sp": "Kenzo",
      "en": "Sorry, cow.",
      "zh": "对不起啦，牛。",
      "an": "https://english.example.com/audio/ep/ep-video-firstnight/s051-n-63a58d.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-firstnight/s051-s-1eff9c.mp3"
    },
    {
      "s": "s052",
      "e": "ep-video-firstnight",
      "k": "video",
      "sp": "Kenzo",
      "en": "I need the food.",
      "zh": "我需要食物。",
      "an": "https://english.example.com/audio/ep/ep-video-firstnight/s052-n-1180c8.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-firstnight/s052-s-adce9b.mp3"
    },
    {
      "s": "s053",
      "e": "ep-video-firstnight",
      "k": "video",
      "sp": "Kenzo",
      "en": "This pig as well. Die, die, die.",
      "zh": "这只猪也是。倒下吧，倒下吧，倒下吧！",
      "an": "https://english.example.com/audio/ep/ep-video-firstnight/s053-n-434652.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-firstnight/s053-s-411469.mp3"
    },
    {
      "s": "s054",
      "e": "ep-video-firstnight",
      "k": "video",
      "sp": "Kenzo",
      "en": "Okay. Oh, cocoa beans. Let's collect these cocoa beans.",
      "zh": "好。哦，可可豆。我们来收集这些可可豆吧。",
      "an": "https://english.example.com/audio/ep/ep-video-firstnight/s054-n-32a297.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-firstnight/s054-s-ff86a9.mp3"
    },
    {
      "s": "s055",
      "e": "ep-video-firstnight",
      "k": "video",
      "sp": "Kenzo",
      "en": "With these cocoa beans, I can make cookies.",
      "zh": "有了这些可可豆，我就能做曲奇饼干了。",
      "an": "https://english.example.com/audio/ep/ep-video-firstnight/s055-n-fb3ec3.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-firstnight/s055-s-f87e5e.mp3"
    },
    {
      "s": "s056",
      "e": "ep-video-firstnight",
      "k": "video",
      "sp": "Kenzo",
      "en": "With the stone pickaxe, I'm going to mine all of this coal and this iron.",
      "zh": "我要用石镐把这些煤和铁都挖出来。",
      "an": "https://english.example.com/audio/ep/ep-video-firstnight/s056-n-04b243.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-firstnight/s056-s-87bc5a.mp3"
    },
    {
      "s": "s057",
      "e": "ep-video-firstnight",
      "k": "video",
      "sp": "Kenzo",
      "en": "Here we go. Coal.",
      "zh": "开始啦。煤。",
      "an": "https://english.example.com/audio/ep/ep-video-firstnight/s057-n-8a155a.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-firstnight/s057-s-c82a2e.mp3"
    },
    {
      "s": "s058",
      "e": "ep-video-firstnight",
      "k": "video",
      "sp": "Kenzo",
      "en": "All right, that's all the coal.",
      "zh": "好了，煤都挖完了。",
      "an": "https://english.example.com/audio/ep/ep-video-firstnight/s058-n-daab9a.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-firstnight/s058-s-108bfa.mp3"
    },
    {
      "s": "s059",
      "e": "ep-video-firstnight",
      "k": "video",
      "sp": "Kenzo",
      "en": "Now I have 19 coal.",
      "zh": "现在我有19块煤了。",
      "an": "https://english.example.com/audio/ep/ep-video-firstnight/s059-n-973625.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-firstnight/s059-s-74c902.mp3"
    },
    {
      "s": "s060",
      "e": "ep-video-firstnight",
      "k": "video",
      "sp": "Kenzo",
      "en": "Now let's collect this iron.",
      "zh": "现在我们来收集这些铁。",
      "an": "https://english.example.com/audio/ep/ep-video-firstnight/s060-n-7b1596.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-firstnight/s060-s-05ecc0.mp3"
    },
    {
      "s": "s061",
      "e": "ep-video-firstnight",
      "k": "video",
      "sp": "Kenzo",
      "en": "One, two, three, four, five iron.",
      "zh": "一、二、三、四、五块铁。",
      "an": "https://english.example.com/audio/ep/ep-video-firstnight/s061-n-f52da9.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-firstnight/s061-s-a34c3c.mp3"
    },
    {
      "s": "s062",
      "e": "ep-video-firstnight",
      "k": "video",
      "sp": "Kenzo",
      "en": "Oh, look at this.",
      "zh": "哦，看这个。",
      "an": "https://english.example.com/audio/ep/ep-video-firstnight/s062-n-1f0af8.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-firstnight/s062-s-8345d0.mp3"
    },
    {
      "s": "s063",
      "e": "ep-video-firstnight",
      "k": "video",
      "sp": "Kenzo",
      "en": "There's a cave down there.",
      "zh": "下面有一个洞穴。",
      "an": "https://english.example.com/audio/ep/ep-video-firstnight/s063-n-fbca01.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-firstnight/s063-s-cf002e.mp3"
    },
    {
      "s": "s064",
      "e": "ep-video-firstnight",
      "k": "video",
      "sp": "Kenzo",
      "en": "I'm going to place a torch. Torch.",
      "zh": "我要放一个火把。火把。",
      "an": "https://english.example.com/audio/ep/ep-video-firstnight/s064-n-c4c518.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-firstnight/s064-s-c0560a.mp3"
    },
    {
      "s": "s065",
      "e": "ep-video-firstnight",
      "k": "video",
      "sp": "Kenzo",
      "en": "Let's go back up.",
      "zh": "我们回上面去吧。",
      "an": "https://english.example.com/audio/ep/ep-video-firstnight/s065-n-12f661.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-firstnight/s065-s-6b251b.mp3"
    },
    {
      "s": "s066",
      "e": "ep-video-firstnight",
      "k": "video",
      "sp": "Kenzo",
      "en": "I'm going to build a furnace using 1, 2, 3, 4, 5, 6, 7, 8 cobblestone.",
      "zh": "我要用1、2、3、4、5、6、7、8块圆石做一个熔炉。",
      "an": "https://english.example.com/audio/ep/ep-video-firstnight/s066-n-b5bdfb.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-firstnight/s066-s-8867a5.mp3"
    },
    {
      "s": "s067",
      "e": "ep-video-firstnight",
      "k": "video",
      "sp": "Kenzo",
      "en": "I'm going to build a furnace.",
      "zh": "我要做一个熔炉。",
      "an": "https://english.example.com/audio/ep/ep-video-firstnight/s067-n-c6f7c9.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-firstnight/s067-s-6a47ba.mp3"
    },
    {
      "s": "s068",
      "e": "ep-video-firstnight",
      "k": "video",
      "sp": "Kenzo",
      "en": "Let's break the crafting table. All right.",
      "zh": "我们把工作台拆掉吧。好了。",
      "an": "https://english.example.com/audio/ep/ep-video-firstnight/s068-n-1b1a0f.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-firstnight/s068-s-9f6b30.mp3"
    },
    {
      "s": "s069",
      "e": "ep-video-firstnight",
      "k": "video",
      "sp": "Kenzo",
      "en": "Going to place a torch right here.",
      "zh": "在这里放一个火把。",
      "an": "https://english.example.com/audio/ep/ep-video-firstnight/s069-n-68b171.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-firstnight/s069-s-ceb264.mp3"
    },
    {
      "s": "s070",
      "e": "ep-video-firstnight",
      "k": "video",
      "sp": "Kenzo",
      "en": "And for now, I'll turn this into my little home.",
      "zh": "现在，我先把这里变成我的小家。",
      "an": "https://english.example.com/audio/ep/ep-video-firstnight/s070-n-79a236.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-firstnight/s070-s-c61205.mp3"
    },
    {
      "s": "s001",
      "e": "ep-pep3-u1",
      "k": "textbook",
      "sp": null,
      "en": "Hello! I'm Mike Black.",
      "zh": "你好！我是迈克·布莱克。",
      "an": "https://english.example.com/audio/ep/ep-pep3-u1/s001-n-8d1930.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3-u1/s001-s-a562d2.mp3"
    },
    {
      "s": "s002",
      "e": "ep-pep3-u1",
      "k": "textbook",
      "sp": null,
      "en": "Hi! My name is Wu Binbin.",
      "zh": "嗨！我叫吴斌斌。",
      "an": "https://english.example.com/audio/ep/ep-pep3-u1/s002-n-5314fe.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3-u1/s002-s-ed73bd.mp3"
    },
    {
      "s": "s003",
      "e": "ep-pep3-u1",
      "k": "textbook",
      "sp": null,
      "en": "Nice to meet you.",
      "zh": "很高兴认识你。",
      "an": "https://english.example.com/audio/ep/ep-pep3-u1/s003-n-f2b6dd.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3-u1/s003-s-7c389e.mp3"
    },
    {
      "s": "s004",
      "e": "ep-pep3-u1",
      "k": "textbook",
      "sp": null,
      "en": "Nice to meet you too.",
      "zh": "我也很高兴认识你。",
      "an": "https://english.example.com/audio/ep/ep-pep3-u1/s004-n-1e2da6.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3-u1/s004-s-367b69.mp3"
    },
    {
      "s": "s005",
      "e": "ep-pep3-u1",
      "k": "textbook",
      "sp": null,
      "en": "Hello! My name is Mike Black.",
      "zh": "你好！我叫迈克·布莱克。",
      "an": "https://english.example.com/audio/ep/ep-pep3-u1/s005-n-64dcb5.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3-u1/s005-s-3d8bd1.mp3"
    },
    {
      "s": "s006",
      "e": "ep-pep3-u1",
      "k": "textbook",
      "sp": null,
      "en": "Hi! I'm Sarah Miller.",
      "zh": "嗨！我是萨拉·米勒。",
      "an": "https://english.example.com/audio/ep/ep-pep3-u1/s006-n-517b2e.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3-u1/s006-s-6bd719.mp3"
    },
    {
      "s": "s007",
      "e": "ep-pep3-u1",
      "k": "textbook",
      "sp": null,
      "en": "Oh no!",
      "zh": "哦，不！",
      "an": "https://english.example.com/audio/ep/ep-pep3-u1/s007-n-0d91b2.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3-u1/s007-s-0e1de3.mp3"
    },
    {
      "s": "s008",
      "e": "ep-pep3-u1",
      "k": "textbook",
      "sp": null,
      "en": "It's OK, Chen Jie. We can share.",
      "zh": "没关系，陈杰。我们可以一起用。",
      "an": "https://english.example.com/audio/ep/ep-pep3-u1/s008-n-396798.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3-u1/s008-s-7440e2.mp3"
    },
    {
      "s": "s009",
      "e": "ep-pep3-u1",
      "k": "textbook",
      "sp": null,
      "en": "Thanks, Sarah.",
      "zh": "谢谢你，萨拉。",
      "an": "https://english.example.com/audio/ep/ep-pep3-u1/s009-n-3e6d89.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3-u1/s009-s-9793ed.mp3"
    },
    {
      "s": "s010",
      "e": "ep-pep3-u1",
      "k": "textbook",
      "sp": null,
      "en": "Hey, Sarah! We can share.",
      "zh": "嘿，萨拉！我们可以一起用。",
      "an": "https://english.example.com/audio/ep/ep-pep3-u1/s010-n-272252.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3-u1/s010-s-829b0f.mp3"
    },
    {
      "s": "s011",
      "e": "ep-pep3-u1",
      "k": "textbook",
      "sp": null,
      "en": "Thank you, Chen Jie.",
      "zh": "谢谢你，陈杰。",
      "an": "https://english.example.com/audio/ep/ep-pep3-u1/s011-n-1f877e.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3-u1/s011-s-fa5303.mp3"
    },
    {
      "s": "s012",
      "e": "ep-pep3-u1",
      "k": "textbook",
      "sp": null,
      "en": "I smile.",
      "zh": "我微笑。",
      "an": "https://english.example.com/audio/ep/ep-pep3-u1/s012-n-dc9722.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3-u1/s012-s-ea2889.mp3"
    },
    {
      "s": "s013",
      "e": "ep-pep3-u1",
      "k": "textbook",
      "sp": null,
      "en": "I listen.",
      "zh": "我倾听。",
      "an": "https://english.example.com/audio/ep/ep-pep3-u1/s013-n-14b59a.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3-u1/s013-s-5fa184.mp3"
    },
    {
      "s": "s014",
      "e": "ep-pep3-u1",
      "k": "textbook",
      "sp": null,
      "en": "I help.",
      "zh": "我帮忙。",
      "an": "https://english.example.com/audio/ep/ep-pep3-u1/s014-n-9c2be0.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3-u1/s014-s-86c0a1.mp3"
    },
    {
      "s": "s015",
      "e": "ep-pep3-u1",
      "k": "textbook",
      "sp": null,
      "en": "I share.",
      "zh": "我分享。",
      "an": "https://english.example.com/audio/ep/ep-pep3-u1/s015-n-a7f52d.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3-u1/s015-s-a6fec8.mp3"
    },
    {
      "s": "s016",
      "e": "ep-pep3-u1",
      "k": "textbook",
      "sp": null,
      "en": "Zoom is my new friend.",
      "zh": "祖姆是我的新朋友。",
      "an": "https://english.example.com/audio/ep/ep-pep3-u1/s016-n-b0c31b.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3-u1/s016-s-f34df5.mp3"
    },
    {
      "s": "s017",
      "e": "ep-pep3-u1",
      "k": "textbook",
      "sp": null,
      "en": "Hi! I'm Zip.",
      "zh": "嗨！我是齐普。",
      "an": "https://english.example.com/audio/ep/ep-pep3-u1/s017-n-b2cde3.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3-u1/s017-s-ce8214.mp3"
    },
    {
      "s": "s018",
      "e": "ep-pep3-u1",
      "k": "textbook",
      "sp": null,
      "en": "Hi! My name is Zoom.",
      "zh": "嗨！我叫祖姆。",
      "an": "https://english.example.com/audio/ep/ep-pep3-u1/s018-n-080609.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3-u1/s018-s-8c9bc2.mp3"
    },
    {
      "s": "s019",
      "e": "ep-pep3-u1",
      "k": "textbook",
      "sp": null,
      "en": "Nice to meet you.",
      "zh": "很高兴认识你。",
      "an": "https://english.example.com/audio/ep/ep-pep3-u1/s019-n-f2b6dd.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3-u1/s019-s-7c389e.mp3"
    },
    {
      "s": "s020",
      "e": "ep-pep3-u1",
      "k": "textbook",
      "sp": null,
      "en": "Nice to meet you too.",
      "zh": "我也很高兴认识你。",
      "an": "https://english.example.com/audio/ep/ep-pep3-u1/s020-n-1e2da6.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3-u1/s020-s-367b69.mp3"
    },
    {
      "s": "s021",
      "e": "ep-pep3-u1",
      "k": "textbook",
      "sp": null,
      "en": "Zoom is nice.",
      "zh": "祖姆很友善。",
      "an": "https://english.example.com/audio/ep/ep-pep3-u1/s021-n-11d0a3.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3-u1/s021-s-623516.mp3"
    },
    {
      "s": "s022",
      "e": "ep-pep3-u1",
      "k": "textbook",
      "sp": null,
      "en": "We share food.",
      "zh": "我们分享食物。",
      "an": "https://english.example.com/audio/ep/ep-pep3-u1/s022-n-81547f.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3-u1/s022-s-ee81ae.mp3"
    },
    {
      "s": "s023",
      "e": "ep-pep3-u1",
      "k": "textbook",
      "sp": null,
      "en": "We play together.",
      "zh": "我们一起玩。",
      "an": "https://english.example.com/audio/ep/ep-pep3-u1/s023-n-c4c628.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3-u1/s023-s-f850c8.mp3"
    },
    {
      "s": "s024",
      "e": "ep-pep3-u1",
      "k": "textbook",
      "sp": null,
      "en": "We listen with care and help each other.",
      "zh": "我们认真倾听，互相帮助。",
      "an": "https://english.example.com/audio/ep/ep-pep3-u1/s024-n-e9912b.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3-u1/s024-s-c9890c.mp3"
    },
    {
      "s": "s025",
      "e": "ep-pep3-u1",
      "k": "textbook",
      "sp": null,
      "en": "Ouch! My mouth!",
      "zh": "哎哟！我的嘴！",
      "an": "https://english.example.com/audio/ep/ep-pep3-u1/s025-n-b98bf0.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3-u1/s025-s-cb6694.mp3"
    },
    {
      "s": "s026",
      "e": "ep-pep3-u1",
      "k": "textbook",
      "sp": null,
      "en": "Hold my hand.",
      "zh": "拉住我的手。",
      "an": "https://english.example.com/audio/ep/ep-pep3-u1/s026-n-9ce76a.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3-u1/s026-s-b9d1f8.mp3"
    },
    {
      "s": "s027",
      "e": "ep-pep3-u1",
      "k": "textbook",
      "sp": null,
      "en": "We are good friends now.",
      "zh": "我们现在是好朋友了。",
      "an": "https://english.example.com/audio/ep/ep-pep3-u1/s027-n-450ab7.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3-u1/s027-s-9ccec7.mp3"
    },
    {
      "s": "s028",
      "e": "ep-pep3-u1",
      "k": "textbook",
      "sp": null,
      "en": "Smile and say \"Hello!\" to make friends.",
      "zh": "微笑着说声“你好！”，就能交朋友。",
      "an": "https://english.example.com/audio/ep/ep-pep3-u1/s028-n-02afbe.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3-u1/s028-s-1cfc7b.mp3"
    },
    {
      "s": "s029",
      "e": "ep-pep3-u1",
      "k": "textbook",
      "sp": null,
      "en": "Good friends share, help and listen with care.",
      "zh": "好朋友会分享、会帮忙，还会认真倾听。",
      "an": "https://english.example.com/audio/ep/ep-pep3-u1/s029-n-ea983c.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3-u1/s029-s-50ec54.mp3"
    },
    {
      "s": "s001",
      "e": "ep-pep3-u2",
      "k": "textbook",
      "sp": null,
      "en": "Mum! Dad! This is my friend, Sarah Miller.",
      "zh": "妈妈！爸爸！这是我的朋友，萨拉·米勒。",
      "an": "https://english.example.com/audio/ep/ep-pep3-u2/s001-n-ef279e.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3-u2/s001-s-05b816.mp3"
    },
    {
      "s": "s002",
      "e": "ep-pep3-u2",
      "k": "textbook",
      "sp": null,
      "en": "Hi, Sarah.",
      "zh": "你好，萨拉。",
      "an": "https://english.example.com/audio/ep/ep-pep3-u2/s002-n-1c8e23.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3-u2/s002-s-d03f94.mp3"
    },
    {
      "s": "s003",
      "e": "ep-pep3-u2",
      "k": "textbook",
      "sp": null,
      "en": "This is my grandma. This is my grandpa.",
      "zh": "这是我的奶奶。这是我的爷爷。",
      "an": "https://english.example.com/audio/ep/ep-pep3-u2/s003-n-3e598e.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3-u2/s003-s-3ee4b2.mp3"
    },
    {
      "s": "s004",
      "e": "ep-pep3-u2",
      "k": "textbook",
      "sp": null,
      "en": "Nice to meet you.",
      "zh": "很高兴认识你。",
      "an": "https://english.example.com/audio/ep/ep-pep3-u2/s004-n-f2b6dd.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3-u2/s004-s-7c389e.mp3"
    },
    {
      "s": "s005",
      "e": "ep-pep3-u2",
      "k": "textbook",
      "sp": null,
      "en": "Hi, I'm Chen Jie. Look!",
      "zh": "你好，我是陈杰。看！",
      "an": "https://english.example.com/audio/ep/ep-pep3-u2/s005-n-a1175a.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3-u2/s005-s-36da38.mp3"
    },
    {
      "s": "s006",
      "e": "ep-pep3-u2",
      "k": "textbook",
      "sp": null,
      "en": "This is my family. This is my ...",
      "zh": "这是我的家人。这是我的……",
      "an": "https://english.example.com/audio/ep/ep-pep3-u2/s006-n-d16231.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3-u2/s006-s-fc0b64.mp3"
    },
    {
      "s": "s007",
      "e": "ep-pep3-u2",
      "k": "textbook",
      "sp": null,
      "en": "Sarah, you have a big family. Is this your sister?",
      "zh": "萨拉，你家人真多。这是你的妹妹吗？",
      "an": "https://english.example.com/audio/ep/ep-pep3-u2/s007-n-8e0dce.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3-u2/s007-s-a6639c.mp3"
    },
    {
      "s": "s008",
      "e": "ep-pep3-u2",
      "k": "textbook",
      "sp": null,
      "en": "No, it's my cousin.",
      "zh": "不，这是我的表妹。",
      "an": "https://english.example.com/audio/ep/ep-pep3-u2/s008-n-d4ddd1.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3-u2/s008-s-2b943f.mp3"
    },
    {
      "s": "s009",
      "e": "ep-pep3-u2",
      "k": "textbook",
      "sp": null,
      "en": "Is that your brother?",
      "zh": "那是你的哥哥吗？",
      "an": "https://english.example.com/audio/ep/ep-pep3-u2/s009-n-c9dde7.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3-u2/s009-s-fd868f.mp3"
    },
    {
      "s": "s010",
      "e": "ep-pep3-u2",
      "k": "textbook",
      "sp": null,
      "en": "Yes, it is.",
      "zh": "是的。",
      "an": "https://english.example.com/audio/ep/ep-pep3-u2/s010-n-448a20.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3-u2/s010-s-5d494d.mp3"
    },
    {
      "s": "s011",
      "e": "ep-pep3-u2",
      "k": "textbook",
      "sp": null,
      "en": "My family is big.",
      "zh": "我家人很多。",
      "an": "https://english.example.com/audio/ep/ep-pep3-u2/s011-n-22ce14.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3-u2/s011-s-a2301f.mp3"
    },
    {
      "s": "s012",
      "e": "ep-pep3-u2",
      "k": "textbook",
      "sp": null,
      "en": "I have a brother, a baby sister, a cousin ...",
      "zh": "我有一个哥哥、一个小妹妹、一个表妹……",
      "an": "https://english.example.com/audio/ep/ep-pep3-u2/s012-n-3f1587.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3-u2/s012-s-3501a9.mp3"
    },
    {
      "s": "s013",
      "e": "ep-pep3-u2",
      "k": "textbook",
      "sp": null,
      "en": "This is my family.",
      "zh": "这是我的家人。",
      "an": "https://english.example.com/audio/ep/ep-pep3-u2/s013-n-103f84.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3-u2/s013-s-898e15.mp3"
    },
    {
      "s": "s014",
      "e": "ep-pep3-u2",
      "k": "textbook",
      "sp": null,
      "en": "I play with my brother.",
      "zh": "我和哥哥一起玩。",
      "an": "https://english.example.com/audio/ep/ep-pep3-u2/s014-n-637521.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3-u2/s014-s-819ddf.mp3"
    },
    {
      "s": "s015",
      "e": "ep-pep3-u2",
      "k": "textbook",
      "sp": null,
      "en": "We share.",
      "zh": "我们一起分享。",
      "an": "https://english.example.com/audio/ep/ep-pep3-u2/s015-n-1d668c.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3-u2/s015-s-2e7dcf.mp3"
    },
    {
      "s": "s016",
      "e": "ep-pep3-u2",
      "k": "textbook",
      "sp": null,
      "en": "We listen with care.",
      "zh": "我们认真倾听。",
      "an": "https://english.example.com/audio/ep/ep-pep3-u2/s016-n-88e714.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3-u2/s016-s-a044cc.mp3"
    },
    {
      "s": "s017",
      "e": "ep-pep3-u2",
      "k": "textbook",
      "sp": null,
      "en": "I have a small family.",
      "zh": "我家人不多。",
      "an": "https://english.example.com/audio/ep/ep-pep3-u2/s017-n-19621c.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3-u2/s017-s-27ea87.mp3"
    },
    {
      "s": "s018",
      "e": "ep-pep3-u2",
      "k": "textbook",
      "sp": null,
      "en": "I love my small family.",
      "zh": "我爱我的小家庭。",
      "an": "https://english.example.com/audio/ep/ep-pep3-u2/s018-n-f5b7f7.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3-u2/s018-s-e90520.mp3"
    },
    {
      "s": "s019",
      "e": "ep-pep3-u2",
      "k": "textbook",
      "sp": null,
      "en": "This is my family.",
      "zh": "这是我的家人。",
      "an": "https://english.example.com/audio/ep/ep-pep3-u2/s019-n-103f84.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3-u2/s019-s-898e15.mp3"
    },
    {
      "s": "s020",
      "e": "ep-pep3-u2",
      "k": "textbook",
      "sp": null,
      "en": "I play with my brothers.",
      "zh": "我和兄弟们一起玩。",
      "an": "https://english.example.com/audio/ep/ep-pep3-u2/s020-n-3f2968.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3-u2/s020-s-fc0ff2.mp3"
    },
    {
      "s": "s021",
      "e": "ep-pep3-u2",
      "k": "textbook",
      "sp": null,
      "en": "I share with my sisters.",
      "zh": "我和姐妹们一起分享。",
      "an": "https://english.example.com/audio/ep/ep-pep3-u2/s021-n-d8c8d2.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3-u2/s021-s-3a1e63.mp3"
    },
    {
      "s": "s022",
      "e": "ep-pep3-u2",
      "k": "textbook",
      "sp": null,
      "en": "I talk with my cousins.",
      "zh": "我和表兄弟姐妹们聊天。",
      "an": "https://english.example.com/audio/ep/ep-pep3-u2/s022-n-b84330.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3-u2/s022-s-311c94.mp3"
    },
    {
      "s": "s023",
      "e": "ep-pep3-u2",
      "k": "textbook",
      "sp": null,
      "en": "We listen with care.",
      "zh": "我们认真倾听。",
      "an": "https://english.example.com/audio/ep/ep-pep3-u2/s023-n-88e714.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3-u2/s023-s-a044cc.mp3"
    },
    {
      "s": "s024",
      "e": "ep-pep3-u2",
      "k": "textbook",
      "sp": null,
      "en": "I have a big family.",
      "zh": "我家人很多。",
      "an": "https://english.example.com/audio/ep/ep-pep3-u2/s024-n-8a75a1.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3-u2/s024-s-ba0549.mp3"
    },
    {
      "s": "s025",
      "e": "ep-pep3-u2",
      "k": "textbook",
      "sp": null,
      "en": "I love my big family.",
      "zh": "我爱我的大家庭。",
      "an": "https://english.example.com/audio/ep/ep-pep3-u2/s025-n-2d668b.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3-u2/s025-s-48f664.mp3"
    },
    {
      "s": "s026",
      "e": "ep-pep3-u2",
      "k": "textbook",
      "sp": null,
      "en": "Families can be big or small.",
      "zh": "有的家庭人多，有的家庭人少。",
      "an": "https://english.example.com/audio/ep/ep-pep3-u2/s026-n-3489d5.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3-u2/s026-s-bad1ca.mp3"
    },
    {
      "s": "s027",
      "e": "ep-pep3-u2",
      "k": "textbook",
      "sp": null,
      "en": "Family members love each other.",
      "zh": "家人彼此相爱。",
      "an": "https://english.example.com/audio/ep/ep-pep3-u2/s027-n-286a73.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3-u2/s027-s-26f514.mp3"
    },
    {
      "s": "s001",
      "e": "ep-pep3a-u3",
      "k": "textbook",
      "sp": null,
      "en": "Good morning, Mike!",
      "zh": "早上好，迈克！",
      "an": "https://english.example.com/audio/ep/ep-pep3a-u3/s001-n-2ab2b8.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3a-u3/s001-s-2a0a91.mp3"
    },
    {
      "s": "s002",
      "e": "ep-pep3a-u3",
      "k": "textbook",
      "sp": null,
      "en": "Good morning! Come in.",
      "zh": "早上好！快进来吧。",
      "an": "https://english.example.com/audio/ep/ep-pep3a-u3/s002-n-f3256c.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3a-u3/s002-s-85d4a7.mp3"
    },
    {
      "s": "s003",
      "e": "ep-pep3a-u3",
      "k": "textbook",
      "sp": null,
      "en": "I like your dog.",
      "zh": "我喜欢你的小狗。",
      "an": "https://english.example.com/audio/ep/ep-pep3a-u3/s003-n-25fa12.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3a-u3/s003-s-91a2cf.mp3"
    },
    {
      "s": "s004",
      "e": "ep-pep3a-u3",
      "k": "textbook",
      "sp": null,
      "en": "Thanks. Do you have a pet?",
      "zh": "谢谢。你养宠物了吗？",
      "an": "https://english.example.com/audio/ep/ep-pep3a-u3/s004-n-112e9b.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3a-u3/s004-s-dd6809.mp3"
    },
    {
      "s": "s005",
      "e": "ep-pep3a-u3",
      "k": "textbook",
      "sp": null,
      "en": "No, I don't.",
      "zh": "没有，我没养。",
      "an": "https://english.example.com/audio/ep/ep-pep3a-u3/s005-n-52b796.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3a-u3/s005-s-b8175c.mp3"
    },
    {
      "s": "s006",
      "e": "ep-pep3a-u3",
      "k": "textbook",
      "sp": null,
      "en": "Yes, I do. I have a cat.",
      "zh": "养了，我有一只猫。",
      "an": "https://english.example.com/audio/ep/ep-pep3a-u3/s006-n-3cf78c.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3a-u3/s006-s-66548f.mp3"
    },
    {
      "s": "s007",
      "e": "ep-pep3a-u3",
      "k": "textbook",
      "sp": null,
      "en": "I like my dog.",
      "zh": "我喜欢我的小狗。",
      "an": "https://english.example.com/audio/ep/ep-pep3a-u3/s007-n-c4c060.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3a-u3/s007-s-f7cf52.mp3"
    },
    {
      "s": "s008",
      "e": "ep-pep3a-u3",
      "k": "textbook",
      "sp": null,
      "en": "I like fish.",
      "zh": "我喜欢鱼。",
      "an": "https://english.example.com/audio/ep/ep-pep3a-u3/s008-n-bb5170.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3a-u3/s008-s-15ba44.mp3"
    },
    {
      "s": "s009",
      "e": "ep-pep3a-u3",
      "k": "textbook",
      "sp": null,
      "en": "I like cats.",
      "zh": "我喜欢猫。",
      "an": "https://english.example.com/audio/ep/ep-pep3a-u3/s009-n-a5eb32.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3a-u3/s009-s-f2feea.mp3"
    },
    {
      "s": "s010",
      "e": "ep-pep3a-u3",
      "k": "textbook",
      "sp": null,
      "en": "I like birds.",
      "zh": "我喜欢小鸟。",
      "an": "https://english.example.com/audio/ep/ep-pep3a-u3/s010-n-f708ee.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3a-u3/s010-s-eb34a6.mp3"
    },
    {
      "s": "s011",
      "e": "ep-pep3a-u3",
      "k": "textbook",
      "sp": null,
      "en": "I like rabbits.",
      "zh": "我喜欢兔子。",
      "an": "https://english.example.com/audio/ep/ep-pep3a-u3/s011-n-026f13.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3a-u3/s011-s-d35c42.mp3"
    },
    {
      "s": "s012",
      "e": "ep-pep3a-u3",
      "k": "textbook",
      "sp": null,
      "en": "Let's go to the zoo!",
      "zh": "我们去动物园吧！",
      "an": "https://english.example.com/audio/ep/ep-pep3a-u3/s012-n-4118a0.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3a-u3/s012-s-74446f.mp3"
    },
    {
      "s": "s013",
      "e": "ep-pep3a-u3",
      "k": "textbook",
      "sp": null,
      "en": "Great!",
      "zh": "太棒了！",
      "an": "https://english.example.com/audio/ep/ep-pep3a-u3/s013-n-9f7174.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3a-u3/s013-s-24a1f1.mp3"
    },
    {
      "s": "s014",
      "e": "ep-pep3a-u3",
      "k": "textbook",
      "sp": null,
      "en": "Look! What's this?",
      "zh": "快看！这是什么？",
      "an": "https://english.example.com/audio/ep/ep-pep3a-u3/s014-n-7cd66c.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3a-u3/s014-s-b9df6d.mp3"
    },
    {
      "s": "s015",
      "e": "ep-pep3a-u3",
      "k": "textbook",
      "sp": null,
      "en": "It's a fox.",
      "zh": "这是一只狐狸。",
      "an": "https://english.example.com/audio/ep/ep-pep3a-u3/s015-n-e0a28b.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3a-u3/s015-s-5c1966.mp3"
    },
    {
      "s": "s016",
      "e": "ep-pep3a-u3",
      "k": "textbook",
      "sp": null,
      "en": "Miss White, what's that?",
      "zh": "怀特老师，那是什么？",
      "an": "https://english.example.com/audio/ep/ep-pep3a-u3/s016-n-d23d0c.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3a-u3/s016-s-65bac5.mp3"
    },
    {
      "s": "s017",
      "e": "ep-pep3a-u3",
      "k": "textbook",
      "sp": null,
      "en": "It's a red panda.",
      "zh": "那是一只小熊猫。",
      "an": "https://english.example.com/audio/ep/ep-pep3a-u3/s017-n-d64e63.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3a-u3/s017-s-c7b881.mp3"
    },
    {
      "s": "s018",
      "e": "ep-pep3a-u3",
      "k": "textbook",
      "sp": null,
      "en": "It's cute!",
      "zh": "它好可爱！",
      "an": "https://english.example.com/audio/ep/ep-pep3a-u3/s018-n-211a51.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3a-u3/s018-s-c831a8.mp3"
    },
    {
      "s": "s019",
      "e": "ep-pep3a-u3",
      "k": "textbook",
      "sp": null,
      "en": "It's a panda.",
      "zh": "这是一只大熊猫。",
      "an": "https://english.example.com/audio/ep/ep-pep3a-u3/s019-n-a3948c.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3a-u3/s019-s-1b6205.mp3"
    },
    {
      "s": "s020",
      "e": "ep-pep3a-u3",
      "k": "textbook",
      "sp": null,
      "en": "It's a monkey.",
      "zh": "这是一只猴子。",
      "an": "https://english.example.com/audio/ep/ep-pep3a-u3/s020-n-f46fb0.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3a-u3/s020-s-e5e65c.mp3"
    },
    {
      "s": "s021",
      "e": "ep-pep3a-u3",
      "k": "textbook",
      "sp": null,
      "en": "It's a tiger.",
      "zh": "这是一只老虎。",
      "an": "https://english.example.com/audio/ep/ep-pep3a-u3/s021-n-38d444.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3a-u3/s021-s-b29c01.mp3"
    },
    {
      "s": "s022",
      "e": "ep-pep3a-u3",
      "k": "textbook",
      "sp": null,
      "en": "It's an elephant.",
      "zh": "这是一头大象。",
      "an": "https://english.example.com/audio/ep/ep-pep3a-u3/s022-n-a016e7.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3a-u3/s022-s-078063.mp3"
    },
    {
      "s": "s023",
      "e": "ep-pep3a-u3",
      "k": "textbook",
      "sp": null,
      "en": "It's a lion.",
      "zh": "这是一头狮子。",
      "an": "https://english.example.com/audio/ep/ep-pep3a-u3/s023-n-a27ea5.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3a-u3/s023-s-61b521.mp3"
    },
    {
      "s": "s024",
      "e": "ep-pep3a-u3",
      "k": "textbook",
      "sp": null,
      "en": "Fish are amazing.",
      "zh": "鱼儿真了不起。",
      "an": "https://english.example.com/audio/ep/ep-pep3a-u3/s024-n-99cb87.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3a-u3/s024-s-a55feb.mp3"
    },
    {
      "s": "s025",
      "e": "ep-pep3a-u3",
      "k": "textbook",
      "sp": null,
      "en": "Are we amazing, Dad?",
      "zh": "爸爸，我们了不起吗？",
      "an": "https://english.example.com/audio/ep/ep-pep3a-u3/s025-n-35e6e6.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3a-u3/s025-s-4810b4.mp3"
    },
    {
      "s": "s026",
      "e": "ep-pep3a-u3",
      "k": "textbook",
      "sp": null,
      "en": "Yes. We're big.",
      "zh": "是的，我们个头大。",
      "an": "https://english.example.com/audio/ep/ep-pep3a-u3/s026-n-e3a25c.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3a-u3/s026-s-2bc917.mp3"
    },
    {
      "s": "s027",
      "e": "ep-pep3a-u3",
      "k": "textbook",
      "sp": null,
      "en": "But whale sharks are big too.",
      "zh": "可是鲸鲨的个头也大。",
      "an": "https://english.example.com/audio/ep/ep-pep3a-u3/s027-n-683cdf.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3a-u3/s027-s-23653a.mp3"
    },
    {
      "s": "s028",
      "e": "ep-pep3a-u3",
      "k": "textbook",
      "sp": null,
      "en": "We're fast.",
      "zh": "我们速度快。",
      "an": "https://english.example.com/audio/ep/ep-pep3a-u3/s028-n-6eab12.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3a-u3/s028-s-d77007.mp3"
    },
    {
      "s": "s029",
      "e": "ep-pep3a-u3",
      "k": "textbook",
      "sp": null,
      "en": "But squids are fast too.",
      "zh": "可是鱿鱼的速度也快。",
      "an": "https://english.example.com/audio/ep/ep-pep3a-u3/s029-n-923038.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3a-u3/s029-s-a856ba.mp3"
    },
    {
      "s": "s030",
      "e": "ep-pep3a-u3",
      "k": "textbook",
      "sp": null,
      "en": "Are we amazing, Mum?",
      "zh": "妈妈，我们了不起吗？",
      "an": "https://english.example.com/audio/ep/ep-pep3a-u3/s030-n-6036dd.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3a-u3/s030-s-e12e61.mp3"
    },
    {
      "s": "s031",
      "e": "ep-pep3a-u3",
      "k": "textbook",
      "sp": null,
      "en": "We can jump.",
      "zh": "我们会跳。",
      "an": "https://english.example.com/audio/ep/ep-pep3a-u3/s031-n-f60cd1.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3a-u3/s031-s-2f0093.mp3"
    },
    {
      "s": "s032",
      "e": "ep-pep3a-u3",
      "k": "textbook",
      "sp": null,
      "en": "But sea lions can jump too.",
      "zh": "可是海狮也会跳。",
      "an": "https://english.example.com/audio/ep/ep-pep3a-u3/s032-n-c53713.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3a-u3/s032-s-4c4f1c.mp3"
    },
    {
      "s": "s033",
      "e": "ep-pep3a-u3",
      "k": "textbook",
      "sp": null,
      "en": "Aha! I know! We sing!",
      "zh": "啊哈！我知道了！我们会唱歌！",
      "an": "https://english.example.com/audio/ep/ep-pep3a-u3/s033-n-3b18d7.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3a-u3/s033-s-8e3915.mp3"
    },
    {
      "s": "s034",
      "e": "ep-pep3a-u3",
      "k": "textbook",
      "sp": null,
      "en": "That's it! Our songs are special.",
      "zh": "对啦！我们的歌声独一无二。",
      "an": "https://english.example.com/audio/ep/ep-pep3a-u3/s034-n-91d15d.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3a-u3/s034-s-6e21ec.mp3"
    },
    {
      "s": "s035",
      "e": "ep-pep3a-u3",
      "k": "textbook",
      "sp": null,
      "en": "That is amazing!",
      "zh": "那可真了不起！",
      "an": "https://english.example.com/audio/ep/ep-pep3a-u3/s035-n-81ada0.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3a-u3/s035-s-c07996.mp3"
    },
    {
      "s": "s036",
      "e": "ep-pep3a-u3",
      "k": "textbook",
      "sp": null,
      "en": "Some animals are wild.",
      "zh": "有些动物是野生的。",
      "an": "https://english.example.com/audio/ep/ep-pep3a-u3/s036-n-fb8490.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3a-u3/s036-s-8d34d1.mp3"
    },
    {
      "s": "s037",
      "e": "ep-pep3a-u3",
      "k": "textbook",
      "sp": null,
      "en": "Some others live with us.",
      "zh": "还有些动物和我们生活在一起。",
      "an": "https://english.example.com/audio/ep/ep-pep3a-u3/s037-n-201ba2.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3a-u3/s037-s-79d424.mp3"
    },
    {
      "s": "s038",
      "e": "ep-pep3a-u3",
      "k": "textbook",
      "sp": null,
      "en": "Animals can be big, small, fast or slow.",
      "zh": "动物有大有小，有快有慢。",
      "an": "https://english.example.com/audio/ep/ep-pep3a-u3/s038-n-c242cd.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3a-u3/s038-s-22f8ed.mp3"
    },
    {
      "s": "s039",
      "e": "ep-pep3a-u3",
      "k": "textbook",
      "sp": null,
      "en": "They are all special.",
      "zh": "它们各有各的特别之处。",
      "an": "https://english.example.com/audio/ep/ep-pep3a-u3/s039-n-911a77.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3a-u3/s039-s-f86367.mp3"
    },
    {
      "s": "s001",
      "e": "ep-pep3-u3",
      "k": "textbook",
      "sp": null,
      "en": "I like the cute rabbit.",
      "zh": "我喜欢这只可爱的小兔子。",
      "an": "https://english.example.com/audio/ep/ep-pep3-u3/s001-n-3f98e8.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3-u3/s001-s-96e9e6.mp3"
    },
    {
      "s": "s002",
      "e": "ep-pep3-u3",
      "k": "textbook",
      "sp": null,
      "en": "I like dogs and cats.",
      "zh": "我喜欢小狗和小猫。",
      "an": "https://english.example.com/audio/ep/ep-pep3-u3/s002-n-761c32.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3-u3/s002-s-1df7aa.mp3"
    },
    {
      "s": "s003",
      "e": "ep-pep3-u3",
      "k": "textbook",
      "sp": null,
      "en": "Do you like pandas? Yes, I do.",
      "zh": "你喜欢熊猫吗？嗯，喜欢！",
      "an": "https://english.example.com/audio/ep/ep-pep3-u3/s003-n-fe5de7.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3-u3/s003-s-e40794.mp3"
    },
    {
      "s": "s004",
      "e": "ep-pep3-u3",
      "k": "textbook",
      "sp": null,
      "en": "Do you like monkeys? Yes, I do.",
      "zh": "你喜欢猴子吗？嗯，喜欢！",
      "an": "https://english.example.com/audio/ep/ep-pep3-u3/s004-n-f16daf.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3-u3/s004-s-bd7a5f.mp3"
    },
    {
      "s": "s005",
      "e": "ep-pep3-u3",
      "k": "textbook",
      "sp": null,
      "en": "This is my pet dog.",
      "zh": "这是我的宠物狗。",
      "an": "https://english.example.com/audio/ep/ep-pep3-u3/s005-n-ca0a2c.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3-u3/s005-s-2cab13.mp3"
    },
    {
      "s": "s006",
      "e": "ep-pep3-u3",
      "k": "textbook",
      "sp": null,
      "en": "This is my pet bird.",
      "zh": "这是我的宠物小鸟。",
      "an": "https://english.example.com/audio/ep/ep-pep3-u3/s006-n-3c43c3.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3-u3/s006-s-b2ba74.mp3"
    },
    {
      "s": "s007",
      "e": "ep-pep3-u3",
      "k": "textbook",
      "sp": null,
      "en": "Look at the giraffe. It is tall.",
      "zh": "快看长颈鹿，它好高呀！",
      "an": "https://english.example.com/audio/ep/ep-pep3-u3/s007-n-dd8a27.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3-u3/s007-s-8bbe65.mp3"
    },
    {
      "s": "s008",
      "e": "ep-pep3-u3",
      "k": "textbook",
      "sp": null,
      "en": "Look at the tiger. It is fast.",
      "zh": "快看老虎，它跑得好快！",
      "an": "https://english.example.com/audio/ep/ep-pep3-u3/s008-n-868e24.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3-u3/s008-s-c8d442.mp3"
    },
    {
      "s": "s009",
      "e": "ep-pep3-u3",
      "k": "textbook",
      "sp": null,
      "en": "It is small and cute.",
      "zh": "它小小的，好可爱。",
      "an": "https://english.example.com/audio/ep/ep-pep3-u3/s009-n-b93f86.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3-u3/s009-s-2cc346.mp3"
    },
    {
      "s": "s010",
      "e": "ep-pep3-u3",
      "k": "textbook",
      "sp": null,
      "en": "Let's go to the zoo.",
      "zh": "我们去动物园吧！",
      "an": "https://english.example.com/audio/ep/ep-pep3-u3/s010-n-c5dbb1.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3-u3/s010-s-741350.mp3"
    },
    {
      "s": "s011",
      "e": "ep-pep3-u3",
      "k": "textbook",
      "sp": null,
      "en": "Let's go to the zoo. I like lions.",
      "zh": "我们去动物园吧！我喜欢狮子。",
      "an": "https://english.example.com/audio/ep/ep-pep3-u3/s011-n-c61ada.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3-u3/s011-s-03d2fe.mp3"
    },
    {
      "s": "s012",
      "e": "ep-pep3-u3",
      "k": "textbook",
      "sp": null,
      "en": "Let's go to the panda house.",
      "zh": "我们去熊猫馆吧！",
      "an": "https://english.example.com/audio/ep/ep-pep3-u3/s012-n-5a192a.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3-u3/s012-s-41f4c0.mp3"
    },
    {
      "s": "s001",
      "e": "ep-pep3-u4",
      "k": "textbook",
      "sp": null,
      "en": "Mike, do you like apples?",
      "zh": "迈克，你喜欢苹果吗？",
      "an": "https://english.example.com/audio/ep/ep-pep3-u4/s001-n-5624c4.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3-u4/s001-s-6c8240.mp3"
    },
    {
      "s": "s002",
      "e": "ep-pep3-u4",
      "k": "textbook",
      "sp": null,
      "en": "Yes, I do. And you?",
      "zh": "是的，我喜欢。你呢？",
      "an": "https://english.example.com/audio/ep/ep-pep3-u4/s002-n-f7590b.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3-u4/s002-s-8ce810.mp3"
    },
    {
      "s": "s003",
      "e": "ep-pep3-u4",
      "k": "textbook",
      "sp": null,
      "en": "No, I don't. I like bananas.",
      "zh": "不，我不喜欢。我喜欢香蕉。",
      "an": "https://english.example.com/audio/ep/ep-pep3-u4/s003-n-85398f.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3-u4/s003-s-0c9cee.mp3"
    },
    {
      "s": "s004",
      "e": "ep-pep3-u4",
      "k": "textbook",
      "sp": null,
      "en": "Do you like the farm?",
      "zh": "你喜欢这个农场吗？",
      "an": "https://english.example.com/audio/ep/ep-pep3-u4/s004-n-a7a391.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3-u4/s004-s-9c6dd9.mp3"
    },
    {
      "s": "s005",
      "e": "ep-pep3-u4",
      "k": "textbook",
      "sp": null,
      "en": "Yes, Miss White.",
      "zh": "是的，怀特老师。",
      "an": "https://english.example.com/audio/ep/ep-pep3-u4/s005-n-18826f.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3-u4/s005-s-572f12.mp3"
    },
    {
      "s": "s006",
      "e": "ep-pep3-u4",
      "k": "textbook",
      "sp": null,
      "en": "I love fresh air.",
      "zh": "我喜欢新鲜的空气。",
      "an": "https://english.example.com/audio/ep/ep-pep3-u4/s006-n-b08ebc.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3-u4/s006-s-e50e40.mp3"
    },
    {
      "s": "s007",
      "e": "ep-pep3-u4",
      "k": "textbook",
      "sp": null,
      "en": "Do you like apples?",
      "zh": "你喜欢苹果吗？",
      "an": "https://english.example.com/audio/ep/ep-pep3-u4/s007-n-7631f1.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3-u4/s007-s-1cf52c.mp3"
    },
    {
      "s": "s008",
      "e": "ep-pep3-u4",
      "k": "textbook",
      "sp": null,
      "en": "No, I don't. I like bananas.",
      "zh": "不，我不喜欢。我喜欢香蕉。",
      "an": "https://english.example.com/audio/ep/ep-pep3-u4/s008-n-85398f.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3-u4/s008-s-0c9cee.mp3"
    },
    {
      "s": "s009",
      "e": "ep-pep3-u4",
      "k": "textbook",
      "sp": null,
      "en": "The school gardens need help.",
      "zh": "学校的花园需要帮忙。",
      "an": "https://english.example.com/audio/ep/ep-pep3-u4/s009-n-3bcb9b.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3-u4/s009-s-97309e.mp3"
    },
    {
      "s": "s010",
      "e": "ep-pep3-u4",
      "k": "textbook",
      "sp": null,
      "en": "We can water the flowers.",
      "zh": "我们可以给花浇水。",
      "an": "https://english.example.com/audio/ep/ep-pep3-u4/s010-n-bc4ca4.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3-u4/s010-s-dcff51.mp3"
    },
    {
      "s": "s011",
      "e": "ep-pep3-u4",
      "k": "textbook",
      "sp": null,
      "en": "We can water the grass.",
      "zh": "我们可以给草浇水。",
      "an": "https://english.example.com/audio/ep/ep-pep3-u4/s011-n-9cdf66.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3-u4/s011-s-e0095a.mp3"
    },
    {
      "s": "s012",
      "e": "ep-pep3-u4",
      "k": "textbook",
      "sp": null,
      "en": "Nice. And?",
      "zh": "真不错。还有呢？",
      "an": "https://english.example.com/audio/ep/ep-pep3-u4/s012-n-48bdb0.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3-u4/s012-s-67cf50.mp3"
    },
    {
      "s": "s013",
      "e": "ep-pep3-u4",
      "k": "textbook",
      "sp": null,
      "en": "We can plant new trees.",
      "zh": "我们可以种新的树。",
      "an": "https://english.example.com/audio/ep/ep-pep3-u4/s013-n-2c7cf3.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3-u4/s013-s-2284e8.mp3"
    },
    {
      "s": "s014",
      "e": "ep-pep3-u4",
      "k": "textbook",
      "sp": null,
      "en": "Plants need our help.",
      "zh": "植物需要我们的帮助。",
      "an": "https://english.example.com/audio/ep/ep-pep3-u4/s014-n-820727.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3-u4/s014-s-ae6935.mp3"
    },
    {
      "s": "s015",
      "e": "ep-pep3-u4",
      "k": "textbook",
      "sp": null,
      "en": "Plants need air, water and sun.",
      "zh": "植物需要空气、水和阳光。",
      "an": "https://english.example.com/audio/ep/ep-pep3-u4/s015-n-704186.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3-u4/s015-s-cd73be.mp3"
    },
    {
      "s": "s016",
      "e": "ep-pep3-u4",
      "k": "textbook",
      "sp": null,
      "en": "I am an apple tree. My new family help me.",
      "zh": "我是一棵苹果树。我的新家人帮助我。",
      "an": "https://english.example.com/audio/ep/ep-pep3-u4/s016-n-d66c46.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3-u4/s016-s-1a12cb.mp3"
    },
    {
      "s": "s017",
      "e": "ep-pep3-u4",
      "k": "textbook",
      "sp": null,
      "en": "I need air, water and sun. My family water me.",
      "zh": "我需要空气、水和阳光。我的家人给我浇水。",
      "an": "https://english.example.com/audio/ep/ep-pep3-u4/s017-n-03f85b.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3-u4/s017-s-fe354b.mp3"
    },
    {
      "s": "s018",
      "e": "ep-pep3-u4",
      "k": "textbook",
      "sp": null,
      "en": "It is cold. They help me.",
      "zh": "天冷了。他们帮助我。",
      "an": "https://english.example.com/audio/ep/ep-pep3-u4/s018-n-315278.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3-u4/s018-s-d57be4.mp3"
    },
    {
      "s": "s019",
      "e": "ep-pep3-u4",
      "k": "textbook",
      "sp": null,
      "en": "My family like me.",
      "zh": "我的家人喜欢我。",
      "an": "https://english.example.com/audio/ep/ep-pep3-u4/s019-n-9a7d88.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3-u4/s019-s-2bbbed.mp3"
    },
    {
      "s": "s020",
      "e": "ep-pep3-u4",
      "k": "textbook",
      "sp": null,
      "en": "The flowers are so beautiful!",
      "zh": "这些花真漂亮！",
      "an": "https://english.example.com/audio/ep/ep-pep3-u4/s020-n-ef7ce9.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3-u4/s020-s-3b6762.mp3"
    },
    {
      "s": "s021",
      "e": "ep-pep3-u4",
      "k": "textbook",
      "sp": null,
      "en": "I love fresh air.",
      "zh": "我喜欢新鲜的空气。",
      "an": "https://english.example.com/audio/ep/ep-pep3-u4/s021-n-b08ebc.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3-u4/s021-s-e50e40.mp3"
    },
    {
      "s": "s022",
      "e": "ep-pep3-u4",
      "k": "textbook",
      "sp": null,
      "en": "I am big now. I give apples to my family.",
      "zh": "我现在长大了。我把苹果送给我的家人。",
      "an": "https://english.example.com/audio/ep/ep-pep3-u4/s022-n-0108f8.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3-u4/s022-s-914786.mp3"
    },
    {
      "s": "s023",
      "e": "ep-pep3-u4",
      "k": "textbook",
      "sp": null,
      "en": "We are all happy!",
      "zh": "我们都很开心！",
      "an": "https://english.example.com/audio/ep/ep-pep3-u4/s023-n-e40baf.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3-u4/s023-s-19f93f.mp3"
    },
    {
      "s": "s024",
      "e": "ep-pep3-u4",
      "k": "textbook",
      "sp": null,
      "en": "We need plants to live.",
      "zh": "我们的生活离不开植物。",
      "an": "https://english.example.com/audio/ep/ep-pep3-u4/s024-n-8a0fb5.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3-u4/s024-s-c0e89b.mp3"
    },
    {
      "s": "s025",
      "e": "ep-pep3-u4",
      "k": "textbook",
      "sp": null,
      "en": "We can help plants grow.",
      "zh": "我们可以帮助植物生长。",
      "an": "https://english.example.com/audio/ep/ep-pep3-u4/s025-n-a74ff2.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3-u4/s025-s-a42435.mp3"
    },
    {
      "s": "s001",
      "e": "ep-pep3-u5",
      "k": "textbook",
      "sp": null,
      "en": "What colour is it?",
      "zh": "它是什么颜色的？",
      "an": "https://english.example.com/audio/ep/ep-pep3-u5/s001-n-6d6b9e.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3-u5/s001-s-0fa2bd.mp3"
    },
    {
      "s": "s002",
      "e": "ep-pep3-u5",
      "k": "textbook",
      "sp": null,
      "en": "It's orange.",
      "zh": "它是橙色的。",
      "an": "https://english.example.com/audio/ep/ep-pep3-u5/s002-n-6488e4.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3-u5/s002-s-865a13.mp3"
    },
    {
      "s": "s003",
      "e": "ep-pep3-u5",
      "k": "textbook",
      "sp": null,
      "en": "What colour is it?",
      "zh": "它是什么颜色的？",
      "an": "https://english.example.com/audio/ep/ep-pep3-u5/s003-n-6d6b9e.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3-u5/s003-s-0fa2bd.mp3"
    },
    {
      "s": "s004",
      "e": "ep-pep3-u5",
      "k": "textbook",
      "sp": null,
      "en": "It's green.",
      "zh": "它是绿色的。",
      "an": "https://english.example.com/audio/ep/ep-pep3-u5/s004-n-74ef97.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3-u5/s004-s-35646e.mp3"
    },
    {
      "s": "s005",
      "e": "ep-pep3-u5",
      "k": "textbook",
      "sp": null,
      "en": "Look! Red and blue make purple.",
      "zh": "看！红色和蓝色混在一起就变成紫色。",
      "an": "https://english.example.com/audio/ep/ep-pep3-u5/s005-n-bf1aa4.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3-u5/s005-s-1d2d6c.mp3"
    },
    {
      "s": "s006",
      "e": "ep-pep3-u5",
      "k": "textbook",
      "sp": null,
      "en": "Wow!",
      "zh": "哇！",
      "an": "https://english.example.com/audio/ep/ep-pep3-u5/s006-n-45fff8.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3-u5/s006-s-b0bd26.mp3"
    },
    {
      "s": "s007",
      "e": "ep-pep3-u5",
      "k": "textbook",
      "sp": null,
      "en": "The world is colourful!",
      "zh": "世界真是五颜六色的！",
      "an": "https://english.example.com/audio/ep/ep-pep3-u5/s007-n-242f61.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3-u5/s007-s-95ee4e.mp3"
    },
    {
      "s": "s008",
      "e": "ep-pep3-u5",
      "k": "textbook",
      "sp": null,
      "en": "What colours do you like?",
      "zh": "你喜欢什么颜色？",
      "an": "https://english.example.com/audio/ep/ep-pep3-u5/s008-n-ae5a3b.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3-u5/s008-s-3f9848.mp3"
    },
    {
      "s": "s009",
      "e": "ep-pep3-u5",
      "k": "textbook",
      "sp": null,
      "en": "I like red and pink.",
      "zh": "我喜欢红色和粉色。",
      "an": "https://english.example.com/audio/ep/ep-pep3-u5/s009-n-c2e973.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3-u5/s009-s-a9bf2c.mp3"
    },
    {
      "s": "s010",
      "e": "ep-pep3-u5",
      "k": "textbook",
      "sp": null,
      "en": "OK. Let's draw some red and pink flowers.",
      "zh": "好。我们来画一些红色和粉色的花吧。",
      "an": "https://english.example.com/audio/ep/ep-pep3-u5/s010-n-567220.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3-u5/s010-s-9bee7b.mp3"
    },
    {
      "s": "s011",
      "e": "ep-pep3-u5",
      "k": "textbook",
      "sp": null,
      "en": "And the birds?",
      "zh": "那小鸟呢？",
      "an": "https://english.example.com/audio/ep/ep-pep3-u5/s011-n-1abff0.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3-u5/s011-s-e59dc5.mp3"
    },
    {
      "s": "s012",
      "e": "ep-pep3-u5",
      "k": "textbook",
      "sp": null,
      "en": "Let's draw some purple and brown birds.",
      "zh": "我们来画一些紫色和棕色的小鸟吧。",
      "an": "https://english.example.com/audio/ep/ep-pep3-u5/s012-n-cd6a7c.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3-u5/s012-s-22cc3e.mp3"
    },
    {
      "s": "s013",
      "e": "ep-pep3-u5",
      "k": "textbook",
      "sp": null,
      "en": "Colours are useful!",
      "zh": "颜色很有用！",
      "an": "https://english.example.com/audio/ep/ep-pep3-u5/s013-n-341970.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3-u5/s013-s-593434.mp3"
    },
    {
      "s": "s014",
      "e": "ep-pep3-u5",
      "k": "textbook",
      "sp": null,
      "en": "I am a sunflower. I am tall and green.",
      "zh": "我是一株向日葵。我长得高高的，绿绿的。",
      "an": "https://english.example.com/audio/ep/ep-pep3-u5/s014-n-db7567.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3-u5/s014-s-fa6bcb.mp3"
    },
    {
      "s": "s015",
      "e": "ep-pep3-u5",
      "k": "textbook",
      "sp": null,
      "en": "Now I am a big yellow flower.",
      "zh": "现在，我开出了一朵大大的黄花。",
      "an": "https://english.example.com/audio/ep/ep-pep3-u5/s015-n-9d81a5.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3-u5/s015-s-77f148.mp3"
    },
    {
      "s": "s016",
      "e": "ep-pep3-u5",
      "k": "textbook",
      "sp": null,
      "en": "Bees come.",
      "zh": "蜜蜂来了。",
      "an": "https://english.example.com/audio/ep/ep-pep3-u5/s016-n-04b7aa.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3-u5/s016-s-a9e1b6.mp3"
    },
    {
      "s": "s017",
      "e": "ep-pep3-u5",
      "k": "textbook",
      "sp": null,
      "en": "They are yellow and black.",
      "zh": "它们身上有黄色和黑色。",
      "an": "https://english.example.com/audio/ep/ep-pep3-u5/s017-n-e19933.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3-u5/s017-s-f5391f.mp3"
    },
    {
      "s": "s018",
      "e": "ep-pep3-u5",
      "k": "textbook",
      "sp": null,
      "en": "I give them food.",
      "zh": "我给它们提供食物。",
      "an": "https://english.example.com/audio/ep/ep-pep3-u5/s018-n-568be6.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3-u5/s018-s-f8794c.mp3"
    },
    {
      "s": "s019",
      "e": "ep-pep3-u5",
      "k": "textbook",
      "sp": null,
      "en": "Then I am green and yellow.",
      "zh": "接着，我身上有了绿色和黄色。",
      "an": "https://english.example.com/audio/ep/ep-pep3-u5/s019-n-c01767.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3-u5/s019-s-d9eb8a.mp3"
    },
    {
      "s": "s020",
      "e": "ep-pep3-u5",
      "k": "textbook",
      "sp": null,
      "en": "Now it is cold.",
      "zh": "现在，天气冷了。",
      "an": "https://english.example.com/audio/ep/ep-pep3-u5/s020-n-10625c.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3-u5/s020-s-f58663.mp3"
    },
    {
      "s": "s021",
      "e": "ep-pep3-u5",
      "k": "textbook",
      "sp": null,
      "en": "I am green and brown.",
      "zh": "我身上有了绿色和棕色。",
      "an": "https://english.example.com/audio/ep/ep-pep3-u5/s021-n-9d5ecf.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3-u5/s021-s-3bc692.mp3"
    },
    {
      "s": "s022",
      "e": "ep-pep3-u5",
      "k": "textbook",
      "sp": null,
      "en": "I am gone. But my children grow.",
      "zh": "我枯萎了，但我的孩子们正在生长。",
      "an": "https://english.example.com/audio/ep/ep-pep3-u5/s022-n-e6d0c8.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3-u5/s022-s-a3c4af.mp3"
    },
    {
      "s": "s023",
      "e": "ep-pep3-u5",
      "k": "textbook",
      "sp": null,
      "en": "Colours are everywhere.",
      "zh": "到处都有颜色。",
      "an": "https://english.example.com/audio/ep/ep-pep3-u5/s023-n-5afc2e.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3-u5/s023-s-944359.mp3"
    },
    {
      "s": "s024",
      "e": "ep-pep3-u5",
      "k": "textbook",
      "sp": null,
      "en": "Colours are beautiful.",
      "zh": "颜色真美。",
      "an": "https://english.example.com/audio/ep/ep-pep3-u5/s024-n-c0a61e.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3-u5/s024-s-fcfe46.mp3"
    },
    {
      "s": "s025",
      "e": "ep-pep3-u5",
      "k": "textbook",
      "sp": null,
      "en": "Colours help us and tell us many things.",
      "zh": "颜色能帮助我们，还能告诉我们很多事情。",
      "an": "https://english.example.com/audio/ep/ep-pep3-u5/s025-n-699b7e.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3-u5/s025-s-406043.mp3"
    },
    {
      "s": "s001",
      "e": "ep-pep3-u6",
      "k": "textbook",
      "sp": null,
      "en": "Binbin, this is my brother, Sam.",
      "zh": "斌斌，这是我的弟弟萨姆。",
      "an": "https://english.example.com/audio/ep/ep-pep3-u6/s001-n-856602.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3-u6/s001-s-ac3b2f.mp3"
    },
    {
      "s": "s002",
      "e": "ep-pep3-u6",
      "k": "textbook",
      "sp": null,
      "en": "Hi, Sam! This is my sister, Xinxin.",
      "zh": "你好，萨姆！这是我的妹妹欣欣。",
      "an": "https://english.example.com/audio/ep/ep-pep3-u6/s002-n-3658df.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3-u6/s002-s-41cd4f.mp3"
    },
    {
      "s": "s003",
      "e": "ep-pep3-u6",
      "k": "textbook",
      "sp": null,
      "en": "Hello, Xinxin!",
      "zh": "你好，欣欣！",
      "an": "https://english.example.com/audio/ep/ep-pep3-u6/s003-n-217c86.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3-u6/s003-s-845c58.mp3"
    },
    {
      "s": "s004",
      "e": "ep-pep3-u6",
      "k": "textbook",
      "sp": null,
      "en": "Hi, Sam!",
      "zh": "你好，萨姆！",
      "an": "https://english.example.com/audio/ep/ep-pep3-u6/s004-n-f6c275.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3-u6/s004-s-ca9e1b.mp3"
    },
    {
      "s": "s005",
      "e": "ep-pep3-u6",
      "k": "textbook",
      "sp": null,
      "en": "How old are you?",
      "zh": "你几岁了？",
      "an": "https://english.example.com/audio/ep/ep-pep3-u6/s005-n-adedea.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3-u6/s005-s-2ccbc1.mp3"
    },
    {
      "s": "s006",
      "e": "ep-pep3-u6",
      "k": "textbook",
      "sp": null,
      "en": "I'm five years old.",
      "zh": "我五岁了。",
      "an": "https://english.example.com/audio/ep/ep-pep3-u6/s006-n-15be53.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3-u6/s006-s-5a0197.mp3"
    },
    {
      "s": "s007",
      "e": "ep-pep3-u6",
      "k": "textbook",
      "sp": null,
      "en": "Me too.",
      "zh": "我也是。",
      "an": "https://english.example.com/audio/ep/ep-pep3-u6/s007-n-fd474d.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3-u6/s007-s-463982.mp3"
    },
    {
      "s": "s008",
      "e": "ep-pep3-u6",
      "k": "textbook",
      "sp": null,
      "en": "How many apples?",
      "zh": "有几个苹果？",
      "an": "https://english.example.com/audio/ep/ep-pep3-u6/s008-n-8a4191.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3-u6/s008-s-fea517.mp3"
    },
    {
      "s": "s009",
      "e": "ep-pep3-u6",
      "k": "textbook",
      "sp": null,
      "en": "Two.",
      "zh": "两个。",
      "an": "https://english.example.com/audio/ep/ep-pep3-u6/s009-n-f346c0.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3-u6/s009-s-cdc66c.mp3"
    },
    {
      "s": "s010",
      "e": "ep-pep3-u6",
      "k": "textbook",
      "sp": null,
      "en": "How many bananas?",
      "zh": "有几根香蕉？",
      "an": "https://english.example.com/audio/ep/ep-pep3-u6/s010-n-a6abf2.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3-u6/s010-s-28063f.mp3"
    },
    {
      "s": "s011",
      "e": "ep-pep3-u6",
      "k": "textbook",
      "sp": null,
      "en": "Three. And one orange.",
      "zh": "三根，还有一个橙子。",
      "an": "https://english.example.com/audio/ep/ep-pep3-u6/s011-n-1f2b7a.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3-u6/s011-s-915431.mp3"
    },
    {
      "s": "s012",
      "e": "ep-pep3-u6",
      "k": "textbook",
      "sp": null,
      "en": "OK.",
      "zh": "好的。",
      "an": "https://english.example.com/audio/ep/ep-pep3-u6/s012-n-114e1d.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3-u6/s012-s-d72d78.mp3"
    },
    {
      "s": "s013",
      "e": "ep-pep3-u6",
      "k": "textbook",
      "sp": null,
      "en": "I have ten yuan.",
      "zh": "我有十元钱。",
      "an": "https://english.example.com/audio/ep/ep-pep3-u6/s013-n-64aa8b.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3-u6/s013-s-983483.mp3"
    },
    {
      "s": "s014",
      "e": "ep-pep3-u6",
      "k": "textbook",
      "sp": null,
      "en": "I have six yuan.",
      "zh": "我有六元钱。",
      "an": "https://english.example.com/audio/ep/ep-pep3-u6/s014-n-c960fb.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3-u6/s014-s-741922.mp3"
    },
    {
      "s": "s015",
      "e": "ep-pep3-u6",
      "k": "textbook",
      "sp": null,
      "en": "Great! Let's go to the shop!",
      "zh": "太好了！我们去商店吧！",
      "an": "https://english.example.com/audio/ep/ep-pep3-u6/s015-n-a58fe3.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3-u6/s015-s-b64ef5.mp3"
    },
    {
      "s": "s016",
      "e": "ep-pep3-u6",
      "k": "textbook",
      "sp": null,
      "en": "That's ten yuan, please.",
      "zh": "一共十元，请付款。",
      "an": "https://english.example.com/audio/ep/ep-pep3-u6/s016-n-a69680.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3-u6/s016-s-2cddbc.mp3"
    },
    {
      "s": "s017",
      "e": "ep-pep3-u6",
      "k": "textbook",
      "sp": null,
      "en": "Here you are.",
      "zh": "给你。",
      "an": "https://english.example.com/audio/ep/ep-pep3-u6/s017-n-920e24.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3-u6/s017-s-77c5c3.mp3"
    },
    {
      "s": "s018",
      "e": "ep-pep3-u6",
      "k": "textbook",
      "sp": null,
      "en": "How many cards do you have?",
      "zh": "你有几张卡片？",
      "an": "https://english.example.com/audio/ep/ep-pep3-u6/s018-n-2e3eac.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3-u6/s018-s-a5fd12.mp3"
    },
    {
      "s": "s019",
      "e": "ep-pep3-u6",
      "k": "textbook",
      "sp": null,
      "en": "I have one, two, three, four, five, six, seven, eight, nine cards!",
      "zh": "我有一、二、三、四、五、六、七、八、九张卡片！",
      "an": "https://english.example.com/audio/ep/ep-pep3-u6/s019-n-6f47b2.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3-u6/s019-s-51b742.mp3"
    },
    {
      "s": "s020",
      "e": "ep-pep3-u6",
      "k": "textbook",
      "sp": null,
      "en": "How many Chinese number cards do you have?",
      "zh": "你有几张中文数字卡片？",
      "an": "https://english.example.com/audio/ep/ep-pep3-u6/s020-n-59eec2.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3-u6/s020-s-a91d9f.mp3"
    },
    {
      "s": "s021",
      "e": "ep-pep3-u6",
      "k": "textbook",
      "sp": null,
      "en": "Ten.",
      "zh": "十张。",
      "an": "https://english.example.com/audio/ep/ep-pep3-u6/s021-n-eed4d5.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3-u6/s021-s-04e987.mp3"
    },
    {
      "s": "s022",
      "e": "ep-pep3-u6",
      "k": "textbook",
      "sp": null,
      "en": "Look! This is ten in Jiaguwen.",
      "zh": "看！这是甲骨文里的“十”。",
      "an": "https://english.example.com/audio/ep/ep-pep3-u6/s022-n-f8eecf.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3-u6/s022-s-f92de9.mp3"
    },
    {
      "s": "s023",
      "e": "ep-pep3-u6",
      "k": "textbook",
      "sp": null,
      "en": "Numbers are helpful.",
      "zh": "数字很有用。",
      "an": "https://english.example.com/audio/ep/ep-pep3-u6/s023-n-30ce60.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3-u6/s023-s-405b8a.mp3"
    },
    {
      "s": "s024",
      "e": "ep-pep3-u6",
      "k": "textbook",
      "sp": null,
      "en": "We use numbers to count.",
      "zh": "我们用数字来数数。",
      "an": "https://english.example.com/audio/ep/ep-pep3-u6/s024-n-a77930.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3-u6/s024-s-d7fade.mp3"
    },
    {
      "s": "s001",
      "e": "ep-pep3b-u1",
      "k": "textbook",
      "sp": null,
      "en": "How do we get to know people?",
      "zh": "我们怎么认识别人呢？",
      "an": "https://english.example.com/audio/ep/ep-pep3b-u1/s001-n-a75e1a.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3b-u1/s001-s-747ca3.mp3"
    },
    {
      "s": "s002",
      "e": "ep-pep3b-u1",
      "k": "textbook",
      "sp": null,
      "en": "Hello, I'm Chen Jie.",
      "zh": "你好，我叫陈洁。",
      "an": "https://english.example.com/audio/ep/ep-pep3b-u1/s002-n-92fdd4.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3b-u1/s002-s-dc8789.mp3"
    },
    {
      "s": "s003",
      "e": "ep-pep3b-u1",
      "k": "textbook",
      "sp": null,
      "en": "Hi, I'm Luke Brown.",
      "zh": "嗨，我叫卢克·布朗。",
      "an": "https://english.example.com/audio/ep/ep-pep3b-u1/s003-n-5dcedf.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3b-u1/s003-s-a0ac2a.mp3"
    },
    {
      "s": "s004",
      "e": "ep-pep3b-u1",
      "k": "textbook",
      "sp": null,
      "en": "Where are you from?",
      "zh": "你来自哪里？",
      "an": "https://english.example.com/audio/ep/ep-pep3b-u1/s004-n-5f96e8.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3b-u1/s004-s-5251ff.mp3"
    },
    {
      "s": "s005",
      "e": "ep-pep3b-u1",
      "k": "textbook",
      "sp": null,
      "en": "I'm from Canada.",
      "zh": "我来自加拿大。",
      "an": "https://english.example.com/audio/ep/ep-pep3b-u1/s005-n-d6c284.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3b-u1/s005-s-3ec3fb.mp3"
    },
    {
      "s": "s006",
      "e": "ep-pep3b-u1",
      "k": "textbook",
      "sp": null,
      "en": "I'm from the USA.",
      "zh": "我来自美国。",
      "an": "https://english.example.com/audio/ep/ep-pep3b-u1/s006-n-9cd298.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3b-u1/s006-s-23b40f.mp3"
    },
    {
      "s": "s007",
      "e": "ep-pep3b-u1",
      "k": "textbook",
      "sp": null,
      "en": "I'm from the UK.",
      "zh": "我来自英国。",
      "an": "https://english.example.com/audio/ep/ep-pep3b-u1/s007-n-f0e12f.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3b-u1/s007-s-1afc50.mp3"
    },
    {
      "s": "s008",
      "e": "ep-pep3b-u1",
      "k": "textbook",
      "sp": null,
      "en": "I'm from China.",
      "zh": "我来自中国。",
      "an": "https://english.example.com/audio/ep/ep-pep3b-u1/s008-n-9f21cc.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3b-u1/s008-s-3aec28.mp3"
    },
    {
      "s": "s009",
      "e": "ep-pep3b-u1",
      "k": "textbook",
      "sp": null,
      "en": "Who is that girl?",
      "zh": "那个女孩是谁？",
      "an": "https://english.example.com/audio/ep/ep-pep3b-u1/s009-n-7c148a.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3b-u1/s009-s-8659f7.mp3"
    },
    {
      "s": "s010",
      "e": "ep-pep3b-u1",
      "k": "textbook",
      "sp": null,
      "en": "She's Amy Green.",
      "zh": "她是艾米·格林。",
      "an": "https://english.example.com/audio/ep/ep-pep3b-u1/s010-n-d831ae.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3b-u1/s010-s-ee76ce.mp3"
    },
    {
      "s": "s011",
      "e": "ep-pep3b-u1",
      "k": "textbook",
      "sp": null,
      "en": "Who is that boy?",
      "zh": "那个男孩是谁？",
      "an": "https://english.example.com/audio/ep/ep-pep3b-u1/s011-n-214605.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3b-u1/s011-s-7f2b6f.mp3"
    },
    {
      "s": "s012",
      "e": "ep-pep3b-u1",
      "k": "textbook",
      "sp": null,
      "en": "He's Zhang Peng.",
      "zh": "他是张鹏。",
      "an": "https://english.example.com/audio/ep/ep-pep3b-u1/s012-n-9d2be9.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3b-u1/s012-s-85401c.mp3"
    },
    {
      "s": "s013",
      "e": "ep-pep3b-u1",
      "k": "textbook",
      "sp": null,
      "en": "This is my new classmate.",
      "zh": "这是我的新同学。",
      "an": "https://english.example.com/audio/ep/ep-pep3b-u1/s013-n-28538f.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3b-u1/s013-s-935f19.mp3"
    },
    {
      "s": "s014",
      "e": "ep-pep3b-u1",
      "k": "textbook",
      "sp": null,
      "en": "He is my neighbour.",
      "zh": "他是我的邻居。",
      "an": "https://english.example.com/audio/ep/ep-pep3b-u1/s014-n-574d52.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3b-u1/s014-s-0f7fc7.mp3"
    },
    {
      "s": "s015",
      "e": "ep-pep3b-u1",
      "k": "textbook",
      "sp": null,
      "en": "Nice to meet you.",
      "zh": "很高兴认识你。",
      "an": "https://english.example.com/audio/ep/ep-pep3b-u1/s015-n-f2b6dd.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3b-u1/s015-s-7c389e.mp3"
    },
    {
      "s": "s016",
      "e": "ep-pep3b-u1",
      "k": "textbook",
      "sp": null,
      "en": "Nice to meet you too.",
      "zh": "我也很高兴认识你。",
      "an": "https://english.example.com/audio/ep/ep-pep3b-u1/s016-n-1e2da6.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3b-u1/s016-s-367b69.mp3"
    },
    {
      "s": "s017",
      "e": "ep-pep3b-u1",
      "k": "textbook",
      "sp": null,
      "en": "Are you a teacher?",
      "zh": "你是老师吗？",
      "an": "https://english.example.com/audio/ep/ep-pep3b-u1/s017-n-fa5c1f.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3b-u1/s017-s-9aaaed.mp3"
    },
    {
      "s": "s018",
      "e": "ep-pep3b-u1",
      "k": "textbook",
      "sp": null,
      "en": "No, I'm a student.",
      "zh": "不是，我是学生。",
      "an": "https://english.example.com/audio/ep/ep-pep3b-u1/s018-n-981e2d.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3b-u1/s018-s-a10ffc.mp3"
    },
    {
      "s": "s019",
      "e": "ep-pep3b-u1",
      "k": "textbook",
      "sp": null,
      "en": "Mr Green is my teacher.",
      "zh": "格林老师是我的老师。",
      "an": "https://english.example.com/audio/ep/ep-pep3b-u1/s019-n-0bb38c.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3b-u1/s019-s-07c31f.mp3"
    },
    {
      "s": "s020",
      "e": "ep-pep3b-u1",
      "k": "textbook",
      "sp": null,
      "en": "She is very friendly.",
      "zh": "她很友好。",
      "an": "https://english.example.com/audio/ep/ep-pep3b-u1/s020-n-e917ec.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3b-u1/s020-s-a27767.mp3"
    },
    {
      "s": "s021",
      "e": "ep-pep3b-u1",
      "k": "textbook",
      "sp": null,
      "en": "He can speak English.",
      "zh": "他会说英语。",
      "an": "https://english.example.com/audio/ep/ep-pep3b-u1/s021-n-f5ac07.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3b-u1/s021-s-ca8fd5.mp3"
    },
    {
      "s": "s022",
      "e": "ep-pep3b-u1",
      "k": "textbook",
      "sp": null,
      "en": "Let's say hello after class.",
      "zh": "我们下课后打个招呼吧。",
      "an": "https://english.example.com/audio/ep/ep-pep3b-u1/s022-n-d22967.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3b-u1/s022-s-8234b8.mp3"
    },
    {
      "s": "s023",
      "e": "ep-pep3b-u1",
      "k": "textbook",
      "sp": null,
      "en": "Today we meet new friends.",
      "zh": "今天我们认识新朋友。",
      "an": "https://english.example.com/audio/ep/ep-pep3b-u1/s023-n-2ea8dd.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3b-u1/s023-s-245bca.mp3"
    },
    {
      "s": "s024",
      "e": "ep-pep3b-u1",
      "k": "textbook",
      "sp": null,
      "en": "We get to know people by talking.",
      "zh": "我们通过聊天来认识别人。",
      "an": "https://english.example.com/audio/ep/ep-pep3b-u1/s024-n-2fa831.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3b-u1/s024-s-5dc585.mp3"
    },
    {
      "s": "s001",
      "e": "ep-pep3b-u2",
      "k": "textbook",
      "sp": null,
      "en": "My words and actions can be kind.",
      "zh": "我说话、做事都可以很友善。",
      "an": "https://english.example.com/audio/ep/ep-pep3b-u2/s001-n-964e5f.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3b-u2/s001-s-bf4c00.mp3"
    },
    {
      "s": "s002",
      "e": "ep-pep3b-u2",
      "k": "textbook",
      "sp": null,
      "en": "Look at the dog.",
      "zh": "看那只狗。",
      "an": "https://english.example.com/audio/ep/ep-pep3b-u2/s002-n-b4f25e.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3b-u2/s002-s-dcc619.mp3"
    },
    {
      "s": "s003",
      "e": "ep-pep3b-u2",
      "k": "textbook",
      "sp": null,
      "en": "It has a long body.",
      "zh": "它的身体很长。",
      "an": "https://english.example.com/audio/ep/ep-pep3b-u2/s003-n-011270.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3b-u2/s003-s-ba9609.mp3"
    },
    {
      "s": "s004",
      "e": "ep-pep3b-u2",
      "k": "textbook",
      "sp": null,
      "en": "It has short legs.",
      "zh": "它的腿很短。",
      "an": "https://english.example.com/audio/ep/ep-pep3b-u2/s004-n-0a9a6f.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3b-u2/s004-s-e2d51e.mp3"
    },
    {
      "s": "s005",
      "e": "ep-pep3b-u2",
      "k": "textbook",
      "sp": null,
      "en": "Is it fat or thin?",
      "zh": "它是胖还是瘦？",
      "an": "https://english.example.com/audio/ep/ep-pep3b-u2/s005-n-e211d7.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3b-u2/s005-s-c3e660.mp3"
    },
    {
      "s": "s006",
      "e": "ep-pep3b-u2",
      "k": "textbook",
      "sp": null,
      "en": "It is a little fat.",
      "zh": "它有点胖。",
      "an": "https://english.example.com/audio/ep/ep-pep3b-u2/s006-n-7ea122.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3b-u2/s006-s-ddb21f.mp3"
    },
    {
      "s": "s007",
      "e": "ep-pep3b-u2",
      "k": "textbook",
      "sp": null,
      "en": "The turtle is slow.",
      "zh": "乌龟爬得很慢。",
      "an": "https://english.example.com/audio/ep/ep-pep3b-u2/s007-n-b7b50f.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3b-u2/s007-s-dd6045.mp3"
    },
    {
      "s": "s008",
      "e": "ep-pep3b-u2",
      "k": "textbook",
      "sp": null,
      "en": "The cat has a long tail.",
      "zh": "那只猫有一条长尾巴。",
      "an": "https://english.example.com/audio/ep/ep-pep3b-u2/s008-n-dc1ca4.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3b-u2/s008-s-4ccf03.mp3"
    },
    {
      "s": "s009",
      "e": "ep-pep3b-u2",
      "k": "textbook",
      "sp": null,
      "en": "I love her picture.",
      "zh": "我很喜欢她的画。",
      "an": "https://english.example.com/audio/ep/ep-pep3b-u2/s009-n-ea078e.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3b-u2/s009-s-3978ce.mp3"
    },
    {
      "s": "s010",
      "e": "ep-pep3b-u2",
      "k": "textbook",
      "sp": null,
      "en": "This card is for you.",
      "zh": "这张卡片是送给你的。",
      "an": "https://english.example.com/audio/ep/ep-pep3b-u2/s010-n-ceaed0.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3b-u2/s010-s-2139e5.mp3"
    },
    {
      "s": "s011",
      "e": "ep-pep3b-u2",
      "k": "textbook",
      "sp": null,
      "en": "Thank you for the gift.",
      "zh": "谢谢你送的礼物。",
      "an": "https://english.example.com/audio/ep/ep-pep3b-u2/s011-n-6dab4d.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3b-u2/s011-s-add48d.mp3"
    },
    {
      "s": "s012",
      "e": "ep-pep3b-u2",
      "k": "textbook",
      "sp": null,
      "en": "You are right.",
      "zh": "你说得对。",
      "an": "https://english.example.com/audio/ep/ep-pep3b-u2/s012-n-2411b0.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3b-u2/s012-s-deb61f.mp3"
    },
    {
      "s": "s013",
      "e": "ep-pep3b-u2",
      "k": "textbook",
      "sp": null,
      "en": "We can sing together.",
      "zh": "我们可以一起唱歌。",
      "an": "https://english.example.com/audio/ep/ep-pep3b-u2/s013-n-215c33.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3b-u2/s013-s-31de9e.mp3"
    },
    {
      "s": "s014",
      "e": "ep-pep3b-u2",
      "k": "textbook",
      "sp": null,
      "en": "We can dance together.",
      "zh": "我们可以一起跳舞。",
      "an": "https://english.example.com/audio/ep/ep-pep3b-u2/s014-n-94425b.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3b-u2/s014-s-679652.mp3"
    },
    {
      "s": "s015",
      "e": "ep-pep3b-u2",
      "k": "textbook",
      "sp": null,
      "en": "Let us talk about our friends.",
      "zh": "让我们聊聊我们的朋友吧。",
      "an": "https://english.example.com/audio/ep/ep-pep3b-u2/s015-n-acc046.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3b-u2/s015-s-31838c.mp3"
    },
    {
      "s": "s016",
      "e": "ep-pep3b-u2",
      "k": "textbook",
      "sp": null,
      "en": "Look at his face.",
      "zh": "看看他的脸。",
      "an": "https://english.example.com/audio/ep/ep-pep3b-u2/s016-n-9a069b.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3b-u2/s016-s-bc8ca4.mp3"
    },
    {
      "s": "s017",
      "e": "ep-pep3b-u2",
      "k": "textbook",
      "sp": null,
      "en": "All of us can help.",
      "zh": "我们每个人都可以帮忙。",
      "an": "https://english.example.com/audio/ep/ep-pep3b-u2/s017-n-5c409d.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3b-u2/s017-s-db4fef.mp3"
    },
    {
      "s": "s018",
      "e": "ep-pep3b-u2",
      "k": "textbook",
      "sp": null,
      "en": "This song is nice.",
      "zh": "这首歌很好听。",
      "an": "https://english.example.com/audio/ep/ep-pep3b-u2/s018-n-8cccec.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3b-u2/s018-s-246e78.mp3"
    },
    {
      "s": "s019",
      "e": "ep-pep3b-u2",
      "k": "textbook",
      "sp": null,
      "en": "Do you want tea or milk?",
      "zh": "你想喝茶还是牛奶？",
      "an": "https://english.example.com/audio/ep/ep-pep3b-u2/s019-n-76dd32.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3b-u2/s019-s-a3ae35.mp3"
    },
    {
      "s": "s020",
      "e": "ep-pep3b-u2",
      "k": "textbook",
      "sp": null,
      "en": "The box is so big.",
      "zh": "这个盒子真大。",
      "an": "https://english.example.com/audio/ep/ep-pep3b-u2/s020-n-e0944f.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3b-u2/s020-s-96e66f.mp3"
    },
    {
      "s": "s021",
      "e": "ep-pep3b-u2",
      "k": "textbook",
      "sp": null,
      "en": "There is so much fun.",
      "zh": "真是太好玩了。",
      "an": "https://english.example.com/audio/ep/ep-pep3b-u2/s021-n-3fdae7.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3b-u2/s021-s-5d0285.mp3"
    },
    {
      "s": "s022",
      "e": "ep-pep3b-u2",
      "k": "textbook",
      "sp": null,
      "en": "Kind words make people happy.",
      "zh": "友善的话语让人开心。",
      "an": "https://english.example.com/audio/ep/ep-pep3b-u2/s022-n-e334af.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3b-u2/s022-s-eeb6b9.mp3"
    },
    {
      "s": "s023",
      "e": "ep-pep3b-u2",
      "k": "textbook",
      "sp": null,
      "en": "Good actions show love.",
      "zh": "好的行为能表达关爱。",
      "an": "https://english.example.com/audio/ep/ep-pep3b-u2/s023-n-ed055e.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3b-u2/s023-s-a1b95e.mp3"
    },
    {
      "s": "s024",
      "e": "ep-pep3b-u2",
      "k": "textbook",
      "sp": null,
      "en": "We learn to care for others.",
      "zh": "我们学习关心别人。",
      "an": "https://english.example.com/audio/ep/ep-pep3b-u2/s024-n-02c69f.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3b-u2/s024-s-bd6684.mp3"
    },
    {
      "s": "s001",
      "e": "ep-pep3b-u3",
      "k": "textbook",
      "sp": null,
      "en": "Tools and senses help us learn.",
      "zh": "工具和感官帮助我们学习。",
      "an": "https://english.example.com/audio/ep/ep-pep3b-u3/s001-n-630391.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3b-u3/s001-s-945427.mp3"
    },
    {
      "s": "s002",
      "e": "ep-pep3b-u3",
      "k": "textbook",
      "sp": null,
      "en": "I have an eraser.",
      "zh": "我有一块橡皮。",
      "an": "https://english.example.com/audio/ep/ep-pep3b-u3/s002-n-441519.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3b-u3/s002-s-515ae1.mp3"
    },
    {
      "s": "s003",
      "e": "ep-pep3b-u3",
      "k": "textbook",
      "sp": null,
      "en": "Can you find your ruler?",
      "zh": "你能找到你的尺子吗？",
      "an": "https://english.example.com/audio/ep/ep-pep3b-u3/s003-n-33459f.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3b-u3/s003-s-1cc78e.mp3"
    },
    {
      "s": "s004",
      "e": "ep-pep3b-u3",
      "k": "textbook",
      "sp": null,
      "en": "Here is my pen.",
      "zh": "这是我的钢笔。",
      "an": "https://english.example.com/audio/ep/ep-pep3b-u3/s004-n-1c1470.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3b-u3/s004-s-aeb87a.mp3"
    },
    {
      "s": "s005",
      "e": "ep-pep3b-u3",
      "k": "textbook",
      "sp": null,
      "en": "This pencil is yellow.",
      "zh": "这支铅笔是黄色的。",
      "an": "https://english.example.com/audio/ep/ep-pep3b-u3/s005-n-c60f7a.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3b-u3/s005-s-9466bf.mp3"
    },
    {
      "s": "s006",
      "e": "ep-pep3b-u3",
      "k": "textbook",
      "sp": null,
      "en": "Open your book, please.",
      "zh": "请打开你的书。",
      "an": "https://english.example.com/audio/ep/ep-pep3b-u3/s006-n-cb4e04.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3b-u3/s006-s-13f9f3.mp3"
    },
    {
      "s": "s007",
      "e": "ep-pep3b-u3",
      "k": "textbook",
      "sp": null,
      "en": "Put the paper in your bag.",
      "zh": "把纸放进你的书包里。",
      "an": "https://english.example.com/audio/ep/ep-pep3b-u3/s007-n-6d273d.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3b-u3/s007-s-998ade.mp3"
    },
    {
      "s": "s008",
      "e": "ep-pep3b-u3",
      "k": "textbook",
      "sp": null,
      "en": "These are my school things.",
      "zh": "这些是我的学习用品。",
      "an": "https://english.example.com/audio/ep/ep-pep3b-u3/s008-n-c92f08.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3b-u3/s008-s-20069c.mp3"
    },
    {
      "s": "s009",
      "e": "ep-pep3b-u3",
      "k": "textbook",
      "sp": null,
      "en": "I can see the map.",
      "zh": "我能看见地图。",
      "an": "https://english.example.com/audio/ep/ep-pep3b-u3/s009-n-b2d56e.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3b-u3/s009-s-4c13e3.mp3"
    },
    {
      "s": "s010",
      "e": "ep-pep3b-u3",
      "k": "textbook",
      "sp": null,
      "en": "I can smell the flower.",
      "zh": "我能闻到花香。",
      "an": "https://english.example.com/audio/ep/ep-pep3b-u3/s010-n-6ad8ae.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3b-u3/s010-s-89974e.mp3"
    },
    {
      "s": "s011",
      "e": "ep-pep3b-u3",
      "k": "textbook",
      "sp": null,
      "en": "I can taste the soup.",
      "zh": "我能尝到汤的味道。",
      "an": "https://english.example.com/audio/ep/ep-pep3b-u3/s011-n-252e4f.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3b-u3/s011-s-866e8a.mp3"
    },
    {
      "s": "s012",
      "e": "ep-pep3b-u3",
      "k": "textbook",
      "sp": null,
      "en": "I can hear the song.",
      "zh": "我能听见歌声。",
      "an": "https://english.example.com/audio/ep/ep-pep3b-u3/s012-n-f8dd9d.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3b-u3/s012-s-b9e460.mp3"
    },
    {
      "s": "s013",
      "e": "ep-pep3b-u3",
      "k": "textbook",
      "sp": null,
      "en": "Please touch the card.",
      "zh": "请摸一摸这张卡片。",
      "an": "https://english.example.com/audio/ep/ep-pep3b-u3/s013-n-d8f403.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3b-u3/s013-s-4aa41a.mp3"
    },
    {
      "s": "s014",
      "e": "ep-pep3b-u3",
      "k": "textbook",
      "sp": null,
      "en": "This is my nose.",
      "zh": "这是我的鼻子。",
      "an": "https://english.example.com/audio/ep/ep-pep3b-u3/s014-n-ae198e.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3b-u3/s014-s-f5f0f7.mp3"
    },
    {
      "s": "s015",
      "e": "ep-pep3b-u3",
      "k": "textbook",
      "sp": null,
      "en": "Use your tongue to taste.",
      "zh": "用你的舌头尝一尝。",
      "an": "https://english.example.com/audio/ep/ep-pep3b-u3/s015-n-55bf21.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3b-u3/s015-s-88eeb6.mp3"
    },
    {
      "s": "s016",
      "e": "ep-pep3b-u3",
      "k": "textbook",
      "sp": null,
      "en": "We learn in class.",
      "zh": "我们在课堂上学习。",
      "an": "https://english.example.com/audio/ep/ep-pep3b-u3/s016-n-cd23c5.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3b-u3/s016-s-26d920.mp3"
    },
    {
      "s": "s017",
      "e": "ep-pep3b-u3",
      "k": "textbook",
      "sp": null,
      "en": "The computer is on the desk.",
      "zh": "电脑在书桌上。",
      "an": "https://english.example.com/audio/ep/ep-pep3b-u3/s017-n-078a84.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3b-u3/s017-s-4432f3.mp3"
    },
    {
      "s": "s018",
      "e": "ep-pep3b-u3",
      "k": "textbook",
      "sp": null,
      "en": "I learn English with friends.",
      "zh": "我和朋友们一起学英语。",
      "an": "https://english.example.com/audio/ep/ep-pep3b-u3/s018-n-b1982d.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3b-u3/s018-s-255f4d.mp3"
    },
    {
      "s": "s019",
      "e": "ep-pep3b-u3",
      "k": "textbook",
      "sp": null,
      "en": "A ruler helps us draw lines.",
      "zh": "尺子帮助我们画线。",
      "an": "https://english.example.com/audio/ep/ep-pep3b-u3/s019-n-912148.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3b-u3/s019-s-c66759.mp3"
    },
    {
      "s": "s020",
      "e": "ep-pep3b-u3",
      "k": "textbook",
      "sp": null,
      "en": "A pen helps us write words.",
      "zh": "钢笔帮助我们写字。",
      "an": "https://english.example.com/audio/ep/ep-pep3b-u3/s020-n-f5fd71.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3b-u3/s020-s-5a5108.mp3"
    },
    {
      "s": "s021",
      "e": "ep-pep3b-u3",
      "k": "textbook",
      "sp": null,
      "en": "A book helps us read stories.",
      "zh": "书帮助我们阅读故事。",
      "an": "https://english.example.com/audio/ep/ep-pep3b-u3/s021-n-742527.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3b-u3/s021-s-e4ce50.mp3"
    },
    {
      "s": "s022",
      "e": "ep-pep3b-u3",
      "k": "textbook",
      "sp": null,
      "en": "Our eyes help us see.",
      "zh": "眼睛帮助我们看东西。",
      "an": "https://english.example.com/audio/ep/ep-pep3b-u3/s022-n-bf6939.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3b-u3/s022-s-98a45b.mp3"
    },
    {
      "s": "s023",
      "e": "ep-pep3b-u3",
      "k": "textbook",
      "sp": null,
      "en": "Our ears help us hear.",
      "zh": "耳朵帮助我们听声音。",
      "an": "https://english.example.com/audio/ep/ep-pep3b-u3/s023-n-9ff939.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3b-u3/s023-s-a9f029.mp3"
    },
    {
      "s": "s024",
      "e": "ep-pep3b-u3",
      "k": "textbook",
      "sp": null,
      "en": "We use tools carefully.",
      "zh": "我们小心地使用工具。",
      "an": "https://english.example.com/audio/ep/ep-pep3b-u3/s024-n-08a78a.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3b-u3/s024-s-be44be.mp3"
    },
    {
      "s": "s001",
      "e": "ep-pep3b-u4",
      "k": "textbook",
      "sp": null,
      "en": "Healthy food helps us grow.",
      "zh": "健康的食物帮助我们长大。",
      "an": "https://english.example.com/audio/ep/ep-pep3b-u4/s001-n-04776e.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3b-u4/s001-s-01a553.mp3"
    },
    {
      "s": "s002",
      "e": "ep-pep3b-u4",
      "k": "textbook",
      "sp": null,
      "en": "What do you have for breakfast?",
      "zh": "你早餐吃什么？",
      "an": "https://english.example.com/audio/ep/ep-pep3b-u4/s002-n-a58e79.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3b-u4/s002-s-dca116.mp3"
    },
    {
      "s": "s003",
      "e": "ep-pep3b-u4",
      "k": "textbook",
      "sp": null,
      "en": "I have bread and milk.",
      "zh": "我吃面包，喝牛奶。",
      "an": "https://english.example.com/audio/ep/ep-pep3b-u4/s003-n-52e329.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3b-u4/s003-s-5e9f18.mp3"
    },
    {
      "s": "s004",
      "e": "ep-pep3b-u4",
      "k": "textbook",
      "sp": null,
      "en": "I have an egg too.",
      "zh": "我还吃一个鸡蛋。",
      "an": "https://english.example.com/audio/ep/ep-pep3b-u4/s004-n-b30582.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3b-u4/s004-s-768e51.mp3"
    },
    {
      "s": "s005",
      "e": "ep-pep3b-u4",
      "k": "textbook",
      "sp": null,
      "en": "It is time for lunch.",
      "zh": "该吃午饭了。",
      "an": "https://english.example.com/audio/ep/ep-pep3b-u4/s005-n-694fe0.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3b-u4/s005-s-874aca.mp3"
    },
    {
      "s": "s006",
      "e": "ep-pep3b-u4",
      "k": "textbook",
      "sp": null,
      "en": "I like noodles.",
      "zh": "我喜欢吃面条。",
      "an": "https://english.example.com/audio/ep/ep-pep3b-u4/s006-n-8fda75.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3b-u4/s006-s-662c4b.mp3"
    },
    {
      "s": "s007",
      "e": "ep-pep3b-u4",
      "k": "textbook",
      "sp": null,
      "en": "I like rice and meat.",
      "zh": "我喜欢吃米饭和肉。",
      "an": "https://english.example.com/audio/ep/ep-pep3b-u4/s007-n-756eee.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3b-u4/s007-s-327cbd.mp3"
    },
    {
      "s": "s008",
      "e": "ep-pep3b-u4",
      "k": "textbook",
      "sp": null,
      "en": "Vegetables are healthy.",
      "zh": "蔬菜有益健康。",
      "an": "https://english.example.com/audio/ep/ep-pep3b-u4/s008-n-093d82.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3b-u4/s008-s-ee5b2d.mp3"
    },
    {
      "s": "s009",
      "e": "ep-pep3b-u4",
      "k": "textbook",
      "sp": null,
      "en": "Fruit is colourful.",
      "zh": "水果的颜色真丰富。",
      "an": "https://english.example.com/audio/ep/ep-pep3b-u4/s009-n-c45ca2.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3b-u4/s009-s-068154.mp3"
    },
    {
      "s": "s010",
      "e": "ep-pep3b-u4",
      "k": "textbook",
      "sp": null,
      "en": "Would you like some soup?",
      "zh": "你想喝点汤吗？",
      "an": "https://english.example.com/audio/ep/ep-pep3b-u4/s010-n-e69d7d.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3b-u4/s010-s-53a28a.mp3"
    },
    {
      "s": "s011",
      "e": "ep-pep3b-u4",
      "k": "textbook",
      "sp": null,
      "en": "Yes, please.",
      "zh": "好的，谢谢。",
      "an": "https://english.example.com/audio/ep/ep-pep3b-u4/s011-n-4a81d3.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3b-u4/s011-s-191d1b.mp3"
    },
    {
      "s": "s012",
      "e": "ep-pep3b-u4",
      "k": "textbook",
      "sp": null,
      "en": "Put the soup on the plate.",
      "zh": "把汤放在盘子里。",
      "an": "https://english.example.com/audio/ep/ep-pep3b-u4/s012-n-ba5511.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3b-u4/s012-s-e02073.mp3"
    },
    {
      "s": "s013",
      "e": "ep-pep3b-u4",
      "k": "textbook",
      "sp": null,
      "en": "Do you want some juice?",
      "zh": "你想喝点果汁吗？",
      "an": "https://english.example.com/audio/ep/ep-pep3b-u4/s013-n-1dac1e.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3b-u4/s013-s-85371a.mp3"
    },
    {
      "s": "s014",
      "e": "ep-pep3b-u4",
      "k": "textbook",
      "sp": null,
      "en": "No, thank you.",
      "zh": "不用了，谢谢。",
      "an": "https://english.example.com/audio/ep/ep-pep3b-u4/s014-n-d23213.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3b-u4/s014-s-010752.mp3"
    },
    {
      "s": "s015",
      "e": "ep-pep3b-u4",
      "k": "textbook",
      "sp": null,
      "en": "Candy is yummy.",
      "zh": "糖果真好吃。",
      "an": "https://english.example.com/audio/ep/ep-pep3b-u4/s015-n-17bef6.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3b-u4/s015-s-b386e4.mp3"
    },
    {
      "s": "s016",
      "e": "ep-pep3b-u4",
      "k": "textbook",
      "sp": null,
      "en": "Do not eat too much candy.",
      "zh": "不要吃太多糖果。",
      "an": "https://english.example.com/audio/ep/ep-pep3b-u4/s016-n-413935.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3b-u4/s016-s-041262.mp3"
    },
    {
      "s": "s017",
      "e": "ep-pep3b-u4",
      "k": "textbook",
      "sp": null,
      "en": "Milk is good for us.",
      "zh": "牛奶对我们的身体有好处。",
      "an": "https://english.example.com/audio/ep/ep-pep3b-u4/s017-n-df981a.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3b-u4/s017-s-36f486.mp3"
    },
    {
      "s": "s018",
      "e": "ep-pep3b-u4",
      "k": "textbook",
      "sp": null,
      "en": "Bread is on the table.",
      "zh": "面包在桌子上。",
      "an": "https://english.example.com/audio/ep/ep-pep3b-u4/s018-n-f42fe4.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3b-u4/s018-s-7b417c.mp3"
    },
    {
      "s": "s019",
      "e": "ep-pep3b-u4",
      "k": "textbook",
      "sp": null,
      "en": "Rice is in the bowl.",
      "zh": "米饭在碗里。",
      "an": "https://english.example.com/audio/ep/ep-pep3b-u4/s019-n-774902.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3b-u4/s019-s-23371f.mp3"
    },
    {
      "s": "s020",
      "e": "ep-pep3b-u4",
      "k": "textbook",
      "sp": null,
      "en": "Meat is on the plate.",
      "zh": "肉在盘子里。",
      "an": "https://english.example.com/audio/ep/ep-pep3b-u4/s020-n-5318ea.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3b-u4/s020-s-389327.mp3"
    },
    {
      "s": "s021",
      "e": "ep-pep3b-u4",
      "k": "textbook",
      "sp": null,
      "en": "Fruit makes the meal nice.",
      "zh": "有了水果，这顿饭就更美味了。",
      "an": "https://english.example.com/audio/ep/ep-pep3b-u4/s021-n-1d0cd1.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3b-u4/s021-s-6ee732.mp3"
    },
    {
      "s": "s022",
      "e": "ep-pep3b-u4",
      "k": "textbook",
      "sp": null,
      "en": "We share healthy food.",
      "zh": "我们一起分享健康的食物。",
      "an": "https://english.example.com/audio/ep/ep-pep3b-u4/s022-n-914835.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3b-u4/s022-s-1dc523.mp3"
    },
    {
      "s": "s023",
      "e": "ep-pep3b-u4",
      "k": "textbook",
      "sp": null,
      "en": "Eat well every day.",
      "zh": "每天都要好好吃饭。",
      "an": "https://english.example.com/audio/ep/ep-pep3b-u4/s023-n-eed9cb.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3b-u4/s023-s-fba0e0.mp3"
    },
    {
      "s": "s024",
      "e": "ep-pep3b-u4",
      "k": "textbook",
      "sp": null,
      "en": "Healthy habits start now.",
      "zh": "从现在开始养成健康的习惯。",
      "an": "https://english.example.com/audio/ep/ep-pep3b-u4/s024-n-3a496e.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3b-u4/s024-s-2fa3c3.mp3"
    },
    {
      "s": "s001",
      "e": "ep-pep3b-u5",
      "k": "textbook",
      "sp": null,
      "en": "Old things have stories.",
      "zh": "旧东西都有自己的故事。",
      "an": "https://english.example.com/audio/ep/ep-pep3b-u5/s001-n-8cd620.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3b-u5/s001-s-f715ab.mp3"
    },
    {
      "s": "s002",
      "e": "ep-pep3b-u5",
      "k": "textbook",
      "sp": null,
      "en": "This is my old boat.",
      "zh": "这是我的旧小船。",
      "an": "https://english.example.com/audio/ep/ep-pep3b-u5/s002-n-26b8fd.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3b-u5/s002-s-ed8307.mp3"
    },
    {
      "s": "s003",
      "e": "ep-pep3b-u5",
      "k": "textbook",
      "sp": null,
      "en": "It is cool.",
      "zh": "它很酷。",
      "an": "https://english.example.com/audio/ep/ep-pep3b-u5/s003-n-ad518a.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3b-u5/s003-s-893f7d.mp3"
    },
    {
      "s": "s004",
      "e": "ep-pep3b-u5",
      "k": "textbook",
      "sp": null,
      "en": "I want to keep it.",
      "zh": "我想把它留下来。",
      "an": "https://english.example.com/audio/ep/ep-pep3b-u5/s004-n-33fa4f.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3b-u5/s004-s-d715d8.mp3"
    },
    {
      "s": "s005",
      "e": "ep-pep3b-u5",
      "k": "textbook",
      "sp": null,
      "en": "The ball is at home.",
      "zh": "球在家里。",
      "an": "https://english.example.com/audio/ep/ep-pep3b-u5/s005-n-73fb73.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3b-u5/s005-s-1aa00d.mp3"
    },
    {
      "s": "s006",
      "e": "ep-pep3b-u5",
      "k": "textbook",
      "sp": null,
      "en": "The doll is on the shelf.",
      "zh": "娃娃在架子上。",
      "an": "https://english.example.com/audio/ep/ep-pep3b-u5/s006-n-a5db2c.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3b-u5/s006-s-b432c0.mp3"
    },
    {
      "s": "s007",
      "e": "ep-pep3b-u5",
      "k": "textbook",
      "sp": null,
      "en": "The car is in the box.",
      "zh": "小汽车在盒子里。",
      "an": "https://english.example.com/audio/ep/ep-pep3b-u5/s007-n-a8d283.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3b-u5/s007-s-bbe659.mp3"
    },
    {
      "s": "s008",
      "e": "ep-pep3b-u5",
      "k": "textbook",
      "sp": null,
      "en": "The cap is under the map.",
      "zh": "帽子在地图下面。",
      "an": "https://english.example.com/audio/ep/ep-pep3b-u5/s008-n-f1e3fa.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3b-u5/s008-s-4d2d8f.mp3"
    },
    {
      "s": "s009",
      "e": "ep-pep3b-u5",
      "k": "textbook",
      "sp": null,
      "en": "Put the card on the desk.",
      "zh": "把卡片放在书桌上。",
      "an": "https://english.example.com/audio/ep/ep-pep3b-u5/s009-n-001e0c.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3b-u5/s009-s-aa27df.mp3"
    },
    {
      "s": "s010",
      "e": "ep-pep3b-u5",
      "k": "textbook",
      "sp": null,
      "en": "The book is still here.",
      "zh": "书还在这里。",
      "an": "https://english.example.com/audio/ep/ep-pep3b-u5/s010-n-f095f6.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3b-u5/s010-s-56aa29.mp3"
    },
    {
      "s": "s011",
      "e": "ep-pep3b-u5",
      "k": "textbook",
      "sp": null,
      "en": "Look at this old toy.",
      "zh": "看看这个旧玩具。",
      "an": "https://english.example.com/audio/ep/ep-pep3b-u5/s011-n-1a22e5.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3b-u5/s011-s-7a4665.mp3"
    },
    {
      "s": "s012",
      "e": "ep-pep3b-u5",
      "k": "textbook",
      "sp": null,
      "en": "It is in my room.",
      "zh": "它在我的房间里。",
      "an": "https://english.example.com/audio/ep/ep-pep3b-u5/s012-n-147f20.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3b-u5/s012-s-30b095.mp3"
    },
    {
      "s": "s013",
      "e": "ep-pep3b-u5",
      "k": "textbook",
      "sp": null,
      "en": "Is the boat under the shelf?",
      "zh": "小船在架子下面吗？",
      "an": "https://english.example.com/audio/ep/ep-pep3b-u5/s013-n-348e1d.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3b-u5/s013-s-6dae84.mp3"
    },
    {
      "s": "s014",
      "e": "ep-pep3b-u5",
      "k": "textbook",
      "sp": null,
      "en": "No, it is in the box.",
      "zh": "不，它在盒子里。",
      "an": "https://english.example.com/audio/ep/ep-pep3b-u5/s014-n-4e3db5.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3b-u5/s014-s-1a80a7.mp3"
    },
    {
      "s": "s015",
      "e": "ep-pep3b-u5",
      "k": "textbook",
      "sp": null,
      "en": "Where is the ball?",
      "zh": "球在哪里？",
      "an": "https://english.example.com/audio/ep/ep-pep3b-u5/s015-n-4a956e.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3b-u5/s015-s-800537.mp3"
    },
    {
      "s": "s016",
      "e": "ep-pep3b-u5",
      "k": "textbook",
      "sp": null,
      "en": "It is on the chair.",
      "zh": "它在椅子上。",
      "an": "https://english.example.com/audio/ep/ep-pep3b-u5/s016-n-085ebd.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3b-u5/s016-s-1d9c3c.mp3"
    },
    {
      "s": "s017",
      "e": "ep-pep3b-u5",
      "k": "textbook",
      "sp": null,
      "en": "I can put things in order.",
      "zh": "我能把东西摆整齐。",
      "an": "https://english.example.com/audio/ep/ep-pep3b-u5/s017-n-eafe03.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3b-u5/s017-s-dc669e.mp3"
    },
    {
      "s": "s018",
      "e": "ep-pep3b-u5",
      "k": "textbook",
      "sp": null,
      "en": "A map helps me find places.",
      "zh": "地图能帮我找到地方。",
      "an": "https://english.example.com/audio/ep/ep-pep3b-u5/s018-n-457a30.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3b-u5/s018-s-b09ec1.mp3"
    },
    {
      "s": "s019",
      "e": "ep-pep3b-u5",
      "k": "textbook",
      "sp": null,
      "en": "A cap can keep the sun away.",
      "zh": "帽子可以遮挡阳光。",
      "an": "https://english.example.com/audio/ep/ep-pep3b-u5/s019-n-e99086.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3b-u5/s019-s-ce2f10.mp3"
    },
    {
      "s": "s020",
      "e": "ep-pep3b-u5",
      "k": "textbook",
      "sp": null,
      "en": "A doll can be a good memory.",
      "zh": "娃娃可以留下一段美好的回忆。",
      "an": "https://english.example.com/audio/ep/ep-pep3b-u5/s020-n-52aa84.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3b-u5/s020-s-aec4de.mp3"
    },
    {
      "s": "s021",
      "e": "ep-pep3b-u5",
      "k": "textbook",
      "sp": null,
      "en": "Do you keep old things?",
      "zh": "你会留着旧东西吗？",
      "an": "https://english.example.com/audio/ep/ep-pep3b-u5/s021-n-b5001f.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3b-u5/s021-s-d0d6f0.mp3"
    },
    {
      "s": "s022",
      "e": "ep-pep3b-u5",
      "k": "textbook",
      "sp": null,
      "en": "What do you keep at home?",
      "zh": "你在家里留着哪些东西？",
      "an": "https://english.example.com/audio/ep/ep-pep3b-u5/s022-n-bb648b.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3b-u5/s022-s-068316.mp3"
    },
    {
      "s": "s023",
      "e": "ep-pep3b-u5",
      "k": "textbook",
      "sp": null,
      "en": "Old things are useful too.",
      "zh": "旧东西也有用。",
      "an": "https://english.example.com/audio/ep/ep-pep3b-u5/s023-n-4abf4b.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3b-u5/s023-s-24e457.mp3"
    },
    {
      "s": "s024",
      "e": "ep-pep3b-u5",
      "k": "textbook",
      "sp": null,
      "en": "We learn to care for things.",
      "zh": "我们学习爱惜物品。",
      "an": "https://english.example.com/audio/ep/ep-pep3b-u5/s024-n-a36dc9.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3b-u5/s024-s-b14a3c.mp3"
    },
    {
      "s": "s001",
      "e": "ep-pep3b-u6",
      "k": "textbook",
      "sp": null,
      "en": "Numbers are useful in life.",
      "zh": "数字在生活中很有用。",
      "an": "https://english.example.com/audio/ep/ep-pep3b-u6/s001-n-ea7ef1.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3b-u6/s001-s-5ee49e.mp3"
    },
    {
      "s": "s002",
      "e": "ep-pep3b-u6",
      "k": "textbook",
      "sp": null,
      "en": "I can count to twenty.",
      "zh": "我能数到二十。",
      "an": "https://english.example.com/audio/ep/ep-pep3b-u6/s002-n-255545.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3b-u6/s002-s-5a871a.mp3"
    },
    {
      "s": "s003",
      "e": "ep-pep3b-u6",
      "k": "textbook",
      "sp": null,
      "en": "Eleven comes after ten.",
      "zh": "十后面是十一。",
      "an": "https://english.example.com/audio/ep/ep-pep3b-u6/s003-n-1ed6c4.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3b-u6/s003-s-d5e590.mp3"
    },
    {
      "s": "s004",
      "e": "ep-pep3b-u6",
      "k": "textbook",
      "sp": null,
      "en": "Twelve comes after eleven.",
      "zh": "十一后面是十二。",
      "an": "https://english.example.com/audio/ep/ep-pep3b-u6/s004-n-db3ded.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3b-u6/s004-s-a0f618.mp3"
    },
    {
      "s": "s005",
      "e": "ep-pep3b-u6",
      "k": "textbook",
      "sp": null,
      "en": "Thirteen is my number.",
      "zh": "我的号码是十三。",
      "an": "https://english.example.com/audio/ep/ep-pep3b-u6/s005-n-eb6b32.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3b-u6/s005-s-3091fd.mp3"
    },
    {
      "s": "s006",
      "e": "ep-pep3b-u6",
      "k": "textbook",
      "sp": null,
      "en": "Fourteen books are on the shelf.",
      "zh": "书架上有十四本书。",
      "an": "https://english.example.com/audio/ep/ep-pep3b-u6/s006-n-d92da0.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3b-u6/s006-s-1c605f.mp3"
    },
    {
      "s": "s007",
      "e": "ep-pep3b-u6",
      "k": "textbook",
      "sp": null,
      "en": "Fifteen students are in class.",
      "zh": "班里有十五个学生。",
      "an": "https://english.example.com/audio/ep/ep-pep3b-u6/s007-n-d84e72.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3b-u6/s007-s-bdf5e3.mp3"
    },
    {
      "s": "s008",
      "e": "ep-pep3b-u6",
      "k": "textbook",
      "sp": null,
      "en": "Sixteen pens are in the bag.",
      "zh": "包里有十六支钢笔。",
      "an": "https://english.example.com/audio/ep/ep-pep3b-u6/s008-n-c7492a.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3b-u6/s008-s-95258c.mp3"
    },
    {
      "s": "s009",
      "e": "ep-pep3b-u6",
      "k": "textbook",
      "sp": null,
      "en": "Seventeen pencils are on the desk.",
      "zh": "桌子上有十七支铅笔。",
      "an": "https://english.example.com/audio/ep/ep-pep3b-u6/s009-n-48abe1.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3b-u6/s009-s-863891.mp3"
    },
    {
      "s": "s010",
      "e": "ep-pep3b-u6",
      "k": "textbook",
      "sp": null,
      "en": "Eighteen cards are in the box.",
      "zh": "盒子里有十八张卡片。",
      "an": "https://english.example.com/audio/ep/ep-pep3b-u6/s010-n-00513d.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3b-u6/s010-s-8a987b.mp3"
    },
    {
      "s": "s011",
      "e": "ep-pep3b-u6",
      "k": "textbook",
      "sp": null,
      "en": "Nineteen balloons are here.",
      "zh": "这里有十九个气球。",
      "an": "https://english.example.com/audio/ep/ep-pep3b-u6/s011-n-699d49.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3b-u6/s011-s-795246.mp3"
    },
    {
      "s": "s012",
      "e": "ep-pep3b-u6",
      "k": "textbook",
      "sp": null,
      "en": "Twenty is a big number for me.",
      "zh": "对我来说，二十是个很大的数。",
      "an": "https://english.example.com/audio/ep/ep-pep3b-u6/s012-n-143cf0.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3b-u6/s012-s-2392b3.mp3"
    },
    {
      "s": "s013",
      "e": "ep-pep3b-u6",
      "k": "textbook",
      "sp": null,
      "en": "This is my piggy bank.",
      "zh": "这是我的小猪存钱罐。",
      "an": "https://english.example.com/audio/ep/ep-pep3b-u6/s013-n-8da045.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3b-u6/s013-s-7e111f.mp3"
    },
    {
      "s": "s014",
      "e": "ep-pep3b-u6",
      "k": "textbook",
      "sp": null,
      "en": "I can pay with my coins.",
      "zh": "我可以用我的硬币付钱。",
      "an": "https://english.example.com/audio/ep/ep-pep3b-u6/s014-n-333dc2.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3b-u6/s014-s-fabaa6.mp3"
    },
    {
      "s": "s015",
      "e": "ep-pep3b-u6",
      "k": "textbook",
      "sp": null,
      "en": "Please give the book back.",
      "zh": "请把书还回来。",
      "an": "https://english.example.com/audio/ep/ep-pep3b-u6/s015-n-aae875.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3b-u6/s015-s-dc5c9d.mp3"
    },
    {
      "s": "s016",
      "e": "ep-pep3b-u6",
      "k": "textbook",
      "sp": null,
      "en": "How many balls do you see?",
      "zh": "你看到了多少个球？",
      "an": "https://english.example.com/audio/ep/ep-pep3b-u6/s016-n-eebd22.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3b-u6/s016-s-45be94.mp3"
    },
    {
      "s": "s017",
      "e": "ep-pep3b-u6",
      "k": "textbook",
      "sp": null,
      "en": "I see twelve balls.",
      "zh": "我看到了十二个球。",
      "an": "https://english.example.com/audio/ep/ep-pep3b-u6/s017-n-8b8654.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3b-u6/s017-s-a0de90.mp3"
    },
    {
      "s": "s018",
      "e": "ep-pep3b-u6",
      "k": "textbook",
      "sp": null,
      "en": "How much is the bread?",
      "zh": "面包多少钱？",
      "an": "https://english.example.com/audio/ep/ep-pep3b-u6/s018-n-424c97.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3b-u6/s018-s-4c5661.mp3"
    },
    {
      "s": "s019",
      "e": "ep-pep3b-u6",
      "k": "textbook",
      "sp": null,
      "en": "It is fifteen yuan.",
      "zh": "十五元。",
      "an": "https://english.example.com/audio/ep/ep-pep3b-u6/s019-n-c629ba.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3b-u6/s019-s-509157.mp3"
    },
    {
      "s": "s020",
      "e": "ep-pep3b-u6",
      "k": "textbook",
      "sp": null,
      "en": "Numbers help us shop.",
      "zh": "数字能帮我们买东西。",
      "an": "https://english.example.com/audio/ep/ep-pep3b-u6/s020-n-e42f6e.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3b-u6/s020-s-39ee1c.mp3"
    },
    {
      "s": "s021",
      "e": "ep-pep3b-u6",
      "k": "textbook",
      "sp": null,
      "en": "Numbers help us tell time.",
      "zh": "数字能帮我们看时间。",
      "an": "https://english.example.com/audio/ep/ep-pep3b-u6/s021-n-fead3b.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3b-u6/s021-s-ae3b72.mp3"
    },
    {
      "s": "s022",
      "e": "ep-pep3b-u6",
      "k": "textbook",
      "sp": null,
      "en": "Numbers help us play games.",
      "zh": "数字能帮我们玩游戏。",
      "an": "https://english.example.com/audio/ep/ep-pep3b-u6/s022-n-ce2582.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3b-u6/s022-s-83e4cc.mp3"
    },
    {
      "s": "s023",
      "e": "ep-pep3b-u6",
      "k": "textbook",
      "sp": null,
      "en": "Let us count together.",
      "zh": "我们一起数数吧。",
      "an": "https://english.example.com/audio/ep/ep-pep3b-u6/s023-n-f52464.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3b-u6/s023-s-709e43.mp3"
    },
    {
      "s": "s024",
      "e": "ep-pep3b-u6",
      "k": "textbook",
      "sp": null,
      "en": "Numbers make life clear.",
      "zh": "数字让生活中的事情更清楚。",
      "an": "https://english.example.com/audio/ep/ep-pep3b-u6/s024-n-7e28a7.mp3",
      "as": "https://english.example.com/audio/ep/ep-pep3b-u6/s024-s-23f54d.mp3"
    },
    {
      "s": "s001",
      "e": "ep-video-firstnight-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "Let's get the crafting table and the furnace.",
      "zh": "我们把工作台和熔炉拿出来吧。",
      "an": "https://english.example.com/audio/ep/ep-video-firstnight-2/s001-n-b46ea7.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-firstnight-2/s001-s-8bceeb.mp3"
    },
    {
      "s": "s002",
      "e": "ep-video-firstnight-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "And let's place them in this corner.",
      "zh": "我们把它们放在这个角落吧。",
      "an": "https://english.example.com/audio/ep/ep-video-firstnight-2/s002-n-3b8929.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-firstnight-2/s002-s-6d8406.mp3"
    },
    {
      "s": "s003",
      "e": "ep-video-firstnight-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "Crafting table.",
      "zh": "工作台。",
      "an": "https://english.example.com/audio/ep/ep-video-firstnight-2/s003-n-6bdadc.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-firstnight-2/s003-s-ea6b90.mp3"
    },
    {
      "s": "s004",
      "e": "ep-video-firstnight-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "Furnace.",
      "zh": "熔炉。",
      "an": "https://english.example.com/audio/ep/ep-video-firstnight-2/s004-n-6a6f33.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-firstnight-2/s004-s-9dd5b8.mp3"
    },
    {
      "s": "s005",
      "e": "ep-video-firstnight-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "Now, let's put the coal in the furnace to use as fuel.",
      "zh": "现在我们把煤放进熔炉，当燃料用吧。",
      "an": "https://english.example.com/audio/ep/ep-video-firstnight-2/s005-n-515489.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-firstnight-2/s005-s-11d6f4.mp3"
    },
    {
      "s": "s006",
      "e": "ep-video-firstnight-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "And let's smelt this iron.",
      "zh": "我们再把这些铁熔炼一下吧。",
      "an": "https://english.example.com/audio/ep/ep-video-firstnight-2/s006-n-e048cb.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-firstnight-2/s006-s-62459a.mp3"
    },
    {
      "s": "s007",
      "e": "ep-video-firstnight-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "Uh-oh, the sun's going down.",
      "zh": "哎呀，太阳要下山了。",
      "an": "https://english.example.com/audio/ep/ep-video-firstnight-2/s007-n-cead87.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-firstnight-2/s007-s-d23802.mp3"
    },
    {
      "s": "s008",
      "e": "ep-video-firstnight-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "Oh, I see a creeper.",
      "zh": "哦，我看到一只苦力怕。",
      "an": "https://english.example.com/audio/ep/ep-video-firstnight-2/s008-n-a7f178.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-firstnight-2/s008-s-fbfd87.mp3"
    },
    {
      "s": "s009",
      "e": "ep-video-firstnight-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "I hear a sheep.",
      "zh": "我听到一只羊。",
      "an": "https://english.example.com/audio/ep/ep-video-firstnight-2/s009-n-16557d.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-firstnight-2/s009-s-eae05d.mp3"
    },
    {
      "s": "s010",
      "e": "ep-video-firstnight-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "Okay, let's go back underground.",
      "zh": "好，我们回地下去吧。",
      "an": "https://english.example.com/audio/ep/ep-video-firstnight-2/s010-n-50dbd5.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-firstnight-2/s010-s-9a2cef.mp3"
    },
    {
      "s": "s011",
      "e": "ep-video-firstnight-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "Another skeleton.",
      "zh": "又一只骷髅。",
      "an": "https://english.example.com/audio/ep/ep-video-firstnight-2/s011-n-b036e1.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-firstnight-2/s011-s-0af037.mp3"
    },
    {
      "s": "s012",
      "e": "ep-video-firstnight-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "Where's my home?",
      "zh": "我的家在哪儿？",
      "an": "https://english.example.com/audio/ep/ep-video-firstnight-2/s012-n-fcb3cb.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-firstnight-2/s012-s-8f0a78.mp3"
    },
    {
      "s": "s013",
      "e": "ep-video-firstnight-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "There it is.",
      "zh": "在那儿。",
      "an": "https://english.example.com/audio/ep/ep-video-firstnight-2/s013-n-8a5d56.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-firstnight-2/s013-s-4d5d87.mp3"
    },
    {
      "s": "s014",
      "e": "ep-video-firstnight-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "We're safe.",
      "zh": "我们安全了。",
      "an": "https://english.example.com/audio/ep/ep-video-firstnight-2/s014-n-8d1502.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-firstnight-2/s014-s-0bd38a.mp3"
    },
    {
      "s": "s015",
      "e": "ep-video-firstnight-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "I can hear the skeleton.",
      "zh": "我能听到骷髅的声音。",
      "an": "https://english.example.com/audio/ep/ep-video-firstnight-2/s015-n-5495b3.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-firstnight-2/s015-s-198564.mp3"
    },
    {
      "s": "s016",
      "e": "ep-video-firstnight-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "The iron's done.",
      "zh": "铁炼好了。",
      "an": "https://english.example.com/audio/ep/ep-video-firstnight-2/s016-n-7411c2.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-firstnight-2/s016-s-7f07e9.mp3"
    },
    {
      "s": "s017",
      "e": "ep-video-firstnight-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "Let's begin cooking some beef.",
      "zh": "我们开始烤点牛肉吧。",
      "an": "https://english.example.com/audio/ep/ep-video-firstnight-2/s017-n-e810c6.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-firstnight-2/s017-s-834012.mp3"
    },
    {
      "s": "s018",
      "e": "ep-video-firstnight-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "I ate the steak and now I'll begin to heal.",
      "zh": "我吃了牛排，现在开始回血了。",
      "an": "https://english.example.com/audio/ep/ep-video-firstnight-2/s018-n-376bd1.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-firstnight-2/s018-s-29e599.mp3"
    },
    {
      "s": "s019",
      "e": "ep-video-firstnight-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "Let's go down there and explore the cave.",
      "zh": "我们下去探索一下洞穴吧。",
      "an": "https://english.example.com/audio/ep/ep-video-firstnight-2/s019-n-709a08.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-firstnight-2/s019-s-74b455.mp3"
    },
    {
      "s": "s020",
      "e": "ep-video-firstnight-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "There's some coal.",
      "zh": "那儿有煤。",
      "an": "https://english.example.com/audio/ep/ep-video-firstnight-2/s020-n-5185dd.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-firstnight-2/s020-s-cfc9a4.mp3"
    },
    {
      "s": "s021",
      "e": "ep-video-firstnight-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "Let's mine this coal.",
      "zh": "我们把这些煤挖出来吧。",
      "an": "https://english.example.com/audio/ep/ep-video-firstnight-2/s021-n-366ecd.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-firstnight-2/s021-s-a4b958.mp3"
    },
    {
      "s": "s022",
      "e": "ep-video-firstnight-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "Okay, more coal.",
      "zh": "好，又有煤。",
      "an": "https://english.example.com/audio/ep/ep-video-firstnight-2/s022-n-a79261.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-firstnight-2/s022-s-04a11a.mp3"
    },
    {
      "s": "s023",
      "e": "ep-video-firstnight-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "Ooh, it's very dark over there.",
      "zh": "哦，那边好黑。",
      "an": "https://english.example.com/audio/ep/ep-video-firstnight-2/s023-n-5a832c.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-firstnight-2/s023-s-7a5440.mp3"
    },
    {
      "s": "s024",
      "e": "ep-video-firstnight-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "Wow, that was a lot of coal.",
      "zh": "哇，好多煤啊。",
      "an": "https://english.example.com/audio/ep/ep-video-firstnight-2/s024-n-12c7d9.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-firstnight-2/s024-s-732e70.mp3"
    },
    {
      "s": "s025",
      "e": "ep-video-firstnight-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "Now I have 31 coal.",
      "zh": "现在我有 31 块煤了。",
      "an": "https://english.example.com/audio/ep/ep-video-firstnight-2/s025-n-8f11a0.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-firstnight-2/s025-s-7169a7.mp3"
    },
    {
      "s": "s026",
      "e": "ep-video-firstnight-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "Let's continue exploring.",
      "zh": "我们继续探索吧。",
      "an": "https://english.example.com/audio/ep/ep-video-firstnight-2/s026-n-e9d5de.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-firstnight-2/s026-s-00cda9.mp3"
    },
    {
      "s": "s027",
      "e": "ep-video-firstnight-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "I'm going to eat this steak.",
      "zh": "我要吃这块牛排。",
      "an": "https://english.example.com/audio/ep/ep-video-firstnight-2/s027-n-5c56d3.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-firstnight-2/s027-s-974e13.mp3"
    },
    {
      "s": "s028",
      "e": "ep-video-firstnight-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "Okay, I really need some armor.",
      "zh": "嗯，我真得弄点盔甲了。",
      "an": "https://english.example.com/audio/ep/ep-video-firstnight-2/s028-n-5d8d66.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-firstnight-2/s028-s-bad81f.mp3"
    },
    {
      "s": "s029",
      "e": "ep-video-firstnight-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "Let's place a torch.",
      "zh": "我们放一个火把吧。",
      "an": "https://english.example.com/audio/ep/ep-video-firstnight-2/s029-n-1d76ee.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-firstnight-2/s029-s-e329ac.mp3"
    },
    {
      "s": "s030",
      "e": "ep-video-firstnight-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "Let's eat some of this cooked mutton.",
      "zh": "我们吃点烤羊肉吧。",
      "an": "https://english.example.com/audio/ep/ep-video-firstnight-2/s030-n-5269b2.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-firstnight-2/s030-s-338892.mp3"
    },
    {
      "s": "s031",
      "e": "ep-video-firstnight-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "Now I'll start healing.",
      "zh": "现在开始回血。",
      "an": "https://english.example.com/audio/ep/ep-video-firstnight-2/s031-n-ad1bde.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-firstnight-2/s031-s-0e6035.mp3"
    },
    {
      "s": "s032",
      "e": "ep-video-firstnight-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "What was that sound?",
      "zh": "那是什么声音？",
      "an": "https://english.example.com/audio/ep/ep-video-firstnight-2/s032-n-58c550.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-firstnight-2/s032-s-df1d36.mp3"
    },
    {
      "s": "s033",
      "e": "ep-video-firstnight-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "With five iron, I'm going to build a helmet.",
      "zh": "用五块铁，我要做一个头盔。",
      "an": "https://english.example.com/audio/ep/ep-video-firstnight-2/s033-n-cd98da.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-firstnight-2/s033-s-d8ca58.mp3"
    },
    {
      "s": "s034",
      "e": "ep-video-firstnight-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "One, two, three, four, five.",
      "zh": "一、二、三、四、五。",
      "an": "https://english.example.com/audio/ep/ep-video-firstnight-2/s034-n-b4dbe6.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-firstnight-2/s034-s-030d3b.mp3"
    },
    {
      "s": "s035",
      "e": "ep-video-firstnight-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "I built an iron helmet.",
      "zh": "我做好了一个铁头盔。",
      "an": "https://english.example.com/audio/ep/ep-video-firstnight-2/s035-n-70c7ad.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-firstnight-2/s035-s-054697.mp3"
    },
    {
      "s": "s036",
      "e": "ep-video-firstnight-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "And let's put it on.",
      "zh": "我们把它戴上吧。",
      "an": "https://english.example.com/audio/ep/ep-video-firstnight-2/s036-n-bdb330.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-firstnight-2/s036-s-1058bf.mp3"
    },
    {
      "s": "s037",
      "e": "ep-video-firstnight-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "Now I have one armor.",
      "zh": "现在我有一件盔甲了。",
      "an": "https://english.example.com/audio/ep/ep-video-firstnight-2/s037-n-2c3965.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-firstnight-2/s037-s-ded7d0.mp3"
    },
    {
      "s": "s038",
      "e": "ep-video-firstnight-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "I'm going to continue exploring now that I've healed.",
      "zh": "血回好了，我要继续探索。",
      "an": "https://english.example.com/audio/ep/ep-video-firstnight-2/s038-n-0ddec3.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-firstnight-2/s038-s-9ece83.mp3"
    },
    {
      "s": "s039",
      "e": "ep-video-firstnight-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "More iron.",
      "zh": "又有铁。",
      "an": "https://english.example.com/audio/ep/ep-video-firstnight-2/s039-n-539666.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-firstnight-2/s039-s-c6e02f.mp3"
    },
    {
      "s": "s040",
      "e": "ep-video-firstnight-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "Awesome.",
      "zh": "太棒了。",
      "an": "https://english.example.com/audio/ep/ep-video-firstnight-2/s040-n-32aa10.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-firstnight-2/s040-s-329879.mp3"
    },
    {
      "s": "s041",
      "e": "ep-video-firstnight-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "Let's collect this iron.",
      "zh": "我们把这些铁收起来吧。",
      "an": "https://english.example.com/audio/ep/ep-video-firstnight-2/s041-n-992550.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-firstnight-2/s041-s-e62a9d.mp3"
    },
    {
      "s": "s042",
      "e": "ep-video-firstnight-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "Whoa, water!",
      "zh": "哇，有水！",
      "an": "https://english.example.com/audio/ep/ep-video-firstnight-2/s042-n-cc6215.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-firstnight-2/s042-s-544070.mp3"
    },
    {
      "s": "s043",
      "e": "ep-video-firstnight-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "I'm going to place a wood plank right here to stop the water.",
      "zh": "我在这里放一块木板，把水挡住。",
      "an": "https://english.example.com/audio/ep/ep-video-firstnight-2/s043-n-d235d0.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-firstnight-2/s043-s-293ee5.mp3"
    },
    {
      "s": "s044",
      "e": "ep-video-firstnight-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "And let's collect some of this copper.",
      "zh": "我们再收集一些铜吧。",
      "an": "https://english.example.com/audio/ep/ep-video-firstnight-2/s044-n-cb9e99.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-firstnight-2/s044-s-74f3f3.mp3"
    },
    {
      "s": "s045",
      "e": "ep-video-firstnight-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "It's been a long time since I've played Minecraft.",
      "zh": "我很久没玩《我的世界》了。",
      "an": "https://english.example.com/audio/ep/ep-video-firstnight-2/s045-n-97c494.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-firstnight-2/s045-s-46a115.mp3"
    },
    {
      "s": "s046",
      "e": "ep-video-firstnight-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "And there's a lot more that you can build with copper now.",
      "zh": "现在用铜能做的东西多了很多。",
      "an": "https://english.example.com/audio/ep/ep-video-firstnight-2/s046-n-e88626.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-firstnight-2/s046-s-5a6f1d.mp3"
    },
    {
      "s": "s047",
      "e": "ep-video-firstnight-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "I'm out of torches.",
      "zh": "我的火把用完了。",
      "an": "https://english.example.com/audio/ep/ep-video-firstnight-2/s047-n-475f26.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-firstnight-2/s047-s-6ddbb3.mp3"
    },
    {
      "s": "s048",
      "e": "ep-video-firstnight-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "I have eight more torches.",
      "zh": "我又多了八个火把。",
      "an": "https://english.example.com/audio/ep/ep-video-firstnight-2/s048-n-4c731f.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-firstnight-2/s048-s-61ecbc.mp3"
    },
    {
      "s": "s049",
      "e": "ep-video-firstnight-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "Wow, I'm finding a lot of iron.",
      "zh": "哇，我找到好多铁。",
      "an": "https://english.example.com/audio/ep/ep-video-firstnight-2/s049-n-b09002.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-firstnight-2/s049-s-22bd94.mp3"
    },
    {
      "s": "s050",
      "e": "ep-video-firstnight-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "My pickaxe broke and now I have 19 iron.",
      "zh": "我的镐子坏了，现在有 19 块铁。",
      "an": "https://english.example.com/audio/ep/ep-video-firstnight-2/s050-n-9e5e9e.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-firstnight-2/s050-s-5747bc.mp3"
    },
    {
      "s": "s051",
      "e": "ep-video-firstnight-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "Okay, let's go back up to the surface.",
      "zh": "好，我们回到地面上去吧。",
      "an": "https://english.example.com/audio/ep/ep-video-firstnight-2/s051-n-24dad5.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-firstnight-2/s051-s-0e5b06.mp3"
    },
    {
      "s": "s052",
      "e": "ep-video-firstnight-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "It's daytime.",
      "zh": "现在是白天。",
      "an": "https://english.example.com/audio/ep/ep-video-firstnight-2/s052-n-45096a.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-firstnight-2/s052-s-21ce3a.mp3"
    },
    {
      "s": "s053",
      "e": "ep-video-firstnight-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "I need to eat.",
      "zh": "我得吃点东西。",
      "an": "https://english.example.com/audio/ep/ep-video-firstnight-2/s053-n-b81846.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-firstnight-2/s053-s-8f7d77.mp3"
    },
    {
      "s": "s054",
      "e": "ep-video-firstnight-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "Let's eat this cooked mutton.",
      "zh": "我们来吃这块烤羊肉吧。",
      "an": "https://english.example.com/audio/ep/ep-video-firstnight-2/s054-n-b02b8a.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-firstnight-2/s054-s-c15094.mp3"
    },
    {
      "s": "s055",
      "e": "ep-video-firstnight-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "I'm going to build a little tower with this cobblestone.",
      "zh": "我要用圆石搭一座小塔。",
      "an": "https://english.example.com/audio/ep/ep-video-firstnight-2/s055-n-7bd876.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-firstnight-2/s055-s-50cffd.mp3"
    },
    {
      "s": "s056",
      "e": "ep-video-firstnight-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "And on top, I'll place a torch.",
      "zh": "在塔顶放一个火把。",
      "an": "https://english.example.com/audio/ep/ep-video-firstnight-2/s056-n-9f14cf.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-firstnight-2/s056-s-ddbbda.mp3"
    },
    {
      "s": "s057",
      "e": "ep-video-firstnight-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "That way I can find my home.",
      "zh": "这样我就能找到家了。",
      "an": "https://english.example.com/audio/ep/ep-video-firstnight-2/s057-n-127023.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-firstnight-2/s057-s-be4790.mp3"
    },
    {
      "s": "s058",
      "e": "ep-video-firstnight-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "And I'm going to end this first episode right here.",
      "zh": "这个系列的第一集就到这里结束啦。",
      "an": "https://english.example.com/audio/ep/ep-video-firstnight-2/s058-n-8605a8.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-firstnight-2/s058-s-6d0745.mp3"
    },
    {
      "s": "s001",
      "e": "ep-video-makingfriends-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "Hello and welcome back to Learning English with Minecraft.",
      "zh": "大家好，欢迎回到“用《我的世界》学英语”。",
      "an": "https://english.example.com/audio/ep/ep-video-makingfriends-1/s001-n-e6a7e0.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-makingfriends-1/s001-s-fe08ac.mp3"
    },
    {
      "s": "s002",
      "e": "ep-video-makingfriends-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "My name is Kenzo.",
      "zh": "我叫 Kenzo。",
      "an": "https://english.example.com/audio/ep/ep-video-makingfriends-1/s002-n-54da58.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-makingfriends-1/s002-s-f8ae32.mp3"
    },
    {
      "s": "s003",
      "e": "ep-video-makingfriends-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "And in this series I teach English while playing Minecraft.",
      "zh": "在这个系列里，我一边玩《我的世界》一边教英语。",
      "an": "https://english.example.com/audio/ep/ep-video-makingfriends-1/s003-n-928f13.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-makingfriends-1/s003-s-7b7277.mp3"
    },
    {
      "s": "s004",
      "e": "ep-video-makingfriends-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "And it looks like there's a zombie in our garden right here.",
      "zh": "看起来我们的菜园里有一只僵尸，就在这儿。",
      "an": "https://english.example.com/audio/ep/ep-video-makingfriends-1/s004-n-931415.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-makingfriends-1/s004-s-3f9de9.mp3"
    },
    {
      "s": "s005",
      "e": "ep-video-makingfriends-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "Get out of my garden!",
      "zh": "从我的菜园里出去！",
      "an": "https://english.example.com/audio/ep/ep-video-makingfriends-1/s005-n-a1b37a.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-makingfriends-1/s005-s-09f86d.mp3"
    },
    {
      "s": "s006",
      "e": "ep-video-makingfriends-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "So I respawned in the village.",
      "zh": "所以我在村庄里重生了。",
      "an": "https://english.example.com/audio/ep/ep-video-makingfriends-1/s006-n-02c530.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-makingfriends-1/s006-s-4b7cd1.mp3"
    },
    {
      "s": "s007",
      "e": "ep-video-makingfriends-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "And I had to find my way back home.",
      "zh": "然后我得自己找路回家。",
      "an": "https://english.example.com/audio/ep/ep-video-makingfriends-1/s007-n-0c957e.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-makingfriends-1/s007-s-4da485.mp3"
    },
    {
      "s": "s008",
      "e": "ep-video-makingfriends-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "Well, I built some new tools and re-equipped myself.",
      "zh": "嗯，我做了一些新工具，重新装备好了自己。",
      "an": "https://english.example.com/audio/ep/ep-video-makingfriends-1/s008-n-abaaff.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-makingfriends-1/s008-s-1fb376.mp3"
    },
    {
      "s": "s009",
      "e": "ep-video-makingfriends-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "After dying in the last episode, I felt a little bit defeated.",
      "zh": "上一集死掉以后，我有点儿泄气。",
      "an": "https://english.example.com/audio/ep/ep-video-makingfriends-1/s009-n-a29fd9.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-makingfriends-1/s009-s-4d031d.mp3"
    },
    {
      "s": "s010",
      "e": "ep-video-makingfriends-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "And I don't really want to go back underground and search for diamonds again.",
      "zh": "我不太想再回到地下去找钻石了。",
      "an": "https://english.example.com/audio/ep/ep-video-makingfriends-1/s010-n-a9a16e.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-makingfriends-1/s010-s-4ef8d8.mp3"
    },
    {
      "s": "s011",
      "e": "ep-video-makingfriends-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "I built this house all by myself.",
      "zh": "这座房子是我一个人建的。",
      "an": "https://english.example.com/audio/ep/ep-video-makingfriends-1/s011-n-a5e614.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-makingfriends-1/s011-s-a8e7fd.mp3"
    },
    {
      "s": "s012",
      "e": "ep-video-makingfriends-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "I've had to do everything all by myself.",
      "zh": "什么事都得我一个人做。",
      "an": "https://english.example.com/audio/ep/ep-video-makingfriends-1/s012-n-2708b7.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-makingfriends-1/s012-s-3f718b.mp3"
    },
    {
      "s": "s013",
      "e": "ep-video-makingfriends-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "So in this video, I am going on a quest to find a companion.",
      "zh": "所以这一集，我要去冒险找一个伙伴。",
      "an": "https://english.example.com/audio/ep/ep-video-makingfriends-1/s013-n-34c67b.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-makingfriends-1/s013-s-14b114.mp3"
    },
    {
      "s": "s014",
      "e": "ep-video-makingfriends-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "I'm going to find something to befriend.",
      "zh": "我要找一个能交朋友的小伙伴。",
      "an": "https://english.example.com/audio/ep/ep-video-makingfriends-1/s014-n-a1657d.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-makingfriends-1/s014-s-0f7b55.mp3"
    },
    {
      "s": "s015",
      "e": "ep-video-makingfriends-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "Let's see what I have that I could give to an animal.",
      "zh": "我们看看我有什么可以送给动物的吧。",
      "an": "https://english.example.com/audio/ep/ep-video-makingfriends-1/s015-n-258686.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-makingfriends-1/s015-s-96a6bc.mp3"
    },
    {
      "s": "s016",
      "e": "ep-video-makingfriends-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "I have some wheat.",
      "zh": "我有一些小麦。",
      "an": "https://english.example.com/audio/ep/ep-video-makingfriends-1/s016-n-3039ac.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-makingfriends-1/s016-s-9daa8e.mp3"
    },
    {
      "s": "s017",
      "e": "ep-video-makingfriends-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "I think that sheep like wheat.",
      "zh": "我觉得羊喜欢吃小麦。",
      "an": "https://english.example.com/audio/ep/ep-video-makingfriends-1/s017-n-5a134a.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-makingfriends-1/s017-s-5d9e0a.mp3"
    },
    {
      "s": "s018",
      "e": "ep-video-makingfriends-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "I have a seed which I could give to a chicken.",
      "zh": "我有种子，可以给鸡吃。",
      "an": "https://english.example.com/audio/ep/ep-video-makingfriends-1/s018-n-b85743.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-makingfriends-1/s018-s-097533.mp3"
    },
    {
      "s": "s019",
      "e": "ep-video-makingfriends-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "I don't have any bones.",
      "zh": "我没有骨头。",
      "an": "https://english.example.com/audio/ep/ep-video-makingfriends-1/s019-n-f2f7b4.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-makingfriends-1/s019-s-fc72af.mp3"
    },
    {
      "s": "s020",
      "e": "ep-video-makingfriends-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "Dogs like bones, but I don't have any.",
      "zh": "狗喜欢骨头，可是我一根也没有。",
      "an": "https://english.example.com/audio/ep/ep-video-makingfriends-1/s020-n-1a7b39.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-makingfriends-1/s020-s-e7f314.mp3"
    },
    {
      "s": "s021",
      "e": "ep-video-makingfriends-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "I have carrots as well.",
      "zh": "我还有胡萝卜。",
      "an": "https://english.example.com/audio/ep/ep-video-makingfriends-1/s021-n-dc8eb9.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-makingfriends-1/s021-s-868835.mp3"
    },
    {
      "s": "s022",
      "e": "ep-video-makingfriends-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "I think that pigs like carrots.",
      "zh": "我觉得猪喜欢胡萝卜。",
      "an": "https://english.example.com/audio/ep/ep-video-makingfriends-1/s022-n-847759.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-makingfriends-1/s022-s-d494de.mp3"
    },
    {
      "s": "s023",
      "e": "ep-video-makingfriends-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "Let's go search for a companion.",
      "zh": "我们去找伙伴吧。",
      "an": "https://english.example.com/audio/ep/ep-video-makingfriends-1/s023-n-f59296.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-makingfriends-1/s023-s-17061f.mp3"
    },
    {
      "s": "s024",
      "e": "ep-video-makingfriends-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "Are there any fish down here?",
      "zh": "这下面有鱼吗？",
      "an": "https://english.example.com/audio/ep/ep-video-makingfriends-1/s024-n-dbfd2f.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-makingfriends-1/s024-s-f6f2dd.mp3"
    },
    {
      "s": "s025",
      "e": "ep-video-makingfriends-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "Oh no, I'm almost dead.",
      "zh": "哎呀，我快没血了。",
      "an": "https://english.example.com/audio/ep/ep-video-makingfriends-1/s025-n-db6b8b.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-makingfriends-1/s025-s-80d8f5.mp3"
    },
    {
      "s": "s026",
      "e": "ep-video-makingfriends-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "I forgot to eat food.",
      "zh": "我忘了吃东西。",
      "an": "https://english.example.com/audio/ep/ep-video-makingfriends-1/s026-n-b095c6.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-makingfriends-1/s026-s-3c7b0e.mp3"
    },
    {
      "s": "s027",
      "e": "ep-video-makingfriends-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "When there are a lot of little fish together, we call them a school of fish.",
      "zh": "很多小鱼聚在一起，我们叫它“鱼群”（a school of fish）。",
      "an": "https://english.example.com/audio/ep/ep-video-makingfriends-1/s027-n-c80cde.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-makingfriends-1/s027-s-0be353.mp3"
    },
    {
      "s": "s028",
      "e": "ep-video-makingfriends-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "There are some bunnies.",
      "zh": "那里有几只小兔子。",
      "an": "https://english.example.com/audio/ep/ep-video-makingfriends-1/s028-n-9bc374.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-makingfriends-1/s028-s-413c87.mp3"
    },
    {
      "s": "s029",
      "e": "ep-video-makingfriends-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "Are there any animals here that want to be my friend?",
      "zh": "这里有没有动物想做我的朋友？",
      "an": "https://english.example.com/audio/ep/ep-video-makingfriends-1/s029-n-709668.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-makingfriends-1/s029-s-627a51.mp3"
    },
    {
      "s": "s030",
      "e": "ep-video-makingfriends-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "There's a horse.",
      "zh": "那儿有一匹马。",
      "an": "https://english.example.com/audio/ep/ep-video-makingfriends-1/s030-n-463dbd.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-makingfriends-1/s030-s-b0c507.mp3"
    },
    {
      "s": "s031",
      "e": "ep-video-makingfriends-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "I think that horses like apples.",
      "zh": "我觉得马喜欢苹果。",
      "an": "https://english.example.com/audio/ep/ep-video-makingfriends-1/s031-n-54291c.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-makingfriends-1/s031-s-e9c794.mp3"
    },
    {
      "s": "s032",
      "e": "ep-video-makingfriends-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "And right now I don't have any apples.",
      "zh": "可我现在一个苹果也没有。",
      "an": "https://english.example.com/audio/ep/ep-video-makingfriends-1/s032-n-880d41.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-makingfriends-1/s032-s-df70d6.mp3"
    },
    {
      "s": "s033",
      "e": "ep-video-makingfriends-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "Hello, chicken.",
      "zh": "你好，小鸡。",
      "an": "https://english.example.com/audio/ep/ep-video-makingfriends-1/s033-n-b65a65.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-makingfriends-1/s033-s-a9364d.mp3"
    },
    {
      "s": "s034",
      "e": "ep-video-makingfriends-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "Do you want to be my friend?",
      "zh": "你想做我的朋友吗？",
      "an": "https://english.example.com/audio/ep/ep-video-makingfriends-1/s034-n-7d0215.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-makingfriends-1/s034-s-5f9c19.mp3"
    },
    {
      "s": "s035",
      "e": "ep-video-makingfriends-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "I'm going to give him some seeds.",
      "zh": "我要给它一些种子。",
      "an": "https://english.example.com/audio/ep/ep-video-makingfriends-1/s035-n-769a0c.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-makingfriends-1/s035-s-c582fc.mp3"
    },
    {
      "s": "s036",
      "e": "ep-video-makingfriends-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "Here you go.",
      "zh": "给你。",
      "an": "https://english.example.com/audio/ep/ep-video-makingfriends-1/s036-n-9c1949.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-makingfriends-1/s036-s-c015c5.mp3"
    },
    {
      "s": "s037",
      "e": "ep-video-makingfriends-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "And now he loves me.",
      "zh": "现在它可喜欢我啦。",
      "an": "https://english.example.com/audio/ep/ep-video-makingfriends-1/s037-n-82c3de.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-makingfriends-1/s037-s-51b44c.mp3"
    },
    {
      "s": "s038",
      "e": "ep-video-makingfriends-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "We're buddies.",
      "zh": "我们是好朋友了。",
      "an": "https://english.example.com/audio/ep/ep-video-makingfriends-1/s038-n-6134d2.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-makingfriends-1/s038-s-e6217b.mp3"
    },
    {
      "s": "s039",
      "e": "ep-video-makingfriends-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "I'm going to take Egbert back home.",
      "zh": "我要带 Egbert 回家。",
      "an": "https://english.example.com/audio/ep/ep-video-makingfriends-1/s039-n-cc5919.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-makingfriends-1/s039-s-eb39fc.mp3"
    },
    {
      "s": "s040",
      "e": "ep-video-makingfriends-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "I'm a little bit lost.",
      "zh": "我有点儿迷路了。",
      "an": "https://english.example.com/audio/ep/ep-video-makingfriends-1/s040-n-1a7c6a.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-makingfriends-1/s040-s-cb9946.mp3"
    },
    {
      "s": "s041",
      "e": "ep-video-makingfriends-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "I think this way.",
      "zh": "我觉得是这边。",
      "an": "https://english.example.com/audio/ep/ep-video-makingfriends-1/s041-n-40fba7.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-makingfriends-1/s041-s-09f489.mp3"
    },
    {
      "s": "s042",
      "e": "ep-video-makingfriends-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "No, this way.",
      "zh": "不对，是这边。",
      "an": "https://english.example.com/audio/ep/ep-video-makingfriends-1/s042-n-f7b479.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-makingfriends-1/s042-s-40ea4e.mp3"
    },
    {
      "s": "s043",
      "e": "ep-video-makingfriends-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "I'm taking Egbert back to the house with me.",
      "zh": "我要带 Egbert 一起回家。",
      "an": "https://english.example.com/audio/ep/ep-video-makingfriends-1/s043-n-08091e.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-makingfriends-1/s043-s-dd3d82.mp3"
    },
    {
      "s": "s044",
      "e": "ep-video-makingfriends-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "Egbert is a little bit slow, but it's okay.",
      "zh": "Egbert 有点儿慢，不过没关系。",
      "an": "https://english.example.com/audio/ep/ep-video-makingfriends-1/s044-n-15cc0d.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-makingfriends-1/s044-s-8c5216.mp3"
    },
    {
      "s": "s045",
      "e": "ep-video-makingfriends-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "Almost there.",
      "zh": "快到了。",
      "an": "https://english.example.com/audio/ep/ep-video-makingfriends-1/s045-n-fa1a0b.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-makingfriends-1/s045-s-4c8a59.mp3"
    },
    {
      "s": "s046",
      "e": "ep-video-makingfriends-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "This is where I live.",
      "zh": "这就是我住的地方。",
      "an": "https://english.example.com/audio/ep/ep-video-makingfriends-1/s046-n-e64b80.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-makingfriends-1/s046-s-1ec7d8.mp3"
    },
    {
      "s": "s047",
      "e": "ep-video-makingfriends-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "That house is where I am taking you.",
      "zh": "我要带你去的就是那座房子。",
      "an": "https://english.example.com/audio/ep/ep-video-makingfriends-1/s047-n-10d7bf.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-makingfriends-1/s047-s-28f679.mp3"
    },
    {
      "s": "s048",
      "e": "ep-video-makingfriends-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "Egbert is swimming.",
      "zh": "Egbert 在游泳。",
      "an": "https://english.example.com/audio/ep/ep-video-makingfriends-1/s048-n-082682.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-makingfriends-1/s048-s-9933a7.mp3"
    },
    {
      "s": "s049",
      "e": "ep-video-makingfriends-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "He's flapping his wings.",
      "zh": "它在扑腾翅膀。",
      "an": "https://english.example.com/audio/ep/ep-video-makingfriends-1/s049-n-aa9157.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-makingfriends-1/s049-s-9d559d.mp3"
    },
    {
      "s": "s050",
      "e": "ep-video-makingfriends-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "Egbert swims really slow.",
      "zh": "Egbert 游得好慢。",
      "an": "https://english.example.com/audio/ep/ep-video-makingfriends-1/s050-n-e99810.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-makingfriends-1/s050-s-78ab0e.mp3"
    },
    {
      "s": "s051",
      "e": "ep-video-makingfriends-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "You can do it, Egbert!",
      "zh": "你能行的，Egbert！",
      "an": "https://english.example.com/audio/ep/ep-video-makingfriends-1/s051-n-24344a.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-makingfriends-1/s051-s-70ffa6.mp3"
    },
    {
      "s": "s001",
      "e": "ep-video-makingfriends-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "There's a zombie down there in the river.",
      "zh": "下面河里有一只僵尸。",
      "an": "https://english.example.com/audio/ep/ep-video-makingfriends-2/s001-n-dff1de.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-makingfriends-2/s001-s-ab6232.mp3"
    },
    {
      "s": "s002",
      "e": "ep-video-makingfriends-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "He's holding a trident.",
      "zh": "它拿着一把三叉戟。",
      "an": "https://english.example.com/audio/ep/ep-video-makingfriends-2/s002-n-2effc1.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-makingfriends-2/s002-s-7f39a1.mp3"
    },
    {
      "s": "s003",
      "e": "ep-video-makingfriends-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "Egbert is all by himself out there.",
      "zh": "Egbert 一个人在外面。",
      "an": "https://english.example.com/audio/ep/ep-video-makingfriends-2/s003-n-5e9ee8.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-makingfriends-2/s003-s-d597c4.mp3"
    },
    {
      "s": "s004",
      "e": "ep-video-makingfriends-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "Okay, I'm going to kill the zombie.",
      "zh": "好，我去把僵尸干掉。",
      "an": "https://english.example.com/audio/ep/ep-video-makingfriends-2/s004-n-c7f180.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-makingfriends-2/s004-s-8ac0cc.mp3"
    },
    {
      "s": "s005",
      "e": "ep-video-makingfriends-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "I did it!",
      "zh": "我做到了！",
      "an": "https://english.example.com/audio/ep/ep-video-makingfriends-2/s005-n-78fa66.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-makingfriends-2/s005-s-16fd00.mp3"
    },
    {
      "s": "s006",
      "e": "ep-video-makingfriends-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "Egbert, it's safe now. Let's go!",
      "zh": "Egbert，现在安全了。我们走！",
      "an": "https://english.example.com/audio/ep/ep-video-makingfriends-2/s006-n-ff77f0.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-makingfriends-2/s006-s-f49317.mp3"
    },
    {
      "s": "s007",
      "e": "ep-video-makingfriends-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "I got an egg. All right, let's go!",
      "zh": "我拿到一个鸡蛋。好，我们走！",
      "an": "https://english.example.com/audio/ep/ep-video-makingfriends-2/s007-n-be1c64.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-makingfriends-2/s007-s-4c027b.mp3"
    },
    {
      "s": "s008",
      "e": "ep-video-makingfriends-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "Egbert! Yay!",
      "zh": "Egbert！耶！",
      "an": "https://english.example.com/audio/ep/ep-video-makingfriends-2/s008-n-d6ce19.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-makingfriends-2/s008-s-e643bb.mp3"
    },
    {
      "s": "s009",
      "e": "ep-video-makingfriends-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "Egbert is here.",
      "zh": "Egbert 到了。",
      "an": "https://english.example.com/audio/ep/ep-video-makingfriends-2/s009-n-ff8ab7.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-makingfriends-2/s009-s-4711f2.mp3"
    },
    {
      "s": "s010",
      "e": "ep-video-makingfriends-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "I'm going to close the doors.",
      "zh": "我要把门关上。",
      "an": "https://english.example.com/audio/ep/ep-video-makingfriends-2/s010-n-1c5c52.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-makingfriends-2/s010-s-c77e4e.mp3"
    },
    {
      "s": "s011",
      "e": "ep-video-makingfriends-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "There you go.",
      "zh": "好了。",
      "an": "https://english.example.com/audio/ep/ep-video-makingfriends-2/s011-n-733a1d.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-makingfriends-2/s011-s-07fde2.mp3"
    },
    {
      "s": "s012",
      "e": "ep-video-makingfriends-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "All right, Egbert. Welcome to the house!",
      "zh": "好了，Egbert。欢迎回家！",
      "an": "https://english.example.com/audio/ep/ep-video-makingfriends-2/s012-n-0c51f7.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-makingfriends-2/s012-s-c40af1.mp3"
    },
    {
      "s": "s013",
      "e": "ep-video-makingfriends-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "So I have two name tags.",
      "zh": "所以我有两个命名牌。",
      "an": "https://english.example.com/audio/ep/ep-video-makingfriends-2/s013-n-45ebe2.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-makingfriends-2/s013-s-3e01df.mp3"
    },
    {
      "s": "s014",
      "e": "ep-video-makingfriends-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "These name tags can be used to name things like Egbert.",
      "zh": "这些命名牌可以用来给东西起名，比如给 Egbert 起名。",
      "an": "https://english.example.com/audio/ep/ep-video-makingfriends-2/s014-n-0b45fe.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-makingfriends-2/s014-s-cc8609.mp3"
    },
    {
      "s": "s015",
      "e": "ep-video-makingfriends-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "I want to use one of these name tags to name Egbert.",
      "zh": "我想用其中一个命名牌给 Egbert 起名。",
      "an": "https://english.example.com/audio/ep/ep-video-makingfriends-2/s015-n-1b5f26.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-makingfriends-2/s015-s-4d4375.mp3"
    },
    {
      "s": "s016",
      "e": "ep-video-makingfriends-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "But in order to use a name tag, first I need an anvil.",
      "zh": "可是要用命名牌，我得先有一个铁砧。",
      "an": "https://english.example.com/audio/ep/ep-video-makingfriends-2/s016-n-72228e.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-makingfriends-2/s016-s-1efaf3.mp3"
    },
    {
      "s": "s017",
      "e": "ep-video-makingfriends-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "And to build an anvil, I need a lot of iron.",
      "zh": "要做铁砧，我需要很多铁。",
      "an": "https://english.example.com/audio/ep/ep-video-makingfriends-2/s017-n-999709.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-makingfriends-2/s017-s-59a048.mp3"
    },
    {
      "s": "s018",
      "e": "ep-video-makingfriends-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "Let's see how much iron I have now.",
      "zh": "我们看看我现在有多少铁。",
      "an": "https://english.example.com/audio/ep/ep-video-makingfriends-2/s018-n-683382.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-makingfriends-2/s018-s-4a32ca.mp3"
    },
    {
      "s": "s019",
      "e": "ep-video-makingfriends-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "I have 30 iron.",
      "zh": "我有 30 个铁。",
      "an": "https://english.example.com/audio/ep/ep-video-makingfriends-2/s019-n-8c28b7.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-makingfriends-2/s019-s-972156.mp3"
    },
    {
      "s": "s020",
      "e": "ep-video-makingfriends-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "I don't know if 30 iron is enough or not.",
      "zh": "我不知道 30 个铁够不够。",
      "an": "https://english.example.com/audio/ep/ep-video-makingfriends-2/s020-n-c223c7.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-makingfriends-2/s020-s-a12db4.mp3"
    },
    {
      "s": "s021",
      "e": "ep-video-makingfriends-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "I'll need three iron blocks in order to build an anvil.",
      "zh": "我需要三块铁块才能做铁砧。",
      "an": "https://english.example.com/audio/ep/ep-video-makingfriends-2/s021-n-2c291d.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-makingfriends-2/s021-s-9548e3.mp3"
    },
    {
      "s": "s022",
      "e": "ep-video-makingfriends-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "Each block of iron takes nine iron ingots.",
      "zh": "每一块铁块要用九个铁锭。",
      "an": "https://english.example.com/audio/ep/ep-video-makingfriends-2/s022-n-a33e58.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-makingfriends-2/s022-s-9a66f3.mp3"
    },
    {
      "s": "s023",
      "e": "ep-video-makingfriends-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "I am one iron ingot short.",
      "zh": "我还差一个铁锭。",
      "an": "https://english.example.com/audio/ep/ep-video-makingfriends-2/s023-n-cd9d53.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-makingfriends-2/s023-s-903586.mp3"
    },
    {
      "s": "s024",
      "e": "ep-video-makingfriends-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "I just need one more iron ingot to put right here.",
      "zh": "我只差再放一个铁锭在这里。",
      "an": "https://english.example.com/audio/ep/ep-video-makingfriends-2/s024-n-40cdf5.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-makingfriends-2/s024-s-bdfdcf.mp3"
    },
    {
      "s": "s025",
      "e": "ep-video-makingfriends-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "One short.",
      "zh": "就差一个。",
      "an": "https://english.example.com/audio/ep/ep-video-makingfriends-2/s025-n-ef19c1.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-makingfriends-2/s025-s-783b41.mp3"
    },
    {
      "s": "s026",
      "e": "ep-video-makingfriends-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "I guess right now I'm going to sleep, and in the morning I'll go get one iron ingot somewhere.",
      "zh": "我想我先睡觉，早上再去找一个铁锭。",
      "an": "https://english.example.com/audio/ep/ep-video-makingfriends-2/s026-n-948188.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-makingfriends-2/s026-s-180a8f.mp3"
    },
    {
      "s": "s027",
      "e": "ep-video-makingfriends-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "So for now I'm going to sleep. All right, see you later, Egbert!",
      "zh": "那我先睡了。好，回头见，Egbert！",
      "an": "https://english.example.com/audio/ep/ep-video-makingfriends-2/s027-n-dc9a2a.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-makingfriends-2/s027-s-b68a82.mp3"
    },
    {
      "s": "s028",
      "e": "ep-video-makingfriends-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "I'm going to look for iron. See you later!",
      "zh": "我去找铁。回头见！",
      "an": "https://english.example.com/audio/ep/ep-video-makingfriends-2/s028-n-75f6e6.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-makingfriends-2/s028-s-e11773.mp3"
    },
    {
      "s": "s029",
      "e": "ep-video-makingfriends-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "It's time to find one block of iron.",
      "zh": "该去找一块铁了。",
      "an": "https://english.example.com/audio/ep/ep-video-makingfriends-2/s029-n-c5f898.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-makingfriends-2/s029-s-58cd6c.mp3"
    },
    {
      "s": "s030",
      "e": "ep-video-makingfriends-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "I'm just going to go down here.",
      "zh": "我就往下面走。",
      "an": "https://english.example.com/audio/ep/ep-video-makingfriends-2/s030-n-4b187e.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-makingfriends-2/s030-s-d012fb.mp3"
    },
    {
      "s": "s031",
      "e": "ep-video-makingfriends-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "I think that I will definitely find some iron down here.",
      "zh": "我觉得下面肯定能找到铁。",
      "an": "https://english.example.com/audio/ep/ep-video-makingfriends-2/s031-n-daab5b.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-makingfriends-2/s031-s-f46e52.mp3"
    },
    {
      "s": "s032",
      "e": "ep-video-makingfriends-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "I'm going to continue digging this staircase all the way to the bottom of the world.",
      "zh": "我要继续挖这个楼梯，一直挖到世界底部。",
      "an": "https://english.example.com/audio/ep/ep-video-makingfriends-2/s032-n-e59c3a.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-makingfriends-2/s032-s-af759b.mp3"
    },
    {
      "s": "s033",
      "e": "ep-video-makingfriends-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "And maybe along the way I'll find some iron to finish building my anvil.",
      "zh": "也许一路上能找到铁，好把铁砧做完。",
      "an": "https://english.example.com/audio/ep/ep-video-makingfriends-2/s033-n-b92f93.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-makingfriends-2/s033-s-1e71b2.mp3"
    },
    {
      "s": "s034",
      "e": "ep-video-makingfriends-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "This is bedrock.",
      "zh": "这是基岩。",
      "an": "https://english.example.com/audio/ep/ep-video-makingfriends-2/s034-n-a408fb.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-makingfriends-2/s034-s-16ad0b.mp3"
    },
    {
      "s": "s035",
      "e": "ep-video-makingfriends-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "And bedrock is at the very bottom of the world.",
      "zh": "基岩在世界的最底层。",
      "an": "https://english.example.com/audio/ep/ep-video-makingfriends-2/s035-n-61678a.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-makingfriends-2/s035-s-a9cc4a.mp3"
    },
    {
      "s": "s036",
      "e": "ep-video-makingfriends-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "So that means I am at the bottom of the world.",
      "zh": "所以这说明我到了世界底部。",
      "an": "https://english.example.com/audio/ep/ep-video-makingfriends-2/s036-n-9e9d45.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-makingfriends-2/s036-s-6e721e.mp3"
    },
    {
      "s": "s037",
      "e": "ep-video-makingfriends-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "I can't go down any further.",
      "zh": "我不能再往下挖了。",
      "an": "https://english.example.com/audio/ep/ep-video-makingfriends-2/s037-n-09ff8a.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-makingfriends-2/s037-s-944b38.mp3"
    },
    {
      "s": "s038",
      "e": "ep-video-makingfriends-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "I'm going to dig a tunnel this way.",
      "zh": "我要往这边挖一条隧道。",
      "an": "https://english.example.com/audio/ep/ep-video-makingfriends-2/s038-n-4f325c.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-makingfriends-2/s038-s-b93459.mp3"
    },
    {
      "s": "s039",
      "e": "ep-video-makingfriends-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "I haven't seen any iron. I think I might be too deep to find iron.",
      "zh": "我还没看到铁。我觉得可能挖得太深了，找不到铁。",
      "an": "https://english.example.com/audio/ep/ep-video-makingfriends-2/s039-n-f7dd6b.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-makingfriends-2/s039-s-bfde42.mp3"
    },
    {
      "s": "s040",
      "e": "ep-video-makingfriends-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "I'm going to go back up a little bit.",
      "zh": "我要往上退一点。",
      "an": "https://english.example.com/audio/ep/ep-video-makingfriends-2/s040-n-a875d2.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-makingfriends-2/s040-s-e6a5a4.mp3"
    },
    {
      "s": "s041",
      "e": "ep-video-makingfriends-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "I've been here several times now, and I know that I've seen iron here.",
      "zh": "我来过这里好几次了，我知道这里见过铁。",
      "an": "https://english.example.com/audio/ep/ep-video-makingfriends-2/s041-n-8615c2.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-makingfriends-2/s041-s-97466d.mp3"
    },
    {
      "s": "s042",
      "e": "ep-video-makingfriends-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "There is some iron! Finally!",
      "zh": "有铁了！终于！",
      "an": "https://english.example.com/audio/ep/ep-video-makingfriends-2/s042-n-37066b.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-makingfriends-2/s042-s-7ce0a1.mp3"
    },
    {
      "s": "s043",
      "e": "ep-video-makingfriends-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "There we go. All right, I've got some iron, and now I'm going back up.",
      "zh": "好了。我拿到铁了，现在往上走。",
      "an": "https://english.example.com/audio/ep/ep-video-makingfriends-2/s043-n-a6c63f.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-makingfriends-2/s043-s-342753.mp3"
    },
    {
      "s": "s044",
      "e": "ep-video-makingfriends-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "I'm back up to my house so I can build the anvil.",
      "zh": "我回到房子了，可以做铁砧了。",
      "an": "https://english.example.com/audio/ep/ep-video-makingfriends-2/s044-n-90b040.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-makingfriends-2/s044-s-424e01.mp3"
    },
    {
      "s": "s045",
      "e": "ep-video-makingfriends-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "All right, it's nighttime.",
      "zh": "好了，现在是晚上。",
      "an": "https://english.example.com/audio/ep/ep-video-makingfriends-2/s045-n-c08bf8.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-makingfriends-2/s045-s-8fe463.mp3"
    },
    {
      "s": "s046",
      "e": "ep-video-makingfriends-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "I'm going to smelt the iron.",
      "zh": "我要把铁熔炼一下。",
      "an": "https://english.example.com/audio/ep/ep-video-makingfriends-2/s046-n-7e6010.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-makingfriends-2/s046-s-7ad9d6.mp3"
    },
    {
      "s": "s047",
      "e": "ep-video-makingfriends-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "I'm going to build more torches with sticks and coal.",
      "zh": "我要用木棍和煤炭做更多火把。",
      "an": "https://english.example.com/audio/ep/ep-video-makingfriends-2/s047-n-501fad.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-makingfriends-2/s047-s-cbb018.mp3"
    },
    {
      "s": "s048",
      "e": "ep-video-makingfriends-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "Now I'm going to light up all of this island with torches.",
      "zh": "现在我要用火把把整座岛都照亮。",
      "an": "https://english.example.com/audio/ep/ep-video-makingfriends-2/s048-n-7ce398.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-makingfriends-2/s048-s-c07b13.mp3"
    },
    {
      "s": "s049",
      "e": "ep-video-makingfriends-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "A skeleton!",
      "zh": "一只骷髅！",
      "an": "https://english.example.com/audio/ep/ep-video-makingfriends-2/s049-n-a03c2f.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-makingfriends-2/s049-s-9ed8d2.mp3"
    },
    {
      "s": "s050",
      "e": "ep-video-makingfriends-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "I remember what skeletons did to me in the last video.",
      "zh": "我记得上一集骷髅对我做了什么。",
      "an": "https://english.example.com/audio/ep/ep-video-makingfriends-2/s050-n-22257a.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-makingfriends-2/s050-s-4f32bd.mp3"
    },
    {
      "s": "s051",
      "e": "ep-video-makingfriends-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "Some carrots.",
      "zh": "一些胡萝卜。",
      "an": "https://english.example.com/audio/ep/ep-video-makingfriends-2/s051-n-296127.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-makingfriends-2/s051-s-9c9591.mp3"
    },
    {
      "s": "s052",
      "e": "ep-video-makingfriends-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "I'm going to eat some of these carrots.",
      "zh": "我要吃几根胡萝卜。",
      "an": "https://english.example.com/audio/ep/ep-video-makingfriends-2/s052-n-dbee03.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-makingfriends-2/s052-s-11696e.mp3"
    },
    {
      "s": "s053",
      "e": "ep-video-makingfriends-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "Our farm is producing a lot of food.",
      "zh": "我们的农场产了很多粮食。",
      "an": "https://english.example.com/audio/ep/ep-video-makingfriends-2/s053-n-a43d53.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-makingfriends-2/s053-s-e7d20c.mp3"
    },
    {
      "s": "s054",
      "e": "ep-video-makingfriends-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "I'm going to pick up this bone right here, because I think in the future I will want a dog.",
      "zh": "我要把这块骨头捡起来，因为以后我想养一条狗。",
      "an": "https://english.example.com/audio/ep/ep-video-makingfriends-2/s054-n-59974f.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-makingfriends-2/s054-s-0dabc3.mp3"
    },
    {
      "s": "s055",
      "e": "ep-video-makingfriends-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "I'm placing all of these torches so that this island in the night will be all lit up.",
      "zh": "我在放这些火把，好让这座岛晚上全部亮起来。",
      "an": "https://english.example.com/audio/ep/ep-video-makingfriends-2/s055-n-798bea.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-makingfriends-2/s055-s-62e191.mp3"
    },
    {
      "s": "s056",
      "e": "ep-video-makingfriends-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "If this island is lit up in the night, monsters won't spawn here.",
      "zh": "如果这座岛晚上亮着，怪物就不会在这里刷出来。",
      "an": "https://english.example.com/audio/ep/ep-video-makingfriends-2/s056-n-98af32.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-makingfriends-2/s056-s-a6abba.mp3"
    },
    {
      "s": "s057",
      "e": "ep-video-makingfriends-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "So I'm placing all these torches to make this island more safe in the night.",
      "zh": "所以我放这些火把，让这座岛晚上更安全。",
      "an": "https://english.example.com/audio/ep/ep-video-makingfriends-2/s057-n-4ea486.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-makingfriends-2/s057-s-2f949f.mp3"
    },
    {
      "s": "s058",
      "e": "ep-video-makingfriends-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "I think that I'm going to plant bamboo all around the outside of this island.",
      "zh": "我想在这座岛的外围种一圈竹子。",
      "an": "https://english.example.com/audio/ep/ep-video-makingfriends-2/s058-n-5e0bd2.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-makingfriends-2/s058-s-9310dd.mp3"
    },
    {
      "s": "s059",
      "e": "ep-video-makingfriends-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "Like a huge wall of bamboo.",
      "zh": "就像一堵巨大的竹墙。",
      "an": "https://english.example.com/audio/ep/ep-video-makingfriends-2/s059-n-3b397f.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-makingfriends-2/s059-s-c2f258.mp3"
    },
    {
      "s": "s060",
      "e": "ep-video-makingfriends-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "All right, the iron has to be done smelting.",
      "zh": "好了，铁应该熔炼好了。",
      "an": "https://english.example.com/audio/ep/ep-video-makingfriends-2/s060-n-7fd4bb.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-makingfriends-2/s060-s-f694a8.mp3"
    },
    {
      "s": "s061",
      "e": "ep-video-makingfriends-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "One, two, three blocks of iron, and one, two, three, four iron ingots makes an anvil.",
      "zh": "一、二、三块铁块，再加上一、二、三、四个铁锭，就能做出铁砧。",
      "an": "https://english.example.com/audio/ep/ep-video-makingfriends-2/s061-n-34f48d.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-makingfriends-2/s061-s-782111.mp3"
    },
    {
      "s": "s062",
      "e": "ep-video-makingfriends-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "Anvils can do lots of different things.",
      "zh": "铁砧可以做很多事。",
      "an": "https://english.example.com/audio/ep/ep-video-makingfriends-2/s062-n-809edc.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-makingfriends-2/s062-s-50e64d.mp3"
    },
    {
      "s": "s063",
      "e": "ep-video-makingfriends-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "But right now I'm just using the anvil to make my name tag.",
      "zh": "可我现在只用铁砧做命名牌。",
      "an": "https://english.example.com/audio/ep/ep-video-makingfriends-2/s063-n-c7ca9f.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-makingfriends-2/s063-s-bec8ae.mp3"
    },
    {
      "s": "s064",
      "e": "ep-video-makingfriends-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "So I am naming you Egbert.",
      "zh": "所以我给你起名叫 Egbert。",
      "an": "https://english.example.com/audio/ep/ep-video-makingfriends-2/s064-n-36ef26.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-makingfriends-2/s064-s-e48be0.mp3"
    },
    {
      "s": "s065",
      "e": "ep-video-makingfriends-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "So I will type E-G-B-E-R-T right here.",
      "zh": "我在这里打上 E-G-B-E-R-T。",
      "an": "https://english.example.com/audio/ep/ep-video-makingfriends-2/s065-n-88213e.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-makingfriends-2/s065-s-308744.mp3"
    },
    {
      "s": "s066",
      "e": "ep-video-makingfriends-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "I have a name tag called Egbert that I can give to this chicken. There you go!",
      "zh": "我有一个叫 Egbert 的命名牌，可以给这只鸡。给你！",
      "an": "https://english.example.com/audio/ep/ep-video-makingfriends-2/s066-n-789dec.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-makingfriends-2/s066-s-812476.mp3"
    },
    {
      "s": "s067",
      "e": "ep-video-makingfriends-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "Egbert, now this chicken is officially named Egbert. Hello, Egbert!",
      "zh": "Egbert，现在这只鸡正式叫 Egbert 了。你好，Egbert！",
      "an": "https://english.example.com/audio/ep/ep-video-makingfriends-2/s067-n-0b9876.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-makingfriends-2/s067-s-0913cb.mp3"
    },
    {
      "s": "s068",
      "e": "ep-video-makingfriends-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "I feel much better now that I have a friend in this world, Egbert.",
      "zh": "有了 Egbert 这个朋友，我感觉好多了。",
      "an": "https://english.example.com/audio/ep/ep-video-makingfriends-2/s068-n-9c2d70.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-makingfriends-2/s068-s-3f45c7.mp3"
    },
    {
      "s": "s069",
      "e": "ep-video-makingfriends-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "So I'm going to end this video right here.",
      "zh": "那我这一集就到这里结束。",
      "an": "https://english.example.com/audio/ep/ep-video-makingfriends-2/s069-n-c194a4.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-makingfriends-2/s069-s-1d0542.mp3"
    },
    {
      "s": "s070",
      "e": "ep-video-makingfriends-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "And I will see you in the next video. See ya!",
      "zh": "我们下一集见。拜拜！",
      "an": "https://english.example.com/audio/ep/ep-video-makingfriends-2/s070-n-efc662.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-makingfriends-2/s070-s-b65de3.mp3"
    },
    {
      "s": "s001",
      "e": "ep-card-feelings-g3",
      "k": "card",
      "sp": "孩子",
      "en": "Hi Ben, you look tired. What's wrong?",
      "zh": "嗨，Ben，你看起来很累。你怎么了？",
      "an": "https://english.example.com/audio/ep/ep-card-feelings-g3/s001-n-0235e4.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-feelings-g3/s001-s-4a6c0e.mp3"
    },
    {
      "s": "s002",
      "e": "ep-card-feelings-g3",
      "k": "card",
      "sp": "同学",
      "en": "I'm really tired today. How about you?",
      "zh": "我今天真的很累。你呢？",
      "an": "https://english.example.com/audio/ep/ep-card-feelings-g3/s002-n-ed1dc7.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-feelings-g3/s002-s-342461.mp3"
    },
    {
      "s": "s003",
      "e": "ep-card-feelings-g3",
      "k": "card",
      "sp": "孩子",
      "en": "I'm happy, but Lily looks sad.",
      "zh": "我很开心，可是 Lily 看起来很难过。",
      "an": "https://english.example.com/audio/ep/ep-card-feelings-g3/s003-n-9dfafa.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-feelings-g3/s003-s-8dca69.mp3"
    },
    {
      "s": "s004",
      "e": "ep-card-feelings-g3",
      "k": "card",
      "sp": "同学",
      "en": "Oh no. Is she okay?",
      "zh": "哎呀。她还好吗？",
      "an": "https://english.example.com/audio/ep/ep-card-feelings-g3/s004-n-83f7a5.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-feelings-g3/s004-s-225ff7.mp3"
    },
    {
      "s": "s005",
      "e": "ep-card-feelings-g3",
      "k": "card",
      "sp": "孩子",
      "en": "She says she feels sick. Can we help her?",
      "zh": "她说她不舒服。我们能帮帮她吗？",
      "an": "https://english.example.com/audio/ep/ep-card-feelings-g3/s005-n-030469.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-feelings-g3/s005-s-5f37a1.mp3"
    },
    {
      "s": "s006",
      "e": "ep-card-feelings-g3",
      "k": "card",
      "sp": "同学",
      "en": "Yes. Let's go and see her!",
      "zh": "好。我们去看看她吧！",
      "an": "https://english.example.com/audio/ep/ep-card-feelings-g3/s006-n-d6b3ab.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-feelings-g3/s006-s-aafe5d.mp3"
    },
    {
      "s": "s001",
      "e": "ep-card-day-g3",
      "k": "card",
      "sp": "家长",
      "en": "Lily, it's time to get up. Are you awake?",
      "zh": "Lily，该起床了。你醒了吗？",
      "an": "https://english.example.com/audio/ep/ep-card-day-g3/s001-n-526226.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-day-g3/s001-s-e77d3a.mp3"
    },
    {
      "s": "s002",
      "e": "ep-card-day-g3",
      "k": "card",
      "sp": "孩子",
      "en": "Yes, Mom. I'm getting up now.",
      "zh": "嗯，妈妈。我现在就起床。",
      "an": "https://english.example.com/audio/ep/ep-card-day-g3/s002-n-20cb71.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-day-g3/s002-s-7f943e.mp3"
    },
    {
      "s": "s003",
      "e": "ep-card-day-g3",
      "k": "card",
      "sp": "家长",
      "en": "Please brush your teeth, then we'll go to school.",
      "zh": "请先刷牙，然后我们去学校。",
      "an": "https://english.example.com/audio/ep/ep-card-day-g3/s003-n-c51567.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-day-g3/s003-s-8635fb.mp3"
    },
    {
      "s": "s004",
      "e": "ep-card-day-g3",
      "k": "card",
      "sp": "孩子",
      "en": "Okay. Can you walk me to school today?",
      "zh": "好。你今天能送我去学校吗？",
      "an": "https://english.example.com/audio/ep/ep-card-day-g3/s004-n-bd06eb.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-day-g3/s004-s-7dc5cf.mp3"
    },
    {
      "s": "s005",
      "e": "ep-card-day-g3",
      "k": "card",
      "sp": "家长",
      "en": "Of course. Don't stay up too late tonight.",
      "zh": "当然。今晚别太晚睡。",
      "an": "https://english.example.com/audio/ep/ep-card-day-g3/s005-n-b6c34a.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-day-g3/s005-s-8541b7.mp3"
    },
    {
      "s": "s006",
      "e": "ep-card-day-g3",
      "k": "card",
      "sp": "孩子",
      "en": "I won't. I'll go to bed early.",
      "zh": "不会的。我会早点睡觉。",
      "an": "https://english.example.com/audio/ep/ep-card-day-g3/s006-n-bf9c3a.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-day-g3/s006-s-ae7b91.mp3"
    },
    {
      "s": "s001",
      "e": "ep-card-weather-g3",
      "k": "card",
      "sp": "家长",
      "en": "Lily, what's the weather like today?",
      "zh": "Lily，今天天气怎么样？",
      "an": "https://english.example.com/audio/ep/ep-card-weather-g3/s001-n-6921f6.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-weather-g3/s001-s-f1dd4b.mp3"
    },
    {
      "s": "s002",
      "e": "ep-card-weather-g3",
      "k": "card",
      "sp": "孩子",
      "en": "It's cold and rainy. Do I need my coat?",
      "zh": "又冷又下雨。我需要穿外套吗？",
      "an": "https://english.example.com/audio/ep/ep-card-weather-g3/s002-n-0af873.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-weather-g3/s002-s-533b0d.mp3"
    },
    {
      "s": "s003",
      "e": "ep-card-weather-g3",
      "k": "card",
      "sp": "家长",
      "en": "Yes. And please take your umbrella, too.",
      "zh": "要。也请带上雨伞。",
      "an": "https://english.example.com/audio/ep/ep-card-weather-g3/s003-n-a0f7af.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-weather-g3/s003-s-1bb00b.mp3"
    },
    {
      "s": "s004",
      "e": "ep-card-weather-g3",
      "k": "card",
      "sp": "孩子",
      "en": "Where is my umbrella? Is it by the door?",
      "zh": "我的伞在哪儿？在门边吗？",
      "an": "https://english.example.com/audio/ep/ep-card-weather-g3/s004-n-a5ced1.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-weather-g3/s004-s-148658.mp3"
    },
    {
      "s": "s005",
      "e": "ep-card-weather-g3",
      "k": "card",
      "sp": "家长",
      "en": "Yes, it's next to your boots. Are you ready?",
      "zh": "对，就在你靴子旁边。准备好了吗？",
      "an": "https://english.example.com/audio/ep/ep-card-weather-g3/s005-n-08490a.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-weather-g3/s005-s-30053c.mp3"
    },
    {
      "s": "s006",
      "e": "ep-card-weather-g3",
      "k": "card",
      "sp": "孩子",
      "en": "I'm ready. Thank you, Mom!",
      "zh": "我准备好了。谢谢妈妈！",
      "an": "https://english.example.com/audio/ep/ep-card-weather-g3/s006-n-21646b.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-weather-g3/s006-s-ff7fbd.mp3"
    },
    {
      "s": "s001",
      "e": "ep-video-strikinggold-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "Hello and welcome back to Learning English with Minecraft.",
      "zh": "大家好，欢迎回到“用《我的世界》学英语”。",
      "an": "https://english.example.com/audio/ep/ep-video-strikinggold-1/s001-n-e6a7e0.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-strikinggold-1/s001-s-fe08ac.mp3"
    },
    {
      "s": "s002",
      "e": "ep-video-strikinggold-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "My name is Kenzo, and this is English from the Ground Up.",
      "zh": "我叫 Kenzo，这就是 English from the Ground Up。",
      "an": "https://english.example.com/audio/ep/ep-video-strikinggold-1/s002-n-cae684.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-strikinggold-1/s002-s-01fbe0.mp3"
    },
    {
      "s": "s003",
      "e": "ep-video-strikinggold-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "So in the last Minecraft video, I finished building the house by completing the windows right here and up there.",
      "zh": "在上一集《我的世界》里，我把房子的窗户装好了，这边和上面都装好了。",
      "an": "https://english.example.com/audio/ep/ep-video-strikinggold-1/s003-n-8db5d3.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-strikinggold-1/s003-s-1ea3da.mp3"
    },
    {
      "s": "s004",
      "e": "ep-video-strikinggold-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "I finished the windows, and I also explored a cave.",
      "zh": "我装完了窗户，还去探索了一个洞穴。",
      "an": "https://english.example.com/audio/ep/ep-video-strikinggold-1/s004-n-727b6d.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-strikinggold-1/s004-s-b7c02c.mp3"
    },
    {
      "s": "s005",
      "e": "ep-video-strikinggold-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "Well, in the cave I found a lot of useful resources, but I couldn't collect them because I didn't have an iron pickaxe.",
      "zh": "在洞穴里我发现了很多有用的资源，可是没办法挖，因为我没有铁镐。",
      "an": "https://english.example.com/audio/ep/ep-video-strikinggold-1/s005-n-0952eb.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-strikinggold-1/s005-s-ecc9dd.mp3"
    },
    {
      "s": "s006",
      "e": "ep-video-strikinggold-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "Well, now I have iron, and I can build an iron pickaxe to collect those resources.",
      "zh": "现在我有铁了，可以做一把铁镐，把那些资源挖回来。",
      "an": "https://english.example.com/audio/ep/ep-video-strikinggold-1/s006-n-5c2ae8.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-strikinggold-1/s006-s-732495.mp3"
    },
    {
      "s": "s007",
      "e": "ep-video-strikinggold-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "Off camera, I built these chests right here, because I needed a place to put all the items that I collected.",
      "zh": "镜头外面，我在这里做了这些箱子，因为我需要地方放收集到的东西。",
      "an": "https://english.example.com/audio/ep/ep-video-strikinggold-1/s007-n-488633.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-strikinggold-1/s007-s-789bf2.mp3"
    },
    {
      "s": "s008",
      "e": "ep-video-strikinggold-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "So I built these chests and also these signs, so I know what's inside the chests.",
      "zh": "所以我做了这些箱子，还做了这些告示牌，这样就知道箱子里是什么。",
      "an": "https://english.example.com/audio/ep/ep-video-strikinggold-1/s008-n-dc8250.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-strikinggold-1/s008-s-06eb1c.mp3"
    },
    {
      "s": "s009",
      "e": "ep-video-strikinggold-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "So right here, there's stones.",
      "zh": "这边是石头。",
      "an": "https://english.example.com/audio/ep/ep-video-strikinggold-1/s009-n-c64d84.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-strikinggold-1/s009-s-e8e837.mp3"
    },
    {
      "s": "s010",
      "e": "ep-video-strikinggold-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "Here, there's some food.",
      "zh": "这边有一些食物。",
      "an": "https://english.example.com/audio/ep/ep-video-strikinggold-1/s010-n-8c407c.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-strikinggold-1/s010-s-5a27d3.mp3"
    },
    {
      "s": "s011",
      "e": "ep-video-strikinggold-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "Here is wood.",
      "zh": "这边是木头。",
      "an": "https://english.example.com/audio/ep/ep-video-strikinggold-1/s011-n-146928.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-strikinggold-1/s011-s-962c15.mp3"
    },
    {
      "s": "s012",
      "e": "ep-video-strikinggold-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "In this chest, I'm putting all my valuable resources, like lapis and iron, coal.",
      "zh": "这个箱子里，我放所有珍贵的资源，比如青金石、铁和煤。",
      "an": "https://english.example.com/audio/ep/ep-video-strikinggold-1/s012-n-dcd8f0.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-strikinggold-1/s012-s-5fb4a8.mp3"
    },
    {
      "s": "s013",
      "e": "ep-video-strikinggold-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "And when I find diamonds, I'll put them up here, the top chest.",
      "zh": "等我找到钻石，就放在上面这个箱子里。",
      "an": "https://english.example.com/audio/ep/ep-video-strikinggold-1/s013-n-106a5b.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-strikinggold-1/s013-s-c03e2a.mp3"
    },
    {
      "s": "s014",
      "e": "ep-video-strikinggold-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "This chest has soil, so sand and dirt.",
      "zh": "这个箱子放的是土，也就是沙子和泥土。",
      "an": "https://english.example.com/audio/ep/ep-video-strikinggold-1/s014-n-2b04ed.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-strikinggold-1/s014-s-0cc567.mp3"
    },
    {
      "s": "s015",
      "e": "ep-video-strikinggold-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "And I'll show you why I have all this sand in a little bit.",
      "zh": "过一会儿我会告诉你，我为什么要留这么多沙子。",
      "an": "https://english.example.com/audio/ep/ep-video-strikinggold-1/s015-n-4a34e6.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-strikinggold-1/s015-s-f9b4f6.mp3"
    },
    {
      "s": "s016",
      "e": "ep-video-strikinggold-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "Right here, this chest is for random things, and this bottom chest is for tools.",
      "zh": "这边这个箱子放杂物，最下面的箱子放工具。",
      "an": "https://english.example.com/audio/ep/ep-video-strikinggold-1/s016-n-530598.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-strikinggold-1/s016-s-279b4a.mp3"
    },
    {
      "s": "s017",
      "e": "ep-video-strikinggold-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "So the reason why I have all this sand is because, also off camera, I built a little farm right out here.",
      "zh": "我留这么多沙子，是因为镜头外面我在外面建了一小块农田。",
      "an": "https://english.example.com/audio/ep/ep-video-strikinggold-1/s017-n-d208fd.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-strikinggold-1/s017-s-c2424c.mp3"
    },
    {
      "s": "s018",
      "e": "ep-video-strikinggold-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "I built this little farm because I'll always need food, and it'll be very nice to have a stable source of food.",
      "zh": "我建这块小农田，是因为总会需要食物，有个稳定的食物来源会很好。",
      "an": "https://english.example.com/audio/ep/ep-video-strikinggold-1/s018-n-1b190d.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-strikinggold-1/s018-s-333b69.mp3"
    },
    {
      "s": "s019",
      "e": "ep-video-strikinggold-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "So right here, I've planted some wheat.",
      "zh": "看这边，我种了一些小麦。",
      "an": "https://english.example.com/audio/ep/ep-video-strikinggold-1/s019-n-057687.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-strikinggold-1/s019-s-61aa25.mp3"
    },
    {
      "s": "s020",
      "e": "ep-video-strikinggold-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "This is wheat right here.",
      "zh": "这边就是小麦。",
      "an": "https://english.example.com/audio/ep/ep-video-strikinggold-1/s020-n-a2bb15.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-strikinggold-1/s020-s-40b513.mp3"
    },
    {
      "s": "s021",
      "e": "ep-video-strikinggold-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "I planted beet roots.",
      "zh": "我种了甜菜根。",
      "an": "https://english.example.com/audio/ep/ep-video-strikinggold-1/s021-n-d44dab.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-strikinggold-1/s021-s-203255.mp3"
    },
    {
      "s": "s022",
      "e": "ep-video-strikinggold-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "When I find potatoes, I'll plant them right here.",
      "zh": "等我找到土豆，就种在这边。",
      "an": "https://english.example.com/audio/ep/ep-video-strikinggold-1/s022-n-53f602.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-strikinggold-1/s022-s-b5d06a.mp3"
    },
    {
      "s": "s023",
      "e": "ep-video-strikinggold-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "This guy is ruining my farm.",
      "zh": "这家伙在破坏我的农田。",
      "an": "https://english.example.com/audio/ep/ep-video-strikinggold-1/s023-n-51f048.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-strikinggold-1/s023-s-4356f0.mp3"
    },
    {
      "s": "s024",
      "e": "ep-video-strikinggold-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "When you jump on dirt that's been tilled with a hoe, it ruins it.",
      "zh": "如果你在用锄头耕过的土上跳，土就会被踩坏。",
      "an": "https://english.example.com/audio/ep/ep-video-strikinggold-1/s024-n-63cb06.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-strikinggold-1/s024-s-3f1ee4.mp3"
    },
    {
      "s": "s025",
      "e": "ep-video-strikinggold-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "I think in the future I'll build a fence to put around the farm, but not right now.",
      "zh": "以后我想给农田围一圈篱笆，但现在先不围。",
      "an": "https://english.example.com/audio/ep/ep-video-strikinggold-1/s025-n-8a0d13.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-strikinggold-1/s025-s-f57d3f.mp3"
    },
    {
      "s": "s026",
      "e": "ep-video-strikinggold-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "Right now, I'm going to build an iron pickaxe and go back down to the bottom of the world, where I previously saw some gold and redstone.",
      "zh": "现在我要做一把铁镐，再下到世界最底层，我之前在那儿看到过金子和红石。",
      "an": "https://english.example.com/audio/ep/ep-video-strikinggold-1/s026-n-96cc20.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-strikinggold-1/s026-s-3890dc.mp3"
    },
    {
      "s": "s027",
      "e": "ep-video-strikinggold-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "I want to collect gold, redstone, and hopefully I'll find some diamonds.",
      "zh": "我想把金子和红石挖回来，也希望能找到一些钻石。",
      "an": "https://english.example.com/audio/ep/ep-video-strikinggold-1/s027-n-8aa037.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-strikinggold-1/s027-s-5f2f3b.mp3"
    },
    {
      "s": "s028",
      "e": "ep-video-strikinggold-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "But right now it's getting dark, and I'm going to sleep.",
      "zh": "可现在天快黑了，我要去睡觉。",
      "an": "https://english.example.com/audio/ep/ep-video-strikinggold-1/s028-n-10b065.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-strikinggold-1/s028-s-b6f431.mp3"
    },
    {
      "s": "s029",
      "e": "ep-video-strikinggold-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "And time to sleep.",
      "zh": "该睡觉了。",
      "an": "https://english.example.com/audio/ep/ep-video-strikinggold-1/s029-n-1a728a.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-strikinggold-1/s029-s-cf2902.mp3"
    },
    {
      "s": "s030",
      "e": "ep-video-strikinggold-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "All right, it's morning.",
      "zh": "好了，现在是早上。",
      "an": "https://english.example.com/audio/ep/ep-video-strikinggold-1/s030-n-7318cf.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-strikinggold-1/s030-s-117e1c.mp3"
    },
    {
      "s": "s031",
      "e": "ep-video-strikinggold-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "Up here I have my iron.",
      "zh": "上面这里有我的铁。",
      "an": "https://english.example.com/audio/ep/ep-video-strikinggold-1/s031-n-c855bd.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-strikinggold-1/s031-s-4c73de.mp3"
    },
    {
      "s": "s032",
      "e": "ep-video-strikinggold-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "To build an iron pickaxe, I need iron and sticks.",
      "zh": "要做铁镐，我需要铁和木棍。",
      "an": "https://english.example.com/audio/ep/ep-video-strikinggold-1/s032-n-6a9038.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-strikinggold-1/s032-s-3d7c36.mp3"
    },
    {
      "s": "s033",
      "e": "ep-video-strikinggold-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "I need to put three iron ingots like this, and two sticks like this.",
      "zh": "我要这样放三个铁锭，再这样放两根木棍。",
      "an": "https://english.example.com/audio/ep/ep-video-strikinggold-1/s033-n-a296d6.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-strikinggold-1/s033-s-123029.mp3"
    },
    {
      "s": "s034",
      "e": "ep-video-strikinggold-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "And now I can build an iron pickaxe.",
      "zh": "现在我可以做出铁镐了。",
      "an": "https://english.example.com/audio/ep/ep-video-strikinggold-1/s034-n-752d8f.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-strikinggold-1/s034-s-de3440.mp3"
    },
    {
      "s": "s035",
      "e": "ep-video-strikinggold-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "So now I'm going back down to the bottom of the world to find the gold and redstone that I saw earlier.",
      "zh": "现在我要再下到世界最底层，去找我之前看到的金子和红石。",
      "an": "https://english.example.com/audio/ep/ep-video-strikinggold-1/s035-n-c52345.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-strikinggold-1/s035-s-c4420f.mp3"
    },
    {
      "s": "s036",
      "e": "ep-video-strikinggold-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "Here we are.",
      "zh": "我们到了。",
      "an": "https://english.example.com/audio/ep/ep-video-strikinggold-1/s036-n-5bca16.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-strikinggold-1/s036-s-f5c7fe.mp3"
    },
    {
      "s": "s037",
      "e": "ep-video-strikinggold-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "Here is the scary stone bridge, with lava on both sides.",
      "zh": "这是那座可怕的石头桥，两边都是岩浆。",
      "an": "https://english.example.com/audio/ep/ep-video-strikinggold-1/s037-n-ced359.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-strikinggold-1/s037-s-48e9cb.mp3"
    },
    {
      "s": "s038",
      "e": "ep-video-strikinggold-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "So now that I have an iron pickaxe, I can mine this gold.",
      "zh": "现在我有铁镐了，就可以挖这块金子。",
      "an": "https://english.example.com/audio/ep/ep-video-strikinggold-1/s038-n-49f4e1.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-strikinggold-1/s038-s-a58c79.mp3"
    },
    {
      "s": "s039",
      "e": "ep-video-strikinggold-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "See? Gold!",
      "zh": "看见了吗？金子！",
      "an": "https://english.example.com/audio/ep/ep-video-strikinggold-1/s039-n-882f27.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-strikinggold-1/s039-s-5bd3fb.mp3"
    },
    {
      "s": "s040",
      "e": "ep-video-strikinggold-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "There we go.",
      "zh": "好了。",
      "an": "https://english.example.com/audio/ep/ep-video-strikinggold-1/s040-n-7099be.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-strikinggold-1/s040-s-ffc9b2.mp3"
    },
    {
      "s": "s041",
      "e": "ep-video-strikinggold-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "I can also mine this redstone.",
      "zh": "我也可以挖这块红石。",
      "an": "https://english.example.com/audio/ep/ep-video-strikinggold-1/s041-n-aca8d0.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-strikinggold-1/s041-s-860917.mp3"
    },
    {
      "s": "s042",
      "e": "ep-video-strikinggold-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "Oh, it's way slower to mine underwater.",
      "zh": "哦，在水下挖会慢很多。",
      "an": "https://english.example.com/audio/ep/ep-video-strikinggold-1/s042-n-8c2fe3.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-strikinggold-1/s042-s-586cec.mp3"
    },
    {
      "s": "s043",
      "e": "ep-video-strikinggold-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "So now I've collected some redstone.",
      "zh": "现在我已经挖到一些红石了。",
      "an": "https://english.example.com/audio/ep/ep-video-strikinggold-1/s043-n-a186c4.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-strikinggold-1/s043-s-8df6e3.mp3"
    },
    {
      "s": "s044",
      "e": "ep-video-strikinggold-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "This will be great, because I need redstone to build a compass.",
      "zh": "这太好了，因为我需要红石来做指南针。",
      "an": "https://english.example.com/audio/ep/ep-video-strikinggold-1/s044-n-5fb9fc.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-strikinggold-1/s044-s-77c241.mp3"
    },
    {
      "s": "s045",
      "e": "ep-video-strikinggold-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "And with the compass, I can build a map.",
      "zh": "有了指南针，我就能做地图。",
      "an": "https://english.example.com/audio/ep/ep-video-strikinggold-1/s045-n-389366.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-strikinggold-1/s045-s-d73650.mp3"
    },
    {
      "s": "s046",
      "e": "ep-video-strikinggold-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "And I need a map because I'm terrible with directions.",
      "zh": "我需要地图，因为我方向感很差。",
      "an": "https://english.example.com/audio/ep/ep-video-strikinggold-1/s046-n-b0a0b2.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-strikinggold-1/s046-s-1b7d16.mp3"
    },
    {
      "s": "s047",
      "e": "ep-video-strikinggold-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "I get lost very easily.",
      "zh": "我很容易迷路。",
      "an": "https://english.example.com/audio/ep/ep-video-strikinggold-1/s047-n-9ed8c7.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-strikinggold-1/s047-s-85e7e1.mp3"
    },
    {
      "s": "s048",
      "e": "ep-video-strikinggold-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "Okay, there's more gold right there.",
      "zh": "好，那边还有更多金子。",
      "an": "https://english.example.com/audio/ep/ep-video-strikinggold-1/s048-n-55f204.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-strikinggold-1/s048-s-3e7c27.mp3"
    },
    {
      "s": "s049",
      "e": "ep-video-strikinggold-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "I need to eat.",
      "zh": "我得吃点东西。",
      "an": "https://english.example.com/audio/ep/ep-video-strikinggold-1/s049-n-b81846.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-strikinggold-1/s049-s-8f7d77.mp3"
    },
    {
      "s": "s050",
      "e": "ep-video-strikinggold-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "Do I have more food? I do.",
      "zh": "我还有食物吗？有的。",
      "an": "https://english.example.com/audio/ep/ep-video-strikinggold-1/s050-n-c1a8d7.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-strikinggold-1/s050-s-89e729.mp3"
    },
    {
      "s": "s051",
      "e": "ep-video-strikinggold-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "The spider fell from the ceiling.",
      "zh": "蜘蛛从天花板掉下来了。",
      "an": "https://english.example.com/audio/ep/ep-video-strikinggold-1/s051-n-506caf.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-strikinggold-1/s051-s-d78c38.mp3"
    },
    {
      "s": "s052",
      "e": "ep-video-strikinggold-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "That was scary.",
      "zh": "刚才好吓人。",
      "an": "https://english.example.com/audio/ep/ep-video-strikinggold-1/s052-n-ac4b8d.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-strikinggold-1/s052-s-74b872.mp3"
    },
    {
      "s": "s053",
      "e": "ep-video-strikinggold-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "I saw another spider over there.",
      "zh": "我看到那边还有一只蜘蛛。",
      "an": "https://english.example.com/audio/ep/ep-video-strikinggold-1/s053-n-c35385.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-strikinggold-1/s053-s-e03423.mp3"
    },
    {
      "s": "s054",
      "e": "ep-video-strikinggold-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "Gold, more gold!",
      "zh": "金子，又有金子！",
      "an": "https://english.example.com/audio/ep/ep-video-strikinggold-1/s054-n-7ebd15.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-strikinggold-1/s054-s-0f8ca7.mp3"
    },
    {
      "s": "s055",
      "e": "ep-video-strikinggold-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "I'm finding a lot of gold.",
      "zh": "我找到好多金子。",
      "an": "https://english.example.com/audio/ep/ep-video-strikinggold-1/s055-n-35bfa8.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-strikinggold-1/s055-s-dcd660.mp3"
    },
    {
      "s": "s056",
      "e": "ep-video-strikinggold-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "There we go.",
      "zh": "好了。",
      "an": "https://english.example.com/audio/ep/ep-video-strikinggold-1/s056-n-7099be.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-strikinggold-1/s056-s-ffc9b2.mp3"
    },
    {
      "s": "s057",
      "e": "ep-video-strikinggold-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "13 gold. That's great.",
      "zh": "13 个金子。太棒了。",
      "an": "https://english.example.com/audio/ep/ep-video-strikinggold-1/s057-n-f8fa32.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-strikinggold-1/s057-s-ce7ac4.mp3"
    },
    {
      "s": "s058",
      "e": "ep-video-strikinggold-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "Okay, here's some more iron.",
      "zh": "好，这里又有一些铁。",
      "an": "https://english.example.com/audio/ep/ep-video-strikinggold-1/s058-n-c62d93.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-strikinggold-1/s058-s-c3014f.mp3"
    },
    {
      "s": "s059",
      "e": "ep-video-strikinggold-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "This is great. I need a lot of iron.",
      "zh": "太好了。我需要很多铁。",
      "an": "https://english.example.com/audio/ep/ep-video-strikinggold-1/s059-n-934730.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-strikinggold-1/s059-s-5099fc.mp3"
    },
    {
      "s": "s001",
      "e": "ep-video-strikinggold-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "This cave is scary.",
      "zh": "这个洞穴好可怕。",
      "an": "https://english.example.com/audio/ep/ep-video-strikinggold-2/s001-n-6a8b59.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-strikinggold-2/s001-s-e3c44a.mp3"
    },
    {
      "s": "s002",
      "e": "ep-video-strikinggold-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "There are monsters everywhere.",
      "zh": "到处都是怪物。",
      "an": "https://english.example.com/audio/ep/ep-video-strikinggold-2/s002-n-f4ff1d.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-strikinggold-2/s002-s-31b9a4.mp3"
    },
    {
      "s": "s003",
      "e": "ep-video-strikinggold-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "Where should I go now?",
      "zh": "我现在该往哪走？",
      "an": "https://english.example.com/audio/ep/ep-video-strikinggold-2/s003-n-ae2e1d.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-strikinggold-2/s003-s-67791b.mp3"
    },
    {
      "s": "s004",
      "e": "ep-video-strikinggold-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "Maybe over there. Over there looks interesting.",
      "zh": "也许那边。那边看起来挺有意思。",
      "an": "https://english.example.com/audio/ep/ep-video-strikinggold-2/s004-n-211634.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-strikinggold-2/s004-s-11d7e3.mp3"
    },
    {
      "s": "s005",
      "e": "ep-video-strikinggold-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "Some iron, and lapis.",
      "zh": "有一些铁，还有青金石。",
      "an": "https://english.example.com/audio/ep/ep-video-strikinggold-2/s005-n-a1194e.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-strikinggold-2/s005-s-876cec.mp3"
    },
    {
      "s": "s006",
      "e": "ep-video-strikinggold-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "Okay, just two blocks of iron, but that's still good.",
      "zh": "好，只有两块铁，但还是不错。",
      "an": "https://english.example.com/audio/ep/ep-video-strikinggold-2/s006-n-559db5.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-strikinggold-2/s006-s-12cce2.mp3"
    },
    {
      "s": "s007",
      "e": "ep-video-strikinggold-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "Sadly, I don't think I can get that lapis lazuli.",
      "zh": "可惜，我觉得够不到那块青金石。",
      "an": "https://english.example.com/audio/ep/ep-video-strikinggold-2/s007-n-bab3fb.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-strikinggold-2/s007-s-7dda67.mp3"
    },
    {
      "s": "s008",
      "e": "ep-video-strikinggold-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "This is weird.",
      "zh": "这好奇怪。",
      "an": "https://english.example.com/audio/ep/ep-video-strikinggold-2/s008-n-35feea.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-strikinggold-2/s008-s-761b8a.mp3"
    },
    {
      "s": "s009",
      "e": "ep-video-strikinggold-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "I think this is a little glitch. I don't think it's supposed to be like that.",
      "zh": "我觉得这是一个小故障。不应该是这样的。",
      "an": "https://english.example.com/audio/ep/ep-video-strikinggold-2/s009-n-1275cf.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-strikinggold-2/s009-s-f94031.mp3"
    },
    {
      "s": "s010",
      "e": "ep-video-strikinggold-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "Place a torch here.",
      "zh": "在这儿放一个火把。",
      "an": "https://english.example.com/audio/ep/ep-video-strikinggold-2/s010-n-c5a8d8.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-strikinggold-2/s010-s-92123c.mp3"
    },
    {
      "s": "s011",
      "e": "ep-video-strikinggold-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "And I'll place another torch right here.",
      "zh": "我再在这边放一个火把。",
      "an": "https://english.example.com/audio/ep/ep-video-strikinggold-2/s011-n-503b33.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-strikinggold-2/s011-s-9d0af5.mp3"
    },
    {
      "s": "s012",
      "e": "ep-video-strikinggold-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "Okay, this cave is huge!",
      "zh": "哇，这个洞穴好大！",
      "an": "https://english.example.com/audio/ep/ep-video-strikinggold-2/s012-n-fd319f.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-strikinggold-2/s012-s-f42a4a.mp3"
    },
    {
      "s": "s013",
      "e": "ep-video-strikinggold-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "I hear a zombie, and it's scaring me.",
      "zh": "我听到一只僵尸，它把我吓到了。",
      "an": "https://english.example.com/audio/ep/ep-video-strikinggold-2/s013-n-738f11.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-strikinggold-2/s013-s-c37b11.mp3"
    },
    {
      "s": "s014",
      "e": "ep-video-strikinggold-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "All right, I think I'm going to go down there.",
      "zh": "好，我想我要往下面走。",
      "an": "https://english.example.com/audio/ep/ep-video-strikinggold-2/s014-n-8acac6.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-strikinggold-2/s014-s-6c2aff.mp3"
    },
    {
      "s": "s015",
      "e": "ep-video-strikinggold-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "But first, I don't have any armor.",
      "zh": "可是先等一下，我没有任何盔甲。",
      "an": "https://english.example.com/audio/ep/ep-video-strikinggold-2/s015-n-118433.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-strikinggold-2/s015-s-80918a.mp3"
    },
    {
      "s": "s016",
      "e": "ep-video-strikinggold-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "So I can wear his leather tunic right there.",
      "zh": "所以我可以穿上那边那件皮革上衣。",
      "an": "https://english.example.com/audio/ep/ep-video-strikinggold-2/s016-n-bff6a4.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-strikinggold-2/s016-s-70788c.mp3"
    },
    {
      "s": "s017",
      "e": "ep-video-strikinggold-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "I'm going to put a torch right here, so that when I'm down here I can see my torch and remember my way back.",
      "zh": "我要在这儿放一个火把，这样到了下面还能看见火把，记得回来的路。",
      "an": "https://english.example.com/audio/ep/ep-video-strikinggold-2/s017-n-462f57.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-strikinggold-2/s017-s-3277f6.mp3"
    },
    {
      "s": "s018",
      "e": "ep-video-strikinggold-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "Okay, I'm going to go down. I see a slime. That's a slime.",
      "zh": "好，我要往下走。我看到一只史莱姆。那是一只史莱姆。",
      "an": "https://english.example.com/audio/ep/ep-video-strikinggold-2/s018-n-e8aa7f.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-strikinggold-2/s018-s-767d33.mp3"
    },
    {
      "s": "s019",
      "e": "ep-video-strikinggold-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "We're getting really deep.",
      "zh": "我们走得越来越深了。",
      "an": "https://english.example.com/audio/ep/ep-video-strikinggold-2/s019-n-eb2a63.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-strikinggold-2/s019-s-d10890.mp3"
    },
    {
      "s": "s020",
      "e": "ep-video-strikinggold-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "I see some redstone. More redstone over there.",
      "zh": "我看到一些红石。那边还有更多红石。",
      "an": "https://english.example.com/audio/ep/ep-video-strikinggold-2/s020-n-2d3ab0.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-strikinggold-2/s020-s-a6de94.mp3"
    },
    {
      "s": "s021",
      "e": "ep-video-strikinggold-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "Lots of monsters.",
      "zh": "好多怪物。",
      "an": "https://english.example.com/audio/ep/ep-video-strikinggold-2/s021-n-bf54fd.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-strikinggold-2/s021-s-7501a5.mp3"
    },
    {
      "s": "s022",
      "e": "ep-video-strikinggold-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "More redstone, but no diamonds.",
      "zh": "又有红石，可是没有钻石。",
      "an": "https://english.example.com/audio/ep/ep-video-strikinggold-2/s022-n-2c28e3.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-strikinggold-2/s022-s-96db85.mp3"
    },
    {
      "s": "s023",
      "e": "ep-video-strikinggold-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "Well, I'm going to try to jump over this lava.",
      "zh": "好，我要试着跳过这摊岩浆。",
      "an": "https://english.example.com/audio/ep/ep-video-strikinggold-2/s023-n-370b5c.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-strikinggold-2/s023-s-fb52c4.mp3"
    },
    {
      "s": "s024",
      "e": "ep-video-strikinggold-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "I really thought I could do that.",
      "zh": "我真以为自己跳得过去。",
      "an": "https://english.example.com/audio/ep/ep-video-strikinggold-2/s024-n-6e7cd0.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-strikinggold-2/s024-s-341554.mp3"
    },
    {
      "s": "s025",
      "e": "ep-video-strikinggold-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "The monsters I hate the worst are the skeletons, because they can shoot from far away.",
      "zh": "我最讨厌的怪物是骷髅，因为它们能从很远的地方射箭。",
      "an": "https://english.example.com/audio/ep/ep-video-strikinggold-2/s025-n-7b5af7.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-strikinggold-2/s025-s-9e4270.mp3"
    },
    {
      "s": "s026",
      "e": "ep-video-strikinggold-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "Two hearts.",
      "zh": "只剩两颗心了。",
      "an": "https://english.example.com/audio/ep/ep-video-strikinggold-2/s026-n-75b85d.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-strikinggold-2/s026-s-6bd5e7.mp3"
    },
    {
      "s": "s027",
      "e": "ep-video-strikinggold-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "Okay, we're okay.",
      "zh": "好，我们没事。",
      "an": "https://english.example.com/audio/ep/ep-video-strikinggold-2/s027-n-c0619e.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-strikinggold-2/s027-s-01657f.mp3"
    },
    {
      "s": "s028",
      "e": "ep-video-strikinggold-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "I died.",
      "zh": "我死了。",
      "an": "https://english.example.com/audio/ep/ep-video-strikinggold-2/s028-n-9d817b.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-strikinggold-2/s028-s-76968f.mp3"
    },
    {
      "s": "s029",
      "e": "ep-video-strikinggold-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "So now I have to hurry and find where I died, so I can collect all my things.",
      "zh": "所以我现在得赶快找到自己死掉的地方，把东西全捡回来。",
      "an": "https://english.example.com/audio/ep/ep-video-strikinggold-2/s029-n-7fe0d1.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-strikinggold-2/s029-s-d2ab05.mp3"
    },
    {
      "s": "s030",
      "e": "ep-video-strikinggold-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "So I'm just going to run back down there.",
      "zh": "那我就跑回下面去。",
      "an": "https://english.example.com/audio/ep/ep-video-strikinggold-2/s030-n-8e7111.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-strikinggold-2/s030-s-e4ae04.mp3"
    },
    {
      "s": "s031",
      "e": "ep-video-strikinggold-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "I can't believe I died.",
      "zh": "真不敢相信我死了。",
      "an": "https://english.example.com/audio/ep/ep-video-strikinggold-2/s031-n-3da365.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-strikinggold-2/s031-s-839e37.mp3"
    },
    {
      "s": "s032",
      "e": "ep-video-strikinggold-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "Okay, that is where I died.",
      "zh": "好，那就是我死掉的地方。",
      "an": "https://english.example.com/audio/ep/ep-video-strikinggold-2/s032-n-79d960.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-strikinggold-2/s032-s-89181d.mp3"
    },
    {
      "s": "s033",
      "e": "ep-video-strikinggold-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "I'm going to jump down there.",
      "zh": "我要跳下去。",
      "an": "https://english.example.com/audio/ep/ep-video-strikinggold-2/s033-n-dc3361.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-strikinggold-2/s033-s-3e9a96.mp3"
    },
    {
      "s": "s034",
      "e": "ep-video-strikinggold-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "We're safe.",
      "zh": "我们安全了。",
      "an": "https://english.example.com/audio/ep/ep-video-strikinggold-2/s034-n-8d1502.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-strikinggold-2/s034-s-0bd38a.mp3"
    },
    {
      "s": "s035",
      "e": "ep-video-strikinggold-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "All right, where is the skeleton?",
      "zh": "好，骷髅在哪里？",
      "an": "https://english.example.com/audio/ep/ep-video-strikinggold-2/s035-n-dfe3f0.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-strikinggold-2/s035-s-c416af.mp3"
    },
    {
      "s": "s036",
      "e": "ep-video-strikinggold-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "Gold and redstone! This is great.",
      "zh": "金子和红石！太好了。",
      "an": "https://english.example.com/audio/ep/ep-video-strikinggold-2/s036-n-52bab4.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-strikinggold-2/s036-s-a4b78c.mp3"
    },
    {
      "s": "s037",
      "e": "ep-video-strikinggold-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "Redstone can be used as electricity, so you can use redstone to build machines.",
      "zh": "红石可以当电来用，所以你能用红石做各种机械。",
      "an": "https://english.example.com/audio/ep/ep-video-strikinggold-2/s037-n-877d7f.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-strikinggold-2/s037-s-f74c2b.mp3"
    },
    {
      "s": "s038",
      "e": "ep-video-strikinggold-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "I'm running out of torches.",
      "zh": "我的火把快用完了。",
      "an": "https://english.example.com/audio/ep/ep-video-strikinggold-2/s038-n-42ae7f.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-strikinggold-2/s038-s-8899b1.mp3"
    },
    {
      "s": "s039",
      "e": "ep-video-strikinggold-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "There's a zombie with gold armor.",
      "zh": "有一只穿着金色盔甲的僵尸。",
      "an": "https://english.example.com/audio/ep/ep-video-strikinggold-2/s039-n-9867e3.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-strikinggold-2/s039-s-f0124e.mp3"
    },
    {
      "s": "s040",
      "e": "ep-video-strikinggold-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "Oh, a lot more iron! All right, there's still more iron.",
      "zh": "哦，又有好多铁！好，还有更多铁。",
      "an": "https://english.example.com/audio/ep/ep-video-strikinggold-2/s040-n-02b151.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-strikinggold-2/s040-s-94865e.mp3"
    },
    {
      "s": "s041",
      "e": "ep-video-strikinggold-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "These little slimes can't hurt me.",
      "zh": "这些小史莱姆伤不了我。",
      "an": "https://english.example.com/audio/ep/ep-video-strikinggold-2/s041-n-8b8fb6.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-strikinggold-2/s041-s-490fc2.mp3"
    },
    {
      "s": "s042",
      "e": "ep-video-strikinggold-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "These are slime balls.",
      "zh": "这些是黏液球。",
      "an": "https://english.example.com/audio/ep/ep-video-strikinggold-2/s042-n-c19649.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-strikinggold-2/s042-s-31b11d.mp3"
    },
    {
      "s": "s043",
      "e": "ep-video-strikinggold-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "Now back to collecting iron.",
      "zh": "现在继续挖铁。",
      "an": "https://english.example.com/audio/ep/ep-video-strikinggold-2/s043-n-e6e6e9.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-strikinggold-2/s043-s-d83f8e.mp3"
    },
    {
      "s": "s044",
      "e": "ep-video-strikinggold-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "I think that's all of the iron.",
      "zh": "我想铁已经挖完了。",
      "an": "https://english.example.com/audio/ep/ep-video-strikinggold-2/s044-n-5aa2cd.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-strikinggold-2/s044-s-58ba96.mp3"
    },
    {
      "s": "s045",
      "e": "ep-video-strikinggold-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "I don't see any more iron, and also my sword just broke, so now I'm going back home.",
      "zh": "我看不到更多铁了，而且我的剑刚刚断了，所以现在要回家。",
      "an": "https://english.example.com/audio/ep/ep-video-strikinggold-2/s045-n-7860ea.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-strikinggold-2/s045-s-dbdadd.mp3"
    },
    {
      "s": "s046",
      "e": "ep-video-strikinggold-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "I'm being chased by a spider.",
      "zh": "有一只蜘蛛在追我。",
      "an": "https://english.example.com/audio/ep/ep-video-strikinggold-2/s046-n-8a6d6d.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-strikinggold-2/s046-s-207425.mp3"
    },
    {
      "s": "s047",
      "e": "ep-video-strikinggold-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "Okay, so I died, but it was okay, because I got back all my things.",
      "zh": "好，所以我死过一次，但没关系，因为东西都拿回来了。",
      "an": "https://english.example.com/audio/ep/ep-video-strikinggold-2/s047-n-8d1743.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-strikinggold-2/s047-s-45a793.mp3"
    },
    {
      "s": "s048",
      "e": "ep-video-strikinggold-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "So now I'm going back up to my house with all the new iron and redstone and gold that I found.",
      "zh": "现在我要带着新挖到的铁、红石和金子回家。",
      "an": "https://english.example.com/audio/ep/ep-video-strikinggold-2/s048-n-4699e6.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-strikinggold-2/s048-s-0bec47.mp3"
    },
    {
      "s": "s049",
      "e": "ep-video-strikinggold-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "I'm going to close the doors.",
      "zh": "我要把门关上。",
      "an": "https://english.example.com/audio/ep/ep-video-strikinggold-2/s049-n-1c5c52.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-strikinggold-2/s049-s-c77e4e.mp3"
    },
    {
      "s": "s050",
      "e": "ep-video-strikinggold-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "Let's see what we got down there.",
      "zh": "我们看看在下面拿到了什么。",
      "an": "https://english.example.com/audio/ep/ep-video-strikinggold-2/s050-n-a962f4.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-strikinggold-2/s050-s-41411b.mp3"
    },
    {
      "s": "s051",
      "e": "ep-video-strikinggold-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "It looks like 84 redstone.",
      "zh": "看起来有 84 个红石。",
      "an": "https://english.example.com/audio/ep/ep-video-strikinggold-2/s051-n-149ee6.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-strikinggold-2/s051-s-667cc5.mp3"
    },
    {
      "s": "s052",
      "e": "ep-video-strikinggold-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "Put together, 64 plus 20 is 84.",
      "zh": "加在一起，64 加 20 等于 84。",
      "an": "https://english.example.com/audio/ep/ep-video-strikinggold-2/s052-n-543cac.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-strikinggold-2/s052-s-a76936.mp3"
    },
    {
      "s": "s053",
      "e": "ep-video-strikinggold-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "We have 63 raw iron, 27 gold, and nine slime balls.",
      "zh": "我们有 63 个原铁、27 个金子，还有 9 个黏液球。",
      "an": "https://english.example.com/audio/ep/ep-video-strikinggold-2/s053-n-642fc5.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-strikinggold-2/s053-s-20f490.mp3"
    },
    {
      "s": "s054",
      "e": "ep-video-strikinggold-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "Cool, I'm going to take the coal, put it inside the furnace.",
      "zh": "好，我要把煤拿出来，放进熔炉里。",
      "an": "https://english.example.com/audio/ep/ep-video-strikinggold-2/s054-n-2d7b46.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-strikinggold-2/s054-s-2160ff.mp3"
    },
    {
      "s": "s055",
      "e": "ep-video-strikinggold-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "And I'm going to put all the iron inside the furnace as well.",
      "zh": "我也要把所有的铁放进熔炉里。",
      "an": "https://english.example.com/audio/ep/ep-video-strikinggold-2/s055-n-c85503.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-strikinggold-2/s055-s-38f57e.mp3"
    },
    {
      "s": "s056",
      "e": "ep-video-strikinggold-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "So now we're smelting raw iron into iron ingots.",
      "zh": "现在我们在把原铁熔成铁锭。",
      "an": "https://english.example.com/audio/ep/ep-video-strikinggold-2/s056-n-347d1b.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-strikinggold-2/s056-s-844eb8.mp3"
    },
    {
      "s": "s057",
      "e": "ep-video-strikinggold-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "So with redstone and iron, I can build a compass.",
      "zh": "有了红石和铁，我就能做指南针。",
      "an": "https://english.example.com/audio/ep/ep-video-strikinggold-2/s057-n-07b99e.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-strikinggold-2/s057-s-79b358.mp3"
    },
    {
      "s": "s058",
      "e": "ep-video-strikinggold-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "Iron and one redstone dust makes a compass.",
      "zh": "铁和一份红石粉就能做出指南针。",
      "an": "https://english.example.com/audio/ep/ep-video-strikinggold-2/s058-n-4939cb.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-strikinggold-2/s058-s-7d98f7.mp3"
    },
    {
      "s": "s059",
      "e": "ep-video-strikinggold-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "Now I'm going to collect some sugar cane.",
      "zh": "现在我去收一些甘蔗。",
      "an": "https://english.example.com/audio/ep/ep-video-strikinggold-2/s059-n-f207d1.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-strikinggold-2/s059-s-6f831d.mp3"
    },
    {
      "s": "s060",
      "e": "ep-video-strikinggold-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "Sugar cane, just like that.",
      "zh": "甘蔗，就这样。",
      "an": "https://english.example.com/audio/ep/ep-video-strikinggold-2/s060-n-78c23c.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-strikinggold-2/s060-s-c7e411.mp3"
    },
    {
      "s": "s061",
      "e": "ep-video-strikinggold-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "So with sugar cane, I can make paper.",
      "zh": "有了甘蔗，我就能做纸。",
      "an": "https://english.example.com/audio/ep/ep-video-strikinggold-2/s061-n-c5d295.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-strikinggold-2/s061-s-2bc76c.mp3"
    },
    {
      "s": "s062",
      "e": "ep-video-strikinggold-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "So now with paper and the compass, I can make a map.",
      "zh": "现在有了纸和指南针，我就能做地图。",
      "an": "https://english.example.com/audio/ep/ep-video-strikinggold-2/s062-n-210249.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-strikinggold-2/s062-s-c1eeed.mp3"
    },
    {
      "s": "s063",
      "e": "ep-video-strikinggold-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "And now I can see where I am in the world by looking at the map.",
      "zh": "现在看着地图，我就知道自己在世界的哪里了。",
      "an": "https://english.example.com/audio/ep/ep-video-strikinggold-2/s063-n-8ddd76.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-strikinggold-2/s063-s-19a937.mp3"
    },
    {
      "s": "s064",
      "e": "ep-video-strikinggold-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "Oops, I threw the map.",
      "zh": "哎呀，我把地图扔掉了。",
      "an": "https://english.example.com/audio/ep/ep-video-strikinggold-2/s064-n-282d3d.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-strikinggold-2/s064-s-524033.mp3"
    },
    {
      "s": "s065",
      "e": "ep-video-strikinggold-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "Now that I have a map, I won't get lost nearly as easily.",
      "zh": "现在我有地图了，就不会那么容易迷路了。",
      "an": "https://english.example.com/audio/ep/ep-video-strikinggold-2/s065-n-4241e6.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-strikinggold-2/s065-s-74bd7b.mp3"
    },
    {
      "s": "s066",
      "e": "ep-video-strikinggold-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "So in the next video, I'm going to explore around my house to see if there's any more villages or caves or anything interesting around.",
      "zh": "下一集，我要在房子周围探索一下，看看附近还有没有村庄、洞穴，或别的有意思的东西。",
      "an": "https://english.example.com/audio/ep/ep-video-strikinggold-2/s066-n-212999.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-strikinggold-2/s066-s-4258a3.mp3"
    },
    {
      "s": "s067",
      "e": "ep-video-strikinggold-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "I think I'm going to end this video right here.",
      "zh": "我想这一集就到这里结束。",
      "an": "https://english.example.com/audio/ep/ep-video-strikinggold-2/s067-n-3affaa.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-strikinggold-2/s067-s-ebc300.mp3"
    },
    {
      "s": "s068",
      "e": "ep-video-strikinggold-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "And I will see you in the next video. See ya!",
      "zh": "我们下一集见。拜拜！",
      "an": "https://english.example.com/audio/ep/ep-video-strikinggold-2/s068-n-efc662.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-strikinggold-2/s068-s-b65de3.mp3"
    },
    {
      "s": "s001",
      "e": "ep-card-hurt-g3",
      "k": "card",
      "sp": "孩子",
      "en": "Mom, I bumped my knee. It hurts.",
      "zh": "妈妈，我磕到膝盖了。好疼。",
      "an": "https://english.example.com/audio/ep/ep-card-hurt-g3/s001-n-ca756a.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-hurt-g3/s001-s-d1f2ae.mp3"
    },
    {
      "s": "s002",
      "e": "ep-card-hurt-g3",
      "k": "card",
      "sp": "家长",
      "en": "Oh dear. Do you need a bandage?",
      "zh": "哎呀。你需要创可贴吗？",
      "an": "https://english.example.com/audio/ep/ep-card-hurt-g3/s002-n-c0e0af.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-hurt-g3/s002-s-4cbb7e.mp3"
    },
    {
      "s": "s003",
      "e": "ep-card-hurt-g3",
      "k": "card",
      "sp": "孩子",
      "en": "Yes, please. Can you help me?",
      "zh": "需要，拜托了。你能帮帮我吗？",
      "an": "https://english.example.com/audio/ep/ep-card-hurt-g3/s003-n-06c39d.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-hurt-g3/s003-s-39a239.mp3"
    },
    {
      "s": "s004",
      "e": "ep-card-hurt-g3",
      "k": "card",
      "sp": "家长",
      "en": "Of course. Does it still hurt a lot?",
      "zh": "当然。还很疼吗？",
      "an": "https://english.example.com/audio/ep/ep-card-hurt-g3/s004-n-45aeda.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-hurt-g3/s004-s-74f3a3.mp3"
    },
    {
      "s": "s005",
      "e": "ep-card-hurt-g3",
      "k": "card",
      "sp": "孩子",
      "en": "A little. I also have a headache.",
      "zh": "还有一点。我还头疼。",
      "an": "https://english.example.com/audio/ep/ep-card-hurt-g3/s005-n-146080.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-hurt-g3/s005-s-905c31.mp3"
    },
    {
      "s": "s006",
      "e": "ep-card-hurt-g3",
      "k": "card",
      "sp": "家长",
      "en": "Let's sit down and rest.",
      "zh": "我们坐下休息一下吧。",
      "an": "https://english.example.com/audio/ep/ep-card-hurt-g3/s006-n-23fab6.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-hurt-g3/s006-s-9f32fe.mp3"
    },
    {
      "s": "s001",
      "e": "ep-card-toys-g3",
      "k": "card",
      "sp": "孩子",
      "en": "Ben, can I play with your robot?",
      "zh": "Ben，我能玩你的机器人吗？",
      "an": "https://english.example.com/audio/ep/ep-card-toys-g3/s001-n-ac6ed2.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-toys-g3/s001-s-e4c964.mp3"
    },
    {
      "s": "s002",
      "e": "ep-card-toys-g3",
      "k": "card",
      "sp": "同学",
      "en": "Sure. But please be careful with it.",
      "zh": "当然。不过请小心一点。",
      "an": "https://english.example.com/audio/ep/ep-card-toys-g3/s002-n-467d82.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-toys-g3/s002-s-734c21.mp3"
    },
    {
      "s": "s003",
      "e": "ep-card-toys-g3",
      "k": "card",
      "sp": "孩子",
      "en": "I will. Do you want to try my car?",
      "zh": "我会的。你想试试我的小车吗？",
      "an": "https://english.example.com/audio/ep/ep-card-toys-g3/s003-n-83b727.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-toys-g3/s003-s-2c200e.mp3"
    },
    {
      "s": "s004",
      "e": "ep-card-toys-g3",
      "k": "card",
      "sp": "同学",
      "en": "Yes! We can play with both.",
      "zh": "好呀！两个都可以玩。",
      "an": "https://english.example.com/audio/ep/ep-card-toys-g3/s004-n-074da2.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-toys-g3/s004-s-c77005.mp3"
    },
    {
      "s": "s005",
      "e": "ep-card-toys-g3",
      "k": "card",
      "sp": "孩子",
      "en": "You can use my car first.",
      "zh": "你可以先玩我的小车。",
      "an": "https://english.example.com/audio/ep/ep-card-toys-g3/s005-n-d44099.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-toys-g3/s005-s-a58d0f.mp3"
    },
    {
      "s": "s006",
      "e": "ep-card-toys-g3",
      "k": "card",
      "sp": "同学",
      "en": "Wow, your car is so cool!",
      "zh": "哇，你的小车好酷！",
      "an": "https://english.example.com/audio/ep/ep-card-toys-g3/s006-n-b233d1.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-toys-g3/s006-s-9b147f.mp3"
    },
    {
      "s": "s001",
      "e": "ep-card-park-g3",
      "k": "card",
      "sp": "孩子",
      "en": "Mom, can we go to the park today?",
      "zh": "妈妈，我们今天能去公园吗？",
      "an": "https://english.example.com/audio/ep/ep-card-park-g3/s001-n-1ae7c3.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-park-g3/s001-s-55a124.mp3"
    },
    {
      "s": "s002",
      "e": "ep-card-park-g3",
      "k": "card",
      "sp": "家长",
      "en": "Yes. What do you want to do there?",
      "zh": "可以。你在那儿想做什么？",
      "an": "https://english.example.com/audio/ep/ep-card-park-g3/s002-n-484e9c.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-park-g3/s002-s-d80c34.mp3"
    },
    {
      "s": "s003",
      "e": "ep-card-park-g3",
      "k": "card",
      "sp": "孩子",
      "en": "I want to swing and go down the slide.",
      "zh": "我想荡秋千，再滑滑梯。",
      "an": "https://english.example.com/audio/ep/ep-card-park-g3/s003-n-1b0cb0.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-park-g3/s003-s-427a11.mp3"
    },
    {
      "s": "s004",
      "e": "ep-card-park-g3",
      "k": "card",
      "sp": "家长",
      "en": "Sounds good. Please put on your shoes.",
      "zh": "好。请穿上鞋子。",
      "an": "https://english.example.com/audio/ep/ep-card-park-g3/s004-n-031bd2.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-park-g3/s004-s-97a1f6.mp3"
    },
    {
      "s": "s005",
      "e": "ep-card-park-g3",
      "k": "card",
      "sp": "孩子",
      "en": "I'm all set. Can Ben come with us?",
      "zh": "我准备好了。Ben 能和我们一起去吗？",
      "an": "https://english.example.com/audio/ep/ep-card-park-g3/s005-n-701edb.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-park-g3/s005-s-4b5dd6.mp3"
    },
    {
      "s": "s006",
      "e": "ep-card-park-g3",
      "k": "card",
      "sp": "家长",
      "en": "Of course. Let's go together!",
      "zh": "当然。我们一起走吧！",
      "an": "https://english.example.com/audio/ep/ep-card-park-g3/s006-n-1fdca3.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-park-g3/s006-s-a3cbc5.mp3"
    },
    {
      "s": "s001",
      "e": "ep-video-losteverything-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "Hello and welcome back to Learning English with Minecraft.",
      "zh": "大家好，欢迎回到“用《我的世界》学英语”。",
      "an": "https://english.example.com/audio/ep/ep-video-losteverything-1/s001-n-e6a7e0.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-losteverything-1/s001-s-fe08ac.mp3"
    },
    {
      "s": "s002",
      "e": "ep-video-losteverything-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "My name is Kenzo, and this is English from the Ground Up.",
      "zh": "我叫 Kenzo，这就是 English from the Ground Up。",
      "an": "https://english.example.com/audio/ep/ep-video-losteverything-1/s002-n-cae684.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-losteverything-1/s002-s-01fbe0.mp3"
    },
    {
      "s": "s003",
      "e": "ep-video-losteverything-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "In the last video, I found some carrots and watermelon and planted them here at my house.",
      "zh": "在上一集里，我找到了一些胡萝卜和西瓜，把它们种在了房子这儿。",
      "an": "https://english.example.com/audio/ep/ep-video-losteverything-1/s003-n-f9eeef.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-losteverything-1/s003-s-5a172b.mp3"
    },
    {
      "s": "s004",
      "e": "ep-video-losteverything-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "And off camera, I was going to expand this farm this way.",
      "zh": "镜头外面，我本来打算把这块农田往这边扩大。",
      "an": "https://english.example.com/audio/ep/ep-video-losteverything-1/s004-n-c82138.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-losteverything-1/s004-s-6affe7.mp3"
    },
    {
      "s": "s005",
      "e": "ep-video-losteverything-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "So I got a shovel and started digging up all the sand.",
      "zh": "所以我拿了一把铲子，开始把沙子都挖掉。",
      "an": "https://english.example.com/audio/ep/ep-video-losteverything-1/s005-n-5ef22c.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-losteverything-1/s005-s-a5e328.mp3"
    },
    {
      "s": "s006",
      "e": "ep-video-losteverything-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "And as I was digging up the sand, I noticed something.",
      "zh": "我在挖沙子的时候，注意到了一件事。",
      "an": "https://english.example.com/audio/ep/ep-video-losteverything-1/s006-n-881f29.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-losteverything-1/s006-s-05ddf6.mp3"
    },
    {
      "s": "s007",
      "e": "ep-video-losteverything-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "Right now I have a stone shovel, so watch how fast I can dig with a stone shovel.",
      "zh": "现在我用的是石铲，看看我用石铲挖得有多快。",
      "an": "https://english.example.com/audio/ep/ep-video-losteverything-1/s007-n-221a49.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-losteverything-1/s007-s-216c2a.mp3"
    },
    {
      "s": "s008",
      "e": "ep-video-losteverything-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "Look at this shovel. This shovel is gold.",
      "zh": "看这把铲子。这是金铲子。",
      "an": "https://english.example.com/audio/ep/ep-video-losteverything-1/s008-n-9e3e81.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-losteverything-1/s008-s-4b88b4.mp3"
    },
    {
      "s": "s009",
      "e": "ep-video-losteverything-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "It's a gold shovel, and this shovel is also enchanted with magical abilities.",
      "zh": "这是一把金铲，而且还附了魔法。",
      "an": "https://english.example.com/audio/ep/ep-video-losteverything-1/s009-n-1c8a05.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-losteverything-1/s009-s-106a75.mp3"
    },
    {
      "s": "s010",
      "e": "ep-video-losteverything-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "So now, watch how fast I can dig with this shovel.",
      "zh": "现在看看，我用这把铲子挖得有多快。",
      "an": "https://english.example.com/audio/ep/ep-video-losteverything-1/s010-n-b1dd97.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-losteverything-1/s010-s-61f46d.mp3"
    },
    {
      "s": "s011",
      "e": "ep-video-losteverything-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "Do you see how fast that shovel dug up the sand?",
      "zh": "看见了吗？那把铲子挖沙子有多快？",
      "an": "https://english.example.com/audio/ep/ep-video-losteverything-1/s011-n-083b0d.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-losteverything-1/s011-s-aefba2.mp3"
    },
    {
      "s": "s012",
      "e": "ep-video-losteverything-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "This made me realize that before I start building huge structures and digging up the sands to expand the farm, I should find some diamonds and make diamond tools.",
      "zh": "这让我明白，在开始盖巨大的建筑、挖沙扩农田之前，我应该先找到钻石，做出钻石工具。",
      "an": "https://english.example.com/audio/ep/ep-video-losteverything-1/s012-n-d410b8.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-losteverything-1/s012-s-923577.mp3"
    },
    {
      "s": "s013",
      "e": "ep-video-losteverything-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "Because with diamond tools, all of that will be way faster.",
      "zh": "因为有了钻石工具，那些事都会快很多。",
      "an": "https://english.example.com/audio/ep/ep-video-losteverything-1/s013-n-ec2e4d.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-losteverything-1/s013-s-bf6c30.mp3"
    },
    {
      "s": "s014",
      "e": "ep-video-losteverything-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "So in this video, I'm going to find diamonds.",
      "zh": "所以这一集里，我要去找钻石。",
      "an": "https://english.example.com/audio/ep/ep-video-losteverything-1/s014-n-b02ae4.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-losteverything-1/s014-s-4e1e55.mp3"
    },
    {
      "s": "s015",
      "e": "ep-video-losteverything-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "And I'm not ending this video until I find diamonds.",
      "zh": "找不到钻石，这一集就不结束。",
      "an": "https://english.example.com/audio/ep/ep-video-losteverything-1/s015-n-d68d4a.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-losteverything-1/s015-s-f35c9f.mp3"
    },
    {
      "s": "s016",
      "e": "ep-video-losteverything-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "I'm going to sleep.",
      "zh": "我要去睡觉了。",
      "an": "https://english.example.com/audio/ep/ep-video-losteverything-1/s016-n-d32747.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-losteverything-1/s016-s-d52a69.mp3"
    },
    {
      "s": "s017",
      "e": "ep-video-losteverything-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "And in the morning, I'm going to collect all the things I'll need to go adventuring underground to search for diamonds.",
      "zh": "早上我要把地下冒险找钻石需要的东西都准备好。",
      "an": "https://english.example.com/audio/ep/ep-video-losteverything-1/s017-n-505831.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-losteverything-1/s017-s-b5e425.mp3"
    },
    {
      "s": "s018",
      "e": "ep-video-losteverything-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "So it's morning.",
      "zh": "好了，现在是早上。",
      "an": "https://english.example.com/audio/ep/ep-video-losteverything-1/s018-n-f07f25.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-losteverything-1/s018-s-437cec.mp3"
    },
    {
      "s": "s019",
      "e": "ep-video-losteverything-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "I can hear this zombie.",
      "zh": "我能听到这只僵尸。",
      "an": "https://english.example.com/audio/ep/ep-video-losteverything-1/s019-n-15900d.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-losteverything-1/s019-s-c0393c.mp3"
    },
    {
      "s": "s020",
      "e": "ep-video-losteverything-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "Okay, now I think that I have everything I will need to go exploring underground.",
      "zh": "好，现在我想地下探险需要的东西我都有了。",
      "an": "https://english.example.com/audio/ep/ep-video-losteverything-1/s020-n-bef09a.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-losteverything-1/s020-s-031f2f.mp3"
    },
    {
      "s": "s021",
      "e": "ep-video-losteverything-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "I have one, two, three, four, five, six pickaxes.",
      "zh": "我有一把、两把、三把、四把、五把、六把镐。",
      "an": "https://english.example.com/audio/ep/ep-video-losteverything-1/s021-n-80bab1.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-losteverything-1/s021-s-77224d.mp3"
    },
    {
      "s": "s022",
      "e": "ep-video-losteverything-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "One, two, three swords, and some torches, some food.",
      "zh": "一把、两把、三把剑，还有一些火把和食物。",
      "an": "https://english.example.com/audio/ep/ep-video-losteverything-1/s022-n-b0779a.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-losteverything-1/s022-s-e7d7ab.mp3"
    },
    {
      "s": "s023",
      "e": "ep-video-losteverything-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "I think I have everything I will need.",
      "zh": "我想需要的东西我都有了。",
      "an": "https://english.example.com/audio/ep/ep-video-losteverything-1/s023-n-6d214c.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-losteverything-1/s023-s-1ef982.mp3"
    },
    {
      "s": "s024",
      "e": "ep-video-losteverything-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "So I'm going to go search for a cave.",
      "zh": "所以我要去找一个洞穴。",
      "an": "https://english.example.com/audio/ep/ep-video-losteverything-1/s024-n-c8bf7f.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-losteverything-1/s024-s-d183f8.mp3"
    },
    {
      "s": "s025",
      "e": "ep-video-losteverything-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "There's a zombie with gold armor.",
      "zh": "那儿有一只穿着金盔甲的僵尸。",
      "an": "https://english.example.com/audio/ep/ep-video-losteverything-1/s025-n-9867e3.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-losteverything-1/s025-s-f0124e.mp3"
    },
    {
      "s": "s026",
      "e": "ep-video-losteverything-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "Where could a cave be?",
      "zh": "洞穴会在哪儿呢？",
      "an": "https://english.example.com/audio/ep/ep-video-losteverything-1/s026-n-1b7426.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-losteverything-1/s026-s-6fff4d.mp3"
    },
    {
      "s": "s027",
      "e": "ep-video-losteverything-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "I'm going to head into the forest that way.",
      "zh": "我准备往那边的森林走。",
      "an": "https://english.example.com/audio/ep/ep-video-losteverything-1/s027-n-b355c1.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-losteverything-1/s027-s-dbaf18.mp3"
    },
    {
      "s": "s028",
      "e": "ep-video-losteverything-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "Wow, there are lots of monsters chasing me.",
      "zh": "哇，好多怪物在追我。",
      "an": "https://english.example.com/audio/ep/ep-video-losteverything-1/s028-n-3f5210.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-losteverything-1/s028-s-1252f8.mp3"
    },
    {
      "s": "s029",
      "e": "ep-video-losteverything-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "All right, the forest.",
      "zh": "好了，到森林了。",
      "an": "https://english.example.com/audio/ep/ep-video-losteverything-1/s029-n-98c89d.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-losteverything-1/s029-s-192471.mp3"
    },
    {
      "s": "s030",
      "e": "ep-video-losteverything-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "It's raining.",
      "zh": "下雨了。",
      "an": "https://english.example.com/audio/ep/ep-video-losteverything-1/s030-n-d9f301.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-losteverything-1/s030-s-679bf6.mp3"
    },
    {
      "s": "s031",
      "e": "ep-video-losteverything-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "I haven't found a cave yet.",
      "zh": "我还没找到洞穴。",
      "an": "https://english.example.com/audio/ep/ep-video-losteverything-1/s031-n-e7c6b8.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-losteverything-1/s031-s-54d605.mp3"
    },
    {
      "s": "s032",
      "e": "ep-video-losteverything-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "I'm still searching.",
      "zh": "我还在找。",
      "an": "https://english.example.com/audio/ep/ep-video-losteverything-1/s032-n-86c13e.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-losteverything-1/s032-s-abb517.mp3"
    },
    {
      "s": "s033",
      "e": "ep-video-losteverything-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "When it's raining, the monsters don't burn in the sunlight.",
      "zh": "下雨的时候，怪物不会被阳光烧死。",
      "an": "https://english.example.com/audio/ep/ep-video-losteverything-1/s033-n-b733a9.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-losteverything-1/s033-s-f6427d.mp3"
    },
    {
      "s": "s034",
      "e": "ep-video-losteverything-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "Because there's no sun up there in the sky.",
      "zh": "因为天上没有太阳。",
      "an": "https://english.example.com/audio/ep/ep-video-losteverything-1/s034-n-e17737.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-losteverything-1/s034-s-bb40a8.mp3"
    },
    {
      "s": "s035",
      "e": "ep-video-losteverything-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "It's just gray. The skies are just gray.",
      "zh": "全是灰的。天空就是灰色的。",
      "an": "https://english.example.com/audio/ep/ep-video-losteverything-1/s035-n-6e080b.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-losteverything-1/s035-s-c773f2.mp3"
    },
    {
      "s": "s036",
      "e": "ep-video-losteverything-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "This is really dangerous.",
      "zh": "这真的很危险。",
      "an": "https://english.example.com/audio/ep/ep-video-losteverything-1/s036-n-74336b.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-losteverything-1/s036-s-7f77fa.mp3"
    },
    {
      "s": "s037",
      "e": "ep-video-losteverything-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "Okay, I'm gonna go down here.",
      "zh": "好，我要从这儿下去。",
      "an": "https://english.example.com/audio/ep/ep-video-losteverything-1/s037-n-420f39.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-losteverything-1/s037-s-f5132b.mp3"
    },
    {
      "s": "s038",
      "e": "ep-video-losteverything-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "I'm glad that I have armor.",
      "zh": "幸好我有盔甲。",
      "an": "https://english.example.com/audio/ep/ep-video-losteverything-1/s038-n-d8952f.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-losteverything-1/s038-s-be4575.mp3"
    },
    {
      "s": "s039",
      "e": "ep-video-losteverything-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "I'm going to place a torch.",
      "zh": "我要点一根火把。",
      "an": "https://english.example.com/audio/ep/ep-video-losteverything-1/s039-n-dd160a.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-losteverything-1/s039-s-3c5ce7.mp3"
    },
    {
      "s": "s040",
      "e": "ep-video-losteverything-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "Okay, this cave stops right here, so I'm going back up.",
      "zh": "好，这个洞穴到这儿就到头了，所以我要回到上面去。",
      "an": "https://english.example.com/audio/ep/ep-video-losteverything-1/s040-n-95bf60.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-losteverything-1/s040-s-318f9b.mp3"
    },
    {
      "s": "s041",
      "e": "ep-video-losteverything-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "Okay, we're here at the surface.",
      "zh": "好，我们到地面了。",
      "an": "https://english.example.com/audio/ep/ep-video-losteverything-1/s041-n-dfefad.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-losteverything-1/s041-s-06e32a.mp3"
    },
    {
      "s": "s042",
      "e": "ep-video-losteverything-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "And I'm going to run.",
      "zh": "我要跑起来了。",
      "an": "https://english.example.com/audio/ep/ep-video-losteverything-1/s042-n-901885.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-losteverything-1/s042-s-ec1129.mp3"
    },
    {
      "s": "s043",
      "e": "ep-video-losteverything-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "Is that the village over there?",
      "zh": "那边是村子吗？",
      "an": "https://english.example.com/audio/ep/ep-video-losteverything-1/s043-n-8a124b.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-losteverything-1/s043-s-37c6be.mp3"
    },
    {
      "s": "s044",
      "e": "ep-video-losteverything-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "I think so.",
      "zh": "我想是的。",
      "an": "https://english.example.com/audio/ep/ep-video-losteverything-1/s044-n-133669.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-losteverything-1/s044-s-c4e974.mp3"
    },
    {
      "s": "s045",
      "e": "ep-video-losteverything-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "I can sleep at the village for tonight.",
      "zh": "今晚我可以在村子里睡觉。",
      "an": "https://english.example.com/audio/ep/ep-video-losteverything-1/s045-n-cc7dc9.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-losteverything-1/s045-s-5c7be2.mp3"
    },
    {
      "s": "s046",
      "e": "ep-video-losteverything-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "Okay, we're here.",
      "zh": "好，我们到了。",
      "an": "https://english.example.com/audio/ep/ep-video-losteverything-1/s046-n-dff7f9.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-losteverything-1/s046-s-e61f5e.mp3"
    },
    {
      "s": "s047",
      "e": "ep-video-losteverything-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "Finally, someplace safe.",
      "zh": "终于有个安全的地方了。",
      "an": "https://english.example.com/audio/ep/ep-video-losteverything-1/s047-n-00da96.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-losteverything-1/s047-s-41040f.mp3"
    },
    {
      "s": "s048",
      "e": "ep-video-losteverything-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "I'm going to find a bed.",
      "zh": "我要去找一张床。",
      "an": "https://english.example.com/audio/ep/ep-video-losteverything-1/s048-n-089a93.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-losteverything-1/s048-s-2e7d90.mp3"
    },
    {
      "s": "s049",
      "e": "ep-video-losteverything-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "Here's one.",
      "zh": "这儿有一张。",
      "an": "https://english.example.com/audio/ep/ep-video-losteverything-1/s049-n-cefd6e.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-losteverything-1/s049-s-272c4e.mp3"
    },
    {
      "s": "s050",
      "e": "ep-video-losteverything-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "And sleep.",
      "zh": "然后睡觉。",
      "an": "https://english.example.com/audio/ep/ep-video-losteverything-1/s050-n-cc8edb.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-losteverything-1/s050-s-a61fc4.mp3"
    },
    {
      "s": "s051",
      "e": "ep-video-losteverything-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "And hopefully in the morning it won't be raining anymore.",
      "zh": "希望早上就不会再下雨了。",
      "an": "https://english.example.com/audio/ep/ep-video-losteverything-1/s051-n-19a1c4.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-losteverything-1/s051-s-7504ed.mp3"
    },
    {
      "s": "s052",
      "e": "ep-video-losteverything-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "There we go. Good weather.",
      "zh": "好了。天气不错。",
      "an": "https://english.example.com/audio/ep/ep-video-losteverything-1/s052-n-696849.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-losteverything-1/s052-s-2738bd.mp3"
    },
    {
      "s": "s053",
      "e": "ep-video-losteverything-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "Blue skies, the sun.",
      "zh": "蓝天，还有太阳。",
      "an": "https://english.example.com/audio/ep/ep-video-losteverything-1/s053-n-c59bab.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-losteverything-1/s053-s-860830.mp3"
    },
    {
      "s": "s054",
      "e": "ep-video-losteverything-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "No rain. That is good for me.",
      "zh": "没有雨。这对我来说正好。",
      "an": "https://english.example.com/audio/ep/ep-video-losteverything-1/s054-n-574eae.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-losteverything-1/s054-s-868086.mp3"
    },
    {
      "s": "s055",
      "e": "ep-video-losteverything-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "It's time to go back to my search for a cave.",
      "zh": "该继续去找洞穴了。",
      "an": "https://english.example.com/audio/ep/ep-video-losteverything-1/s055-n-8fb380.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-losteverything-1/s055-s-7095a8.mp3"
    },
    {
      "s": "s001",
      "e": "ep-video-losteverything-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "In the last video, I found this swamp right here, but I didn't explore it.",
      "zh": "上一集里，我发现了这边这块沼泽，但当时没有进去探索。",
      "an": "https://english.example.com/audio/ep/ep-video-losteverything-2/s001-n-a8b60d.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-losteverything-2/s001-s-c168ca.mp3"
    },
    {
      "s": "s002",
      "e": "ep-video-losteverything-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "So now I think that it's time to explore this swamp.",
      "zh": "所以现在我想，该来探索这块沼泽了。",
      "an": "https://english.example.com/audio/ep/ep-video-losteverything-2/s002-n-e91807.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-losteverything-2/s002-s-af4430.mp3"
    },
    {
      "s": "s003",
      "e": "ep-video-losteverything-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "The swamps are a new biome I haven't yet explored, a swamp like this in Minecraft.",
      "zh": "沼泽是一种新的生物群系。在《我的世界》里，我还没探索过这样的沼泽。",
      "an": "https://english.example.com/audio/ep/ep-video-losteverything-2/s003-n-ba52b4.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-losteverything-2/s003-s-9f1e29.mp3"
    },
    {
      "s": "s004",
      "e": "ep-video-losteverything-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "So this should be exciting.",
      "zh": "所以这应该会很有趣。",
      "an": "https://english.example.com/audio/ep/ep-video-losteverything-2/s004-n-c209c6.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-losteverything-2/s004-s-2eeb36.mp3"
    },
    {
      "s": "s005",
      "e": "ep-video-losteverything-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "I see lots of roots.",
      "zh": "我看到好多树根。",
      "an": "https://english.example.com/audio/ep/ep-video-losteverything-2/s005-n-f8b5b7.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-losteverything-2/s005-s-ad47f9.mp3"
    },
    {
      "s": "s006",
      "e": "ep-video-losteverything-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "Are these roots mangrove roots?",
      "zh": "这些树根是红树根吗？",
      "an": "https://english.example.com/audio/ep/ep-video-losteverything-2/s006-n-409c2f.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-losteverything-2/s006-s-b88757.mp3"
    },
    {
      "s": "s007",
      "e": "ep-video-losteverything-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "Wow, I can't see anything here.",
      "zh": "哇，我在这儿什么都看不清。",
      "an": "https://english.example.com/audio/ep/ep-video-losteverything-2/s007-n-3fb734.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-losteverything-2/s007-s-1be304.mp3"
    },
    {
      "s": "s008",
      "e": "ep-video-losteverything-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "Some fish.",
      "zh": "有一些鱼。",
      "an": "https://english.example.com/audio/ep/ep-video-losteverything-2/s008-n-5a6044.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-losteverything-2/s008-s-85a681.mp3"
    },
    {
      "s": "s009",
      "e": "ep-video-losteverything-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "Wow, I really like the swamp.",
      "zh": "哇，我真的很喜欢这片沼泽。",
      "an": "https://english.example.com/audio/ep/ep-video-losteverything-2/s009-n-445a18.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-losteverything-2/s009-s-46ef5d.mp3"
    },
    {
      "s": "s010",
      "e": "ep-video-losteverything-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "Lots of different fish.",
      "zh": "有好多不同的鱼。",
      "an": "https://english.example.com/audio/ep/ep-video-losteverything-2/s010-n-1f843e.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-losteverything-2/s010-s-84670c.mp3"
    },
    {
      "s": "s011",
      "e": "ep-video-losteverything-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "I don't know what this fish is doing.",
      "zh": "我不知道这条鱼在干什么。",
      "an": "https://english.example.com/audio/ep/ep-video-losteverything-2/s011-n-7ffd43.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-losteverything-2/s011-s-e0ccbb.mp3"
    },
    {
      "s": "s012",
      "e": "ep-video-losteverything-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "It's just spinning around in circles.",
      "zh": "它就在那儿转圈。",
      "an": "https://english.example.com/audio/ep/ep-video-losteverything-2/s012-n-8e2f73.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-losteverything-2/s012-s-6715a4.mp3"
    },
    {
      "s": "s013",
      "e": "ep-video-losteverything-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "This one too.",
      "zh": "这条也是。",
      "an": "https://english.example.com/audio/ep/ep-video-losteverything-2/s013-n-c21e81.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-losteverything-2/s013-s-a05401.mp3"
    },
    {
      "s": "s014",
      "e": "ep-video-losteverything-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "Think the fish are glitched out.",
      "zh": "感觉这些鱼出故障了。",
      "an": "https://english.example.com/audio/ep/ep-video-losteverything-2/s014-n-895f8f.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-losteverything-2/s014-s-ba0fe9.mp3"
    },
    {
      "s": "s015",
      "e": "ep-video-losteverything-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "They're having a rave party.",
      "zh": "它们像在开狂欢派对。",
      "an": "https://english.example.com/audio/ep/ep-video-losteverything-2/s015-n-0527b6.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-losteverything-2/s015-s-2e913a.mp3"
    },
    {
      "s": "s016",
      "e": "ep-video-losteverything-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "This fish is normal.",
      "zh": "这条鱼是正常的。",
      "an": "https://english.example.com/audio/ep/ep-video-losteverything-2/s016-n-19017c.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-losteverything-2/s016-s-b91362.mp3"
    },
    {
      "s": "s017",
      "e": "ep-video-losteverything-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "This is a normal fish.",
      "zh": "这是一条正常的鱼。",
      "an": "https://english.example.com/audio/ep/ep-video-losteverything-2/s017-n-5bc67c.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-losteverything-2/s017-s-1ec053.mp3"
    },
    {
      "s": "s018",
      "e": "ep-video-losteverything-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "This fish isn't dancing.",
      "zh": "这条鱼没有在跳舞。",
      "an": "https://english.example.com/audio/ep/ep-video-losteverything-2/s018-n-c03e5d.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-losteverything-2/s018-s-f5cffe.mp3"
    },
    {
      "s": "s019",
      "e": "ep-video-losteverything-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "I am completely lost.",
      "zh": "我完全迷路了。",
      "an": "https://english.example.com/audio/ep/ep-video-losteverything-2/s019-n-c399e2.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-losteverything-2/s019-s-e70025.mp3"
    },
    {
      "s": "s020",
      "e": "ep-video-losteverything-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "I have no idea where I am.",
      "zh": "我完全不知道自己在哪儿。",
      "an": "https://english.example.com/audio/ep/ep-video-losteverything-2/s020-n-3a0466.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-losteverything-2/s020-s-275d89.mp3"
    },
    {
      "s": "s021",
      "e": "ep-video-losteverything-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "But it's okay, because I have a map.",
      "zh": "不过没关系，因为我有地图。",
      "an": "https://english.example.com/audio/ep/ep-video-losteverything-2/s021-n-505bed.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-losteverything-2/s021-s-71845b.mp3"
    },
    {
      "s": "s022",
      "e": "ep-video-losteverything-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "I still haven't found a cave.",
      "zh": "我还是没有找到洞穴。",
      "an": "https://english.example.com/audio/ep/ep-video-losteverything-2/s022-n-834066.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-losteverything-2/s022-s-d32f68.mp3"
    },
    {
      "s": "s023",
      "e": "ep-video-losteverything-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "It's a little pond right here.",
      "zh": "这边有个小池塘。",
      "an": "https://english.example.com/audio/ep/ep-video-losteverything-2/s023-n-eedabd.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-losteverything-2/s023-s-8cbbac.mp3"
    },
    {
      "s": "s024",
      "e": "ep-video-losteverything-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "I'm going to leave the swamp because I can't see very well in the swamp, and I'm looking for a cave.",
      "zh": "我要离开沼泽了，因为在沼泽里看不太清，而且我在找洞穴。",
      "an": "https://english.example.com/audio/ep/ep-video-losteverything-2/s024-n-27ab30.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-losteverything-2/s024-s-fe4fdb.mp3"
    },
    {
      "s": "s025",
      "e": "ep-video-losteverything-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "Any caves?",
      "zh": "有洞穴吗？",
      "an": "https://english.example.com/audio/ep/ep-video-losteverything-2/s025-n-098ece.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-losteverything-2/s025-s-0eea86.mp3"
    },
    {
      "s": "s026",
      "e": "ep-video-losteverything-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "Oh, maybe over there.",
      "zh": "哦，也许在那边。",
      "an": "https://english.example.com/audio/ep/ep-video-losteverything-2/s026-n-3aa70f.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-losteverything-2/s026-s-9aa3ad.mp3"
    },
    {
      "s": "s027",
      "e": "ep-video-losteverything-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "Nope, not a cave.",
      "zh": "不是，不是洞穴。",
      "an": "https://english.example.com/audio/ep/ep-video-losteverything-2/s027-n-b7be0f.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-losteverything-2/s027-s-8ed9ae.mp3"
    },
    {
      "s": "s028",
      "e": "ep-video-losteverything-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "It's the village again.",
      "zh": "又是那个村子。",
      "an": "https://english.example.com/audio/ep/ep-video-losteverything-2/s028-n-c9bfa7.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-losteverything-2/s028-s-a4a531.mp3"
    },
    {
      "s": "s029",
      "e": "ep-video-losteverything-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "I went in a circle.",
      "zh": "我走了一个圈。",
      "an": "https://english.example.com/audio/ep/ep-video-losteverything-2/s029-n-8c6d3a.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-losteverything-2/s029-s-401f87.mp3"
    },
    {
      "s": "s030",
      "e": "ep-video-losteverything-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "I am the worst in the world with directions.",
      "zh": "我的方向感是世界上最差的。",
      "an": "https://english.example.com/audio/ep/ep-video-losteverything-2/s030-n-3849d8.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-losteverything-2/s030-s-e08c95.mp3"
    },
    {
      "s": "s031",
      "e": "ep-video-losteverything-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "I went in a big circle.",
      "zh": "我走了一个大圈。",
      "an": "https://english.example.com/audio/ep/ep-video-losteverything-2/s031-n-5f1c73.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-losteverything-2/s031-s-0a3b9d.mp3"
    },
    {
      "s": "s032",
      "e": "ep-video-losteverything-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "Nope, not a cave.",
      "zh": "不是，不是洞穴。",
      "an": "https://english.example.com/audio/ep/ep-video-losteverything-2/s032-n-b7be0f.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-losteverything-2/s032-s-8ed9ae.mp3"
    },
    {
      "s": "s033",
      "e": "ep-video-losteverything-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "Still no caves.",
      "zh": "还是没有洞穴。",
      "an": "https://english.example.com/audio/ep/ep-video-losteverything-2/s033-n-d24c5a.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-losteverything-2/s033-s-06adc0.mp3"
    },
    {
      "s": "s034",
      "e": "ep-video-losteverything-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "Where are you?",
      "zh": "你在哪儿啊？",
      "an": "https://english.example.com/audio/ep/ep-video-losteverything-2/s034-n-c51c04.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-losteverything-2/s034-s-8a6474.mp3"
    },
    {
      "s": "s035",
      "e": "ep-video-losteverything-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "Nope again, no cave.",
      "zh": "又不是，没有洞穴。",
      "an": "https://english.example.com/audio/ep/ep-video-losteverything-2/s035-n-7a5212.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-losteverything-2/s035-s-72baa7.mp3"
    },
    {
      "s": "s036",
      "e": "ep-video-losteverything-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "Any caves anywhere?",
      "zh": "到底哪儿有洞穴？",
      "an": "https://english.example.com/audio/ep/ep-video-losteverything-2/s036-n-398e53.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-losteverything-2/s036-s-cf60b9.mp3"
    },
    {
      "s": "s037",
      "e": "ep-video-losteverything-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "Oh wow, that is a beautiful waterfall over there.",
      "zh": "哇，那边有一条好漂亮的瀑布。",
      "an": "https://english.example.com/audio/ep/ep-video-losteverything-2/s037-n-2095fd.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-losteverything-2/s037-s-cd19f0.mp3"
    },
    {
      "s": "s038",
      "e": "ep-video-losteverything-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "Are you a cave?",
      "zh": "你是洞穴吗？",
      "an": "https://english.example.com/audio/ep/ep-video-losteverything-2/s038-n-b9ad59.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-losteverything-2/s038-s-925f60.mp3"
    },
    {
      "s": "s039",
      "e": "ep-video-losteverything-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "Okay, this looks like a cave.",
      "zh": "好，这儿看起来像个洞穴。",
      "an": "https://english.example.com/audio/ep/ep-video-losteverything-2/s039-n-91aa1e.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-losteverything-2/s039-s-92e173.mp3"
    },
    {
      "s": "s040",
      "e": "ep-video-losteverything-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "It's been 30 minutes, and I finally found a cave that looks promising.",
      "zh": "已经过了 30 分钟，我终于找到一个看起来有希望的洞穴。",
      "an": "https://english.example.com/audio/ep/ep-video-losteverything-2/s040-n-ca2ce5.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-losteverything-2/s040-s-3e0475.mp3"
    },
    {
      "s": "s041",
      "e": "ep-video-losteverything-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "So I'm going to go down there.",
      "zh": "所以我要从这儿下去。",
      "an": "https://english.example.com/audio/ep/ep-video-losteverything-2/s041-n-de4317.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-losteverything-2/s041-s-73062a.mp3"
    },
    {
      "s": "s042",
      "e": "ep-video-losteverything-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "Ooh, there's light down here.",
      "zh": "哦，下面有光。",
      "an": "https://english.example.com/audio/ep/ep-video-losteverything-2/s042-n-f381eb.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-losteverything-2/s042-s-2f0edb.mp3"
    },
    {
      "s": "s043",
      "e": "ep-video-losteverything-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "I'm going to place a torch.",
      "zh": "我要点一根火把。",
      "an": "https://english.example.com/audio/ep/ep-video-losteverything-2/s043-n-dd160a.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-losteverything-2/s043-s-3c5ce7.mp3"
    },
    {
      "s": "s044",
      "e": "ep-video-losteverything-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "Where is this light coming from?",
      "zh": "这光是从哪儿来的？",
      "an": "https://english.example.com/audio/ep/ep-video-losteverything-2/s044-n-05aaaf.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-losteverything-2/s044-s-5925d2.mp3"
    },
    {
      "s": "s045",
      "e": "ep-video-losteverything-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "Oh, weird.",
      "zh": "哦，好奇怪。",
      "an": "https://english.example.com/audio/ep/ep-video-losteverything-2/s045-n-a56ee1.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-losteverything-2/s045-s-213ea3.mp3"
    },
    {
      "s": "s046",
      "e": "ep-video-losteverything-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "I can't believe that we're already five episodes into this series and I haven't found diamonds.",
      "zh": "真不敢相信这个系列都已经更新到第五集了，我还没找到钻石。",
      "an": "https://english.example.com/audio/ep/ep-video-losteverything-2/s046-n-c57ca5.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-losteverything-2/s046-s-010082.mp3"
    },
    {
      "s": "s047",
      "e": "ep-video-losteverything-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "It's about time we found some diamonds.",
      "zh": "也该找到一些钻石了。",
      "an": "https://english.example.com/audio/ep/ep-video-losteverything-2/s047-n-be35c5.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-losteverything-2/s047-s-573853.mp3"
    },
    {
      "s": "s048",
      "e": "ep-video-losteverything-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "There's some iron.",
      "zh": "这儿有一些铁。",
      "an": "https://english.example.com/audio/ep/ep-video-losteverything-2/s048-n-875ef8.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-losteverything-2/s048-s-4f84ea.mp3"
    },
    {
      "s": "s049",
      "e": "ep-video-losteverything-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "Okay, well, we found some iron, which is a good sign, because it means we're getting deeper.",
      "zh": "好，我们找到了一些铁，这是个好兆头，因为说明我们在往更深处走。",
      "an": "https://english.example.com/audio/ep/ep-video-losteverything-2/s049-n-034fb2.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-losteverything-2/s049-s-f05c82.mp3"
    },
    {
      "s": "s050",
      "e": "ep-video-losteverything-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "Redstone.",
      "zh": "红石。",
      "an": "https://english.example.com/audio/ep/ep-video-losteverything-2/s050-n-3a4fd3.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-losteverything-2/s050-s-0fef06.mp3"
    },
    {
      "s": "s051",
      "e": "ep-video-losteverything-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "I don't think that I need any more redstone.",
      "zh": "我觉得我不需要再多的红石了。",
      "an": "https://english.example.com/audio/ep/ep-video-losteverything-2/s051-n-e02726.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-losteverything-2/s051-s-e0a55d.mp3"
    },
    {
      "s": "s052",
      "e": "ep-video-losteverything-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "I'm looking for diamonds.",
      "zh": "我在找钻石。",
      "an": "https://english.example.com/audio/ep/ep-video-losteverything-2/s052-n-7cdf8d.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-losteverything-2/s052-s-801b3e.mp3"
    },
    {
      "s": "s053",
      "e": "ep-video-losteverything-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "Okay, wow, this place is huge. There has to be some diamonds down here.",
      "zh": "哇，这地方好大。下面一定有一些钻石。",
      "an": "https://english.example.com/audio/ep/ep-video-losteverything-2/s053-n-8f61b7.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-losteverything-2/s053-s-25c4a1.mp3"
    },
    {
      "s": "s054",
      "e": "ep-video-losteverything-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "I'm going to eat something before going down there, because my health is low.",
      "zh": "下去之前我要先吃点东西，因为我的生命值很低。",
      "an": "https://english.example.com/audio/ep/ep-video-losteverything-2/s054-n-3f44c6.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-losteverything-2/s054-s-65946b.mp3"
    },
    {
      "s": "s055",
      "e": "ep-video-losteverything-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "There we go.",
      "zh": "好了。",
      "an": "https://english.example.com/audio/ep/ep-video-losteverything-2/s055-n-7099be.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-losteverything-2/s055-s-ffc9b2.mp3"
    },
    {
      "s": "s056",
      "e": "ep-video-losteverything-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "I ate some watermelons.",
      "zh": "我吃了一些西瓜。",
      "an": "https://english.example.com/audio/ep/ep-video-losteverything-2/s056-n-c6db8e.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-losteverything-2/s056-s-4b9472.mp3"
    },
    {
      "s": "s057",
      "e": "ep-video-losteverything-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "And now I'm going to start digging down there.",
      "zh": "现在我要从那边开始往下挖。",
      "an": "https://english.example.com/audio/ep/ep-video-losteverything-2/s057-n-dcd34c.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-losteverything-2/s057-s-1de8ff.mp3"
    },
    {
      "s": "s058",
      "e": "ep-video-losteverything-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "As usual, there are lots of monsters.",
      "zh": "和往常一样，有好多怪物。",
      "an": "https://english.example.com/audio/ep/ep-video-losteverything-2/s058-n-cc1779.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-losteverything-2/s058-s-37ac45.mp3"
    },
    {
      "s": "s059",
      "e": "ep-video-losteverything-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "Going to eat again.",
      "zh": "还要再吃一点。",
      "an": "https://english.example.com/audio/ep/ep-video-losteverything-2/s059-n-5a9a3c.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-losteverything-2/s059-s-16dde4.mp3"
    },
    {
      "s": "s060",
      "e": "ep-video-losteverything-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "When your hunger bar is full, then you can regenerate health.",
      "zh": "当饥饿值满了，你就可以恢复生命值。",
      "an": "https://english.example.com/audio/ep/ep-video-losteverything-2/s060-n-845792.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-losteverything-2/s060-s-7bd617.mp3"
    },
    {
      "s": "s061",
      "e": "ep-video-losteverything-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "This place is so dangerous.",
      "zh": "这地方好危险。",
      "an": "https://english.example.com/audio/ep/ep-video-losteverything-2/s061-n-361cef.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-losteverything-2/s061-s-139ccc.mp3"
    },
    {
      "s": "s062",
      "e": "ep-video-losteverything-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "I'm going to need more torches soon.",
      "zh": "我很快就会需要更多火把。",
      "an": "https://english.example.com/audio/ep/ep-video-losteverything-2/s062-n-517603.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-losteverything-2/s062-s-b7fc0d.mp3"
    },
    {
      "s": "s063",
      "e": "ep-video-losteverything-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "I am hiding right now because there are tons of monsters here.",
      "zh": "我现在在躲着，因为这儿有超多怪物。",
      "an": "https://english.example.com/audio/ep/ep-video-losteverything-2/s063-n-69bc0c.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-losteverything-2/s063-s-3794b1.mp3"
    },
    {
      "s": "s064",
      "e": "ep-video-losteverything-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "I'm going to build more torches with coal and sticks.",
      "zh": "我要用煤和木棍再做一些火把。",
      "an": "https://english.example.com/audio/ep/ep-video-losteverything-2/s064-n-215e2b.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-losteverything-2/s064-s-c91db6.mp3"
    },
    {
      "s": "s065",
      "e": "ep-video-losteverything-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "Now I have 40 more torches.",
      "zh": "现在我又有 40 根火把了。",
      "an": "https://english.example.com/audio/ep/ep-video-losteverything-2/s065-n-8fc65c.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-losteverything-2/s065-s-2ad94c.mp3"
    },
    {
      "s": "s066",
      "e": "ep-video-losteverything-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "Oh, diamonds!",
      "zh": "哦，钻石！",
      "an": "https://english.example.com/audio/ep/ep-video-losteverything-2/s066-n-dc9c2e.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-losteverything-2/s066-s-008678.mp3"
    },
    {
      "s": "s067",
      "e": "ep-video-losteverything-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "We found diamonds!",
      "zh": "我们找到钻石了！",
      "an": "https://english.example.com/audio/ep/ep-video-losteverything-2/s067-n-42c118.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-losteverything-2/s067-s-a71854.mp3"
    },
    {
      "s": "s068",
      "e": "ep-video-losteverything-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "Just one.",
      "zh": "只有一颗。",
      "an": "https://english.example.com/audio/ep/ep-video-losteverything-2/s068-n-892678.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-losteverything-2/s068-s-588eb6.mp3"
    },
    {
      "s": "s069",
      "e": "ep-video-losteverything-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "Okay, just one diamond, but it's okay.",
      "zh": "好，只有一颗钻石，不过没关系。",
      "an": "https://english.example.com/audio/ep/ep-video-losteverything-2/s069-n-e35d93.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-losteverything-2/s069-s-cc5dd1.mp3"
    },
    {
      "s": "s070",
      "e": "ep-video-losteverything-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "This is the first diamonds that we've found in this world.",
      "zh": "这是我们在这个世界里找到的第一颗钻石。",
      "an": "https://english.example.com/audio/ep/ep-video-losteverything-2/s070-n-4b5e37.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-losteverything-2/s070-s-aa9242.mp3"
    },
    {
      "s": "s071",
      "e": "ep-video-losteverything-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "So, hooray!",
      "zh": "所以，太好了！",
      "an": "https://english.example.com/audio/ep/ep-video-losteverything-2/s071-n-067e31.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-losteverything-2/s071-s-99bed1.mp3"
    },
    {
      "s": "s072",
      "e": "ep-video-losteverything-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "Okay, I really don't want to die now that I've found a diamond.",
      "zh": "好，我刚刚找到钻石，现在真的不想死。",
      "an": "https://english.example.com/audio/ep/ep-video-losteverything-2/s072-n-2108d3.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-losteverything-2/s072-s-c5eda6.mp3"
    },
    {
      "s": "s073",
      "e": "ep-video-losteverything-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "So I'm going to hide until I have regained my health.",
      "zh": "所以我要躲起来，直到生命值恢复。",
      "an": "https://english.example.com/audio/ep/ep-video-losteverything-2/s073-n-42afca.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-losteverything-2/s073-s-c4fbaf.mp3"
    },
    {
      "s": "s074",
      "e": "ep-video-losteverything-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "I'm going to run that way.",
      "zh": "我要往那边跑。",
      "an": "https://english.example.com/audio/ep/ep-video-losteverything-2/s074-n-7ddbc7.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-losteverything-2/s074-s-5deb72.mp3"
    },
    {
      "s": "s075",
      "e": "ep-video-losteverything-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "Okay, I think I'm safe.",
      "zh": "好，我想我安全了。",
      "an": "https://english.example.com/audio/ep/ep-video-losteverything-2/s075-n-58c8cb.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-losteverything-2/s075-s-72f4d9.mp3"
    },
    {
      "s": "s076",
      "e": "ep-video-losteverything-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "Okay, I'm getting really deep.",
      "zh": "好，我挖得越来越深了。",
      "an": "https://english.example.com/audio/ep/ep-video-losteverything-2/s076-n-9be66c.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-losteverything-2/s076-s-c80d71.mp3"
    },
    {
      "s": "s077",
      "e": "ep-video-losteverything-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "I need to find some more diamonds.",
      "zh": "我还需要再找一些钻石。",
      "an": "https://english.example.com/audio/ep/ep-video-losteverything-2/s077-n-e9a3c0.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-losteverything-2/s077-s-e2fbb5.mp3"
    },
    {
      "s": "s078",
      "e": "ep-video-losteverything-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "Some lapis.",
      "zh": "有一些青金石。",
      "an": "https://english.example.com/audio/ep/ep-video-losteverything-2/s078-n-f65d1e.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-losteverything-2/s078-s-cf0dcf.mp3"
    },
    {
      "s": "s079",
      "e": "ep-video-losteverything-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "I'll collect this lapis real quick, and there we go.",
      "zh": "我很快把这块青金石挖上，好了。",
      "an": "https://english.example.com/audio/ep/ep-video-losteverything-2/s079-n-1facb0.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-losteverything-2/s079-s-f25b07.mp3"
    },
    {
      "s": "s080",
      "e": "ep-video-losteverything-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "Back up here.",
      "zh": "回到上面这儿。",
      "an": "https://english.example.com/audio/ep/ep-video-losteverything-2/s080-n-da002b.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-losteverything-2/s080-s-fb4336.mp3"
    },
    {
      "s": "s081",
      "e": "ep-video-losteverything-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "Oh, that was close.",
      "zh": "哦，刚才好险。",
      "an": "https://english.example.com/audio/ep/ep-video-losteverything-2/s081-n-4f0b4f.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-losteverything-2/s081-s-0b5142.mp3"
    },
    {
      "s": "s082",
      "e": "ep-video-losteverything-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "Where are the diamonds?",
      "zh": "钻石在哪儿？",
      "an": "https://english.example.com/audio/ep/ep-video-losteverything-2/s082-n-d4ae11.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-losteverything-2/s082-s-4e40a9.mp3"
    },
    {
      "s": "s083",
      "e": "ep-video-losteverything-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "Maybe over here.",
      "zh": "也许在这边。",
      "an": "https://english.example.com/audio/ep/ep-video-losteverything-2/s083-n-50a4d4.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-losteverything-2/s083-s-b5fadc.mp3"
    },
    {
      "s": "s084",
      "e": "ep-video-losteverything-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "This seems a little bit dangerous to be this close to lava.",
      "zh": "靠岩浆这么近，好像有点危险。",
      "an": "https://english.example.com/audio/ep/ep-video-losteverything-2/s084-n-5b7ef1.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-losteverything-2/s084-s-cdc45c.mp3"
    },
    {
      "s": "s085",
      "e": "ep-video-losteverything-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "Are there any diamonds here?",
      "zh": "这儿有钻石吗？",
      "an": "https://english.example.com/audio/ep/ep-video-losteverything-2/s085-n-e09bc3.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-losteverything-2/s085-s-c769cd.mp3"
    },
    {
      "s": "s086",
      "e": "ep-video-losteverything-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "I'm on fire.",
      "zh": "我着火了。",
      "an": "https://english.example.com/audio/ep/ep-video-losteverything-2/s086-n-8a24db.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-losteverything-2/s086-s-be33d4.mp3"
    },
    {
      "s": "s087",
      "e": "ep-video-losteverything-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "Wow, I survived.",
      "zh": "哇，我活下来了。",
      "an": "https://english.example.com/audio/ep/ep-video-losteverything-2/s087-n-ff833b.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-losteverything-2/s087-s-5be3b6.mp3"
    },
    {
      "s": "s088",
      "e": "ep-video-losteverything-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "That was another close call.",
      "zh": "又是一次很险的情况。",
      "an": "https://english.example.com/audio/ep/ep-video-losteverything-2/s088-n-54595f.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-losteverything-2/s088-s-543685.mp3"
    },
    {
      "s": "s089",
      "e": "ep-video-losteverything-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "Okay, well, no diamonds here.",
      "zh": "好吧，这儿没有钻石。",
      "an": "https://english.example.com/audio/ep/ep-video-losteverything-2/s089-n-38c3ef.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-losteverything-2/s089-s-4a7a75.mp3"
    },
    {
      "s": "s090",
      "e": "ep-video-losteverything-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "Time to continue on.",
      "zh": "该继续往前了。",
      "an": "https://english.example.com/audio/ep/ep-video-losteverything-2/s090-n-780947.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-losteverything-2/s090-s-edf6ff.mp3"
    },
    {
      "s": "s091",
      "e": "ep-video-losteverything-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "Maybe I'll go up there and continue searching.",
      "zh": "也许我走到上面去，再继续找。",
      "an": "https://english.example.com/audio/ep/ep-video-losteverything-2/s091-n-e4c31d.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-losteverything-2/s091-s-c901f0.mp3"
    },
    {
      "s": "s092",
      "e": "ep-video-losteverything-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "Going up.",
      "zh": "往上走。",
      "an": "https://english.example.com/audio/ep/ep-video-losteverything-2/s092-n-d10394.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-losteverything-2/s092-s-abce66.mp3"
    },
    {
      "s": "s093",
      "e": "ep-video-losteverything-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "I hate skeletons.",
      "zh": "我讨厌骷髅。",
      "an": "https://english.example.com/audio/ep/ep-video-losteverything-2/s093-n-b34b49.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-losteverything-2/s093-s-328b82.mp3"
    },
    {
      "s": "s094",
      "e": "ep-video-losteverything-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "Skeletons are my worst enemy.",
      "zh": "骷髅是我最讨厌的敌人。",
      "an": "https://english.example.com/audio/ep/ep-video-losteverything-2/s094-n-40bffa.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-losteverything-2/s094-s-3c2088.mp3"
    },
    {
      "s": "s095",
      "e": "ep-video-losteverything-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "Well, I am never going to find that place again.",
      "zh": "唉，那个地方我再也找不到了。",
      "an": "https://english.example.com/audio/ep/ep-video-losteverything-2/s095-n-f7bbb3.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-losteverything-2/s095-s-84903f.mp3"
    },
    {
      "s": "s096",
      "e": "ep-video-losteverything-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "I technically found some diamonds, and now I'm upset.",
      "zh": "严格来说我找到了一些钻石，可我现在很难过。",
      "an": "https://english.example.com/audio/ep/ep-video-losteverything-2/s096-n-50258a.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-losteverything-2/s096-s-9f37c2.mp3"
    },
    {
      "s": "s097",
      "e": "ep-video-losteverything-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "So I'm going to end this video right here.",
      "zh": "所以这一集我就在这儿结束了。",
      "an": "https://english.example.com/audio/ep/ep-video-losteverything-2/s097-n-c194a4.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-losteverything-2/s097-s-1d0542.mp3"
    },
    {
      "s": "s098",
      "e": "ep-video-losteverything-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "Thank you for watching, and I will see you in the next video.",
      "zh": "谢谢收看，我们下集见。",
      "an": "https://english.example.com/audio/ep/ep-video-losteverything-2/s098-n-6bdb44.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-losteverything-2/s098-s-2fb631.mp3"
    },
    {
      "s": "s099",
      "e": "ep-video-losteverything-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "Bye.",
      "zh": "再见。",
      "an": "https://english.example.com/audio/ep/ep-video-losteverything-2/s099-n-a393f7.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-losteverything-2/s099-s-0da393.mp3"
    },
    {
      "s": "s001",
      "e": "ep-card-shop-g3",
      "k": "card",
      "sp": "孩子",
      "en": "Excuse me. How much is this eraser?",
      "zh": "不好意思。这块橡皮多少钱？",
      "an": "https://english.example.com/audio/ep/ep-card-shop-g3/s001-n-a5aa16.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-shop-g3/s001-s-ea17d3.mp3"
    },
    {
      "s": "s002",
      "e": "ep-card-shop-g3",
      "k": "card",
      "sp": "店员",
      "en": "It's two yuan. Would you like it?",
      "zh": "两块钱。你要买吗？",
      "an": "https://english.example.com/audio/ep/ep-card-shop-g3/s002-n-ee67d6.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-shop-g3/s002-s-3b22e8.mp3"
    },
    {
      "s": "s003",
      "e": "ep-card-shop-g3",
      "k": "card",
      "sp": "孩子",
      "en": "Yes, please. I also want this pencil.",
      "zh": "要的，谢谢。我还想要这支铅笔。",
      "an": "https://english.example.com/audio/ep/ep-card-shop-g3/s003-n-197c39.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-shop-g3/s003-s-b1b17f.mp3"
    },
    {
      "s": "s004",
      "e": "ep-card-shop-g3",
      "k": "card",
      "sp": "店员",
      "en": "The pencil is three yuan. That's five yuan in all.",
      "zh": "铅笔三块。一共五块。",
      "an": "https://english.example.com/audio/ep/ep-card-shop-g3/s004-n-974e58.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-shop-g3/s004-s-9a541f.mp3"
    },
    {
      "s": "s005",
      "e": "ep-card-shop-g3",
      "k": "card",
      "sp": "孩子",
      "en": "Here is five yuan. Can I have a bag, please?",
      "zh": "这是五块钱。可以给我一个袋子吗？",
      "an": "https://english.example.com/audio/ep/ep-card-shop-g3/s005-n-7d13e1.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-shop-g3/s005-s-aecf72.mp3"
    },
    {
      "s": "s006",
      "e": "ep-card-shop-g3",
      "k": "card",
      "sp": "店员",
      "en": "Of course. Thank you. Have a nice day!",
      "zh": "当然可以。谢谢。祝你今天愉快！",
      "an": "https://english.example.com/audio/ep/ep-card-shop-g3/s006-n-f4e5a0.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-shop-g3/s006-s-002774.mp3"
    },
    {
      "s": "s001",
      "e": "ep-card-pets-g3",
      "k": "card",
      "sp": "孩子",
      "en": "I have a small dog. His name is Lucky.",
      "zh": "我有一只小狗。它叫 Lucky。",
      "an": "https://english.example.com/audio/ep/ep-card-pets-g3/s001-n-d81e75.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-pets-g3/s001-s-af1c23.mp3"
    },
    {
      "s": "s002",
      "e": "ep-card-pets-g3",
      "k": "card",
      "sp": "同学",
      "en": "He's so cute! Can I pet him?",
      "zh": "它好可爱！我可以摸摸它吗？",
      "an": "https://english.example.com/audio/ep/ep-card-pets-g3/s002-n-6dadcb.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-pets-g3/s002-s-2d2fb1.mp3"
    },
    {
      "s": "s003",
      "e": "ep-card-pets-g3",
      "k": "card",
      "sp": "孩子",
      "en": "Yes, but please be gentle. He is a little shy.",
      "zh": "可以，不过请轻一点。它有点害羞。",
      "an": "https://english.example.com/audio/ep/ep-card-pets-g3/s003-n-47896e.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-pets-g3/s003-s-f95a6e.mp3"
    },
    {
      "s": "s004",
      "e": "ep-card-pets-g3",
      "k": "card",
      "sp": "同学",
      "en": "Okay. Does he like to play?",
      "zh": "好。它喜欢玩吗？",
      "an": "https://english.example.com/audio/ep/ep-card-pets-g3/s004-n-fe5797.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-pets-g3/s004-s-0faf8a.mp3"
    },
    {
      "s": "s005",
      "e": "ep-card-pets-g3",
      "k": "card",
      "sp": "孩子",
      "en": "Yes. He likes to run in the park.",
      "zh": "喜欢。它喜欢在公园跑。",
      "an": "https://english.example.com/audio/ep/ep-card-pets-g3/s005-n-9274f5.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-pets-g3/s005-s-00fd43.mp3"
    },
    {
      "s": "s006",
      "e": "ep-card-pets-g3",
      "k": "card",
      "sp": "孩子",
      "en": "Do you want to play with Lucky tomorrow?",
      "zh": "你明天想和 Lucky 一起玩吗？",
      "an": "https://english.example.com/audio/ep/ep-card-pets-g3/s006-n-4c9bf5.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-pets-g3/s006-s-d6071e.mp3"
    },
    {
      "s": "s001",
      "e": "ep-card-bedtime-g3",
      "k": "card",
      "sp": "家长",
      "en": "It's getting late. Time for bed.",
      "zh": "有点晚了。该睡觉了。",
      "an": "https://english.example.com/audio/ep/ep-card-bedtime-g3/s001-n-047c1e.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-bedtime-g3/s001-s-7d7049.mp3"
    },
    {
      "s": "s002",
      "e": "ep-card-bedtime-g3",
      "k": "card",
      "sp": "孩子",
      "en": "I'm sleepy, but can I have one more story?",
      "zh": "我困了，不过可以再讲一个故事吗？",
      "an": "https://english.example.com/audio/ep/ep-card-bedtime-g3/s002-n-6c2ed6.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-bedtime-g3/s002-s-5a412c.mp3"
    },
    {
      "s": "s003",
      "e": "ep-card-bedtime-g3",
      "k": "card",
      "sp": "家长",
      "en": "Okay. One short story, then lights out.",
      "zh": "好。再讲一个短故事，然后就要关灯了。",
      "an": "https://english.example.com/audio/ep/ep-card-bedtime-g3/s003-n-71f1ba.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-bedtime-g3/s003-s-e8f91f.mp3"
    },
    {
      "s": "s004",
      "e": "ep-card-bedtime-g3",
      "k": "card",
      "sp": "孩子",
      "en": "Thank you. Can you leave the small light on?",
      "zh": "谢谢。可以把小夜灯留着吗？",
      "an": "https://english.example.com/audio/ep/ep-card-bedtime-g3/s004-n-9b25cb.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-bedtime-g3/s004-s-9ce54e.mp3"
    },
    {
      "s": "s005",
      "e": "ep-card-bedtime-g3",
      "k": "card",
      "sp": "家长",
      "en": "Of course. Do you have your water?",
      "zh": "当然。水放好了吗？",
      "an": "https://english.example.com/audio/ep/ep-card-bedtime-g3/s005-n-a7fe71.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-bedtime-g3/s005-s-d68896.mp3"
    },
    {
      "s": "s006",
      "e": "ep-card-bedtime-g3",
      "k": "card",
      "sp": "孩子",
      "en": "Yes. Good night, Mom. I love you.",
      "zh": "放好了。妈妈晚安。我爱你。",
      "an": "https://english.example.com/audio/ep/ep-card-bedtime-g3/s006-n-09203d.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-bedtime-g3/s006-s-fa9310.mp3"
    },
    {
      "s": "s001",
      "e": "ep-video-exploringcave-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "Hello and welcome back to Learning English with Minecraft.",
      "zh": "大家好，欢迎回到“用《我的世界》学英语”。",
      "an": "https://english.example.com/audio/ep/ep-video-exploringcave-1/s001-n-e6a7e0.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-exploringcave-1/s001-s-fe08ac.mp3"
    },
    {
      "s": "s002",
      "e": "ep-video-exploringcave-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "My name is Kenzo. This is English from the Ground Up.",
      "zh": "我叫 Kenzo。这就是 English from the Ground Up。",
      "an": "https://english.example.com/audio/ep/ep-video-exploringcave-1/s002-n-70d44e.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-exploringcave-1/s002-s-837f8c.mp3"
    },
    {
      "s": "s003",
      "e": "ep-video-exploringcave-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "So in the last episode, I searched for a place to live and built a basic house.",
      "zh": "在上一集里，我找了住的地方，还盖了一座简单的房子。",
      "an": "https://english.example.com/audio/ep/ep-video-exploringcave-1/s003-n-6fb40f.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-exploringcave-1/s003-s-349c85.mp3"
    },
    {
      "s": "s004",
      "e": "ep-video-exploringcave-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "In between the last video and now, I've played a little bit, and I'll show you what I did.",
      "zh": "从上一集到现在，我又玩了一会儿，我来给你看看我做了什么。",
      "an": "https://english.example.com/audio/ep/ep-video-exploringcave-1/s004-n-559853.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-exploringcave-1/s004-s-a2bb6d.mp3"
    },
    {
      "s": "s005",
      "e": "ep-video-exploringcave-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "So first of all, I chopped down all these trees.",
      "zh": "首先，我把这些树都砍了。",
      "an": "https://english.example.com/audio/ep/ep-video-exploringcave-1/s005-n-750f47.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-exploringcave-1/s005-s-aecc30.mp3"
    },
    {
      "s": "s006",
      "e": "ep-video-exploringcave-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "I felt a little bit like Jared Bolsonaro chopping down this entire forest.",
      "zh": "我砍光这片森林的时候，感觉有点像 Jared Bolsonaro。",
      "an": "https://english.example.com/audio/ep/ep-video-exploringcave-1/s006-n-bfbd2e.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-exploringcave-1/s006-s-96f86c.mp3"
    },
    {
      "s": "s007",
      "e": "ep-video-exploringcave-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "But I did replant the saplings, so these trees will regrow.",
      "zh": "不过我把树苗重新种上了，所以这些树还会再长出来。",
      "an": "https://english.example.com/audio/ep/ep-video-exploringcave-1/s007-n-2aa338.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-exploringcave-1/s007-s-43aa95.mp3"
    },
    {
      "s": "s008",
      "e": "ep-video-exploringcave-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "And with all the wood, I built the roof of the house.",
      "zh": "然后我用这些木头，把房子的屋顶盖好了。",
      "an": "https://english.example.com/audio/ep/ep-video-exploringcave-1/s008-n-ffeaaf.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-exploringcave-1/s008-s-df5cfd.mp3"
    },
    {
      "s": "s009",
      "e": "ep-video-exploringcave-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "Another thing that I did was move all the sugar cane over here.",
      "zh": "我还做了另一件事：把所有甘蔗都搬到这边来了。",
      "an": "https://english.example.com/audio/ep/ep-video-exploringcave-1/s009-n-8d93e0.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-exploringcave-1/s009-s-16cc64.mp3"
    },
    {
      "s": "s010",
      "e": "ep-video-exploringcave-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "Before, the sugar cane was over there, and I moved it over here on this side of the river.",
      "zh": "以前甘蔗在那边，我把它们搬到了河的这一边。",
      "an": "https://english.example.com/audio/ep/ep-video-exploringcave-1/s010-n-a81328.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-exploringcave-1/s010-s-516661.mp3"
    },
    {
      "s": "s011",
      "e": "ep-video-exploringcave-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "So this is the new house. I finally finished the roof.",
      "zh": "这就是新房子。我终于把屋顶盖完了。",
      "an": "https://english.example.com/audio/ep/ep-video-exploringcave-1/s011-n-f14be6.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-exploringcave-1/s011-s-94c619.mp3"
    },
    {
      "s": "s012",
      "e": "ep-video-exploringcave-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "There's still not any windows. There's no windows.",
      "zh": "还是没有窗户。一扇窗户都没有。",
      "an": "https://english.example.com/audio/ep/ep-video-exploringcave-1/s012-n-198d5e.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-exploringcave-1/s012-s-a815ac.mp3"
    },
    {
      "s": "s013",
      "e": "ep-video-exploringcave-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "And I'll explain why a little bit later.",
      "zh": "我稍后再解释为什么。",
      "an": "https://english.example.com/audio/ep/ep-video-exploringcave-1/s013-n-07a4b9.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-exploringcave-1/s013-s-fbeb12.mp3"
    },
    {
      "s": "s014",
      "e": "ep-video-exploringcave-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "And the last thing that I did off camera was start a mine right here.",
      "zh": "镜头外面我做的最后一件事，是在这儿开了一个矿井。",
      "an": "https://english.example.com/audio/ep/ep-video-exploringcave-1/s014-n-07468b.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-exploringcave-1/s014-s-55e2aa.mp3"
    },
    {
      "s": "s015",
      "e": "ep-video-exploringcave-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "I started a mine, so I want this to go all the way to the bottom of the world.",
      "zh": "我开了这个矿井，想一直挖到世界的最底层。",
      "an": "https://english.example.com/audio/ep/ep-video-exploringcave-1/s015-n-3af1a9.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-exploringcave-1/s015-s-dac3e6.mp3"
    },
    {
      "s": "s016",
      "e": "ep-video-exploringcave-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "So that I can quickly get to a place where I can search for diamonds and redstone, mainly.",
      "zh": "这样我就能很快到达可以找钻石和红石的地方，主要是这两样。",
      "an": "https://english.example.com/audio/ep/ep-video-exploringcave-1/s016-n-0cebe8.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-exploringcave-1/s016-s-5c5a2a.mp3"
    },
    {
      "s": "s017",
      "e": "ep-video-exploringcave-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "I also did a little bit more fishing and collected some more food.",
      "zh": "我还又钓了一会儿鱼，收集了更多食物。",
      "an": "https://english.example.com/audio/ep/ep-video-exploringcave-1/s017-n-5b563b.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-exploringcave-1/s017-s-8c6f0c.mp3"
    },
    {
      "s": "s018",
      "e": "ep-video-exploringcave-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "So in this video I won't have to search for food all the time.",
      "zh": "所以这一集里，我就不用一直去找吃的了。",
      "an": "https://english.example.com/audio/ep/ep-video-exploringcave-1/s018-n-59c13d.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-exploringcave-1/s018-s-8aeffa.mp3"
    },
    {
      "s": "s019",
      "e": "ep-video-exploringcave-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "And I put everything in this chest.",
      "zh": "我把所有东西都放进了这个箱子。",
      "an": "https://english.example.com/audio/ep/ep-video-exploringcave-1/s019-n-f88f11.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-exploringcave-1/s019-s-d2e6bb.mp3"
    },
    {
      "s": "s020",
      "e": "ep-video-exploringcave-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "While I was fishing, I caught some strange things, like a magical bow.",
      "zh": "钓鱼的时候，我钓到了一些奇怪的东西，比如一把魔法弓。",
      "an": "https://english.example.com/audio/ep/ep-video-exploringcave-1/s020-n-a75fcc.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-exploringcave-1/s020-s-84c607.mp3"
    },
    {
      "s": "s021",
      "e": "ep-video-exploringcave-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "And name tags that I can use to name different things.",
      "zh": "还有名字牌，可以用来给不同的东西起名字。",
      "an": "https://english.example.com/audio/ep/ep-video-exploringcave-1/s021-n-38bae6.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-exploringcave-1/s021-s-2b7aa0.mp3"
    },
    {
      "s": "s022",
      "e": "ep-video-exploringcave-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "So in this video I have two main goals.",
      "zh": "所以这一集里，我有两个主要目标。",
      "an": "https://english.example.com/audio/ep/ep-video-exploringcave-1/s022-n-e8366b.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-exploringcave-1/s022-s-db5c5e.mp3"
    },
    {
      "s": "s023",
      "e": "ep-video-exploringcave-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "The first one is to explore a cave and hopefully to find some valuable resources like iron and coal.",
      "zh": "第一个是探索一个洞穴，希望能找到一些有用的资源，比如铁和煤炭。",
      "an": "https://english.example.com/audio/ep/ep-video-exploringcave-1/s023-n-07fed0.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-exploringcave-1/s023-s-9d42fe.mp3"
    },
    {
      "s": "s024",
      "e": "ep-video-exploringcave-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "And the second goal is to finish the windows on my house.",
      "zh": "第二个目标是把房子的窗户装好。",
      "an": "https://english.example.com/audio/ep/ep-video-exploringcave-1/s024-n-30fef2.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-exploringcave-1/s024-s-2b9d2e.mp3"
    },
    {
      "s": "s025",
      "e": "ep-video-exploringcave-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "And to do that, I first need to collect coal, which is partially why I need to explore a cave.",
      "zh": "要做到这一点，我得先收集煤炭，这也是我需要探索洞穴的部分原因。",
      "an": "https://english.example.com/audio/ep/ep-video-exploringcave-1/s025-n-92b0fd.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-exploringcave-1/s025-s-268f77.mp3"
    },
    {
      "s": "s026",
      "e": "ep-video-exploringcave-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "But right now I'm going to sleep.",
      "zh": "不过现在我先去睡觉。",
      "an": "https://english.example.com/audio/ep/ep-video-exploringcave-1/s026-n-1f391e.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-exploringcave-1/s026-s-d3c1b3.mp3"
    },
    {
      "s": "s027",
      "e": "ep-video-exploringcave-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "So the first goal is to explore a cave.",
      "zh": "所以第一个目标是探索一个洞穴。",
      "an": "https://english.example.com/audio/ep/ep-video-exploringcave-1/s027-n-0b8ba9.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-exploringcave-1/s027-s-a17e19.mp3"
    },
    {
      "s": "s028",
      "e": "ep-video-exploringcave-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "So I think the quickest way to find a cave might be to continue digging in the mine that I started earlier.",
      "zh": "我觉得最快找到洞穴的办法，可能就是继续挖我之前开的那个矿井。",
      "an": "https://english.example.com/audio/ep/ep-video-exploringcave-1/s028-n-0b1cd7.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-exploringcave-1/s028-s-656c17.mp3"
    },
    {
      "s": "s029",
      "e": "ep-video-exploringcave-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "So I'm going to continue digging down here.",
      "zh": "所以我要继续往下挖。",
      "an": "https://english.example.com/audio/ep/ep-video-exploringcave-1/s029-n-09bcb1.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-exploringcave-1/s029-s-4eb161.mp3"
    },
    {
      "s": "s030",
      "e": "ep-video-exploringcave-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "I also need coal to build torches, because right now in the dark I can't see anything.",
      "zh": "我也需要煤炭来做火把，因为现在这么黑，我什么都看不见。",
      "an": "https://english.example.com/audio/ep/ep-video-exploringcave-1/s030-n-7b5341.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-exploringcave-1/s030-s-585a2f.mp3"
    },
    {
      "s": "s031",
      "e": "ep-video-exploringcave-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "Still digging. I can't see anything. It's so dark.",
      "zh": "还在挖。我什么都看不见。太黑了。",
      "an": "https://english.example.com/audio/ep/ep-video-exploringcave-1/s031-n-1012c9.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-exploringcave-1/s031-s-918f2c.mp3"
    },
    {
      "s": "s032",
      "e": "ep-video-exploringcave-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "I really wish I had some torches right now.",
      "zh": "我现在真希望手头有一些火把。",
      "an": "https://english.example.com/audio/ep/ep-video-exploringcave-1/s032-n-a12b0d.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-exploringcave-1/s032-s-185573.mp3"
    },
    {
      "s": "s033",
      "e": "ep-video-exploringcave-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "Another reason why I want to continue digging down in this cave is because right now I don't have a map, and I am terrible with directions.",
      "zh": "我还想继续在这个矿井往下挖，另一个原因是我现在没有地图，而且我方向感很差。",
      "an": "https://english.example.com/audio/ep/ep-video-exploringcave-1/s033-n-8022df.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-exploringcave-1/s033-s-495be4.mp3"
    },
    {
      "s": "s034",
      "e": "ep-video-exploringcave-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "So I need to stay close by to my house in order to find my way back.",
      "zh": "所以我得待在房子附近，才能找得回去。",
      "an": "https://english.example.com/audio/ep/ep-video-exploringcave-1/s034-n-eb4d4d.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-exploringcave-1/s034-s-5f4e82.mp3"
    },
    {
      "s": "s035",
      "e": "ep-video-exploringcave-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "I found coal! Finally!",
      "zh": "我找到煤炭了！终于！",
      "an": "https://english.example.com/audio/ep/ep-video-exploringcave-1/s035-n-716561.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-exploringcave-1/s035-s-39b6e1.mp3"
    },
    {
      "s": "s036",
      "e": "ep-video-exploringcave-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "Now I can build torches. Watch. Coal and sticks make torches.",
      "zh": "现在我可以做火把了。看。煤炭加木棍就能做出火把。",
      "an": "https://english.example.com/audio/ep/ep-video-exploringcave-1/s036-n-e880a9.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-exploringcave-1/s036-s-513920.mp3"
    },
    {
      "s": "s037",
      "e": "ep-video-exploringcave-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "I can see! Finally I can see again.",
      "zh": "我看得见了！终于又能看见了。",
      "an": "https://english.example.com/audio/ep/ep-video-exploringcave-1/s037-n-8dbed0.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-exploringcave-1/s037-s-4272ed.mp3"
    },
    {
      "s": "s038",
      "e": "ep-video-exploringcave-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "Oh, and my pickaxe broke, and now I need to go back up to my house to build another pickaxe.",
      "zh": "噢，我的镐坏了，现在得回到房子那儿再做一把镐。",
      "an": "https://english.example.com/audio/ep/ep-video-exploringcave-1/s038-n-7141a5.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-exploringcave-1/s038-s-893fec.mp3"
    },
    {
      "s": "s039",
      "e": "ep-video-exploringcave-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "Now it's time to build another pickaxe. I'm going to build several pickaxes right now because they break easily.",
      "zh": "现在该再做一把镐了。我要一次做好几把，因为它们很容易坏。",
      "an": "https://english.example.com/audio/ep/ep-video-exploringcave-1/s039-n-2ae19a.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-exploringcave-1/s039-s-b32d6c.mp3"
    },
    {
      "s": "s040",
      "e": "ep-video-exploringcave-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "So I'm going to build three new pickaxes. There we go. And back to the mine.",
      "zh": "所以我要做三把新镐。好了。再回到矿井去。",
      "an": "https://english.example.com/audio/ep/ep-video-exploringcave-1/s040-n-b92a3f.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-exploringcave-1/s040-s-149a4a.mp3"
    },
    {
      "s": "s041",
      "e": "ep-video-exploringcave-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "It's very nice to be able to see.",
      "zh": "能看得见，感觉真好。",
      "an": "https://english.example.com/audio/ep/ep-video-exploringcave-1/s041-n-68d3b4.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-exploringcave-1/s041-s-bf56a0.mp3"
    },
    {
      "s": "s042",
      "e": "ep-video-exploringcave-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "I wonder how much coal there is right here. Looks like a lot more coal.",
      "zh": "我想知道这儿还有多少煤炭。看起来还有好多煤。",
      "an": "https://english.example.com/audio/ep/ep-video-exploringcave-1/s042-n-8c29ce.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-exploringcave-1/s042-s-6d8bc8.mp3"
    },
    {
      "s": "s043",
      "e": "ep-video-exploringcave-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "All right, let's see. Twenty-two coal. There was twenty-two coal.",
      "zh": "好，我们数数。二十二个煤炭。刚才是二十二个煤炭。",
      "an": "https://english.example.com/audio/ep/ep-video-exploringcave-1/s043-n-5ed966.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-exploringcave-1/s043-s-71d912.mp3"
    },
    {
      "s": "s044",
      "e": "ep-video-exploringcave-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "And now I'm going to continue digging down. Hopefully I find some iron.",
      "zh": "现在我要继续往下挖。希望能找到一些铁。",
      "an": "https://english.example.com/audio/ep/ep-video-exploringcave-1/s044-n-246485.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-exploringcave-1/s044-s-52cb14.mp3"
    },
    {
      "s": "s045",
      "e": "ep-video-exploringcave-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "Iron is the next ore that I am searching for, because iron tools are a lot better than stone tools.",
      "zh": "铁是我要找的下一种矿，因为铁工具比石工具好得多。",
      "an": "https://english.example.com/audio/ep/ep-video-exploringcave-1/s045-n-c3fc8c.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-exploringcave-1/s045-s-77b01e.mp3"
    },
    {
      "s": "s046",
      "e": "ep-video-exploringcave-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "And I think you need iron in order to mine diamonds.",
      "zh": "而且我想，要挖钻石得用铁工具。",
      "an": "https://english.example.com/audio/ep/ep-video-exploringcave-1/s046-n-1fd72b.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-exploringcave-1/s046-s-516583.mp3"
    },
    {
      "s": "s047",
      "e": "ep-video-exploringcave-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "I still haven't found a cave. No caves yet.",
      "zh": "我还是没找到洞穴。还没有洞穴。",
      "an": "https://english.example.com/audio/ep/ep-video-exploringcave-1/s047-n-4d6ac1.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-exploringcave-1/s047-s-25896a.mp3"
    },
    {
      "s": "s048",
      "e": "ep-video-exploringcave-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "Still no caves, and I'm almost through my first pickaxe. And there it is. Okay, on to the second pickaxe.",
      "zh": "还是没有洞穴，第一把镐也快用完了。好，坏了。换第二把镐。",
      "an": "https://english.example.com/audio/ep/ep-video-exploringcave-1/s048-n-8f3c62.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-exploringcave-1/s048-s-a9b421.mp3"
    },
    {
      "s": "s049",
      "e": "ep-video-exploringcave-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "Oh, that was a scary sound.",
      "zh": "噢，刚才那个声音好吓人。",
      "an": "https://english.example.com/audio/ep/ep-video-exploringcave-1/s049-n-e93a43.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-exploringcave-1/s049-s-2ea694.mp3"
    },
    {
      "s": "s050",
      "e": "ep-video-exploringcave-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "So this is copper, and I don't think that copper is super useful, but I will collect some copper.",
      "zh": "这是铜。我觉得铜不是特别有用，不过我还是会收集一些。",
      "an": "https://english.example.com/audio/ep/ep-video-exploringcave-1/s050-n-eca09e.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-exploringcave-1/s050-s-48c936.mp3"
    },
    {
      "s": "s051",
      "e": "ep-video-exploringcave-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "Okay, I have thirty-six copper now. Cool.",
      "zh": "好，我现在有三十六个铜了。不错。",
      "an": "https://english.example.com/audio/ep/ep-video-exploringcave-1/s051-n-6beef4.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-exploringcave-1/s051-s-0601d2.mp3"
    },
    {
      "s": "s052",
      "e": "ep-video-exploringcave-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "And I'm going to continue digging downward.",
      "zh": "然后我要继续往下挖。",
      "an": "https://english.example.com/audio/ep/ep-video-exploringcave-1/s052-n-30ef3c.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-exploringcave-1/s052-s-320e80.mp3"
    },
    {
      "s": "s053",
      "e": "ep-video-exploringcave-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "I also found this golden helmet when I was off camera.",
      "zh": "镜头外面的时候，我还找到了这顶金头盔。",
      "an": "https://english.example.com/audio/ep/ep-video-exploringcave-1/s053-n-49face.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-exploringcave-1/s053-s-703f73.mp3"
    },
    {
      "s": "s054",
      "e": "ep-video-exploringcave-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "I think that I got this gold helmet from a zombie that I killed, and now I'm going to put it on. There we go.",
      "zh": "我想这顶金头盔是我打败一只僵尸得到的。现在我要戴上它。好了。",
      "an": "https://english.example.com/audio/ep/ep-video-exploringcave-1/s054-n-001482.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-exploringcave-1/s054-s-2cca05.mp3"
    },
    {
      "s": "s055",
      "e": "ep-video-exploringcave-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "So now I have one armor.",
      "zh": "所以现在我有一件盔甲了。",
      "an": "https://english.example.com/audio/ep/ep-video-exploringcave-1/s055-n-a7f07c.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-exploringcave-1/s055-s-e1281b.mp3"
    },
    {
      "s": "s056",
      "e": "ep-video-exploringcave-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "Okay, I'm still digging down. Now all the stone is cobbled deep slate, which is a little bit different.",
      "zh": "好，我还在往下挖。现在这些石头都是深板岩圆石了，有一点不一样。",
      "an": "https://english.example.com/audio/ep/ep-video-exploringcave-1/s056-n-b87923.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-exploringcave-1/s056-s-cede5f.mp3"
    },
    {
      "s": "s057",
      "e": "ep-video-exploringcave-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "I think that means that I'm getting deep.",
      "zh": "我想这说明我挖得更深了。",
      "an": "https://english.example.com/audio/ep/ep-video-exploringcave-1/s057-n-4a5e09.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-exploringcave-1/s057-s-2afce5.mp3"
    },
    {
      "s": "s058",
      "e": "ep-video-exploringcave-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "Oh well, that was my last pickaxe, so now I need to build another one.",
      "zh": "唉，那是我最后一把镐，所以现在又得再做一把。",
      "an": "https://english.example.com/audio/ep/ep-video-exploringcave-1/s058-n-92da80.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-exploringcave-1/s058-s-7e508d.mp3"
    },
    {
      "s": "s059",
      "e": "ep-video-exploringcave-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "Actually, right now I'm going to go back to my house because my inventory is full. It's completely full.",
      "zh": "其实我现在要先回房子，因为我的物品栏满了。完全满了。",
      "an": "https://english.example.com/audio/ep/ep-video-exploringcave-1/s059-n-352b78.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-exploringcave-1/s059-s-a0cc2a.mp3"
    },
    {
      "s": "s060",
      "e": "ep-video-exploringcave-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "So now I'm going back home. It's daytime. I can see clouds and the blue sky.",
      "zh": "所以我现在回家了。现在是白天。我能看见云和蓝天。",
      "an": "https://english.example.com/audio/ep/ep-video-exploringcave-1/s060-n-a71924.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-exploringcave-1/s060-s-480375.mp3"
    },
    {
      "s": "s061",
      "e": "ep-video-exploringcave-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "I'm going to put all the things that I don't need inside a chest right now.",
      "zh": "我现在要把不需要的东西都放进箱子里。",
      "an": "https://english.example.com/audio/ep/ep-video-exploringcave-1/s061-n-c5ffbe.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-exploringcave-1/s061-s-0be039.mp3"
    },
    {
      "s": "s062",
      "e": "ep-video-exploringcave-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "So to go adventuring I need tools, I need food, torches, and wood.",
      "zh": "出去冒险的话，我需要工具、食物、火把和木头。",
      "an": "https://english.example.com/audio/ep/ep-video-exploringcave-1/s062-n-7ac1c3.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-exploringcave-1/s062-s-26ee1c.mp3"
    },
    {
      "s": "s063",
      "e": "ep-video-exploringcave-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "I'll need wood to build things underground, so everything else I'm going to put inside a chest.",
      "zh": "在地下造东西需要木头，所以其他的我都放进箱子。",
      "an": "https://english.example.com/audio/ep/ep-video-exploringcave-1/s063-n-4b6c9a.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-exploringcave-1/s063-s-e1bb0a.mp3"
    },
    {
      "s": "s064",
      "e": "ep-video-exploringcave-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "Spider eyes, granite, copper, name tags, puffer fish, rotten flesh, stairs.",
      "zh": "蜘蛛眼、花岗岩、铜、名字牌、河豚、腐肉、楼梯。",
      "an": "https://english.example.com/audio/ep/ep-video-exploringcave-1/s064-n-4ffa11.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-exploringcave-1/s064-s-18ad04.mp3"
    },
    {
      "s": "s065",
      "e": "ep-video-exploringcave-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "Oh, so this chest is full, so I'm going to build another chest with eight wood planks.",
      "zh": "噢，这个箱子满了，所以我要用八块木板再做一个箱子。",
      "an": "https://english.example.com/audio/ep/ep-video-exploringcave-1/s065-n-1b497e.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-exploringcave-1/s065-s-414e5f.mp3"
    },
    {
      "s": "s066",
      "e": "ep-video-exploringcave-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "One, two, three, four, five, six, seven, eight pieces of wood makes a chest.",
      "zh": "一、二、三、四、五、六、七、八块木头，就可以做一个箱子。",
      "an": "https://english.example.com/audio/ep/ep-video-exploringcave-1/s066-n-760ea9.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-exploringcave-1/s066-s-49c419.mp3"
    },
    {
      "s": "s067",
      "e": "ep-video-exploringcave-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "And I can put two chests next to each other and make one bigger chest like that, so now it holds twice as much.",
      "zh": "我还可以把两个箱子靠在一起，做成一个更大的箱子，这样就能装两倍的东西。",
      "an": "https://english.example.com/audio/ep/ep-video-exploringcave-1/s067-n-932fa8.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-exploringcave-1/s067-s-e09717.mp3"
    },
    {
      "s": "s068",
      "e": "ep-video-exploringcave-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "So I can put all these things inside. Diorite, cobblestone, more stone, stone, doors, stairs.",
      "zh": "这样我就能把这些东西都放进去。闪长岩、圆石、更多石头、石头、门、楼梯。",
      "an": "https://english.example.com/audio/ep/ep-video-exploringcave-1/s068-n-ee5c85.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-exploringcave-1/s068-s-b4f74f.mp3"
    },
    {
      "s": "s069",
      "e": "ep-video-exploringcave-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "Okay, everything else is good. I'm going to take two stone swords, maybe a little bit more wood.",
      "zh": "好，其他的都没问题。我要带上两把石剑，也许再多带一点木头。",
      "an": "https://english.example.com/audio/ep/ep-video-exploringcave-1/s069-n-b491ac.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-exploringcave-1/s069-s-627ac4.mp3"
    },
    {
      "s": "s070",
      "e": "ep-video-exploringcave-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "Okay, so now I'm going back down into the mine.",
      "zh": "好，现在我要再下到矿井里去。",
      "an": "https://english.example.com/audio/ep/ep-video-exploringcave-1/s070-n-37a2cf.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-exploringcave-1/s070-s-965945.mp3"
    },
    {
      "s": "s071",
      "e": "ep-video-exploringcave-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "Down we go, and back to digging. Hopefully I can find something interesting down here.",
      "zh": "我们下去吧，继续挖。希望在下面能找到有趣的东西。",
      "an": "https://english.example.com/audio/ep/ep-video-exploringcave-1/s071-n-0262dc.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-exploringcave-1/s071-s-d6250e.mp3"
    },
    {
      "s": "s072",
      "e": "ep-video-exploringcave-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "Oh, iron! Okay, finally we found iron.",
      "zh": "噢，铁！好，我们终于找到铁了。",
      "an": "https://english.example.com/audio/ep/ep-video-exploringcave-1/s072-n-32f9a6.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-exploringcave-1/s072-s-e6ad65.mp3"
    },
    {
      "s": "s073",
      "e": "ep-video-exploringcave-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "Okay, only two pieces of iron, but better than nothing. Hopefully I find more iron.",
      "zh": "好，虽然只有两块铁，但总比没有好。希望还能找到更多铁。",
      "an": "https://english.example.com/audio/ep/ep-video-exploringcave-1/s073-n-a11f27.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-exploringcave-1/s073-s-d0db1b.mp3"
    },
    {
      "s": "s074",
      "e": "ep-video-exploringcave-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "Whoa, what is this? What is this white stone? Whoa, amethyst! Wow!",
      "zh": "哇，这是什么？这块白石头是什么？哇，紫水晶！哇！",
      "an": "https://english.example.com/audio/ep/ep-video-exploringcave-1/s074-n-9ac9ac.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-exploringcave-1/s074-s-d6b4e7.mp3"
    },
    {
      "s": "s075",
      "e": "ep-video-exploringcave-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "Listen to the sound it makes when you walk on top of amethyst.",
      "zh": "听听走在紫水晶上面时发出的声音。",
      "an": "https://english.example.com/audio/ep/ep-video-exploringcave-1/s075-n-821600.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-exploringcave-1/s075-s-f4e60a.mp3"
    },
    {
      "s": "s076",
      "e": "ep-video-exploringcave-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "Amethyst shards. Wow, this is beautiful.",
      "zh": "紫水晶碎片。哇，好漂亮。",
      "an": "https://english.example.com/audio/ep/ep-video-exploringcave-1/s076-n-dd5bf4.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-exploringcave-1/s076-s-c880fd.mp3"
    },
    {
      "s": "s077",
      "e": "ep-video-exploringcave-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "Well, I don't know what you can do with amethyst, but this is awesome. I'll remember where this is.",
      "zh": "嗯，我不知道紫水晶能用来做什么，但这太棒了。我会记住这个地方。",
      "an": "https://english.example.com/audio/ep/ep-video-exploringcave-1/s077-n-7fdaef.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-exploringcave-1/s077-s-5f6685.mp3"
    },
    {
      "s": "s078",
      "e": "ep-video-exploringcave-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "Okay, here's something. There's light down there.",
      "zh": "好，这儿有情况。下面有光。",
      "an": "https://english.example.com/audio/ep/ep-video-exploringcave-1/s078-n-6fec78.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-exploringcave-1/s078-s-57e504.mp3"
    },
    {
      "s": "s079",
      "e": "ep-video-exploringcave-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "Oh, okay, we found a cave system.",
      "zh": "噢，好，我们找到了一个洞穴系统。",
      "an": "https://english.example.com/audio/ep/ep-video-exploringcave-1/s079-n-5e2bdd.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-exploringcave-1/s079-s-0dea4a.mp3"
    },
    {
      "s": "s001",
      "e": "ep-video-exploringcave-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "Hey, it's lapis lazuli.",
      "zh": "嘿，是青金石。",
      "an": "https://english.example.com/audio/ep/ep-video-exploringcave-2/s001-n-3e61a1.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-exploringcave-2/s001-s-e5d56f.mp3"
    },
    {
      "s": "s002",
      "e": "ep-video-exploringcave-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "Hmm, lapis lazuli. All right, I have twenty lapis lazuli. Awesome.",
      "zh": "嗯，青金石。好，我有二十个青金石了。太棒了。",
      "an": "https://english.example.com/audio/ep/ep-video-exploringcave-2/s002-n-529a01.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-exploringcave-2/s002-s-90f262.mp3"
    },
    {
      "s": "s003",
      "e": "ep-video-exploringcave-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "Oh, it's lava. So lava is what was making it light down here.",
      "zh": "噢，是岩浆。原来下面发光的是岩浆。",
      "an": "https://english.example.com/audio/ep/ep-video-exploringcave-2/s003-n-8366e0.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-exploringcave-2/s003-s-8c3eeb.mp3"
    },
    {
      "s": "s004",
      "e": "ep-video-exploringcave-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "Whoa, this is a little bit dangerous, but I'm going to build a bridge across this lava with stone.",
      "zh": "哇，这有点危险，不过我要用石头在岩浆上搭一座桥。",
      "an": "https://english.example.com/audio/ep/ep-video-exploringcave-2/s004-n-3d238a.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-exploringcave-2/s004-s-897151.mp3"
    },
    {
      "s": "s005",
      "e": "ep-video-exploringcave-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "This is scary. Hopefully there are no skeletons here.",
      "zh": "好吓人。希望这儿没有骷髅。",
      "an": "https://english.example.com/audio/ep/ep-video-exploringcave-2/s005-n-b6b137.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-exploringcave-2/s005-s-5e2394.mp3"
    },
    {
      "s": "s006",
      "e": "ep-video-exploringcave-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "Okay, it looks like we're safe.",
      "zh": "好，看起来我们是安全的。",
      "an": "https://english.example.com/audio/ep/ep-video-exploringcave-2/s006-n-808bf5.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-exploringcave-2/s006-s-5b7573.mp3"
    },
    {
      "s": "s007",
      "e": "ep-video-exploringcave-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "Hopefully there are no skeletons here. There's water.",
      "zh": "希望这儿没有骷髅。这儿有水。",
      "an": "https://english.example.com/audio/ep/ep-video-exploringcave-2/s007-n-5538ea.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-exploringcave-2/s007-s-af48dd.mp3"
    },
    {
      "s": "s008",
      "e": "ep-video-exploringcave-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "Wow. Hey, it's redstone.",
      "zh": "哇。嘿，是红石。",
      "an": "https://english.example.com/audio/ep/ep-video-exploringcave-2/s008-n-d99840.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-exploringcave-2/s008-s-bc93c6.mp3"
    },
    {
      "s": "s009",
      "e": "ep-video-exploringcave-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "Oh, there was a skeleton right there that shot me into the lava, and I almost died.",
      "zh": "噢，刚才那儿有一只骷髅，把我射进了岩浆，我差点死掉。",
      "an": "https://english.example.com/audio/ep/ep-video-exploringcave-2/s009-n-10da9d.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-exploringcave-2/s009-s-cbfe90.mp3"
    },
    {
      "s": "s010",
      "e": "ep-video-exploringcave-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "Oh dear, that was close. I need to eat so that I can regain my strength.",
      "zh": "哎呀，好险。我得吃东西，才能恢复力气。",
      "an": "https://english.example.com/audio/ep/ep-video-exploringcave-2/s010-n-adb401.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-exploringcave-2/s010-s-479721.mp3"
    },
    {
      "s": "s011",
      "e": "ep-video-exploringcave-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "Wow, skeletons are the worst. That is the closest we've gotten to dying yet.",
      "zh": "哇，骷髅最讨厌了。这是到现在最接近死亡的一次。",
      "an": "https://english.example.com/audio/ep/ep-video-exploringcave-2/s011-n-f60858.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-exploringcave-2/s011-s-48c3cb.mp3"
    },
    {
      "s": "s012",
      "e": "ep-video-exploringcave-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "All right, I'm gonna go. Where is he? Where is it? There you are.",
      "zh": "好，我要去找它。他在哪儿？在哪儿？原来你在这儿。",
      "an": "https://english.example.com/audio/ep/ep-video-exploringcave-2/s012-n-222785.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-exploringcave-2/s012-s-5de381.mp3"
    },
    {
      "s": "s013",
      "e": "ep-video-exploringcave-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "I'm gonna kill him with my sword. I'm terrible at this.",
      "zh": "我要用剑打败它。我打得真糟糕。",
      "an": "https://english.example.com/audio/ep/ep-video-exploringcave-2/s013-n-fac98a.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-exploringcave-2/s013-s-0aa6e1.mp3"
    },
    {
      "s": "s014",
      "e": "ep-video-exploringcave-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "Okay, wow, this is a huge cave.",
      "zh": "好，哇，这个洞穴好大。",
      "an": "https://english.example.com/audio/ep/ep-video-exploringcave-2/s014-n-6e8f69.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-exploringcave-2/s014-s-8622df.mp3"
    },
    {
      "s": "s015",
      "e": "ep-video-exploringcave-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "So for now I'm going to mine this gold and this redstone.",
      "zh": "那我先来挖这些金子和红石。",
      "an": "https://english.example.com/audio/ep/ep-video-exploringcave-2/s015-n-76e871.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-exploringcave-2/s015-s-6ed190.mp3"
    },
    {
      "s": "s016",
      "e": "ep-video-exploringcave-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "Oh, I forgot that you can't mine gold with stone tools. You need iron.",
      "zh": "噢，我忘了，石工具挖不了金子。需要铁工具。",
      "an": "https://english.example.com/audio/ep/ep-video-exploringcave-2/s016-n-524fed.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-exploringcave-2/s016-s-b4b5dd.mp3"
    },
    {
      "s": "s017",
      "e": "ep-video-exploringcave-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "So really I need to find more iron right now, because I think the same is true with redstone.",
      "zh": "所以我现在真的需要找到更多铁，因为我想红石也是一样。",
      "an": "https://english.example.com/audio/ep/ep-video-exploringcave-2/s017-n-732bc6.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-exploringcave-2/s017-s-b76e2b.mp3"
    },
    {
      "s": "s018",
      "e": "ep-video-exploringcave-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "So I'm going to search for more iron. Zombies!",
      "zh": "所以我要去找更多铁。僵尸！",
      "an": "https://english.example.com/audio/ep/ep-video-exploringcave-2/s018-n-efea23.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-exploringcave-2/s018-s-f9ca6f.mp3"
    },
    {
      "s": "s019",
      "e": "ep-video-exploringcave-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "Wow, this place is very dangerous. This place is horrifying.",
      "zh": "哇，这地方好危险。这地方太可怕了。",
      "an": "https://english.example.com/audio/ep/ep-video-exploringcave-2/s019-n-4ddb91.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-exploringcave-2/s019-s-848b72.mp3"
    },
    {
      "s": "s020",
      "e": "ep-video-exploringcave-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "It's completely dark and it's infested with monsters. More lapis.",
      "zh": "这里完全是黑的，还全是怪物。又有青金石。",
      "an": "https://english.example.com/audio/ep/ep-video-exploringcave-2/s020-n-4eaaaa.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-exploringcave-2/s020-s-867f5f.mp3"
    },
    {
      "s": "s021",
      "e": "ep-video-exploringcave-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "There's iron. Wow, there are so many monsters here.",
      "zh": "那儿有铁。哇，这儿的怪物好多。",
      "an": "https://english.example.com/audio/ep/ep-video-exploringcave-2/s021-n-73ee1c.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-exploringcave-2/s021-s-293f62.mp3"
    },
    {
      "s": "s022",
      "e": "ep-video-exploringcave-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "I'm using my pickaxe as a weapon because my sword broke.",
      "zh": "我正用镐当武器，因为我的剑坏了。",
      "an": "https://english.example.com/audio/ep/ep-video-exploringcave-2/s022-n-bb24ad.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-exploringcave-2/s022-s-1e47bb.mp3"
    },
    {
      "s": "s023",
      "e": "ep-video-exploringcave-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "I hear a little zombie somewhere. The little zombies are the most scary because they're the fastest.",
      "zh": "我听到附近有一只小僵尸。小僵尸最吓人，因为它们跑得最快。",
      "an": "https://english.example.com/audio/ep/ep-video-exploringcave-2/s023-n-8331ba.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-exploringcave-2/s023-s-79b36c.mp3"
    },
    {
      "s": "s024",
      "e": "ep-video-exploringcave-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "Okay, I'm going to quickly get this iron. Just one piece of iron.",
      "zh": "好，我要赶快拿到这块铁。就一块铁。",
      "an": "https://english.example.com/audio/ep/ep-video-exploringcave-2/s024-n-b3c360.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-exploringcave-2/s024-s-981449.mp3"
    },
    {
      "s": "s025",
      "e": "ep-video-exploringcave-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "There he is. Got him. All right, we're doing good.",
      "zh": "它在那儿。打到了。好，我们做得不错。",
      "an": "https://english.example.com/audio/ep/ep-video-exploringcave-2/s025-n-183fba.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-exploringcave-2/s025-s-328300.mp3"
    },
    {
      "s": "s026",
      "e": "ep-video-exploringcave-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "I missed the witch.",
      "zh": "我没打中女巫。",
      "an": "https://english.example.com/audio/ep/ep-video-exploringcave-2/s026-n-308d18.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-exploringcave-2/s026-s-f7b416.mp3"
    },
    {
      "s": "s027",
      "e": "ep-video-exploringcave-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "The witches are the most dangerous because they throw potions that can poison you.",
      "zh": "女巫最危险，因为它们会扔能让你中毒的药水。",
      "an": "https://english.example.com/audio/ep/ep-video-exploringcave-2/s027-n-72b576.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-exploringcave-2/s027-s-18676b.mp3"
    },
    {
      "s": "s028",
      "e": "ep-video-exploringcave-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "So I need to shoot the witches when I see them.",
      "zh": "所以我一看见女巫，就得射它们。",
      "an": "https://english.example.com/audio/ep/ep-video-exploringcave-2/s028-n-374e38.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-exploringcave-2/s028-s-ee3583.mp3"
    },
    {
      "s": "s029",
      "e": "ep-video-exploringcave-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "So many zombies. Wow.",
      "zh": "好多僵尸。哇。",
      "an": "https://english.example.com/audio/ep/ep-video-exploringcave-2/s029-n-9b0fb0.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-exploringcave-2/s029-s-de268d.mp3"
    },
    {
      "s": "s030",
      "e": "ep-video-exploringcave-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "More iron. Great, we need more iron.",
      "zh": "又有铁了。太好了，我们需要更多铁。",
      "an": "https://english.example.com/audio/ep/ep-video-exploringcave-2/s030-n-ef2378.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-exploringcave-2/s030-s-2a4082.mp3"
    },
    {
      "s": "s031",
      "e": "ep-video-exploringcave-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "Okay, so now we're up to eleven iron.",
      "zh": "好，现在我们有十一个铁了。",
      "an": "https://english.example.com/audio/ep/ep-video-exploringcave-2/s031-n-b7dab0.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-exploringcave-2/s031-s-cffff4.mp3"
    },
    {
      "s": "s032",
      "e": "ep-video-exploringcave-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "Now I have enough iron to build iron tools, and I also have coal.",
      "zh": "现在我的铁够做铁工具了，而且我也有煤炭。",
      "an": "https://english.example.com/audio/ep/ep-video-exploringcave-2/s032-n-3a0245.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-exploringcave-2/s032-s-3f4080.mp3"
    },
    {
      "s": "s033",
      "e": "ep-video-exploringcave-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "So now I think I'm going to go back to my house and finish the windows.",
      "zh": "所以现在我想先回到房子，把窗户装好。",
      "an": "https://english.example.com/audio/ep/ep-video-exploringcave-2/s033-n-e1ce6a.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-exploringcave-2/s033-s-509bf5.mp3"
    },
    {
      "s": "s034",
      "e": "ep-video-exploringcave-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "Because I'm going to need an iron pickaxe before I can mine a lot of the resources down here.",
      "zh": "因为要挖下面很多资源，我得先有一把铁镐。",
      "an": "https://english.example.com/audio/ep/ep-video-exploringcave-2/s034-n-3cd320.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-exploringcave-2/s034-s-e31c61.mp3"
    },
    {
      "s": "s035",
      "e": "ep-video-exploringcave-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "For now, I'm going back up to the surface to finish building the windows to my house.",
      "zh": "眼下我先回到地面，把房子的窗户装完。",
      "an": "https://english.example.com/audio/ep/ep-video-exploringcave-2/s035-n-cc97cb.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-exploringcave-2/s035-s-a49610.mp3"
    },
    {
      "s": "s036",
      "e": "ep-video-exploringcave-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "Oh no, the glowing squid just died inside the wall.",
      "zh": "啊不，那只发光的鱿鱼刚死在墙里面了。",
      "an": "https://english.example.com/audio/ep/ep-video-exploringcave-2/s036-n-8b9a6c.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-exploringcave-2/s036-s-b6d8e4.mp3"
    },
    {
      "s": "s037",
      "e": "ep-video-exploringcave-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "What is this? A glowing ink sack. Interesting.",
      "zh": "这是什么？一个发光的墨囊。有意思。",
      "an": "https://english.example.com/audio/ep/ep-video-exploringcave-2/s037-n-5048dc.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-exploringcave-2/s037-s-39686f.mp3"
    },
    {
      "s": "s038",
      "e": "ep-video-exploringcave-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "Okay, once I have an iron pickaxe I'll come back here and mine all this gold and redstone.",
      "zh": "好，等我有了铁镐，再回来挖这些金子和红石。",
      "an": "https://english.example.com/audio/ep/ep-video-exploringcave-2/s038-n-7c348e.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-exploringcave-2/s038-s-8c15cc.mp3"
    },
    {
      "s": "s039",
      "e": "ep-video-exploringcave-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "Okay, now back up the long staircase, and we're back to the house.",
      "zh": "好，现在沿长楼梯往上走，我们回到房子了。",
      "an": "https://english.example.com/audio/ep/ep-video-exploringcave-2/s039-n-edd0e1.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-exploringcave-2/s039-s-2b6e2e.mp3"
    },
    {
      "s": "s040",
      "e": "ep-video-exploringcave-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "Close the doors. Close, close.",
      "zh": "把门关上。关，关。",
      "an": "https://english.example.com/audio/ep/ep-video-exploringcave-2/s040-n-9ae353.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-exploringcave-2/s040-s-24b780.mp3"
    },
    {
      "s": "s001",
      "e": "ep-video-exploringcave-3",
      "k": "video",
      "sp": "Kenzo",
      "en": "All right, so the first thing that I'm going to do is start cooking some of the sand inside the furnace, using coal as fuel.",
      "zh": "好，我要做的第一件事，是把一些沙子放进熔炉里烧，用煤炭当燃料。",
      "an": "https://english.example.com/audio/ep/ep-video-exploringcave-3/s001-n-05d672.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-exploringcave-3/s001-s-e6b4d1.mp3"
    },
    {
      "s": "s002",
      "e": "ep-video-exploringcave-3",
      "k": "video",
      "sp": "Kenzo",
      "en": "So once the sand smelts inside the furnace, then it'll become glass, and I can use the glass to build windows.",
      "zh": "沙子在熔炉里烧好以后就会变成玻璃，我就能用玻璃来装窗户。",
      "an": "https://english.example.com/audio/ep/ep-video-exploringcave-3/s002-n-a846a0.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-exploringcave-3/s002-s-192c8d.mp3"
    },
    {
      "s": "s003",
      "e": "ep-video-exploringcave-3",
      "k": "video",
      "sp": "Kenzo",
      "en": "But this is going to take a long time to smelt all this glass, so in the meanwhile I'm going to do a little bit more fishing.",
      "zh": "不过要把这些玻璃都烧好需要很长时间，所以这段时间我再去钓一会儿鱼。",
      "an": "https://english.example.com/audio/ep/ep-video-exploringcave-3/s003-n-b53607.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-exploringcave-3/s003-s-f8fbb2.mp3"
    },
    {
      "s": "s004",
      "e": "ep-video-exploringcave-3",
      "k": "video",
      "sp": "Kenzo",
      "en": "Salmon. Another salmon.",
      "zh": "鲑鱼。又一条鲑鱼。",
      "an": "https://english.example.com/audio/ep/ep-video-exploringcave-3/s004-n-c284a0.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-exploringcave-3/s004-s-40ef0d.mp3"
    },
    {
      "s": "s005",
      "e": "ep-video-exploringcave-3",
      "k": "video",
      "sp": "Kenzo",
      "en": "Oh, a saddle! You can use a saddle to ride certain animals like horses and even pigs. This is cool.",
      "zh": "噢，一个鞍！可以用鞍骑某些动物，比如马，甚至还可以骑猪。这很酷。",
      "an": "https://english.example.com/audio/ep/ep-video-exploringcave-3/s005-n-e231f0.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-exploringcave-3/s005-s-18128e.mp3"
    },
    {
      "s": "s006",
      "e": "ep-video-exploringcave-3",
      "k": "video",
      "sp": "Kenzo",
      "en": "Oh, a water bottle. Okay, well, always stay hydrated. Always drink enough water. That's important to remember.",
      "zh": "噢，一瓶水。好，要记得一直补充水分。要喝足够的水。这一点很重要。",
      "an": "https://english.example.com/audio/ep/ep-video-exploringcave-3/s006-n-e94ccc.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-exploringcave-3/s006-s-c71d0c.mp3"
    },
    {
      "s": "s007",
      "e": "ep-video-exploringcave-3",
      "k": "video",
      "sp": "Kenzo",
      "en": "Thank you, Minecraft.",
      "zh": "谢谢你，《我的世界》。",
      "an": "https://english.example.com/audio/ep/ep-video-exploringcave-3/s007-n-d4715d.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-exploringcave-3/s007-s-0b4ebd.mp3"
    },
    {
      "s": "s008",
      "e": "ep-video-exploringcave-3",
      "k": "video",
      "sp": "Kenzo",
      "en": "Oh, a bull. Nice.",
      "zh": "噢，一头公牛。不错。",
      "an": "https://english.example.com/audio/ep/ep-video-exploringcave-3/s008-n-bc9606.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-exploringcave-3/s008-s-abe55e.mp3"
    },
    {
      "s": "s009",
      "e": "ep-video-exploringcave-3",
      "k": "video",
      "sp": "Kenzo",
      "en": "Okay, so now it's getting dark and it's about to get very dangerous, so that means it's time to sleep.",
      "zh": "好，现在天快黑了，马上会变得很危险，所以该睡觉了。",
      "an": "https://english.example.com/audio/ep/ep-video-exploringcave-3/s009-n-6a1e56.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-exploringcave-3/s009-s-31bead.mp3"
    },
    {
      "s": "s010",
      "e": "ep-video-exploringcave-3",
      "k": "video",
      "sp": "Kenzo",
      "en": "And in the morning I think the glass will be ready.",
      "zh": "到了早上，我想玻璃应该就烧好了。",
      "an": "https://english.example.com/audio/ep/ep-video-exploringcave-3/s010-n-b07daa.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-exploringcave-3/s010-s-079b37.mp3"
    },
    {
      "s": "s011",
      "e": "ep-video-exploringcave-3",
      "k": "video",
      "sp": "Kenzo",
      "en": "Let's see. Thirty-eight glass. Okay, that should be enough.",
      "zh": "看看。三十八块玻璃。好，应该够了。",
      "an": "https://english.example.com/audio/ep/ep-video-exploringcave-3/s011-n-113dd0.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-exploringcave-3/s011-s-119864.mp3"
    },
    {
      "s": "s012",
      "e": "ep-video-exploringcave-3",
      "k": "video",
      "sp": "Kenzo",
      "en": "So I'm going to place all the windows. One, two. Up there is going to be the most difficult.",
      "zh": "所以我要把窗户都装上。一、二。上面那儿会最难装。",
      "an": "https://english.example.com/audio/ep/ep-video-exploringcave-3/s012-n-dcc233.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-exploringcave-3/s012-s-dbd4b3.mp3"
    },
    {
      "s": "s013",
      "e": "ep-video-exploringcave-3",
      "k": "video",
      "sp": "Kenzo",
      "en": "I'm gonna have to jump up and place it.",
      "zh": "我得跳起来才能装上去。",
      "an": "https://english.example.com/audio/ep/ep-video-exploringcave-3/s013-n-86863f.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-exploringcave-3/s013-s-72d620.mp3"
    },
    {
      "s": "s014",
      "e": "ep-video-exploringcave-3",
      "k": "video",
      "sp": "Kenzo",
      "en": "Okay, that side is finished, and now the other side.",
      "zh": "好，这一边装完了，现在装另一边。",
      "an": "https://english.example.com/audio/ep/ep-video-exploringcave-3/s014-n-5af74b.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-exploringcave-3/s014-s-f79b4f.mp3"
    },
    {
      "s": "s015",
      "e": "ep-video-exploringcave-3",
      "k": "video",
      "sp": "Kenzo",
      "en": "Now all the windows are finished.",
      "zh": "现在所有窗户都装好了。",
      "an": "https://english.example.com/audio/ep/ep-video-exploringcave-3/s015-n-cbce77.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-exploringcave-3/s015-s-fde78a.mp3"
    },
    {
      "s": "s016",
      "e": "ep-video-exploringcave-3",
      "k": "video",
      "sp": "Kenzo",
      "en": "Right here I'm going to leave open, because I think I'm going to turn this into a little balcony.",
      "zh": "这儿我先留着不装，因为我想把这里做成一个小阳台。",
      "an": "https://english.example.com/audio/ep/ep-video-exploringcave-3/s016-n-39945d.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-exploringcave-3/s016-s-4bd699.mp3"
    },
    {
      "s": "s017",
      "e": "ep-video-exploringcave-3",
      "k": "video",
      "sp": "Kenzo",
      "en": "I think I'll build a staircase that leads up there.",
      "zh": "我想修一个楼梯通到上面去。",
      "an": "https://english.example.com/audio/ep/ep-video-exploringcave-3/s017-n-f1d821.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-exploringcave-3/s017-s-5e76e7.mp3"
    },
    {
      "s": "s018",
      "e": "ep-video-exploringcave-3",
      "k": "video",
      "sp": "Kenzo",
      "en": "And the last thing that I want to do in this video is replace the floor of my house. I don't want to leave it just sand.",
      "zh": "这一集里我还想做的最后一件事，是把房子的地板换掉。我不想一直留着沙子地面。",
      "an": "https://english.example.com/audio/ep/ep-video-exploringcave-3/s018-n-c403b0.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-exploringcave-3/s018-s-8372a1.mp3"
    },
    {
      "s": "s019",
      "e": "ep-video-exploringcave-3",
      "k": "video",
      "sp": "Kenzo",
      "en": "First I'm going to build a shovel, because shovels dig up sand way faster.",
      "zh": "我先做一把铲子，因为用铲子挖沙子会快很多。",
      "an": "https://english.example.com/audio/ep/ep-video-exploringcave-3/s019-n-8d10fb.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-exploringcave-3/s019-s-f3b61d.mp3"
    },
    {
      "s": "s020",
      "e": "ep-video-exploringcave-3",
      "k": "video",
      "sp": "Kenzo",
      "en": "So I'm going to dig up this entire floor.",
      "zh": "所以我要把整块地板都挖掉。",
      "an": "https://english.example.com/audio/ep/ep-video-exploringcave-3/s020-n-718444.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-exploringcave-3/s020-s-77683e.mp3"
    },
    {
      "s": "s021",
      "e": "ep-video-exploringcave-3",
      "k": "video",
      "sp": "Kenzo",
      "en": "And now I'm going to replace all the floor with polished deep slate.",
      "zh": "现在我要用打磨深板岩把地板全部换上。",
      "an": "https://english.example.com/audio/ep/ep-video-exploringcave-3/s021-n-eff654.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-exploringcave-3/s021-s-b3f5fd.mp3"
    },
    {
      "s": "s022",
      "e": "ep-video-exploringcave-3",
      "k": "video",
      "sp": "Kenzo",
      "en": "All right, and it's finished. Now all the floor is polished deep slate, and I think that it looks great.",
      "zh": "好，完成了。现在地板全是打磨深板岩，我觉得好看多了。",
      "an": "https://english.example.com/audio/ep/ep-video-exploringcave-3/s022-n-2a1788.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-exploringcave-3/s022-s-9c7db4.mp3"
    },
    {
      "s": "s023",
      "e": "ep-video-exploringcave-3",
      "k": "video",
      "sp": "Kenzo",
      "en": "Much better than just sand.",
      "zh": "比只有沙子好看多了。",
      "an": "https://english.example.com/audio/ep/ep-video-exploringcave-3/s023-n-80ee0c.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-exploringcave-3/s023-s-a3755b.mp3"
    },
    {
      "s": "s024",
      "e": "ep-video-exploringcave-3",
      "k": "video",
      "sp": "Kenzo",
      "en": "And we also can start smelting some of the iron inside the furnace.",
      "zh": "我们还可以开始在熔炉里炼一些铁。",
      "an": "https://english.example.com/audio/ep/ep-video-exploringcave-3/s024-n-2995c0.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-exploringcave-3/s024-s-a0892e.mp3"
    },
    {
      "s": "s025",
      "e": "ep-video-exploringcave-3",
      "k": "video",
      "sp": "Kenzo",
      "en": "So now the iron is smelting into iron ingots right here.",
      "zh": "现在铁正在这儿炼成铁锭。",
      "an": "https://english.example.com/audio/ep/ep-video-exploringcave-3/s025-n-1116ba.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-exploringcave-3/s025-s-aa87f2.mp3"
    },
    {
      "s": "s026",
      "e": "ep-video-exploringcave-3",
      "k": "video",
      "sp": "Kenzo",
      "en": "So soon I'll be able to build all iron tools, which are a lot better.",
      "zh": "很快我就能做出全套铁工具了，那会好用得多。",
      "an": "https://english.example.com/audio/ep/ep-video-exploringcave-3/s026-n-b7cd90.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-exploringcave-3/s026-s-a5d5cc.mp3"
    },
    {
      "s": "s027",
      "e": "ep-video-exploringcave-3",
      "k": "video",
      "sp": "Kenzo",
      "en": "So I explored a cave and also finished the windows to the house.",
      "zh": "所以我探索了一个洞穴，也把房子的窗户装好了。",
      "an": "https://english.example.com/audio/ep/ep-video-exploringcave-3/s027-n-d2649c.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-exploringcave-3/s027-s-cc6cd5.mp3"
    },
    {
      "s": "s028",
      "e": "ep-video-exploringcave-3",
      "k": "video",
      "sp": "Kenzo",
      "en": "So I accomplished both tasks that I had for this video.",
      "zh": "所以我完成了这一集给自己定的两个任务。",
      "an": "https://english.example.com/audio/ep/ep-video-exploringcave-3/s028-n-1837aa.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-exploringcave-3/s028-s-eee105.mp3"
    },
    {
      "s": "s001",
      "e": "ep-card-family-g3",
      "k": "card",
      "sp": "孩子",
      "en": "This is my mom, and this is my dad.",
      "zh": "这是我妈妈，这是我爸爸。",
      "an": "https://english.example.com/audio/ep/ep-card-family-g3/s001-n-330356.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-family-g3/s001-s-ce6634.mp3"
    },
    {
      "s": "s002",
      "e": "ep-card-family-g3",
      "k": "card",
      "sp": "同学",
      "en": "Do you have any brothers or sisters?",
      "zh": "你有兄弟姐妹吗？",
      "an": "https://english.example.com/audio/ep/ep-card-family-g3/s002-n-27b3af.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-family-g3/s002-s-4c2a75.mp3"
    },
    {
      "s": "s003",
      "e": "ep-card-family-g3",
      "k": "card",
      "sp": "孩子",
      "en": "Yes. I have a little brother. His name is Ben.",
      "zh": "有。我有一个弟弟。他叫 Ben。",
      "an": "https://english.example.com/audio/ep/ep-card-family-g3/s003-n-74aec5.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-family-g3/s003-s-b3046f.mp3"
    },
    {
      "s": "s004",
      "e": "ep-card-family-g3",
      "k": "card",
      "sp": "同学",
      "en": "How old is he?",
      "zh": "他几岁了？",
      "an": "https://english.example.com/audio/ep/ep-card-family-g3/s004-n-d1e8fe.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-family-g3/s004-s-d76015.mp3"
    },
    {
      "s": "s005",
      "e": "ep-card-family-g3",
      "k": "card",
      "sp": "孩子",
      "en": "He's five. He likes to play with me.",
      "zh": "他五岁。他喜欢和我一起玩。",
      "an": "https://english.example.com/audio/ep/ep-card-family-g3/s005-n-fc22a4.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-family-g3/s005-s-f39367.mp3"
    },
    {
      "s": "s006",
      "e": "ep-card-family-g3",
      "k": "card",
      "sp": "孩子",
      "en": "Do you want to come to my house?",
      "zh": "你想来我家玩吗？",
      "an": "https://english.example.com/audio/ep/ep-card-family-g3/s006-n-42e0bd.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-family-g3/s006-s-7a1438.mp3"
    },
    {
      "s": "s001",
      "e": "ep-card-birthday-g3",
      "k": "card",
      "sp": "孩子",
      "en": "It's my birthday today. Can you come to my party?",
      "zh": "今天是我的生日。你能来我的聚会吗？",
      "an": "https://english.example.com/audio/ep/ep-card-birthday-g3/s001-n-4de9fa.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-birthday-g3/s001-s-70a6c1.mp3"
    },
    {
      "s": "s002",
      "e": "ep-card-birthday-g3",
      "k": "card",
      "sp": "同学",
      "en": "Yes! What time does it start?",
      "zh": "可以！什么时候开始？",
      "an": "https://english.example.com/audio/ep/ep-card-birthday-g3/s002-n-ba1aa2.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-birthday-g3/s002-s-30ab45.mp3"
    },
    {
      "s": "s003",
      "e": "ep-card-birthday-g3",
      "k": "card",
      "sp": "孩子",
      "en": "It starts at three. We can eat cake.",
      "zh": "三点开始。我们可以吃蛋糕。",
      "an": "https://english.example.com/audio/ep/ep-card-birthday-g3/s003-n-778c70.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-birthday-g3/s003-s-1a3d13.mp3"
    },
    {
      "s": "s004",
      "e": "ep-card-birthday-g3",
      "k": "card",
      "sp": "同学",
      "en": "That sounds fun. Should I bring a gift?",
      "zh": "听起来很好玩。我要带礼物吗？",
      "an": "https://english.example.com/audio/ep/ep-card-birthday-g3/s004-n-171834.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-birthday-g3/s004-s-c38875.mp3"
    },
    {
      "s": "s005",
      "e": "ep-card-birthday-g3",
      "k": "card",
      "sp": "孩子",
      "en": "You don't have to, but thank you.",
      "zh": "不用带也没关系，不过还是谢谢你。",
      "an": "https://english.example.com/audio/ep/ep-card-birthday-g3/s005-n-242116.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-birthday-g3/s005-s-98895b.mp3"
    },
    {
      "s": "s006",
      "e": "ep-card-birthday-g3",
      "k": "card",
      "sp": "孩子",
      "en": "I can't wait to see you!",
      "zh": "我等不及要见到你了！",
      "an": "https://english.example.com/audio/ep/ep-card-birthday-g3/s006-n-057075.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-birthday-g3/s006-s-cf9b13.mp3"
    },
    {
      "s": "s001",
      "e": "ep-card-help-g3",
      "k": "card",
      "sp": "家长",
      "en": "The living room is messy. Can you help me tidy up?",
      "zh": "客厅有点乱。你能帮我收拾吗？",
      "an": "https://english.example.com/audio/ep/ep-card-help-g3/s001-n-d3ec3a.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-help-g3/s001-s-d984a0.mp3"
    },
    {
      "s": "s002",
      "e": "ep-card-help-g3",
      "k": "card",
      "sp": "孩子",
      "en": "Sure. I'll put the toys in the box.",
      "zh": "当然。我来把玩具放进箱子里。",
      "an": "https://english.example.com/audio/ep/ep-card-help-g3/s002-n-f664dc.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-help-g3/s002-s-13b4a3.mp3"
    },
    {
      "s": "s003",
      "e": "ep-card-help-g3",
      "k": "card",
      "sp": "家长",
      "en": "Thank you. Can you also wipe the table?",
      "zh": "谢谢。你也能擦一下桌子吗？",
      "an": "https://english.example.com/audio/ep/ep-card-help-g3/s003-n-8f58f2.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-help-g3/s003-s-25f97b.mp3"
    },
    {
      "s": "s004",
      "e": "ep-card-help-g3",
      "k": "card",
      "sp": "孩子",
      "en": "Okay. Should I put the books away too?",
      "zh": "好。书也要收起来吗？",
      "an": "https://english.example.com/audio/ep/ep-card-help-g3/s004-n-fbc2ad.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-help-g3/s004-s-0a0f10.mp3"
    },
    {
      "s": "s005",
      "e": "ep-card-help-g3",
      "k": "card",
      "sp": "家长",
      "en": "Yes, please. That would be a big help.",
      "zh": "要的，谢谢。那就帮大忙了。",
      "an": "https://english.example.com/audio/ep/ep-card-help-g3/s005-n-5903a5.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-help-g3/s005-s-90293c.mp3"
    },
    {
      "s": "s006",
      "e": "ep-card-help-g3",
      "k": "card",
      "sp": "孩子",
      "en": "All done. The room looks so nice now!",
      "zh": "都弄好了。房间现在看起来真整洁！",
      "an": "https://english.example.com/audio/ep/ep-card-help-g3/s006-n-ece991.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-help-g3/s006-s-4815c2.mp3"
    },
    {
      "s": "s001",
      "e": "ep-video-potatofarm-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "Hello and welcome back to English from the Ground Up.",
      "zh": "大家好，欢迎回到 English from the Ground Up。",
      "an": "https://english.example.com/audio/ep/ep-video-potatofarm-1/s001-n-9fad6c.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-potatofarm-1/s001-s-0eed8e.mp3"
    },
    {
      "s": "s002",
      "e": "ep-video-potatofarm-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "My name is Kenzo.",
      "zh": "我叫 Kenzo。",
      "an": "https://english.example.com/audio/ep/ep-video-potatofarm-1/s002-n-54da58.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-potatofarm-1/s002-s-f8ae32.mp3"
    },
    {
      "s": "s003",
      "e": "ep-video-potatofarm-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "And in this video, you will acquire English naturally by watching, listening, and following along as I play Minecraft Hardcore.",
      "zh": "在这一集里，你会通过观看、听和跟着我玩《我的世界》极限模式，自然地学到英语。",
      "an": "https://english.example.com/audio/ep/ep-video-potatofarm-1/s003-n-c8aed7.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-potatofarm-1/s003-s-c123c5.mp3"
    },
    {
      "s": "s004",
      "e": "ep-video-potatofarm-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "Let's do it.",
      "zh": "开始吧。",
      "an": "https://english.example.com/audio/ep/ep-video-potatofarm-1/s004-n-e58995.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-potatofarm-1/s004-s-fa1c02.mp3"
    },
    {
      "s": "s005",
      "e": "ep-video-potatofarm-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "So, first of all, I changed around the chest room a little bit.",
      "zh": "首先，我把箱子房稍微调整了一下。",
      "an": "https://english.example.com/audio/ep/ep-video-potatofarm-1/s005-n-c5f176.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-potatofarm-1/s005-s-e5153e.mp3"
    },
    {
      "s": "s006",
      "e": "ep-video-potatofarm-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "I added signs. Signs that say what's inside the chests.",
      "zh": "我加了告示牌。告示牌上写着箱子里是什么。",
      "an": "https://english.example.com/audio/ep/ep-video-potatofarm-1/s006-n-a288e7.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-potatofarm-1/s006-s-b8a245.mp3"
    },
    {
      "s": "s007",
      "e": "ep-video-potatofarm-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "So, inside this chest, there's stone.",
      "zh": "所以，这个箱子里是石头。",
      "an": "https://english.example.com/audio/ep/ep-video-potatofarm-1/s007-n-d825c8.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-potatofarm-1/s007-s-e96b37.mp3"
    },
    {
      "s": "s008",
      "e": "ep-video-potatofarm-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "And inside this chest, there's soil.",
      "zh": "这个箱子里是泥土。",
      "an": "https://english.example.com/audio/ep/ep-video-potatofarm-1/s008-n-333447.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-potatofarm-1/s008-s-a21805.mp3"
    },
    {
      "s": "s009",
      "e": "ep-video-potatofarm-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "So, here we have gravel, dirt.",
      "zh": "这边是沙砾和泥土。",
      "an": "https://english.example.com/audio/ep/ep-video-potatofarm-1/s009-n-430914.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-potatofarm-1/s009-s-9628a3.mp3"
    },
    {
      "s": "s010",
      "e": "ep-video-potatofarm-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "I would put sand in this chest.",
      "zh": "沙子我会放进这个箱子。",
      "an": "https://english.example.com/audio/ep/ep-video-potatofarm-1/s010-n-1ac327.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-potatofarm-1/s010-s-6882c2.mp3"
    },
    {
      "s": "s011",
      "e": "ep-video-potatofarm-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "So now I've organized my items in these chests.",
      "zh": "现在我已经把物品整理进这些箱子里了。",
      "an": "https://english.example.com/audio/ep/ep-video-potatofarm-1/s011-n-9a3809.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-potatofarm-1/s011-s-00d0a1.mp3"
    },
    {
      "s": "s012",
      "e": "ep-video-potatofarm-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "I still need to build signs for this side, but I'll do that in the future.",
      "zh": "这边还需要做告示牌，不过我以后再做。",
      "an": "https://english.example.com/audio/ep/ep-video-potatofarm-1/s012-n-def5eb.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-potatofarm-1/s012-s-afd95b.mp3"
    },
    {
      "s": "s013",
      "e": "ep-video-potatofarm-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "It's night time. I'm going to go to sleep.",
      "zh": "天黑了。我去睡觉。",
      "an": "https://english.example.com/audio/ep/ep-video-potatofarm-1/s013-n-0d5dc3.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-potatofarm-1/s013-s-6a5e8f.mp3"
    },
    {
      "s": "s014",
      "e": "ep-video-potatofarm-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "It's morning.",
      "zh": "早上了。",
      "an": "https://english.example.com/audio/ep/ep-video-potatofarm-1/s014-n-563082.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-potatofarm-1/s014-s-cac6cd.mp3"
    },
    {
      "s": "s015",
      "e": "ep-video-potatofarm-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "I have one more thing to show you, and it's down here, down the long staircase.",
      "zh": "我还有一样东西要给你看，就在下面，顺着这条长楼梯下去。",
      "an": "https://english.example.com/audio/ep/ep-video-potatofarm-1/s015-n-f8fd1a.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-potatofarm-1/s015-s-bc2a43.mp3"
    },
    {
      "s": "s016",
      "e": "ep-video-potatofarm-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "I did a little bit of mining on the Discord community.",
      "zh": "我在 Discord 社区里挖了一会儿矿。",
      "an": "https://english.example.com/audio/ep/ep-video-potatofarm-1/s016-n-56f91d.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-potatofarm-1/s016-s-245c74.mp3"
    },
    {
      "s": "s017",
      "e": "ep-video-potatofarm-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "I took this staircase all the way down to bedrock.",
      "zh": "我把这条楼梯一直修到了基岩层。",
      "an": "https://english.example.com/audio/ep/ep-video-potatofarm-1/s017-n-ac17ff.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-potatofarm-1/s017-s-20f3f5.mp3"
    },
    {
      "s": "s018",
      "e": "ep-video-potatofarm-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "And along the way, I found some diamonds.",
      "zh": "一路上，我找到了一些钻石。",
      "an": "https://english.example.com/audio/ep/ep-video-potatofarm-1/s018-n-e74b4e.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-potatofarm-1/s018-s-42b15f.mp3"
    },
    {
      "s": "s019",
      "e": "ep-video-potatofarm-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "I found diamonds here, and I also found diamonds down this tunnel.",
      "zh": "我在这儿找到了钻石，在这条隧道里也找到了钻石。",
      "an": "https://english.example.com/audio/ep/ep-video-potatofarm-1/s019-n-f0e854.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-potatofarm-1/s019-s-ce93ec.mp3"
    },
    {
      "s": "s020",
      "e": "ep-video-potatofarm-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "Let's mine these diamonds.",
      "zh": "我们来挖这些钻石。",
      "an": "https://english.example.com/audio/ep/ep-video-potatofarm-1/s020-n-494445.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-potatofarm-1/s020-s-3a10f6.mp3"
    },
    {
      "s": "s021",
      "e": "ep-video-potatofarm-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "Let's see how many diamonds we found.",
      "zh": "看看我们找到了多少钻石。",
      "an": "https://english.example.com/audio/ep/ep-video-potatofarm-1/s021-n-3cd701.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-potatofarm-1/s021-s-52f26e.mp3"
    },
    {
      "s": "s022",
      "e": "ep-video-potatofarm-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "There's five diamonds.",
      "zh": "有五颗钻石。",
      "an": "https://english.example.com/audio/ep/ep-video-potatofarm-1/s022-n-4241f8.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-potatofarm-1/s022-s-d4df4b.mp3"
    },
    {
      "s": "s023",
      "e": "ep-video-potatofarm-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "All right, it looks like there's one diamond right here.",
      "zh": "好，看起来这儿还有一颗钻石。",
      "an": "https://english.example.com/audio/ep/ep-video-potatofarm-1/s023-n-9525a9.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-potatofarm-1/s023-s-a8cdbf.mp3"
    },
    {
      "s": "s024",
      "e": "ep-video-potatofarm-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "So, there's six diamonds now.",
      "zh": "所以现在有六颗钻石了。",
      "an": "https://english.example.com/audio/ep/ep-video-potatofarm-1/s024-n-248812.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-potatofarm-1/s024-s-04aadc.mp3"
    },
    {
      "s": "s025",
      "e": "ep-video-potatofarm-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "I think there were diamonds down this tunnel.",
      "zh": "我觉得这条隧道里还有钻石。",
      "an": "https://english.example.com/audio/ep/ep-video-potatofarm-1/s025-n-5bf1cc.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-potatofarm-1/s025-s-c8d70e.mp3"
    },
    {
      "s": "s026",
      "e": "ep-video-potatofarm-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "Nope. Never mind. No diamonds down this tunnel.",
      "zh": "没有。算了。这条隧道里没有钻石。",
      "an": "https://english.example.com/audio/ep/ep-video-potatofarm-1/s026-n-629bd6.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-potatofarm-1/s026-s-bf62f7.mp3"
    },
    {
      "s": "s027",
      "e": "ep-video-potatofarm-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "This was a really long tunnel. And there's at least one diamond right here.",
      "zh": "这是一条很长的隧道。这儿至少还有一颗钻石。",
      "an": "https://english.example.com/audio/ep/ep-video-potatofarm-1/s027-n-50f009.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-potatofarm-1/s027-s-5702b4.mp3"
    },
    {
      "s": "s028",
      "e": "ep-video-potatofarm-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "Let's see. Just one. Just one diamond.",
      "zh": "看看。就一颗。就一颗钻石。",
      "an": "https://english.example.com/audio/ep/ep-video-potatofarm-1/s028-n-7cc6d2.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-potatofarm-1/s028-s-074ed6.mp3"
    },
    {
      "s": "s029",
      "e": "ep-video-potatofarm-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "Okay, so we found seven diamonds.",
      "zh": "好，所以我们找到了七颗钻石。",
      "an": "https://english.example.com/audio/ep/ep-video-potatofarm-1/s029-n-b07004.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-potatofarm-1/s029-s-b83b3b.mp3"
    },
    {
      "s": "s030",
      "e": "ep-video-potatofarm-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "I found seven diamonds while playing on Discord.",
      "zh": "我在 Discord 上玩的时候找到了七颗钻石。",
      "an": "https://english.example.com/audio/ep/ep-video-potatofarm-1/s030-n-ad1d0b.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-potatofarm-1/s030-s-a5f7ac.mp3"
    },
    {
      "s": "s031",
      "e": "ep-video-potatofarm-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "All right, we're back to the surface.",
      "zh": "好，我们回到地面了。",
      "an": "https://english.example.com/audio/ep/ep-video-potatofarm-1/s031-n-a4ee36.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-potatofarm-1/s031-s-b34077.mp3"
    },
    {
      "s": "s032",
      "e": "ep-video-potatofarm-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "Let's go to sleep.",
      "zh": "去睡觉吧。",
      "an": "https://english.example.com/audio/ep/ep-video-potatofarm-1/s032-n-49af18.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-potatofarm-1/s032-s-08a8ea.mp3"
    },
    {
      "s": "s033",
      "e": "ep-video-potatofarm-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "Let's take our diamonds and let's put them in the valuable chest.",
      "zh": "我们把钻石拿上，放进贵重物品箱子里。",
      "an": "https://english.example.com/audio/ep/ep-video-potatofarm-1/s033-n-b443d4.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-potatofarm-1/s033-s-727584.mp3"
    },
    {
      "s": "s034",
      "e": "ep-video-potatofarm-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "These are all of my valuable items.",
      "zh": "这些都是我的贵重物品。",
      "an": "https://english.example.com/audio/ep/ep-video-potatofarm-1/s034-n-1b951f.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-potatofarm-1/s034-s-9a9f0f.mp3"
    },
    {
      "s": "s035",
      "e": "ep-video-potatofarm-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "Let's take the diamonds and let's put them in here.",
      "zh": "把钻石拿出来，放进这里。",
      "an": "https://english.example.com/audio/ep/ep-video-potatofarm-1/s035-n-9baded.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-potatofarm-1/s035-s-b4bc15.mp3"
    },
    {
      "s": "s036",
      "e": "ep-video-potatofarm-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "This was my first pickaxe. This is very valuable.",
      "zh": "这是我的第一把镐。这个非常珍贵。",
      "an": "https://english.example.com/audio/ep/ep-video-potatofarm-1/s036-n-0875d5.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-potatofarm-1/s036-s-c24ba4.mp3"
    },
    {
      "s": "s037",
      "e": "ep-video-potatofarm-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "And I also found a trident, an enchanted trident, but it's almost broken.",
      "zh": "我还找到了一把三叉戟，一把附魔三叉戟，不过快坏了。",
      "an": "https://english.example.com/audio/ep/ep-video-potatofarm-1/s037-n-7a957c.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-potatofarm-1/s037-s-4e2193.mp3"
    },
    {
      "s": "s038",
      "e": "ep-video-potatofarm-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "This user in the comments told me what the lodestone does.",
      "zh": "评论区有一位观众告诉我磁石是做什么的。",
      "an": "https://english.example.com/audio/ep/ep-video-potatofarm-1/s038-n-09a347.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-potatofarm-1/s038-s-d45646.mp3"
    },
    {
      "s": "s039",
      "e": "ep-video-potatofarm-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "I'm going to break this cobblestone, and I'll replace it with the lodestone.",
      "zh": "我要把这块圆石敲掉，换成磁石。",
      "an": "https://english.example.com/audio/ep/ep-video-potatofarm-1/s039-n-0ae130.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-potatofarm-1/s039-s-0acf63.mp3"
    },
    {
      "s": "s040",
      "e": "ep-video-potatofarm-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "Now, we have to build a compass.",
      "zh": "现在，我们得做一枚指南针。",
      "an": "https://english.example.com/audio/ep/ep-video-potatofarm-1/s040-n-538fa5.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-potatofarm-1/s040-s-c64eec.mp3"
    },
    {
      "s": "s041",
      "e": "ep-video-potatofarm-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "We need four iron ingots.",
      "zh": "我们需要四个铁锭。",
      "an": "https://english.example.com/audio/ep/ep-video-potatofarm-1/s041-n-bb113c.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-potatofarm-1/s041-s-d72a67.mp3"
    },
    {
      "s": "s042",
      "e": "ep-video-potatofarm-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "We'll have to build one more using these nuggets.",
      "zh": "我们还得用这些铁粒再做一个铁锭。",
      "an": "https://english.example.com/audio/ep/ep-video-potatofarm-1/s042-n-384ec5.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-potatofarm-1/s042-s-cbf829.mp3"
    },
    {
      "s": "s043",
      "e": "ep-video-potatofarm-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "And we'll also need a redstone dust. One redstone dust.",
      "zh": "我们还需要一粒红石粉。一粒红石粉。",
      "an": "https://english.example.com/audio/ep/ep-video-potatofarm-1/s043-n-d34a46.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-potatofarm-1/s043-s-e2ef44.mp3"
    },
    {
      "s": "s044",
      "e": "ep-video-potatofarm-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "Okay, let's build one iron ingot.",
      "zh": "好，我们来做一个铁锭。",
      "an": "https://english.example.com/audio/ep/ep-video-potatofarm-1/s044-n-cf2b11.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-potatofarm-1/s044-s-b55122.mp3"
    },
    {
      "s": "s045",
      "e": "ep-video-potatofarm-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "There we go. Now we have four. So we can build a compass.",
      "zh": "好了。现在有四个了。所以可以做指南针了。",
      "an": "https://english.example.com/audio/ep/ep-video-potatofarm-1/s045-n-e09373.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-potatofarm-1/s045-s-fee052.mp3"
    },
    {
      "s": "s046",
      "e": "ep-video-potatofarm-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "Here it is. The compass.",
      "zh": "就是这个。指南针。",
      "an": "https://english.example.com/audio/ep/ep-video-potatofarm-1/s046-n-92cf79.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-potatofarm-1/s046-s-8438f7.mp3"
    },
    {
      "s": "s047",
      "e": "ep-video-potatofarm-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "Let's build a compass.",
      "zh": "我们来做一枚指南针。",
      "an": "https://english.example.com/audio/ep/ep-video-potatofarm-1/s047-n-ce7b03.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-potatofarm-1/s047-s-9917cd.mp3"
    },
    {
      "s": "s048",
      "e": "ep-video-potatofarm-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "So right now, this compass is pointing me this way.",
      "zh": "现在，这枚指南针指着这个方向。",
      "an": "https://english.example.com/audio/ep/ep-video-potatofarm-1/s048-n-66ab27.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-potatofarm-1/s048-s-ef58e1.mp3"
    },
    {
      "s": "s049",
      "e": "ep-video-potatofarm-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "It's pointing this direction because it's pointing where I originally spawned in this world.",
      "zh": "它指着这个方向，因为它指向我最初在这个世界出生的地方。",
      "an": "https://english.example.com/audio/ep/ep-video-potatofarm-1/s049-n-0d4734.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-potatofarm-1/s049-s-c28b71.mp3"
    },
    {
      "s": "s050",
      "e": "ep-video-potatofarm-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "But I want the compass to point me back to my house.",
      "zh": "可是我想让指南针指回我的家。",
      "an": "https://english.example.com/audio/ep/ep-video-potatofarm-1/s050-n-7bc750.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-potatofarm-1/s050-s-c4ae82.mp3"
    },
    {
      "s": "s051",
      "e": "ep-video-potatofarm-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "And I can do that using the lodestone.",
      "zh": "我可以用磁石来做到这一点。",
      "an": "https://english.example.com/audio/ep/ep-video-potatofarm-1/s051-n-c97be7.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-potatofarm-1/s051-s-c94428.mp3"
    },
    {
      "s": "s052",
      "e": "ep-video-potatofarm-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "There we go. Now the compass is pointing towards the lodestone.",
      "zh": "好了。现在指南针指向磁石了。",
      "an": "https://english.example.com/audio/ep/ep-video-potatofarm-1/s052-n-fcb46e.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-potatofarm-1/s052-s-960c10.mp3"
    },
    {
      "s": "s053",
      "e": "ep-video-potatofarm-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "So, my compass will point me to my home.",
      "zh": "这样，我的指南针就会指着回家的路。",
      "an": "https://english.example.com/audio/ep/ep-video-potatofarm-1/s053-n-a09a14.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-potatofarm-1/s053-s-2dd559.mp3"
    },
    {
      "s": "s054",
      "e": "ep-video-potatofarm-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "I'm also going to break these torches.",
      "zh": "我还要把这些火把拆掉。",
      "an": "https://english.example.com/audio/ep/ep-video-potatofarm-1/s054-n-069872.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-potatofarm-1/s054-s-34f880.mp3"
    },
    {
      "s": "s055",
      "e": "ep-video-potatofarm-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "Let's build a lantern. And let's place it right here.",
      "zh": "我们来做一个灯笼。然后把它放在这儿。",
      "an": "https://english.example.com/audio/ep/ep-video-potatofarm-1/s055-n-1cd363.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-potatofarm-1/s055-s-b363da.mp3"
    },
    {
      "s": "s056",
      "e": "ep-video-potatofarm-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "There we go. The lantern looks better.",
      "zh": "好了。灯笼看起来更好看。",
      "an": "https://english.example.com/audio/ep/ep-video-potatofarm-1/s056-n-a2ed2f.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-potatofarm-1/s056-s-eff5ae.mp3"
    },
    {
      "s": "s057",
      "e": "ep-video-potatofarm-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "I also want to craft some armor stands for the corners.",
      "zh": "我还想在角落做几个盔甲架。",
      "an": "https://english.example.com/audio/ep/ep-video-potatofarm-1/s057-n-08dc36.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-potatofarm-1/s057-s-aaa125.mp3"
    },
    {
      "s": "s058",
      "e": "ep-video-potatofarm-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "What do we need? We need some sticks and a smooth stone slab.",
      "zh": "我们需要什么？需要一些木棍和一块平滑石头台阶。",
      "an": "https://english.example.com/audio/ep/ep-video-potatofarm-1/s058-n-2f0ef5.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-potatofarm-1/s058-s-0bd324.mp3"
    },
    {
      "s": "s059",
      "e": "ep-video-potatofarm-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "Now, let's take our smooth stone and turn them into smooth stone slabs.",
      "zh": "现在，把平滑石头做成平滑石头台阶。",
      "an": "https://english.example.com/audio/ep/ep-video-potatofarm-1/s059-n-3fc4fc.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-potatofarm-1/s059-s-ad0f4e.mp3"
    },
    {
      "s": "s060",
      "e": "ep-video-potatofarm-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "Okay. Now we can build an armor stand.",
      "zh": "好。现在可以做盔甲架了。",
      "an": "https://english.example.com/audio/ep/ep-video-potatofarm-1/s060-n-18b48d.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-potatofarm-1/s060-s-58d4c4.mp3"
    },
    {
      "s": "s061",
      "e": "ep-video-potatofarm-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "We just need sticks. Sticks will be in the wood chest, because they're made of wood.",
      "zh": "只需要木棍。木棍在木头箱子里，因为它们是木头做的。",
      "an": "https://english.example.com/audio/ep/ep-video-potatofarm-1/s061-n-6586bb.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-potatofarm-1/s061-s-fba3e2.mp3"
    },
    {
      "s": "s062",
      "e": "ep-video-potatofarm-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "Let's build two armor stands. One. Two. Cool.",
      "zh": "我们来做两个盔甲架。一个。两个。酷。",
      "an": "https://english.example.com/audio/ep/ep-video-potatofarm-1/s062-n-51cab8.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-potatofarm-1/s062-s-8e5708.mp3"
    },
    {
      "s": "s063",
      "e": "ep-video-potatofarm-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "I'm going to place a slab right here and a slab right here.",
      "zh": "我要在这儿放一块台阶，这边再放一块。",
      "an": "https://english.example.com/audio/ep/ep-video-potatofarm-1/s063-n-8b2e81.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-potatofarm-1/s063-s-ab7ffa.mp3"
    },
    {
      "s": "s064",
      "e": "ep-video-potatofarm-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "And on top of the slabs, we'll place the armor stands.",
      "zh": "然后在台阶上面放上盔甲架。",
      "an": "https://english.example.com/audio/ep/ep-video-potatofarm-1/s064-n-286b95.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-potatofarm-1/s064-s-2c531d.mp3"
    },
    {
      "s": "s065",
      "e": "ep-video-potatofarm-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "One and two. There we go.",
      "zh": "一个，两个。好了。",
      "an": "https://english.example.com/audio/ep/ep-video-potatofarm-1/s065-n-ff7495.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-potatofarm-1/s065-s-36efd5.mp3"
    },
    {
      "s": "s066",
      "e": "ep-video-potatofarm-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "And I'm going to give my first pickaxe to this armor stand.",
      "zh": "我要把我的第一把镐交给这个盔甲架。",
      "an": "https://english.example.com/audio/ep/ep-video-potatofarm-1/s066-n-4939f3.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-potatofarm-1/s066-s-97ffff.mp3"
    },
    {
      "s": "s067",
      "e": "ep-video-potatofarm-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "Let's take my first pickaxe and let's give it to the armor stand.",
      "zh": "拿上我的第一把镐，交给这个盔甲架。",
      "an": "https://english.example.com/audio/ep/ep-video-potatofarm-1/s067-n-c3a849.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-potatofarm-1/s067-s-085e15.mp3"
    },
    {
      "s": "s068",
      "e": "ep-video-potatofarm-1",
      "k": "video",
      "sp": "Kenzo",
      "en": "Now it's holding the pickaxe.",
      "zh": "现在它拿着这把镐了。",
      "an": "https://english.example.com/audio/ep/ep-video-potatofarm-1/s068-n-037537.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-potatofarm-1/s068-s-546f6f.mp3"
    },
    {
      "s": "s001",
      "e": "ep-video-potatofarm-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "Now, I want to build a farm.",
      "zh": "现在，我想建一个农场。",
      "an": "https://english.example.com/audio/ep/ep-video-potatofarm-2/s001-n-c1b0c4.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-potatofarm-2/s001-s-d92c52.mp3"
    },
    {
      "s": "s002",
      "e": "ep-video-potatofarm-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "I want to plant some of these seeds that I've found.",
      "zh": "我想把找到的这些种子种下去。",
      "an": "https://english.example.com/audio/ep/ep-video-potatofarm-2/s002-n-b108f2.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-potatofarm-2/s002-s-f1b2cc.mp3"
    },
    {
      "s": "s003",
      "e": "ep-video-potatofarm-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "I have an idea for an interesting farm, but I'm going to need a lot of dirt.",
      "zh": "我有一个有意思的农场想法，不过需要很多泥土。",
      "an": "https://english.example.com/audio/ep/ep-video-potatofarm-2/s003-n-b0d958.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-potatofarm-2/s003-s-e1ff30.mp3"
    },
    {
      "s": "s004",
      "e": "ep-video-potatofarm-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "Let's pick up some dirt.",
      "zh": "我们来挖一些泥土。",
      "an": "https://english.example.com/audio/ep/ep-video-potatofarm-2/s004-n-8b6467.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-potatofarm-2/s004-s-191a8e.mp3"
    },
    {
      "s": "s005",
      "e": "ep-video-potatofarm-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "I'm going to need more dirt.",
      "zh": "我还需要更多泥土。",
      "an": "https://english.example.com/audio/ep/ep-video-potatofarm-2/s005-n-b98e47.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-potatofarm-2/s005-s-d3ab00.mp3"
    },
    {
      "s": "s006",
      "e": "ep-video-potatofarm-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "Let's build an iron shovel.",
      "zh": "我们来做一把铁锹。",
      "an": "https://english.example.com/audio/ep/ep-video-potatofarm-2/s006-n-807a3a.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-potatofarm-2/s006-s-db129d.mp3"
    },
    {
      "s": "s007",
      "e": "ep-video-potatofarm-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "I'm going to collect a bunch of dirt.",
      "zh": "我要收集好多泥土。",
      "an": "https://english.example.com/audio/ep/ep-video-potatofarm-2/s007-n-45abe0.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-potatofarm-2/s007-s-0f024b.mp3"
    },
    {
      "s": "s008",
      "e": "ep-video-potatofarm-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "Place another torch and I'll pick up all this dirt.",
      "zh": "再放一根火把，然后把这些泥土都挖走。",
      "an": "https://english.example.com/audio/ep/ep-video-potatofarm-2/s008-n-8c1ced.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-potatofarm-2/s008-s-9e59f9.mp3"
    },
    {
      "s": "s009",
      "e": "ep-video-potatofarm-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "And I think that should be enough.",
      "zh": "我觉得应该够了。",
      "an": "https://english.example.com/audio/ep/ep-video-potatofarm-2/s009-n-3a8905.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-potatofarm-2/s009-s-ede249.mp3"
    },
    {
      "s": "s010",
      "e": "ep-video-potatofarm-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "Oh, it's night time. Let's go to sleep.",
      "zh": "哦，天黑了。去睡觉吧。",
      "an": "https://english.example.com/audio/ep/ep-video-potatofarm-2/s010-n-d5d371.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-potatofarm-2/s010-s-f02308.mp3"
    },
    {
      "s": "s011",
      "e": "ep-video-potatofarm-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "I'm going to build a stone cutter.",
      "zh": "我要做一个切石机。",
      "an": "https://english.example.com/audio/ep/ep-video-potatofarm-2/s011-n-6cfca3.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-potatofarm-2/s011-s-e98118.mp3"
    },
    {
      "s": "s012",
      "e": "ep-video-potatofarm-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "How do you build a stone cutter?",
      "zh": "切石机怎么做？",
      "an": "https://english.example.com/audio/ep/ep-video-potatofarm-2/s012-n-42e282.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-potatofarm-2/s012-s-aa6651.mp3"
    },
    {
      "s": "s013",
      "e": "ep-video-potatofarm-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "Here it is. Three stone and one iron ingot.",
      "zh": "在这儿。三块石头和一个铁锭。",
      "an": "https://english.example.com/audio/ep/ep-video-potatofarm-2/s013-n-966bb8.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-potatofarm-2/s013-s-68c534.mp3"
    },
    {
      "s": "s014",
      "e": "ep-video-potatofarm-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "Here I have some stone.",
      "zh": "我这儿有一些石头。",
      "an": "https://english.example.com/audio/ep/ep-video-potatofarm-2/s014-n-875e63.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-potatofarm-2/s014-s-b2f953.mp3"
    },
    {
      "s": "s015",
      "e": "ep-video-potatofarm-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "Three stone and one iron ingot. Let's build the stone cutter.",
      "zh": "三块石头和一个铁锭。我们来做切石机。",
      "an": "https://english.example.com/audio/ep/ep-video-potatofarm-2/s015-n-b7f2a4.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-potatofarm-2/s015-s-0a0909.mp3"
    },
    {
      "s": "s016",
      "e": "ep-video-potatofarm-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "And I'll place the stone cutter on top of the crafting table.",
      "zh": "我把切石机放在工作台上面。",
      "an": "https://english.example.com/audio/ep/ep-video-potatofarm-2/s016-n-dacd9a.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-potatofarm-2/s016-s-514f28.mp3"
    },
    {
      "s": "s017",
      "e": "ep-video-potatofarm-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "I have a bunch of deep slate.",
      "zh": "我有好多深板岩。",
      "an": "https://english.example.com/audio/ep/ep-video-potatofarm-2/s017-n-38ce49.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-potatofarm-2/s017-s-da83d3.mp3"
    },
    {
      "s": "s018",
      "e": "ep-video-potatofarm-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "Let's take some of this deep slate.",
      "zh": "我们拿一些深板岩。",
      "an": "https://english.example.com/audio/ep/ep-video-potatofarm-2/s018-n-420e87.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-potatofarm-2/s018-s-4e695b.mp3"
    },
    {
      "s": "s019",
      "e": "ep-video-potatofarm-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "And using the stone cutter, I'll turn this cobbled deep slate into some polished deep slate.",
      "zh": "用切石机，我把这些深板岩圆石打磨成打磨深板岩。",
      "an": "https://english.example.com/audio/ep/ep-video-potatofarm-2/s019-n-0db936.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-potatofarm-2/s019-s-ff4f7b.mp3"
    },
    {
      "s": "s020",
      "e": "ep-video-potatofarm-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "I turned all of the cobbled deep slate into polished deep slate.",
      "zh": "我把所有深板岩圆石都打磨成了打磨深板岩。",
      "an": "https://english.example.com/audio/ep/ep-video-potatofarm-2/s020-n-8ab99d.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-potatofarm-2/s020-s-49ca65.mp3"
    },
    {
      "s": "s021",
      "e": "ep-video-potatofarm-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "And lastly, I'm going to craft some fences.",
      "zh": "最后，我要做一些栅栏。",
      "an": "https://english.example.com/audio/ep/ep-video-potatofarm-2/s021-n-056495.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-potatofarm-2/s021-s-a521fc.mp3"
    },
    {
      "s": "s022",
      "e": "ep-video-potatofarm-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "Let's do bamboo fences. Let's build a bunch of bamboo fences.",
      "zh": "就做竹栅栏吧。我们来做很多竹栅栏。",
      "an": "https://english.example.com/audio/ep/ep-video-potatofarm-2/s022-n-30c0da.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-potatofarm-2/s022-s-f3e936.mp3"
    },
    {
      "s": "s023",
      "e": "ep-video-potatofarm-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "Okay, we built fifty-seven bamboo fences. We'll probably need more.",
      "zh": "好，我们做了五十七个竹栅栏。可能还不够。",
      "an": "https://english.example.com/audio/ep/ep-video-potatofarm-2/s023-n-11bf0a.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-potatofarm-2/s023-s-bd2883.mp3"
    },
    {
      "s": "s024",
      "e": "ep-video-potatofarm-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "I'm going to build my farm in the ocean.",
      "zh": "我要在海里建农场。",
      "an": "https://english.example.com/audio/ep/ep-video-potatofarm-2/s024-n-df3f91.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-potatofarm-2/s024-s-e23dcc.mp3"
    },
    {
      "s": "s025",
      "e": "ep-video-potatofarm-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "The first farm I'll build right here.",
      "zh": "第一个农场就建在这儿。",
      "an": "https://english.example.com/audio/ep/ep-video-potatofarm-2/s025-n-4cf7dc.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-potatofarm-2/s025-s-af04b4.mp3"
    },
    {
      "s": "s026",
      "e": "ep-video-potatofarm-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "Let's get out of the boat.",
      "zh": "我们下船吧。",
      "an": "https://english.example.com/audio/ep/ep-video-potatofarm-2/s026-n-ce17cc.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-potatofarm-2/s026-s-64f26c.mp3"
    },
    {
      "s": "s027",
      "e": "ep-video-potatofarm-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "I'm going to dig up this sand and replace it with dirt.",
      "zh": "我要把这些沙子挖掉，换成泥土。",
      "an": "https://english.example.com/audio/ep/ep-video-potatofarm-2/s027-n-41185c.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-potatofarm-2/s027-s-d55cf1.mp3"
    },
    {
      "s": "s028",
      "e": "ep-video-potatofarm-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "I'm going to make a circle.",
      "zh": "我要做一个圆。",
      "an": "https://english.example.com/audio/ep/ep-video-potatofarm-2/s028-n-699cad.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-potatofarm-2/s028-s-45cf0e.mp3"
    },
    {
      "s": "s029",
      "e": "ep-video-potatofarm-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "All right. I've built the circle. Now I need to fill it in with dirt.",
      "zh": "好。圆圈做好了。现在要用泥土填满。",
      "an": "https://english.example.com/audio/ep/ep-video-potatofarm-2/s029-n-23ff93.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-potatofarm-2/s029-s-1c9b8b.mp3"
    },
    {
      "s": "s030",
      "e": "ep-video-potatofarm-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "Okay, halfway done. And finished.",
      "zh": "好，做了一半。做完了。",
      "an": "https://english.example.com/audio/ep/ep-video-potatofarm-2/s030-n-e9ba9e.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-potatofarm-2/s030-s-efdb33.mp3"
    },
    {
      "s": "s031",
      "e": "ep-video-potatofarm-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "There we go. I've built a dirt circle.",
      "zh": "好了。我做好了一个泥土圆。",
      "an": "https://english.example.com/audio/ep/ep-video-potatofarm-2/s031-n-e4c5f7.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-potatofarm-2/s031-s-f96726.mp3"
    },
    {
      "s": "s032",
      "e": "ep-video-potatofarm-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "Now I'm going to get some of my polished deep slate, and I'll place some around the outside like this.",
      "zh": "现在拿出一些打磨深板岩，沿着外面这样放一圈。",
      "an": "https://english.example.com/audio/ep/ep-video-potatofarm-2/s032-n-3e4cd6.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-potatofarm-2/s032-s-58a6be.mp3"
    },
    {
      "s": "s033",
      "e": "ep-video-potatofarm-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "A baby drowned.",
      "zh": "一只溺尸宝宝。",
      "an": "https://english.example.com/audio/ep/ep-video-potatofarm-2/s033-n-7a1382.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-potatofarm-2/s033-s-0ec14e.mp3"
    },
    {
      "s": "s034",
      "e": "ep-video-potatofarm-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "I'll place some like this.",
      "zh": "我就这样放一些。",
      "an": "https://english.example.com/audio/ep/ep-video-potatofarm-2/s034-n-be0e16.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-potatofarm-2/s034-s-aef9a2.mp3"
    },
    {
      "s": "s035",
      "e": "ep-video-potatofarm-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "Oh, hello parrot.",
      "zh": "哦，你好，鹦鹉。",
      "an": "https://english.example.com/audio/ep/ep-video-potatofarm-2/s035-n-520efe.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-potatofarm-2/s035-s-324b8a.mp3"
    },
    {
      "s": "s036",
      "e": "ep-video-potatofarm-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "Now I've placed the polished deep slate all around the outside.",
      "zh": "现在我已经把打磨深板岩沿外圈放好了。",
      "an": "https://english.example.com/audio/ep/ep-video-potatofarm-2/s036-n-b7aa5a.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-potatofarm-2/s036-s-c301fd.mp3"
    },
    {
      "s": "s037",
      "e": "ep-video-potatofarm-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "Now I'll place some fences.",
      "zh": "现在我来放一些栅栏。",
      "an": "https://english.example.com/audio/ep/ep-video-potatofarm-2/s037-n-43c076.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-potatofarm-2/s037-s-15899f.mp3"
    },
    {
      "s": "s038",
      "e": "ep-video-potatofarm-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "And I'm going to need more fences.",
      "zh": "我还需要更多栅栏。",
      "an": "https://english.example.com/audio/ep/ep-video-potatofarm-2/s038-n-977502.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-potatofarm-2/s038-s-8ce49f.mp3"
    },
    {
      "s": "s039",
      "e": "ep-video-potatofarm-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "Yep, I'm out of fences.",
      "zh": "对，栅栏用完了。",
      "an": "https://english.example.com/audio/ep/ep-video-potatofarm-2/s039-n-6997e0.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-potatofarm-2/s039-s-0311aa.mp3"
    },
    {
      "s": "s040",
      "e": "ep-video-potatofarm-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "I'll place a torch here. And I'll place a torch here.",
      "zh": "我在这儿放一根火把。这边也放一根。",
      "an": "https://english.example.com/audio/ep/ep-video-potatofarm-2/s040-n-010da1.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-potatofarm-2/s040-s-0aec93.mp3"
    },
    {
      "s": "s041",
      "e": "ep-video-potatofarm-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "Okay, I'm going to get back in my boat, and I'm going to sail home.",
      "zh": "好，我回到船上，驶回家。",
      "an": "https://english.example.com/audio/ep/ep-video-potatofarm-2/s041-n-da9088.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-potatofarm-2/s041-s-20d156.mp3"
    },
    {
      "s": "s042",
      "e": "ep-video-potatofarm-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "Let's go to sleep.",
      "zh": "去睡觉吧。",
      "an": "https://english.example.com/audio/ep/ep-video-potatofarm-2/s042-n-49af18.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-potatofarm-2/s042-s-08a8ea.mp3"
    },
    {
      "s": "s043",
      "e": "ep-video-potatofarm-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "And let's pick up some potatoes.",
      "zh": "我们拿一些土豆。",
      "an": "https://english.example.com/audio/ep/ep-video-potatofarm-2/s043-n-22564d.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-potatofarm-2/s043-s-f6b21a.mp3"
    },
    {
      "s": "s044",
      "e": "ep-video-potatofarm-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "Let's plant some potatoes in this farm.",
      "zh": "我们在这个农场里种一些土豆。",
      "an": "https://english.example.com/audio/ep/ep-video-potatofarm-2/s044-n-0de61a.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-potatofarm-2/s044-s-e898a7.mp3"
    },
    {
      "s": "s045",
      "e": "ep-video-potatofarm-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "Let's also build some fence gates.",
      "zh": "我们再做一些栅栏门。",
      "an": "https://english.example.com/audio/ep/ep-video-potatofarm-2/s045-n-3ca889.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-potatofarm-2/s045-s-5c1aee.mp3"
    },
    {
      "s": "s046",
      "e": "ep-video-potatofarm-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "Okay, let's get in our boat and let's sail over to the farm.",
      "zh": "好，上船，驶到农场去。",
      "an": "https://english.example.com/audio/ep/ep-video-potatofarm-2/s046-n-0a5c7f.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-potatofarm-2/s046-s-0fef41.mp3"
    },
    {
      "s": "s047",
      "e": "ep-video-potatofarm-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "Here we are. Let's get off the boat.",
      "zh": "到了。我们下船。",
      "an": "https://english.example.com/audio/ep/ep-video-potatofarm-2/s047-n-16f560.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-potatofarm-2/s047-s-569b59.mp3"
    },
    {
      "s": "s048",
      "e": "ep-video-potatofarm-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "Let's get our fences and let's finish the fence.",
      "zh": "拿出栅栏，把围栏围完。",
      "an": "https://english.example.com/audio/ep/ep-video-potatofarm-2/s048-n-b9e259.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-potatofarm-2/s048-s-0c8b4d.mp3"
    },
    {
      "s": "s049",
      "e": "ep-video-potatofarm-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "There we go. The fence is finished.",
      "zh": "好了。围栏做好了。",
      "an": "https://english.example.com/audio/ep/ep-video-potatofarm-2/s049-n-70e603.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-potatofarm-2/s049-s-9752c5.mp3"
    },
    {
      "s": "s050",
      "e": "ep-video-potatofarm-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "Now, let's place these gates.",
      "zh": "现在，把这些栅栏门安上。",
      "an": "https://english.example.com/audio/ep/ep-video-potatofarm-2/s050-n-8e7ef6.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-potatofarm-2/s050-s-ce868f.mp3"
    },
    {
      "s": "s051",
      "e": "ep-video-potatofarm-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "We'll put one here, and one here.",
      "zh": "这儿放一个，这儿再放一个。",
      "an": "https://english.example.com/audio/ep/ep-video-potatofarm-2/s051-n-1e56d2.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-potatofarm-2/s051-s-1dea69.mp3"
    },
    {
      "s": "s052",
      "e": "ep-video-potatofarm-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "We'll have four fence gates.",
      "zh": "我们会有四个栅栏门。",
      "an": "https://english.example.com/audio/ep/ep-video-potatofarm-2/s052-n-36127c.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-potatofarm-2/s052-s-652be5.mp3"
    },
    {
      "s": "s053",
      "e": "ep-video-potatofarm-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "And there we go.",
      "zh": "好了。",
      "an": "https://english.example.com/audio/ep/ep-video-potatofarm-2/s053-n-195a53.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-potatofarm-2/s053-s-8602bc.mp3"
    },
    {
      "s": "s054",
      "e": "ep-video-potatofarm-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "I forgot two things. I forgot a hoe and a bucket.",
      "zh": "我忘了两样东西。我忘了锄头和水桶。",
      "an": "https://english.example.com/audio/ep/ep-video-potatofarm-2/s054-n-5d0ca5.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-potatofarm-2/s054-s-92b905.mp3"
    },
    {
      "s": "s055",
      "e": "ep-video-potatofarm-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "Let's go back home. Here's my bucket. It has lava in it.",
      "zh": "我们回家一趟。这是我的桶。里面装着熔岩。",
      "an": "https://english.example.com/audio/ep/ep-video-potatofarm-2/s055-n-577fc1.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-potatofarm-2/s055-s-755cee.mp3"
    },
    {
      "s": "s056",
      "e": "ep-video-potatofarm-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "And let's build a copper hoe.",
      "zh": "我们来做一把铜锄。",
      "an": "https://english.example.com/audio/ep/ep-video-potatofarm-2/s056-n-1ceaa9.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-potatofarm-2/s056-s-c3877b.mp3"
    },
    {
      "s": "s057",
      "e": "ep-video-potatofarm-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "For right now, I'm going to place the lava right here.",
      "zh": "现在我先把熔岩放在这儿。",
      "an": "https://english.example.com/audio/ep/ep-video-potatofarm-2/s057-n-c6ffac.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-potatofarm-2/s057-s-6ed59a.mp3"
    },
    {
      "s": "s058",
      "e": "ep-video-potatofarm-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "I'm going to fill my bucket with water.",
      "zh": "我要把桶装满水。",
      "an": "https://english.example.com/audio/ep/ep-video-potatofarm-2/s058-n-fc1411.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-potatofarm-2/s058-s-ed9c05.mp3"
    },
    {
      "s": "s059",
      "e": "ep-video-potatofarm-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "And here in the middle, I'll place the water.",
      "zh": "然后在正中间放上水。",
      "an": "https://english.example.com/audio/ep/ep-video-potatofarm-2/s059-n-f1bafd.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-potatofarm-2/s059-s-5d3753.mp3"
    },
    {
      "s": "s060",
      "e": "ep-video-potatofarm-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "Now, I'll use the copper hoe and I'll till the soil.",
      "zh": "现在我用铜锄把地耕好。",
      "an": "https://english.example.com/audio/ep/ep-video-potatofarm-2/s060-n-fc9c88.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-potatofarm-2/s060-s-c6f1c3.mp3"
    },
    {
      "s": "s061",
      "e": "ep-video-potatofarm-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "Ooh, what was that sound?",
      "zh": "噢，那是什么声音？",
      "an": "https://english.example.com/audio/ep/ep-video-potatofarm-2/s061-n-555253.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-potatofarm-2/s061-s-43388a.mp3"
    },
    {
      "s": "s062",
      "e": "ep-video-potatofarm-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "The sun's going down.",
      "zh": "太阳要下山了。",
      "an": "https://english.example.com/audio/ep/ep-video-potatofarm-2/s062-n-a2e62c.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-potatofarm-2/s062-s-5b0b2b.mp3"
    },
    {
      "s": "s063",
      "e": "ep-video-potatofarm-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "All right, and I've tilled all the soil now.",
      "zh": "好，现在地都耕完了。",
      "an": "https://english.example.com/audio/ep/ep-video-potatofarm-2/s063-n-90a9e4.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-potatofarm-2/s063-s-a0d1bf.mp3"
    },
    {
      "s": "s064",
      "e": "ep-video-potatofarm-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "I'll take the potatoes and I'll start planting them.",
      "zh": "我拿上土豆，开始种下去。",
      "an": "https://english.example.com/audio/ep/ep-video-potatofarm-2/s064-n-4657d9.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-potatofarm-2/s064-s-4a121b.mp3"
    },
    {
      "s": "s065",
      "e": "ep-video-potatofarm-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "Let's plant some potatoes.",
      "zh": "我们来种一些土豆。",
      "an": "https://english.example.com/audio/ep/ep-video-potatofarm-2/s065-n-8cd76a.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-potatofarm-2/s065-s-530223.mp3"
    },
    {
      "s": "s066",
      "e": "ep-video-potatofarm-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "I planted all the potatoes.",
      "zh": "土豆都种完了。",
      "an": "https://english.example.com/audio/ep/ep-video-potatofarm-2/s066-n-45ae6c.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-potatofarm-2/s066-s-5d037f.mp3"
    },
    {
      "s": "s067",
      "e": "ep-video-potatofarm-2",
      "k": "video",
      "sp": "Kenzo",
      "en": "Now I just need to wait for them to grow.",
      "zh": "现在只需等它们长大。",
      "an": "https://english.example.com/audio/ep/ep-video-potatofarm-2/s067-n-87938a.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-potatofarm-2/s067-s-790fdb.mp3"
    },
    {
      "s": "s001",
      "e": "ep-card-library-g3",
      "k": "card",
      "sp": "孩子",
      "en": "Let's go to the library after school.",
      "zh": "放学后我们去图书馆吧。",
      "an": "https://english.example.com/audio/ep/ep-card-library-g3/s001-n-9a54bc.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-library-g3/s001-s-4fc6aa.mp3"
    },
    {
      "s": "s002",
      "e": "ep-card-library-g3",
      "k": "card",
      "sp": "孩子",
      "en": "I want to borrow this book. Is it okay?",
      "zh": "我想借这本书。可以吗？",
      "an": "https://english.example.com/audio/ep/ep-card-library-g3/s002-n-5a1c30.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-library-g3/s002-s-ee2ac3.mp3"
    },
    {
      "s": "s003",
      "e": "ep-card-library-g3",
      "k": "card",
      "sp": "图书员",
      "en": "Yes. Do you have your library card?",
      "zh": "可以。你带借书卡了吗？",
      "an": "https://english.example.com/audio/ep/ep-card-library-g3/s003-n-1aa0a6.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-library-g3/s003-s-2267bd.mp3"
    },
    {
      "s": "s004",
      "e": "ep-card-library-g3",
      "k": "card",
      "sp": "孩子",
      "en": "Here it is. Can I take two books?",
      "zh": "在这里。我可以借两本吗？",
      "an": "https://english.example.com/audio/ep/ep-card-library-g3/s004-n-d2cc42.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-library-g3/s004-s-9a622f.mp3"
    },
    {
      "s": "s005",
      "e": "ep-card-library-g3",
      "k": "card",
      "sp": "图书员",
      "en": "Sure. Please bring them back next week.",
      "zh": "当然可以。请下周还回来。",
      "an": "https://english.example.com/audio/ep/ep-card-library-g3/s005-n-08bcb9.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-library-g3/s005-s-481a22.mp3"
    },
    {
      "s": "s006",
      "e": "ep-card-library-g3",
      "k": "card",
      "sp": "孩子",
      "en": "I will. Thank you so much!",
      "zh": "我会的。非常感谢！",
      "an": "https://english.example.com/audio/ep/ep-card-library-g3/s006-n-206cc5.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-library-g3/s006-s-2c4c61.mp3"
    },
    {
      "s": "s001",
      "e": "ep-card-soccer-g3",
      "k": "card",
      "sp": "孩子",
      "en": "Let's play soccer after class. Do you want to come?",
      "zh": "下课后我们踢足球吧。你想来吗？",
      "an": "https://english.example.com/audio/ep/ep-card-soccer-g3/s001-n-064191.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-soccer-g3/s001-s-cd7501.mp3"
    },
    {
      "s": "s002",
      "e": "ep-card-soccer-g3",
      "k": "card",
      "sp": "同学",
      "en": "Yes! What position should I play?",
      "zh": "好啊！我应该踢什么位置？",
      "an": "https://english.example.com/audio/ep/ep-card-soccer-g3/s002-n-f584d4.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-soccer-g3/s002-s-0efbd0.mp3"
    },
    {
      "s": "s003",
      "e": "ep-card-soccer-g3",
      "k": "card",
      "sp": "孩子",
      "en": "You can be the goalkeeper. I'll pass the ball to you.",
      "zh": "你可以当守门员。我会把球传给你。",
      "an": "https://english.example.com/audio/ep/ep-card-soccer-g3/s003-n-1c1345.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-soccer-g3/s003-s-c6e2d5.mp3"
    },
    {
      "s": "s004",
      "e": "ep-card-soccer-g3",
      "k": "card",
      "sp": "同学",
      "en": "Okay. Should we find more friends, too?",
      "zh": "好。我们要不要再找几个朋友？",
      "an": "https://english.example.com/audio/ep/ep-card-soccer-g3/s004-n-6ed090.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-soccer-g3/s004-s-17e9f1.mp3"
    },
    {
      "s": "s005",
      "e": "ep-card-soccer-g3",
      "k": "card",
      "sp": "孩子",
      "en": "Sure. We need two more players.",
      "zh": "当然。我们还需要两名球员。",
      "an": "https://english.example.com/audio/ep/ep-card-soccer-g3/s005-n-5ce9b2.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-soccer-g3/s005-s-8befa9.mp3"
    },
    {
      "s": "s006",
      "e": "ep-card-soccer-g3",
      "k": "card",
      "sp": "同学",
      "en": "Great. See you on the field!",
      "zh": "太好了。球场上见！",
      "an": "https://english.example.com/audio/ep/ep-card-soccer-g3/s006-n-3b770b.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-soccer-g3/s006-s-85318a.mp3"
    },
    {
      "s": "s001",
      "e": "ep-card-bus-g3",
      "k": "card",
      "sp": "孩子",
      "en": "The bus is coming. Should we get on now?",
      "zh": "公交车来了。我们现在上车吗？",
      "an": "https://english.example.com/audio/ep/ep-card-bus-g3/s001-n-76e6b7.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-bus-g3/s001-s-46035d.mp3"
    },
    {
      "s": "s002",
      "e": "ep-card-bus-g3",
      "k": "card",
      "sp": "同学",
      "en": "Yes. Do you have your ticket?",
      "zh": "对。你有车票吗？",
      "an": "https://english.example.com/audio/ep/ep-card-bus-g3/s002-n-26e7b0.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-bus-g3/s002-s-3de777.mp3"
    },
    {
      "s": "s003",
      "e": "ep-card-bus-g3",
      "k": "card",
      "sp": "孩子",
      "en": "I have it. Can we sit by the window?",
      "zh": "我有。我们可以靠窗坐吗？",
      "an": "https://english.example.com/audio/ep/ep-card-bus-g3/s003-n-ec1c76.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-bus-g3/s003-s-0bac03.mp3"
    },
    {
      "s": "s004",
      "e": "ep-card-bus-g3",
      "k": "card",
      "sp": "同学",
      "en": "Sure. Let's sit in the front.",
      "zh": "当然可以。我们坐前面吧。",
      "an": "https://english.example.com/audio/ep/ep-card-bus-g3/s004-n-bc23c6.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-bus-g3/s004-s-d848d6.mp3"
    },
    {
      "s": "s005",
      "e": "ep-card-bus-g3",
      "k": "card",
      "sp": "孩子",
      "en": "This is our stop. We need to get off.",
      "zh": "这是我们的站。我们该下车了。",
      "an": "https://english.example.com/audio/ep/ep-card-bus-g3/s005-n-a309e2.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-bus-g3/s005-s-9c298f.mp3"
    },
    {
      "s": "s006",
      "e": "ep-card-bus-g3",
      "k": "card",
      "sp": "同学",
      "en": "Okay. I'll follow you off the bus.",
      "zh": "好。我跟着你下车。",
      "an": "https://english.example.com/audio/ep/ep-card-bus-g3/s006-n-36d995.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-bus-g3/s006-s-ae8e08.mp3"
    },
    {
      "s": "s001",
      "e": "ep-video-grocerystore-1",
      "k": "video",
      "sp": "Caitie",
      "en": "Let's go on a field trip with Caitie's Classroom.",
      "zh": "我们跟着 Caitie's Classroom 去实地看看吧。",
      "an": "https://english.example.com/audio/ep/ep-video-grocerystore-1/s001-n-9f48ad.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-grocerystore-1/s001-s-460d49.mp3"
    },
    {
      "s": "s002",
      "e": "ep-video-grocerystore-1",
      "k": "video",
      "sp": "Caitie",
      "en": "Hi, friends.",
      "zh": "嗨，朋友们。",
      "an": "https://english.example.com/audio/ep/ep-video-grocerystore-1/s002-n-4492df.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-grocerystore-1/s002-s-a2b6fc.mp3"
    },
    {
      "s": "s003",
      "e": "ep-video-grocerystore-1",
      "k": "video",
      "sp": "Caitie",
      "en": "I'm grocery shopping at the grocery store.",
      "zh": "我正在超市买东西。",
      "an": "https://english.example.com/audio/ep/ep-video-grocerystore-1/s003-n-6e286f.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-grocerystore-1/s003-s-a46d36.mp3"
    },
    {
      "s": "s004",
      "e": "ep-video-grocerystore-1",
      "k": "video",
      "sp": "Caitie",
      "en": "I have a list of things that I need and my shopping cart all ready to go.",
      "zh": "我有一份要买的清单，购物车也准备好了。",
      "an": "https://english.example.com/audio/ep/ep-video-grocerystore-1/s004-n-3a50bf.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-grocerystore-1/s004-s-f47fd8.mp3"
    },
    {
      "s": "s005",
      "e": "ep-video-grocerystore-1",
      "k": "video",
      "sp": "Caitie",
      "en": "Would you like to come grocery shopping with me?",
      "zh": "你想和我一起去超市购物吗？",
      "an": "https://english.example.com/audio/ep/ep-video-grocerystore-1/s005-n-3880aa.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-grocerystore-1/s005-s-bc53db.mp3"
    },
    {
      "s": "s006",
      "e": "ep-video-grocerystore-1",
      "k": "video",
      "sp": "Caitie",
      "en": "I could use your help.",
      "zh": "我需要你帮帮忙。",
      "an": "https://english.example.com/audio/ep/ep-video-grocerystore-1/s006-n-f28654.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-grocerystore-1/s006-s-18fc6d.mp3"
    },
    {
      "s": "s007",
      "e": "ep-video-grocerystore-1",
      "k": "video",
      "sp": "Caitie",
      "en": "Let's go!",
      "zh": "我们走吧！",
      "an": "https://english.example.com/audio/ep/ep-video-grocerystore-1/s007-n-72ca0f.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-grocerystore-1/s007-s-f5b69c.mp3"
    },
    {
      "s": "s008",
      "e": "ep-video-grocerystore-1",
      "k": "video",
      "sp": "Caitie",
      "en": "There are so many different colors in the produce section.",
      "zh": "果蔬区有好多不同的颜色。",
      "an": "https://english.example.com/audio/ep/ep-video-grocerystore-1/s008-n-b775a4.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-grocerystore-1/s008-s-9c02bf.mp3"
    },
    {
      "s": "s009",
      "e": "ep-video-grocerystore-1",
      "k": "video",
      "sp": "Caitie",
      "en": "That's where all the fruits and vegetables are.",
      "zh": "水果和蔬菜都在那里。",
      "an": "https://english.example.com/audio/ep/ep-video-grocerystore-1/s009-n-9bfcba.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-grocerystore-1/s009-s-2d0521.mp3"
    },
    {
      "s": "s010",
      "e": "ep-video-grocerystore-1",
      "k": "video",
      "sp": "Caitie",
      "en": "I see green, red, orange, yellow, purple, white, blue, and brown.",
      "zh": "我看到绿色、红色、橙色、黄色、紫色、白色、蓝色和棕色。",
      "an": "https://english.example.com/audio/ep/ep-video-grocerystore-1/s010-n-f4277f.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-grocerystore-1/s010-s-6b1269.mp3"
    },
    {
      "s": "s011",
      "e": "ep-video-grocerystore-1",
      "k": "video",
      "sp": "Caitie",
      "en": "The first thing on our list is bell peppers.",
      "zh": "清单上第一样是彩椒。",
      "an": "https://english.example.com/audio/ep/ep-video-grocerystore-1/s011-n-44e5f3.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-grocerystore-1/s011-s-2978b1.mp3"
    },
    {
      "s": "s012",
      "e": "ep-video-grocerystore-1",
      "k": "video",
      "sp": "Caitie",
      "en": "It looks like this and comes in different colors.",
      "zh": "它长这样，而且有不同的颜色。",
      "an": "https://english.example.com/audio/ep/ep-video-grocerystore-1/s012-n-1f5777.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-grocerystore-1/s012-s-68763e.mp3"
    },
    {
      "s": "s013",
      "e": "ep-video-grocerystore-1",
      "k": "video",
      "sp": "Caitie",
      "en": "Can you see the bell peppers?",
      "zh": "你能看到彩椒吗？",
      "an": "https://english.example.com/audio/ep/ep-video-grocerystore-1/s013-n-56a589.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-grocerystore-1/s013-s-02a69c.mp3"
    },
    {
      "s": "s014",
      "e": "ep-video-grocerystore-1",
      "k": "video",
      "sp": "Caitie",
      "en": "We found them!",
      "zh": "我们找到了！",
      "an": "https://english.example.com/audio/ep/ep-video-grocerystore-1/s014-n-f07988.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-grocerystore-1/s014-s-34ef5c.mp3"
    },
    {
      "s": "s015",
      "e": "ep-video-grocerystore-1",
      "k": "video",
      "sp": "Caitie",
      "en": "Look at all the different colors.",
      "zh": "看看这些不同的颜色。",
      "an": "https://english.example.com/audio/ep/ep-video-grocerystore-1/s015-n-b0dcaa.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-grocerystore-1/s015-s-7cd0de.mp3"
    },
    {
      "s": "s016",
      "e": "ep-video-grocerystore-1",
      "k": "video",
      "sp": "Caitie",
      "en": "There's red bell peppers, green bell peppers, yellow bell peppers, and orange bell peppers.",
      "zh": "有红彩椒、绿彩椒、黄彩椒，还有橙色彩椒。",
      "an": "https://english.example.com/audio/ep/ep-video-grocerystore-1/s016-n-b1f925.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-grocerystore-1/s016-s-b7f416.mp3"
    },
    {
      "s": "s017",
      "e": "ep-video-grocerystore-1",
      "k": "video",
      "sp": "Caitie",
      "en": "Which color should we get?",
      "zh": "我们要买哪种颜色呢？",
      "an": "https://english.example.com/audio/ep/ep-video-grocerystore-1/s017-n-3ae04a.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-grocerystore-1/s017-s-5918ff.mp3"
    },
    {
      "s": "s018",
      "e": "ep-video-grocerystore-1",
      "k": "video",
      "sp": "Caitie",
      "en": "Let's get the yellow bell pepper.",
      "zh": "我们买黄彩椒吧。",
      "an": "https://english.example.com/audio/ep/ep-video-grocerystore-1/s018-n-229892.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-grocerystore-1/s018-s-595a68.mp3"
    },
    {
      "s": "s019",
      "e": "ep-video-grocerystore-1",
      "k": "video",
      "sp": "Caitie",
      "en": "Kind of matches the color of my apron.",
      "zh": "有点配我围裙的颜色。",
      "an": "https://english.example.com/audio/ep/ep-video-grocerystore-1/s019-n-892722.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-grocerystore-1/s019-s-37a48e.mp3"
    },
    {
      "s": "s020",
      "e": "ep-video-grocerystore-1",
      "k": "video",
      "sp": "Caitie",
      "en": "Great job!",
      "zh": "做得好！",
      "an": "https://english.example.com/audio/ep/ep-video-grocerystore-1/s020-n-f64c77.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-grocerystore-1/s020-s-4ee986.mp3"
    },
    {
      "s": "s021",
      "e": "ep-video-grocerystore-1",
      "k": "video",
      "sp": "Caitie",
      "en": "Next on our list is oranges.",
      "zh": "清单上下一样是橙子。",
      "an": "https://english.example.com/audio/ep/ep-video-grocerystore-1/s021-n-17c36d.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-grocerystore-1/s021-s-e31152.mp3"
    },
    {
      "s": "s022",
      "e": "ep-video-grocerystore-1",
      "k": "video",
      "sp": "Caitie",
      "en": "Can you find the oranges?",
      "zh": "你能找到橙子吗？",
      "an": "https://english.example.com/audio/ep/ep-video-grocerystore-1/s022-n-739a5f.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-grocerystore-1/s022-s-d6ca41.mp3"
    },
    {
      "s": "s023",
      "e": "ep-video-grocerystore-1",
      "k": "video",
      "sp": "Caitie",
      "en": "Here they are.",
      "zh": "在这里。",
      "an": "https://english.example.com/audio/ep/ep-video-grocerystore-1/s023-n-8cd2ed.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-grocerystore-1/s023-s-2ef23d.mp3"
    },
    {
      "s": "s024",
      "e": "ep-video-grocerystore-1",
      "k": "video",
      "sp": "Caitie",
      "en": "Way to go!",
      "zh": "真棒！",
      "an": "https://english.example.com/audio/ep/ep-video-grocerystore-1/s024-n-056757.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-grocerystore-1/s024-s-3d3620.mp3"
    },
    {
      "s": "s025",
      "e": "ep-video-grocerystore-1",
      "k": "video",
      "sp": "Caitie",
      "en": "Let's get four oranges.",
      "zh": "我们买四个橙子吧。",
      "an": "https://english.example.com/audio/ep/ep-video-grocerystore-1/s025-n-029183.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-grocerystore-1/s025-s-7f306e.mp3"
    },
    {
      "s": "s026",
      "e": "ep-video-grocerystore-1",
      "k": "video",
      "sp": "Caitie",
      "en": "We can count them together as we put them inside this bag.",
      "zh": "我们把它们放进袋子里的时候，可以一起数。",
      "an": "https://english.example.com/audio/ep/ep-video-grocerystore-1/s026-n-72aeb9.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-grocerystore-1/s026-s-ef26ba.mp3"
    },
    {
      "s": "s027",
      "e": "ep-video-grocerystore-1",
      "k": "video",
      "sp": "Caitie",
      "en": "One, two, three, four.",
      "zh": "一，二，三，四。",
      "an": "https://english.example.com/audio/ep/ep-video-grocerystore-1/s027-n-614e94.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-grocerystore-1/s027-s-1171b4.mp3"
    },
    {
      "s": "s028",
      "e": "ep-video-grocerystore-1",
      "k": "video",
      "sp": "Caitie",
      "en": "Four oranges.",
      "zh": "四个橙子。",
      "an": "https://english.example.com/audio/ep/ep-video-grocerystore-1/s028-n-5da4ed.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-grocerystore-1/s028-s-20d36f.mp3"
    },
    {
      "s": "s029",
      "e": "ep-video-grocerystore-1",
      "k": "video",
      "sp": "Caitie",
      "en": "It's kind of funny that oranges are called oranges and they're the color orange.",
      "zh": "有点好玩：橙子叫 orange，而它们的颜色也是橙色。",
      "an": "https://english.example.com/audio/ep/ep-video-grocerystore-1/s029-n-cad72d.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-grocerystore-1/s029-s-872a2b.mp3"
    },
    {
      "s": "s030",
      "e": "ep-video-grocerystore-1",
      "k": "video",
      "sp": "Caitie",
      "en": "Next on our list is, ooh, mushrooms.",
      "zh": "清单上下一样是——噢，蘑菇。",
      "an": "https://english.example.com/audio/ep/ep-video-grocerystore-1/s030-n-9b2f58.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-grocerystore-1/s030-s-6d6d42.mp3"
    },
    {
      "s": "s031",
      "e": "ep-video-grocerystore-1",
      "k": "video",
      "sp": "Caitie",
      "en": "This store has an excellent selection of mushrooms.",
      "zh": "这家店的蘑菇种类非常多。",
      "an": "https://english.example.com/audio/ep/ep-video-grocerystore-1/s031-n-464d24.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-grocerystore-1/s031-s-52f676.mp3"
    },
    {
      "s": "s032",
      "e": "ep-video-grocerystore-1",
      "k": "video",
      "sp": "Caitie",
      "en": "Come with me.",
      "zh": "跟我来。",
      "an": "https://english.example.com/audio/ep/ep-video-grocerystore-1/s032-n-7acc69.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-grocerystore-1/s032-s-3f81a8.mp3"
    },
    {
      "s": "s033",
      "e": "ep-video-grocerystore-1",
      "k": "video",
      "sp": "Caitie",
      "en": "Look at how many different kinds of mushrooms there are.",
      "zh": "看看这里有多少种不同的蘑菇。",
      "an": "https://english.example.com/audio/ep/ep-video-grocerystore-1/s033-n-d97f62.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-grocerystore-1/s033-s-36016a.mp3"
    },
    {
      "s": "s034",
      "e": "ep-video-grocerystore-1",
      "k": "video",
      "sp": "Caitie",
      "en": "They have some fun names too.",
      "zh": "它们的名字也很好玩。",
      "an": "https://english.example.com/audio/ep/ep-video-grocerystore-1/s034-n-dfc537.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-grocerystore-1/s034-s-019b1c.mp3"
    },
    {
      "s": "s035",
      "e": "ep-video-grocerystore-1",
      "k": "video",
      "sp": "Caitie",
      "en": "Blue oyster.",
      "zh": "蓝平菇。",
      "an": "https://english.example.com/audio/ep/ep-video-grocerystore-1/s035-n-27793c.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-grocerystore-1/s035-s-bd2e71.mp3"
    },
    {
      "s": "s036",
      "e": "ep-video-grocerystore-1",
      "k": "video",
      "sp": "Caitie",
      "en": "Hen of the woods.",
      "zh": "灰树花。",
      "an": "https://english.example.com/audio/ep/ep-video-grocerystore-1/s036-n-52e9af.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-grocerystore-1/s036-s-e23d4e.mp3"
    },
    {
      "s": "s037",
      "e": "ep-video-grocerystore-1",
      "k": "video",
      "sp": "Caitie",
      "en": "Lion's mane.",
      "zh": "猴头菇。",
      "an": "https://english.example.com/audio/ep/ep-video-grocerystore-1/s037-n-e111af.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-grocerystore-1/s037-s-9e2d9c.mp3"
    },
    {
      "s": "s038",
      "e": "ep-video-grocerystore-1",
      "k": "video",
      "sp": "Caitie",
      "en": "Today, let's get eight cremini mushrooms.",
      "zh": "今天我们买八朵棕色蘑菇吧。",
      "an": "https://english.example.com/audio/ep/ep-video-grocerystore-1/s038-n-f2e86c.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-grocerystore-1/s038-s-ae3f1b.mp3"
    },
    {
      "s": "s039",
      "e": "ep-video-grocerystore-1",
      "k": "video",
      "sp": "Caitie",
      "en": "We can count them as we put them inside the bag.",
      "zh": "我们把它们放进袋子里的时候可以一起数。",
      "an": "https://english.example.com/audio/ep/ep-video-grocerystore-1/s039-n-0e423f.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-grocerystore-1/s039-s-9c9d96.mp3"
    },
    {
      "s": "s040",
      "e": "ep-video-grocerystore-1",
      "k": "video",
      "sp": "Caitie",
      "en": "Now, it's important when picking your produce to only touch the ones you're gonna buy.",
      "zh": "选果蔬的时候，重要的是只碰你要买的那些。",
      "an": "https://english.example.com/audio/ep/ep-video-grocerystore-1/s040-n-d972b8.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-grocerystore-1/s040-s-7783e5.mp3"
    },
    {
      "s": "s041",
      "e": "ep-video-grocerystore-1",
      "k": "video",
      "sp": "Caitie",
      "en": "So we can use these tongs to help us out.",
      "zh": "所以我们可以用这些夹子来帮忙。",
      "an": "https://english.example.com/audio/ep/ep-video-grocerystore-1/s041-n-94c063.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-grocerystore-1/s041-s-748328.mp3"
    },
    {
      "s": "s042",
      "e": "ep-video-grocerystore-1",
      "k": "video",
      "sp": "Caitie",
      "en": "One, two, three.",
      "zh": "一，二，三。",
      "an": "https://english.example.com/audio/ep/ep-video-grocerystore-1/s042-n-e77b0e.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-grocerystore-1/s042-s-ff7c5b.mp3"
    },
    {
      "s": "s043",
      "e": "ep-video-grocerystore-1",
      "k": "video",
      "sp": "Caitie",
      "en": "Four, five, six.",
      "zh": "四，五，六。",
      "an": "https://english.example.com/audio/ep/ep-video-grocerystore-1/s043-n-7ce84b.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-grocerystore-1/s043-s-122824.mp3"
    },
    {
      "s": "s044",
      "e": "ep-video-grocerystore-1",
      "k": "video",
      "sp": "Caitie",
      "en": "Seven, eight.",
      "zh": "七，八。",
      "an": "https://english.example.com/audio/ep/ep-video-grocerystore-1/s044-n-6a861e.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-grocerystore-1/s044-s-0cbdef.mp3"
    },
    {
      "s": "s045",
      "e": "ep-video-grocerystore-1",
      "k": "video",
      "sp": "Caitie",
      "en": "Eight mushrooms.",
      "zh": "八朵蘑菇。",
      "an": "https://english.example.com/audio/ep/ep-video-grocerystore-1/s045-n-0aec1f.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-grocerystore-1/s045-s-1b9675.mp3"
    },
    {
      "s": "s046",
      "e": "ep-video-grocerystore-1",
      "k": "video",
      "sp": "Caitie",
      "en": "Well, I think that's it for our fruits and vegetables.",
      "zh": "好，水果和蔬菜应该就这些了。",
      "an": "https://english.example.com/audio/ep/ep-video-grocerystore-1/s046-n-4e1dbc.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-grocerystore-1/s046-s-b0b6e9.mp3"
    },
    {
      "s": "s047",
      "e": "ep-video-grocerystore-1",
      "k": "video",
      "sp": "Caitie",
      "en": "Next is bread.",
      "zh": "接下来是面包。",
      "an": "https://english.example.com/audio/ep/ep-video-grocerystore-1/s047-n-50626d.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-grocerystore-1/s047-s-0279bd.mp3"
    },
    {
      "s": "s048",
      "e": "ep-video-grocerystore-1",
      "k": "video",
      "sp": "Caitie",
      "en": "I know where that is.",
      "zh": "我知道在哪里。",
      "an": "https://english.example.com/audio/ep/ep-video-grocerystore-1/s048-n-0dd06e.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-grocerystore-1/s048-s-6b770c.mp3"
    },
    {
      "s": "s049",
      "e": "ep-video-grocerystore-1",
      "k": "video",
      "sp": "Caitie",
      "en": "Follow me.",
      "zh": "跟我来。",
      "an": "https://english.example.com/audio/ep/ep-video-grocerystore-1/s049-n-809d5d.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-grocerystore-1/s049-s-8c72b7.mp3"
    },
    {
      "s": "s050",
      "e": "ep-video-grocerystore-1",
      "k": "video",
      "sp": "Caitie",
      "en": "Look at all the different kinds of bread there are.",
      "zh": "看看这里有多少种不同的面包。",
      "an": "https://english.example.com/audio/ep/ep-video-grocerystore-1/s050-n-154ef7.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-grocerystore-1/s050-s-026273.mp3"
    },
    {
      "s": "s051",
      "e": "ep-video-grocerystore-1",
      "k": "video",
      "sp": "Caitie",
      "en": "This looks like what I'm looking for.",
      "zh": "这看起来就是我要找的。",
      "an": "https://english.example.com/audio/ep/ep-video-grocerystore-1/s051-n-79ef44.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-grocerystore-1/s051-s-73f861.mp3"
    },
    {
      "s": "s052",
      "e": "ep-video-grocerystore-1",
      "k": "video",
      "sp": "Caitie",
      "en": "This is perfect for toast and sandwiches.",
      "zh": "这个很适合做吐司和三明治。",
      "an": "https://english.example.com/audio/ep/ep-video-grocerystore-1/s052-n-ee6dac.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-grocerystore-1/s052-s-23b8a5.mp3"
    },
    {
      "s": "s053",
      "e": "ep-video-grocerystore-1",
      "k": "video",
      "sp": "Caitie",
      "en": "This bread is made with something called gluten.",
      "zh": "这种面包是用一种叫麸质的东西做的。",
      "an": "https://english.example.com/audio/ep/ep-video-grocerystore-1/s053-n-9bdfc1.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-grocerystore-1/s053-s-87a2a3.mp3"
    },
    {
      "s": "s054",
      "e": "ep-video-grocerystore-1",
      "k": "video",
      "sp": "Caitie",
      "en": "And that's okay for most people, but for some friends, it can make their tummies feel a little upset.",
      "zh": "对大多数人没问题，但有些朋友吃了可能会肚子不舒服。",
      "an": "https://english.example.com/audio/ep/ep-video-grocerystore-1/s054-n-203e86.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-grocerystore-1/s054-s-3865f9.mp3"
    },
    {
      "s": "s055",
      "e": "ep-video-grocerystore-1",
      "k": "video",
      "sp": "Caitie",
      "en": "So they also make bread without gluten.",
      "zh": "所以也有不含麸质的面包。",
      "an": "https://english.example.com/audio/ep/ep-video-grocerystore-1/s055-n-f75162.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-grocerystore-1/s055-s-2f0732.mp3"
    },
    {
      "s": "s056",
      "e": "ep-video-grocerystore-1",
      "k": "video",
      "sp": "Caitie",
      "en": "That's called gluten-free bread.",
      "zh": "那叫无麸质面包。",
      "an": "https://english.example.com/audio/ep/ep-video-grocerystore-1/s056-n-acc322.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-grocerystore-1/s056-s-09f8c7.mp3"
    },
    {
      "s": "s057",
      "e": "ep-video-grocerystore-1",
      "k": "video",
      "sp": "Caitie",
      "en": "It's nice that there's different options so everybody can find something that makes them feel good.",
      "zh": "有不同的选择真好，这样每个人都能找到让自己舒服的。",
      "an": "https://english.example.com/audio/ep/ep-video-grocerystore-1/s057-n-f9fe63.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-grocerystore-1/s057-s-1c48ec.mp3"
    },
    {
      "s": "s058",
      "e": "ep-video-grocerystore-1",
      "k": "video",
      "sp": "Caitie",
      "en": "And you can tell it's gluten-free because it says so right on the package.",
      "zh": "你能看出它是无麸质的，因为包装上就写着。",
      "an": "https://english.example.com/audio/ep/ep-video-grocerystore-1/s058-n-92aae9.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-grocerystore-1/s058-s-015e83.mp3"
    },
    {
      "s": "s059",
      "e": "ep-video-grocerystore-1",
      "k": "video",
      "sp": "Caitie",
      "en": "I'm gonna get some gluten-free bread too.",
      "zh": "我也要拿一些无麸质面包。",
      "an": "https://english.example.com/audio/ep/ep-video-grocerystore-1/s059-n-57c887.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-grocerystore-1/s059-s-54d122.mp3"
    },
    {
      "s": "s060",
      "e": "ep-video-grocerystore-1",
      "k": "video",
      "sp": "Caitie",
      "en": "That way if a friend comes over who can't have gluten, they can have a snack that's just for them.",
      "zh": "这样如果有不能吃麸质的朋友来玩，他们也能吃到适合自己的点心。",
      "an": "https://english.example.com/audio/ep/ep-video-grocerystore-1/s060-n-2c7fbc.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-grocerystore-1/s060-s-18985d.mp3"
    },
    {
      "s": "s061",
      "e": "ep-video-grocerystore-1",
      "k": "video",
      "sp": "Caitie",
      "en": "We got our bread.",
      "zh": "面包我们买到了。",
      "an": "https://english.example.com/audio/ep/ep-video-grocerystore-1/s061-n-90fbae.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-grocerystore-1/s061-s-739e28.mp3"
    },
    {
      "s": "s062",
      "e": "ep-video-grocerystore-1",
      "k": "video",
      "sp": "Caitie",
      "en": "Let's keep shopping.",
      "zh": "我们继续购物吧。",
      "an": "https://english.example.com/audio/ep/ep-video-grocerystore-1/s062-n-ee072a.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-grocerystore-1/s062-s-5847b8.mp3"
    },
    {
      "s": "s001",
      "e": "ep-video-grocerystore-2",
      "k": "video",
      "sp": "Caitie",
      "en": "Look at all the cakes, the colors, the frosting.",
      "zh": "看看这些蛋糕，这些颜色，还有糖霜。",
      "an": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s001-n-292893.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s001-s-393927.mp3"
    },
    {
      "s": "s002",
      "e": "ep-video-grocerystore-2",
      "k": "video",
      "sp": "Caitie",
      "en": "A cake would be so delicious, but cake isn't on our list today.",
      "zh": "蛋糕会很好吃，可是今天清单上没有蛋糕。",
      "an": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s002-n-5fdcd4.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s002-s-63f268.mp3"
    },
    {
      "s": "s003",
      "e": "ep-video-grocerystore-2",
      "k": "video",
      "sp": "Caitie",
      "en": "We can't get everything that looks delicious, even though it is hard to say no sometimes.",
      "zh": "不能看到好吃的就都买，虽然有时候很难说不。",
      "an": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s003-n-b91b3e.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s003-s-508a4d.mp3"
    },
    {
      "s": "s004",
      "e": "ep-video-grocerystore-2",
      "k": "video",
      "sp": "Caitie",
      "en": "But you know what? Maybe we could get a special treat later.",
      "zh": "不过你知道吗？也许我们待会可以买点特别的小零食。",
      "an": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s004-n-674829.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s004-s-48ffff.mp3"
    },
    {
      "s": "s005",
      "e": "ep-video-grocerystore-2",
      "k": "video",
      "sp": "Caitie",
      "en": "That's sometimes the tricky thing about grocery stores.",
      "zh": "有时候超市让人为难的就是这一点。",
      "an": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s005-n-aaf243.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s005-s-acbd44.mp3"
    },
    {
      "s": "s006",
      "e": "ep-video-grocerystore-2",
      "k": "video",
      "sp": "Caitie",
      "en": "It's fun to look at all the yummy things, but we don't need to put everything in our cart.",
      "zh": "看那些好吃的东西很有趣，但我们不必把每一样都放进购物车。",
      "an": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s006-n-b1a651.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s006-s-3148e0.mp3"
    },
    {
      "s": "s007",
      "e": "ep-video-grocerystore-2",
      "k": "video",
      "sp": "Caitie",
      "en": "Let's see what's next on our list.",
      "zh": "看看清单上下一样是什么。",
      "an": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s007-n-17f1b1.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s007-s-3c394c.mp3"
    },
    {
      "s": "s008",
      "e": "ep-video-grocerystore-2",
      "k": "video",
      "sp": "Caitie",
      "en": "Cheese!",
      "zh": "奶酪！",
      "an": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s008-n-5c8c26.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s008-s-ab0095.mp3"
    },
    {
      "s": "s009",
      "e": "ep-video-grocerystore-2",
      "k": "video",
      "sp": "Caitie",
      "en": "Let's go to the deli counter.",
      "zh": "我们去熟食柜台吧。",
      "an": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s009-n-32fcf9.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s009-s-f2f67b.mp3"
    },
    {
      "s": "s010",
      "e": "ep-video-grocerystore-2",
      "k": "video",
      "sp": "Caitie",
      "en": "The deli counter has lots of different kinds of cheese and meats to choose from.",
      "zh": "熟食柜台有很多种奶酪和肉可以选。",
      "an": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s010-n-8ba46f.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s010-s-13d361.mp3"
    },
    {
      "s": "s011",
      "e": "ep-video-grocerystore-2",
      "k": "video",
      "sp": "Caitie",
      "en": "Sometimes there are big blocks of cheese and big hunks of meat.",
      "zh": "有时候会有大块的奶酪和大块的肉。",
      "an": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s011-n-75ab87.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s011-s-2fc157.mp3"
    },
    {
      "s": "s012",
      "e": "ep-video-grocerystore-2",
      "k": "video",
      "sp": "Caitie",
      "en": "And you can ask the person working at the deli counter to slice it for you.",
      "zh": "你可以请熟食柜台的工作人员帮你切片。",
      "an": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s012-n-7b6f57.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s012-s-426050.mp3"
    },
    {
      "s": "s013",
      "e": "ep-video-grocerystore-2",
      "k": "video",
      "sp": "Caitie",
      "en": "They have a special machine called a slicer that can cut just the right amount.",
      "zh": "他们有一台叫切片机的机器，可以切出刚好的份量。",
      "an": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s013-n-f9394c.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s013-s-72cd61.mp3"
    },
    {
      "s": "s014",
      "e": "ep-video-grocerystore-2",
      "k": "video",
      "sp": "Caitie",
      "en": "Other times, you can just get some cheese that's already packaged in smaller portions.",
      "zh": "还有些时候，你可以直接拿已经分装好的小份奶酪。",
      "an": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s014-n-98d862.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s014-s-3afef5.mp3"
    },
    {
      "s": "s015",
      "e": "ep-video-grocerystore-2",
      "k": "video",
      "sp": "Caitie",
      "en": "Like this one.",
      "zh": "就像这一份。",
      "an": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s015-n-94595c.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s015-s-e60223.mp3"
    },
    {
      "s": "s016",
      "e": "ep-video-grocerystore-2",
      "k": "video",
      "sp": "Caitie",
      "en": "This is actually Brie cheese.",
      "zh": "这其实是布里奶酪。",
      "an": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s016-n-48fd53.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s016-s-3eaa5c.mp3"
    },
    {
      "s": "s017",
      "e": "ep-video-grocerystore-2",
      "k": "video",
      "sp": "Caitie",
      "en": "It's my favorite kind of cheese.",
      "zh": "这是我最喜欢的奶酪。",
      "an": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s017-n-751d2d.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s017-s-0ad5b1.mp3"
    },
    {
      "s": "s018",
      "e": "ep-video-grocerystore-2",
      "k": "video",
      "sp": "Caitie",
      "en": "And in the deli counter, there's a really big one.",
      "zh": "熟食柜台里还有一块特别大的。",
      "an": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s018-n-e54805.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s018-s-ae0afd.mp3"
    },
    {
      "s": "s019",
      "e": "ep-video-grocerystore-2",
      "k": "video",
      "sp": "Caitie",
      "en": "That one is big, and this one is small, but it's the perfect size for me.",
      "zh": "那块很大，这一块很小，但对我来说大小正好。",
      "an": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s019-n-e18568.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s019-s-42b49f.mp3"
    },
    {
      "s": "s020",
      "e": "ep-video-grocerystore-2",
      "k": "video",
      "sp": "Caitie",
      "en": "So into the cart it goes.",
      "zh": "那就放进购物车吧。",
      "an": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s020-n-982e10.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s020-s-c0dab0.mp3"
    },
    {
      "s": "s021",
      "e": "ep-video-grocerystore-2",
      "k": "video",
      "sp": "Caitie",
      "en": "We actually only have a couple things left on our list.",
      "zh": "其实清单上只剩几样东西了。",
      "an": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s021-n-d68dc7.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s021-s-dac3c2.mp3"
    },
    {
      "s": "s022",
      "e": "ep-video-grocerystore-2",
      "k": "video",
      "sp": "Caitie",
      "en": "We are doing excellent shopping.",
      "zh": "我们买得很棒。",
      "an": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s022-n-b375be.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s022-s-68345b.mp3"
    },
    {
      "s": "s023",
      "e": "ep-video-grocerystore-2",
      "k": "video",
      "sp": "Caitie",
      "en": "Next is rice.",
      "zh": "接下来是米。",
      "an": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s023-n-8b7d97.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s023-s-6bdc98.mp3"
    },
    {
      "s": "s024",
      "e": "ep-video-grocerystore-2",
      "k": "video",
      "sp": "Caitie",
      "en": "Let's see if we can find it.",
      "zh": "我们看看能不能找到。",
      "an": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s024-n-a8af13.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s024-s-93511c.mp3"
    },
    {
      "s": "s025",
      "e": "ep-video-grocerystore-2",
      "k": "video",
      "sp": "Caitie",
      "en": "There are lots of long rows of shelves at the grocery store.",
      "zh": "超市里有很多一长排一长排的货架。",
      "an": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s025-n-71b684.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s025-s-22af00.mp3"
    },
    {
      "s": "s026",
      "e": "ep-video-grocerystore-2",
      "k": "video",
      "sp": "Caitie",
      "en": "Those rows are called aisles.",
      "zh": "那些一排排的过道叫 aisle。",
      "an": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s026-n-3bb3f6.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s026-s-5de9f0.mp3"
    },
    {
      "s": "s027",
      "e": "ep-video-grocerystore-2",
      "k": "video",
      "sp": "Caitie",
      "en": "We can walk up and down the aisle to find what we need.",
      "zh": "我们可以在过道里来回走，找到需要的东西。",
      "an": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s027-n-236d7e.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s027-s-b9472d.mp3"
    },
    {
      "s": "s028",
      "e": "ep-video-grocerystore-2",
      "k": "video",
      "sp": "Caitie",
      "en": "The signs can also help us find what we're looking for.",
      "zh": "那些指示牌也可以帮我们找到要找的东西。",
      "an": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s028-n-4241f6.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s028-s-8b082b.mp3"
    },
    {
      "s": "s029",
      "e": "ep-video-grocerystore-2",
      "k": "video",
      "sp": "Caitie",
      "en": "Rice is down this aisle.",
      "zh": "米就在这条过道里。",
      "an": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s029-n-b83bbe.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s029-s-8f6bf5.mp3"
    },
    {
      "s": "s030",
      "e": "ep-video-grocerystore-2",
      "k": "video",
      "sp": "Caitie",
      "en": "I think I'd like to try something new.",
      "zh": "我想试点新的东西。",
      "an": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s030-n-3d48af.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s030-s-f514d3.mp3"
    },
    {
      "s": "s031",
      "e": "ep-video-grocerystore-2",
      "k": "video",
      "sp": "Caitie",
      "en": "Maybe a wild rice blend.",
      "zh": "也许来一包野生米混合装。",
      "an": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s031-n-b86f5b.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s031-s-4f71ca.mp3"
    },
    {
      "s": "s032",
      "e": "ep-video-grocerystore-2",
      "k": "video",
      "sp": "Caitie",
      "en": "This has all different kinds of rice that I haven't tried before all mixed together.",
      "zh": "这里混合了我以前没吃过的各种米。",
      "an": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s032-n-da370f.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s032-s-1f8d4c.mp3"
    },
    {
      "s": "s033",
      "e": "ep-video-grocerystore-2",
      "k": "video",
      "sp": "Caitie",
      "en": "Sounds exciting.",
      "zh": "听起来真有趣。",
      "an": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s033-n-e96df3.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s033-s-e3436c.mp3"
    },
    {
      "s": "s034",
      "e": "ep-video-grocerystore-2",
      "k": "video",
      "sp": "Caitie",
      "en": "Let's see what's next on our list.",
      "zh": "看看清单上下一样是什么。",
      "an": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s034-n-17f1b1.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s034-s-3c394c.mp3"
    },
    {
      "s": "s035",
      "e": "ep-video-grocerystore-2",
      "k": "video",
      "sp": "Caitie",
      "en": "Ooh, fish.",
      "zh": "噢，鱼。",
      "an": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s035-n-7a31f1.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s035-s-11319a.mp3"
    },
    {
      "s": "s036",
      "e": "ep-video-grocerystore-2",
      "k": "video",
      "sp": "Caitie",
      "en": "That means we'll have to go to the seafood counter.",
      "zh": "那就是说我们得去海鲜柜台了。",
      "an": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s036-n-146187.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s036-s-e8ed1a.mp3"
    },
    {
      "s": "s037",
      "e": "ep-video-grocerystore-2",
      "k": "video",
      "sp": "Caitie",
      "en": "Ooh, it all looks so good.",
      "zh": "噢，看起来都好诱人。",
      "an": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s037-n-15a25e.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s037-s-89871c.mp3"
    },
    {
      "s": "s038",
      "e": "ep-video-grocerystore-2",
      "k": "video",
      "sp": "Caitie",
      "en": "Not sure what kind to get though.",
      "zh": "不过我还不确定要买哪种。",
      "an": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s038-n-7ddb54.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s038-s-bf2e4b.mp3"
    },
    {
      "s": "s039",
      "e": "ep-video-grocerystore-2",
      "k": "video",
      "sp": "Clerk",
      "en": "Can I get you anything?",
      "zh": "您需要点什么吗？",
      "an": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s039-n-65f054.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s039-s-7e8890.mp3"
    },
    {
      "s": "s040",
      "e": "ep-video-grocerystore-2",
      "k": "video",
      "sp": "Caitie",
      "en": "Oh, thank you.",
      "zh": "哦，谢谢。",
      "an": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s040-n-668d32.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s040-s-c8747e.mp3"
    },
    {
      "s": "s041",
      "e": "ep-video-grocerystore-2",
      "k": "video",
      "sp": "Caitie",
      "en": "I'm looking for some fish, but I'm not sure what kind I should get.",
      "zh": "我想买一点鱼，但不确定该买哪种。",
      "an": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s041-n-ffa17d.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s041-s-72f1df.mp3"
    },
    {
      "s": "s042",
      "e": "ep-video-grocerystore-2",
      "k": "video",
      "sp": "Clerk",
      "en": "May I recommend the rainbow trout?",
      "zh": "要不要试试虹鳟鱼？",
      "an": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s042-n-66fbb7.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s042-s-c57f50.mp3"
    },
    {
      "s": "s043",
      "e": "ep-video-grocerystore-2",
      "k": "video",
      "sp": "Clerk",
      "en": "It's local and it's fantastic.",
      "zh": "这是本地的，而且非常好吃。",
      "an": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s043-n-567b60.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s043-s-4f4004.mp3"
    },
    {
      "s": "s044",
      "e": "ep-video-grocerystore-2",
      "k": "video",
      "sp": "Caitie",
      "en": "Oh, local. That sounds good.",
      "zh": "哦，本地的。听起来不错。",
      "an": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s044-n-ac2db1.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s044-s-354447.mp3"
    },
    {
      "s": "s045",
      "e": "ep-video-grocerystore-2",
      "k": "video",
      "sp": "Caitie",
      "en": "I'll take some trout, please.",
      "zh": "那我要一些鳟鱼，谢谢。",
      "an": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s045-n-9a44c9.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s045-s-a8125d.mp3"
    },
    {
      "s": "s046",
      "e": "ep-video-grocerystore-2",
      "k": "video",
      "sp": "Clerk",
      "en": "No problem.",
      "zh": "没问题。",
      "an": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s046-n-d533c5.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s046-s-1762a8.mp3"
    },
    {
      "s": "s047",
      "e": "ep-video-grocerystore-2",
      "k": "video",
      "sp": "Clerk",
      "en": "There you go.",
      "zh": "给您。",
      "an": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s047-n-733a1d.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s047-s-07fde2.mp3"
    },
    {
      "s": "s048",
      "e": "ep-video-grocerystore-2",
      "k": "video",
      "sp": "Caitie",
      "en": "Thank you so much.",
      "zh": "非常感谢。",
      "an": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s048-n-76627f.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s048-s-07beb3.mp3"
    },
    {
      "s": "s049",
      "e": "ep-video-grocerystore-2",
      "k": "video",
      "sp": "Clerk",
      "en": "No problem. Have a good day.",
      "zh": "没问题。祝你今天愉快。",
      "an": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s049-n-71187b.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s049-s-5cbe87.mp3"
    },
    {
      "s": "s050",
      "e": "ep-video-grocerystore-2",
      "k": "video",
      "sp": "Caitie",
      "en": "You too.",
      "zh": "你也是。",
      "an": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s050-n-a7daf2.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s050-s-34ab3a.mp3"
    },
    {
      "s": "s051",
      "e": "ep-video-grocerystore-2",
      "k": "video",
      "sp": "Caitie",
      "en": "I'm excited to try this.",
      "zh": "我很期待尝尝这个。",
      "an": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s051-n-e1a7f4.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s051-s-eb0d6a.mp3"
    },
    {
      "s": "s052",
      "e": "ep-video-grocerystore-2",
      "k": "video",
      "sp": "Caitie",
      "en": "We have one more thing on our list, and it's pizza!",
      "zh": "清单上还剩一样，是披萨！",
      "an": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s052-n-bdb4c8.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s052-s-16a52b.mp3"
    },
    {
      "s": "s053",
      "e": "ep-video-grocerystore-2",
      "k": "video",
      "sp": "Caitie",
      "en": "I'm gonna get a frozen pizza from the frozen food section.",
      "zh": "我要在冷冻食品区拿一个冷冻披萨。",
      "an": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s053-n-f280a9.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s053-s-5d3043.mp3"
    },
    {
      "s": "s054",
      "e": "ep-video-grocerystore-2",
      "k": "video",
      "sp": "Caitie",
      "en": "Maybe this veggie pizza.",
      "zh": "也许就这个蔬菜披萨吧。",
      "an": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s054-n-07eaca.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s054-s-74687b.mp3"
    },
    {
      "s": "s055",
      "e": "ep-video-grocerystore-2",
      "k": "video",
      "sp": "Caitie",
      "en": "Well, that's the last thing on our list.",
      "zh": "好，这就是清单上的最后一样了。",
      "an": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s055-n-dc39dd.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s055-s-ee9934.mp3"
    },
    {
      "s": "s056",
      "e": "ep-video-grocerystore-2",
      "k": "video",
      "sp": "Caitie",
      "en": "I like to get the food from the frozen section last, so it doesn't melt in my cart before I get home.",
      "zh": "我喜欢最后再拿冷冻食品，这样在到家前就不会在购物车里化掉。",
      "an": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s056-n-00c564.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s056-s-720ece.mp3"
    },
    {
      "s": "s057",
      "e": "ep-video-grocerystore-2",
      "k": "video",
      "sp": "Caitie",
      "en": "You did great grocery shopping today.",
      "zh": "你今天购物做得真棒。",
      "an": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s057-n-841ca5.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s057-s-6b0673.mp3"
    },
    {
      "s": "s058",
      "e": "ep-video-grocerystore-2",
      "k": "video",
      "sp": "Caitie",
      "en": "I think we can get ourselves a little treat.",
      "zh": "我想我们可以给自己买点小零食。",
      "an": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s058-n-058ed5.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s058-s-f4cee7.mp3"
    },
    {
      "s": "s059",
      "e": "ep-video-grocerystore-2",
      "k": "video",
      "sp": "Caitie",
      "en": "Follow me.",
      "zh": "跟我来。",
      "an": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s059-n-809d5d.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s059-s-8c72b7.mp3"
    },
    {
      "s": "s060",
      "e": "ep-video-grocerystore-2",
      "k": "video",
      "sp": "Caitie",
      "en": "How about cookies?",
      "zh": "买饼干怎么样？",
      "an": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s060-n-999d60.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s060-s-53798c.mp3"
    },
    {
      "s": "s061",
      "e": "ep-video-grocerystore-2",
      "k": "video",
      "sp": "Caitie",
      "en": "This is a special treat and it's perfect for sharing.",
      "zh": "这是特别的小零食，而且很适合分享。",
      "an": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s061-n-52f1a4.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s061-s-e34b59.mp3"
    },
    {
      "s": "s062",
      "e": "ep-video-grocerystore-2",
      "k": "video",
      "sp": "Caitie",
      "en": "But we'll have to wait to eat it until we've paid for everything.",
      "zh": "不过要等我们付完钱才能吃。",
      "an": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s062-n-7bab42.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s062-s-047244.mp3"
    },
    {
      "s": "s063",
      "e": "ep-video-grocerystore-2",
      "k": "video",
      "sp": "Caitie",
      "en": "Are you ready for the grocery store grand finale?",
      "zh": "准备好迎接超市的压轴环节了吗？",
      "an": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s063-n-62ceb0.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s063-s-68ca5c.mp3"
    },
    {
      "s": "s064",
      "e": "ep-video-grocerystore-2",
      "k": "video",
      "sp": "Caitie",
      "en": "Let's go to the checkout.",
      "zh": "我们去收银台吧。",
      "an": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s064-n-fb7b1d.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s064-s-754318.mp3"
    },
    {
      "s": "s065",
      "e": "ep-video-grocerystore-2",
      "k": "video",
      "sp": "Caitie",
      "en": "This is the checkout.",
      "zh": "这就是收银台。",
      "an": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s065-n-c23087.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s065-s-9a4c62.mp3"
    },
    {
      "s": "s066",
      "e": "ep-video-grocerystore-2",
      "k": "video",
      "sp": "Caitie",
      "en": "It's where we pay for everything in our cart.",
      "zh": "我们在这里为购物车里的东西付钱。",
      "an": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s066-n-7ce25c.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s066-s-0652d2.mp3"
    },
    {
      "s": "s067",
      "e": "ep-video-grocerystore-2",
      "k": "video",
      "sp": "Caitie",
      "en": "We wait our turn, then put our groceries on the counter.",
      "zh": "我们先排队，然后把买的东西放到柜台上。",
      "an": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s067-n-2fb03c.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s067-s-b84d82.mp3"
    },
    {
      "s": "s068",
      "e": "ep-video-grocerystore-2",
      "k": "video",
      "sp": "Caitie",
      "en": "That's the sound of the scanner.",
      "zh": "那就是扫描器的声音。",
      "an": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s068-n-0f0aae.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s068-s-7d60a9.mp3"
    },
    {
      "s": "s069",
      "e": "ep-video-grocerystore-2",
      "k": "video",
      "sp": "Caitie",
      "en": "Each thing has a price, and when the cashier adds them all together, that's our total.",
      "zh": "每一样东西都有价格，收银员把它们加在一起，就是我们要付的总数。",
      "an": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s069-n-0d0753.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s069-s-95a93d.mp3"
    },
    {
      "s": "s070",
      "e": "ep-video-grocerystore-2",
      "k": "video",
      "sp": "Caitie",
      "en": "Once we pay and pack our bags, we're all set to go home and put everything away.",
      "zh": "付完钱、装好袋子，我们就可以回家把东西放好了。",
      "an": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s070-n-317a36.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s070-s-126c22.mp3"
    },
    {
      "s": "s071",
      "e": "ep-video-grocerystore-2",
      "k": "video",
      "sp": "Caitie",
      "en": "That was fun.",
      "zh": "真有趣。",
      "an": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s071-n-e231bc.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s071-s-168944.mp3"
    },
    {
      "s": "s072",
      "e": "ep-video-grocerystore-2",
      "k": "video",
      "sp": "Caitie",
      "en": "Thank you so much for helping me with my grocery shopping today.",
      "zh": "非常感谢你今天帮我一起购物。",
      "an": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s072-n-897d58.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s072-s-e4b87b.mp3"
    },
    {
      "s": "s073",
      "e": "ep-video-grocerystore-2",
      "k": "video",
      "sp": "Caitie",
      "en": "I hope you have fun the next time you're at a grocery store too.",
      "zh": "希望你下次去超市也会觉得有趣。",
      "an": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s073-n-dac36e.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s073-s-c8b0db.mp3"
    },
    {
      "s": "s074",
      "e": "ep-video-grocerystore-2",
      "k": "video",
      "sp": "Caitie",
      "en": "I think it's time for a little treat.",
      "zh": "我想是时候吃点小零食了。",
      "an": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s074-n-091e11.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s074-s-123fbc.mp3"
    },
    {
      "s": "s075",
      "e": "ep-video-grocerystore-2",
      "k": "video",
      "sp": "Caitie",
      "en": "I'll see you later.",
      "zh": "回头见。",
      "an": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s075-n-33342b.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s075-s-e73771.mp3"
    },
    {
      "s": "s076",
      "e": "ep-video-grocerystore-2",
      "k": "video",
      "sp": "Caitie",
      "en": "Bye, friends.",
      "zh": "再见，朋友们。",
      "an": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s076-n-e79a71.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-grocerystore-2/s076-s-b918cc.mp3"
    },
    {
      "s": "s001",
      "e": "ep-card-doctor-g3",
      "k": "card",
      "sp": "孩子",
      "en": "Mom, I have a cold. My throat hurts.",
      "zh": "妈妈，我感冒了。我嗓子疼。",
      "an": "https://english.example.com/audio/ep/ep-card-doctor-g3/s001-n-e2a29e.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-doctor-g3/s001-s-7f8cd0.mp3"
    },
    {
      "s": "s002",
      "e": "ep-card-doctor-g3",
      "k": "card",
      "sp": "家长",
      "en": "Oh dear. Should we see the doctor?",
      "zh": "哎呀。我们要去看医生吗？",
      "an": "https://english.example.com/audio/ep/ep-card-doctor-g3/s002-n-b2867f.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-doctor-g3/s002-s-f5f679.mp3"
    },
    {
      "s": "s003",
      "e": "ep-card-doctor-g3",
      "k": "card",
      "sp": "孩子",
      "en": "Yes, please. Can you come with me?",
      "zh": "要的，拜托了。你能和我一起去吗？",
      "an": "https://english.example.com/audio/ep/ep-card-doctor-g3/s003-n-6316cc.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-doctor-g3/s003-s-66d22c.mp3"
    },
    {
      "s": "s004",
      "e": "ep-card-doctor-g3",
      "k": "card",
      "sp": "家长",
      "en": "Of course. The doctor will help you.",
      "zh": "当然。医生会帮你的。",
      "an": "https://english.example.com/audio/ep/ep-card-doctor-g3/s004-n-aa96ae.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-doctor-g3/s004-s-a020d9.mp3"
    },
    {
      "s": "s005",
      "e": "ep-card-doctor-g3",
      "k": "card",
      "sp": "孩子",
      "en": "Will I need some medicine?",
      "zh": "我需要吃药吗？",
      "an": "https://english.example.com/audio/ep/ep-card-doctor-g3/s005-n-c10b59.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-doctor-g3/s005-s-c3caba.mp3"
    },
    {
      "s": "s006",
      "e": "ep-card-doctor-g3",
      "k": "card",
      "sp": "家长",
      "en": "Yes. Please take it after lunch.",
      "zh": "要。请午饭后再吃。",
      "an": "https://english.example.com/audio/ep/ep-card-doctor-g3/s006-n-4a38e9.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-doctor-g3/s006-s-dc0ded.mp3"
    },
    {
      "s": "s001",
      "e": "ep-card-directions-g3",
      "k": "card",
      "sp": "孩子",
      "en": "Excuse me, where is the playground?",
      "zh": "打扰一下，请问操场怎么走？",
      "an": "https://english.example.com/audio/ep/ep-card-directions-g3/s001-n-07b388.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-directions-g3/s001-s-9535e5.mp3"
    },
    {
      "s": "s002",
      "e": "ep-card-directions-g3",
      "k": "card",
      "sp": "路人",
      "en": "Go straight and then turn left.",
      "zh": "一直走，然后向左转。",
      "an": "https://english.example.com/audio/ep/ep-card-directions-g3/s002-n-2e95b2.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-directions-g3/s002-s-75b91e.mp3"
    },
    {
      "s": "s003",
      "e": "ep-card-directions-g3",
      "k": "card",
      "sp": "孩子",
      "en": "Is it next to the cafeteria?",
      "zh": "它在食堂旁边吗？",
      "an": "https://english.example.com/audio/ep/ep-card-directions-g3/s003-n-b1c859.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-directions-g3/s003-s-b74fc2.mp3"
    },
    {
      "s": "s004",
      "e": "ep-card-directions-g3",
      "k": "card",
      "sp": "路人",
      "en": "Yes. You will see a big tree.",
      "zh": "对。你会看到一棵大树。",
      "an": "https://english.example.com/audio/ep/ep-card-directions-g3/s004-n-c6a7db.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-directions-g3/s004-s-c073cf.mp3"
    },
    {
      "s": "s005",
      "e": "ep-card-directions-g3",
      "k": "card",
      "sp": "孩子",
      "en": "Thanks. Can I go this way?",
      "zh": "谢谢。我可以走这条路吗？",
      "an": "https://english.example.com/audio/ep/ep-card-directions-g3/s005-n-37a2db.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-directions-g3/s005-s-7c9c42.mp3"
    },
    {
      "s": "s006",
      "e": "ep-card-directions-g3",
      "k": "card",
      "sp": "路人",
      "en": "Yes. It's not far from here.",
      "zh": "可以。离这儿不远。",
      "an": "https://english.example.com/audio/ep/ep-card-directions-g3/s006-n-7963b7.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-directions-g3/s006-s-9604ad.mp3"
    },
    {
      "s": "s001",
      "e": "ep-card-weekend-g3",
      "k": "card",
      "sp": "孩子",
      "en": "Ben, what do you want to do this weekend?",
      "zh": "Ben，这个周末你想做什么？",
      "an": "https://english.example.com/audio/ep/ep-card-weekend-g3/s001-n-26710e.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-weekend-g3/s001-s-499bd6.mp3"
    },
    {
      "s": "s002",
      "e": "ep-card-weekend-g3",
      "k": "card",
      "sp": "同学",
      "en": "I want to go swimming. Do you want to come?",
      "zh": "我想去游泳。你想来吗？",
      "an": "https://english.example.com/audio/ep/ep-card-weekend-g3/s002-n-46e45b.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-weekend-g3/s002-s-cb3832.mp3"
    },
    {
      "s": "s003",
      "e": "ep-card-weekend-g3",
      "k": "card",
      "sp": "孩子",
      "en": "Yes! What time should we meet?",
      "zh": "好啊！我们几点见面？",
      "an": "https://english.example.com/audio/ep/ep-card-weekend-g3/s003-n-3216c4.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-weekend-g3/s003-s-5fde9e.mp3"
    },
    {
      "s": "s004",
      "e": "ep-card-weekend-g3",
      "k": "card",
      "sp": "同学",
      "en": "How about ten in the morning?",
      "zh": "上午十点怎么样？",
      "an": "https://english.example.com/audio/ep/ep-card-weekend-g3/s004-n-d581a9.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-weekend-g3/s004-s-e0955c.mp3"
    },
    {
      "s": "s005",
      "e": "ep-card-weekend-g3",
      "k": "card",
      "sp": "孩子",
      "en": "Sounds good. Should I bring a towel?",
      "zh": "好。我要带毛巾吗？",
      "an": "https://english.example.com/audio/ep/ep-card-weekend-g3/s005-n-dbd710.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-weekend-g3/s005-s-391d4f.mp3"
    },
    {
      "s": "s006",
      "e": "ep-card-weekend-g3",
      "k": "card",
      "sp": "同学",
      "en": "Yes, please. See you at the pool!",
      "zh": "要的。泳池见！",
      "an": "https://english.example.com/audio/ep/ep-card-weekend-g3/s006-n-137bcb.mp3",
      "as": "https://english.example.com/audio/ep/ep-card-weekend-g3/s006-s-cc7357.mp3"
    },
    {
      "s": "s001",
      "e": "ep-video-hobbies",
      "k": "video",
      "sp": "Anne",
      "en": "Hey guys, did you decide which club to join?",
      "zh": "嗨，你们决定参加哪个社团了吗？",
      "an": "https://english.example.com/audio/ep/ep-video-hobbies/s001-n-0008d8.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-hobbies/s001-s-a978bd.mp3"
    },
    {
      "s": "s002",
      "e": "ep-video-hobbies",
      "k": "video",
      "sp": "Kevin",
      "en": "Not yet! I still have no idea.",
      "zh": "还没有！我还没想好。",
      "an": "https://english.example.com/audio/ep/ep-video-hobbies/s002-n-8f4a64.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-hobbies/s002-s-054c49.mp3"
    },
    {
      "s": "s003",
      "e": "ep-video-hobbies",
      "k": "video",
      "sp": "Olivia",
      "en": "Think about what you like to do for fun.",
      "zh": "想想你平时喜欢做什么。",
      "an": "https://english.example.com/audio/ep/ep-video-hobbies/s003-n-ad819f.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-hobbies/s003-s-8a8384.mp3"
    },
    {
      "s": "s004",
      "e": "ep-video-hobbies",
      "k": "video",
      "sp": "Olivia",
      "en": "What are your hobbies?",
      "zh": "你的爱好是什么？",
      "an": "https://english.example.com/audio/ep/ep-video-hobbies/s004-n-7d73ae.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-hobbies/s004-s-9ebcc2.mp3"
    },
    {
      "s": "s005",
      "e": "ep-video-hobbies",
      "k": "video",
      "sp": "John",
      "en": "I just have too many hobbies!",
      "zh": "我的爱好实在太多了！",
      "an": "https://english.example.com/audio/ep/ep-video-hobbies/s005-n-e92dbf.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-hobbies/s005-s-60438e.mp3"
    },
    {
      "s": "s006",
      "e": "ep-video-hobbies",
      "k": "video",
      "sp": "John",
      "en": "I love taking photographs, and even making and collecting jet model figures!",
      "zh": "我喜欢拍照，还喜欢做喷气机模型、收集模型手办！",
      "an": "https://english.example.com/audio/ep/ep-video-hobbies/s006-n-e9ba39.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-hobbies/s006-s-b91237.mp3"
    },
    {
      "s": "s007",
      "e": "ep-video-hobbies",
      "k": "video",
      "sp": "John",
      "en": "Oh, and I also love cooking, watching science fiction movies, skateboarding and…",
      "zh": "哦，我还喜欢做饭、看科幻电影、滑板，还有……",
      "an": "https://english.example.com/audio/ep/ep-video-hobbies/s007-n-796e13.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-hobbies/s007-s-f1c7a7.mp3"
    },
    {
      "s": "s008",
      "e": "ep-video-hobbies",
      "k": "video",
      "sp": "Anne",
      "en": "John, just pick one of them.",
      "zh": "John，就从里面挑一个吧。",
      "an": "https://english.example.com/audio/ep/ep-video-hobbies/s008-n-32cb6f.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-hobbies/s008-s-0f0b01.mp3"
    },
    {
      "s": "s009",
      "e": "ep-video-hobbies",
      "k": "video",
      "sp": "John",
      "en": "Why do I need to choose one?",
      "zh": "我为什么一定要选一个？",
      "an": "https://english.example.com/audio/ep/ep-video-hobbies/s009-n-8847ac.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-hobbies/s009-s-2beaee.mp3"
    },
    {
      "s": "s010",
      "e": "ep-video-hobbies",
      "k": "video",
      "sp": "John",
      "en": "There's too much fun in this world!",
      "zh": "这个世界上好玩的事情太多了！",
      "an": "https://english.example.com/audio/ep/ep-video-hobbies/s010-n-c5f096.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-hobbies/s010-s-444b25.mp3"
    },
    {
      "s": "s011",
      "e": "ep-video-hobbies",
      "k": "video",
      "sp": "Kevin",
      "en": "What is your hobby, Olivia?",
      "zh": "Olivia，你的爱好是什么？",
      "an": "https://english.example.com/audio/ep/ep-video-hobbies/s011-n-30469e.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-hobbies/s011-s-42108d.mp3"
    },
    {
      "s": "s012",
      "e": "ep-video-hobbies",
      "k": "video",
      "sp": "Olivia",
      "en": "I enjoy reading travel books.",
      "zh": "我喜欢读旅行方面的书。",
      "an": "https://english.example.com/audio/ep/ep-video-hobbies/s012-n-4078aa.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-hobbies/s012-s-a4cef7.mp3"
    },
    {
      "s": "s013",
      "e": "ep-video-hobbies",
      "k": "video",
      "sp": "Olivia",
      "en": "So I signed up for a book club.",
      "zh": "所以我报名参加了读书社。",
      "an": "https://english.example.com/audio/ep/ep-video-hobbies/s013-n-6f4056.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-hobbies/s013-s-de6c39.mp3"
    },
    {
      "s": "s014",
      "e": "ep-video-hobbies",
      "k": "video",
      "sp": "Olivia",
      "en": "Don't you want to join the club with me?",
      "zh": "你不想和我一起参加这个社团吗？",
      "an": "https://english.example.com/audio/ep/ep-video-hobbies/s014-n-8cf1d8.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-hobbies/s014-s-d292f3.mp3"
    },
    {
      "s": "s015",
      "e": "ep-video-hobbies",
      "k": "video",
      "sp": "Kevin",
      "en": "I actually love reading comic books.",
      "zh": "其实我很喜欢看漫画书。",
      "an": "https://english.example.com/audio/ep/ep-video-hobbies/s015-n-044502.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-hobbies/s015-s-9654b2.mp3"
    },
    {
      "s": "s016",
      "e": "ep-video-hobbies",
      "k": "video",
      "sp": "Anne",
      "en": "Well, a comic book is a type of book.",
      "zh": "嗯，漫画书也是书的一种。",
      "an": "https://english.example.com/audio/ep/ep-video-hobbies/s016-n-e7c286.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-hobbies/s016-s-6e97c3.mp3"
    },
    {
      "s": "s017",
      "e": "ep-video-hobbies",
      "k": "video",
      "sp": "Olivia",
      "en": "That's perfect!",
      "zh": "太合适了！",
      "an": "https://english.example.com/audio/ep/ep-video-hobbies/s017-n-679db6.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-hobbies/s017-s-4cc8c7.mp3"
    },
    {
      "s": "s018",
      "e": "ep-video-hobbies",
      "k": "video",
      "sp": "Olivia",
      "en": "Let's sign up for it.",
      "zh": "我们去报名吧。",
      "an": "https://english.example.com/audio/ep/ep-video-hobbies/s018-n-070c3a.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-hobbies/s018-s-b7d969.mp3"
    },
    {
      "s": "s019",
      "e": "ep-video-hobbies",
      "k": "video",
      "sp": "Olivia",
      "en": "It will be awesome!",
      "zh": "一定会很棒！",
      "an": "https://english.example.com/audio/ep/ep-video-hobbies/s019-n-231104.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-hobbies/s019-s-1cd233.mp3"
    },
    {
      "s": "s020",
      "e": "ep-video-hobbies",
      "k": "video",
      "sp": "Kevin",
      "en": "Alright, fine.",
      "zh": "好吧，行。",
      "an": "https://english.example.com/audio/ep/ep-video-hobbies/s020-n-8d7e64.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-hobbies/s020-s-6c195f.mp3"
    },
    {
      "s": "s021",
      "e": "ep-video-hobbies",
      "k": "video",
      "sp": "Olivia",
      "en": "Let's go now!",
      "zh": "我们现在就去吧！",
      "an": "https://english.example.com/audio/ep/ep-video-hobbies/s021-n-36e1c2.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-hobbies/s021-s-5f0cdc.mp3"
    },
    {
      "s": "s022",
      "e": "ep-video-hobbies",
      "k": "video",
      "sp": "Anne",
      "en": "I'm glad Kevin found the right hobby.",
      "zh": "我很高兴 Kevin 找到了合适的爱好。",
      "an": "https://english.example.com/audio/ep/ep-video-hobbies/s022-n-193160.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-hobbies/s022-s-28bd7b.mp3"
    },
    {
      "s": "s023",
      "e": "ep-video-hobbies",
      "k": "video",
      "sp": "John",
      "en": "I'm not really sure if he likes the book club or… Olivia.",
      "zh": "我不太确定他喜欢的是读书社，还是……Olivia。",
      "an": "https://english.example.com/audio/ep/ep-video-hobbies/s023-n-25af0a.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-hobbies/s023-s-9b58ef.mp3"
    },
    {
      "s": "s024",
      "e": "ep-video-hobbies",
      "k": "video",
      "sp": "Anne",
      "en": "Anyways, what about you, John?",
      "zh": "对了，John，那你呢？",
      "an": "https://english.example.com/audio/ep/ep-video-hobbies/s024-n-a67a20.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-hobbies/s024-s-94e264.mp3"
    },
    {
      "s": "s025",
      "e": "ep-video-hobbies",
      "k": "video",
      "sp": "Anne",
      "en": "Which club will you join?",
      "zh": "你要参加哪个社团？",
      "an": "https://english.example.com/audio/ep/ep-video-hobbies/s025-n-9c9aa6.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-hobbies/s025-s-e43205.mp3"
    },
    {
      "s": "s026",
      "e": "ep-video-hobbies",
      "k": "video",
      "sp": "John",
      "en": "Hmm. Science is the answer.",
      "zh": "嗯。答案是科学。",
      "an": "https://english.example.com/audio/ep/ep-video-hobbies/s026-n-070b4d.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-hobbies/s026-s-a9be67.mp3"
    },
    {
      "s": "s027",
      "e": "ep-video-hobbies",
      "k": "video",
      "sp": "John",
      "en": "I will join a science club.",
      "zh": "我要参加科学社。",
      "an": "https://english.example.com/audio/ep/ep-video-hobbies/s027-n-d6817c.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-hobbies/s027-s-46e7ea.mp3"
    },
    {
      "s": "s028",
      "e": "ep-video-hobbies",
      "k": "video",
      "sp": "Anne",
      "en": "That's a great idea, but I heard it's really tough.",
      "zh": "这主意很棒，不过我听说真的很难。",
      "an": "https://english.example.com/audio/ep/ep-video-hobbies/s028-n-03513f.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-hobbies/s028-s-611760.mp3"
    },
    {
      "s": "s029",
      "e": "ep-video-hobbies",
      "k": "video",
      "sp": "Anne",
      "en": "You need to work on many projects.",
      "zh": "你要做很多课题。",
      "an": "https://english.example.com/audio/ep/ep-video-hobbies/s029-n-0ec064.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-hobbies/s029-s-8dc497.mp3"
    },
    {
      "s": "s030",
      "e": "ep-video-hobbies",
      "k": "video",
      "sp": "Anne",
      "en": "And plus, the teacher is really strict.",
      "zh": "而且，老师还特别严格。",
      "an": "https://english.example.com/audio/ep/ep-video-hobbies/s030-n-77cbe5.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-hobbies/s030-s-980e0e.mp3"
    },
    {
      "s": "s031",
      "e": "ep-video-hobbies",
      "k": "video",
      "sp": "John",
      "en": "Umm… I just changed my mind.",
      "zh": "嗯……我刚改主意了。",
      "an": "https://english.example.com/audio/ep/ep-video-hobbies/s031-n-7fc052.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-hobbies/s031-s-71ab3a.mp3"
    },
    {
      "s": "s032",
      "e": "ep-video-hobbies",
      "k": "video",
      "sp": "John",
      "en": "I will probably join a photography club.",
      "zh": "我大概会参加摄影社。",
      "an": "https://english.example.com/audio/ep/ep-video-hobbies/s032-n-3d099f.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-hobbies/s032-s-818b96.mp3"
    },
    {
      "s": "s033",
      "e": "ep-video-hobbies",
      "k": "video",
      "sp": "Anne",
      "en": "Oh, really? That's a great idea!",
      "zh": "哦，真的吗？这主意很棒！",
      "an": "https://english.example.com/audio/ep/ep-video-hobbies/s033-n-e3a306.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-hobbies/s033-s-d69b0b.mp3"
    },
    {
      "s": "s034",
      "e": "ep-video-hobbies",
      "k": "video",
      "sp": "Anne",
      "en": "Please take an awesome picture of me when you become a pro.",
      "zh": "等你成了高手，请给我拍一张超棒的照片。",
      "an": "https://english.example.com/audio/ep/ep-video-hobbies/s034-n-f94750.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-hobbies/s034-s-df945a.mp3"
    },
    {
      "s": "s035",
      "e": "ep-video-hobbies",
      "k": "video",
      "sp": "John",
      "en": "Yep yep!",
      "zh": "对对！",
      "an": "https://english.example.com/audio/ep/ep-video-hobbies/s035-n-27ccc3.mp3",
      "as": "https://english.example.com/audio/ep/ep-video-hobbies/s035-s-3ee84c.mp3"
    }
  ]
};
/* DAILY_ENGLISH_POOL:END */
