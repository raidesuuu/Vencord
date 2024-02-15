/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2022 Vendicated and contributors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import { migratePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

migratePluginSettings("DisableCallIdle", "DisableDMCallIdle");
export default definePlugin({
    name: "DM通話の自動切断を無効化",
    description: "DMの音声通話から3分後に自動的に切断される機能とAFKボイスチャンネルに移動される機能を無効にします。",
    authors: [Devs.Nuckyz],
    patches: [
        {
            find: ".Messages.BOT_CALL_IDLE_DISCONNECT",
            replacement: {
                match: /,?(?=this\.idleTimeout=new \i\.Timeout)/,
                replace: ";return;"
            }
        },
        {
            find: "handleIdleUpdate(){",
            replacement: {
                match: /(?<=_initialize\(\){)/,
                replace: "return;"
            }
        }
    ]
});
