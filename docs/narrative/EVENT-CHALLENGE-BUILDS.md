# 一般事件的對戰能力設定

一般事件與戰場劇本共用 `DuelBuild`、`RallyBuild` 能力格式。

- `duel.enemy`：指定 `war`、`lead`、`trait`，不再強制敵方無特性。
- `debate.enemy`：指定各自獨立的 `int`、`pol`、`specials`、`passives`。
- `debate.ally`：指定主角本場的 `specials`、`passives`；智力與政治仍讀取本輪實際能力。特殊牌可設定多種，被動沿用引擎最多兩項的規則。
- 明確的能力設定優先於 `ability`。省略新欄位時保留舊資料與舊存檔行為。
- 目前養成特質尚無舌戰效果欄位，因此不會自行推測學到的特質應對應哪張特殊牌。此處設定的是本場劇情能力。

```ts
duel: { enemy: { war: 80, lead: 65, trait: 'steady' } }

debate: {
  enemy: { int: 82, pol: 68, specials: ['reflect'], passives: ['composure'] },
  ally: { specials: ['induct', 'wild'], passives: ['scholar'] }
}
```

兩種設定分別只適用於相符的挑戰模式。載入內容與恢復存檔時會檢查能力範圍及特性名稱。

## 單挑 Combo 與特性

`DuelBuild.comboEnabled` 控制 Combo 與招式點數累積，和特性／進階招式觸發分開。一般事件亦可設定 `duel.ally.comboEnabled`。省略時，玩家操作我方預設開啟，敵方與自動劇情我方預設關閉。

三英戰呂布的劉關張及呂布明確設定為 `false`，玩家為 `true`。關閉後不累積 Combo、招式點數，也不取得相關攻防與機率加成；雙方仍能觸發基礎進階招式及符合條件的特性。需要 Combo 達標的「乘勝」仍須滿足其原本條件。
