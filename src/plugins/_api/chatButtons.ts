/*
 * Vencord、Discordクライアントの修正
 * 著作権 (c) 2024 Vendicatedと貢献者
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

export default definePlugin({
    name: "チャット入力ボタンAPI",
    description: "チャット入力にボタンを追加するAPI",
    authors: [Devs.Ven],

    patches: [{
        find: '"sticker")',
        replacement: {
            match: /!\i\.isMobile(?=.+?(\i)\.push\(.{0,50}"gift")/,
            replace: "$& &&(Vencord.Api.ChatButtons._injectButtons($1,arguments[0]),true)"
        }
    }]
});
