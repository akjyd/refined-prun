from tr import S, E, R

S('BURN 按派系分组')

B = 'src/features/XIT/BURN/'

E('burn.noFaction', 'No faction', '无派系')
E('burn.group.edit', 'Groups', '分组')
E('burn.group.reset', 'follow faction', '跟随派系')
E('burn.group.add', 'New group', '新建分组')
E('burn.group.addButton', 'add', '添加')

R(B + 'BURN.vue',
  "import BurnSection from '@src/features/XIT/BURN/BurnSection.vue';",
  "import BurnSection from '@src/features/XIT/BURN/BurnSection.vue';\n"
  "import BurnGroupHeader from '@src/features/XIT/BURN/BurnGroupHeader.vue';\n"
  "import BurnGroupEditor from '@src/features/XIT/BURN/BurnGroupEditor.vue';\n"
  "import { burnGroups } from '@src/features/XIT/BURN/burn-groups';")

R(B + 'BURN.vue',
  "const expand = useTileState('expand');",
  "const expand = useTileState('expand');\n\n"
  "// Planets grouped by faction, the overall section last (player, 2026-11-06).\n"
  "const groups = computed(() => burnGroups(planetBurn.value ?? []));\n"
  "const editingGroups = ref(false);\n"
  "const groupPlanets = computed(() =>\n"
  "  (planetBurn.value ?? []).filter(x => x.naturalId !== ''),\n"
  ");")

R(B + 'BURN.vue',
  '''      <div :class="$style.spacer" />
      <CopyButton :copy-fn="copyBurnTable" data-tooltip-position="bottom" />
    </div>
    <table>''',
  '''      <div :class="$style.spacer" />
      <RadioItem v-model="editingGroups" horizontal>{{ t('burn.group.edit') }}</RadioItem>
      <CopyButton :copy-fn="copyBurnTable" data-tooltip-position="bottom" />
    </div>
    <BurnGroupEditor v-if="editingGroups" :planets="groupPlanets" />
    <table>''')

R(B + 'BURN.vue',
  '''      <BurnSection
        v-for="burn in planetBurn"
        :key="burn.planetName"
        :can-minimize="planetBurn.length > 1"
        :has-inbound-ships="burn.hasInboundShips"
        :burn="burn" />''',
  '''      <template v-for="group in groups" :key="group.name ?? ''">
        <BurnGroupHeader
          v-if="group.name !== undefined"
          :name="group.name"
          :color="group.color" />
        <BurnSection
          v-for="burn in group.planets"
          :key="burn.planetName"
          :can-minimize="planetBurn.length > 1"
          :has-inbound-ships="burn.hasInboundShips"
          :burn="burn" />
      </template>''')
