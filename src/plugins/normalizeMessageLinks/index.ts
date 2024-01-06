/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

export default definePlugin({
    name: "メッセージリンクを安定版にする",
    description: "PTB/Canaryのメッセージリンクを安定版にします。",
    authors: [Devs.bb010g],
    patches: [
        {
            find: ".Messages.COPY_MESSAGE_LINK,",
            replacement: {
                match: /\.concat\(location\.host\)/,
                replace: ".concat($self.normalizeHost(location.host))",
            },
        },
    ],
    normalizeHost(host: string) {
        return host.replace(/(^|\b)(canary\.|ptb\.)(discord.com)$/, "$1$3");
    },
});
