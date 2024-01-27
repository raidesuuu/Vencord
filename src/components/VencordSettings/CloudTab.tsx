/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2023 Vendicated and contributors
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
        return "Invalid URL";
    }
}

async function eraseAllData() {
    const res = await fetch(new URL("/v1/", getCloudUrl()), {
        method: "DELETE",
        headers: new Headers({
            Authorization: await getCloudAuth()
        })
    });

    if (!res.ok) {
        cloudLogger.error(`Failed to erase data, API returned ${res.status}`);
        showNotification({
            title: "クラウド連携",
            body: `すべてのデータを削除できませんでした。(APIの返答: ${res.status})、サポートに連絡してください。`,
            color: "var(--red-360)"
        });
        return;
    }

    Settings.cloud.authenticated = false;
    await deauthorizeCloud();

    showNotification({
        title: "クラウド連携",
        body: "すべてのデータを削除しました。",
        color: "var(--green-360)"
    });
}

function SettingsSyncSection() {
    const { cloud } = useSettings(["cloud.authenticated", "cloud.settingsSync"]);
    const sectionEnabled = cloud.authenticated && cloud.settingsSync;

    return (
        <Forms.FormSection title="設定の同期" className={Margins.top16}>
            <Forms.FormText variant="text-md/normal" className={Margins.bottom20}>
                設定をクラウドに同期します。これにより、簡単に複数のデバイスでデータを同期できます。
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
                >クラウドへ同期</Button>
                <Tooltip text="これにより、ローカルの設定がクラウド上の設定で上書きされます。賢く使いましょう。">
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
            <Forms.FormSection title="クラウドの設定" className={Margins.top16}>
                <Forms.FormText variant="text-md/normal" className={Margins.bottom20}>
                    Vencordには、デバイス間で設定を同期できる機能が付属しています。
                    あなたの<Link href="https://vencord.dev/cloud/privacy">プライバシー</Link>を尊敬し、
                    <Link href="https://github.com/Vencord/Backend">ソースコード</Link>は、AGPL 3.0で
                    ライセンスされているため、自分でホストすることが可能です。

                </Forms.FormText>
                <Switch
                    key="backend"
                    value={settings.cloud.authenticated}
                    onChange={v => { v && authorizeCloud(); if (!v) settings.cloud.authenticated = v; }}
                    note="クラウドとの連携をまだ設定していない場合、認証が要求されます。"
                >
                    クラウドとの連携を有効にする
                </Switch>
                <Forms.FormTitle tag="h5">バックエンドのURL</Forms.FormTitle>
                <Forms.FormText className={Margins.bottom8}>
                    クラウドとの連携を使用するURLを入力します。
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
                        title: "本当に実行しますか？",
                        body: "これにより、永久的にあなたのデータがクラウド上から削除されます。本当に続行しますか？",
                        onConfirm: eraseAllData,
                        confirmText: "続行して削除",
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
