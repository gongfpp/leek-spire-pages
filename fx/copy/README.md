# 手动修改文案

这个目录里的 JS 文件由游戏直接读取。只改文字时不需要修改 app.js，也不要修改 id、trigger、gate、变量占位符或导出名称。保存后重新打开本地页面；线上修改需要重新部署。

| 文件 | 可以改什么 |
| --- | --- |
| script-lines.js | 原作及已批准台本的中文显示文字，lines 中的第二项 |
| original-lines.js | 本游戏原创台词与表情短句，lines 中的第二项；旧聊天语料保留为资料，聊天入口已经下线 |
| items.js | 道具 name、caption、copy 和 PROP_LINES 使用短句。cost 是实际价格，修改会改变规则 |
| scenes.js | 休市、父亲与朋友场景标题、台词、按钮标签 |
| transitions.js | 日结按钮、盈亏反转短句、原作漫画单格中文翻译 |
| terminal-help.js | 圆形问号扩展说明和开局三页剧情文字，保持来源链接与事实含义 |
| ui.js | 玩法说明、库存空提示、匿名统计说明 |

原声字幕与录音绑定，保存在 ../voice.js；不能把自行改写的台词当作原声转录。真实片段来源和时码见 ../voice/SOURCES.json。过场图片在 ../comics/，表情在 ../expressions/，原作单格在 ../homage/。

新闻文案在 ../content.js 与 ../story-content.js。角色引用触发条件与漫画字幕路由在 ../dialogue.js；这些属于逻辑，单纯修改台词时不用动。

本地预览：在 site/ 运行 npm start，打开输出地址的 /fx.html。修改后运行 npm test 检查文案标识、原作与原创分离、资源及玩法回归。
