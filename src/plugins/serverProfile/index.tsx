/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { addContextMenuPatch, findGroupChildrenByChildId, NavContextMenuPatchCallback, removeContextMenuPatch } from "@api/ContextMenu";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { Menu } from "@webpack/common";
import { Guild } from "discord-types/general";

import { openGuildProfileModal } from "./GuildProfileModal";

const Patch: NavContextMenuPatchCallback = (children, { guild }: { guild: Guild; }) => () => {
    const group = findGroupChildrenByChildId("privacy", children);

    group?.push(
        <Menu.MenuItem
            id="vc-server-profile"
            label="サーバー情報"
            action={() => openGuildProfileModal(guild)}
        />
    );
};

export default definePlugin({
    name: "サーバー情報",
    description: "サーバーリストを右クリックして、サーバー情報をクリックするとサーバー情報を見ることができます。",
    authors: [Devs.Ven, Devs.Nuckyz],
    tags: ["guild", "info"],

    start() {
        addContextMenuPatch(["guild-context", "guild-header-popout"], Patch);
    },

    stop() {
        removeContextMenuPatch(["guild-context", "guild-header-popout"], Patch);
    }
});
