/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { useSettings } from "@api/Settings";
import { Margins } from "@utils/margins";
import { identity } from "@utils/misc";
import { ModalCloseButton, ModalContent, ModalHeader, ModalRoot, ModalSize, openModal } from "@utils/modal";
import { Forms, Select, Slider, Text } from "@webpack/common";

import { ErrorCard } from "..";

export function NotificationSettings() {
    const settings = useSettings().notifications;

    return (
        <div style={{ padding: "1em 0" }}>
            <Forms.FormTitle tag="h5">通知のスタイル</Forms.FormTitle>
            {settings.useNative !== "never" && Notification?.permission === "denied" && (
                <ErrorCard style={{ padding: "1em" }} className={Margins.bottom8}>
                    <Forms.FormTitle tag="h5">デスクトップ通知が拒否されました</Forms.FormTitle>
                    <Forms.FormText>あなたはデスクトップ通知を設定で無効にしました。そのため、デスクトップ通知を受信できません。</Forms.FormText>
                </ErrorCard>
            )}
            <Forms.FormText className={Margins.bottom8}>
                一部のプラグインは通知を表示する場合があります。これらには2つのスタイルがあります：
                <ul>
                    <li><strong>Vencordの通知</strong>: これらはアプリ内通知です</li>
                    <li><strong>デスクトップ通知</strong>: ネイティブのデスクトップ通知（例：メンションを受け取ったとき）</li>
                </ul>
            </Forms.FormText>
            <Select
                placeholder="通知スタイル"
                options={[
                    { label: "Discordがフォーカスされていない場合にのみデスクトップ通知を使用する", value: "not-focused", default: true },
                    { label: "常にデスクトップ通知を使用する", value: "always" },
                    { label: "常にVencord通知を使用する", value: "never" },
                ] satisfies Array<{ value: typeof settings["useNative"]; } & Record<string, any>>}
                closeOnSelect={true}
                select={v => settings.useNative = v}
                isSelected={v => v === settings.useNative}
                serialize={identity}
            />

            <Forms.FormTitle tag="h5" className={Margins.top16 + " " + Margins.bottom8}>Notification Position</Forms.FormTitle>
            <Select
                isDisabled={settings.useNative === "always"}
                placeholder="通知の位置"
                options={[
                    { label: "右下", value: "bottom-right", default: true },
                    { label: "右上", value: "top-right" },
                ] satisfies Array<{ value: typeof settings["position"]; } & Record<string, any>>}
                select={v => settings.position = v}
                isSelected={v => v === settings.position}
                serialize={identity}
            />

            <Forms.FormTitle tag="h5" className={Margins.top16 + " " + Margins.bottom8}>通知のタイムアウト</Forms.FormTitle>
            <Forms.FormText className={Margins.bottom16}>自動的にタイムアウトしないようにするには、0秒に設定します</Forms.FormText>
            <Slider
                disabled={settings.useNative === "always"}
                markers={[0, 1000, 2500, 5000, 10_000, 20_000]}
                minValue={0}
                maxValue={20_000}
                initialValue={settings.timeout}
                onValueChange={v => settings.timeout = v}
                onValueRender={v => (v / 1000).toFixed(2) + "秒"}
                onMarkerRender={v => (v / 1000) + "秒"}
                stickToMarkers={false}
            />

            <Forms.FormTitle tag="h5" className={Margins.top16 + " " + Margins.bottom8}>通知ログの制限</Forms.FormTitle>
            <Forms.FormText className={Margins.bottom16}>
                古い通知が削除されるまでログに保存する通知の数。
                通知ログを無効にするには<code>0</code>、古い通知を自動的に削除しないには<code>∞</code>に設定します
            </Forms.FormText>
            <Slider
                markers={[0, 25, 50, 75, 100, 200]}
                minValue={0}
                maxValue={200}
                stickToMarkers={true}
                initialValue={settings.logLimit}
                onValueChange={v => settings.logLimit = v}
                onValueRender={v => v === 200 ? "∞" : v}
                onMarkerRender={v => v === 200 ? "∞" : v}
            />
        </div>
    );
}

export function openNotificationSettingsModal() {
    openModal(props => (
        <ModalRoot {...props} size={ModalSize.MEDIUM}>
            <ModalHeader>
                <Text variant="heading-lg/semibold" style={{ flexGrow: 1 }}>通知の設定</Text>
                <ModalCloseButton onClick={props.onClose} />
            </ModalHeader>

            <ModalContent>
                <NotificationSettings />
            </ModalContent>
        </ModalRoot>
    ));
}
