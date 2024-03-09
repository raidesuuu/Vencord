/*
 * Vencord、Discordのデスクトップアプリの改造版
 * 著作権 (c) 2023 Vendicated および貢献者
 *
 * このプログラムはフリーソフトウェアです。再配布や修正は
 * GNU General Public License の条件の下で行うことができます。
 * このプログラムは無保証です。詳細は
 * GNU General Public License を参照してください。
 * ライセンスのコピーは、このプログラムと一緒に提供されます。
 * 提供されていない場合は、<https://www.gnu.org/licenses/> を参照してください。
*/

import { showNotification } from "@api/Notifications";
import { Settings, useSettings } from "@api/Settings";
import { CheckedTextInput } from "@components/CheckedTextInput";
import { Link } from "@components/Link";
import { authorizeCloud, cloudLogger, deauthorizeCloud, getCloudAuth, getCloudUrl } from "@utils/cloud";
import { Margins } from "@utils/margins";
import { deleteCloudSettings, getCloudSettings, putCloudSettings } from "@utils/settingsSync";
import { Alerts, Button, Forms, Switch, Tooltip } from "@webpack/common";

import { SettingsTab, wrapTab } from "./shared";

function validateUrl(url: string) {
    try {
        new URL(url);
        return true;
    } catch {
        return "無効なURLです";
    }
}

async function eraseAllData() {
    const res = await fetch(new URL("/v1/", getCloudUrl()), {
        method: "DELETE",
        headers: { Authorization: await getCloudAuth() }
    });

    if (!res.ok) {
        cloudLogger.error(`データの削除に失敗しました。APIが ${res.status} を返しました`);
        showNotification({
            title: "クラウド統合",
            body: `すべてのデータを削除できませんでした（APIが ${res.status} を返しました）。サポートにお問い合わせください。`,
            color: "var(--red-360)"
        });
        return;
    }

    Settings.cloud.authenticated = false;
    await deauthorizeCloud();

    showNotification({
        title: "クラウド統合",
        body: "すべてのデータを正常に削除しました。",
        color: "var(--green-360)"
    });
}

function SettingsSyncSection() {
    const { cloud } = useSettings(["cloud.authenticated", "cloud.settingsSync"]);
    const sectionEnabled = cloud.authenticated && cloud.settingsSync;

    return (
        <Forms.FormSection title="設定の同期" className={Margins.top16}>
            <Forms.FormText variant="text-md/normal" className={Margins.bottom20}>
                設定をクラウドに同期します。これにより、複数のデバイス間で簡単に同期することができます。
            </Forms.FormText>
            <Switch
                key="cloud-sync"
                disabled={!cloud.authenticated}
                value={cloud.settingsSync}
                onChange={v => { cloud.settingsSync = v; }}
            >
                設定の同期
            </Switch>
            <div className="vc-cloud-settings-sync-grid">
                <Button
                    size={Button.Sizes.SMALL}
                    disabled={!sectionEnabled}
                    onClick={() => putCloudSettings(true)}
                >クラウドに同期</Button>
                <Tooltip text="これにより、クラウド上の設定でローカルの設定が上書きされます。注意して使用してください！">
                    {({ onMouseLeave, onMouseEnter }) => (
                        <Button
                            onMouseLeave={onMouseLeave}
                            onMouseEnter={onMouseEnter}
                            size={Button.Sizes.SMALL}
                            color={Button.Colors.RED}
                            disabled={!sectionEnabled}
                            onClick={() => getCloudSettings(true, true)}
                        >クラウドから同期</Button>
                    )}
                </Tooltip>
                <Button
                    size={Button.Sizes.SMALL}
                    color={Button.Colors.RED}
                    disabled={!sectionEnabled}
                    onClick={() => deleteCloudSettings()}
                >クラウドの設定を削除</Button>
            </div>
        </Forms.FormSection>
    );
}

function CloudTab() {
    const settings = useSettings(["cloud.authenticated", "cloud.url"]);

    return (
        <SettingsTab title="Vencord クラウド">
            <Forms.FormSection title="クラウド設定" className={Margins.top16}>
                <Forms.FormText variant="text-md/normal" className={Margins.bottom20}>
                    Vencordにはクラウド統合があり、設定の同期などの便利な機能が追加されます。
                    <Link href="https://vencord.dev/cloud/privacy">プライバシーポリシー</Link>を尊重し、
                    <Link href="https://github.com/Vencord/Backend">ソースコード</Link>はAGPL 3.0ライセンスで提供されているため、
                    自分でホストすることもできます。
                </Forms.FormText>
                <Switch
                    key="backend"
                    value={settings.cloud.authenticated}
                    onChange={v => { v && authorizeCloud(); if (!v) settings.cloud.authenticated = v; }}
                    note="クラウド統合をまだ設定していない場合、認証を要求します。"
                >
                    クラウド統合を有効にする
                </Switch>
                <Forms.FormTitle tag="h5">バックエンドのURL</Forms.FormTitle>
                <Forms.FormText className={Margins.bottom8}>
                    クラウド統合を使用する際に使用するバックエンドです。
                </Forms.FormText>
                <CheckedTextInput
                    key="backendUrl"
                    value={settings.cloud.url}
                    onChange={v => { settings.cloud.url = v; settings.cloud.authenticated = false; deauthorizeCloud(); }}
                    validate={validateUrl}
                />
                <Button
                    className={Margins.top8}
                    size={Button.Sizes.MEDIUM}
                    color={Button.Colors.RED}
                    disabled={!settings.cloud.authenticated}
                    onClick={() => Alerts.show({
                        title: "本当によろしいですか？",
                        body: "データが削除されると元に戻すことはできません。注意してください！",
                        onConfirm: eraseAllData,
                        confirmText: "削除する",
                        confirmColor: "vc-cloud-erase-data-danger-btn",
                        cancelText: "キャンセル"
                    })}
                >すべてのデータを削除</Button>
                <Forms.FormDivider className={Margins.top16} />
            </Forms.FormSection >
            <SettingsSyncSection />
        </SettingsTab>
    );
}

export default wrapTab(CloudTab, "クラウド");
