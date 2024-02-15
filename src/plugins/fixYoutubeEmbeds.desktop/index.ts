/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

export default definePlugin({
    name: "YouTubeの埋め込みを修正",
    description: "Discord上でYouTube動画が表示されない問題（例：UMGによるブロック）を回避します",
    authors: [Devs.coolelectronics]
});
