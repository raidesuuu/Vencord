/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { makeRange } from "@components/PluginSettings/components";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";

// The entire code of this plugin can be found in ipcPlugins
export default definePlugin({
    name: "Spotify埋め込み修正",
    description: "Spotifyの埋め込みが非常に大きな音量で再生されるのを修正し、音量をカスタマイズできるようにします",
    authors: [Devs.Ven],
    settings: definePluginSettings({
        volume: {
            type: OptionType.SLIDER,
            description: "Spotifyの埋め込みに設定する音量％。10％以上は非常に大きな音量です",
            markers: makeRange(0, 100, 10),
            stickToMarkers: false,
            default: 10
        }
    })
});
