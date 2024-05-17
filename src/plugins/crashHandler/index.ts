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

import { showNotification } from "@api/Notifications";
import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import { Logger } from "@utils/Logger";
import { closeAllModals } from "@utils/modal";
import definePlugin, { OptionType } from "@utils/types";
import { maybePromptToUpdate } from "@utils/updater";
import { filters, findBulk, proxyLazyWebpack } from "@webpack";
import { DraftType, FluxDispatcher, NavigationRouter, SelectedChannelStore } from "@webpack/common";

const CrashHandlerLogger = new Logger("CrashHandler");

const { ModalStack, DraftManager, closeExpressionPicker } = proxyLazyWebpack(() => {
    const [ModalStack, DraftManager, ExpressionManager] = findBulk(
        filters.byProps("pushLazy", "popAll"),
        filters.byProps("clearDraft", "saveDraft"),
        filters.byProps("closeExpressionPicker", "openExpressionPicker"),);

    return {
        ModalStack,
        DraftManager,
        closeExpressionPicker: ExpressionManager?.closeExpressionPicker,
    };
});

const settings = definePluginSettings({
    attemptToPreventCrashes: {
        type: OptionType.BOOLEAN,
        description: "Discordのクラッシュを防ぐかどうか",
        default: true,
    },
    attemptToNavigateToHome: {
        type: OptionType.BOOLEAN,
        description:
            "Discordのクラッシュを防ぐ際にホーム画面への移動を試みるかどうか。",
        default: false,
    },
});

let hasCrashedOnce = false;
let isRecovering = false;
let shouldAttemptRecover = true;

export default definePlugin({
    name: "CrashHandler",
    description: "再起動なしでクラッシュを処理し、回復させるプラグイン",
    authors: [Devs.Nuckyz],
    enabledByDefault: true,

    settings,

    patches: [
        {
            find: ".Messages.ERRORS_UNEXPECTED_CRASH",
            replacement: {
                match: /this\.setState\((.+?)\)/,
                replace: "$self.handleCrash(this,$1);",
            },
        },
    ],

    handleCrash(_this: any, errorState: any) {
        _this.setState(errorState);

        // Already recovering, prevent error which happens more than once too fast to trigger another recover
        if (isRecovering) return;
        isRecovering = true;

        // 1 ms timeout to avoid react breaking when re-rendering
        setTimeout(() => {
            try {
                // Prevent a crash loop with an error that could not be handled
                if (!shouldAttemptRecover) {
                    try {
                        showNotification({
                            color: "#eed202",
                            title: "Discordがクラッシュしました",
                            body: "おっと :( Discordが5回以上クラッシュし、回復のしようがありません。",
                            noPersist: true,
                        });
                    } catch { }

                    return;
                }

                shouldAttemptRecover = false;
                // This is enough to avoid a crash loop
                setTimeout(() => shouldAttemptRecover = true, 1000);
            } catch { }

            try {
                if (!hasCrashedOnce) {
                    hasCrashedOnce = true;
                    maybePromptToUpdate(
                        "Uh oh, Discord has just crashed... but good news, there is a Vencord update available that might fix this issue! Would you like to update now?",
                        true
                    );
                }
            } catch { }

            try {
                if (settings.store.attemptToPreventCrashes) {
                    this.handlePreventCrash(_this);
                }
            } catch (err) {
                CrashHandlerLogger.error("Failed to handle crash", err);
            }
        }, 1);
    },

    handlePreventCrash(_this: any) {
        try {
            showNotification({
                color: "#eed202",
                title: "Discordがクラッシュしました",
                body: "復旧を試みています",
                noPersist: true,
            });
        } catch { }

        try {
            const channelId = SelectedChannelStore.getChannelId();

            for (const key in DraftType) {
                if (!Number.isNaN(Number(key))) continue;

                DraftManager.clearDraft(channelId, DraftType[key]);
            }
        } catch (err) {
            CrashHandlerLogger.debug("ドラフトをクリアできませんでした。", err);
        }
        try {
            closeExpressionPicker();
        } catch (err) {
            CrashHandlerLogger.debug(
                "エクスプレッション・ピッカーを閉じるのに失敗しました。",
                err
            );
        }
        try {
            FluxDispatcher.dispatch({ type: "CONTEXT_MENU_CLOSE" });
        } catch (err) {
            CrashHandlerLogger.debug(
                "開いているコンテキストメニューを閉じることができませんでした。",
                err
            );
        }
        try {
            ModalStack.popAll();
        } catch (err) {
            CrashHandlerLogger.debug(
                "古いモーダルを閉じるのに失敗しました。",
                err
            );
        }
        try {
            closeAllModals();
        } catch (err) {
            CrashHandlerLogger.debug(
                "開いているすべてのモーダルを閉じることができませんでした。",
                err
            );
        }
        try {
            FluxDispatcher.dispatch({ type: "USER_PROFILE_MODAL_CLOSE" });
        } catch (err) {
            CrashHandlerLogger.debug(
                "ユーザーポップアウトを閉じることができませんでした。",
                err
            );
        }
        try {
            FluxDispatcher.dispatch({ type: "LAYER_POP_ALL" });
        } catch (err) {
            CrashHandlerLogger.debug("すべてのレイヤーのポップに失敗", err);
        }
        if (settings.store.attemptToNavigateToHome) {
            try {
                NavigationRouter.transitionTo("/channels/@me");
            } catch (err) {
                CrashHandlerLogger.debug(
                    "ホーム画面への移動へ失敗しました",
                    err
                );
            }
        }

        // Set isRecovering to false before setting the state to allow us to handle the next crash error correcty, in case it happens
        setImmediate(() => (isRecovering = false));

        try {
            _this.setState({ error: null, info: null });
        } catch (err) {
            CrashHandlerLogger.debug(
                "クラッシュハンドラ・コンポーネントの更新に失敗しました。",
                err
            );
        }
    },
});
