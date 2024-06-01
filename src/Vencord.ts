/*!
 * Vencord、Discordのデスクトップアプリの改造版
 * 著作権 (c) 2022 Vendicated および貢献者
 *
 * このプログラムはフリーソフトウェアです。再配布や修正は、
 * GNU General Public License の条件の下で行うことができます。
 * このライセンスのバージョン 3 またはそれ以降を選択することができます。
 *
 * このプログラムは有用であることを期待して配布されていますが、
 * 保証なしで提供されます。商品性や特定の目的への適合性についての
 * 暗黙の保証もありません。詳細については、GNU General Public License を参照してください。
 *
 * このプログラムと一緒に GNU General Public License のコピーを受け取るはずです。
 * 受け取っていない場合は、<https://www.gnu.org/licenses/> を参照してください。
*/

export * as Api from "./api";
export * as Components from "./components";
export * as Plugins from "./plugins";
export * as Util from "./utils";
export * as QuickCss from "./utils/quickCss";
export * as Updater from "./utils/updater";
export * as Webpack from "./webpack";
export { PlainSettings, Settings };

import "./utils/quickCss";
import "./webpack/patchWebpack";

import { openUpdaterModal } from "@components/VencordSettings/UpdaterTab";
import { StartAt } from "@utils/types";

import { get as dsGet } from "./api/DataStore";
import { showNotification } from "./api/Notifications";
import { PlainSettings, Settings } from "./api/Settings";
import { patches, PMLogger, startAllPlugins } from "./plugins";
import { localStorage } from "./utils/localStorage";
import { relaunch } from "./utils/native";
import { getCloudSettings, putCloudSettings } from "./utils/settingsSync";
import { checkForUpdates, update, UpdateLogger } from "./utils/updater";
import { onceReady } from "./webpack";
import { SettingsRouter } from "./webpack/common";

if (IS_REPORTER) {
    require("./debug/runReporter");
}

async function syncSettings() {
    // ローカル共有設定の事前チェック
    if (
        Settings.cloud.authenticated &&
        !await dsGet("Vencord_cloudSecret") // ローカル設定の共有またはその他のバグにより有効になっています
    ) {
        // 通知を表示して、修正方法を伝える
        showNotification({
            title: "クラウド統合",
            body: "他のクライアントでクラウド統合が有効になっていることに気付きました！制限のため、継続して使用するには再認証が必要です。設定ページに移動して再認証してください。",
            color: "var(--yellow-360)",
            onClick: () => SettingsRouter.open("VencordCloud")
        });
        return;
    }

    if (
        Settings.cloud.settingsSync && // 有効になっている場合
        Settings.cloud.authenticated // クラウド統合が有効な場合
    ) {
        if (localStorage.Vencord_settingsDirty) {
            await putCloudSettings();
            delete localStorage.Vencord_settingsDirty;
        } else if (await getCloudSettings(false)) { // 同期されたものがある場合 (false は同期しないことを意味します)
            // ここで通知を表示し、getCloudSettings() がユーザーに通知するのを防ぐために、
            // 可能な通知の数を減らすために通知を表示します。getCloudSettings() は、エラーがあるかどうかに関係なく、
            // ユーザーに通知するため、可能な通知の数だけ表示するだけで十分です (設定が新しい場合など)。
            showNotification({
                title: "クラウド設定",
                body: "設定が更新されました！完全な変更を適用するために再起動するにはここをクリックしてください。",
                color: "var(--green-360)",
                onClick: relaunch
            });
        }
    }
}

async function init() {
    await onceReady;
    startAllPlugins(StartAt.WebpackReady);

    syncSettings();

    if (!IS_WEB && !IS_UPDATER_DISABLED) {
        try {
            const isOutdated = await checkForUpdates();
            if (!isOutdated) return;

            if (Settings.autoUpdate) {
                await update();
                if (Settings.autoUpdateNotification)
                    setTimeout(() => showNotification({
                        title: "Vencord が更新されました！",
                        body: "再起動するにはここをクリックしてください",
                        permanent: true,
                        noPersist: true,
                        onClick: relaunch
                    }), 10_000);
                return;
            }

            setTimeout(() => showNotification({
                title: "Vencord の更新が利用可能です！",
                body: "アップデートを表示するにはここをクリックしてください",
                permanent: true,
                noPersist: true,
                onClick: openUpdaterModal!
            }), 10_000);
        } catch (err) {
            UpdateLogger.error("アップデートのチェックに失敗しました", err);
        }
    }

    if (IS_DEV) {
        const pendingPatches = patches.filter(p => !p.all && p.predicate?.() !== false);
        if (pendingPatches.length)
            PMLogger.warn(
                "Webpack の初期化が完了しましたが、まだ一部のパッチが適用されていません。",
                "これは、一部のモジュールが遅延読み込みされるため、予想される動作ですが、",
                "すべてのプラグインが意図したとおりに動作していることを確認してください。",
                "これは Vencord の開発ビルドですので、この警告が表示されます。",
                "\n次のパッチが適用されていません:",
                "\n\n" + pendingPatches.map(p => `${p.plugin}: ${p.find}`).join("\n")
            );
    }
}

startAllPlugins(StartAt.Init);
init();

document.addEventListener("DOMContentLoaded", () => {
    startAllPlugins(StartAt.DOMContentLoaded);

    if (IS_DISCORD_DESKTOP && Settings.winNativeTitleBar && navigator.platform.toLowerCase().startsWith("win")) {
        document.head.append(Object.assign(document.createElement("style"), {
            id: "vencord-native-titlebar-style",
            textContent: "[class*=titleBar]{display: none!important}"
        }));
    }
}, { once: true });
